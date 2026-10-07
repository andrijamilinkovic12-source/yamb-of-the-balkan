const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, '..', 'docs/theme-main-room-icon-review.html');
let html = fs.readFileSync(file, 'utf8');
if (html.includes('data-room-extension="treasury"')) {
  console.log('Review already includes the three added roles.');
  process.exit(0);
}
const themes = ['light','medium','winter','neon','amethyst','easter','desert','moon','severna'];
for (const theme of themes) {
  const cards = [
    ['treasury', 'runtime/menu/treasury-free-v3.png', 'Riznica'],
    ['tournament', 'canonical/tournament-awards/champion-trophy-v1.png', 'Turnir'],
    ['economy', 'runtime/menu/ducats-undo-free-v3.png', 'Dukati / ispravka']
  ].map(([role, src, label]) => `<div class="icon-card" data-room-extension="${role}"><img src="../www/assets/theme-packs/${theme}/${src}" alt="" loading="lazy"><span>${label}</span></div>`).join('');
  const last = `<div class="icon-card"><img src="../www/assets/theme-packs/${theme}/canonical/statistics-room-identity/statistics-room-menu-v1.png" alt="" loading="lazy"><span>Statistika</span></div>`;
  if (!html.includes(last)) throw new Error(`Missing last card for ${theme}`);
  html = html.replace(last, last + cards);
}
html = html.replace('Svaka ima 12 posebnih simbola, sa PNG veličinama 384 × 384 za meni i 512 × 512 za sobu.', 'Svaka ima 15 posebnih simbola, uključujući Riznicu, Turnir i Dukate/ispravku upisa. PNG veličine su 384 × 384 za meni i 512 × 512 za sobu.');
html = html.replaceAll('12 originala · 24 PNG izvedenice', '15 originala · 30 PNG izvedenica');
fs.writeFileSync(file, html);
console.log('Updated review: 15 roles per theme.');
