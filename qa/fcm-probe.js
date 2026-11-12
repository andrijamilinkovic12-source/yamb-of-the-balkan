'use strict';

const errorCodes = new Set([
    'messaging/authentication-error', 'messaging/mismatched-credential', 'messaging/invalid-argument',
    'messaging/invalid-recipient', 'messaging/invalid-registration-token', 'messaging/registration-token-not-registered',
    'messaging/server-unavailable', 'messaging/internal-error', 'messaging/unknown-error',
    'messaging/message-rate-exceeded', 'messaging/device-message-rate-exceeded',
    'messaging/third-party-auth-error', 'messaging/invalid-apns-credentials',
    'app/invalid-credential', 'app/network-error', 'app/network-timeout', 'app/invalid-argument'
]);

function readQaFcmProbeId(env, runtime, fixture, policy) {
    const id = env.YAMB_QA_FCM_PROBE_ID;
    if (!id) return null;
    if (runtime.environment !== 'staging' || runtime.instanceId !== 'reconnect-qa-01'
        || policy.mode !== 'staging' || policy.projectId !== 'yamb-reconnect-qa'
        || fixture?.humanUids?.length !== 2 || policy.selectUids(fixture.humanUids).length !== 2
        || !/^qa_fcm_[a-z0-9_]{8,40}$/.test(id)) throw new Error('qa_fcm_probe_scope_invalid');
    return id;
}

function createQaFcmStats() {
    const data = { registrations: 0, attempted: 0, accepted: 0, errors: {} };
    return {
        registrations: n => { data.registrations += n; },
        attempted: n => { data.attempted += n; },
        accepted: n => { data.accepted += n; },
        failure(error) {
            let code = errorCodes.has(error?.code) ? error.code : 'unclassified';
            if (['messaging/mismatched-credential', 'messaging/authentication-error'].includes(code)) {
                const message = String(error.message || '');
                if (/cloudmessaging\.messages\.create/i.test(message)) code = 'messaging/iam-send-denied';
                else if (/sender[ _-]*id[ _-]*mismatch/i.test(message)) code = 'messaging/sender-id-mismatch';
            }
            data.errors[code] = (data.errors[code] || 0) + 1;
        },
        snapshot: () => ({ ...data, errors: { ...data.errors } })
    };
}

async function runQaFcmProbe({ id, fixture, db, send, now = Date.now, inQuietHours }) {
    if (!id || inQuietHours(now())) return { skipped: true };
    if (db.databaseName !== fixture.databaseName) throw new Error('qa_fcm_probe_database_mismatch');
    const runs = db.collection('qafcmproberuns');
    // Claim once before sending; a restart must not repeat a diagnostic message.
    const claim = await runs.updateOne({ _id: id }, { $setOnInsert: { startedAt: now() } },
        { upsert: true, writeConcern: { w: 'majority' } });
    if (claim.upsertedCount !== 1) return { skipped: true };
    const outcomes = [];
    for (const [index, uid] of fixture.humanUids.entries()) {
        const stats = createQaFcmStats();
        await send([uid], {
            category: 'tournament', scope: 'qa_fcm_probe', type: 'qa_fcm_probe',
            tag: 'yamb_qa_fcm_probe_' + id, expiresAt: now() + 120000,
            title: 'Yamb QA: Push validation', body: 'Validation-only probe for the isolated QA tournament.'
        }, stats);
        outcomes.push({ device: index + 1, ...stats.snapshot() });
    }
    await runs.updateOne({ _id: id }, { $set: { finishedAt: now(), outcomes } });
    return { skipped: false, outcomes };
}

module.exports = { readQaFcmProbeId, runQaFcmProbe, createQaFcmStats };
