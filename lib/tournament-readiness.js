'use strict';

const core = require('../www/tournamentReadinessCore');
const scheduling = require('../www/tournamentSchedulingCore');
const audit = require('./tournament-match-audit');
const reliability = require('../www/tournamentReliabilityCore');

function createTournamentReadinessService({ store, createId, createMatch, shuffle, entryFee, now = Date.now }) {
    function entryPlayer(state, uid) {
        return state.players.find(player => player.id === uid);
    }

    async function notice(tx, state, player, kind, dueAt, extra = {}) {
        await tx.notice({
            noticeId: player.entryId + ':' + kind,
            cycleId: state.registrationCycleId,
            tournamentNumber: state.tournamentNumber,
            uid: player.id,
            entryId: player.entryId,
            kind,
            createdAt: now(),
            dueAt,
            deadlineAt: player.readyDeadlineAt || null,
            ...extra
        });
    }

    async function requestConfirmation(tx, state, player, at) {
        player.readyRequestedAt = at;
        player.readyDeadlineAt = core.addActiveMs(at, core.CONFIRMATION_MS);
        player.readyConfirmedAt = null;
        await tx.requestConfirmation(player.entryId, at, player.readyDeadlineAt);
        await notice(tx, state, player, 'readiness_requested', core.windowAt(at).start);
        await notice(tx, state, player, 'readiness_halfway', core.addActiveMs(at, core.CONFIRMATION_MS / 2));
        await notice(tx, state, player, 'readiness_last_call', core.addActiveMs(at, core.CONFIRMATION_MS - 1800000));
    }

    async function refund(tx, state, player, reason, result, at) {
        const refundResult = await tx.refund(player.entryId, reason, at);
        if (refundResult?.user) result.users.push(refundResult.user);
        await notice(tx, state, player, reason, core.windowAt(at).start, {
            amount: entryFee, refundPending: Number(refundResult?.pending || 0)
        });
    }

    async function sweep(tx, state, result, at) {
        if (!core.isPrestart(state) || !state.readiness) return false;
        if (at >= Number(state.readiness.expiresAt)) {
            for (const player of state.players) await refund(tx, state, player, 'readiness_cancelled', result, at);
            state.players = [];
            state.status = 'registration';
            state.registrationCycleId = createId();
            state.readiness = null;
            state.pushFlags = {};
            state.bracket = { qf: [null, null, null, null], sf: [null, null], f: [null] };
            result.cancelled = true;
            return true;
        }

        const expired = state.players.filter(player => !core.isReady(player) && at >= Number(player.readyDeadlineAt));
        for (const player of expired) await refund(tx, state, player, 'readiness_expired', result, at);
        if (!expired.length) return false;
        const expiredIds = new Set(expired.map(player => player.entryId));
        state.players = state.players.filter(player => !expiredIds.has(player.entryId));
        return true;
    }

    async function startIfReady(tx, state, result, at) {
        if (!state.readiness || state.players.length !== 8 || core.countReady(state) !== 8) return;
        const players = shuffle([...state.players]);
        state.status = 'active';
        state.readiness.completedAt = at;
        state.bracket = {
            qf: Array.from({ length: 4 }, (_, index) => createMatch(players[index * 2], players[index * 2 + 1])),
            sf: [null, null], f: [null]
        };
        if (scheduling.isManaged(state)) {
            for (const match of state.bracket.qf) scheduling.open(match, 'qf', at, createId());
        }
        if (audit.isManaged(state)) {
            for (const [index, match] of state.bracket.qf.entries()) await tx.audit(audit.openedEvent(state, 'qf', index, match));
        }
        for (const player of state.players) await tx.startEntry(player.entryId, at);
        result.started = true;
    }

    async function execute(command, input = {}) {
        if (typeof input.cycleId !== 'string' || !/^[A-Za-z0-9_-]{16,80}$/.test(input.cycleId)
            || (command !== 'tick' && (typeof input.uid !== 'string' || !input.uid))) {
            return { ok: false, reason: 'tourney_readiness_stale' };
        }
        return store.transaction(async tx => {
            const state = await tx.loadState(input.cycleId);
            if (!core.isManaged(state)) return { ok: false, reason: 'tourney_readiness_stale' };
            const at = now();
            const result = { ok: true, state, users: [], changed: false };
            // A stale/late request must never resurrect a participant or extend a deadline.
            result.changed = await sweep(tx, state, result, at);
            const reject = reason => { result.ok = false; result.reason = reason; };

            if (command !== 'tick' && state.registrationCycleId !== input.cycleId) {
                reject('tourney_readiness_stale');
            } else if (command !== 'tick' && !core.isPrestart(state)) {
                reject('tourney_cannot_unregister');
            } else if (command === 'register') {
                if (!reliability.accepts(state, input)) {
                    reject('tourney_client_update_required');
                } else if (reliability.isManaged(state) && input.reliabilityRulesAccepted !== true) {
                    reject('tourney_rules_acceptance_required');
                } else if (input.policyVersion !== core.VERSION || input.accepted !== true) {
                    reject('tourney_readiness_update_required');
                } else if (!/^[A-Za-z0-9_-]{16,80}$/.test(String(input.requestId || ''))) {
                    reject('tourney_readiness_stale');
                } else {
                    const eligibility = reliability.isManaged(state) ? await tx.reliabilityStatus(input.uid, state.tournamentNumber) : null;
                    const previous = await tx.findEntry(input.uid, input.requestId);
                    const existing = entryPlayer(state, input.uid);
                    if (eligibility?.blocked && !existing) {
                        result.blockedEdition = eligibility.blockedEdition;
                        reject('tourney_reliability_blocked');
                    } else if (previous && previous.status !== 'paid') reject('tourney_readiness_stale');
                    else if (existing) result.alreadyRegistered = true;
                    else if (!core.canRegister(state, at)) reject('tourney_readiness_no_slot');
                    else {
                        const user = await tx.charge(input.uid, entryFee);
                        if (!user) reject('tourney_not_enough_money');
                        else {
                            const entryId = createId();
                            const player = { ...input.player, id: input.uid, entryId, registeredAt: at,
                                readinessPolicyVersion: core.VERSION, readyConfirmedAt: null };
                            await tx.createEntry({ entryId, cycleId: state.registrationCycleId,
                                tournamentNumber: state.tournamentNumber, uid: input.uid,
                                requestId: input.requestId, amount: entryFee, status: 'paid',
                                chargedAt: at, refundedAmount: 0, readinessPolicyVersion: core.VERSION,
                                ...(reliability.isManaged(state) ? { clientProtocol: input.clientProtocol,
                                    reliabilityPolicyVersion: reliability.VERSION, reliabilityAcceptedAt: at } : {}) });
                            state.players.push(player);
                            result.users.push(user);
                            result.changed = true;
                            if (state.readiness) await requestConfirmation(tx, state, player, at);
                            else if (state.players.length === 8) {
                                state.status = 'confirmation';
                                state.readiness = { startedAt: at, expiresAt: at + core.SESSION_MS };
                                for (const participant of state.players) await requestConfirmation(tx, state, participant, at);
                            }
                        }
                    }
                }
            } else if (command === 'confirm' || command === 'withdraw') {
                const player = entryPlayer(state, input.uid);
                if (!player) {
                    if (command === 'withdraw') result.alreadyUnregistered = true;
                    else reject('tourney_readiness_stale');
                } else if (player.entryId !== input.entryId) reject('tourney_readiness_stale');
                else if (command === 'confirm') {
                    if (!reliability.accepts(state, input)) reject('tourney_client_update_required');
                    else if (!state.readiness || !player.readyDeadlineAt) reject('tourney_readiness_stale');
                    else if (!core.isReady(player)) {
                        player.readyConfirmedAt = at;
                        await tx.confirmEntry(player.entryId, at);
                        result.changed = true;
                        await startIfReady(tx, state, result, at);
                    }
                } else {
                    await refund(tx, state, player, 'readiness_withdrawn', result, at);
                    state.players = state.players.filter(item => item.entryId !== player.entryId);
                    result.changed = true;
                }
            } else if (command !== 'tick') reject('tourney_readiness_stale');

            if (result.changed) await tx.saveState(state);
            return result;
        });
    }

    return { execute };
}

module.exports = { createTournamentReadinessService };
