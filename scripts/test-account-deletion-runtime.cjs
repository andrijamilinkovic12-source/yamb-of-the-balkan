'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { scrubEmbedded, referenceHashes, hash } = require('../lib/account-deletion');
const source = fs.readFileSync(require('node:path').join(__dirname, '../server.js'), 'utf8');
const uid = 'disposable_account_123456789';
const other = 'preserved_account_987654321';
const replacement = 'deleted_12345678-1234-1234-1234-123456789abc';
function actual(name) {
    const match = new RegExp('(?:async )?function ' + name + '\\(').exec(source);
    assert(match, name);
    return source.slice(match.index, source.indexOf('\n}', match.index) + 2);
}
function harness(status = 'registration') {
    const events = [], prizes = [], timers = [], writes = [];
    const stores = Object.fromEntries(['roomState', 'privateRooms', 'pendingGameRewards', 'pendingGameRewardsByUid',
        'chatBans', 'globalChatRateLimits', 'globalChatReportLimits', 'pendingChallenges', 'pendingRoomInvites',
        'pendingTournamentDuelInvites', 'onlinePlayers', 'registeredSockets', 'playerRooms', 'ghostSessions', 'disconnectTimers']
        .map(key => [key, {}]));
    const context = vm.createContext({ ...stores, console, Date, Map, Set, Object, Array, Number, String,
        ACCOUNT_DELETION_ENABLED: true, MAX_SCORE: 10000, TOURNEY_ROUNDS: new Set(['qf', 'sf', 'f']),
        deletionReferenceHashes: referenceHashes, deletionIdentityHash: hash, scrubDeletedAccountReferences: scrubEmbedded,
        clearTimeout: timer => timers.push(timer), queueMicrotask() {},
        tournamentState: { status, players: [], bracket: { qf: [null, null, null, null], sf: [null, null], f: [null] } },
        recentLifecycleGraceByUid: new Map(), recentEndedOnlineRooms: new Map(), recentServerTechnicalResults: new Map(),
        globalChatHistory: [], globalChatSaveQueue: Promise.resolve(), deletionTournamentSettlementRunning: false, waitingPlayer: null,
        io: { sockets: { sockets: new Map(), adapter: { rooms: new Map() } }, emit: (...args) => events.push(args),
            to: room => ({ emit: (...args) => events.push([room, ...args]) }) },
        mongoose: { model: () => ({ findOneAndUpdate: async (_filter, state) => {
            if (context.failWrite) throw new Error('database unavailable');
            writes.push(JSON.parse(JSON.stringify(state)));
        } }) },
        clearFinishedRoomCleanup() {}, clearDisconnectGraceForRoom() {}, stopTurnTimer: room => timers.push(room),
        notifyOnlinePlayersStatusChanged() {}, clearChallengesForSocket() {}, clearPendingRoomInvitesForSocket() {},
        clearPendingTournamentDuelInvitesForSocket() {}, saveTournamentToDb() {}, scheduleTournamentAutoReset() {},
        markTournamentFinishedForReset: () => { context.tournamentState.status = 'finished'; },
        settleTournamentFinalPrizes: async (match, player) => { prizes.push(player.id); match.prizesAwarded = true; },
        recordTournamentChampion: async () => {}, queueTournamentPush() {}, notifyTournamentChampion() {}
    });
    const names = ['createTournamentMatch', 'removePlayerFromTournamentBracket', 'advanceTournamentBracket',
        'getTournamentMatch', 'isTournamentParticipant', 'parseTournamentRoomId', 'sanitizeTournamentMatchScore',
        'resolveTournamentReplayState', 'setTournamentMatchResult', 'applyTournamentTechnicalWinner',
        'isDeletedTournamentPlayer', 'settleDeletedTournamentParticipants', 'cleanupOnlineRoom', 'prepareRuntimeForAccountDeletion'];
    vm.runInContext(names.map(actual).join('\n'), context);
    return { c: context, events, prizes, timers, writes };
}
const player = id => ({ id, name: id === uid ? 'Private name' : 'Opponent', photoUrl: id === uid ? 'private-photo' : 'other-photo' });
async function run() {
    const h = harness(), c = h.c;
    c.tournamentState.players = [player(uid), player(other)];
    c.tournamentState.bracket.qf[0] = c.createTournamentMatch(player(uid), player(other));
    c.roomState.shared = { players: ['socket-removed', 'socket-other'], playerUids: [uid, other] };
    c.roomState.unrelated = { players: ['third'], playerUids: ['third_account_1234567890'] };
    c.playerRooms['socket-removed'] = c.playerRooms['socket-other'] = 'shared';
    c.playerRooms.third = 'unrelated';
    c.privateRooms.removed = { ownerUid: uid }; c.privateRooms.kept = { ownerUid: other };
    c.waitingPlayer = { playerId: uid };
    c.ghostSessions[uid] = { deadlineAt: 1, diagnosticConfirmTimer: 'diagnostic-timer' };
    c.disconnectTimers[uid] = 'expired-timeout';
    c.recentLifecycleGraceByUid.set(uid, {});
    c.onlinePlayers[uid] = { name: 'Private name' }; c.onlinePlayers[other] = { name: 'Opponent' };
    c.pendingChallenges.own = { fromUid: uid, timeoutId: 'challenge-timeout' };
    c.pendingChallenges.kept = { fromUid: other };
    c.globalChatHistory = [{ senderUid: uid, text: 'private' }, { senderUid: other, text: 'keep' }];
    c.recentEndedOnlineRooms.set('removed', { playerUids: [uid, other] });
    c.recentEndedOnlineRooms.set('kept', { playerUids: [other] });
    let disconnects = 0;
    const socket = { id: 'socket-removed', verifiedUid: uid, playerId: uid, playerName: 'Private name',
        emit: (...args) => h.events.push(args), disconnect() {
            assert.equal(c.roomState.shared, undefined, 'room must end before disconnect can create a grace session');
            assert.equal(this.verifiedUid, null); assert.equal(this.playerId, null); disconnects++;
        } };
    const untouchedSocket = { id: 'socket-other', verifiedUid: other };
    c.io.sockets.sockets.set(socket.id, socket); c.io.sockets.sockets.set(untouchedSocket.id, untouchedSocket);
    await c.prepareRuntimeForAccountDeletion(uid, replacement);
    assert.equal(disconnects, 1); assert.equal(untouchedSocket.verifiedUid, other);
    assert(c.roomState.unrelated); assert.equal(c.playerRooms.third, 'unrelated');
    assert.equal(c.ghostSessions[uid], undefined); assert.equal(c.disconnectTimers[uid], undefined);
    assert(h.timers.includes('expired-timeout')); assert(h.timers.includes('diagnostic-timer'));
    assert.equal(c.waitingPlayer, null); assert(!c.privateRooms.removed); assert(c.privateRooms.kept);
    assert(!c.pendingChallenges.own); assert(c.pendingChallenges.kept);
    assert.equal(c.onlinePlayers[uid], undefined); assert(c.onlinePlayers[other]);
    assert(!c.recentLifecycleGraceByUid.has(uid)); assert(!c.recentEndedOnlineRooms.has('removed'));
    assert(c.recentEndedOnlineRooms.has('kept'));
    assert.equal(c.globalChatHistory.length, 1); assert.equal(c.globalChatHistory[0].senderUid, other);
    assert.equal(c.tournamentState.players.length, 1); assert.equal(c.tournamentState.bracket.qf[0].p1, null);
    assert.equal(c.tournamentState.bracket.qf[0].p2.id, other);
    assert(!JSON.stringify(h.writes).includes(uid));
    assert(h.events.some(event => event[0] === 'account_deletion_started'));

    const active = harness('active'), a = active.c;
    a.tournamentState.players = [player(uid), player(other)];
    a.tournamentState.bracket.qf[0] = a.createTournamentMatch(player(uid), player(other));
    await a.prepareRuntimeForAccountDeletion(uid, replacement);
    assert.equal(a.tournamentState.bracket.qf[0].winnerId, other);
    assert.equal(a.tournamentState.bracket.sf[0].p1.id, other);
    assert.equal(a.tournamentState.bracket.qf[0].technicalWinReason, 'account_deleted');
    assert(!JSON.stringify(active.writes).includes('Private name'));
    // An already advanced deleted entrant must also forfeit when the next
    // opponent arrives later, rather than leaving the bracket permanently stuck.
    a.tournamentState.bracket.f[0] = a.createTournamentMatch({ id: replacement }, null);
    await a.settleDeletedTournamentParticipants();
    assert.equal(a.tournamentState.bracket.f[0].winnerId, null);
    a.tournamentState.bracket.f[0].p2 = player(other);
    await a.settleDeletedTournamentParticipants();
    assert.equal(a.tournamentState.bracket.f[0].winnerId, other);
    assert.deepEqual(active.prizes, [other]);

    const both = harness('active'), b = both.c;
    b.tournamentState.bracket.f[0] = b.createTournamentMatch({ id: replacement }, { id: 'deleted_abcdef12-1234-1234-1234-123456789abc' });
    await b.settleDeletedTournamentParticipants();
    assert.equal(b.tournamentState.status, 'finished');
    assert.equal(b.tournamentState.bracket.f[0].prizesAwarded, true);
    assert.deepEqual(both.prizes, [], 'no currency or champion award for deleted placeholders');

    const failed = harness(); failed.c.failWrite = true;
    await assert.rejects(failed.c.prepareRuntimeForAccountDeletion(uid, replacement), /database unavailable/);
    assert.equal(failed.writes.length, 0, 'durable cleanup failure must be retryable, never reported as complete');
    console.log('Account deletion runtime checks passed: live-room shutdown, expired reconnect cleanup, registration removal, delayed tournament walkovers, preserved opponents and durable-write failure.');
}
run().catch(error => { console.error(error); process.exitCode = 1; });
