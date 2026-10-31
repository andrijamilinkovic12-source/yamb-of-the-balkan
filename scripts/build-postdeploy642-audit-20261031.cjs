// Build evidence from already observed native frames and redacted PNG timing.
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const sharp = require(process.env.YAMB_SHARP_PATH || 'sharp');
const out = 'docs/theme-visual-audit/postdeploy642-2026-10-31';
const read = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const esc = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
(async () => {
    const published = read(out + '/published.json');
    assert.equal(published.commit, '2b531195b274c55373ae2f591973e8b2f19cec65');
    assert.ok(published.rows.every(row => row.resources.length === 7 && row.resources.every(file => file.status === 200 && file.matchesLocalNormalized)));
    const diagnostics = read('tmp/qa-theme-loading/emulator-5556-1793442411898.json');
    fs.writeFileSync(out + '/png-timing.json', JSON.stringify(diagnostics, null, 2) + '\n');
    const easter = diagnostics.events.filter(e => e.asset.includes('easter'));
    const ready = easter.filter(e => e.event === 'ready'), timeouts = easter.filter(e => e.event === 'timeout');
    assert.equal(ready.length, 28); assert.equal(timeouts.length, 36);
    const frames = [
        ['initial', 'Početni Green QA meni, prikazani saldo12168.'],
        ['after-launch-timeout', 'Posle isteka roka am start -W sačuvan samo početni zeleni gradijent. Nije app-ready merenje.'],
        ['start-later', 'Kasnije potpuno prikazan Green meni bez dodatnog restarta.'],
        ['settings-settled', 'Green Podešavanja i njihove PNG kontrole.'],
        ['picker-settled', 'Izbor tema pre prvog Easter odabira.'],
        ['easter-first', 'Jedan Easter izbor: priprema još vidljiva na sačuvanom kadru.'],
        ['easter-first-result', 'Konačan prvi ishod: zadržana Zelena tema; priprema odustala pre konačne spremnosti.'],
        ['easter-retry', 'Ponovljen Easter izbor uspešan; prethodno pripremljene slike, bez novih timing događaja.'],
        ['return-green', 'Jednim izborom vraćena Zelena tema.']
    ].map(([suffix, label]) => ({ file: 'qa-deploy642-' + suffix + '.jpg', source: 'qa-deploy642-' + suffix + '.png', label }));
    for (const frame of frames) {
        const source = path.join('tmp/two-emulator-qa-2026-10-29/screens', frame.source);
        const meta = await sharp(source).metadata(); assert.equal(meta.width, 1440); assert.equal(meta.height, 3120);
        await sharp(source).resize({ width: 420 }).jpeg({ quality: 86 }).toFile(path.join(out, frame.file));
    }
    const report = {
        date: '2026-10-31', publishedVersion: '6.42', localVersion: '6.43-not-published', published,
        scope: 'Separate QA APK emulator-5556. Visible Android screenshots/taps and dedicated public PNG timing prefix, current QA PID only. No CDP/WebView evaluation/private storage/account API/DB. Cache/data/geometry unchanged.',
        startup: 'am start -W exceeded25s command deadline. Later gradient then full menu observed. No valid Activity TotalTime or precise app-ready measurement. No new ANR dialog in reviewed frames; not continuous monitoring or proof of ANR repair.',
        host: { freeMemoryGB: 1.42, totalMemoryGB: 15.23, bothEmulatorsConnected: true, firstAvdStatus: 'running', firstAvdPausedThisTurn: false, boundary: 'One host snapshot; memory pressure is a possible contributor, not causal proof.' },
        nativeThemeChoices: [
            { from: 'dark', to: 'easter', userSelections: 1, result: 'failed; retained dark' },
            { from: 'dark', to: 'easter', userSelections: 2, result: 'success on repeated selection; diagnostic event count remained103' },
            { from: 'easter', to: 'dark', userSelections: 1, result: 'success, complete Settings; final main menu restored' }
        ],
        easterTiming: {
            readyPngCount: ready.length, timeoutEvents: timeouts.length,
            timeoutByPhase: timeouts.reduce((a,e) => (a[e.phase] = (a[e.phase] || 0) + 1, a), {}),
            latestReadyMs: Math.max(...ready.map(e => e.elapsedMs)),
            latestMenuReadyMs: Math.max(...ready.filter(e => e.consumer === 'theme-preloader').map(e => e.elapsedMs)),
            latestSettingsReadyMs: Math.max(...ready.filter(e => e.consumer === 'settings').map(e => e.elapsedMs)),
            pendingAfterFinalCapture: [...new Set(timeouts.filter(t => !ready.some(r => r.id === t.id)).map(t => t.asset))],
            errors: easter.filter(e => e.event === 'error').length,
            finding: 'Two6s readiness windows expire while valid shared work is still pending. Menu PNGs finish as late as18052ms; first selection has already rejected. A repeated selection uses prepared images. This explains the repeat-choice failure in this session, not why the whole WebView/startup is slow.',
            limits: 'waiting-load includes dispatch/onload scheduling, not pure network time. decodeMs includes promise/event-loop scheduling, not CPU-only decoder work. Preserved cache, QA console overhead, memory contention and one session prevent a clean performance benchmark.'
        },
        collectorFix: 'Original Capacitor/Console-only tag filter returned0. Same current-PID exact-prefix filter with all info tags found39valid events; collector now accepts the dedicated prefix across tags and still exports only allowed PNG fields. No raw logcat saved.',
        restoration: 'Green Settings confirmed in saved native frame. Close tapped once; two later native screencap commands timed out, so no fabricated final native PNG. Fresh Computer Use window selection and screenshot of Duel_QA_Player2:5556 confirmed complete Green main menu and12168balance. No extra input through Windows UI, no screenshot payload re-saved.',
        localFix: 'R39/v6.43: first6s attempt retained, one retry gets24s to finish existing shared requests. No second user click needed for the controlled18s case. Ready assets commit immediately; no fixed30s sleep. Permanent timeout stays bounded, offline adds no retry, stale account/selection cannot commit. This extends tolerance; it does not accelerate downloads/decode or fix ANR. Not committed/deployed or Android-confirmed.',
        tests: ['Actual methods with virtual clock: v6.42 rejects at12s when PNGs finish at18s; local6.43 applies at18s with12same Image objects: PASS', 'Permanent timeout30s, late completion cannot apply, offline6s, account change: PASS', 'Cache/retention, Settings retry, decode readiness, in-game preload and account selection regressions: PASS', 'Actual local PNG Edge411x891:10themes×28ready,0failure. Retention Green revisit18reprepared/0missing/immediate repeat0new: PASS'],
        safety: 'No new game, dice/score entry, ad, reward/rematch click, purchase, invitation or DB access. Displayed balance12168before/after; not full accounting audit. First emulator not manipulated beyond status read; no pause. No native geometry/cache/data clearing.',
        remaining: ['Publish local6.43 and confirm first Easter selection without second tap on QA', 'Underlying transfer/decode/startup delay and Android ANR cause', 'Active-game skin speed, prior finish-panel geometry case, physical S25 ads/rewards, two-device invite/reconnect/rematch'],
        images: frames
    };
    fs.writeFileSync(out + '/report.json', JSON.stringify(report, null, 2) + '\n');
    fs.writeFileSync(out + '/local-browser.json', fs.readFileSync('tmp/theme-switch-profile-2026-10-30/diagnostics-browser.json'));
    fs.writeFileSync(out + '/index.html', `<!doctype html><html lang="sr"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>v6.42 — učitavanje</title><style>body{background:#17242e;color:#eef5f9;font:16px/1.5 system-ui;padding:24px}main{max-width:1100px;margin:auto}a{color:#a7ddff}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:16px}article{background:#263844;padding:12px;border-radius:12px}img{width:100%;height:auto}</style><main><h1>Objavljena v6.42 — Android dijagnostika</h1><p>Oba servisa2b531195, sedam javnih fajlova potvrđeno. QA Android, sačuvan keš,1440×3120. PrviEaster neuspešan; ponovljeni uspešan bez novih PNG zahteva; Green vraćen.</p><p><strong>28PNG spremno,36isteka rokova: poslednji menu PNG tek18.052ms.</strong> Dva prozora6+6s odustanu pre konačne spremnosti. Ovo objašnjava potrebu za ponovnim izborom u ovoj sesiji. Ne dokazuje uzrok sporog preuzimanja/dekodiranja ili ANR-a.</p><p>Lokalna v6.43 daje postojećem poslu jedan duži retry6+24s. Reprodukcija18s prolazi, bez duplih Image objekata; offline i zaštite naloga/izbora prolaze. <strong>Nije još objavljena/native potvrđena i nije ubrzanje.</strong></p><p>Računar1,42GBslobodno/15,23GB; oba emulatora rade, nisu pauzirani. am-start komanda istekla; gradijent pa meni, bez precizne app-ready mere. Poslednja dva native screencap prenosa su istekla; završni Green meni i saldo12168potvrđeni svežim Computer Use snimkom prozora, bez pravljenja zamenskog nativePNG-a. Nema nove partije, reklame, nagrade ili DB pristupa. PNG izgled/dimenzije ne menjaju se.</p><p><a href="report.json">Nalazi i granice</a> · <a href="png-timing.json">Filtrirani PNG timing</a> · <a href="published.json">Objavljeni fajlovi</a> · <a href="local-browser.json">Lokalni browser10tema</a></p><div class="grid">${frames.map(f => `<article><p>${esc(f.label)}</p><img src="${esc(f.file)}" alt="${esc(f.label)}" loading="lazy"></article>`).join('')}</div></main></html>\n`);
    console.log('WROTE: native6.42 deadline failure and local6.43 retry fix; underlying speed/ANR remain OPEN.');
})().catch(error => { console.error(error); process.exitCode = 1; });
