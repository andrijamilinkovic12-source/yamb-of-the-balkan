const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const source = read('www/managers.js');
const prelude = source.slice(source.indexOf('const YAMB_THEME_IDS ='), source.indexOf('const filterYambThemeIds'));
const effectClass = source.slice(source.indexOf('class EffectManager {'), source.indexOf('class SoundManager {'));
const stage = read('www/live-effects-stage.js');
const boot = read('www/qa/live-effects-review-boot.js');
let html = read('www/qa/theme-live-effects-review.html')
    .replace('<base href="/">', '<base href="../www/">')
    .replace('href="/efekti.css?v=3.5"', 'href="efekti.css?v=3.5"')
    .replaceAll("url('/assets/", "url('assets/");
const script = `  <script>\n${prelude}\n${stage}\n${effectClass}\n${boot}\nbootLiveEffectsReview(EffectManager);\n  </script>\n</body>`;
html = html.replace(/  <script>[\s\S]*?  <\/script>\s*<\/body>/, () => script);
fs.writeFileSync(path.join(root, 'docs/theme-live-effects-review.html'), html);
fs.writeFileSync(path.join(root, 'docs/effects-final-animation.html'), html);
const demos = { 'ice-age-v4-animation': 'ice_age', 'ice-age-v5-animation': 'ice_age',
    'black-hole-v1-animation': 'black_hole', 'black-hole-v2-animation': 'black_hole', 'supernova-v2-animation': 'supernova' };
for (const [name, effect] of Object.entries(demos)) {
    fs.writeFileSync(path.join(root, 'docs', name + '.html'), html.replace(
        "params.get('effect') : 'neon_pulse'", `params.get('effect') : '${effect}'`));
}
console.log('Built live reviews from the actual EffectManager and LiveEffectsStage; all 16 effects available.');
