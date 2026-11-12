(function (root, factory) {
    const api = factory();
    if (typeof module === 'object' && module.exports) module.exports = api;
    else root.tournamentReadinessCore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
    'use strict';

    const VERSION = '2026-11-11-v1';
    const HOUR = 3600000;
    const CONFIRMATION_MS = 6 * HOUR;
    const SESSION_MS = 24 * HOUR;
    const TIME_ZONE = 'Europe/Belgrade';
    const formatter = new Intl.DateTimeFormat('en-GB', {
        timeZone: TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23'
    });

    function parts(value) {
        return formatter.formatToParts(new Date(value)).reduce((out, part) => {
            if (part.type !== 'literal') out[part.type] = Number(part.value);
            return out;
        }, {});
    }

    function boundary(day, hour, offsetDays = 0) {
        const calendar = new Date(Date.UTC(day.year, day.month - 1, day.day + offsetDays, hour));
        const local = calendar.getTime();
        let utc = local;
        for (let attempt = 0; attempt < 4; attempt += 1) {
            const p = parts(utc);
            const offset = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) - utc;
            const next = local - offset;
            if (next === utc) return utc;
            utc = next;
        }
        return utc;
    }

    function windowAt(value) {
        const at = Number(value);
        if (!Number.isFinite(at)) throw new TypeError('Invalid readiness time');
        const day = parts(at);
        const start = boundary(day, 9);
        const end = boundary(day, 22);
        return at >= end
            ? { start: boundary(day, 9, 1), end: boundary(day, 22, 1) }
            : { start: Math.max(at, start), end };
    }

    function addActiveMs(value, duration) {
        let at = Number(value);
        let remaining = Number(duration);
        if (!Number.isFinite(at) || !Number.isFinite(remaining) || remaining < 0 || remaining > 31 * SESSION_MS) {
            throw new TypeError('Invalid readiness duration');
        }
        while (remaining > 0) {
            const window = windowAt(at);
            const available = window.end - window.start;
            if (remaining <= available) return window.start + remaining;
            remaining -= available;
            at = window.end;
        }
        return at;
    }

    function activeMsBetween(start, end) {
        let at = Number(start);
        const until = Number(end);
        if (!Number.isFinite(at) || !Number.isFinite(until) || until <= at) return 0;
        let total = 0;
        while (at < until) {
            const window = windowAt(at);
            if (window.start >= until) break;
            total += Math.min(until, window.end) - window.start;
            at = window.end;
        }
        return total;
    }

    function isManaged(state) {
        return state?.readinessPolicyVersion === VERSION && typeof state.registrationCycleId === 'string';
    }

    function isPrestart(state) {
        return isManaged(state) && ['registration', 'confirmation'].includes(state.status);
    }

    function isReady(player) {
        return Number(player?.readyConfirmedAt) > 0;
    }

    function canRegister(state, now) {
        if (!isPrestart(state) || state.players.length >= 8) return false;
        if (!state.readiness) return state.status === 'registration';
        return addActiveMs(now, CONFIRMATION_MS) <= Number(state.readiness.expiresAt);
    }

    function countReady(state) {
        return (state?.players || []).filter(isReady).length;
    }

    return { VERSION, CONFIRMATION_MS, SESSION_MS, TIME_ZONE, addActiveMs, activeMsBetween,
        windowAt, isManaged, isPrestart, isReady, canRegister, countReady };
});
