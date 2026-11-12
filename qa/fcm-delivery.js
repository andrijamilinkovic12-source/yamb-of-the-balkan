'use strict';

const { ObjectId } = require('mongoose').mongo;
const { readQaFcmProbeId, createQaFcmStats } = require('./fcm-probe');

function qaRegistrationReceipt(uid, registration, fixture, policy) {
    if (policy.mode !== 'staging' || !fixture?.humanUids?.includes(uid) || !policy.allowsUid(uid)) return {};
    const id = registration?._id?.toString();
    return /^[a-f0-9]{24}$/.test(id || '') ? { qaRegistrationId: id } : {};
}

function readQaFcmDeliveryConfig(env, runtime, fixture, policy, now = Date.now) {
    if (!env.YAMB_QA_FCM_DELIVERY) return null;
    let value;
    try { value = JSON.parse(env.YAMB_QA_FCM_DELIVERY); } catch (_) { throw new Error('qa_fcm_delivery_config_invalid'); }
    if (!value || Object.keys(value).sort().join(',') !== 'expiresAt,id,registrationIds,version'
        || value.version !== 1 || typeof value.id !== 'string'
        || !Number.isSafeInteger(value.expiresAt) || value.expiresAt <= 0 || value.expiresAt > now() + 86400000
        || !Array.isArray(value.registrationIds) || value.registrationIds.length !== 2
        || new Set(value.registrationIds).size !== 2
        || value.registrationIds.some(id => typeof id !== 'string' || !/^[a-f0-9]{24}$/.test(id))) {
        throw new Error('qa_fcm_delivery_config_invalid');
    }
    readQaFcmProbeId({ YAMB_QA_FCM_PROBE_ID: value.id }, runtime, fixture, policy);
    return { ...value, registrationIds: value.registrationIds.map(id => new ObjectId(id)) };
}

async function runQaFcmDeliveryProbe({ config, fixture, db, send, now = Date.now, inQuietHours }) {
    if (!config || now() >= config.expiresAt || inQuietHours(now())) return { skipped: true };
    if (db.databaseName !== fixture.databaseName) throw new Error('qa_fcm_delivery_database_mismatch');
    // Resolve only receipts collected from the current native QA apps.
    // No token values are inspected, logged or returned by this preparation.
    for (const [index, uid] of fixture.humanUids.entries()) {
        const registration = await db.collection('pushtokens').findOne({ _id: config.registrationIds[index], uid,
            enabled: true, platform: 'android', 'categories.tournament': { $ne: false },
            lastSeenAt: { $gte: now() - 1800000 } }, { projection: { _id: 1 } });
        if (!registration) throw new Error('qa_fcm_delivery_receipt_not_current');
    }
    const runs = db.collection('qafcmproberuns');
    const key = 'delivery:' + config.id;
    const claim = await runs.updateOne({ _id: key }, { $setOnInsert: { startedAt: now() } },
        { upsert: true, writeConcern: { w: 'majority' } });
    if (claim.upsertedCount !== 1) return { skipped: true };
    const outcomes = [];
    for (const [index, uid] of fixture.humanUids.entries()) {
        const stats = createQaFcmStats({ registrationId: config.registrationIds[index], deliver: true });
        await send([uid], {
            category: 'tournament', scope: 'tournament', type: 'qa_fcm_delivery',
            tag: 'yamb_qa_push_' + config.id, expiresAt: Math.min(config.expiresAt, now() + 120000),
            title: 'Yamb QA: push test', body: 'Testno obavestenje za probni turnir.',
            data: { qaProbeId: config.id, kind: 'qa_fcm_delivery', recipientUid: uid }
        }, stats);
        outcomes.push({ device: index + 1, ...stats.snapshot() });
    }
    await runs.updateOne({ _id: key }, { $set: { finishedAt: now(), outcomes } });
    return { skipped: false, outcomes };
}

module.exports = { qaRegistrationReceipt, readQaFcmDeliveryConfig, runQaFcmDeliveryProbe };
