/* One themed PNG set for the game header and its shared settings symbols. */
(() => {
    'use strict';
    const themes = ['dark', 'light', 'medium', 'winter', 'neon', 'amethyst', 'easter', 'desert', 'moon', 'severna'];
    const generatedRoles = new Set(['exit', 'timer', 'menu', 'sound', 'vibration', 'music']);
    const roles = new Set([...generatedRoles, 'undo', 'theme', 'skin', 'lock', 'close']);
    const cache = new Map();
    const ready = new Set();
    let request = 0;
    let appliedTheme = null;
    const activeTheme = () => themes.find(id => id !== 'dark' && document.body.classList.contains(`${id}-theme`)) || 'dark';
    const base = theme => theme === 'dark' ? 'assets/green-soft-clay' : `assets/theme-packs/${theme}`;
    const asset = (role, theme = activeTheme()) => {
        if (!roles.has(role)) throw new Error(`Unknown game header role: ${role}`);
        if (!themes.includes(theme)) theme = 'dark';
        const root = base(theme);
        if (role === 'undo') return `${root}/canonical/undo-token/undo-token-inline-v1.png?v=1`;
        if (role === 'theme' || role === 'skin') return `${root}/canonical/treasury-controls/tab-${role === 'theme' ? 'themes' : 'skins'}-v1.png?v=1`;
        if (role === 'lock') return `${root}/canonical/treasury-controls/status-locked-v1.png?v=1`;
        if (role === 'close') return `${root}/canonical/room-controls/close-v1.png?v=1`;
        return `${root}/canonical/game-header/${role}-v1.png?v=1`;
    };
    const preload = source => {
        if (cache.has(source)) return cache.get(source);
        const promise = new Promise((resolve, reject) => {
            const image = new Image();
            let settled = false;
            image.onload = async () => {
                if (settled) return;
                settled = true;
                try { if (typeof image.decode === 'function') await image.decode(); }
                catch (_) { /* Loaded PNG remains usable if decode rejects. */ }
                ready.add(source);
                resolve(image);
            };
            image.onerror = error => {
                if (settled) return;
                settled = true;
                reject(error);
            };
            image.src = source;
            if (image.complete && image.naturalWidth) image.onload();
        });
        cache.set(source, promise);
        promise.catch(() => cache.delete(source));
        return promise;
    };
    const sourcesForTheme = theme => [...new Set([...roles].map(role => asset(role, theme)))];
    const prepare = theme => Promise.all(sourcesForTheme(theme).map(preload));
    const ensureSettingsIcons = () => {
        for (const [id, role] of [['setting-sound', 'sound'], ['setting-music', 'music'], ['setting-vibration', 'vibration']]) {
            const label = document.getElementById(id)?.previousElementSibling;
            if (!label || label.querySelector('.settings-standard-icon')) continue;
            label.classList.add('settings-shared-icon-row');
            const image = document.createElement('img');
            image.className = 'settings-standard-icon';
            image.dataset.gameHeaderRole = role;
            image.alt = '';
            image.setAttribute('aria-hidden', 'true');
            image.decoding = 'async';
            label.prepend(image);
        }
    };
    const reconcileActionLocks = () => {
        for (const id of ['btn-bacaj', 'btn-najava']) {
            const button = document.getElementById(id);
            const key = button?.dataset.opponentLocked;
            if (key && button.textContent.trim() !== (typeof gt === 'function' ? gt(key) : key)) {
                delete button.dataset.opponentLocked;
                button.removeAttribute('aria-label');
            }
        }
    };
    const apply = async () => {
        const theme = activeTheme();
        if (theme === appliedTheme) return;
        const token = ++request;
        const images = [...document.querySelectorAll('img[data-game-header-role]')];
        const scene = document.getElementById('game-scene');
        if (scene) delete scene.dataset.gameLockReady;
        const sources = [...new Set([...images.map(image => asset(image.dataset.gameHeaderRole, theme)), asset('timer', theme), asset('lock', theme)])];
        if (!sources.every(source => ready.has(source))) await Promise.allSettled(sources.map(preload));
        if (token !== request) return;
        images.forEach(image => {
            const source = asset(image.dataset.gameHeaderRole, theme);
            if (ready.has(source)) {
                image.src = source;
                image.style.visibility = '';
            }
        });
        const timerSource = asset('timer', theme);
        if (scene) scene.style.setProperty('--gh-timer-png', ready.has(timerSource) ? `url("${timerSource}")` : 'none');
        const lockSource = asset('lock', theme);
        if (scene && ready.has(lockSource)) {
            scene.style.setProperty('--gh-lock-png', `url("${lockSource}")`);
            scene.dataset.gameLockReady = theme;
        }
        appliedTheme = sources.every(source => ready.has(source)) ? theme : null;
    };
    const start = () => {
        ensureSettingsIcons();
        reconcileActionLocks();
        for (const id of ['btn-bacaj', 'btn-najava']) {
            const button = document.getElementById(id);
            if (button) new MutationObserver(reconcileActionLocks).observe(button, { childList: true, characterData: true, subtree: true });
        }
        apply();
        new MutationObserver(apply).observe(document.body, { attributes: true, attributeFilter: ['class'] });
    };
    window.themeGameHeader = { asset, apply, prepare, activeTheme };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
    else start();
})();
