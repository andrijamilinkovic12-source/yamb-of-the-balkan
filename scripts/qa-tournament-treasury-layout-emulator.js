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
    let nextId = 0;
    socket.on('message', bytes => {
        const response = JSON.parse(String(bytes));
        const waiter = pending.get(response.id);
        if (!waiter) return;
        pending.delete(response.id);
        response.error ? waiter.reject(response.error) : waiter.resolve(response.result);
    });
    const send = (method, params = {}) => new Promise((resolve, reject) => {
        const id = ++nextId;
        pending.set(id, { resolve, reject });
        socket.send(JSON.stringify({ id, method, params }));
    });
    const evaluate = async expression => {
        const answer = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
        assert(!answer.exceptionDetails, JSON.stringify(answer.exceptionDetails));
        return answer.result.value;
    };
    const measure = `(selectors => Object.fromEntries(Object.entries(selectors).map(([name, selector]) => {
        const el = document.querySelector(selector);
        if (!el) return [name, null];
        const style = getComputedStyle(el);
        const rect = el.getBoundingClientRect();
        return [name, {
            width: +rect.width.toFixed(1), height: +rect.height.toFixed(1),
            x: +rect.x.toFixed(1), y: +rect.y.toFixed(1),
            padding: style.padding, radius: style.borderRadius,
            transform: style.transform,
            font: style.fontFamily, size: style.fontSize, weight: style.fontWeight,
            line: style.lineHeight, color: style.color, background: style.backgroundColor,
            overflowX: el.scrollWidth > el.clientWidth + 2
        }];
    })))`;
    const selectors = {
        treasury: {
            shell: '#riznica-screen .riznica-container', header: '#riznica-screen .riznica-header',
            title: '#riznica-screen .riznica-header h2', tabs: '#riznica-screen .riznica-tabs',
            tab: '#riznica-screen .tab-btn', balance: '#riznica-screen .riznica-balance-pill',
            category: '#riznica-screen .category-header', card: '#riznica-screen .category-grid > .card',
            trophyVisual: '#riznica-screen .card .riznica-trophy-visual',
            trophyStatus: '#riznica-screen .card .status',
            cardTitle: '#riznica-screen .card .title', cardDesc: '#riznica-screen .card .desc',
            cardPrice: '#riznica-screen .card .price', cardButton: '#riznica-screen .card .btn-action',
            themePreview: '#riznica-screen .treasury-theme-preview'
        },
        tournament: {
            shell: '#tournament-screen .tourney-shell', header: '#tournament-screen .tourney-card-header',
            title: '#tournament-screen .tourney-header-title', tabs: '#tournament-screen .tourney-tabs',
            tab: '#tournament-screen .tourney-tab-btn', content: '#tournament-screen .tourney-tab-content',
            registration: '#tournament-screen .tourney-registration-panel',
            registrationTitle: '#tournament-screen .tourney-registration-title',
            registrationDesc: '#tournament-screen .tourney-registration-desc',
            match: '#tournament-screen .tourney-match',
            participant: '#tournament-screen .tourney-participant-name',
            champion: '#tournament-screen .tourney-champion-card',
            action: '#tournament-screen .tourney-start-match-button'
        }
    };
    const report = [];
    try {
        await send('Runtime.enable');
        assert(await evaluate('Boolean(window.app && window.riznicaManager && app.tournamentManager)'));
        for (const theme of themes.filter(value => !process.env.QA_THEME || process.env.QA_THEME === value)) {
            await evaluate(`localStorage.setItem('yamb_theme', ${JSON.stringify(theme)}); app.applyTheme(${JSON.stringify(theme)}, { initialLoad: true }); riznicaManager.showRiznica(); true`);
            const entry = { theme, treasury: {}, tournament: {}, palette: null };
            entry.palette = await evaluate(`(() => {
                const style = getComputedStyle(document.body);
                return Object.fromEntries(['--theme-card-surface','--theme-card-raised','--theme-card-ink','--theme-card-muted','--theme-card-primary']
                    .map(key => [key, style.getPropertyValue(key).trim()]));
            })()`);
            for (const tab of ['trophy', 'skin', 'effect', 'theme']) {
                await evaluate(`riznicaManager.switchTab(${JSON.stringify(tab)}); true`);
                await pause(100);
                entry.treasury[tab] = await evaluate(`${measure}(${JSON.stringify(selectors.treasury)})`);
            }
            await evaluate(`(() => {
                const tm = app.tournamentManager;
                tm.state = { status: 'registration', tournamentNumber: 1, players: [], bracket: { qf: [], sf: [], f: [] }, resetAt: null };
                tm.activeTab = 'info'; app.navigateTo('tournament-screen'); tm.render(); return true;
            })()`);
            await pause(650);
            entry.tournament.info = await evaluate(`${measure}(${JSON.stringify(selectors.tournament)})`);
            await evaluate(`(() => {
                const tm = app.tournamentManager;
                const players = Array.from({ length: 8 }, (_, i) => ({ id: 'qa-' + i, name: 'Takmicar ' + (i + 1), powerIndex: 1000 + i }));
                tm.state = { status: 'active', tournamentNumber: 1, players,
                    bracket: { qf: Array.from({length: 4}, (_, i) => ({p1: players[2*i], p2: players[2*i+1]})),
                        sf: [], f: [] }, resetAt: null };
                tm.activeTab = 'bracket'; tm.render(); return true;
            })()`);
            await pause(650);
            entry.tournament.bracket = await evaluate(`${measure}(${JSON.stringify(selectors.tournament)})`);
            report.push(entry);
            const pick = (room, tab, item) => { const m = room[tab][item]; return m ? `${m.width}x${m.height} ${m.size || ''} ${m.color || ''}` : '-'; };
            console.log(`${theme}: Treasury card ${pick(entry.treasury,'trophy','card')}, tab ${pick(entry.treasury,'trophy','tab')}; Tournament shell ${pick(entry.tournament,'info','shell')}, tab ${pick(entry.tournament,'info','tab')}, match ${pick(entry.tournament,'bracket','match')}`);
        }
        if (process.env.QA_LAYOUT_REPORT) require('node:fs').writeFileSync(process.env.QA_LAYOUT_REPORT, JSON.stringify(report, null, 2));
        const base = report.find(item => item.theme === 'dark');
        if (base) {
            for (const item of report.filter(item => item !== base)) {
                for (const [room, tabs] of [['treasury', ['trophy','skin','effect','theme']], ['tournament', ['info','bracket']]]) {
                    for (const tab of tabs) {
                        for (const [name, green] of Object.entries(base[room][tab])) {
                            const current = item[room][tab][name];
                            if (!green || !current) continue;
                            const widthDiff = Math.abs(current.width - green.width);
                            const heightDiff = Math.abs(current.height - green.height);
                            const fontDiff = Math.abs(parseFloat(current.size) - parseFloat(green.size));
                            if (widthDiff > 3 || heightDiff > 3 || fontDiff > 0.2 || current.overflowX) {
                                console.log(`DIFF ${item.theme}/${room}/${tab}/${name}: green ${green.width}x${green.height} ${green.size}, theme ${current.width}x${current.height} ${current.size}${current.overflowX ? ' OVERFLOW' : ''}`);
                            }
                        }
                    }
                }
            }
            const sameAsGreen = (theme, room, tab, name, properties) => {
                const green = base[room][tab][name];
                const current = theme[room][tab][name];
                assert(green && current, `${theme.theme}/${room}/${tab}/${name} missing`);
                for (const property of properties) {
                    if (typeof green[property] === 'number') {
                        assert(Math.abs(current[property] - green[property]) <= 0.2,
                            `${theme.theme}/${room}/${tab}/${name}.${property}: ${current[property]} vs Green ${green[property]}`);
                    } else {
                        assert.equal(current[property], green[property],
                            `${theme.theme}/${room}/${tab}/${name}.${property}`);
                    }
                }
                assert(!current.overflowX, `${theme.theme}/${room}/${tab}/${name} overflows horizontally`);
            };
            const rgb = hex => hex.match(/[a-f\d]{2}/gi).map(value => parseInt(value, 16) / 255)
                .map(value => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
            const luminance = hex => rgb(hex).reduce((sum, channel, index) => sum + channel * [0.2126, 0.7152, 0.0722][index], 0);
            const contrast = (a, b) => {
                const values = [luminance(a), luminance(b)].sort((x, y) => y - x);
                return (values[0] + 0.05) / (values[1] + 0.05);
            };
            for (const theme of report.filter(item => item !== base)) {
                for (const tab of ['trophy', 'skin', 'effect', 'theme']) {
                    sameAsGreen(theme, 'treasury', tab, 'tabs', ['width', 'height']);
                    sameAsGreen(theme, 'treasury', tab, 'tab', ['width', 'height', 'size']);
                    sameAsGreen(theme, 'treasury', tab, 'balance', ['width', 'height', 'size']);
                    sameAsGreen(theme, 'treasury', tab, 'card', ['width', 'padding', 'radius', 'font']);
                    if (tab !== 'trophy') sameAsGreen(theme, 'treasury', tab, 'cardButton', ['width', 'height', 'size', 'font']);
                }
                sameAsGreen(theme, 'treasury', 'trophy', 'card', ['height']);
                sameAsGreen(theme, 'treasury', 'trophy', 'trophyStatus', ['width', 'height', 'size']);
                for (const tab of ['info', 'bracket']) {
                    sameAsGreen(theme, 'tournament', tab, 'shell', ['width', 'height', 'radius', 'font']);
                    sameAsGreen(theme, 'tournament', tab, 'title', ['size', 'font']);
                    sameAsGreen(theme, 'tournament', tab, 'tab', ['width', 'height', 'size', 'font']);
                }
                sameAsGreen(theme, 'tournament', 'bracket', 'match', ['width', 'height', 'radius']);
                for (const ink of ['--theme-card-ink', '--theme-card-muted']) {
                    for (const surface of ['--theme-card-surface', '--theme-card-raised']) {
                        assert(contrast(theme.palette[ink], theme.palette[surface]) >= 4.5,
                            `${theme.theme} ${ink} contrast against ${surface}`);
                    }
                }
                for (const surface of ['--theme-card-surface', '--theme-card-raised']) {
                    assert(contrast(theme.palette['--theme-card-primary'], theme.palette[surface]) >= 4.5,
                        `${theme.theme} action contrast against ${surface}`);
                }
            }
            console.log(`PASS: Green geometry, typography and palette contrast in all ${report.length} themes`);
        }
    } finally {
        socket.close();
    }
}

main().catch(error => { console.error(error); process.exitCode = 1; });
