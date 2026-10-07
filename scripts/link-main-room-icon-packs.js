const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const file = path.join(root, 'docs/theme-asset-implementation-map.json');
const map = JSON.parse(fs.readFileSync(file, 'utf8'));
const roles = ['solo', 'hotseat', 'online-random', 'invite-friend', 'daily', 'global-chat',
  'leaderboard', 'online-players', 'quarterly-league', 'rules', 'settings', 'statistics'];
const themes = ['light', 'medium', 'winter', 'neon', 'amethyst', 'easter', 'desert', 'moon', 'severna'];
let linked = 0;

for (const themeId of themes) {
  const theme = map.themes.find(item => item.themeId === themeId);
  if (!theme) throw new Error(`Missing theme ${themeId}`);
  for (const role of roles) {
    for (const variant of ['menu', 'room']) {
      const id = `canonical/${role}-room-identity/${role}-room${variant === 'menu' ? '-menu' : ''}-v1`;
      const slot = theme.slots[id];
      if (!slot || !slot.productionPath || !slot.masterPath) throw new Error(`Uncreated slot: ${themeId}/${id}`);
      if (!fs.existsSync(path.join(root, slot.productionPath))) throw new Error(`Missing runtime PNG: ${slot.productionPath}`);
      if (!fs.existsSync(path.join(root, slot.masterPath))) throw new Error(`Missing master PNG: ${slot.masterPath}`);
      slot.stage = 'linked';
      slot.consumerRefs = variant === 'menu'
        ? ['www/theme-main-room-icons.js:syncIcons (main menu)', 'www/index.html:main-menu']
        : ['www/theme-main-room-icons.js:syncIcons (room headers)', 'www/game.js:playEasterRoomIntro (room intro)'];
      if (role === 'quarterly-league' && variant === 'menu') {
        slot.consumerRefs = ['www/theme-main-room-icons.js:syncIcons (league menu watermark)', 'www/index.html:main-menu'];
      }
      linked++;
    }
  }
}

fs.writeFileSync(file, `${JSON.stringify(map, null, 2)}\n`);
console.log(`Linked ${linked} main-room slots across ${themes.length} themes`);
