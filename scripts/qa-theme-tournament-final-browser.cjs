// Optional mobile layout and active-asset audit. Set NODE_PATH to a Playwright installation.
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { chromium } = require('playwright');

const edge = process.env.TOURNAMENT_QA_BROWSER || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const entry = pathToFileURL(path.resolve(__dirname, '../www/index.html')).href;
const allThemes = ['dark', 'light', 'medium', 'winter', 'neon', 'amethyst', 'easter', 'desert', 'moon', 'severna'];
const themes = process.env.TOURNAMENT_QA_THEMES
    ? ['dark', ...process.env.TOURNAMENT_QA_THEMES.split(',').filter(theme => theme !== 'dark' && allThemes.includes(theme))]
    : allThemes;
const viewports = [{ width: 320, height: 640 }, { width: 360, height: 780 }, { width: 412, height: 915 }]
    .filter(item => !process.env.TOURNAMENT_QA_WIDTH || item.width === Number(process.env.TOURNAMENT_QA_WIDTH));
const states = ['registration', 'bracket', 'semifinal', 'final', 'hall', 'duel', 'winner',
    'ceremony-win', 'ceremony-finalist', 'prize-win', 'prize-finalist'];

(async () => {
    const browser = await chromium.launch({ headless: true, executablePath: edge, args: ['--no-sandbox'] });
    const failures = [];
    const rows = [];
    const greenGeometry = new Map();
    try {
        for (const viewport of viewports) {
            const page = await browser.newPage({ viewport, screen: viewport, isMobile: true, hasTouch: true, deviceScaleFactor: 1 });
            await page.goto(entry, { waitUntil: 'domcontentloaded', timeout: 30000 });
            await page.waitForFunction(() => window.app?.tournamentManager, { timeout: 15000 });
            await page.addStyleTag({ content: '* { animation: none !important; transition: none !important; }' });
            for (const theme of themes) {
                await page.evaluate(async id => {
                    localStorage.setItem('yamb_theme', id);
                    await app.applyTheme(id, { initialLoad: true });
                    app.navigateTo('tournament-screen');
                }, theme);
                for (const state of states) {
                    await page.evaluate(kind => {
                        const tm = app.tournamentManager;
                        const players = Array.from({ length: 8 }, (_, i) => ({ id: `qa-${i}`, name: `Takmičar ${i + 1}`, powerIndex: 1000 + i }));
                        const bracket = {
                            qf: Array.from({ length: 4 }, (_, i) => ({ p1: players[i * 2], p2: players[i * 2 + 1] })),
                            sf: [], f: []
                        };
                        if (kind === 'final' || kind === 'hall' || kind === 'winner') {
                            bracket.f = [{ p1: players[0], p2: players[1], winnerId: players[0].id, scoreLabel: '950:870' }];
                        }
                        tm.state = { status: kind === 'registration' ? 'registration' : ['final', 'hall', 'winner'].includes(kind) ? 'finished' : 'active',
                            tournamentNumber: 1, players: kind === 'registration' ? [] : players, bracket, resetAt: null };
                        tm.activeTab = kind === 'registration' ? 'info' : kind === 'hall' ? 'leaderboard' : 'bracket';
                        if (kind === 'hall') {
                            tm.tourneyLeaderboardLoaded = true;
                            tm.tourneyLeaderboard = [{ playerName: players[0].name, championships: [{ tournamentNumber: 1,
                                winnerId: players[0].id, winnerName: players[0].name, runnerUpName: players[1].name,
                                scoreLabel: '950:870', bracket }] }];
                        }
                        tm.render();
                        if (kind === 'semifinal' || kind === 'final' || kind === 'winner') {
                            const carousel = document.getElementById('tourney-carousel');
                            carousel.scrollLeft = carousel.clientWidth * (kind === 'semifinal' ? 1 : 2);
                        }
                        if (kind === 'duel') tm.openMatchModal('qf', 0);
                        if (kind === 'winner') tm.openMatchModal('f', 0);
                        if (kind === 'prize-win' || kind === 'prize-finalist') {
                            const winner = kind === 'prize-win';
                            const asset = winner
                                ? 'assets/green-soft-clay/canonical/tournament-awards/champion-trophy-v1.png?v=1'
                                : getThemeMedalSource('tournament', 'silver', localStorage.getItem('yamb_theme') || 'dark');
                            const image = winner
                                ? `<img class="tourney-prize-result-icon-green" data-theme-src="${asset}" src="${asset}" alt="">`
                                : `<img class="tourney-prize-result-icon-canonical" src="${asset}" alt="">`;
                            app.modal.alert(`${image} +${winner ? '44.000' : '5.500'}`, winner ? 'ŠAMPION TURNIRA' : 'FINALISTA',
                                { contextClass: winner ? 'tourney-winner' : 'tourney-finalist' });
                        }
                        if (kind === 'ceremony-win' || kind === 'ceremony-finalist') {
                            app.showTournamentFinalCeremony({ role: kind === 'ceremony-win' ? 'winner' : 'runnerup',
                                reward: kind === 'ceremony-win' ? 44000 : 5500, myScore: 950 });
                        }
                    }, state);
                    await page.waitForTimeout(100);
                    if (state.startsWith('ceremony-')) {
                        await page.waitForFunction(() => [...document.querySelectorAll('#tournament-final-ceremony img')]
                            .every(img => img.complete && img.naturalWidth > 0), null, { timeout: 5000 });
                    }
                    if (state.startsWith('prize-')) {
                        await page.waitForFunction(() => [...document.querySelectorAll('#custom-modal-overlay img')]
                            .every(img => img.complete && img.naturalWidth > 0), null, { timeout: 5000 });
                    }
                    const result = await page.evaluate(kind => {
                        const screen = document.getElementById('tournament-screen');
                        const modal = document.getElementById('custom-modal-overlay');
                        const ceremony = document.getElementById('tournament-final-ceremony');
                        const inModal = ['duel', 'winner', 'prize-win', 'prize-finalist'].includes(kind);
                        const shell = screen.querySelector('.tourney-shell');
                        const tab = screen.querySelector('.tourney-tab-btn');
                        const content = screen.querySelector('#tourney-tab-content');
                        const selected = (selector) => screen.querySelector(selector);
                        const box = el => { if (!el) return null; const rect = el.getBoundingClientRect();
                            const css = getComputedStyle(el); return { width: +rect.width.toFixed(1), height: +rect.height.toFixed(1),
                                font: css.fontSize, family: css.fontFamily, padding: css.padding, radius: css.borderRadius,
                                color: css.color, background: css.backgroundColor }; };
                        const isVisible = el => { if (!el) return false; const rect = el.getBoundingClientRect();
                            return rect.width > 0 && rect.height > 0 && rect.top < innerHeight && rect.bottom > 0 && rect.left < innerWidth && rect.right > 0; };
                        const pngs = [...screen.querySelectorAll('img'), ...(inModal ? [...modal.querySelectorAll('img')] : [])]
                            .filter(isVisible).filter(img => img.currentSrc && /\/assets\/.*\.png/i.test(img.currentSrc));
                        const badImages = pngs.filter(img => img.complete && !img.naturalWidth).map(img => img.currentSrc).slice(0, 4);
                        const theme = localStorage.getItem('yamb_theme') || 'dark';
                        const foreignImages = pngs.filter(img => {
                            const url = new URL(img.currentSrc);
                            const match = url.pathname.match(/\/assets\/theme-packs\/([^/]+)\//);
                            return match && match[1] !== theme;
                        }).map(img => img.currentSrc).slice(0, 4);
                        const oldImages = pngs.filter(img => /\/assets\/(?:easter|desert|severna)-soft-clay\/tournament\//.test(img.currentSrc))
                            .map(img => img.currentSrc).slice(0, 4);
                        const overflows = [shell, tab, content, ...screen.querySelectorAll('.tourney-card,.tourney-registration-panel,.tourney-champion-card,.tourney-participant-name')]
                            .filter(Boolean).filter(el => el.scrollWidth > el.clientWidth + 2 && getComputedStyle(el).overflowX !== 'auto')
                            .slice(0, 4).map(el => el.className);
                        const visiblePage = screen.querySelectorAll('.tourney-page')[kind === 'semifinal' ? 1 : kind === 'final' || kind === 'winner' ? 2 : 0];
                        const matchBounds = [...(visiblePage?.querySelectorAll('.tourney-match') || [])]
                            .filter(isVisible).filter(el => { const rect = el.getBoundingClientRect(); return rect.left < -1 || rect.right > innerWidth + 1; })
                            .slice(0, 4).map(el => el.className);
                        return { state: kind, active: screen.classList.contains('active'),
                            foreground: screen.contains(document.elementFromPoint(Math.round(innerWidth / 2), 80))
                                || (inModal && modal.style.display === 'flex') || Boolean(ceremony),
                            screenWidth: screen.scrollWidth, viewportWidth: innerWidth,
                            shell: box(shell), title: box(selected('.tourney-header-title')),
                            tab: box(tab), registration: box(selected('.tourney-registration-panel')),
                            match: box(selected('.tourney-match')), champion: box(selected('.tourney-champion-card')),
                            participant: box(selected('.tourney-participant-name')),
                            championName: box(selected('.tourney-champion-name')),
                            runnerUp: box(selected('.tourney-champion-runner-up')),
                            modal: inModal ? box(modal.querySelector('.custom-modal')) : null,
                            modalImages: inModal ? [...modal.querySelectorAll('img')].map(img => {
                                const css = getComputedStyle(img); const rect = img.getBoundingClientRect();
                                return { src: img.currentSrc, loaded: img.complete && img.naturalWidth > 0,
                                    width: rect.width, height: rect.height, display: css.display, visibility: css.visibility,
                                    opacity: css.opacity, className: img.className, inlineStyle: img.getAttribute('style') || '',
                                    matchedDisplay: [...document.styleSheets].flatMap(sheet => {
                                        try { return [...sheet.cssRules].filter(rule => rule.type === CSSRule.STYLE_RULE
                                            && rule.style.display && img.matches(rule.selectorText))
                                            .map(rule => `${rule.selectorText} => ${rule.style.display}`); }
                                        catch { return []; }
                                    }).slice(-8) };
                            }) : [],
                            ceremony: ceremony ? box(ceremony.querySelector('.tournament-final-ceremony-panel')) : null,
                            ceremonyImages: ceremony ? [...ceremony.querySelectorAll('img')].map(img => ({ src: img.currentSrc, loaded: img.complete && img.naturalWidth > 0 })) : [],
                            modalContext: inModal ? modal.classList.contains('modal-context-tournament') : null,
                            pngCount: pngs.length, badImages, foreignImages, oldImages, overflows, matchBounds };
                    }, state);
                    const label = `${viewport.width} ${theme}/${state}`;
                    const geometry = ['shell', 'title', 'tab', 'registration', 'match', 'champion', 'participant', 'championName', 'runnerUp']
                        .map(key => [key, result[key] ? [
                            ['shell', 'tab', 'registration', 'match', 'champion'].includes(key) ? result[key].width : null,
                            result[key].font, result[key].padding] : null]);
                    const geometryKey = `${viewport.width}/${state}`;
                    if (theme === 'dark') greenGeometry.set(geometryKey, geometry);
                    else if (JSON.stringify(geometry) !== JSON.stringify(greenGeometry.get(geometryKey))) {
                        failures.push({ label, result: { ...result, geometryMismatch: true } });
                    }
                    if (!result.active || !result.foreground || result.screenWidth > result.viewportWidth + 1
                        || result.badImages.length || result.foreignImages.length || result.oldImages.length || result.overflows.length || result.matchBounds.length
                        || ['duel', 'winner', 'prize-win', 'prize-finalist'].includes(state)
                            && (!result.modal || !result.modalContext || result.modal.width > viewport.width - 12
                                || result.modalImages.some(img => !img.loaded || img.width < 1 || img.height < 1
                                    || img.display === 'none' || img.visibility === 'hidden' || img.opacity === '0'))
                        || state.startsWith('ceremony-') && (!result.ceremony || result.ceremony.width > viewport.width - 12
                            || result.ceremony.height > viewport.height - 12 || result.ceremonyImages.some(img => !img.loaded))) {
                        failures.push({ label, result });
                    }
                    rows.push({ label, shell: result.shell, title: result.title, tab: result.tab, match: result.match,
                        registration: result.registration, champion: result.champion, participant: result.participant,
                        championName: result.championName, runnerUp: result.runnerUp, pngCount: result.pngCount });
                    if (process.env.TOURNAMENT_QA_SCREENSHOTS && viewport.width === 360 && ['registration', 'bracket', 'final', 'hall', 'duel', 'winner', 'ceremony-win', 'ceremony-finalist', 'prize-win', 'prize-finalist'].includes(state)) {
                        await page.screenshot({ path: path.join(process.env.TOURNAMENT_QA_SCREENSHOTS, `${theme}-${state}.png`) });
                    }
                    if (['duel', 'winner', 'prize-win', 'prize-finalist'].includes(state)) await page.evaluate(() => app.modal.close());
                    if (state.startsWith('ceremony-')) await page.evaluate(() => app.clearTournamentFinalCeremony());
                }
            }
            await page.close();
        }
    } finally { await browser.close(); }
    console.log(JSON.stringify({ states: rows.length, viewports, failureCount: failures.length,
        failures: failures.slice(0, 12).map(({ label, result }) => ({ label, modalContext: result.modalContext,
            screenWidth: result.screenWidth, viewportWidth: result.viewportWidth, badImages: result.badImages,
            foreignImages: result.foreignImages, oldImages: result.oldImages, overflows: result.overflows,
            matchBounds: result.matchBounds, geometryMismatch: result.geometryMismatch,
            ceremony: result.ceremony, ceremonyImages: result.ceremonyImages,
            modalImages: result.modalImages })) }, null, 2));
    if (process.env.TOURNAMENT_QA_REPORT) require('node:fs').writeFileSync(process.env.TOURNAMENT_QA_REPORT, JSON.stringify(rows, null, 2));
    if (failures.length) process.exitCode = 1;
})().catch(error => { console.error(error); process.exitCode = 1; });
