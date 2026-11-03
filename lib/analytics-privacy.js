'use strict';

const { hash, validUid } = require('./account-deletion');
const { validInstanceId } = require('./analytics-deletion');
const fail = (code, status = 503) => Object.assign(new Error(code), { code, status });

// One installation belongs to one game identity. Clients must reset Analytics
// before changing identities. Never accept a UID/property from the request body.
function createAnalyticsPrivacy({ enabled, getDb, getAuth, guardWrite, provider }) {
    let initializing;
    const collection = () => getDb().collection('analyticsinstallations');
    async function initialize() {
        if (!initializing) initializing = collection().createIndex({ uid: 1 }).catch(error => {
            initializing = null;
            throw error;
        });
        await initializing;
    }
    async function register(token, appInstanceId) {
        if (!enabled || !getDb() || !getAuth()) throw fail('analytics_unavailable');
        if (typeof token !== 'string' || !token || token.length > 10000) throw fail('sign_in_required', 401);
        if (!validInstanceId(appInstanceId)) throw fail('analytics_identity_invalid', 400);
        let identity;
        try { identity = await getAuth().verifyIdToken(token, true); }
        catch (_) { throw fail('sign_in_required', 401); }
        if (!validUid(identity?.uid) || identity.firebase?.sign_in_provider !== 'google.com') throw fail('sign_in_required', 401);
        const uid = identity.uid;
        const release = await guardWrite({ uid });
        try {
            await initialize();
            try {
                await collection().updateOne({ _id: hash(appInstanceId), uid }, {
                    $setOnInsert: { uid, appInstanceId, createdAt: new Date() }
                }, { upsert: true });
            } catch (error) {
                if (error.code === 11000) throw fail('analytics_identity_conflict', 409);
                throw error;
            }
        } finally { release(); }
        return { ok: true, analyticsUserId: hash(uid) };
    }
    async function snapshot(uid) {
        if (!enabled || !provider || !validUid(uid)) throw fail('analytics_unavailable');
        const rows = await collection().find({ uid }, { projection: { appInstanceId: 1 } }).toArray();
        if (rows.some(row => !validInstanceId(row.appInstanceId))) throw fail('analytics_identity_invalid');
        return { propertyId: provider.propertyId, appInstanceIds: [...new Set(rows.map(row => row.appInstanceId))] };
    }
    async function submit(uid, plan, acknowledged, onAcknowledged) {
        if (plan.propertyId !== provider.propertyId) throw fail('analytics_property_mismatch');
        return provider.submit({ uid: hash(uid), appInstanceIds: plan.appInstanceIds, acknowledged }, onAcknowledged);
    }
    async function eraseRegistry(uid) { await collection().deleteMany({ uid }); }
    function mount(app) {
        const noStore = (_req, res, next) => { res.set('Cache-Control', 'no-store'); next(); };
        app.get('/api/analytics/config', noStore, (_req, res) => {
            res.json({ enabled: !!enabled && !!getDb() && !!getAuth() });
        });
        // Bound memory and request volume without ever retaining tokens/IDs.
        const attempts = new Map();
        app.post('/api/analytics/installation', noStore, async (req, res) => {
            try {
                const now = Date.now();
                for (const [key, entry] of attempts) if (entry.until < now) attempts.delete(key);
                const key = req.socket?.remoteAddress || 'unknown';
                const entry = attempts.get(key) || { count: 0, until: now + 60000 };
                if (++entry.count > 60 || attempts.size > 10000) throw fail('too_many_requests', 429);
                attempts.set(key, entry);
                const token = /^Bearer ([^\s]+)$/.exec(req.headers.authorization || '')?.[1];
                res.json(await register(token, req.body?.appInstanceId));
            } catch (error) {
                const known = error.status && /^[a-z_]{1,64}$/.test(error.code || '');
                res.status(known ? error.status : 503).json({ ok: false, reason: known ? error.code : 'analytics_unavailable' });
            }
        });
    }
    return { register, snapshot, submit, eraseRegistry, mount };
}

module.exports = { createAnalyticsPrivacy };
