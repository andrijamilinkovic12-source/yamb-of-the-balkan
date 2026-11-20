'use strict';

// Production handlers with disposable in-memory fixtures. No server, account or database.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { createMail, appendMail } = require('../lib/player-mailbox');
const source = fs.readFileSync(require.resolve('../server'), 'utf8');
const slice = (start, end) => {
    const a = source.indexOf(start), b = source.indexOf(end, a + start.length);
    assert(a >= 0 && b > a, `Missing production block: ${start}`);
    return source.slice(a, b);
};
const register = (ctx, start, end) => vm.runInContext(`(function(socket) {\n${slice(start, end)}\n})(socket);`, ctx);

function fixture() {
    const sockets = new Map(), rooms = new Map(), sids = new Map(), events = [];
    const ctx = vm.createContext({ console: { log() {}, error() {} }, Date, Map, Set,
        roomState: {}, playerRooms: {}, registeredSockets: {}, onlinePlayers: {}, ghostSessions: {},
        privateRooms: {}, activeConnections: new Map(), gameStartTimes: {}, gameCarriedDurations: {}, waitingPlayer: null,
        MONGO_URI: '', TURN_TIME_LIMIT: 60000, hasActiveDisconnectGraceForRoom: () => false,
        getRoomDisconnectGraceRemainingMs: () => 0,
        getVerifiedUid: s => s.verifiedUid || null,
        io: { sockets: { sockets, adapter: { rooms, sids } }, emit: (name, data) => events.push({ name, data }),
            to: id => ({ emit: (name, data) => events.push({ id, name, data }) }) }
    });
    const addSocket = (id, uid = '', name = id) => {
        const hooks = new Map();
        const socket = { id, playerName: name, playerId: uid, verifiedUid: uid, connected: true,
            rooms: new Set(), hooks, on: (event, fn) => hooks.set(event, fn),
            emit: (event, data) => events.push({ id, name: event, data }),
            to: room => ({ emit: (event, data) => events.push({ id: room, name: event, data }) }),
            join(room) { if (!rooms.has(room)) rooms.set(room, new Set()); rooms.get(room).add(id); this.rooms.add(room); },
            leave(room) { rooms.get(room)?.delete(id); this.rooms.delete(room); }
        };
        sockets.set(id, socket);
        sids.set(id, socket.rooms);
        socket.join(id);
        if (uid) ctx.onlinePlayers[uid] = id;
        ctx.activeConnections.set(id, 'shared-ip');
        return socket;
    };
    vm.runInContext([
        slice('function getSocketUid(', 'function getActiveOnlineRoomForUid('),
        slice('function isLocalRoomId(', 'function reattachSocketToRoomByUid('),
        slice('function getParticipantIndexForSocketOrUid(', 'function flushPendingOnlineRoomResume('),
        slice('function isTournamentRoomId(', 'function getDisconnectGraceMs('),
        slice('function parseTournamentRoomId(', 'function sanitizeTournamentMatchScore('),
        slice('function getUniqueOnlinePlayersCount(', 'function getRealtimeMonitorSnapshot('),
        slice('function updateRoomSpectators(', 'let deletionTournamentSettlementRunning')
    ].join('\n'), ctx);
    return { ctx, events, sockets, addSocket };
}

async function presenceAndSpectate() {
    const f = fixture(), { ctx, addSocket } = f;
    addSocket('a', 'uid-a'); addSocket('a-duplicate', 'uid-a'); addSocket('b', 'uid-b');
    addSocket('guest-a'); addSocket('guest-b'); addSocket('unnamed', '', '');
    assert.equal(ctx.getUniqueOnlinePlayersCount(), 4, 'Count and list must use the same UID/socket identity, not IP');
    ctx.socket = f.sockets.get('a');
    register(ctx, "    socket.on('get_online_players_list',", "    socket.on('back_to_menu',");
    await ctx.socket.hooks.get('get_online_players_list')();
    const list = f.events.find(e => e.name === 'online_players_list_data').data;
    assert.equal(list.length, 4);
    assert.equal(list.filter(p => p.uid === 'uid-a').length, 1);

    for (const roomId of ['local_solo', 'local_hotseat', 'local_ai', 'room_random', 'duel_direct', 'yamb-private', 'tourney_qf_0', 'tourney_qf_0_fixture', 'tourney_sf_0_fixture', 'tourney_f_0_fixture']) {
        const f = fixture(), { ctx, addSocket, events } = f;
        const host = addSocket('host', 'host-uid'), opponent = addSocket('opponent', 'opponent-uid');
        const viewer = addSocket('viewer', 'viewer-uid');
        host.join(roomId);
        ctx.playerRooms.host = roomId;
        if (!roomId.startsWith('local_')) {
            opponent.join(roomId);
            ctx.playerRooms.opponent = roomId;
            ctx.roomState[roomId] = { players: [host.id, opponent.id], playerUids: [host.playerId, opponent.playerId],
                playerNames: ['Host', 'Opponent'], allScores: [{ Slobodna: { '1': 2 } }, { Slobodna: { '1': null } }],
                turnIndex: 1, kockiceVals: [1, 2, 3, 4, 5, 6], brojBacanja: 2 };
        }
        const presence = ctx.buildOnlinePlayerPresence(host, host.id, ['host-uid']);
        assert.equal(presence.roomId, roomId);
        assert.equal(presence.canSpectate, true);
        assert.equal(presence.isBusy, true);
        assert.equal(presence.isFriend, true);
        const isTournament = /^tourney_(qf|sf|f)_0_fixture$/.test(roomId);
        assert.equal(presence.isTournamentMatch, isTournament, 'Only a real, active tournament room gets the badge');
        if (isTournament) assert.equal(ctx.buildOnlinePlayerPresence(opponent, opponent.id).isTournamentMatch, true);
        ctx.socket = viewer;
        register(ctx, "    socket.on('request_spectate',", "    socket.on('start_local_game',");
        ctx.waitingPlayer = { id: viewer.id, uid: viewer.playerId };
        let result;
        viewer.hooks.get('request_spectate')({ socketId: host.id, uid: host.playerId, roomId }, r => { result = r; });
        assert.equal(result.ok, true, roomId);
        assert.equal(ctx.waitingPlayer, null, 'Spectating must release RANDOM waiting');
        assert.equal(viewer.isSpectator, true);
        assert.equal(viewer.spectatingRoom, roomId);
        assert.equal(ctx.buildOnlinePlayerPresence(viewer, viewer.id).isTournamentMatch, false, 'Watching a tournament is not playing one');
        if (roomId.startsWith('local_')) assert(events.some(e => e.name === 'request_state_sync' && e.data.senderSocketId === viewer.id));
        else {
            const snapshot = events.find(e => e.name === 'sync_state_response').data;
            assert.equal(snapshot.myIndex, -1);
            assert.equal(snapshot.brojBacanja, 2);
            assert.equal(snapshot.currentPlayerIdx, 1);
        }
        viewer.hooks.get('stop_spectating')();
        assert.equal(viewer.rooms.has(roomId), false);
        assert.equal(viewer.isSpectator, false);
        const self = addSocket('self-copy', host.playerId);
        ctx.socket = self;
        register(ctx, "    socket.on('request_spectate',", "    socket.on('start_local_game',");
        self.hooks.get('request_spectate')({ socketId: host.id, roomId }, r => { result = r; });
        assert.equal(result.reason, 'err_spectate_participant', 'Same account on another connection is still a participant');
        if (ctx.roomState[roomId]) {
            Object.assign(ctx, { stopTurnTimer() {}, clearDisconnectGraceForRoom() {}, scheduleFinishedRoomCleanup() {} });
            vm.runInContext(slice('function markOnlineRoomGameFinished(', 'function cleanupOnlineRoom('), ctx);
            ctx.markOnlineRoomGameFinished(roomId);
            assert(events.some(event => event.name === 'online_players_status_changed'), 'Finishing publishes a list refresh');
            assert.equal(ctx.buildOnlinePlayerPresence(host, host.id).canSpectate, false);
            assert.equal(ctx.buildOnlinePlayerPresence(host, host.id).isTournamentMatch, false);
            viewer.hooks.get('request_spectate')({ socketId: host.id, roomId }, r => { result = r; });
            assert.equal(result.reason, 'err_spectate_not_in_game');
            delete ctx.roomState[roomId];
            ctx.privateRooms[roomId] = { p1: { id: host.id, uid: host.playerId } };
            assert.equal(ctx.buildOnlinePlayerPresence(host, host.id).isTournamentMatch, false, 'Waiting for a tournament opponent has no live badge');
        }
    }
    console.log('PASS: unique count/list, same-IP players, duplicate accounts, friends, solo/hotseat/AI and all online/tournament spectate fixtures, queue release, self and finished-game guards.');
}

async function friendships() {
    const f = fixture(), { ctx, addSocket, events } = f;
    const profiles = new Map(['alice', 'bob', 'offline'].map(uid => [uid, { firebaseUid: uid, playerName: uid,
        friends: [], friendRequests: [], playerMailbox: [], friendNotifications: [] }]));
    let queries = 0, failSecondWrite = false;
    ctx.MONGO_URI = 'in-memory-fixture';
    ctx.UserProfile = {
        async findOne({ firebaseUid }) { queries++; assert.equal(typeof firebaseUid, 'string'); return structuredClone(profiles.get(firebaseUid) || null); },
        async updateOne(filter, update) {
            const p = profiles.get(filter.firebaseUid);
            if (failSecondWrite && filter.firebaseUid === 'alice') throw Error('fixture-write-failed');
            if (!p) return { modifiedCount: 0, matchedCount: 0 };
            for (const [key, condition] of Object.entries(filter)) {
                if (key === 'firebaseUid') continue;
                if (condition && typeof condition === 'object' ? p[key].includes(condition.$ne) : !p[key].includes(condition)) return { modifiedCount: 0, matchedCount: 0 };
            }
            for (const [key, value] of Object.entries(update.$pull || {})) p[key] = p[key].filter(x => x !== value);
            for (const [key, value] of Object.entries(update.$addToSet || {})) if (!p[key].includes(value)) p[key].push(value);
            for (const [key, value] of Object.entries(update.$push || {})) p[key].push(...(value.$each || [value]));
            return { modifiedCount: 1, matchedCount: 1 };
        }
    };
    ctx.mongoose = { connection: { async transaction(fn) {
        const before = structuredClone([...profiles]);
        try { return await fn({}); } catch (err) { profiles.clear(); for (const [id, p] of before) profiles.set(id, p); throw err; }
    } } };
    Object.assign(ctx, { createMail, appendMail, notifyPlayerMailbox: uid => events.push({ name: 'mailbox', id: uid }),
        getConnectedFriendSocketId: uid => [...f.sockets.values()].find(s => s.verifiedUid === uid)?.id || '' });
    const client = (id, uid) => {
        const socket = addSocket(id, uid);
        ctx.socket = socket;
        register(ctx, "    socket.on('send_friend_req',", "    socket.on('remove_friend',");
        return { socket, call: (name, data) => new Promise(resolve => socket.hooks.get(name)(data, resolve)) };
    };
    const alice = client('alice-phone', 'alice'), bob = client('bob-phone', 'bob'), guest = client('guest', '');
    guest.socket.playerId = 'alice';
    assert.equal((await guest.call('send_friend_req', { targetUid: 'bob' })).reason, 'err_friend_auth_required');
    assert.equal((await guest.call('resolve_friend_req', { challengerUid: 'bob', accepted: true })).reason, 'err_friend_auth_required');
    const before = queries;
    for (const value of [{ $ne: null }, [], '<invalid>']) {
        assert.equal((await alice.call('send_friend_req', { targetUid: value })).reason, 'err_friend_target_missing');
        assert.equal((await bob.call('resolve_friend_req', { challengerUid: value })).reason, 'err_friend_request_missing');
    }
    assert.equal(queries, before, 'Malformed UIDs must never reach a database query');
    assert.equal((await alice.call('send_friend_req', { targetUid: 'alice' })).reason, 'err_friend_self');
    assert.equal((await alice.call('send_friend_req', { targetUid: 'missing' })).ok, false);
    assert.equal((await alice.call('send_friend_req', { targetId: bob.socket.id })).status, 'sent');
    assert.equal((await alice.call('send_friend_req', { targetUid: 'bob' })).status, 'already_pending');
    assert.equal(profiles.get('bob').playerMailbox.length, 1);
    assert.equal((await bob.call('send_friend_req', { targetUid: 'alice' })).reason, 'err_friend_request_waiting_on_you');
    assert.equal((await bob.call('resolve_friend_req', { challengerUid: 'alice', accepted: false })).ok, true);
    assert.equal(profiles.get('bob').friends.length, 0);
    assert.equal((await bob.call('resolve_friend_req', { challengerUid: 'alice', accepted: true })).ok, false);
    await alice.call('send_friend_req', { targetUid: 'bob' });
    failSecondWrite = true;
    const notices = events.length;
    assert.equal((await bob.call('resolve_friend_req', { challengerUid: 'alice', accepted: true })).ok, false);
    assert.equal(events.length, notices, 'No successful notification may precede commit');
    assert.deepEqual(profiles.get('bob').friendRequests, ['alice']);
    assert.equal(profiles.get('bob').friends.length, 0);
    failSecondWrite = false;
    assert.equal((await bob.call('resolve_friend_req', { challengerUid: 'alice', accepted: true })).ok, true);
    assert.deepEqual(profiles.get('alice').friends, ['bob']);
    assert.deepEqual(profiles.get('bob').friends, ['alice']);
    assert.equal((await alice.call('send_friend_req', { targetUid: 'bob' })).reason, 'err_friend_already_added');
    assert.equal((await alice.call('send_friend_req', { targetUid: 'offline' })).targetOnline, false);
    assert.deepEqual(profiles.get('offline').friendRequests, ['alice']);
    console.log('PASS: friend send, duplicate, incoming request, decline, stale accept, bilateral accept, offline delivery, verified identity, UID validation and simulated transactional failure.');
}

function duelFixture() {
    const f = fixture(), { ctx, addSocket } = f;
    Object.assign(ctx, { pendingChallenges: {}, CHALLENGE_RESPONSE_WINDOW_MS: 60000,
        setTimeout: () => 1, clearTimeout() {}, sanitizeTournamentName: value => value,
        createServerMatchId: () => 'fixture-match', createEmptyScores: () => [], startScoreSession() {}, startTurnTimer() {},
        getOnlineDuelType: () => 'challenge' });
    vm.runInContext([
        slice('function getChallengeKey(', 'function getRoomInviteKey('),
        slice('function clearPendingChallengesBetweenPlayers(', 'function decodeJwtPayloadWithoutVerification('),
        slice('function expirePendingChallenge(', 'function getActiveOnlineRoomForSocket(')
    ].join('\n'), ctx);
    const client = (id, uid = id) => {
        const socket = addSocket(id, uid);
        ctx.socket = socket;
        register(ctx, "    socket.on('send_challenge',", "    socket.on('game_over',");
        return socket;
    };
    const send = (from, to) => {
        let reply;
        from.hooks.get('send_challenge')({ targetId: to.id, targetUid: to.playerId }, result => { reply = result; });
        return reply;
    };
    const activate = (socket, mode) => {
        const roomId = mode.startsWith('local_') ? mode : `${mode}_fixture`;
        if (mode.startsWith('local_')) { socket.join(roomId); ctx.playerRooms[socket.id] = roomId; }
        else if (mode === 'daily') { socket.clientBusyForInvites = true; socket.clientBusyReason = 'daily_challenge'; }
        else if (mode === 'private_waiting') {
            ctx.privateRooms[roomId] = { p1: { id: socket.id, uid: socket.playerId } };
            ctx.playerRooms[socket.id] = roomId;
        } else if (mode === 'random_waiting') ctx.waitingPlayer = { id: socket.id, uid: socket.playerId };
        else {
            ctx.roomState[roomId] = { players: [socket.id, 'opponent'], playerUids: [socket.playerId, 'opponent-uid'] };
            ctx.playerRooms[socket.id] = roomId;
        }
    };
    return { ...f, client, send, activate };
}

function duelBusyGuards() {
    const modes = ['local_solo', 'local_hotseat', 'local_ai', 'room_random', 'yamb-private', 'duel_direct',
        'tourney_qf_0', 'tourney_sf_0', 'tourney_f_0', 'daily', 'private_waiting', 'random_waiting'];
    for (const mode of modes) {
        const f = duelFixture(), { ctx, events, client, send, activate } = f;
        const challenger = client('challenger'), target = client('target');
        assert.equal(ctx.buildOnlinePlayerPresence(target, target.id).isBusy, false);
        activate(target, mode);
        assert.equal(ctx.buildOnlinePlayerPresence(target, target.id).isBusy, true, mode);
        assert.equal(send(challenger, target).reason, 'err_player_busy', `${mode}: stale idle card must not send an invite`);
        assert.equal(events.some(event => event.name === 'incoming_challenge'), false, mode);
        assert.equal(Object.keys(ctx.pendingChallenges).length, 0);
        if (!mode.endsWith('_waiting')) assert.equal(send(target, challenger).reason, 'err_player_busy', `${mode}: busy sender is blocked too`);
    }

    {
        const { ctx, client, send, activate } = duelFixture();
        const challenger = client('challenger'), target = client('target');
        ctx.roomState.finished = { players: [target.id], gameFinished: true };
        ctx.playerRooms[target.id] = 'finished';
        activate(target, 'daily');
        assert.equal(send(challenger, target).reason, 'err_player_busy', 'A retained finished room must not hide a new daily game');
    }
    for (const mode of modes.filter(mode => !mode.endsWith('_waiting'))) for (const accepted of [true, false]) {
        const { ctx, events, client, send, activate } = duelFixture();
        const challenger = client('challenger'), target = client('target');
        assert.equal(send(challenger, target).ok, true);
        const invite = events.find(event => event.name === 'incoming_challenge').data;
        activate(target, mode);
        target.hooks.get('challenge_response')({ challengerId: challenger.id, challengeId: invite.challengeId, accepted });
        assert.equal(events.some(event => event.name === 'game_start'), false, `${mode}: a late answer cannot interrupt another game`);
        assert.equal(Object.keys(ctx.pendingChallenges).length, 0);
        assert.equal(ctx.isPlayerBusyForInvite(target.id, target.playerId), true, `${mode}: the active game's busy state survives`);
    }
    {
        const { ctx, events, client, send } = duelFixture();
        const challenger = client('challenger'), target = client('new-target', 'same-account');
        ctx.roomState.reconnecting = { players: ['old-target', 'opponent'], playerUids: [target.playerId, 'opponent-uid'] };
        ctx.ghostSessions[target.playerId] = { roomId: 'reconnecting' };
        assert.equal(send(challenger, target).reason, 'err_player_busy');
        assert.equal(events.some(event => event.name === 'incoming_challenge'), false);
    }
    {
        const { events, client, send } = duelFixture();
        const challenger = client('challenger'), target = client('target');
        assert.equal(send(challenger, target).ok, true);
        const invite = events.find(event => event.name === 'incoming_challenge').data;
        target.hooks.get('challenge_response')({ challengerId: challenger.id, challengeId: invite.challengeId, accepted: true });
        assert.equal(events.filter(event => event.name === 'game_start').length, 2, 'Idle players can still start their duel');
    }
    console.log('PASS: all-mode duel busy guards, stale idle cards, no delivered/pending invite, retained finished rooms, accept/decline races, reconnect UID and idle control. AI is a disabled-mode local-room fixture only.');
}

async function clientDuelBusyGuards() {
    const game = fs.readFileSync(require.resolve('../www/game.js'), 'utf8');
    const begin = game.indexOf('    initSocketConnection() {');
    const end = game.indexOf('\n    async authenticateSocketIdentity(', begin);
    assert(begin >= 0 && end > begin);
    function client() {
        const hooks = new Map(), emits = [], changes = [];
        let busy = false, prompts = 0, setups = 0;
        const socket = { id: 'client', connected: true, on: (name, fn) => hooks.set(name, fn),
            emit: (name, data) => emits.push({ name, data }) };
        const init = new Function('io', 'window', 'localStorage', 'gt', 'getFallbackPlayerName', 'document',
            `return ({${game.slice(begin, end)}}).initSocketConnection;`)(
            () => socket, { location: { origin: 'http://fixture.local', search: '' } },
            { getItem: () => null }, key => key, () => 'Player', { getElementById: () => null });
        const app = { playerId: 'fixture-user', playerName: 'Player', bindConnectionDiagnosticListeners() {},
            setupRoomInviteListeners() {}, reportCurrentConnectionDiagnosticSnapshot() {}, checkQuarterWinner() {},
            authenticateSocketIdentity: async () => ({ ok: true }), reportRecoveredConnectionDiagnostic() {},
            syncPendingMatchResults: async () => null, emitPlayerData: async () => ({ ok: false }),
            isDoNotDisturbActive: () => busy, escapeHtml: value => value,
            setupSocketListeners() { setups++; },
            setInviteBusyState(value, reason) { changes.push({ value, reason }); },
            modal: { async confirm() { prompts++; return false; }, async alert() {} } };
        init.call(app);
        return { app, hooks, emits, changes, setBusy: value => { busy = value; },
            counts: () => ({ prompts, setups }) };
    }
    for (const accepted of [true, false]) {
        const c = client();
        c.app.modal.confirm = async () => { c.setBusy(true); return accepted; };
        await c.hooks.get('incoming_challenge')({ challengerId: 'other', challengeId: 'pending', expiresAt: Date.now() + 60000 });
        assert.equal(c.emits.at(-1).data.accepted, false, 'A game starting while the prompt is open cancels the pending invitation');
        assert.equal(c.emits.at(-1).data.busy, true);
        assert.equal(c.changes.some(change => change.value === false), false);
        assert.equal(c.counts().setups, 0);
    }
    {
        const c = client();
        c.app.modal.confirm = async () => { c.setBusy(true); return true; };
        await c.hooks.get('incoming_challenge')({ challengerId: 'other', challengeId: 'expired', expiresAt: Date.now() - 1 });
        assert.equal(c.changes.some(change => change.value === false), false, 'Expired prompts do not clear an active daily challenge');
    }
    {
        const c = client();
        c.setBusy(true);
        await c.hooks.get('incoming_challenge')({ challengerId: 'other', challengeId: 'pending' });
        assert.equal(c.counts().prompts, 0);
        assert.equal(c.emits.at(-1).data.busy, true);
        c.app.clientInviteBusy = true;
        c.app.clientInviteBusyReason = 'daily_challenge';
        await c.hooks.get('connect')();
        assert(c.changes.some(change => change.value === true && change.reason === 'daily_challenge'),
            'Reconnection republishes the active daily busy flag');
    }
    console.log('PASS: client busy rejection without a popup, prompt acceptance/decline/expiry races and daily busy-state replay on reconnect.');
}

(async () => { await presenceAndSpectate(); await friendships(); duelBusyGuards(); await clientDuelBusyGuards(); })().catch(err => { console.error(err); process.exitCode = 1; });
