const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'www/managers.js'), 'utf8');
const prelude = source.slice(source.indexOf('const YAMB_THEME_IDS ='), source.indexOf('const filterYambThemeIds'));
const effectClass = source.slice(source.indexOf('class EffectManager {'), source.indexOf('class SoundManager {'));
if (!prelude.includes('GOLD_RAIN_THEME_PROFILES') || !effectClass.includes('spawnThemedConfetti')) {
    throw new Error('Live EffectManager source could not be extracted');
}

let html = fs.readFileSync(path.join(root, 'www/qa/theme-live-effects-review.html'), 'utf8');
html = html.replace('<head>', '<head>\n  <base href="../www/">')
    .replace('href="/efekti.css?v=3.4"', 'href="efekti.css?v=3.4"')
    .replaceAll("url('/assets/", "url('assets/");
const boot = `
  <script>
  // This review embeds the same EffectManager source as the application at build time.
  ${prelude}
  ${effectClass}
  const fx = new EffectManager();
  const params = new URLSearchParams(location.search);
  const themes = ['dark', 'light', 'medium', 'winter', 'neon', 'amethyst', 'easter', 'desert', 'moon', 'severna'];
  const backgrounds = { dark: 'green-clay-balkan-diorama-v4.png', light: 'theme-backgrounds/light-v9.png', medium: 'theme-backgrounds/medium-v9.png', winter: 'theme-backgrounds/winter-v13.png', neon: 'theme-backgrounds/neon-v4.png', amethyst: 'theme-backgrounds/amethyst-v6.png', easter: 'theme-backgrounds/easter-v6-1.png', desert: 'theme-backgrounds/desert-v8-2.png', moon: 'theme-backgrounds/moon-v14.png', severna: 'theme-backgrounds/severna-v4.png' };
  const setTheme = id => {
    fx.stop();
    themes.slice(1).forEach(themeId => document.body.classList.toggle(themeId + '-theme', id === themeId));
    document.documentElement.dataset.splashTheme = id;
    document.getElementById('theme-choice').value = id;
    document.body.style.setProperty('--theme-background', "url('assets/" + backgrounds[id] + "')");
  };
  setTheme(themes.includes(params.get('theme')) ? params.get('theme') : 'dark');
  document.getElementById('theme-choice').addEventListener('change', event => {
    setTheme(event.target.value);
    if (effect) { showScene(effect); fx.trigger(effect); }
  });
  const board = document.querySelector('.qa-board');
  const card = document.querySelector('.card');
  document.getElementById('qa-board-grid').innerHTML = Array.from({ length: 84 }, (_, index) => '<span>' + (index % 7 === 0 ? ['1', '2', '3', '4', '5', '6', 'MAX', 'MIN', 'K', 'F', 'Y', 'Σ'][Math.floor(index / 7)] : index < 7 ? ['', '↓', '↑', '↕', 'N', 'R', 'Σ'][index] : index % 3 === 0 ? '48' : '') + '</span>').join('');
  const showScene = effect => { const onBoard = effect === 'ice_age' || effect === 'black_hole' || effect === 'supernova'; board.hidden = !onBoard; card.hidden = onBoard; };
  document.querySelectorAll('[data-effect]').forEach(button => button.addEventListener('click', () => {
    fx.stop();
    if (button.dataset.effect !== 'stop') { showScene(button.dataset.effect); fx.trigger(button.dataset.effect); }
  }));
  window.qaFx = { fx, setTheme, run(id) { fx.stop(); fx.trigger(id); }, state() { return {
    theme: document.documentElement.dataset.splashTheme,
    coinCount: document.querySelectorAll('.gold-rain-particle').length,
    coinSources: [...new Set([...document.querySelectorAll('.gold-rain-particle')].map(node => node.getAttribute('src')))],
    confettiActive: Boolean(fx.confettiAnimationId),
    fireflyCount: document.querySelectorAll('.magic-firefly__sprite').length,
    fireflySources: [...new Set([...document.querySelectorAll('.magic-firefly__sprite')].map(node => node.getAttribute('src')))],
    bubbleCount: document.querySelectorAll('.magic-bubble').length,
    bubbleSources: [...new Set([...document.querySelectorAll('.magic-bubble')].map(node => node.getAttribute('src')))],
    iceFrostCount: document.querySelectorAll('.ice-age-frost').length,
    iceOverlayCount: document.querySelectorAll('.ice-overlay-container').length,
    blackHoleCount: document.querySelectorAll('.black-hole-container').length,
    blackHoleSources: [...new Set([...document.querySelectorAll('.black-hole-sprite')].map(node => node.getAttribute('src')))],
    supernovaCount: document.querySelectorAll('.supernova-container').length,
    supernovaSource: document.querySelector('.supernova-plasma')?.getAttribute('src') || null,
    supernovaPhase: document.querySelector('.supernova-container')?.dataset.phase || null
  }; } };
  const effect = params.get('effect');
  if (['confetti', 'gold_rain', 'fireflies', 'bubbles', 'ice_age', 'black_hole', 'supernova'].includes(effect)) { showScene(effect); fx.trigger(effect); }
  </script>
</body>`;
html = html.replace(/  <script>[\s\S]*?  <\/script>\s*<\/body>/, boot);
fs.writeFileSync(path.join(root, 'docs/theme-live-effects-review.html'), html);
const iceAgeDemo = html
  .replace('<title>Deset tema — pregled živih efekata</title>', '<title>Ledeno doba — animirani pregled</title>')
  .replace("const effect = params.get('effect');", "const effect = params.get('effect') || 'ice_age';");
fs.writeFileSync(path.join(root, 'docs/ice-age-v4-animation.html'), iceAgeDemo);
const blackHoleDemo = html
  .replace('<title>Deset tema — pregled živih efekata</title>', '<title>Crna rupa — animirani pregled</title>')
  .replace("const effect = params.get('effect');", "const effect = params.get('effect') || 'black_hole';");
fs.writeFileSync(path.join(root, 'docs/black-hole-v1-animation.html'), blackHoleDemo);
fs.writeFileSync(path.join(root, 'docs/black-hole-v2-animation.html'), blackHoleDemo);
const supernovaDemo = html
  .replace('<title>Deset tema — pregled živih efekata</title>', '<title>Supernova — animirani pregled</title>')
  .replace("const effect = params.get('effect');", "const effect = params.get('effect') || 'supernova';");
fs.writeFileSync(path.join(root, 'docs/supernova-v2-animation.html'), supernovaDemo);
console.log('Built docs/theme-live-effects-review.html from the active EffectManager.');
