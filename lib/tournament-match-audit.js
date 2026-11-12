'use strict';
const { createHash } = require('node:crypto');
const scheduling = require('../www/tournamentSchedulingCore');
const { creditTournamentEntry } = require('./tournament-refunds');
const reliability = require('./tournament-reliability');

const VERSION = '2026-11-11-audit-v1';
const digest = parts => createHash('sha256').update(JSON.stringify(parts)).digest('hex');
const isManaged = state => state?.auditPolicyVersion === VERSION && scheduling.isManaged(state);
const ids = match => [match?.p1?.id, match?.p2?.id];

function event(state, round, index, match, kind, key, at, fields = {}) {
    if (!isManaged(state) || !scheduling.isScheduled(match) || !ids(match).every(Boolean)) return null;
    const cycleId = state.registrationCycleId;
    const scheduleId = match.scheduling.id;
    return { _id: digest([cycleId, scheduleId, kind, key]), cycleId, tournamentNumber: state.tournamentNumber,
        round, index, scheduleId, attempt: match.scheduling.attempt, kind, at, participantUids: ids(match), ...fields };
}

function scheduleEvent(state, input, match, command) {
    const s = match.scheduling;
    const proposal = command === 'propose' ? s.pending : s.accepted;
    const action = command === 'propose' ? 'time_proposed' : 'time_accepted';
    return event(state, input.round, input.index, match, action, proposal.id, proposal.acceptedAt || proposal.createdAt, {
        actorUid: input.uid, details: { proposalId: proposal.id, proposalBy: proposal.by, scheduledAt: proposal.at,
            replyDueAt: proposal.replyDueAt, fullResponseWindow: proposal.fullResponseWindow,
            deadlineAt: s.deadlineAt, firstProposalDueAt: s.firstProposalDueAt, revision: s.revision }
    });
}

function fromLedger(receipt, ledger, maxScore) {
    if (!ledger) return null;
    const [p1, p2] = receipt.participantUids;
    if (ledger.matchId !== receipt.matchId || ledger.roomId !== receipt.roomId || ledger.mode !== 'tournament'
        || ledger.verification !== 'server' || !Array.isArray(ledger.participants) || ledger.participants.length !== 2
        || ![p1, p2].every(uid => ledger.participants.some(player => player.uid === uid))) return false;
    const at = new Date(ledger.finishedAt).getTime();
    if (!Number.isFinite(at) || at < receipt.at) return false;
    if (ledger.resultType === 'technical') {
        if (![p1, p2].includes(ledger.winnerUid) || ledger.loserUid !== (p1 === ledger.winnerUid ? p2 : p1)) return false;
        return { kind: 'result_recorded', at, winnerId: ledger.winnerUid, resultType: 'technical',
            reason: String(ledger.reason || 'technical').slice(0, 60), p1Score: Number(p1 === ledger.winnerUid), p2Score: Number(p2 === ledger.winnerUid) };
    }
    if (ledger.resultType !== 'regular') return false;
    const [p1Score, p2Score] = [p1, p2].map(uid => ledger.participants.find(player => player.uid === uid)?.score);
    if (![p1Score, p2Score].every(score => Number.isSafeInteger(score) && score >= 0 && score <= maxScore)) return false;
    if (p1Score === p2Score) return ledger.isDraw === true && !ledger.winnerUid
        ? { kind: 'draw_recorded', at, p1Score, p2Score } : false;
    const winnerId = p1Score > p2Score ? p1 : p2;
    if (ledger.isDraw || ledger.winnerUid !== winnerId || ledger.loserUid !== (winnerId === p1 ? p2 : p1)) return false;
    return { kind: 'result_recorded', at, winnerId, resultType: 'regular', p1Score, p2Score };
}

function planResolution(state, receipt, outcome, { now, createId, createMatch, resetDelayMs }) {
    const { round, index, cycleId, scheduleId, roomId, matchId } = receipt;
    const current = state.bracket?.[round]?.[index];
    if (!isManaged(state) || state.status !== 'active' || cycleId !== state.registrationCycleId
        || !current || current.winnerId || ['double_dq', 'void', 'empty'].includes(current.review?.kind)
        || current.scheduling?.id !== scheduleId
        || ids(current).some((uid, i) => uid !== receipt.participantUids[i])) return null;
    if (!['result_recorded', 'draw_recorded', 'game_interrupted'].includes(outcome.kind)
        || (outcome.kind === 'result_recorded' && !ids(current).includes(outcome.winnerId))) return null;
    const match = structuredClone(current);
    match.lastResolvedGameId = matchId;
    const updates = { [`bracket.${round}.${index}`]: match };
    const events = [event(state, round, index, current, outcome.kind, matchId, outcome.at, {
        roomId, matchId, details: { ...outcome, recordedAt: now }
    })];
    if (outcome.kind === 'result_recorded') {
        const winner = match.p1.id === outcome.winnerId ? match.p1 : match.p2;
        Object.assign(match, { winnerId: winner.id, resultType: outcome.resultType, resultRecordedAt: outcome.at,
            p1Score: outcome.p1Score, p2Score: outcome.p2Score,
            scoreLabel: `${outcome.p1Score}-${outcome.p2Score}${outcome.resultType === 'technical' ? ' TP' : ''}`,
            rematchRequired: false });
        if (current.rematchRequired) match.rematchResolvedAt = outcome.at;
        delete match.replayReason;
        if (outcome.resultType === 'technical') Object.assign(match, { technicalWinReason: outcome.reason, technicalWinAt: outcome.at });
        if (round === 'f') {
            Object.assign(updates, { status: 'finished', finishedAt: new Date(outcome.at), resetAt: new Date(now + resetDelayMs) });
        } else {
            const nextRound = round === 'qf' ? 'sf' : 'f';
            const nextIndex = Math.floor(index / 2);
            const next = structuredClone(state.bracket[nextRound][nextIndex] || createMatch());
            next[index % 2 === 0 ? 'p1' : 'p2'] = winner;
            if (!next.scheduling && scheduling.open(next, nextRound, now, createId())) {
                events.push(openedEvent(state, nextRound, nextIndex, next));
            }
            updates[`bracket.${nextRound}.${nextIndex}`] = next;
        }
    } else {
        match.rematchRequired = true;
        if (outcome.kind === 'draw_recorded') {
            delete match.replayReason;
            Object.assign(match, { drawCount: Number(match.drawCount || 0) + 1, lastDrawRoomId: roomId,
                lastDrawMatchId: matchId, lastDrawAt: outcome.at, lastDrawScoreLabel: `${outcome.p1Score}-${outcome.p2Score}` });
        } else {
            match.replayReason = outcome.reason;
            if (outcome.reason === 'mutual_disconnect') Object.assign(match, { networkReplayCount: Number(match.networkReplayCount || 0) + 1,
                lastNetworkReplayAt: outcome.at, lastNetworkReplayRoomId: roomId });
        }
        scheduling.open(match, round, now, createId());
        match.pushRemindersSent = {};
        events.push(openedEvent(state, round, index, match));
    }
    return { updates, events, close: receipt.kind === 'game_started' ? receipt._id : null,
        round, index, result: outcome.kind === 'result_recorded' };
}

function openedEvent(state, round, index, match) {
    const s = match.scheduling;
    return event(state, round, index, match, 'match_opened', s.id, s.openedAt, {
        details: { deadlineAt: s.deadlineAt, firstProposalDueAt: s.firstProposalDueAt, previousAttemptId: s.previousAttemptId }
    });
}

function createStore({ connection, guardWrite }) {
    const collection = name => connection.db.collection(name);
    const journal = () => collection('tournamentmatchaudits');
    const concern = { writeConcern: { w: 'majority' } };
    const hold = guardWrite || (async () => () => {});

    async function append(row, options = concern) {
        if (!row) return;
        await journal().updateOne({ _id: row._id }, { $setOnInsert: row }, { ...options, upsert: true });
    }

    async function commitState(filter, values, plan) {
        const events = plan.events.filter(Boolean);
        const release = await hold([plan.guardUids || [], events.map(row => [row.participantUids, row.actorUid])]);
        try {
            await connection.transaction(async session => {
                const options = { session };
                const saved = await collection('tournamentstates').updateOne(filter, { $set: values }, options);
                if (saved.matchedCount !== 1) throw new Error('tournament_audit_revision_conflict');
                for (const row of events) await append(row, options);
                if (plan.incident) await reliability.recordIncidents({ collection, options, incident: plan.incident });
                for (const uid of new Set(plan.refunds || [])) {
                    if (uid.startsWith('deleted_')) continue;
                    const entry = await collection('tournamententries').findOne({ cycleId: filter.registrationCycleId, uid,
                        status: { $in: ['started', 'refunded'] } }, options);
                    if (!entry) throw new Error('tournament_adjudication_entry_missing');
                    await creditTournamentEntry({ collection, options, entry, reason: 'match_voided',
                        at: events[0].at, maxBalance: plan.refundMaxBalance });
                }
                if (plan.final) {
                    for (const award of plan.final.awards) {
                        const profiles = collection('userprofiles');
                        const user = await profiles.findOne({ firebaseUid: award.uid }, options);
                        if (!user || !Number.isSafeInteger(user.balance) || user.balance < 0) throw new Error('tournament_prize_profile_invalid');
                        const balance = Math.min(award.amount, Math.max(0, plan.final.maxBalance - user.balance));
                        const update = { balance, ...(award.role === 'winner' ? { tournamentWins: 1 } : {}) };
                        await profiles.updateOne({ firebaseUid: award.uid }, { $inc: update }, options);
                    }
                    const record = plan.final.record;
                    if (record) await collection('tourneystats').updateOne({ playerId: record.winnerId }, {
                        $set: { playerName: record.winnerName, photoUrl: record.winnerPhotoUrl, lastWinDate: record.wonAt },
                        $inc: { wins: 1 }, $push: { championships: { $each: [record], $position: 0 } }
                    }, { ...options, upsert: true });
                }
                if (plan.close) {
                    const closed = await journal().updateOne({ _id: plan.close, open: true },
                        { $set: { open: false, closedAt: events[0].at } }, options);
                    if (closed.matchedCount !== 1) throw new Error('tournament_audit_game_already_closed');
                }
            }, { ...concern, readConcern: { level: 'snapshot' } });
        } finally { release(); }
    }

    async function observe(row) {
        if (!row) return;
        const release = await hold([row.participantUids, row.actorUid]);
        try { await append(row); }
        finally { release(); }
    }

    async function closeUnplayed(receipt, kind, at) {
        const { closedAt: _closedAt, open: _open, ...source } = receipt;
        const row = { ...source, _id: digest([receipt._id, kind]), kind, at, details: {} };
        const release = await hold(row.participantUids);
        try {
            await connection.transaction(async session => {
                const options = { session };
                const closed = await journal().updateOne({ _id: receipt._id, open: true }, { $set: { open: false, closedAt: at } }, options);
                if (closed.matchedCount === 1) await append(row, options);
            }, { ...concern, readConcern: { level: 'snapshot' } });
        } finally { release(); }
    }

    return { commitState, observe, closeUnplayed,
        probe: cycleId => collection('tournamentstates').findOne({ registrationCycleId: cycleId },
            { projection: { _id: 1 }, readConcern: { level: 'majority' } }),
        openGames: cycleId => journal().find({ cycleId, kind: 'game_started', open: true }).sort({ at: 1 }).toArray(),
        evidence: (cycleId, round, index) => journal().find({ cycleId, round, index }).sort({ at: 1, _id: 1 }).toArray(),
        ledger: matchId => collection('matchresults').findOne({ matchId }) };
}

module.exports = { VERSION, isManaged, event, scheduleEvent, fromLedger, planResolution, openedEvent, createStore };
