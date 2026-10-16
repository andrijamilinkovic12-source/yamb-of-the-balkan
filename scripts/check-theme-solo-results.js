const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const themes = ['dark', 'light', 'medium', 'winter', 'neon', 'amethyst', 'easter', 'desert', 'moon', 'severna'];
const roles = ['weekly', 'monthly', 'all_time', 'personal'];
const html = read('www/index.html');
const game = read('www/game.js');
const server = read('server.js');
const css = read('www/theme-solo-results.css');
const languages = read('www/languages.js');
const preview = read('docs/theme-solo-records-review.html');
const finishPreview = read('docs/theme-solo-finish-screen-review.html');
const mobilePreview = read('docs/theme-solo-finish-screen-mobile.html');
const clientCode = read('www/theme-solo-results.js');
const manifest = JSON.parse(read('source-assets/theme-solo-results-v1/manifest.json'));
const panelManifest = JSON.parse(read('source-assets/theme-solo-record-panels-v1/manifest.json'));
const recordIconManifest = JSON.parse(read('source-assets/theme-solo-record-icons-v1/manifest.json'));
const contrast = (a, b) => {
    const luminance = hex => {
        const rgb = [1, 3, 5].map(index => parseInt(hex.slice(index, index + 2), 16) / 255)
            .map(value => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
        return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
    };
    const x = luminance(a), y = luminance(b);
    return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
};

assert.equal(manifest.assets.length, 27);
assert(html.includes('id="solo-record-panel"') && !html.includes('id="solo-record-icon"'));
for (const role of roles) {
    assert(html.includes(`data-record-role="${role}"`));
    assert(game.includes(`achieved.has(item.dataset.recordRole)`));
}
assert(html.includes('id="solo-power-index-icon"'));
assert(html.includes('id="solo-power-index-gain"'));
const columnKeys = ['Nadole', 'Slobodna', 'Sredina', 'Nagore', 'Ručno', 'Najava'];
const columnMarks = ['col_down', 'col_free', 'col_middle', 'col_up', 'col_manual', 'col_announce'];
const summarySource = game.match(/getSoloFinishSummary\(pIdx\) \{[\s\S]*?(?=\r?\n    getSoloFinishMessageKey)/)?.[0];
assert(summarySource, 'Solo finish summary method missing');
const summarize = vm.runInNewContext(`({${summarySource}}).getSoloFinishSummary`, {
    KOLONE: columnKeys,
    REDOVI_IGRA: ['1', '2', '3', '4', '5', '6', 'Triling', 'Kenta', 'Ful', 'Poker', 'Yamb'],
    Math, Number
});
const blankSheet = () => Object.fromEntries(columnKeys.map(col => [col, {}]));
const summaryContext = sheet => ({ allScores: sheet ? [sheet] : [], calculateMiddleSectionScore: () => 0 });
assert.equal(summarize.call(summaryContext(null), 0).bestColumnKey, null);
const emptySummary = summarize.call(summaryContext(blankSheet()), 0);
assert.equal(emptySummary.bestColumn, 0);
assert.equal(emptySummary.bestColumnKey, null);
const distinctSheet = blankSheet();
distinctSheet.Nadole.Triling = 15;
distinctSheet.Nagore.Triling = 20;
const distinctSummary = summarize.call(summaryContext(distinctSheet), 0);
assert.equal(distinctSummary.bestColumn, 20);
assert.equal(distinctSummary.bestColumnKey, 'Nagore');
distinctSheet.Nadole.Triling = 20;
assert.equal(summarize.call(summaryContext(distinctSheet), 0).bestColumnKey, 'Nadole', 'tied columns should follow board order');
const bonusSheet = blankSheet();
for (const row of ['1', '2', '3', '4', '5', '6']) bonusSheet.Slobodna[row] = 10;
bonusSheet.Nagore.Yamb = 85;
const bonusSummary = summarize.call(summaryContext(bonusSheet), 0);
assert.equal(bonusSummary.bestColumn, 90, 'upper bonus must count towards strongest column');
assert.equal(bonusSummary.bestColumnKey, 'Slobodna');
for (const [index, col] of columnKeys.entries()) {
    assert(game.includes(`${col === 'Ručno' ? "'Ručno'" : col}: '${columnMarks[index]}'`));
    assert(finishPreview.includes(`<option value="${col}"`), `${col}: missing finish preview choice`);
}
assert(game.includes("document.querySelector(`#game-scene .player-table .col-header.${columnClasses[col]}`)"));
assert(game.includes("getComputedStyle(boardHeader)"));
assert(game.includes("getComputedStyle(icon).display !== 'none'"));
assert(mobilePreview.includes("document.querySelector(`#game-scene .player-table .col-header.${columnClasses[column]}`)"));
assert(mobilePreview.includes('assets/easter-soft-clay/game/announce-v1.png'));
assert(mobilePreview.includes('assets/theme-packs/neon/canonical/game-board/announce-megaphone-v1.png'));
assert(mobilePreview.includes('const bonusRates={personal:10,weekly:10,monthly:10,all_time:20}'));
assert(mobilePreview.includes('Math.min(8000,Math.floor(score*(100+bonusPercent)/100))'));
assert(mobilePreview.includes('Math.min(8000,baseReward*2)'));
assert(html.includes('id="solo-finish-best-column"'));
assert(game.includes('scoreResult.recordAchievements'));
assert(game.includes('scoreResult.soloRewardPreview'));
assert(game.includes('queuedResult.powerIndexGain'));
assert(!game.includes('getSoloRecordThresholdsBeforeGame') && !game.includes('getSoloRecordState('));
assert(game.includes('...soloPowerIndex') && !game.includes('...soloRecords'));
assert(server.includes('recordAchievements: normalizeSoloRecordAchievements(savedScore.recordAchievements)'));
assert(server.includes('soloScoreRecord?.recordAchievements || []'));
assert(server.includes('powerIndexAfter - powerIndexBefore'));
assert(css.includes('.solo-record-panel-grid > span.is-achieved'));
assert(css.includes('color-mix(in srgb,var(--solo-record-accent) 13%'));
assert(css.includes('.solo-record-panel-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr))'));
assert(css.includes('background:var(--solo-record-panel-image) center / 100% 100% no-repeat'));
assert.equal(panelManifest.assets.length, 10);
assert.equal(recordIconManifest.assets.length, 40);
assert.equal(new Set(recordIconManifest.assets.map(item => item.masterSha256)).size, 40, 'record masters must be independent');
assert.equal(new Set(recordIconManifest.assets.map(item => item.runtimeSha256)).size, 40, 'record PNGs must be distinct');
assert(html.includes('data-solo-record-icon="weekly"'));
assert(html.includes('class="solo-record-accessible-name"'));
assert(!css.includes('overflow-y: auto !important;'));
assert(game.includes("['finish-score-mark', 'finish-claim', 'record-panel']"));
assert(game.includes("assets/green-soft-clay/canonical/solo-results/record-panel-v1.png?v=1"));
const combinations = {
    none: [], p: ['personal'], w: ['weekly'], m: ['monthly'],
    pw: ['personal', 'weekly'], pm: ['personal', 'monthly'], wm: ['weekly', 'monthly'],
    pwm: ['personal', 'weekly', 'monthly'], pa: ['personal', 'all_time'],
    pwa: ['personal', 'weekly', 'all_time'], pma: ['personal', 'monthly', 'all_time'],
    pwma: roles
};
const recordSelect = finishPreview.match(/<select id="record">([\s\S]*?)<\/select>/)?.[1];
const panelSelect = preview.match(/<select id="case-select">([\s\S]*?)<\/select>/)?.[1];
assert(recordSelect && panelSelect, 'missing record selectors in review pages');
for (const [key, flags] of Object.entries(combinations)) {
    assert(recordSelect.includes(`<option value="${key}"`), `finish preview missing ${key}`);
    assert(panelSelect.includes(`<option value="${key}"`), `panel preview missing ${key}`);
    assert(flags.every(role => roles.includes(role)), `${key}: unknown record role`);
    assert(!flags.includes('all_time') || flags.includes('personal'), `${key}: all-time must imply personal`);
}
assert.equal([...recordSelect.matchAll(/<option value=/g)].length, 13, 'finish preview: 12 combinations plus pending');
assert.equal([...panelSelect.matchAll(/<option value=/g)].length, 13, 'panel preview: 12 combinations plus pending');
const previewStatesSource = preview.match(/const states=([^;]+);/)?.[1];
const mobileStatesSource = mobilePreview.match(/const recordOptions=([^;]+);/)?.[1];
assert(previewStatesSource && mobileStatesSource, 'review state maps missing');
const panelStates = vm.runInNewContext(`(${previewStatesSource})`, { labels: roles.map(role => [role, role]) });
const mobileStates = vm.runInNewContext(`(${mobileStatesSource})`);
for (const [name, states] of [['panel', panelStates], ['finish', mobileStates]]) {
    assert.equal(Object.keys(states).length, 13, `${name}: wrong number of states`);
    assert.equal(states.pending, null, `${name}: pending must remain separate`);
    for (const [key, flags] of Object.entries(combinations)) {
        assert.deepEqual([...states[key]].sort(), [...flags].sort(), `${name}: wrong flags for ${key}`);
    }
}
for (const theme of themes) {
    const panel = panelManifest.assets.find(item => item.theme === theme);
    assert(panel, `${theme}: missing Solo panel manifest entry`);
    const panelFile = path.join(root, panel.runtime);
    const bytes = fs.readFileSync(panelFile);
    assert.equal(bytes.subarray(0, 8).toString('hex'), '89504e470d0a1a0a', `${theme}: invalid panel PNG`);
    assert.equal(bytes.readUInt32BE(16), 768, `${theme}: wrong panel width`);
    assert.equal(bytes.readUInt32BE(20), 320, `${theme}: wrong panel height`);
    assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'), panel.runtimeSha256, `${theme}: panel differs from manifest`);
    assert(panel.minimumCellContrast >= 4.5, `${theme}: weak PNG cell contrast`);
    assert(css.includes(`--solo-record-cell-ink:${panel.cellInk}`), `${theme}: raster/text palette mismatch`);
    assert(css.includes(`${theme === 'dark' ? 'green-soft-clay' : `theme-packs/${theme}`}/canonical/solo-results/record-panel-v1.png`));
    const rootAsset = theme === 'dark' ? 'green-soft-clay' : `theme-packs/${theme}`;
    const power = path.join(root, 'www/assets', rootAsset, 'canonical/statistics-overview/power-index-v1.png');
    assert(fs.existsSync(power), `${theme}: missing canonical Power Index PNG`);
    assert.equal(fs.readFileSync(power).subarray(0, 8).toString('hex'), '89504e470d0a1a0a', `${theme}: invalid Power Index PNG`);
    for (const role of roles) {
        const item = recordIconManifest.assets.find(asset => asset.theme === theme && asset.role === role);
        assert(item, `${theme}/${role}: missing independent record icon`);
        const file = path.join(root, item.runtime);
        const bytes = fs.readFileSync(file);
        assert.equal(bytes.subarray(0, 8).toString('hex'), '89504e470d0a1a0a', `${theme}/${role}: invalid PNG`);
        assert.equal(bytes.readUInt32BE(16), 160, `${theme}/${role}: wrong icon width`);
        assert.equal(bytes.readUInt32BE(20), 160, `${theme}/${role}: wrong icon height`);
        assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'), item.runtimeSha256);
        assert(game.includes('canonical/solo-record-icons/${role}-v1.png'));
    }
    const selector = theme === 'dark' ? '#game-over-screen' : `body.${theme}-theme #game-over-screen`;
    const vars = css.match(new RegExp(`${selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')} \\{([^}]+)\\}`))?.[1];
    assert(vars, `${theme}: missing panel palette`);
    const color = key => vars.match(new RegExp(`${key}:\s*(#[0-9a-fA-F]{6})`))?.[1];
    for (const surface of ['--solo-record-top', '--solo-record-bottom']) {
        assert(contrast(color('--solo-record-ink'), color(surface)) >= 4.5, `${theme}: weak panel text contrast on ${surface}`);
    }
    if (theme !== 'dark') {
        assert(css.includes(`body.${theme}-theme #game-over-screen { --solo-record-top:`), `${theme}: missing themed panel material`);
        for (const role of ['finish-score-mark', 'finish-claim']) {
            const item = manifest.assets.find(asset => asset.theme === theme && asset.role === role);
            assert(item && fs.existsSync(path.join(root, item.runtime)), `${theme}/${role}: missing Solo result asset`);
        }
    }
    assert(preview.includes(`['${theme}'`));
}
for (const key of ['go_records_title', 'go_record_personal', 'go_record_weekly', 'go_record_monthly', 'go_record_all_time', 'go_record_none', 'go_record_pending', 'go_power_index_change', 'go_claim_amount', 'go_double_amount']) {
    assert(languages.includes(`"${key}"`), `missing ${key} translation`);
}
const method = server.match(/^function calculateSoloRecordPayout\(score, achievements = \[\]\) \{[\s\S]*?^\}/m)?.[0];
assert(method, 'server payout helper missing');
const maxScore = Number(server.match(/const MAX_SCORE = (\d+);/)?.[1]);
assert.equal(maxScore, 3500, 'unexpected maximum verified score');
const payout = vm.runInNewContext(`(${method})`, {
    MAX_SCORE: maxScore, MAX_REWARD_PER_GAME: 8000,
    toSafeInt: value => Math.floor(Number(value) || 0),
    normalizeSoloRecordAchievements: value => roles.filter(role => value.includes(role)),
    SOLO_RECORD_BONUS_BPS: { personal: 1000, weekly: 1000, monthly: 1000, all_time: 2000 },
    Math
});
assert.equal(payout(2000, []).baseReward, 2000);
assert.equal(payout(2000, ['personal', 'weekly']).baseReward, 2400);
assert.equal(payout(2000, roles).baseReward, 3000);
assert.equal(payout(2000, roles).adReward, 6000);
assert.equal(payout(2860, roles).baseReward, 4290);
assert.equal(payout(2860, roles).adReward, 8000);
assert.equal(payout(6000, roles).baseReward, 5250, 'verified score must be clamped before payout');
assert.equal(payout(6000, roles).adReward, 8000);
for (const [key, flags] of Object.entries(combinations)) {
    const bonusBps = flags.reduce((sum, role) => sum + (role === 'all_time' ? 2000 : 1000), 0);
    assert.equal(payout(2000, flags).bonusBps, bonusBps, `${key}: wrong bonus`);
    assert.equal(payout(2000, flags).baseReward, 2000 + bonusBps / 5, `${key}: wrong base reward`);
    assert.equal(payout(2000, flags).adReward, Math.min(8000, (2000 + bonusBps / 5) * 2), `${key}: wrong ad reward`);
}
let activeTheme = 'neon';
const image = role => ({
    dataset: { soloResultsRole: role },
    getAttribute(name) { return name === 'src' ? this.src : null; },
    removeAttribute(name) { if (name === 'src') delete this.src; }
});
const finishImages = ['finish-score-mark', 'finish-claim'].map(image);
const recordImages = roles.map(role => ({
    dataset: { soloRecordIcon: role },
    getAttribute(name) { return name === 'src' ? this.src : null; },
    removeAttribute(name) { if (name === 'src') delete this.src; }
}));
const powerIcon = {
    getAttribute(name) { return name === 'src' ? this.src : null; },
    removeAttribute(name) { if (name === 'src') delete this.src; }
};
const document = {
    readyState: 'complete',
    body: { classList: { contains: name => name === `${activeTheme}-theme` } },
    documentElement: { dataset: {} },
    getElementById: name => name === 'solo-power-index-icon' ? powerIcon
        : { classList: { contains: () => false } },
    querySelectorAll: selector => selector.includes('data-solo-record-icon') ? recordImages : finishImages
};
const window = {};
class MutationObserver { observe() {} }
vm.runInNewContext(clientCode, { window, document, MutationObserver, localStorage: { getItem: () => activeTheme } });
window.themeSoloResults.sync(true);
assert(powerIcon.src.includes('/neon/canonical/statistics-overview/power-index-v1.png'));
for (const item of finishImages) assert(item.src.includes(`/neon/canonical/solo-results/${item.dataset.soloResultsRole}-v1.png`));
for (const item of recordImages) assert(item.src.includes(`/neon/canonical/solo-record-icons/${item.dataset.soloRecordIcon}-v1.png`));
activeTheme = 'dark';
window.themeSoloResults.sync();
assert(!powerIcon.src, 'old theme Power Index icon must clear immediately');
for (const item of finishImages) assert(!item.src, 'old theme finish PNG must clear immediately');
for (const item of recordImages) assert(!item.src, 'old theme record PNG must clear immediately');
window.themeSoloResults.sync(true);
assert(powerIcon.src.includes('/green-soft-clay/canonical/statistics-overview/power-index-v1.png'));
for (const item of recordImages) assert(item.src.includes(`/green-soft-clay/canonical/solo-record-icons/${item.dataset.soloRecordIcon}-v1.png`));
const classifierMethod = server.match(/^async function getSoloRecordAchievementsBeforeInsert\(uid, score, recordDate, snapshots\) \{[\s\S]*?^\}/m)?.[0];
assert(classifierMethod, 'server record classifier missing');
let previousPersonal = null;
let weeklyStart = new Date('2026-10-12T00:00:00Z');
let monthlyStart = new Date('2026-10-01T00:00:00Z');
const classify = vm.runInNewContext(`(${classifierMethod})`, {
    Score: { findOne() { return { sort() { return this; }, select() { return this; }, async lean() { return previousPersonal === null ? null : { score: previousPersonal }; } }; } },
    getLeaderboardPeriodStart: period => period === 'weekly' ? weeklyStart : period === 'monthly' ? monthlyStart : null,
    LEADERBOARD_RECORD_PERIODS: ['weekly', 'monthly', 'all_time'],
    normalizeSoloRecordAchievements: value => roles.filter(role => value.includes(role)),
    toSafeInt: value => Math.floor(Number(value) || 0),
    Math
});
(async () => {
    for (const [key, flags] of Object.entries(combinations)) {
        previousPersonal = flags.includes('personal') ? 1000 : 2000;
        weeklyStart = new Date('2026-10-12T00:00:00Z');
        monthlyStart = new Date('2026-10-01T00:00:00Z');
        let recordDate = new Date('2026-10-16T12:00:00Z');
        if (key === 'm' || key === 'pm' || key === 'pa' || key === 'pwa') {
            // In the first days of a month, the active week can start in the prior month.
            weeklyStart = new Date('2026-09-28T00:00:00Z');
            recordDate = key === 'pwa' ? new Date('2026-09-30T12:00:00Z') : new Date('2026-10-02T12:00:00Z');
        }
        if (key === 'pma') recordDate = new Date('2026-10-05T12:00:00Z');
        if (key === 'pa') recordDate = new Date('2026-09-20T12:00:00Z');
        const snapshots = {
            weekly: { score: flags.includes('weekly') ? 1500 : 2500 },
            monthly: { score: flags.includes('monthly') ? 1500 : 2500 },
            all_time: { score: flags.includes('all_time') ? 1700 : 3000 }
        };
        const actual = [...await classify('player', 2000, recordDate, snapshots)];
        assert.deepEqual(actual, roles.filter(role => flags.includes(role)), `${key}: wrong server record combination`);
    }
    previousPersonal = 2500;
    const inconsistent = { weekly: { score: 2500 }, monthly: { score: 2500 }, all_time: { score: 1700 } };
    assert.deepEqual([...await classify('player', 2000, new Date('2026-09-20'), inconsistent)], [], 'all-time cannot be granted without personal');
    const tied = { weekly: { score: 2000 }, monthly: { score: 2000 }, all_time: { score: 2000 } };
    previousPersonal = 2000;
    assert.deepEqual([...await classify('player', 2000, new Date('2026-10-16'), tied)], [], 'ties must not award records');
    console.log('Solo panel: 10 themes, 12 confirmed combinations plus pending, period boundaries, strict records, payout and cap OK.');
})().catch(error => { console.error(error); process.exitCode = 1; });
