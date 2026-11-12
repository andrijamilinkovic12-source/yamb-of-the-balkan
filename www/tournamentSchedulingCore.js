(function (root, factory) {
    const clock = typeof module === 'object' && module.exports
        ? require('./tournamentReadinessCore') : root.tournamentReadinessCore;
    const api = factory(clock);
    if (typeof module === 'object' && module.exports) module.exports = api;
    else root.tournamentSchedulingCore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (clock) {
    'use strict';
    const VERSION = '2026-11-11-scheduling-v1';
    const HOUR = 3600000;
    const MIN_LEAD_MS = 15 * 60000;
    const ROUNDS = { qf: { hours: 48, activeHours: 8 }, sf: { hours: 36, activeHours: 6 }, f: { hours: 24, activeHours: 4 } };
    const formatter = new Intl.DateTimeFormat('en-GB', {
        timeZone: clock.TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
    });

    function isManaged(state) { return state?.schedulingPolicyVersion === VERSION; }
    function isScheduled(match) { return match?.scheduling?.version === VERSION; }
    function isClosed(match) { return Boolean(match?.winnerId || ['double_dq', 'void', 'empty'].includes(match?.review?.kind)); }
    function localInput(at) {
        const p = Object.fromEntries(formatter.formatToParts(new Date(at)).map(part => [part.type, part.value]));
        return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;
    }

    // A civil time is always Belgrade time, never the device/server timezone.
    // Reject the missing spring hour and ambiguous autumn hour instead of guessing.
    function parseTime(value) {
        if (typeof value !== 'string' || value.length > 40) return NaN;
        if (/^\d{4}-\d\d-\d\dT\d\d:\d\d$/.test(value)) {
            const wall = Date.parse(value + ':00Z');
            if (!Number.isFinite(wall)) return NaN;
            const candidates = [wall - HOUR, wall - 2 * HOUR].filter(at => localInput(at) === value);
            return candidates.length === 1 ? candidates[0] : NaN;
        }
        if (!/^\d{4}-\d\d-\d\dT\d\d:\d\d:00\.000Z$/.test(value)) return NaN;
        const at = Date.parse(value);
        return Number.isFinite(at) && new Date(at).toISOString() === value ? at : NaN;
    }

    function open(match, round, at, id) {
        const rule = Object.hasOwn(ROUNDS, round) ? ROUNDS[round] : null;
        if (!rule || !match?.p1?.id || !match?.p2?.id || match.winnerId || !Number.isFinite(at) || !id) return false;
        const previous = match.scheduling;
        const deadlineAt = clock.windowAt(at + rule.hours * HOUR).start;
        match.scheduling = {
            version: VERSION, id, round, attempt: Number(previous?.attempt || 0) + 1,
            previousAttemptId: previous?.id || null, revision: 0, openedAt: at, deadlineAt,
            firstProposalDueAt: Math.min(deadlineAt, clock.addActiveMs(at, rule.activeHours * HOUR)),
            firstProposedAt: null, firstFullWindowProposalAt: null, pending: null, accepted: null, proposals: []
        };
        mirror(match);
        return true;
    }

    function mirror(match) {
        const { pending, accepted } = match.scheduling;
        match.time = accepted ? new Date(accepted.at).toISOString() : null;
        match.timeAccepted = Boolean(accepted);
        match.proposedTime = pending ? new Date(pending.at).toISOString() : match.time;
        match.proposedById = pending?.by || accepted?.by || null;
    }

    function responseExpired(match, at) {
        return Boolean(match.scheduling?.pending && at >= match.scheduling.pending.replyDueAt);
    }

    function apply(match, command, input, at, createId) {
        const s = match?.scheduling;
        const fail = reason => ({ ok: false, reason });
        if (!isScheduled(match) || isClosed(match) || ![match.p1?.id, match.p2?.id].includes(input.uid)
            || input.scheduleId !== s.id || input.revision !== s.revision) return fail('tourney_schedule_stale');
        if (at >= s.deadlineAt) return fail('tourney_schedule_expired');
        if (command === 'propose') {
            const proposedAt = parseTime(input.proposedTime);
            if (!Number.isFinite(proposedAt) || proposedAt < at + MIN_LEAD_MS || proposedAt >= s.deadlineAt) {
                return fail('tourney_schedule_invalid_time');
            }
            if (s.accepted?.at === proposedAt || s.pending?.at === proposedAt
                || s.proposals.some(p => p.by === input.uid && p.at === proposedAt)) return fail('tourney_schedule_duplicate');
            if (s.proposals.length >= 128) return fail('tourney_schedule_limit');
            const fullReplyDueAt = clock.addActiveMs(at, ROUNDS[s.round].activeHours * HOUR);
            // Replacing one's own proposal cannot restart the opponent's response clock.
            const previousDue = s.pending?.by === input.uid ? s.pending.replyDueAt : Infinity;
            const replyDueAt = Math.min(fullReplyDueAt, proposedAt, s.deadlineAt, previousDue > at ? previousDue : Infinity);
            const proposal = { id: createId(), by: input.uid, at: proposedAt, createdAt: at, replyDueAt,
                fullResponseWindow: replyDueAt >= fullReplyDueAt };
            s.pending = proposal;
            s.proposals.push({ ...proposal });
            if (!s.firstProposedAt) s.firstProposedAt = at;
            if (proposal.fullResponseWindow && !s.firstFullWindowProposalAt) s.firstFullWindowProposalAt = at;
        } else if (command === 'accept') {
            if (!s.pending || s.pending.id !== input.proposalId || s.pending.by === input.uid) return fail('tourney_schedule_stale');
            if (at >= s.pending.at || responseExpired(match, at)) return fail('tourney_schedule_response_expired');
            s.accepted = { ...s.pending, acceptedBy: input.uid, acceptedAt: at };
            s.pending = null;
            match.pushRemindersSent = {};
        } else return fail('tourney_schedule_stale');
        s.revision += 1;
        mirror(match);
        return { ok: true };
    }

    function canStart(match, at) {
        return isScheduled(match) && !isClosed(match) && Boolean(match.scheduling.accepted) && at < match.scheduling.deadlineAt;
    }
    return { VERSION, ROUNDS, MIN_LEAD_MS, isManaged, isScheduled, localInput, parseTime, open, apply, mirror, responseExpired, canStart };
});
