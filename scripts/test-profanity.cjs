'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { performance } = require('node:perf_hooks');
const { containsProfanity, filterProfanity, normalizeProfanityText } = require('../lib/profanity');
const { fixture } = require('./test-global-chat-posting.cjs');
const blocked = [
    'seronja', 'govnaru', 'kurcem', 'kurvetino', 'pizdun', 'pickom', 'ODJEBITE', 'jebem', 'jebi se',
    'J E B E M', 'j.e.b.e.m', 'j_e_b_e_m', 'j3b3m', 'piiizda', 'p!zd@', 'p!i!z!d!a',
    '\u043f\u0438\u0447\u043a\u0430', '\u0408\u0415\u0411\u0415\u041c',
    '\u0434\u0440\u043a\u0430\u045f\u0438\u0458\u0430',
    'je\u200bbem', 'j\u2060e\u200dbem', 'j\u00adebem', 'j\u00e9b\u00e9m',
    'fu\u0441k', 'fuuuck', 'f.u.c.k', 'f!u!c!k', 'f u c k', 'sh1thead', 'bullsh1t',
    'c0cksucker', 'motherfucking', 'douchebag', 'assholes', 'ubi\u0107u te', 'kill yourself',
    'k y s', 'Heil Hitler', 'sieg_heil', 'p\u0435d\u0435ru', 'faggots',
    'Ovo je sranje!', 'You are a shithead.', 'idiot!', 'jebem123', '123jebem456', 'IDIOT_42',
    'A55HOLE123', 'kurcinu', 'kurvaluk', 'pickurina', 'pizdurina', 'jebemmu'
];
const allowed = [
    '', 'Ovo je bio dobar duel.', 'To je bio moj potez.', 'Sve je bez problema.',
    'Hvala svima i srecno!', 'Pobeda i poraz su deo igre.', 'Pick a game from the list.',
    'We should pick our teams.', 'I picked the first option.', 'Dickens', 'Scunthorpe', 'Fukushima',
    'Mi smo Lezbejke i gej igraci.', 'Moj prijatelj je gej.', 'Prica o nacionalnosti i veri.',
    '\u041e\u0432\u043e \u0458\u0435 \u0431\u0438\u043e \u0434\u043e\u0431\u0430\u0440 \u0434\u0443\u0435\u043b.',
    '\u041e\u043d\u0430 \u0458\u0435 \u043b\u0435\u0437\u0431\u0435\u0458\u043a\u0430.',
    'Marko', 'Milica', 'Ljubica', 'Darko', 'Srdjan', 'Djordje', 'Goran', 'Skart proizvod',
    '1234567890', '@!$'.repeat(180), 'i'.repeat(550), 'l'.repeat(550), 'g'.repeat(550)
];
async function main() {
    const source = fs.readFileSync(require.resolve('../lib/profanity'), 'utf8');
    const configured = vm.runInNewContext(source.slice(source.indexOf('const terms ='), source.indexOf('const cyrillic =')) + '\nterms');
    assert.equal(new Set(configured).size, configured.length, 'The configured list has no duplicate entries');
    for (const term of configured) {
        for (const form of [term, term.toUpperCase(), term.replace(/ /g, '').split('').join('.'),
            term.replace(/[aeiost]/g, char => ({ a: '@', e: '3', i: '1', o: '0', s: '$', t: '7' })[char])]) {
            assert.equal(containsProfanity(form), true, `Configured form missed: ${JSON.stringify(form)}`);
        }
    }
    for (const text of blocked) {
        assert.equal(containsProfanity(text), true, `Missed prohibited form: ${JSON.stringify(text)}`);
        assert.notEqual(filterProfanity(text), text);
    }
    for (const text of allowed) {
        assert.equal(containsProfanity(text), false, `False positive: ${JSON.stringify(text)}`);
        assert.equal(filterProfanity(text), text);
    }
    for (let i = 0; i < 10; i++) {
        assert.equal(containsProfanity('jebem'), true, 'Detection has no shared global regex cursor');
        assert.equal(containsProfanity('Ovo je bio dobar duel'), false);
    }
    assert.equal(normalizeProfanityText('\u0110or\u0111e \u0459\u0443\u0431\u0430\u0432'), 'djordje ljubav');
    assert.equal(filterProfanity('Poruka: seronja i shithead.'), 'Poruka: *** i ***.');
    for (const text of ['jebem', '\u043f\u0438\u0447\u043a\u0430', 'kill yourself']) {
        const f = fixture({ mongo: true, filter: filterProfanity });
        assert.equal((await f.post({ msg: text })).reason, 'err_chat_banned');
        assert.equal(f.database.messages.length, 0, 'Rejected text is never posted');
    }
    const normal = fixture({ mongo: true, filter: filterProfanity });
    assert.equal((await normal.post({ msg: 'Ovo je bio dobar duel.' })).ok, true);
    const started = performance.now();
    for (let i = 0; i < 100; i++) containsProfanity(i % 3 ? '!'.repeat(550) : 'xidiotx'.repeat(78));
    const elapsed = performance.now() - started;
    assert(elapsed < 2000, `Obfuscation performance regression: ${elapsed.toFixed(0)}ms`);
    console.log(`Profanity: ${configured.length} configured words/phrases in four forms, ${blocked.length} extra prohibited forms, ${allowed.length} safe texts/names, scripts/diacritics/obfuscation, post rejection and bounded matching passed (${elapsed.toFixed(0)}ms stress).`);
}
const watchdog = setTimeout(() => { console.error('Profanity test timed out'); process.exit(1); }, 10000);
main().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => clearTimeout(watchdog));
