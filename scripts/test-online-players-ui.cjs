'use strict';

// Isolated production DOM/CSS/renderers. All socket/account actions are fixtures.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require(process.env.YAMB_PLAYWRIGHT_PATH || 'playwright');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const index = read('www/index.html');
const sheets = [...index.matchAll(/<link rel="stylesheet" href="([^"]+)"/g)].map(m => m[1]);
const body = index.slice(index.indexOf('<body'), index.lastIndexOf('</body>') + 7).replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '');
const fixture = `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">${sheets.map(src => `<link rel="stylesheet" href="${src}">`).join('')}<style>*{animation:none!important;transition:none!important;scroll-behavior:auto!important}</style>${body}`;
const themes = ['dark', 'light', 'medium', 'winter', 'neon', 'amethyst', 'easter', 'desert', 'moon', 'severna'];
const output = path.join(root, 'tmp/online-players-ui');

async function main() {
    const browser = await chromium.launch({ headless: true,
        ...(process.env.YAMB_CHROMIUM ? { executablePath: process.env.YAMB_CHROMIUM }
            : process.env.YAMB_BROWSER_CHANNEL ? { channel: process.env.YAMB_BROWSER_CHANNEL } : {}) });
    try {
        const context = await browser.newContext({ viewport: { width: 360, height: 780 } });
        await context.route('**/*', route => {
            const url = new URL(route.request().url());
            if (url.hostname !== 'online-players-fixture.local') return route.abort();
            if (url.pathname === '/www/fixture.html') return route.fulfill({ contentType: 'text/html', body: fixture });
            const file = path.resolve(root, '.' + decodeURIComponent(url.pathname));
            if (!file.startsWith(path.join(root, 'www') + path.sep) || !fs.existsSync(file)) return route.abort();
            return route.fulfill({ contentType: ({ '.css': 'text/css', '.js': 'text/javascript', '.png': 'image/png', '.woff2': 'font/woff2' })[path.extname(file)] || 'application/octet-stream', body: fs.readFileSync(file) });
        });
        const page = await context.newPage(), errors = [];
        page.setDefaultTimeout(5000);
        page.on('pageerror', err => errors.push(err.message));
        await page.goto('http://online-players-fixture.local/www/fixture.html');
        await page.clock.install();
        await page.evaluate(() => {
            document.querySelectorAll('.screen').forEach(e => e.classList.remove('active'));
            document.querySelectorAll('[id*="splash"],[id*="loading-gate"],#rotate-lock-overlay').forEach(e => e.remove());
            document.getElementById('custom-modal-overlay').style.display = 'none';
            localStorage.clear(); localStorage.setItem('yamb_uid', 'self');
            window._safeT = key => window.t(key);
        });
        const languages = read('www/languages.js'), managers = read('www/managers.js');
        await page.addScriptTag({ content: read('www/theme-quality-assets.js') });
        await page.addScriptTag({ content: languages.slice(0, languages.indexOf('function setLanguage(')) });
        await page.addScriptTag({ content: managers.slice(managers.indexOf('class ModalManager {'), managers.indexOf('// --- 4. EFFECT MANAGER')) });
        await page.addScriptTag({ content: read('www/game.js').replace('window.app = new YambApp();', 'window.TestYambApp = YambApp;') });
        await page.addScriptTag({ content: read('www/theme-main-room-icons.js') });
        await page.addScriptTag({ content: read('www/theme-online-players-room.js') });
        await page.addScriptTag({ content: read('www/onlinenumber.js') });
        await page.evaluate(() => {
            window.makeSocket = (id = 'self-socket') => ({
                id, connected: true, disconnected: false, hooks: new Map(), emitted: [],
                on(event, fn) { this.hooks.set(event, [...(this.hooks.get(event) || []), fn]); return this; },
                once(event, fn) { const once = (...args) => { this.off(event, once); fn(...args); }; return this.on(event, once); },
                off(event, fn) { this.hooks.set(event, fn ? (this.hooks.get(event) || []).filter(x => x !== fn) : []); return this; },
                emit(event, ...args) { this.emitted.push([event, ...args]); return this; },
                receive(event, ...args) { [...(this.hooks.get(event) || [])].forEach(fn => fn(...args)); },
                connect() {}, count(event) { return (this.hooks.get(event) || []).length; }
            });
            window.app = Object.create(TestYambApp.prototype);
            Object.assign(app, { socket: makeSocket(), playerId: 'self', playerName: 'Self', onlineUsersCount: 7,
                gameActive: false, onlineMode: false, isSpectator: false, initSocketConnection() {},
                modal: new ModalManager(), requireLogin: () => true, requestFriendsList() {},
                calls: [], async emitFriendAck(event, data) { this.calls.push([event, data]); return { ok: true, targetOnline: true }; },
                async ensureSocketReadyForOnline() { return { ok: true }; }, setupSocketListeners() {},
                showServerNotice(reason) { this.calls.push(['notice', reason]); },
                spectateGame(...args) { this.calls.push(['spectate', ...args]); },
                challengePlayer(...args) { this.calls.push(['challenge', ...args]); }
            });
            window.players = [
                { socketId: 'self-socket', uid: 'self', name: 'Self' },
                { socketId: 'idle', uid: 'idle-uid', name: 'Zeljko "<img src=x onerror=window.injected=1>"', photoUrl: 'javascript:alert(1)' },
                { socketId: 'live', uid: 'live-uid', name: 'Live', roomId: 'tourney_qf_0_fixture', isPlaying: true, isTournamentMatch: true, isBusy: true, canSpectate: true, isFriend: true },
                { socketId: 'busy', uid: 'busy-uid', name: 'Busy', status: 'busy' }
            ];
            window.deliver = rows => app.socket.receive('online_players_list_data', rows);
            app.updateOnlineCounterUI(); openOnlinePlayersModal(); deliver(players);
        });
        await page.clock.runFor(250);
        assert.deepEqual(await page.evaluate(() => ['live-online-count', 'global-chat-online-count', 'waiting-online-count'].map(id => document.getElementById(id).textContent)), ['7', '7', '7']);
        const cards = page.locator('.online-player-card');
        assert.equal(await cards.count(), 4);
        assert.equal(await cards.nth(0).locator('button').count(), 0);
        assert.equal(await cards.nth(1).locator('.online-player-action--friend').isEnabled(), true);
        assert.equal(await cards.nth(1).locator('.online-player-action--spectate').isDisabled(), true);
        assert.equal(await cards.nth(2).locator('.online-player-action--friend').isDisabled(), true);
        assert.equal(await cards.nth(2).locator('.online-player-action--spectate').isEnabled(), true);
        assert.equal(await cards.nth(2).locator('.online-player-action--duel').isDisabled(), true);
        assert.equal(await cards.nth(3).locator('.online-player-action--duel').isDisabled(), true);
        const badge = page.locator('.online-player-tournament-status');
        assert.equal(await badge.count(), 1);
        assert.equal(await badge.textContent().then(text => text.trim()), 'Turnirski me\u010d');
        assert.equal(await badge.locator('button').count(), 0, 'The tournament strip is status, not another action');
        await page.evaluate(() => deliver(players.map(p => ({ ...p, isTournamentMatch: false }))));
        assert.equal(await badge.count(), 0, 'A room name alone cannot claim tournament status');
        await page.evaluate(() => deliver(players.map(p => ({ ...p, isPlaying: false, canSpectate: false }))));
        assert.equal(await badge.count(), 0, 'An inactive/waiting match must not retain a badge');
        await page.evaluate(() => deliver(players.map((p, i) => i === 0 ? { ...p, isTournamentMatch: true, isPlaying: true } : { ...p, isTournamentMatch: false })));
        assert.equal(await cards.nth(0).locator('.online-player-tournament-status').count(), 1);
        assert.equal(await cards.nth(0).locator('button').count(), 0, 'Own tournament card has no self actions');
        await page.evaluate(() => {
            deliver(players);
            app.socket.receive('online_players_status_changed');
            deliver(players.map(p => ({ ...p, isTournamentMatch: false, isPlaying: false, isBusy: false, canSpectate: false })));
        });
        assert.equal(await badge.count(), 0, 'The finish refresh removes the tournament strip');
        await page.evaluate(() => deliver(players));
        assert.equal(await page.evaluate(() => !!window.injected || !!document.querySelector('.online-player-name img')), false);
        await cards.nth(2).locator('.online-player-action--spectate').click();
        await cards.nth(1).locator('.online-player-action--duel').click();
        const calls = await page.evaluate(() => app.calls);
        assert.equal(calls[0][1].roomId, 'tourney_qf_0_fixture');
        assert.equal(calls[1][2], 'Zeljko "<img src=x onerror=window.injected=1>"');

        await cards.nth(1).locator('.online-player-action--friend').click();
        assert.equal(await page.locator('#custom-modal-overlay').isVisible(), true);
        assert.equal(await page.locator('#cm-msg img').count(), 0);
        await page.evaluate(() => deliver(players));
        assert.equal(await cards.nth(1).locator('.online-player-action--friend').isDisabled(), true,
            'Auto-refresh must not re-enable an in-flight friendship action');
        await page.locator('#cm-ok').click();
        assert.equal(await page.evaluate(() => app.calls.filter(x => x[0] === 'send_friend_req').length), 1);
        await page.evaluate(() => {
            app.emitFriendAck = async () => ({ ok: false, reason: 'err_server_conn' });
        });
        await cards.nth(1).locator('.online-player-action--friend').click();
        assert.equal(await cards.nth(1).locator('.online-player-action--friend').isEnabled(), true);

        await page.evaluate(() => { app.gameActive = true; app.onlineMode = true; deliver(players); });
        assert.equal(await cards.nth(2).locator('.online-player-action--spectate').isDisabled(), true);
        assert.equal(await cards.nth(1).locator('.online-player-action--duel').isDisabled(), true);
        await page.evaluate(() => { app.gameActive = false; deliver([null, ...players]); });
        assert.equal(await cards.count(), 4);
        await page.locator('#online-players-search').fill('live'); await page.clock.runFor(160);
        assert.equal(await cards.count(), 1);
        await page.locator('#online-players-search').fill('no matches'); await page.clock.runFor(160);
        assert.equal(await page.locator('[data-online-state="empty"]').count(), 1);
        await page.locator('#online-players-search').fill(''); await page.clock.runFor(160);
        await page.evaluate(() => deliver(Array.from({ length: 75 }, (_, i) => ({ socketId: `s${i}`, uid: `u${i}`, name: `Player ${i}` }))));
        assert.equal(await cards.count(), 30);
        await page.evaluate(() => { const b = document.getElementById('online-players-body'); b.scrollTop = b.scrollHeight; b.dispatchEvent(new Event('scroll')); });
        assert.equal(await cards.count(), 60);
        await page.evaluate(() => { const b = document.getElementById('online-players-body'); b.scrollTop = b.scrollHeight; b.dispatchEvent(new Event('scroll')); });
        assert.equal(await cards.count(), 75);

        await page.evaluate(() => {
            app.socket.connected = false; app.socket.receive('disconnect');
        });
        assert.equal(await page.locator('[data-online-state="error"]').count(), 1);
        await page.evaluate(() => {
            app.socket.connected = true; app.socket.receive('connect'); deliver(players);
            app.socket.on('online_players_list_data', () => {});
            window.oldSocket = app.socket;
            app.socket = makeSocket('replacement'); closeOnlinePlayersModal();
        });
        assert.equal(await page.evaluate(() => oldSocket.count('online_players_list_data')), 1, 'Only this modal owns the removed listener');
        assert.equal(await page.evaluate(() => oldSocket.count('connect') + oldSocket.count('disconnect')), 0);
        await page.evaluate(() => openOnlinePlayersModal());
        await page.clock.runFor(8100);
        assert.equal(await page.locator('[data-online-state="error"]').count(), 1, 'Connected server without a response needs a bounded loading state');
        await page.evaluate(() => { deliver(players); closeOnlinePlayersModal(); app.socket.connected = false; openOnlinePlayersModal(); });
        await page.clock.runFor(8100);
        assert.equal(await page.locator('[data-online-state="error"]').count(), 1);
        await page.evaluate(() => closeOnlinePlayersModal());
        assert.equal(await page.evaluate(() => app.socket.count('connect')), 0);

        await page.evaluate(() => {
            app.socket.connected = true; openOnlinePlayersModal(); deliver(players);
            app.challengePlayer = TestYambApp.prototype.challengePlayer;
            app.emitSocketAck = async (event, data) => { app.calls.push([event, data]); return { ok: true }; };
        });
        await cards.nth(1).locator('.online-player-action--duel').click();
        await page.locator('#cm-cancel').click();
        assert.equal(await page.evaluate(() => app.calls.filter(x => x[0] === 'send_challenge').length), 0);
        await cards.nth(1).locator('.online-player-action--duel').click();
        await page.locator('#cm-ok').click();
        assert.equal(await page.evaluate(() => app.calls.filter(x => x[0] === 'send_challenge').length), 1);
        await page.evaluate(async () => {
            app.spectateGame = TestYambApp.prototype.spectateGame;
            app.ensureSocketReadyForOnline = async () => ({ ok: false, reason: 'err_friend_timeout' });
            await app.spectateGame({ socketId: 'live' });
        });
        assert.equal(await page.locator('#online-players-overlay').isVisible(), true, 'Failed connection must not hide the list');
        assert.equal(await page.evaluate(() => app.calls.at(-1)[1]), 'err_spectate_open_failed');
        await page.evaluate(async () => {
            app.ensureSocketReadyForOnline = async () => ({ ok: true });
            const emit = app.socket.emit;
            app.socket.emit = function(event, ...args) {
                emit.call(this, event, ...args);
                if (event === 'request_spectate') args.at(-1)({ ok: false, reason: 'err_spectate_not_in_game' });
                return this;
            };
            await app.spectateGame({ socketId: 'live' });
        });
        await page.clock.runFor(260);
        assert.equal(await page.locator('#online-players-overlay').isVisible(), true, 'Rejected spectate must reopen the list');
        await page.evaluate(async () => {
            deliver(players);
            const emit = app.socket.emit;
            app.socket.emit = function(event, ...args) {
                if (event === 'request_spectate') { this.receive('spectate_started', { roomId: 'room-live' }); args.at(-1)({ ok: true }); return this; }
                return emit.call(this, event, ...args);
            };
            await app.spectateGame({ socketId: 'live' });
        });
        assert.equal(await page.evaluate(() => app.socket.count('spectate_started') + app.socket.count('error_msg')), 0,
            'Successful spectate must clean its temporary listeners');

        await page.evaluate(() => document.getElementById('custom-notification-container')?.remove());
        fs.mkdirSync(output, { recursive: true });
        const viewports = [{ width: 320, height: 568, scale: 1 }, { width: 360, height: 780, scale: 1.3 },
            { width: 768, height: 1024, scale: 1 }, { width: 1440, height: 900, scale: 1 }];
        let minimumContrast = Infinity;
        for (const theme of themes) for (const viewport of viewports) for (const language of ['sr', 'en']) {
            await page.setViewportSize({ width: viewport.width, height: viewport.height });
            await page.evaluate(({ theme, language, scale }) => {
                document.body.className = theme === 'dark' ? '' : `${theme}-theme`;
                localStorage.setItem('yamb_theme', theme);
                localStorage.setItem('yamb_lang', language);
                document.documentElement.style.fontSize = `${16 * scale}px`;
                players[1].name = 'Aleksandar Petrovic-Pavlovic';
                players[2].name = 'Aleksandar Petrovi\u0107-Pavlovi\u0107';
                app.socket.connected = true; openOnlinePlayersModal(); deliver(players);
                themeOnlinePlayers.apply();
                const header = document.querySelector('.online-players-title > img');
                header.src = resolveThemeQualityAsset(`assets/${theme === 'dark' ? 'green-soft-clay' : `theme-packs/${theme}`}/canonical/online-players-room-identity/online-players-room-v1.png`);
            }, { theme, language, scale: viewport.scale });
            await page.clock.runFor(80);
            await page.evaluate(() => Promise.all([...document.querySelectorAll('#online-players-overlay img')].map(i => i.decode().catch(() => {}))));
            const layout = await page.evaluate(() => {
                const shell = document.querySelector('.online-players-shell').getBoundingClientRect();
                const card = document.querySelector('.is-tournament-match');
                const main = card.querySelector('.online-player-main').getBoundingClientRect();
                const status = card.querySelector('.online-player-tournament-status');
                const strip = status.getBoundingClientRect(), text = status.querySelector('span').getBoundingClientRect();
                const style = getComputedStyle(status);
                const luminance = color => color.match(/[\d.]+/g).slice(0, 3).map(Number).map(v => v / 255)
                    .map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4)
                    .reduce((sum, v, i) => sum + v * [.2126, .7152, .0722][i], 0);
                const fg = luminance(style.color), bg = luminance(style.backgroundColor);
                return { bounds: { x: shell.x, y: shell.y, right: shell.right, bottom: shell.bottom, width: innerWidth, height: innerHeight }, inside: shell.x >= 0 && shell.right <= innerWidth + 1 && shell.y >= 0 && shell.bottom <= innerHeight + 1,
                    overlap: [...document.querySelectorAll('.online-player-card')].some(row => {
                        const name = row.querySelector('.online-player-name').getBoundingClientRect(), actions = row.querySelector('.online-player-actions')?.getBoundingClientRect();
                        return actions && name.right > actions.x + 1;
                    }), broken: [...document.querySelectorAll('#online-players-overlay img')].filter(i => i.getClientRects().length && (!i.complete || !i.naturalWidth)).length,
                    statusBelow: strip.y >= main.bottom - 1,
                    statusFits: text.x >= strip.x && text.right <= strip.right && text.y >= strip.y && text.bottom <= strip.bottom,
                    contrast: (Math.max(fg, bg) + .05) / (Math.min(fg, bg) + .05),
                    label: status.textContent.trim(),
                    canonicalTrophy: status.querySelector('img').getAttribute('src') === getCanonicalTournamentTrophySource(themeOnlinePlayers.activeTheme()) };
            });
            minimumContrast = Math.min(minimumContrast, layout.contrast);
            const correct = layout.inside && !layout.overlap && layout.broken === 0 && layout.statusBelow
                && layout.statusFits && layout.canonicalTrophy && layout.contrast >= 4.5;
            if (!correct) await page.screenshot({ path: path.join(output, `failure-${theme}-${viewport.width}-${language}.png`) });
            assert.equal(correct, true, JSON.stringify({ theme, viewport, language, layout }));
            assert.equal(layout.label, language === 'sr' ? 'Turnirski me\u010d' : 'Tournament match');

            const tournamentGeometry = await cards.nth(2).evaluate(card => {
                const rect = card.getBoundingClientRect();
                return { height: rect.height, parts: ['.online-player-name', '.theme-online-avatar', '.online-player-actions'].map(selector => {
                    const r = card.querySelector(selector).getBoundingClientRect();
                    return [r.x - rect.x, r.y - rect.y, r.width, r.height];
                }) };
            });
            await page.evaluate(() => deliver(players.map(p => ({ ...p, isTournamentMatch: false }))));
            await page.clock.runFor(80);
            const ordinaryGeometry = await cards.nth(2).evaluate(card => {
                const rect = card.getBoundingClientRect();
                return { height: rect.height, parts: ['.online-player-name', '.theme-online-avatar', '.online-player-actions'].map(selector => {
                    const r = card.querySelector(selector).getBoundingClientRect();
                    return [r.x - rect.x, r.y - rect.y, r.width, r.height];
                }) };
            });
            assert(tournamentGeometry.height - ordinaryGeometry.height >= 31
                && tournamentGeometry.height - ordinaryGeometry.height <= 34, 'Only the status strip adds card height');
            assert(tournamentGeometry.parts.every((part, i) => part.every((v, j) => Math.abs(v - ordinaryGeometry.parts[i][j]) <= 1)),
                JSON.stringify({ theme, viewport, language, tournamentGeometry, ordinaryGeometry }));
            await page.evaluate(() => deliver(players));
            await page.clock.runFor(80);
            await page.locator('.online-player-tournament-icon').evaluate(img => img.decode());
            if (viewport.width === 320 && language === 'sr') await page.screenshot({ path: path.join(output, `tournament-${theme}-320.png`) });
        }
        await page.evaluate(() => { document.body.className = 'winter-theme'; localStorage.setItem('yamb_theme', 'winter'); });
        await page.clock.runFor(80);
        await page.locator('.online-player-tournament-icon').evaluate(img => img.decode());
        assert.equal(await page.locator('.online-player-tournament-icon').evaluate(img => img.getAttribute('src') === getCanonicalTournamentTrophySource('winter')), true,
            'A visible trophy follows theme changes without a list refresh');
        assert.deepEqual(errors, []);
        console.log('PASS: actual DOM buttons and dialogs, safe names, counters, friend retries, busy guards, search, pagination, reconnect, response/connection timeouts and listener ownership.');
        console.log(`PASS: tournament status lifecycle, own/other players, SR/EN, 10 themes at four viewport/font sizes; canonical trophies, live theme change, unchanged name/action geometry and minimum ${minimumContrast.toFixed(2)}:1 status contrast.`);
    } finally { await browser.close(); }
}

main().catch(err => { console.error(err); process.exitCode = 1; });
