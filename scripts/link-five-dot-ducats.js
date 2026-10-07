const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const mapPath = path.join(root, 'docs/theme-asset-implementation-map.json');
const map = JSON.parse(fs.readFileSync(mapPath, 'utf8'));
const references = {
  front: ['www/theme-ducat-pack.js:economy-header/economy-hero'],
  inline: ['www/languages.js:dukatIconHtml', 'www/theme-ducat-pack.js:static-economy/treasury/statistics/game-over'],
  particle: ['www/managers.js:loadThemeDucatParticleSprite/royal-yamb/gold-rain']
};
for (const theme of map.themes) {
  if (!/^(light|medium|winter|neon|amethyst|easter|desert|moon|severna)$/.test(theme.themeId)) continue;
  for (const [variant, consumerRefs] of Object.entries(references)) {
    const slot = theme.slots[`canonical/ducat/ducat-${variant}-v1`];
    if (!slot || !['created', 'linked'].includes(slot.stage) || !fs.existsSync(path.join(root, slot.productionPath))) {
      throw new Error(`${theme.themeId}: missing created ${variant} dukat`);
    }
    slot.stage = 'linked';
    slot.consumerRefs = consumerRefs;
  }
}
fs.writeFileSync(mapPath, `${JSON.stringify(map, null, 2)}\n`);
console.log('Nine themes: front, inline and particle ducats linked; angles remain created for future animations.');
