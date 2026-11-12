const fs = require('node:fs');
const path = require('node:path');
const native = require(process.env.YAMB_CANVAS_PATH || '@napi-rs/canvas');
const { makeHarness, root } = require('./live-stage-test-harness.cjs');
const manifest = require('../source-assets/theme-drone-sprites-v1/manifest.json');
const greenBackground = fs.existsSync(path.join(root, 'www/assets/green-clay-balkan-diorama-v5.png'))
    ? 'green-clay-balkan-diorama-v5.png' : 'green-clay-balkan-diorama-v4.png';
const backgrounds = { dark: greenBackground, light: 'theme-backgrounds/light-v9.png',
    medium: 'theme-backgrounds/medium-v9.png', winter: 'theme-backgrounds/winter-v13.png', neon: 'theme-backgrounds/neon-v4.png',
    amethyst: 'theme-backgrounds/amethyst-v6.png', easter: 'theme-backgrounds/easter-v6-1.png',
    desert: 'theme-backgrounds/desert-v8-2.png', moon: 'theme-backgrounds/moon-v14.png', severna: 'theme-backgrounds/severna-v4.png' };

(async () => {
    const directory = path.resolve(root, process.argv[2] || 'tmp/drone-review-2026-11-06');
    fs.mkdirSync(directory, { recursive: true });
    const sheet = native.createCanvas(1950, 1740), sheetCtx = sheet.getContext('2d');
    const sprites = native.createCanvas(1000, 400), spriteCtx = sprites.getContext('2d');
    sheetCtx.fillStyle = '#15212e'; sheetCtx.fillRect(0, 0, sheet.width, sheet.height);
    spriteCtx.fillStyle = '#16212e'; spriteCtx.fillRect(0, 0, sprites.width, sprites.height);
    for (const [index, asset] of manifest.assets.entries()) {
        const theme = asset.theme;
        const h = makeHarness({ native, theme });
        const scene = new h.Stage(h.owner, 'drones'); await scene.start(); h.step(0); h.step(3500);
        const output = native.createCanvas(390, 844), ctx = output.getContext('2d');
        const bg = await native.loadImage(path.join(root, 'www/assets', backgrounds[theme]));
        const scale = Math.max(390 / bg.width, 844 / bg.height);
        ctx.drawImage(bg, (390 - bg.width * scale) / 2, (844 - bg.height * scale) / 2, bg.width * scale, bg.height * scale);
        ctx.drawImage(scene.canvas.native, 0, 0, 390, 844);
        fs.writeFileSync(path.join(directory, theme + '-formation.png'), output.toBuffer('image/png'));
        const x = index % 5 * 390, y = Math.floor(index / 5) * 870;
        sheetCtx.fillStyle = '#ffffff'; sheetCtx.font = '14px Arial';
        sheetCtx.fillText(`${theme} / ${scene.droneTargets.length} drones`, x + 12, y + 18);
        sheetCtx.drawImage(output, x, y + 26);
        const sx = index % 5 * 200, sy = Math.floor(index / 5) * 200;
        spriteCtx.drawImage(scene.images.drone, sx + 20, sy + 40, 160, asset.height);
        spriteCtx.fillStyle = '#ffffff'; spriteCtx.font = '15px Arial'; spriteCtx.fillText(theme, sx + 20, sy + 178);
        scene.stop();
    }
    fs.writeFileSync(path.join(directory, 'all-themes.png'), sheet.toBuffer('image/png'));
    fs.writeFileSync(path.join(directory, 'drone-sprites.png'), sprites.toBuffer('image/png'));
    console.log(directory);
})().catch(error => { console.error(error); process.exitCode = 1; });
