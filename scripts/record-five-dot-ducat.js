const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const themeId = process.argv[2];
if (!themeId || !/^[a-z]+$/.test(themeId)) throw new Error('Usage: node scripts/record-five-dot-ducat.js <theme-id>');
const mapPath = path.join(root, 'docs/theme-asset-implementation-map.json');
const map = JSON.parse(fs.readFileSync(mapPath, 'utf8'));
const theme = map.themes.find(entry => entry.themeId === themeId);
if (!theme) throw new Error(`Unknown theme: ${themeId}`);

for (const role of ['angle-left', 'angle-right', 'front', 'inline', 'particle']) {
  const id = `canonical/ducat/ducat-${role}-v1`;
  const slot = theme.slots[id];
  if (!slot) throw new Error(`Missing catalog slot: ${id}`);
  const productionPath = `www/assets/theme-packs/${themeId}/canonical/ducat/ducat-${role}-v1.png`;
  const masterRole = ['inline', 'particle'].includes(role) ? 'front' : role;
  const masterPath = `source-assets/theme-icon-packs/${themeId}/ducat-v1/ducat-${masterRole}-master-v1.png`;
  if (!fs.existsSync(path.join(root, masterPath))) throw new Error(`Missing master: ${masterPath}`);
  const bytes = fs.readFileSync(path.join(root, productionPath));
  const size = role === 'inline' ? 192 : role === 'particle' ? 128 : 512;
  if (bytes.toString('hex', 0, 8) !== '89504e470d0a1a0a' ||
      bytes.readUInt32BE(16) !== size || bytes.readUInt32BE(20) !== size || bytes[25] !== 6) {
    throw new Error(`Unexpected PNG format: ${productionPath}`);
  }
  Object.assign(slot, { stage: 'created', productionPath, masterPath,
    consumerRefs: [], opticalBoundsPx: null, sizeBytes: bytes.length });
}
fs.writeFileSync(mapPath, `${JSON.stringify(map, null, 2)}\n`);
console.log(`${themeId}: five five-dot ducat slots recorded at stage created`);
