// Browser audit of the Invite Friend room on portrait phones.
const { chromium } = require('playwright');
const { pathToFileURL } = require('url');
const path = require('path');

const url = pathToFileURL(path.resolve(__dirname, '../www/index.html')).href;
const themes = ['dark', 'light', 'medium', 'winter', 'neon', 'amethyst', 'easter', 'desert', 'moon', 'severna']
    .filter(theme => !process.env.AUDIT_THEME || process.env.AUDIT_THEME === theme);
const viewports = [{ width: 320, height: 568 }, { width: 360, height: 640 }, { width: 360, height: 780 }, { width: 390, height: 844 }, { width: 430, height: 932 }]
    .filter(viewport => !process.env.AUDIT_WIDTH || Number(process.env.AUDIT_WIDTH) === viewport.width);

(async () => {
    const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH || chromium.executablePath(), args: ['--no-sandbox'] });
    const page = await browser.newPage({ reducedMotion: 'reduce' });
    const results = [];
    for (const viewport of viewports) {
        await page.setViewportSize(viewport);
        for (const theme of themes) for (const state of ['friends', 'request', 'empty']) {
            await page.goto(url, { waitUntil: 'domcontentloaded' });
            const result = await page.evaluate(({ theme, state }) => {
                document.body.className = theme === 'dark' ? '' : `${theme}-theme`;
                document.body.style.setProperty('--safe-bottom', '48px');
                document.querySelectorAll('.screen').forEach(screen => screen.classList.remove('active'));
                const screen = document.getElementById('waiting-screen');
                screen.classList.add('active', 'is-hosting-invite', 'is-friend-invite');
                document.getElementById('waiting-title').textContent = 'POZOVI PRIJATELJA';
                document.getElementById('wait-msg').textContent = 'Odaberite prijatelja iz liste ili dodajte novog!';
                document.getElementById('waiting-my-name').textContent = 'Andrija Milinković';
                document.getElementById('waiting-opp-box').style.display = 'none';
                document.getElementById('waiting-vs-badge').style.display = 'none';
                document.getElementById('ws-hall-of-fame').classList.add('hidden');
                document.getElementById('friends-list-container').classList.remove('hidden');
                document.getElementById('friends-list').innerHTML = `<div class="friend-card add-new"><button type="button" class="invite-friend-add-action"><img class="theme-invite-add-icon" alt=""><span>DODAJ PRIJATELJA</span></button><form class="invite-friend-search-form"><input class="invite-friend-search-input" placeholder="Ime igrača..."><button class="invite-friend-search-submit" type="button"><img class="invite-friend-search-icon" alt=""></button></form></div>` + (state === 'friends' ? `<div class="friend-card friend-player-card is-online"><img class="friend-card-img" alt=""><span class="friend-card-name">Aleksandar Petrović-Pavlović</span><div class="friend-card-stats"><div class="easter-friend-records"><div class="easter-friend-record-row"><span>Moć</span><strong>3200</strong></div><div class="easter-friend-record-row"><span>POB</span><strong>12</strong></div><div class="easter-friend-record-row"><span>NER</span><strong>3</strong></div><div class="easter-friend-record-row"><span>POR</span><strong>4</strong></div></div></div><button class="friend-card-btn"><img class="theme-invite-send-icon" alt=""><span>POZOVI</span></button></div>` : state === 'request' ? `<div class="friend-card friend-request-card"><img class="friend-card-img" alt=""><span class="friend-card-name">Aleksandar Petrović-Pavlović</span><span class="friend-request-label">Novi zahtev</span><div class="friend-request-actions"><button type="button">Prihvati</button><button type="button">Odbij</button></div></div>` : `<div class="easter-invite-empty-state" role="status"><img class="theme-invite-empty-icon" alt=""><span>Još nema prijatelja.</span></div>`);
                const measure = selector => { const element = document.querySelector(selector); const rect = element.getBoundingClientRect(); const style = getComputedStyle(element); return { x: rect.x, y: rect.y, width: rect.width, height: rect.height, bottom: rect.bottom, right: rect.right, font: style.fontSize, family: style.fontFamily, color: style.color, background: style.backgroundColor }; };
                return {
                    screen: measure('#waiting-screen'), header: measure('.waiting-header'), status: measure('.waiting-status-panel'),
                    owner: measure('.ws-vs-area-horizontal > .ws-glass-card'), friends: measure('#friends-list-container'),
                    add: measure('.friend-card.add-new'), last: measure('#friends-list > :last-child'),
                    title: measure('#waiting-title'), message: measure('#wait-msg'), name: measure('#waiting-my-name'),
                    cardName: state === 'friends' ? measure('.friend-player-card .friend-card-name') : null,
                    button: state === 'friends' ? measure('.friend-player-card .friend-card-btn') : null,
                    search: measure('.invite-friend-search-form'),
                    stats: state === 'friends' ? measure('.friend-player-card .friend-card-stats') : null,
                    requestButtons: state === 'request' ? measure('.friend-request-actions') : null,
                    scrollHeight: screen.scrollHeight, clientHeight: screen.clientHeight,
                    friendsScrollWidth: document.getElementById('friends-list').scrollWidth,
                    friendsClientWidth: document.getElementById('friends-list').clientWidth
                };
            }, { theme, state });
            results.push({ viewport, theme, state, result });
        }
    }
    await browser.close();
    const issues = [];
    const baselines = new Map();
    const positions = ['header', 'status', 'owner', 'friends', 'add'];
    const fonts = ['title', 'message', 'name', 'cardName', 'button'];
    for (const row of results) {
        const { viewport, theme, state, result } = row;
        const key = `${viewport.width}x${viewport.height}/${state}`;
        const baseline = baselines.get(key);
        if (!baseline) baselines.set(key, result);
        else {
            for (const part of positions) for (const dimension of ['width', 'height'])
                if (Math.abs(result[part][dimension] - baseline[part][dimension]) > 2)
                    issues.push(`${key}/${theme}: ${part} ${dimension} ${result[part][dimension]} vs Green ${baseline[part][dimension]}`);
            for (const part of fonts) if (result[part] && baseline[part] && (result[part].font !== baseline[part].font || result[part].family !== baseline[part].family))
                issues.push(`${key}/${theme}: ${part} font ${result[part].font}/${result[part].family} vs Green ${baseline[part].font}/${baseline[part].family}`);
        }
        if (result.last.bottom > viewport.height - 56 || result.add.x < 8 || result.add.right > viewport.width - 8 || result.scrollHeight > result.clientHeight + 1 ||
            result.search.bottom > result.add.bottom + 1 || (result.button && result.button.bottom > result.last.bottom + 1) ||
            (result.stats && result.stats.bottom > result.last.bottom + 1) || (result.requestButtons && result.requestButtons.bottom > result.last.bottom + 1))
            issues.push(`${key}/${theme}: viewport overflow ${JSON.stringify({ bottom: result.last.bottom, x: result.add.x, right: result.add.right, scroll: result.scrollHeight - result.clientHeight, searchBottom: result.search.bottom, addBottom: result.add.bottom, statsBottom: result.stats?.bottom, buttonBottom: result.button?.bottom, requestBottom: result.requestButtons?.bottom })}`);
    }
    console.log(JSON.stringify({ checked: results.length, green: results.filter(row => row.theme === 'dark').map(row => ({ viewport: row.viewport, state: row.state, bottom: row.result.last.bottom, owner: row.result.owner.height, card: row.result.add.height, titleFont: row.result.title.font, scroll: row.result.scrollHeight - row.result.clientHeight })), issueCount: issues.length, issues: issues.slice(0, 50) }, null, 2));
    if (issues.length) process.exitCode = 1;
})().catch(error => { console.error(error); process.exitCode = 1; });
