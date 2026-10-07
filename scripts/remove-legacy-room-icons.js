// One-time migration: keep the Green reference node and remove obsolete
// Easter/Desert/Nebula siblings at the room entrances now served by the pack.
const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, '..', 'www', 'index.html');
const original = fs.readFileSync(file, 'utf8');
const start = original.indexOf('    <div id="main-menu"');
const end = original.indexOf('    <div id="quote-screen"', start);
if (start < 0 || end < 0) throw new Error('Main menu boundaries missing');
const menu = original.slice(start, end).replace(/^\s*<img\b[^\n]*data-theme-src="assets\/(?:easter|desert|severna)-soft-clay\/[^\n]*\r?\n/gm, '\n');
let next = original.slice(0, start) + menu + original.slice(end);
const obsolete = /\b(?:riznica-header-logo|riznica-intro-gem|tournament-intro-mark|tourney-header-icon|stats-header-icon|league-intro-mark|daily-intro-mark|hs-header-icon|settings-header-icon|global-chat-header-soft-clay-icon|online-players-header-soft-clay-icon)-(?:easter|desert|nebula)\b|\b(?:easter|desert|severna)-(?:opponent|invite)-header-icon\b/;
next = next.split(/(?<=\n)/).filter(line => !(/^\s*<img\b/.test(line) && (obsolete.test(line) || /class="online-players-header-soft-clay-icon"[^>]*assets\/easter-soft-clay/.test(line)))).join('');
next = next.replace(/\n(?:[ \t]*\n){2,}/g, '\n\n');
if (next === original) throw new Error('No legacy image nodes found');
fs.writeFileSync(file, next);
console.log(`Removed ${((original.match(/data-theme-src="assets\/(?:easter|desert|severna)-soft-clay\//g) || []).length - (next.match(/data-theme-src="assets\/(?:easter|desert|severna)-soft-clay\//g) || []).length)} obsolete image nodes`);
