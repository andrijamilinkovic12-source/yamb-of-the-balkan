'use strict';
const assert = require('node:assert/strict');
const { createDuelChat } = require('../lib/duel-chat');

function player(id, uid, isSpectator = false) {
    const handlers = new Map(), events = [];
    return {
        id, verifiedUid: uid, isSpectator, connected: true, playerName: uid, events,
        on(event, handler) { handlers.set(event, handler); },
        emit(event, data) { events.push({ event, data }); },
        request(event, data) { return new Promise(resolve => handlers.get(event)(data, resolve)); }
    };
}

async function main() {
    const a = player('socket-a', 'alice'), b = player('socket-b', 'bob'), fan = player('socket-fan', 'fan', true);
    const clients = new Map([a, b, fan].map(client => [client.id, client]));
    const roomId = 'tournament-test';
    const state = { players: [a.id, b.id], playerUids: ['alice', 'bob'], matchId: 'match-1' };
    const room = { id: roomId, state };
    const reports = [];
    let time = 10000, id = 0, muted = '';
    const chat = createDuelChat({
        getRoom: () => room, getSocket: id => clients.get(id),
        checkPosting: async uid => uid === muted ? 'err_chat_suspended' : '',
        saveReport: async data => { reports.push(data); }, filterText: text => text.replace('banned', '***'),
        now: () => time, makeId: () => 'message-' + ++id
    });
    for (const client of clients.values()) chat.bind(client);
    const post = (client, msg) => client.request('chat_msg', { roomId, msg, senderUid: 'forged' });
    const sync = (client, enabled) => client.request('duel_chat_sync', { roomId, enabled });
    const report = (client, messageId) => client.request('report_duel_chat_msg', {
        roomId, messageId, reason: 'QA reason', msg: 'Forged evidence', senderUid: 'forged'
    });
    assert.equal((await fan.request('chat_msg', { roomId, msg: 'spectator' })).ok, false);
    assert.equal((await a.request('chat_msg', { roomId: 'another-room', msg: 'wrong room' })).ok, false);
    assert.equal((await post(a, 'x'.repeat(551))).reason, 'err_chat_edit_length');
    const legacy = await post(a, '<b>banned</b>');
    assert(legacy.ok);
    assert.equal(b.events[0].event, 'chat_msg');
    assert.equal(b.events[0].data.msg, '&lt;b&gt;***&lt;/b&gt;');
    assert.equal(fan.events.length, 0);
    assert.equal((await post(a, 'too fast')).reason, 'err_chat_slow_down');
    assert.equal((await sync(b, true)).messages[0].msg, '<b>***</b>');
    assert.equal((await report(a, legacy.message.id)).ok, false);
    assert.equal((await report(fan, legacy.message.id)).ok, false);
    assert((await report(b, legacy.message.id)).ok);
    assert((await report(b, legacy.message.id)).ok);
    assert.equal(reports.length, 1);
    assert.equal(reports[0].msg, '<b>***</b>');
    assert.equal(reports[0].senderUid, 'alice');
    assert.equal(reports[0].source, 'duel');
    assert.equal(reports[0].duelMatchId, 'match-1');
    assert((await sync(b, true)).messages[0].reported);
    time += 1500;
    assert.deepEqual((await sync(b, false)).messages, []);
    assert.equal((await post(b, 'disabled send')).reason, 'duel_chat_disabled');
    assert.equal((await post(a, 'disabled receive')).reason, 'duel_chat_peer_disabled');
    assert.equal(b.events.length, 1, 'Opted-out recipient must not receive the message');
    time += 1500;
    assert((await sync(b, true)).ok);
    assert((await post(a, 'restored')).ok);
    assert.equal(b.events.at(-1).event, 'duel_chat_message');
    muted = 'alice';
    time += 1500;
    assert.equal((await post(a, 'moderation ban')).reason, 'err_chat_suspended');
    muted = '';
    const newB = player('socket-b2', 'bob');
    clients.set(newB.id, newB);
    state.players[1] = newB.id;
    chat.bind(newB);
    assert.equal((await sync(b, true)).ok, false, 'A replaced socket cannot read history');
    assert.equal((await sync(newB, true)).messages.length, 2);
    state.gameFinished = true;
    assert.equal((await sync(newB, true)).ok, false);
    room.state = { ...state, gameFinished: false, matchId: 'match-2' };
    assert.deepEqual((await sync(newB, true)).messages, [], 'A rematch has a new private conversation');
    assert.equal((await report(newB, legacy.message.id)).ok, false);
    assert.equal(fan.events.length, 0);
    console.log('Duel chat: participants-only delivery and history, moderation, opt-out, safe legacy display, reports, reconnect and rematch passed.');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
