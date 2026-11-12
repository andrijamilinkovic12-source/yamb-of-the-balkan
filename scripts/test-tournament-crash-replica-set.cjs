'use strict';
// Kills disposable workers at the transaction boundary. Never loads .env.
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { fork } = require('node:child_process');
const { once } = require('node:events');
const mongoose = require('mongoose');
const core = require('../www/tournamentReadinessCore');
const audit = require('../lib/tournament-match-audit');
const { createProfileWrites } = require('../lib/profile-writes');
const { createTournamentReadinessStore } = require('../lib/tournament-readiness-store');
const { createTournamentReadinessService } = require('../lib/tournament-readiness');
const ejson = mongoose.mongo.BSON.EJSON;

async function connect(dbName) {
    const port = process.env.YAMB_TOURNAMENT_TEST_MONGO_PORT || '';
    assert(/^\d{4,5}$/.test(port) && Number(port) >= 1024 && Number(port) <= 65535, 'Dedicated local test port required');
    assert(/^yamb_tournament_qa_[a-f0-9]{32}$/.test(dbName), 'Disposable database name required');
    const conn = await mongoose.createConnection(`mongodb://127.0.0.1:${port}/?directConnection=true`, {
        dbName, serverSelectionTimeoutMS: 2500, autoIndex: false, retryWrites: true
    }).asPromise();
    try {
        const hello = await conn.db.admin().command({ hello: 1 });
        assert(hello.isWritablePrimary && /^yamb[-_]test(?:[-_][a-z0-9]+)*$/i.test(hello.setName || ''), 'Not a test primary');
        return conn;
    } catch (error) { await conn.close(); throw error; }
}

function runtime(conn) {
    const profileWrites = createProfileWrites();
    const store = createTournamentReadinessStore({ connection: conn, profileWrites, maxBalance: 100000 });
    const service = createTournamentReadinessService({ store, createId: randomUUID, createMatch: () => ({}),
        shuffle: rows => rows, entryFee: 5500 });
    return { store, service, journal: audit.createStore({ connection: conn, profileWrites }) };
}

async function command(rt, fixture) {
    if (fixture.kind === 'entry') return rt.service.execute('register', fixture.input);
    return rt.journal.commitState(fixture.filter, fixture.values, fixture.plan);
}

async function worker() {
    const fixture = JSON.parse(process.env.YAMB_CRASH_FIXTURE);
    const conn = await connect(fixture.dbName);
    const transaction = conn.transaction.bind(conn);
    let sessionId;
    const hold = async point => {
        process.send({ point, sessionId });
        await new Promise(() => {});
    };
    conn.transaction = (callback, options) => transaction(async session => {
        sessionId = ejson.serialize(session.id);
        const result = await callback(session);
        if (fixture.phase === 'before') await hold('before_commit');
        return result;
    }, options);
    await command(runtime(conn), fixture);
    await hold('after_commit');
}

async function crashAt(fixture, conn) {
    const child = fork(__filename, ['--worker'], { env: {
        PATH: process.env.PATH, SystemRoot: process.env.SystemRoot, TEMP: process.env.TEMP,
        YAMB_TOURNAMENT_TEST_MONGO_PORT: process.env.YAMB_TOURNAMENT_TEST_MONGO_PORT,
        YAMB_CRASH_FIXTURE: JSON.stringify(fixture)
    }, stdio: ['ignore', 'ignore', 'ignore', 'ipc'], windowsHide: true });
    let reached;
    try {
        reached = await new Promise((resolve, reject) => {
            const timer = setTimeout(() => reject(Error('Crash worker timed out')), 20000);
            child.once('message', value => { clearTimeout(timer); value.error ? reject(Error(value.error)) : resolve(value); });
            child.once('error', error => { clearTimeout(timer); reject(error); });
            child.once('exit', () => { clearTimeout(timer); reject(Error('Crash worker exited before boundary')); });
        });
        assert.equal(reached.point, fixture.phase + '_commit');
    } finally {
        if (child.exitCode === null && child.signalCode === null) {
            const exited = once(child, 'exit');
            child.kill('SIGKILL');
            await exited;
        }
        // End only this killed worker's orphaned test session, without waiting
        // the production driver's transaction-lifetime timeout in the QA runner.
        if (reached?.sessionId) await conn.db.admin().command({ killSessions: [ejson.deserialize(reached.sessionId)] });
    }
}

async function main() {
    const dbName = 'yamb_tournament_qa_' + randomUUID().replaceAll('-', '');
    const conn = await connect(dbName);
    try {
        const col = name => conn.db.collection(name);
        const rt = runtime(conn);
        async function fixture(kind, phase) {
            await col('tournamentstates').deleteMany({});
            const cycleId = randomUUID();
            const uid = 'fixture-crash-' + randomUUID();
            const runnerUp = 'fixture-crash-' + randomUUID();
            await col('userprofiles').insertMany([uid, runnerUp].map(firebaseUid => ({ firebaseUid, balance: 25000, tournamentWins: 0 })));
            await col('tournamentstates').insertOne({ registrationCycleId: cycleId, readinessPolicyVersion: core.VERSION,
                readinessRevision: 0, tournamentNumber: 30, status: 'registration', players: [], readiness: null,
                pushFlags: {}, bracket: { qf: [null, null, null, null], sf: [null, null], f: [null] } });
            const row = { dbName, kind, phase, uid, runnerUp, cycleId };
            row.input = { uid, cycleId, accepted: true, policyVersion: core.VERSION, requestId: randomUUID(), player: { name: 'Crash fixture' } };
            row.filter = { registrationCycleId: cycleId, readinessRevision: 0 };
            row.values = { readinessRevision: 1, status: 'finished' };
            row.plan = { events: [], final: { maxBalance: 100000, awards: [
                { uid, role: 'winner', amount: 12000 }, { uid: runnerUp, role: 'runnerup', amount: 5500 }
            ], record: { winnerId: uid, winnerName: 'Crash fixture', winnerPhotoUrl: '', wonAt: Date.now(), tournamentNumber: 30 } } };
            return row;
        }
        const profile = uid => col('userprofiles').findOne({ firebaseUid: uid });
        for (const kind of ['entry', 'final']) {
            for (const phase of ['before', 'after']) {
                const row = await fixture(kind, phase);
                await crashAt(row, conn);
                const committed = phase === 'after';
                assert.equal((await profile(row.uid)).balance, committed ? kind === 'entry' ? 19500 : 37000 : 25000);
                if (kind === 'entry') {
                    assert.equal(await col('tournamententries').countDocuments({ uid: row.uid }), committed ? 1 : 0);
                    assert((await command(rt, row)).ok);
                    assert((await command(rt, row)).ok);
                    assert.equal((await profile(row.uid)).balance, 19500);
                    assert.equal(await col('tournamententries').countDocuments({ uid: row.uid }), 1);
                } else {
                    assert.equal((await profile(row.runnerUp)).balance, committed ? 30500 : 25000);
                    assert.equal((await profile(row.uid)).tournamentWins, committed ? 1 : 0);
                    assert.equal(await col('tourneystats').countDocuments({ playerId: row.uid }), committed ? 1 : 0);
                    if (!committed) await command(rt, row);
                    await assert.rejects(command(rt, row), /revision_conflict/);
                    assert.equal((await profile(row.uid)).balance, 37000);
                    assert.equal((await profile(row.runnerUp)).balance, 30500);
                    assert.equal((await profile(row.uid)).tournamentWins, 1);
                    assert.equal((await col('tourneystats').findOne({ playerId: row.uid })).championships.length, 1);
                }
            }
        }
        const retry = await fixture('entry', 'before');
        let attempts = 0;
        const original = conn.transaction.bind(conn);
        conn.transaction = (callback, options) => original(async session => {
            const result = await callback(session);
            if (++attempts === 1) {
                const error = new mongoose.mongo.MongoServerError({ message: 'fixture transient write conflict', code: 112 });
                error.addErrorLabel('TransientTransactionError');
                throw error;
            }
            return result;
        }, options);
        assert((await command(rt, retry)).ok);
        assert.equal(attempts, 2);
        assert.equal((await profile(retry.uid)).balance, 19500);
        assert.equal(await col('tournamententries').countDocuments({ uid: retry.uid }), 1);
        console.log('PASS: worker death before/after entry and final commits, atomic prize/history/count/refund, retry after lost acknowledgement and real-driver transient retry without duplicate debit.');
    } finally {
        try { await conn.db.dropDatabase(); } finally { await conn.close(); }
    }
}

const watchdog = setTimeout(() => { console.error('Crash replica-set test timed out'); process.exit(1); }, 90000);
(process.argv.includes('--worker') ? worker() : main()).catch(error => {
    if (process.send) process.send({ error: error.message });
    else console.error(error);
    process.exitCode = 1;
    if (process.send) process.exit(1);
}).finally(() => clearTimeout(watchdog));
