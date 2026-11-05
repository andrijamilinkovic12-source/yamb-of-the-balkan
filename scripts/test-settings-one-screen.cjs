// Production Settings markup/styles in an isolated browser; no account/API calls.
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const { chromium } = require(process.env.YAMB_PLAYWRIGHT_PATH || 'playwright');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const index = read('www/index.html');
const markup = index.slice(index.indexOf('    <div id="settings-screen"'), index.indexOf('    <div id="game-over-screen"'))
    .replace('class="screen settings-fit"', 'class="screen settings-fit active"');
const sheets = [...index.matchAll(/<link rel="stylesheet" href="([^"]+)"/g)].map(m => m[1]);
const translations = vm.runInNewContext(read('www/languages.js') + '\nTRANSLATIONS', { window: {}, document: { addEventListener() {} }, localStorage: { getItem: () => 'sr' } });
const themes = ['dark','light','medium','winter','neon','amethyst','easter','desert','moon','severna'];
const output = path.join(root, 'tmp/settings-one-screen');
const fixture = `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">${sheets.map(s => `<link rel="stylesheet" href="${s}">`).join('')}<style>:root{--safe-top:24px;--safe-bottom:24px}*{animation:none!important;transition:none!important}</style>${markup}`;
const rows = [], failures = [];
(async () => {
    fs.mkdirSync(output, { recursive: true });
    const browser = await chromium.launch({ headless: true, ...(process.env.YAMB_CHROMIUM ? { executablePath: process.env.YAMB_CHROMIUM } : {}) });
    try {
        const context = await browser.newContext();
        await context.route('**/*', route => {
            const url = new URL(route.request().url());
            if (url.hostname !== 'settings-fixture.local') return route.abort();
            if (url.pathname === '/www/fixture.html') return route.fulfill({ contentType: 'text/html', body: fixture });
            const file = path.resolve(root, '.' + decodeURIComponent(url.pathname));
            if (!file.startsWith(path.join(root, 'www') + path.sep) || !fs.existsSync(file)) return route.abort();
            return route.fulfill({ contentType: ({ '.css':'text/css','.png':'image/png','.js':'text/javascript','.woff2':'font/woff2' })[path.extname(file)] || 'application/octet-stream', body: fs.readFileSync(file) });
        });
        const page = await context.newPage();
        await page.goto('http://settings-fixture.local/www/fixture.html');
        await page.addScriptTag({ content: read('www/theme-game-header.js') });
        await page.addScriptTag({ content: read('www/theme-settings-room.js') });
        await page.evaluate(() => {
            window.fixtureChanges = [];
            window.app = { saveSettingAuto: (...args) => fixtureChanges.push(args), getUnlockedThemeIds: () => ['dark','light','medium','winter','neon','amethyst','easter','desert','moon','severna'], syncThemeSelectOptions() {} };
        });
        await page.addScriptTag({ content: read('www/theme-settings-picker.js') });
        for (const theme of themes) for (const lang of ['sr','en']) {
            await page.evaluate(async ({ theme, lang, dictionary }) => {
                document.body.className = theme === 'dark' ? '' : theme + '-theme';
                document.documentElement.lang = lang;
                document.querySelectorAll('[data-lang]').forEach(e => { if (dictionary[e.dataset.lang]) e.textContent = dictionary[e.dataset.lang]; });
                document.getElementById('setting-name').value = 'Andrija Milinković';
                document.getElementById('auth-user-info').textContent = 'Andrija Milinković';
                document.getElementById('auth-user-photo-fallback').style.display = 'flex';
                document.getElementById('auth-user-photo-fallback').textContent = 'AM';
                document.getElementById('auth-user-photo').removeAttribute('src');
                document.getElementById('auth-user-photo').style.setProperty('display','none','important');
                document.getElementById('btn-google-logout').style.display = 'block';
                document.getElementById('delete-account-button').disabled = false;
                for (const id of ['ad-privacy-options','analytics-privacy-options']) document.getElementById(id).hidden = false;
                document.getElementById('analytics-privacy-options').textContent = lang === 'sr' ? 'Analitika korišćenja: isključena' : 'Usage analytics: disabled';
                document.getElementById('setting-theme').value = theme;
                window.themeSettingsPicker.refresh();
                await window.themeSettingsRoom.apply();
                await Promise.all([...document.querySelectorAll('#settings-screen img[src]')].map(i => i.decode().catch(() => {})));
            }, { theme, lang, dictionary: translations[lang] });
            for (const viewport of [{width:320,height:568},{width:360,height:640},{width:384,height:824},{width:430,height:932}]) {
                await page.setViewportSize(viewport);
                const result = await page.evaluate(() => {
                    const body = document.querySelector('.settings-card-body'), shell = document.querySelector('.settings-shell');
                    const b = body.getBoundingClientRect(), s = shell.getBoundingClientRect();
                    const rect = e => { const r = e.getBoundingClientRect(); return { x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom }; };
                    const controls = [...body.querySelectorAll('input:not([aria-hidden]),button,[role="link"]')].filter(e => e.getBoundingClientRect().width > 1).map(e => ({ id:e.id || e.className, ...rect(e) }));
                    const clipped = controls.filter(r => r.x < b.x - 1 || r.right > b.right + 1 || r.y < b.y - 1 || r.bottom > b.bottom + 1);
                    const overflow = [...body.querySelectorAll('button,.settings-row-label,.settings-section-title')].filter(e => e.clientWidth && (e.scrollWidth > e.clientWidth + 1 || e.scrollHeight > e.clientHeight + 1)).map(e => e.id || e.className);
                    const typography = ['.settings-header-title','.settings-section-title','.settings-row-label','.settings-account-name','.settings-language-btn'].map(selector => {
                        const cs = getComputedStyle(document.querySelector(selector));
                        return [selector,cs.fontFamily,cs.fontSize,cs.fontWeight,cs.lineHeight];
                    });
                    const luminance = color => {
                        const rgb = color.match(/[\d.]+/g).slice(0,3).map(Number).map(v => v / 255).map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4);
                        return rgb.reduce((sum,v,i)=>sum+v*[.2126,.7152,.0722][i],0);
                    };
                    const deleteStyle = getComputedStyle(document.getElementById('delete-account-button'));
                    const light = [luminance(deleteStyle.color),luminance(deleteStyle.backgroundColor)].sort((a,b)=>b-a);
                    return { body:rect(body), shell:rect(shell), controls, clipped, overflow, typography, deleteContrast:(light[0]+.05)/(light[1]+.05), scroll:body.scrollHeight > body.clientHeight + 1, inside:s.top >= 24 && s.bottom <= innerHeight - 24 + 1, png:[...body.querySelectorAll('img[src]')].filter(i=>i.getAttribute('src') && i.getBoundingClientRect().width).every(i => i.complete && i.naturalWidth > 0) };
                });
                rows.push({ theme, lang, viewport, ...result });
                const reference = rows.find(r => r.theme === 'dark' && r.lang === lang && r.viewport.width === viewport.width);
                const sameType = JSON.stringify(reference.typography) === JSON.stringify(result.typography);
                if (result.scroll || !result.inside || result.clipped.length || result.overflow.length || !result.png || result.deleteContrast < 4.5 || !sameType) failures.push({ theme, lang, viewport, clipped:result.clipped, overflow:result.overflow, scroll:result.scroll, inside:result.inside, png:result.png, sameType, deleteContrast:result.deleteContrast });
                if (lang === 'sr' && (viewport.width === 320 || viewport.width === 384)) await page.screenshot({ path:path.join(output, `${theme}-${viewport.width}.png`) });
            }
        }
        for (const id of ['setting-sound','setting-music','setting-vibration']) {
            const before = await page.locator('#' + id).isChecked();
            await page.locator('label.settings-row').filter({ has:page.locator('#' + id) }).locator('.settings-row-label').click();
            if (await page.locator('#' + id).isChecked() === before) failures.push({ labelDidNotToggle:id });
        }
        if (await page.evaluate(() => fixtureChanges.length) !== 3) failures.push({ missingAudioChanges:true });
        fs.writeFileSync(path.join(output,'report.json'), JSON.stringify({ rows, failures }, null, 2));
        console.log(JSON.stringify({ cases:rows.length, failures, output }, null, 2));
        if (failures.length) process.exitCode = 1;
    } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
