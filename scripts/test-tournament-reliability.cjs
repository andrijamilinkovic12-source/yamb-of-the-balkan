'use strict';
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const { randomUUID } = require('node:crypto');
const reliability = require('../lib/tournament-reliability');
const readiness = require('../www/tournamentReadinessCore');
const { createTournamentReadinessService } = require('../lib/tournament-readiness');

const at = Date.parse('2026-11-11T23:00:00+01:00');
const fee = 5500;

function memory() {
    const rows = { tournamententries: [], tournamentreliabilities: [], tournamentnotices: [] };
    const matches = (row, query) => Object.entries(query).every(([key, expected]) => {
        if (expected !== null && typeof expected === 'object') return Object.entries(expected).every(([op, value]) =>
            op === '$gt' ? row[key] > value : op === '$lte' ? row[key] <= value : false);
        return row[key] === expected;
    });
    const collection = name => ({
        async findOne(query) { return structuredClone(rows[name].find(row => matches(row, query))); },
        async distinct(key, query) { return [...new Set(rows[name].filter(row => matches(row, query)).map(row => row[key]))]; },
        async updateOne(query, update, opts) {
            let row = rows[name].find(row => matches(row, query));
            if (!row && opts?.upsert) {
                row = { ...query, ...update.$setOnInsert };
                rows[name].push(row);
            }
            if (row) Object.assign(row, update.$set);
        }
    });
    const appearance = (uid, edition, { started = true, status = 'started', cycleId = 'cycle-' + edition } = {}) => {
        rows.tournamententries.push({ uid, tournamentNumber: edition, cycleId, entryId: randomUUID(),
            startedAt: started ? at : null, status });
    };
    const incident = (edition, inactiveUids, reason = 'verified_no_show') => reliability.recordIncidents({ collection,
        options: {}, incident: { cycleId: 'cycle-' + edition, tournamentNumber: edition, inactiveUids, reason, at } });
    return { rows, collection, appearance, incident };
}

async function incidents() {
    for (const count of [1, 2, 3]) assert.equal(reliability.decide({ warningEdition: 10 }, 30, count).blockedEdition, 31);
    assert.equal(reliability.decide({ warningEdition: 10 }, 30, 4).warningEdition, 30);
    assert.equal(reliability.decide({ lastIncidentEdition: 30 }, 30, 1), null);
    assert.equal(reliability.decide({ lastIncidentEdition: 31 }, 30, 1), null);

    const h = memory();
    h.appearance('a', 10);
    await h.incident(10, ['a']);
    await h.incident(10, ['a', 'a']);
    assert.equal(h.rows.tournamentnotices.length, 1);
    assert.equal(h.rows.tournamentnotices[0].kind, 'reliability_warning');
    assert.equal(h.rows.tournamentnotices[0].dueAt, Date.parse('2026-11-12T09:00:00+01:00'), 'quiet hours');
    assert(await reliability.currentNotice(h.collection, h.rows.tournamentnotices[0], { tournamentNumber: 10 }));
    h.appearance('a', 11, { started: false, status: 'refunded' });
    h.appearance('a', 12, { status: 'refunded' });
    h.appearance('a', 12, { status: 'refunded', cycleId: 'duplicate-edition' });
    h.appearance('a', 20);
    h.appearance('a', 22);
    await h.incident(22, ['a'], 'both_inactive');
    assert.equal(h.rows.tournamentnotices.length, 2);
    assert.equal(h.rows.tournamentnotices[1].kind, 'reliability_suspension');
    assert.deepEqual(await reliability.readStatus(h.collection, 'a', 23), { blocked: true, blockedEdition: 23, warningEdition: null });
    assert.equal((await reliability.readStatus(h.collection, 'a', 24)).blocked, false);
    assert.equal(await reliability.currentNotice(h.collection, h.rows.tournamentnotices[0], { tournamentNumber: 22 }), false);
    assert(await reliability.currentNotice(h.collection, h.rows.tournamentnotices[1], { tournamentNumber: 23 }));
    assert.equal(await reliability.currentNotice(h.collection, h.rows.tournamentnotices[1], { tournamentNumber: 24 }), false);
    assert.equal((await reliability.readStatus(h.collection, 'b', 23)).blocked, false);
    h.appearance('a', 24);
    await h.incident(24, ['a']);
    assert.equal(h.rows.tournamentnotices[2].kind, 'reliability_warning', 'new warning after serving suspension');

    const clean = memory();
    clean.appearance('a', 1);
    await clean.incident(1, ['a']);
    for (let edition = 2; edition <= 5; edition++) clean.appearance('a', edition);
    await clean.incident(5, ['a'], 'unanswered_valid_proposal');
    assert.equal(clean.rows.tournamentnotices[1].kind, 'reliability_warning', 'three clean appearances reset the window');
    for (const reason of ['server_interruption', 'mutual_disconnect', 'disconnect_grace_expired', 'turn_timeout', 'back_to_menu', 'insufficient_evidence', 'account_deleted']) {
        await clean.incident(6, ['a'], reason);
    }
    assert.equal(clean.rows.tournamentnotices.length, 2, 'unrelated outcomes never trigger a strike');
    await assert.rejects(clean.incident(6, ['a']), /appearance_missing/);
}

async function enrollment() {
    const state = { status: 'registration', registrationCycleId: randomUUID(), tournamentNumber: 23, players: [], readiness: null,
        readinessPolicyVersion: readiness.VERSION, reliabilityPolicyVersion: reliability.VERSION };
    let charged = 0, noticeId;
    const stored = [];
    const service = createTournamentReadinessService({ now: () => at, createId: randomUUID, entryFee: fee, store: {
        transaction: async operation => operation({ loadState: async () => state,
            reliabilityStatus: async uid => ({ blocked: uid === 'blocked', blockedEdition: 23 }),
            findEntry: async () => null, charge: async () => { charged += fee; return {}; },
            createEntry: async entry => stored.push(entry), saveState: async () => {},
            refund: async () => ({ pending: 0 }), notice: async row => { noticeId = row.noticeId; }
        })
    } });
    const input = { uid: 'player', cycleId: state.registrationCycleId, requestId: randomUUID(), policyVersion: readiness.VERSION,
        accepted: true, reliabilityRulesAccepted: true, player: { name: 'Test' } };
    assert.equal((await service.execute('register', input)).reason, 'tourney_client_update_required');
    assert.equal(charged, 0);
    const current = { ...input, clientProtocol: reliability.CLIENT_PROTOCOL };
    assert.equal((await service.execute('register', { ...current, reliabilityRulesAccepted: false })).reason, 'tourney_rules_acceptance_required');
    const blocked = await service.execute('register', { ...current, uid: 'blocked' });
    assert.equal(blocked.reason, 'tourney_reliability_blocked');
    assert.equal(blocked.blockedEdition, 23);
    assert.equal(charged, 0);
    assert((await service.execute('register', current)).ok);
    assert.equal(stored[0].clientProtocol, reliability.CLIENT_PROTOCOL);
    assert.equal(stored[0].reliabilityPolicyVersion, reliability.VERSION);
    assert.equal(stored[0].reliabilityAcceptedAt, at);
    assert((await service.execute('register', current)).alreadyRegistered);
    assert.equal(charged, fee);
    const entryId = state.players[0].entryId;
    state.readiness = { startedAt: at, expiresAt: at + readiness.SESSION_MS };
    state.players[0].readyDeadlineAt = readiness.addActiveMs(at, readiness.CONFIRMATION_MS);
    assert.equal((await service.execute('confirm', { ...input, entryId })).reason, 'tourney_client_update_required');
    assert((await service.execute('withdraw', { ...input, entryId })).ok, 'outdated client may still withdraw and receive its refund');
    assert(noticeId.endsWith(':readiness_withdrawn'));
}

async function privateStatus() {
    const source = fs.readFileSync(require.resolve('../server.js'), 'utf8').replace(/\r\n/g, '\n');
    const flagAt = source.indexOf('const TOURNAMENT_READINESS_ENABLED =');
    const expression = source.slice(flagAt, source.indexOf(';', flagAt) + 1);
    const enabled = (environment, env) => vm.runInNewContext(expression + '\nTOURNAMENT_READINESS_ENABLED',
        { SERVER_RUNTIME: { environment }, process: { env } });
    assert.equal(enabled('production', { TOURNAMENT_READINESS_ENABLED: 'true' }), false);
    assert.equal(enabled('production', { TOURNAMENT_ROLLOUT_APPROVED: 'true' }), false);
    assert.equal(enabled('production', { TOURNAMENT_READINESS_ENABLED: 'true', TOURNAMENT_ROLLOUT_APPROVED: 'true' }), true);
    assert.equal(enabled('test', { TOURNAMENT_READINESS_ENABLED: 'true' }), true);
    const fn = source.indexOf('async function emitTournamentReliabilityStatus(');
    const events = [];
    let reply;
    const socket = { uid: 'a', emit: (name, payload) => events.push({ name, payload }) };
    const context = vm.createContext({ tournamentReliability: reliability, tournamentStateInitialized: true,
        tournamentState: { registrationCycleId: 'cycle-a', tournamentNumber: 23, reliabilityPolicyVersion: reliability.VERSION },
        mongoose: { connection: { readyState: 1 } }, getVerifiedUid: socket => socket.uid,
        getTournamentReadinessStore: () => ({ reliabilityStatus: () => new Promise(resolve => { reply = resolve; }) }) });
    vm.runInContext(source.slice(fn, source.indexOf('\n}', fn) + 2), context);
    const stale = context.emitTournamentReliabilityStatus(socket);
    socket.uid = 'b';
    reply({ blocked: true, blockedEdition: 23 });
    await stale;
    assert.equal(events.length, 0, 'identity changed during the private query');
    const same = context.emitTournamentReliabilityStatus(socket);
    reply({ blocked: false, blockedEdition: null });
    await same;
    assert.equal(events[0].payload.recipientUid, 'b');
    assert.equal(events[0].payload.cycleId, 'cycle-a');
}

(async () => {
    await incidents();
    await enrollment();
    await privateStatus();
    console.log('PASS: reliable appearance counting, one-edition suspension, duplicate and non-incident guards, private status and pre-debit compatibility.');
})().catch(error => { console.error(error); process.exitCode = 1; });
