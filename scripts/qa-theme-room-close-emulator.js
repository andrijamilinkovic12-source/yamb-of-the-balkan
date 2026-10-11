const assert = require('node:assert/strict');
const WebSocket = require('ws');

const themes = ['dark', 'light', 'medium', 'winter', 'neon', 'amethyst', 'easter', 'desert', 'moon', 'severna'];

async function main() {
    const pages = await (await fetch('http://127.0.0.1:9222/json')).json();
    const page = pages.find(item => item.url === 'https://localhost/');
    assert(page?.webSocketDebuggerUrl, 'QA WebView unavailable');
    const socket = new WebSocket(page.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => { socket.once('open', resolve); socket.once('error', reject); });
    const pending = new Map();
    let nextId = 0;
    socket.on('message', bytes => {
        const message = JSON.parse(String(bytes));
        const waiter = pending.get(message.id);
        if (!waiter) return;
        pending.delete(message.id);
        message.error ? waiter.reject(message.error) : waiter.resolve(message.result);
    });
    const send = (method, params = {}) => new Promise((resolve, reject) => {
        const id = ++nextId;
        pending.set(id, { resolve, reject });
        socket.send(JSON.stringify({ id, method, params }));
    });
    const evaluate = async expression => {
        const result = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
        assert(!result.exceptionDetails, JSON.stringify(result.exceptionDetails));
        return result.result.value;
    };
    try {
        await send('Runtime.enable');
        for (const theme of themes) {
            const result = await evaluate(`(async () => {
                app.applyTheme(${JSON.stringify(theme)}, { initialLoad: true });
                const names = ['undo-menu-overlay', 'stats-screen', 'riznica-screen', 'highscores-screen',
                    'settings-screen', 'waiting-screen', 'global-chat-overlay', 'online-players-overlay',
                    'tournament-screen'];
                const buttons = names.map(id => ({ id, element: document.querySelector('#' + id + ' .global-chat-close') }));
                buttons.push({ id: 'custom-modal-overlay', element: document.querySelector('#custom-modal-overlay .cm-close') });
                const synthetic = [
                    ['league-modal-overlay', 'global-chat-close'], ['rules-overlay-ui', 'global-chat-close'],
                    ['pi-modal-overlay', 'global-chat-close'], ['streak-overlay', 'global-chat-close'],
                    ['h2h-detail-modal', 'h2h-detail-close']
                ];
                const temporary = [];
                for (const [id, className] of synthetic) {
                    const container = document.createElement('div');
                    container.id = id;
                    container.style.cssText = 'position:fixed;left:-1000px;top:-1000px;display:block';
                    const button = document.createElement('button');
                    button.className = className;
                    button.textContent = '×';
                    container.append(button);
                    document.body.append(container);
                    temporary.push(container);
                    buttons.push({ id, element: button });
                }
                const observations = [];
                for (const { id, element } of buttons) {
                    if (!element) { observations.push({ id, error: 'missing button' }); continue; }
                    const style = getComputedStyle(element);
                    const source = style.backgroundImage.match(/url\\(["']?([^"')]+)/)?.[1];
                    let decoded = false;
                    if (source) {
                        const image = new Image();
                        image.src = source;
                        try { await image.decode(); decoded = image.naturalWidth === 256 && image.naturalHeight === 256; }
                        catch (_) {}
                    }
                    observations.push({ id, width: style.width, height: style.height,
                        background: style.backgroundImage, fontSize: style.fontSize,
                        borderWidth: style.borderWidth, decoded, aria: element.getAttribute('aria-label') });
                }
                temporary.forEach(node => node.remove());
                return observations;
            })()`);
            const expected = theme === 'dark' ? 'green-soft-clay' : 'theme-packs/' + theme;
            assert.equal(result.length, 15, `${theme}: expected 15 close contexts`);
            for (const item of result) {
                assert(!item.error, `${theme}/${item.id}: ${item.error}`);
                assert.equal(item.width, '44px', `${theme}/${item.id} width`);
                assert.equal(item.height, '44px', `${theme}/${item.id} height`);
                assert.equal(item.fontSize, '0px', `${theme}/${item.id} old text visible`);
                assert.equal(item.borderWidth, '0px', `${theme}/${item.id} old border visible`);
                assert(item.background.includes(expected), `${theme}/${item.id}: ${item.background}`);
                assert(item.background.includes('close-v1.png?v=3'), `${theme}/${item.id}: stale close PNG`);
                assert(item.decoded, `${theme}/${item.id}: PNG failed to decode`);
            }
            const closeWorks = await evaluate(`(async () => {
                riznicaManager.showRiznica();
                await new Promise(resolve => setTimeout(resolve, 100));
                const opened = document.getElementById('riznica-screen').classList.contains('active');
                document.querySelector('#riznica-screen .riznica-close-btn').click();
                await new Promise(resolve => setTimeout(resolve, 500));
                const closed = !document.getElementById('riznica-screen').classList.contains('active');
                return { opened, closed };
            })()`);
            assert(closeWorks.opened && closeWorks.closed, `${theme}: treasury X did not close room ${JSON.stringify(closeWorks)}`);
            const leagueWorks = await evaluate(`(() => {
                kvartalnaLiga.showModal();
                const button = document.querySelector('#league-modal-overlay .league-close-standard');
                const style = button && getComputedStyle(button);
                const opened = Boolean(button && style.width === '44px' && style.height === '44px' &&
                    style.backgroundImage.includes(${JSON.stringify(expected)}));
                button?.click();
                return { opened, closed: !document.getElementById('league-modal-overlay') };
            })()`);
            assert(leagueWorks.opened && leagueWorks.closed, `${theme}: league X did not close room ${JSON.stringify(leagueWorks)}`);
            console.log(`${theme}: ${result.length}/15 close contexts, 44px, theme PNG decoded`);
        }
    } finally {
        socket.close();
    }
}

main().catch(error => { console.error(error); process.exitCode = 1; });
