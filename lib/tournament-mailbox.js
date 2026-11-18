'use strict';

const { createHash } = require('node:crypto');
const scheduling = require('../www/tournamentSchedulingCore');
const SIZE = { qf: 4, sf: 2, f: 1 };
const PRIVATE_KINDS = ['match_opened', 'match_proposed', 'match_confirmed', 'match_reminder_30', 'match_reminder_5',
    'match_deadline', 'match_replay_draw', 'match_replay_network', 'match_replay_server', 'match_result',
    'readiness_requested', 'readiness_halfway', 'readiness_last_call', 'readiness_withdrawn', 'readiness_expired',
    'readiness_cancelled', 'reliability_warning', 'reliability_suspension'];
const TERMINAL = new Set(['match_result', 'readiness_withdrawn', 'readiness_expired', 'readiness_cancelled',
    'reliability_warning', 'reliability_suspension']);
const digest = parts => createHash('sha256').update(JSON.stringify(parts)).digest('hex');
const validUid = uid => typeof uid === 'string' && uid && !uid.startsWith('deleted_');
const name = player => validUid(player?.id) ? String(player.name || '').slice(0, 120) : '';
const timestamp = value => value == null ? NaN : new Date(value).getTime();
const cycleKey = state => state.registrationCycleId || `legacy:${state.tournamentNumber}`;
const closed = match => !!match && (Boolean(match.winnerId) || ['double_dq', 'void', 'empty', 'bye'].includes(match.review?.kind));

function matchSummary(match) {
    const winner = [match.p1, match.p2].find(player => player?.id === match.winnerId);
    return { p1: name(match.p1), p2: name(match.p2), winner: name(winner),
        outcome: match.review?.kind === 'bye' ? 'bye' : match.winnerId ? (match.resultType === 'technical' ? 'technical' : 'regular')
            : match.review?.kind === 'double_dq' ? 'double_dq' : 'void',
        score: match.resultType !== 'technical' && /^\d+-\d+$/.test(match.scoreLabel || '') ? match.scoreLabel : '' };
}

function publicCandidates(state, at, previousFinal = null) {
    if (!state || !Number.isSafeInteger(state.tournamentNumber) || state.tournamentNumber < 1
        || !['active', 'finished'].includes(state.status)) return [];
    const cycle = cycleKey(state), rows = [];
    const add = (kind, key, details = {}, createdAt = at) => rows.push({ id: 'game:tournament:' + digest([cycle,
        ['final_scheduled', 'final_rescheduled'].includes(kind) ? 'final_time' : kind, key]),
        type: 'tournament_event', createdAt, tournamentEvent: { tournamentNumber: state.tournamentNumber, kind, ...details } });
    const qf = state.bracket?.qf || [];
    if (state.status === 'active' && qf.length === 4 && qf.every(match => match?.p1?.id && match?.p2?.id && !closed(match))) {
        add('started', 'start', { matches: qf.map(matchSummary) });
    }
    for (const round of ['qf', 'sf']) {
        const matches = state.bracket?.[round] || [];
        if (matches.length === SIZE[round] && matches.every(closed)) {
            const summaries = matches.map(matchSummary);
            add('round_complete', [round, summaries], { round, matches: summaries });
        }
    }
    const final = state.bracket?.f?.[0];
    const accepted = final?.scheduling?.accepted;
    const scheduledAt = accepted?.at ?? (final?.timeAccepted ? timestamp(final.time) : NaN);
    if (state.status === 'active' && !closed(final) && final?.p1?.id && final?.p2?.id
        && Number.isFinite(scheduledAt) && scheduledAt > at) {
        const key = [accepted?.id || '', scheduledAt];
        const changed = previousFinal && previousFinal !== JSON.stringify(key);
        add(changed ? 'final_rescheduled' : 'final_scheduled', key,
            { p1: name(final.p1), p2: name(final.p2), scheduledAt });
    }
    if (state.status === 'finished' && !final?.winnerId) add('finished_without_winner', 'finish');
    return rows;
}

function privateCandidate(notice, state) {
    if (!PRIVATE_KINDS.includes(notice.kind) || !validUid(notice.uid)) return null;
    const match = state?.registrationCycleId === notice.cycleId ? state.bracket?.[notice.round]?.[notice.index] : null;
    // The adjudication transaction already creates an individual reasoned mail.
    if (notice.kind === 'match_result' && match?.review?.kind === 'technical') return null;
    const opponent = [match?.p1, match?.p2].find(player => player?.id !== notice.uid);
    const data = { tournamentNumber: notice.tournamentNumber, kind: notice.kind,
        round: notice.round, index: notice.index, opponent: name(opponent),
        scheduledAt: notice.scheduledAt, deadlineAt: notice.deadlineAt, replyDueAt: notice.replyDueAt,
        resultType: notice.resultType, score: notice.resultType === 'regular' && /^\d+-\d+$/.test(notice.scoreLabel || '') ? notice.scoreLabel : '',
        won: notice.won === true, blockedEdition: notice.blockedEdition,
        amount: Math.max(0, (Number(notice.amount) || 0) - (Number(notice.refundPending) || 0)),
        refundPending: Number(notice.refundPending) || 0 };
    return { id: 'tournament-mail:' + digest([notice._id || notice.noticeId, notice.uid]),
        type: 'tournament_event', createdAt: notice.createdAt, tournamentEvent: data };
}

// A read model only: no result, balance, deadline or discipline writes. Every
// delivery has a stable identity; a failed write retries without duplicate mail.
function createTournamentMailbox({ connection, currentNotice, guardWrite = async () => () => {},
    notify = () => {}, changed = () => {}, now = Date.now }) {
    const db = name => connection.db.collection(name);
    let running = false, initialized;
    async function initialize() {
        if (!initialized) initialized = (async () => {
            await db('tournamentnotices').createIndex({ mailboxHandledAt: 1, dueAt: 1 });
            await db('tournamententries').createIndex({ chargedAt: 1 });
            await db('playermailboxentries').createIndex({ recipientUid: 1, id: 1 }, { unique: true });
            await db('tournamentmailboxstate').updateOne({ _id: 'activation-v1' },
                { $setOnInsert: { startedAt: now() } }, { upsert: true });
        })().catch(error => { initialized = null; throw error; });
        await initialized;
        return db('tournamentmailboxstate').findOne({ _id: 'activation-v1' });
    }
    async function personal(uid, message) {
        if (!validUid(uid)) return;
        let release;
        try { release = await guardWrite(uid); }
        catch (error) { if (error.code === 'account_deleted') return; throw error; }
        try {
            if (!await db('userprofiles').findOne({ firebaseUid: uid }, { projection: { _id: 1 } })) return;
            const result = await db('playermailboxentries').updateOne({ recipientUid: uid, id: message.id }, { $setOnInsert: {
                recipientUid: uid, id: message.id, shared: false, createdAt: message.createdAt,
                message, readAt: null, archived: false, deleted: false
            } }, { upsert: true, writeConcern: { w: 'majority' } });
            if (result.upsertedCount) notify(uid);
        } finally { release(); }
    }
    async function shared(message) {
        const { id, ...notice } = message;
        const result = await db('playergamenotices').updateOne({ _id: id }, { $setOnInsert: notice },
            { upsert: true, writeConcern: { w: 'majority' } });
        if (result.upsertedCount) changed();
    }
    async function sync() {
        if (running) return;
        running = true;
        try {
            const activation = await initialize(), at = now();
            const state = await db('tournamentstates').findOne({});
            if (!state) return;
            const cycle = cycleKey(state), recordId = digest([cycle, 'public']);
            const previous = await db('tournamentmailboxstate').findOne({ _id: recordId });
            const publicIds = new Set(previous?.publicIds || []);
            for (const message of publicCandidates(state, at, previous?.finalKey)) if (!publicIds.has(message.id)) {
                await shared(message); publicIds.add(message.id);
            }
            const final = state.bracket?.f?.[0], accepted = final?.scheduling?.accepted;
            const finalAt = accepted?.at ?? (final?.timeAccepted ? timestamp(final.time) : NaN);
            // Preserve the last confirmed public time while a new proposal waits.
            const finalKey = Number.isFinite(finalAt) ? JSON.stringify([accepted?.id || '', finalAt]) : previous?.finalKey || null;
            if (!previous || previous.finalKey !== finalKey || publicIds.size !== (previous.publicIds?.length || 0)) {
                await db('tournamentmailboxstate').updateOne({ _id: recordId }, { $set: { finalKey, publicIds: [...publicIds] } }, { upsert: true });
            }

            const notices = await db('tournamentnotices').find({ mailboxHandledAt: null, kind: { $in: PRIVATE_KINDS },
                dueAt: { $lte: at } }).sort({ dueAt: 1, _id: 1 }).limit(100).toArray();
            for (const notice of notices) {
                const terminal = TERMINAL.has(notice.kind);
                const valid = terminal ? notice.createdAt >= activation.startedAt || state.registrationCycleId === notice.cycleId
                    : !notice.obsoleteAt && await currentNotice(notice);
                if (valid) {
                    const fresh = await db('tournamentstates').findOne({});
                    const adjudicated = notice.kind === 'match_result' && notice.resultType === 'technical'
                        && await db('tournamentmatchaudits').findOne({ cycleId: notice.cycleId, scheduleId: notice.scheduleId,
                            kind: 'adjudication_technical' }, { projection: { _id: 1 } });
                    const message = adjudicated ? null : privateCandidate(notice, fresh);
                    if (message) await personal(notice.uid, message);
                    if (notice.kind === 'readiness_cancelled' && notice.createdAt >= activation.startedAt) await shared({ id: 'game:tournament:' + digest([notice.cycleId, 'cancelled']),
                        type: 'tournament_event', createdAt: notice.createdAt,
                        tournamentEvent: { tournamentNumber: notice.tournamentNumber, kind: 'cancelled' } });
                }
                await db('tournamentnotices').updateOne({ _id: notice._id }, { $set: { mailboxHandledAt: at } });
            }
            for (const round of ['qf', 'sf', 'f']) for (const [index, match] of (state.bracket?.[round] || []).entries()) {
                if (match?.review?.kind !== 'bye' || !validUid(match.winnerId)) continue;
                await personal(match.winnerId, { id: 'tournament-bye:' + digest([cycle, round, index, match.winnerId]),
                    type: 'tournament_event', createdAt: Number(match.review.at) || at,
                    tournamentEvent: { tournamentNumber: state.tournamentNumber, kind: 'match_bye', round, index } });
            }
            // New entries only: do not flood existing accounts with old signup receipts.
            const entries = await db('tournamententries').find({ $or: [
                { chargedAt: { $gte: activation.startedAt }, mailboxRegisteredAt: null },
                { readinessConfirmedAt: { $gte: activation.startedAt }, mailboxConfirmedAt: null }] }).limit(100).toArray();
            for (const entry of entries) {
                for (const [kind, timestampField, flag] of [['registration_confirmed', 'chargedAt', 'mailboxRegisteredAt'],
                    ['readiness_confirmed', 'readinessConfirmedAt', 'mailboxConfirmedAt']]) {
                    if (entry[flag] || !entry[timestampField] || entry[timestampField] < activation.startedAt) continue;
                    await personal(entry.uid, { id: 'tournament-entry:' + digest([entry._id, kind]), type: 'tournament_event',
                        createdAt: entry[timestampField], tournamentEvent: { tournamentNumber: entry.tournamentNumber, kind } });
                    await db('tournamententries').updateOne({ _id: entry._id }, { $set: { [flag]: at } });
                }
            }
            // Legacy editions have no durable scheduling notices. Remember only
            // result changes observed after activation; never invent old outcomes.
            if (!scheduling.isManaged(state) && ['active', 'finished'].includes(state.status)) {
                const key = digest([cycle, 'legacy']), before = await db('tournamentmailboxstate').findOne({ _id: key });
                const observed = {};
                for (const round of ['qf', 'sf', 'f']) for (const [index, match] of (state.bracket?.[round] || []).entries()) {
                    if (!match) continue;
                    const slot = `${round}:${index}`, signature = digest([match.winnerId, match.scoreLabel, match.review?.kind]);
                    observed[slot] = signature;
                    if (before && before.observed?.[slot] !== signature && match.winnerId && !['technical', 'bye'].includes(match.review?.kind)) {
                        for (const player of [match.p1, match.p2].filter(Boolean)) await personal(player.id,
                            { id: 'tournament-legacy:' + digest([cycle, slot, signature, player.id]), type: 'tournament_event', createdAt: at,
                                tournamentEvent: { tournamentNumber: state.tournamentNumber, kind: 'match_result', round, index,
                                    opponent: name([match.p1, match.p2].find(p => p?.id !== player.id)), won: match.winnerId === player.id,
                                    resultType: match.resultType, score: matchSummary(match).score } });
                    }
                }
                await db('tournamentmailboxstate').updateOne({ _id: key }, { $set: { observed } }, { upsert: true });
            }
        } finally { running = false; }
    }
    return { sync };
}

module.exports = { publicCandidates, privateCandidate, matchSummary, createTournamentMailbox };
