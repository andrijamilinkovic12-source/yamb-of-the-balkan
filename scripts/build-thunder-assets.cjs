const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const sharp = require(process.env.YAMB_SHARP_PATH || 'sharp');

const root = path.resolve(__dirname, '..');
const source = process.argv[2];
if (!source) throw new Error('Pass the generated transparent storm-cloud PNG.');
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');

(async () => {
    const bytes = fs.readFileSync(source);
    const { data, info } = await sharp(bytes).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    let transparent = 0, translucent = 0;
    for (let i = 3; i < data.length; i += 4) {
        if (!data[i]) transparent++;
        else if (data[i] < 255) translucent++;
    }
    if (transparent < info.width * info.height * 0.15 || !translucent) throw new Error('A genuine soft alpha cutout is required.');
    const master = 'source-assets/thunder-storm-v1/storm-cloud-master.png';
    const productionPath = 'www/assets/effects/thunder-storm-v1/storm-cloud-v1.png';
    fs.mkdirSync(path.dirname(path.join(root, master)), { recursive: true });
    fs.mkdirSync(path.dirname(path.join(root, productionPath)), { recursive: true });
    fs.copyFileSync(source, path.join(root, master));
    const output = await sharp(bytes).resize({ width: 1024, withoutEnlargement: true }).png().toBuffer();
    fs.writeFileSync(path.join(root, productionPath), output);
    const metadata = await sharp(output).metadata();
    const manifest = {
        schemaVersion: 1, tool: 'built-in image_gen', useCase: 'stylized-concept',
        master, masterSha256: hash(bytes), prompt: 'source-assets/thunder-storm-v1/prompt.txt',
        preparation: 'Downscale only; preserve the generated colors and soft transparency.',
        assets: [{ productionPath, sha256: hash(output), width: metadata.width, height: metadata.height, alpha: true }]
    };
    fs.writeFileSync(path.join(root, 'source-assets/thunder-storm-v1/manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
    console.log(JSON.stringify({ ...manifest.assets[0], bytes: output.length, transparent, translucent }));
})().catch(error => { console.error(error); process.exitCode = 1; });
