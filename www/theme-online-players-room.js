/* A single, theme-owned PNG per role in the Online Players room. */
(() => {
    const THEMES = ['dark', 'light', 'medium', 'winter', 'neon', 'amethyst', 'easter', 'desert', 'moon', 'severna'];
    const ROLES = new Set(['state', 'search', 'friend', 'spectate', 'duel', 'avatar']);
    const imageCache = new Map();
    const ready = new Set();
    const activeTheme = () => THEMES.find(theme => theme !== 'dark' && document.body.classList.contains(`${theme}-theme`)) || 'dark';
    const asset = (role, theme = activeTheme()) => {
        if (!ROLES.has(role)) throw new Error(`Unknown Online Players icon role: ${role}`);
        if (!THEMES.includes(theme)) theme = 'dark';
        const source = `assets/theme-packs/${theme}/canonical/online-players-internal/${role}-v1.png?v=2`;
        return globalThis.resolveThemeQualityAsset?.(source) || source;
    };
    const preload = (theme = activeTheme(), roles = ROLES) => Promise.all([...roles].map(role => {
            const source = asset(role, theme);
            if (imageCache.has(source)) return imageCache.get(source);
            const pending = new Promise((resolve, reject) => {
                const image = new Image();
                let settled = false;
                image.decoding = 'async';
                image.onload = async () => {
                    if (settled) return;
                    settled = true;
                    try { if (typeof image.decode === 'function') await image.decode(); }
                    catch (_) { /* The loaded PNG remains usable. */ }
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
            imageCache.set(source, pending);
            pending.catch(() => imageCache.delete(source));
            return pending;
        }));
    const apply = (root = document) => {
        const images = [];
        if (root.matches?.('img[data-online-role]')) images.push(root);
        root.querySelectorAll?.('img[data-online-role]').forEach(image => images.push(image));
        images.forEach(image => {
            // Shared eye icons remain live wherever visible, including the game.
            if (!image.getClientRects().length) return;
            const source = asset(image.dataset.onlineRole);
            if (image.getAttribute('src') === source) return;
            if (ready.has(source)) {
                image.src = source;
                image.style.visibility = '';
                return;
            }
            image.style.visibility = 'hidden';
            image.onload = () => { image.style.visibility = ''; };
            image.onerror = () => { image.style.visibility = ''; };
            image.src = source;
            if (image.complete && image.naturalWidth) image.style.visibility = '';
        });
    };
    const handleAvatarError = image => {
        if (!image || image.dataset.onlineRole === 'avatar') return;
        image.dataset.onlineRole = 'avatar';
        apply(image);
    };
    window.themeOnlinePlayers = { asset, apply, preload, handleAvatarError, activeTheme };
    const start = () => {
        apply();
        new MutationObserver(() => apply(document))
            .observe(document.body, { attributes: true, attributeFilter: ['class'] });
        for (const id of ['online-players-overlay', 'game-scene', 'waiting-screen']) {
            const room = document.getElementById(id);
            if (room) {
                new MutationObserver(() => apply(room)).observe(room, { childList: true, subtree: true });
                new MutationObserver(() => apply(room)).observe(room, { attributes: true, attributeFilter: ['class', 'style'] });
            }
        }
    };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
    else start();
})();
