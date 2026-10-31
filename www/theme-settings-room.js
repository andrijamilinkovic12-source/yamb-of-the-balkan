/* Canonical Settings artwork; shared controls use the exact game-header PNG. */
(() => {
    'use strict';
    const themes = ['dark','light','medium','winter','neon','amethyst','easter','desert','moon','severna'];
    const roles = ['room','profile','sound','music','vibration','display-theme','language','terms','privacy'];
    const shared = new Set(['sound','music','vibration']);
    const cache = new Map();
    const pendingTraces = new Map();
    let request = 0;
    const activeTheme = () => window.themeGameHeader?.activeTheme?.() || 'dark';
    const asset = (role, theme = activeTheme()) => {
        if (!roles.includes(role)) throw new Error(`Unknown Settings role: ${role}`);
        if (!themes.includes(theme)) theme = 'dark';
        if (shared.has(role)) return window.themeGameHeader.asset(role, theme);
        const base = theme === 'dark' ? 'assets/green-soft-clay' : `assets/theme-packs/${theme}`;
        if (role === 'room') return `${base}/canonical/settings-room-identity/settings-room-v1.png?v=1`;
        const version = theme === 'dark' ? 1 : 2;
        return `${base}/canonical/settings-controls/${role}-v${version}.png?v=${version}`;
    };
    const sources = theme => [...new Set(roles.map(role => asset(role, theme)))];
    const preload = src => {
        if (cache.has(src)) return cache.get(src);
        const trace = window.themeLoadingDiagnostics?.start(src, 'settings');
        if (trace) pendingTraces.set(src, trace);
        const promise = new Promise((resolve, reject) => {
            const img = new Image();
            let settled = false;
            img.onload = async () => {
                if (settled) return;
                settled = true;
                trace?.loaded();
                try { if (img.decode) await img.decode(); } catch (_) { trace?.decodeFallback(); /* onload is sufficient. */ }
                trace?.ready(img.naturalWidth, img.naturalHeight);
                pendingTraces.delete(src);
                resolve(img);
            };
            img.onerror = error => {
                if (settled) return;
                settled = true;
                trace?.error();
                pendingTraces.delete(src);
                reject(error);
            };
            img.fetchPriority = 'high';
            img.decoding = 'async';
            img.src = src;
            if (img.complete && img.naturalWidth) img.onload();
        });
        cache.set(src, promise);
        promise.catch(() => cache.delete(src));
        return promise;
    };
    const prepare = (theme, { timeoutMs = 0 } = {}) => {
        const visibleSources = [...sources(theme), window.themeGameHeader?.asset('close', theme)].filter(Boolean);
        const loading = Promise.all([...new Set(visibleSources)].map(preload));
        if (!timeoutMs) return loading;
        let timer;
        return Promise.race([
            loading,
            new Promise((_, reject) => { timer = setTimeout(() => {
                visibleSources.forEach(src => pendingTraces.get(src)?.timeout(timeoutMs));
                reject(new Error('Settings artwork timeout'));
            }, timeoutMs); })
        ]).finally(() => clearTimeout(timer));
    };
    const apply = async () => {
        const theme = activeTheme(), token = ++request;
        // Shared audio controls also carry game-header roles. Update them with
        // the visible Settings pack instead of waiting for hidden game controls.
        const icons = [...document.querySelectorAll('img[data-settings-role], .settings-standard-icon[data-game-header-role]')];
        const roleOf = icon => icon.dataset.settingsRole || icon.dataset.gameHeaderRole;
        await Promise.allSettled(icons.map(icon => preload(asset(roleOf(icon), theme))));
        if (token !== request || activeTheme() !== theme) return;
        icons.forEach(icon => {
            const src = asset(roleOf(icon), theme);
            if (cache.has(src)) icon.src = src;
        });
    };
    const start = () => {
        // Settings owns its shared audio icons; a hidden room does not preload
        // them during startup or every menu theme change.
        const room = document.getElementById?.('settings-screen');
        const applyVisible = () => {
            if (room?.classList.contains('active')) void apply();
        };
        applyVisible();
        new MutationObserver(applyVisible).observe(document.body, { attributes:true, attributeFilter:['class'] });
        if (room) new MutationObserver(applyVisible).observe(room, { attributes:true, attributeFilter:['class'] });
    };
    window.themeSettingsRoom = { asset, sources, prepare, apply };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once:true });
    else start();
})();
