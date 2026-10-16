// Canonical Solo finish glyphs and the shared Power Index identity in all ten themes.
(() => {
    const themes = new Set(['light', 'medium', 'winter', 'neon', 'amethyst', 'easter', 'desert', 'moon', 'severna']);
    const roles = ['finish-score-mark', 'finish-claim'];
    let renderedTheme = null;

    function activeTheme() {
        return [...themes].find(theme => document.body.classList.contains(`${theme}-theme`))
            || localStorage.getItem('yamb_theme')
            || document.documentElement.dataset.splashTheme
            || 'dark';
    }

    function source(theme, role) {
        return themes.has(theme) && roles.includes(role)
            ? `assets/theme-packs/${theme}/canonical/solo-results/${role}-v1.png?v=1`
            : '';
    }

    function powerIndexSource(theme) {
        const root = themes.has(theme)
            ? `assets/theme-packs/${theme}/canonical/statistics-overview/`
            : 'assets/green-soft-clay/canonical/statistics-overview/';
        return `${root}power-index-v1.png?v=1`;
    }

    function recordIconSource(theme, role) {
        if (!['weekly', 'monthly', 'all_time', 'personal'].includes(role)) return '';
        const root = themes.has(theme)
            ? `assets/theme-packs/${theme}/canonical/solo-record-icons/`
            : 'assets/green-soft-clay/canonical/solo-record-icons/';
        return `${root}${role}-v1.png?v=1`;
    }

    function sync(loadImages = false) {
        const theme = activeTheme();
        const changed = theme !== renderedTheme;
        if (!changed && !loadImages) return;
        renderedTheme = theme;
        document.querySelectorAll('#game-over-screen img[data-solo-results-role]').forEach(image => {
            const next = source(theme, image.dataset.soloResultsRole);
            if (!next) {
                image.removeAttribute('src');
                delete image.dataset.themeSrc;
                return;
            }
            if (changed) {
                // Clear the previous theme synchronously, so a slow decode cannot expose it.
                image.removeAttribute('src');
                delete image.dataset.themeSrc;
            }
            // The Solo room preloads these files; the result DOM only loads them when needed.
            const result = document.getElementById('game-over-screen');
            if (loadImages || (result?.classList.contains('active') && result.classList.contains('is-solo-result'))) {
                image.dataset.themeSrc = next;
                if (image.getAttribute('src') !== next) image.src = next;
            }
        });
        document.querySelectorAll('#solo-record-panel img[data-solo-record-icon]').forEach(image => {
            const next = recordIconSource(theme, image.dataset.soloRecordIcon);
            if (changed) image.removeAttribute('src');
            const result = document.getElementById('game-over-screen');
            if (next && (loadImages || (result?.classList.contains('active') && result.classList.contains('is-solo-result')))) {
                if (image.getAttribute('src') !== next) image.src = next;
            }
        });
        const icon = document.getElementById('solo-power-index-icon');
        if (icon) {
            if (changed) icon.removeAttribute('src');
            const result = document.getElementById('game-over-screen');
            if (loadImages || (result?.classList.contains('active') && result.classList.contains('is-solo-result'))) {
                const next = powerIndexSource(theme);
                if (icon.getAttribute('src') !== next) icon.src = next;
            }
        }
    }

    function start() {
        sync();
        new MutationObserver(() => sync()).observe(document.body, { attributes: true, attributeFilter: ['class'] });
        new MutationObserver(() => sync()).observe(document.documentElement, { attributes: true, attributeFilter: ['data-splash-theme'] });
        const result = document.getElementById('game-over-screen');
        if (result) new MutationObserver(() => {
            if (result.classList.contains('active') && result.classList.contains('is-solo-result')) sync(true);
        }).observe(result, { attributes: true, attributeFilter: ['class'] });
    }

    window.themeSoloResults = { source, powerIndexSource, recordIconSource, sync };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
    else start();
})();
