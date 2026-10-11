/** Compose a physically valid 3D die into each theme's individually illustrated UFO beam. */
const fs = require('node:fs');
const path = require('node:path');
const { createCanvas, loadImage } = require('@napi-rs/canvas');

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

// One rigid rotation of the canonical die in docs/theme-definitions.json:
// canonical front 2, right 3, top 1; turn 180 degrees about the vertical axis.
// This exposes front 5, viewer-left 3 and lower 6.
const FACE_VALUES = Object.freeze({ front: 5, left: 3, bottom: 6 });
const PIPS = Object.freeze({
  3: [[0.24, 0.76], [0.50, 0.50], [0.76, 0.24]],
  5: [[0.25, 0.25], [0.75, 0.25], [0.50, 0.50], [0.25, 0.75], [0.75, 0.75]],
  6: [[0.27, 0.22], [0.73, 0.22], [0.27, 0.50], [0.73, 0.50], [0.27, 0.78], [0.73, 0.78]],
});

// Basis vectors of three planar faces. Each face is a real parallelogram, so
// circles and coordinates are transformed together instead of hand-placing dots.
const FACES = Object.freeze({
  left: { origin: [618, 642], u: [70, -60], v: [-65, 175] },
  bottom: { origin: [623, 757], u: [205, 60], v: [-70, 60] },
  front: { origin: [688, 582], u: [205, 60], v: [-65, 175] },
});

function affine(ctx, face) {
  const { origin: [x, y], u: [ux, uy], v: [vx, vy] } = face;
  ctx.transform(ux, uy, vx, vy, x, y);
}

function drawPips(ctx, points, colors, radius) {
  for (const [x, y] of points) {
    ctx.beginPath();
    ctx.ellipse(x, y, radius + 0.014, radius + 0.014, 0, 0, Math.PI * 2);
    ctx.fillStyle = colors.rim;
    ctx.globalAlpha = 0.65;
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.beginPath();
    ctx.ellipse(x, y, radius, radius, 0, 0, Math.PI * 2);
    ctx.fillStyle = colors.pip;
    ctx.fill();
  }
}

function drawSide(ctx, face, value, colors, fill) {
  ctx.save();
  affine(ctx, face);
  const gradient = ctx.createLinearGradient(0, 0, 1, 1);
  gradient.addColorStop(0, colors.rim);
  gradient.addColorStop(0.20, fill);
  gradient.addColorStop(1, colors.bottom);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 1, 1);
  ctx.lineWidth = 0.018;
  ctx.strokeStyle = colors.rim;
  ctx.globalAlpha = 0.45;
  ctx.strokeRect(0.012, 0.012, 0.976, 0.976);
  ctx.globalAlpha = 1;
  drawPips(ctx, PIPS[value], colors, value === 6 ? 0.065 : 0.075);
  ctx.restore();
}

function drawFront(ctx, skin, colors) {
  ctx.save();
  affine(ctx, FACES.front);
  ctx.fillStyle = colors.left;
  ctx.fillRect(0, 0, 1, 1);
  ctx.drawImage(skin, 0, 0, 1, 1);
  drawPips(ctx, PIPS[FACE_VALUES.front], colors, 0.074);
  ctx.restore();
}

async function build(theme) {
  const colors = THEMES[theme];
  if (!colors) throw new Error(`Unknown theme: ${theme}`);
  const dir = path.join(ROOT, 'source-assets', 'theme-icon-packs', theme, 'treasury-effect-previews-v2');
  const basePath = path.join(dir, 'preview-ufo-abduction-background.png');
  const skinPath = path.join(ROOT, 'www', 'assets', 'dice-skins-v1', `${colors.skin}-face-v1.png`);
  const outputPath = path.join(dir, 'preview-ufo-abduction-generated.png');
  const [base, skin] = await Promise.all([loadImage(basePath), loadImage(skinPath)]);
  if (base.width !== WIDTH || base.height !== HEIGHT) throw new Error(`${theme}: unexpected base dimensions`);
  const canvas = createCanvas(WIDTH, HEIGHT);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(base, 0, 0);
  ctx.save();
  ctx.shadowColor = colors.glow;
  ctx.shadowBlur = 28;
  drawSide(ctx, FACES.left, FACE_VALUES.left, colors, colors.left);
  drawSide(ctx, FACES.bottom, FACE_VALUES.bottom, colors, colors.bottom);
  ctx.restore();
  drawFront(ctx, skin, colors);
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

module.exports = { FACE_VALUES, PIPS, FACES, THEMES };
