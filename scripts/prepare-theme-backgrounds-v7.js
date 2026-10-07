// Preserve the rejected Blue Ocean V7 image as historical review evidence.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const root = path.resolve(__dirname, '..');
const spec = JSON.parse(fs.readFileSync(path.join(root, 'docs/theme-definitions.json'), 'utf8'));
const v6 = JSON.parse(fs.readFileSync(path.join(root, 'docs/theme-backgrounds-v6.json'), 'utf8'));
const previous = v6.themes.find(item => item.themeId === 'winter');
if (!previous || previous.reviewStatus !== 'rejected-by-user') throw new Error('Blue Ocean V6 rejection is not recorded.');

const masterPath = 'source-assets/theme-backgrounds-v7/winter-background-master-v7.png';
const bytes = fs.readFileSync(path.join(root, masterPath));
if (bytes.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a') throw new Error('Invalid V7 PNG.');
const width = bytes.readUInt32BE(16);
const height = bytes.readUInt32BE(20);
if (![940, 941].includes(width) || height !== 1672) throw new Error(`Unexpected V7 size: ${width}x${height}`);
const theme = spec.themes.find(item => item.id === 'winter');
const manifest = {
    schemaVersion: 1,
    createdOn: '2026-10-06',
    sourcePrompts: 'docs/theme-background-prompts-v7.md',
    themeId: 'winter',
    nameSr: 'Plavi Okean',
    style: theme.style,
    directionId: theme.direction,
    scene: 'Grčki egejski ostrvski pogled nadahnut Santorinijem: bele kuće sa plavim prozorima, otvoreno more i ostrva.',
    masterPath,
    width,
    height,
    sizeBytes: bytes.length,
    sha256: crypto.createHash('sha256').update(bytes).digest('hex'),
    previousRejectedPath: previous.masterPath,
    reviewStatus: 'rejected-by-user',
    reviewFeedback: 'Previše realističan; korisnik je davao smernice i nije tražio render.',
    runtimeLinked: false,
    reviewPage: 'docs/theme-backgrounds-v7-blue-ocean-review.html'
};
fs.writeFileSync(path.join(root, 'docs/theme-backgrounds-v7.json'), `${JSON.stringify(manifest, null, 2)}\n`);
const html = `<!doctype html><html lang="sr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Plavi Okean — odbijeni V7</title><style>body{margin:0;background:#101720;color:#f1f5f9;font:16px/1.45 Arial,sans-serif}main{max-width:720px;margin:auto;padding:24px}p{color:#c6d2df}img{display:block;width:100%;max-width:470px;margin:20px auto;border-radius:12px}a{color:#8ae3e4}</style></head><body><main><h1>Plavi Okean — odbijeni V7</h1><p>Ovaj kadar je prerano izrađen i odbijen jer je previše realističan. Sačuvan je samo kao istorija pregleda; nije povezan sa igrom. Grčki ostrvski smer sa belim kućama i plavim prozorima ostaje zabeležen za kasniji rad.</p><a href="../${masterPath}"><img src="../${masterPath}" alt="Odbijeni Plavi Okean, V7"></a><p><a href="theme-backgrounds-v6-review.html">Status ostalih tema</a></p></main></body></html>\n`;
fs.writeFileSync(path.join(root, manifest.reviewPage), html);
process.stdout.write('Recorded rejected Blue Ocean V7.\n');
