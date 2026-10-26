const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const storage=new Map([['yamb_uid','account-a'],['yamb_theme','dark']]);
const applied=[],select={value:'dark'};
const context={window:{},document:{getElementById:id=>id==='setting-theme'?select:null},
 localStorage:{getItem:key=>storage.get(key)??null,setItem:(key,value)=>storage.set(key,String(value)),removeItem:key=>storage.delete(key)},console,setTimeout,clearTimeout};
vm.runInNewContext(fs.readFileSync('www/game.js','utf8').replace('window.app = new YambApp();','globalThis.App=YambApp;'),context);
const makeApp=()=>{const app=Object.create(context.App.prototype);app.isThemeUnlocked=theme=>['dark','neon','moon','desert'].includes(theme);app.applyTheme=theme=>applied.push(theme);return app;};
let app=makeApp();
app.rememberManualThemeSelection('moon');storage.set('yamb_theme','moon');
// There is deliberately no elapsed-time grace window. Slow old replies must
// preserve the manual choice even after the old 2.5-second window would expire.
app.applySyncedThemeSelection('desert');
assert.equal(storage.get('yamb_theme'),'moon');assert.equal(select.value,'moon');assert.equal(applied.length,0);
assert.equal(storage.get('yamb_theme_pending_sync_account-a'),'moon');
app=makeApp();app.applySyncedThemeSelection('desert');
assert.equal(storage.get('yamb_theme'),'moon','An unconfirmed offline choice survives restart for the same account');
app.applySyncedThemeSelection('moon');
assert.equal(storage.has('yamb_theme_pending_sync_account-a'),false,'Matching cloud value acknowledges the pending choice');
app.applySyncedThemeSelection('desert');
assert.equal(storage.get('yamb_theme'),'moon','An older reply arriving after acknowledgement cannot revert this session');
app.rememberManualThemeSelection('neon');storage.set('yamb_theme','neon');
app.applySyncedThemeSelection('moon');assert.equal(storage.get('yamb_theme'),'neon','Latest explicit selection wins');
storage.set('yamb_uid','account-b');app.applySyncedThemeSelection('desert');
assert.equal(storage.get('yamb_theme'),'desert','Selections do not leak between accounts');
assert.equal(storage.get('yamb_theme_pending_sync_account-a'),'neon');
app.rememberManualThemeSelection('moon');storage.set('yamb_theme','moon');
app.isThemeUnlocked=theme=>theme==='dark';app.applySyncedThemeSelection('dark');
assert.equal(storage.get('yamb_theme'),'dark','Revoked entitlements still follow the authoritative inventory');
assert.equal(storage.has('yamb_theme_pending_sync_account-b'),false);
// A fresh session with no pending local choice still restores cloud preferences.
app=makeApp();app.applySyncedThemeSelection('desert');assert.equal(storage.get('yamb_theme'),'desert');
console.log('PASS: slow/out-of-order cloud replies, acknowledgement, offline restart, latest choice, account isolation and revoked inventory.');
