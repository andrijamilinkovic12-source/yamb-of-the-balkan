const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const sharp = require(process.env.YAMB_SHARP_PATH || 'sharp');

const root = path.resolve(__dirname, '..');
const sourceDirectory = process.argv[2];
if (!sourceDirectory) throw new Error('Pass the directory containing the image_gen drone outputs.');
const generated = {
    dark: 'exec-d79a5550-f332-423a-9fb7-a8f7c632a2bc.png',
    light: 'exec-9cb9c682-50b4-421e-854e-89a37a999717.png',
    medium: 'exec-f6c6cc58-ee24-427f-af31-4b57ecd147ab.png',
    winter: 'exec-62becf7c-e226-407c-bf8d-86f2ce30e2eb.png',
    neon: 'exec-8e816c22-80a6-44b1-8d27-d74762856755.png',
    amethyst: 'exec-0a3207a2-08ce-46b2-b7ea-2127b37f47f6.png',
    easter: 'exec-8434f230-7572-4ab3-8a63-e7fed0c753b3.png',
    desert: 'exec-d8719ee2-3d91-419a-bc23-72d61f0fb5a4.png',
    moon: 'exec-4b1050d8-24d4-40fd-afa6-046e78f789aa.png',
    severna: 'exec-bc2d9c65-b112-499f-9c18-75eb78896f4d.png'
};

const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');

(async () => {
    const promptSet = JSON.parse(fs.readFileSync(path.join(root, 'source-assets/theme-drone-sprites-v1/prompts.json')));
    const manifest = { schemaVersion: 1, tool: promptSet.tool, useCase: promptSet.useCase, assets: [] };
    fs.mkdirSync(path.join(root, 'source-assets/theme-drone-sprites-v1/masters'), { recursive: true });
    fs.mkdirSync(path.join(root, 'www/assets/effects/drones-v1'), { recursive: true });
    for (const theme of promptSet.themes) {
        const masterBytes = fs.readFileSync(path.join(sourceDirectory, generated[theme.id]));
        const master = `source-assets/theme-drone-sprites-v1/masters/${theme.id}.png`;
        fs.writeFileSync(path.join(root, master), masterBytes);
        const { data, info } = await sharp(masterBytes).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
        let left = info.width, top = info.height, right = 0, bottom = 0;
        let transparent = 0;
        for (let y = 0; y < info.height; y++) for (let x = 0; x < info.width; x++) {
            const alpha = data[(y * info.width + x) * 4 + 3];
            if (alpha === 0) transparent++;
            if (alpha < 96) continue;
            left = Math.min(left, x); right = Math.max(right, x);
            top = Math.min(top, y); bottom = Math.max(bottom, y);
        }
        if (transparent < info.width * info.height * 0.1) throw new Error(`${theme.id}: transparent margins missing`);
        const padding = 18;
        left = Math.max(0, left - padding); top = Math.max(0, top - padding);
        const crop = { left, top, width: Math.min(info.width - 1, right + padding) - left + 1,
            height: Math.min(info.height - 1, bottom + padding) - top + 1 };
        const candidates = [];
        for (let y = Math.floor(info.height * 0.58); y < info.height * 0.83; y++) {
            for (let x = Math.floor(info.width * 0.43); x < info.width * 0.57; x++) {
                const offset = (y * info.width + x) * 4;
                if (data[offset + 3] < 180) continue;
                candidates.push({ x, y, brightness: data[offset] + data[offset + 1] + data[offset + 2] });
            }
        }
        const brightest = Math.max(...candidates.map(pixel => pixel.brightness));
        const lens = candidates.filter(pixel => pixel.brightness >= brightest * 0.98);
        const lightAnchor = [
            (lens.reduce((sum, pixel) => sum + pixel.x, 0) / lens.length - left) / crop.width,
            (lens.reduce((sum, pixel) => sum + pixel.y, 0) / lens.length - top) / crop.height
        ].map(value => Number(value.toFixed(4)));
        const result = await sharp(masterBytes).extract(crop).resize({ width: 160 }).png().toBuffer();
        const productionPath = `www/assets/effects/drones-v1/${theme.id}-drone-v1.png`;
        fs.writeFileSync(path.join(root, productionPath), result);
        const metadata = await sharp(result).metadata();
        manifest.assets.push({ theme: theme.id, direction: theme.direction, generatedFile: generated[theme.id],
            master, masterSha256: hash(masterBytes), productionPath, sha256: hash(result),
            width: metadata.width, height: metadata.height, bytes: result.length,
            alpha: true, lightAnchor, preparation: 'Crop transparent margins and downscale; colors and material unchanged.' });
        console.log(`${theme.id}: ${metadata.width}x${metadata.height}, ${result.length} bytes, lens ${lightAnchor}`);
    }
    fs.writeFileSync(path.join(root, 'source-assets/theme-drone-sprites-v1/manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
})().catch(error => { console.error(error); process.exitCode = 1; });
