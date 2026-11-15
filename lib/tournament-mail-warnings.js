'use strict';

const { createHash } = require('node:crypto');
const clock = require('../www/tournamentReadinessCore');
const scheduling = require('../www/tournamentSchedulingCore');
const { createMail } = require('./player-mailbox');
const HOUR = 3600000;
const MINUTE = 60000;

function eligible(state) {
    return clock.isManaged(state) && scheduling.isManaged(state) && state.status === 'active'
        && Number.isInteger(state.tournamentNumber) && state.tournamentNumber >= 11;
}

function collectWarnings(state, at, isInPlay = () => false) {
    if (!eligible(state) || !Number.isFinite(at) || clock.windowAt(at).start > at) return [];
    const roster = new Set((state.players || []).map(player => player.id));
    const result = [];
    for (const round of Object.keys(scheduling.ROUNDS)) {
        for (const [index, match] of (state.bracket?.[round] || []).entries()) {
            if (!scheduling.isScheduled(match) || match.winnerId || ['double_dq', 'void', 'empty'].includes(match.review?.kind)
                || !match.p1?.id || !match.p2?.id || match.p1.id === match.p2.id
                || ![match.p1.id, match.p2.id].every(uid => roster.has(uid) && typeof uid === 'string' && !uid.startsWith('deleted_'))) continue;
            const s = match.scheduling;
            const phaseAt = Math.max(Number(s.openedAt) || 0, Number(s.reviewExtendedAt) || 0);
            if (!phaseAt || !Number.isFinite(s.deadlineAt) || at < phaseAt || at >= s.deadlineAt
                || isInPlay(round, index, s.id)) continue;
            // An extension preserves scheduling history. Old appointments and
            // proposals must not become new no-show warnings after extension.
            const pending = s.pending?.createdAt >= phaseAt ? s.pending : null;
            const accepted = s.accepted?.createdAt >= phaseAt && s.accepted?.acceptedAt >= phaseAt ? s.accepted : null;
            const proposed = s.firstProposedAt >= phaseAt || s.proposals?.some(proposal => proposal.createdAt >= phaseAt);
            let responseStart = pending?.createdAt;
            for (let i = (s.proposals?.length || 0) - 1; pending && i >= 0; i--) {
                const proposal = s.proposals[i];
                if (proposal.by !== pending.by || proposal.createdAt < phaseAt) break;
                if (proposal.replyDueAt >= pending.replyDueAt) responseStart = Math.min(responseStart, proposal.createdAt);
            }
            const remaining = clock.activeMsBetween(at, s.deadlineAt);
            for (const [player, opponent] of [[match.p1, match.p2], [match.p2, match.p1]]) {
                const uid = player.id;
                if (!roster.has(uid) || typeof uid !== 'string' || uid.startsWith('deleted_')) continue;
                let stage, actionDeadlineAt, scheduledAt, reference;
                if (remaining <= HOUR) stage = 'deadline_last_hour';
                else if (remaining <= 6 * HOUR) stage = 'deadline_six_hours';
                else if (pending && pending.by !== uid && Number.isFinite(pending.replyDueAt)) {
                    const half = clock.activeMsBetween(responseStart, pending.replyDueAt) / 2;
                    if (at >= pending.replyDueAt) stage = 'reply_overdue';
                    else if (at - responseStart >= 15 * MINUTE && clock.activeMsBetween(responseStart, at) >= half) stage = 'reply_halfway';
                    actionDeadlineAt = pending.replyDueAt;
                    scheduledAt = pending.at;
                    reference = pending.replyDueAt;
                }
                if (!stage && accepted && at >= accepted.at + 15 * MINUTE) {
                    stage = 'appointment_missed'; scheduledAt = accepted.at; reference = accepted.id;
                }
                if (!stage && !accepted && !pending && !proposed && Number.isFinite(s.firstProposalDueAt)) {
                    const half = clock.activeMsBetween(phaseAt, s.firstProposalDueAt) / 2;
                    if (at >= s.firstProposalDueAt) stage = 'schedule_overdue';
                    else if (clock.activeMsBetween(phaseAt, at) >= half) stage = 'schedule_halfway';
                    actionDeadlineAt = s.firstProposalDueAt;
                    reference = s.firstProposalDueAt;
                }
                if (!stage) continue;
                const id = 'tournament-warning:' + createHash('sha256').update(JSON.stringify([
                    state.registrationCycleId, s.id, phaseAt, s.deadlineAt, stage, reference || s.deadlineAt, uid
                ])).digest('hex');
                const message = createMail('tournament_match_warning', { tournamentWarning: {
                    tournamentNumber: state.tournamentNumber, round, index, cycleId: state.registrationCycleId,
                    scheduleId: s.id, stage, deadlineAt: s.deadlineAt, actionDeadlineAt, scheduledAt,
                    opponentName: String(opponent.name || '').slice(0, 120)
                } }, id);
                message.createdAt = at;
                result.push({ uid, message });
            }
        }
    }
    return result;
}

function createTournamentMailWarnings({ profiles, entries, loadState, getRuntimeState, isMatchInPlay, notify, now = Date.now }) {
    let running = false;
    async function sync(cycleId) {
        if (running || !cycleId) return 0;
        running = true;
        try {
            const state = await loadState(cycleId);
            if (state?.registrationCycleId !== cycleId) return 0;
            const candidates = collectWarnings(state, now(), isMatchInPlay);
            if (!candidates.length) return 0;
            await entries.init();
            const existing = new Set((await entries.find({ $or: candidates.map(({ uid, message }) =>
                ({ recipientUid: uid, id: message.id })) }).select('recipientUid id').lean())
                .map(row => JSON.stringify([row.recipientUid, row.id])));
            let created = 0;
            for (const { uid, message } of candidates) {
                if (existing.has(JSON.stringify([uid, message.id]))) continue;
                if (!await profiles.exists({ firebaseUid: uid })) continue;
                // Recheck both durable and live state immediately before the
                // insert. The warning is informational and never mutates a match.
                const fresh = await loadState(cycleId);
                const current = getRuntimeState ? getRuntimeState() : fresh;
                const currentRow = snapshot => collectWarnings(snapshot, now(), isMatchInPlay)
                    .find(row => row.uid === uid && row.message.id === message.id);
                const latest = currentRow(fresh);
                if (!latest || !currentRow(current)) continue;
                const delivery = latest.message;
                const result = await entries.updateOne({ recipientUid: uid, id: message.id }, { $setOnInsert: {
                    recipientUid: uid, id: message.id, shared: false, createdAt: delivery.createdAt,
                    message: delivery, readAt: null, archived: false, deleted: false
                } }, { upsert: true, writeConcern: { w: 'majority' } });
                if (result.upsertedCount) { created++; notify?.(uid); }
            }
            return created;
        } finally { running = false; }
    }
    return { sync };
}

module.exports = { collectWarnings, createTournamentMailWarnings };
