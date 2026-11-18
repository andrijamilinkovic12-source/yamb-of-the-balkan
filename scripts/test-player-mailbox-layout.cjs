const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require(process.env.YAMB_PLAYWRIGHT_PATH || 'playwright');
const { systemMailboxNotices } = require('../lib/mailbox-system-notices');
const root = path.resolve(__dirname, '../www');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const index = read('index.html');
const section = (first, last) => index.slice(index.indexOf(first), index.indexOf(last, index.indexOf(first)));
const styles = index.match(/<link rel="stylesheet" href="[^"]+">/g).join('');
const menu = section('<div id="main-menu"', '<div id="quote-screen"');
const dialog = section('<dialog id="player-mailbox"', '<div id="online-players-overlay"');
const intro = index.match(/<div id="easter-room-intro"[\s\S]*?<div class="easter-room-intro-title"[^>]*><\/div>\s*<\/div>/)[0];
const references = section('<div id="stats-screen"', '<div id="riznica-screen"')
    + section('<div id="highscores-screen"', '<div id="settings-screen"')
    + section('<div id="settings-screen"', '<div id="game-over-screen"');
const fixture = `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">${styles}
    <style>:root{--safe-top:24px;--safe-bottom:48px;--safe-left:0px;--safe-right:0px}
    :is(#highscores-screen,#stats-screen,#settings-screen),:is(#highscores-screen,#stats-screen,#settings-screen) *{animation:none!important;transition:none!important}</style>
    ${menu.replace('id="main-menu" class="screen"', 'id="main-menu" class="screen active"')}${intro}${dialog}${references}`;
const themes = ['dark', 'light', 'medium', 'winter', 'neon', 'amethyst', 'easter', 'desert', 'moon', 'severna'];
const sizes = [[320, 568], [360, 640], [360, 780], [390, 844], [430, 932], [800, 1024]];
const output = path.resolve(root, '../tmp/player-mailbox-review');
const layoutRows = [];

(async () => {
    const browser = await chromium.launch({ headless: true, ...(process.env.YAMB_CHROMIUM ? { executablePath: process.env.YAMB_CHROMIUM } : {}) });
    try {
        const page = await browser.newPage({ isMobile: true, hasTouch: true, timezoneId: 'America/Los_Angeles' });
        await page.route('**/*', route => {
            const url = new URL(route.request().url());
            if (url.hostname !== 'mailbox.local') return route.abort();
            if (url.pathname === '/fixture') return route.fulfill({ contentType: 'text/html', body: fixture });
            const file = path.resolve(root, '.' + decodeURIComponent(url.pathname));
            if (!file.startsWith(root + path.sep) || !fs.existsSync(file)) return route.abort();
            return route.fulfill({ path: file });
        });
        await page.goto('http://mailbox.local/fixture');
        for (const file of ['languages.js', 'theme-main-room-icons.js', 'tournamentReadinessCore.js', 'tournamentSchedulingCore.js',
            'tournamentNotificationsCore.js', 'tournamentReliabilityCore.js', 'tournamentMailCore.js', 'player-mailbox.js']) {
            await page.addScriptTag({ content: read(file) });
        }
        await page.evaluate(() => {
            const handlers = new Map();
            const socket = { connected: true, on(event, fn) { handlers.set(event, fn); } };
            window.mailRows = [{ id: 'new', type: 'friend_accepted', fromName: '<Balkan player>', createdAt: 1 },
                { id: 'notice', type: 'game_notice', title: 'Nova verzija', text: 'Pogledaj ažuriranje.', createdAt: 2,
                    action: { type: 'update', url: 'https://play.google.com/store/apps/details?id=com.yamb.balkan' } }];
            window.mailReads = 0;
            window.mailFetches = [];
            window.mailSocket = socket;
            localStorage.setItem('yamb_uid', 'test');
            window.app = { socketVerifiedUid: 'test', async emitSocketAck(event, payload = {}) {
                if (event === 'player_mailbox_get') {
                    mailFetches.push(payload.summary);
                    const rows = mailRows.filter(row => !row.deleted && !!row.archived === (payload.folder === 'archive'));
                    const start = Number(payload.before) || 0;
                    const response = { ok: true, recipientUid: 'test', ...(payload.summary ? {} : {
                        messages: structuredClone(rows.slice(start, start + 20)), folder: payload.folder || 'inbox',
                        next: rows.length > start + 20 ? String(start + 20) : '' }),
                        supportAvailable: true, supportOwner: window.mailOwner === true,
                        unread: mailRows.filter(row => !row.deleted && !row.archived && !row.readAt).length };
                    if (window.holdMailGet) await new Promise(resolve => { window.releaseMailGet = resolve; });
                    return response;
                }
                if (event === 'player_mailbox_read') {
                    mailReads++;
                    if (window.failMark) return { ok: false };
                    payload.ids.forEach(id => { const row = mailRows.find(row => row.id === id); if (row) row.readAt = Date.now(); });
                    if (window.holdMailRead) await new Promise(resolve => { window.releaseMailRead = resolve; });
                    return { ok: true };
                }
                if (event === 'player_mailbox_manage') {
                    if (window.failManage) return { ok: false };
                    const row = mailRows.find(row => row.id === payload.id);
                    if (row) {
                        if (payload.action === 'delete') row.deleted = true;
                        else row.archived = payload.action === 'archive';
                    }
                    return { ok: true, recipientUid: 'test' };
                }
                if (event === 'player_support_submit') {
                    window.lastReport = payload;
                    return { ok: true, recipientUid: 'test', reference: 'report-qa' };
                }
                if (event === 'player_mailbox_publish') {
                    window.lastPublished = payload;
                    return { ok: true, recipientUid: 'test' };
                }
                if (event === 'player_support_list') return window.failSupport ? { ok: false }
                    : { ok: true, recipientUid: 'test', rows: structuredClone(window.layoutSupportRows || []), next: '' };
            } };
            playerMailbox.bindSocket(socket);
            window.mailEvent = () => handlers.get('player_mailbox_changed')({ recipientUid: 'test' });
            playerMailbox.refresh();
        });
        const badge = page.locator('#player-mailbox-unread');
        await badge.waitFor();
        assert.equal(await badge.innerText(), '2');
        assert.equal(await page.evaluate(() => mailReads), 0);
        assert.deepEqual(await page.evaluate(() => mailFetches), [true]);
        let screenshots = false;
        for (const [width, height] of sizes) for (const theme of themes) {
            await page.setViewportSize({ width, height });
            await page.evaluate(theme => {
                document.body.className = theme === 'dark' ? '' : theme + '-theme';
                document.documentElement.dataset.splashTheme = theme;
                playerMailbox.applyTheme(theme);
            }, theme);
            await page.waitForFunction(theme => {
                const root = theme === 'dark' ? 'assets/green-soft-clay/' : `assets/theme-packs/${theme}/`;
                return ['#player-mailbox-button img', '.main-global-chat-btn img'].every(selector => {
                    const image = document.querySelector(selector);
                    return image.complete && image.naturalWidth > 0 && image.getAttribute('src')?.startsWith(root);
                });
            }, theme);
            const bounds = await page.evaluate(() => {
                const menu = document.querySelector('#main-menu').getBoundingClientRect();
                const chat = document.querySelector('.main-global-chat-btn').getBoundingClientRect();
                const button = document.querySelector('#player-mailbox-button').getBoundingClientRect();
                const image = document.querySelector('#player-mailbox-button img').getBoundingClientRect();
                const chatImage = document.querySelector('.main-global-chat-btn img').getBoundingClientRect();
                return [button.y - chat.y, menu.right - button.right - (chat.left - menu.left),
                    button.width, button.height, image.width - image.height,
                    image.x + image.width / 2 - (button.x + button.width / 2),
                    image.y + image.height / 2 - (chatImage.y + chatImage.height / 2)];
            });
            assert.ok(bounds.every((x, n) => Math.abs(x - [0, 0, 44, 44, 0, 0, 0][n]) < 0.3), `${theme} ${width} ${bounds}`);
            if (width === 360) {
                const paintedArea = await page.evaluate(() => ['#player-mailbox-button img', '.main-global-chat-btn img'].map(selector => {
                    const image = document.querySelector(selector);
                    const canvas = document.createElement('canvas');
                    canvas.width = image.naturalWidth;
                    canvas.height = image.naturalHeight;
                    const context = canvas.getContext('2d');
                    context.drawImage(image, 0, 0);
                    const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
                    let count = 0;
                    for (let i = 3; i < pixels.length; i += 4) if (pixels[i] >= 96) count++;
                    const box = image.getBoundingClientRect();
                    return count * (Math.min(box.width / canvas.width, box.height / canvas.height) ** 2);
                }));
                assert.ok(Math.abs(paintedArea[0] / paintedArea[1] - 1) < .035, `${theme} painted areas ${paintedArea}`);
            }
            if (width === 320 && theme === 'dark') {
                const output = path.resolve(root, '../tmp/player-mailbox-review');
                fs.mkdirSync(output, { recursive: true });
                await page.screenshot({ path: path.join(output, 'posta-zelena-meni.png') });
            }
            await page.locator('#player-mailbox-button').click();
            const room = page.locator('#player-mailbox');
            assert.ok(await room.isVisible());
            await page.locator('[data-message-id="new"]').waitFor();
            const box = await room.boundingBox();
            assert.ok(box.x >= 10 && box.x + box.width <= width - 10 && box.y >= 24 && box.y + box.height <= height - 56);
            const standards = await page.evaluate(() => {
                const heading = document.querySelector('#player-mailbox-title');
                const panel = document.querySelector('#player-mailbox');
                const report = document.querySelector('#player-mailbox-report');
                const row = document.querySelector('#player-mailbox-list button');
                const close = document.querySelector('#player-mailbox-close');
                const contrast = (a, b) => {
                    const luminance = color => color.match(/[\d.]+/g).slice(0, 3).map(value => Number(value) / 255)
                        .map(value => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4)
                        .reduce((sum, channel, i) => sum + channel * [.2126, .7152, .0722][i], 0);
                    const values = [luminance(a), luminance(b)].sort((a, b) => b - a);
                    return (values[0] + .05) / (values[1] + .05);
                };
                const ink = getComputedStyle(row).color;
                const surface = getComputedStyle(panel).backgroundColor;
                const raised = getComputedStyle(row.closest('li')).backgroundColor;
                const muted = getComputedStyle(row.querySelector('time')).color;
                const activeFolder = getComputedStyle(document.querySelector('#player-mailbox [aria-pressed="true"]'));
                const inactiveFolder = getComputedStyle(document.querySelector('#player-mailbox [aria-pressed="false"]'));
                return { titleSize: getComputedStyle(heading).fontSize, titleWeight: getComputedStyle(heading).fontWeight,
                    titleCase: getComputedStyle(heading).textTransform,
                    iconWidth: panel.querySelector('header img').getBoundingClientRect().width, buttonSize: getComputedStyle(report).fontSize,
                    closeWidth: close.getBoundingClientRect().width, closeAsset: getComputedStyle(close).backgroundImage,
                    folderDistinct: activeFolder.backgroundColor !== inactiveFolder.backgroundColor,
                    contrast: [contrast(ink, surface), contrast(ink, raised), contrast(muted, raised),
                        contrast(activeFolder.color, activeFolder.backgroundColor)] };
            });
            assert.ok(Math.abs(parseFloat(standards.titleSize) - Math.max(16.8, Math.min(width * .042, 19.52))) < .02);
            assert.equal(standards.titleWeight, '850');
            assert.equal(standards.titleCase, 'uppercase');
            assert.equal(standards.iconWidth, 32);
            assert.equal(standards.buttonSize, '13.12px');
            assert.equal(standards.closeWidth, 44);
            assert.equal(standards.folderDistinct, true, 'The active mail folder is visibly highlighted');
            assert.ok(standards.closeAsset.includes(theme === 'dark' ? '/green-soft-clay/' : `/theme-packs/${theme}/`));
            assert.ok(standards.contrast.every(value => value >= 4.5), `${theme} contrast ${standards.contrast}`);
            if (width === 360 && theme === 'neon') {
                const output = path.resolve(root, '../tmp/player-mailbox-review');
                fs.mkdirSync(output, { recursive: true });
                await page.screenshot({ path: path.join(output, 'posta-neon.png') });
                screenshots = true;
            }
            await page.locator('#player-mailbox-close').click();
            assert.ok(await room.isHidden());
        }
        assert.equal(await badge.innerText(), '2');
        assert.equal(await page.evaluate(() => mailReads), 0);
        assert.ok((await page.evaluate(() => mailFetches)).includes(false));
        await page.locator('#player-mailbox-button').click();
        await page.locator('[data-message-id="new"]').click();
        assert.match(await page.locator('#player-mailbox-body').innerText(), /<Balkan player>/);
        await page.waitForFunction(() => document.querySelector('#player-mailbox-unread').textContent === '1');
        assert.equal(await page.evaluate(() => mailReads), 1);
        await page.locator('#player-mailbox-back').click();
        await page.evaluate(() => { window.failMark = true; });
        await page.locator('[data-message-id="notice"]').click();
        assert.match(await page.locator('#player-mailbox-action').getAttribute('href'), /^https:\/\/play\.google\.com\//);
        await page.locator('#player-mailbox-read-retry').waitFor();
        assert.equal(await badge.innerText(), '1');
        await page.evaluate(() => { window.failMark = false; });
        await page.locator('#player-mailbox-read-retry').click();
        await badge.waitFor({ state: 'hidden' });
        await page.locator('#player-mailbox-back').click();
        assert.equal(await page.locator('#player-mailbox-compose').isHidden(), true);
        await page.locator('#player-mailbox-report').click();
        assert.equal(await page.locator('input[name="attachDiagnostics"]').isChecked(), false);
        await page.locator('#player-mailbox-description').fill('Test prijava na malom ekranu.');
        await page.locator('input[name="attachDiagnostics"]').check();
        await page.locator('#player-mailbox-report-form button[type="submit"]').click();
        await page.getByText(/report-qa/).waitFor();
        assert.equal(await page.evaluate(() => lastReport.attachDiagnostics), true);
        await page.locator('#player-mailbox-close').click();
        await page.evaluate(() => {
            mailRows.unshift({ id: 'late', type: 'league_reward', rank: 1, reward: 10000, createdAt: 2 });
            mailEvent();
        });
        await badge.waitFor();
        assert.equal(await badge.innerText(), '1');
        await page.evaluate(() => { window.mailOwner = true; mailEvent(); });
        await page.locator('#player-mailbox-button').click();
        await page.locator('#player-mailbox-compose').click();
        await page.locator('#player-mailbox-publish-subject').fill('Nova verzija');
        await page.locator('#player-mailbox-publish-body').fill('Ažuriranje je dostupno.');
        await page.locator('#player-mailbox-publish-action').selectOption('update');
        const publish = page.locator('#player-mailbox-publish-form button[type="submit"]');
        page.once('dialog', dialog => dialog.dismiss());
        await publish.click();
        assert.equal(await page.evaluate(() => window.lastPublished), undefined);
        page.once('dialog', dialog => dialog.accept());
        await publish.click();
        await page.getByText('Obaveštenje je objavljeno.', { exact: true }).waitFor();
        assert.equal(await page.evaluate(() => lastPublished.action.type), 'update');
        await page.locator('#player-mailbox-back').click();
        await page.evaluate(() => { window.failSupport = true; });
        await page.locator('#player-mailbox-support').click();
        await page.locator('#player-mailbox-support-retry').waitFor();
        await page.evaluate(() => { window.failSupport = false; setLanguage('en'); });
        await page.locator('#player-mailbox-support-retry').click();
        await page.getByText('No reports are waiting for a reply.').waitFor();
        await page.locator('#player-mailbox-back').click();
        await page.evaluate(() => {
            mailRows.unshift({ id: 'review', type: 'tournament_unplayed', createdAt: 3,
                tournament: { tournamentNumber: 14, round: 'qf', outcome: 'extended', deadlineAt: Date.parse('2026-11-16T09:00:00Z') } });
            mailEvent();
        });
        await page.locator('[data-message-id="review"]').click();
        const tournamentBody = page.locator('#player-mailbox-body');
        assert.match(await tournamentBody.innerText(), /Tournament No\. 14 · Quarterfinal/);
        assert.match(await tournamentBody.innerText(), /10:00 AM Belgrade time/);
        await page.evaluate(() => setLanguage('sr'));
        assert.match(await tournamentBody.innerText(), /Turnir br\. 14 · Četvrtfinale/);
        assert.match(await tournamentBody.innerText(), /10:00 po vremenu u Beogradu/);
        await page.locator('#player-mailbox-back').click();
        for (const stage of ['schedule_halfway', 'schedule_overdue', 'reply_halfway', 'reply_overdue',
            'appointment_missed', 'deadline_six_hours', 'deadline_last_hour']) {
            await page.evaluate(stage => {
                mailRows.unshift({ id: 'tournament-warning-' + stage, type: 'tournament_match_warning', createdAt: 15,
                    tournamentWarning: { tournamentNumber: 11, round: 'qf', index: 0, stage,
                        deadlineAt: Date.parse('2026-11-13T08:00:00Z'), actionDeadlineAt: Date.parse('2026-11-11T16:00:00Z'),
                        scheduledAt: Date.parse('2026-11-12T10:00:00Z'), opponentName: 'Mina <b>$&</b>' } });
                mailEvent();
            }, stage);
            await page.locator(`[data-message-id="tournament-warning-${stage}"]`).click();
            assert.equal(await page.locator('#player-mailbox-subject').innerText(), 'Podsetnik za tvoj turnirski meč');
            assert.match(await tournamentBody.innerText(), /Turnir br\. 11 · Četvrtfinale/);
            assert.match(await tournamentBody.innerText(), /Mina <b>\$&<\/b>/);
            assert.match(await tournamentBody.innerText(), /09:00/);
            assert.match(await tournamentBody.innerText(), /Sam po sebi ne beleži prekršaj/);
            assert.equal(await tournamentBody.locator('b').count(), 0);
            assert.doesNotMatch(await tournamentBody.innerText(), /\{(?:deadline|actionDeadline|scheduled)\}/);
            await page.evaluate(() => setLanguage('en'));
            assert.equal(await page.locator('#player-mailbox-subject').innerText(), 'Reminder for your tournament match');
            assert.match(await tournamentBody.innerText(), /Tournament No\. 11 · Quarterfinal/);
            assert.match(await tournamentBody.innerText(), /9:00 AM/);
            assert.match(await tournamentBody.innerText(), /does not record an offence/);
            assert.doesNotMatch(await tournamentBody.innerText(), /\{(?:deadline|actionDeadline|scheduled)\}/);
            await page.evaluate(() => setLanguage('sr'));
            await page.locator('#player-mailbox-back').click();
        }
        await page.evaluate(() => {
            mailRows.unshift(
                { id: 'game:public-tournament', type: 'tournament_champion', createdAt: 4,
                    champion: { playerName: 'Luka <Champion>', tournamentNumber: 12 } },
                { id: 'game:public-league', type: 'league_champion', createdAt: 5,
                    champion: { playerName: 'Mina $&', year: 2026, quarter: 3, score: 150000 } }
            );
            mailEvent();
        });
        await page.locator('[data-message-id="game:public-tournament"]').click();
        assert.equal(await page.locator('#player-mailbox-subject').innerText(), 'Pobednik turnira');
        assert.equal(await tournamentBody.innerText(), 'Pobednik turnira br. 12 je Luka <Champion>. Čestitamo!');
        assert.equal(await tournamentBody.locator('champion').count(), 0);
        await page.evaluate(() => setLanguage('en'));
        assert.equal(await page.locator('#player-mailbox-subject').innerText(), 'Tournament champion');
        assert.equal(await tournamentBody.innerText(), 'The champion of tournament No. 12 is Luka <Champion>. Congratulations!');
        await page.locator('#player-mailbox-back').click();
        await page.locator('[data-message-id="game:public-league"]').click();
        assert.equal(await page.locator('#player-mailbox-subject').innerText(), 'Quarterly League champion');
        assert.equal(await tournamentBody.innerText(), 'The Quarterly League champion for Q3 / 2026 is Mina $& with 150,000 points. Congratulations!');
        await page.evaluate(() => setLanguage('sr'));
        assert.equal(await tournamentBody.innerText(), 'Pobednik Kvartalne lige za Q3 / 2026 je Mina $& sa 150.000 poena. Čestitamo!');
        await page.locator('#player-mailbox-back').click();
        await page.evaluate(() => {
            mailRows.unshift({ id: 'game:record-qa', type: 'leaderboard_record', createdAt: 6,
                leaderboard: { playerName: 'Mina $&', score: 1450, periods: [
                    { period: 'weekly', change: 'leader_changed', previousScore: 1300, periodStartedAt: Date.parse('2026-11-08T23:00:00Z') },
                    { period: 'monthly', change: 'record_improved', previousScore: 1400, periodStartedAt: Date.parse('2026-10-31T23:00:00Z') },
                    { period: 'all_time', change: 'leader_changed', previousScore: 1449, periodStartedAt: null }
                ] } });
            mailEvent();
        });
        await page.locator('[data-message-id="game:record-qa"]').click();
        assert.equal(await page.locator('#player-mailbox-subject').innerText(), 'Novosti globalne Top liste');
        assert.match(await tournamentBody.innerText(), /Mina \$& je postigao 1\.450 poena/);
        assert.match(await tournamentBody.innerText(), /Promenjen je lider i oboren rekord/);
        assert.match(await tournamentBody.innerText(), /Lider je poboljšao svoj rekord/);
        assert.match(await tournamentBody.innerText(), /Lista za sva vremena/);
        await page.evaluate(() => setLanguage('en'));
        assert.equal(await page.locator('#player-mailbox-subject').innerText(), 'Global leaderboard update');
        assert.match(await tournamentBody.innerText(), /Mina \$& scored 1,450 points/);
        assert.match(await tournamentBody.innerText(), /Weekly leaderboard from Nov 9, 2026/);
        assert.match(await tournamentBody.innerText(), /Monthly leaderboard from Nov 1, 2026/);
        assert.match(await tournamentBody.innerText(), /The leader improved their own record/);
        assert.match(await tournamentBody.innerText(), /All-time leaderboard/);
        await page.locator('#player-mailbox-back').click();
        await page.evaluate(() => {
            mailRows.unshift({ id: 'private-rank-qa', type: 'league_rank_changed', createdAt: 7,
                leagueRank: { year: 2026, quarter: 4, previousRank: 'profi', nextRank: 'majstor', score: 15050, direction: 'up' } });
            mailEvent();
        });
        await page.locator('[data-message-id="private-rank-qa"]').click();
        assert.equal(await page.locator('#player-mailbox-subject').innerText(), 'Your Quarterly League rank');
        assert.match(await tournamentBody.innerText(), /PRO to MASTER with 15,050 points in Q4 \/ 2026/);
        await page.evaluate(() => setLanguage('sr'));
        assert.equal(await page.locator('#player-mailbox-subject').innerText(), 'Tvoj rang u Kvartalnoj ligi');
        assert.match(await tournamentBody.innerText(), /PROFI u rang MAJSTOR sa 15\.050 poena u Q4 \/ 2026/);
        await page.locator('#player-mailbox-back').click();
        await page.evaluate(() => {
            mailRows.unshift({ id: 'private-rank-down-qa', type: 'league_rank_changed', createdAt: 8,
                leagueRank: { year: 2026, quarter: 4, previousRank: 'titan', nextRank: 'legenda', score: 99999, direction: 'down' } });
            mailEvent();
        });
        await page.locator('[data-message-id="private-rank-down-qa"]').click();
        assert.match(await tournamentBody.innerText(), /TITAN u LEGENDA/);
        await page.evaluate(() => setLanguage('en'));
        assert.match(await tournamentBody.innerText(), /TITAN to LEGEND/);
        assert.match(await tournamentBody.innerText(), /you can climb back/);
        await page.locator('#player-mailbox-back').click();
        for (const [type, statistics, srTitle, enTitle] of [
            ['power_index_milestone', { milestone: 10000, value: 10245, next: 15000 }, 'Novi prag indeksa moći', 'New Power Index milestone'],
            ['fire_streak_milestone', { milestone: 6, value: 6, next: 9, best: 12 }, 'Tvoj vatreni niz raste', 'Your winning streak is growing'],
            ['fire_streak_ended', { value: 6, best: 12 }, 'Novi početak za tvoj niz', 'A fresh start for your streak']
        ]) {
            await page.evaluate(({ type, statistics }) => {
                mailRows.unshift({ id: 'stats-' + type, type, statistics, createdAt: 10 });
                mailEvent();
            }, { type, statistics });
            await page.locator(`[data-message-id="stats-${type}"]`).click();
            assert.equal(await page.locator('#player-mailbox-subject').innerText(), enTitle);
            assert.doesNotMatch(await tournamentBody.innerText(), /\{(?:milestone|value|next|best)\}/);
            if (type === 'power_index_milestone') assert.match(await tournamentBody.innerText(), /10,000.*10,245.*15,000/);
            await page.evaluate(() => setLanguage('sr'));
            assert.equal(await page.locator('#player-mailbox-subject').innerText(), srTitle);
            if (type === 'power_index_milestone') assert.match(await tournamentBody.innerText(), /10\.000.*10\.245.*15\.000/);
            if (type === 'fire_streak_ended') assert.match(await tournamentBody.innerText(), /od 6 uzastopnih pobeda.*12/);
            await page.evaluate(() => setLanguage('en'));
            await page.locator('#player-mailbox-back').click();
        }
        for (const [rank, reward] of [[1, 3000], [2, 3000], [3, 5000]]) {
            await page.evaluate(({ rank, reward }) => {
                mailRows.unshift({ id: `referral-${rank}`, type: 'referral_reward', rank, reward, createdAt: 11 + rank });
                mailEvent();
            }, { rank, reward });
            await page.locator(`[data-message-id="referral-${rank}"]`).click();
            assert.match(await tournamentBody.innerText(), new RegExp(`Confirmed referral ${rank}/3`));
            assert.match(await tournamentBody.innerText(), new RegExp(`added ${reward.toLocaleString('en-US')} ducats`));
            await page.evaluate(() => setLanguage('sr'));
            assert.match(await tournamentBody.innerText(), new RegExp(`Potvrđena preporuka ${rank}/3`));
            assert.match(await tournamentBody.innerText(), new RegExp(`dodato ${reward.toLocaleString('sr-Latn')} dukata`));
            assert.doesNotMatch(await tournamentBody.innerText(), /\{(?:rank|reward)\}/);
            await page.evaluate(() => setLanguage('en'));
            await page.locator('#player-mailbox-back').click();
        }
        const translationCoverage = await page.evaluate(() => {
            const automatic = ['friend_request', 'friend_accepted', 'friend_declined', 'tournament_winner', 'tournament_finalist',
                'league_reward', 'moderation_resolved', 'moderation_dismissed', 'tournament_champion', 'league_champion',
                'power_index_milestone', 'fire_streak_milestone', 'fire_streak_ended'];
            for (const locale of ['sr', 'en']) for (const type of automatic) {
                if (!TRANSLATIONS[locale][`mailbox_${type}`] || !TRANSLATIONS[locale][`mailbox_${type}_title`]) return false;
            }
            return true;
        });
        assert.equal(translationCoverage, true);
        await page.locator('#player-mailbox-close').click();
        await page.evaluate(() => { playerMailbox.navigate('game-scene'); });
        const fetchesBeforeGame = await page.evaluate(() => mailFetches.length);
        await page.evaluate(() => mailEvent());
        assert.equal(await page.evaluate(() => mailFetches.length), fetchesBeforeGame);
        await page.evaluate(() => playerMailbox.navigate('main-menu'));
        await page.waitForFunction(count => mailFetches.length > count && mailFetches.at(-1) === true, fetchesBeforeGame);
        await page.evaluate(() => {
            window.mailOwner = false;
            mailRows = Array.from({ length: 137 }, (_, i) => ({ id: 'history-' + i, type: 'game_notice',
                title: 'Obavestenje ' + i, text: 'QA istorija poruka', createdAt: 200000 - i }));
            mailEvent();
        });
        await page.waitForFunction(() => document.querySelector('#player-mailbox-unread').textContent === '99+');
        const rows = page.locator('#player-mailbox-list button');
        for (const theme of themes) {
            await page.setViewportSize({ width: 320, height: 568 });
            await page.evaluate(theme => {
                document.body.className = theme === 'dark' ? '' : theme + '-theme';
                document.documentElement.dataset.splashTheme = theme;
                playerMailbox.applyTheme(theme);
            }, theme);
            await page.locator('#player-mailbox-button').click();
            await page.waitForFunction(() => document.querySelectorAll('#player-mailbox-list button').length === 20);
            const closeBefore = await page.locator('#player-mailbox-close').boundingBox();
            await page.locator('#player-mailbox-more').click();
            await page.waitForFunction(() => document.querySelectorAll('#player-mailbox-list button').length === 40);
            const scroll = await page.evaluate(() => {
                const content = document.querySelector('.player-mailbox-content');
                content.scrollTop = content.scrollHeight;
                return { top: content.scrollTop, inner: content.scrollHeight > content.clientHeight,
                    outer: document.scrollingElement.scrollTop };
            });
            assert.ok(scroll.inner && scroll.top > 0 && scroll.outer === 0, `${theme}: only the mailbox content scrolls`);
            assert.deepEqual(await page.locator('#player-mailbox-close').boundingBox(), closeBefore,
                'Close button remains fixed while the list scrolls');
            assert.ok(closeBefore.y >= 12 && closeBefore.y + closeBefore.height <= 568 - 12);
            await page.locator('#player-mailbox-close').click();
        }
        await page.locator('#player-mailbox-button').click();
        await page.waitForFunction(() => document.querySelectorAll('#player-mailbox-list button').length === 20);
        for (let length = 40; length <= 140; length += 20) {
            await page.locator('#player-mailbox-more').click();
            await page.waitForFunction(count => document.querySelectorAll('#player-mailbox-list button').length === count, Math.min(137, length));
        }
        assert.equal(await rows.count(), 137);
        assert.equal(await page.locator('#player-mailbox-more').isHidden(), true);
        await page.locator('[data-message-id="history-136"]').click();
        await page.waitForFunction(() => mailRows.at(-1).readAt > 0);
        assert.equal(await badge.innerText(), '99+', 'Reading one loaded row does not replace total unread count with page count');
        await page.evaluate(() => { window.failManage = true; });
        await page.locator('#player-mailbox-archive').click();
        await page.waitForFunction(() => document.querySelector('#player-mailbox-manage-status').textContent === t('mailbox_unavailable'));
        assert.equal(await page.locator('#player-mailbox-detail').isVisible(), true, 'Failed changes preserve the opened message for retry');
        await page.evaluate(() => { window.failManage = false; });
        await page.locator('#player-mailbox-archive').click();
        await page.waitForFunction(() => document.querySelector('#player-mailbox-inbox').hidden === false);
        await page.locator('#player-mailbox-folder-archive').click();
        await page.locator('[data-message-id="history-136"]').click();
        assert.equal(await page.locator('#player-mailbox-archive').innerText(), 'Move to received');
        await page.locator('#player-mailbox-archive').click();
        await page.locator('#player-mailbox-folder-inbox').click();
        await page.waitForFunction(() => document.querySelectorAll('#player-mailbox-list button').length === 20);
        await page.locator('[data-message-id="history-0"]').click();
        page.once('dialog', dialog => dialog.dismiss());
        await page.locator('#player-mailbox-delete').click();
        assert.equal(await page.locator('#player-mailbox-detail').isVisible(), true);
        page.once('dialog', dialog => dialog.accept());
        await page.locator('#player-mailbox-delete').click();
        await page.waitForFunction(() => document.querySelector('#player-mailbox-inbox').hidden === false);
        await page.waitForFunction(() => !document.querySelector('[data-message-id="history-0"]'));
        assert.equal(await page.evaluate(() => mailRows[0].deleted), true);
        await page.locator('#player-mailbox-close').click();
        await page.evaluate(() => { window.holdMailGet = true; });
        await page.locator('#player-mailbox-button').click();
        await page.waitForFunction(() => typeof window.releaseMailGet === 'function');
        await page.locator('#player-mailbox-folder-archive').click();
        await page.evaluate(() => { window.holdMailGet = false; window.releaseMailGet(); });
        await page.waitForFunction(() => document.querySelector('#player-mailbox-status').textContent === t('mailbox_archive_empty'));
        assert.equal(await rows.count(), 0, 'A delayed inbox response cannot replace the archive folder');
        await page.locator('#player-mailbox-folder-inbox').click();
        await page.waitForFunction(() => document.querySelectorAll('#player-mailbox-list button').length === 20);
        await page.evaluate(() => { window.holdMailRead = true; });
        await page.locator('[data-message-id="history-1"]').click();
        await page.waitForFunction(() => typeof window.releaseMailRead === 'function');
        await page.locator('#player-mailbox-archive').click();
        await page.waitForFunction(() => document.querySelector('#player-mailbox-inbox').hidden === false);
        await page.waitForFunction(() => document.querySelector('#player-mailbox-button').getAttribute('aria-label') === t('mailbox_unread').replace('{0}', '134'));
        await page.evaluate(() => { window.holdMailRead = false; window.releaseMailRead(); });
        await page.waitForFunction(() => document.querySelector('#player-mailbox-button').getAttribute('aria-label') === t('mailbox_unread').replace('{0}', '134'));
        await page.locator('#player-mailbox-close').click();
        const game = read('game.js');
        const method = name => game.match(new RegExp(`^    ${name}\\([^]*?^    }`, 'm'))[0];
        const timing = read('config.js').match(/^window\.ROOM_INTRO_TIMING = .*;$/m)[0];
        await page.addScriptTag({ content: `
            ${timing}
            Object.assign(app, { ${['getMainRoomPackSource', 'shouldPlayThemedRoomIntro', 'playEasterRoomIntro'].map(method).join(',')},
                reportMonitorRoomVisit() {}, prepareThemeRoomAssets() {} });
        ` });
        await page.clock.install();
        const overlay = page.locator('#easter-room-intro');
        const mailRoom = page.locator('#player-mailbox');
        for (const theme of themes) {
            await page.evaluate(theme => {
                localStorage.setItem('yamb_theme', theme);
                document.body.className = theme === 'dark' ? '' : theme + '-theme';
                document.documentElement.dataset.splashTheme = theme;
                playerMailbox.applyTheme(theme);
                document.querySelector('#player-mailbox-button').click();
                document.querySelector('#player-mailbox-button').click();
            }, theme);
            assert.equal(await overlay.isVisible(), true);
            assert.equal(await overlay.locator('.easter-room-intro-title').innerText(), '');
            assert.equal(await overlay.locator('img').getAttribute('src'), await page.evaluate(theme => playerMailbox.iconSource(theme), theme));
            assert.match(await overlay.evaluate(node => getComputedStyle(node).backgroundImage),
                theme === 'dark' ? /green-clay-balkan-diorama/ : new RegExp(`theme-backgrounds/${theme}-v`));
            assert.equal(await overlay.locator('img').evaluate(node => getComputedStyle(node).animationName), 'greenRoomIconPulse');
            assert.equal(await overlay.evaluate(node => getComputedStyle(node).animationDuration), '3.2s');
            await page.clock.fastForward(2400);
            assert.equal(await mailRoom.isHidden(), true);
            await page.clock.fastForward(800);
            assert.equal(await overlay.isHidden(), true);
            assert.equal(await mailRoom.isVisible(), true);
            await page.locator('#player-mailbox-close').click();
        }
        await page.evaluate(() => {
            document.querySelector('#player-mailbox-button').click();
            playerMailbox.navigate('game-scene');
            playerMailbox.navigate('main-menu');
        });
        await page.clock.fastForward(3200);
        assert.equal(await mailRoom.isHidden(), true);
        await page.evaluate(() => {
            window.qaAdCalls = 0;
            app.shouldPlayThemedRoomIntro = () => false;
            app.adMob = { showInterstitial() {
                qaAdCalls++;
                if (window.qaAdFailure) throw new Error('QA ad unavailable');
                return Promise.resolve(false);
            } };
        });
        await page.locator('#player-mailbox-button').click();
        await page.clock.fastForward(3000);
        await page.locator('#player-mailbox-close').click();
        assert.equal(await page.evaluate(() => qaAdCalls), 0);
        await page.locator('#player-mailbox-button').click();
        await page.clock.fastForward(8001);
        await page.locator('#player-mailbox-close').click();
        await page.waitForFunction(() => qaAdCalls === 1);
        assert.equal(await mailRoom.isHidden(), true);
        await page.evaluate(() => document.querySelector('#player-mailbox-close').click());
        assert.equal(await page.evaluate(() => qaAdCalls), 1);
        await page.locator('#player-mailbox-button').click();
        await page.clock.fastForward(9000);
        await page.evaluate(() => playerMailbox.navigate('game-scene'));
        assert.equal(await mailRoom.isHidden(), true);
        assert.equal(await page.evaluate(() => qaAdCalls), 1);
        await page.evaluate(() => playerMailbox.navigate('main-menu'));
        await page.locator('#player-mailbox-button').click();
        await page.clock.fastForward(9000);
        await page.keyboard.press('Escape');
        await page.waitForFunction(() => qaAdCalls === 2);
        assert.equal(await mailRoom.isHidden(), true);
        await page.locator('#player-mailbox-button').click();
        await page.clock.fastForward(9000);
        await page.evaluate(() => { window.qaAdFailure = true; });
        await page.locator('#player-mailbox-close').click();
        await page.waitForFunction(() => qaAdCalls === 3);
        assert.equal(await mailRoom.isHidden(), true, 'Unavailable ads cannot keep the mailbox open');
        assert.ok(screenshots);
        await page.evaluate(notices => {
            mailRows.unshift(...notices);
            setLanguage('sr');
            mailEvent();
        }, systemMailboxNotices(1));
        await page.locator('#player-mailbox-button').click();
        const pinned = page.locator('[data-message-id="game:official-facebook-follow-v1"]');
        await pinned.waitFor();
        assert.equal(await page.locator('#player-mailbox-list button').first().getAttribute('data-message-id'), 'game:official-facebook-follow-v1');
        const referralNotice = page.locator('[data-message-id="game:official-referral-invite-v1"]');
        assert.equal(await page.locator('#player-mailbox-list button').nth(1).getAttribute('data-message-id'), 'game:official-referral-invite-v1');
        assert.match(await referralNotice.innerText(), /11.000 dukata/);
        assert.match(await pinned.innerText(), /Zakačeno/);
        await pinned.click();
        assert.match(await page.locator('#player-mailbox-body').innerText(), /zapratiti i lajkovati.*i podeliti/);
        assert.equal(await page.locator('#player-mailbox-archive').isVisible(), false);
        assert.equal(await page.locator('#player-mailbox-delete').isVisible(), false);
        assert.equal(await page.locator('#player-mailbox-protected-note').isVisible(), true);
        const facebookAction = page.locator('#player-mailbox-action');
        assert.equal(await facebookAction.getAttribute('href'), 'https://www.facebook.com/profile.php?id=61588191682382');
        assert.equal(await facebookAction.locator('.player-mailbox-facebook-mark').isVisible(), true);
        await page.evaluate(() => setLanguage('en'));
        assert.match(await page.locator('#player-mailbox-body').innerText(), /following and liking.*and sharing/);
        assert.equal(await facebookAction.getByText('Open our Facebook page').isVisible(), true);
        await page.evaluate(() => {
            window.yambReferrals = { isEnabled: () => true };
            window.dispatchEvent(new Event('yamb:referralConfig'));
        });
        const referralPanel = page.locator('#player-mailbox-referral-panel');
        const referralButton = page.locator('#player-mailbox-referral');
        assert.equal(await referralPanel.isVisible(), false, 'Facebook contains no referral panel');
        assert.doesNotMatch(await page.locator('#player-mailbox-body').innerText(), /11,000|server-verified/);
        await page.locator('#player-mailbox-back').click();
        await referralNotice.click();
        assert.equal(await referralPanel.isVisible(), true);
        assert.equal(await facebookAction.isVisible(), false, 'Referral invitation contains no Facebook action');
        const referralBody = page.locator('#player-mailbox-body');
        assert.match(await referralBody.innerText(), /11,000 ducats/);
        assert.match(await referralBody.innerText(), /3,000.*3,000.*5,000/);
        assert.doesNotMatch(await referralBody.innerText(), /Facebook/);
        for (const theme of themes) for (const language of ['sr', 'en']) {
            await page.setViewportSize({ width: 320, height: 568 });
            await page.evaluate(({ theme, language }) => {
                document.body.className = theme === 'dark' ? '' : theme + '-theme';
                document.documentElement.dataset.splashTheme = theme;
                playerMailbox.applyTheme(theme);
                setLanguage(language);
            }, { theme, language });
            assert.equal(await referralButton.isVisible(), true);
            assert.equal(await facebookAction.isVisible(), false);
            assert.equal(await page.locator('#player-mailbox-archive').isVisible(), false);
            assert.equal(await page.locator('#player-mailbox-delete').isVisible(), false);
            const layout = await referralButton.evaluate(button => {
                const r = button.getBoundingClientRect();
                const panel = button.closest('section').getBoundingClientRect();
                const room = button.closest('dialog');
                return r.width > 0 && r.left >= panel.left && r.right <= panel.right
                    && r.height >= 44 && room.scrollWidth <= room.clientWidth + 1;
            });
            assert.ok(layout, `${theme} ${language} referral button must fit the message`);
            assert.match(await referralPanel.innerText(), language === 'sr' ? /Podeli svoj Yamb poziv/ : /Share your Yamb invite/);
        }
        await page.evaluate(() => {
            window.yambReferrals = { isEnabled: () => false };
            window.dispatchEvent(new Event('yamb:referralConfig'));
        });
        assert.equal(await referralPanel.isVisible(), false, 'hide the reward offer if referrals are disabled');
        assert.equal(await facebookAction.isVisible(), false);
        assert.match(await referralBody.innerText(), /11,000/);
        await page.locator('#player-mailbox-back').click();
        await pinned.click();
        assert.equal(await facebookAction.isVisible(), true, 'the separate Facebook appeal remains available');
        assert.equal(await referralPanel.isVisible(), false);
        await page.locator('#player-mailbox-back').click();
        assert.match(await pinned.innerText(), /Pinned/);
        assert.doesNotMatch(await pinned.innerText(), /\bNew\b/);
        await page.evaluate(() => {
            mailRows.unshift({ id: 'game:android-update:115', type: 'android_update', createdAt: Date.now(),
                versionCode: 115, versionName: '12.5', action: { type: 'update',
                    url: 'https://play.google.com/store/apps/details?id=com.yamb.balkan' } });
            mailEvent();
        });
        await page.locator('[data-message-id="game:android-update:115"]').click();
        assert.equal(await page.locator('#player-mailbox-subject').innerText(), 'A new game version is available');
        assert.match(await page.locator('#player-mailbox-body').innerText(), /version 12\.5/);
        const updateAction = page.locator('#player-mailbox-action');
        assert.equal(await updateAction.innerText(), 'Open Google Play');
        assert.equal(await updateAction.getAttribute('href'), 'https://play.google.com/store/apps/details?id=com.yamb.balkan');
        await page.evaluate(() => setLanguage('sr'));
        assert.equal(await page.locator('#player-mailbox-subject').innerText(), 'Dostupna je nova verzija igre');
        assert.match(await page.locator('#player-mailbox-body').innerText(), /Verzija 12\.5/);
        assert.equal(await updateAction.innerText(), 'Otvori Google Play');
        await page.locator('#player-mailbox-back').click();
        await page.evaluate(() => {
            mailRows.unshift({ id: 'tournament-final-time-qa', type: 'tournament_event', createdAt: Date.now(),
                tournamentEvent: { tournamentNumber: 12, kind: 'final_scheduled', p1: 'Mina <b>$&</b>', p2: 'Luka', scheduledAt: Date.parse('2026-11-20T17:00:00Z') } });
            mailEvent();
        });
        for (const theme of themes) for (const language of ['sr', 'en']) {
            await page.evaluate(({ theme, language }) => {
                document.body.className = theme === 'dark' ? '' : theme + '-theme';
                document.documentElement.dataset.splashTheme = theme; playerMailbox.applyTheme(theme); setLanguage(language);
            }, { theme, language });
            const row = page.locator('[data-message-id="tournament-final-time-qa"]');
            await row.waitFor(); await row.click();
            assert.match(await page.locator('#player-mailbox-subject').innerText(), language === 'sr' ? /Finale je zakazano/ : /Final scheduled/);
            assert.match(await page.locator('#player-mailbox-body').innerText(), /Mina <b>\$&<\/b>/);
            assert.equal(await page.locator('#player-mailbox-body b').count(), 0);
            for (const icon of [page.locator('#player-mailbox-subject img'), row.locator('img')]) {
                await icon.evaluate(image => image.decode());
                assert.equal(await icon.getAttribute('src'), await page.evaluate(() => getCanonicalTournamentTrophySource()));
                assert.equal(await icon.evaluate(image => image.naturalWidth > 0), true);
            }
            await page.locator('#player-mailbox-back').click();
        }
        for (const resultType of ['regular', 'technical']) {
            await page.evaluate(resultType => {
                mailRows.unshift({ id: 'champion-result-' + resultType, type: 'tournament_champion', createdAt: Date.now(),
                    champion: { tournamentNumber: 12, playerName: 'Mina', runnerUpName: 'Luka', resultType,
                        finalScore: resultType === 'regular' ? '1450-1400' : '' } }); mailEvent();
            }, resultType);
            await page.locator('[data-message-id="champion-result-' + resultType + '"]').click();
            for (const language of ['sr', 'en']) {
                await page.evaluate(language => setLanguage(language), language);
                const body = await page.locator('#player-mailbox-body').innerText();
                assert.match(body, /Mina — Luka/);
                assert.match(body, resultType === 'regular' ? /1450-1400/ : language === 'sr' ? /Tehnički rezultat/ : /Technical result/);
                if (resultType === 'technical') assert.doesNotMatch(body, /1-0/);
            }
            await page.locator('#player-mailbox-back').click();
        }
        await page.locator('#player-mailbox-close').click();
        for (const [width, height] of sizes) for (const theme of themes) for (const language of ['sr', 'en']) {
            await page.setViewportSize({ width, height });
            await page.evaluate(({ theme, language }) => {
                document.body.className = theme === 'dark' ? '' : theme + '-theme';
                document.documentElement.dataset.splashTheme = theme;
                playerMailbox.applyTheme(theme); setLanguage(language);
                window.mailOwner = true;
                mailRows = Array.from({ length: 35 }, (_, i) => ({ id: 'layout-' + i, type: 'game_notice',
                    title: 'Obaveštenje / Notification ' + i, text: 'Duži sadržaj poruke / Longer message content. '.repeat(50), createdAt: 200000 - i }));
                mailEvent();
            }, { theme, language });
            await page.locator('#player-mailbox-button').click();
            await page.locator('[data-message-id="layout-0"]').waitFor();
            for (const state of ['inbox', 'detail', 'report', 'publish', 'support', 'empty']) {
                if (state === 'detail') await page.locator('[data-message-id="layout-0"]').click();
                if (['report', 'publish', 'support', 'empty'].includes(state)) {
                    await page.locator('#player-mailbox-back').click();
                    if (state === 'empty') {
                        await page.evaluate(() => { mailRows = []; mailEvent(); });
                        await page.waitForFunction(() => !document.querySelector('#player-mailbox-list button'));
                    } else {
                        await page.locator('#player-mailbox-' + ({ report: 'report', publish: 'compose', support: 'support' }[state])).click();
                        if (state === 'support') await page.waitForFunction(() => document.querySelector('#player-mailbox-support-status').textContent === t('mailbox_support_empty'));
                    }
                }
                const layout = await page.evaluate(() => {
                    const panel = document.querySelector('#player-mailbox'), header = panel.querySelector('header');
                    const content = panel.querySelector('.player-mailbox-content'), box = panel.getBoundingClientRect();
                    const heading = panel.querySelector('h2'), close = panel.querySelector('#player-mailbox-close');
                    const headerY = header.getBoundingClientRect().y;
                    content.scrollTop = content.scrollHeight;
                    const fixedHeader = Math.abs(header.getBoundingClientRect().y - headerY) < .1;
                    const scrollable = content.scrollHeight > content.clientHeight + 1;
                    const innerScroll = !scrollable || content.scrollTop > 0;
                    const clipped = [...content.querySelectorAll('*')].filter(e => {
                        const r = e.getBoundingClientRect(), s = getComputedStyle(e);
                        return r.width && r.height && s.visibility !== 'hidden' && (r.left < box.left - .5 || r.right > box.right + .5);
                    }).map(e => e.id || e.tagName);
                    content.scrollTop = 0;
                    const references = [['highscores-screen', '.hs-card'], ['stats-screen', '.stats-shell'], ['settings-screen', '.settings-shell']].map(([id, selector]) => {
                        const screen = document.getElementById(id); screen.classList.add('active');
                        const width = screen.querySelector(selector).getBoundingClientRect().width; screen.classList.remove('active'); return width;
                    });
                    return { box: { x: box.x, y: box.y, width: box.width, height: box.height }, references, fixedHeader, innerScroll, scrollable, clipped,
                        panelScroll: panel.scrollHeight > panel.clientHeight + 1, horizontal: content.scrollWidth > content.clientWidth + 1,
                        headerHeight: header.getBoundingClientRect().height, title: heading.textContent, titleCase: getComputedStyle(heading).textTransform,
                        icon: header.querySelector('img').getBoundingClientRect().width, close: close.getBoundingClientRect().width };
                });
                const context = `${theme}/${language}/${width}x${height}/${state}`;
                assert.ok(layout.box.x >= 10 && layout.box.x + layout.box.width <= width - 10 + .5 && layout.box.y >= 24 && layout.box.y + layout.box.height <= height - 56 + .5, context + ' safe areas');
                assert.ok(Math.abs(layout.box.height - (height - 80)) < .5, context + ' full room height');
                if (width < 760) assert.ok(layout.references.every(w => Math.abs(w - layout.box.width) < 1.1), context + ' reference widths ' + layout.references);
                assert.ok(layout.fixedHeader && layout.innerScroll && !layout.panelScroll && !layout.horizontal && !layout.clipped.length, context + ' overflow ' + JSON.stringify(layout));
                assert.equal(layout.title, language === 'sr' ? 'Pošta' : 'Inbox'); assert.equal(layout.titleCase, 'uppercase');
                assert.equal(layout.icon, 32); assert.equal(layout.close, 44); assert.equal(layout.headerHeight, 69);
                if (state === 'inbox') assert.ok(layout.scrollable, context + ' long message list scrolls internally');
                layoutRows.push({ theme, language, viewport: { width, height }, state, ...layout });
                if (state === 'inbox' && language === 'sr' && ['dark', 'neon', 'easter'].includes(theme) && [320, 390].includes(width)) {
                    fs.mkdirSync(output, { recursive: true }); await page.screenshot({ path: path.join(output, `room-${theme}-${width}x${height}.png`) });
                }
            }
            await page.locator('#player-mailbox-close').click();
        }
        fs.mkdirSync(output, { recursive: true });
        fs.writeFileSync(path.join(output, 'layout-report.json'), JSON.stringify({ scope: 'Local actual client/CSS with synthetic messages and blocked external requests; safe-top24/safe-bottom48; no live accounts, messages or ads.', rows: layoutRows }, null, 2) + '\n');
        console.log(`Player Mailbox: ${layoutRows.length} room layouts across 10 themes, both languages, 5 phones and a tablet; reference widths, fixed header, safe areas and inner scrolling passed.`);
        console.log('Player Mailbox: inner scrolling, 137 paged messages, archive/restore/delete, stale folder responses, unread state, shared intros and deliberate exit ad calls passed.');
    } finally {
        await browser.close();
    }
})().catch(error => { console.error(error); process.exitCode = 1; });
