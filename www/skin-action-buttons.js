(() => {
    'use strict';

    const catalog = window.SKIN_ACTION_BUTTONS || {};
    const scene = document.getElementById('game-scene');
    if (!scene || !catalog.default) return;

    let appliedId = null;
    let requestedId = null;
    let requestNumber = 0;
    const imageCache = new Map();
    const MAX_CACHED_IMAGES = 96;

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
        if (imageCache.has(src)) {
            const cached = imageCache.get(src);
            imageCache.delete(src);
            imageCache.set(src, cached);
            return cached;
        }
        const pending = new Promise((resolve, reject) => {
            const image = new Image();
            let handled = false;
            image.onload = async () => {
                if (handled) return;
                handled = true;
                try {
                    if (typeof image.decode === 'function') await image.decode();
                    resolve(image);
                } catch (error) {
                    reject(error);
                }
            };
            image.onerror = error => {
                if (handled) return;
                handled = true;
                reject(error);
            };
            image.src = src;
            if (image.complete && image.naturalWidth) image.onload();
        });
        imageCache.set(src, pending);
        while (imageCache.size > MAX_CACHED_IMAGES) imageCache.delete(imageCache.keys().next().value);
        pending.catch(() => { if (imageCache.get(src) === pending) imageCache.delete(src); });
        return pending;
    }

    function prepare(id) {
        const entry = catalog[id];
        if (!entry) return Promise.reject(new Error(`Unknown skin: ${id}`));
        const counterStates = Object.values(window.SKIN_ROLL_COUNTER?.[id] || {});
        return Promise.all([
            `assets/dice-skins-v1/${id}-face-v1.png`,
            ...['roll', 'announce', 'cancel'].map(state => entry[state].src),
            ...counterStates
        ].map(preload));
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

        // Keep the previous complete set visible until the face, buttons and counter are decoded.
        prepare(id)
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
                // Keep the last complete skin visible if one asset fails.
            })
            .finally(() => {
                if (request === requestNumber) requestedId = null;
            });
    }

    window.skinActionButtons = { sync, prepare };
    sync();
    window.addEventListener('storage', event => {
        if (event.key === 'yamb_active_skin') sync();
    });
})();
