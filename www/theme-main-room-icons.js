// Canonical main-room icon pack. The Green source remains the locked reference.
(() => {
    const themes = new Set(['light', 'medium', 'winter', 'neon', 'amethyst', 'easter', 'desert', 'moon', 'severna']);
    const iconPattern = /assets\/green-soft-clay\/canonical\/([a-z-]+)-room-identity\/([a-z-]+)-room-(menu-)?v1\.png/;
    const sourceFor = (theme, role, variant) =>
        `assets/theme-packs/${theme}/canonical/${role}-room-identity/${role}-room${variant === 'menu' ? '-menu' : ''}-v1.png`;
    const currentTheme = () => document.documentElement.dataset.splashTheme
        || localStorage.getItem('yamb_theme') || 'dark';

    function syncIcons(root = document) {
        const theme = currentTheme();
        const candidates = [];
        if (root.matches?.('img[data-theme-src]')) candidates.push(root);
        root.querySelectorAll?.('img[data-theme-src]').forEach(image => candidates.push(image));
        candidates.forEach(image => {
            const match = (image.dataset.themeSrc || '').match(iconPattern);
            if (!match) return;
            const [, role, , menu] = match;
            const variant = menu ? 'menu' : 'room';
            const nextSource = themes.has(theme)
                ? sourceFor(theme, role, variant)
                : image.dataset.themeSrc;
            if (image.getAttribute('src') !== nextSource) image.src = nextSource;
            image.classList.toggle('theme-main-room-icon', themes.has(theme));
            image.parentElement?.classList.toggle('theme-main-room-icon-host', themes.has(theme));
        });

        const watermark = document.querySelector('#main-menu .main-league-watermark-zone');
        if (watermark) {
            let image = watermark.querySelector('.theme-main-league-watermark');
            if (themes.has(theme)) {
                if (!image) {
                    image = document.createElement('img');
                    image.className = 'theme-main-league-watermark';
                    image.alt = '';
                    image.setAttribute('aria-hidden', 'true');
                    image.decoding = 'async';
                    watermark.appendChild(image);
                }
                const source = sourceFor(theme, 'quarterly-league', 'menu');
                if (image.getAttribute('src') !== source) image.src = source;
            } else if (image) {
                image.remove();
            }
        }
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
        observer.observe(document.body, { childList: true, subtree: true });
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
    else start();
})();
