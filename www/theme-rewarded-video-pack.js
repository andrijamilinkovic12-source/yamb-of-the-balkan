// Rewarded-video identity for nine rebuilt themes. Green stays the reference.
(() => {
    const themes = new Set(['light', 'medium', 'winter', 'neon', 'amethyst', 'easter', 'desert', 'moon', 'severna']);
    const greenPrefix = 'assets/green-soft-clay/';
    const paths = new Set([
        'canonical/rewarded-video/rewarded-video-active-v1.png',
        'canonical/rewarded-video/rewarded-video-active-inline-v1.png',
        'canonical/rewarded-video/rewarded-video-unavailable-v1.png',
        'canonical/rewarded-video/rewarded-video-unavailable-inline-v1.png',
        'daily/reward-video-v3.png',
        'treasury/reward-video-v3.png',
        'solo/finish-reward-video-v3.png'
    ]);
    const legacyPattern = /assets\/(?:easter|desert|severna)-soft-clay\/(?:economy\/(?:rewarded-video|ad-unavailable)|daily\/reward-video|treasury\/reward-video|solo\/finish-reward-video)/;

    function activeTheme() {
        return [...themes].find(id => document.body.classList.contains(`${id}-theme`))
            || document.documentElement.dataset.splashTheme
            || localStorage.getItem('yamb_theme') || 'dark';
    }

    function sync(root = document) {
        const theme = activeTheme();
        const enabled = themes.has(theme);
        document.body.classList.toggle('theme-rewarded-video-pack-active', enabled);
        const images = [];
        if (root.matches?.('img[data-theme-src]')) images.push(root);
        root.querySelectorAll?.('img[data-theme-src]').forEach(image => images.push(image));
        images.forEach(image => {
            const original = image.dataset.themeSrc || '';
            if (!original.startsWith(greenPrefix)) return;
            const relative = original.slice(greenPrefix.length).split('?')[0];
            if (!paths.has(relative)) return;
            const source = enabled ? `assets/theme-packs/${theme}/${relative}` : original;
            if (image.getAttribute('src') !== source) image.src = source;
            image.classList.toggle('theme-rewarded-video-icon', enabled);
            if (!enabled) return;
            image.parentElement?.querySelectorAll('img[data-theme-src]').forEach(sibling => {
                if (sibling !== image && legacyPattern.test(sibling.dataset.themeSrc || '')) {
                    sibling.classList.add('theme-rewarded-video-legacy');
                }
            });
        });
    }

    function start() {
        sync();
        const observer = new MutationObserver(records => {
            records.forEach(record => {
                if (record.type === 'attributes') { sync(); return; }
                record.addedNodes?.forEach(node => {
                    if (node.nodeType === Node.ELEMENT_NODE) sync(node);
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
