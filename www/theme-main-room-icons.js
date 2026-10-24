// Canonical main-room icon pack. The Green source remains the locked reference.
(() => {
    const themes = new Set(['light', 'medium', 'winter', 'neon', 'amethyst', 'easter', 'desert', 'moon', 'severna']);
    const iconPattern = /assets\/green-soft-clay\/canonical\/([a-z-]+)-room-identity\/([a-z-]+)-room-(menu-)?v1\.png/;
    const tournamentRoomPattern = /assets\/green-soft-clay\/canonical\/tournament-(navigation|states)\/([a-z-]+)-v1\.png/;
    const tournamentPowerPattern = /assets\/green-soft-clay\/canonical\/statistics-overview\/power-index-v1\.png/;
    const chatInternalPattern = /assets\/green-soft-clay\/global-chat-(empty|send)-v1\.png/;
    const legacySources = {
        'runtime/menu/treasury-free-v3.png': ['treasury', 'menu'],
        'treasury-free-v3.png': ['treasury', 'room'],
        'runtime/menu/ducats-undo-free-v3.png': ['economy', 'menu'],
        'ducats-undo-free-v3.png': ['economy', 'room'],
        'canonical/tournament-awards/champion-trophy-v1.png': ['tournament', 'auto']
    };
    const sourceFor = (theme, role, variant) =>
        role === 'treasury' ? `assets/theme-packs/${theme}/${variant === 'menu' ? 'runtime/menu/' : ''}treasury-free-v3.png?v=${['easter', 'desert', 'severna'].includes(theme) ? 3 : 2}`
        : role === 'economy' ? `assets/theme-packs/${theme}/${variant === 'menu' ? 'runtime/menu/' : ''}ducats-undo-free-v${['winter', 'desert', 'moon', 'severna'].includes(theme) ? 4 : 3}.png${theme === 'neon' ? '?v=2' : ''}`
        : role === 'tournament' ? `assets/theme-packs/${theme}/canonical/tournament-awards/champion-trophy${variant === 'menu' ? '' : '-room'}-v${['winter', 'neon', 'amethyst', 'easter', 'desert', 'moon', 'severna'].includes(theme) ? 2 : 1}.png`
        : role === 'leaderboard' ? `assets/theme-packs/${theme}/canonical/leaderboard-room-identity/leaderboard-room${variant === 'menu' ? '-menu' : ''}-v2.png`
        : role === 'quarterly-league' ? `assets/theme-packs/${theme}/canonical/quarterly-league-room-identity/quarterly-league-room${variant === 'menu' ? '-menu' : ''}-v2.png?v=2`
        : `assets/theme-packs/${theme}/canonical/${role}-room-identity/${role}-room${variant === 'menu' ? '-menu' : ''}-v1.png`;
    const currentTheme = () => [...themes].find(theme => document.body.classList.contains(`${theme}-theme`))
        || document.documentElement.dataset.splashTheme
        || localStorage.getItem('yamb_theme') || 'dark';
    const visibilityBeforeSwap = new WeakMap();
    const observedImages = new WeakSet();

    function restoreVisibility(image) {
        const previous = visibilityBeforeSwap.get(image);
        if (!previous || !image.style) return;
        if (previous.value) image.style.setProperty('visibility', previous.value, previous.priority);
        else image.style.removeProperty('visibility');
        visibilityBeforeSwap.delete(image);
    }

    function guardImageSwap(image) {
        if (!image.style) return;
        if (!observedImages.has(image)) {
            image.addEventListener('load', () => {
                if (image.complete && image.naturalWidth > 0) restoreVisibility(image);
            });
            observedImages.add(image);
        }
        if (!visibilityBeforeSwap.has(image)) {
            visibilityBeforeSwap.set(image, {
                value: image.style.getPropertyValue('visibility'),
                priority: image.style.getPropertyPriority('visibility')
            });
        }
        image.style.setProperty('visibility', 'hidden', 'important');
    }

    function syncIcons(root = document) {
        const theme = currentTheme();
        const candidates = [];
        if (root.matches?.('img[data-theme-src]')) candidates.push(root);
        root.querySelectorAll?.('img[data-theme-src]').forEach(image => candidates.push(image));
        candidates.forEach(image => {
            const screen = image.closest('.screen');
            if (screen && screen.id !== 'main-menu' && screen.id !== 'splash-screen'
                && !screen.classList.contains('active')) {
                // Hidden rooms keep their artwork dormant until opened. This avoids
                // downloading and decoding every room icon during app startup or a theme switch.
                guardImageSwap(image);
                return;
            }
            const original = image.dataset.themeSrc || '';
            const chatInternal = original.match(chatInternalPattern);
            if (chatInternal && image.closest('#global-chat-overlay')) {
                const role = chatInternal[1] === 'empty' ? 'empty-state' : 'send';
                const nextSource = themes.has(theme)
                    ? `assets/theme-packs/${theme}/canonical/global-chat-internal/${role}-v1.png?v=2`
                    : original;
                if (image.getAttribute('src') !== nextSource) {
                    guardImageSwap(image);
                    image.src = nextSource;
                    if (image.complete && image.naturalWidth > 0) restoreVisibility(image);
                }
                if (image.complete && image.naturalWidth > 0) restoreVisibility(image);
                return;
            }
            if (tournamentPowerPattern.test(original) && image.closest('#tournament-screen')) {
                const nextSource = themes.has(theme)
                    ? `assets/theme-packs/${theme}/canonical/statistics-overview/power-index-v1.png?v=1`
                    : original;
                if (image.getAttribute('src') !== nextSource) {
                    guardImageSwap(image);
                    image.src = nextSource;
                    if (image.complete && image.naturalWidth > 0) restoreVisibility(image);
                }
                if (image.complete && image.naturalWidth > 0) restoreVisibility(image);
                return;
            }
            const tournamentRoom = original.match(tournamentRoomPattern);
            if (tournamentRoom) {
                const hasTournamentPack = themes.has(theme);
                const revision = theme === 'neon' && tournamentRoom[2] === 'tab-bracket' ? '?v=2' : '';
                const source = hasTournamentPack
                    ? `assets/theme-packs/${theme}/canonical/tournament-${tournamentRoom[1]}/${tournamentRoom[2]}-v1.png${revision}`
                    : original;
                const nextSource = globalThis.resolveThemeQualityAsset?.(source) || source;
                if (image.getAttribute('src') !== nextSource) {
                    guardImageSwap(image);
                    image.src = nextSource;
                    if (image.complete && image.naturalWidth > 0) restoreVisibility(image);
                }
                if (image.complete && image.naturalWidth > 0) restoreVisibility(image);
                image.classList.toggle('theme-tournament-room-icon', hasTournamentPack);
                image.parentElement?.classList.toggle('theme-tournament-room-icon-host', hasTournamentPack);
                return;
            }
            const match = original.match(iconPattern);
            const legacy = original.match(/assets\/green-soft-clay\/([^?]+)/);
            const mapped = legacy && legacySources[legacy[1]];
            if (!match && !mapped) return;
            const role = match ? match[1] : mapped[0];
            const variant = match ? (match[3] ? 'menu' : 'room')
                : mapped[1] === 'auto' ? (image.closest('#main-menu') ? 'menu' : 'room') : mapped[1];
            const nextSource = themes.has(theme)
                ? sourceFor(theme, role, variant)
                : original;
            if (image.getAttribute('src') !== nextSource) {
                guardImageSwap(image);
                image.src = nextSource;
                if (image.complete && image.naturalWidth > 0) restoreVisibility(image);
            }
            if (image.complete && image.naturalWidth > 0) restoreVisibility(image);
            image.classList.toggle('theme-main-room-icon', themes.has(theme));
            image.parentElement?.classList.toggle('theme-main-room-icon-host', themes.has(theme));
            if (themes.has(theme)) {
                image.parentElement?.querySelectorAll(':scope > img[data-theme-src*="easter-soft-clay"], :scope > img[data-theme-src*="desert-soft-clay"], :scope > img[data-theme-src*="severna-soft-clay"]').forEach(old => old.remove());
            }
        });
    }

    function start() {
        syncIcons();
        const observer = new MutationObserver(records => {
            records.forEach(record => {
                if (record.type === 'attributes') {
                    if (record.target === document.documentElement || record.target === document.body) syncIcons();
                    else if (record.target.matches?.('.screen.active')) syncIcons(record.target);
                    return;
                }
                record.addedNodes.forEach(node => {
                    if (node.nodeType !== Node.ELEMENT_NODE) return;
                    if (node.matches?.('.screen')) observer.observe(node, { attributes: true, attributeFilter: ['class'] });
                    node.querySelectorAll?.('.screen').forEach(screen => observer.observe(screen, { attributes: true, attributeFilter: ['class'] }));
                    syncIcons(node);
                });
            });
        });
        observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-splash-theme'] });
        observer.observe(document.body, { childList: true, subtree: true });
        document.querySelectorAll('.screen').forEach(screen => observer.observe(screen, { attributes: true, attributeFilter: ['class'] }));
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
    else start();
})();
