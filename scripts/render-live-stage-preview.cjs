const fs = require('node:fs');
const path = require('node:path');
const native = require(process.env.YAMB_CANVAS_PATH || '@napi-rs/canvas');
const { makeHarness, root } = require('./live-stage-test-harness.cjs');
const backgrounds = { dark: 'green-clay-balkan-diorama-v4.png', light: 'theme-backgrounds/light-v9.png', medium: 'theme-backgrounds/medium-v9.png', winter: 'theme-backgrounds/winter-v13.png', neon: 'theme-backgrounds/neon-v4.png', amethyst: 'theme-backgrounds/amethyst-v6.png', easter: 'theme-backgrounds/easter-v6-1.png', desert: 'theme-backgrounds/desert-v8-2.png', moon: 'theme-backgrounds/moon-v14.png', severna: 'theme-backgrounds/severna-v4.png' };
async function render(type, theme, time) {
    const h = makeHarness({ theme, native });
    const scene = new h.Stage(h.owner, type); await scene.start(); h.step(0); h.step(time);
    const output = native.createCanvas(390, 844), ctx = output.getContext('2d');
    const bg = await native.loadImage(path.join(root, 'www/assets', backgrounds[theme]));
    const scale = Math.max(390 / bg.width, 844 / bg.height);
    ctx.drawImage(bg, (390 - bg.width * scale) / 2, (844 - bg.height * scale) / 2, bg.width * scale, bg.height * scale);
    ctx.fillStyle = '#10233466'; ctx.fillRect(0, 0, 390, 844);
    const b = h.board;
    ctx.fillStyle = '#213f4fdd'; ctx.fillRect(b.left, b.top, b.width, b.height);
    ctx.strokeStyle = '#b8d8e544'; ctx.lineWidth = 1;
    for (let row = 0; row < 16; row++) { ctx.beginPath(); ctx.moveTo(b.left, b.top + row * b.height / 15); ctx.lineTo(b.left + b.width, b.top + row * b.height / 15); ctx.stroke(); }
    for (let col = 0; col < 8; col++) { ctx.beginPath(); ctx.moveTo(b.left + col * b.width / 7, b.top); ctx.lineTo(b.left + col * b.width / 7, b.top + b.height); ctx.stroke(); }
    ctx.fillStyle = '#eef6f6'; ctx.font = '700 12px Arial'; ctx.textAlign = 'center';
    for (let row = 0; row < 15; row++) for (let col = 0; col < 7; col++) ctx.fillText(col === 0 ? ['↓', '1', '2', '3', '4', '5', '6', 'MAX', 'MIN', 'K', 'T', 'F', 'P', 'Y', 'Σ'][row] : (row + col) % 3 ? '' : '48', b.left + (col + 0.5) * b.width / 7, b.top + (row + 0.6) * b.height / 15);
    ctx.drawImage(scene.canvas.native, 0, 0, 390, 844);
    scene.stop();
    return output;
}
(async () => {
    const frames = [['neon_pulse', 'neon', 1900], ['thunder', 'moon', 750], ['balkan', 'dark', 2500],
        ['fireworks', 'winter', 2100], ['drones', 'severna', 4200], ['cosmic_dust', 'amethyst', 3100],
        ['ufo_abduction', 'desert', 3200], ['dragon_fire', 'medium', 2600], ['royal_yamb', 'light', 3000], ['ice_age', 'easter', 3300]];
    const sheet = native.createCanvas(1170, 1060), ctx = sheet.getContext('2d');
    ctx.fillStyle = '#131b25'; ctx.fillRect(0, 0, 1170, 1060);
    for (let i = 0; i < frames.length; i++) {
        const image = await render(...frames[i]);
        const x = i % 5 * 234, y = Math.floor(i / 5) * 530;
        ctx.fillStyle = '#fff'; ctx.font = '13px Arial'; ctx.fillText(frames[i][0] + ' / ' + frames[i][1], x + 6, y + 18);
        ctx.drawImage(image, x, y + 24, 234, 506);
    }
    fs.writeFileSync(path.join(root, 'docs/live-effects-final-frames.png'), sheet.toBuffer('image/png'));
    const iceSheet = native.createCanvas(936, 530), iceCtx = iceSheet.getContext('2d');
    for (const [i, time] of [500, 1250, 2200, 3300].entries()) {
        iceCtx.drawImage(await render('ice_age', 'dark', time), i * 234, 24, 234, 506);
        iceCtx.fillStyle = '#fff'; iceCtx.font = '13px Arial'; iceCtx.fillText((time / 1000) + 's', i * 234 + 8, 18);
    }
    fs.writeFileSync(path.join(root, 'docs/ice-age-v5-progression.png'), iceSheet.toBuffer('image/png'));
    console.log('Rendered real Canvas2D scene frames and four-corner ice progression.');
})().catch(error => { console.error(error); process.exitCode = 1; });
