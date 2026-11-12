(function (root, factory) {
    const api = factory();
    if (typeof module === 'object' && module.exports) module.exports = api;
    else root.tournamentAdjudicationCore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
    'use strict';
    const VERSION = '2026-11-11-adjudication-v1';
    const WAIT_MS = 15 * 60000;
    const PING_MS = 15000;
    const MAX_GAP_MS = 45000;
    const EARLY_MS = 60000;
    const isManaged = state => state?.adjudicationPolicyVersion === VERSION;
    const terminal = match => Boolean(match?.winnerId || ['double_dq', 'void', 'empty'].includes(match?.review?.kind));

    function windowFor(match) {
        const s = match?.scheduling;
        const time = s?.accepted?.at;
        if (terminal(match) || !Number.isFinite(time) || time < (s.reviewExtendedAt || 0)
            || time + WAIT_MS + MAX_GAP_MS >= s.deadlineAt) return null;
        return { start: time, end: time + WAIT_MS, opens: time - EARLY_MS, closes: time + WAIT_MS + MAX_GAP_MS };
    }

    return { VERSION, WAIT_MS, PING_MS, MAX_GAP_MS, isManaged, terminal, windowFor };
});
