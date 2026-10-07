const fs = require('fs');
const path = require('path');
const repo = path.join(__dirname, '..');
const mapFile = path.join(repo, 'docs/theme-asset-implementation-map.json');
const progressFile = path.join(repo, 'docs/theme-progress.json');
const map = JSON.parse(fs.readFileSync(mapFile, 'utf8'));
const progress = JSON.parse(fs.readFileSync(progressFile, 'utf8'));
const roles = [
  ['runtime/menu/treasury-free-v3', 'treasury', 'www/index.html:#main-menu .spec-riznica'],
  ['treasury-free-v3', 'treasury', 'www/index.html:#riznica-screen, #riznica-intro'],
  ['canonical/tournament-awards/champion-trophy-v1', 'tournament', 'www/index.html:#main-menu .spec-turnir, #tournament-screen, #tournament-intro'],
  ['runtime/menu/ducats-undo-free-v3', 'economy', 'www/index.html:#main-menu .main-economy-card'],
  ['ducats-undo-free-v3', 'economy', 'www/game.js:playEasterRoomIntro(economy)']
];
for (const theme of map.themes) {
  for (const [slotId, role, consumer] of roles) {
    const slot = theme.slots[slotId];
    if (!slot) throw new Error(`Missing slot ${theme.themeId}/${slotId}`);
    const productionPath = `www/assets/theme-packs/${theme.themeId}/${slotId}.png`;
    const masterPath = `source-assets/theme-icon-packs/${theme.themeId}/main-rooms-v1/${role}-master-v1.png`;
    const bytes = fs.statSync(path.join(repo, productionPath)).size;
    if (!fs.existsSync(path.join(repo, masterPath))) throw new Error(`Missing master ${masterPath}`);
    Object.assign(slot, {
      stage: 'linked', productionPath, masterPath,
      consumerRefs: [consumer, 'www/theme-main-room-icons.js:syncIcons'],
      sizeBytes: bytes
    });
  }
}
progress.workState = 'nine-main-room-icon-packs-extended-linked-pending-runtime-visual-qa';
progress.activeWorkPackage = 'Svih devet nezelenih tema ima po 30 PNG ikona glavnih soba (270 datoteka: 15 uloga × meni/soba), uključujući Riznicu, Turnir i Dukate/Ispravi zadnji upis. Od toga je 29 kataloških slotova po temi, jer sobna veličina pehara ima prateći PNG. Stare duplirane ikone uklonjene su iz glavnog menija. Zelena ostaje zaključana; vizuelna provera u aplikaciji i ostale porodice kataloga predstoje.';
fs.writeFileSync(mapFile, JSON.stringify(map, null, 2) + '\n');
fs.writeFileSync(progressFile, JSON.stringify(progress, null, 2) + '\n');
console.log('Recorded five linked catalog slots for nine themes.');
