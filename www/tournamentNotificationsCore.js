(function (root, factory) {
    const node = typeof module === 'object' && module.exports;
    const api = factory(node ? require('./tournamentReadinessCore') : root.tournamentReadinessCore,
        node ? require('./tournamentSchedulingCore') : root.tournamentSchedulingCore);
    if (node) module.exports = api;
    else root.tournamentNotificationsCore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (clock, scheduling) {
    'use strict';
    const VERSION = '2026-11-11-notifications-v1';
    const MINUTE = 60000;
    const DAY = 1440 * MINUTE;
    const ROUNDS = ['qf', 'sf', 'f'];
    const isManaged = state => scheduling.isManaged(state) && state.notificationPolicyVersion === VERSION;
    const isMatchNotice = notice => typeof notice?.kind === 'string' && notice.kind.startsWith('match_');
    const inQuietHours = at => clock.windowAt(at).start > at;
    const recipientIds = match => [...new Set([match.p1?.id, match.p2?.id])]
        .filter(uid => typeof uid === 'string' && uid && !uid.startsWith('deleted_'));

    function dailySlot(at) {
        const local = scheduling.localInput(at);
        const day = local.slice(0, 10);
        const hour = local.slice(11, 13);
        if (!['10', '19'].includes(hour) || Number(local.slice(14)) >= 30) return null;
        const start = scheduling.parseTime(`${day}T${hour}:00`);
        return { key: day + '-' + hour, start, end: start + 30 * MINUTE };
    }

    function attention(match, uid, at) {
        const { pending, accepted } = match.scheduling;
        if (pending && at < pending.replyDueAt && pending.by !== uid) return 'match_daily_reply';
        if (accepted) return at >= accepted.at + 15 * MINUTE ? 'match_daily_play' : null;
        return !pending || at >= pending.replyDueAt ? 'match_daily_propose' : null;
    }

    function isCurrent(state, notice, at) {
        if (!isManaged(state) || state.registrationCycleId !== notice.cycleId || !Number.isFinite(notice.expiresAt) || at >= notice.expiresAt
            || !ROUNDS.includes(notice.round) || !Number.isInteger(notice.index) || notice.index < 0) return false;
        const match = state.bracket?.[notice.round]?.[notice.index];
        if (!scheduling.isScheduled(match) || match.scheduling.id !== notice.scheduleId
            || !recipientIds(match).includes(notice.uid ?? notice.recipientUid)) return false;
        const s = match.scheduling;
        const uid = notice.uid ?? notice.recipientUid;
        if (notice.kind === 'match_result') return ['active', 'finished'].includes(state.status)
            && Boolean(match.winnerId && String(match.resultRecordedAt) === notice.referenceId);
        if (notice.kind === 'match_review') return ['active', 'finished'].includes(state.status)
            && !match.winnerId && ['extension', 'double_dq', 'void'].includes(match.review?.kind) && String(match.review.at) === notice.referenceId;
        if (state.status !== 'active' || match.winnerId || ['double_dq', 'void', 'empty'].includes(match.review?.kind)) return false;
        if (notice.kind === 'match_deadline') return at >= s.deadlineAt;
        if (at >= s.deadlineAt) return false;
        switch (notice.kind) {
            case 'match_opened': return s.attempt === 1 && !s.pending && !s.accepted;
            case 'match_replay_draw': return s.attempt > 1 && match.rematchRequired && !match.replayReason;
            case 'match_replay_network': return s.attempt > 1 && match.rematchRequired && match.replayReason === 'mutual_disconnect';
            case 'match_replay_server': return s.attempt > 1 && match.rematchRequired && match.replayReason === 'server_interruption';
            case 'match_proposed': return Boolean(s.pending && s.pending.id === notice.referenceId && s.pending.by !== uid && at < s.pending.replyDueAt);
            case 'match_confirmed':
            case 'match_reminder_30':
            case 'match_reminder_5':
            case 'match_duel_requested': return s.accepted?.id === notice.referenceId;
            case 'match_daily_reply':
            case 'match_daily_play':
            case 'match_daily_propose': return dailySlot(at)?.key === notice.referenceId && attention(match, uid, at) === notice.kind;
            default: return false;
        }
    }

    function make(state, match, round, index, kind, uids, createdAt, expiresAt, options = {}) {
        const dueAt = options.nightAllowed ? createdAt : clock.windowAt(createdAt).start;
        return uids.map(uid => ({ kind, uid, round, index, cycleId: state.registrationCycleId,
            tournamentNumber: state.tournamentNumber, scheduleId: match.scheduling.id,
            deadlineAt: match.scheduling.deadlineAt, createdAt, dueAt, expiresAt,
            nightAllowed: Boolean(options.nightAllowed), referenceId: options.referenceId || match.scheduling.id,
            key: options.key || kind, scheduledAt: options.scheduledAt || null, replyDueAt: options.replyDueAt || null,
            resultType: options.resultType || null, scoreLabel: options.scoreLabel || '', reviewKind: options.reviewKind || null,
            won: kind === 'match_result' && match.winnerId === uid }));
    }

    function collect(state, at, inPlay = () => false) {
        if (!isManaged(state) || !['active', 'finished'].includes(state.status)) return [];
        const output = [];
        const slot = dailySlot(at);
        for (const round of ROUNDS) {
            const matches = state.bracket?.[round] || [];
            for (let index = 0; index < matches.length; index++) {
                const match = matches[index];
                if (!scheduling.isScheduled(match)) continue;
                const s = match.scheduling;
                const uids = recipientIds(match);
                const add = (kind, recipients, createdAt, expiresAt, options) => {
                    for (const row of make(state, match, round, index, kind, recipients, createdAt, expiresAt, options)) {
                        if (row.dueAt <= at && isCurrent(state, row, at)) output.push(row);
                    }
                };
                if (match.winnerId) {
                    if (match.resultRecordedAt) add('match_result', uids, match.resultRecordedAt, match.resultRecordedAt + DAY, {
                        referenceId: String(match.resultRecordedAt), resultType: match.resultType,
                        scoreLabel: /^\d+-\d+(?: TP)?$/.test(match.scoreLabel) ? match.scoreLabel : ''
                    });
                    continue;
                }
                if (['extension', 'double_dq', 'void'].includes(match.review?.kind)) {
                    const review = match.review;
                    add('match_review', uids, review.at, review.at + DAY, { referenceId: String(review.at), reviewKind: review.kind });
                    if (review.kind !== 'extension') continue;
                }
                if (inPlay(round, index, s.id)) continue;
                if (at >= s.deadlineAt) {
                    add('match_deadline', uids, s.deadlineAt, s.deadlineAt + DAY);
                    continue;
                }
                if (s.attempt > 1) {
                    const kind = match.replayReason === 'server_interruption' ? 'match_replay_server'
                        : match.replayReason === 'mutual_disconnect' ? 'match_replay_network' : 'match_replay_draw';
                    add(kind,
                        uids, s.openedAt, Math.min(s.deadlineAt, s.openedAt + DAY));
                } else {
                    add('match_opened', uids, s.openedAt, Math.min(s.deadlineAt, s.openedAt + DAY));
                }
                if (s.pending) {
                    add('match_proposed', uids.filter(uid => uid !== s.pending.by), s.pending.createdAt, s.pending.replyDueAt, {
                        referenceId: s.pending.id, scheduledAt: s.pending.at, replyDueAt: s.pending.replyDueAt
                    });
                }
                if (s.accepted) {
                    const a = s.accepted;
                    const nightAllowed = inQuietHours(a.at);
                    const common = { referenceId: a.id, scheduledAt: a.at };
                    const thirtyBefore = a.at - 30 * MINUTE;
                    const fiveBefore = a.at - 5 * MINUTE;
                    add('match_confirmed', uids, a.acceptedAt, a.acceptedAt < thirtyBefore ? thirtyBefore : fiveBefore, common);
                    if (a.acceptedAt < thirtyBefore) add('match_reminder_30', uids, thirtyBefore, fiveBefore, { ...common, nightAllowed });
                    add('match_reminder_5', uids, Math.max(a.acceptedAt, fiveBefore), a.at, { ...common, nightAllowed });
                }
                if (slot) {
                    for (const uid of uids) {
                        const kind = attention(match, uid, at);
                        if (!kind) continue;
                        // An event in this slot already gives this player the relevant action.
                        if (output.some(row => row.scheduleId === s.id && row.uid === uid && row.dueAt >= slot.start - 30 * MINUTE)) continue;
                        add(kind, [uid], slot.start, Math.min(slot.end, s.deadlineAt), {
                            key: 'daily', referenceId: slot.key,
                            scheduledAt: kind === 'match_daily_reply' ? s.pending.at : s.accepted?.at,
                            replyDueAt: kind === 'match_daily_reply' ? s.pending.replyDueAt : null
                        });
                    }
                }
            }
        }
        return output;
    }

    function duelRequest(state, round, index, starterUid, at) {
        if (!isManaged(state) || !ROUNDS.includes(round)) return [];
        const match = state.bracket?.[round]?.[index];
        if (!scheduling.canStart(match, at) || !recipientIds(match).includes(starterUid) || inQuietHours(at)) return [];
        const a = match.scheduling.accepted;
        return make(state, match, round, index, 'match_duel_requested', recipientIds(match).filter(uid => uid !== starterUid),
            at, Math.min(at + 5 * MINUTE, match.scheduling.deadlineAt), {
                key: 'match_duel_requested_' + Math.floor(at / (10 * MINUTE)), referenceId: a.id, scheduledAt: a.at
            }).filter(row => isCurrent(state, row, at));
    }

    function copy(notice, language) {
        const en = language === 'en';
        const format = value => value ? new Date(value).toLocaleString(en ? 'en-GB' : 'sr-RS', {
            timeZone: clock.TIME_ZONE, day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
        }) : '';
        const match = (en ? { qf: 'Quarterfinal', sf: 'Semifinal', f: 'Final' } : { qf: 'Četvrtfinale', sf: 'Polufinale', f: 'Finale' })[notice.round];
        const time = format(notice.scheduledAt);
        const reply = format(notice.replyDueAt);
        const deadline = format(notice.deadlineAt);
        const templates = {
            match_opened: ['Meč je spreman za zakazivanje', `Predložite termin. Rok za odigravanje: ${deadline} (Beograd).`, 'Match ready to schedule', `Propose a time. Match deadline: ${deadline} (Belgrade time).`],
            match_proposed: ['Novi predlog termina', `Predložen termin: ${time}. Odgovorite do ${reply} (Beograd).`, 'New match time proposed', `Proposed time: ${time}. Respond by ${reply} (Belgrade time).`],
            match_confirmed: ['Termin je potvrđen', `Dogovoreni termin: ${time} (Beograd).`, 'Match time confirmed', `Agreed time: ${time} (Belgrade time).`],
            match_reminder_30: ['Podsetnik za meč', `Dogovoreni termin je u narednih 30 minuta: ${time} (Beograd).`, 'Match reminder', `Your agreed time is within 30 minutes: ${time} (Belgrade time).`],
            match_reminder_5: ['Meč uskoro počinje', `Dogovoreni termin je u narednih 5 minuta: ${time} (Beograd).`, 'Match starts soon', `Your agreed time is within 5 minutes: ${time} (Belgrade time).`],
            match_daily_propose: ['Meč čeka zakazivanje', `Predložite termin do roka za odigravanje: ${deadline} (Beograd).`, 'Match needs scheduling', `Propose a time before the match deadline: ${deadline} (Belgrade time).`],
            match_daily_reply: ['Predlog čeka vaš odgovor', `Odgovorite na predlog za ${time} do ${reply} (Beograd).`, 'Proposal needs your reply', `Respond to the proposal for ${time} by ${reply} (Belgrade time).`],
            match_daily_play: ['Meč još nije odigran', `Otvorite meč da ga odigrate ili dogovorite promenu pre ${deadline} (Beograd).`, 'Match has not been played', `Open the match to play or agree on a new time before ${deadline} (Belgrade time).`],
            match_deadline: ['Rok meča je istekao', 'Rok za odigravanje je istekao. Rezultat nije automatski dodeljen.', 'Match deadline passed', 'The match deadline has passed. No result was awarded automatically.'],
            match_replay_draw: ['Nerešeno: meč se ponavlja', `Dogovorite ponavljanje. Novi rok: ${deadline} (Beograd).`, 'Draw: replay required', `Arrange a replay. New deadline: ${deadline} (Belgrade time).`],
            match_replay_network: ['Prekid veze: meč se ponavlja', `Nema dodeljenog pobednika. Novi rok: ${deadline} (Beograd).`, 'Connection lost: replay required', `No winner was awarded. New deadline: ${deadline} (Belgrade time).`],
            match_replay_server: ['Prekid na serveru: meč se ponavlja', `Nema kazne ni dodeljenog pobednika. Novi rok: ${deadline} (Beograd).`, 'Server interruption: replay required', `No penalty or winner was recorded. New deadline: ${deadline} (Belgrade time).`],
            match_duel_requested: ['Protivnik je spreman za meč', 'Otvorite dogovoreni meč ako ste spremni da igrate.', 'Opponent is ready to play', 'Open the agreed match if you are ready to play.'],
            match_review: notice.reviewKind === 'extension'
                ? ['Rok meča je produžen', `Novi rok je ${deadline} (Beograd). Dogovorite odigravanje.`, 'Match deadline extended', `The new deadline is ${deadline} (Belgrade time). Arrange to play.`]
                : notice.reviewKind === 'double_dq'
                    ? ['Oba igrača su diskvalifikovana', 'Meč nije odigran i nijedan igrač ne prolazi dalje.', 'Both players disqualified', 'The match was not played and neither player advances.']
                    : ['Meč je poništen', 'Nema kazne. Povraćaj kotizacije je evidentiran.', 'Match voided', 'No penalty was applied. The entry fee refund has been recorded.'],
            match_result: [notice.won ? 'Pobeda' : 'Meč je završen', `${notice.resultType === 'technical' ? 'Upisan je tehnički rezultat' : 'Upisan je rezultat'}${notice.scoreLabel ? ': ' + notice.scoreLabel : '.'}`,
                notice.won ? 'Match won' : 'Match completed', `${notice.resultType === 'technical' ? 'A technical result was recorded' : 'The result was recorded'}${notice.scoreLabel ? ': ' + notice.scoreLabel : '.'}`]
        };
        const row = templates[notice.kind];
        return row && match ? { title: `${match}: ${row[en ? 2 : 0]}`, body: row[en ? 3 : 1] } : null;
    }

    return { VERSION, isManaged, isMatchNotice, inQuietHours, isCurrent, collect, duelRequest, copy };
});
