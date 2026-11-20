'use strict';

// Real loopback server and synthetic sockets; no Firebase accounts or database.
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const http = require('node:http');
const net = require('node:net');
const os = require('node:os');
const path = require('node:path');
const { io } = require('../www/socket.io.min.js');

const rows = ['1', '2', '3', '4', '5', '6', 'Max', 'Min', 'Triling', 'Kenta', 'Ful', 'Poker', 'Yamb'];
const columns = ['Nadole', 'Slobodna', 'Sredina', 'Nagore', 'Ru\u010dno', 'Najava'];
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const once = (socket, event, timeout = 5000) => new Promise((resolve, reject) => {
    const handler = data => { clearTimeout(timer); resolve(data); };
    const timer = setTimeout(() => { socket.off(event, handler); reject(Error(`Timed out: ${event}`)); }, timeout);
    socket.once(event, handler);
});
const ack = (socket, event, data) => new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(Error(`Ack timeout: ${event}`)), 5000);
    socket.emit(event, data, result => { clearTimeout(timer); resolve(result); });
});
const freePort = () => new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
        const port = server.address().port;
        server.close(() => resolve(port));
    });
});
const health = port => new Promise(resolve => {
    const req = http.get(`http://127.0.0.1:${port}/healthz`, res => {
        res.resume();
        res.on('end', () => resolve(res.statusCode === 200));
    });
    req.on('error', () => resolve(false));
    req.setTimeout(1000, () => req.destroy());
});
const sync = async (socket, roomId) => {
    const response = once(socket, 'sync_state_response');
    socket.emit('request_state_sync', { roomId });
    return response;
};
const rejectAction = async (socket, event, data) => {
    const response = once(socket, 'sync_state_response');
    socket.emit(event, data);
    return response;
};
const roll = async (player, opponent, roomId) => {
    const responses = [once(player, 'remote_roll'), once(opponent, 'remote_roll')];
    player.emit('dice_roll', { roomId, values: [9, 9, 9, 9, 9, 9], bacanje: 99 });
    const [mine, theirs] = await Promise.all(responses);
    assert.deepEqual(mine, theirs);
    assert.equal(mine.values.length, 6);
    assert(mine.values.every(value => Number.isInteger(value) && value >= 1 && value <= 6));
    return mine;
};
const announce = async (player, opponent, roomId, type, row) => {
    const response = once(opponent, 'remote_announce');
    player.emit('announce', { roomId, type, row });
    return response;
};
const move = async (player, opponent, roomId, pIdx, col, row) => {
    const response = once(opponent, 'remote_move');
    player.emit('player_move', { roomId, pIdx, col, row, points: 999 });
    const result = await response;
    assert.equal(result.pIdx, pIdx);
    assert.equal(result.col, col);
    assert.equal(result.row, row);
    assert(result.points >= 0 && result.points < 999);
    return result;
};

async function main() {
    const port = await freePort();
    const env = { ...process.env, PORT: String(port), YAMB_RUNTIME_ENV: 'test', YAMB_TEST_ENV_FILE: '',
        MONGO_URI: '', GOOGLE_APPLICATION_CREDENTIALS: '', FIREBASE_SERVICE_ACCOUNT: '',
        FIREBASE_ADMIN_CREDENTIALS: '', FIREBASE_SERVICE_ACCOUNT_BASE64: '', FIREBASE_SERVICE_ACCOUNT_PATH: '',
        FIREBASE_CONFIG: '', GOOGLE_CLOUD_PROJECT: '', GCLOUD_PROJECT: '' };
    const child = spawn(process.execPath, [path.resolve(__dirname, '../server.js')], {
        cwd: os.tmpdir(), env, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe']
    });
    let output = '';
    for (const stream of [child.stdout, child.stderr]) stream.on('data', chunk => { output = (output + chunk).slice(-3000); });
    const clients = [];
    try {
        const deadline = Date.now() + 20000;
        while (!await health(port)) {
            assert.equal(child.exitCode, null, output);
            assert(Date.now() < deadline, `Server startup timeout: ${output}`);
            await delay(100);
        }
        const connect = async () => {
            const socket = io(`http://127.0.0.1:${port}`, {
                transports: ['websocket'], forceNew: true, reconnection: false, timeout: 5000
            });
            clients.push(socket);
            await once(socket, 'connect');
            return socket;
        };

        const queued = await connect(), friend = await connect(), probe = await connect();
        const enterQueue = async socket => {
            const waiting = once(socket, 'waiting_for_opponent');
            socket.emit('find_game', { nickname: 'QA waiting' });
            await waiting;
        };
        const clearQueue = async socket => {
            socket.emit('back_to_menu');
            assert.equal((await ack(socket, 'send_challenge', { targetId: 'offline-test' })).reason, 'err_player_not_on_server');
        };
        await enterQueue(queued);
        assert.equal((await ack(queued, 'send_challenge', { targetId: 'offline-test' })).reason, 'err_player_not_on_server');
        const directInvite = once(friend, 'incoming_challenge');
        directInvite.catch(() => {});
        const switchToInvite = await ack(queued, 'send_challenge', { targetId: friend.id });
        assert.equal(switchToInvite.ok, true, 'Waiting for RANDOM must not block an outgoing direct invite');
        assert.equal(switchToInvite.leftMatchmaking, true);
        const pendingInvite = await directInvite;
        await enterQueue(probe);
        await clearQueue(probe);
        const declinedInvite = once(queued, 'challenge_declined');
        friend.emit('challenge_response', { challengerId: queued.id, challengeId: pendingInvite.challengeId, accepted: false });
        await declinedInvite;
        await enterQueue(queued);
        const privateWaiting = once(queued, 'private_waiting');
        privateWaiting.catch(() => {});
        queued.emit('join_private_game', { nickname: 'QA host', roomId: 'yamb-queue-transition' });
        await privateWaiting;
        await enterQueue(probe);
        await clearQueue(probe);
        await clearQueue(queued);
        const afterCancel = once(friend, 'incoming_challenge');
        assert.equal((await ack(queued, 'send_challenge', { targetId: friend.id })).ok, true, 'Cancelling a private waiting room must immediately release busy state');
        const cancelledRoomInvite = await afterCancel;
        const declineAfterCancel = once(queued, 'challenge_declined');
        friend.emit('challenge_response', { challengerId: queued.id, challengeId: cancelledRoomInvite.challengeId, accepted: false });
        await declineAfterCancel;
        console.log('PASS: RANDOM waiting -> direct invite/private room, queue removal, failed invite, and immediate busy-state release after cancelling.');

        const a = await connect(), b = await connect();
        const waiting = once(a, 'waiting_for_opponent');
        a.emit('find_game', { nickname: 'QA A' });
        await waiting;
        const starts = [once(a, 'game_start'), once(b, 'game_start')];
        b.emit('find_game', { nickname: 'QA B' });
        const [startA, startB] = await Promise.all(starts);
        const roomId = startA.roomId;
        assert.equal(startB.roomId, roomId);
        assert.equal(startA.myIndex, 0);
        assert.equal(startB.myIndex, 1);
        assert.equal((await rejectAction(b, 'dice_roll', { roomId })).brojBacanja, 0);
        assert.equal((await rejectAction(a, 'player_move', { roomId, pIdx: 0, col: 'Slobodna', row: '1', points: 0 })).brojBacanja, 0);
        assert.equal((await ack(a, 'request_rematch', {})).ok, false);
        const prematureEnd = await rejectAction(a, 'game_over', {});
        assert.equal(prematureEnd.currentPlayerIdx, 0);

        const first = await roll(a, b, roomId);
        assert.equal(first.bacanje, 1);
        const held = once(b, 'remote_hold');
        a.emit('dice_hold', { roomId, index: 0, status: true });
        await held;
        await announce(a, b, roomId, 'start');
        assert.equal((await rejectAction(a, 'dice_roll', { roomId })).brojBacanja, 1);
        await announce(a, b, roomId, 'selected', '1');
        await announce(a, b, roomId, 'cancel');
        assert.equal((await sync(a, roomId)).najavljenoPolje, null, 'Cancel is allowed before a reroll');
        await announce(a, b, roomId, 'start');
        await announce(a, b, roomId, 'selected', '1');
        const second = await roll(a, b, roomId);
        assert.equal(second.bacanje, 2);
        assert.equal(second.values[0], first.values[0], 'Held die must not reroll');
        const locked = await rejectAction(a, 'announce', { roomId, type: 'cancel' });
        assert.equal(locked.najavljenoPolje?.row, '1', 'A reroll must lock the announced field');
        assert.equal((await rejectAction(a, 'player_move', { roomId, pIdx: 0, col: 'Slobodna', row: '1', points: 0 })).currentPlayerIdx, 0);
        const third = await roll(a, b, roomId);
        assert.equal(third.bacanje, 3);
        assert.equal((await rejectAction(a, 'dice_roll', { roomId })).brojBacanja, 3);
        const scored = await move(a, b, roomId, 0, 'Najava', '1');
        assert.equal(scored.points, third.values.filter(value => value === 1).length);
        const afterMove = await sync(a, roomId);
        assert.equal(afterMove.allScores[0].Najava['1'], scored.points);
        assert.equal(afterMove.currentPlayerIdx, 1);
        assert.equal(afterMove.brojBacanja, 0);

        await roll(b, a, roomId);
        await move(b, a, roomId, 1, 'Najava', '1');
        await roll(a, b, roomId);
        await announce(a, b, roomId, 'start');
        const filled = await rejectAction(a, 'announce', { roomId, type: 'selected', row: '1' });
        assert.equal(filled.najavaAktivna, true, 'Filled fields must not become the locked announcement');
        assert.equal(filled.najavljenoPolje, null);
        await announce(a, b, roomId, 'cancel');

        const order = Object.fromEntries(columns.map(col => [col, col === 'Nagore' ? [...rows].reverse()
            : col === 'Sredina' ? ['Max', '6', '5', '4', '3', '2', '1', 'Min', 'Triling', 'Kenta', 'Ful', 'Poker', 'Yamb'] : rows]));
        const completed = Promise.all([once(a, 'online_game_finished', 20000), once(b, 'online_game_finished', 20000)]);
        completed.catch(() => {});
        for (const col of columns) for (const row of order[col]) for (const [pIdx, player, opponent] of [[0, a, b], [1, b, a]]) {
            if (col === 'Najava' && row === '1') continue;
            const state = await sync(player, roomId);
            assert.equal(state.currentPlayerIdx, pIdx);
            if (state.brojBacanja === 0) await roll(player, opponent, roomId);
            await move(player, opponent, roomId, pIdx, col, row);
        }
        const [endA, endB] = await completed;
        assert.deepEqual(endA, endB);
        const final = await sync(a, roomId);
        assert(final.allScores.every(sheet => columns.every(col => rows.every(row => Number.isFinite(sheet[col][row])))));
        const outsider = await connect();
        const full = once(outsider, 'room_full');
        outsider.emit('join_private_game', { nickname: 'Outsider', roomId });
        await full;
        const requested = once(b, 'rematch_requested');
        assert.equal((await ack(a, 'request_rematch', {})).ok, true);
        await requested;
        const declined = once(a, 'rematch_declined');
        b.emit('decline_rematch');
        await declined;
        assert.equal((await ack(b, 'accept_rematch', {})).ok, false);
        const requestedAgain = once(b, 'rematch_requested');
        assert.equal((await ack(a, 'request_rematch', {})).ok, true);
        await requestedAgain;
        assert.equal((await ack(a, 'accept_rematch', {})).ok, false, 'Requester cannot accept its own rematch');
        const rematches = [once(a, 'rematch_started'), once(b, 'rematch_started')];
        assert.equal((await ack(b, 'accept_rematch', {})).ok, true);
        await Promise.all(rematches);
        const fresh = await sync(a, roomId);
        assert.equal(fresh.currentPlayerIdx, 0);
        assert.equal(fresh.brojBacanja, 0);
        assert(fresh.allScores.every(sheet => columns.every(col => rows.every(row => sheet[col][row] === null))));
        await roll(a, b, roomId);
        console.log('PASS: RANDOM full 156-move match, authoritative dice/scores, turn/roll guards, holds, announcement locking, filled fields, completion and rematch.');

        const c = await connect(), d = await connect();
        assert.equal((await ack(a, 'send_challenge', { targetId: d.id })).reason, 'err_player_busy', 'A real active duel must still block outgoing invites');
        const blockedPrivateJoin = once(a, 'error_msg');
        a.emit('join_private_game', { nickname: 'Active player', roomId: 'yamb-active-must-not-leave' });
        assert.equal(await blockedPrivateJoin, 'err_player_busy');
        assert.equal((await sync(a, roomId)).brojBacanja, 1, 'Blocked mode changes must preserve the active duel');
        const challenge = async () => {
            const incoming = once(d, 'incoming_challenge');
            assert.equal((await ack(c, 'send_challenge', { targetId: d.id })).ok, true);
            return incoming;
        };
        assert.equal((await ack(c, 'send_challenge', { targetId: a.id })).reason, 'err_player_busy');
        const invite1 = await challenge();
        assert.equal((await ack(c, 'send_challenge', { targetId: d.id })).reason, 'duel_pending');
        const decline = once(c, 'challenge_declined');
        d.emit('challenge_response', { challengerId: c.id, challengeId: invite1.challengeId, accepted: false });
        await decline;
        const invite2 = await challenge();
        const busy = once(c, 'error_msg');
        d.emit('challenge_response', { challengerId: c.id, challengeId: invite2.challengeId, accepted: false, busy: true });
        assert.equal(await busy, 'err_player_busy');
        const invite3 = await challenge();
        const duels = [once(c, 'game_start'), once(d, 'game_start')];
        d.emit('challenge_response', { challengerId: c.id, challengeId: invite3.challengeId, accepted: true });
        const [duelC, duelD] = await Promise.all(duels);
        assert.equal(duelC.roomId, duelD.roomId);
        assert.equal(duelC.directDuel, true);
        await roll(c, d, duelC.roomId);
        console.log('PASS: direct/global-chat duel protocol, duplicate invite, busy target, decline, DND and accept with gameplay.');
    } finally {
        for (const client of clients) client.close();
        child.kill();
        if (child.exitCode === null) await new Promise(resolve => child.once('exit', resolve));
    }
}

main().catch(error => { console.error(error); process.exitCode = 1; });
