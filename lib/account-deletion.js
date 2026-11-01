'use strict';

const crypto = require('node:crypto');

const hash = value => crypto.createHash('sha256').update(String(value)).digest('hex');
const validUid = uid => typeof uid === 'string' && /^[A-Za-z0-9_-]{20,128}$/.test(uid);
const DAY = 86400000;

function deletionError(code, status = 503) {
    return Object.assign(new Error(code), { code, status });
}

function reportFailure(stage, error) {
    // Only bounded SDK/DB error codes; never messages, identity, token or query.
    const code = String(error?.code || error?.codeName || error?.name || 'unknown');
    console.error('[Account deletion] Failure:', stage, /^[A-Za-z0-9_/-]{1,80}$/.test(code) ? code : 'unknown');
}

// Only references, not display names, identify a person. Duplicate display names
// must never cause another player's account or results to be deleted.
const personKeys = ['id', 'uid', 'playerId', 'firebaseUid', 'senderUid', 'fromUid'];
function scrubEmbedded(value, uid, replacement = '') {
    if (Array.isArray(value)) return value.map(item => scrubEmbedded(item, uid, replacement));
    if (!value || typeof value !== 'object' || value instanceof Date || value._bsontype) {
        return value === uid ? replacement : value;
    }
    const person = personKeys.some(key => value[key] === uid);
    const result = {};
    for (const [key, item] of Object.entries(value)) {
        if (key === uid) continue; // e.g. prizeAwards keyed by UID
        if (person && ['name', 'playerName', 'sender', 'photoUrl', 'photoURL', 'email'].includes(key)) {
            result[key] = key.toLowerCase().includes('name') || key === 'sender' ? 'Deleted player' : '';
        } else if (item === uid) {
            result[key] = replacement;
            // Championship history stores a winner/runner-up alongside their ID.
            const prefix = key.replace(/(?:Uid|Id)$/, '');
            if (prefix !== key) {
                if (Object.hasOwn(value, prefix + 'Name')) result[prefix + 'Name'] = 'Deleted player';
                if (Object.hasOwn(value, prefix + 'PhotoUrl')) result[prefix + 'PhotoUrl'] = '';
            }
        } else if (!Object.hasOwn(result, key)) {
            result[key] = scrubEmbedded(item, uid, replacement);
        }
    }
    return result;
}

function referenceHashes(value, output = new Set(), seen = new WeakSet()) {
    if (typeof value === 'string') {
        if (value.length > 0 && value.length <= 4096) {
            output.add(hash(value));
            // Stored SSV custom_data is a JSON string.
            if (value.startsWith('{')) {
                try { referenceHashes(JSON.parse(value), output, seen); } catch (_) {}
            }
        }
    } else if (value && typeof value === 'object' && !(value instanceof Date) && !value._bsontype) {
        if (seen.has(value)) return output;
        seen.add(value);
        for (const [key, item] of Object.entries(value)) {
            for (const segment of key.split('.')) output.add(hash(segment));
            referenceHashes(item, output, seen);
        }
    }
    return output;
}

function createAccountDeletion(options) {
    const { getDb, getAuth, getModels, monitorId, beforeDelete = async () => {}, enabled = false } = options;
    const localBlocks = new Set();
    const activeWrites = new Map();
    const jobs = () => getDb().collection('accountdeletionjobs');
    let workerRunning = false;
    let initialized = false;

    const blockHashes = uid => [hash(uid), hash(monitorId(uid))];
    async function isBlocked(uid) {
        if (!enabled || !uid) return false;
        const identityHash = hash(uid);
        if (localBlocks.has(identityHash)) return true;
        const stored = await jobs().findOne({ identityHash }, { projection: { _id: 1 } });
        return localBlocks.has(identityHash) || !!stored;
    }

    async function guardWrite(values) {
        if (!enabled) return () => {};
        const refs = [...referenceHashes(values)];
        if (!refs.length) return () => {};
        if (refs.some(ref => localBlocks.has(ref))) throw deletionError('account_deleted', 403);
        if (await jobs().findOne({ referenceHashes: { $in: refs } }, { projection: { _id: 1 } })) {
            throw deletionError('account_deleted', 403);
        }
        // No await between the second check and reservation: a deletion can now
        // wait for this actual DB write, including a write already in flight.
        if (refs.some(ref => localBlocks.has(ref))) throw deletionError('account_deleted', 403);
        refs.forEach(ref => activeWrites.set(ref, (activeWrites.get(ref) || 0) + 1));
        let released = false;
        return () => {
            if (released) return;
            released = true;
            refs.forEach(ref => {
                const count = (activeWrites.get(ref) || 1) - 1;
                if (count) activeWrites.set(ref, count); else activeWrites.delete(ref);
            });
        };
    }

    function installWriteGuards(mongoose) {
        const releaseKey = Symbol('accountDeletionWrite');
        mongoose.plugin(schema => {
            function release(context) { context[releaseKey]?.(); delete context[releaseKey]; }
            function before(next) {
                if (!enabled) return next();
                // Nested subdocuments share the parent's database write. Tracking
                // their save hooks separately can leak reservations on errors.
                if (!this.constructor.modelName && !this.model?.modelName) return next();
                const payload = this.getUpdate
                    ? [this.getFilter(), this.getUpdate()]
                    : this.toObject({ depopulate: true });
                guardWrite(payload).then(done => { this[releaseKey] = done; next(); }, next);
            }
            for (const hook of ['save', 'updateOne', 'updateMany', 'findOneAndUpdate', 'replaceOne', 'findOneAndReplace']) {
                schema.pre(hook, before);
                schema.post(hook, function (_result, next) { release(this); next(); });
                schema.post(hook, function (error, _result, next) { release(this); next(error); });
            }
        });
    }

    function protectModelBatches(models) {
        for (const model of Object.values(models)) {
            for (const method of ['insertMany', 'bulkWrite']) {
                const original = model[method];
                model[method] = async function (documents, ...args) {
                    const release = await guardWrite(documents);
                    try { return await original.call(this, documents, ...args); }
                    finally { release(); }
                };
            }
        }
    }

    async function waitForWrites(uid) {
        const refs = blockHashes(uid);
        const deadline = Date.now() + 20000;
        while (refs.some(ref => activeWrites.has(ref))) {
            if (Date.now() >= deadline) throw deletionError('writes_not_drained');
            await new Promise(resolve => setTimeout(resolve, 25));
        }
    }

    async function initialize() {
        if (!enabled || initialized) return;
        for (const name of ['DisconnectDiagnostic', 'MatchResultSubmissionDiagnostic']) {
            const model = getModels()[name];
            if (!model) continue;
            const collection = getDb().collection(model.collection.name);
            let indexes;
            try { indexes = await collection.listIndexes().toArray(); }
            catch (error) { if (error.code !== 26) throw error; indexes = []; }
            const existing = indexes.find(index => index.key.occurredAt === 1 && Object.keys(index.key).length === 1);
            if (!existing) await collection.createIndex({ occurredAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });
            else if (existing.expireAfterSeconds !== 30 * 24 * 60 * 60) {
                // MongoDB 5.1+ can convert an existing ordinary index to TTL
                // without dropping it or rewriting any diagnostic documents.
                await getDb().command({ collMod: model.collection.name, index: { name: existing.name, expireAfterSeconds: 30 * 24 * 60 * 60 } });
            }
        }
        await jobs().createIndex({ identityHash: 1 }, { unique: true });
        await jobs().createIndex({ referenceHashes: 1 });
        await jobs().createIndex({ state: 1, nextAttemptAt: 1 });
        await jobs().createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
        initialized = true;
    }

    async function request(token, confirmation) {
        if (!enabled) throw deletionError('account_deletion_unavailable');
        if (confirmation !== 'DELETE') throw deletionError('confirmation_required', 400);
        const auth = getAuth();
        if (!auth || !getDb()) throw deletionError('account_deletion_unavailable');
        let decoded;
        try { decoded = await auth.verifyIdToken(token, true); }
        catch (_) { throw deletionError('sign_in_required', 401); }
        const age = Date.now() / 1000 - Number(decoded.auth_time);
        if (!validUid(decoded.uid) || !Number.isFinite(age) || age < -60 || age > 300) {
            throw deletionError('recent_sign_in_required', 401);
        }
        if (decoded.firebase?.sign_in_provider !== 'google.com') throw deletionError('google_sign_in_required', 401);
        try { await initialize(); }
        catch (error) { reportFailure('request_initialize', error); throw error; }
        const uid = decoded.uid;
        const refs = blockHashes(uid);
        const receipt = crypto.randomBytes(32).toString('base64url');
        refs.forEach(ref => localBlocks.add(ref));
        let job;
        try {
            job = await jobs().findOneAndUpdate(
                { identityHash: hash(uid) },
                {
                    $setOnInsert: {
                        _id: crypto.randomUUID(), identityHash: hash(uid), referenceHashes: refs,
                        uid, replacement: 'deleted_' + crypto.randomUUID(), state: 'pending',
                        createdAt: new Date(), nextAttemptAt: new Date(), attempts: 0
                    },
                    $set: { receiptHash: hash(receipt) }
                },
                { upsert: true, returnDocument: 'after', includeResultMetadata: false }
            );
        } catch (error) {
            reportFailure('request_store', error);
            // A racing request, or an ambiguous network error after insertion,
            // must not remove the block protecting an already accepted job.
            try {
                if (!await jobs().findOne({ identityHash: hash(uid) })) refs.forEach(ref => localBlocks.delete(ref));
            } catch (_) { /* Unknown insertion outcome: keep the local block. */ }
            throw error;
        }
        if (job.state === 'complete') refs.forEach(ref => localBlocks.delete(ref));
        return { ok: true, jobId: job._id, receipt, state: job.state };
    }

    async function status(jobId, receipt) {
        if (!enabled || !/^[a-f0-9-]{36}$/.test(jobId || '') || !/^[A-Za-z0-9_-]{43}$/.test(receipt || '')) {
            throw deletionError('not_found', 404);
        }
        const job = await jobs().findOne({ _id: jobId, receiptHash: hash(receipt) });
        if (!job) throw deletionError('not_found', 404);
        return { ok: true, state: job.state === 'complete' ? 'complete' : 'pending' };
    }

    async function scrubData(uid, tournamentReplacement = 'deleted_' + crypto.randomUUID()) {
        const db = getDb();
        const models = getModels();
        const collection = model => {
            if (!models[model]) throw deletionError('unknown_deletion_model');
            return db.collection(models[model].collection.name);
        };
        const matches = await collection('MatchResult').find({ 'participants.uid': uid }).toArray();
        const roomIds = matches.map(match => match.roomId).filter(Boolean);
        // Private documents contain no opponent account state and can be removed.
        for (const [model, query] of [
            ['Score', { $or: [{ uid }, { playerId: uid }] }],
            ['LeagueScore', { playerId: uid }], ['TourneyStats', { playerId: uid }],
            ['PushToken', { uid }], ['MatchResultSubmissionDiagnostic', { uid }],
            ['DisconnectDiagnostic', { uid }],
            ['GlobalChatModerationLog', { uid }],
            ['GlobalChatReport', { $or: [{ senderUid: uid }, { reportedByUid: uid }] }],
            ['AdMobRewardVerification', { $or: [{ uid }, { claimedBy: uid }, { 'raw.user_id': uid }] }],
            ['ServerMonitorActivity', { anonId: monitorId(uid) }],
            ['ServerMonitorDailyActivity', { anonId: monitorId(uid) }]
        ]) await collection(model).deleteMany(query);

        await collection('GlobalChat').updateMany({}, {
            $pull: { messages: { $or: [{ senderUid: uid }, { senderId: uid }] } }
        });
        // Preserve the opponent's score and record while removing this identity.
        await collection('MatchResult').updateMany({ 'participants.uid': uid }, {
            $set: { 'participants.$[removed].uid': '', 'participants.$[removed].name': 'Deleted player', clientResultId: '', gameSessionId: '' },
        }, { arrayFilters: [{ 'removed.uid': uid }] });
        await collection('MatchResult').updateMany({}, { $pull: { statsAppliedUids: uid, rewardClaimedUids: uid } });
        for (const field of ['winnerUid', 'loserUid']) {
            await collection('MatchResult').updateMany({ [field]: uid }, { $set: { [field]: '' } });
        }
        if (roomIds.length) await collection('DisconnectDiagnostic').updateMany(
            { roomId: { $in: roomIds } }, { $set: { playerName: '', opponentName: '' } }
        );
        await collection('DisconnectDiagnostic').updateMany({ opponentUid: uid }, { $set: { opponentUid: '', opponentName: '' } });

        for (const [model, prefix] of [['UserProfile', ''], ['UserProfileBackup', 'profile.']]) {
            await collection(model).updateMany({}, {
                $pull: {
                    [prefix + 'friends']: uid, [prefix + 'friendRequests']: uid,
                    [prefix + 'friendNotifications']: { fromUid: uid }
                },
                $unset: { [prefix + 'h2hStats.' + uid]: '' }
            });
        }

        // Embedded historical records have varied versions. Match exact IDs,
        // clear the paired name/photo, and use compare-and-swap to preserve any
        // concurrent update to another player's tournament/history.
        for (const [model, fields] of [
            ['LeagueHallOfFame', ['topScores', 'champion']],
            ['TournamentState', ['players', 'bracket']], ['TourneyStats', ['championships']]
        ]) {
            for await (const document of collection(model).find({})) {
                const update = {};
                const filter = { _id: document._id };
                const replacement = model === 'TournamentState' ? tournamentReplacement : '';
                for (const field of fields) {
                    if (document[field] == null) continue;
                    const scrubbed = scrubEmbedded(document[field], uid, replacement);
                    if (JSON.stringify(scrubbed) === JSON.stringify(document[field])) continue;
                    filter[field] = document[field];
                    update[field] = scrubbed;
                }
                if (!Object.keys(update).length) continue;
                const result = await collection(model).updateOne(filter, { $set: update });
                if (result.matchedCount !== 1) throw deletionError('deletion_write_conflict');
            }
        }
        // Delete profiles/backups last; a retry still has the identity in its job.
        await collection('UserProfileBackup').deleteMany({ firebaseUid: uid });
        await collection('UserProfile').deleteMany({ firebaseUid: uid });
    }

    async function runJob(job) {
        const auth = getAuth();
        if (!auth || !validUid(job.uid)) throw deletionError('account_deletion_unavailable');
        const uid = job.uid;
        blockHashes(uid).forEach(ref => localBlocks.add(ref));
        try {
            await auth.updateUser(uid, { disabled: true });
            await auth.revokeRefreshTokens(uid);
        } catch (error) {
            if (error.code !== 'auth/user-not-found') throw error;
        }
        await beforeDelete(uid, job.replacement);
        await waitForWrites(uid);
        await (options.eraseData || scrubData)(uid, job.replacement);
        try { await auth.deleteUser(uid); }
        catch (error) { if (error.code !== 'auth/user-not-found') throw error; }
        await jobs().updateOne({ _id: job._id }, {
            $set: { state: 'complete', completedAt: new Date(), expiresAt: new Date(Date.now() + 90 * DAY) },
            $unset: { uid: '', replacement: '', leaseUntil: '', nextAttemptAt: '', lastError: '' }
        });
        // Completed blocks are enforced by the expiring DB record. Do not keep
        // an additional, unbounded in-memory copy past the published retention.
        blockHashes(uid).forEach(ref => localBlocks.delete(ref));
    }

    async function work() {
        if (!enabled || workerRunning || !getDb() || !getAuth()) return;
        workerRunning = true;
        try {
            await initialize();
            for (let count = 0; count < 3; count++) {
                const now = new Date();
                const job = await jobs().findOneAndUpdate({
                    $or: [
                        { state: 'pending', nextAttemptAt: { $lte: now } },
                        { state: 'processing', leaseUntil: { $lt: now } }
                    ]
                }, {
                    $set: { state: 'processing', leaseUntil: new Date(Date.now() + 120000) },
                    $inc: { attempts: 1 }
                }, { returnDocument: 'after', includeResultMetadata: false });
                if (!job) break;
                try { await runJob(job); }
                catch (_) {
                    await jobs().updateOne({ _id: job._id }, {
                        $set: { state: 'pending', nextAttemptAt: new Date(Date.now() + 60000), lastError: 'cleanup_incomplete' },
                        $unset: { leaseUntil: '' }
                    });
                    // No UID, token, email or raw SDK/database errors in logs.
                    console.error('[Account deletion] Job needs retry:', job._id);
                }
            }
            // A completed receipt expires after 30 days. Its minimal prevention
            // record is removed by the TTL index after 90 days.
            await jobs().updateMany({ state: 'complete', completedAt: { $lt: new Date(Date.now() - 30 * DAY) } }, {
                $unset: { receiptHash: '', completedAt: '', createdAt: '', attempts: '' }
            });
        } finally { workerRunning = false; }
    }

    function mount(app, publicFirebaseConfig) {
        const attempts = new Map();
        const noStore = (_req, res, next) => { res.set('Cache-Control', 'no-store'); next(); };
        app.get('/api/account-deletion/config', noStore, (_req, res) => {
            res.json({ enabled: !!enabled && !!getDb() && !!getAuth(), firebase: publicFirebaseConfig });
        });
        app.post('/api/account-deletion', noStore, async (req, res) => {
            try {
                const now = Date.now();
                for (const [key, value] of attempts) if (value.until < now) attempts.delete(key);
                const key = req.socket?.remoteAddress || 'unknown';
                const entry = attempts.get(key) || { count: 0, until: now + 60000 };
                if (++entry.count > 20 || attempts.size > 10000) throw deletionError('too_many_requests', 429);
                attempts.set(key, entry);
                const token = /^Bearer ([^\s]+)$/.exec(req.headers.authorization || '')?.[1];
                if (!token || token.length > 10000) throw deletionError('sign_in_required', 401);
                const result = await request(token, req.body?.confirmation);
                res.status(202).json(result);
                void work().catch(() => console.error('[Account deletion] Worker unavailable.'));
            } catch (error) {
                reportFailure('request', error);
                res.status(error.status || 503).json({ ok: false, reason: error.status ? error.code : 'account_deletion_unavailable' });
            }
        });
        app.get('/api/account-deletion/status/:jobId', noStore, async (req, res) => {
            try { res.json(await status(req.params.jobId, req.headers['x-deletion-receipt'])); }
            catch (error) { res.status(error.status || 503).json({ ok: false, reason: error.status ? error.code : 'account_deletion_unavailable' }); }
        });
    }

    return { enabled, installWriteGuards, protectModelBatches, isBlocked, guardWrite, request, status, work, scrubData, mount, waitForWrites };
}

module.exports = { createAccountDeletion, scrubEmbedded, referenceHashes, hash, validUid };
