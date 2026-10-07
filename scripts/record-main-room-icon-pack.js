const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const themeId = process.argv[2];
const roles = [
  'solo', 'hotseat', 'online-random', 'invite-friend', 'daily', 'global-chat',
  'leaderboard', 'online-players', 'quarterly-league', 'rules', 'settings', 'statistics'
];

if (!themeId || !/^[a-z]+$/.test(themeId)) {
  throw new Error('Usage: node scripts/record-main-room-icon-pack.js <theme-id>');
}

const mapPath = path.join(root, 'docs/theme-asset-implementation-map.json');
const map = JSON.parse(fs.readFileSync(mapPath, 'utf8'));
const theme = map.themes.find((entry) => entry.themeId === themeId);
if (!theme) throw new Error(`Unknown theme: ${themeId}`);

let recorded = 0;
for (const role of roles) {
  const masterPath = `source-assets/theme-icon-packs/${themeId}/main-rooms-v1/${role}-master-v1.png`;
  if (!fs.existsSync(path.join(root, masterPath))) throw new Error(`Missing master: ${masterPath}`);
  for (const variant of [
    { id: `${role}-room-menu-v1`, size: 384 },
    { id: `${role}-room-v1`, size: 512 }
  ]) {
    const slotId = `canonical/${role}-room-identity/${variant.id}`;
    const slot = theme.slots[slotId];
    if (!slot) throw new Error(`Missing catalog slot: ${slotId}`);
    const productionPath = `www/assets/theme-packs/${themeId}/canonical/${role}-room-identity/${variant.id}.png`;
    const file = path.join(root, productionPath);
    const data = fs.readFileSync(file);
    if (data.toString('hex', 0, 8) !== '89504e470d0a1a0a') throw new Error(`Not PNG: ${productionPath}`);
    const width = data.readUInt32BE(16);
    const height = data.readUInt32BE(20);
    const colorType = data[25];
    if (width !== variant.size || height !== variant.size || colorType !== 6) {
      throw new Error(`Unexpected PNG format ${width}x${height} colorType ${colorType}: ${productionPath}`);
    }
    Object.assign(slot, {
      stage: 'created', productionPath, masterPath,
      consumerRefs: [], opticalBoundsPx: null, sizeBytes: data.length
    });
    recorded++;
  }
}

fs.writeFileSync(mapPath, `${JSON.stringify(map, null, 2)}\n`);
console.log(`${themeId}: recorded ${recorded} main-room slots at stage created`);
