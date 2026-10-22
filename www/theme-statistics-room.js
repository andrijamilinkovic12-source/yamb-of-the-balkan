/* Statistics uses one canonical PNG per meaning and per theme. */
(() => {
    const themes = ['light', 'medium', 'winter', 'neon', 'amethyst', 'easter', 'desert', 'moon', 'severna'];
    const generated = new Set(['games', 'wins', 'draws', 'losses', 'average', 'all-time-points', 'fire-streak', 'h2h']);
    const h2hDetail = new Set(['h2h-empty', 'highest-score', 'max-win-margin', 'worst-loss-margin']);
    const activeTheme = () => themes.find(theme => document.body.classList.contains(`${theme}-theme`)) || 'dark';
    const asset = (role, theme = activeTheme()) => {
        const green = theme === 'dark' || !themes.includes(theme);
        const root = green ? 'assets/green-soft-clay' : `assets/theme-packs/${theme}`;
        if (role === 'identity') return `${root}/canonical/statistics-room-identity/statistics-room-v1.png`;
        if (role === 'power-index') return `${root}/canonical/statistics-overview/power-index-v1.png`;
        if (role === 'avatar') return `assets/theme-packs/${theme}/canonical/online-players-internal/avatar-v1.png`;
        if (role === 'record') return green
            ? `${root}/canonical/statistics-overview/record-v1.png`
            : `${root}/canonical/solo-results/personal-best-v1.png`;
        if (role === 'trophies') return green
            ? `${root}/canonical/statistics-overview/trophies-v1.png`
            : `${root}/canonical/treasury-controls/tab-trophies-v1.png`;
        if (role === 'ducat') return `${root}/canonical/ducat/ducat-inline-v${green ? 1 : (['easter', 'desert', 'severna'].includes(theme) ? 2 : 1)}.png`;
        if (h2hDetail.has(role)) return `${root}/canonical/h2h-statistics/${role}-v${green ? 1 : 2}.png`;
        if (role === 'versus') return green
            ? `${root}/canonical/h2h-statistics/versus-v1.png`
            : `${root}/canonical/online-random-states/vs-v1.png`;
        if (generated.has(role)) return green
            ? `${root}/canonical/${role === 'h2h' ? 'h2h-statistics/h2h-identity' : `statistics-overview/${role}`}-v1.png`
            : `${root}/canonical/statistics-overview/${role}-v2.png`;
        throw new Error(`Unknown statistics role: ${role}`);
    };

    const cache = new Map();
    const decode = source => {
        if (cache.has(source)) return cache.get(source);
        const promise = new Promise((resolve, reject) => {
            const image = new Image();
            image.decoding = 'async';
            image.onload = async () => {
                try { await image.decode?.(); } catch (_) { /* Loaded image remains usable. */ }
                resolve(source);
            };
            image.onerror = reject;
            image.src = source;
            if (image.complete && image.naturalWidth) image.onload();
        });
        cache.set(source, promise);
        promise.catch(() => cache.delete(source));
        return promise;
    };
    const preload = (theme = activeTheme()) => Promise.all(
        ['identity', 'power-index', 'avatar', 'record', 'games', 'wins', 'draws', 'losses',
            'fire-streak', 'average', 'trophies', 'ducat', 'all-time-points', 'h2h',
            'h2h-empty', 'highest-score', 'max-win-margin', 'worst-loss-margin', 'versus']
            .map(role => decode(asset(role, theme)))
    );
    const apply = (root = document) => {
        const theme = activeTheme();
        const images = [];
        if (root.matches?.('img[data-stat-icon]')) images.push(root);
        root.querySelectorAll?.('img[data-stat-icon]').forEach(image => images.push(image));
        const medals = [];
        if (root.matches?.('img[data-stat-medal-context]')) medals.push(root);
        root.querySelectorAll?.('img[data-stat-medal-context]').forEach(image => medals.push(image));
        for (const image of medals) {
            const source = getThemeMedalSource(image.dataset.statMedalContext, image.dataset.statMedalTier, theme);
            if (!source || image.getAttribute('src') === source) continue;
            image.dataset.statPendingSource = source;
            image.style.visibility = 'hidden';
            decode(source).then(() => {
                if (!image.isConnected || activeTheme() !== theme || image.dataset.statPendingSource !== source) return;
                image.src = source;
                image.style.visibility = '';
                delete image.dataset.statPendingSource;
            }).catch(() => {
                if (image.isConnected && image.dataset.statPendingSource === source) image.dataset.statAssetError = 'true';
            });
        }
        for (const image of images) {
            const source = asset(image.dataset.statIcon, theme);
            if (image.getAttribute('src') === source) continue;
            image.dataset.statPendingSource = source;
            image.style.visibility = 'hidden';
            decode(source).then(() => {
                if (!image.isConnected || activeTheme() !== theme || image.dataset.statPendingSource !== source) return;
                image.src = source;
                image.style.visibility = '';
                delete image.dataset.statPendingSource;
            }).catch(() => {
                if (image.isConnected && image.dataset.statPendingSource === source) image.dataset.statAssetError = 'true';
            });
        }
    };
    window.themeStatisticsRoom = { activeTheme, asset, preload, apply };
    const start = () => {
        document.querySelectorAll('#stats-screen .stats-power-card, #stats-screen .stat-item[onclick]').forEach(control => {
            control.setAttribute('role', 'button');
            control.tabIndex = 0;
            control.addEventListener('keydown', event => {
                if (event.key !== 'Enter' && event.key !== ' ') return;
                event.preventDefault();
                control.click();
            });
        });
        let lastTheme = activeTheme();
        new MutationObserver(() => {
            const nextTheme = activeTheme();
            if (nextTheme === lastTheme) return;
            lastTheme = nextTheme;
            const statistics = document.getElementById('stats-screen');
            if (statistics?.classList.contains('active')) {
                apply(statistics);
                preload(nextTheme).catch(() => {});
            }
            for (const id of ['h2h-detail-modal', 'streak-overlay', 'pi-modal-overlay']) {
                const modal = document.getElementById(id);
                if (modal && (modal.classList.contains('active') || modal.style.display === 'flex')) apply(modal);
            }
            document.querySelectorAll('img[data-stat-icon],img[data-stat-medal-context]').forEach(image => {
                if (!image.closest('#stats-screen, #h2h-detail-modal, #streak-overlay, #pi-modal-overlay') && image.getClientRects().length) apply(image);
            });
        })
            .observe(document.body, { attributes: true, attributeFilter: ['class'] });
        for (const id of ['stats-screen', 'h2h-detail-modal', 'streak-overlay']) {
            const room = document.getElementById(id);
            if (room) new MutationObserver(records => {
                for (const record of records) {
                    for (const node of record.addedNodes) if (node.nodeType === 1) apply(node);
                }
            }).observe(room, { childList: true, subtree: true });
        }
    };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
    else start();
})();
