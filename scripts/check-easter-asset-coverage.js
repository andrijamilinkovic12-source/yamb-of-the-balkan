const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const www = path.join(root, 'www');
const easterRoot = path.join(www, 'assets', 'easter-soft-clay');
const masterRoot = path.join(root, 'source-assets', 'easter-soft-clay-hires');
const registryPath = path.join(www, 'themes', 'easter', 'asset-registry.json');
const manifestPath = path.join(www, 'themes', 'easter', 'manifest.json');
const qaPreviewPath = path.join(www, 'themes', 'easter', 'qa-preview.html');

const assert = (condition, message) => {
    if (!condition) throw new Error(message);
};
const slash = value => value.replaceAll('\\', '/');
const walkFiles = directory => {
    if (!fs.existsSync(directory)) return [];
    return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
        const fullPath = path.join(directory, entry.name);
        return entry.isDirectory() ? walkFiles(fullPath) : [fullPath];
    });
};
const pngInfo = filePath => {
    const buffer = fs.readFileSync(filePath);
    assert(buffer.length >= 26 && buffer.toString('ascii', 1, 4) === 'PNG', `Neispravan PNG: ${filePath}`);
    return {
        width: buffer.readUInt32BE(16),
        height: buffer.readUInt32BE(20),
        colorType: buffer[25],
        bytes: buffer.length
    };
};

const registry = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const qaPreviewSource = fs.readFileSync(qaPreviewPath, 'utf8');
assert(registry.schemaVersion === 1 && registry.themeId === 'easter' && registry.status === 'locked', 'Vaskrs asset registar nema zaključan identitet.');

const productionFiles = [
    'index.html', 'style.css', 'teme.css', 'config.js', 'game.js', 'dnevniizazov.js',
    'globalchat.js', 'kvartalnaliga.js', 'languages.js', 'managers.js', 'onlinenumber.js',
    'powerindex.js', 'pravilaigre.js', 'riznica.js', 'toplista.js', 'trophyManager.js',
    'turnir.js', 'vatreniniz.js', 'vracanjeupisa.js'
].map(file => path.join(www, file));
const productionSource = productionFiles.map(file => fs.readFileSync(file, 'utf8')).join('\n');
const runtimePngs = walkFiles(easterRoot)
    .filter(file => file.toLowerCase().endsWith('.png'))
    .sort();
const runtimeRelative = runtimePngs.map(file => slash(path.relative(easterRoot, file)));
const totalBytes = runtimePngs.reduce((sum, file) => sum + fs.statSync(file).size, 0);

assert(runtimePngs.length === registry.inventory.pngCount, `Vaskrs runtime inventar odstupa: ${runtimePngs.length}/${registry.inventory.pngCount}.`);
assert(totalBytes === registry.inventory.totalBytes, `Vaskrs runtime veličina odstupa: ${totalBytes}/${registry.inventory.totalBytes} B.`);

const actualFamilies = {};
for (const relative of runtimeRelative) {
    const parts = relative.split('/');
    const family = parts.length > 1 ? parts[0] : 'root';
    actualFamilies[family] = (actualFamilies[family] || 0) + 1;
}
assert(JSON.stringify(actualFamilies) === JSON.stringify(registry.inventory.families), 'Vaskrs porodice asseta odstupaju od zaključanog registra.');

for (const [index, file] of runtimePngs.entries()) {
    const relative = runtimeRelative[index];
    const runtimePath = `assets/easter-soft-clay/${relative}`;
    const info = pngInfo(file);
    const isSplash = relative === 'splash-title-soft-clay-v1.png';
    assert([4, 6].includes(info.colorType), `Vaskrs PNG nema direktan alpha kanal: ${relative}`);
    assert(isSplash || Math.max(info.width, info.height) <= 768, `Vaskrs runtime ikona je veća od 768 px: ${relative}`);
    const supersededByCanonicalPack = /^canonical\/competition-medals\/(?:gold|silver|bronze)-v1\.png$/.test(relative)
        || /^treasury\/(?:tab-(?:trophies|skins|effects|themes)|status-(?:owned|active|locked|insufficient))-v\d+\.png$/.test(relative);
    assert(supersededByCanonicalPack || productionSource.includes(runtimePath), `Vaskrs PNG nema produkcionu vezu: ${runtimePath}`);
}

const background = path.join(root, registry.foundation.background);
assert(manifest.entrypoints?.backgroundAsset === registry.foundation.background, 'Vaskrs manifest i registar ne dele istu aktivnu pozadinu.');
assert(fs.existsSync(background) && fs.statSync(background).size === registry.foundation.backgroundBytes, 'Vaskrs aktivna pozadina nedostaje ili ima neočekivanu veličinu.');
assert(fs.existsSync(path.join(root, registry.foundation.splash)), 'Vaskrs splash iz registra nedostaje.');

for (const retired of registry.retiredRuntime) {
    assert(!fs.existsSync(path.join(root, retired)), `Vraćen je povučeni Vaskrs runtime asset: ${retired}`);
    const productionPath = retired.replace(/^www\//, '');
    assert(!productionSource.includes(productionPath), `Povučeni Vaskrs asset ponovo ima produkcionu vezu: ${productionPath}`);
    if (productionPath.startsWith('assets/easter-soft-clay/')) {
        const relative = productionPath.slice('assets/easter-soft-clay/'.length);
        assert(!fs.existsSync(path.join(masterRoot, relative)), `Povučeni Vaskrs master nije uklonjen: ${relative}`);
    }
}

for (const master of walkFiles(masterRoot).filter(file => file.toLowerCase().endsWith('.png'))) {
    const relative = path.relative(masterRoot, master);
    assert(fs.existsSync(path.join(easterRoot, relative)), `Vaskrs master nema optimizovani runtime par: ${slash(relative)}`);
}

const menuPngs = walkFiles(path.join(easterRoot, 'runtime', 'menu')).filter(file => file.toLowerCase().endsWith('.png'));
const startupPngs = [background, path.join(root, registry.foundation.splash), ...menuPngs];
const startupBytes = startupPngs.reduce((sum, file) => sum + pngInfo(file).bytes, 0);
const startupDecodedBytes = startupPngs.reduce((sum, file) => {
    const info = pngInfo(file);
    return sum + info.width * info.height * 4;
}, 0);
assert(startupPngs.length === registry.delivery.startupPngCount, 'Vaskrs startup PNG broj odstupa od registra.');
assert(startupBytes <= registry.delivery.startupTransferBudgetBytes, 'Vaskrs startup transfer je iznad budžeta.');
assert(startupDecodedBytes <= registry.delivery.startupDecodedBudgetBytes, 'Vaskrs startup decoded memorija je iznad budžeta.');

const themeCss = fs.readFileSync(path.join(www, 'teme.css'), 'utf8');
assert(!/body\.easter-theme[^{}]*\{[^{}]*(?:url\([^)]*\.(?:svg|webp)|content:\s*['"][🐣🐇🥚])/su.test(themeCss), 'Vaskrs CSS vraća stari SVG/WebP ili emoji stand-in.');
assert(themeCss.includes('@media (prefers-reduced-motion: reduce)'), 'Vaskrs nema reduced-motion zaštitu.');
const stateBindings = [
    ['Leaderboard empty/loading', 'assets/easter-soft-clay/leaderboard/empty-loading-v2.png', 'hs-state-soft-clay-icon'],
    ['H2H empty', 'assets/easter-soft-clay/statistics/h2h-empty-v2.png', 'h2h-empty-state'],
    ['Global Chat empty/loading', 'assets/easter-soft-clay/global-chat-empty-pro-v2.png', 'global-chat-state'],
    ['Online Players empty/loading/error', 'assets/easter-soft-clay/online-players-state-pro-v2.png', 'data-online-state'],
    ['Invite Friend empty', 'assets/easter-soft-clay/invite/empty.png', 'easter-invite-empty-state'],
    ['Daily complete', 'assets/easter-soft-clay/daily/complete-v2.png', 'daily-glass-complete-mark-easter'],
    ['Daily already played', 'assets/easter-soft-clay/daily/already-played-v2.png', 'daily-already-easter'],
    ['Rewarded video unavailable', 'assets/easter-soft-clay/economy/ad-unavailable.png', 'ad-unavailable'],
    ['Opponent disconnected', 'assets/easter-soft-clay/opponent/disconnected.png', 'disconnected'],
    ['Opponent reconnected', 'assets/easter-soft-clay/opponent/reconnected.png', 'reconnected'],
    ['Tournament registration locked', 'assets/easter-soft-clay/tournament/state-registration-locked-v2.png', 'tourney-action-button--locked'],
    ['Tournament active match', 'assets/easter-soft-clay/tournament/state-match-active-v2.png', 'state-match-active-v2.png'],
    ['Tournament completed match', 'assets/easter-soft-clay/tournament/state-match-complete-v2.png', 'tourney-completed-match-result']
];
for (const [state, asset, hook] of stateBindings) {
    assert(productionSource.includes(asset) && productionSource.includes(hook), `Vaskrs funkcionalno stanje nije potpuno povezano: ${state}`);
}
assert(themeCss.includes('body.easter-theme #highscores-screen .hs-state-fallback {')
    && themeCss.includes('body.easter-theme #highscores-screen .hs-list-state-offline {'), 'Vaskrs Leaderboard fallback/offline stanje nije standardizovano.');
assert(themeCss.includes('body.easter-theme #online-players-overlay .online-players-state[data-online-state="error"] {'), 'Vaskrs Online Players error stanje nema tematski kontrast.');
assert(/body\.easter-theme \.h2h-detail-name\s*\{[^}]*display:\s*block;[^}]*overflow:\s*visible;[^}]*-webkit-line-clamp:\s*unset;[^}]*overflow-wrap:\s*anywhere;/s.test(themeCss), 'Vaskrs H2H mora prikazati puna duga imena bez line-clamp skraćivanja.');
assert(/@media \(max-width: 400px\)[\s\S]*body\.easter-theme #highscores-screen \.highscore-item\s*\{[^}]*grid-template-columns:\s*36px 38px minmax\(0, 1fr\) 82px/s.test(themeCss), 'Vaskrs Top lista mora dati više prostora dugim imenima na uskim telefonima.');
assert(/const isIconOnlyIntro =[^;]*overlay\.classList\.contains\('theme-easter'\)/s.test(productionSource), 'Vaskrs uvod Dnevnog izazova mora ostati bez teksta.');
assert(themeCss.includes('body.easter-theme #riznica-screen .riznica-balance-pill {')
    && themeCss.includes('min-width: 92px;'), 'Vaskrs Riznica mora prikazati ceo iznos bez skraćivanja.');
assert(themeCss.includes('body.easter-theme #riznica-screen .effect-preview-box.prev-confetti::before {')
    && fs.readFileSync(path.join(www, 'theme-treasury-controls.css'), 'utf8').includes('assets/theme-packs/easter/canonical/treasury-controls/tab-effects-v1.png?v=3'), 'Vaskrs Riznica ne sme vratiti zajednički emoji prikaz konfeta.');
assert(productionSource.includes("categoryName.replace(/^[^\\p{L}\\p{N}]+\\s*/u, '')"), 'Vaskrs kategorije Riznice moraju ukloniti stare vodeće emoji oznake.');
assert(productionSource.includes('class="economy-reward-unavailable-soft-clay-icon"')
    && themeCss.includes('.economy-reward-card.btn-ad-state-aware.disabled .economy-reward-unavailable-soft-clay-icon')
    && /body\.easter-theme #undo-menu-overlay \.economy-reward-card\.btn-ad-state-aware\.disabled::after\s*\{[^}]*content:\s*none\s*!important;/s.test(themeCss), 'Vaskrs nedostupan nagradni video mora koristiti samo svoj soft-clay asset.');
assert(/body\.easter-theme #game-scene\.random-online-duel-room\.opponent-reconnecting #turn-timer-display\s*\{[^}]*position:\s*fixed\s*!important;[^}]*white-space:\s*normal\s*!important;/s.test(themeCss), 'Vaskrs prekid veze mora ostati čitljiv kao zaseban statusni baner.');
assert(/body\.easter-theme #game-scene\.online-duel-room:not\(\.opponent-reconnecting\) #turn-timer-display\s*\{[^}]*width:\s*136px\s*!important;[^}]*font-size:\s*\.7rem\s*!important;/s.test(themeCss), 'Vaskrs online tajmer mora ostati čitljiv u uskom zaglavlju.');
assert(productionSource.includes('assets/easter-soft-clay/game/exit-v1.png?v=1')
    && productionSource.includes('assets/easter-soft-clay/game/announce-v1.png?v=1')
    && productionSource.includes('game-header-exit-fallback')
    && productionSource.includes('easter-announce-col-fallback')
    && themeCss.includes('body.easter-theme #game-scene .game-header-exit .game-header-exit-fallback')
    && themeCss.includes('body.easter-theme #game-scene .col-header.c-najava .easter-announce-col-icon'),
    'Vaskrs tabla mora imati tematski izlaz i Najavu, uz fallback za ostale teme.');
assert(/renderWaitingPlayerName\(elementId, name\)[\s\S]*minimumFontSize = 9\.5;[\s\S]*element\.scrollHeight > maxHeight/s.test(productionSource), 'Vaskrs nalaženje protivnika mora uklopiti duga imena u karticu.');
assert(qaPreviewSource.includes("doc.documentElement.classList.add('portrait-orientation-active');")
    && qaPreviewSource.includes('img[data-theme-src*="assets/easter-soft-clay/"]')
    && qaPreviewSource.includes("localStorage.setItem('yamb_theme', 'easter');")
    && qaPreviewSource.includes("localStorage.setItem('yamb_lang', qaLanguage);"), 'Vaskrs QA preview mora verno simulirati portrait temu i SR/EN hidrataciju.');
assert(qaPreviewSource.includes('Aleksandar Mihajlović Petrović')
    && qaPreviewSource.includes('Konstantin Aleksandrović Jovanović'), 'Vaskrs QA preview mora zadržati stres-test imena duža od 20 karaktera.');
for (const qaState of [
    'board-solo', 'board-hotseat', 'board-online', 'board-spectator',
    'highscores-empty', 'highscores-loading', 'highscores-offline',
    'dailyintro', 'daily', 'dailyresult',
    'treasury', 'treasury-skins', 'treasury-effects', 'treasury-themes', 'treasuryintro',
    'economy', 'economy-unavailable', 'economy-undo',
    'chat', 'chat-empty', 'chat-loading',
    'online', 'online-empty', 'online-loading', 'online-error',
    'waiting-searching', 'waiting-found', 'opponent-disconnected', 'opponent-reconnected',
    'gameover'
]) {
    assert(qaPreviewSource.includes(`case '${qaState}'`), `Vaskrs QA preview nema obavezno stanje: ${qaState}.`);
}
assert(qaPreviewSource.includes("throwButton.style.display = config.spectator ? 'none' : 'flex'")
    && qaPreviewSource.includes("announceButton.style.display = config.spectator ? 'none' : 'flex'"), 'Vaskrs spectator QA stanje ne sme prikazati akcije igrača.');
assert(qaPreviewSource.includes("getElementById('h2h-detail-modal')?.classList.remove('active')"), 'Vaskrs QA preview mora zatvoriti H2H karticu pre sledećeg ekrana.');
assert(qaPreviewSource.includes("getElementById('riznica-intro')"), 'Vaskrs QA preview mora očistiti intro Riznice pre sledećeg ekrana.');

console.log('Vaskrs asset coverage provera je prošla.');
console.log(`- zaključani runtime inventar: ${runtimePngs.length} PNG / ${totalBytes} B`);
console.log(`- produkciono povezano: ${runtimePngs.length} od ${runtimePngs.length} PNG`);
console.log(`- startup: ${startupPngs.length} PNG / ${startupBytes} B / ${startupDecodedBytes} decoded B`);
console.log(`- povučene runtime putanje: ${registry.retiredRuntime.length}`);
