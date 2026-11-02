'use strict';
// Read-only preflight. Never loads .env, changes settings or submits deletion.
const fs = require('node:fs');
const { GoogleAuth } = require('google-auth-library');
const { validateProperty } = require('../lib/analytics-deletion');
const qaProject = 'yamb-reconnect-qa';
const qaProperty = validateProperty({ propertyId: '561980003', productionPropertyId: '527510324', environment: 'staging' });
const position = process.argv.indexOf('--service-account');
(async () => {
    if (position < 0 || !process.argv[position + 1]) throw Error('qa_credential_path_required');
    const credentials = JSON.parse(fs.readFileSync(process.argv[position + 1], 'utf8'));
    if (credentials.project_id !== qaProject || credentials.client_email !== 'yamb-account-deletion-qa@yamb-reconnect-qa.iam.gserviceaccount.com') {
        throw Error('qa_credentials_mismatch');
    }
    const auth = new GoogleAuth({ credentials, scopes: ['https://www.googleapis.com/auth/analytics.edit'] });
    const token = await auth.getAccessToken();
    if (!token) throw Error('qa_access_token_unavailable');
    const response = await fetch('https://analyticsadmin.googleapis.com/v1beta/properties/' + qaProperty, {
        headers: { Authorization: 'Bearer ' + token }, signal: AbortSignal.timeout(15000)
    });
    const body = await response.json();
    if (!response.ok) {
        const detail = body.error?.details?.find(item => typeof item.reason === 'string');
        const reason = /^[A-Z_]{1,80}$/.test(detail?.reason || '') ? detail.reason : 'qa_analytics_access_unavailable';
        console.log(JSON.stringify({ ok: false, propertyId: qaProperty, status: response.status, reason }));
        process.exitCode = 1;
        return;
    }
    if (body.name !== 'properties/' + qaProperty || body.displayName !== qaProject) throw Error('qa_property_mismatch');
    console.log(JSON.stringify({ ok: true, readOnly: true, propertyId: qaProperty, displayName: body.displayName, apiReachable: true,
        deletionRequestSubmitted: false, productionAccessAttempted: false }));
})().catch(error => {
    const code = /^[a-z_]{1,80}$/.test(error.message || '') ? error.message : 'qa_analytics_preflight_failed';
    console.error(JSON.stringify({ ok: false, code })); process.exitCode = 1;
});
