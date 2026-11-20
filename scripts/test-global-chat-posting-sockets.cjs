'use strict';

// Production posting handlers over loopback, with mock persistence and fixture identities only.
const assert = require('node:assert/strict');
const http = require('node:http');
const { Server } = require('socket.io');
const { fixture, deferred } = require('./test-global-chat-posting.cjs');
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
function connect(port, uid) {
    const ws = new WebSocket(`ws://127.0.0.1:${port}/socket.io/?EIO=4&transport=websocket`);
    const events = [], replies = new Map();
    let sequence = 0;
    const ready = new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(Error('Socket handshake timeout')), 5000);
        ws.addEventListener('error', () => { clearTimeout(timer); reject(Error('WebSocket failed')); });
        ws.addEventListener('message', event => {
            const packet = String(event.data);
            if (packet[0] === '0') return ws.send('40' + JSON.stringify({ uid }));
            if (packet === '2') return ws.send('3');
            if (packet.startsWith('40')) { clearTimeout(timer); return resolve(JSON.parse(packet.slice(2)).sid); }
            if (packet.startsWith('42')) events.push(JSON.parse(packet.slice(2)));
            if (packet.startsWith('43')) {
                const bracket = packet.indexOf('[');
                const id = Number(packet.slice(2, bracket));
                const reply = replies.get(id);
                if (reply) { replies.delete(id); clearTimeout(reply.timer); reply.resolve(JSON.parse(packet.slice(bracket))[0]); }
            }
        });
    });
    return { ws, ready, events, emit: (event, data) => ws.send('42' + JSON.stringify([event, data])),
        rpc: (event, data) => new Promise((resolve, reject) => {
            const id = ++sequence;
            replies.set(id, { resolve, timer: setTimeout(() => { replies.delete(id); reject(Error(`Ack timeout: ${event}`)); }, 5000) });
            ws.send('42' + id + JSON.stringify([event, data]));
        }) };
}
async function main() {
    let fail = false, gate = null;
    const f = fixture({ mongo: true, write: async () => { if (gate) await gate.promise; if (fail) throw Error('fixture unavailable'); } });
    const server = http.createServer(), io = new Server(server);
    f.context.io = io;
    io.on('connection', socket => {
        const uid = socket.handshake.auth.uid;
        socket.verifiedUid = ['alice', 'bob'].includes(uid) ? uid : '';
        socket.playerName = socket.verifiedUid;
        f.bindSocket(socket);
    });
    const clients = [];
    try {
        await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
        const port = server.address().port;
        const alice = connect(port, 'alice'), bob = connect(port, 'bob'), guest = connect(port, '');
        clients.push(alice, bob, guest);
        const [aliceId] = await Promise.all(clients.map(client => client.ready));
        assert.equal((await alice.rpc('global_chat_msg', { msg: { toString: null } })).reason, 'err_chat_invalid_message');
        assert.equal((await alice.rpc('global_chat_msg', { msg: ['not', 'text'] })).reason, 'err_chat_invalid_message');
        guest.emit('request_global_chat_history');
        assert.equal((await guest.rpc('global_chat_msg', { msg: 'Guest message' })).reason, 'err_chat_auth_required');
        gate = deferred();
        const slow = alice.rpc('global_chat_msg', { msg: 'Committed message', senderUid: 'bob' });
        await delay(30);
        assert(!bob.events.some(([event]) => event === 'global_chat_msg'));
        gate.resolve(); gate = null;
        const result = await slow;
        assert.equal(result.ok, true);
        assert.equal(result.message.senderUid, 'alice');
        await delay(30);
        assert.equal(bob.events.filter(([event]) => event === 'global_chat_msg').length, 1);
        assert.equal(f.database.messages.length, 1);
        assert(!guest.events.some(([event]) => ['global_chat_msg', 'global_chat_history'].includes(event)));
        assert.equal((await alice.rpc('global_chat_msg', { msg: 'Too fast' })).reason, 'err_chat_slow_down');
        fail = true;
        assert.equal((await bob.rpc('global_chat_msg', { msg: 'Not saved' })).reason, 'err_chat_save_failed');
        assert.equal(f.database.messages.length, 1);
        fail = false;
        f.context.globalChatRateLimits.bob.lastAt = 0;
        assert.equal((await bob.rpc('global_chat_msg', { msg: 'Recovered' })).ok, true);
        const messageId = f.database.messages[0].id;
        for (let i = 0; i < 12; i++) bob.emit('report_global_chat_msg', { messageId });
        await delay(50);
        assert.equal(f.reports.length, 1);
        assert.equal(bob.events.filter(([event, data]) => event === 'global_chat_report_result' && data.reason === 'err_chat_report_slow_down').length, 11);
        const authenticatedAlice = io.sockets.sockets.get(aliceId);
        assert(authenticatedAlice?.connected, 'The malformed message did not crash or disconnect the server');
        await f.context.resetGlobalChatHistory('socket-fixture');
        await delay(30);
        assert(!guest.events.some(([event]) => event === 'global_chat_history'));
        assert.equal(f.database.messages.length, 0);
        console.log('Global Chat live sockets: malformed payload survival, guest isolation, durable send/ack, spam rejection, database failure/recovery, parallel reports and weekly reset passed.');
    } finally {
        for (const client of clients) client.ws.close();
        await new Promise(resolve => io.close(resolve));
    }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
