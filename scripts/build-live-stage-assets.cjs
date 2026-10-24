const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const sharp = require(process.env.YAMB_SHARP_PATH || 'sharp');
const root = path.resolve(__dirname, '..');
const pack = path.join(root, 'source-assets/theme-live-stage-v1');
const manifestPath = path.join(pack, 'manifest.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const definitions = JSON.parse(fs.readFileSync(path.join(root, 'docs/theme-definitions.json'), 'utf8'));

(async () => {
    fs.mkdirSync(path.join(pack, 'masters'), { recursive: true });
    const cells = [];
    for (const [index, asset] of manifest.assets.entries()) {
        const runtime = path.join(root, asset.productionPath);
        const master = path.join(pack, 'masters', `${asset.id}.png`);
        if (!fs.existsSync(master)) fs.copyFileSync(runtime, master);
        const limit = asset.id === 'frost-corner' ? 768 : asset.id === 'flame' ? 640 : 576;
        const bytes = await sharp(master).trim({ threshold: 4 }).resize({ width: limit, height: limit,
            fit: 'inside', withoutEnlargement: true }).png({ compressionLevel: 9 }).toBuffer();
        fs.writeFileSync(runtime, bytes);
        const meta = await sharp(bytes).metadata();
        Object.assign(asset, {
            theme: asset.id.startsWith('ufo-') ? asset.id.slice(4) : 'universal',
            materialDirection: asset.id.startsWith('ufo-')
                ? definitions.themes.find(theme => theme.id === asset.id.slice(4)).direction
                : ({ trumpet: '3D Soft matte natural brass', flame: 'soft volumetric natural fire', 'frost-corner': '3D Soft translucent ice' })[asset.id],
            canonicalRole: asset.id.startsWith('ufo-') ? 'effect-ufo-ship' : `effect-${asset.id}`,
            master: `source-assets/theme-live-stage-v1/masters/${asset.id}.png`,
            sha256: crypto.createHash('sha256').update(bytes).digest('hex'),
            dimensions: `${meta.width}x${meta.height}`, bytes: bytes.length, alpha: meta.hasAlpha
        });
        const thumb = await sharp(bytes).resize(236, 160, { fit: 'contain',
            background: { r: 20, g: 27, b: 36, alpha: 1 } }).png().toBuffer();
        cells.push({ input: thumb, left: (index % 4) * 256 + 10, top: Math.floor(index / 4) * 194 + 24 });
        const label = Buffer.from(`<svg width="256" height="22"><text x="12" y="17" fill="white" font-family="Arial" font-size="14">${asset.id}</text></svg>`);
        cells.push({ input: label, left: (index % 4) * 256, top: Math.floor(index / 4) * 194 });
    }
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
    fs.writeFileSync(path.join(pack, 'prompts.md'), '# Live effect components v1\n\nBuilt-in image_gen. Runtime files are cropped to transparent bounds and resized without palette changes.\n\n' +
        manifest.assets.map(a => `## ${a.id}\n\n${a.prompt}\n`).join('\n'));
    await sharp({ create: { width: 1024, height: Math.ceil(manifest.assets.length / 4) * 194,
        channels: 4, background: '#141b24' } }).composite(cells).png().toFile(path.join(root, 'docs/live-stage-assets-v1.png'));
    console.log(`Packaged ${manifest.assets.length} PNGs: ${manifest.assets.reduce((sum, a) => sum + a.bytes, 0)} runtime bytes`);
})().catch(error => { console.error(error); process.exitCode = 1; });
