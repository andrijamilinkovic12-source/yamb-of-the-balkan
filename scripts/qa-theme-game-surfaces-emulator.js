/** Inspect computed game surface materials in a local Android QA WebView. */
const assert = require('node:assert/strict');
const WebSocket = require('ws');

const themes = ['dark', 'light', 'medium', 'winter', 'neon', 'amethyst', 'easter', 'desert', 'moon', 'severna'];
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

async function main() {
    const pages = await (await fetch('http://127.0.0.1:9222/json')).json();
    const page = pages.find(item => item.url === 'https://localhost/');
    assert(page?.webSocketDebuggerUrl, 'Local QA WebView is unavailable');
    const socket = new WebSocket(page.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => { socket.once('open', resolve); socket.once('error', reject); });
    let id = 0;
    const pending = new Map();
    socket.on('message', bytes => {
        const response = JSON.parse(String(bytes));
        const entry = pending.get(response.id);
        if (!entry) return;
        pending.delete(response.id);
        response.error ? entry.reject(new Error(JSON.stringify(response.error))) : entry.resolve(response.result);
    });
    const send = (method, params = {}) => new Promise((resolve, reject) => {
        const requestId = ++id;
        pending.set(requestId, { resolve, reject });
        socket.send(JSON.stringify({ id: requestId, method, params }), error => error && reject(error));
    });
    const evaluate = async expression => {
        const response = await send('Runtime.evaluate', { expression, returnByValue: true });
        assert(!response.exceptionDetails, JSON.stringify(response.exceptionDetails));
        return response.result?.value;
    };
    await send('Page.enable');
    await send('Runtime.enable');
    const report = [];
    try {
        for (const theme of themes) {
            await evaluate(`localStorage.setItem('yamb_last_theme', ${JSON.stringify(theme)}); localStorage.setItem('yamb_theme', ${JSON.stringify(theme)}); true`);
            await send('Page.navigate', { url: 'https://localhost/' });
            let result;
            for (let attempt = 0; attempt < 50; attempt++) {
                result = await evaluate(`(() => {
                    const find = selector => document.querySelector(selector);
                    const style = selector => {
                        const element = find(selector);
                        if (!element) return null;
                        const computed = getComputedStyle(element);
                        return { background: computed.backgroundImage !== 'none' ? computed.backgroundImage : computed.backgroundColor,
                            color: computed.color, border: computed.borderColor, shadow: computed.boxShadow };
                    };
                    return { theme: document.documentElement?.dataset.splashTheme,
                        bodyClass: document.body?.className || '',
                        sheetLoaded: [...document.styleSheets].some(sheet => sheet.href?.includes('theme-game-board.css?v=5')),
                        header: style('#game-scene .game-header'), dock: style('#game-scene .controls-area'),
                        tray: style('#game-scene .dice-container'), menu: style('#game-dropdown-menu') };
                })()`);
                if (result?.theme === theme && result.sheetLoaded
                    && (theme === 'dark' || result.bodyClass.includes(`${theme}-theme`))
                    && ['header', 'dock', 'tray', 'menu'].every(part => result[part]?.background?.includes('gradient'))) break;
                await sleep(600);
            }
            assert.equal(result?.theme, theme, `${theme}: theme did not load`);
            assert(result.sheetLoaded, `${theme}: board stylesheet missing`);
            for (const part of ['header', 'dock', 'tray', 'menu']) {
                assert(result[part]?.background?.includes('gradient'), `${theme}: ${part} has no themed gradient: ${result[part]?.background}`);
            }
            report.push(result);
            console.log(`${theme}: header/dock/tray/menu themed`);
        }
        for (const part of ['header', 'dock', 'tray', 'menu']) {
            assert.equal(new Set(report.map(item => item[part].background)).size, themes.length,
                `${part}: themes share a background`);
        }
        console.log('PASS: all ten game surface backgrounds resolve uniquely in Android WebView.');
    } finally {
        socket.close();
    }
}

main().catch(error => { console.error(error); process.exitCode = 1; });
