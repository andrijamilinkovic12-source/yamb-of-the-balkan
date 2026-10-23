const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');

const root = path.resolve(__dirname, '..');
const read = name => fs.readFileSync(path.join(root, name), 'utf8');
const config = read('www/config.js');
const start = config.indexOf('const SHOP_DATA =');
const end = config.indexOf('\n};', start) + 3;
assert(start >= 0 && end > start, 'SHOP_DATA section missing');
const shop = vm.runInNewContext(`${config.slice(start, end)};SHOP_DATA`, {});
const themes = ['dark', 'light', 'medium', 'winter', 'neon', 'amethyst', 'easter', 'desert', 'moon', 'severna'];
const critical = new Set(['easter', 'desert', 'severna']);
const effectNames = {
    confetti: 'confetti', gold_rain: 'gold-rain', balkan: 'wedding',
    thunder: 'thunder', fireworks: 'fireworks', bubbles: 'bubbles',
    cosmic_dust: 'cosmic-dust', dragon_fire: 'dragon-fire', royal_yamb: 'royal-yamb',
    fireflies: 'fireflies', ice_age: 'ice-age', black_hole: 'black-hole',
    supernova: 'supernova', neon_pulse: 'neon-pulse', drones: 'drones',
    ufo_abduction: 'ufo-abduction'
};
const controls = ['tab-trophies', 'tab-skins', 'tab-effects', 'tab-themes',
    'status-owned', 'status-active', 'status-locked', 'status-insufficient'];
const collection = ['gold', 'silver', 'bronze'];
const pngSignature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const hashesByRole = new Map();

function color(hex) {
    const channels = hex.match(/^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
    assert(channels, `Invalid palette color ${hex}`);
    return channels.slice(1).map(value => {
        const n = parseInt(value, 16) / 255;
        return n <= .04045 ? n / 12.92 : ((n + .055) / 1.055) ** 2.4;
    });
}
function luminance(hex) {
    const [r, g, b] = color(hex);
    return .2126 * r + .7152 * g + .0722 * b;
}
function contrast(a, b) {
    const aa = luminance(a), bb = luminance(b);
    return (Math.max(aa, bb) + .05) / (Math.min(aa, bb) + .05);
}
const surfaceCss = read('www/theme-card-surfaces.css');
const results = [];
for (const theme of themes) {
    const prefix = theme === 'dark' ? 'assets/green-soft-clay' : `assets/theme-packs/${theme}`;
    const canonical = `${prefix}/canonical`;
    const roles = new Map();
    const add = (role, source, themed = true) => {
        assert(!roles.has(role), `Duplicate role ${theme}/${role}`);
        const location = path.join(root, 'www', source);
        assert(fs.existsSync(location), `Missing ${theme}/${role}: ${source}`);
        const bytes = fs.readFileSync(location);
        assert(bytes.subarray(0, 8).equals(pngSignature), `Not PNG: ${source}`);
        const hash = crypto.createHash('sha256').update(bytes).digest('hex');
        roles.set(role, source);
        if (themed) {
            assert(source.startsWith(prefix + '/'), `Foreign theme asset: ${theme}/${role}: ${source}`);
            if (!hashesByRole.has(role)) hashesByRole.set(role, new Set());
            assert(!hashesByRole.get(role).has(hash), `Recolored or copied binary: ${theme}/${role}`);
            hashesByRole.get(role).add(hash);
        }
    };
    add('identity', `${prefix}/treasury-free-v3.png`);
    for (const role of controls) add(`control/${role}`, `${canonical}/treasury-controls/${role}-v1.png`);
    for (const item of shop.TROPHIES) add(`trophy/${item.id}`, `${canonical}/achievement-trophies/${item.id}-v1.png`);
    for (const item of shop.EFFECTS) {
        const name = effectNames[item.id];
        assert(name, `Missing effect role ${item.id}`);
        const version = ['fireflies', 'bubbles'].includes(name) || (critical.has(theme) && item.id === 'gold_rain') ? 2 : 1;
        add(`effect/${item.id}`, `${canonical}/treasury-effect-thumbnails/preview-${name}-v${version}.png`);
    }
    for (const tier of collection) add(`collection/${tier}`, `${canonical}/collection-medals/collection-${tier}-v1.png`);
    const rewardVersion = critical.has(theme) ? 2 : 1;
    add('reward-video/active', `${canonical}/rewarded-video/rewarded-video-active-v${rewardVersion}.png`);
    add('reward-video/inline', `${canonical}/rewarded-video/rewarded-video-active-inline-v${rewardVersion}.png`);
    add('ducat', `${canonical}/ducat/ducat-inline-v${rewardVersion}.png`);
    for (const item of shop.SKINS) add(`skin/${item.id}`, `assets/treasury-skin-previews/${item.id}-face-v1.png`, false);
    for (const item of shop.THEMES) add(`theme-preview/${item.id}`, `assets/treasury-theme-previews/${item.id}-v1.png`, false);
    add('close', `${canonical}/room-controls/close-v1.png`);

    if (theme !== 'dark') {
        const block = surfaceCss.match(new RegExp(`body\\.${theme}-theme\\s*\\{([^}]+)\\}`));
        assert(block, `Missing ${theme} palette`);
        const value = key => {
            const match = block[1].match(new RegExp(`--theme-card-${key}:\\s*(#[0-9a-fA-F]{6})`));
            assert(match, `Missing ${theme}/${key}`);
            return match[1];
        };
        const ratios = {
            inkSurface: contrast(value('ink'), value('surface')),
            inkRaised: contrast(value('ink'), value('raised')),
            mutedSurface: contrast(value('muted'), value('surface')),
            mutedRaised: contrast(value('muted'), value('raised')),
            action: contrast(value('surface'), value('primary'))
        };
        for (const [pair, ratio] of Object.entries(ratios)) assert(ratio >= 4.5, `${theme}/${pair} contrast ${ratio.toFixed(2)} < 4.5`);
        results.push({ theme, pngRoles: roles.size, themedRoles: roles.size - shop.SKINS.length - shop.THEMES.length, sharedRoles: shop.SKINS.length + shop.THEMES.length, minContrast: Math.min(...Object.values(ratios)).toFixed(2) });
    } else {
        const greenCss = read('www/teme.css');
        const token = name => {
            const match = greenCss.match(new RegExp(`--green-clay-${name}:\\s*(#[0-9a-fA-F]{6})`));
            assert(match, `Missing Green ${name}`);
            return match[1];
        };
        const greenSurface = greenCss.match(/--green-clay-surface-soft:\s*linear-gradient\([^;]*?rgba\((\d+),(\d+),(\d+),\.98\)/);
        assert(greenSurface, 'Missing Green clay surface');
        const endpoint = '#' + greenSurface.slice(1, 4).map(n => Number(n).toString(16).padStart(2, '0')).join('');
        const greenRatios = ['ink', 'ink-strong', 'muted'].map(name => contrast(token(name), endpoint));
        assert(greenRatios.every(ratio => ratio >= 4.5), 'Green clay contrast below 4.5');
        results.push({ theme, pngRoles: roles.size, themedRoles: roles.size - shop.SKINS.length - shop.THEMES.length, sharedRoles: shop.SKINS.length + shop.THEMES.length, minContrast: `${Math.min(...greenRatios).toFixed(2)} (opaque endpoint)` });
    }
}
assert.equal(new Set(results.map(result => result.pngRoles)).size, 1, 'Unequal PNG roles');
assert.equal(shop.TROPHIES.length, 26);
assert.equal(shop.EFFECTS.length, 16);
assert.equal(shop.THEMES.length, 10);
const html = read('www/index.html');
const treasury = html.split('<div id="riznica-screen"')[1]?.split('<div id="riznica-intro"')[0] || '';
assert(treasury && !/<svg\b|\.svg(?:["?])/.test(treasury), 'Old SVG still in Treasury markup');
assert(!treasury.includes('riznica-balance-ducat-default') && !treasury.includes('riznica-ad-ducat-default'));
assert(read('www/riznica.js').includes('window.ROOM_INTRO_TIMING?.durationMs'));
assert(read('www/theme-treasury-room.css').includes('var(--riznica-intro-duration, 3200ms)'));
assert(read('www/managers.js').includes('getTreasuryEffectPreviewSource(item.id)'));
assert(read('www/theme-treasury-room.css').includes('effect-preview-box::before'));
assert(!read('www/managers.js').includes('}[activeTheme] || item?.easterIcon'), 'Cross-theme trophy fallback');
assert(read('www/onlinenumber.js').includes("toast.classList.add('treasury-notice')"));
assert(read('www/managers.js').includes("treasuryOpen ? 'treasury'"));
console.log(JSON.stringify({ room: 'treasury', catalog: { trophies: shop.TROPHIES.length, skins: shop.SKINS.length, effects: shop.EFFECTS.length, themePreviews: shop.THEMES.length }, results }, null, 2));
