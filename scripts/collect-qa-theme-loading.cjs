// Read only the dedicated QA diagnostic prefix; never save or print raw logcat.
const { spawnSync } = require('node:child_process');
const fs = require('node:fs'), path = require('node:path');
function parseEvents(output) {
 const events = [];
 for (const line of output.split(/\r?\n/)) {
    const marker = '[YAMB_THEME_LOAD] ', at = line.indexOf(marker);
    if (at < 0) continue;
    try {
        const row = JSON.parse(line.slice(at + marker.length));
        if (!/^\/assets\/[a-zA-Z0-9_./-]+\.png$/.test(row.asset)) continue;
        if (!['theme-preloader', 'settings'].includes(row.consumer)) continue;
        if (!['ready', 'error', 'timeout', 'decode-fallback'].includes(row.event)) continue;
        if (!['waiting-load', 'decode'].includes(row.phase)) continue;
        const clean = { asset: row.asset, consumer: row.consumer, event: row.event, phase: row.phase };
        for (const key of ['id', 'elapsedMs', 'loadMs', 'decodeMs', 'budgetMs', 'width', 'height']) {
            if (Number.isFinite(row[key]) && row[key] >= 0) clean[key] = row[key];
        }
        events.push(clean);
    } catch (_) { /* Ignore non-diagnostic or incomplete records. */ }
 }
 return events;
}
function main() {
    const serial = process.argv[2];
    if (!['emulator-5554', 'emulator-5556'].includes(serial)) throw Error('Choose emulator-5554 or emulator-5556');
    const adb = 'C:/Users/andri/AppData/Local/Android/Sdk/platform-tools/adb.exe';
    const run = args => {
        const result = spawnSync(adb, ['-s', serial, ...args], { encoding: 'utf8', timeout: 15000, maxBuffer: 8 * 1024 * 1024, windowsHide: true });
        if (result.error || result.status !== 0) throw Error('QA diagnostic command failed; raw device output suppressed');
        return result.stdout;
    };
    const pid = run(['shell', 'pidof', 'com.yamb.balkan.staging']).trim();
    if (!/^\d+$/.test(pid)) throw Error('QA process is not running');
    const events = parseEvents(run(['logcat', '-d', `--pid=${pid}`, '-e', '\\[YAMB_THEME_LOAD\\]', 'Capacitor/Console:I', '*:S']));
    const directory = path.resolve('tmp/qa-theme-loading');
    fs.mkdirSync(directory, { recursive: true });
    const target = path.join(directory, `${serial}-${Date.now()}.json`);
    fs.writeFileSync(target, JSON.stringify({ serial, capturedAt: new Date().toISOString(), events }, null, 2) + '\n');
    console.log(JSON.stringify({ file: target, events: events.length, timeouts: events.filter(e => e.event === 'timeout').length }));
}
module.exports = { parseEvents };
if (require.main === module) main();
