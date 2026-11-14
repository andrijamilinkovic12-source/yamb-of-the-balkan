'use strict';

const DURATIONS = Object.freeze({ '15m': 900000, '1h': 3600000, '24h': 86400000, '7d': 604800000, permanent: Number.MAX_SAFE_INTEGER });
const validId = value => typeof value === 'string' && /^[A-Za-z0-9_-]{1,160}$/.test(value);
const fail = reason => ({ ok: false, reason });

function createGlobalChatModeration({ ownerUid = '', store, enqueue, getHistory, publish, notify,
    now = Date.now, newId = () => require('node:crypto').randomUUID() }) {
    ownerUid = typeof ownerUid === 'string' ? ownerUid.trim() : '';
    const isOwner = socket => !!ownerUid && socket.verifiedUid === ownerUid;
    const limits = new Map();
    function rate(socket, write = false) {
        const at = now(), previous = limits.get(socket.id) || { start: at, reads: 0, writes: 0 };
        if (at - previous.start >= 10000) Object.assign(previous, { start: at, reads: 0, writes: 0 });
        limits.set(socket.id, previous);
        return write ? ++previous.writes <= 10 : ++previous.reads <= 30;
    }
    async function capabilities(socket) {
        const uid = socket.verifiedUid;
        if (!uid) return fail('err_chat_auth_required');
        try {
            const restriction = await store.restriction(uid, now());
            const owner = isOwner(socket);
            const pending = owner ? await store.pendingCount() : 0;
            if (socket.verifiedUid !== uid) return fail('err_chat_auth_required');
            return { ok: true, uid, owner, pending, restriction };
        } catch (_) { return fail('err_server_conn'); }
    }
    async function list(socket, data = {}) {
        data = data && typeof data === 'object' ? data : {};
        if (!isOwner(socket)) return fail('err_chat_moderator_required');
        if (!rate(socket)) return fail('err_chat_slow_down');
        if (!['reports', 'messages', 'bans', 'audit'].includes(data.tab)) return fail('err_chat_invalid_message');
        const offset = data.offset ?? 0;
        if (!Number.isInteger(offset) || offset < 0 || offset > 5000) return fail('err_chat_invalid_message');
        try {
            const result = await store.list(data.tab, offset, now());
            if (!isOwner(socket)) return fail('err_chat_moderator_required');
            return { ok: true, uid: ownerUid, tab: data.tab, ...result };
        } catch (_) { return fail('err_server_conn'); }
    }
    async function act(socket, data = {}) {
        data = data && typeof data === 'object' ? data : {};
        if (!isOwner(socket)) return fail('err_chat_moderator_required');
        if (!rate(socket, true)) return fail('err_chat_slow_down');
        const { action } = data;
        if (!['delete', 'mute', 'unmute', 'resolve', 'dismiss'].includes(action)) return fail('err_chat_invalid_message');
        const reason = typeof data.reason === 'string' ? data.reason.replace(/\s+/g, ' ').trim() : '';
        if (reason.length < 3 || reason.length > 300) return fail('err_chat_moderation_reason');
        if (data.reportId && (typeof data.reportId !== 'string' || !/^[a-f0-9]{24}$/.test(data.reportId)))
            return fail('err_chat_invalid_message');
        if (['resolve', 'dismiss'].includes(action) && !data.reportId) return fail('err_chat_invalid_message');
        if (['mute', 'unmute'].includes(action) && !validId(data.targetUid)) return fail('err_chat_invalid_message');
        if (action === 'mute' && data.targetUid === ownerUid) return fail('err_chat_moderation_self_mute');
        if (action === 'mute' && (typeof data.duration !== 'string' || !Object.hasOwn(DURATIONS, data.duration)))
            return fail('err_chat_invalid_message');
        if (action === 'delete' && (!validId(data.messageId) || !Number.isSafeInteger(data.revision) || data.revision < 0))
            return fail('err_chat_invalid_message');
        try {
            return await enqueue(async () => {
                if (!isOwner(socket)) return fail('err_chat_moderator_required');
                const current = action === 'delete' ? getHistory().find(message => message.id === data.messageId) : null;
                if (action === 'delete' && !current) return fail('err_chat_message_missing');
                if (current && (!current.senderUid || current.senderUid === 'system')) return fail('err_chat_moderation_system');
                if (current && (current.revision || 0) !== data.revision) return fail('err_chat_message_changed');
                const at = now();
                const command = { id: newId(), action, actorUid: ownerUid,
                    actorName: String(socket.playerName || '').slice(0, 24), reason, at,
                    reportId: data.reportId || '', targetUid: current?.senderUid || data.targetUid || '',
                    message: current ? { ...current } : null,
                    permanent: action === 'mute' && data.duration === 'permanent',
                    banUntil: action === 'mute' ? data.duration === 'permanent' ? Number.MAX_SAFE_INTEGER : at + DURATIONS[data.duration] : 0 };
                const result = await store.apply(command);
                if (!result.ok) return result;
                // Store commits action and audit together before any memory/UI changes.
                if (current) {
                    const index = getHistory().findIndex(message => message.id === current.id);
                    if (index >= 0) getHistory().splice(index, 1);
                    publish('global_chat_msg_deleted', { id: current.id, senderUid: current.senderUid, moderated: true });
                }
                if (['mute', 'unmute'].includes(action)) {
                    notify(command.targetUid, 'global_chat_restriction', { uid: command.targetUid,
                        restriction: result.restriction || null });
                }
                if (current) notify(current.senderUid, 'global_chat_moderation_notice', { uid: current.senderUid,
                    reason, action: 'delete' });
                notify(ownerUid, 'global_chat_moderation_changed', { kind: action });
                return { ok: true, uid: ownerUid };
            });
        } catch (_) { return fail('err_chat_moderation_save_failed'); }
    }
    async function pushCapabilities(socket) {
        const result = await capabilities(socket);
        if (result.ok) socket.emit('global_chat_moderation_capabilities', result);
    }
    function bind(socket) {
        socket.on('request_global_chat_moderation_capabilities', async (_data, ack) => {
            if (typeof ack !== 'function') return;
            if (!rate(socket)) return ack(fail('err_chat_slow_down'));
            ack(await capabilities(socket));
        });
        socket.on('request_global_chat_moderation', async (data, ack) => { if (typeof ack === 'function') ack(await list(socket, data)); });
        socket.on('global_chat_moderation_action', async (data, ack) => { if (typeof ack === 'function') ack(await act(socket, data)); });
        socket.on('disconnect', () => limits.delete(socket.id));
    }
    return { bind, capabilities, pushCapabilities, list, act, isOwner };
}

module.exports = { createGlobalChatModeration, DURATIONS };
