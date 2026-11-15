(function () {
    'use strict';
    const field = () => document.getElementById('referral-code');
    const panel = () => document.getElementById('referral-entry');
    const share = () => document.getElementById('player-mailbox-referral');
    const normalize = value => /^[A-F0-9]{12}$/i.test(value?.trim()) ? value.trim().toUpperCase() : '';
    let enabled = false;
    const pendingKey = 'yamb_pending_referral';
    let saved = {};
    try { saved = JSON.parse(localStorage.getItem(pendingKey) || '{}') || {}; } catch (_) {}
    let pendingCode = normalize(saved.code);
    let selectedForUid = pendingCode && typeof saved.uid === 'string' ? saved.uid : '';

    function savePending() {
        if (pendingCode) localStorage.setItem(pendingKey, JSON.stringify({ code: pendingCode, uid: selectedForUid }));
        else localStorage.removeItem(pendingKey);
    }

    function acceptLink(value) {
        try {
            const url = new URL(value);
            if (url.origin !== new URL(SERVER_URL).origin) return;
            const code = normalize(url.searchParams.get('ref'));
            if (!code || localStorage.getItem('yamb_uid')) return;
            selectedForUid = '';
            pendingCode = code;
            savePending();
            if (field()) field().value = code;
            if (panel()) panel().open = true;
        } catch (_) {}
    }

    function codeForSync(uid) {
        if (!uid || (selectedForUid && uid !== selectedForUid)) return '';
        const code = normalize(field()?.value || pendingCode);
        if (code) {
            pendingCode = code;
            selectedForUid = uid;
            savePending();
        }
        return code;
    }

    function acknowledge(payload) {
        if (!payload?.referralChecked || payload.recipientUid !== selectedForUid
            || payload.recipientUid !== localStorage.getItem('yamb_uid')) return;
        selectedForUid = '';
        pendingCode = '';
        savePending();
        if (field()) field().value = '';
        if (panel()) panel().open = false;
    }

    async function shareInvite() {
        const button = share();
        const uid = localStorage.getItem('yamb_uid');
        if (!enabled || !button || !uid || button.disabled || !window.app) return;
        const status = document.getElementById('player-mailbox-manage-status');
        button.disabled = true;
        try {
            if (!(await window.app.authenticateSocketIdentity())?.ok) throw new Error('auth');
            const result = await window.app.emitSocketAck('player_referral_code', {}, 7000);
            if (localStorage.getItem('yamb_uid') !== uid) return;
            if (!result?.ok || result.recipientUid !== uid || !result.code || normalize(result.code) !== result.code) throw new Error('code_unavailable');
            const url = new URL('/referral.html', SERVER_URL);
            url.searchParams.set('ref', result.code);
            url.searchParams.set('lang', localStorage.getItem('yamb_lang') === 'en' ? 'en' : 'sr');
            const title = t('referral_share_title');
            const native = window.Capacitor?.Plugins?.AccountIdentity;
            if (native && url.protocol === 'https:') {
                await native.shareReferral({ title, url: url.href });
            } else if (navigator.share && navigator.userActivation?.isActive) {
                await navigator.share({ title, url: url.href });
            } else if (await navigator.clipboard?.writeText(url.href).then(() => true, () => false)) {
                if (status && !button.hidden) status.textContent = t('referral_copied');
            } else window.prompt(t('referral_copy'), url.href);
        } catch (error) {
            if (error.name !== 'AbortError' && status && !button.hidden) status.textContent = t('mailbox_unavailable');
        } finally { button.disabled = false; }
    }

    window.yambReferrals = { codeForSync, acknowledge, acceptLink, isEnabled: () => enabled };
    document.addEventListener('DOMContentLoaded', () => {
        share()?.addEventListener('click', shareInvite);
        if (field()) {
            field().value = pendingCode;
            if (pendingCode && panel()) panel().open = true;
            field().addEventListener('input', () => {
                if (localStorage.getItem('yamb_uid')) return;
                pendingCode = normalize(field().value);
                selectedForUid = '';
                savePending();
            });
        }
        acceptLink(location.href);
        window.Capacitor?.Plugins?.App?.getLaunchUrl?.()
            ?.then(result => acceptLink(result?.url)).catch(() => {});
        fetch(new URL('/api/referrals/config', SERVER_URL), { cache: 'no-store', signal: AbortSignal.timeout(5000) })
            .then(response => response.ok ? response.json() : null)
            .then(config => {
                enabled = config?.enabled === true;
                if (panel()) panel().hidden = !enabled;
                window.dispatchEvent(new Event('yamb:referralConfig'));
            }).catch(() => {});
    });
})();
