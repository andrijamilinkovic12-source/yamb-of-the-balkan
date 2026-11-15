'use strict';

const CATEGORIES = ['game', 'results', 'connection', 'rewards', 'other'];
const validRequestId = value => typeof value === 'string' && /^[a-f0-9]{36}$/.test(value);
const validTicketId = value => typeof value === 'string' && /^[a-f0-9]{24}$/.test(value);
const { createMail, appendMail } = require('./player-mailbox');

function createPlayerSupport({ connection, tickets, profiles, matches, submissions, disconnects, notify, now = Date.now }) {
    async function diagnostics(uid) {
        const since = new Date(now() - 24 * 60 * 60 * 1000);
        const query = { uid, occurredAt: { $gte: since } };
        const [match, submission, disconnect] = await Promise.all([
            matches.findOne({ 'participants.uid': uid, finishedAt: { $gte: since } })
                .sort({ finishedAt: -1 }).select('-_id matchId mode resultType finishedAt').lean(),
            submissions.findOne(query).sort({ occurredAt: -1 })
                .select('-_id mode stage outcome reason duplicate statsApplied occurredAt').lean(),
            disconnects.findOne(query).sort({ occurredAt: -1 })
                .select('-_id mode reasonClass outcome reconnectDurationMs occurredAt').lean()
        ]);
        return { match, submission, disconnect };
    }

    function bind(socket, { verifiedUid, available, ownerUid }) {
        function handle(event, operation, ownerOnly = false) {
            socket.on(event, async (data, ack) => {
                if (typeof ack !== 'function') return;
                const uid = verifiedUid(socket);
                if (!uid || !available() || !ownerUid || (ownerOnly && uid !== ownerUid)) return ack({ ok: false });
                try {
                    const result = await operation(uid, data || {});
                    ack(verifiedUid(socket) === uid ? { ...result, recipientUid: uid } : { ok: false });
                } catch (_) {
                    ack({ ok: false });
                }
            });
        }

        handle('player_support_submit', async (uid, data) => {
            const description = typeof data.description === 'string' ? data.description.trim() : '';
            if (!CATEGORIES.includes(data.category) || description.length < 10 || description.length > 1000
                || !validRequestId(data.requestId)) return { ok: false, reason: 'support_invalid' };
            const key = { uid, requestId: data.requestId };
            const existing = await tickets.findOne(key).select('_id').lean();
            if (existing) return { ok: true, reference: String(existing._id) };
            if (!await profiles.exists({ firebaseUid: uid })) return { ok: false };
            const createdAt = now();
            const minute = Math.floor(createdAt / 60000);
            try {
                const attachment = data.attachDiagnostics === true ? await diagnostics(uid) : undefined;
                const created = await tickets.create({ ...key, minute, category: data.category, description, createdAt,
                    ...(attachment ? { diagnostics: attachment } : {}) });
                return { ok: true, reference: String(created._id) };
            } catch (error) {
                if (error.code !== 11000) throw error;
                const duplicate = await tickets.findOne(key).select('_id').lean();
                return duplicate ? { ok: true, reference: String(duplicate._id) } : { ok: false, reason: 'support_rate' };
            }
        });

        handle('player_support_list', async (_uid, data) => {
            if (data.before && !validTicketId(data.before)) return { ok: false };
            const rows = await tickets.find({ repliedAt: null, ...(data.before ? { _id: { $lt: data.before } } : {}) })
                .sort({ _id: -1 }).limit(21).select('category description diagnostics createdAt').lean();
            const next = rows.length > 20 ? String(rows[19]._id) : '';
            return { ok: true, next, rows: rows.slice(0, 20).map(({ _id, ...row }) => ({ ...row, reference: String(_id) })) };
        }, true);

        handle('player_support_reply', async (_uid, data) => {
            const reply = typeof data.text === 'string' ? data.text.trim() : '';
            if (!validTicketId(data.reference) || !reply || reply.length > 550) return { ok: false, reason: 'support_reply_invalid' };
            const uid = await connection.transaction(async session => {
                const ticket = await tickets.findOneAndUpdate({ _id: data.reference, repliedAt: null },
                    { $set: { reply, repliedAt: now() } }, { session, new: true }).select('uid').lean();
                if (!ticket) return '';
                const mail = createMail('support_reply', { text: reply, reference: data.reference }, `support:${data.reference}`);
                const result = await profiles.updateOne({ firebaseUid: ticket.uid }, { $push: { playerMailbox: appendMail(mail) } }, { session });
                if (!result.matchedCount) throw new Error('Missing support recipient');
                return ticket.uid;
            });
            if (uid) {
                notify(uid);
                return { ok: true };
            }
            const answered = await tickets.exists({ _id: data.reference, reply, repliedAt: { $ne: null } });
            return answered ? { ok: true } : { ok: false, reason: 'support_closed' };
        }, true);
    }
    return { bind };
}

module.exports = { CATEGORIES, createPlayerSupport };
