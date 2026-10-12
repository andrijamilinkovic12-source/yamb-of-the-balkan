const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const definitions = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'docs', 'theme-definitions.json'), 'utf8'));
const themes = definitions.themes.filter(theme => theme.id !== 'dark');
const channel = n => { const v = n / 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
const luminance = hex => {
    const digits = hex.replace('#', '');
    const [r, g, b] = [0, 2, 4].map(i => channel(parseInt(digits.slice(i, i + 2), 16)));
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contrast = (a, b) => {
    const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
    return (hi + 0.05) / (lo + 0.05);
};
let errors = 0;
for (const theme of themes) {
    const p = theme.paletteHex;
    const pairs = [
        ['body', p.textMuted, p.surface],
        ['body raised', p.textMuted, p.raised],
        ['title', p.text, p.raised],
        ['hero accent', p.primary, p.surface],
        ['reward label', p.text, p.raised],
        ['reward amount', p.primary, p.raised],
        ['disabled reward', p.text, p.inset]
    ];
    for (const [role, foreground, background] of pairs) {
        const ratio = contrast(foreground, background);
        const pass = ratio >= 4.5;
        console.log(`${theme.id.padEnd(8)} ${role.padEnd(18)} ${ratio.toFixed(2)}:1 ${pass ? 'PASS' : 'FAIL'}`);
        if (!pass) errors++;
    }
}
assert.equal(errors, 0, `${errors} palette contrast checks below 4.5:1`);
