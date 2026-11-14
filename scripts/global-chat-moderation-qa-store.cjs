// Synthetic, in-memory store for loopback UI fixtures only. Never imported by server.js.
function createModerationQaStore(getHistory) {
    const reports = [], audit = [], bans = new Map();
    let nextReport = 0;
    const restriction = async (uid, at) => {
        const ban = bans.get(uid);
        return ban && (ban.permanent || ban.until > at) ? { ...ban } : null;
    };
    const pendingCount = async () => reports.filter(report => report.status === 'open').length;
    const list = async (tab, offset, at) => {
        let rows = tab === 'reports' ? reports.filter(report => report.status === 'open').slice().reverse().map(report => ({ ...report,
            currentMessage: report.source === 'duel' ? null : getHistory().find(message => message.id === report.messageId) || null }))
            : tab === 'messages' ? getHistory().slice().reverse()
            : tab === 'audit' ? audit.slice().reverse()
            : [...bans].filter(([, ban]) => ban.permanent || ban.until > at).map(([uid, ban]) => ({ firebaseUid: uid,
                playerName: uid === 'qa-chat-bob' ? 'QA B' : 'QA A', chatBanUntil: ban.until,
                chatBanPermanent: ban.permanent, chatBanReason: ban.reason }));
        rows = rows.slice(offset, offset + 25);
        return { rows, nextOffset: rows.length === 25 ? offset + 25 : null };
    };
    async function apply(command) {
        const report = command.reportId ? reports.find(row => row._id === command.reportId) : null;
        if (command.reportId && !report) return { ok: false, reason: 'err_chat_report_missing' };
        if (report?.status !== 'open' && report) return { ok: false, reason: 'err_chat_report_resolved' };
        if (report && ['mute', 'unmute'].includes(command.action) && report.senderUid !== command.targetUid)
            return { ok: false, reason: 'err_chat_invalid_message' };
        if (report && command.action === 'delete' && report.messageId !== command.message.id)
            return { ok: false, reason: 'err_chat_invalid_message' };
        let updated = null;
        if (command.action === 'mute') {
            updated = { until: command.banUntil, permanent: command.permanent, reason: command.reason };
            bans.set(command.targetUid, updated);
        }
        if (command.action === 'unmute') bans.delete(command.targetUid);
        if (report) Object.assign(report, { status: command.action === 'dismiss' ? 'dismissed' : 'resolved', resolutionReason: command.reason });
        audit.push({ action: `manual_${command.action}`, uid: command.targetUid, actorName: command.actorName,
            actorUid: command.actorUid, playerName: command.message?.sender || report?.senderName || 'QA B', reason: command.reason,
            originalMsg: command.message?.msg || report?.msg || '', createdAt: command.at, reportId: command.reportId });
        return { ok: true, restriction: updated };
    }
    function report(socket, message, reason) {
        const row = { _id: (++nextReport).toString(16).padStart(24, '0'), status: 'open', messageId: message.id,
            reportedByUid: socket.verifiedUid, reportedByName: socket.playerName, senderUid: message.senderUid,
            senderName: message.sender, msg: message.msg, messageCreatedAt: message.createdAt, messageRevision: message.revision || 0,
            reportedAt: Date.now(), reportReason: typeof reason === 'string' ? reason.slice(0, 300) : '' };
        reports.push(row);
        return row;
    }
    function reportDuel(data) {
        reports.push({ ...data, _id: (++nextReport).toString(16).padStart(24, '0'), status: 'open' });
    }
    return { restriction, pendingCount, list, apply, report, reportDuel };
}
module.exports = { createModerationQaStore };
