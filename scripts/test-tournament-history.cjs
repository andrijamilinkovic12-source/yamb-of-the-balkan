'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { BSON } = require('mongoose').mongo;
const read = file => fs.readFileSync(require.resolve(file), 'utf8').replace(/\r\n/g, '\n');
const server = read('../server');
const state = { status: 'finished', tournamentNumber: 11 };
const backend = vm.createContext({ tournamentState: state, MAX_NAME_LENGTH: 24, sadrziPsovku: () => false });
for (const name of ['safeTournamentNumber', 'sanitizeTournamentName', 'getTournamentOpponent', 'buildCurrentFinishedChampionshipFallback']) {
    const start = server.indexOf('function ' + name + '(');
    assert(start >= 0, name);
    vm.runInContext(server.slice(start, server.indexOf('\n}', start) + 2), backend);
}
vm.runInContext(server.slice(server.indexOf('function sanitizeTournamentHistoryText('),
    server.indexOf('async function awardTournamentFinalPrizes(')), backend);
let lang = 'sr';
const client = vm.createContext({ window: {}, document: {}, localStorage: { getItem: k => k === 'yamb_lang' ? lang : null } });
const translations = read('../www/languages.js');
vm.runInContext(translations.slice(0, translations.indexOf('function setLanguage(')), client);
const ui = vm.runInContext(read('../www/turnir.js') + '\nObject.create(TournamentManager.prototype)', client);
const player = id => ({ id, name: id.toUpperCase() });
const a = player('a'), b = player('b'), c = player('c');
const review = kind => ({ kind, inactiveUids: ['private-id'], internalNotes: 'private' });
const tech = { p1: a, p2: b, winnerId: 'b', resultType: 'technical', p1Score: null, p2Score: null };

async function checkWalkover() {
    const match = { ...tech, p1: null, scoreLabel: '0-1 TP', technicalWinReason: 'administrative_walkover' };
    state.bracket = { qf: [], sf: [], f: [match] };
    const record = await backend.buildTournamentChampionshipRecord(match, b);
    const fallback = backend.buildCurrentFinishedChampionshipFallback({ playerId: b.id });
    const setRecord = value => { ui.tourneyLeaderboard = [{ wins: 1, playerId: b.id, championships: [value] }]; };
    const checkCanvas = async (share, subtitle) => {
        const labels = [];
        const ctx = new Proxy({ measureText: s => ({ width: s.length * 10 }), fillText: s => labels.push(s),
            createLinearGradient: () => ({ addColorStop() {} }) }, { get: (target, key) => target[key] ?? (() => {}) });
        client.document.createElement = () => ({ getContext: () => ctx, toBlob: fn => fn({}) });
        await ui.createChampionShareImage(share);
        assert(labels.includes(subtitle));
        assert(!labels.includes(client.t('player_guest')));
        assert(!labels.includes(client.t('tourney_finalist_title') + ': ' + client.t('tourney_finalist_title')));
    };
    for (lang of ['sr', 'en']) {
        const reason = lang === 'sr' ? 'Administrativna pobeda' : 'Win by walkover';
        for (const summary of [{}, { runnerUpName: 'Finalista' }]) {
            setRecord({ ...record, runnerUpName: null, ...summary });
            const share = ui.getChampionSharePayload(0);
            assert.equal(share.runnerUpName, '', 'no finalist in an uncontested final');
            assert.equal(share.path[0].opponent, '');
            assert.equal(share.finalScore, '0-1 TP');
            const path = ui.createChampionPathHTML(record);
            assert(path.includes(reason) && !path.includes(client.t('player_guest')));
            const card = ui.getLeaderboardHTML().split('<style>')[0];
            assert(card.includes(reason) && !card.includes(client.t('tourney_finalist_title') + ':'));
            await checkCanvas(share, reason);
        }
        const regular = { ...match, p1: a, resultType: 'regular', technicalWinReason: '', scoreLabel: '490-500' };
        setRecord({ ...record, runnerUpName: null, scoreLabel: regular.scoreLabel, bracket: { f: [regular] } });
        const share = ui.getChampionSharePayload(0);
        assert.equal(share.runnerUpName, a.name, 'read finalist from bracket if summary is incomplete');
        assert.equal(share.path[0].opponent, a.name);
        assert.equal(share.finalScore, regular.scoreLabel);
        await checkCanvas(share, client.t('tourney_finalist_title') + ': ' + a.name);
        assert(!ui.getLeaderboardHTML().includes(reason));
        const unexplained = { ...match, technicalWinReason: '' };
        setRecord({ ...record, runnerUpName: null, bracket: { f: [unexplained] } });
        assert(!ui.createChampionPathHTML({ ...record, bracket: { f: [unexplained] } }).includes(reason));
        assert(!ui.getLeaderboardHTML().includes(reason));
    }
    assert.equal(record.runnerUpName, '');
    assert.equal(fallback.runnerUpName, '');
}

async function main() {
    state.bracket = {
        qf: [tech, { p1: player('d'), p2: player('e'), review: review('double_dq') },
            { p1: player('f'), p2: player('g'), review: review('void') },
            { p1: player('h'), p2: c, winnerId: 'c', resultType: 'regular', p1Score: 0, p2Score: '700', drawCount: 1, lastDrawScoreLabel: '680-680' }],
        sf: [{ p1: b, p2: null, winnerId: 'b', review: review('bye'), p1Score: null, p2Score: null },
            { p1: null, p2: c, winnerId: 'c', review: review('bye') }],
        f: [{ ...tech, p1: b, p2: c, winnerId: 'b', p1Score: '', p2Score: ' ' }]
    };
    const original = structuredClone(state.bracket);
    const record = await backend.buildTournamentChampionshipRecord(state.bracket.f[0], b);
    const archived = JSON.parse(JSON.stringify(BSON.deserialize(BSON.serialize(record))));
    const fallback = backend.buildCurrentFinishedChampionshipFallback({ playerId: 'b' });
    assert.deepEqual(JSON.parse(JSON.stringify(fallback.bracket)), archived.bracket);
    assert.deepEqual(state.bracket, original, 'archiving must not mutate live matches');
    assert.equal(archived.bracket.qf[0].p1Score, null, 'missing is not zero');
    assert.equal(archived.bracket.qf[3].p1Score, 0);
    assert.equal(archived.bracket.qf[3].p2Score, 700);
    assert.equal(archived.bracket.qf[3].lastDrawScoreLabel, '680-680');
    assert(!JSON.stringify(archived).includes('private'));
    assert.equal(backend.sanitizeTournamentHistoryMatch(null), null);
    assert.equal(backend.sanitizeTournamentHistoryMatch({ p1: null, p2: null }), null);
    assert(!backend.sanitizeTournamentHistoryMatch({ ...tech, review: review('unknown') }).review);
    assert.equal(backend.sanitizeTournamentHistoryMatch({ ...tech, scoreLabel: '9-4 TP' }).scoreLabel, '9-4 TP');
    ui.tourneyLeaderboard = [{ playerId: 'b', wins: 1, championships: [archived] }];
    for (lang of ['sr', 'en']) {
        const empty = backend.sanitizeTournamentHistoryMatch({ p1: null, p2: null, review: review('empty') });
        assert(ui.createHistoryBracketMatchHTML(empty, 'b').includes(client.t('tourney_review_empty')));
        for (const [round, matches] of Object.entries(state.bracket)) {
            matches.forEach((m, i) => {
                const expected = ui.getMatchResultLabel(m);
                const saved = archived.bracket[round][i];
                assert(expected && ui.getMatchResultLabel(saved) === expected, lang + ': ' + round + '/' + i);
                if (m.review) assert.equal(expected, client.t('tourney_review_' + m.review.kind));
                assert(ui.createHistoryBracketMatchHTML(saved, 'b').includes(expected));
            });
        }
        const path = ui.createChampionPathHTML(archived);
        const share = ui.getChampionSharePayload(0);
        assert.equal(share.finalScore, '1-0 TP');
        assert.equal(share.path[0].score, '0-1 TP');
        assert.equal(share.path[1].score, client.t('tourney_review_bye'));
        assert.equal(share.path[1].opponent, '');
        for (const step of share.path) assert(path.includes(step.score));
    }
    assert.equal(ui.getChampionshipFinalScore({ scoreLabel: '850-820' }), '850-820');
    assert.equal(ui.getChampionshipFinalScore({}), '-');
    assert.equal(ui.getMatchResultLabel({ ...tech, scoreLabel: 'A&B' }), 'A&amp;B');
    const old = { ...tech, p1Score: 0, p2Score: 0 };
    assert.equal(ui.getMatchResultLabel(old), '0-1 TP');
    assert.equal(ui.getMatchResultLabel({ ...old, winnerId: 'a' }), '1-0 TP');
    assert.equal(ui.getMatchResultLabel({ ...old, winnerId: 'unknown' }), '');
    assert.equal(ui.getMatchResultLabel({ ...old, resultType: '', p1: null }), '', 'do not infer a missing decision');
    assert.equal(ui.getMatchResultLabel({ ...old, resultType: 'regular' }), '0-0');
    assert.equal(ui.getMatchResultLabel({ ...old, scoreLabel: '0-0 TP' }), '0-0 TP', 'preserve explicit historical scores');
    await checkWalkover();
    console.log('PASS: live results, old walkover and normal finals in SR/EN championship history, title path and share image.');
}
main().catch(err => { console.error(err); process.exitCode = 1; });
