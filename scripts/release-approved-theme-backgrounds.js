// Copy only user-approved background masters into the app and record exact hashes.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const root = path.resolve(__dirname, '..');
const definitions = JSON.parse(fs.readFileSync(path.join(root, 'docs/theme-definitions.json'), 'utf8'));
const policy = definitions.backgroundCandidatePolicy;
const green = { path: 'www/assets/green-clay-balkan-diorama-v4.png', sha256: '0b5f16e08cad0abc487bdd23b3a3c7128903d5a0f06110b457d8b9d8bb1eb181' };
const sourceById = new Map([
    ['dark', green],
    ['light', policy.approvedV9Backgrounds.light],
    ['medium', policy.approvedV9Backgrounds.medium],
    ['winter', policy.approvedV13Backgrounds.winter],
    ['neon', policy.approvedV4Backgrounds.neon],
    ['amethyst', policy.approvedV6Backgrounds.amethyst],
    ['easter', policy.approvedV6Backgrounds.easter],
    ['desert', policy.approvedV8Backgrounds.desert],
    ['moon', policy.approvedV14Backgrounds.moon],
    ['severna', policy.approvedV4Backgrounds.severna]
]);
const runtimeNames = {
    dark: 'green-clay-balkan-diorama-v4.png',
    light: 'light-v9.png', medium: 'medium-v9.png', winter: 'winter-v13.png',
    neon: 'neon-v4.png', amethyst: 'amethyst-v6.png', easter: 'easter-v6-1.png',
    desert: 'desert-v8-2.png', moon: 'moon-v14.png', severna: 'severna-v4.png'
};
const sha256 = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
if (sourceById.size !== 10 || definitions.themes.some(theme => !sourceById.has(theme.id))) {
    throw new Error('Approved background locks are incomplete.');
}
if (new Set(runtimeNames && Object.values(runtimeNames)).size !== 10 || definitions.themes.length !== 10) {
    throw new Error('Runtime background mapping is not one-to-one with themes.');
}
const outDir = path.join(root, 'www/assets/theme-backgrounds');
fs.mkdirSync(outDir, { recursive: true });
const entries = definitions.themes.map(theme => {
    const lock = sourceById.get(theme.id);
    if (!lock?.path || !lock.sha256) throw new Error(`Missing approved source for ${theme.id}`);
    const sourceBytes = fs.readFileSync(path.join(root, lock.path));
    if (sourceBytes.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a' || sha256(sourceBytes) !== lock.sha256) {
        throw new Error(`Approved master changed: ${lock.path}`);
    }
    const runtimePath = theme.id === 'dark'
        ? lock.path
        : `www/assets/theme-backgrounds/${runtimeNames[theme.id]}`;
    if (theme.id !== 'dark') fs.copyFileSync(path.join(root, lock.path), path.join(root, runtimePath));
    const runtimeBytes = fs.readFileSync(path.join(root, runtimePath));
    if (sha256(runtimeBytes) !== lock.sha256) throw new Error(`Runtime copy differs from master: ${runtimePath}`);
    return {
        themeId: theme.id, nameSr: theme.nameSr, sourcePath: lock.path, runtimePath,
        appPath: runtimePath.replace(/^www\//, ''), status: 'accepted-locked',
        runtimeLinked: true, width: sourceBytes.readUInt32BE(16), height: sourceBytes.readUInt32BE(20),
        sizeBytes: sourceBytes.length, sha256: lock.sha256
    };
});
const release = { schemaVersion: 1, releasedOn: '2026-10-06', sourceDefinitions: 'docs/theme-definitions.json',
    status: 'All ten user-approved backgrounds are copied or retained in the app with identical hashes.',
    entries };
fs.writeFileSync(path.join(root, 'docs/theme-backgrounds-final.json'), `${JSON.stringify(release, null, 2)}\n`);
fs.writeFileSync(path.join(outDir, 'manifest.json'), `${JSON.stringify(release, null, 2)}\n`);

const esc = value => String(value).replace(/[&<>"']/g, ch => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[ch]));
const cards = entries.map(item => `<article><a href="../${esc(item.runtimePath)}" target="_blank"><img src="../${esc(item.runtimePath)}" alt="${esc(item.nameSr)}"></a><div class="caption"><strong>${esc(item.nameSr)}</strong><span>${esc(item.themeId)} · ${item.width} × ${item.height}</span></div></article>`).join('');
const html = `<!doctype html><html lang="sr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Deset prihvaćenih pozadina</title><style>*{box-sizing:border-box}body{margin:0;background:#101723;color:#f5f7fb;font:16px/1.4 Arial,sans-serif}main{max-width:1350px;margin:auto;padding:24px}p{color:#cad5e3}.grid{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:14px}article{min-width:0;background:#1d2a3a;border:1px solid #465870;border-radius:13px;overflow:hidden}img{display:block;width:100%;aspect-ratio:2/3;object-fit:cover}.caption{padding:9px 12px 12px}.caption strong,.caption span{display:block}.caption span{color:#bfd4e7;margin-top:3px;font-size:13px}a:focus-visible{outline:3px solid #ffe08a}@media(max-width:950px){.grid{grid-template-columns:repeat(3,minmax(0,1fr))}}@media(max-width:600px){main{padding:10px}.grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.caption{padding:7px;font-size:12px}.caption span{font-size:10px}}</style></head><body><main><h1>Deset prihvaćenih pozadina</h1><p>Svaka tema ima svoj zaključani PNG. Klik na sliku otvara punu veličinu.</p><div class="grid">${cards}</div></main></body></html>\n`;
fs.writeFileSync(path.join(root, 'docs/theme-backgrounds-final-review.html'), html);
process.stdout.write(`Released ${entries.length} backgrounds; all runtime copies match approved master hashes.\n`);
