/* Canonical Top lista PNG sources. A repeated role always uses one themed file. */
(() => {
    const THEMES = ['light', 'medium', 'winter', 'neon', 'amethyst', 'easter', 'desert', 'moon', 'severna'];
    const ROLES = new Set(['identity', 'global', 'local', 'empty-loading']);
    const cache = new Map();
    const activeTheme = () => THEMES.find(theme => document.body.classList.contains(`${theme}-theme`)) || 'dark';
    const asset = (role, theme = activeTheme()) => {
        if (!ROLES.has(role)) throw new Error(`Unknown leaderboard asset role: ${role}`);
        if (!THEMES.includes(theme)) theme = 'dark';
        const root = theme === 'dark' ? 'assets/green-soft-clay' : `assets/theme-packs/${theme}`;
        if (role === 'identity') return `${root}/canonical/leaderboard-room-identity/leaderboard-room-${theme === 'dark' ? 'v1' : 'v2'}.png?v=${theme === 'dark' ? 1 : 2}`;
        return `${root}/canonical/leaderboard-controls/${role}-${theme === 'dark' ? 'v1' : 'v2'}.png?v=${theme === 'dark' ? 1 : 2}`;
    };
    const preload = (theme = activeTheme()) => Promise.all([...ROLES].map(role => {
        const source = asset(role, theme);
        if (cache.has(source)) return cache.get(source);
        const pending = new Promise((resolve, reject) => {
            const image = new Image();
            image.decoding = 'async';
            image.onload = async () => {
                try { if (image.decode) await image.decode(); } catch (_) { /* Decoded by load. */ }
                resolve(source);
            };
            image.onerror = reject;
            image.src = source;
            if (image.complete && image.naturalWidth) image.onload();
        });
        cache.set(source, pending);
        pending.catch(() => cache.delete(source));
        return pending;
    }));
    const apply = () => {
        const theme = activeTheme();
        document.querySelectorAll('img[data-leaderboard-control]').forEach(image => {
            const source = asset(image.dataset.leaderboardControl, theme);
            if (image.getAttribute('src') === source && image.dataset.leaderboardReady === 'true') return;
            image.dataset.leaderboardReady = 'false';
            delete image.dataset.leaderboardError;
            const request = source;
            const pending = cache.get(source) || preload(theme).then(() => source);
            pending.then(() => {
                if (!image.isConnected || activeTheme() !== theme || request !== asset(image.dataset.leaderboardControl, activeTheme())) return;
                image.src = source;
                image.dataset.leaderboardReady = 'true';
            }).catch(() => { if (image.isConnected && activeTheme() === theme) image.dataset.leaderboardError = 'true'; });
        });
    };
    window.themeLeaderboard = { asset, activeTheme, preload, apply };
    const start = () => {
        preload().catch(() => {});
        apply();
        new MutationObserver(() => { preload().catch(() => {}); apply(); })
            .observe(document.body, { attributes: true, attributeFilter: ['class'] });
        for (const id of ['highscores-screen', 'waiting-screen', 'rules-overlay-ui']) {
            const room = document.getElementById(id);
            if (room) new MutationObserver(apply).observe(room, { childList: true, subtree: true });
        }
    };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
    else start();
})();
