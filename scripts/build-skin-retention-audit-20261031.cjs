const fs = require('node:fs'), path = require('node:path');
const sharp = require(process.env.YAMB_SHARP_PATH || 'C:/Users/andri/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const root = path.resolve(__dirname, '..');
const dir = path.join(root, 'docs/theme-visual-audit/skin-retention-2026-10-31');
const tmp = path.join(root, 'tmp/skin-preload-retention-2026-10-31');
const native = path.join(root, 'tmp/two-emulator-qa-2026-10-29/screens');
const load = name => JSON.parse(fs.readFileSync(path.join(tmp, name), 'utf8'));
(async () => {
    fs.mkdirSync(dir, { recursive: true });
    const shots = [
        ['qa-skin-check-game-start', 'Početno: Žadna glina, prazna QA Hotseat partija'],
        ['qa-skin-check-owned-picker', 'Dostupni skinovi: početni izbor Žadna glina'],
        ['qa-skin-check-neon-selected', 'Neon: kockice, dugmad i brojač; tabla ostaje zelena'],
        ['qa-skin-check-gold-selected', 'Svetlo zlato: kockice, dugmad i brojač'],
        ['qa-skin-check-green-restored', 'Vraćen početni skin, bez bacanja i upisa'],
        ['qa-skin-check-final-menu', 'Kraj: Zelena i glavni meni, saldo12168']
    ];
    for (const [name] of shots) await sharp(path.join(native, name + '.png')).resize({ width: 720 }).jpeg({ quality: 86 }).toFile(path.join(dir, name + '.jpg'));
    const report = {
        date: '2026-10-31', finding: 'R40', status: 'Locally fixed; deployment and native confirmation of the new controller are pending.',
        publishedBaseline: { game: '6.43', skinController: 3, commit: '829a45b11c9b2865756e0a57b8cfd7992249e459' },
        local: { game: '6.43 unchanged', skinController: 4, change: 'Pin visible, selected and pending skin packs. Evict only ready unprotected PNGs in a coalesced next task. Readiness uses retained decoded entries; settled cap96. In-flight cache may temporarily exceed96.' },
        controlled: { before: load('before.json'), after: load('after.json') },
        browser: load('browser.json'),
        native: { device: 'emulator-5556 / Duel_QA_Player2', physical: '1440x3120 /560dpi unchanged', app: 'com.yamb.balkan.staging',
            scope: 'Existing authorization used for a new empty local Hotseat with Gost_QA. No saved continuation was offered. Green theme throughout; active skin green_clay →theme_neon_cyber →theme_light_gold →green_clay. At each final observed frame dice/button/counter artwork agrees.',
            limitations: 'Published controllerv3, not localv4. Delayed screenshots are not timing, frame-atomicity, cold-cache, all48skin, purchased-entitlement or physicalS25 proof. No dice values/rolls, so counter0 is the only native counter state.',
            final: 'Exited via normal saved-local-game confirmation; Green main menu, visual balance12168, original skin restored. No rolls, entries, game finish, ad, reward button, purchase, invitation, DB or private-session access.',
            screenshots: shots.map(([name, caption]) => ({ file: name + '.jpg', caption })) },
        tests: ['check:skin-action-buttons (includes deterministic retention regression)', 'check:skin-roll-counter', 'test-game-quick-skins.js', 'test-skin-preload-browser.cjs (allowlisted local PNG routes only)', 'node --check www/skin-action-buttons.js', 'git diff --check'],
        next: 'After user commit/deploy, verify skin-action-buttons.js?v=4 and the concurrent/return skin scenario in native QA. PhysicalS25 cold loading, startup/ANR, real ads/rewards and previously restricted rematch remain separate open items.'
    };
    fs.writeFileSync(path.join(dir, 'report.json'), JSON.stringify(report, null, 2) + '\n');
    fs.writeFileSync(path.join(dir, 'index.html'), `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Skinovi — keš i QA pregled</title><style>body{font:16px system-ui;background:#14251f;color:#f0f4ee;max-width:1200px;margin:auto;padding:24px}a{color:#a9dfce}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:20px}figure{margin:0}img{width:100%;height:auto}figcaption{padding:10px 0}p{line-height:1.5}</style><h1>Skinovi: lokalna ispravka R40 i QA pregled</h1><p>Pri paralelnoj pripremi14paketa stari keš odbacuje slike izabranog skina pre završetka. Priprema uspe, ali dugmad ostanu prethodna. Lokalna ispravka zadržava aktivni i nedovršene pakete. Test sa stvarnim PNG za48skinova,144dugmeta i192brojača prolazi. Nema promene DNK, paleta, PNG crteža ili dimenzija.</p><p><strong>Android snimci prikazuju objavljenu v3, a nova v4 još čeka korisnikov commit/deploy.</strong> Ovo potvrđuje normalan izbor tri posedovana skina u praznoj partiji, ne brzinu prvog učitavanja ili samu popravku na Androidu. Bez bacanja, upisa i nagrada. <a href="report.json">Precizni rezultati i granice</a>.</p><div class="grid">${shots.map(([name, caption]) => `<figure><img loading="lazy" src="${name}.jpg" alt="${caption}"><figcaption>${caption}</figcaption></figure>`).join('')}</div>`);
    console.log('Saved R40 evidence and6native frames:', dir);
})().catch(error => { console.error(error); process.exitCode = 1; });
