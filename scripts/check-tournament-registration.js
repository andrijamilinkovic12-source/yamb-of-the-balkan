const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const room = read('www/turnir.js');
const server = read('server.js');
const languages = read('www/languages.js');
const html = read('www/index.html');
const css = read('www/theme-tournament-registration-rules.css');
const tournamentTheme = read('www/theme-tournament-final.css');

const version = '2026-10-23';
const translationKeys = [
    'tourney_participation_rules_title',
    'tourney_participation_rules_kicker',
    'tourney_participation_rules_intro',
    'tourney_participation_rules_activity_title',
    'tourney_participation_rules_activity_text',
    'tourney_participation_rules_tp_title',
    'tourney_participation_rules_tp_text',
    'tourney_participation_rules_fee',
    'tourney_participation_rules_accept',
    'tourney_participation_rules_decline',
    'tourney_rules_acceptance_required'
];

assert(room.includes("const TOURNEY_PARTICIPATION_RULES_VERSION = '" + version + "';"));
assert(room.includes('async confirmTournamentParticipationRules(fee)'));
assert(room.includes('acceptedRules = await this.confirmTournamentParticipationRules(fee);'));
assert(room.includes('tournamentRulesAccepted: true'));
assert(room.includes('tournamentRulesVersion: TOURNEY_PARTICIPATION_RULES_VERSION'));
assert(room.includes("contextClass: 'tournament'"));
assert(room.includes('registrationRulesPromptOpen'));

const serverRulesCheck = server.indexOf('playerData.tournamentRulesAccepted !== true');
const serverDebit = server.indexOf('legacyTournamentRegistration.register(edition, tournamentPlayer)', serverRulesCheck);
assert(serverRulesCheck >= 0, 'server must require explicit rules acceptance');
assert(serverDebit > serverRulesCheck, 'server must check rules acceptance before the entry fee is debited');
assert(server.includes("const TOURNEY_PARTICIPATION_RULES_VERSION = '" + version + "';"));
assert(server.includes("reason: 'tourney_rules_acceptance_required'"));
assert(server.includes('participationRulesVersion: TOURNEY_PARTICIPATION_RULES_VERSION'));
assert(server.includes('participationRulesAcceptedAt: Date.now()'));
assert(server.includes('participationRulesAcceptedAt: Number.isFinite(Number(player.participationRulesAcceptedAt))'));

for (const key of translationKeys) {
    assert.equal((languages.match(new RegExp('"' + key + '"', 'g')) || []).length, 2, key + ' must exist in Serbian and English');
}

assert(html.includes('theme-tournament-registration-rules.css?v=1'));
assert(css.includes('.tourney-participation-rules'));
assert(css.includes('.tourney-participation-rules__rule--technical'));
assert(css.includes('modal-context-tournament'));
assert(css.includes('max-height: 620px'));
assert(tournamentTheme.includes('modal-context-tournament'));
for (const theme of ['light', 'medium', 'winter', 'neon', 'amethyst', 'easter', 'desert', 'moon', 'severna']) {
    assert(tournamentTheme.includes('.' + theme + '-theme'), theme + ' must retain tournament modal palette support');
}

console.log('PASS: tournament registration requires explicit fair-play rules acceptance before entry-fee debit.');

const at = Date.parse('2026-11-20T21:00:00Z');
let local = 100, skew = 0, nextTick;
const label = { isConnected: true };
const container = { querySelector: () => label };
const manager = vm.runInNewContext(room + '\nObject.create(TournamentManager.prototype)', {
    Date: class extends Date { static now() { return at + skew; } },
    performance: { now: () => local }, window: {}, clearTimeout() {},
    setTimeout(fn) { nextTick = fn; }, t: key => key
});
Object.assign(manager, { app: {}, state: { tournamentNumber: 11, players: [], status: 'finished', resetAt: at + 3600000 } });
assert.equal(manager.formatTournamentResetCountdown(at + 3600000), '', 'do not show device time before sync');
manager.readinessTimeBase = { server: at, local };
for (skew of [-7200000, 7200000]) assert.equal(manager.formatTournamentResetCountdown(at + 3600000), '1h 0m');
manager.renderRegistration(container);
assert.equal(label.textContent, '1h 0m');
local += 60000;
nextTick();
assert.equal(label.textContent, '59m');
local += 59 * 60000;
nextTick();
assert.equal(label.textContent, manager.tr('tourney_next_registration_soon', 'uskoro'));
const match = { p1: { id: 'a' }, p2: { id: 'b' }, resultType: 'technical', p1Score: null, p2Score: null };
for (const [winnerId, label] of [['a', '1-0 TP'], ['b', '0-1 TP'], ['unknown', '']]) {
    assert.equal(manager.getMatchResultLabel({ ...match, winnerId }), label);
}
const first = { ...match, winnerId: 'a' };
assert.equal(manager.getMatchResultLabel({ ...first, p1Score: '', p2Score: ' ' }), '1-0 TP');
assert.equal(manager.getMatchResultLabel({ ...first, p1Score: '7', p2Score: 0 }), '7-0 TP');
assert.equal(manager.getMatchResultLabel({ ...first, resultType: 'regular' }), '');
assert.equal(manager.getMatchResultLabel({ ...first, scoreLabel: '600-599' }), '600-599');
console.log('PASS: official reset countdown and recorded or missing bracket scores.');

async function verifyReadinessReceipt() {
    const core = require('../www/tournamentReadinessCore');
    const player = { id: 'p', entryId: 'entry', readyDeadlineAt: at + 3600000 };
    const notice = { recipientUid: 'p', entryId: 'entry', cycleId: 'cycle', kind: 'readiness_requested', noticeId: 'entry:readiness_requested' };
    const seen = new Map(), events = [], timers = [];
    const ui = vm.runInNewContext(room + '\nObject.create(TournamentManager.prototype)', {
        window: { tournamentReadinessCore: core }, document: { getElementById: () => null },
        localStorage: { getItem: k => seen.get(k), setItem: (k,v) => seen.set(k,v) },
        setTimeout: (fn, delay) => { if (delay === 12000) timers.push(fn); }, t: k => k
    });
    Object.assign(ui, { render() {}, tournamentNow: () => at, state: { readinessPolicyVersion: core.VERSION,
        status: 'confirmation', readiness: {}, registrationCycleId: 'cycle', players: [player] },
        app: { playerId: 'p', socket: { connected: true, emit: e => events.push(e) },
            modal: { confirm: async () => true, alert() {} } } });
    await ui.maybeShowReadinessNotice(notice);
    assert.deepEqual(events, ['tourney_readiness_confirm'], 'accept is not a read receipt');
    ui.reconcileReadinessRequest(player);
    assert.equal(seen.size, 0, 'unconfirmed server snapshot does not acknowledge');
    timers[0]();
    await ui.maybeShowReadinessNotice(notice);
    timers[0]();
    assert(ui.pendingReadiness, 'timer from timed out request cannot clear a retry');
    player.readyConfirmedAt = at;
    ui.reconcileReadinessRequest(player);
    assert.equal(events.filter(e => e === 'tourney_notice_read').length, 1);
    assert(seen.has('yamb_tourney_notice_' + notice.noticeId));
    assert.equal(ui.pendingReadiness, false);
}
verifyReadinessReceipt().catch(error => { console.error(error); process.exitCode = 1; });
