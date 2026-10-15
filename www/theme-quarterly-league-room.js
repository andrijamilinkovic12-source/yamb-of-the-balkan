/* Canonical quarterly league identity: one illustrated PNG per theme. */
(() => {
    'use strict';

    const THEMES = new Set(['dark', 'light', 'medium', 'winter', 'neon', 'amethyst', 'easter', 'desert', 'moon', 'severna']);
    const DIAGONAL = new Set(['amethyst', 'easter', 'moon']);
    const decoded = new Map();
    let updateScheduled = false;

    function theme() {
        const saved = localStorage.getItem('yamb_theme') || 'dark';
        return THEMES.has(saved) ? saved : 'dark';
    }

    function quarter() {
        const now = new Date();
        try {
            const month = Number(new Intl.DateTimeFormat('en-US', {
                timeZone: 'Europe/Belgrade', month: 'numeric'
            }).format(now));
            return Math.floor((month - 1) / 3) + 1;
        } catch (_error) {
            return Math.floor(now.getMonth() / 3) + 1;
        }
    }

    function source(selectedTheme, kind = 'room') {
        const root = selectedTheme === 'dark'
            ? 'assets/green-soft-clay/canonical'
            : `assets/theme-packs/${selectedTheme}/canonical`;
        const suffix = kind === 'menu' ? '-menu' : '';
        return `${root}/quarterly-league-room-identity/quarterly-league-room${suffix}-v2.png?v=2`;
    }

    function preload(url) {
        if (!decoded.has(url)) {
            const image = new Image();
            image.src = url;
            decoded.set(url, (typeof image.decode === 'function'
                ? image.decode()
                : new Promise((resolve, reject) => {
                    image.onload = resolve;
                    image.onerror = reject;
                })).catch(() => undefined));
        }
        return decoded.get(url);
    }

    function markup(kind = 'room', selectedQuarter = null) {
        const activeTheme = theme();
        const url = source(activeTheme, kind);
        const validQuarter = Number(selectedQuarter) >= 1 && Number(selectedQuarter) <= 4
            ? Number(selectedQuarter) : quarter();
        const fixed = selectedQuarter === null ? '' : ` data-ql-fixed-quarter="${validQuarter}"`;
        return `<span class="ql-quarter-logo" data-ql-logo="${kind === 'menu' ? 'menu' : 'room'}" data-ql-theme="${activeTheme}" data-ql-orientation="${DIAGONAL.has(activeTheme) ? 'diagonal' : 'cross'}" data-ql-quarter="${validQuarter}"${fixed} aria-hidden="true"><img class="ql-quarter-logo-base" src="${url}" alt=""><img class="ql-quarter-logo-active" src="${url}" alt=""></span>`;
    }

    async function refresh() {
        const activeTheme = theme();
        const activeQuarter = quarter();
        const nodes = [...document.querySelectorAll('[data-ql-logo]')];
        for (const node of nodes) {
            const requested = Number(node.dataset.qlFixedQuarter);
            node.dataset.qlQuarter = requested >= 1 && requested <= 4 ? String(requested) : String(activeQuarter);
            node.dataset.qlOrientation = DIAGONAL.has(activeTheme) ? 'diagonal' : 'cross';
            if (node.dataset.qlTheme === activeTheme) continue;
            node.dataset.qlPending = 'true';
            const url = source(activeTheme, node.dataset.qlLogo);
            await preload(url);
            if (theme() !== activeTheme || !node.isConnected) continue;
            node.querySelectorAll('img').forEach(image => { image.src = url; });
            node.dataset.qlTheme = activeTheme;
            delete node.dataset.qlPending;
        }
        for (const image of document.querySelectorAll('img[data-ql-rules-theme]')) {
            if (image.dataset.qlRulesTheme === activeTheme) continue;
            image.src = source(activeTheme);
            image.dataset.qlRulesTheme = activeTheme;
        }
    }

    function scheduleRefresh() {
        if (updateScheduled) return;
        updateScheduled = true;
        requestAnimationFrame(() => {
            updateScheduled = false;
            refresh();
        });
    }

    function start() {
        preload(source(theme(), 'menu'));
        preload(source(theme(), 'room'));
        scheduleRefresh();
        new MutationObserver(scheduleRefresh).observe(document.body, {
            attributes: true, attributeFilter: ['class']
        });
        window.addEventListener('storage', scheduleRefresh);
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) scheduleRefresh();
        });
        setInterval(scheduleRefresh, 60 * 1000);
    }

    window.ThemeQuarterlyLeagueRoom = { source, quarter, markup, refresh, scheduleRefresh };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
    else start();
})();
