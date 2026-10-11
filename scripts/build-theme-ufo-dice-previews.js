/** Compose a rounded, three-sided gift-skin die into each theme's UFO beam. */
const fs = require('node:fs');
const path = require('node:path');
const { createCanvas, loadImage } = require('@napi-rs/canvas');
const { FACE_VALUES, PIPS, renderThemeDie } = require('./render-theme-die-3d');

const ROOT = path.resolve(__dirname, '..');
const WIDTH = 1536;
const HEIGHT = 1024;
const THEMES = {
  light: { skin: 'theme_light_gold', pip: '#98602B', rim: '#FFE8AE', left: '#C9934D', bottom: '#B17A36', glow: '#FFF1D7' },
  medium: { skin: 'theme_dark_cherry', pip: '#6D2530', rim: '#F8D0BE', left: '#9E4650', bottom: '#71303B', glow: '#F2B8A8' },
  winter: { skin: 'theme_blue_ocean', pip: '#125B9A', rim: '#FFF7E6', left: '#3A8BC2', bottom: '#14629E', glow: '#B5E6FF' },
  neon: { skin: 'theme_neon_cyber', pip: '#F08CE3', rim: '#56E5D2', left: '#214F79', bottom: '#0C2446', glow: '#56E5D2' },
  amethyst: { skin: 'theme_royal_amethyst', pip: '#603E75', rim: '#F0DCF5', left: '#87649B', bottom: '#5B3C72', glow: '#E0CDE5' },
  easter: { skin: 'theme_easter', pip: '#9B6743', rim: '#FFF7E9', left: '#B9BE9A', bottom: '#899776', glow: '#FFF8EA' },
  desert: { skin: 'theme_desert', pip: '#1E6A6C', rim: '#FFE2B9', left: '#C8895C', bottom: '#A66E4A', glow: '#F8D9B0' },
  moon: { skin: 'theme_moonlight', pip: '#3D4655', rim: '#EDF2FB', left: '#969FAF', bottom: '#5C6879', glow: '#D7DEEB' },
  severna: { skin: 'theme_northern_nebula', pip: '#215779', rim: '#E6FAFF', left: '#79B6D6', bottom: '#3C80AA', glow: '#C6F4FF' },
};

async function build(theme) {
  const colors = THEMES[theme];
  if (!colors) throw new Error(`Unknown theme: ${theme}`);
  const dir = path.join(ROOT, 'source-assets', 'theme-icon-packs', theme, 'treasury-effect-previews-v2');
  const basePath = path.join(dir, 'preview-ufo-abduction-background.png');
  const skinPath = path.join(ROOT, 'www', 'assets', 'dice-skins-v1', `${colors.skin}-face-v1.png`);
  const outputPath = path.join(dir, 'preview-ufo-abduction-generated.png');
  const [base, die] = await Promise.all([loadImage(basePath), renderThemeDie(skinPath, colors)]);
  if (base.width !== WIDTH || base.height !== HEIGHT) throw new Error(`${theme}: unexpected base dimensions`);
  const canvas = createCanvas(WIDTH, HEIGHT);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(base, 0, 0);
  ctx.save();
  ctx.shadowColor = colors.glow;
  ctx.shadowBlur = 24;
  ctx.drawImage(die, 568, 460, 384, 384);
  ctx.restore();
  fs.writeFileSync(outputPath, canvas.toBuffer('image/png'));
  console.log(`${theme}: ${outputPath}`);
}

async function main() {
  const requested = process.argv.slice(2);
  const themes = requested.length ? requested : Object.keys(THEMES);
  for (const theme of themes) await build(theme);
}

if (require.main === module) {
  main().catch(error => { console.error(error); process.exitCode = 1; });
}

module.exports = { FACE_VALUES, PIPS, THEMES };
