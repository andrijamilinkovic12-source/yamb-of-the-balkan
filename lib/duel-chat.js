'use strict';

const { randomUUID } = require('node:crypto');
const fail = reason => ({ ok: false, reason });
const HISTORY_LIMIT = 50;
const MAX_TEXT = 550;
const safeForLegacy = text => text.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

function createDuelChat({ getRoom, getSocket, checkPosting, saveReport, filterText, now = Date.now, makeId = randomUUID }) {
    const rooms = new WeakMap();
    const preferencesBySocket = new WeakMap();
    function preference(room, uid, socket) {
        const remembered = socket && preferencesBySocket.get(socket);
        return room.chat.preferences.get(uid) ?? (remembered?.uid === uid ? remembered.enabled : undefined);
    }
    function context(socket, data) {
        const uid = socket.verifiedUid;
        if (!uid || socket.isSpectator) return null;
        const room = getRoom(socket);
        if (!room || room.id !== data?.roomId || room.id.startsWith('local_')) return null;
        const { state } = room;
        if (!state || state.gameFinished || state.players?.length !== 2) return null;
        const seat = state.players.indexOf(socket.id);
        if (seat < 0 || (state.playerUids?.[seat] && state.playerUids[seat] !== uid)) return null;
        if (!rooms.has(state)) rooms.set(state, { messages: [], preferences: new Map(), lastPosted: new Map(), lastReport: new Map(), reported: new Set() });
        return { ...room, uid, seat, chat: rooms.get(state) };
    }
    function snapshot(room) {
        const { uid, chat, id, state } = room;
        const enabled = chat.preferences.get(uid) !== false;
        return { ok: true, roomId: id, matchId: state.matchId || '', enabled,
            messages: (enabled ? chat.messages : []).filter(message => message.senderUid === uid || message.recipientUid === uid)
                .map(({ recipientUid, ...message }) => ({ ...message, reported: chat.reported.has(message.id) })) };
    }
    function receive(room, publicMessage, peer) {
        const { chat } = room;
        if (preference(room, peer.verifiedUid, peer) !== undefined) peer.emit('duel_chat_message', publicMessage);
        else peer.emit('chat_msg', { ...publicMessage, msg: safeForLegacy(publicMessage.msg), legacyEscaped: true });
    }
    async function send(socket, data) {
        const room = context(socket, data);
        if (!room) return fail('duel_chat_inactive');
        if (preference(room, room.uid, socket) === false) return fail('duel_chat_disabled');
        if (typeof data.msg !== 'string') return fail('err_chat_invalid_message');
        const text = data.msg.replace(/\s+/g, ' ').trim();
        if (!text || text.length > MAX_TEXT) return fail('err_chat_edit_length');
        const at = now();
        if (at - (room.chat.lastPosted.get(room.uid) ?? -Infinity) < 1200) return fail('err_chat_slow_down');
        room.chat.lastPosted.set(room.uid, at);
        const rejected = await checkPosting(room.uid);
        if (rejected) return fail(rejected);
        const current = context(socket, data);
        if (!current || current.state !== room.state || current.uid !== room.uid) return fail('duel_chat_inactive');
        if (preference(room, room.uid, socket) === false) return fail('duel_chat_disabled');
        const peer = getSocket(room.state.players[1 - room.seat]);
        if (!peer?.connected || !peer.verifiedUid || peer.isSpectator ||
            (room.state.playerUids?.[1 - room.seat] && room.state.playerUids[1 - room.seat] !== peer.verifiedUid))
            return fail('duel_chat_peer_offline');
        if (preference(room, peer.verifiedUid, peer) === false) return fail('duel_chat_peer_disabled');
        const message = { id: makeId(), roomId: room.id, matchId: room.state.matchId || '', senderUid: room.uid, sender: String(socket.playerName || '').slice(0, 24),
            msg: filterText(text), createdAt: now(), recipientUid: peer.verifiedUid };
        room.chat.messages.push(message);
        if (room.chat.messages.length > HISTORY_LIMIT) room.chat.reported.delete(room.chat.messages.shift().id);
        const { recipientUid, ...publicMessage } = message;
        receive(room, publicMessage, peer);
        return { ok: true, message: publicMessage };
    }
    async function report(socket, data) {
        const room = context(socket, data);
        if (!room) return fail('duel_chat_inactive');
        const message = room.chat.messages.find(row => row.id === data.messageId && row.recipientUid === room.uid);
        if (!message) return fail('err_chat_report_missing');
        if (room.chat.reported.has(message.id)) return { ok: true };
        const at = now();
        const { lastReport } = room.chat;
        const previous = lastReport.get(room.uid) ?? -Infinity;
        if (at - previous < 30000) return fail('err_chat_report_slow_down');
        lastReport.set(room.uid, at);
        try {
            await saveReport({ source: 'duel', duelRoomId: room.id, duelMatchId: room.state.matchId || '',
                messageId: message.id, reportedByUid: room.uid, reportedByName: socket.playerName,
                senderUid: message.senderUid, senderName: message.sender, msg: message.msg,
                messageCreatedAt: message.createdAt, reportedAt: at,
                reportReason: typeof data.reason === 'string' ? data.reason.trim().slice(0, 300) : '' });
            if (room.chat.messages.includes(message)) room.chat.reported.add(message.id);
            return { ok: true };
        } catch (_) {
            if (lastReport.get(room.uid) === at) lastReport.delete(room.uid);
            return fail('err_server_conn');
        }
    }
    function bind(socket) {
        socket.on('duel_chat_sync', (data, ack) => {
            if (typeof ack !== 'function') return;
            const room = context(socket, data);
            if (!room) return ack(fail('duel_chat_inactive'));
            if (typeof data.enabled !== 'boolean') return ack(fail('err_chat_invalid_message'));
            room.chat.preferences.set(room.uid, data.enabled);
            preferencesBySocket.set(socket, { uid: room.uid, enabled: data.enabled });
            ack(snapshot(room));
        });
        socket.on('chat_msg', async (data, ack) => {
            try {
                const result = await send(socket, data);
                if (typeof ack === 'function') ack(result);
                else if (!result.ok) socket.emit('error_msg', result.reason);
            } catch (_) {
                if (typeof ack === 'function') ack(fail('err_server_conn'));
            }
        });
        socket.on('report_duel_chat_msg', async (data, ack) => {
            if (typeof ack === 'function') ack(await report(socket, data));
        });
    }
    return { bind, send, report };
}

module.exports = { createDuelChat };
