const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const definitions = JSON.parse(fs.readFileSync(path.join(root, 'docs/theme-definitions.json'), 'utf8'));
const css = fs.readFileSync(path.join(root, 'www/theme-quote-contrast.css'), 'utf8');
const palettes = fs.readFileSync(path.join(root, 'www/theme-game-header.css'), 'utf8');
const html = fs.readFileSync(path.join(root, 'www/index.html'), 'utf8');
const channels = hex => [1, 3, 5].map(index => Number.parseInt(hex.slice(index, index + 2), 16));
const composite = (front, back, alpha) => channels(front).map((value, index) => (value * alpha + channels(back)[index] * (1 - alpha)) / 255);
const luminance = values => values.map(value => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4)
    .reduce((sum, value, index) => sum + value * [.2126, .7152, .0722][index], 0);
const contrast = (first, second) => {
    const [lighter, darker] = [luminance(first), luminance(second)].sort((a, b) => b - a);
    return (lighter + .05) / (darker + .05);
};

assert(html.includes('theme-quote-contrast.css?v=1'), 'Quote contrast stylesheet is not loaded');
assert(/id="quote-copy"[\s\S]*?id="quote-text"[\s\S]*?id="quote-author"/.test(html), 'Quote and author need the same bounded contrast surface');
assert(css.includes('var(--gh-panel) 94%'), 'Quote surface must mask variable artwork sufficiently');
assert(css.includes('color: var(--gh-ink) !important') && css.includes('color: var(--gh-accent) !important'), 'Quote colors must use the active theme palette');
let minimum = Infinity;
for (const theme of definitions.themes) {
    const start = theme.id === 'dark' ? 'body {' : `body.${theme.id}-theme {`;
    const from = palettes.indexOf(start);
    assert(from >= 0, `${theme.id}: missing theme palette`);
    const rule = palettes.slice(from, palettes.indexOf('}', from));
    const token = name => {
        const match = new RegExp(`--gh-${name}:(#[0-9A-Fa-f]{6})`).exec(rule);
        assert(match, `${theme.id}: missing ${name}`);
        return match[1];
    };
    const surface = token('panel');
    const quote = token('ink');
    const author = token('accent');
    const darkest = luminance(composite(surface, '#000000', .94));
    const brightest = luminance(composite(surface, '#FFFFFF', .94));
    for (const [part, foreground] of [['quote', quote], ['author', author]]) {
        const value = luminance(channels(foreground).map(channel => channel / 255));
        assert(value < darkest || value > brightest, `${theme.id}: ${part} could merge into an intermediate artwork color`);
    }
    for (const backdrop of ['#000000', '#FFFFFF']) {
        const result = composite(surface, backdrop, .94);
        for (const [part, foreground] of [['quote', quote], ['author', author]]) {
            const measured = contrast(channels(foreground).map(value => value / 255), result);
            minimum = Math.min(minimum, measured);
            assert(measured >= 4.5, `${theme.id}: ${part} has only ${measured.toFixed(2)}:1 over ${backdrop}`);
        }
    }
}
console.log(`PASS: quote and author in all ten themes meet 4.5:1 over light and dark artwork (minimum ${minimum.toFixed(2)}:1).`);
