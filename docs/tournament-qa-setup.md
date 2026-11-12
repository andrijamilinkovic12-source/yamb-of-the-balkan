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

### Controlled Eight-Participant Fixture

The QA-only bootstrap is off when `YAMB_TOURNAMENT_QA_FIXTURE` is absent.
First deploy the exact tested QA commit without this variable. Before activating,
confirm the current QA registration is empty, the service runs one instance,
and the previous QA process is stopped. Render's Restart action is not a stop:
it uses a rolling deploy with the prior environment. Do not seed concurrently
with the old process, use a shared environment group, or touch production.

Only on `yamb-reconnect-qa`, use `TOURNAMENT_READINESS_ENABLED=true`,
`TOURNAMENT_ROLLOUT_APPROVED=false`, `ACCOUNT_DELETION_SINGLE_INSTANCE=true`,
and `YAMB_TOURNAMENT_QA_FIXTURE` with JSON fields `version: 1`, a unique
`id` matching `qa_[a-z0-9_]{16,60}`, and `humanUids` with exactly the two
approved QA Firebase UIDs. When FCM is enabled, its allowlist must match those
two UIDs exactly. Save privately; never add actual UIDs or secrets to Git.
Resume only with the tested QA branch/build and verify the deployed SHA.

The fixture preserves the edition number and tournament history, and creates a
new registration cycle with the current rules. Six synthetic profiles are
registered and confirmed using the normal transactional service; the two device
accounts are registered but still have to confirm in the app. Test coin top-ups
are recorded per profile and actual entry fees are charged once. The fixture
pairs the two device players in the first quarterfinal for that cycle only.
Do not remove the fixture setting before the bracket is drawn. Reusing the same
fixture ID resumes an interrupted setup or does nothing if it already finished.
A startup refusal must be diagnosed before attempting another fixture ID.

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

### Firebase Validation Probe

When device delivery is missing, set a fresh `YAMB_QA_FCM_PROBE_ID` matching
`qa_fcm_[a-z0-9_]{8,40}` only on the QA service with its active fixture and
approved FCM allowlist. Deploy the QA build with the variable set during the
active notification window. It claims the ID once and calls the same Firebase
sender in validation-only mode. It does not deliver a notification, remove
registrations, change the bracket, or create a public endpoint. The private
Render log contains only counts and recognized error codes, separately for
the two approved accounts. A successful validation is not device delivery.
Remove the variable after the investigation or use a new ID for an intentional
rerun. Do not copy the probe variable to production or a shared group.

### Exact-Device Delivery Probe

Actual delivery uses a separate opt-in `YAMB_QA_FCM_DELIVERY` JSON setting.
First deploy the QA build with this variable absent. In each authorized native
QA app call the existing `ensureRegistered(app, {qaRegistrationReceipt: true})`
path, after checking notification permission is already granted. The app uses
its normal private registration flow. Only the approved QA accounts receive a
non-secret database registration ID; neither the acknowledgment nor the QA
automation exports registration tokens. Production responses are unchanged.

Configure JSON fields `version: 1`, a unique `id` matching the validation probe
ID pattern, `registrationIds` with exactly those two distinct IDs in fixture
account order, and `expiresAt` as a Unix millisecond timestamp at most 24 hours
ahead. Keep the values outside Git. Arm the first emulator's native receipt
listener and put the second QA app in the background before Save and deploy.
The server checks ownership, enabled Android registration, tournament preference
and a registration sync in the last 30 minutes for both IDs before claiming
the probe once. Older registrations are neither used nor deleted. Quiet hours,
expiry, QA project/instance checks and the account allowlist still apply.

`QA FCM delivery` in private Render logs reports only aggregate counts and
recognized error codes. Firebase acceptance still needs matching device receipt
and notification-tap checks. Remove the delivery setting after testing. The
probe cannot reset a bracket, alter wallets or bypass production rollout gates.

After explicit operator approval, only this exact-device probe can include
`nightAllowed: true` for a controlled night test. Its configuration must expire
within 30 minutes. All QA project, instance, account, current-device and one-shot
guards still apply. Ordinary notifications and production quiet hours are not
changed. Clear the setting immediately after recording the device evidence.

## Dependency Review

The QA build audit on 2026-11-12 identified Mongoose 8.24.4 as a high-severity
runtime finding. The follow-up QA candidate pins Mongoose 8.24.7 (and its required
mquery 5.0.1) without upgrading major versions. Tests cover inherited-property
hydration and real MongoDB connection-level filter sanitization as well as the
existing tournament transaction/reconnect flows. This does not establish that
an exploit occurred. The previously deployed production dependency is unchanged.

The initial full audit had 12 findings (1 critical, 2 high); the runtime-only
audit had 10 (0 critical, 1 high). The critical tar finding belongs to the
development Capacitor CLI tree. Other dependency findings and the existing
Green-theme test failure remain separate release risks; this small patch is not
a claim of a clean full audit. No `npm audit fix --force` or Capacitor major
upgrade was performed.

After the patch, the runtime-only audit reports 9 findings (1 low, 8 moderate,
0 high, 0 critical). The full tree still reports 11 findings, including the
development-only Capacitor/tar high/critical findings. All three isolated MongoDB
suites passed with the patched version, including crash boundaries, real driver
retry, parallel economy writes and persisted edition activation/rollback.

Primary advisories: [connection filter sanitization](https://github.com/Automattic/mongoose/security/advisories/GHSA-gg4r-jv3p-qx3c),
[inherited-property handling](https://github.com/Automattic/mongoose/security/advisories/GHSA-8332-j7wj-wjw4).

References: [Render Free limits](https://render.com/docs/free),
[FCM server authentication and sending](https://firebase.google.com/docs/cloud-messaging/send/admin-sdk),
[FCM IAM permissions](https://docs.cloud.google.com/iam/docs/roles-permissions/firebasecloudmessaging).
