'use strict';

const { persistGlobalChatMutation } = require('./global-chat-mutations');
const error = reason => { throw Object.assign(new Error(reason), { reason }); };
function createGlobalChatModerationStore({ connection, models, profileWrites }) {
    const { Profile, Chat, Report, Audit } = models;
    const pageSize = 25;
    const restrictionOf = (profile, at) => profile && (profile.chatBanPermanent || profile.chatBanUntil > at)
        ? { until: profile.chatBanUntil, permanent: !!profile.chatBanPermanent, reason: profile.chatBanReason || '' }
        : null;
    const openReports = { status: { $in: ['open', null] } };
    async function restriction(uid, at) {
        const profile = await Profile.findOne({ firebaseUid: uid }).select('chatBanUntil chatBanPermanent chatBanReason').lean();
        return restrictionOf(profile, at);
    }
    async function pendingCount() { return Report.countDocuments(openReports); }
    async function list(tab, offset, at) {
        let rows;
        if (tab === 'reports') {
            rows = await Report.find(openReports).select('messageId reportedByName senderUid senderName msg messageCreatedAt messageRevision reportReason reportedAt status source duelRoomId duelMatchId')
                .sort({ reportedAt: -1, _id: -1 }).skip(offset).limit(pageSize).lean();
            const chat = await Chat.findOne({}).select('messages').lean();
            rows = rows.map(row => ({ ...row, _id: String(row._id), currentMessage:
                row.source === 'duel' ? null : (chat?.messages || []).find(message => message.id === row.messageId) || null }));
        } else if (tab === 'messages') {
            const chat = await Chat.findOne({}).select('messages').lean();
            rows = (chat?.messages || []).slice().reverse().slice(offset, offset + pageSize);
        } else if (tab === 'bans') {
            rows = await Profile.find({ $or: [{ chatBanPermanent: true }, { chatBanUntil: { $gt: at } }] })
                .select('firebaseUid playerName chatBanUntil chatBanPermanent chatBanReason chatBanAt')
                .sort({ chatBanAt: -1, firebaseUid: 1 }).skip(offset).limit(pageSize).lean();
        } else {
            rows = await Audit.find({ action: /^manual_/ }).select('action uid playerName actorName actorUid reason messageId originalMsg banUntil permanent createdAt reportId')
                .sort({ createdAt: -1, _id: -1 }).skip(offset).limit(pageSize).lean();
        }
        return { rows, nextOffset: rows.length === pageSize && offset + pageSize <= 5000 ? offset + pageSize : null };
    }
    async function apply(command) {
        const execute = async () => {
            try {
                let restriction = null;
                await connection.transaction(async session => {
                    const options = { session };
                    const report = command.reportId ? await Report.findById(command.reportId).session(session).lean() : null;
                    if (command.reportId && !report) error('err_chat_report_missing');
                    if (report && report.status && report.status !== 'open') error('err_chat_report_resolved');
                    if (report && ['mute', 'unmute'].includes(command.action) && report.senderUid !== command.targetUid)
                        error('err_chat_invalid_message');
                    if (report && command.action === 'delete' && (report.source === 'duel' || report.messageId !== command.message.id))
                        error('err_chat_invalid_message');
                    let targetName = command.message?.sender || report?.senderName || '';
                    if (command.action === 'delete') {
                        const scopedModel = { updateOne: (query, update) => Chat.updateOne(query, update, options) };
                        if (!await persistGlobalChatMutation(scopedModel, { operation: 'delete', id: command.message.id,
                            uid: command.targetUid, expectedRevision: command.message.revision || 0 })) error('err_chat_message_changed');
                    }
                    if (['mute', 'unmute'].includes(command.action)) {
                        const profile = await Profile.findOne({ firebaseUid: command.targetUid }).select('playerName').session(session).lean();
                        if (!profile) error('err_chat_user_missing');
                        targetName = profile.playerName;
                        await Profile.updateOne({ firebaseUid: command.targetUid }, { $set: {
                            chatBanUntil: command.banUntil, chatBanPermanent: command.permanent,
                            chatBanReason: command.action === 'mute' ? command.reason : '',
                            chatBanActorUid: command.actorUid, chatBanAt: command.at } }, options);
                        restriction = command.action === 'mute' ? { until: command.banUntil, permanent: command.permanent, reason: command.reason } : null;
                    }
                    await Audit.create([{ action: `manual_${command.action}`, uid: command.targetUid || report?.senderUid || '',
                        playerName: targetName, actorUid: command.actorUid, actorName: command.actorName,
                        reason: command.reason, messageId: command.message?.id || report?.messageId || '',
                        originalMsg: command.message?.msg || report?.msg || '', reportId: command.reportId,
                        banUntil: command.banUntil, permanent: command.permanent, createdAt: command.at,
                        commandId: command.id }], options);
                    if (report) await Report.updateOne({ _id: report._id }, { $set: {
                        status: command.action === 'dismiss' ? 'dismissed' : 'resolved',
                        resolvedByUid: command.actorUid, resolvedAt: command.at, resolutionReason: command.reason } }, options);
                });
                return { ok: true, restriction };
            } catch (failure) { return { ok: false, reason: failure.reason || 'err_chat_moderation_save_failed' }; }
        };
        return profileWrites && command.targetUid ? profileWrites.run(command.targetUid, execute) : execute();
    }
    return { restriction, pendingCount, list, apply };
}

module.exports = { createGlobalChatModerationStore };
