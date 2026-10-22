const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '..');
const definitions = JSON.parse(fs.readFileSync(path.join(root, 'docs/theme-definitions.json'), 'utf8'));
const ids = ['light','medium','winter','neon','amethyst','easter','desert','moon','severna'];
const roles = {
  games: 'Total games: a small stack of three sculpted score markers, no dice.',
  wins: 'Victories: a single ascending chevron.',
  draws: 'Draws: two balanced horizontal raised bars.',
  losses: 'Losses: one gentle descending chevron.',
  average: 'Average score: three bars crossed by one mean line.',
  'all-time-points': 'Lifetime points: a score orb with one clear star or ring.',
  'fire-streak': 'Win streak: one dignified, legible flame.',
  h2h: 'Head-to-head duels: two facing abstract player profiles.',
  'h2h-empty': 'No duels yet: two separated quiet player forms.',
  'highest-score': 'Highest duel score: rising score column with a summit mark.',
  'max-win-margin': 'Largest win margin: two unequal score bars with a gap marker.',
  'worst-loss-margin': 'Largest loss margin: an opponent bar taller than my bar with a downward gap marker.'
};
const manifest = {
  schemaVersion: 2,
  family: 'statistics-overview',
  referenceTheme: 'dark',
  generationMethod: 'One built-in image_gen call per original asset; transparent background; 256px RGBA production PNG.',
  promptTemplate: 'Create ONE original 3D Soft Neomorphism mobile statistics icon for {theme}. Subject: {role}. Direction: {direction}. Palette: {palette}. Respect the theme visual DNA. Develop a distinct silhouette and sculpting for this theme; do not recolor another theme icon. Transparent background, compact 32px readability, restrained volume, no tile, lettering, ornament or kitsch.',
  rolePrompts: roles,
  canonicalReuse: ['statistics-room-identity','power-index','personal-best/record','treasury tab-trophies','ducat-inline','versus'],
  themes: []
};
for (const id of ids) {
  const theme = definitions.themes.find(item => item.id === id);
  if (!theme) throw Error(`Missing theme definition: ${id}`);
  const assets = [];
  for (const role of Object.keys(roles)) {
    const family = ['h2h-empty','highest-score','max-win-margin','worst-loss-margin'].includes(role) ? 'h2h-statistics' : 'statistics-overview';
    const production = `www/assets/theme-packs/${id}/canonical/${family}/${role}-v2.png`;
    const data = fs.readFileSync(path.join(root, production));
    assets.push({ role, production, bytes: data.length, sha256: crypto.createHash('sha256').update(data).digest('hex') });
  }
  manifest.themes.push({ id, name: theme.nameSr, style: theme.style, direction: theme.direction, palette: theme.paletteHex, iconDna: theme.iconDna, assets });
}
const output = path.join(root, 'source-assets/theme-statistics-overview-v2/manifest.json');
fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, JSON.stringify(manifest, null, 2) + '\n');
console.log(`Statistics manifest: ${manifest.themes.length} themes, ${manifest.themes.reduce((n,t)=>n+t.assets.length,0)} new PNGs`);
