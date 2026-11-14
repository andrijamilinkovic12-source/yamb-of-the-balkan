'use strict';

// Atomic, owner-scoped writes share the existing append/reset queue in production.
async function persistGlobalChatMutation(model, change) {
    const match = { id: change.id, senderUid: change.uid };
    if (change.expectedRevision === 0) match.$or = [{ revision: 0 }, { revision: { $exists: false } }];
    else match.revision = change.expectedRevision;
    const update = change.operation === 'delete'
        ? { $pull: { messages: { id: change.id, senderUid: change.uid } } }
        : { $set: { 'messages.$.msg': change.message.msg, 'messages.$.editedAt': change.message.editedAt,
            'messages.$.revision': change.message.revision } };
    const result = await model.updateOne({ messages: { $elemMatch: match } }, update);
    return result.matchedCount === 1;
}

function createGlobalChatMutations({ getHistory, enqueue, persist, publish, filterText,
    canEdit = async () => '', checkRate = () => true, now = Date.now }) {
    async function mutate(socket, operation, data = {}) {
        const uid = socket.verifiedUid;
        if (!uid || !socket.playerName) return { ok: false, reason: 'err_chat_auth_required' };
        const id = typeof data?.messageId === 'string' ? data.messageId : '';
        const expectedRevision = data?.revision;
        if (!id || id.length > 160 || !Number.isSafeInteger(expectedRevision) || expectedRevision < 0)
            return { ok: false, reason: 'err_chat_invalid_message' };
        if (!checkRate(uid)) return { ok: false, reason: 'err_chat_slow_down' };
        try {
            return await enqueue(async () => {
                if (socket.verifiedUid !== uid) return { ok: false, reason: 'err_chat_auth_required' };
                const current = getHistory().find(message => message.id === id);
                if (!current) return { ok: false, reason: 'err_chat_message_missing' };
                // Never accept ownership, author or a replacement ID supplied by the client.
                if (!current.senderUid || current.senderUid !== uid) return { ok: false, reason: 'err_chat_not_owner' };
                if ((current.revision || 0) !== expectedRevision) return { ok: false, reason: 'err_chat_message_changed' };
                let message;
                if (operation === 'edit') {
                    if (typeof data.msg !== 'string') return { ok: false, reason: 'err_chat_invalid_message' };
                    const text = data.msg.replace(/\s+/g, ' ').trim();
                    if (!text || text.length > 550) return { ok: false, reason: 'err_chat_edit_length' };
                    const rejection = await canEdit(socket, uid);
                    if (rejection) return { ok: false, reason: rejection };
                    if (socket.verifiedUid !== uid) return { ok: false, reason: 'err_chat_auth_required' };
                    if (filterText(text) !== text) return { ok: false, reason: 'err_chat_edit_profanity' };
                    if (text === current.msg) return { ok: true, message: { ...current } };
                    message = { ...current, msg: text, editedAt: now(), revision: expectedRevision + 1 };
                }
                if (!await persist({ operation, id, uid, expectedRevision, message }))
                    return { ok: false, reason: 'err_chat_save_failed' };
                // A weekly reset, account purge or rolling-history trim may have happened during I/O.
                const history = getHistory();
                const index = history.findIndex(item => item.id === id && item.senderUid === uid);
                if (index < 0) return { ok: false, reason: 'err_chat_message_missing' };
                if (operation === 'delete') {
                    history.splice(index, 1);
                    const deleted = { id, senderUid: uid };
                    publish('global_chat_msg_deleted', deleted);
                    return { ok: true, deleted };
                }
                history[index] = message;
                publish('global_chat_msg_updated', message);
                return { ok: true, message };
            });
        } catch (_) {
            // A failed write is never shown as a successful local edit/delete.
            return { ok: false, reason: 'err_chat_save_failed' };
        }
    }
    function bind(socket) {
        for (const [event, operation] of [['edit_global_chat_msg', 'edit'], ['delete_global_chat_msg', 'delete']]) {
            socket.on(event, async (data, ack) => {
                if (typeof ack !== 'function') return;
                ack(await mutate(socket, operation, data));
            });
        }
    }
    return { bind, edit: (socket, data) => mutate(socket, 'edit', data), remove: (socket, data) => mutate(socket, 'delete', data) };
}

module.exports = { createGlobalChatMutations, persistGlobalChatMutation };
