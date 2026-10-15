/* Canonical Settings artwork; shared controls use the exact game-header PNG. */
(() => {
    'use strict';
    const themes = ['dark','light','medium','winter','neon','amethyst','easter','desert','moon','severna'];
    const roles = ['room','profile','sound','music','vibration','display-theme','language','terms','privacy'];
    const shared = new Set(['sound','music','vibration']);
    const cache = new Map();
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
        const promise = new Promise((resolve, reject) => {
            const img = new Image();
            let settled = false;
            img.onload = async () => {
                if (settled) return;
                settled = true;
                try { if (img.decode) await img.decode(); } catch (_) { /* onload is sufficient. */ }
                resolve(img);
            };
            img.onerror = error => {
                if (settled) return;
                settled = true;
                reject(error);
            };
            img.src = src;
            if (img.complete && img.naturalWidth) img.onload();
        });
        cache.set(src, promise);
        promise.catch(() => cache.delete(src));
        return promise;
    };
    const prepare = theme => Promise.all(sources(theme).map(preload));
    const apply = async () => {
        const theme = activeTheme(), token = ++request;
        const icons = [...document.querySelectorAll('img[data-settings-role]')];
        await Promise.allSettled(icons.map(icon => preload(asset(icon.dataset.settingsRole, theme))));
        if (token !== request) return;
        icons.forEach(icon => {
            const src = asset(icon.dataset.settingsRole, theme);
            if (cache.has(src)) icon.src = src;
        });
    };
    const start = () => {
        apply();
        new MutationObserver(apply).observe(document.body, { attributes:true, attributeFilter:['class'] });
    };
    window.themeSettingsRoom = { asset, sources, prepare, apply };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once:true });
    else start();
})();
