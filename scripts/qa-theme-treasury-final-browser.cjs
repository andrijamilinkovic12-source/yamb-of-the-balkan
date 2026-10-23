// Optional live layout check. Run with NODE_PATH pointing to a Playwright install.
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { chromium } = require('playwright');

const edge = process.env.TREASURY_QA_BROWSER || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const entry = pathToFileURL(path.resolve(__dirname, '../www/index.html')).href;
const themes = ['dark', 'light', 'medium', 'winter', 'neon', 'amethyst', 'easter', 'desert', 'moon', 'severna'];
const viewports = [{ width: 320, height: 640 }, { width: 360, height: 780 }, { width: 412, height: 915 }];
const tabs = ['trophy', 'skin', 'effect', 'theme'];

(async () => {
    const browser = await chromium.launch({ headless: true, executablePath: edge, args: ['--no-sandbox'] });
    const failures = [];
    const rows = [];
    try {
        for (const viewport of viewports) {
            const page = await browser.newPage({ viewport, screen: viewport, isMobile: true, hasTouch: true, deviceScaleFactor: 1 });
            await page.goto(entry, { waitUntil: 'domcontentloaded', timeout: 30000 });
            await page.waitForFunction(() => window.app && window.riznicaManager, { timeout: 15000 });
            for (const theme of themes) {
                await page.evaluate(async id => {
                    localStorage.setItem('yamb_theme', id);
                    await window.app.applyTheme(id, { initialLoad: true });
                    window.riznicaManager.showRiznica();
                }, theme);
                for (const tab of tabs) {
                    await page.evaluate(id => window.riznicaManager.switchTab(id), tab);
                    await page.waitForFunction(() => [...document.querySelectorAll('#riznica-screen img')]
                        .filter(img => { const rect = img.getBoundingClientRect(); return rect.width && rect.height && rect.top < innerHeight && rect.bottom > 0; })
                        .every(img => img.complete), null, { timeout: 3000 });
                    const state = await page.evaluate(() => {
                        const screen = document.getElementById('riznica-screen');
                        const tabs = screen.querySelector('.riznica-tabs');
                        const cards = [...screen.querySelectorAll('.category-grid > .card')];
                        const bounds = tabs.getBoundingClientRect();
                        const overflow = [...screen.querySelectorAll('.card .title,.card .desc,.card .price,.card .status,.card .btn-action,.category-header')]
                            .filter(el => el.scrollWidth > el.clientWidth + 2 && getComputedStyle(el).overflowX !== 'auto')
                            .slice(0, 3).map(el => ({ className: el.className, text: el.textContent.trim().slice(0, 32) }));
                        const badImages = [...screen.querySelectorAll('img')]
                            .filter(img => { const rect = img.getBoundingClientRect(); return rect.width && rect.height && rect.top < innerHeight && rect.bottom > 0; })
                            .filter(img => img.currentSrc && (!img.complete || !img.naturalWidth))
                            .slice(0, 3).map(img => img.currentSrc);
                        return {
                            active: screen.classList.contains('active'),
                            visible: getComputedStyle(screen).display !== 'none' && getComputedStyle(screen).visibility !== 'hidden',
                            foregroundVisible: [80, Math.round(innerHeight / 2)]
                                .some(y => screen.contains(document.elementFromPoint(Math.round(innerWidth / 2), y))),
                            screenWidth: screen.scrollWidth,
                            viewportWidth: innerWidth,
                            tabLeft: Math.round(bounds.left), tabRight: Math.round(bounds.right),
                            cardCount: cards.length,
                            cardMinHeight: cards[0] ? getComputedStyle(cards[0]).minHeight : null,
                            cardPadding: cards[0] ? getComputedStyle(cards[0]).padding : null,
                            overflow, badImages
                        };
                    });
                    const label = `${viewport.width} ${theme}/${tab}`;
                    if (!state.active || !state.visible || !state.foregroundVisible || !state.cardCount || state.screenWidth > state.viewportWidth + 1
                        || state.tabLeft < -1 || state.tabRight > state.viewportWidth + 1 || state.overflow.length || state.badImages.length) {
                        failures.push({ label, state });
                    }
                    rows.push({ label, cards: state.cardCount, tab: [state.tabLeft, state.tabRight] });
                    if (process.env.TREASURY_QA_SCREENSHOTS && viewport.width === 360 && tab === 'trophy') {
                        await page.screenshot({ path: path.join(process.env.TREASURY_QA_SCREENSHOTS, `${theme}-treasury.png`) });
                    }
                }
                const notice = await page.evaluate(() => {
                    window.modalManager.setup('PROVERA', 'PROVERA', false);
                    const modal = document.getElementById('custom-modal-overlay');
                    window.showNotification('PROVERA', 'PROVERA');
                    const toast = document.querySelector('#custom-notification-container .custom-toast:last-child');
                    const state = {
                        modalContext: modal.classList.contains('modal-context-treasury'),
                        toastContext: toast?.classList.contains('treasury-notice') || false,
                        modalWidth: modal.querySelector('.custom-modal')?.getBoundingClientRect().width || 0,
                        toastWidth: toast?.getBoundingClientRect().width || 0
                    };
                    toast?.remove();
                    window.modalManager.close();
                    return state;
                });
                if (!notice.modalContext || !notice.toastContext
                    || notice.modalWidth > viewport.width - 12 || notice.toastWidth > viewport.width - 12) {
                    failures.push({ label: `${viewport.width} ${theme}/notice`, state: notice });
                }
            }
            await page.close();
        }
    } finally {
        await browser.close();
    }
    console.log(JSON.stringify({ states: rows.length, viewports, first: rows.slice(0, 4), failures }, null, 2));
    if (failures.length) process.exitCode = 1;
})().catch(error => { console.error(error); process.exitCode = 1; });
