const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const definitions = JSON.parse(fs.readFileSync(path.join(root, 'docs/theme-definitions.json'), 'utf8'));
const css = fs.readFileSync(path.join(root, 'www/theme-game-header.css'), 'utf8');
const boardCss = fs.readFileSync(path.join(root, 'www/theme-game-board.css'), 'utf8');
const themeCss = fs.readFileSync(path.join(root, 'www/teme.css'), 'utf8');
const color = hex => [1, 3, 5].map(index => parseInt(hex.slice(index, index + 2), 16) / 255);
const hex = channels => `#${channels.map(channel => Math.round(channel * 255).toString(16).padStart(2, '0')).join('')}`;
const mix = (foreground, background, alpha) => hex(color(foreground).map((channel, index) => channel * alpha + color(background)[index] * (1 - alpha)));
const luminance = hex => color(hex).map(component => component <= .04045 ? component / 12.92 : ((component + .055) / 1.055) ** 2.4)
    .reduce((sum, component, index) => sum + component * [.2126, .7152, .0722][index], 0);
const ratio = (a, b) => {
    const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
    return (light + .05) / (dark + .05);
};
const bodyRule = id => {
    const start = id === 'dark' ? 'body {' : `body.${id}-theme {`;
    const from = css.indexOf(start);
    assert(from >= 0, `${id}: missing palette rule`);
    return css.slice(from, css.indexOf('}', from));
};
const value = (rule, name) => {
    const match = new RegExp(`--gh-${name}:(#[0-9A-Fa-f]{6})`).exec(rule);
    assert(match, `Missing --gh-${name}`);
    return match[1].toUpperCase();
};
const dockStops = id => {
    if (id === 'dark') {
        const from = themeCss.lastIndexOf('#game-scene .controls-area {');
        assert(from >= 0, 'Green Clay dice/action dock is missing');
        const rule = themeCss.slice(from, themeCss.indexOf('}', from));
        const gradient = /linear-gradient\(180deg,\s*rgba\([^;]+\)/.exec(rule);
        assert(gradient, 'Green Clay dice/action dock has no themed gradient');
        return [...gradient[0].matchAll(/rgba\((\d+),(\d+),(\d+),\s*([\d.]+)\)/g)]
            .map(([, red, green, blue, alpha]) => ({ color: hex([red, green, blue].map(value => Number(value) / 255)), alpha: Number(alpha) }));
    }
    const start = `body.${id}-theme {`;
    const from = boardCss.indexOf(start);
    assert(from >= 0, `${id}: missing board palette`);
    const rule = boardCss.slice(from, boardCss.indexOf('}', from));
    const gradient = /--board-control-menu:\s*linear-gradient\([^;]+;/.exec(rule);
    assert(gradient, `${id}: missing dice/action dock material`);
    const stops = [...gradient[0].matchAll(/rgba\((\d+),(\d+),(\d+),\s*([\d.]+)\)/g)]
        .map(([, red, green, blue, alpha]) => ({ color: hex([red, green, blue].map(value => Number(value) / 255)), alpha: Number(alpha) }));
    assert.equal(stops.length, 2, `${id}: dock needs two palette stops`);
    return stops;
};
assert(css.includes('#game-scene:is(#game-scene) .controls-area'), 'The themed dice/action dock must override older responsive rules');
assert(css.includes('.controls-area :is(#lbl-turn,#lbl-status)'), 'Turn and status text must use theme ink');
for (const theme of definitions.themes) {
    const rule = bodyRule(theme.id);
    const panel = value(rule, 'panel');
    const ink = value(rule, 'ink');
    const edge = value(rule, 'edge');
    const accent = value(rule, 'accent');
    const urgent = value(rule, 'urgent-ink');
    if (theme.paletteHex) {
        assert.equal(panel, theme.paletteHex.surface.toUpperCase(), `${theme.id}: panel must use theme surface`);
        assert.equal(ink, theme.paletteHex.text.toUpperCase(), `${theme.id}: ink must use theme text`);
        assert.equal(edge, theme.paletteHex.border.toUpperCase(), `${theme.id}: edge must use theme border`);
        assert.equal(accent, theme.paletteHex.primary.toUpperCase(), `${theme.id}: accent must use theme primary`);
        assert.equal(urgent, theme.paletteHex.danger.toUpperCase(), `${theme.id}: urgent state must use theme danger`);
    }
    for (const [name, contrast] of [
        ['main text', ratio(ink, panel)],
        ['urgent timer', ratio(urgent, panel)],
        ['spectator label', ratio(panel, accent)]
    ]) {
        assert(contrast >= 4.5, `${theme.id}: ${name} contrast ${contrast.toFixed(2)}:1 is below 4.5:1`);
    }
    for (const backdrop of ['#000000', '#FFFFFF']) {
        const headerContrast = ratio(ink, mix(panel, backdrop, .90));
        assert(headerContrast >= 4.5, `${theme.id}: header on ${backdrop} has ${headerContrast.toFixed(2)}:1 contrast`);
    }
    const badge = mix(panel, ink, .90);
    assert(ratio(ink, badge) >= 4.5, `${theme.id}: turn badge has insufficient contrast`);
    for (const [index, stop] of dockStops(theme.id).entries()) {
        for (const backdrop of ['#000000', '#FFFFFF']) {
            const contrast = ratio(ink, mix(stop.color, backdrop, stop.alpha));
            assert(contrast >= 4.5, `${theme.id}: dock stop ${index + 1} on ${backdrop} has ${contrast.toFixed(2)}:1 contrast`);
        }
    }
    console.log(`${theme.id}: text ${ratio(ink, panel).toFixed(2)}, urgent ${ratio(urgent, panel).toFixed(2)}, spectator ${ratio(panel, accent).toFixed(2)}`);
}
