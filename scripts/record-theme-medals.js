const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = file => JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));
const write = (file, value) => fs.writeFileSync(path.join(root, file), JSON.stringify(value, null, 2) + '\n');
const catalog = read('docs/theme-asset-role-catalog.json');
const usage = read('docs/theme-asset-usage-map.json');
const implementation = read('docs/theme-asset-implementation-map.json');
const progress = read('docs/theme-progress.json');
const greenRegistry = read('www/themes/green/asset-registry.json');
const contexts = {
    'collection-medals/collection': { name: 'collection', screens: ['treasury'], refs: ['www/managers.js:collection medal'] },
    'competition-medals/general-podium': { name: 'leaderboard', screens: ['leaderboard'], refs: ['www/toplista.js:leaderboard podium', 'www/game.js:waiting hall of fame'] },
    'competition-medals/tournament': { name: 'tournament', screens: ['tournament'], refs: ['www/turnir.js:tournament podium'] },
    'competition-medals/quarterly-league': { name: 'quarterly-league', screens: ['quarterly-league', 'rules'], refs: ['www/kvartalnaliga.js:quarterly league medals', 'www/pravilaigre.js:quarterly league rules'] },
    'competition-medals/power-index': { name: 'power-index', screens: ['statistics-h2h'], refs: ['www/powerindex.js:power index podium'] },
    'competition-medals/fire-streak': { name: 'fire-streak', screens: ['statistics-h2h'], refs: ['www/vatreniniz.js:fire streak podium'] }
};
const tiers = ['gold', 'silver', 'bronze'];
const slotId = (prefix, tier) => `canonical/${prefix}-${tier}-v1`;
const greenPath = id => `assets/green-soft-clay/${id}.png`;
const newPrefixes = ['competition-medals/tournament', 'competition-medals/power-index', 'competition-medals/fire-streak'];
const greenManifest = read('source-assets/theme-icon-packs/dark/medals-v1/manifest.json');
const greenFamily = greenRegistry.families.competitionMedals;
greenFamily.semanticRole = 'competition-specific Green medals: Top-lista, Turnir, Kvartalna liga, Indeks snage and Vatreni niz';
greenFamily.additionalSourceManifest = 'source-assets/theme-icon-packs/dark/medals-v1/manifest.json';
greenFamily.subfamilies.generalPodium.usedBy = ['Leaderboard'];
for (const [prefix, label] of [
    ['competition-medals/tournament', 'Tournament'],
    ['competition-medals/power-index', 'Power Index'],
    ['competition-medals/fire-streak', 'Fire Streak']
]) {
    greenFamily.subfamilies[prefix.split('/')[1]] = { tiers, usedBy: [label], approvalStatus: 'pending visual review' };
}
for (const prefix of newPrefixes) {
    for (const tier of tiers) {
        const id = slotId(prefix, tier);
        const entry = greenManifest.slots[`${prefix}-${tier}-v1.png`];
        if (!entry) throw new Error(`Missing Green new medal ${id}`);
        const existing = greenFamily.canonicalRuntime.find(asset => asset.path === greenPath(id));
        if (existing) existing.sha256 = entry.sha256;
        else greenFamily.canonicalRuntime.push({ role: `${prefix.split('/')[1]}-${tier}`, path: greenPath(id), size: 256, sha256: entry.sha256 });
        if (!catalog.slots.some(slot => slot.id === id)) {
            catalog.slots.push({ id, greenReference: greenPath(id), kind: 'canonical-or-approved-variant', width: 256, height: 256, colorType: 6 });
        }
        if (!usage.slots.some(slot => slot.slotId === id)) {
            const bounds = entry.opticalBoundsPx;
            usage.slots.push({
                slotId: id,
                greenReference: greenPath(id),
                intendedContexts: contexts[prefix].screens,
                contextEvidence: 'dedicated competition medal; verify in app',
                staticSourceReferences: contexts[prefix].refs,
                runtimeUseVerified: false,
                greenByteSize: entry.sizeBytes,
                greenDecodedRgbaBytes: 256 * 256 * 4,
                greenOpticalBoundsPx: {
                    left: bounds[0], top: bounds[1], rightExclusive: bounds[2], bottomExclusive: bounds[3],
                    widthFraction: Number(((bounds[2] - bounds[0]) / 256).toFixed(4)),
                    heightFraction: Number(((bounds[3] - bounds[1]) / 256).toFixed(4)),
                    centerXFraction: Number(((bounds[0] + bounds[2]) / 512).toFixed(4)),
                    centerYFraction: Number(((bounds[1] + bounds[3]) / 512).toFixed(4))
                }
            });
        }
    }
}
// The historical "general-podium" slot is now exclusively the Top-lista medal.
for (const tier of tiers) {
    const id = slotId('competition-medals/general-podium', tier);
    const item = usage.slots.find(slot => slot.slotId === id);
    if (!item) throw new Error(`Missing existing leaderboard slot ${id}`);
    item.intendedContexts = contexts['competition-medals/general-podium'].screens;
    item.contextEvidence = 'dedicated Top-lista medal; verify in app';
    item.staticSourceReferences = contexts['competition-medals/general-podium'].refs;
    const ql = usage.slots.find(slot => slot.slotId === slotId('competition-medals/quarterly-league', tier));
    ql.intendedContexts = contexts['competition-medals/quarterly-league'].screens;
    ql.contextEvidence = 'dedicated Kvartalna liga medal; verify in app';
    ql.staticSourceReferences = contexts['competition-medals/quarterly-league'].refs;
}
const allIds = Object.keys(contexts).flatMap(prefix => tiers.map(tier => slotId(prefix, tier)));
for (const theme of implementation.themes) {
    const manifest = read(`source-assets/theme-icon-packs/${theme.themeId}/medals-v1/manifest.json`);
    for (const id of allIds) {
        const entry = manifest.slots[`${id.replace(/^canonical\//, '')}.png`];
        if (!entry) throw new Error(`Missing ${theme.themeId}/${id}`);
        const prefix = id.replace(/^canonical\//, '').replace(/-(gold|silver|bronze)-v1$/, '');
        theme.slots[id] = {
            stage: 'linked',
            productionPath: entry.productionPath,
            masterPath: entry.masterPath,
            consumerRefs: contexts[prefix].refs,
            opticalBoundsPx: entry.opticalBoundsPx,
            sizeBytes: entry.sizeBytes
        };
    }
    theme.slots = Object.fromEntries(Object.entries(theme.slots).sort(([a], [b]) => a.localeCompare(b)));
    const record = progress.themes.find(item => item.themeId === theme.themeId);
    record.assetUsageAudit.measuredThemeBoundsCount = Object.values(theme.slots).filter(item => item.opticalBoundsPx).length;
}
catalog.slots.sort((a, b) => a.id.localeCompare(b.id));
usage.slots.sort((a, b) => a.slotId.localeCompare(b.slotId));
catalog.requiredPngCountPerTheme = catalog.slots.length;
catalog.greenPackPngCount = 185;
usage.requiredSlotCount = usage.slots.length;
implementation.requiredSlotCountPerTheme = catalog.slots.length;
write('docs/theme-asset-role-catalog.json', catalog);
write('docs/theme-asset-usage-map.json', usage);
write('docs/theme-asset-implementation-map.json', implementation);
write('docs/theme-progress.json', progress);
write('www/themes/green/asset-registry.json', greenRegistry);
console.log(`Recorded ${allIds.length} medal roles for each of ${implementation.themes.length} themes; ${catalog.slots.length} slots total.`);
