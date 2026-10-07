const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const mapPath = path.join(root, 'docs/theme-asset-implementation-map.json');
const map = JSON.parse(fs.readFileSync(mapPath, 'utf8'));
const themes = ['light', 'medium', 'winter', 'neon', 'amethyst', 'easter', 'desert', 'moon', 'severna'];

for (const themeId of themes) {
  const theme = map.themes.find(entry => entry.themeId === themeId);
  if (!theme) throw new Error(`Missing theme: ${themeId}`);
  const masterPath = `source-assets/theme-icon-packs/${themeId}/undo-token-v1/undo-token-front-master-v1.png`;
  if (!fs.existsSync(path.join(root, masterPath))) throw new Error(`Missing master: ${masterPath}`);
  for (const [variant, size, refs] of [
    ['front', 512, ['www/theme-undo-token-pack.js:sync (economy header)']],
    ['inline', 192, ['www/theme-undo-token-pack.js:sync (economy tab, balance and reward)']]
  ]) {
    const id = `canonical/undo-token/undo-token-${variant}-v1`;
    const slot = theme.slots[id];
    if (!slot) throw new Error(`Missing slot: ${themeId}/${id}`);
    const productionPath = `www/assets/theme-packs/${themeId}/canonical/undo-token/undo-token-${variant}-v1.png`;
    const bytes = fs.readFileSync(path.join(root, productionPath));
    if (bytes.toString('hex', 0, 8) !== '89504e470d0a1a0a' ||
        bytes.readUInt32BE(16) !== size || bytes.readUInt32BE(20) !== size || bytes[25] !== 6) {
      throw new Error(`Invalid PNG: ${productionPath}`);
    }
    Object.assign(slot, {
      stage: 'linked', productionPath, masterPath,
      consumerRefs: refs, opticalBoundsPx: null, sizeBytes: bytes.length
    });
  }
}
fs.writeFileSync(mapPath, `${JSON.stringify(map, null, 2)}\n`);
console.log('Nine undo-token packs: 18 PNG slots linked and validated.');
