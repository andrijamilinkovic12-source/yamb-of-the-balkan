# Tournament QA Setup

## Observed Baseline (2026-11-12)

The user's Render screenshot shows `yamb-reconnect-qa`, Free, Live deployment
`7d28d5a`, linked to `codex/account-deletion-qa`. The user then opened the public
status endpoints and provided these results:

- Health: `ok=true`, `environment=staging`, `instanceId=reconnect-qa-01`,
  `maintenance=false`.
- Firebase Admin: active, project `yamb-reconnect-qa`, credential source
  `FIREBASE_SERVICE_ACCOUNT_PATH`, explicit Web API key present.
- App Check: active, enforcement off. No setting was changed during this check.

Our direct requests timed out; the status results above were supplied by the user.
The Android project field in the server response refers to the checked-in Android
source configuration, not an inspected QA APK. The staging build independently
validates the separate package, Firebase JSON, OAuth client and remote identity.
FCM IAM permissions, device delivery and database-user scope remain unverified.

## Deployment Order

1. Confirm the QA database has a separate MongoDB user restricted to that QA
   database. Do not copy production credentials. Existing startup checks require
   the URI database to match `YAMB_STAGING_DB_NAME` and differ from production.
2. Review/test the candidate, commit it and deploy that exact SHA only to this
   QA service. Do not deploy the latest linked account-deletion branch or change
   the production service. Start with `YAMB_STAGING_FCM_ENABLED=false`.
3. Confirm the candidate assets/runtime and isolated database before enrolling
   synthetic entrants. The readiness flag can be true on staging;
   `TOURNAMENT_ROLLOUT_APPROVED` remains false. Neither production flag changes.
4. Build/install the separate `com.yamb.balkan.staging` APK with the QA
   `google-services.json`, URL and OAuth client using the existing staging build
   script. It verifies the remote identity and restores production Android files.

## Real Push Preparation

QA push remains disabled unless all of these are deliberately configured on QA:

- `YAMB_STAGING_FCM_ENABLED=true`.
- `YAMB_STAGING_FCM_ALLOWED_UIDS` is a JSON array of 1-16 explicitly approved
  QA account UIDs. The allowlist is enforced at token lookup and again before
  delivery; it is not supplied by a client. Never put real account UIDs in Git.
- Explicit service-account credentials belong to
  `YAMB_STAGING_FIREBASE_PROJECT_ID`, which differs from production. Project-ID-only
  Auth and ADC are not sufficient for this opt-in delivery mode. Reuse suitable
  existing QA credentials when possible; do not create keys without reviewing
  access. Provisioning/granting new access requires explicit approval.
- The QA service account has the FCM sending permission in the QA project.
  Firebase documents `roles/firebasecloudmessaging.admin`; do not grant Owner,
  Editor, a service-agent role or any access to the production project for this
  test. Preserve any separately reviewed Auth permissions needed by deletion QA.
- Firebase Cloud Messaging API is enabled for that QA project. Auth emulator
  mode and FCM opt-in cannot be combined; startup rejects the combination.

Wrong-project/missing credentials or invalid allowlists stop an opted-in QA
startup. Production delivery defaults are unchanged. The public Firebase status
now includes `firebaseMessagingActive` and `stagingPushRestricted`, but neither
flag proves actual delivery or correct IAM permissions.

Run `npm run check:reconnect-staging` for the offline safety/SDK-initialization
tests. They do not send FCM messages or contact a database. Keep service-account
keys, MongoDB URIs, monitor tokens and FCM registration tokens out of screenshots,
chat, logs and Git. The existing QA service-account file must not be replaced
with a production key.

## Device Evidence Still Needed

Use approved QA accounts and the QA app, not production players. Verify actual
receipt in foreground/background/locked-screen states, tap navigation to the
correct match, duplicate/stale message handling, and behavior with Android
notification permission denied. FCM acceptance is not proof of device receipt.
Also run continuous 15-minute attendance and a live duel crossing its scheduling
cutoff, with one or both players returning within the existing five-minute grace.

The Free service can spin down after 15 minutes without inbound traffic; inactive
workers cannot send scheduled reminders on time. Normal active-test traffic can
exercise a controlled window, but that is not evidence of an always-on schedule.
Do not silently upgrade a plan or add a keepalive workaround. Review/approve an
always-on QA arrangement before claiming overnight/day-long schedule coverage.

References: [Render Free limits](https://render.com/docs/free),
[FCM server authentication and sending](https://firebase.google.com/docs/cloud-messaging/send/admin-sdk),
[FCM IAM permissions](https://docs.cloud.google.com/iam/docs/roles-permissions/firebasecloudmessaging).
