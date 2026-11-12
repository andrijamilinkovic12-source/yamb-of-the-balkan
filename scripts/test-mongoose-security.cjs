'use strict';
const assert = require('node:assert/strict');
const mongoose = require('mongoose');

const [major, minor, patch] = mongoose.version.split('.').map(Number);
assert(major === 8 && (minor > 24 || (minor === 24 && patch >= 7)), 'Mongoose 8.24.7 or a newer patched 8.x is required');
const stringMethod = Object.prototype.toString;
const callMethod = stringMethod.call;
const Fixture = mongoose.model('SecurityHydrationFixture', new mongoose.Schema({ name: String }, { strict: false }));
Fixture.hydrate(JSON.parse('{"name":"fixture","toString":{"call":1},"valueOf":{"fixture":true}}'));
assert.equal(Object.prototype.toString, stringMethod);
assert.equal(Object.prototype.toString.call, callMethod, 'Hydration overwrote an inherited method');
assert.equal(Object.prototype.toString.call({}), '[object Object]');
assert.equal(Object.prototype.valueOf.fixture, undefined, 'Hydration polluted a shared built-in function');
console.log('PASS: patched Mongoose 8.x and inherited-property hydration isolation. No database contacted.');
