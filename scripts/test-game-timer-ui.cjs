'use strict';

// Production markup, CSS, translations and timer methods; all network is local fixtures.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require(process.env.YAMB_PLAYWRIGHT_PATH || 'playwright');
const root = path.resolve(__dirname, '..');
const read = name => fs.readFileSync(path.join(root, name), 'utf8');
const index = read('www/index.html');
const sheets = [...index.matchAll(/<link rel="stylesheet" href="([^"]+)"/g)].map(match => match[1]);
const body = index.slice(index.indexOf('<body'), index.lastIndexOf('</body>') + 7).replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '');
const fixture = `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">${sheets.map(src => `<link rel="stylesheet" href="${src}">`).join('')}<style>*{animation:none!important;transition:none!important}</style>${body}`;

async function main() {
    const browser = await chromium.launch({ headless: true,
        ...(process.env.YAMB_CHROMIUM ? { executablePath: process.env.YAMB_CHROMIUM } : {}) });
    try {
        const context = await browser.newContext();
        await context.route('**/*', route => {
            const url = new URL(route.request().url());
            if (url.hostname !== 'game-timer.local') return route.abort();
            if (url.pathname === '/www/fixture.html') return route.fulfill({ contentType: 'text/html', body: fixture });
            const file = path.resolve(root, '.' + decodeURIComponent(url.pathname));
            if (!file.startsWith(path.join(root, 'www') + path.sep) || !fs.existsSync(file)) return route.abort();
            return route.fulfill({ body: fs.readFileSync(file), contentType: ({ '.css': 'text/css',
                '.png': 'image/png', '.js': 'text/javascript', '.woff2': 'font/woff2' })[path.extname(file)] || 'application/octet-stream' });
        });
        const page = await context.newPage(), errors = [];
        page.on('pageerror', error => errors.push(error.message));
        await page.goto('http://game-timer.local/www/fixture.html');
        await page.clock.install();
        await page.evaluate(() => {
            document.querySelectorAll('.screen').forEach(e => e.classList.remove('active'));
            document.querySelectorAll('[id*="splash"],[id*="loading-gate"],#rotate-lock-overlay').forEach(e => e.remove());
            document.getElementById('custom-modal-overlay').style.display = 'none';
            document.getElementById('game-scene').classList.add('active');
            document.getElementById('gh-current-avatar').style.display = 'block';
        });
        await page.addScriptTag({ content: read('www/languages.js') });
        await page.addScriptTag({ content: read('www/game.js').replace('window.app = new YambApp();', 'window.TestApp = YambApp;') });
        await page.evaluate(() => {
            window.app = Object.create(TestApp.prototype);
            Object.assign(app, { onlineMode: true, gameActive: true, isSpectator: false,
                playerId: 'self', currentPlayerIdx: 0, myOnlineIndex: 0, emitOnlinePresencePing() {} });
        });
        let count = 0;
        for (const width of [320, 360, 768]) {
            await page.setViewportSize({ width, height: 824 });
            for (const theme of ['dark', 'light', 'medium', 'winter', 'neon', 'amethyst', 'easter', 'desert', 'moon', 'severna']) {
                for (const language of ['sr', 'en']) for (const mode of ['random', 'friend_invite', 'challenge', 'tournament']) {
                    const result = await page.evaluate(({ theme, language, mode }) => {
                        document.body.className = theme === 'dark' ? '' : theme + '-theme';
                        localStorage.setItem('yamb_lang', language);
                        localStorage.setItem('yamb_theme', theme);
                        const scene = document.getElementById('game-scene');
                        scene.className = 'screen active online-duel-room' + (mode === 'random' ? ' random-online-duel-room' : '');
                        app.roomId = mode + '_fixture'; app.onlineDuelType = mode;
                        app.showOpponentReconnectGraceCountdown({ remainingMs: mode === 'tournament' ? 300000 : 30000 });
                        const timer = document.getElementById('turn-timer-display'), notice = document.getElementById('game-connection-notice');
                        const tr = timer.getBoundingClientRect(), nr = notice.getBoundingClientRect();
                        return { text: timer.textContent, message: notice.textContent, hidden: notice.hidden,
                            timerWidth: tr.width, timerLeft: tr.left, timerRight: tr.right,
                            timerClipped: timer.scrollWidth > timer.clientWidth,
                            noticeClipped: notice.scrollWidth > notice.clientWidth || notice.scrollHeight > notice.clientHeight,
                            noticeWidth: nr.width, noticeHeight: nr.height,
                            overlapsHeader: nr.top < document.querySelector('.game-header').getBoundingClientRect().bottom - 1,
                            position: getComputedStyle(timer).position };
                    }, { theme, language, mode });
                    const label = `${width}px/${theme}/${language}/${mode}`;
                    assert.equal(result.text, mode === 'tournament' ? '5:00' : '0:30', label);
                    assert.equal(result.hidden, false, label);
                    assert.equal(result.position, 'static', `${label}: old theme overlay must not take over`);
                    assert(!result.timerClipped && !result.noticeClipped && !result.overlapsHeader, `${label}: clipped/overlapping ${JSON.stringify(result)}`);
                    assert(result.timerLeft >= 0 && result.timerRight <= width, `${label}: header timer out of viewport`);
                    assert(result.noticeWidth <= width && result.noticeHeight >= 25 && result.message.length > 40, label);
                    assert(!result.message.includes('connection_paused_notice'), label);
                    count++;
                    if (width === 320 && theme === 'light' && mode === 'random') {
                        const dir = path.join(root, 'tmp/game-timer-qa');
                        fs.mkdirSync(dir, { recursive: true });
                        await page.screenshot({ path: path.join(dir, `reconnect-${language}-320.png`) });
                    }
                    await page.evaluate(() => {
                        for (const seconds of [90, 10, 0]) {
                            app.startClientTimer(seconds);
                            const timer = document.getElementById('turn-timer-display');
                            if (timer.scrollWidth > timer.clientWidth) throw Error(`Clipped turn timer at ${seconds}s: ${JSON.stringify({ theme: document.body.className, width: innerWidth, scroll: timer.scrollWidth, client: timer.clientWidth, text: timer.textContent, rect: timer.getBoundingClientRect().toJSON(), style: getComputedStyle(timer).cssText })}`);
                            if (!timer.textContent.trim()) throw Error('Missing turn timer');
                        }
                        if (!document.getElementById('game-connection-notice').hidden) throw Error('Recovery left the notice visible');
                        app.startClientTimer(22.5);
                    });
                }
            }
        }
        await page.clock.fastForward(17000);
        assert.equal(await page.evaluate(() => app.timeLeft), 6, 'Real browser stall must consume elapsed time');
        assert.deepEqual(errors, []);
        console.log(`PASS: ${count} real DOM/CSS reconnect layouts, 10 themes × 2 languages × 4 online modes × 3 widths; no clipping, overlays or stale notice, and deadline survives browser throttling.`);
    } finally { await browser.close(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
