/* A themed Settings picker; the original select remains the entitlement source. */
(() => {
    'use strict';
    let select, trigger, triggerName, triggerIcon, triggerCaption, overlay, options, closeButton, title;
    let lastFocus = null;
    const isEnglish = () => document.documentElement.lang === 'en';
    const wording = () => isEnglish()
        ? { caption:'Theme', title:'Choose a theme', active:'Active', locked:'Locked · Treasury', close:'Close theme picker' }
        : { caption:'Tema', title:'Izaberi temu', active:'Aktivna', locked:'Zaključana · Riznica', close:'Zatvori izbor tema' };
    const currentTheme = () => window.themeGameHeader?.activeTheme?.() || 'dark';
    // The theme choice shows the same approved scene used by the Treasury.
    // Settings-room PNGs remain on the room heading and section controls.
    const previewSource = theme => `assets/treasury-theme-previews/${theme}-v1.png`;
    const cleanName = value => String(value || '')
        .replace(/\s*🔒\s*/gu, ' ')
        .replace(/[\p{Extended_Pictographic}\uFE0F]/gu, '')
        .replace(/\s+/g, ' ').trim();
    const nameFor = id => cleanName([...select.options].find(option => option.value === id)?.textContent || id);
    const unlocked = () => new Set(window.app?.getUnlockedThemeIds?.() || ['dark','light','medium','winter']);

    const refresh = () => {
        if (!select || !trigger) return;
        const active = currentTheme();
        const words = wording();
        triggerName.textContent = nameFor(active);
        triggerCaption.textContent = words.caption;
        triggerIcon.src = previewSource(active);
        trigger.setAttribute('aria-label', `${words.caption}: ${nameFor(active)}. ${words.title}`);
        title.textContent = words.title;
        closeButton.setAttribute('aria-label', words.close);
        document.querySelectorAll('#settings-screen .settings-language-btn[data-settings-lang]').forEach(button => {
            button.setAttribute('aria-pressed', String(button.dataset.settingsLang === (isEnglish() ? 'en' : 'sr')));
        });
        if (!overlay.hidden) renderOptions();
    };
    const renderOptions = () => {
        options.replaceChildren();
        const active = currentTheme();
        const allowed = unlocked();
        const words = wording();
        const lockSource = window.themeGameHeader?.asset?.('lock', active);
        for (const option of select.options) {
            const theme = option.value;
            const permitted = allowed.has(theme);
            const row = document.createElement('button');
            row.type = 'button';
            row.className = 'settings-theme-option';
            row.dataset.theme = theme;
            row.setAttribute('aria-disabled', String(!permitted));
            if (theme === active) row.setAttribute('aria-current', 'true');

            const preview = document.createElement('img');
            preview.className = 'settings-theme-option-icon';
            preview.src = previewSource(theme);
            preview.alt = '';
            preview.setAttribute('aria-hidden', 'true');
            preview.loading = 'lazy';

            const copy = document.createElement('span');
            copy.className = 'settings-theme-option-copy';
            const name = document.createElement('strong');
            name.textContent = nameFor(theme);
            const state = document.createElement('small');
            state.textContent = theme === active ? words.active : (!permitted ? words.locked : '');
            copy.append(name, state);
            row.append(preview, copy);
            if (!permitted && lockSource) {
                const lock = document.createElement('img');
                lock.className = 'settings-theme-option-lock';
                lock.src = lockSource;
                lock.alt = '';
                lock.setAttribute('aria-hidden', 'true');
                row.append(lock);
            }
            row.addEventListener('click', () => {
                if (!permitted) return;
                close();
                if (theme !== currentTheme()) window.app?.saveSettingAuto?.('theme', theme);
            });
            options.append(row);
        }
    };
    const open = () => {
        if (!overlay || !overlay.hidden) return;
        window.app?.syncThemeSelectOptions?.(select);
        lastFocus = document.activeElement;
        renderOptions();
        overlay.hidden = false;
        trigger.setAttribute('aria-expanded', 'true');
        const selected = options.querySelector('[aria-current="true"]');
        (selected || options.querySelector('button') || closeButton).focus();
    };
    const close = () => {
        if (!overlay || overlay.hidden) return;
        overlay.hidden = true;
        trigger.setAttribute('aria-expanded', 'false');
        (lastFocus?.isConnected ? lastFocus : trigger).focus();
    };
    const onKeyDown = event => {
        if (overlay.hidden) return;
        if (event.key === 'Escape') { event.preventDefault(); close(); return; }
        if (event.key !== 'Tab') return;
        const focusable = [closeButton, ...options.querySelectorAll('button')];
        const first = focusable[0], last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
            event.preventDefault(); last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault(); first.focus();
        }
    };
    const start = () => {
        select = document.getElementById('setting-theme');
        trigger = document.getElementById('settings-theme-trigger');
        triggerName = document.getElementById('settings-theme-trigger-name');
        triggerIcon = document.getElementById('settings-theme-trigger-icon');
        triggerCaption = document.getElementById('settings-theme-trigger-caption');
        overlay = document.getElementById('settings-theme-overlay');
        options = document.getElementById('settings-theme-options');
        closeButton = document.getElementById('settings-theme-dialog-close');
        title = document.getElementById('settings-theme-dialog-title');
        if (!select || !trigger || !overlay || !options) return;
        trigger.addEventListener('click', open);
        closeButton.addEventListener('click', close);
        overlay.addEventListener('click', event => { if (event.target === overlay) close(); });
        document.addEventListener('keydown', onKeyDown);
        window.addEventListener('yamb:languageChanged', refresh);
        new MutationObserver(refresh).observe(document.body, { attributes:true, attributeFilter:['class'] });
        refresh();
    };
    window.themeSettingsPicker = { open, close, refresh, previewSource };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once:true });
    else start();
})();
