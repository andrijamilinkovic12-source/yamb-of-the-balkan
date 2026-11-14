const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const sharp = require(process.env.YAMB_SHARP_PATH || 'sharp');

const root = path.resolve(__dirname, '..');
const source = process.argv[2];
if (!source) throw new Error('Pass the generated transparent head/jaw sprite sheet.');
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');

(async () => {
    const bytes = fs.readFileSync(source);
    const { data, info } = await sharp(bytes).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const bounds = (firstRow, lastRow) => {
        let left = info.width, top = info.height, right = 0, bottom = 0, transparent = 0;
        for (let y = firstRow; y < lastRow; y++) for (let x = 0; x < info.width; x++) {
            const alpha = data[(y * info.width + x) * 4 + 3];
            if (!alpha) transparent++;
            if (alpha < 64) continue;
            left = Math.min(left, x); right = Math.max(right, x);
            top = Math.min(top, y); bottom = Math.max(bottom, y);
        }
        if (left > right || transparent < info.width * (lastRow - firstRow) * 0.12) throw new Error('Missing cutout or alpha margins.');
        left = Math.max(0, left - 4); top = Math.max(firstRow, top - 4);
        return { left, top, width: Math.min(info.width, right + 5) - left, height: Math.min(lastRow, bottom + 5) - top };
    };
    const split = Math.round(info.height * 0.72);
    const crops = { head: bounds(0, split), jaw: bounds(split, info.height) };
    const scale = 768 / crops.head.width;
    const directory = 'source-assets/dragon-breath-v1';
    fs.mkdirSync(path.join(root, directory), { recursive: true });
    fs.mkdirSync(path.join(root, 'www/assets/effects/dragon-breath-v1'), { recursive: true });
    const master = directory + '/dragon-rig-master.png';
    fs.writeFileSync(path.join(root, master), bytes);
    const manifest = {
        schemaVersion: 1, tool: 'built-in image_gen', useCase: 'stylized-concept',
        generatedFile: path.basename(source), master, masterSha256: hash(bytes),
        preparation: 'Split separated components, crop transparent margins, and downscale with one shared scale; preserve colors and alpha.',
        assets: [], rig: {}
    };
    const anchors = { headPivot: ['head', 643, 521], jawPivot: ['jaw', 432, 1038],
        upperMouth: ['head', 1197, 520], lowerMouth: ['jaw', 1010, 1100] };
    for (const [role, crop] of Object.entries(crops)) {
        const output = await sharp(bytes).extract(crop).resize({ width: Math.round(crop.width * scale) }).png().toBuffer();
        const metadata = await sharp(output).metadata();
        const productionPath = 'www/assets/effects/dragon-breath-v1/' + role + '-v1.png';
        fs.writeFileSync(path.join(root, productionPath), output);
        manifest.assets.push({ role, productionPath, sha256: hash(output), crop, width: metadata.width, height: metadata.height, alpha: true });
    }
    for (const [key, [role, x, y]] of Object.entries(anchors)) {
        const crop = crops[role];
        manifest.rig[key] = [Number(((x - crop.left) / crop.width).toFixed(5)), Number(((y - crop.top) / crop.height).toFixed(5))];
    }
    manifest.rig.jawWidth = Number((crops.jaw.width / crops.head.width).toFixed(5));
    fs.writeFileSync(path.join(root, directory, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
    console.log(JSON.stringify({ assets: manifest.assets, rig: manifest.rig }, null, 2));
})().catch(error => { console.error(error); process.exitCode = 1; });
