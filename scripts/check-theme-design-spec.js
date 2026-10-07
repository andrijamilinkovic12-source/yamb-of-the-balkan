// Structural and color checks for the target design specification.
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const spec = JSON.parse(fs.readFileSync(path.join(root, 'docs/theme-definitions.json'), 'utf8'));
const catalog = JSON.parse(fs.readFileSync(path.join(root, spec.assetStandardizationRules.catalogPath), 'utf8'));
const usageMap = JSON.parse(fs.readFileSync(path.join(root, spec.assetUsageAndOpticalBounds.path), 'utf8'));
const implementationMap = JSON.parse(fs.readFileSync(path.join(root, spec.assetUsageAndOpticalBounds.implementationPath), 'utf8'));
const progress = JSON.parse(fs.readFileSync(path.join(root, spec.implementationProgress.path), 'utf8'));
const releasedBackgrounds = JSON.parse(fs.readFileSync(path.join(root, spec.backgroundCandidatePolicy.finalManifestPath), 'utf8'));
const requiredColors = [
    'background', 'surface', 'raised', 'inset', 'text', 'textMuted', 'heading',
    'primary', 'onPrimary', 'accent', 'border', 'success', 'danger', 'logoMain', 'logoAccent',
    'colDown', 'colUp', 'colMiddle', 'colManual', 'colAnnounce', 'colFree'
];

function assert(condition, message) {
    if (!condition) throw new Error(message);
}

function luminance(hex) {
    const channels = [1, 3, 5].map(index => parseInt(hex.slice(index, index + 2), 16) / 255);
    const linear = channels.map(value => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
    return linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722;
}

function contrast(first, second) {
    const a = luminance(first);
    const b = luminance(second);
    return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

assert(spec.themes.length === 10, 'The design registry must contain exactly ten themes.');
assert(spec.schemaVersion === 17, 'Unexpected design registry schema.');
const allowedDirections = ['clay', 'smooth_rubber_matte_plastic'];
assert(JSON.stringify(spec.allowedDirectionIds) === JSON.stringify(allowedDirections), 'Only Clay and Matte Plastic are permitted.');
assert(JSON.stringify(Object.keys(spec.directions)) === JSON.stringify(allowedDirections), 'Legacy material directions remain active.');
const expectedThemeDirections = {
    dark: 'clay', light: 'smooth_rubber_matte_plastic', medium: 'clay',
    winter: 'smooth_rubber_matte_plastic', neon: 'smooth_rubber_matte_plastic',
    amethyst: 'clay', easter: 'smooth_rubber_matte_plastic', desert: 'clay',
    moon: 'clay', severna: 'smooth_rubber_matte_plastic'
};
assert(spec.visualRestraint && ['background', 'iconPack', 'logo', 'ui', 'motion', 'review'].every(key => typeof spec.visualRestraint[key] === 'string' && spec.visualRestraint[key].length > 20), 'Universal visual restraint is incomplete.');
assert(spec.acceptanceCriteria.restraintGate && spec.iconPackRules.restraint && spec.gameLogoRules.restraint, 'Visual restraint must apply to acceptance, icons and logo.');
assert(['colorBudget', 'contrast', 'material', 'distinctDna', 'approval'].every(key => typeof spec.iconPackRules[key] === 'string' && spec.iconPackRules[key].length > 80), 'Icon Pack color and originality rules are incomplete.');
assert(fs.existsSync(path.join(root, spec.iconPackRules.auditPath)), 'Icon Pack palette audit is missing.');
assert(new Set(spec.themes.filter(theme => theme.id !== 'dark').map(theme => theme.iconDna?.silhouette)).size === 9, 'Every target Icon Pack needs a distinct shape language.');
assert(new Set(spec.themes.filter(theme => theme.id !== 'dark').map(theme => theme.iconDna?.coinFace)).size === 9, 'Every target Icon Pack needs an original ducat design.');
assert(spec.backgroundSceneRule && ['scene', 'readability', 'restraint', 'originality', 'blueOcean', 'balkanInspiration', 'balkanRestraint', 'balancedDetail', 'compositionDiversity', 'review'].every(key => typeof spec.backgroundSceneRule[key] === 'string' && spec.backgroundSceneRule[key].length > 20), 'Diverse background scene rule is incomplete.');
assert(spec.acceptanceCriteria.backgroundSceneGate, 'Vivid background scene acceptance gate is missing.');
const crypto = require('crypto');
const green = { path: 'www/assets/green-clay-balkan-diorama-v4.png', sha256: '0b5f16e08cad0abc487bdd23b3a3c7128903d5a0f06110b457d8b9d8bb1eb181', locked: true };
const policy = spec.backgroundCandidatePolicy;
const approved = {
    dark: green,
    light: policy.approvedV9Backgrounds.light,
    medium: policy.approvedV9Backgrounds.medium,
    winter: policy.approvedV13Backgrounds.winter,
    neon: policy.approvedV4Backgrounds.neon,
    amethyst: policy.approvedV6Backgrounds.amethyst,
    easter: policy.approvedV6Backgrounds.easter,
    desert: policy.approvedV8Backgrounds.desert,
    moon: policy.approvedV14Backgrounds.moon,
    severna: policy.approvedV4Backgrounds.severna
};
const runtimeFiles = ['www/index.html', 'www/game.js', 'www/teme.css'].map(file => fs.readFileSync(path.join(root, file), 'utf8'));
const hashFile = file => crypto.createHash('sha256').update(fs.readFileSync(path.join(root, file))).digest('hex');
assert(releasedBackgrounds.entries.length === 10 && new Set(releasedBackgrounds.entries.map(item => item.themeId)).size === 10, 'Final background release must contain ten distinct themes.');
for (const theme of spec.themes) {
    const lock = approved[theme.id];
    const entry = releasedBackgrounds.entries.find(item => item.themeId === theme.id);
    assert(lock?.locked && entry && entry.status === 'accepted-locked' && entry.runtimeLinked, `${theme.id}: approved background lock is missing.`);
    assert(entry.sourcePath === lock.path && entry.sha256 === lock.sha256 && entry.appPath === entry.runtimePath.replace(/^www\//, ''), `${theme.id}: release differs from the approved lock.`);
    assert(fs.existsSync(path.join(root, entry.sourcePath)) && fs.existsSync(path.join(root, entry.runtimePath)), `${theme.id}: approved source or runtime PNG is missing.`);
    assert(hashFile(entry.sourcePath) === lock.sha256 && hashFile(entry.runtimePath) === lock.sha256, `${theme.id}: approved source or runtime PNG changed.`);
    assert(progress.themes.find(item => item.themeId === theme.id)?.visualEvidence.backgroundPng === entry.sourcePath, `${theme.id}: progress tracker uses a different background.`);
    assert(runtimeFiles.every(source => source.includes(entry.appPath)), `${theme.id}: runtime reference differs from final background.`);
}
assert(fs.existsSync(path.join(root, 'docs/theme-backgrounds-final-review.html')), 'Final background gallery is missing.');
const approvedSourcePaths = new Set(releasedBackgrounds.entries.map(item => path.resolve(root, item.sourcePath)));
const sourceBase = path.join(root, 'source-assets');
function assertOnlyApprovedPngs(directory) {
    for (const item of fs.readdirSync(directory, { withFileTypes: true })) {
        const fullPath = path.join(directory, item.name);
        if (item.isDirectory()) assertOnlyApprovedPngs(fullPath);
        else if (item.name.toLowerCase().endsWith('.png')) assert(approvedSourcePaths.has(fullPath), `Unapproved background PNG remains: ${fullPath}`);
    }
}
for (const item of fs.readdirSync(sourceBase, { withFileTypes: true })) {
    if (item.isDirectory() && /^theme-backgrounds-v\d+$/.test(item.name)) assertOnlyApprovedPngs(path.join(sourceBase, item.name));
}
for (const name of ['desert-neumorphic-bg-v1.png', 'easter-neumorphic-bg-v5.png', 'moonlight-lunar-bg.png', 'ocean-neumorphic-bg-v1.png', 'ocean-neumorphic-bg-v2.png', 'severna-maglina-bg-v1.png', 'severna-maglina-bg-v2.png', 'severna-maglina-bg-v3-neuphoric.png']) {
    assert(!fs.existsSync(path.join(root, 'www/assets', name)), `Obsolete background remains in web assets: ${name}`);
}
assert(/bez Santorinija/i.test(spec.themes.find(item => item.id === 'winter').visualIdentity.background) && /Bez Zemlje/.test(spec.themes.find(item => item.id === 'moon').visualIdentity.background), 'Blue Ocean or Moonlight scene definition is missing.');
assert(spec.referenceTheme === 'dark', 'Green must remain the reference theme.');
assert(fs.existsSync(path.join(root, spec.rebuildPolicy.checkpointPath)), 'Rebuild checkpoint is missing.');
assert(fs.existsSync(path.join(root, spec.rebuildPolicy.greenFingerprintPath)), 'Green reference fingerprint is missing.');
assert(spec.rebuildPolicy.workOrderThemeIds.length === 9 && new Set(spec.rebuildPolicy.workOrderThemeIds).size === 9, 'Rebuild order must contain nine distinct target themes.');
assert(spec.themes.filter(theme => theme.id !== spec.referenceTheme).every(theme => spec.rebuildPolicy.workOrderThemeIds.includes(theme.id)), 'Rebuild order does not cover every target theme.');
assert(spec.themes[0].designScope === 'locked-reference' && !spec.themes[0].paletteHex, 'Green must not receive a replacement palette.');
assert(catalog.requiredPngCountPerTheme === 177 && catalog.slots.length === 177, 'The reference catalog must contain 177 PNG slots.');
assert(spec.assetStandardizationRules.requiredProductionPngCount === catalog.slots.length, 'PNG count differs from the reference catalog.');
assert(new Set(catalog.slots.map(slot => slot.id)).size === catalog.slots.length, 'Duplicate asset slot ID.');
assert(catalog.slots.filter(slot => slot.kind === 'background').length === 1, 'Exactly one background slot is required.');
assert(catalog.slots.filter(slot => slot.kind === 'game-logo').length === 1, 'Exactly one game-logo slot is required.');
assert(usageMap.requiredSlotCount === catalog.slots.length && usageMap.slots.length === catalog.slots.length, 'Usage map must cover all 177 slots.');
assert(implementationMap.requiredSlotCountPerTheme === catalog.slots.length && implementationMap.themes.length === spec.themes.length - 1, 'Implementation map must cover nine themes with 177 slots each.');
assert(progress.themes.length === spec.themes.length, 'Progress tracker must cover all ten themes.');
assert(progress.activeThemeId === null ? ['awaiting-additional-user-definitions', 'backgrounds-pending-new-direction-render', 'backgrounds-pending-user-review', 'backgrounds-pending-user-comparison', 'background-feedback-awaiting-three-comments', 'backgrounds-v8-pending-user-review', 'backgrounds-v9-pending-user-review', 'backgrounds-awaiting-medium-light-choice', 'backgrounds-awaiting-further-user-direction', 'backgrounds-eight-approved-two-rejected', 'backgrounds-v10-pending-user-review', 'backgrounds-v11-pending-user-review', 'backgrounds-v12-pending-user-review', 'backgrounds-v13-pending-user-review', 'backgrounds-nine-approved-moon-v14-pending-user-review', 'backgrounds-ten-approved-runtime-integration', 'backgrounds-ten-approved-runtime-linked', 'main-room-icon-packs-nine-created-review-pending', 'main-room-icon-packs-nine-linked-ducat-five-dot-rule-recorded', 'main-room-icons-linked-nine-five-dot-ducat-packs-created'].includes(progress.workState) : spec.rebuildPolicy.workOrderThemeIds.includes(progress.activeThemeId), 'Invalid rebuild work state or active theme.');
assert(progress.requiredSurfaceIds.length === 19 && new Set(progress.requiredSurfaceIds).size === 19, 'Progress tracker must define 19 distinct surfaces.');
assert(fs.existsSync(path.join(root, spec.visualReviewBoard.path)), 'Theme review board is missing.');
assert(spec.performanceBudget.startup.maxTransferMiB === 4 && spec.performanceBudget.startup.maxDecodedMiB === 16, 'Startup budget changed unexpectedly.');
assert(spec.performanceBudget.perRoomAdditional.maxTransferMiB === 4 && spec.performanceBudget.perRoomAdditional.maxDecodedMiB === 24, 'Room budget changed unexpectedly.');
assert(spec.performanceBudget.activePeak.maxDecodedMiB === 40, 'Active memory budget changed unexpectedly.');

const usageById = new Map(usageMap.slots.map(slot => [slot.slotId, slot]));
assert(usageById.size === catalog.slots.length, 'Duplicate usage map slot ID.');
for (const slot of catalog.slots) {
    const usage = usageById.get(slot.id);
    assert(usage && usage.greenReference === slot.greenReference, `${slot.id}: missing or mismatched usage record.`);
    assert(usage.greenByteSize > 0 && usage.greenDecodedRgbaBytes === slot.width * slot.height * 4, `${slot.id}: invalid byte measurement.`);
    const bounds = usage.greenOpticalBoundsPx;
    assert(bounds && bounds.left >= 0 && bounds.top >= 0 && bounds.rightExclusive <= slot.width && bounds.bottomExclusive <= slot.height && bounds.left < bounds.rightExclusive && bounds.top < bounds.bottomExclusive, `${slot.id}: invalid optical bounds.`);
    assert(Array.isArray(usage.intendedContexts) && usage.intendedContexts.length > 0, `${slot.id}: no intended context.`);
    assert(Array.isArray(usage.staticSourceReferences), `${slot.id}: source references missing.`);
}

const themeIds = new Set();
for (const theme of spec.themes) {
    assert(!themeIds.has(theme.id), `Duplicate theme ID: ${theme.id}`);
    themeIds.add(theme.id);
    assert(theme.style === spec.sharedStyle, `${theme.id}: style mismatch.`);
    assert(theme.direction === expectedThemeDirections[theme.id], `${theme.id}: direction differs from the two-direction decision.`);
    assert(spec.directions[theme.direction], `${theme.id}: unknown direction.`);
    assert(theme.iconPackDirection === theme.direction, `${theme.id}: icon pack direction differs from theme direction.`);
    assert(theme.roomContract === spec.crossThemeRoomContract.id, `${theme.id}: room contract mismatch.`);
    assert(theme.assetCatalog === spec.assetStandardizationRules.catalogId, `${theme.id}: asset catalog mismatch.`);
    assert(theme.iconFormat === 'PNG' && theme.gameLogo.format === 'PNG', `${theme.id}: icons and game logo must be PNG.`);
    assert(theme.gameLogo.style === theme.style && theme.gameLogo.direction === theme.direction, `${theme.id}: game logo style or direction mismatch.`);
    assert(theme.visualIdentity && typeof theme.visualIdentity.background === 'string' && theme.visualIdentity.background.length > 90, `${theme.id}: specific vivid background direction is missing.`);
    if (theme.id === 'winter') assert(/nadvodn/.test(theme.visualIdentity.background) && /more|okean/.test(theme.visualIdentity.background), 'Blue Ocean must visibly remain above-water.');
    const record = progress.themes.find(item => item.themeId === theme.id);
    assert(record && record.nameSr === theme.nameSr, `${theme.id}: missing progress record.`);
    assert(Object.keys(record.surfaces).length === progress.requiredSurfaceIds.length, `${theme.id}: incomplete surface progress.`);
    assert(progress.requiredSurfaceIds.every(id => record.surfaces[id] && Array.isArray(record.surfaces[id].evidence)), `${theme.id}: missing surface evidence field.`);
    assert(record.visualEvidence && Array.isArray(record.visualEvidence.representativeIconPngs), `${theme.id}: missing visual review evidence.`);
    assert(record.performanceEvidence && record.assetUsageAudit, `${theme.id}: missing performance or asset audit evidence.`);
    const visualPaths = [record.visualEvidence.backgroundPng, record.visualEvidence.logoPng,
        ...record.visualEvidence.representativeIconPngs, record.visualEvidence.menuCardCapture,
        record.visualEvidence.gameBoardCapture, record.visualEvidence.roomIntroCapture,
        record.visualEvidence.srNarrowCapture, record.visualEvidence.enNarrowCapture].filter(Boolean);
    for (const relative of visualPaths) {
        assert(!path.isAbsolute(relative) && !relative.includes('..') && fs.existsSync(path.join(root, relative)), `${theme.id}: missing visual evidence ${relative}.`);
    }
    if (theme.id === 'dark') {
        assert(record.themeStage === 'locked-reference', 'Green progress must remain a locked reference.');
        assert(theme.iconDna?.status === 'locked-reference' && !theme.iconDna.colorsHex, 'Green Icon Pack must remain locked without a replacement palette.');
    } else {
        assert(progress.stageOrder.includes(record.themeStage), `${theme.id}: unknown progress stage.`);
        assert(progress.requiredSurfaceIds.every(id => progress.stageOrder.includes(record.surfaces[id].stage)), `${theme.id}: unknown surface stage.`);
        assert(progress.requiredSurfaceIds.every(id => record.surfaces[id].stage === 'defined' || record.surfaces[id].evidence.length > 0), `${theme.id}: advanced surface stage has no evidence.`);
        assert(progress.requiredSurfaceIds.every(id => progress.stageOrder.indexOf(record.surfaces[id].stage) >= progress.stageOrder.indexOf(record.themeStage)), `${theme.id}: theme stage exceeds an unfinished surface.`);
        if (record.themeStage === 'accepted') {
            assert(progress.requiredSurfaceIds.every(id => record.surfaces[id].stage === 'accepted'), `${theme.id}: accepted theme has unfinished surfaces.`);
            assert(record.visualEvidence.representativeIconPngs.length >= 6 && record.visualEvidence.backgroundPng && record.visualEvidence.logoPng && record.visualEvidence.menuCardCapture && record.visualEvidence.gameBoardCapture && record.visualEvidence.roomIntroCapture && record.visualEvidence.srNarrowCapture && record.visualEvidence.enNarrowCapture, `${theme.id}: accepted theme lacks review-board evidence.`);
            assert(record.assetUsageAudit.confirmedSlotCount === catalog.slots.length && record.assetUsageAudit.measuredThemeBoundsCount === catalog.slots.length, `${theme.id}: accepted theme lacks the full asset audit.`);
            assert(record.performanceEvidence.startup && record.performanceEvidence.activePeak && progress.requiredSurfaceIds.every(id => ['splash-login', 'main-menu'].includes(id) || record.performanceEvidence.rooms[id]), `${theme.id}: accepted theme lacks performance evidence.`);
        }
    }
    if (theme.id === 'dark') continue;
    const implementation = implementationMap.themes.find(item => item.themeId === theme.id);
    assert(implementation && Object.keys(implementation.slots).length === catalog.slots.length, `${theme.id}: incomplete per-slot implementation map.`);
    for (const slot of catalog.slots) {
        const record = implementation.slots[slot.id];
        assert(record && ['defined', 'created', 'linked', 'verified'].includes(record.stage), `${theme.id}/${slot.id}: missing or invalid asset stage.`);
        assert(Array.isArray(record.consumerRefs), `${theme.id}/${slot.id}: consumer references missing.`);
        if (record.stage !== 'defined') {
            assert(record.productionPath && fs.existsSync(path.join(root, record.productionPath)), `${theme.id}/${slot.id}: produced asset path is missing.`);
            assert(record.masterPath && fs.existsSync(path.join(root, record.masterPath)), `${theme.id}/${slot.id}: source master is missing.`);
        }
        if (['linked', 'verified'].includes(record.stage)) {
            assert(record.consumerRefs.length > 0, `${theme.id}/${slot.id}: linked asset has no consumer evidence.`);
        }
        if (record.stage === 'verified') {
            assert(record.opticalBoundsPx && record.sizeBytes > 0, `${theme.id}/${slot.id}: verified asset lacks measured optical bounds or byte size.`);
        }
    }
    assert(record.assetUsageAudit.confirmedSlotCount === Object.values(implementation.slots).filter(item => item.stage === 'verified').length, `${theme.id}: confirmed asset count differs from per-slot map.`);
    assert(record.assetUsageAudit.measuredThemeBoundsCount === Object.values(implementation.slots).filter(item => item.opticalBoundsPx).length, `${theme.id}: measured bounds count differs from per-slot map.`);
    assert(theme.designScope === 'target-for-implementation', `${theme.id}: design scope mismatch.`);
    const palette = theme.paletteHex;
    assert(palette && requiredColors.every(token => /^#[0-9A-F]{6}$/.test(palette[token] || '')), `${theme.id}: incomplete HEX palette.`);
    const dna = theme.iconDna;
    const iconColors = dna?.colorsHex;
    assert(dna && dna.silhouette.length > 70 && dna.coinFace.length > 70, `${theme.id}: icon shape or ducat design is missing.`);
    assert(iconColors && ['body', 'light', 'shade', 'accent', 'contour'].every(key => /^#[0-9A-F]{6}$/.test(iconColors[key] || '')) && Object.keys(iconColors).length === 5, `${theme.id}: incomplete four-tone icon palette.`);
    assert(new Set([iconColors.body, iconColors.light, iconColors.shade, iconColors.accent]).size === 4 && [iconColors.body, iconColors.light, iconColors.shade, iconColors.accent].includes(iconColors.contour), `${theme.id}: Icon Pack uses an extra color or duplicate material tone.`);
    for (const surface of ['surface', 'raised']) {
        const ratio = contrast(iconColors.contour, palette[surface]);
        assert(ratio >= spec.acceptanceCriteria.contrast.essentialNonTextMinimum, `${theme.id}: icon contour/${surface} contrast ${ratio.toFixed(2)} is too low.`);
    }
    const textPairs = [
        ['text', 'surface'], ['text', 'raised'], ['text', 'inset'],
        ['textMuted', 'surface'], ['textMuted', 'raised'],
        ['heading', 'surface'], ['heading', 'raised'],
        ['logoMain', 'background'], ['onPrimary', 'primary']
    ];
    for (const [front, back] of textPairs) {
        const ratio = contrast(palette[front], palette[back]);
        assert(ratio >= spec.acceptanceCriteria.contrast.normalTextMinimum, `${theme.id}: ${front}/${back} contrast ${ratio.toFixed(2)} is too low.`);
    }
    for (const token of ['colDown', 'colUp', 'colMiddle', 'colManual', 'colAnnounce', 'colFree']) {
        const ratio = contrast(palette[token], palette.surface);
        assert(ratio >= spec.acceptanceCriteria.contrast.normalTextMinimum, `${theme.id}: ${token}/surface contrast ${ratio.toFixed(2)} is too low.`);
    }
    for (const token of ['success', 'danger']) {
        const ratio = contrast(palette[token], palette.surface);
        assert(ratio >= spec.acceptanceCriteria.contrast.essentialNonTextMinimum, `${theme.id}: ${token}/surface contrast ${ratio.toFixed(2)} is too low.`);
    }
}

process.stdout.write(`PASS: ${spec.themes.length} themes, ${catalog.slots.length} PNG slots, nine complete accessible target palettes.\n`);
