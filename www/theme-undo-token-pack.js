// Canonical undo tokens for the nine rebuilt themes. Green remains unchanged.
(() => {
    const themes = new Set(['light', 'medium', 'winter', 'neon', 'amethyst', 'easter', 'desert', 'moon', 'severna']);
    const placements = [
        ['header', '#economy-header-undo-icon', '[id^="economy-header-undo-"]'],
        ['tab', '#economy-tab-undo svg', 'svg, img'],
        ['balance', '#economy-panel-undo #undo-token-count', '.economy-inline-token-icon-default, [class^="economy-inline-token-"]'],
        ['reward', '#economy-panel-undo .economy-reward-card strong .economy-inline-token-icon-default', '.economy-inline-token-icon-default, [class^="economy-inline-token-"]']
    ];

    function activeTheme() {
        return [...themes].find(id => document.body.classList.contains(`${id}-theme`))
            || document.documentElement.dataset.splashTheme
            || localStorage.getItem('yamb_theme')
            || 'dark';
    }

    function sync() {
        const theme = activeTheme();
        const enabled = themes.has(theme);
        document.body.classList.toggle('theme-undo-token-pack-active', enabled);
        for (const [role, anchorSelector, oldSelector] of placements) {
            const anchor = document.querySelector(anchorSelector);
            if (!anchor) continue;
            const host = anchor.parentElement;
            host.querySelectorAll(oldSelector).forEach(icon => {
                if (!icon.classList.contains('theme-undo-token-pack-image')) {
                    icon.classList.add('theme-undo-token-pack-legacy');
                }
            });
            let image = host.querySelector(`.theme-undo-token-pack-image[data-undo-role="${role}"]`);
            if (!enabled) {
                image?.remove();
                continue;
            }
            if (!image) {
                image = document.createElement('img');
                image.className = `theme-undo-token-pack-image theme-undo-token-pack-image--${role}`;
                image.dataset.undoRole = role;
                image.alt = '';
                image.setAttribute('aria-hidden', 'true');
                image.decoding = 'async';
                if (role === 'balance') host.insertBefore(image, anchor);
                else anchor.after(image);
            }
            const variant = role === 'header' ? 'front' : 'inline';
            const source = `assets/theme-packs/${theme}/canonical/undo-token/undo-token-${variant}-v1.png`;
            if (image.getAttribute('src') !== source) image.src = source;
        }
    }

    function start() {
        sync();
        new MutationObserver(sync).observe(document.documentElement, {
            attributes: true, attributeFilter: ['data-splash-theme']
        });
        new MutationObserver(sync).observe(document.body, {
            attributes: true, attributeFilter: ['class']
        });
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
    else start();
})();
