// Canonical main-room icon pack. The Green source remains the locked reference.
(() => {
    const themes = new Set(['light', 'medium', 'winter', 'neon', 'amethyst', 'easter', 'desert', 'moon', 'severna']);
    const iconPattern = /assets\/green-soft-clay\/canonical\/([a-z-]+)-room-identity\/([a-z-]+)-room-(menu-)?v1\.png/;
    const legacySources = {
        'runtime/menu/treasury-free-v3.png': ['treasury', 'menu'],
        'treasury-free-v3.png': ['treasury', 'room'],
        'runtime/menu/ducats-undo-free-v3.png': ['economy', 'menu'],
        'ducats-undo-free-v3.png': ['economy', 'room'],
        'canonical/tournament-awards/champion-trophy-v1.png': ['tournament', 'auto']
    };
    const sourceFor = (theme, role, variant) =>
        role === 'treasury' ? `assets/theme-packs/${theme}/${variant === 'menu' ? 'runtime/menu/' : ''}treasury-free-v3.png?v=2`
        : role === 'economy' ? `assets/theme-packs/${theme}/${variant === 'menu' ? 'runtime/menu/' : ''}ducats-undo-free-v3.png`
        : role === 'tournament' ? `assets/theme-packs/${theme}/canonical/tournament-awards/champion-trophy${variant === 'menu' ? '' : '-room'}-v1.png`
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
            const original = image.dataset.themeSrc || '';
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
                    syncIcons();
                    return;
                }
                record.addedNodes.forEach(node => {
                    if (node.nodeType === Node.ELEMENT_NODE) syncIcons(node);
                });
            });
        });
        observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-splash-theme'] });
        observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });
        observer.observe(document.body, { childList: true, subtree: true });
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
    else start();
})();
