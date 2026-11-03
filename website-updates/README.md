# Account deletion and privacy website draft

This directory contains review files for the existing informational Firebase Hosting website. It is not a web version of the game. Nothing here automatically deploys.

`node scripts/prepare-account-privacy-site.cjs` regenerates `public/` from the game deletion UI modules and existing website assets. The real Hosting source is `C:\Users\andri\OneDrive\Desktop\YAMB_WEB_SAJT\public`, project `yamb-of-the-balkan---web`. The game authentication project is separately `yamb-of-the-balkan`; do not replace it with the Hosting project.

The prepared local website files were copied to that source on 2026-11-01. A backup is in `tmp/website-before-account-privacy-20261101-231715` inside the game workspace. Subsequent generation does not automatically synchronize the external website folder.

On 2026-11-03, all 11 reviewed HTML/JS/CSS files were synchronized again to the real local Hosting source, including the latest Analytics SR/EN policy drafts. File hashes match. The immediately preceding versions are backed up at `tmp/website-before-analytics-sync-20261103-154555` in the game workspace. No Hosting deploy was run.

On 2026-11-02, the specifically approved QA server was deployed from `codex/account-deletion-qa` (latest diagnostic deployment `47b5fb15`), with a QA-only Auth service account, Web app, authorized domain, and configuration. The QA page is served at `https://yamb-reconnect-qa.onrender.com/delete-account.html` with a visible QA label. A real Android Google reauthentication/deletion test passed after the explicitly approved QA diagnostic-index migration: Firebase identity absent, job complete, no old UID in 72 scanned QA documents, 46 shared matches preserved, and the game returned to its signed-out screen. A separate real Edge browser test also passed: a fresh QA identity signed in with Google, the user approved deletion, Google reauthentication completed, the page displayed completion, and Firebase Admin confirmed that identity no longer existed. No new gameplay data was seeded for the web test; the Android test covered existing gameplay records. The QA database password was subsequently rotated by the user and applied to a fresh QA server instance, with the old credential rejected and the new connection verified. The new password was never printed or stored locally by the agent. Production deployment remains unapproved. The two website bootstrap modules were synchronized locally again after adding tested QA-origin routing.

## Release conditions

- Analytics is retained by the owner's decision. The real QA consent/installation/deletion extension passed on 2026-11-02 using the explicitly approved QA property `561980003` and existing QA service account. Decline, allow and withdrawal were verified in the actual Android SDK, and events arrived in Google DebugView. After separate final approval, account deletion completed, the Firebase identity and installation registry disappeared, and Google acknowledged the Analytics deletion requests. Google's later erasure completion is not claimed. Evidence: `reports/play-console-pregled-2026-11-01/qa-analytics-end-to-end.json`. QA deploy `dep-dbkfiebm8hqs73bajcfg` serves commit `bb250197`. Production is still unchanged. Production startup rejects account deletion enabled without the Analytics extension; QA rejects production property `527510324`.
- Regenerated SR/EN files include Analytics consent, actual production retention settings and the distinction between game-server deletion and Google's asynchronous processing. They are synchronized to the local Hosting source as recorded above, but remain unpublished. Legacy Analytics installations were not previously linked to accounts; do not claim a retroactive mapping or complete Google erasure based on local SDK reset.
- User approval is required before deployment, enabling the production feature, or sending Play Console changes for review.
- Confirm a single server process/instance and avoid overlapping workers during deploy. Only then set both `ACCOUNT_DELETION_ENABLED=true` and `ACCOUNT_DELETION_SINGLE_INSTANCE=true`. Do not enable in a multi-instance deployment; local write draining does not coordinate multiple processes.
- Verify Firebase Admin project and permission to disable, revoke, and delete a disposable account. Complete a real Google Android reauthentication test separately from emulator-only backend tests.
- Authorize the website domain for Google sign-in in the game Auth project after specific approval. Do not authorize unrelated domains.
- Verify infrastructure backup/log and Analytics retention before approving policy wording. Confirm both diagnostic `occurredAt` indexes have TTL 2592000 seconds before enabling deletion. The tested Atlas QA deployment rejects `collMod` with code 8000. Use the explicit migration below when needed; no successful deletion job is reported on initialization or cleanup failure.
- Deploy the reviewed server and website in a coordinated window, verify live deletion and the SR/EN pages, then finish the account-deletion URL and remaining Data safety declarations. Never declare an unpublished URL operational.

The web bootstrap uses Firebase Auth only (no website Analytics). The server derives identity from a fresh, verified Firebase ID token and requires explicit confirmation. The request receipt uses a header, not a token in a URL. Completed receipt availability is 30 days and the minimal anti-resurrection record expires after 90 days. The game Google account and Google's own account are separate.

## Local verification

- `npm run check:account-deletion` runs isolated service, UI, and active-room/tournament tests.
- `node scripts/test-account-deletion-mongo.cjs` runs actual MongoDB tests; its optional Mongo memory server tool lives under ignored `tmp/account-deletion-tests/node_modules`.
- `node scripts/test-diagnostic-retention.cjs` verifies the explicit index migration against temporary MongoDB, including dry run, repeat runs, uniqueness protection, data preservation and rollback after a simulated index-build failure.
- `node scripts/serve-account-deletion-qa.cjs --verify-only` runs the actual app against a demo Firebase Auth emulator and temporary MongoDB, then closes them. It never loads production `.env`.
- Without `--verify-only`, the same script serves a loopback-only preview on port 3181. The native preview is real markup plus a test adapter, not Android Google SDK verification.

The local QA scripts require the installed Firebase CLI, MongoDB memory server package and official MongoDB binary. They are development tools, not deployment dependencies.

## Explicit diagnostic retention migration

`scripts/migrate-diagnostic-retention.cjs` never reads `.env`. Supply an ignored local JSON file with `uri` and `dbName`, plus an exact `--expected-db`. Run without `--apply` first. It reports how many existing diagnostics are older than 30 days; creating a TTL index can permanently remove those diagnostics. Obtain the environment owner's approval for that concrete result before applying. This does not delete a user account.

For the approved QA environment, the command shape is:

```text
node scripts/migrate-diagnostic-retention.cjs --connection-file <private-json-file> --expected-db yamb_reconnect_qa
```

Add `--apply` only after approval. The script replaces only plain single-field `occurredAt` lookup indexes, preserves their name, refuses indexes with uniqueness/partial/sparse/collation/hidden semantics, verifies the new TTL, and attempts to restore the old index if rebuilding fails. Pause conflicting index-management/deploy activity during migration. Never point the QA connection file at production. Production migration and release remain separate approval steps.
