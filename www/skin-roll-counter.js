(() => {
    'use strict';

    const catalog = window.SKIN_ROLL_COUNTER || {};
    const label = document.getElementById('lbl-status');
    const scene = document.getElementById('game-scene');
    if (!label || !scene) return;

    let renderedKey = null;

    function activeSkin() {
        const ready = scene.getAttribute('data-action-skin-ready');
        return ready && catalog[ready] ? ready : null;
    }

    function render(value) {
        const count = Math.max(0, Math.min(3, Number(value) || 0));
        const skin = activeSkin();
        const key = `${skin}:${count}`;
        const name = typeof gt === 'function' ? (gt('status_roll') || 'Bacanje') : 'Bacanje';
        label.setAttribute('role', 'img');
        label.setAttribute('aria-label', `${name}: ${count}/3`);
        if (key === renderedKey) return;
        renderedKey = key;

        if (!skin) {
            label.textContent = count ? `${count}/3` : '';
            return;
        }
        const src = catalog[skin]?.[count];
        if (!src) {
            label.textContent = `${count}/3`;
            return;
        }

        const image = new Image();
        image.className = 'skin-roll-counter-image';
        image.alt = '';
        image.decoding = 'async';
        image.onerror = () => {
            if (renderedKey === key) label.textContent = `${count}/3`;
        };
        image.src = src;
        label.replaceChildren(image);
    }

    window.skinRollCounter = { render };
    render(window.app?.brojBacanja || 0);
    new MutationObserver(() => render(window.app?.brojBacanja || 0))
        .observe(scene, { attributes: true, attributeFilter: ['data-action-skin-ready'] });
})();
