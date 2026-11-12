'use strict';
const core = require('../www/tournamentSchedulingCore');

function createTournamentSchedulingRuntime({ getState, persistState, persistMatch, persistTransition, isBusy, createId, now = Date.now }) {
    let queue = Promise.resolve();
    const locks = new Set();
    function enqueue(run) {
        const task = queue.then(run);
        queue = task.catch(() => {});
        return task;
    }
    function publishRevision(state, revision) {
        if (getState() === state) state.readinessRevision = revision + 1;
    }
    function save() {
        const requestedState = getState();
        return enqueue(async () => {
            const state = getState();
            if (state !== requestedState || !core.isManaged(state)) return;
            const revision = Number(state.readinessRevision || 0);
            const snapshot = structuredClone(state);
            snapshot.readinessRevision = revision + 1;
            await persistState(snapshot, revision);
            publishRevision(state, revision);
        });
    }
    function execute(command, input) {
        return enqueue(async () => {
            const state = getState();
            const fail = reason => ({ ok: false, reason });
            if (!core.isManaged(state) || state.status !== 'active' || input.cycleId !== state.registrationCycleId
                || typeof input.round !== 'string' || !Object.hasOwn(core.ROUNDS, input.round)
                || !Number.isInteger(input.index) || input.index < 0) {
                return fail('tourney_schedule_stale');
            }
            const match = state.bracket?.[input.round]?.[input.index];
            if (!match) return fail('tourney_schedule_stale');
            if (isBusy(input.round, input.index)) return fail('tourney_schedule_busy');
            const before = match.scheduling;
            const updated = structuredClone(match);
            const result = core.apply(updated, command, input, now(), createId);
            if (!result.ok) return result;
            const key = input.round + ':' + input.index;
            locks.add(key);
            try {
                const revision = Number(state.readinessRevision || 0);
                await persistMatch(state, input, updated, revision, command);
                publishRevision(state, revision);
                // A deletion/result can finish the match while the durable write is pending.
                // Never replace the bracket or its result with the scheduling snapshot.
                if (getState() !== state || state.status !== 'active' || match.winnerId || match.scheduling !== before
                    || state.bracket?.[input.round]?.[input.index] !== match
                    || match.p1?.id !== updated.p1?.id || match.p2?.id !== updated.p2?.id) return fail('tourney_schedule_stale');
                match.scheduling = updated.scheduling;
                core.mirror(match);
                if (command === 'accept') match.pushRemindersSent = {};
                return { ok: true, match, round: input.round, index: input.index };
            } finally { locks.delete(key); }
        });
    }
    function transition(prepare) {
        return enqueue(async () => {
            const state = getState();
            const plan = await prepare(state);
            if (!plan || getState() !== state || (plan.canCommit && !plan.canCommit())) return false;
            const revision = Number(state.readinessRevision || 0);
            const key = plan.round + ':' + plan.index;
            locks.add(key);
            try {
                await persistTransition(state, plan, revision);
                if (getState() !== state) return false;
                for (const [path, value] of Object.entries(plan.updates)) {
                    const [field, round, index] = path.split('.');
                    if (field !== 'bracket') state[field] = value;
                    else {
                        const previous = state.bracket[round][index];
                        for (const side of ['p1', 'p2']) {
                            const player = value[side];
                            const latest = previous?.[side]?.id === player?.id ? previous?.[side]
                                : state.players?.find(item => item.id === player?.id);
                            if (latest) value[side] = latest;
                        }
                        state.bracket[round][index] = value;
                    }
                }
                publishRevision(state, revision);
                return plan;
            } finally { locks.delete(key); }
        });
    }
    return { save, execute, transition, isLocked: (round, index) => locks.has(round + ':' + index) };
}
module.exports = { createTournamentSchedulingRuntime };
