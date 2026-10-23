// Optional browser QA for the mandatory tournament participation-rules dialog.
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const fs = require('node:fs');
const { chromium } = require('playwright');

const edge = process.env.TOURNAMENT_REGISTRATION_QA_BROWSER
    || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const entry = pathToFileURL(path.resolve(__dirname, '../www/index.html')).href;
const themes = ['dark', 'light', 'medium', 'winter', 'neon', 'amethyst', 'easter', 'desert', 'moon', 'severna'];
const languages = ['sr', 'en'];
const viewports = [{ width: 320, height: 640 }, { width: 360, height: 780 }];

function visible(rect, viewport) {
    return rect.width > 0 && rect.height > 0
        && rect.top >= -1 && rect.left >= -1
        && rect.right <= viewport.width + 1 && rect.bottom <= viewport.height + 1;
}

(async () => {
    const profileRoot = path.resolve(__dirname, '../tmp');
    fs.mkdirSync(profileRoot, { recursive: true });
    const profileDir = fs.mkdtempSync(path.join(profileRoot, 'tournament-registration-rules-qa-'));
    let context;
    const failures = [];
    const rows = [];

    try {
        context = await chromium.launchPersistentContext(profileDir, {
            headless: true,
            executablePath: edge,
            args: ['--no-sandbox']
        });

        for (const viewport of viewports) {
            const page = await context.newPage();
            await page.setViewportSize(viewport);
            await page.goto(entry, { waitUntil: 'domcontentloaded', timeout: 30000 });
            await page.waitForFunction(() => window.app?.tournamentManager, { timeout: 15000 });
            await page.evaluate(() => {
                document.documentElement.classList.remove('landscape-orientation-active');
                document.documentElement.classList.add('portrait-orientation-active');
            });
            await page.addStyleTag({ content: '* { animation: none !important; transition: none !important; }' });

            for (const language of languages) {
                for (const theme of themes) {
                    await page.evaluate(async ({ themeId, languageId }) => {
                        localStorage.setItem('yamb_theme', themeId);
                        localStorage.setItem('yamb_lang', languageId);
                        document.documentElement.lang = languageId;

                        await app.applyTheme(themeId, { initialLoad: true });
                        app.navigateTo('tournament-screen');

                        const manager = app.tournamentManager;
                        manager.state = {
                            status: 'registration',
                            tournamentNumber: 1,
                            players: [],
                            bracket: { qf: [], sf: [], f: [] },
                            finishedAt: null,
                            resetAt: null
                        };
                        manager.pendingRegistration = false;
                        manager.registrationRulesPromptOpen = false;
                        manager.activeTab = 'info';
                        manager.render();
                        window.__tournamentRulesDialog = manager.confirmTournamentParticipationRules(5500);
                    }, { themeId: theme, languageId: language });

                    await page.waitForFunction(() => {
                        const overlay = document.getElementById('custom-modal-overlay');
                        const trophy = overlay?.querySelector('.tourney-participation-rules__trophy');
                        return overlay?.style.display === 'flex' && trophy?.complete && trophy.naturalWidth > 0;
                    }, null, { timeout: 5000 });

                    const result = await page.evaluate(({ themeId, languageId }) => {
                        const rect = element => {
                            if (!element) return null;
                            const box = element.getBoundingClientRect();
                            return {
                                top: box.top,
                                right: box.right,
                                bottom: box.bottom,
                                left: box.left,
                                width: box.width,
                                height: box.height
                            };
                        };
                        const overlay = document.getElementById('custom-modal-overlay');
                        const modal = overlay?.querySelector('.custom-modal');
                        const title = document.getElementById('cm-title');
                        const message = document.getElementById('cm-msg');
                        const buttons = overlay?.querySelector('.cm-btn-group');
                        const accept = document.getElementById('cm-ok');
                        const decline = document.getElementById('cm-cancel');
                        const trophy = overlay?.querySelector('.tourney-participation-rules__trophy');
                        const rotateLock = document.getElementById('rotate-lock-overlay');
                        const allText = [...(modal?.querySelectorAll('p,.cm-btn') || [])];
                        const overflow = allText
                            .filter(element => element.scrollWidth > element.clientWidth + 1
                                && getComputedStyle(element).overflowX !== 'auto')
                            .map(element => element.className || element.id || element.tagName);
                        const expectedAsset = themeId === 'dark'
                            ? '/assets/green-soft-clay/'
                            : '/assets/theme-packs/' + themeId + '/';
                        const modalStyle = modal ? getComputedStyle(modal) : null;
                        const rulesStyle = message ? getComputedStyle(message.querySelector('.tourney-participation-rules')) : null;

                        return {
                            theme: themeId,
                            language: languageId,
                            overlayContext: overlay?.classList.contains('modal-context-tournament') || false,
                            rotateLockVisible: Boolean(rotateLock && getComputedStyle(rotateLock).display !== 'none'
                                && rotateLock.getBoundingClientRect().width > 0 && rotateLock.getBoundingClientRect().height > 0),
                            modal: rect(modal),
                            title: rect(title),
                            message: rect(message),
                            buttons: rect(buttons),
                            accept: rect(accept),
                            decline: rect(decline),
                            verticalOrder: Boolean(title && message && buttons
                                && title.getBoundingClientRect().bottom <= message.getBoundingClientRect().top + 1
                                && message.getBoundingClientRect().bottom <= buttons.getBoundingClientRect().top + 1),
                            expectedText: languageId === 'en'
                                ? [accept?.textContent?.trim(), decline?.textContent?.trim()]
                                    .join('|') === 'I ACCEPT THE RULES|I DO NOT ACCEPT'
                                : [accept?.textContent?.trim(), decline?.textContent?.trim()]
                                    .join('|') === 'PRIHVATAM PRAVILA|NE PRIHVATAM',
                            trophyLoaded: Boolean(trophy?.complete && trophy.naturalWidth > 0),
                            trophyTheme: trophy?.currentSrc.includes(expectedAsset) || false,
                            overflow,
                            modalColor: modalStyle?.color || '',
                            rulesFont: rulesStyle?.fontFamily || ''
                        };
                    }, { themeId: theme, languageId: language });

                    const valid = result.overlayContext
                        && !result.rotateLockVisible
                        && visible(result.modal, viewport)
                        && visible(result.title, viewport)
                        && visible(result.message, viewport)
                        && visible(result.buttons, viewport)
                        && visible(result.accept, viewport)
                        && visible(result.decline, viewport)
                        && result.verticalOrder
                        && result.expectedText
                        && result.trophyLoaded
                        && result.trophyTheme
                        && result.overflow.length === 0
                        && result.modalColor !== 'rgba(0, 0, 0, 0)'
                        && /montserrat/i.test(result.rulesFont);

                    if (!valid) failures.push({ viewport, result });
                    rows.push({
                        viewport: viewport.width + 'x' + viewport.height,
                        theme,
                        language,
                        modal: result.modal ? [Math.round(result.modal.width), Math.round(result.modal.height)] : null,
                        trophyTheme: result.trophyTheme,
                        overflow: result.overflow
                    });

                    if (process.env.TOURNAMENT_REGISTRATION_QA_SCREENSHOTS && viewport.width === 360) {
                        await page.screenshot({
                            path: path.join(
                                process.env.TOURNAMENT_REGISTRATION_QA_SCREENSHOTS,
                                theme + '-' + language + '-tournament-registration-rules.png'
                            )
                        });
                    }

                    await page.evaluate(async () => {
                        document.getElementById('cm-cancel').click();
                        await window.__tournamentRulesDialog;
                        window.__tournamentRulesDialog = null;
                    });
                }
            }
            await page.close();
        }
    } finally {
        await context?.close();
        fs.rmSync(profileDir, { recursive: true, force: true });
    }

    console.log(JSON.stringify({
        checks: rows.length,
        first: rows.slice(0, 4),
        failureCount: failures.length,
        failures: failures.slice(0, 8)
    }, null, 2));
    if (failures.length) process.exitCode = 1;
})().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
