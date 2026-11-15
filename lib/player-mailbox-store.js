'use strict';

const { mailboxSnapshot } = require('./player-mailbox');
const { systemMailboxNotices } = require('./mailbox-system-notices');
const PAGE_SIZE = 20;

function mailboxEntrySchema(mongoose) {
    const schema = new mongoose.Schema({
        recipientUid: { type: String, required: true }, id: { type: String, required: true },
        shared: { type: Boolean, required: true }, createdAt: { type: Number, required: true },
        message: mongoose.Schema.Types.Mixed,
        readAt: { type: Number, default: null }, archived: { type: Boolean, default: false },
        deleted: { type: Boolean, default: false }
    }, { versionKey: false });
    schema.index({ recipientUid: 1, id: 1 }, { unique: true });
    schema.index({ recipientUid: 1, shared: 1, deleted: 1, archived: 1, createdAt: -1, id: -1 });
    schema.index({ recipientUid: 1, shared: 1, deleted: 1, archived: 1, readAt: 1 });
    return schema;
}

function decodeCursor(value) {
    if (!value) return null;
    if (typeof value !== 'string' || value.length > 300 || !/^[A-Za-z0-9_-]+$/.test(value)) throw new Error('Invalid mail cursor');
    const cursor = JSON.parse(Buffer.from(value, 'base64url').toString('utf8'));
    if (!Number.isSafeInteger(cursor.at) || cursor.at < 0 || typeof cursor.id !== 'string'
        || !/^[a-zA-Z0-9:_-]{1,120}$/.test(cursor.id)) throw new Error('Invalid mail cursor');
    return cursor;
}

// The profile array is a transactional delivery outbox, not the mailbox history.
// Existing producers keep their atomic reward/report + mail write. Only remove
// outbox IDs after durable, idempotent insertion into this indexed collection.
function createMailboxStore({ profiles, entries, notices, gameNotices = [], systemNotices = systemMailboxNotices() }) {
    const migrations = new Map();
    let seeding;
    async function seedNotices() {
        if (!seeding) seeding = (async () => {
            for (const { id, ...notice } of [...systemNotices, ...gameNotices]) {
                await notices.updateOne({ _id: id }, { $setOnInsert: notice }, { upsert: true });
            }
        })().catch(error => { seeding = null; throw error; });
        return seeding;
    }
    async function migrate(uid) {
        if (migrations.has(uid)) return migrations.get(uid);
        const task = (async () => {
            await entries.init();
            const profile = await profiles.findOne({ firebaseUid: uid })
                .select('playerMailbox readMailboxGameNotices').lean();
            if (!profile) return false;
            const old = profile.playerMailbox || [];
            const read = profile.readMailboxGameNotices || [];
            for (let start = 0; start < old.length; start += 200) {
                const batch = old.slice(start, start + 200);
                await entries.bulkWrite(batch.map(message => ({ updateOne: {
                    filter: { recipientUid: uid, id: message.id },
                    update: { $setOnInsert: { recipientUid: uid, id: message.id, shared: false,
                        createdAt: message.createdAt, message, readAt: message.readAt || null, archived: false, deleted: false } },
                    upsert: true
                } })), { writeConcern: { w: 'majority' } });
                await profiles.updateOne({ firebaseUid: uid }, { $pull: { playerMailbox: { id: { $in: batch.map(mail => mail.id) } } } });
            }
            for (let start = 0; start < read.length; start += 200) {
                const batch = read.slice(start, start + 200);
                await entries.bulkWrite(batch.map(id => ({ updateOne: {
                    filter: { recipientUid: uid, id },
                    update: { $setOnInsert: { recipientUid: uid, id, shared: true, createdAt: 0,
                        readAt: 1, archived: false, deleted: false } }, upsert: true
                } })), { writeConcern: { w: 'majority' } });
                await profiles.updateOne({ firebaseUid: uid }, { $pull: { readMailboxGameNotices: { $in: batch } } });
            }
            return true;
        })();
        migrations.set(uid, task);
        try { return await task; } finally { migrations.delete(uid); }
    }
    async function prepare(uid) {
        await seedNotices();
        if (!await migrate(uid)) throw new Error('Mail recipient unavailable');
    }
    function sharedPipeline(uid, archived, cursor, now, pinnedOnly = false) {
        const match = { createdAt: { $lte: now }, pinned: pinnedOnly ? true : { $ne: true } };
        if (cursor) match.$or = [{ createdAt: { $lt: cursor.at } }, { createdAt: cursor.at, _id: { $lt: cursor.id } }];
        return [
            { $match: match }, { $sort: { createdAt: -1, _id: -1 } },
            { $lookup: { from: entries.collection.name, let: { mailId: '$_id' }, pipeline: [
                { $match: { $expr: { $and: [{ $eq: ['$recipientUid', uid] }, { $eq: ['$id', '$$mailId'] }] } } },
                { $project: { readAt: 1, archived: 1, deleted: 1 } }
            ], as: 'states' } },
            { $set: { state: { $arrayElemAt: ['$states', 0] } } },
            { $match: archived ? { protected: { $ne: true }, 'state.deleted': { $ne: true }, 'state.archived': true }
                : { $or: [{ protected: true }, { 'state.deleted': { $ne: true }, 'state.archived': { $ne: true } }] } }
        ];
    }
    async function unreadCount(uid, now) {
        // Count the shared source once, then subtract only this recipient's
        // existing state rows. Avoid a lookup for every historic announcement
        // whenever the main-menu unread badge is refreshed.
        const [personal, shared, excluded] = await Promise.all([
            entries.countDocuments({ recipientUid: uid, shared: false, deleted: false, archived: false, readAt: null }),
            notices.countDocuments({ createdAt: { $lte: now } }),
            entries.aggregate([
                { $match: { recipientUid: uid, shared: true, $or: [{ readAt: { $ne: null } }, { archived: true }, { deleted: true }] } },
                { $lookup: { from: notices.collection.name, localField: 'id', foreignField: '_id', as: 'notice' } },
                { $match: { 'notice.createdAt': { $lte: now }, $or: [{ readAt: { $ne: null } }, { 'notice.protected': { $ne: true } }] } }, { $count: 'count' }
            ])
        ]);
        return personal + Math.max(0, shared - (excluded[0]?.count || 0));
    }
    async function get(uid, { summary = false, folder = 'inbox', before = '' } = {}) {
        if (!['inbox', 'archive'].includes(folder)) throw new Error('Invalid mailbox folder');
        const cursor = decodeCursor(before);
        await prepare(uid);
        const now = Date.now();
        const unread = await unreadCount(uid, now);
        if (summary) return { unread };
        const archived = folder === 'archive';
        const filter = { recipientUid: uid, shared: false, archived, deleted: false };
        if (cursor) filter.$or = [{ createdAt: { $lt: cursor.at } }, { createdAt: cursor.at, id: { $lt: cursor.id } }];
        const [personal, shared, pinned] = await Promise.all([
            entries.find(filter).sort({ createdAt: -1, id: -1 }).limit(PAGE_SIZE + 1).lean(),
            notices.aggregate([...sharedPipeline(uid, archived, cursor, now), { $limit: PAGE_SIZE + 1 }]),
            !archived && !cursor ? notices.aggregate([...sharedPipeline(uid, false, null, now, true), { $limit: PAGE_SIZE }]) : []
        ]);
        const rows = [...personal.map(row => ({ ...row.message, id: row.id, createdAt: row.createdAt,
            readAt: row.readAt, archived: row.archived })), ...[...shared, ...pinned].map(({ _id, state, states, ...notice }) =>
            ({ ...notice, id: _id, readAt: state?.readAt || null, archived: notice.protected ? false : !!state?.archived }))]
            .sort((a, b) => Number(!!b.pinned) - Number(!!a.pinned) || b.createdAt - a.createdAt || (a.id < b.id ? 1 : a.id > b.id ? -1 : 0));
        const page = rows.slice(0, PAGE_SIZE);
        const last = page.at(-1);
        const next = rows.length > PAGE_SIZE ? Buffer.from(JSON.stringify({ at: last.createdAt, id: last.id })).toString('base64url') : '';
        return { unread, folder, messages: mailboxSnapshot(page).messages, next };
    }
    async function mutate(uid, ids, action) {
        await prepare(uid);
        const change = action === 'read' ? { readAt: Date.now() }
            : action === 'delete' ? { deleted: true } : { archived: action === 'archive' };
        const update = { $set: change, ...(action === 'delete' ? { $unset: { message: '' } } : {}) };
        for (const id of ids) {
            if (action !== 'read' && await notices.exists({ _id: id, protected: true, createdAt: { $lte: Date.now() } })) {
                throw Object.assign(new Error('Protected mailbox announcement'), { code: 'mailbox_protected' });
            }
            const existing = await entries.findOne({ recipientUid: uid, id }).select('shared deleted readAt').lean();
            if (existing && !existing.shared) {
                await entries.updateOne({ recipientUid: uid, id, deleted: false,
                    ...(action === 'read' ? { readAt: null } : {}) }, update);
            } else {
                const notice = await notices.findOne({ _id: id, createdAt: { $lte: Date.now() } }).select('createdAt protected').lean();
                if (!notice) continue;
                if (notice.protected && action === 'read') {
                    await entries.updateOne({ recipientUid: uid, id }, { $set: { archived: false, deleted: false,
                        readAt: existing?.readAt || Date.now() }, $setOnInsert: {
                        recipientUid: uid, id, shared: true, createdAt: notice.createdAt
                    } }, { upsert: true });
                    continue;
                }
                if (existing?.deleted) continue;
                if (existing) {
                    await entries.updateOne({ recipientUid: uid, id, deleted: false,
                        ...(action === 'read' ? { readAt: null } : {}) }, { $set: change });
                } else {
                    // $setOnInsert preserves independent read/archive fields.
                    await entries.updateOne({ recipientUid: uid, id }, { $set: change,
                        $setOnInsert: { recipientUid: uid, id, shared: true, createdAt: notice.createdAt } }, { upsert: true });
                }
            }
        }
    }
    let sweeping = false;
    async function drain() {
        if (sweeping) return;
        sweeping = true;
        try {
            const pending = await profiles.find({ $or: [{ 'playerMailbox.0': { $exists: true } },
                { 'readMailboxGameNotices.0': { $exists: true } }] }).select('firebaseUid').limit(100).lean();
            for (const { firebaseUid } of pending) await migrate(firebaseUid);
        } finally { sweeping = false; }
    }
    return { get, mutate, migrate, drain };
}

module.exports = { createMailboxStore, mailboxEntrySchema, PAGE_SIZE, decodeCursor };
