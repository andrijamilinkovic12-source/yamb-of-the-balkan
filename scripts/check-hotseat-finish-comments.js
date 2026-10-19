const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const game = read('www/game.js');
const html = read('www/index.html');
const css = read('www/theme-solo-results.css');
const languages = read('www/languages.js');
const method = name => {
    const source = game.match(new RegExp(`    ${name}\\([^\\n]*\\) \\{[\\s\\S]*?\\r?\\n    \\}`))?.[0];
    assert(source, `${name} missing`);
    return source;
};
const storage = new Map();
const localStorage = {
    getItem: key => storage.get(key) ?? null,
    setItem: (key, value) => storage.set(key, value)
};
const deterministicMath = Object.assign(Object.create(Math), { random: () => 0 });
const methods = vm.runInNewContext(`({${method('getHotseatFinishMarginBand')},${method('getHotseatFinishCommentKey')}})`,
    { localStorage, Math: deterministicMath, Number });
for (const [difference, expected] of [
    [0, 'draw'], [1, 'close'], [50, 'close'], [51, 'narrow'], [100, 'narrow'],
    [101, 'clear'], [200, 'clear'], [201, 'strong'], [300, 'strong'], [301, 'decisive']
]) assert.equal(methods.getHotseatFinishMarginBand(difference), expected, `difference ${difference}`);

const bands = ['draw', 'close', 'narrow', 'clear', 'strong', 'decisive'];
for (const band of bands) {
    const context = {};
    const first = methods.getHotseatFinishCommentKey.call(context, band);
    const second = methods.getHotseatFinishCommentKey.call(context, band);
    assert.notEqual(first, second, `${band}: adjacent comments must differ`);
    const reloaded = methods.getHotseatFinishCommentKey.call({}, band);
    assert.notEqual(second, reloaded, `${band}: persisted last comment must be respected`);
    for (const suffix of ['', '_v2', '_v3']) {
        const key = `go_hotseat_comment_${band}${suffix}`;
        const matches = [...languages.matchAll(new RegExp(`"${key}": "([^"]+)"`, 'g'))];
        assert.equal(matches.length, 2, `${key}: Serbian and English text required`);
        for (const [, value] of matches) {
            for (const placeholder of band === 'draw' ? ['{player1}', '{player2}'] : ['{winner}', '{loser}']) {
                assert(value.includes(placeholder), `${key}: missing ${placeholder}`);
            }
        }
    }
}
assert(html.includes('id="hotseat-result-comment"') && html.indexOf('id="hotseat-result-comment"') > html.indexOf('id="solo-finish-stats"'));
assert(css.includes('#game-over-screen.is-hotseat-result .hotseat-result-comment:not([hidden])'));
assert(game.includes("if (isHeadToHeadFinish && finalResults.length === 2)"));
assert(game.includes("hotseatComment.textContent = template"), 'names must enter as safe text');
assert(game.includes("if (hotseatComment) { hotseatComment.hidden = true; hotseatComment.textContent = ''; }"),
    'technical results must clear the comment');
console.log('Hotseat finish comments: 6 outcomes x 3 localized variants, boundaries and no-repeat rotation OK.');
