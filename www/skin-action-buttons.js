(() => {
    'use strict';

    const catalog = window.SKIN_ACTION_BUTTONS || {};
    const scene = document.getElementById('game-scene');
    if (!scene || !catalog.default) return;

    let appliedId = null;
    let requestedId = null;
    let requestNumber = 0;
    const imageCache = new Map();
    const pendingSkins = new Map();
    let trimTimer = null;
    const MAX_CACHED_IMAGES = 96;
    const sourcesForSkin = id => {
        const entry = catalog[id];
        return [
            `assets/dice-skins-v1/${id}-face-v1.png`,
            ...['roll', 'announce', 'cancel'].map(state => entry[state].src),
            ...Object.values(window.SKIN_ROLL_COUNTER?.[id] || {})
        ];
    };
    const isPrepared = id => sourcesForSkin(id).every(source => imageCache.get(source)?.ready);

    function trimImageCache() {
        trimTimer = null;
        const protectedSources = new Set();
        // Keep the visible skin and every still-preparing pack intact. A
        // background warmup must not evict images the foreground caller awaits.
        for (const id of new Set([appliedId, selectedSkinId(), ...pendingSkins.keys()])) {
            if (catalog[id]) sourcesForSkin(id).forEach(source => protectedSources.add(source));
        }
        for (const [source, entry] of imageCache) {
            if (imageCache.size <= MAX_CACHED_IMAGES) break;
            if (!entry.ready || protectedSources.has(source)) continue;
            imageCache.delete(source);
        }
    }

    function scheduleTrim() {
        // Let prepare's awaiting consumer activate the selected pack in this
        // turn before the next task trims completed background preparations.
        if (trimTimer === null) trimTimer = setTimeout(trimImageCache, 0);
    }

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
            return cached.promise;
        }
        const entry = { ready: false, promise: null };
        const pending = new Promise((resolve, reject) => {
            const image = new Image();
            let handled = false;
            image.onload = async () => {
                if (handled) return;
                handled = true;
                try {
                    if (typeof image.decode === 'function') await image.decode();
                    entry.ready = true;
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
        entry.promise = pending;
        imageCache.set(src, entry);
        // Unfinished entries remain shared; completed retention returns to its
        // bound after preparations settle, without discarding in-flight Images.
        pending.then(scheduleTrim, () => {
            if (imageCache.get(src) === entry) imageCache.delete(src);
            scheduleTrim();
        });
        return pending;
    }

    function prepare(id) {
        const entry = catalog[id];
        if (!entry) return Promise.reject(new Error(`Unknown skin: ${id}`));
        if (isPrepared(id)) return Promise.resolve();
        if (pendingSkins.has(id)) return pendingSkins.get(id);
        const pending = Promise.all(sourcesForSkin(id).map(preload))
            .finally(() => { pendingSkins.delete(id); scheduleTrim(); });
        pendingSkins.set(id, pending);
        return pending;
    }

    function activatePrepared(id) {
        if (!isPrepared(id) || selectedSkinId() !== id) return false;
        const entry = catalog[id];
        ++requestNumber;
        requestedId = null;
        for (const state of ['roll', 'announce', 'cancel']) {
            scene.style.setProperty(`--skin-${state}-png`, `url("${entry[state].src}")`);
            scene.style.setProperty(`--skin-${state}-ink`, entry[state].ink);
        }
        scene.dataset.actionSkinReady = id;
        appliedId = id;
        return true;
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
        requestedId = id;
        const request = ++requestNumber;

        // Keep the previous complete set visible until the face, buttons and counter are decoded.
        prepare(id)
            .then(() => {
                if (request !== requestNumber) return;
                activatePrepared(id);
            })
            .catch(() => {
                // Keep the last complete skin visible if one asset fails.
            })
            .finally(() => {
                if (request === requestNumber) requestedId = null;
            });
    }

    window.skinActionButtons = { sync, prepare, activatePrepared };
    sync();
    window.addEventListener('storage', event => {
        if (event.key === 'yamb_active_skin') sync();
    });
})();
