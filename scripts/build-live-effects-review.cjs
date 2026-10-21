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
    .replace('href="/efekti.css?v=2.0"', 'href="efekti.css?v=2.0"')
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
  document.getElementById('theme-choice').addEventListener('change', event => setTheme(event.target.value));
  document.querySelectorAll('[data-effect]').forEach(button => button.addEventListener('click', () => {
    fx.stop();
    if (button.dataset.effect !== 'stop') fx.trigger(button.dataset.effect);
  }));
  window.qaFx = { fx, setTheme, run(id) { fx.stop(); fx.trigger(id); }, state() { return {
    theme: document.documentElement.dataset.splashTheme,
    coinCount: document.querySelectorAll('.gold-rain-particle').length,
    coinSources: [...new Set([...document.querySelectorAll('.gold-rain-particle')].map(node => node.getAttribute('src')))],
    confettiActive: Boolean(fx.confettiAnimationId)
  }; } };
  const effect = params.get('effect');
  if (effect === 'confetti' || effect === 'gold_rain') fx.trigger(effect);
  </script>
</body>`;
html = html.replace(/  <script>[\s\S]*?  <\/script>\s*<\/body>/, boot);
fs.writeFileSync(path.join(root, 'docs/theme-live-effects-review.html'), html);
console.log('Built docs/theme-live-effects-review.html from the active EffectManager.');
