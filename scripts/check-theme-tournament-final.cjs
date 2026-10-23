const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const themes = ['dark', 'light', 'medium', 'winter', 'neon', 'amethyst', 'easter', 'desert', 'moon', 'severna'];
const roles = [
    ['tournament-awards', 'champion-trophy'], ['tournament-awards', 'finalist-silver'],
    ...['tab-info', 'tab-bracket', 'tab-hall-of-fame'].map(role => ['tournament-navigation', role]),
    ...['state-register', 'state-unregister', 'state-registration-locked', 'state-start',
        'state-match-active', 'state-match-complete'].map(role => ['tournament-states', role]),
    ...['gold', 'silver', 'bronze'].map(tier => ['competition-medals', `tournament-${tier}`])
];
const fingerprint = new Map();
const palette = read('www/theme-card-surfaces.css');
function luminance(hex) {
    const rgb = hex.match(/^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i).slice(1)
        .map(channel => parseInt(channel, 16) / 255)
        .map(channel => channel <= .04045 ? channel / 12.92 : ((channel + .055) / 1.055) ** 2.4);
    return .2126 * rgb[0] + .7152 * rgb[1] + .0722 * rgb[2];
}
function contrast(a, b) {
    const left = luminance(a), right = luminance(b);
    return (Math.max(left, right) + .05) / (Math.min(left, right) + .05);
}
for (const theme of themes) {
    const prefix = theme === 'dark' ? 'green-soft-clay' : `theme-packs/${theme}`;
    for (const [group, role] of roles) {
        const file = path.join(root, 'www/assets', prefix, 'canonical', group, `${role}-v1.png`);
        assert(fs.existsSync(file), `${theme}/${group}/${role}: missing PNG`);
        const bytes = fs.readFileSync(file);
        assert.equal(bytes.subarray(0, 8).toString('hex'), '89504e470d0a1a0a', `${theme}/${role}: invalid PNG`);
        const size = [bytes.readUInt32BE(16), bytes.readUInt32BE(20)];
        assert.deepEqual(size, role === 'champion-trophy' ? [384, 384] : [256, 256], `${theme}/${role}: size mismatch`);
        const key = `${group}/${role}`;
        if (!fingerprint.has(key)) fingerprint.set(key, new Set());
        const hash = crypto.createHash('sha256').update(bytes).digest('hex');
        assert(!fingerprint.get(key).has(hash), `${theme}/${role}: duplicated across themes`);
        fingerprint.get(key).add(hash);
    }
    if (theme !== 'dark') {
        const block = palette.match(new RegExp(`body\\.${theme}-theme\\s*\\{([^}]+)\\}`));
        assert(block, `${theme}: missing card palette`);
        const token = name => {
            const match = block[1].match(new RegExp(`--theme-card-${name}:\\s*(#[0-9a-fA-F]{6})`));
            assert(match, `${theme}: missing ${name}`);
            return match[1];
        };
        for (const [foreground, background] of [['ink', 'surface'], ['ink', 'raised'],
            ['muted', 'surface'], ['surface', 'primary']]) {
            assert(contrast(token(foreground), token(background)) >= 4.5,
                `${theme}: insufficient ${foreground}/${background} contrast`);
        }
    }
}
assert.equal(roles.length, 14);
const room = read('www/turnir.js');
const game = read('www/game.js');
const intro = read('www/theme-main-room-icons.css');
const config = read('www/config.js');
const languages = read('www/languages.js');
const html = read('www/index.html');
assert(config.includes('durationMs: 3200') && room.includes('window.ROOM_INTRO_TIMING?.durationMs ?? 3200'));
assert(intro.includes('#tournament-intro,') && intro.includes('animation-duration: var(--room-intro-duration) !important'));
assert(!/assets\/(?:easter|desert|severna)-soft-clay\/tournament\//.test(room));
assert(!/assets\/[^"'\s]*tournament[^"'\s]*\.svg/.test(room + game));
assert(room.includes('tourney-champion-finalist-icon-canonical') && room.includes('tourney-participant-power-icon-green'));
assert(game.includes('showTournamentFinalCeremony(ceremonyData)') && game.includes('getThemeMedalSource(\'tournament\', \'silver\''));
assert(!languages.includes('"tourney_finalist_title": "FINALISTA 🥈"'));
assert(html.includes('theme-tournament-final.css'));
console.log(`PASS: ${themes.length} themes × ${roles.length} unique canonical Tournament PNG roles, intro and active-path checks.`);
