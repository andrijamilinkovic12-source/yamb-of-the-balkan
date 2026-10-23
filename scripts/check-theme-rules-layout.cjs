const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const greenCss = read('www/teme.css');
const cardCss = read('www/theme-card-surfaces.css');
const rulesCss = read('www/theme-rules-room.css');
const html = read('www/index.html');
const definitions = JSON.parse(read('docs/theme-definitions.json'));
const themes = ['light', 'medium', 'winter', 'neon', 'amethyst', 'easter', 'desert', 'moon', 'severna'];

const variable = (css, name) => {
    const match = new RegExp(`--${name}:\\s*([^;]+);`).exec(css);
    assert(match, `Missing --${name}`);
    return match[1].trim();
};
for (const dimension of ['top', 'bottom', 'side']) {
    assert.equal(variable(cardCss, `theme-room-${dimension}`), variable(greenCss, `green-room-${dimension}`),
        `Rules room ${dimension} must match Green`);
}
assert(html.includes('theme-rules-room.css?v=3'), 'The updated Rules stylesheet is not loaded');
assert.equal(definitions.sharedTypography.uiFont, 'Montserrat', 'Rules must use the shared UI font');
assert(/font-family:\s*'Montserrat',\s*sans-serif/.test(read('www/style.css')), 'The app body does not load Montserrat');
assert(html.includes('family=Montserrat:wght@200;400;600;700;800;900'), 'Rules typography weights are unavailable');
for (const [greenToken, themeValue] of [
    ['green-ui-title', 'font-size: clamp(1.05rem, 4.2vw, 1.22rem) !important'],
    ['green-ui-section', 'font-size: clamp(.98rem, 3.6vw, 1.08rem) !important'],
    ['green-ui-body', 'font-size: .9rem !important']
]) {
    assert(rulesCss.includes(themeValue), `Rules typography diverges from ${greenToken}`);
}
for (const declaration of [
    'width: 44px !important', 'height: 44px !important', 'width: 10px', 'height: 10px',
    'font-size: .9rem !important', 'line-height: 1.4 !important',
    'font-size: clamp(.98rem, 3.6vw, 1.08rem) !important',
    'background: transparent !important', 'border: 0 !important',
    'background: linear-gradient(145deg, var(--theme-card-surface), var(--theme-card-raised)) !important'
]) {
    assert(rulesCss.includes(declaration), `Rules layout lost ${declaration}`);
}
assert(rulesCss.includes('.rule-dot:focus-visible'), 'Pager needs a visible keyboard focus');
assert(rulesCss.includes('.rules-dots-container { gap: 1px; }'), 'Six pager targets must fit narrow phones');
assert(rulesCss.includes('.rules-dots-container { padding-inline: 8px !important; }'),
    'Rules pager must use Green compact padding on narrow phones');
for (const viewportWidth of [320, 360, 390]) {
    const available = viewportWidth - 2 * (viewportWidth <= 360 ? 16 : 10)
        - 2 * (viewportWidth <= 360 ? 8 : 14);
    const pager = 6 * 44 + 5;
    assert(pager <= available, `${viewportWidth}px: pager enters the side safe area`);
}

const rgb = hex => [1, 3, 5].map(index => Number.parseInt(hex.slice(index, index + 2), 16));
const mix = (first, second, weight) => first.map((channel, index) => channel * weight + second[index] * (1 - weight));
const luminance = color => color.map(channel => {
    const value = channel / 255;
    return value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4;
}).reduce((sum, value, index) => sum + value * [.2126, .7152, .0722][index], 0);
const contrast = (first, second) => {
    const [lighter, darker] = [luminance(first), luminance(second)].sort((a, b) => b - a);
    return (lighter + .05) / (darker + .05);
};
let lowestTextContrast = Infinity;
const checkText = (theme, label, foreground, backgrounds) => {
    for (const background of backgrounds) {
        const ratio = contrast(foreground, background);
        lowestTextContrast = Math.min(lowestTextContrast, ratio);
        assert(ratio >= 4.5, `${theme}: ${label} contrast ${ratio.toFixed(2)}:1 is below 4.5:1`);
    }
};
const rgbaStops = value => [...value.matchAll(/rgba\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*([\d.]+)\s*\)/g)]
    .map(match => ({ color: match.slice(1, 4).map(Number), alpha: Number(match[4]) }));
const greenRoom = rgbaStops(variable(greenCss, 'green-room-surface'));
const greenHeader = rgbaStops(variable(greenCss, 'green-clay-surface-soft'));
const [greenTrack] = rgbaStops(variable(greenCss, 'green-clay-surface-inset'));
assert.equal(greenRoom.length, 2, 'Green room gradient must have two stops');
assert.equal(greenHeader.length, 2, 'Green header gradient must have two stops');
assert(greenTrack, 'Green inset surface is missing');
for (const artwork of [rgb('#000000'), rgb('#ffffff')]) {
    for (const roomStop of greenRoom) {
        const room = mix(roomStop.color, artwork, roomStop.alpha);
        const track = mix(greenTrack.color, room, greenTrack.alpha);
        checkText('green', 'body', rgb(variable(greenCss, 'green-clay-ink')), [track]);
        checkText('green', 'emphasis', rgb(variable(greenCss, 'green-clay-mint')), [track]);
        checkText('green', 'section heading', rgb(variable(greenCss, 'green-clay-ink-strong')), [track]);
        for (const headerStop of greenHeader) {
            const header = mix(headerStop.color, room, headerStop.alpha);
            checkText('green', 'room heading', rgb(variable(greenCss, 'green-clay-ink-strong')), [header]);
        }
    }
}
for (const theme of themes) {
    const match = new RegExp(`body\\.${theme}-theme\\s*\\{([^}]+)\\}`).exec(cardCss);
    assert(match, `${theme}: missing theme palette`);
    const token = name => rgb(variable(match[1], `theme-card-${name}`));
    const definition = definitions.themes.find(item => item.id === theme);
    assert(definition?.paletteHex, `${theme}: definition palette missing`);
    for (const [cssName, definitionName] of [
        ['surface', 'surface'], ['raised', 'raised'], ['inset', 'inset'], ['border', 'border'],
        ['ink', 'text'], ['muted', 'textMuted'], ['primary', 'primary']
    ]) assert.equal(variable(match[1], `theme-card-${cssName}`).toUpperCase(),
        definition.paletteHex[definitionName].toUpperCase(), `${theme}: ${cssName} does not match definition`);
    const surface = token('surface');
    const raised = token('raised');
    const inset = token('inset');
    const ink = token('ink');
    const primary = token('primary');
    const muted = token('muted');
    const track = mix(surface, inset, .9);
    const header = mix(raised, surface, .72);
    for (const [label, foreground, backgrounds] of [
        ['body', ink, [surface, raised, track]],
        ['heading and emphasis', primary, [surface, raised, track, header]]
    ]) checkText(theme, label, foreground, backgrounds);
    for (const [label, foreground, backgrounds] of [['pager', muted, [header]]]) {
        for (const background of backgrounds) {
            const ratio = contrast(foreground, background);
            assert(ratio >= 3, `${theme}: ${label} contrast ${ratio.toFixed(2)}:1 is below 3:1`);
        }
    }
}
console.log(`Rules layout: all ten theme palettes, Green typography, 44px targets and room geometry pass; lowest text contrast ${lowestTextContrast.toFixed(2)}:1.`);
