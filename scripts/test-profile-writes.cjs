'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { createProfileWrites } = require('../lib/profile-writes');
const turn = () => new Promise(resolve => setImmediate(resolve));
const deferred = () => { let resolve; const promise = new Promise(r => { resolve = r; }); return { promise, resolve }; };

async function main() {
    const writes = createProfileWrites();
    const gate = deferred();
    const entered = deferred();
    const order = [];
    const first = writes.run(['b', 'a'], async () => {
        assert(writes.owns(['a', 'b']));
        await writes.run('a', () => order.push('nested'));
        await assert.rejects(writes.run('c', () => {}), /scope_expansion/);
        entered.resolve();
        await gate.promise;
        order.push('first');
    });
    await entered.promise;
    const second = writes.run(['a', 'b'], () => order.push('second'));
    await writes.run('independent', () => order.push('independent'));
    await turn();
    assert.deepEqual(order, ['nested', 'independent']);
    gate.resolve();
    await Promise.all([first, second]);
    assert.deepEqual(order, ['nested', 'independent', 'first', 'second']);
    assert(!writes.owns('a'));
    await assert.rejects(writes.run('a', () => { throw Error('fixture failure'); }), /fixture failure/);
    await writes.run('a', () => assert(writes.owns('a')));

    let detached;
    const detachedGate = deferred();
    await writes.run('a', () => {
        detached = detachedGate.promise.then(() => writes.run('a', () => order.push('detached')));
    });
    const busy = deferred();
    const busyEntered = deferred();
    const active = writes.run('a', async () => { busyEntered.resolve(); await busy.promise; });
    await busyEntered.promise;
    detachedGate.resolve();
    await turn();
    assert(!order.includes('detached'), 'A released async context bypassed a later owner');
    busy.resolve();
    await Promise.all([active, detached]);
    assert.equal(order.at(-1), 'detached');

    const handlers = new Map();
    const emissions = [];
    const socket = { verifiedUid: 'a', on(event, handler) { handlers.set(event, handler); return this; },
        emit(...args) { emissions.push(args); } };
    writes.bindSocket(socket, ['wallet']);
    writes.bindSocket(socket, ['wallet']);
    let called = 0;
    socket.on('wallet', () => { assert(writes.owns('a')); called++; });
    socket.on('plain', () => called++);
    const socketGate = deferred();
    const socketEntered = deferred();
    const owner = writes.run('a', async () => { socketEntered.resolve(); await socketGate.promise; });
    await socketEntered.promise;
    let reply;
    const queued = handlers.get('wallet')({}, value => { reply = value; });
    handlers.get('plain')();
    assert.equal(called, 1);
    socket.verifiedUid = 'other';
    socketGate.resolve();
    await Promise.all([owner, queued]);
    assert.equal(called, 1, 'Queued request used a different account');
    assert.equal(reply.reason, 'auth_required');
    assert.equal(emissions[0][0], 'auth_required');
    socket.verifiedUid = 'a';
    await handlers.get('wallet')();
    assert.equal(called, 2);

    const source = fs.readFileSync(require.resolve('../server'), 'utf8');
    const syncStart = source.indexOf('                let acceptedBalance = oldBalance;');
    const syncEnd = source.indexOf("                if (typeof s.undoTokens", syncStart);
    assert(syncStart > 0 && syncEnd > syncStart);
    function syncedBalance(oldBalance, requested, cost = 0) {
        const context = vm.createContext({ oldBalance, s: { balance: requested }, user: { balance: oldBalance, economyMigrationApplied: true },
            MAX_BALANCE: 100000, toSafeInt: (n, fallback) => Number.isFinite(n) ? Math.floor(n) : fallback,
            calculateAllowedBalanceIncrease: () => 0, requestedPaidUnlockCost: cost,
            shouldMarkDailyRewardClaimed: false, requestedDailyReward: 0, hasDailyClaimPayload: false,
            isUsingOldBackup: false, isClientSynced: true, console: { log() {} } });
        vm.runInContext(source.slice(syncStart, syncEnd), context);
        return context.user.balance;
    }
    assert.equal(syncedBalance(19500, 25000), 19500, 'A stale client restored the entry fee');
    assert.equal(syncedBalance(25000, 19500), 25000, 'A stale client erased the refund');
    assert.equal(syncedBalance(25000, 18500, 1000), 24000, 'A purchase erased a newer refund');
    assert.equal(syncedBalance(37100, 24000, 1000), 36100, 'A purchase erased a newer prize');
    assert.equal(syncedBalance(25000, 24000, 1000), 24000);
    for (const name of ['claim_shop_ad_reward', 'set_player_data', 'claim_daily_reward', 'claim_trophy_reward',
        'check_quarter_reward', 'claim_shop_discount', 'claim_shop_ad_unlock', 'undo_last_move']) {
        const binding = source.slice(source.indexOf('profileWrites.bindSocket('), source.indexOf('socket.use(', source.indexOf('profileWrites.bindSocket(')));
        assert(binding.includes("'" + name + "'"), 'Missing wallet handler binding: ' + name);
    }
    console.log('PASS: per-account ordering, pair/nested ownership, failure release, detached tasks, socket identity and actual profile-sync stale-balance/purchase rules.');
}
const watchdog = setTimeout(() => { console.error('Profile write test timed out'); process.exit(1); }, 10000);
main().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => clearTimeout(watchdog));
