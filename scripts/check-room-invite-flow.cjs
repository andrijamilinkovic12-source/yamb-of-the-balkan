const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const http = require('node:http');
const net = require('node:net');
const os = require('node:os');
const path = require('node:path');
const { io } = require('../www/socket.io.min.js');

const waitEvent = (socket, event, timeout = 5000) => new Promise((resolve, reject) => {
  const timer = setTimeout(() => { socket.off(event, handler); reject(new Error(`Timed out: ${event}`)); }, timeout);
  const handler = data => { clearTimeout(timer); resolve(data); };
  socket.once(event, handler);
});
const emitAck = (socket, event, data, timeout = 5000) => new Promise((resolve, reject) => {
  const timer = setTimeout(() => reject(new Error(`Ack timeout: ${event}`)), timeout);
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
const health = port => new Promise((resolve, reject) => {
  http.get(`http://127.0.0.1:${port}/healthz`, response => {
    response.resume();
    response.on('end', () => resolve(response.statusCode === 200));
  }).on('error', reject);
});

async function checkInviteAcceptanceGuard() {
  const source = fs.readFileSync(path.resolve(__dirname, '../www/game.js'), 'utf8');
  const start = source.indexOf("this.socket.on('incoming_room_invite', async (data) => {");
  const end = source.indexOf("\n        this.setupOnlineRecoveryListeners();", start);
  assert.ok(start > 0 && end > start, 'incoming invite handler missing');
  const register = new Function('gt', 'getFallbackPlayerName', 'setTimeout', `return function () { ${source.slice(start, end)} }`)(
    () => '', () => 'Igrač', callback => callback()
  );
  let handler;
  let response = { ok: false, reason: 'room_invite_expired_self' };
  const navigation = [];
  const joins = [];
  const notices = [];
  const app = {
    socket: { connected: true, on(event, callback) { if (event === 'incoming_room_invite') handler = callback; } },
    modal: { confirm: async () => true, alert: async () => {} },
    isDoNotDisturbActive: () => false,
    escapeHtml: value => value,
    emitSocketAck: async () => response,
    showServerNotice: reason => notices.push(reason),
    navigateTo: screen => navigation.push(screen),
    joinPrivateGame: (...args) => joins.push(args),
    playerName: 'Friend'
  };
  register.call(app);
  assert.equal(typeof handler, 'function');
  const invite = { hostName: 'Host', hostSocketId: 'socket-host', roomId: 'yamb-qa', inviteId: 'invite-qa', expiresAt: Date.now() + 60000 };
  await handler(invite);
  assert.deepEqual(notices, ['room_invite_expired_self']);
  assert.equal(navigation.length, 0);
  assert.equal(joins.length, 0);
  response = { ok: true };
  await handler(invite);
  assert.deepEqual(navigation, ['splash-screen']);
  assert.equal(joins.length, 1);
  assert.equal(joins[0][1], invite.roomId);
}

(async () => {
  const port = await freePort();
  const env = { ...process.env, PORT: String(port), MONGO_URI: '', GOOGLE_APPLICATION_CREDENTIALS: '', FIREBASE_SERVICE_ACCOUNT: '', FIREBASE_ADMIN_CREDENTIALS: '', FIREBASE_SERVICE_ACCOUNT_BASE64: '', FIREBASE_SERVICE_ACCOUNT_PATH: '', FIREBASE_CONFIG: '', GOOGLE_CLOUD_PROJECT: '', GCLOUD_PROJECT: '' };
  const child = spawn(process.execPath, [path.resolve(__dirname, '../server.js')], { cwd: os.tmpdir(), env, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
  let serverOutput = '';
  for (const stream of [child.stdout, child.stderr]) stream.on('data', chunk => { serverOutput = (serverOutput + chunk.toString()).slice(-1500); });
  const clients = [];
  try {
    let ready = false;
    const startupTimeoutMs = Math.max(20000, Math.min(120000, Number(process.env.YAMB_QA_SERVER_START_TIMEOUT_MS) || 20000));
    const startupDeadline = Date.now() + startupTimeoutMs;
    while (Date.now() < startupDeadline) {
      if (child.exitCode !== null) throw new Error(`Server exited: ${child.exitCode}`);
      try { if (await health(port)) { ready = true; break; } } catch (_) {}
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    assert.ok(ready, `server did not start: ${serverOutput}`);
    const connect = async () => {
      const socket = io(`http://127.0.0.1:${port}`, { transports: ['websocket'], forceNew: true, reconnection: false, timeout: 5000 });
      clients.push(socket);
      await waitEvent(socket, 'connect');
      return socket;
    };
    const host = await connect();
    const target = await connect();
    const roomId = 'yamb-local-invite-check';
    const waiting = waitEvent(host, 'private_waiting');
    host.emit('join_private_game', { nickname: 'Host', roomId });
    assert.equal((await waiting).roomId, roomId);
    assert.equal((await emitAck(host, 'send_room_invite', { targetSocketId: target.id, roomId: 'yamb-not-hosted' })).reason, 'err_invalid_room');

    const incoming = waitEvent(target, 'incoming_room_invite');
    assert.equal((await emitAck(host, 'send_room_invite', { targetSocketId: target.id, roomId, targetName: 'Friend' })).ok, true);
    const invite = await incoming;
    assert.equal(invite.roomId, roomId);
    assert.ok(invite.inviteId && invite.expiresAt > Date.now());
    assert.equal((await emitAck(host, 'send_room_invite', { targetSocketId: target.id, roomId })).reason, 'room_invite_pending');
    assert.equal((await emitAck(host, 'send_room_invite', { targetSocketId: 'nonexistent', roomId })).reason, 'err_player_not_on_server');
    const accepted = waitEvent(host, 'room_invite_accepted');
    assert.equal((await emitAck(target, 'room_invite_response', { hostSocketId: host.id, roomId, inviteId: invite.inviteId, accepted: true })).ok, true);
    assert.equal((await accepted).roomId, roomId);
    const hostStarted = waitEvent(host, 'game_start');
    const targetStarted = waitEvent(target, 'game_start');
    target.emit('join_private_game', { nickname: 'Friend', roomId });
    const [hostGame, targetGame] = await Promise.all([hostStarted, targetStarted]);
    assert.equal(hostGame.roomId, roomId);
    assert.equal(targetGame.roomId, roomId);
    assert.equal(hostGame.myIndex, 0);
    assert.equal(targetGame.myIndex, 1);

    const host2 = await connect();
    const target2 = await connect();
    const room2 = 'yamb-local-decline-check';
    const waiting2 = waitEvent(host2, 'private_waiting');
    host2.emit('join_private_game', { nickname: 'Host2', roomId: room2 });
    await waiting2;
    assert.equal((await emitAck(host2, 'send_room_invite', { targetSocketId: target.id, roomId: room2 })).reason, 'err_player_busy');
    const incoming2 = waitEvent(target2, 'incoming_room_invite');
    assert.equal((await emitAck(host2, 'send_room_invite', { targetSocketId: target2.id, roomId: room2 })).ok, true);
    const declineInvite = await incoming2;
    const declined = waitEvent(host2, 'room_invite_declined');
    assert.equal((await emitAck(target2, 'room_invite_response', { hostSocketId: host2.id, roomId: room2, inviteId: declineInvite.inviteId, accepted: false })).ok, true);
    assert.equal((await declined).roomId, room2);

    const incomingBusy = waitEvent(target2, 'incoming_room_invite');
    assert.equal((await emitAck(host2, 'send_room_invite', { targetSocketId: target2.id, roomId: room2 })).ok, true);
    const busyInvite = await incomingBusy;
    const busyNotice = waitEvent(host2, 'room_invite_busy');
    assert.equal((await emitAck(target2, 'room_invite_response', { hostSocketId: host2.id, roomId: room2, inviteId: busyInvite.inviteId, accepted: false, busy: true })).ok, true);
    assert.equal((await busyNotice).roomId, room2);

    const incoming3 = waitEvent(target2, 'incoming_room_invite');
    assert.equal((await emitAck(host2, 'send_room_invite', { targetSocketId: target2.id, roomId: room2 })).ok, true);
    const cancelledInvite = await incoming3;
    host2.emit('back_to_menu');
    await new Promise(resolve => setTimeout(resolve, 100));
    const cancelledResponse = await emitAck(target2, 'room_invite_response', { hostSocketId: host2.id, roomId: room2, inviteId: cancelledInvite.inviteId, accepted: true });
    assert.equal(cancelledResponse.ok, false);
    assert.equal(cancelledResponse.reason, 'room_invite_expired_self');
    await checkInviteAcceptanceGuard();
    console.log('Invite flow passed: send, duplicate prevention, accept, two-player match, busy target, DND response, offline, decline and cancelled host.');
  } finally {
    for (const client of clients) client.close();
    child.kill();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
