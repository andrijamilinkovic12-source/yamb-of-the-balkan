const assert = require('node:assert/strict');
const WebSocket = require('ws');

const themes = ['dark', 'light', 'medium', 'winter', 'neon', 'amethyst', 'easter', 'desert', 'moon', 'severna'];
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));

async function main() {
    const pages = await (await fetch('http://127.0.0.1:9222/json')).json();
    const page = pages.find(item => item.url === 'https://localhost/');
    assert(page?.webSocketDebuggerUrl, 'QA WebView unavailable');
    const socket = new WebSocket(page.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => { socket.once('open', resolve); socket.once('error', reject); });
    const pending = new Map();
    let id = 0;
    socket.on('message', data => {
        const answer = JSON.parse(String(data));
        const waiter = pending.get(answer.id);
        if (!waiter) return;
        pending.delete(answer.id);
        answer.error ? waiter.reject(answer.error) : waiter.resolve(answer.result);
    });
    const send = (method, params = {}) => new Promise((resolve, reject) => {
        const key = ++id;
        pending.set(key, { resolve, reject });
        socket.send(JSON.stringify({ id: key, method, params }));
    });
    const evaluate = async expression => {
        const result = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
        assert(!result.exceptionDetails, JSON.stringify(result.exceptionDetails));
        return result.result.value;
    };
    try {
        await send('Runtime.enable');
        assert(await evaluate("Boolean(window.app && window.riznicaManager && window.app.tournamentManager)"));
        for (const theme of themes.filter(theme => !process.env.QA_THEME || process.env.QA_THEME === theme)) {
            await evaluate(`localStorage.setItem('yamb_theme', ${JSON.stringify(theme)}); app.applyTheme(${JSON.stringify(theme)}, { initialLoad: true }); riznicaManager.showRiznica(); true`);
            await pause(350);
            const treasury = {};
            for (const tab of ['trophy', 'skin', 'effect', 'theme']) {
                await evaluate(`riznicaManager.switchTab(${JSON.stringify(tab)}); true`);
                await pause(850);
                treasury[tab] = await evaluate(`(() => {
                    const screen = document.querySelector('#riznica-screen');
                    const visible = el => { const s = getComputedStyle(el); const r = el.getBoundingClientRect(); return s.display !== 'none' && s.visibility !== 'hidden' && s.opacity !== '0' && r.width > 0 && r.height > 0; };
                    const image = el => el ? { src: el.getAttribute('src'), ready: el.complete && el.naturalWidth > 0, visible: visible(el) } : null;
                    return {
                        tabIcons: [...screen.querySelectorAll('.riznica-tabs .treasury-control-icon')].map(image),
                        categoryIcons: [...screen.querySelectorAll('.category-header img')].map(image),
                        trophyFallbackCount: screen.querySelectorAll('.riznica-trophy-fallback').length,
                        balanceIcons: [...screen.querySelectorAll('.riznica-balance-pill img, .riznica-balance-pill svg')].filter(visible).map(el => el.getAttribute('src') || 'SVG'),
                        adIcons: [...screen.querySelectorAll('.riznica-ad-btn img, .riznica-ad-btn svg')].filter(visible).map(el => el.getAttribute('src') || 'SVG'),
                        rewardIcons: [...screen.querySelectorAll('#riznica-shop-container .riznica-item-reward-video-green-soft-clay-icon')].map(image),
                        legacyRewardIcons: screen.querySelectorAll('#riznica-shop-container .riznica-item-reward-video-soft-clay-icon, #riznica-shop-container .riznica-item-reward-video-desert-soft-clay-icon, #riznica-shop-container .riznica-item-reward-video-nebula-soft-clay-icon').length,
                        cardCount: screen.querySelectorAll('.category-grid > .card').length,
                        lockedOpacity: getComputedStyle(screen.querySelector('.card.locked') || screen.querySelector('.card')).opacity
                    };
                })()`);
            }
            const idPrefix = theme === 'dark' ? 'assets/green-soft-clay/' : `assets/theme-packs/${theme}/`;
            for (const [tab, state] of Object.entries(treasury)) {
                assert.equal(state.tabIcons.length, 4, `${theme}/${tab}: tab count`);
                assert(state.tabIcons.every(icon => icon.ready && icon.visible && icon.src.startsWith(idPrefix)), `${theme}/${tab}: tab PNG`);
                assert(state.categoryIcons.every(icon => icon.ready && icon.src.startsWith(idPrefix)), `${theme}/${tab}: category PNG`);
                assert.equal(state.trophyFallbackCount, 0, `${theme}/${tab}: legacy trophy fallback`);
                assert.equal(state.balanceIcons.length, 1, `${theme}/${tab}: duplicate balance icon`);
                assert.equal(state.adIcons.length, 2, `${theme}/${tab}: duplicate ad icons`);
                assert(state.adIcons.every(src => src.startsWith(idPrefix)), `${theme}/${tab}: stale ad icon`);
                assert.equal(state.legacyRewardIcons, 0, `${theme}/${tab}: legacy reward icon`);
                assert(state.rewardIcons.every(icon => icon.src.startsWith(idPrefix)), `${theme}/${tab}: wrong reward video PNG`);
                if (tab === 'trophy') assert.equal(state.lockedOpacity, '1', `${theme}: locked trophy hidden`);
            }
            await evaluate(`(() => {
                const tm = app.tournamentManager;
                tm.state = { status: 'finished', tournamentNumber: 1, players: [], bracket: {
                    qf: [], sf: [], f: [{ p1: { id: 'qa-a', name: 'QA A' }, p2: { id: 'qa-b', name: 'QA B' }, winnerId: 'qa-a' }]
                }, finishedAt: Date.now(), resetAt: null };
                app.navigateTo('tournament-screen');
                tm.activeTab = 'info'; tm.render();
                tm.openMatchModal('f', 0);
                return true;
            })()`);
            await pause(250);
            const tournament = await evaluate(`(() => {
                const image = el => el ? { src: el.getAttribute('src'), ready: el.complete && el.naturalWidth > 0, width: Math.round(el.getBoundingClientRect().width) } : null;
                return {
                    tabs: [...document.querySelectorAll('#tournament-screen .tourney-tab-btn img')].map(image),
                    duelHeading: image(document.querySelector('#custom-modal-overlay .tourney-duel-heading-icon')),
                    duelResult: image(document.querySelector('#custom-modal-overlay .tourney-match-result-icon-green')),
                    finalist: image(document.querySelector('#custom-modal-overlay .tourney-finalist-result-icon-canonical')),
                    title: document.querySelector('#custom-modal-overlay #cm-title')?.textContent || ''
                };
            })()`);
            assert.equal(tournament.tabs.length, 3, `${theme}: tournament tabs`);
            assert(tournament.tabs.every(icon => icon.ready && icon.src.startsWith(idPrefix)), `${theme}: tournament tab PNG`);
            assert(tournament.duelHeading?.ready && tournament.duelHeading.src.includes('tournament-awards/champion-trophy'), `${theme}: duel heading trophy`);
            assert(tournament.duelResult?.ready && tournament.duelResult.src.includes('tournament-awards/champion-trophy'), `${theme}: duel result trophy`);
            assert.equal(tournament.duelHeading.src, tournament.duelResult.src, `${theme}: trophy identity differs inside duel`);
            assert(tournament.finalist?.ready && tournament.finalist.src.startsWith(idPrefix), `${theme}: finalist PNG`);
            assert.equal(tournament.duelHeading.width, 38, `${theme}: duel trophy scale`);
            assert(!tournament.title.includes('⚔'), `${theme}: legacy duel icon`);
            await evaluate("app.modal.close(); true");
            await evaluate(`(() => {
                const tm = app.tournamentManager;
                tm.state.status = 'active';
                tm.state.players = Array.from({ length: 8 }, (_, i) => ({ id: 'qa-' + i, name: 'QA ' + i }));
                tm.state.bracket.qf = [{ p1: { id: 'qa-0', name: 'QA A' }, p2: { id: 'qa-1', name: 'QA B' } }];
                tm.openMatchModal('qf', 0);
                return true;
            })()`);
            await pause(250);
            const activeDuel = await evaluate(`(() => {
                const icon = document.querySelector('#custom-modal-overlay .tourney-duel-heading-icon');
                return { src: icon?.getAttribute('src'), ready: Boolean(icon?.complete && icon?.naturalWidth), width: Math.round(icon?.getBoundingClientRect().width || 0), title: document.querySelector('#custom-modal-overlay #cm-title')?.textContent || '' };
            })()`);
            assert(activeDuel.ready && activeDuel.src.startsWith(idPrefix) && activeDuel.src.includes('tournament-states/state-match-active-v1.png'), `${theme}: active bracket duel icon`);
            assert.equal(activeDuel.width, 38, `${theme}: active duel icon scale`);
            assert(!activeDuel.title.includes('⚔'), `${theme}: active duel legacy icon`);
            await evaluate("app.modal.close(); true");
            console.log(`${theme}: Treasury 4 tabs and both opened tournament duels OK; locked opacity ${treasury.trophy.lockedOpacity}`);
        }
    } finally {
        socket.close();
    }
}

main().catch(error => { console.error(error); process.exitCode = 1; });
