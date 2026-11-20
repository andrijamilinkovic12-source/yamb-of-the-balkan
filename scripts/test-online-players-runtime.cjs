'use strict';

// Real loopback sockets, with no Firebase credentials, .env or production database.
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const http = require('node:http');
const net = require('node:net');
const os = require('node:os');
const path = require('node:path');
const { io } = require('../www/socket.io.min.js');

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
function once(socket, event, predicate = () => true) {
    return new Promise((resolve, reject) => {
        const handler = data => {
            if (!predicate(data)) return;
            clearTimeout(timer);
            socket.off(event, handler);
            resolve(data);
        };
        const timer = setTimeout(() => {
            socket.off(event, handler);
            reject(Error(`Timed out: ${event}`));
        }, 5000);
        socket.on(event, handler);
    });
}
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

async function main() {
    const port = await freePort();
    const env = { ...process.env, PORT: String(port), YAMB_RUNTIME_ENV: 'test',
        YAMB_TEST_ENV_FILE: path.join(os.tmpdir(), `yamb-online-players-${port}.env.missing`),
        MONGO_URI: '', GOOGLE_APPLICATION_CREDENTIALS: '', FIREBASE_SERVICE_ACCOUNT: '',
        FIREBASE_ADMIN_CREDENTIALS: '', FIREBASE_SERVICE_ACCOUNT_BASE64: '', FIREBASE_SERVICE_ACCOUNT_PATH: '',
        FIREBASE_CONFIG: '', GOOGLE_CLOUD_PROJECT: '', GCLOUD_PROJECT: '' };
    const child = spawn(process.execPath, [path.resolve(__dirname, '../server.js')], {
        cwd: os.tmpdir(), env, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe']
    });
    let output = '';
    for (const stream of [child.stdout, child.stderr]) stream.on('data', chunk => { output = (output + chunk).slice(-5000); });
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
        const randomMatch = async (a, b) => {
            const waiting = once(a, 'waiting_for_opponent');
            a.emit('find_game', { nickname: 'QA A' });
            await waiting;
            const starts = Promise.all([once(a, 'game_start'), once(b, 'game_start')]);
            b.emit('find_game', { nickname: 'QA B' });
            return (await starts)[0].roomId;
        };
        const watch = async (viewer, player, roomId) => {
            const started = once(viewer, 'spectate_started');
            const state = once(viewer, 'sync_state_response');
            assert.equal((await ack(viewer, 'request_spectate', { socketId: player.id, roomId })).ok, true);
            assert.equal((await started).roomId, roomId);
            const snapshot = await state;
            assert.equal(snapshot.roomId, roomId);
            assert.equal(snapshot.myIndex, -1);
            assert.equal(snapshot.allScores.length, 2);
            return snapshot;
        };

        const a = await connect(), b = await connect(), viewer = await connect(), peer = await connect();
        const room = await randomMatch(a, b);
        const count = once(a, 'room_spectators_count', n => n === 1);
        await watch(viewer, a, room);
        await count;
        const rolls = Promise.all([once(a, 'remote_roll'), once(viewer, 'remote_roll')]);
        a.emit('dice_roll', { roomId: room });
        const [roll, seenRoll] = await rolls;
        assert.deepEqual(seenRoll, roll);
        const held = once(viewer, 'remote_hold');
        a.emit('dice_hold', { roomId: room, index: 0, status: true });
        assert.equal((await held).status, true);
        const announced = once(viewer, 'remote_announce');
        a.emit('announce', { roomId: room, type: 'start' });
        await announced;
        const cancelled = once(viewer, 'remote_announce');
        a.emit('announce', { roomId: room, type: 'cancel' });
        await cancelled;
        const moved = once(viewer, 'remote_move');
        a.emit('player_move', { roomId: room, pIdx: 0, col: 'Slobodna', row: '1', points: 0 });
        assert.equal((await moved).pIdx, 0);
        const sync = once(viewer, 'sync_state_response');
        viewer.emit('request_state_sync', { roomId: room });
        assert.equal((await sync).currentPlayerIdx, 1);
        assert.equal((await ack(a, 'request_spectate', { socketId: b.id, roomId: room })).reason, 'err_spectate_participant');
        assert.equal((await ack(peer, 'request_spectate', { socketId: 'offline' })).reason, 'err_spectate_not_in_game');
        console.log('PASS: live spectate snapshot, dice, holds, announcements, moves, sync and invalid/self targets.');

        const c = await connect(), d = await connect();
        const otherRoom = await randomMatch(c, d);
        assert.equal((await ack(a, 'request_spectate', { socketId: c.id, roomId: otherRoom })).reason,
            'err_spectate_already_in_game', 'A participant must not become a spectator of another live game');
        const oldCount = once(a, 'room_spectators_count', n => n === 0);
        const newCount = once(c, 'room_spectators_count', n => n === 1);
        await watch(viewer, c, otherRoom);
        await Promise.all([oldCount, newCount]);
        const stopped = once(c, 'room_spectators_count', n => n === 0);
        viewer.emit('stop_spectating');
        await stopped;
        console.log('PASS: active-player guard, switching watched rooms and stopping spectate.');

        for (const viewerChallenges of [true, false]) {
            await watch(viewer, a, room);
            await watch(peer, c, otherRoom);
            const challenger = viewerChallenges ? viewer : peer;
            const responder = viewerChallenges ? peer : viewer;
            const incoming = once(responder, 'incoming_challenge');
            assert.equal((await ack(challenger, 'send_challenge', { targetId: responder.id })).ok, true);
            const invite = await incoming;
            assert.equal((await ack(challenger, 'send_challenge', { targetId: responder.id })).reason, 'duel_pending');
            const starts = Promise.all([once(viewer, 'game_start'), once(peer, 'game_start')]);
            const releasedA = once(a, 'room_spectators_count', n => n === 0);
            const releasedC = once(c, 'room_spectators_count', n => n === 0);
            responder.emit('challenge_response', { challengerId: challenger.id, challengeId: invite.challengeId, accepted: true });
            const [start] = await starts;
            await Promise.all([releasedA, releasedC]);
            const onlyOneSpectator = once(peer, 'room_spectators_count', n => n === 1);
            await watch(await connect(), viewer, start.roomId);
            // The new viewer is the only spectator; neither former viewer is counted as one.
            await onlyOneSpectator;
            const resumed = once(viewer, 'sync_state_response');
            viewer.emit('request_state_sync', { roomId: start.roomId });
            assert.equal((await resumed).myIndex, viewerChallenges ? 0 : 1);
            const left = once(peer, 'opponent_left');
            viewer.emit('back_to_menu');
            assert.equal((await left).roomId, start.roomId, 'Leaving the new duel must resolve that duel');
        }
        console.log('PASS: both spectators -> direct duel, old-room cleanup, player role and leaving the duel.');

        const host = await connect(), guest = await connect(), privateViewer = await connect();
        const privateRoom = 'yamb-online-players-fixture';
        await watch(host, a, room);
        const hostStoppedWatching = once(a, 'room_spectators_count', n => n === 0);
        const hosted = once(host, 'private_waiting');
        host.emit('join_private_game', { nickname: 'Host', roomId: privateRoom });
        await Promise.all([hosted, hostStoppedWatching]);
        const privateStarts = Promise.all([once(host, 'game_start'), once(guest, 'game_start')]);
        guest.emit('join_private_game', { nickname: 'Guest', roomId: privateRoom });
        await privateStarts;
        await watch(privateViewer, host, privateRoom);
        const released = once(host, 'room_spectators_count', n => n === 0);
        privateViewer.close();
        await released;
        console.log('PASS: private-room spectate and spectator count after disconnect.');

        const randomViewer = await connect(), randomPeer = await connect();
        await watch(randomViewer, a, room);
        const randomStoppedWatching = once(a, 'room_spectators_count', n => n === 0);
        await randomMatch(randomViewer, randomPeer);
        await randomStoppedWatching;
        console.log('PASS: spectator -> RANDOM/private room releases the old spectator role.');

        const busyTarget = await connect(), idleChallenger = await connect();
        let delivered = 0;
        busyTarget.on('incoming_challenge', () => { delivered++; });
        const barrier = socket => ack(socket, 'send_challenge', { targetId: 'offline-fixture' });
        busyTarget.emit('set_player_busy', { busy: true, reason: 'daily_challenge' });
        await barrier(busyTarget);
        assert.equal((await ack(idleChallenger, 'send_challenge', { targetId: busyTarget.id })).reason, 'err_player_busy');
        await barrier(busyTarget);
        assert.equal(delivered, 0, 'A blocked daily player receives no invitation');
        for (const accepted of [true, false]) {
            busyTarget.emit('set_player_busy', { busy: false });
            await barrier(busyTarget);
            const incoming = once(busyTarget, 'incoming_challenge');
            assert.equal((await ack(idleChallenger, 'send_challenge', { targetId: busyTarget.id })).ok, true);
            const invite = await incoming;
            busyTarget.emit('set_player_busy', { busy: true, reason: 'daily_challenge' });
            const response = once(idleChallenger, accepted ? 'error_msg' : 'challenge_declined');
            busyTarget.emit('challenge_response', { challengerId: idleChallenger.id, challengeId: invite.challengeId, accepted });
            const result = await response;
            if (accepted) assert.equal(result, 'err_player_busy');
            assert.equal((await ack(idleChallenger, 'send_challenge', { targetId: busyTarget.id })).reason, 'err_player_busy',
                'A stale answer cannot clear the active daily busy flag');
        }
        console.log('PASS: live daily busy rejection without invitation delivery, accept/decline races and preserved busy state.');

        peer.emit('challenge_response');
        peer.emit('challenge_response', null);
        assert.equal((await ack(peer, 'send_challenge', { targetId: 'offline' })).reason, 'err_player_not_on_server');
        assert.equal(await health(port), true, 'Malformed invite responses must not terminate the server');
        console.log('PASS: malformed duel replies leave the server running.');
    } finally {
        for (const client of clients) client.close();
        child.kill();
        if (child.exitCode === null) await new Promise(resolve => child.once('exit', resolve));
    }
}

main().catch(error => { console.error(error); process.exitCode = 1; });
