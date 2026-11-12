'use strict';
const core = require('../www/tournamentAdjudicationCore');
const scheduling = require('../www/tournamentSchedulingCore');
const clock = require('../www/tournamentReadinessCore');
const audit = require('./tournament-match-audit');
const reliability = require('../www/tournamentReliabilityCore');

function createCoverage() {
    let since = null, last = null;
    return {
        sample(at) {
            if (last === null || at < last || at - last > core.MAX_GAP_MS) since = at;
            last = at;
        },
        invalidate() { since = last = null; },
        covers(start, at) { return since !== null && start >= since && at >= last && at - last <= core.MAX_GAP_MS; }
    };
}

function attended(rows, uid, window, runId) {
    const sessions = new Map();
    for (const row of rows) {
        if (row.kind !== 'appointment_presence' || row.actorUid !== uid || row.details?.runId !== runId || !row.details.sessionId) continue;
        if (!sessions.has(row.details.sessionId)) sessions.set(row.details.sessionId, []);
        sessions.get(row.details.sessionId).push(row.at);
    }
    return [...sessions.values()].some(values => {
        let from = null, last = null;
        for (const at of values.sort((a, b) => a - b)) {
            if (last === null || at - last > core.MAX_GAP_MS) from = at;
            last = at;
            if (from <= window.start + core.PING_MS && last >= window.end && last - from >= core.WAIT_MS) return true;
        }
        return false;
    });
}

function evaluate(match, rows, at, coverage, runId) {
    if (!scheduling.isScheduled(match) || core.terminal(match) || !match.p1?.id || !match.p2?.id) return null;
    const s = match.scheduling;
    const uids = [match.p1.id, match.p2.id];
    if (uids.some(uid => uid.startsWith('deleted_'))) return null;
    const attempts = rows.filter(row => row.scheduleId === s.id && row.at >= (s.reviewExtendedAt || s.openedAt));
    const window = core.windowFor(match);
    if (window && at >= window.closes && coverage.covers(window.opens, at)
        && attempts.some(row => row.kind === 'time_accepted' && row.details?.proposalId === s.accepted.id && row.actorUid === s.accepted.acceptedBy)) {
        const relevant = attempts.filter(row => row.at >= window.opens && row.at <= window.closes
            && row.details?.acceptedId === s.accepted.id);
        const attendance = relevant.filter(row => row.kind === 'appointment_presence');
        const present = uids.filter(uid => attended(attendance, uid, window, runId));
        if (present.length === 1) {
            const opponent = uids.find(uid => uid !== present[0]);
            if (!relevant.some(row => row.actorUid === opponent)) return { kind: 'technical', winnerId: present[0],
                inactiveUids: [opponent], reason: 'verified_no_show', acceptedId: s.accepted.id };
        }
    }
    if (at < s.deadlineAt) return null;

    const actions = attempts.filter(row => ['time_proposed', 'time_accepted', 'appointment_presence', 'launch_requested',
        'invite_accepted', 'invite_declined', 'invite_busy', 'room_arrival', 'game_started', 'game_interrupted'].includes(row.kind));
    if (!s.accepted && coverage.covers(s.reviewExtendedAt || s.openedAt, at)) {
        if (!s.reviewExtendedAt && !match.rematchRequired && actions.length === 0 && s.proposals.length === 0
            && attempts.some(row => row.kind === 'match_opened')) {
            return { kind: 'double_dq', inactiveUids: uids, reason: 'both_inactive' };
        }
        const offer = s.pending;
        if (offer && offer.fullResponseWindow && offer.createdAt <= s.firstProposalDueAt && at >= offer.replyDueAt
            && offer.at < s.deadlineAt && attempts.some(row => row.kind === 'time_proposed' && row.details?.proposalId === offer.id)
            && !actions.some(row => row.actorUid !== offer.by)) {
            return { kind: 'technical', winnerId: offer.by, inactiveUids: uids.filter(uid => uid !== offer.by), reason: 'unanswered_valid_proposal' };
        }
    }
    return s.reviewExtendedAt ? { kind: 'void', reason: 'insufficient_evidence', refundUids: uids }
        : { kind: 'extension', reason: 'insufficient_evidence' };
}

function cascade(state, plan, options) {
    const get = (round, index) => plan.updates[`bracket.${round}.${index}`] || state.bracket[round][index];
    for (const [round, previous, count] of [['sf', 'qf', 2], ['f', 'sf', 1]]) {
        for (let i = 0; i < count; i++) {
            const feeds = [get(previous, 2 * i), get(previous, 2 * i + 1)];
            if (!feeds.every(core.terminal)) continue;
            const current = get(round, i);
            if (core.terminal(current) || current?.scheduling) continue;
            const slots = feeds.map(feed => [feed.p1, feed.p2].find(p => p?.id && p.id === feed.winnerId) || null);
            const next = options.createMatch(...slots);
            const participants = slots.filter(Boolean);
            if (participants.length === 2) {
                scheduling.open(next, round, options.now, options.createId());
                plan.events.push(audit.openedEvent(state, round, i, next));
            } else if (round === 'sf' && participants.length === 1) {
                next.winnerId = participants[0].id;
                next.review = { kind: 'bye', reason: 'no_opponent', at: options.now };
            } else {
                next.review = { kind: participants.length ? 'void' : 'empty', reason: 'no_opponent', at: options.now };
                if (round === 'f') {
                    finishWithoutWinner(plan, next, options);
                    plan.refunds.push(...participants.map(p => p.id));
                }
            }
            if (!next.scheduling) {
                const feeder = feeds.find(feed => feed.scheduling)?.scheduling;
                if (feeder) plan.events.push(audit.event(state, plan.round, plan.index, state.bracket[plan.round][plan.index],
                    'bracket_slot_resolved', [round, i], options.now, { details: { round, index: i, kind: next.review.kind } }));
            }
            plan.updates[`bracket.${round}.${i}`] = next;
        }
    }
    return plan;
}

function finishWithoutWinner(plan, match, options) {
    Object.assign(match, { prizesAwarded: true, statsRecorded: true });
    Object.assign(plan.updates, { status: 'finished', finishedAt: new Date(options.now), resetAt: new Date(options.now + options.resetDelayMs) });
}

function planDecision(state, round, index, match, decision, options) {
    const { now } = options;
    const s = match.scheduling;
    let plan;
    if (decision.kind === 'technical') {
        const receipt = audit.event(state, round, index, match, 'administrative_resolution', s.id, now, { matchId: s.id });
        plan = audit.planResolution(state, receipt, { kind: 'result_recorded', at: now, winnerId: decision.winnerId,
            resultType: 'technical', reason: decision.reason, p1Score: Number(match.p1.id === decision.winnerId),
            p2Score: Number(match.p2.id === decision.winnerId) }, options);
        if (!plan) return null;
        plan.updates[`bracket.${round}.${index}`].review = { ...decision, at: now };
    } else {
        const next = structuredClone(match);
        next.review = { ...decision, at: now };
        plan = { round, index, updates: { [`bracket.${round}.${index}`]: next }, events: [] };
        if (decision.kind === 'extension') {
            next.scheduling.reviewExtendedAt = now;
            next.scheduling.deadlineAt = clock.windowAt(now + 86400000).start;
            next.scheduling.firstProposalDueAt = Math.min(next.scheduling.deadlineAt,
                clock.addActiveMs(now, scheduling.ROUNDS[round].activeHours * 3600000));
            next.scheduling.revision += 1;
        } else {
            next.rematchRequired = false;
            if (round === 'f') finishWithoutWinner(plan, next, options);
        }
    }
    plan.scheduleId = s.id;
    plan.refunds = [...(decision.refundUids || [])];
    plan.events.push(audit.event(state, round, index, match, 'adjudication_' + decision.kind, s.id, now, {
        details: { ...decision, originalDeadlineAt: s.deadlineAt,
            deadlineAt: plan.updates[`bracket.${round}.${index}`].scheduling.deadlineAt }
    }));
    if (reliability.isManaged(state) && ['technical', 'double_dq'].includes(decision.kind)) {
        plan.incident = { cycleId: state.registrationCycleId, tournamentNumber: state.tournamentNumber, at: now,
            reason: decision.reason, inactiveUids: [...(decision.inactiveUids || [])] };
    }
    return cascade(state, plan, options);
}

module.exports = { createCoverage, evaluate, planDecision, cascade };
