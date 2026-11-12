// Real production renderers and CSS with synthetic state. All external requests are blocked.
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { chromium } = require(process.env.YAMB_PLAYWRIGHT_PATH || 'playwright');
const core = require('../www/tournamentReadinessCore');

const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const index = read('www/index.html');
const sheets = [...index.matchAll(/<link rel="stylesheet" href="([^"]+)"/g)].map(match => match[1]);
const roomStart = index.indexOf('<div id="tournament-screen"');
const room = index.slice(roomStart, index.indexOf('\n    <script>', roomStart)).replace('class="screen"', 'class="screen active"');
const modal = index.slice(index.indexOf('<div id="custom-modal-overlay"'), index.indexOf('<div id="chat-float-btn"'));
const fixture = '<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1">'
    + sheets.map(file => '<link rel="stylesheet" href="' + file + '">').join('')
    + '<style>:root{--safe-top:24px;--safe-bottom:24px;--safe-left:0px;--safe-right:0px}*{animation:none!important;transition:none!important;scroll-behavior:auto!important}</style>'
    + '<body>' + room + modal + '</body>';
const themes = ['dark', 'light', 'medium', 'winter', 'neon', 'amethyst', 'easter', 'desert', 'moon', 'severna'];
const viewports = [{ width: 320, height: 568 }, { width: 360, height: 780 }, { width: 412, height: 915 }];
const reliabilityOnly = process.env.TOURNAMENT_RELIABILITY_UI === '1';
const states = reliabilityOnly ? ['suspended', 'warning', 'rules', 'suspension-notice'] : ['registration', 'pending', 'confirmed', 'replacement', 'rules', 'notice'];
const rows = [];
const output = process.env.TOURNAMENT_READINESS_SCREENSHOTS;
const schedulingOnly = process.env.TOURNAMENT_SCHEDULING_UI === '1';
const noticesOnly = process.env.TOURNAMENT_NOTICES_UI === '1';

async function checkNotices(page, theme, viewport) {
    for (const language of ['sr', 'en']) {
        await page.evaluate(language => {
            app.modal.close();
            localStorage.setItem('yamb_lang', language);
            const manager = app.tournamentManager;
            const clock = window.tournamentSchedulingCore;
            const core = window.tournamentNotificationsCore;
            const at = Date.parse('2026-11-11T10:00:00+01:00');
            const players = Array.from({ length: 8 }, (_, i) => ({ id: 'fixture-' + i, name: 'Player ' + i }));
            const match = { p1: players[0], p2: players[1] };
            clock.open(match, 'qf', at, 'schedule-fixture-id');
            clock.apply(match, 'propose', { scheduleId: match.scheduling.id, revision: 0,
                uid: players[1].id, proposedTime: '2026-11-12T14:00' }, at, () => 'proposal-fixture-id');
            manager.state = { status: 'active', tournamentNumber: 11, registrationCycleId: 'cycle-fixture-id',
                schedulingPolicyVersion: clock.VERSION, notificationPolicyVersion: core.VERSION, players,
                bracket: { qf: [match, null, null, null], sf: [null, null], f: [null] } };
            manager.readinessTimeBase = { server: at, local: performance.now() };
            const row = core.collect(manager.state, at).find(row => row.uid === app.playerId);
            const notice = { ...row, recipientUid: row.uid, noticeId: 'tm:fixture-' + language };
            manager.maybeShowReadinessNotice(notice);
            manager.maybeShowReadinessNotice(notice);
        }, language);
        const label = [theme, language, viewport.width].join('/');
        const view = await page.evaluate(() => {
            const overlay = document.getElementById('custom-modal-overlay');
            const rect = overlay.querySelector('.custom-modal').getBoundingClientRect();
            const msg = document.getElementById('cm-msg');
            const buttons = overlay.querySelector('.cm-btn-group');
            return { title: document.getElementById('cm-title').textContent, body: msg.textContent,
                shown: overlay.style.display === 'flex', tournament: overlay.classList.contains('modal-context-tournament'),
                safe: rect.top >= 24 && rect.bottom <= innerHeight - 23 && rect.left >= 0 && rect.right <= innerWidth + 1,
                layout: msg.scrollWidth <= msg.clientWidth + 1 && msg.getBoundingClientRect().bottom <= buttons.getBoundingClientRect().top + 1,
                targets: [...buttons.querySelectorAll('.cm-btn:not(.hidden)')].every(btn => btn.getBoundingClientRect().height >= 44) };
        });
        assert(view.shown && view.tournament && view.safe && view.layout && view.targets, label + ': ' + JSON.stringify(view));
        assert.equal(view.title, language === 'en' ? 'Quarterfinal: New match time proposed' : 'Četvrtfinale: Novi predlog termina');
        assert(view.body.includes(language === 'en' ? 'Belgrade time' : 'Beograd'));
        if (output && viewport.width === 360 && language === 'sr') await page.screenshot({ path: path.join(output, theme + '-match-notice.png') });
        await page.locator('#cm-cancel').click();
        const ack = await page.evaluate(language => fixtureEvents.filter(event => event[0] === 'tourney_notice_read'
            && event[1].noticeId === 'tm:fixture-' + language).length, language);
        assert.equal(ack, 1, label + ': duplicate does not create a second acknowledgement');
        rows.push(label);
    }
}

async function checkScheduling(page, theme, viewport) {
    for (const language of ['sr', 'en']) {
        for (const kind of ['new', 'rescheduling', 'expired-response', 'expired-match', 'server-replay', 'checkin']) {
            await page.evaluate(({ language, kind }) => {
                app.modal.close();
                localStorage.setItem('yamb_lang', language);
                const manager = app.tournamentManager;
                const core = window.tournamentSchedulingCore;
                const at = Date.parse('2026-11-11T09:00:00+01:00');
                const players = Array.from({ length: 8 }, (_, index) => ({ id: 'fixture-' + index,
                    name: index < 2 ? 'Takmičar sa veoma dugim imenom i prezimenom ' + (index + 1) : 'Takmičar ' + (index + 1) }));
                const match = { p1: players[0], p2: players[1] };
                core.open(match, 'qf', at, 'schedule-fixture-id');
                const apply = (command, uid, extra = {}) => {
                    const { id, revision, pending } = match.scheduling;
                    if (!core.apply(match, command, { uid, scheduleId: id, revision, proposalId: pending?.id, ...extra }, at,
                        () => 'proposal-fixture-' + revision).ok) throw new Error('invalid scheduling fixture');
                };
                if (kind === 'server-replay') {
                    core.open(match, 'qf', at, 'recovery-fixture-id');
                    Object.assign(match, { rematchRequired: true, replayReason: 'server_interruption', lastDrawScoreLabel: '900-900' });
                } else if (kind !== 'new') {
                    apply('propose', players[0].id, { proposedTime: '2026-11-12T12:00' });
                    apply('accept', players[1].id);
                    if (kind !== 'checkin') apply('propose', players[1].id, { proposedTime: '2026-11-12T14:00' });
                }
                const server = kind === 'checkin' ? match.scheduling.accepted.at : kind === 'expired-match' ? match.scheduling.deadlineAt :
                    kind === 'expired-response' ? match.scheduling.pending.replyDueAt : at;
                manager.readinessTimeBase = { server, local: performance.now() };
                manager.state = { status: 'active', tournamentNumber: 11, readinessPolicyVersion: window.tournamentReadinessCore.VERSION,
                    schedulingPolicyVersion: core.VERSION, registrationCycleId: 'cycle-fixture-id', players,
                    ...(kind === 'checkin' ? { adjudicationPolicyVersion: window.tournamentAdjudicationCore.VERSION } : {}),
                    bracket: { qf: [match, null, null, null], sf: [null, null], f: [null] } };
                manager.openMatchModal('qf', 0);
            }, { language, kind });
            const result = await page.evaluate(() => {
                const overlay = document.getElementById('custom-modal-overlay');
                const shell = overlay.querySelector('.custom-modal').getBoundingClientRect();
                const msg = document.getElementById('cm-msg');
                const buttons = [...overlay.querySelectorAll('.tourney-scheduling button, .cm-btn:not(.hidden)')];
                const body = overlay.querySelector('.tourney-scheduling');
                const sample = document.createElement('i');
                sample.style.color = document.documentElement.dataset.splashTheme !== 'dark' ? 'var(--theme-card-ink)' : 'var(--green-clay-ink-strong)';
                overlay.append(sample);
                const expectedInk = getComputedStyle(sample).color;
                sample.remove();
                return { safe: shell.top >= 24 && shell.bottom <= innerHeight - 23 && shell.left >= 0 && shell.right <= innerWidth + 1,
                    overlap: msg.getBoundingClientRect().bottom > overlay.querySelector('.cm-btn-group').getBoundingClientRect().top + 1,
                    overflow: [body, msg, ...body.querySelectorAll('section, input, button')].some(node => node.scrollWidth > node.clientWidth + 1),
                    targets: buttons.every(button => button.getBoundingClientRect().height >= 44),
                    translated: !/tourney_[a-z_]+/.test(body.innerText), ink: getComputedStyle(body).color, expectedInk,
                    actions: body.querySelectorAll('button').length,
                    appointments: body.querySelectorAll('.tourney-scheduling-block').length,
                    text: body.innerText,
                    hasDeadline: Boolean(body.querySelector('.tourney-scheduling-deadline')) };
            });
            const label = [theme, language, viewport.width, kind].join('/');
            assert(result.safe && !result.overlap && !result.overflow, label + ': safe-area/overflow ' + JSON.stringify(result));
            assert(result.targets && result.translated && result.hasDeadline, label + ': controls/translations');
            assert.equal(result.ink, result.expectedInk, label + ': theme ink');
            assert.equal(result.actions, { new: 1, rescheduling: 3, 'expired-response': 2, 'expired-match': 0, 'server-replay': 1, checkin: 3 }[kind], label + ': actions');
            if (kind === 'server-replay') {
                assert(result.text.includes(language === 'en' ? 'SERVER INTERRUPTION' : 'PREKID NA SERVERU'), label + ': neutral replay reason');
                assert(!result.text.includes('900-900'), label + ': previous draw is not presented as cause');
            }
            if (kind === 'checkin') {
                await page.evaluate(() => {
                    app.socket.emit = (event, data, ack) => { fixtureEvents.push([event, data]); ack?.({ ok: true }); };
                });
                await page.locator('.tourney-scheduling button').filter({ hasText: language === 'en' ? 'Check in' : 'Evidentiraj' }).click();
                const checkin = await page.evaluate(() => fixtureEvents.find(event => event[0] === 'tourney_attendance'));
                assert.equal(checkin[1].begin, true);
                assert.equal(checkin[1].acceptedId, 'proposal-fixture-0');
                assert((await page.locator('#tourney-attendance-status').innerText()).includes('15'));
                await page.evaluate(() => {
                    clearInterval(app.tournamentManager.tournamentAttendanceTimer);
                    app.tournamentManager.tournamentAttendance = null;
                });
            }
            if (kind === 'rescheduling') {
                assert.equal(result.appointments, 3, label + ': agreed time, replacement proposal and new proposal form');
                if (output && viewport.width === 360 && language === 'sr') await page.screenshot({ path: path.join(output, theme + '-rescheduling.png') });
                if (theme === 'dark' && viewport.width === 320 && language === 'en') {
                    await page.locator('.tourney-scheduling button').filter({ hasText: 'ACCEPT' }).click();
                    const accepted = await page.evaluate(() => fixtureEvents.find(event => event[0] === 'tourney_accept_time'));
                    assert.equal(accepted[1].proposalId, 'proposal-fixture-2');
                    assert.equal(accepted[1].revision, 3);
                    assert.equal(accepted[1].acceptedId, 'proposal-fixture-0');
                    await page.evaluate(() => { app.tournamentManager.pendingSchedulingAction = null; });
                }
            }
            if (kind === 'new' && theme === 'dark' && viewport.width === 320 && language === 'en') {
                await page.locator('#tourney-time-input').fill('2026-11-12T12:00');
                await page.locator('.tourney-scheduling button').click();
                const sent = await page.evaluate(() => fixtureEvents.find(event => event[0] === 'tourney_propose_time'));
                assert.equal(sent[1].proposedTime, '2026-11-12T11:00:00.000Z');
                assert.equal(sent[1].scheduleId, 'schedule-fixture-id');
                await page.evaluate(() => { app.tournamentManager.pendingSchedulingAction = null; });
            }
            rows.push(label);
        }
    }
}

async function main() {
    if (output) fs.mkdirSync(output, { recursive: true });
    const browser = await chromium.launch({ headless: true,
        ...(process.env.YAMB_CHROMIUM ? { executablePath: process.env.YAMB_CHROMIUM } : {}) });
    try {
        const context = await browser.newContext();
        await context.route('**/*', async route => {
            const url = new URL(route.request().url());
            if (url.hostname !== 'readiness-fixture.local') return route.abort();
            if (url.pathname === '/www/fixture.html') return route.fulfill({ contentType: 'text/html', body: fixture });
            const file = path.resolve(root, '.' + decodeURIComponent(url.pathname));
            if (!file.startsWith(path.join(root, 'www') + path.sep) || !fs.existsSync(file)) return route.abort();
            const contentType = ({ '.css': 'text/css', '.js': 'text/javascript', '.png': 'image/png', '.woff2': 'font/woff2' })[path.extname(file)];
            return route.fulfill({ contentType: contentType || 'application/octet-stream', body: fs.readFileSync(file) });
        });
        const page = await context.newPage();
        for (const viewport of viewports) {
            await page.setViewportSize(viewport);
            for (const theme of themes) {
                await page.goto('http://readiness-fixture.local/www/fixture.html');
                await page.evaluate(themeId => {
                    document.body.className = themeId === 'dark' ? '' : themeId + '-theme';
                    document.documentElement.dataset.splashTheme = themeId;
                    localStorage.clear();
                    localStorage.setItem('yamb_theme', themeId);
                    localStorage.setItem('yamb_dukati', '100000');
                    window._safeT = key => t(key);
                }, theme);
                await page.addScriptTag({ content: read('www/theme-quality-assets.js') });
                const config = read('www/config.js');
                await page.addScriptTag({ content: config.slice(config.indexOf('function getThemeMedalSource'), config.indexOf('// Export')) });
                const languages = read('www/languages.js');
                await page.addScriptTag({ content: languages.slice(0, languages.indexOf('function setLanguage(')) });
                await page.addScriptTag({ content: languages.slice(languages.indexOf('function applyTranslations()'), languages.indexOf("document.addEventListener('DOMContentLoaded'")) });
                const managers = read('www/managers.js');
                await page.addScriptTag({ content: managers.slice(managers.indexOf('class ModalManager {'), managers.indexOf('// --- 4. EFFECT MANAGER')) });
                await page.addScriptTag({ content: read('www/tournamentReadinessCore.js') });
                await page.addScriptTag({ content: read('www/tournamentSchedulingCore.js') });
                await page.addScriptTag({ content: read('www/tournamentNotificationsCore.js') });
                await page.addScriptTag({ content: read('www/tournamentAdjudicationCore.js') });
                await page.addScriptTag({ content: read('www/tournamentReliabilityCore.js') });
                await page.addScriptTag({ content: read('www/turnir.js') });
                await page.addScriptTag({ content: read('www/theme-main-room-icons.js') });
                await page.addScriptTag({ content: read('www/theme-ducat-pack.js') });
                const game = read('www/game.js');
                const hydration = ['getThemeAssetRoot', 'hydrateThemeImageElement', 'installThemeImageHydrationObserver'].map(name => {
                    const start = game.indexOf('\n    ' + name + '(');
                    assert(start >= 0, name);
                    return game.slice(start, game.indexOf('\n    }', start) + 6);
                });
                await page.addScriptTag({ content: 'window.fixtureThemeHydration = {' + hydration.join(',') + '};' });
                await page.evaluate(() => {
                    window.fixtureEvents = [];
                    const manager = Object.create(TournamentManager.prototype);
                    window.app = { playerId: 'fixture-0', playerName: 'Test Player',
                        soundMgr: { click() {}, error() {} }, modal: new ModalManager(),
                        socket: { connected: true, emit: (...args) => fixtureEvents.push(args) },
                        tournamentManager: manager };
                    manager.app = app;
                    Object.assign(app, window.fixtureThemeHydration);
                    app.installThemeImageHydrationObserver();
                    manager.readinessNotices = [];
                    manager.tourneyLeaderboard = [];
                    manager.tourneyLeaderboardLoaded = true;
                    manager.calculateMyPI = () => '1000';
                    manager.readinessTimeBase = { server: Date.parse('2026-11-11T09:00:00+01:00'), local: performance.now() };
                });
                if (schedulingOnly) {
                    await checkScheduling(page, theme, viewport);
                    continue;
                }
                if (noticesOnly) {
                    await checkNotices(page, theme, viewport);
                    continue;
                }
                for (const language of ['sr', 'en']) {
                    for (const state of states) {
                        await page.evaluate(({ languageId, kind, version, reliabilityMode }) => {
                            app.modal.close();
                            localStorage.setItem('yamb_lang', languageId);
                            const manager = app.tournamentManager;
                            manager.pendingReadiness = false;
                            manager.pendingRegistration = false;
                            manager.pendingUnregister = false;
                            manager.readinessPromptOpen = false;
                            manager.readinessNotices = [];
                            const at = manager.readinessTimeBase.server;
                            const registration = kind === 'registration' || reliabilityMode;
                            const players = Array.from({ length: registration ? 3 : kind === 'replacement' ? 7 : 8 }, (_, i) => ({
                                id: 'fixture-' + (reliabilityMode ? i + 1 : i), name: i === 0 ? 'Takmičar sa veoma dugim imenom i prezimenom' : 'Takmičar ' + (i + 1),
                                entryId: 'entry-' + i, readyRequestedAt: at, readyDeadlineAt: at + 21600000,
                                readyConfirmedAt: (kind === 'confirmed' || kind === 'replacement' || i > 0) ? at : null
                            }));
                            manager.state = { status: registration ? 'registration' : 'confirmation',
                                tournamentNumber: 11, readinessPolicyVersion: version,
                                registrationCycleId: 'fixture-registration-cycle', players,
                                readiness: registration ? null : { startedAt: at, expiresAt: at + 86400000 },
                                ...(reliabilityMode ? { reliabilityPolicyVersion: window.tournamentReliabilityCore.VERSION } : {}),
                                bracket: { qf: [null, null, null, null], sf: [null, null], f: [null] } };
                            manager.tournamentReliabilityStatus = reliabilityMode ? {
                                cycleId: manager.state.registrationCycleId, recipientUid: app.playerId,
                                blocked: kind === 'suspended', blockedEdition: kind === 'suspended' ? 11 : null,
                                warningEdition: kind === 'warning' ? 10 : null
                            } : null;
                            manager.activeTab = 'info';
                            manager.render();
                            if (kind === 'rules') manager.confirmTournamentParticipationRules(5500);
                            if (kind === 'notice') manager.maybeShowReadinessNotice();
                            if (kind === 'suspension-notice') manager.maybeShowReadinessNotice({ noticeId: 'tr:fixture-' + languageId,
                                kind: 'reliability_suspension', recipientUid: app.playerId, blockedEdition: 11 });
                        }, { languageId: language, kind: state, version: core.VERSION, reliabilityMode: reliabilityOnly });
                        await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
                        await page.evaluate(() => Promise.all([...document.images].filter(image => {
                            const r = image.getBoundingClientRect();
                            return r.width && r.height && r.top < innerHeight && r.bottom > 0;
                        }).map(image => Promise.race([image.decode().catch(() => {}), new Promise(resolve => setTimeout(resolve, 3000))]))));
                        const result = await page.evaluate(kind => {
                            const inModal = ['rules', 'notice', 'suspension-notice'].includes(kind);
                            const scope = document.getElementById(inModal ? 'custom-modal-overlay' : 'tournament-screen');
                            const shell = scope.querySelector(inModal ? '.custom-modal' : '.tourney-shell');
                            const r = shell.getBoundingClientRect();
                            const overflow = [...scope.querySelectorAll('.tourney-readiness,.tourney-readiness-heading,.tourney-readiness-roster li,.tourney-readiness-actions button,.cm-btn')]
                                .filter(element => element.scrollWidth > element.clientWidth + 1).map(element => element.className);
                            const missing = [...scope.querySelectorAll('img')].filter(image => {
                                const rect = image.getBoundingClientRect();
                                return rect.width && rect.height && rect.top < innerHeight && rect.bottom > 0 && (!image.complete || !image.naturalWidth);
                            }).map(image => image.getAttribute('src') || image.dataset.themeSrc);
                            const placeholderKeys = /tourney_readiness_[a-z_]+/.test(scope.innerText);
                            const buttons = [...scope.querySelectorAll(inModal ? '.cm-btn:not(.hidden)' : '.tourney-readiness-actions button')];
                            const badTargets = buttons.filter(button => button.getBoundingClientRect().height < 44).map(button => button.className);
                            const overlap = inModal && document.getElementById('cm-msg').getBoundingClientRect().bottom
                                > scope.querySelector('.cm-btn-group').getBoundingClientRect().top + 1;
                            const ink = scope.querySelector('.tourney-readiness-summary');
                            const trophy = scope.querySelector('.tourney-readiness-trophy')?.getBoundingClientRect();
                            const heading = scope.querySelector('.tourney-readiness-heading h3')?.getBoundingClientRect();
                            const sample = document.createElement('i');
                            sample.style.color = document.documentElement.dataset.splashTheme !== 'dark' ? 'var(--theme-card-ink)' : 'var(--green-clay-ink-strong)';
                            scope.append(sample);
                            const expectedInk = getComputedStyle(sample).color;
                            sample.remove();
                            return { overflow, missing, placeholderKeys, badTargets, overlap,
                                headerOverlap: Boolean(trophy && heading && trophy.right > heading.left + 1),
                                safe: r.left >= 0 && r.right <= innerWidth + 1 && r.top >= 24 && r.bottom <= innerHeight - 24 + 1,
                                modalShown: !inModal || scope.style.display === 'flex',
                                ink: ink ? getComputedStyle(ink).color : null, expectedInk,
                                font: ink ? getComputedStyle(ink).fontFamily : null };
                        }, state);
                        const label = [theme, language, viewport.width, state].join('/');
                        assert(result.safe, label + ': safe-area bounds');
                        assert(result.modalShown, label + ': modal shown');
                        assert.deepEqual(result.overflow, [], label + ': horizontal overflow');
                        assert.deepEqual(result.missing, [], label + ': images loaded');
                        assert.deepEqual(result.badTargets, [], label + ': touch targets');
                        assert(!result.placeholderKeys, label + ': translations');
                        assert(!result.overlap, label + ': modal content/button overlap');
                        assert(!result.headerOverlap, label + ': trophy/title overlap');
                        if (result.ink) assert.equal(result.ink, result.expectedInk, label + ': theme ink');
                        if (reliabilityOnly && state === 'suspended') {
                            assert(await page.locator('.tourney-readiness-confirm').isDisabled(), label + ': suspended enrollment is disabled');
                            assert((await page.locator('.tourney-readiness [role=status]').innerText()).includes(language === 'en' ? 'No entry fee' : 'Kotizacija nije'));
                        }
                        if (reliabilityOnly && ['rules', 'suspension-notice'].includes(state)) {
                            const message = await page.locator('#cm-msg').innerText();
                            assert(message.includes(state === 'rules' ? (language === 'en' ? 'three official appearances' : 'tri zvanična nastupa') : '11'));
                            await page.locator(state === 'rules' ? '#cm-cancel' : '#cm-ok').click();
                        }
                        if (output && viewport.width === 360 && language === 'sr' && ['pending', 'notice'].includes(state)) {
                            await page.screenshot({ path: path.join(output, theme + '-' + state + '.png') });
                        }
                        rows.push(label);
                    }
                }
            }
        }
        if (noticesOnly) {
            console.log('PASS: ' + rows.length + ' participant notification dialog checks across themes, languages and viewports; real dismiss and duplicate checks.');
            return;
        }
        if (reliabilityOnly) {
            await page.evaluate(() => { app.tournamentManager.registerPlayer(); });
            await page.locator('#cm-ok').click();
            const enrollment = await page.evaluate(() => fixtureEvents.find(event => event[0] === 'tourney_register')?.[1]);
            assert.equal(enrollment?.clientProtocol, 'yamb-tournament-6');
            assert.equal(enrollment.reliabilityRulesAccepted, true);
            console.log('PASS: ' + rows.length + ' reliability checks across ten themes, both languages and mobile sizes; real consent and protocol submission.');
            return;
        }
        if (schedulingOnly) {
            console.log('PASS: ' + rows.length + ' scheduling dialog checks across themes, languages, viewports and match states; real proposal/accept clicks.');
            return;
        }
        // Exercise the actual dialog callbacks; cancel means later, never withdrawal.
        await page.evaluate(() => {
            app.modal.close();
            localStorage.clear();
            localStorage.setItem('yamb_lang', 'en');
            app.tournamentManager.readinessNotices = [];
            app.tournamentManager.readinessPromptOpen = false;
            app.tournamentManager.maybeShowReadinessNotice();
        });
        await page.evaluate(() => applyTranslations());
        assert.equal(await page.locator('#cm-ok').innerText(), 'CONFIRM PARTICIPATION',
            'cloud translation refresh cannot turn explicit participation consent into generic OK');
        assert.equal(await page.locator('#cm-cancel').innerText(), 'LATER');
        await page.locator('#cm-cancel').click();
        const afterCancel = await page.evaluate(() => fixtureEvents);
        assert(!afterCancel.some(event => event[0] === 'tourney_readiness_confirm' || event[0] === 'tourney_unregister'));
        await page.evaluate(() => {
            localStorage.clear();
            app.tournamentManager.maybeShowReadinessNotice();
        });
        await page.locator('#cm-ok').click();
        const afterConfirm = await page.evaluate(() => fixtureEvents);
        assert.equal(afterConfirm.filter(event => event[0] === 'tourney_readiness_confirm').length, 1);
        await page.evaluate(() => app.tournamentManager.confirmReadiness());
        const afterDuplicate = await page.evaluate(() => fixtureEvents);
        assert.equal(afterDuplicate.filter(event => event[0] === 'tourney_readiness_confirm').length, 1, 'double-click is guarded');
        await page.evaluate(() => {
            app.modal.close();
            app.tournamentManager.readinessPromptOpen = false;
            app.tournamentManager.maybeShowReadinessNotice({ noticeId: 'foreign-notice',
                kind: 'readiness_expired', recipientUid: 'another-account' });
        });
        assert.equal(await page.locator('#custom-modal-overlay').evaluate(element => element.style.display), 'none',
            'late notices from a previous account never open for the current account');

        await page.evaluate(() => {
            fixtureEvents.length = 0;
            const manager = app.tournamentManager;
            manager.pendingRegistration = false;
            manager.pendingReadiness = false;
            manager.registrationRulesPromptOpen = false;
            manager.state.status = 'registration';
            manager.state.readiness = null;
            manager.state.players = [];
            app.playerId = 'fixture-9';
            localStorage.setItem('yamb_dukati', '100000');
            manager.registerPlayer();
        });
        await page.locator('#cm-cancel').click();
        assert.equal(await page.evaluate(() => fixtureEvents.filter(event => event[0] === 'tourney_register').length), 0,
            'declining rules never sends a registration request');
        await page.evaluate(() => { app.tournamentManager.registerPlayer(); });
        await page.locator('#cm-ok').click();
        const registration = await page.evaluate(() => fixtureEvents.find(event => event[0] === 'tourney_register'));
        assert.equal(registration[1].readinessPolicyAccepted, true);
        assert.equal(registration[1].readinessPolicyVersion, core.VERSION);
        assert(registration[1].entryRequestId, 'registration has persistent idempotency token');
        console.log('PASS: ' + rows.length + ' real-renderer theme/language/viewport/state checks, modal callbacks and double-click guard; all external network blocked.');
    } finally { await browser.close(); }
}

main().catch(error => { console.error(error); process.exitCode = 1; });
