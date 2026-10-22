const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'www/pravilaigre.js'), 'utf8');
const themes = ['dark', 'light', 'medium', 'winter', 'neon', 'amethyst', 'easter', 'desert', 'moon', 'severna'];
const failures = [];
const sandbox = {
    document: { documentElement: { dataset: { splashTheme: 'dark' } }, addEventListener() {} },
    localStorage: { getItem(key) { return key === 'yamb_lang' ? 'sr' : 'dark'; } },
    window: {},
    getThemeMedalSource: () => 'assets/green-soft-clay/canonical/competition-medals/quarterly-league-gold-v2.png',
    setTimeout() {}
};
vm.createContext(sandbox);
vm.runInContext(`${source}\n;globalThis.rulesAudit = { RulesData, rulesCanonicalSource };`, sandbox);
const { RulesData, rulesCanonicalSource } = sandbox.rulesAudit;

for (const language of ['sr', 'en']) {
    if (RulesData[language]?.length !== 6) failures.push(`${language}: expected six pages`);
    RulesData[language]?.forEach((page, index) => {
        if (!page.title.includes('data-rules-role=')) failures.push(`${language} page ${index + 1}: no canonical title PNG`);
        if (!page.content.includes('data-rules-role=')) failures.push(`${language} page ${index + 1}: no canonical inline PNG`);
        if (/<svg\b|<use\b|src="[^"]+\.svg/.test(page.title + page.content)) failures.push(`${language} page ${index + 1}: active SVG`);
    });
}
const roles = [...new Set(['rules', ...[...RulesData.sr, ...RulesData.en]
    .flatMap(page => [...(page.title + page.content).matchAll(/data-rules-role="([^"]+)"/g)].map(match => match[1]))])];
const pngSignature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const hashesByRole = new Map(roles.map(role => [role, new Set()]));
for (const theme of themes) {
    for (const role of roles) {
        const url = rulesCanonicalSource(role, theme);
        if (!url.endsWith('.png')) failures.push(`${theme}/${role}: not PNG`);
        const file = path.resolve(root, 'www', url);
        if (!fs.existsSync(file)) {
            failures.push(`${theme}/${role}: missing ${url}`);
            continue;
        }
        const bytes = fs.readFileSync(file);
        if (!bytes.subarray(0, 8).equals(pngSignature)) failures.push(`${theme}/${role}: invalid PNG ${url}`);
        hashesByRole.get(role).add(require('node:crypto').createHash('sha256').update(bytes).digest('hex'));
    }
    for (const tier of ['gold', 'silver', 'bronze']) {
        const medalRoot = theme === 'dark' ? 'green-soft-clay' : `theme-packs/${theme}`;
        const medalPath = path.resolve(root, 'www/assets', medalRoot, 'canonical/competition-medals', `quarterly-league-${tier}-v2.png`);
        if (!fs.existsSync(medalPath)) failures.push(`${theme}: missing quarterly league ${tier} medal`);
        else if (!fs.readFileSync(medalPath).subarray(0, 8).equals(pngSignature)) failures.push(`${theme}: invalid quarterly league ${tier} medal`);
    }
}
for (const [role, hashes] of hashesByRole) {
    if (hashes.size !== themes.length) failures.push(`${role}: the ten themes do not have distinct PNGs`);
}
const gameSource = fs.readFileSync(path.join(root, 'www/game.js'), 'utf8');
for (const oldPath of [
    'assets/easter-soft-clay/rules-pro-v2.png',
    'assets/desert-soft-clay/rules-pro.png',
    'assets/severna-soft-clay/rules-pro-v10.png',
    'assets/severna-soft-clay/rules/pages/'
]) {
    if (gameSource.includes(oldPath)) failures.push(`Old Rules PNG is still loaded: ${oldPath}`);
}
if (/\.svg\b/i.test(source)) failures.push('Rules room still references an SVG');
const indexHtml = fs.readFileSync(path.join(root, 'www/index.html'), 'utf8');
if (!indexHtml.includes('theme-rules-room.css')) failures.push('Rules CSS not loaded');
if (!source.includes("this.overlay.querySelectorAll('img[data-rules-role]')")) failures.push('Theme refresh on room opening is missing');
if (failures.length) {
    console.error(failures.join('\n'));
    process.exitCode = 1;
} else {
    console.log(`Rules room: ${themes.length} themes, 2 languages, 6 pages, ${roles.length - 1} inline PNG roles plus header; all paths exist.`);
}
