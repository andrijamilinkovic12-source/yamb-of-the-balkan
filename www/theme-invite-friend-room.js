/* The invite room owns its send mark; the existing friend mark is shared with Online Players. */
(() => {
    const themes = new Set(['dark', 'light', 'medium', 'winter', 'neon', 'amethyst', 'easter', 'desert', 'moon', 'severna']);
    const currentTheme = () => [...themes].find(theme => theme !== 'dark' && document.body.classList.contains(`${theme}-theme`)) || 'dark';
    const asset = (role, theme = currentTheme()) => {
        if (!themes.has(theme)) theme = 'dark';
        if (role === 'friend') return `assets/theme-packs/${theme}/canonical/online-players-internal/friend-v1.png?v=2`;
        if (role === 'search') return `assets/theme-packs/${theme}/canonical/online-players-internal/search-v1.png?v=2`;
        if (role === 'send') return `assets/theme-packs/${theme}/canonical/invite-friend-internal/send-v1.png?v=1`;
        if (role === 'empty') return `assets/theme-packs/${theme}/canonical/invite-friend-internal/empty-v1.png?v=1`;
        if (role === 'power') return theme === 'dark'
            ? 'assets/green-soft-clay/canonical/statistics-overview/power-index-v1.png?v=1'
            : `assets/theme-packs/${theme}/canonical/statistics-overview/power-index-v1.png?v=1`;
        throw new Error(`Unknown Invite Friend role: ${role}`);
    };
    const roomIdentity = (theme = currentTheme()) => theme === 'dark'
        ? 'assets/green-soft-clay/canonical/invite-friend-room-identity/invite-friend-room-v1.png?v=1'
        : `assets/theme-packs/${theme}/canonical/invite-friend-room-identity/invite-friend-room-v1.png?v=1`;
    const apply = (root = document) => {
        const header = document.querySelector('#waiting-screen .green-invite-header-icon');
        if (header) {
            const next = roomIdentity();
            if (header.getAttribute('src') !== next) header.src = next;
        }
        const images = [];
        if (root.matches?.('img[data-invite-role]')) images.push(root);
        root.querySelectorAll?.('img[data-invite-role]').forEach(image => images.push(image));
        images.forEach(image => {
            const next = asset(image.dataset.inviteRole);
            if (image.getAttribute('src') !== next) image.src = next;
        });
    };
    const preload = (theme = currentTheme()) => Promise.all([roomIdentity(theme), ...['send', 'empty', 'friend', 'search', 'power'].map(role => asset(role, theme))].map(source => {
        const image = new Image();
        image.src = source;
        return image.decode?.().catch(() => {}) || Promise.resolve();
    }));
    window.themeInviteFriend = { asset, apply, preload };
    const start = () => {
        let preloadedTheme = '';
        const preloadCurrent = () => {
            const theme = currentTheme();
            if (theme === preloadedTheme) return;
            preloadedTheme = theme;
            preload(theme).catch(() => { preloadedTheme = ''; });
        };
        apply();
        preloadCurrent();
        new MutationObserver(() => { apply(); preloadCurrent(); })
            .observe(document.body, { attributes: true, attributeFilter: ['class'] });
    };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
    else start();
})();
