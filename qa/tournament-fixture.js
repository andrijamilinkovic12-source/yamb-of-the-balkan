'use strict';

const { createHash, randomUUID } = require('node:crypto');
const { validateStagingServerEnvironment, getValidatedStagingFirebaseProjectId } = require('../scripts/reconnect-staging-safety');
const readiness = require('../www/tournamentReadinessCore');
const reliability = require('../www/tournamentReliabilityCore');
const { createTournamentReadinessStore } = require('../lib/tournament-readiness-store');
const { createTournamentReadinessService } = require('../lib/tournament-readiness');

const fail = code => { throw new Error('qa_tournament_fixture_' + code); };
const digest = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');

function readFixtureConfig(env = process.env) {
    if (!env.YAMB_TOURNAMENT_QA_FIXTURE) return null;
    const scope = validateStagingServerEnvironment(env);
    if (scope.instanceId !== 'reconnect-qa-01' || getValidatedStagingFirebaseProjectId(env) !== 'yamb-reconnect-qa'
        || (env.RENDER === 'true' && env.RENDER_SERVICE_ID !== 'srv-davehl6k1f9s73a12if0')
        || env.ACCOUNT_DELETION_SINGLE_INSTANCE !== 'true'
        || !/^(?:1|true)$/i.test(env.TOURNAMENT_READINESS_ENABLED || '')) fail('scope');
    let value;
    try { value = JSON.parse(env.YAMB_TOURNAMENT_QA_FIXTURE); } catch (_) { fail('config'); }
    if (!value || Array.isArray(value) || Object.keys(value).sort().join(',') !== 'humanUids,id,version'
        || value.version !== 1 || typeof value.id !== 'string' || !/^qa_[a-z0-9_]{16,60}$/.test(value.id)
        || !Array.isArray(value.humanUids) || value.humanUids.length !== 2
        || new Set(value.humanUids).size !== 2
        || value.humanUids.some(uid => typeof uid !== 'string' || !/^[A-Za-z0-9_-]{20,128}$/.test(uid))) fail('config');
    const humanUids = [...value.humanUids];
    if (/^(?:1|true)$/i.test(env.YAMB_STAGING_FCM_ENABLED || '')) {
        let allowed;
        try { allowed = JSON.parse(env.YAMB_STAGING_FCM_ALLOWED_UIDS); } catch (_) { fail('push_scope'); }
        if (!Array.isArray(allowed) || allowed.length !== 2 || !humanUids.every(uid => allowed.includes(uid))) fail('push_scope');
    }
    const syntheticUids = Array.from({ length: 6 }, (_, index) => 'qa_fixture_' + digest([value.id, index]).slice(0, 40));
    if (humanUids.some(uid => syntheticUids.includes(uid))) fail('config');
    return Object.freeze({ id: value.id, databaseName: scope.databaseName, humanUids, syntheticUids,
        configHash: digest([value.version, value.id, humanUids, scope.databaseName]) });
}

// Operator must stop the previous QA process before enabling this one-shot seed.
// No public endpoint, credentials, production fallback, or history deletion.
async function prepareTournamentFixture({ config, connection, profileWrites, guardWrite, createState, createMatch,
    entryFee, maxBalance, now = Date.now }) {
    if (!config) return { configured: false };
    if (connection.db.databaseName !== config.databaseName) fail('database');
    const col = name => connection.db.collection(name);
    const ids = [...config.humanUids, ...config.syntheticUids];
    const releases = [];
    return profileWrites.run(ids, async () => {
        try {
            for (const uid of ids) releases.push(await guardWrite(uid));
            const meta = await connection.transaction(async session => {
                const options = { session };
                const previous = await col('tournamentqafixtures').findOne({ _id: config.id }, options);
                if (previous) {
                    if (previous.configHash !== config.configHash) fail('config_changed');
                    return previous;
                }
                const states = await col('tournamentstates').find({}, options).toArray();
                if (states.length !== 1) fail('state_count');
                const old = states[0];
                if (old.status !== 'registration' || old.players?.length !== 0
                    || !old.bracket || Object.values(old.bracket).some(round => !Array.isArray(round) || round.some(Boolean))
                    || old.finishedAt || old.resetAt || old.readiness) fail('not_empty');
                if (old.registrationCycleId && await col('tournamententries').findOne({ cycleId: old.registrationCycleId,
                    status: { $in: ['paid', 'started'] } }, options)) fail('not_empty');
                const state = createState(old.tournamentNumber || 1);
                if (!readiness.isManaged(state) || !reliability.isManaged(state)) fail('policy');
                const at = now();
                for (const [index, uid] of ids.entries()) {
                    const human = index < 2;
                    let user = await col('userprofiles').findOne({ firebaseUid: uid }, options);
                    if (!user && human) fail('human_missing');
                    if (user && !human) fail('synthetic_collision');
                    if (!user) {
                        user = { firebaseUid: uid, playerName: 'QA Fixture ' + (index - 1), balance: 0, games: 0 };
                        await col('userprofiles').insertOne(user, options);
                    }
                    if (!Number.isSafeInteger(user.balance) || user.balance < 0 || user.balance > maxBalance) fail('balance');
                    const amount = Math.max(0, Math.min(25000, maxBalance) - user.balance);
                    await col('userprofiles').updateOne({ firebaseUid: uid }, {
                        $inc: { balance: amount },
                        $set: { ['qaTournamentFixtureGrants.' + config.id]: { amount, at, synthetic: !human } }
                    }, options);
                }
                const replacement = await col('tournamentstates').replaceOne({ _id: old._id }, { ...state, _id: old._id }, options);
                if (replacement.matchedCount !== 1) fail('revision');
                const row = { _id: config.id, configHash: config.configHash, cycleId: state.registrationCycleId,
                    phase: 'preparing', createdAt: at, tournamentNumber: state.tournamentNumber };
                await col('tournamentqafixtures').insertOne(row, options);
                return row;
            }, { readConcern: { level: 'snapshot' }, writeConcern: { w: 'majority' } });
            if (meta.phase === 'ready') return { cycleId: meta.cycleId, alreadyPrepared: true };
            if (meta.phase !== 'preparing') fail('phase');
            const store = createTournamentReadinessStore({ connection, profileWrites, guardWrite, maxBalance, now });
            const service = createTournamentReadinessService({ store, createId: randomUUID, createMatch,
                shuffle: players => ids.map(uid => players.find(player => player.id === uid)), entryFee, now });
            let state = await col('tournamentstates').findOne({ registrationCycleId: meta.cycleId });
            if (!state || !['registration', 'confirmation'].includes(state.status)
                || state.players.some(player => !ids.includes(player.id))) fail('resume_state');
            for (const uid of ids) {
                const user = await col('userprofiles').findOne({ firebaseUid: uid });
                const result = await service.execute('register', { uid, cycleId: meta.cycleId,
                    requestId: digest([config.id, uid]), accepted: true, policyVersion: readiness.VERSION,
                    clientProtocol: reliability.CLIENT_PROTOCOL, reliabilityRulesAccepted: true,
                    player: { name: user.playerName || 'QA Player', photoUrl: user.photoUrl || '' } });
                if (!result.ok) fail('registration');
                state = result.state;
            }
            for (const uid of config.syntheticUids) {
                const player = state.players.find(item => item.id === uid);
                const result = await service.execute('confirm', { uid, cycleId: meta.cycleId, entryId: player.entryId,
                    clientProtocol: reliability.CLIENT_PROTOCOL });
                if (!result.ok) fail('confirmation');
                state = result.state;
            }
            await col('tournamentqafixtures').updateOne({ _id: config.id, configHash: config.configHash, phase: 'preparing' },
                { $set: { phase: 'ready', readyAt: now() } }, { writeConcern: { w: 'majority' } });
            return { cycleId: meta.cycleId, alreadyPrepared: false, participants: state.players.length,
                confirmed: state.players.filter(readiness.isReady).length };
        } finally { releases.reverse().forEach(release => release()); }
    });
}

function fixturePairing(config, cycleId, activeCycleId, players) {
    if (!config || !cycleId || cycleId !== activeCycleId || players.length !== 8) return null;
    const ordered = [...config.humanUids, ...config.syntheticUids].map(uid => players.find(player => player.id === uid));
    return ordered.every(Boolean) ? ordered : null;
}

module.exports = { readFixtureConfig, prepareTournamentFixture, fixturePairing };
