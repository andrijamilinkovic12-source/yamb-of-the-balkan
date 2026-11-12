'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const html = fs.readFileSync(path.join(__dirname, '..', 'tools', 'online-indicator.html'), 'utf8');
const script = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].at(-1)?.[1];
assert.ok(script, 'inline script is present');
new Function(script);

const markup = html.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, '');
const ids = [...markup.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
assert.equal(ids.length, new Set(ids).size, 'HTML IDs are unique');
for (const match of script.matchAll(/\$\('([^']+)'\)/g)) {
    assert.ok(ids.includes(match[1]), `script target ${match[1]} exists`);
}
for (const id of ['live-view', 'reports-view', 'diagnostics-view', 'report-cards', 'report-days', 'report-print', 'quick-online']) {
    assert.ok(ids.includes(id), `${id} exists`);
}
const stack = [];
for (const match of markup.matchAll(/<(\/)?(main|section|article|div)\b[^>]*>/gi)) {
    const closing = Boolean(match[1]), tag = match[2].toLowerCase();
    if (closing) assert.equal(stack.pop(), tag, `closing ${tag} matches open tag`);
    else stack.push(tag);
}
assert.deepEqual(stack, [], 'layout containers are balanced');
console.log('Monitor indicator structure and script passed');
