(() => {
    'use strict';

    const catalog = window.SKIN_ACTION_BUTTONS || {};
    const scene = document.getElementById('game-scene');
    if (!scene || !catalog.default) return;

    let appliedId = null;
    let requestedId = null;
    let requestNumber = 0;

    function selectedSkinId() {
        const saved = localStorage.getItem('yamb_active_skin') || 'default';
        const skins = (typeof SHOP_DATA !== 'undefined' && Array.isArray(SHOP_DATA.SKINS))
            ? SHOP_DATA.SKINS : [];
        const selected = skins.find(item => item.id === saved);
        if (!catalog[saved] || (skins.length && !selected)) return 'default';
        if (selected?.themeGift && !window.app?.isThemeUnlocked(selected.themeGift)) return 'default';
        return saved;
    }

    function preload(src) {
        return new Promise((resolve, reject) => {
            const image = new Image();
            image.onload = resolve;
            image.onerror = reject;
            image.src = src;
            if (image.complete && image.naturalWidth) resolve();
        });
    }

    function sync() {
        const id = selectedSkinId();
        if (id === appliedId) {
            if (requestedId) {
                ++requestNumber;
                requestedId = null;
                scene.dataset.actionSkinReady = id;
            }
            return;
        }
        if (id === requestedId) return;
        const entry = catalog[id];
        requestedId = id;
        const request = ++requestNumber;

        // Never show the previous skin while the new PNGs are decoding.
        scene.removeAttribute('data-action-skin-ready');
        Promise.all(['roll', 'announce', 'cancel'].map(state => preload(entry[state].src)))
            .then(() => {
                if (request !== requestNumber) return;
                for (const state of ['roll', 'announce', 'cancel']) {
                    scene.style.setProperty(`--skin-${state}-png`, `url("${entry[state].src}")`);
                    scene.style.setProperty(`--skin-${state}-ink`, entry[state].ink);
                }
                scene.dataset.actionSkinReady = id;
                appliedId = id;
            })
            .catch(() => {
                // Keep the board palette button as the visible fallback.
                if (request === requestNumber) appliedId = null;
            })
            .finally(() => {
                if (request === requestNumber) requestedId = null;
            });
    }

    window.skinActionButtons = { sync };
    sync();
    window.addEventListener('storage', event => {
        if (event.key === 'yamb_active_skin') sync();
    });
})();
