const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file));
const text = file => read(file).toString('utf8');
const hash = file => crypto.createHash('sha256').update(read(file)).digest('hex');
const themes = ['light','medium','winter','neon','amethyst','easter','desert','moon','severna'];
const allThemes = ['dark', ...themes];
const roles = ['profile','display-theme','language','terms','privacy'];
const manifest = JSON.parse(text('source-assets/theme-settings-room-v2/manifest.json'));
assert.equal(manifest.assets.length, 45);
assert.equal(new Set(manifest.assets.map(item => item.sha256)).size, 45,
    'Every role in every theme must have its own PNG image');
for (const theme of themes) {
    const group = manifest.assets.filter(item => item.theme === theme);
    assert.deepEqual(group.map(item => item.role), roles);
    for (const item of group) {
        assert.ok(fs.existsSync(path.join(root, item.master)), item.master);
        assert.equal(hash(item.production), item.sha256);
        const png = read(item.production);
        assert.equal(png.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
        assert.equal(png.readUInt32BE(16), 256);
        assert.equal(png.readUInt32BE(20), 256);
        assert.equal(png[25], 6, 'Settings PNG must have alpha channel');
    }
}

const document = { body: { classList: { contains: () => false } }, readyState: 'loading', addEventListener() {} };
const window = {};
vm.runInNewContext(text('www/theme-game-header.js'), { document, window, Image: class {}, MutationObserver: class {} });
vm.runInNewContext(text('www/theme-settings-room.js'), { document, window, Image: class {}, MutationObserver: class {} });
const closeCss = text('www/theme-room-close-controls.css');
const settingsCss = text('www/theme-settings-room.css');
const previewSources = allThemes.map(theme => `assets/treasury-theme-previews/${theme}-v1.png`);
for (const theme of allThemes) {
    assert.equal(window.themeSettingsRoom.sources(theme).length, 9);
    assert.ok(fs.existsSync(path.join(root, 'www', 'assets/treasury-theme-previews', `${theme}-v1.png`)),
        `${theme} Treasury theme preview missing from Settings picker`);
    for (const role of ['room', ...roles, 'sound','music','vibration']) {
        const source = window.themeSettingsRoom.asset(role, theme);
        assert.ok(fs.existsSync(path.join(root, 'www', source.split('?')[0])), source);
        if (['sound','music','vibration'].includes(role))
            assert.equal(source, window.themeGameHeader.asset(role, theme),
                `${theme} ${role} must be exactly the game-menu PNG`);
    }
    const closeBase = theme === 'dark' ? 'assets/green-soft-clay' : `assets/theme-packs/${theme}`;
    const closeSource = `${closeBase}/canonical/room-controls/close-v1.png`;
    const lockSource = window.themeGameHeader.asset('lock', theme).split('?')[0];
    const inventory = [...window.themeSettingsRoom.sources(theme).map(source => source.split('?')[0]),
        closeSource, lockSource, ...previewSources];
    assert.equal(inventory.length, 21, `${theme} Settings PNG role count`);
    assert.equal(new Set(inventory).size, 21, `${theme} Settings PNG paths must not duplicate roles`);
    inventory.forEach(source => assert.ok(fs.existsSync(path.join(root, 'www', source)), source));
    if (theme !== 'dark') assert.ok(closeCss.includes(`body.${theme}-theme { --theme-room-close-image:`));
}

const html = text('www/index.html');
const settings = html.split('<div id="settings-screen"')[1]?.split('<div id="game-over-screen"')[0] || '';
assert.ok(!/<svg\b|<use\b/i.test(settings), 'Settings room must not render legacy inline SVG');
for (const role of ['room', ...roles])
    assert.equal((settings.match(new RegExp(`data-settings-role="${role}"`, 'g')) || []).length, 1);
for (const legacy of ['assets/settings-icon.svg','settings/profile-v2.png',
    'settings/sound-v2.png','settings/music-v2.png','settings/vibration-v2.png',
    'settings/display-theme-v2.png','settings/language-v2.png','settings/terms-v2.png',
    'settings/privacy-v2.png','settings-row-icon-legacy','settings-legal-icon-legacy'])
    assert.ok(!settings.includes(legacy), `Old Settings asset remains: ${legacy}`);
for (const id of ['setting-name','setting-sound','setting-music','setting-vibration','setting-theme'])
    assert.ok(settings.includes(`id="${id}"`), `Missing functional Settings control ${id}`);
for (const role of ['sound','music','vibration'])
    assert.ok(text('www/theme-game-header.js').includes(`['setting-${role}', '${role}']`));
assert.ok(html.includes('theme-settings-room.css?v=4'));
assert.ok(html.includes('theme-settings-room.js?v=3'));
assert.ok(html.includes('theme-settings-picker.js?v=2'));
assert.ok(settings.includes('id="settings-theme-trigger"'));
assert.ok(settings.includes('id="settings-theme-overlay"'));
assert.ok(settings.includes('id="settings-theme-options"'));
assert.ok(settings.includes('id="setting-theme"') && settings.includes('tabindex="-1" aria-hidden="true"'));
assert.ok(settingsCss.includes('#settings-screen select#setting-theme.settings-select'));
assert.ok(settingsCss.includes('background:var(--theme-room-close-image) center / contain no-repeat'),
    'Theme picker must use the canonical themed close PNG');
assert.ok(settingsCss.includes('flex:0 0 44px; width:44px; height:44px'),
    'Theme picker close target must be 44 CSS px');
for (const [selector, declaration] of [
    ['#settings-screen .settings-section-title', 'font-size:clamp(.98rem,3.6vw,1.08rem)'],
    ['#settings-screen .settings-row-label', 'font-size:.9rem'],
    ['#settings-screen .settings-header-title', 'font-size:clamp(1.05rem,4.2vw,1.22rem)']
]) assert.ok(settingsCss.includes(selector) && settingsCss.includes(declaration),
    `Settings type scale must match Green: ${selector}`);
assert.ok(settingsCss.includes('padding:max(16px,env(safe-area-inset-top))') &&
    settingsCss.includes('max(16px,env(safe-area-inset-bottom))'),
    'Theme picker must respect phone safe areas');
assert.ok(text('www/style.css').includes('#settings-screen .settings-card-body') &&
    text('www/style.css').includes('overflow-y: auto;'), 'Settings content must remain reachable on short screens');
const introConfig = text('www/config.js');
const introGame = text('www/game.js');
assert.ok(/ROOM_INTRO_TIMING\s*=\s*Object\.freeze\(\{\s*openAtMs:\s*2400,\s*durationMs:\s*3200\s*\}\)/.test(introConfig));
assert.ok(introGame.includes("this.playEasterRoomIntro('settings'"),
    'Settings must use the shared room intro');
assert.ok(introGame.includes("{ className: 'settings-theme-load-toast' }"));
assert.ok(settingsCss.includes('body .custom-toast.settings-theme-load-toast') &&
    settingsCss.includes('color:var(--settings-picker-ink) !important'),
    'Settings load notice must use the active theme palette');
const paletteCss = text('www/theme-card-surfaces.css');
const definitions = JSON.parse(text('docs/theme-definitions.json'));
const luminance = hex => {
    const rgb = [1, 3, 5].map(index => parseInt(hex.slice(index, index + 2), 16) / 255);
    return rgb.map(value => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4)
        .reduce((sum, value, index) => sum + value * [0.2126, 0.7152, 0.0722][index], 0);
};
const contrast = (a, b) => {
    const values = [luminance(a), luminance(b)].sort((x, y) => y - x);
    return (values[0] + 0.05) / (values[1] + 0.05);
};
for (const theme of themes) {
    const block = paletteCss.match(new RegExp(`body\\.${theme}-theme\\s*\\{([^}]+)\\}`))?.[1];
    assert.ok(block, `${theme} card palette missing`);
    const colors = Object.fromEntries([...block.matchAll(/(--theme-card-[\w-]+):\s*(#[A-Fa-f0-9]{6})/g)]
        .map(([, token, value]) => [token, value]));
    const definition = definitions.themes.find(item => item.id === theme);
    assert.ok(definition?.paletteHex, `${theme} definition palette missing`);
    for (const [token, key] of [
        ['surface', 'surface'], ['raised', 'raised'], ['inset', 'inset'], ['border', 'border'],
        ['ink', 'text'], ['muted', 'textMuted'], ['primary', 'primary']
    ]) assert.equal(colors[`--theme-card-${token}`].toUpperCase(),
        definition.paletteHex[key].toUpperCase(), `${theme} ${token} differs from theme definition`);
    for (const foreground of ['--theme-card-ink', '--theme-card-muted'])
        for (const background of ['--theme-card-surface', '--theme-card-raised'])
            assert.ok(contrast(colors[foreground], colors[background]) >= 4.5,
                `${theme}: ${foreground} on ${background} falls below 4.5:1`);
}
for (const [foreground, background] of [
    ['#F4EEDC', '#31523A'], ['#F4EEDC', '#416B48'],
    ['#D5E5C4', '#31523A'], ['#D5E5C4', '#416B48']
]) assert.ok(contrast(foreground, background) >= 4.5, 'Green picker text contrast below 4.5:1');
assert.ok(text('www/theme-settings-room.css').includes('#settings-screen .settings-shell {'),
    'Settings shell must receive the current palette');
assert.ok(text('www/game.js').includes('window.themeSettingsRoom?.sources?.(nextTheme)'),
    'Theme switch must predecode Settings PNGs before applying colors');
assert.ok(definitions.settingsRoomRules?.finalAudit);

console.log('Settings room: 45 unique new PNGs; 21 active PNG roles per theme, 10 complete maps, shared intro and Green type scale OK.');
