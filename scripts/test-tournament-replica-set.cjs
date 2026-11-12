'use strict';
// Opt-in test. Never loads .env or accepts an external database address.
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const mongoose = require('mongoose');
const readiness = require('../www/tournamentReadinessCore');
const scheduling = require('../www/tournamentSchedulingCore');
const notifications = require('../www/tournamentNotificationsCore');
const adjudication = require('../www/tournamentAdjudicationCore');
const reliability = require('../www/tournamentReliabilityCore');
const audit = require('../lib/tournament-match-audit');
const review = require('../lib/tournament-adjudication');
const { createTournamentReadinessStore } = require('../lib/tournament-readiness-store');
const { createTournamentReadinessService } = require('../lib/tournament-readiness');

const fee = 5500;
const at = Date.parse('2026-11-11T09:00:00+01:00');
const makeMatch = (p1 = null, p2 = null) => ({ p1, p2, winnerId: null });
const empty = () => ({ qf: Array(4).fill(null), sf: Array(2).fill(null), f: [null] });
const fresh = (number, cycleId) => ({ status: 'registration', tournamentNumber: number, registrationCycleId: cycleId,
    readinessRevision: 0, players: [], readiness: null, pushFlags: {}, bracket: empty(),
    readinessPolicyVersion: readiness.VERSION, schedulingPolicyVersion: scheduling.VERSION,
    notificationPolicyVersion: notifications.VERSION, auditPolicyVersion: audit.VERSION,
    adjudicationPolicyVersion: adjudication.VERSION, reliabilityPolicyVersion: reliability.VERSION });

async function main() {
    const portText = process.env.YAMB_TOURNAMENT_TEST_MONGO_PORT || '';
    if (!/^\d{4,5}$/.test(portText) || Number(portText) < 1024 || Number(portText) > 65535) {
        throw new Error('Set YAMB_TOURNAMENT_TEST_MONGO_PORT to a dedicated loopback replica-set primary port. No database was contacted.');
    }
    const dbName = 'yamb_tournament_qa_' + randomUUID().replace(/-/g, '');
    const conn = mongoose.createConnection(`mongodb://127.0.0.1:${portText}/?directConnection=true`, {
        dbName, serverSelectionTimeoutMS: 2500, retryWrites: true, autoIndex: false
    });
    let mayClean = false;
    try {
        await conn.asPromise();
        const hello = await conn.db.admin().command({ hello: 1 });
        assert(hello.isWritablePrimary && /^yamb[-_]test(?:[-_][a-z0-9]+)*$/i.test(hello.setName || ''),
            'Refusing to write: use an isolated primary with a replica-set name starting with yamb-test');
        assert.equal(conn.db.databaseName, dbName);
        mayClean = true;
        const col = name => conn.db.collection(name);
        for (const name of ['tournamentstates', 'tournamententries', 'tournamentnotices', 'tournamentmatchaudits',
            'tournamentreliabilities', 'userprofiles']) await conn.db.createCollection(name);
        await col('tournamententries').createIndex({ cycleId: 1, uid: 1, requestId: 1 }, { unique: true });
        await col('userprofiles').createIndex({ firebaseUid: 1 }, { unique: true });
        const ids = Array.from({ length: 8 }, (_, i) => 'fixture-player-' + i);
        const cycleId = randomUUID();
        await col('tournamentstates').insertOne(fresh(15, cycleId));
        await col('userprofiles').insertMany(ids.map(firebaseUid => ({ firebaseUid, balance: 25000 })));
        await col('tournamentreliabilities').insertOne({ _id: ids[0], uid: ids[0], warningEdition: 10, lastIncidentEdition: 10 });
        await col('tournamententries').insertOne({ _id: randomUUID(), uid: ids[0], tournamentNumber: 13, startedAt: at - 1000, status: 'refunded' });

        const store = createTournamentReadinessStore({ connection: conn, maxBalance: 100000, now: () => at });
        const serviceWith = testStore => createTournamentReadinessService({ store: testStore, createId: randomUUID, createMatch: makeMatch,
            shuffle: players => players, entryFee: fee, now: () => at });
        const service = serviceWith(store);
        const input = (uid, target = cycleId) => ({ uid, cycleId: target, requestId: randomUUID(), accepted: true,
            policyVersion: readiness.VERSION, clientProtocol: reliability.CLIENT_PROTOCOL, reliabilityRulesAccepted: true, player: { name: uid } });
        const before = async uid => (await col('userprofiles').findOne({ firebaseUid: uid })).balance;
        assert.equal((await service.execute('register', { ...input(ids[0]), clientProtocol: 'old' })).reason, 'tourney_client_update_required');
        const failure = serviceWith({ transaction: command => store.transaction(tx => command({ ...tx,
            saveState: async () => { throw new Error('isolated_rollback'); } })) });
        await assert.rejects(failure.execute('register', input(ids[0])), /isolated_rollback/);
        assert.equal(await before(ids[0]), 25000);
        assert.equal(await col('tournamententries').countDocuments({ cycleId }), 0);
        for (const uid of ids) assert((await service.execute('register', input(uid))).ok);
        const stateBefore = await col('tournamentstates').findOne({ registrationCycleId: cycleId });
        assert.equal(stateBefore.status, 'confirmation');
        for (const p of stateBefore.players) assert((await service.execute('confirm', { uid: p.id, cycleId, entryId: p.entryId,
            clientProtocol: reliability.CLIENT_PROTOCOL })).ok);
        const state = await col('tournamentstates').findOne({ registrationCycleId: cycleId });
        assert.equal(state.status, 'active');
        assert.equal(await col('tournamentmatchaudits').countDocuments({ cycleId, kind: 'match_opened' }), 4);

        const journal = audit.createStore({ connection: conn });
        const match = state.bracket.qf[0];
        const now = match.scheduling.deadlineAt;
        const decision = review.evaluate(match, await journal.evidence(cycleId, 'qf', 0), now, { covers: () => true }, 'fixture-process');
        assert.equal(decision.kind, 'double_dq');
        const plan = review.planDecision(state, 'qf', 0, match, decision, { now, createId: randomUUID,
            createMatch: makeMatch, resetDelayMs: 86400000 });
        const filter = { registrationCycleId: cycleId, readinessRevision: state.readinessRevision };
        const values = { ...plan.updates, readinessRevision: state.readinessRevision + 1 };
        await assert.rejects(journal.commitState(filter, values, { ...plan, refunds: ['fixture-missing'] }), /adjudication_entry_missing/);
        assert.equal((await col('tournamentstates').findOne(filter)).bracket.qf[0].review, undefined);
        assert.equal(await col('tournamentreliabilities').countDocuments(), 1);
        assert.equal(await col('tournamentnotices').countDocuments({ kind: 'reliability_suspension' }), 0);
        await journal.commitState(filter, values, plan);
        await assert.rejects(journal.commitState(filter, values, plan), /revision_conflict/);
        assert.equal((await store.reliabilityStatus(ids[0], 16)).blocked, true);
        assert.equal((await store.reliabilityStatus(ids[1], 16)).warningEdition, 15);
        assert.equal(await col('tournamentnotices').countDocuments({ kind: 'reliability_suspension' }), 1);

        const next = randomUUID();
        await col('tournamentstates').updateOne({ registrationCycleId: cycleId }, { $set: fresh(16, next) });
        const blocked = await service.execute('register', input(ids[0], next));
        assert.equal(blocked.reason, 'tourney_reliability_blocked');
        assert.equal(await before(ids[0]), 25000 - fee);
        const later = randomUUID();
        await col('tournamentstates').updateOne({ registrationCycleId: next }, { $set: fresh(17, later) });
        assert((await service.execute('register', input(ids[0], later))).ok);
        console.log('PASS: isolated MongoDB replica-set rollback, draw, verified sanction, notification and subsequent edition enrollment.');
    } finally {
        try {
            if (mayClean && conn.db?.databaseName === dbName && /^yamb_tournament_qa_[a-f0-9]{32}$/.test(dbName)) await conn.db.dropDatabase();
        } finally { await conn.close(); }
    }
}

main().catch(error => { console.error(error.message); process.exitCode = 1; });
