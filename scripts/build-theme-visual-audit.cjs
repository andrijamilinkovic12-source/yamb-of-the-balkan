const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const sharp = require(process.env.YAMB_SHARP_PATH || 'sharp');
const root = path.resolve(__dirname, '..');
const output = path.join(root, 'docs/theme-visual-audit');
const useMap = JSON.parse(fs.readFileSync(path.join(root, 'docs/theme-canonical-use-map.json')));
const paletteCss = fs.readFileSync(path.join(root, 'www/theme-card-surfaces.css'), 'utf8');
const surface = theme => theme === 'dark' ? '#dbe7ca' : paletteCss.match(new RegExp(`body\\.${theme}-theme\\s*\\{[^}]*--theme-card-surface:\\s*(#[a-fA-F0-9]{6})`))?.[1] || '#e2e7e9';
const xml = s => String(s).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&apos;' })[c]);
async function sheet(file, rows, columns = 4, cellWidth = 210, cellHeight = 218) {
    const tiles = [];
    for (const [index, item] of rows.entries()) {
        const x = index % columns * cellWidth, y = Math.floor(index / columns) * cellHeight;
        const bg = surface(item.theme);
        const thumb = await sharp(path.join(root, item.file)).resize(cellWidth - 16, cellHeight - 52, { fit: 'contain', background: bg }).flatten({background:bg}).png().toBuffer();
        tiles.push({ input: thumb, left: x + 8, top: y + 22 });
        const small = await sharp(path.join(root, item.file)).resize(28, 28, { fit: 'contain', background: bg }).flatten({background:bg}).png().toBuffer();
        tiles.push({ input: small, left: x + cellWidth - 36, top: y + cellHeight - 30 });
        const label = `<svg width="${cellWidth}" height="${cellHeight}"><text x="8" y="16" fill="white" font-family="Arial" font-size="12">${xml(item.theme + ' / ' + item.label)}</text><text x="8" y="${cellHeight - 9}" fill="#b8c9da" font-family="Arial" font-size="10">${xml(item.id || '')}</text></svg>`;
        tiles.push({ input: Buffer.from(label), left: x, top: y });
    }
    await sharp({ create: { width: columns * cellWidth, height: Math.ceil(rows.length / columns) * cellHeight, channels:4, background:'#19232f' } })
        .composite(tiles).png().toFile(path.join(output, file));
}

async function main() {
    fs.mkdirSync(output, { recursive: true });
    const priority = [];
    for (const theme of useMap.themes) for (const key of ['tournament-trophy','medal-tournament-gold','medal-tournament-silver','medal-tournament-bronze']) {
        const concept = theme.concepts.find(c => c.key === key);
        priority.push({ theme:theme.id, label:key.replace('medal-tournament-',''), file:concept.primary.file, id:key });
    }
    await sheet('tournament-01.png', priority.slice(0,20));
    await sheet('tournament-02.png', priority.slice(20));
    fs.writeFileSync(path.join(output, 'tournament-inventory.json'), JSON.stringify(priority, null, 2)+'\n');
    console.log('Built tournament trophy and medal sheets for ten themes.');
}
if (require.main === module) main().catch(error => { console.error(error); process.exitCode=1; });

module.exports = { sheet, surface, output, root };
