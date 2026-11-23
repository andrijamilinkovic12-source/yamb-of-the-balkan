'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const www = path.join(__dirname, '..', 'www');
const source = fs.readFileSync(path.join(www, 'languages.js'), 'utf8');
const catalog = vm.runInNewContext(source + '\nTRANSLATIONS', { document: { addEventListener() {} } });
const problems = [];
const slots = value => (value.match(/\{\w+\}/g) || []).sort().join(' ');
for (const lang of ['sr', 'en']) {
    const section = source.split('    ' + lang + ': {')[1].split('\n    }')[0];
    const seen = new Set();
    for (const [, key] of section.matchAll(/^\s*"([^"]+)":/gm)) {
        if (seen.has(key)) problems.push(lang + ' duplicate: ' + key);
        seen.add(key);
    }
    assert.equal(seen.size, Object.keys(catalog[lang]).length, 'Catalog key scanner: ' + lang);
    for (const [key, value] of Object.entries(catalog[lang])) {
        if (typeof value !== 'string' || !value.trim()) problems.push(lang + ' empty: ' + key);
        if (!Object.hasOwn(catalog[lang === 'sr' ? 'en' : 'sr'], key)) problems.push('Unpaired: ' + key);
        else if (lang === 'sr' && slots(value) !== slots(catalog.en[key])) problems.push('Placeholder mismatch: ' + key);
    }
}
let uses = 0;
for (const file of fs.readdirSync(www).filter(name => /\.(js|html)$/.test(name) && !name.endsWith('.min.js'))) {
    const content = fs.readFileSync(path.join(www, file), 'utf8');
    for (const match of content.matchAll(/(?:\b(?:t|gt|tt|tr|_t|_safeT|recordLabel|detailLabel)\(\s*|\bdata-lang(?:-title|-aria|-placeholder)?=)["']([\w-]+)["'](?!\s*\+)/g)) {
        uses++;
        if (!Object.hasOwn(catalog.sr, match[1])) problems.push(file + ': unknown key ' + match[1]);
    }
    if (file === 'player-mailbox.js') {
        for (const [, suffix] of content.matchAll(/\blabel\(['"](\w+)['"]/g)) {
            uses++;
            if (!Object.hasOwn(catalog.sr, 'mailbox_' + suffix)) problems.push('Unknown mailbox key: ' + suffix);
        }
    }
}
const context = vm.createContext({
    window: { location: { hostname: 'qa.invalid' } }, localStorage: { getItem: () => null },
    document: { documentElement: { dataset: {} }, addEventListener() {} }, URL
});
const loadData = (file, expression) => vm.runInContext(fs.readFileSync(path.join(www, file), 'utf8') + '\n' + expression, context);
const shop = loadData('config.js', 'SHOP_DATA');
let items = 0;
for (const [group, entries] of Object.entries(shop)) {
    for (const item of entries) {
        items++;
        const fields = [group === 'TROPHIES' ? 'title' : 'name', 'category'];
        if (group !== 'SKINS' || item.desc) fields.push('desc');
        for (const field of fields) for (const lang of ['sr', 'en']) {
            assert.ok(item[field]?.[lang]?.trim(), [group, item.id, field, lang].join('.'));
        }
    }
}
const quotes = loadData('quotes.js', 'quotesDb');
for (const quote of quotes) for (const lang of ['sr', 'en']) assert.ok(quote[lang]?.text?.trim() && quote[lang]?.author?.trim());
const rules = loadData('pravilaigre.js', 'RulesData');
assert.equal(rules.sr.length, rules.en.length);
for (const lang of ['sr', 'en']) for (const slide of rules[lang]) assert.ok(slide.title.trim() && slide.content.trim());
assert.equal(problems.length, 0, problems.join('\n'));
console.log('PASS: ' + Object.keys(catalog.sr).length + ' paired SR/EN keys, placeholders and ' + uses + ' literal references');
console.log('PASS: ' + items + ' treasury items, ' + quotes.length + ' quotes and ' + rules.sr.length + ' rules pages in both languages');
