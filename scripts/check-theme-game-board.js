const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const css = fs.readFileSync(path.join(root, 'www/theme-game-board.css'), 'utf8');
const definitions = JSON.parse(fs.readFileSync(path.join(root, 'docs/theme-definitions.json'), 'utf8'));
const themeIds = ['dark', 'light', 'medium', 'winter', 'neon', 'amethyst', 'easter', 'desert', 'moon', 'severna'];
const required = ['board-shell', 'board-cell', 'board-header', 'board-sum', 'board-ink',
    'board-announce', 'board-announce-ink', 'board-die'];

const blocks = new Map();
for (const match of css.matchAll(/^body(?:\.([\w-]+)-theme)?\s*\{([\s\S]*?)^\}/gm)) {
    blocks.set(match[1] || 'dark', Object.fromEntries(
        [...match[2].matchAll(/--([\w-]+):\s*([^;]+);/g)].map(token => [token[1], token[2]])
    ));
}

function color(value) {
    if (value.startsWith('#')) {
        return [1, 3, 5].map(index => parseInt(value.slice(index, index + 2), 16)).concat(1);
    }
    const match = value.match(/rgba?\((\d+),(\d+),(\d+)(?:,([\d.]+))?\)/);
    assert(match, `Expected RGB color: ${value}`);
    return [+match[1], +match[2], +match[3], match[4] === undefined ? 1 : +match[4]];
}

function gradientStops(value) {
    const stops = [...value.matchAll(/rgba?\([^)]+\)/g)].map(match => color(match[0]));
    assert.equal(stops.length, 2, `Expected two material stops: ${value}`);
    return stops;
}

function over(foreground, background) {
    return [0, 1, 2].map(index => foreground[index] * foreground[3]
        + background[index] * (1 - foreground[3])).concat(1);
}

function luminance(rgb) {
    const [red, green, blue] = rgb.slice(0, 3).map(channel => channel / 255)
        .map(channel => channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4);
    return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

function contrast(a, b) {
    const first = luminance(a);
    const second = luminance(b);
    return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05);
}

assert.deepEqual([...blocks.keys()].sort(), [...themeIds].sort(), 'One board palette per theme');
let lowestContrast = Infinity;
for (const id of themeIds) {
    const tokens = blocks.get(id);
    required.forEach(token => assert(tokens[token], `${id}: missing ${token}`));
    const shell = gradientStops(tokens['board-shell']);
    const cells = gradientStops(tokens['board-cell']);
    const shellRange = id === 'dark' ? [0.68, 0.70] : [0.72, 0.74];
    const cellRange = id === 'dark' ? [0.55, 0.57] : [0.60, 0.62];
    shell.forEach(stop => assert(stop[3] >= shellRange[0] && stop[3] <= shellRange[1],
        `${id}: shell translucency outside target range`));
    cells.forEach(stop => assert(stop[3] >= cellRange[0] && stop[3] <= cellRange[1],
        `${id}: cell translucency outside target range`));
    for (const shellStop of shell) for (const cellStop of cells) {
        const visibleBackdrop = (1 - shellStop[3]) * (1 - cellStop[3]);
        assert(visibleBackdrop >= (id === 'dark' ? 0.125 : 0.09),
            `${id}: background must remain visible through the score cells`);
    }
    const theme = definitions.themes.find(item => item.id === id);
    const backdrop = color(id === 'dark' ? '#3C623A' : theme.paletteHex.background);
    const ink = color(tokens['board-ink']);

    for (const surface of ['board-cell', 'board-header', 'board-sum']) {
        for (const shellStop of shell) {
            for (const surfaceStop of gradientStops(tokens[surface])) {
                const ratio = contrast(ink, over(surfaceStop, over(shellStop, backdrop)));
                lowestContrast = Math.min(lowestContrast, ratio);
                assert(ratio >= 4.5, `${id}: ${surface} text contrast ${ratio.toFixed(2)} < 4.5`);
            }
        }
    }

    const announce = color(tokens['board-announce']);
    const announceInk = color(tokens['board-announce-ink']);
    const actionRatio = contrast(announceInk, over(announce, backdrop));
    lowestContrast = Math.min(lowestContrast, actionRatio);
    assert(actionRatio >= 4.5, `${id}: action button contrast ${actionRatio.toFixed(2)} < 4.5`);
    for (const stop of gradientStops(tokens['board-header'])) {
        const ratio = contrast(ink, over(stop, backdrop));
        lowestContrast = Math.min(lowestContrast, ratio);
        assert(ratio >= 4.5, `${id}: secondary button contrast ${ratio.toFixed(2)} < 4.5`);
    }
    for (const shellStop of shell) {
        const ratio = contrast(announceInk, over(announce, over(shellStop, backdrop)));
        lowestContrast = Math.min(lowestContrast, ratio);
        assert(ratio >= 4.5, `${id}: announcement contrast ${ratio.toFixed(2)} < 4.5`);
    }

    const dieStops = [...tokens['board-die'].matchAll(/#[0-9a-fA-F]{6}/g)].map(match => color(match[0]));
    assert.equal(dieStops.length, 2, `${id}: expected two opaque die material stops`);
    for (const stop of dieStops) {
        const ratio = contrast(ink, stop);
        lowestContrast = Math.min(lowestContrast, ratio);
        assert(ratio >= 4.5, `${id}: default die pip contrast ${ratio.toFixed(2)} < 4.5`);
    }
}

const geometryDeclarations = css.match(/^\s*(?:width|height|min-width|max-width|min-height|max-height|padding(?:-[\w-]+)?|margin(?:-[\w-]+)?|font-size|font-family|font-weight|line-height|letter-spacing|grid-template(?:-[\w-]+)?|gap|transform|flex(?:-[\w-]+)?|border(?:-width|-radius)?|border-(?:top|right|bottom|left)(?:-width)?)\s*:/gm) || [];
assert.equal(geometryDeclarations.length, 0, 'Board skin must not change geometry or typography');
for (const selector of ['#game-scene #btn-bacaj', '#game-scene #btn-najava', '.dice.skin-default']) {
    assert(css.includes(selector), `Missing board control: ${selector}`);
}
assert(css.includes('body.neon-theme #game-scene .player-table::after'), 'Neon rim must be scoped to the Neon board');
assert(css.includes('animation: neon-board-trace 22s linear infinite'), 'Neon rim must move slowly');
assert(css.includes('mask-composite: exclude'), 'Neon trace must stay on the rim');
assert(/@media \(prefers-reduced-motion: reduce\)[\s\S]*?neon-theme #game-scene \.player-table::after[\s\S]*?animation: none !important/.test(css),
    'Neon rim must stop for reduced motion');
assert(fs.readFileSync(path.join(root, 'www/index.html'), 'utf8').includes('theme-game-board.css?v=4'),
    'Board skin must be loaded by the game');

console.log(`PASS: 10 translucent board palettes, minimum modeled text contrast ${lowestContrast.toFixed(2)}:1, geometry untouched.`);
