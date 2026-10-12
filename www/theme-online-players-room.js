/* A single, theme-owned PNG per role in the Online Players room. */
(() => {
    const THEMES = ['dark', 'light', 'medium', 'winter', 'neon', 'amethyst', 'easter', 'desert', 'moon', 'severna'];
    const ROLES = new Set(['state', 'search', 'friend', 'spectate', 'duel', 'avatar']);
    const imageCache = new Map();
    const activeTheme = () => THEMES.find(theme => theme !== 'dark' && document.body.classList.contains(`${theme}-theme`)) || 'dark';
    const asset = (role, theme = activeTheme()) => {
        if (!ROLES.has(role)) throw new Error(`Unknown Online Players icon role: ${role}`);
        if (!THEMES.includes(theme)) theme = 'dark';
        return `assets/theme-packs/${theme}/canonical/online-players-internal/${role}-v1.png?v=2`;
    };
    const preload = (theme = activeTheme()) => {
        ROLES.forEach(role => {
            const source = asset(role, theme);
            if (imageCache.has(source)) return;
            const image = new Image();
            image.decoding = 'async';
            image.src = source;
            imageCache.set(source, image);
        });
    };
    const apply = (root = document) => {
        const images = [];
        if (root.matches?.('img[data-online-role]')) images.push(root);
        root.querySelectorAll?.('img[data-online-role]').forEach(image => images.push(image));
        images.forEach(image => {
            const source = asset(image.dataset.onlineRole);
            if (image.getAttribute('src') === source) return;
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
        new MutationObserver(() => {
            preload();
            apply(document);
        }).observe(document.body, { attributes: true, attributeFilter: ['class'] });
    };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
    else start();
})();
