'use strict';

const { getValidatedStagingFirebaseProjectId } = require('../scripts/reconnect-staging-safety');

function createPushDeliveryPolicy({ environment, env = process.env }) {
    const requested = /^(?:1|true)$/i.test(env.YAMB_STAGING_FCM_ENABLED || '');
    const emulator = !!env.FIREBASE_AUTH_EMULATOR_HOST;
    if (requested && environment !== 'staging') throw new Error('staging_fcm_requires_staging_runtime');
    if (requested && emulator) throw new Error('staging_fcm_forbidden_with_auth_emulator');
    if (environment !== 'staging') {
        return { enabled: !emulator, mode: emulator ? 'disabled' : 'production',
            selectUids: uids => Array.isArray(uids) ? uids : [], allowsUid: () => !emulator,
            validateCredentials() {} };
    }
    if (!requested) return { enabled: false, mode: 'disabled', selectUids: () => [], allowsUid: () => false,
        validateCredentials() {} };

    const projectId = getValidatedStagingFirebaseProjectId(env);
    let recipients;
    try { recipients = JSON.parse(env.YAMB_STAGING_FCM_ALLOWED_UIDS || ''); }
    catch (_) { throw new Error('staging_fcm_allowlist_invalid'); }
    if (!Array.isArray(recipients) || recipients.length < 1 || recipients.length > 16
        || recipients.some(uid => typeof uid !== 'string' || !/^[A-Za-z0-9_-]{20,128}$/.test(uid))
        || new Set(recipients).size !== recipients.length) throw new Error('staging_fcm_allowlist_invalid');
    const allowed = new Set(recipients);

    return {
        enabled: true, mode: 'staging', projectId,
        allowsUid: uid => allowed.has(uid),
        selectUids: uids => Array.isArray(uids)
            ? [...new Set(uids.filter(uid => typeof uid === 'string').map(uid => uid.trim()).filter(uid => allowed.has(uid)))] : [],
        validateCredentials(account) {
            // No ADC/project-ID-only fallback: test delivery must use credentials
            // whose origin can be checked before any send is enabled.
            if (account?.type !== 'service_account' || account.project_id !== projectId
                || typeof account.private_key !== 'string' || !account.private_key
                || typeof account.client_email !== 'string'
                || !account.client_email.endsWith('@' + projectId + '.iam.gserviceaccount.com')) {
                throw new Error('staging_fcm_requires_own_project_service_account');
            }
        }
    };
}

module.exports = { createPushDeliveryPolicy };
