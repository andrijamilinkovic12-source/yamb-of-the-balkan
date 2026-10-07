const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const mapPath = path.join(root, 'docs/theme-asset-implementation-map.json');
const map = JSON.parse(fs.readFileSync(mapPath, 'utf8'));
const themes = ['light', 'medium', 'winter', 'neon', 'amethyst', 'easter', 'desert', 'moon', 'severna'];
const roles = [
  ['canonical/rewarded-video/rewarded-video-active-v1', 256, 'active-master-v1.png', 'economy'],
  ['canonical/rewarded-video/rewarded-video-active-inline-v1', 128, 'active-master-v1.png', 'rules'],
  ['canonical/rewarded-video/rewarded-video-unavailable-v1', 256, 'unavailable-master-v1.png', 'economy'],
  ['canonical/rewarded-video/rewarded-video-unavailable-inline-v1', 128, 'unavailable-master-v1.png', 'rules'],
  ['daily/reward-video-v3', 384, 'one-coin-master-v1.png', 'daily-challenge'],
  ['treasury/reward-video-v3', 256, 'one-coin-master-v1.png', 'treasury'],
  ['solo/finish-reward-video-v3', 384, 'two-coins-master-v1.png', 'game-over']
];

for (const themeId of themes) {
  const theme = map.themes.find(entry => entry.themeId === themeId);
  if (!theme) throw new Error(`Missing theme ${themeId}`);
  for (const [id, size, ordinaryMaster, screen] of roles) {
    const slot = theme.slots[id];
    if (!slot) throw new Error(`Missing slot ${themeId}/${id}`);
    const master = themeId === 'winter' && id === 'solo/finish-reward-video-v3'
      ? 'two-coins-master-v2.png' : ordinaryMaster;
    const masterPath = `source-assets/theme-icon-packs/${themeId}/rewarded-video-v1/${master}`;
    const productionPath = `www/assets/theme-packs/${themeId}/${id}.png`;
    if (!fs.existsSync(path.join(root, masterPath))) throw new Error(`Missing master ${masterPath}`);
    const bytes = fs.readFileSync(path.join(root, productionPath));
    if (bytes.toString('hex', 0, 8) !== '89504e470d0a1a0a' ||
        bytes.readUInt32BE(16) !== size || bytes.readUInt32BE(20) !== size || bytes[25] !== 6) {
      throw new Error(`Invalid PNG ${productionPath}`);
    }
    Object.assign(slot, {
      stage: 'linked', productionPath, masterPath,
      consumerRefs: [`www/theme-rewarded-video-pack.js:sync (${screen})`, `www/game.js:getRewardedVideoPackSources (${screen})`],
      opticalBoundsPx: null, sizeBytes: bytes.length
    });
  }
}
fs.writeFileSync(mapPath, `${JSON.stringify(map, null, 2)}\n`);
console.log('PASS: 9 themes × 7 rewarded-video PNG slots = 63 linked PNGs.');
