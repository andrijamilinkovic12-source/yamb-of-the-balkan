// Read-only Android Chrome audit for the isolated Green Treasury fixture.
// Prerequisites: local QA server and `adb forward tcp:9222 localabstract:chrome_devtools_remote`.
const http = require('http');
const fs = require('fs');
const path = require('path');

const fixturePath = `/__green_qa__/green-runtime.html?catalog=all${process.argv.includes('--discount') ? '&discount=1' : ''}`;
const origin = 'http://127.0.0.1:3130';

function getJson(url) {
    return new Promise((resolve, reject) => {
        http.get(url, response => {
            let body = '';
            response.on('data', chunk => { body += chunk; });
            response.on('end', () => {
                try { resolve(JSON.parse(body)); } catch (error) { reject(error); }
            });
        }).on('error', reject);
    });
}

async function main() {
    const tabs = await getJson('http://127.0.0.1:9222/json');
    const page = tabs.find(tab => tab.type === 'page'
        && tab.url?.startsWith(`${origin}/__green_qa__/green-runtime.html?catalog=all`));
    if (!page) throw new Error('Open the local Green Treasury QA tab first.');

    const socket = new WebSocket(page.webSocketDebuggerUrl);
    const pending = new Map();
    let nextId = 1;
    socket.addEventListener('message', event => {
        const data = JSON.parse(event.data);
        const entry = pending.get(data.id);
        if (!entry) return;
        pending.delete(data.id);
        data.error ? entry.reject(new Error(data.error.message)) : entry.resolve(data.result);
    });
    await new Promise((resolve, reject) => {
        socket.addEventListener('open', resolve, { once: true });
        socket.addEventListener('error', reject, { once: true });
    });
    function send(method, params = {}) {
        return new Promise((resolve, reject) => {
            const id = nextId++;
            pending.set(id, { resolve, reject });
            socket.send(JSON.stringify({ id, method, params }));
        });
    }

    const report = [];
    for (const lang of ['sr', 'en']) {
        for (const type of ['skin', 'effect', 'theme']) {
            await send('Page.navigate', { url: `${origin}${fixturePath}&lang=${lang}&qa_run=${lang}-${type}#treasury-${type}` });
            let result;
            for (let attempt = 0; attempt < 30; attempt++) {
                await new Promise(resolve => setTimeout(resolve, 250));
                const response = await send('Runtime.evaluate', {
                    expression: `JSON.stringify((() => {
                        const screen = document.querySelector('#riznica-screen');
                        const cards = [...document.querySelectorAll('#riznica-shop-container .card')];
                        if (!screen?.classList.contains('active') || screen.dataset.riznicaTab !== ${JSON.stringify(type)}
                            || location.hash !== ${JSON.stringify(`#treasury-${type}`)}
                            || new URLSearchParams(location.search).get('lang') !== ${JSON.stringify(lang)}
                            || !cards.length) return null;
                        const margin = 2;
                        const issues = cards.flatMap((card, index) => {
                            const parent = card.getBoundingClientRect();
                            const title = card.querySelector('.title')?.textContent?.trim() || String(index);
                            const elements = [...card.querySelectorAll('.title, .desc, .price, .status, .btn-action, .icon, .dice-preview, .effect-preview-box')];
                            const escaped = elements.filter(el => {
                                const box = el.getBoundingClientRect();
                                return box.left < parent.left - margin || box.right > parent.right + margin;
                            }).map(el => el.className || el.tagName);
                            return card.scrollWidth > card.clientWidth + margin || escaped.length
                                ? [{ title, width: [card.scrollWidth, card.clientWidth], escaped }]
                                : [];
                        });
                        const headings = [...screen.querySelectorAll('.category-header')].filter(el => el.scrollWidth > el.clientWidth + margin).map(el => el.textContent.trim());
                        const preview = screen.querySelector('.prev-confetti');
                        const effectPreviews = [...screen.querySelectorAll('.effect-preview-box')]
                            .filter(el => /prev-(?:thunder|balkan|fireworks|bubbles|cosmic-dust|dragon-fire|royal-yamb|fireflies|glass|black-hole|supernova|neon|drones|ufo-abduction)/.test(el.className))
                            .map(el => ({ className: el.className,
                                content: getComputedStyle(el, '::before').content,
                                image: getComputedStyle(el, '::before').backgroundImage,
                                after: getComputedStyle(el, '::after').content,
                                children: el.children.length,
                                opacity: getComputedStyle(el, '::before').opacity,
                                surface: getComputedStyle(el).backgroundImage }));
                        return {
                            lang: ${JSON.stringify(lang)}, type: ${JSON.stringify(type)}, count: cards.length,
                            issues, headings, width: [screen.scrollWidth, screen.clientWidth],
                            owned: screen.querySelectorAll('.riznica-item-status--owned').length,
                            active: screen.querySelectorAll('.riznica-item-status--active').length,
                            locked: screen.querySelectorAll('.riznica-item-status--locked').length,
                            adUnlock: screen.querySelectorAll('.riznica-reward-video-copy').length,
                            discounted: screen.querySelectorAll('.old-price').length,
                            confettiContent: preview ? getComputedStyle(preview, '::before').content : null,
                            confettiImage: preview ? getComputedStyle(preview, '::before').backgroundImage : null,
                            effectPreviews
                        };
                    })())`, returnByValue: true
                });
                const value = response.result?.value;
                if (value && value !== 'null') {
                    result = JSON.parse(value);
                    break;
                }
            }
            if (!result) {
                const diagnosis = await send('Runtime.evaluate', {
                    expression: `JSON.stringify({url: location.href, tab: document.querySelector('#riznica-screen')?.dataset.riznicaTab, count: document.querySelectorAll('#riznica-shop-container .card').length, error: document.body.innerText.slice(-400)})`,
                    returnByValue: true
                });
                throw new Error(`Fixture did not load: ${lang}/${type}: ${diagnosis.result?.value}`);
            }
            report.push(result);
        }
    }
    const focusOptions = {
        '--focus-desert': { name: 'Pustinjsko Staklo', type: 'theme', slug: 'desert' },
        '--focus-thunder': { name: 'Gromovnik', type: 'effect', slug: 'thunder' },
        '--focus-confetti': { name: 'Konfete', type: 'effect', slug: 'confetti' },
        '--focus-wedding': { name: 'Svadba', type: 'effect', slug: 'wedding' },
        '--focus-bubbles': { name: 'Magični Mehurići', type: 'effect', slug: 'bubbles' },
        '--focus-royal': { name: 'Kraljevski Yamb', type: 'effect', slug: 'royal-yamb' },
        '--focus-fireflies': { name: 'Magični Svici', type: 'effect', slug: 'fireflies' },
        '--focus-ice': { name: 'Ledeno Doba', type: 'effect', slug: 'ice-age' },
        '--focus-black-hole': { name: 'Crna Rupa', type: 'effect', slug: 'black-hole' },
        '--focus-supernova': { name: 'Supernova', type: 'effect', slug: 'supernova' },
        '--focus-neon': { name: 'Neon Puls', type: 'effect', slug: 'neon-pulse' },
        '--focus-drones': { name: 'Svetleći Dronovi', type: 'effect', slug: 'drones' },
        '--focus-ufo': { name: 'UFO Abdukcija', type: 'effect', slug: 'ufo-abduction' }
    };
    const focus = Object.entries(focusOptions).find(([flag]) => process.argv.includes(flag))?.[1] || null;
    if (focus) {
        await send('Page.navigate', { url: `${origin}${fixturePath}&lang=sr&qa_run=focus-${focus.type}#treasury-${focus.type}` });
        for (let attempt = 0; attempt < 30; attempt++) {
            await new Promise(resolve => setTimeout(resolve, 250));
            const response = await send('Runtime.evaluate', {
                expression: `(() => {
                    const card = [...document.querySelectorAll('#riznica-shop-container .card')]
                        .find(el => el.querySelector('.title')?.textContent?.includes(${JSON.stringify(focus.name)}));
                    if (card && document.querySelector('#riznica-screen')?.dataset.riznicaTab === ${JSON.stringify(focus.type)}) {
                        card.scrollIntoView({ block: 'center' });
                        return true;
                    }
                    return false;
                })()`, returnByValue: true
            });
            if (response.result?.value === true) break;
        }
        if (process.argv.includes('--capture')) {
            const decoded = await send('Runtime.evaluate', {
                expression: `(() => {
                    const card = [...document.querySelectorAll('#riznica-shop-container .card')]
                        .find(el => el.querySelector('.title')?.textContent?.includes(${JSON.stringify(focus.name)}));
                    const preview = card?.querySelector('.effect-preview-box');
                    const background = preview ? getComputedStyle(preview, '::before').backgroundImage : 'none';
                    const url = background.startsWith('url("') ? background.slice(5, -2) : '';
                    if (!url) return Promise.resolve(true);
                    const image = new Image(); image.src = url;
                    return image.decode().then(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve(true)))));
                })()`, awaitPromise: true, returnByValue: true
            });
            if (decoded.result?.value !== true) throw new Error(`Preview image did not decode: ${focus.name}`);
            const screenshot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
            const output = path.resolve(__dirname, '..', 'screenshots', 'green-ui-step9', `green-treasury-${focus.slug}-clay-cdp.png`);
            fs.writeFileSync(output, Buffer.from(screenshot.data, 'base64'));
            process.stderr.write(`Captured ${output}\n`);
        }
    }
    socket.close();
    if (!process.argv.includes('--quiet')) process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
    if (report.some(entry => entry.issues.length || entry.headings.length || entry.width[0] > entry.width[1] + 2
        || (entry.type === 'effect' && (entry.effectPreviews.length !== 14 || entry.effectPreviews.some(preview => preview.content !== '""' || preview.after !== 'none' || preview.children !== 0 || preview.opacity !== '1' || !preview.image.includes('canonical/treasury-effect-previews/') || !preview.surface.includes('radial-gradient')))))) process.exitCode = 1;
}

main().catch(error => { console.error(error); process.exitCode = 1; });
