/** Render one rounded die whose three visible faces use the actual theme skin. */
const { createCanvas, loadImage } = require('@napi-rs/canvas');

const FACE_VALUES = Object.freeze({ top: 1, front: 2, right: 3 });
const PIPS = Object.freeze({
  1: [[0.5, 0.5]],
  2: [[0.25, 0.25], [0.75, 0.75]],
  3: [[0.25, 0.25], [0.5, 0.5], [0.75, 0.75]],
});
const SIZE = 384;
const BOX = 0.86;
const ROUND = 0.24;

function vec(x, y, z) { return [x, y, z]; }
function add(a, b) { return vec(a[0] + b[0], a[1] + b[1], a[2] + b[2]); }
function scale(a, s) { return vec(a[0] * s, a[1] * s, a[2] * s); }
function dot(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
function cross(a, b) { return vec(a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]); }
function norm(a) { return scale(a, 1 / Math.sqrt(dot(a, a))); }
function clamp(v, lo = 0, hi = 1) { return Math.min(hi, Math.max(lo, v)); }
function hexRgb(hex) { return [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16)); }
function mix(a, b, t) { return a.map((v, i) => v * (1 - t) + b[i] * t); }

function distance(p) {
  const q = vec(Math.abs(p[0]) - BOX, Math.abs(p[1]) - BOX, Math.abs(p[2]) - BOX);
  const outside = Math.hypot(Math.max(q[0], 0), Math.max(q[1], 0), Math.max(q[2], 0));
  return outside + Math.min(Math.max(q[0], q[1], q[2]), 0) - ROUND;
}

function normal(p) {
  const e = 0.003;
  return norm(vec(
    distance(add(p, vec(e, 0, 0))) - distance(add(p, vec(-e, 0, 0))),
    distance(add(p, vec(0, e, 0))) - distance(add(p, vec(0, -e, 0))),
    distance(add(p, vec(0, 0, e))) - distance(add(p, vec(0, 0, -e)))
  ));
}

function faceUv(p, n) {
  const side = Math.max(Math.abs(n[0]), Math.abs(n[1]), Math.abs(n[2]));
  const uv = value => clamp((value + BOX + ROUND) / ((BOX + ROUND) * 2));
  if (Math.abs(n[1]) === side) return { face: 'top', u: uv(p[0]), v: uv(p[2]) };
  if (Math.abs(n[0]) === side) return { face: 'right', u: uv(-p[2]), v: uv(-p[1]) };
  return { face: 'front', u: uv(p[0]), v: uv(-p[1]) };
}

function sampleSkin(data, u, v) {
  const x = Math.round(clamp(u) * (SIZE - 1));
  const y = Math.round(clamp(v) * (SIZE - 1));
  const i = (y * SIZE + x) * 4;
  return [data[i], data[i + 1], data[i + 2], data[i + 3] / 255];
}

function surfaceColor(skinData, p, n, colors) {
  const { face, u, v } = faceUv(p, n);
  const [r, g, b, alpha] = sampleSkin(skinData, u, v);
  const body = hexRgb(colors.left);
  let base = mix(body, [r, g, b], alpha);
  const pip = hexRgb(colors.pip);
  for (const [cx, cy] of PIPS[FACE_VALUES[face]]) {
    const dx = u - cx, dy = v - cy;
    const d = Math.hypot(dx, dy);
    if (d < 0.087) {
      if (d > 0.067) base = mix(base, [16, 22, 32], 0.22 * (0.087 - d) / 0.02);
      else base = mix(base, pip, 0.94);
      if (d > 0.052 && d <= 0.067 && dx + dy < 0) base = mix(base, hexRgb(colors.rim), 0.28);
      break;
    }
  }
  const faceShade = face === 'top' ? 1.1 : (face === 'right' ? 0.89 : 1.0);
  return base.map(c => clamp(c * faceShade, 0, 255));
}

async function renderThemeDie(skinPath, colors) {
  const image = await loadImage(skinPath);
  if (image.width !== SIZE || image.height !== SIZE) throw new Error(`Unexpected die skin size: ${skinPath}`);
  const skinCanvas = createCanvas(SIZE, SIZE);
  const skinCtx = skinCanvas.getContext('2d');
  skinCtx.drawImage(image, 0, 0);
  const skinData = skinCtx.getImageData(0, 0, SIZE, SIZE).data;
  const canvas = createCanvas(SIZE, SIZE);
  const ctx = canvas.getContext('2d');
  const frame = ctx.createImageData(SIZE, SIZE);
  const camera = vec(3.3, 3.4, 4.8);
  const ray = norm(scale(camera, -1));
  const right = norm(cross(ray, vec(0, 1, 0)));
  const up = norm(cross(right, ray));
  const light = norm(vec(-0.7, 1.3, 1.7));
  const half = norm(add(light, scale(ray, -1)));
  const glow = hexRgb(colors.glow);
  const span = 3.4;
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const sx = ((x + 0.5) / SIZE - 0.5) * span;
      const sy = (0.5 - (y + 0.5) / SIZE) * span;
      const origin = add(add(camera, scale(right, sx)), scale(up, sy));
      let t = 3.3, p, hit = false;
      for (let step = 0; step < 45 && t < 10; step++) {
        p = add(origin, scale(ray, t));
        const d = distance(p);
        if (d < 0.0025) { hit = true; break; }
        t += Math.max(d, 0.008);
      }
      if (!hit) continue;
      const n = normal(p);
      const base = surfaceColor(skinData, p, n, colors);
      const diffuse = Math.max(0, dot(n, light));
      const specular = Math.pow(Math.max(0, dot(n, half)), 34) * 0.26;
      const edgeGlow = Math.pow(1 - Math.max(0, dot(n, scale(ray, -1))), 3) * 0.13;
      const shade = 0.54 + diffuse * 0.43 + specular;
      const i = (y * SIZE + x) * 4;
      for (let channel = 0; channel < 3; channel++) {
        frame.data[i + channel] = clamp(base[channel] * shade + glow[channel] * edgeGlow, 0, 255);
      }
      frame.data[i + 3] = 255;
    }
  }
  ctx.putImageData(frame, 0, 0);
  return canvas;
}

module.exports = { FACE_VALUES, PIPS, renderThemeDie };
