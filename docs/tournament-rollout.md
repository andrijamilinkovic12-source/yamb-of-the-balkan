# Tournament Reliability Rollout

Status: Steps 1-6 implemented locally. Release verification is still open and rollout is disabled. No commit or deploy yet.
The existing tournament is not migrated or adjudicated by this work.

## Ordered Work

1. Readiness confirmation before the official start: implemented; local tests below.
2. Match deadlines (QF 48h, SF 36h, final 24h), valid proposals and mutual rescheduling: implemented; local tests below.
3. Unified participant-only match notifications and reminders: implemented; local tests below.
4. Durable match-action history, recovery and adjudication evidence: implemented; local tests below.
5. Evidence-based technical decisions, no-show checks, draws and disputed-match resolution: implemented; local tests below.
6. Reliability warnings/suspensions and release compatibility: implemented. Isolated database and Android emulator verification passed; physical-device and release activation checks remain pending.

Commit and deployment remain deferred until all six steps and release gates pass.

## Step 1 Rules

- `TOURNAMENT_READINESS_ENABLED=false` by default. Enable only after the complete rollout review.
- Only `createFreshTournamentState()` assigns `2026-11-11-v1` and a new registration cycle ID.
  Existing saved tournaments retain their original policy, even after the feature is enabled.
- The eighth entry starts `confirmation`, not the tournament. The draw is generated only after eight confirmations.
- Each confirmation has six active hours in 09:00-22:00 Europe/Belgrade. DST is calculated using calendar boundaries in that zone.
- A shared absolute 24-hour limit begins with the first confirmation request. It does not restart for replacements.
- Existing confirmations remain valid. Replacements are admitted only when a complete six-active-hour window fits before the shared deadline.
- Expired or withdrawn entries are refunded without a penalty. If the shared deadline expires without eight confirmations, everyone still entered is refunded and registration reopens for the same tournament edition with a new cycle ID.
- A participant can withdraw before the official start, including after confirming readiness.
- Confirmation itself never charges another fee. Old clients cannot enter managed cycles without the readiness-policy acceptance fields.
- Admin reset with paid, managed prestart entries is blocked rather than discarding their payments.

## Money And Persistence

- A registration, debit, entry ledger and tournament state write share a MongoDB transaction.
- Withdrawal/expiry, refund accounting, notices and state removal likewise share one transaction.
- Each intended registration uses a persistent client request ID. Retries do not charge twice.
- Confirmation and withdrawal reference both the cycle and entry ID. Delayed requests cannot affect a later entry.
- The entry ledger retains the readiness policy version, personal request/deadline/confirmation timestamps and the official start timestamp after the live state resets.
- Refunds respect the account balance limit. Any excess remains a recorded debt in the entry ledger; the worker credits it as balance capacity becomes available. It is never silently truncated.
- The native store acquires the account-deletion write guards through transaction completion.
  The new private ledger and notice collections are included in account deletion.
- Registration is rejected until the durable tournament state has loaded after server startup.

## Notifications

- Durable per-entry outbox: initial request, after three active hours, and 30 active minutes before expiry.
- Only that entry's unconfirmed participant receives readiness reminders.
- Pushes and retries are held outside 09:00-22:00. In-app initial requests and refund records remain available immediately.
- A restart coalesces missed reminders to the latest still-relevant message instead of delivering a burst.
- Confirmed/expired/removed entries no longer receive confirmation reminders.
- FCM acceptance is not proof that the person received or read the message. An outbox lease allows retry after process failure; a crash after FCM accepts a message but before the sent flag commits can cause a retry. Stable notification tags reduce duplicate visible notifications, but this is not an exactly-once delivery guarantee.
- In-app notices persist until acknowledged by the same authenticated account. Readiness actions stay visible in the tournament and its badge even after choosing Later.
- Push navigation for this flow opens the information/confirmation tab, not an unplayable bracket.
- Serbian and English content use existing tournament theme surfaces and canonical artwork for all ten themes.

## Step 2 Rules

- The new scheduling policy is stamped only on fresh managed cycles. Quarterfinal clocks open in the readiness transaction; later rounds open when both opponents are known.
- Match windows are 48h / 36h / 24h elapsed. An end outside 09:00-22:00 Belgrade time moves forward to the next 09:00. The first-proposal and response windows are 8h / 6h / 4h of active time respectively.
- Show the exact deadlines in the match dialog. Players can still coordinate after a missed first-proposal target, up to the hard cutoff. There is no automatic adjudication in this step.
- Appointments use Belgrade civil time, including for devices abroad. Invalid times, ambiguous/nonexistent DST input, repeats, times under 15 minutes away and times at/after the hard cutoff are rejected. A short-notice proposal can be mutually accepted but does not carry a full response window for later inactivity review.
- A proposal never extends the match deadline. Editing one's unanswered proposal cannot push its response deadline out. An agreed appointment stays valid until the other participant accepts a replacement.
- A schedule attempt, revision and proposal ID bind actions to the exact view the player saw. Accepted appointments can be played earlier by mutual invitation. A managed room reservation is checked at the actual join, so old invitations cannot start a new attempt or a game after cutoff.
- Scheduling actions write only the target match's scheduling fields, with a cycle/revision check and majority acknowledgement, then publish. Active-cycle snapshots are serialized with these writes.
- Match deadlines do not interrupt games already in progress or change the five-minute reconnect grace. A draw or mutual disconnect opens a new scheduling attempt and clears the old appointment, without a penalty or winner. A draw also preserves the existing mutually accepted immediate replay flow.

## Step 3 Rules

- Stamped on fresh managed cycles only. The old tournament keeps its existing notification flow. In new cycles the private outbox replaces legacy scheduling reminders, proposal pushes, and public final/champion pushes. The bracket and public tournament results remain unchanged.
- Notify the relevant pair when their match opens, a time is confirmed, the match deadline passes, a replay opens, or a result is recorded. A proposal or counteroffer goes only to the player who can answer it. An offline opponent can receive a short-lived invitation alert, limited to one per ten-minute slot for the same agreed time.
- Attention checks at 10:00 and 19:00 Europe/Belgrade, with a 30-minute catch-up window. They target only a player with an action remaining: propose, respond, or play/reschedule a missed appointment. They do not duplicate a recent action alert for the same match and recipient. A missed appointment is not proof of absence and does not trigger a technical win.
- Accepted appointments get reminders 30 and 5 minutes before the agreed time. For appointments agreed less than 30 minutes ahead, confirmation takes the place of the 30-minute reminder. A reminder expires when the next reminder or the match time is reached, so restarts do not deliver both together.
- Quiet hours are 22:00-09:00 Belgrade time. Only the 30/5-minute reminders for an explicitly agreed night appointment can bypass them. Ordinary urgent or obsolete alerts do not catch up after their expiry. Android transport TTL is capped at the alert's validity and, for ordinary messages, the next quiet period.
- The worker reconstructs due events from the persisted bracket and upserts deterministic per-recipient IDs. Push leases and retries use the same inbox as readiness. Already acknowledged match alerts do not get a new push. Delivery checks the cycle, match attempt, active proposal/appointment, player identity and expiry again; pending invites or ongoing games defer match action alerts.
- FCM foreground events refresh the verified in-app inbox rather than opening a second dialog. Push taps validate the current account and fresh bracket state, and do not interrupt a game. Both languages use the tournament modal across all ten themes.
- This outbox is not the match audit trail. Rapidly superseded actions can intentionally have no notification; the audit records valid actions independently of delivery.

## Step 4 Rules

- Fresh audited cycles record the official draw and the opening of every pair or replay. Valid proposals and acceptances, bracket advances, results and final settlement are written with their audit event in a majority MongoDB transaction. IDs bind the event to the edition, round, match and attempt; retries do not append duplicate decisions.
- The private journal also records authenticated requests to play, invite responses, room arrivals, sampled foreground signals, and reconnect start and return. All timestamps come from the server. Observational writes retry from a bounded in-memory queue; a crash or unavailable database can leave observation gaps. Missing observations, a connected socket, or a single presence signal are not proof of attendance or absence.
- A new game, including an immediate draw replay, needs a durable start receipt before gameplay is announced. A closed or changed invitation is rechecked after writing that receipt. The server records an aborted start rather than starting an invalid room.
- On restart, the worker reads open receipts and recovers only a server-verified result for the exact room, game and two participant UIDs. It does not guess based on scores sent by clients. Conflicting results remain unresolved for review. An interrupted game without a durable result receives a fresh replay deadline, without a winner or penalty; dice and in-progress turns are not reconstructed after process loss.
- Result and progression writes close the game receipt in the same transaction. The final's winner/runner-up credits, championship count/history and award flags commit together, so a retry cannot pay the same final twice. The balance cap still applies. The next edition cannot replace a final with unsettled awards.
- Audit rows are retained across edition reset, are not broadcast, and have an internal query by edition and pair. Account deletion removes the deleted identity from those rows while preserving the other participant's history.

## Step 5 Rules

- Only new adjudication-policy cycles are eligible. The worker skips any active game, reconnect grace, pending start, or unresolved durable game receipt. It rechecks this immediately before committing a decision. Nothing in this worker modifies the per-turn timer or the five-minute reconnect grace.
- For an accepted appointment that leaves time before the match cutoff, the participant can explicitly check in from the tournament screen. The server timestamps authenticated signals for that exact appointment every 15 seconds; neither client-supplied identity nor client timestamps count. Check-in opens one minute before the slot and closes 45 seconds after the 15-minute wait. No-show evidence requires at least 15 minutes on one socket session, no gap over 45 seconds, and a durable acceptance record. Shorter or interrupted sessions cannot be combined to fabricate a full wait.
- Automatic no-show requires that only one player meets the attendance rule, the other has no appointment activity in that window, and the server has continuous observed coverage of the window. Partial presence, connection problems, and interrupted observation cannot be interpreted as proof of absence. A restart or observation gap resets coverage; it is not backfilled from login or FCM data.
- Without an agreed time, one timely proposal with a full response window can support a technical result at the match cutoff only when the opponent has no relevant action and the opening-to-cutoff coverage is intact. An empty first attempt can produce a double disqualification only with intact coverage and a durable opening record. Repeated or infeasible proposals cannot earn credit; a short-notice proposal or an already played draw cannot on its own support double disqualification.
- Ambiguous cases get one additional 24 elapsed hours per unresolved attempt, with a nighttime expiry moved forward to 09:00. An old appointment does not become new no-show evidence after extension. When the evidence is still insufficient, the match is voided and both entry fees are recorded for refund without strike evidence. A void and the entry ledger changes share the audit transaction; the usual balance-cap debt recovery applies.
- A double disqualification advances neither player. A remaining eligible semifinalist can advance without an opponent, but a final with no opponent does not create a champion or a prize; any sole eligible finalist has their fee refunded. A normal draw or mutual interruption opens a fresh attempt without a forced winner. Only the winner of a genuinely decided final receives the normal final settlement.
- Decisions appear in the bracket and are sent privately to the relevant pair. The audit records the reason and inactive participant IDs when proven, independently of any future warnings or suspensions. There is no new wallet/H2H penalty for a scheduling decision.

## Step 6 Rules

- Only an audited `verified_no_show`, `unanswered_valid_proposal`, or `both_inactive` decision can trigger a warning or suspension. Draws, technical results from live gameplay, connectivity interruptions, voids, pre-start withdrawal, and account deletion do not count.
- First proven incident: private warning. A new proven incident during the next three official appearances means skipping exactly the next edition. An appearance counts when the draw starts, even if a later match is voided; cancelling before the draw, missing an edition and reopened registration cycles do not count. Three clean appearances expire the warning. After serving a suspension, the next incident starts with a new warning.
- Only one incident per participant and edition counts. The decision, private warning/suspension ledger and notification commit together with the bracket write. Registration checks the current edition against the private ledger inside the same transaction, before debit. A retry or reopening registration for the same edition cannot consume or bypass the suspension.
- Fresh managed cycles require protocol `yamb-tournament-6` and explicit consent to the new rules before taking the fee. Supported clients get private eligibility and notice data only for the authenticated account. Older clients cannot enroll or take new scheduling/attendance actions on these cycles, but can withdraw a paid entry or recover a room already in play. The marker identifies supported UI behavior, not a security attestation.
- Production requires both `TOURNAMENT_READINESS_ENABLED=true` and `TOURNAMENT_ROLLOUT_APPROVED=true` to stamp new managed cycles. Both remain off. Already-stamped cycles keep their policy. Rollback to legacy rules for a future cycle also disables the new admission policy for that cycle; never roll back a managed paid or active cycle to an unaware binary.

## Local Verification

- `npm run check:tournament-registration`: consent guard, 133 business-rule assertions, native-store transaction contract tests and actual server-handler/commit-publication tests.
- `npm run check:tournament-scheduling`: round clocks and DST, stale proposal/room rejection, bracket advancement, commit-before-publish, concurrent actions and replay isolation.
- `npm run check:tournament-notifications`: participant-only events, day/night timing and DST, replacement invalidation, active-game protection, and private/deferred navigation. The native-store fixture also tests deduplication, account-scoped acknowledgement, night reminders and retry expiry.
- `npm run check:tournament-audit`: journal rollback, protected room admission, repeated processing, recovery from a verified result, interruption replay, conflicting evidence and final award rollback/idempotence.
- `npm run check:tournament-adjudication`: verified attendance boundaries, device/background and coverage gaps, active-room races, one extension, double disqualification, and neutral bracket propagation. The audit-store fixture verifies atomic refund rollback, retry idempotence and balance-cap debt.
- `npm run check:tournament-reliability`: official appearance counting, repeat and expiry cases, one-edition suspension, duplicate/rollback, account isolation and protocol checks before debit. `TOURNAMENT_RELIABILITY_UI=1` runs 240 browser cases across all ten themes, both languages and three mobile sizes.
- `TOURNAMENT_NOTICES_UI=1` with the existing browser runner: 60 notification dialog checks across ten themes, both languages and three viewport sizes, with real dismiss and duplicate checks.
- `TOURNAMENT_SCHEDULING_UI=1` with the existing browser runner: 360 scheduling dialog checks in ten themes, both languages and three viewport sizes, including server replay and real proposal, acceptance and attendance button clicks.
- `node scripts/test-tournament-readiness-ui.cjs`: real production renderers/CSS with synthetic data and all external network blocked; 360 theme/language/viewport/state checks, modal actions, touch targets and overlap checks.
- `npm run check:js`, `npm run check:firebase-security`, `npm run check:account-deletion`: regression checks.
- No production database or real FCM delivery is used by these tests.
- Native-store tests simulate the MongoDB transaction API; they do not substitute for an isolated replica-set integration run.

## Release Gates Still Required

- The isolated `npm run check:tournament-replica-set` passed on a local MongoDB 8.0.37 replica set named `yamb-test`. The runner does not load `.env`, refuses remote/non-test servers and uses only a disposable `yamb_tournament_qa_*` database.
- Two Android emulators passed native background, screen sleep, cold relaunch, and an induced TCP disconnect in a real managed quarterfinal on a loopback QA backend with a local Firebase Auth emulator and eight synthetic entrants. Both-client return, visible absence/return notices, matching timers, and five-minute server-side technical/replay outcomes were verified. Physical-device lifecycle, real FCM and disabled notification permissions, continuous attendance, old-client rejection before charging, and a live duel crossing its scheduling deadline still need release QA.
- Use one application instance and non-overlapping deployment ownership, as required by the current server's in-memory live-match architecture.
- Verify snapshot/majority transactions, transient retries and process termination at commit boundaries on an isolated MongoDB replica set.
- Verify concurrent reward/profile-sync writes cannot overwrite tournament debits or refunds. The existing economy has read-modify-save paths, so this must be tested and coordinated before enabling this feature.
- Verify fresh-cycle activation, untouched legacy tournament behavior and rollback in staging. Distribute the compatible client before approving new managed production editions.
- Review the existing Green Treasury assertion blocking `npm test` separately; do not mix unrelated theme, monitor, or Android asset changes into the tournament commit.
- Disabling the flag affects future cycles, not already-paid managed entries. Do not roll back to a binary that does not understand `confirmation` while such entries exist; complete/refund them with compatible code first.
