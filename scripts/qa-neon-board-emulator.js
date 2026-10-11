const assert = require('node:assert/strict');
const WebSocket = require('ws');

async function main() {
    const pages = await (await fetch('http://127.0.0.1:9222/json')).json();
    const page = pages.find(item => item.url === 'https://localhost/');
    assert(page?.webSocketDebuggerUrl, 'QA WebView unavailable');
    const socket = new WebSocket(page.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => {
        socket.once('open', resolve);
        socket.once('error', reject);
    });
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
        const response = await send('Runtime.evaluate', {
            expression, awaitPromise: true, returnByValue: true
        });
        assert(!response.exceptionDetails, JSON.stringify(response.exceptionDetails));
        return response.result.value;
    };
    try {
        await send('Runtime.enable');
        const result = await evaluate(`(async () => {
            const rect = element => {
                const box = element.getBoundingClientRect();
                return [box.x, box.y, box.width, box.height].map(value => +value.toFixed(2));
            };
            const capture = () => {
                const table = document.querySelector('#game-scene .player-table');
                const grid = table.querySelector('.grid-container');
                const header = grid.querySelector('.col-header.c-nadole');
                const label = grid.querySelector('.row-header[data-score-row="1"]');
                const score = document.getElementById('btn-0-Slobodna-1');
                const icon = grid.querySelector('.neon-announce-col-icon');
                const iconStyle = getComputedStyle(icon);
                return {
                    table: rect(table), grid: rect(grid), header: rect(header),
                    label: rect(label), score: rect(score),
                    cells: grid.children.length,
                    rows: [...grid.querySelectorAll('.row-header')].map(node => node.dataset.scoreRow),
                    columns: [...grid.querySelectorAll('.col-header')].map(node => node.textContent),
                    scoreDisabled: score.disabled,
                    shell: getComputedStyle(table).backgroundImage,
                    labelColor: getComputedStyle(label).color,
                    icon: {
                        display: iconStyle.display, width: iconStyle.width, height: iconStyle.height,
                        loaded: icon.complete && icon.naturalWidth === 256 && icon.naturalHeight === 256,
                        source: icon.currentSrc
                    }
                };
            };
            app.players = ['QA'];
            app.playerName = 'QA';
            app.onlineMode = false;
            app.isSpectator = false;
            app.roomId = '';
            app.currentPlayerIdx = 0;
            app.initScores();
            app.navigateTo('game-scene');
            app.applyTheme('dark', { initialLoad: true });
            app.createScoreTables();
            app.brojBacanja = 1;
            app.kockiceVals = [1, 1, 2, 3, 4, 5];
            app.updateTableVisuals();
            const green = capture();
            app.applyTheme('neon', { initialLoad: true });
            const icon = document.querySelector('.neon-announce-col-icon');
            await new Promise((resolve, reject) => {
                if (icon.complete) return icon.naturalWidth ? resolve() : reject(new Error('Megaphone failed'));
                icon.addEventListener('load', resolve, { once: true });
                icon.addEventListener('error', () => reject(new Error('Megaphone failed')), { once: true });
            });
            const neon = capture();
            const button = document.getElementById('btn-0-Slobodna-1');
            button.click();
            await new Promise(resolve => setTimeout(resolve, 200));
            const written = {
                value: app.allScores[0].Slobodna['1'],
                label: button.textContent,
                filled: button.classList.contains('filled')
            };
            return { green, neon, written };
        })()`);
        for (const key of ['table', 'grid', 'header', 'label', 'score']) {
            assert.deepEqual(result.neon[key], result.green[key], `${key} geometry differs from Green`);
        }
        assert.deepEqual(result.neon.rows, result.green.rows, 'Score rows changed');
        assert.deepEqual(result.neon.columns, result.green.columns, 'Score columns changed');
        assert.equal(result.neon.cells, result.green.cells, 'Grid cell count changed');
        assert.equal(result.neon.icon.display, 'block');
        assert.equal(result.neon.icon.width, '18px');
        assert.equal(result.neon.icon.height, '18px');
        assert(result.neon.icon.loaded, 'Neon megaphone PNG failed to decode');
        assert(!result.neon.scoreDisabled, 'Score entry disabled before click');
        assert.deepEqual(result.written, { value: 2, label: '2', filled: true });
        console.log(JSON.stringify(result, null, 2));
        console.log('PASS: Neon board geometry matches Green; PNG loads; score input works.');
    } finally {
        socket.close();
    }
}

main().catch(error => { console.error(error); process.exitCode = 1; });
