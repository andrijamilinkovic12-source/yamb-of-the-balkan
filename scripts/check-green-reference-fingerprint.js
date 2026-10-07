// Freeze the Green reference bytes without editing the underlying PNGs.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const root = path.resolve(__dirname, '..');
const spec = JSON.parse(fs.readFileSync(path.join(root, 'docs/theme-definitions.json'), 'utf8'));
const catalog = JSON.parse(fs.readFileSync(path.join(root, spec.assetStandardizationRules.catalogPath), 'utf8'));
const output = path.join(root, spec.rebuildPolicy.greenFingerprintPath);
const files = catalog.slots.map(slot => {
    const relativePath = `www/${slot.greenReference}`;
    const data = fs.readFileSync(path.join(root, relativePath));
    return { slotId: slot.id, path: relativePath, sha256: crypto.createHash('sha256').update(data).digest('hex') };
});
const fingerprint = {
    schemaVersion: 1,
    capturedOn: '2026-10-06',
    referenceThemeId: spec.referenceTheme,
    purpose: 'Locked Green reference PNG bytes for the nine-theme rebuild; update only after an intentional Green reference change.',
    files
};

if (process.argv.includes('--write')) {
    fs.writeFileSync(output, `${JSON.stringify(fingerprint, null, 2)}\n`);
    process.stdout.write(`Captured ${files.length} Green reference PNG fingerprints.\n`);
} else {
    const expected = JSON.parse(fs.readFileSync(output, 'utf8'));
    if (JSON.stringify(expected) !== JSON.stringify(fingerprint)) {
        throw new Error('Green reference PNG fingerprint changed; inspect before accepting a new baseline.');
    }
    process.stdout.write(`Verified ${files.length} unchanged Green reference PNGs.\n`);
}
