'use strict';

// Only metadata is sent to the menu. Message text remains in the chat history.
function createGlobalChatActivity({ io, getHistory, now = Date.now, setTimer = setTimeout, clearTimer = clearTimeout }) {
    const room = 'global-chat-activity';
    const typing = new Map();
    const typingUids = () => [...new Set([...typing.values()].map(entry => entry.uid))];
    const broadcastTyping = () => io.to(room).emit('global_chat_typing', { uids: typingUids() });
    function stop(socket) {
        const previous = typing.get(socket.id);
        if (!previous) return;
        clearTimer(previous.timer);
        typing.delete(socket.id);
        broadcastTyping();
    }
    function snapshot(socket) {
        if (!socket.verifiedUid || !socket.playerName) return;
        socket.join(room);
        socket.emit('global_chat_activity', {
            uid: socket.verifiedUid,
            messages: getHistory().map(({ id, senderUid, createdAt }) => ({ id, senderUid, createdAt })),
            typingUids: typingUids()
        });
    }
    function bind(socket) {
        let requestedAt = -Infinity;
        let typedAt = -Infinity;
        socket.on('request_global_chat_activity', () => {
            if (now() - requestedAt < 1000) return;
            requestedAt = now();
            snapshot(socket);
        });
        socket.on('global_chat_typing', data => {
            if (!socket.verifiedUid || !socket.playerName) return;
            if (data?.active === false) return stop(socket);
            if (data?.active !== true || now() - typedAt < 2000) return;
            typedAt = now();
            const previous = typing.get(socket.id);
            if (previous) clearTimer(previous.timer);
            const timer = setTimer(() => stop(socket), 6000);
            timer.unref?.();
            typing.set(socket.id, { uid: socket.verifiedUid, timer });
            broadcastTyping();
        });
        socket.on('disconnect', () => stop(socket));
    }
    return { bind, snapshot, stop };
}

module.exports = { createGlobalChatActivity };
