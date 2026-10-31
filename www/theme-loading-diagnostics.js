/* Passive QA-only timing of public theme PNGs. No account or game data. */
(() => {
    'use strict';
    if (window.location?.hostname !== 'yamb-reconnect-qa.onrender.com') return;
    const events = [], limit = 200;
    const now = () => performance.now();
    let sequence = 0;
    const record = event => {
        events.push(Object.freeze(event));
        if (events.length > limit) events.shift();
        // Native Capacitor forwards these terminal summaries to its Console tag.
        // Intermediate phases stay in the bounded in-memory buffer.
        if (['ready', 'error', 'timeout', 'decode-fallback'].includes(event.event)) {
            try { console.info('[YAMB_THEME_LOAD] ' + JSON.stringify(event)); } catch (_) { /* Diagnostics cannot block readiness. */ }
        }
    };
    const start = (source, consumer) => {
        try {
            const url = new URL(source, window.location.href);
            if (url.origin !== window.location.origin || !/^\/assets\/[a-zA-Z0-9_./-]+\.png$/.test(url.pathname)) return null;
            if (!['theme-preloader', 'settings'].includes(consumer)) return null;
            const id = ++sequence, started = now();
            let phase = 'waiting-load', loadedAt = null, finished = false;
            const emit = (event, extra = {}) => record({
                id, consumer, asset: url.pathname, event, phase,
                elapsedMs: Math.round(now() - started),
                ...(loadedAt === null ? {} : { loadMs: Math.round(loadedAt - started), decodeMs: Math.round(now() - loadedAt) }),
                ...extra
            });
            emit('start');
            return Object.freeze({
                loaded() { if (!finished) { loadedAt = now(); phase = 'decode'; emit('loaded'); } },
                decodeFallback() { if (!finished) emit('decode-fallback'); },
                ready(width, height) { if (!finished) { emit('ready', { width, height }); finished = true; } },
                error() { if (!finished) { emit('error'); finished = true; } },
                timeout(budgetMs) { if (!finished) emit('timeout', { budgetMs }); }
            });
        } catch (_) { return null; }
    };
    window.themeLoadingDiagnostics = Object.freeze({ start, snapshot: () => events.slice() });
})();
