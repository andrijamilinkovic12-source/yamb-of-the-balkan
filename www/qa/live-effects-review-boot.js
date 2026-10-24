function bootLiveEffectsReview(EffectManager) {
    const fx = new EffectManager();
    const params = new URLSearchParams(location.search);
    const themes = ['dark', 'light', 'medium', 'winter', 'neon', 'amethyst', 'easter', 'desert', 'moon', 'severna'];
    const effects = ['confetti', 'gold_rain', 'fireflies', 'bubbles', 'ice_age', 'black_hole', 'supernova',
        'neon_pulse', 'thunder', 'balkan', 'fireworks', 'drones', 'cosmic_dust', 'ufo_abduction', 'dragon_fire', 'royal_yamb'];
    const backgrounds = { dark: 'green-clay-balkan-diorama-v4.png', light: 'theme-backgrounds/light-v9.png', medium: 'theme-backgrounds/medium-v9.png', winter: 'theme-backgrounds/winter-v13.png', neon: 'theme-backgrounds/neon-v4.png', amethyst: 'theme-backgrounds/amethyst-v6.png', easter: 'theme-backgrounds/easter-v6-1.png', desert: 'theme-backgrounds/desert-v8-2.png', moon: 'theme-backgrounds/moon-v14.png', severna: 'theme-backgrounds/severna-v4.png' };
    let effect = effects.includes(params.get('effect')) ? params.get('effect') : 'neon_pulse';
    const board = document.querySelector('.qa-board');
    const card = document.querySelector('.card');
    document.getElementById('qa-board-grid').innerHTML = Array.from({ length: 84 }, (_, index) =>
        '<span>' + (index % 7 === 0 ? ['1', '2', '3', '4', '5', '6', 'MAX', 'MIN', 'K', 'F', 'Y', 'Σ'][Math.floor(index / 7)]
            : index < 7 ? ['', '↓', '↑', '↕', 'N', 'R', 'Σ'][index] : index % 3 === 0 ? '48' : '') + '</span>').join('');
    window.app ||= { playerName: 'Andrija' };
    const run = id => {
        fx.stop(); effect = id;
        document.getElementById('effect-choice').value = id;
        const onBoard = !['confetti', 'gold_rain', 'fireflies', 'bubbles'].includes(id);
        board.hidden = !onBoard; card.hidden = onBoard;
        fx.trigger(id);
    };
    const setTheme = id => {
        fx.stop();
        themes.slice(1).forEach(themeId => document.body.classList.toggle(themeId + '-theme', id === themeId));
        document.documentElement.dataset.splashTheme = id;
        document.getElementById('theme-choice').value = id;
        document.body.style.setProperty('--theme-background', "url('assets/" + backgrounds[id] + "')");
    };
    setTheme(themes.includes(params.get('theme')) ? params.get('theme') : 'dark');
    document.getElementById('theme-choice').addEventListener('change', event => { setTheme(event.target.value); run(effect); });
    document.getElementById('effect-choice').addEventListener('change', event => run(event.target.value));
    document.querySelector('[data-effect="play"]').addEventListener('click', () => run(effect));
    document.querySelector('[data-effect="stop"]').addEventListener('click', () => fx.stop());
    window.qaFx = { fx, setTheme, run, state() { return {
        theme: document.documentElement.dataset.splashTheme, effect,
        stage: document.querySelector('.live-stage-effect')?.dataset || null,
        supernovaPhase: document.querySelector('.supernova-container')?.dataset.phase || null,
        supernovaSource: document.querySelector('.supernova-plasma')?.getAttribute('src') || null
    }; } };
    run(effect);
}
