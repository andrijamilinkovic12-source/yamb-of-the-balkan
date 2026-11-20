(() => {
    'use strict';

    const THEMES = ['dark', 'light', 'medium', 'winter', 'neon', 'amethyst', 'easter', 'desert', 'moon', 'severna'];
    const BRAND_ASSETS = Object.freeze({
        dark: '/assets/green-soft-clay/splash-title-soft-clay-v2.png?v=1',
        light: '/assets/theme-packs/light/splash-title-soft-clay-v1.png?v=1',
        medium: '/assets/theme-packs/medium/splash-title-soft-clay-v1.png?v=1',
        winter: '/assets/theme-packs/winter/splash-title-soft-clay-v1.png?v=1',
        neon: '/assets/theme-packs/neon/splash-title-soft-clay-v1.png?v=1',
        amethyst: '/assets/theme-packs/amethyst/splash-title-soft-clay-v1.png?v=1',
        easter: '/assets/theme-packs/easter/splash-title-soft-clay-v1.png?v=1',
        desert: '/assets/theme-packs/desert/splash-title-soft-clay-v1.png?v=1',
        moon: '/assets/theme-packs/moon/splash-title-soft-clay-v1.png?v=1',
        severna: '/assets/theme-packs/severna/splash-title-soft-clay-v1.png?v=1'
    });
    const COPY = Object.freeze({
        sr: Object.freeze({
            badge: 'Planirano održavanje',
            title: 'Održavanje servera',
            message: 'Trenutno unapređujemo YotB kako bi igra radila još bolje.',
            returnLater: 'Vratite se malo kasnije.',
            retry: 'Proveri ponovo',
            checking: 'Proveravamo dostupnost servera…',
            automatic: 'Automatski proveravamo kada je server ponovo spreman.',
            stillActive: 'Održavanje još traje. Pokušajte ponovo uskoro.',
            unavailable: 'Server trenutno nije dostupan. Pokušaćemo ponovo automatski.',
            restored: 'Server je ponovo spreman. Pokrećemo igru…',
            label: 'YotB održavanje servera'
        }),
        en: Object.freeze({
            badge: 'Scheduled maintenance',
            title: 'Server maintenance',
            message: 'We are improving YotB to make the game run even better.',
            returnLater: 'Please come back a little later.',
            retry: 'Check again',
            checking: 'Checking server availability…',
            automatic: 'We will automatically check when the server is ready again.',
            stillActive: 'Maintenance is still in progress. Please try again soon.',
            unavailable: 'The server is currently unavailable. We will try again automatically.',
            restored: 'The server is ready again. Starting the game…',
            label: 'YotB server maintenance'
        })
    });

    const state = {
        active: false,
        checking: false,
        timer: 0,
        reloadTimer: 0,
        standalone: false
    };

    function localPreviewParam(name) {
        if (!['localhost', '127.0.0.1'].includes(window.location.hostname)) return '';
        return new URLSearchParams(window.location.search).get(name) || '';
    }

    function currentLanguage() {
        const previewLanguage = localPreviewParam('maintenance-lang');
        if (previewLanguage === 'sr' || previewLanguage === 'en') return previewLanguage;
        return localStorage.getItem('yamb_lang') === 'en' ? 'en' : 'sr';
    }

    function currentTheme() {
        const previewTheme = localPreviewParam('maintenance-theme');
        if (THEMES.includes(previewTheme)) return previewTheme;
        const body = document.body;
        const classTheme = THEMES.find(theme => theme !== 'dark' && body?.classList.contains(`${theme}-theme`));
        if (classTheme) return classTheme;

        const accountTheme = localStorage.getItem('yamb_theme');
        const rememberedTheme = localStorage.getItem('yamb_last_theme');
        const hasActiveAccount = !!localStorage.getItem('yamb_uid');
        const storedTheme = hasActiveAccount && THEMES.includes(accountTheme)
            ? accountTheme
            : (THEMES.includes(rememberedTheme) ? rememberedTheme : accountTheme);
        const candidates = [
            document.documentElement?.dataset?.splashTheme,
            window.yambBootTheme,
            storedTheme
        ];
        return candidates.find(theme => THEMES.includes(theme)) || 'dark';
    }

    function serverBaseUrl() {
        try {
            if (typeof SERVER_URL !== 'undefined' && SERVER_URL) return new URL(SERVER_URL, window.location.href).origin;
        } catch (_) {}
        return window.location.origin;
    }

    function ensureOverlay() {
        let overlay = document.getElementById('yamb-maintenance-overlay');
        if (overlay) return overlay;

        overlay = document.createElement('section');
        overlay.id = 'yamb-maintenance-overlay';
        overlay.className = 'yamb-maintenance';
        overlay.hidden = true;
        overlay.setAttribute('role', 'alertdialog');
        overlay.setAttribute('aria-modal', 'true');
        overlay.setAttribute('aria-labelledby', 'yamb-maintenance-title');
        overlay.innerHTML = `
            <div class="yamb-maintenance__safe-stage">
                <div class="yamb-maintenance__panel">
                    <img class="yamb-maintenance__brand" alt="Yamb of the Balkan" decoding="async">
                    <div class="yamb-maintenance__badge">
                        <span class="yamb-maintenance__pulse" aria-hidden="true"></span>
                        <span data-maintenance-copy="badge"></span>
                    </div>
                    <h1 id="yamb-maintenance-title" class="yamb-maintenance__title" data-maintenance-copy="title"></h1>
                    <p class="yamb-maintenance__message">
                        <span data-maintenance-copy="message"></span>
                        <strong class="yamb-maintenance__return" data-maintenance-copy="returnLater"></strong>
                    </p>
                    <button class="yamb-maintenance__retry" type="button" data-maintenance-copy="retry"></button>
                    <p class="yamb-maintenance__note" role="status" aria-live="polite"></p>
                </div>
            </div>`;
        document.body.appendChild(overlay);
        overlay.querySelector('.yamb-maintenance__retry')?.addEventListener('click', () => check(true));
        return overlay;
    }

    function syncTheme() {
        const overlay = ensureOverlay();
        const theme = currentTheme();
        overlay.dataset.maintenanceTheme = theme;
        const brand = overlay.querySelector('.yamb-maintenance__brand');
        if (brand && brand.getAttribute('src') !== BRAND_ASSETS[theme]) brand.src = BRAND_ASSETS[theme];
    }

    function syncLanguage() {
        const overlay = ensureOverlay();
        const language = currentLanguage();
        const copy = COPY[language];
        if (state.standalone) {
            document.documentElement.lang = language;
            document.title = language === 'en' ? 'YotB — Server maintenance' : 'YotB — Održavanje servera';
        }
        overlay.setAttribute('aria-label', copy.label);
        overlay.querySelectorAll('[data-maintenance-copy]').forEach(element => {
            const key = element.getAttribute('data-maintenance-copy');
            if (key && Object.prototype.hasOwnProperty.call(copy, key)) element.textContent = copy[key];
        });
        if (!overlay.querySelector('.yamb-maintenance__note')?.textContent?.trim()) setNote('automatic');
    }

    function setNote(key) {
        const note = ensureOverlay().querySelector('.yamb-maintenance__note');
        if (note) note.textContent = COPY[currentLanguage()][key] || '';
    }

    function show(options = {}) {
        const overlay = ensureOverlay();
        state.active = true;
        syncTheme();
        syncLanguage();
        if (options.noteKey) setNote(options.noteKey);
        overlay.hidden = false;
        overlay.setAttribute('aria-hidden', 'false');
        document.documentElement.classList.add('yamb-maintenance-active');
        document.body.classList.add('yamb-maintenance-active');
        window.clearInterval(state.timer);
        state.timer = window.setInterval(() => check(false), 15000);
        window.setTimeout(() => overlay.querySelector('.yamb-maintenance__retry')?.focus({ preventScroll: true }), 0);
        return true;
    }

    function isMaintenanceError(error) {
        const code = String(error?.data?.code || error?.code || '').toLowerCase();
        const reason = String(error?.data?.reason || '').toLowerCase();
        return code === 'server_maintenance' || reason === 'server_maintenance';
    }

    function handleSocketError(error) {
        if (!isMaintenanceError(error)) return false;
        show({ noteKey: 'automatic' });
        return true;
    }

    async function fetchStatus() {
        const response = await fetch(`${serverBaseUrl()}/healthz?maintenance-check=${Date.now()}`, {
            method: 'GET',
            cache: 'no-store',
            credentials: 'omit',
            headers: { Accept: 'application/json' }
        });
        if (!response.ok) throw new Error(`health_status_${response.status}`);
        return response.json();
    }

    async function check(manual = false) {
        if (state.checking) return;
        state.checking = true;
        const overlay = ensureOverlay();
        const button = overlay.querySelector('.yamb-maintenance__retry');
        if (button) button.disabled = true;
        if (manual) setNote('checking');

        try {
            const status = await fetchStatus();
            if (status?.maintenance === true) {
                show({ noteKey: manual ? 'stillActive' : 'automatic' });
                return;
            }

            if (state.active || state.standalone) {
                show({ noteKey: 'restored' });
                window.clearTimeout(state.reloadTimer);
                state.reloadTimer = window.setTimeout(() => window.location.replace('/'), 650);
            }
        } catch (_) {
            if (manual && (state.active || state.standalone)) setNote('unavailable');
        } finally {
            state.checking = false;
            if (button) button.disabled = false;
        }
    }

    function start() {
        state.standalone = document.body.hasAttribute('data-maintenance-standalone');
        ensureOverlay();
        syncTheme();
        syncLanguage();
        if (state.standalone) show({ noteKey: 'automatic' });
        void check(false);

        window.addEventListener('online', () => void check(false));
        window.addEventListener('pageshow', () => void check(false));
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') void check(false);
        });
        window.addEventListener('yamb:languageChanged', syncLanguage);

        const observer = new MutationObserver(() => {
            if (state.active || state.standalone) syncTheme();
        });
        observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });

        window.setInterval(() => {
            if (!state.active && !state.standalone) void check(false);
        }, 20000);
    }

    window.yambMaintenance = Object.freeze({
        show,
        check,
        handleSocketError,
        isMaintenanceError,
        syncTheme,
        syncLanguage
    });

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
    else start();
})();
