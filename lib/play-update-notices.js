'use strict';

const PACKAGE = 'com.yamb.balkan';
const STORE_URL = `https://play.google.com/store/apps/details?id=${PACKAGE}`;
const APP_API = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${PACKAGE}`;
const PLAY_SCOPE = 'https://www.googleapis.com/auth/androidpublisher';
const PUBLISHED = 'RELEASE_LIFECYCLE_STATE_PUBLISHED';
const CHECK_INTERVAL_MS = 15 * 60 * 1000;

function versionCode(value) {
    if (!['number', 'string'].includes(typeof value) || !/^[1-9]\d{0,9}$/.test(String(value))) return 0;
    const code = Number(value);
    return code <= 2_100_000_000 ? code : 0;
}

function publishedVersions(data) {
    if (!Array.isArray(data?.releases)) throw new Error('invalid_release_summary');
    const versions = new Map();
    for (const release of data.releases) {
        if (release.track !== 'production' || release.releaseLifecycleState !== PUBLISHED) continue;
        for (const artifact of release.activeArtifacts || []) {
            const code = versionCode(artifact.versionCode);
            if (code) versions.set(code, release.releaseName);
        }
    }
    return versions;
}

function latestCompletedRelease(track, published, after) {
    if (track?.track !== 'production' || !Array.isArray(track.releases)) throw new Error('invalid_production_track');
    let latest = null;
    for (const release of track.releases) {
        if (release.status !== 'completed' || release.userFraction != null || release.countryTargeting != null) continue;
        for (const artifactCode of release.versionCodes || []) {
            const code = versionCode(artifactCode);
            if (code <= after || !published.has(code) || code <= (latest?.versionCode || 0)) continue;
            const name = published.get(code);
            const versionName = typeof name === 'string' && /^\d{1,8}(?:\.\d{1,8}){1,3}$/.test(name) ? name : String(code);
            latest = { versionCode: code, versionName };
        }
    }
    return latest;
}

function createPlayUpdateWatcher({ request, notices, baselineVersionCode, available = () => true,
    onPublished = () => {}, onError = () => {}, now = Date.now }) {
    const baseline = versionCode(baselineVersionCode);
    if (!baseline) throw new Error('invalid_update_baseline');
    let running = false;

    async function check() {
        if (running || !available()) return false;
        running = true;
        try {
            const last = await notices.findOne({ type: 'android_update' }).sort({ versionCode: -1 }).select('versionCode').lean();
            const after = Math.max(baseline, versionCode(last?.versionCode));
            const published = publishedVersions(await request('GET', `${APP_API}/tracks/production/releases`));
            if (![...published.keys()].some(code => code > after)) return false;

            const edit = await request('POST', `${APP_API}/edits`, {});
            if (typeof edit?.id !== 'string' || !/^[A-Za-z0-9_-]{1,200}$/.test(edit.id)) throw new Error('invalid_play_edit');
            const editUrl = `${APP_API}/edits/${edit.id}`;
            let latest;
            try {
                const track = await request('GET', `${editUrl}/tracks/production`);
                latest = latestCompletedRelease(track, published, after);
            } finally {
                // Only the watcher’s temporary edit is discarded. No edit is committed.
                try { await request('DELETE', editUrl); }
                catch (error) { if (error.response?.status !== 404) onError('discard_edit', error); }
            }
            if (!latest) return false;

            const result = await notices.updateOne({ _id: `game:android-update:${latest.versionCode}` }, {
                $setOnInsert: { type: 'android_update', ...latest, createdAt: now(),
                    action: { type: 'update', url: STORE_URL } }
            }, { upsert: true, writeConcern: { w: 'majority' } });
            if (result.upsertedCount !== 1) return false;
            onPublished(latest);
            return true;
        } finally {
            running = false;
        }
    }

    return { check };
}

function startPlayUpdateNotices({ environment, env, notices, available, onPublished, onError = () => {} }) {
    if (environment !== 'production' || env.YAMB_PLAY_UPDATE_NOTICES_ENABLED !== 'true') return;
    let watcher;
    try {
        // Use a dedicated service account so this watcher cannot replace a publisher’s open edit.
        const credentials = JSON.parse(Buffer.from(env.YAMB_PLAY_UPDATE_READER_BASE64 || '', 'base64').toString('utf8'));
        if (credentials.type !== 'service_account' || !credentials.client_email || !credentials.private_key) {
            throw new Error('invalid_play_update_reader');
        }
        const { JWT } = require('google-auth-library');
        const client = new JWT({ email: credentials.client_email, key: credentials.private_key, scopes: [PLAY_SCOPE] });
        watcher = createPlayUpdateWatcher({ notices, available, onPublished, onError,
            baselineVersionCode: env.YAMB_PLAY_UPDATE_BASELINE_VERSION_CODE,
            request: async (method, url, data) => (await client.request({ method, url, data, timeout: 15_000, retry: false })).data });
    } catch (error) {
        onError('configuration', error);
        return;
    }
    const tick = () => watcher.check().catch(error => onError('check', error));
    setTimeout(tick, 30_000).unref();
    setInterval(tick, CHECK_INTERVAL_MS).unref();
}

module.exports = { createPlayUpdateWatcher, startPlayUpdateNotices, STORE_URL };
