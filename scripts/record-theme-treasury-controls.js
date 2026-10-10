const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const read = file => JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));
const write = (file, value) => fs.writeFileSync(path.join(root, file), JSON.stringify(value, null, 2) + '\n');
const map = read('docs/theme-asset-implementation-map.json');
const progress = read('docs/theme-progress.json');
const roles = ['tab-trophies', 'tab-skins', 'tab-effects', 'tab-themes',
    'status-owned', 'status-active', 'status-locked', 'status-insufficient'];
const refs = role => role.startsWith('tab-')
    ? ['www/index.html:Treasury tab', 'www/game.js:theme switch and preload', 'www/pravilaigre.js:rules Treasury section']
    : ['www/managers.js:Treasury state', 'www/game.js:Treasury preload'];
for (const theme of map.themes) {
    const manifest = read(`source-assets/theme-icon-packs/${theme.themeId}/treasury-controls-v1/manifest.json`);
    for (const role of roles) {
        const id = `canonical/treasury-controls/${role}-v1`;
        const entry = manifest.slots[id];
        if (!entry) throw new Error(`Missing ${theme.themeId}/${id}`);
        theme.slots[id] = {
            stage: 'linked',
            productionPath: entry.productionPath,
            masterPath: entry.masterPath,
            consumerRefs: refs(role),
            opticalBoundsPx: entry.opticalBoundsPx,
            sizeBytes: entry.sizeBytes
        };
    }
    theme.slots = Object.fromEntries(Object.entries(theme.slots).sort(([a], [b]) => a.localeCompare(b)));
    const state = progress.themes.find(item => item.themeId === theme.themeId);
    state.assetUsageAudit.measuredThemeBoundsCount = Object.values(theme.slots).filter(item => item.opticalBoundsPx).length;
}
const existingQa = progress.treasuryControlEvidence?.androidReport;
if (!progress.workState?.startsWith('theme-dna-') && !progress.treasuryTabRedesignV3?.individuallyIllustratedThemes?.length) {
    progress.workState = existingQa
        ? 'theme-treasury-controls-linked-android-qa-checked'
        : 'theme-treasury-controls-linked-static-checked';
    progress.activeWorkPackage = existingQa
        ? 'Devet nezelenih tema imaju po osam originalnih kontrolnih ikona Riznice. Android qaLocal je potvrdio ucitavanje kontrola i medalja u svih deset tema, 34px tabove i promenu prikazanih statusa; korisnicki vizuelni izbor i medalje u stvarnim rezultatima takmicenja su otvorene provere.'
        : 'Devet nezelenih tema imaju po osam originalnih kontrolnih ikona Riznice. Statičke provere i kontakt table su spremne; Android WebView QA i korisnicko odobrenje jos nisu evidentirani.';
}
progress.treasuryControlEvidence = {
    ...progress.treasuryControlEvidence,
    review: 'docs/theme-treasury-controls-review.html',
    check: 'scripts/check-theme-treasury-controls.js',
    runtimeVisualStatus: progress.treasuryTabRedesignV3?.individuallyIllustratedThemes?.length
        ? progress.treasuryControlEvidence?.runtimeVisualStatus
        : progress.workState?.startsWith('theme-dna-')
        ? progress.treasuryControlEvidence?.runtimeVisualStatus || 'Revizija 2 statički povezana; Android i korisnički pregled čekaju proveru'
        : existingQa
            ? 'Android qaLocal loading and tab geometry verified in all 10 themes; user review pending'
            : 'pending Android QA and user review'
};
write('docs/theme-asset-implementation-map.json', map);
write('docs/theme-progress.json', progress);
console.log('Recorded eight linked Treasury controls for nine themes.');
