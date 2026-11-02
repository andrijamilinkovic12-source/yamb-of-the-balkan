'use strict';

const crypto = require('node:crypto');
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const failure = code => Object.assign(new Error(code), { code });
const validUid = value => typeof value === 'string' && /^[A-Za-z0-9_-]{20,128}$/.test(value);
const validInstanceId = value => typeof value === 'string' && /^[A-Za-z0-9_-]{16,256}$/.test(value);

function validateProperty({ propertyId, environment, productionPropertyId }) {
    propertyId = String(propertyId || '');
    productionPropertyId = String(productionPropertyId || '');
    if (!/^[1-9][0-9]{3,19}$/.test(String(propertyId || ''))) throw failure('analytics_property_required');
    if (!/^[1-9][0-9]{3,19}$/.test(String(productionPropertyId || ''))) throw failure('analytics_production_property_required');
    if (environment === 'production' && propertyId !== productionPropertyId) throw failure('analytics_property_mismatch');
    if (environment !== 'production' && propertyId === productionPropertyId) throw failure('analytics_production_property_forbidden');
    return propertyId;
}

function createAnalyticsDeletion(options) {
    const { getAccessToken, fetch: request = globalThis.fetch, timeoutMs = 10000 } = options;
    const propertyId = validateProperty(options);
    if (typeof getAccessToken !== 'function' || typeof request !== 'function') throw failure('analytics_credentials_required');
    // The destination/property comes only from reviewed server configuration.
    const endpoint = 'https://analyticsadmin.googleapis.com/v1alpha/properties/' + propertyId + ':submitUserDeletion';

    async function submit({ uid, appInstanceIds = [], acknowledged = [] }, onAcknowledged = async () => {}) {
        if (!validUid(uid) || !Array.isArray(appInstanceIds) || appInstanceIds.some(id => !validInstanceId(id))) {
            throw failure('analytics_identity_invalid');
        }
        const identifiers = [{ userId: uid }, ...[...new Set(appInstanceIds)].map(appInstanceId => ({ appInstanceId }))];
        const known = new Set(acknowledged);
        let submitted = 0;
        for (const identifier of identifiers) {
            const acknowledgmentKey = hash(JSON.stringify(identifier));
            if (known.has(acknowledgmentKey)) continue;
            let accessToken;
            try { accessToken = await getAccessToken(); }
            catch (_) { throw failure('analytics_credentials_unavailable'); }
            if (typeof accessToken !== 'string' || !accessToken || /\s/.test(accessToken)) throw failure('analytics_credentials_unavailable');
            let response;
            try {
                response = await request(endpoint, {
                    method: 'POST', headers: { Authorization: 'Bearer ' + accessToken, 'Content-Type': 'application/json' },
                    body: JSON.stringify(identifier), signal: AbortSignal.timeout(timeoutMs)
                });
            } catch (_) { throw failure('analytics_deletion_unavailable'); }
            // Never include provider messages, identifiers, or tokens in errors.
            if (!response.ok) throw failure(response.status === 401 || response.status === 403
                ? 'analytics_deletion_access_denied' : 'analytics_deletion_unavailable');
            let result;
            try { result = await response.json(); }
            catch (_) { throw failure('analytics_deletion_invalid_response'); }
            if (typeof result?.deletionRequestTime !== 'string' || !Number.isFinite(Date.parse(result.deletionRequestTime))) {
                throw failure('analytics_deletion_invalid_response');
            }
            // Persist each acknowledgement before continuing so retries can
            // resume after a partial provider/network failure.
            await onAcknowledged({ key: acknowledgmentKey, requestedAt: new Date(result.deletionRequestTime) });
            known.add(acknowledgmentKey);
            submitted++;
        }
        // An API acknowledgement is a submitted request, not proof that
        // Google's asynchronous erasure has already finished.
        return { state: 'submitted', propertyId, identifierCount: identifiers.length, newlySubmitted: submitted };
    }
    return { propertyId, submit };
}

module.exports = { createAnalyticsDeletion, validateProperty, validInstanceId };
