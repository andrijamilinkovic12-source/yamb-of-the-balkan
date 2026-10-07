// One canonical five-pip ducat family per non-Green theme.
(() => {
    const themes = new Set(['light', 'medium', 'winter', 'neon', 'amethyst', 'easter', 'desert', 'moon', 'severna']);
    const placements = [
        ['header', '#economy-header-ducats-icon', '[id^="economy-header-ducats-"]'],
        ['tab', '#economy-tab-ducats svg', 'svg, img'],
        ['hero', '.economy-hero-ducat-icon-default', '[class*="economy-hero-ducat-icon-"]'],
        ['reward', '.economy-reward-ducat-icon-default', '[class*="economy-reward-ducat-icon-"]'],
        ['stats', '#stat-balance', '.stats-category-legacy, .stats-grid-soft-clay-icon'],
        ['balance', '.riznica-balance-ducat-default', '[class*="riznica-balance-ducat-"]'],
        ['ad', '.riznica-ad-ducat-default', '[class*="riznica-ad-ducat-"]'],
        ['game-over', '.game-over-ducat-legacy', '.game-over-ducat-legacy, .green-game-over-ducat']
    ];

    function currentTheme() {
        return [...themes].find(id => document.body.classList.contains(`${id}-theme`))
            || document.documentElement.dataset.splashTheme
            || localStorage.getItem('yamb_theme')
            || 'dark';
    }

    function sync() {
        const theme = currentTheme();
        const enabled = themes.has(theme);
        document.body.classList.toggle('theme-ducat-pack-active', enabled);
        for (const [role, anchorSelector, oldSelector] of placements) {
            const anchor = document.querySelector(anchorSelector);
            if (!anchor) continue;
            const host = anchor.parentElement;
            host.querySelectorAll(oldSelector).forEach(icon => {
                if (!icon.classList.contains('theme-ducat-pack-image')) icon.classList.add('theme-ducat-pack-legacy');
            });
            let image = host.querySelector(`.theme-ducat-pack-image[data-ducat-role="${role}"]`);
            if (!enabled) {
                image?.remove();
                continue;
            }
            if (!image) {
                image = document.createElement('img');
                image.className = `theme-ducat-pack-image theme-ducat-pack-image--${role}`;
                image.dataset.ducatRole = role;
                image.alt = '';
                image.setAttribute('aria-hidden', 'true');
                image.decoding = 'async';
                if (role === 'stats') host.prepend(image);
                else anchor.after(image);
            }
            const variant = role === 'header' || role === 'hero' ? 'front' : 'inline';
            const source = `assets/theme-packs/${theme}/canonical/ducat/ducat-${variant}-v1.png`;
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
