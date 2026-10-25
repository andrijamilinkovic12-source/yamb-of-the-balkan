// managers.js - COMPLETE LOGIC (MANAGERS, UI, AUDIO, ADS, EFFECTS)

// --- 0. POMOĆNE FUNKCIJE ---
const getLang = () => localStorage.getItem('yamb_lang') || 'sr';
const _safeT = (key) => (typeof t !== 'undefined' ? t(key) : key);
const resolveText = (data) => {
    const lang = getLang();
    if (typeof data === 'object' && data !== null) {
        return data[lang] || data['sr'] || "";
    }
    return data; 
};
const YAMB_THEME_IDS = ['dark', 'light', 'medium', 'winter', 'neon', 'amethyst', 'easter', 'desert', 'moon', 'severna'];
const YAMB_FREE_THEME_IDS = ['dark', 'light', 'medium', 'winter'];
// The coin artwork stays canonical; these profiles only control atmosphere and motion.
const GOLD_RAIN_THEME_PROFILES = Object.freeze({
    dark:     { glow: '163, 200, 145', glint: '246, 245, 217', drift: 0.68, spin: 0.53 },
    light:    { glow: '243, 214, 168', glint: '255, 241, 215', drift: 0.64, spin: 0.46 },
    medium:   { glow: '227, 154, 112', glint: '241, 195, 178', drift: 0.56, spin: 0.50 },
    winter:   { glow: '109, 155, 168', glint: '255, 244, 229', drift: 0.82, spin: 0.55 },
    neon:     { glow: '86, 229, 210',  glint: '240, 140, 227', drift: 0.78, spin: 0.60 },
    amethyst: { glow: '214, 145, 181', glint: '242, 200, 121', drift: 0.58, spin: 0.48 },
    easter:   { glow: '135, 147, 115', glint: '255, 248, 234', drift: 0.66, spin: 0.46 },
    desert:   { glow: '215, 146, 105', glint: '255, 240, 218', drift: 0.52, spin: 0.45 },
    moon:     { glow: '167, 169, 184', glint: '245, 245, 247', drift: 0.43, spin: 0.42 },
    severna:  { glow: '138, 227, 228', glint: '195, 172, 234', drift: 0.72, spin: 0.52 }
});
const FIREFLY_THEME_GLOW = Object.freeze({
    dark: '211, 244, 110', light: '255, 207, 111', medium: '255, 172, 121',
    winter: '129, 229, 219', neon: '86, 229, 210', amethyst: '242, 200, 121',
    easter: '255, 211, 132', desert: '113, 217, 196', moon: '225, 226, 231',
    severna: '138, 227, 228'
});
// Fine alignment of the moving lens with the void in each original PNG.
const BLACK_HOLE_CORE_POSITION = Object.freeze({
    dark: [54, 49], light: [50, 49], medium: [53, 51], winter: [52, 55],
    neon: [49, 48], amethyst: [55, 50], easter: [49, 51], desert: [51, 50],
    moon: [55, 56], severna: [49, 49]
});
// Supernova shares each theme's light language; its PNG is a brief plasma texture inside a live expanding blast.
const SUPERNOVA_THEME_PROFILES = Object.freeze({
    dark:     { main: '163, 200, 145', accent: '246, 245, 217', shade: '16, 37, 25' },
    light:    { main: '243, 214, 168', accent: '255, 241, 215', shade: '68, 49, 37' },
    medium:   { main: '227, 154, 112', accent: '241, 195, 178', shade: '60, 25, 39' },
    winter:   { main: '109, 155, 168', accent: '255, 244, 229', shade: '18, 44, 61' },
    neon:     { main: '86, 229, 210', accent: '240, 140, 227', shade: '8, 16, 27' },
    amethyst: { main: '214, 145, 181', accent: '242, 200, 121', shade: '39, 24, 58' },
    easter:   { main: '135, 147, 115', accent: '255, 248, 234', shade: '51, 42, 65' },
    desert:   { main: '215, 146, 105', accent: '255, 240, 218', shade: '53, 37, 31' },
    moon:     { main: '167, 169, 184', accent: '245, 245, 247', shade: '23, 26, 39' },
    severna:  { main: '138, 227, 228', accent: '195, 172, 234', shade: '23, 36, 58' }
});
const filterYambThemeIds = (items = []) => Array.isArray(items)
    ? items.filter(item => YAMB_THEME_IDS.includes(item))
    : [];
const getActiveGameLogoSource = () => {
    const theme = document.documentElement?.dataset?.splashTheme || localStorage.getItem('yamb_theme') || 'dark';
    return window.app?.getThemeSplashSource?.(theme)
        || document.getElementById('theme-splash-clay-title')?.getAttribute('src')
        || 'assets/green-soft-clay/splash-title-soft-clay-v2.png?v=1';
};

// --- 1. STATE MANAGER ---
class StateManager {
    constructor() {
        this.currentPage = 'index';
        this.pages = { 'index': 'main-menu', 'kockice': 'game-container', 'riznica': 'riznica-container' };
    }
    navigateTo(pageId) { console.log(`Navigating to: ${pageId}`); }
}

// --- 2. STATS MANAGER (FIXED & UNIFIED) ---
class StatsManager {
    constructor() {
        this.stats = this.loadStats() || {
            games: 0, totalGames: 0, wins: 0, losses: 0, currentWinStreak: 0, maxWinStreak: 0, currentLossStreak: 0, 
            balance: 1000, unlockedTrophies: [], highscore: 0, totalScoreSum: 0, penaltyPoints: 0,
            tournamentWins: 0 
        };
        
        // Osiguraj da imamo i games i totalGames zbog kompatibilnosti
        if (this.stats.totalGames && !this.stats.games) this.stats.games = this.stats.totalGames;
        this.stats.totalGames = this.stats.games;

        const legacyBalance = parseInt(localStorage.getItem('yamb_dukati'));
        if (!isNaN(legacyBalance) && legacyBalance > this.stats.balance) {
            this.stats.balance = legacyBalance;
        }
        
        this.selfHealTrophies();
        this.previousBalance = this.stats.balance; 
    }
    
    loadStats() { 
        try { 
            // 1. Pokušavamo da učitamo glavni yamb_stats
            let s = JSON.parse(localStorage.getItem('yamb_stats')); 
            
            // 2. Ako ne postoji, radimo MIGARCIJU sa starog diceGameStats (da igrači ne izgube podatke)
            if (!s) {
                let staroS = JSON.parse(localStorage.getItem('diceGameStats'));
                if (staroS) {
                    s = staroS;
                    s.games = staroS.totalGames || 0;
                    localStorage.setItem('yamb_stats', JSON.stringify(s));
                }
            }

            if (s) {
                if (s.highScore) s.highscore = Math.max(Number(s.highscore) || 0, Number(s.highScore) || 0);
                if (s.totalGames && !s.games) s.games = s.totalGames;
            }
            return s;
        } catch(e) { return null; } 
    }
    
    selfHealTrophies() {
        let changed = false;
        const s = this.stats;
        const t = s.unlockedTrophies || [];

        if (s.games > 0 && !t.includes('first_play')) { t.push('first_play'); changed = true; }
        if (s.games >= 10 && !t.includes('apprentice')) { t.push('apprentice'); changed = true; }
        if (s.games >= 50 && !t.includes('veteran')) { t.push('veteran'); changed = true; }
        if (s.highscore >= 1000 && !t.includes('score_1000')) { t.push('score_1000'); changed = true; }

        s.unlockedTrophies = t;

        let riznicaList = JSON.parse(localStorage.getItem('yamb_unlocked')) || ['default', 'confetti', 'dark'];
        t.forEach(trophy => {
            if (!riznicaList.includes(trophy)) {
                riznicaList.push(trophy);
                changed = true;
            }
        });

        if (changed) {
            console.log("🛠️ StatsManager: Izvršena popravka trofeja!");
            localStorage.setItem('yamb_unlocked', JSON.stringify(riznicaList));
            this.saveStats();
        }
    }
    
    saveStats() { 
        // Sinhronizacija totalGames i games pre čuvanja (zbog kompatibilnosti unazad)
        this.stats.totalGames = this.stats.games;

        // ČUVAMO SVE U JEDINSTVENI KLJUČ: yamb_stats
        localStorage.setItem('yamb_stats', JSON.stringify(this.stats)); 
        localStorage.setItem('yamb_dukati', this.stats.balance);
        
        if(this.stats.unlockedTrophies && this.stats.unlockedTrophies.length > 0) {
            let riznicaList = JSON.parse(localStorage.getItem('yamb_unlocked')) || ['default', 'confetti', 'dark'];
            let updated = false;
            this.stats.unlockedTrophies.forEach(tr => {
                if(!riznicaList.includes(tr)) {
                    riznicaList.push(tr);
                    updated = true;
                }
            });
            if(updated) localStorage.setItem('yamb_unlocked', JSON.stringify(riznicaList));
        }
    }
    
    update(gameState) {
        this.previousBalance = this.stats.balance;
        this.stats.games++;
        this.stats.totalGames = this.stats.games;
        if (gameState.won) { this.stats.wins++; this.stats.currentWinStreak++; this.stats.currentLossStreak = 0; } 
        else { this.stats.losses++; this.stats.currentLossStreak++; this.stats.currentWinStreak = 0; }
        this.stats.balance = gameState.balance;
        this.saveStats();
    }
    
    unlockTrophy(trophyId) {
        if (!this.stats.unlockedTrophies.includes(trophyId)) {
            this.stats.unlockedTrophies.push(trophyId);
            this.saveStats(); 
            return true;
        }
        return false;
    }
    
    getStats() { return this.stats; }
}

// --- 3. MODAL MANAGER (UI) ---
class ModalManager {
    constructor() { this.previousFocus = null; }

    get elements() {
        return {
            overlay: document.getElementById('custom-modal-overlay'),
            title: document.getElementById('cm-title'),
            msg: document.getElementById('cm-msg'),
            input: document.getElementById('cm-input'),
            btnCancel: document.getElementById('cm-cancel'),
            btnOk: document.getElementById('cm-ok'),
            btnClose: document.getElementById('cm-close')
        };
    }

    alert(text, title, options = {}) {
        const safeTitle = title || _safeT('modal_title_info') || "OBAVEŠTENJE";
        return new Promise(resolve => {
            const els = this.elements;
            if(!els.overlay) { console.warn("Modal overlay missing! Alert:", text); resolve(true); return; } 
            
            this.setup(safeTitle, text, false, options);
            els.btnOk.onclick = () => { this.close(); resolve(true); };
            this.open();
        });
    }

    confirm(text, options = {}) {
        const safeTitle = options.title || _safeT('modal_title_confirm') || "POTVRDA";
        return new Promise(resolve => {
            const els = this.elements;
            if(!els.overlay) { console.warn("Modal overlay missing! Confirm:", text); resolve(false); return; }
            
            this.setup(safeTitle, text, false, options);
            els.btnCancel.classList.remove('hidden');
            if (options.okText && els.btnOk) els.btnOk.innerText = options.okText;
            if (options.cancelText && els.btnCancel) els.btnCancel.innerText = options.cancelText;
            
            els.btnOk.onclick = () => { this.close(); resolve(true); };
            els.btnCancel.onclick = () => { this.close(); resolve(false); };
            this.open();
        });
    }

    prompt(text, options = {}) {
        const safeTitle = _safeT('modal_title_input') || "UNOS";
        return new Promise(resolve => {
            const els = this.elements;
            if(!els.overlay) { console.warn("Modal overlay missing! Prompt:", text); resolve(null); return; }
            
            this.setup(safeTitle, text, true, options);
            
            els.btnOk.onclick = () => { 
                const val = els.input.value; 
                this.close(); 
                resolve(val); 
            };
            if (options.cancellable && els.btnClose) {
                els.btnClose.onclick = () => {
                    this.close();
                    resolve(null);
                };
            }
            this.open();
        });
    }

    setup(title, msg, hasInput, options = {}) {
        const els = this.elements;
        if(!els.overlay) return;

        [...els.overlay.classList]
            .filter(className => className.startsWith('modal-context-'))
            .forEach(className => els.overlay.classList.remove(className));
        const economyOpen = document.getElementById('undo-menu-overlay')?.style.display === 'flex';
        const treasuryOpen = document.getElementById('riznica-screen')?.classList.contains('active');
        const tournamentOpen = document.getElementById('tournament-screen')?.classList.contains('active');
        const contextClass = String(options.contextClass || (economyOpen ? 'economy' : treasuryOpen ? 'treasury' : tournamentOpen ? 'tournament' : ''))
            .replace(/[^a-zA-Z0-9_-]/g, '');
        if (contextClass) els.overlay.classList.add(`modal-context-${contextClass}`);
        if (contextClass === 'tourney-winner' || contextClass === 'tourney-finalist') {
            els.overlay.classList.add('modal-context-tournament');
        }

        if(els.title) els.title.innerText = title;
        if(els.msg) els.msg.innerHTML = msg; 
        
        if(els.btnCancel) els.btnCancel.classList.add('hidden');
        if(els.btnClose) {
            els.btnClose.classList.toggle('hidden', !options.cancellable);
            els.btnClose.onclick = null;
        }
        if(hasInput && els.input) { els.input.classList.remove('hidden'); els.input.value = ""; els.input.focus(); } 
        else if (els.input) { els.input.classList.add('hidden'); }
        
        if(typeof t !== 'undefined') {
            if(els.btnOk) els.btnOk.innerText = t('modal_btn_ok') || "U REDU";
            if(els.btnCancel) els.btnCancel.innerText = t('modal_btn_cancel') || "OTKAŽI";
        }
    }

    open() {
        const els = this.elements;
        if (!els.overlay) return;
        this.previousFocus = document.activeElement;
        els.overlay.style.display = 'flex';
        const target = els.input && !els.input.classList.contains('hidden') ? els.input
            : els.btnCancel && !els.btnCancel.classList.contains('hidden') ? els.btnCancel : els.btnOk;
        target?.focus({ preventScroll: true });
    }
    close() {
        const els = this.elements;
        if (els.overlay) els.overlay.style.display = 'none';
        if (this.previousFocus?.isConnected) this.previousFocus.focus({ preventScroll: true });
        this.previousFocus = null;
    }
}

// --- 4. EFFECT MANAGER (VISUALS) ---
class EffectManager {
    constructor() {
        this.activeEffects = [];
        this.confettiAnimationId = null;
        this.confettiRunId = 0;
        this.confettiSpritePromises = {};
        this.goldRainThemeObserver = null;
        this.greenDucatParticleSpritePromise = null;
        this.goldRainRunId = 0;
        this.fireflyRunId = 0;
        this.fireflySpritePromises = {};
        this.fireflyThemeObserver = null;
        this.bubbleRunId = 0;
        this.bubbleSpritePromises = {};
        this.bubbleThemeObserver = null;
        this.royalYambRunId = 0;
        this.royalCanvasCleanup = null;
        this.supernovaCanvasCleanup = null;
        this.supernovaRunId = 0;
        this.supernovaSpritePromises = {};
        this.effectTimeouts = [];
        this.iceAgeRunId = 0;
        this.iceAgeAssetsPromise = null;
        this.blackHoleRunId = 0;
        this.blackHoleSpritePromises = {};
        this.blackHoleCleanup = null;
        this.stageScene = null;
    }
    
    applyPermanent(type) {
        this.stop(); 
        if (!type || type === 'none') return;
        if (LIVE_STAGE_EFFECT_IDS.includes(type)) LiveEffectsStage.preload(type, this.getGoldRainThemeId()).catch(error => console.warn(error));
        if (type === 'black_hole') this.loadBlackHoleSprite(this.getGoldRainThemeId());
        if (type === 'supernova') this.loadSupernovaSprite(this.getGoldRainThemeId());
    }

    loadIceAgeAssets() {
        return LiveEffectsStage.preload('ice_age', this.getGoldRainThemeId());
    }

    async spawnStageEffect(type) {
        this.stageScene?.stop();
        const scene = new LiveEffectsStage(this, type);
        this.stageScene = scene;
        try { await scene.start(); }
        catch (error) { scene.stop(); console.warn(`Effect failed: ${type}`, error); }
    }

    spawnIceAge() {
        return this.spawnStageEffect('ice_age');
    }

    loadBlackHoleSprite(theme = this.getGoldRainThemeId()) {
        if (!YAMB_THEME_IDS.includes(theme)) return Promise.resolve(null);
        for (const cachedTheme of Object.keys(this.blackHoleSpritePromises)) {
            if (cachedTheme !== theme) delete this.blackHoleSpritePromises[cachedTheme];
        }
        if (this.blackHoleSpritePromises[theme]) return this.blackHoleSpritePromises[theme];
        const source = `assets/effects/black-hole/${theme}-core-v1.png`;
        this.blackHoleSpritePromises[theme] = new Promise(resolve => {
            const sprite = new Image();
            sprite.decoding = 'async';
            sprite.onload = () => resolve(sprite);
            sprite.onerror = () => {
                delete this.blackHoleSpritePromises[theme];
                console.warn(`Black Hole PNG failed: ${source}`);
                resolve(null);
            };
            sprite.src = source;
        });
        return this.blackHoleSpritePromises[theme];
    }

    async spawnBlackHole() {
        const runId = ++this.blackHoleRunId;
        const theme = this.getGoldRainThemeId();
        this.clearEffectTimeouts('black_hole');
        this.blackHoleCleanup?.();
        const sprite = await this.loadBlackHoleSprite(theme);
        if (!sprite || runId !== this.blackHoleRunId || theme !== this.getGoldRainThemeId()) return;

        const tables = [...document.querySelectorAll('.player-table')];
        const targetTable = tables.find(table => table.style.opacity === '1' || table.style.borderColor.includes('gold') || table.style.borderColor.includes('224')) || tables[0];
        if (!targetTable) return;
        const rect = targetTable.getBoundingClientRect();
        const reduced = Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
        const duration = reduced ? 2600 : 5800;
        const size = Math.max(140, Math.min(rect.width * 0.58, 230));
        const scene = document.createElement('div');
        scene.className = `black-hole-container${reduced ? ' black-hole-container--reduced' : ''}`;
        scene.setAttribute('aria-hidden', 'true');
        scene.style.setProperty('--bh-x', `${rect.left + rect.width / 2}px`);
        scene.style.setProperty('--bh-y', `${rect.top + rect.height / 2}px`);
        scene.style.setProperty('--bh-size', `${size}px`);
        scene.style.setProperty('--bh-lens-width', `${size * 1.15}px`);
        scene.style.setProperty('--bh-lens-height', `${size * 0.63}px`);
        scene.style.setProperty('--bh-glow', GOLD_RAIN_THEME_PROFILES[theme].glow);
        scene.style.setProperty('--bh-glint', GOLD_RAIN_THEME_PROFILES[theme].glint);
        const [coreX, coreY] = BLACK_HOLE_CORE_POSITION[theme];
        scene.style.setProperty('--bh-core-x', `${coreX}%`);
        scene.style.setProperty('--bh-core-y', `${coreY}%`);
        const atmosphere = document.createElement('div');
        atmosphere.className = 'black-hole-atmosphere';
        const orbit = document.createElement('div');
        orbit.className = 'black-hole-orbit';
        const image = document.createElement('img');
        image.className = 'black-hole-sprite';
        image.src = sprite.src;
        image.alt = '';
        image.decoding = 'async';
        orbit.appendChild(image);
        scene.append(atmosphere, orbit);

        if (!reduced) {
            for (const name of ['outer', 'inner']) {
                const stream = document.createElement('span');
                stream.className = `black-hole-stream black-hole-stream--${name}`;
                orbit.appendChild(stream);
            }
            for (let i = 0; i < 2; i++) {
                const lens = document.createElement('span');
                lens.className = `black-hole-lens black-hole-lens--${i + 1}`;
                scene.appendChild(lens);
            }
            const fragment = document.createDocumentFragment();
            for (let i = 0; i < 16; i++) {
                const particle = document.createElement('span');
                particle.className = 'black-hole-particle';
                const angle = (i * 2.39996) + 0.3;
                const radius = size * (0.62 + (i % 4) * 0.15);
                particle.style.setProperty('--bh-start-x', `${Math.cos(angle) * radius}px`);
                particle.style.setProperty('--bh-start-y', `${Math.sin(angle) * radius}px`);
                particle.style.setProperty('--bh-mid-x', `${Math.cos(angle + 1.35) * radius * 0.62}px`);
                particle.style.setProperty('--bh-mid-y', `${Math.sin(angle + 1.35) * radius * 0.62}px`);
                particle.style.setProperty('--bh-near-x', `${Math.cos(angle + 3.05) * radius * 0.26}px`);
                particle.style.setProperty('--bh-near-y', `${Math.sin(angle + 3.05) * radius * 0.26}px`);
                particle.style.setProperty('--bh-delay', `${(i % 6) * 0.27}s`);
                particle.style.setProperty('--bh-particle-size', `${i % 3 === 0 ? 4 : 3}px`);
                fragment.appendChild(particle);
            }
            scene.appendChild(fragment);
            targetTable.classList.add('anim-black-hole-table');
        }
        document.body.appendChild(scene);

        let observer = null;
        const cleanup = () => {
            observer?.disconnect();
            scene.remove();
            targetTable.classList.remove('anim-black-hole-table');
            if (this.blackHoleCleanup === cleanup) this.blackHoleCleanup = null;
        };
        this.blackHoleCleanup = cleanup;
        if (typeof MutationObserver !== 'undefined') {
            observer = new MutationObserver(() => {
                if (theme !== this.getGoldRainThemeId()) {
                    ++this.blackHoleRunId;
                    cleanup();
                }
            });
            observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });
            observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-splash-theme'] });
        }
        this.scheduleEffectTimeout(() => {
            if (runId === this.blackHoleRunId) cleanup();
        }, duration, 'black_hole');
    }

    loadSupernovaSprite(theme = this.getGoldRainThemeId()) {
        if (!YAMB_THEME_IDS.includes(theme)) return Promise.resolve(null);
        for (const cachedTheme of Object.keys(this.supernovaSpritePromises)) {
            if (cachedTheme !== theme) delete this.supernovaSpritePromises[cachedTheme];
        }
        if (this.supernovaSpritePromises[theme]) return this.supernovaSpritePromises[theme];
        const source = `assets/effects/supernova/${theme}-plasma-v2.png`;
        this.supernovaSpritePromises[theme] = new Promise(resolve => {
            const image = new Image();
            image.decoding = 'async';
            image.onload = () => resolve(image);
            image.onerror = () => {
                delete this.supernovaSpritePromises[theme];
                console.warn(`Supernova PNG failed: ${source}`);
                resolve(null);
            };
            image.src = source;
        });
        return this.supernovaSpritePromises[theme];
    }

    async spawnSupernova() {
        const runId = ++this.supernovaRunId;
        this.supernovaCanvasCleanup?.();
        const theme = this.getGoldRainThemeId();
        const sprite = await this.loadSupernovaSprite(theme);
        if (!sprite || runId !== this.supernovaRunId || theme !== this.getGoldRainThemeId()) return;

        const table = [...document.querySelectorAll('.player-table')]
            .find(node => node.style.opacity === '1') || document.querySelector('.player-table');
        const reduced = Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
        const mobile = window.innerWidth <= 760 || Boolean(window.matchMedia?.('(hover: none) and (pointer: coarse)').matches);
        const duration = reduced ? 1150 : 5000;
        const ignitionAt = reduced ? 190 : 560;
        const profile = SUPERNOVA_THEME_PROFILES[theme];
        const overlay = document.createElement('div');
        overlay.className = 'supernova-container';
        overlay.dataset.theme = theme;
        overlay.dataset.phase = 'compression';
        overlay.innerHTML = '<canvas class="sn-canvas"></canvas><img class="supernova-plasma" alt="" aria-hidden="true">';
        document.body.appendChild(overlay);
        const canvas = overlay.querySelector('canvas');
        const plasma = overlay.querySelector('img');
        plasma.src = sprite.src;
        const ctx = canvas.getContext('2d');
        if (!ctx) { overlay.remove(); return; }

        const clamp = value => Math.max(0, Math.min(1, value));
        const ease = value => 1 - Math.pow(1 - clamp(value), 3);
        const rgba = (rgb, alpha) => `rgba(${rgb},${clamp(alpha)})`;
        const center = { x: 0, y: 0 };
        let width = 0;
        let height = 0;
        let farthest = 0;
        let rafId = 0;
        let lastDraw = 0;
        const resize = () => {
            width = window.innerWidth;
            height = window.innerHeight;
            const rect = table?.getBoundingClientRect();
            center.x = rect ? rect.left + rect.width / 2 : width / 2;
            center.y = rect ? rect.top + rect.height / 2 : height / 2;
            plasma.style.left = `${center.x}px`;
            plasma.style.top = `${center.y}px`;
            farthest = Math.hypot(Math.max(center.x, width - center.x), Math.max(center.y, height - center.y));
            const dpr = Math.min(window.devicePixelRatio || 1, mobile ? 1.2 : 1.5);
            canvas.width = Math.round(width * dpr);
            canvas.height = Math.round(height * dpr);
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        };
        resize();
        window.addEventListener('resize', resize, { passive: true });
        if (!reduced) {
            table?.classList.add('anim-supernova-table');
            table?.style.setProperty('--sn-main', profile.main);
            if (mobile) table?.classList.add('anim-supernova-table--compact');
        }

        const jitter = seed => {
            const value = Math.sin(seed * 127.1 + 78.233) * 43758.5453;
            return value - Math.floor(value);
        };
        const particleCount = reduced ? 0 : mobile ? 58 : 92;
        const particles = Array.from({ length: particleCount }, (_, index) => ({
            angle: index * 2.399963229728653 + (jitter(index + 3) - 0.5) * 0.37,
            drift: (jitter(index + 57) - 0.5) * 0.17,
            reach: 0.53 + jitter(index + 19) * 0.55,
            delay: jitter(index + 31) * 250,
            lifetime: 2100 + jitter(index + 77) * 2400,
            size: index % 11 === 0 ? 3.1 : 0.9 + jitter(index + 11) * 1.7,
            hue: index % 5 === 0 ? profile.accent : profile.main
        }));
        // Fine ejecta travel at different speeds and keep drifting after the bright front has passed.
        const dustCount = reduced ? 0 : mobile ? 115 : 210;
        const dust = Array.from({ length: dustCount }, (_, index) => ({
            angle: index * 2.399963229728653 + jitter(index + 401) * 0.5,
            reach: 0.16 + jitter(index + 433) * 0.93,
            delay: jitter(index + 449) * 780,
            lifetime: 2700 + jitter(index + 467) * 2300,
            size: 0.45 + jitter(index + 479) * 1.25,
            wobble: (jitter(index + 491) - 0.5) * 18,
            tint: index % 4 === 0 ? profile.accent : profile.main
        }));
        const filaments = Array.from({ length: reduced ? 0 : mobile ? 15 : 23 }, (_, index) => ({
            angle: index * 2.399963229728653 + (jitter(index + 703) - 0.5) * 0.4,
            reach: 0.53 + jitter(index + 721) * 0.44,
            bend: (jitter(index + 739) - 0.5) * 0.13,
            delay: jitter(index + 757) * 150,
            tint: index % 3 === 0 ? profile.accent : profile.main
        }));
        const cleanup = () => {
            cancelAnimationFrame(rafId);
            window.removeEventListener('resize', resize);
            table?.classList.remove('anim-supernova-table', 'anim-supernova-table--compact');
            table?.style.removeProperty('--sn-main');
            overlay.remove();
            if (this.supernovaCanvasCleanup === cleanup) this.supernovaCanvasCleanup = null;
        };
        this.supernovaCanvasCleanup = cleanup;

        const draw = start => now => {
            if (runId !== this.supernovaRunId || !overlay.isConnected) return;
            if (theme !== this.getGoldRainThemeId()) { cleanup(); return; }
            if (mobile && lastDraw && now - lastDraw < 26) {
                rafId = requestAnimationFrame(draw(start));
                return;
            }
            lastDraw = now;
            const elapsed = Math.min(now - start, duration);
            const blastTime = Math.max(0, elapsed - ignitionAt);
            const fadeLength = reduced ? 260 : 900;
            const endFade = 1 - ease((elapsed - (duration - fadeLength)) / fadeLength);
            const compression = ease(elapsed / ignitionAt);
            const flash = Math.sin(clamp(blastTime / (reduced ? 420 : 680)) * Math.PI);
            overlay.dataset.phase = elapsed < ignitionAt ? 'compression'
                : elapsed < ignitionAt + 850 ? 'blast'
                    : elapsed < duration - fadeLength ? 'ejecta' : 'fade';
            ctx.clearRect(0, 0, width, height);
            ctx.globalCompositeOperation = 'source-over';

            // A brief dip in ambient light makes the ignition readable without hiding scores.
            ctx.fillStyle = rgba(profile.shade, (0.09 + 0.08 * compression) * endFade);
            ctx.fillRect(0, 0, width, height);
            ctx.globalCompositeOperation = 'screen';

            // The pre-blast core is drawn, not a static PNG object.
            if (elapsed < ignitionAt) {
                const radius = 38 - compression * 27;
                const coreGlow = ctx.createRadialGradient(center.x, center.y, 0, center.x, center.y, radius * 2.6);
                coreGlow.addColorStop(0, rgba(profile.accent, (0.5 + compression * 0.45) * endFade));
                coreGlow.addColorStop(0.21, rgba(profile.main, 0.29 * endFade));
                coreGlow.addColorStop(1, rgba(profile.main, 0));
                ctx.fillStyle = coreGlow;
                ctx.beginPath();
                ctx.arc(center.x, center.y, radius * 2.6, 0, Math.PI * 2);
                ctx.fill();
            }

            if (blastTime > 0) {
                // The pressure front outruns the slower gas. It is broad and slightly uneven, not a drawn circle.
                const waveLife = clamp(blastTime / (reduced ? 620 : 2200));
                const waveRadius = 12 + ease(waveLife) * farthest * 1.09;
                const shellWidth = Math.max(24, waveRadius * 0.19);
                const shellAlpha = Math.pow(1 - waveLife, 0.45) * clamp(blastTime / 190) * endFade;
                if (shellAlpha > 0) {
                    const shell = ctx.createRadialGradient(
                        center.x, center.y, Math.max(0, waveRadius - shellWidth * 1.55),
                        center.x, center.y, waveRadius + shellWidth
                    );
                    shell.addColorStop(0, rgba(profile.main, 0));
                    shell.addColorStop(0.32, rgba(profile.main, 0.06 * shellAlpha));
                    shell.addColorStop(0.59, rgba(profile.main, 0.16 * shellAlpha));
                    shell.addColorStop(0.76, rgba(profile.accent, 0.27 * shellAlpha));
                    shell.addColorStop(0.88, rgba(profile.main, 0.08 * shellAlpha));
                    shell.addColorStop(1, rgba(profile.main, 0));
                    ctx.fillStyle = shell;
                    ctx.beginPath();
                    ctx.arc(center.x, center.y, waveRadius + shellWidth, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.save();
                    ctx.strokeStyle = rgba(profile.accent, 0.24 * shellAlpha);
                    ctx.lineWidth = mobile ? 2.3 : 3.2;
                    ctx.shadowColor = rgba(profile.main, 0.4 * shellAlpha);
                    ctx.shadowBlur = mobile ? 12 : 18;
                    ctx.beginPath();
                    for (let segment = 0; segment <= 84; segment++) {
                        const angle = segment / 84 * Math.PI * 2;
                        const uneven = 1 + 0.018 * Math.sin(angle * 7 + 0.8)
                            + 0.013 * Math.sin(angle * 13 - 1.2);
                        const x = center.x + Math.cos(angle) * waveRadius * uneven;
                        const y = center.y + Math.sin(angle) * waveRadius * uneven;
                        if (segment === 0) ctx.moveTo(x, y);
                        else ctx.lineTo(x, y);
                    }
                    ctx.stroke();
                    ctx.restore();
                }

                // Gas continues expanding behind the fast shock front.
                if (!reduced) {
                    const gasLife = clamp(blastTime / 2950);
                    const gasRadius = 24 + ease(gasLife) * Math.min(farthest * 0.83, 670);
                    const gas = ctx.createRadialGradient(center.x, center.y, 0, center.x, center.y, gasRadius);
                    const gasAlpha = (1 - gasLife) * 0.21 * endFade;
                    gas.addColorStop(0, rgba(profile.accent, 0.18 * gasAlpha));
                    gas.addColorStop(0.35, rgba(profile.main, gasAlpha));
                    gas.addColorStop(0.68, rgba(profile.main, 0.42 * gasAlpha));
                    gas.addColorStop(1, rgba(profile.main, 0));
                    ctx.fillStyle = gas;
                    ctx.beginPath();
                    ctx.arc(center.x, center.y, gasRadius, 0, Math.PI * 2);
                    ctx.fill();
                }

                // A short volumetric flash leads the shell; it is not a persistent lens.
                if (flash > 0) {
                    const flareRadius = 90 + flash * Math.min(farthest * 0.92, 460);
                    const flare = ctx.createRadialGradient(center.x, center.y, 0, center.x, center.y, flareRadius);
                    flare.addColorStop(0, rgba(profile.accent, 0.62 * flash * endFade));
                    flare.addColorStop(0.18, rgba(profile.main, 0.36 * flash * endFade));
                    flare.addColorStop(0.55, rgba(profile.main, 0.12 * flash * endFade));
                    flare.addColorStop(1, rgba(profile.main, 0));
                    ctx.fillStyle = flare;
                    ctx.beginPath();
                    ctx.arc(center.x, center.y, flareRadius, 0, Math.PI * 2);
                    ctx.fill();
                }
            }

            // Faint plasma streams stretch from the ignition point and dissolve into ejecta.
            filaments.forEach(filament => {
                const life = clamp((blastTime - filament.delay) / 2650);
                if (!life || life >= 1) return;
                const reach = (1 - Math.exp(-3.1 * life)) * farthest * filament.reach;
                ctx.save();
                ctx.strokeStyle = rgba(filament.tint, 0.32 * Math.pow(1 - life, 1.2) * endFade);
                ctx.lineWidth = (mobile ? 2.2 : 3.4) * (1 - life * 0.65);
                ctx.shadowColor = rgba(filament.tint, 0.38 * endFade);
                ctx.shadowBlur = mobile ? 7 : 12;
                ctx.beginPath();
                for (let point = 0; point <= 8; point++) {
                    const fraction = point / 8;
                    const angle = filament.angle + filament.bend * fraction * fraction
                        + Math.sin(fraction * 8 + filament.angle * 3) * 0.018;
                    const radius = 7 + reach * fraction;
                    const x = center.x + Math.cos(angle) * radius;
                    const y = center.y + Math.sin(angle) * radius;
                    if (point === 0) ctx.moveTo(x, y);
                    else ctx.lineTo(x, y);
                }
                ctx.stroke();
                ctx.restore();
            });

            // Bright fragments have independent speeds, lifetimes and curved radial drift.
            particles.forEach(particle => {
                const life = clamp((blastTime - particle.delay) / particle.lifetime);
                if (!life || life >= 1) return;
                const angle = particle.angle + particle.drift * life * life;
                const radius = 13 + (1 - Math.exp(-3.4 * life)) * farthest * particle.reach;
                const x = center.x + Math.cos(angle) * radius;
                const y = center.y + Math.sin(angle) * radius;
                const alpha = Math.pow(Math.sin(life * Math.PI), 0.65) * 0.73 * endFade;
                const tail = 6 + (1 - life) * (particle.size > 3 ? 35 : 18);
                ctx.strokeStyle = rgba(particle.hue, alpha);
                ctx.lineWidth = Math.max(0.7, particle.size * (1 - life * 0.5));
                ctx.beginPath();
                ctx.moveTo(x - Math.cos(angle) * tail, y - Math.sin(angle) * tail);
                ctx.lineTo(x, y);
                ctx.stroke();
                ctx.fillStyle = rgba(profile.accent, alpha * 0.76);
                ctx.beginPath();
                ctx.arc(x, y, Math.max(0.65, particle.size * (1 - life * 0.4)), 0, Math.PI * 2);
                ctx.fill();
            });

            // Small, dim space dust gives the blast depth instead of reading as fireworks.
            dust.forEach(mote => {
                const life = clamp((blastTime - mote.delay) / mote.lifetime);
                if (!life || life >= 1) return;
                const radius = 8 + (1 - Math.exp(-3 * life)) * farthest * mote.reach;
                const angle = mote.angle + Math.sin(life * 4 + mote.angle) * 0.025;
                const x = center.x + Math.cos(angle) * radius + mote.wobble * life;
                const y = center.y + Math.sin(angle) * radius - mote.wobble * life * 0.4;
                const alpha = Math.pow(Math.sin(life * Math.PI), 0.7) * 0.39 * endFade;
                ctx.fillStyle = rgba(mote.tint, alpha);
                ctx.beginPath();
                ctx.arc(x, y, mote.size * (1 - life * 0.55), 0, Math.PI * 2);
                ctx.fill();
            });

            // The PNG is a moving texture: the plasma plume grows behind the particles and dissipates.
            const plumeLife = clamp(blastTime / (reduced ? 680 : 2950));
            const plumeAlpha = reduced
                ? Math.sin(plumeLife * Math.PI) * 0.42 * endFade
                : clamp(blastTime / 280) * Math.pow(1 - plumeLife, 0.72) * 0.72 * endFade;
            const plumeScale = 0.08 + (1 - Math.exp(-3.4 * plumeLife)) * (mobile ? 2.8 : 3.25);
            plasma.style.transform = `translate(-50%, -50%) scale(${plumeScale}) rotate(${plumeLife * 2}deg)`;
            plasma.style.opacity = String(clamp(plumeAlpha));

            ctx.globalCompositeOperation = 'source-over';
            if (elapsed < duration) rafId = requestAnimationFrame(draw(start));
            else cleanup();
        };
        rafId = requestAnimationFrame(now => draw(now)(now));
        this.scheduleEffectTimeout(() => {
            if (runId === this.supernovaRunId) cleanup();
        }, duration + 80, 'supernova');
    }

    trigger(type) {
        this.stop();
        if (type === 'ice_age') { void this.spawnIceAge(); return; }
        if (LIVE_STAGE_EFFECT_IDS.includes(type)) { void this.spawnStageEffect(type); return; }
        this.stageScene?.stop();
        if (type === 'confetti') this.spawnConfetti();
        if (type === 'gold_rain') this.spawnGoldRain();
        if (type === 'fireflies') this.spawnFireflies(52, 'fireflies');
        if (type === 'bubbles') this.spawnBubbles(35, 'bubbles');
        if (type === 'black_hole') void this.spawnBlackHole();
        if (type === 'supernova') void this.spawnSupernova();
    }

    getTargetTable() {
        let targetTable = null;
        const tables = document.querySelectorAll('.player-table');
        tables.forEach(tbl => {
            if (tbl.style.opacity === '1' || tbl.style.borderColor.includes('gold') || tbl.style.borderColor.includes('224')) {
                targetTable = tbl;
            }
        });

        if (!targetTable && window.app && Number.isInteger(window.app.currentPlayerIdx)) {
            targetTable = document.getElementById(`ptable-${window.app.currentPlayerIdx}`);
        }

        if (!targetTable && tables.length > 0) targetTable = tables[0];
        return targetTable;
    }

    scheduleEffectTimeout(callback, delay, group = 'default') {
        const timeoutId = setTimeout(() => {
            this.effectTimeouts = this.effectTimeouts.filter(entry => {
                const id = typeof entry === 'object' ? entry.id : entry;
                return id !== timeoutId;
            });
            callback();
        }, delay);
        this.effectTimeouts.push({ id: timeoutId, group });
        return timeoutId;
    }

    clearEffectTimeouts(group = null) {
        if (group) {
            this.effectTimeouts = this.effectTimeouts.filter(entry => {
                const timeoutId = typeof entry === 'object' ? entry.id : entry;
                const timeoutGroup = typeof entry === 'object' ? entry.group : 'default';
                if (timeoutGroup === group) {
                    clearTimeout(timeoutId);
                    return false;
                }
                return true;
            });
            return;
        }

        this.effectTimeouts.forEach(entry => clearTimeout(typeof entry === 'object' ? entry.id : entry));
        this.effectTimeouts = [];
        this.goldRainThemeObserver?.disconnect();
        this.goldRainThemeObserver = null;
    }

    isGreenThemeActive() {
        const activeTheme = document.documentElement?.dataset?.splashTheme
            || localStorage.getItem('yamb_theme')
            || 'dark';
        if (activeTheme !== 'dark') return false;

        return ![
            'light-theme',
            'medium-theme',
            'winter-theme',
            'neon-theme',
            'amethyst-theme',
            'easter-theme',
            'desert-theme',
            'moon-theme',
            'severna-theme'
        ].some(className => document.body?.classList.contains(className));
    }

    getGoldRainThemeId() {
        const bodyTheme = YAMB_THEME_IDS.slice(1).find(id => document.body?.classList.contains(`${id}-theme`));
        if (bodyTheme) return bodyTheme;
        const selected = document.documentElement?.dataset?.splashTheme || localStorage.getItem('yamb_theme');
        return YAMB_THEME_IDS.includes(selected) ? selected : 'dark';
    }

    loadGreenDucatParticleSprite() {
        if (this.greenDucatParticleSpritePromise) {
            return this.greenDucatParticleSpritePromise;
        }

        this.greenDucatParticleSpritePromise = new Promise(resolve => {
            const image = new Image();
            image.decoding = 'async';
            image.onload = () => resolve(image);
            image.onerror = () => {
                this.greenDucatParticleSpritePromise = null;
                resolve(null);
            };
            image.src = 'assets/green-soft-clay/canonical/ducat/ducat-particle-v1.png?v=1';
        });

        return this.greenDucatParticleSpritePromise;
    }

    loadThemeDucatParticleSprite(theme = this.getGoldRainThemeId()) {
        if (!YAMB_THEME_IDS.slice(1).includes(theme)) return Promise.resolve(null);
        this.themeDucatParticleSpritePromises ||= {};
        if (this.themeDucatParticleSpritePromises[theme]) return this.themeDucatParticleSpritePromises[theme];
        this.themeDucatParticleSpritePromises[theme] = new Promise(resolve => {
            const image = new Image();
            image.decoding = 'async';
            image.onload = () => resolve(image);
            image.onerror = () => {
                delete this.themeDucatParticleSpritePromises[theme];
                resolve(null);
            };
            image.src = `assets/theme-packs/${theme}/canonical/ducat/ducat-particle-v${['easter', 'desert', 'severna'].includes(theme) ? 2 : 1}.png`;
        });
        return this.themeDucatParticleSpritePromises[theme];
    }

    async spawnGoldRain() {
        const runId = ++this.goldRainRunId;
        const themeId = this.getGoldRainThemeId();
        const profile = GOLD_RAIN_THEME_PROFILES[themeId];
        const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
        const isCompact = window.innerWidth < 640;
        const totalDuration = reducedMotion ? 2700 : 5800;
        const rand = (min, max) => min + Math.random() * (max - min);

        this.clearEffectTimeouts('gold_rain');
        this.goldRainThemeObserver?.disconnect();
        this.goldRainThemeObserver = null;
        document.querySelectorAll('.gold-rain-atmosphere, .gold-rain-particles, .gold-rain-static-coin, .falling-coin.gold-rain-coin').forEach(el => el.remove());
        document.body.classList.remove('fx-gold-rain');

        let ducatSprite = themeId === 'dark'
            ? await this.loadGreenDucatParticleSprite()
            : await this.loadThemeDucatParticleSprite(themeId);
        if (runId !== this.goldRainRunId || themeId !== this.getGoldRainThemeId()) return;
        if (!ducatSprite) {
            const root = themeId === 'dark' ? 'assets/green-soft-clay/' : `assets/theme-packs/${themeId}/`;
            const version = ['easter', 'desert', 'severna'].includes(themeId) ? 2 : 1;
            ducatSprite = await new Promise(resolve => {
                const fallback = new Image();
                fallback.onload = () => resolve(fallback);
                fallback.onerror = () => resolve(null);
                fallback.src = `${root}canonical/ducat/ducat-front-v${version}.png`;
            });
        }
        if (runId !== this.goldRainRunId || themeId !== this.getGoldRainThemeId() || !ducatSprite) return;

        const atmosphere = document.createElement('div');
        atmosphere.className = 'gold-rain-atmosphere gold-rain-atmosphere--clear';
        atmosphere.style.setProperty('--gold-rain-glow', profile.glow);
        atmosphere.style.setProperty('--gold-rain-glint', profile.glint);
        atmosphere.innerHTML = `
            <div class="gold-rain-spotlight gold-rain-spotlight--left"></div>
            <div class="gold-rain-spotlight gold-rain-spotlight--right"></div>
            <div class="gold-rain-glint gold-rain-glint--one"></div>
            <div class="gold-rain-glint gold-rain-glint--two"></div>
        `;
        document.body.appendChild(atmosphere);

        const layer = document.createElement('div');
        layer.className = reducedMotion ? 'gold-rain-static-coin' : 'gold-rain-particles';
        layer.setAttribute('aria-hidden', 'true');
        document.body.appendChild(layer);
        document.body.classList.add('fx-gold-rain');

        const addCoin = (size) => {
            const coin = document.createElement('img');
            coin.className = reducedMotion ? 'gold-rain-static-particle' : 'gold-rain-particle';
            coin.src = ducatSprite.src;
            coin.alt = '';
            coin.decoding = 'async';
            coin.style.width = `${size}px`;
            coin.style.height = `${size}px`;
            layer.appendChild(coin);
            return coin;
        };

        if (reducedMotion) {
            [34, 42, 34].forEach(addCoin);
        } else {
            const coinCount = isCompact ? 46 : 68;
            for (let index = 0; index < coinCount; index++) {
                const size = Math.round(rand(isCompact ? 27 : 32, isCompact ? 43 : 52));
                const coin = addCoin(size);
                const drift = rand(isCompact ? -54 : -100, isCompact ? 54 : 100) * profile.drift;
                const tilt = rand(-18, 18) * profile.spin;
                const wave = index % 3;
                const lane = Math.floor(index / 3);
                const lanesInWave = Math.ceil((coinCount - wave) / 3);
                coin.style.left = `${(2 + ((lane + rand(0.15, 0.85)) / lanesInWave) * 92).toFixed(1)}vw`;
                coin.style.setProperty('--fall-delay', `${Math.round(wave * 430 + rand(0, 490))}ms`);
                coin.style.setProperty('--fall-duration', `${Math.round(rand(3000, 4200))}ms`);
                coin.style.setProperty('--fall-start-tilt', `${Math.round(-tilt * 0.5)}deg`);
                coin.style.setProperty('--fall-quarter-drift', `${Math.round(drift * 0.45)}px`);
                coin.style.setProperty('--fall-mid-drift', `${Math.round(drift * 0.12)}px`);
                coin.style.setProperty('--fall-late-drift', `${Math.round(drift * 0.76)}px`);
                coin.style.setProperty('--fall-end-drift', `${Math.round(drift)}px`);
                coin.style.setProperty('--fall-quarter-tilt', `${Math.round(tilt * 0.38)}deg`);
                coin.style.setProperty('--fall-mid-tilt', `${Math.round(-tilt * 0.55)}deg`);
                coin.style.setProperty('--fall-late-tilt', `${Math.round(tilt * 0.7)}deg`);
                coin.style.setProperty('--fall-end-tilt', `${Math.round(tilt)}deg`);
            }
        }

        let observer = null;
        const cleanup = () => {
            if (runId !== this.goldRainRunId) return;
            observer?.disconnect();
            if (this.goldRainThemeObserver === observer) this.goldRainThemeObserver = null;
            document.body.classList.remove('fx-gold-rain');
            layer.remove();
            atmosphere.remove();
        };
        if (typeof MutationObserver !== 'undefined') {
            observer = new MutationObserver(() => {
                if (themeId !== this.getGoldRainThemeId()) cleanup();
            });
            observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });
            observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-splash-theme'] });
            this.goldRainThemeObserver = observer;
        }

        if (!reducedMotion) {
            this.scheduleEffectTimeout(() => {
                if (runId !== this.goldRainRunId) return;
                atmosphere.classList.add('closing');
            }, totalDuration - 650, 'gold_rain');
        }
        this.scheduleEffectTimeout(cleanup, totalDuration + (reducedMotion ? 0 : 650), 'gold_rain');
    }
    
    spawnEmojiRain(emojis, count, group = 'emoji_rain') {
        for (let i = 0; i < count; i++) {
            this.scheduleEffectTimeout(() => {
                const el = document.createElement('div');
                const emoji = emojis[Math.floor(Math.random() * emojis.length)];
                if (emoji === 'dukat-icon') {
                    el.innerHTML = dukatIconHtml();
                } else {
                    el.innerText = emoji;
                }
                el.className = `falling-coin${group === 'gold_rain' ? ' gold-rain-coin' : ''}`;
                if (group === 'gold_rain') {
                    el.style.setProperty('--gold-rain-glow', GOLD_RAIN_THEME_PROFILES[this.getGoldRainThemeId()].glow);
                }
                el.style.left = Math.random() * 100 + 'vw'; el.style.animationDuration = (Math.random() * 2 + 1) + 's';
                document.body.appendChild(el);
                this.scheduleEffectTimeout(() => el.remove(), 3000, group);
            }, Math.random() * 2000, group);
        }
    }

    getEffectSurfaceTone() {
        const styles = getComputedStyle(document.body);
        const source = styles.getPropertyValue('--bg-base').trim() || styles.backgroundColor;
        const probe = document.createElement('span');
        probe.style.color = source;
        probe.style.display = 'none';
        document.body.appendChild(probe);

        const resolved = getComputedStyle(probe).color;
        probe.remove();
        const channels = resolved.match(/[\d.]+/g)?.slice(0, 3).map(Number);
        if (!channels || channels.length < 3) return 'dark';

        const linear = channels.map(channel => {
            const value = channel / 255;
            return value <= 0.04045 ? value / 12.92 : Math.pow((value + 0.055) / 1.055, 2.4);
        });
        const luminance = 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
        return luminance > 0.36 ? 'light' : 'dark';
    }

    loadThemeFireflySprite(theme = this.getGoldRainThemeId()) {
        if (!YAMB_THEME_IDS.includes(theme)) return Promise.resolve(null);
        if (this.fireflySpritePromises[theme]) return this.fireflySpritePromises[theme];
        const root = theme === 'dark' ? 'assets/green-soft-clay' : `assets/theme-packs/${theme}`;
        this.fireflySpritePromises[theme] = new Promise(resolve => {
            const image = new Image();
            image.decoding = 'async';
            image.onload = () => resolve(image);
            image.onerror = () => {
                delete this.fireflySpritePromises[theme];
                resolve(null);
            };
            image.src = `${root}/canonical/effects/firefly-v1.png`;
        });
        return this.fireflySpritePromises[theme];
    }

    async spawnFireflies(count = 52, group = 'fireflies') {
        const runId = ++this.fireflyRunId;
        const themeId = this.getGoldRainThemeId();
        this.clearEffectTimeouts(group);
        this.fireflyThemeObserver?.disconnect();
        this.fireflyThemeObserver = null;
        document.querySelectorAll('.firefly-field').forEach(field => field.remove());

        const sprite = await this.loadThemeFireflySprite(themeId);
        if (runId !== this.fireflyRunId || themeId !== this.getGoldRainThemeId() || !sprite) return;
        const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
        const compact = window.matchMedia?.('(max-width: 760px)').matches;
        const particleCount = reducedMotion ? 3 : (compact ? Math.min(count, 20) : Math.min(count, 28));
        const tone = this.getEffectSurfaceTone();
        const field = document.createElement('div');
        field.className = `firefly-field firefly-field--${tone}${reducedMotion ? ' firefly-field--reduced' : ''}`;
        field.style.setProperty('--ff-glow', FIREFLY_THEME_GLOW[themeId]);
        field.setAttribute('aria-hidden', 'true');

        const fragment = document.createDocumentFragment();
        const routes = [[-1, -1], [1, -1], [-1, 1], [1, 1], [1, 0], [-1, 0], [0, 1], [0, -1]];
        for (let i = 0; i < particleCount; i++) {
            const fly = document.createElement('span');
            fly.className = 'magic-firefly';
            const [horizontal, vertical] = routes[i % routes.length];
            const stepX = horizontal * (62 + Math.random() * 85);
            const stepY = vertical * (52 + Math.random() * 88);
            fly.style.setProperty('--ff-x', (6 + ((i + Math.random() * 0.6) / particleCount) * 86).toFixed(2) + 'vw');
            fly.style.setProperty('--ff-y', (22 + Math.random() * 60).toFixed(2) + 'vh');
            fly.style.setProperty('--ff-dx-a', (stepX * 0.52).toFixed(1) + 'px');
            fly.style.setProperty('--ff-dy-a', (stepY * 0.35).toFixed(1) + 'px');
            fly.style.setProperty('--ff-dx-b', (stepX * 0.18 - vertical * 22).toFixed(1) + 'px');
            fly.style.setProperty('--ff-dy-b', (stepY * 0.82).toFixed(1) + 'px');
            fly.style.setProperty('--ff-dx-c', (stepX * 1.12).toFixed(1) + 'px');
            fly.style.setProperty('--ff-dy-c', (stepY * 1.22).toFixed(1) + 'px');
            fly.style.setProperty('--ff-size', (compact ? 32 + Math.random() * 13 : 36 + Math.random() * 16).toFixed(1) + 'px');
            fly.style.setProperty('--ff-delay', (i < 6 ? Math.random() * 0.3 : 0.2 + Math.random() * 1.2).toFixed(2) + 's');
            fly.style.setProperty('--ff-duration', (5.2 + Math.random() * 1.25).toFixed(2) + 's');
            fly.style.setProperty('--ff-flap', (0.17 + Math.random() * 0.08).toFixed(2) + 's');
            const halo = document.createElement('span');
            halo.className = 'magic-firefly__halo';
            const image = document.createElement('img');
            image.className = 'magic-firefly__sprite';
            image.src = sprite.src;
            image.alt = '';
            image.decoding = 'async';
            image.draggable = false;
            fly.append(halo, image);
            fragment.appendChild(fly);
        }

        field.appendChild(fragment);
        document.body.appendChild(field);
        let observer = null;
        const cleanup = () => {
            if (runId !== this.fireflyRunId) return;
            observer?.disconnect();
            if (this.fireflyThemeObserver === observer) this.fireflyThemeObserver = null;
            field.remove();
        };
        if (typeof MutationObserver !== 'undefined') {
            observer = new MutationObserver(() => {
                if (themeId !== this.getGoldRainThemeId()) cleanup();
            });
            observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });
            observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-splash-theme'] });
            this.fireflyThemeObserver = observer;
        }
        this.scheduleEffectTimeout(cleanup, reducedMotion ? 5200 : 8000, group);
    }

    loadThemeBubbleSprite(theme = this.getGoldRainThemeId()) {
        if (!YAMB_THEME_IDS.includes(theme)) return Promise.resolve(null);
        if (this.bubbleSpritePromises[theme]) return this.bubbleSpritePromises[theme];
        const root = theme === 'dark' ? 'assets/green-soft-clay' : `assets/theme-packs/${theme}`;
        this.bubbleSpritePromises[theme] = new Promise(resolve => {
            const image = new Image();
            image.decoding = 'async';
            image.onload = () => resolve(image);
            image.onerror = () => {
                delete this.bubbleSpritePromises[theme];
                resolve(null);
            };
            image.src = `${root}/canonical/effects/bubble-v1.png`;
        });
        return this.bubbleSpritePromises[theme];
    }

    async spawnBubbles(count = 35, group = 'bubbles') {
        const runId = ++this.bubbleRunId;
        const themeId = this.getGoldRainThemeId();
        this.clearEffectTimeouts(group);
        this.bubbleThemeObserver?.disconnect();
        this.bubbleThemeObserver = null;
        document.querySelectorAll('.bubble-field').forEach(field => field.remove());

        const sprite = await this.loadThemeBubbleSprite(themeId);
        if (runId !== this.bubbleRunId || themeId !== this.getGoldRainThemeId() || !sprite) return;
        const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
        const compact = window.matchMedia?.('(max-width: 760px)').matches;
        const particleCount = reducedMotion ? 3 : (compact ? Math.min(count, 24) : Math.min(count, 35));
        const field = document.createElement('div');
        field.className = `bubble-field${reducedMotion ? ' bubble-field--reduced' : ''}`;
        field.setAttribute('aria-hidden', 'true');
        const fragment = document.createDocumentFragment();
        const sizeRanges = compact ? [[20, 30], [34, 48], [56, 72]] : [[24, 34], [42, 58], [68, 88]];
        for (let i = 0; i < particleCount; i++) {
            const bubble = document.createElement('img');
            bubble.className = `magic-bubble magic-bubble--${['small', 'medium', 'large'][i % 3]}`;
            bubble.src = sprite.src;
            bubble.alt = '';
            bubble.decoding = 'async';
            bubble.draggable = false;
            const [minSize, maxSize] = sizeRanges[i % 3];
            const size = Math.round(minSize + Math.random() * (maxSize - minSize));
            const drift = (Math.random() - .5) * (compact ? 110 : 180);
            bubble.style.setProperty('--bubble-size', `${size}px`);
            bubble.style.setProperty('--bubble-x', (4 + ((Math.floor(i / 3) + Math.random() * .8) / Math.ceil(particleCount / 3)) * 88).toFixed(1) + 'vw');
            bubble.style.setProperty('--bubble-drift-a', `${Math.round(drift * .55)}px`);
            bubble.style.setProperty('--bubble-drift-b', `${Math.round(-drift * .3)}px`);
            bubble.style.setProperty('--bubble-drift-c', `${Math.round(drift)}px`);
            bubble.style.setProperty('--bubble-delay', `${(i < 6 ? Math.random() * .25 : .2 + Math.random() * 1.4).toFixed(2)}s`);
            bubble.style.setProperty('--bubble-duration', `${(4.8 + Math.random() * 1.7 + (i % 3) * .18).toFixed(2)}s`);
            if (reducedMotion) {
                bubble.style.setProperty('--bubble-x', `${18 + i * 30}vw`);
                bubble.style.setProperty('--bubble-static-y', `${30 + i * 20}vh`);
            }
            fragment.appendChild(bubble);
        }
        field.appendChild(fragment);
        document.body.appendChild(field);
        let observer = null;
        const cleanup = () => {
            if (runId !== this.bubbleRunId) return;
            observer?.disconnect();
            if (this.bubbleThemeObserver === observer) this.bubbleThemeObserver = null;
            field.remove();
        };
        if (typeof MutationObserver !== 'undefined') {
            observer = new MutationObserver(() => {
                if (themeId !== this.getGoldRainThemeId()) cleanup();
            });
            observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });
            observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-splash-theme'] });
            this.bubbleThemeObserver = observer;
        }
        this.scheduleEffectTimeout(cleanup, reducedMotion ? 4600 : 8000, group);
    }
    
    spawnExplosion() {
        const x = Math.random() * window.innerWidth; const y = Math.random() * (window.innerHeight / 2); 
        const colors = ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff']; const color = colors[Math.floor(Math.random() * colors.length)];
        for (let i = 0; i < 20; i++) {
            const el = document.createElement('div'); el.innerText = '●'; el.className = 'firework-particle';
            el.style.color = color; el.style.left = x + 'px'; el.style.top = y + 'px';
            const angle = Math.random() * Math.PI * 2; const velocity = Math.random() * 150 + 50;
            el.style.setProperty('--dx', Math.cos(angle) * velocity + 'px'); el.style.setProperty('--dy', Math.sin(angle) * velocity + 'px');
            document.body.appendChild(el); this.scheduleEffectTimeout(() => el.remove(), 1000, 'explosion');
        }
    }
    
    spawnConfetti() {
        const theme = this.getGoldRainThemeId();
        if (YAMB_THEME_IDS.includes(theme)) {
            void this.spawnThemedConfetti(theme);
            return;
        }
        const colors = ['#FFD166', '#F7B801', '#EF476F', '#06D6A0', '#4CC9F0', '#FFFFFF'];

        if (window.confetti) { 
            const baseOptions = {
                colors,
                zIndex: 99999,
                disableForReducedMotion: true
            };

            window.confetti({
                ...baseOptions,
                particleCount: 90,
                spread: 74,
                startVelocity: 54,
                gravity: 0.82,
                scalar: 1.02,
                ticks: 190,
                origin: { x: 0.5, y: 0.72 }
            });

            window.confetti({
                ...baseOptions,
                particleCount: 42,
                angle: 58,
                spread: 56,
                startVelocity: 48,
                gravity: 0.86,
                scalar: 0.92,
                ticks: 170,
                origin: { x: 0.02, y: 0.84 }
            });

            window.confetti({
                ...baseOptions,
                particleCount: 42,
                angle: 122,
                spread: 56,
                startVelocity: 48,
                gravity: 0.86,
                scalar: 0.92,
                ticks: 170,
                origin: { x: 0.98, y: 0.84 }
            });

            const end = Date.now() + 1600;
            const drift = () => {
                window.confetti({
                    ...baseOptions,
                    particleCount: 8,
                    spread: 110,
                    startVelocity: 20,
                    gravity: 0.55,
                    drift: (Math.random() - 0.5) * 1.2,
                    scalar: 0.72,
                    ticks: 210,
                    origin: { x: Math.random(), y: -0.08 }
                });

                if (Date.now() < end) {
                    this.scheduleEffectTimeout(drift, 180, 'confetti');
                }
            };

            this.scheduleEffectTimeout(drift, 260, 'confetti');
            return;
        }

        this.spawnCanvasConfetti(colors);
    }

    loadConfettiSprites(theme) {
        if (this.confettiSpritePromises[theme]) return this.confettiSpritePromises[theme];
        const root = theme === 'dark' ? 'assets/green-soft-clay/' : `assets/theme-packs/${theme}/`;
        const roles = ['ribbon', 'chip', 'lozenge'];
        this.confettiSpritePromises[theme] = Promise.all(roles.map(role => new Promise(resolve => {
            const image = new Image();
            image.decoding = 'async';
            image.onload = () => resolve(image);
            image.onerror = () => resolve(null);
            image.src = `${root}canonical/confetti-particles/${role}-v1.png`;
        }))).then(images => images.filter(Boolean));
        return this.confettiSpritePromises[theme];
    }

    async spawnThemedConfetti(theme) {
        const runId = ++this.confettiRunId;
        if (this.confettiAnimationId) {
            cancelAnimationFrame(this.confettiAnimationId);
            this.confettiAnimationId = null;
        }
        if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
        const canvas = document.getElementById('confetti-canvas');
        const ctx = canvas?.getContext('2d');
        if (!ctx) return;
        const sprites = await this.loadConfettiSprites(theme);
        if (runId !== this.confettiRunId || theme !== this.getGoldRainThemeId() || !sprites.length) return;

        const rand = (min, max) => min + Math.random() * (max - min);
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        let width = 0;
        let height = 0;
        const resize = () => {
            width = window.innerWidth || document.documentElement.clientWidth || 1;
            height = window.innerHeight || document.documentElement.clientHeight || 1;
            canvas.width = Math.ceil(width * dpr);
            canvas.height = Math.ceil(height * dpr);
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        };
        resize();
        const count = width < 640 ? 132 : 180;
        const particles = Array.from({ length: count }, (_, index) => {
            const spread = (index / (count - 1)) * 2 - 1;
            return {
                image: sprites[index % sprites.length],
                x: width * 0.5 + rand(-width * 0.06, width * 0.06),
                y: height * rand(0.75, 0.82),
                vx: spread * width * rand(0.72, 1.08) + rand(-30, 30),
                vy: -height * rand(1.08, 1.78),
                gravity: height * rand(1.35, 1.82),
                wobble: rand(0, Math.PI * 2),
                rotation: rand(-0.45, 0.45),
                spin: rand(-2.8, 2.8),
                size: rand(14, 24),
                age: -rand(0, 0.12),
                ttl: rand(2.35, 2.95)
            };
        });
        let lastFrame = 0;
        const animate = now => {
            if (runId !== this.confettiRunId || theme !== this.getGoldRainThemeId()) {
                ctx.clearRect(0, 0, width, height);
                this.confettiAnimationId = null;
                return;
            }
            if (window.innerWidth !== width || window.innerHeight !== height) resize();
            const delta = lastFrame ? Math.min(0.05, (now - lastFrame) / 1000) : 0;
            lastFrame = now;
            ctx.clearRect(0, 0, width, height);
            let remaining = 0;
            for (const particle of particles) {
                particle.age += delta;
                if (particle.age >= particle.ttl) continue;
                remaining++;
                if (particle.age < 0) continue;
                particle.x += particle.vx * delta;
                particle.y += particle.vy * delta;
                particle.vy += particle.gravity * delta;
                particle.rotation += particle.spin * delta;
                particle.wobble += delta * 5;
                if (particle.y > height + particle.size || particle.x < -particle.size || particle.x > width + particle.size) {
                    particle.age = particle.ttl;
                    continue;
                }
                const fade = Math.min(1, (particle.ttl - particle.age) / 0.42);
                const side = particle.size * (0.87 + Math.sin(particle.wobble) * 0.13);
                ctx.save();
                ctx.globalAlpha = fade;
                ctx.translate(particle.x, particle.y);
                ctx.rotate(particle.rotation);
                ctx.drawImage(particle.image, -side / 2, -side / 2, side, side);
                ctx.restore();
            }
            if (remaining) this.confettiAnimationId = requestAnimationFrame(animate);
            else {
                ctx.clearRect(0, 0, width, height);
                this.confettiAnimationId = null;
            }
        };
        this.confettiAnimationId = requestAnimationFrame(animate);
    }

    spawnCanvasConfetti(colors) {
        const canvas = document.getElementById('confetti-canvas');
        const reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        if (reducedMotion) return;

        if (!canvas) {
            this.spawnEmojiRain(['🎉', '🎊', '✨', '🏆', '💫'], 8);
            return;
        }

        const ctx = canvas.getContext('2d');
        if (!ctx) {
            this.spawnEmojiRain(['🎉', '🎊', '✨', '🏆', '💫'], 8);
            return;
        }

        if (this.confettiAnimationId) {
            cancelAnimationFrame(this.confettiAnimationId);
            this.confettiAnimationId = null;
        }

        const particles = [];
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        let width = 0;
        let height = 0;
        let lastFrame = performance.now();
        let nextDrift = 0;
        const startedAt = performance.now();
        const rand = (min, max) => min + Math.random() * (max - min);
        const degToRad = deg => deg * Math.PI / 180;

        const resizeCanvas = () => {
            width = window.innerWidth || document.documentElement.clientWidth || 1;
            height = window.innerHeight || document.documentElement.clientHeight || 1;
            canvas.width = Math.ceil(width * dpr);
            canvas.height = Math.ceil(height * dpr);
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        };

        const addParticle = (x, y, angleDeg, speed, sizeScale = 1) => {
            const angle = degToRad(angleDeg);
            particles.push({
                x,
                y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                gravity: rand(0.13, 0.24),
                drift: rand(-0.035, 0.035),
                wobble: rand(0, Math.PI * 2),
                wobbleSpeed: rand(0.08, 0.16),
                rotation: rand(0, Math.PI * 2),
                rotationSpeed: rand(-0.22, 0.22),
                size: rand(5, 10) * sizeScale,
                color: colors[Math.floor(Math.random() * colors.length)],
                shape: Math.random() > 0.78 ? 'circle' : 'ribbon',
                age: 0,
                ttl: rand(125, 185)
            });
        };

        const addBurst = (x, y, count, minAngle, maxAngle, minSpeed, maxSpeed, sizeScale = 1) => {
            for (let i = 0; i < count; i++) {
                addParticle(x, y, rand(minAngle, maxAngle), rand(minSpeed, maxSpeed), sizeScale);
            }
        };

        const addDrift = () => {
            for (let i = 0; i < 8; i++) {
                addParticle(rand(0, width), -18, rand(74, 106), rand(1.2, 3), 0.78);
            }
        };

        resizeCanvas();
        addBurst(width * 0.5, height * 0.72, 90, 205, 335, 6.5, 13.5, 1.02);
        addBurst(width * 0.02, height * 0.84, 42, 292, 348, 5.8, 11.5, 0.92);
        addBurst(width * 0.98, height * 0.84, 42, 192, 248, 5.8, 11.5, 0.92);

        const drawParticle = particle => {
            const fadeStart = particle.ttl * 0.66;
            const alpha = particle.age > fadeStart
                ? Math.max(0, 1 - ((particle.age - fadeStart) / (particle.ttl - fadeStart)))
                : 1;

            ctx.save();
            ctx.globalAlpha = alpha;
            ctx.translate(particle.x + Math.sin(particle.wobble) * 5, particle.y);
            ctx.rotate(particle.rotation);
            ctx.fillStyle = particle.color;

            if (particle.shape === 'circle') {
                ctx.beginPath();
                ctx.arc(0, 0, particle.size * 0.45, 0, Math.PI * 2);
                ctx.fill();
            } else {
                ctx.fillRect(-particle.size * 0.75, -particle.size * 0.22, particle.size * 1.5, particle.size * 0.44);
            }

            ctx.restore();
        };

        const animate = now => {
            const delta = Math.min(2, (now - lastFrame) / 16.67);
            lastFrame = now;
            const currentWidth = window.innerWidth || document.documentElement.clientWidth || 1;
            const currentHeight = window.innerHeight || document.documentElement.clientHeight || 1;

            if (currentWidth !== width || currentHeight !== height) {
                resizeCanvas();
            }

            ctx.clearRect(0, 0, width, height);

            if (now - startedAt > 260 && now - startedAt < 1700 && now > nextDrift) {
                addDrift();
                nextDrift = now + 180;
            }

            for (let i = particles.length - 1; i >= 0; i--) {
                const particle = particles[i];
                particle.age += delta;
                particle.x += particle.vx * delta;
                particle.y += particle.vy * delta;
                particle.vy += particle.gravity * delta;
                particle.vx += particle.drift * delta;
                particle.wobble += particle.wobbleSpeed * delta;
                particle.rotation += particle.rotationSpeed * delta;

                if (particle.age > particle.ttl || particle.y > height + 60) {
                    particles.splice(i, 1);
                } else {
                    drawParticle(particle);
                }
            }

            if (particles.length) {
                this.confettiAnimationId = requestAnimationFrame(animate);
            } else {
                ctx.clearRect(0, 0, width, height);
                this.confettiAnimationId = null;
            }
        };

        this.confettiAnimationId = requestAnimationFrame(animate);
    }
    
    celebrateYamb() {
        const active = localStorage.getItem('yamb_active_effect') || 'confetti';
        this.trigger(active); 
    }
    
    celebrateWin() {
        this.trigger('fireworks');
        this.scheduleEffectTimeout(() => this.spawnGoldRain(), 1000, 'celebrate_win');
    }
    
    stop() {
        this.iceAgeRunId++;
        this.stageScene?.stop();
        this.stageScene = null;
        this.blackHoleRunId++;
        this.blackHoleCleanup?.();
        this.confettiRunId++;
        this.goldRainRunId++;
        this.fireflyRunId++;
        this.bubbleRunId++;
        this.royalYambRunId++;
        this.fireflyThemeObserver?.disconnect();
        this.fireflyThemeObserver = null;
        this.bubbleThemeObserver?.disconnect();
        this.bubbleThemeObserver = null;
        if (this.royalCanvasCleanup) this.royalCanvasCleanup();
        if (this.supernovaCanvasCleanup) this.supernovaCanvasCleanup();
        this.supernovaRunId++;
        this.clearEffectTimeouts();
        document.documentElement.classList.remove('green-thunder-active');
        if (window.app?.soundMgr?.stopBalkanMusic) {
            window.app.soundMgr.stopBalkanMusic(true);
        }
        document.body.classList.remove('fx-glass', 'fx-neon_pulse', 'fx-neon_pulse--green', 'fx-balkan', 'fx-ice-age', 'fx-thunder-shake', 'fx-thunder-shake--green', 'fx-cosmic_dust', 'fx-ufo_abduction', 'fx-ufo_abduction--green', 'fx-dragon_fire', 'fx-royal_yamb', 'fx-gold-rain');

        if (this.confettiAnimationId) {
            cancelAnimationFrame(this.confettiAnimationId);
            this.confettiAnimationId = null;
        }
        window.confetti?.reset?.();

        const confettiCanvas = document.getElementById('confetti-canvas');
        if (confettiCanvas) {
            const confettiCtx = confettiCanvas.getContext('2d');
            if (confettiCtx) confettiCtx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
        }
        
        document.querySelectorAll('.falling-coin, .firefly, .firefly-field, .bubble-field, .trumpet-icon, .trumpet-icon-v2, .kafana-overlay, .wedding-rain, .firework-particle, .ice-overlay-container, .ice-age-atmosphere, .black-hole-container, .supernova-container, .drone-night-sky, .drone-text, .drone-dot, .magic-bubble, .anim-thunder, .green-thunder-clay, .fw-rocket, .fw-flash, .fw-particle, .cosmic-container, .ufo-abduction-container, .ufo-abducted-score, .ufo-target-ray, .dragon-container, .stardust-layer, .dragon-flames, .dragon-embers, .royal-yamb-container, .gold-rain-atmosphere, .gold-rain-particles, .gold-rain-static-coin').forEach(e => e.remove());
        
        document.querySelectorAll('.anim-suck-in').forEach(tbl => tbl.classList.remove('anim-suck-in'));
        document.querySelectorAll('.anim-black-hole-table').forEach(tbl => tbl.classList.remove('anim-black-hole-table'));
        document.querySelectorAll('.anim-supernova-table').forEach(tbl => tbl.classList.remove('anim-supernova-table'));
        document.querySelectorAll('.anim-supernova-table--compact').forEach(tbl => tbl.classList.remove('anim-supernova-table--compact'));
        document.querySelectorAll('.anim-neon-pulse').forEach(tbl => tbl.classList.remove('anim-neon-pulse'));
        document.querySelectorAll('.anim-neon-pulse--green').forEach(tbl => tbl.classList.remove('anim-neon-pulse--green'));
        document.querySelectorAll('.anim-ufo-table').forEach(tbl => tbl.classList.remove('anim-ufo-table'));
        document.querySelectorAll('.ufo-score-dimmed').forEach(btn => btn.classList.remove('ufo-score-dimmed'));
    }
}

// --- 5. SOUND MANAGER (WEB AUDIO API SYNTH ONLY) ---
class SoundManager {
    constructor() {
        this.enabled = localStorage.getItem('yamb_sound') !== 'false';
        this.musicEnabled = localStorage.getItem('yamb_music') !== 'false'; 
        
        // NOVO: Učitavanje sačuvane glasnoće muzike (podrazumevano 0.4)
        this.musicVolume = parseFloat(localStorage.getItem('yamb_music_volume') ?? 0.4);
        
        this.ctx = null;
        this.balkanNodes = [];
        this.balkanStopTimer = null;
        this.balkanResumeMusic = false;

        // --- INICIJALIZACIJA MUZIKE ---
        this.bgMusic = new Audio('Before_the_Numbers_Settle.mp3');
        this.bgMusic.volume = this.musicVolume; 
        this.introAudio = new Audio('the_balkan_intro.mp3');
        this.introAudio.preload = 'auto';
        this.introAudio.volume = 1;
        this.introStopTimer = null;
        this.introRetryHandler = null;
        
        this.bgMusic.addEventListener('timeupdate', () => {
            if (this.bgMusic.duration > 0 && this.bgMusic.currentTime >= this.bgMusic.duration - 2) {
                this.bgMusic.currentTime = 0;
            }
        });

        const unlockAudio = () => {
            if (!this.ctx) {
                const AudioContext = window.AudioContext || window.webkitAudioContext;
                this.ctx = new AudioContext();
            }
            if (this.ctx.state === 'suspended') {
                this.ctx.resume();
            }
            document.removeEventListener('touchstart', unlockAudio);
            document.removeEventListener('click', unlockAudio);
        };

        document.addEventListener('touchstart', unlockAudio, { once: true });
        document.addEventListener('click', unlockAudio, { once: true });
    }

    // --- FUNKCIJE ZA KONTROLU MUZIKE I GLASNOĆE ---
    playMusic() {
        if (!this.musicEnabled || this.musicVolume === 0) return;
        this.bgMusic.play().catch(e => console.log("Greška pri puštanju muzike:", e));
    }

    playIntro() {
        if (!this.enabled || !this.introAudio) return;

        this.cancelIntroRetry();
        if (this.introStopTimer) {
            clearTimeout(this.introStopTimer);
            this.introStopTimer = null;
        }

        try {
            this.introAudio.pause();
            this.introAudio.currentTime = 0;
            this.introAudio.volume = 1;

            const playPromise = this.introAudio.play();
            if (playPromise && typeof playPromise.catch === 'function') {
                playPromise.catch(() => this.queueIntroOnGesture());
            }

            this.introStopTimer = setTimeout(() => this.stopIntro(), 4500);
        } catch (err) {
            this.queueIntroOnGesture();
        }
    }

    stopIntro() {
        this.cancelIntroRetry();
        if (this.introStopTimer) {
            clearTimeout(this.introStopTimer);
            this.introStopTimer = null;
        }
        if (!this.introAudio) return;

        try {
            this.introAudio.pause();
            this.introAudio.currentTime = 0;
        } catch (err) {}
    }

    queueIntroOnGesture() {
        if (this.introRetryHandler) return;

        this.introRetryHandler = () => {
            this.cancelIntroRetry();
            const splash = document.getElementById('splash-screen');
            if (splash && splash.classList.contains('active')) {
                this.playIntro();
            }
        };

        document.addEventListener('pointerdown', this.introRetryHandler, { once: true });
        document.addEventListener('touchstart', this.introRetryHandler, { once: true });
        document.addEventListener('click', this.introRetryHandler, { once: true });
    }

    cancelIntroRetry() {
        if (!this.introRetryHandler) return;
        document.removeEventListener('pointerdown', this.introRetryHandler);
        document.removeEventListener('touchstart', this.introRetryHandler);
        document.removeEventListener('click', this.introRetryHandler);
        this.introRetryHandler = null;
    }

    stopMusic() {
        this.bgMusic.pause();
        this.bgMusic.currentTime = 0;
    }

    setMusicEnabled(enabled) {
        this.musicEnabled = enabled;
        if (!enabled) {
            this.bgMusic.pause();
        } else if (window.app && window.app.gameActive && this.musicVolume > 0) {
            this.playMusic(); 
        }
    }

    setMusicVolume(vol) {
        this.musicVolume = parseFloat(vol);
        this.bgMusic.volume = this.musicVolume;
        localStorage.setItem('yamb_music_volume', this.musicVolume);
        
        if (this.musicVolume === 0) {
            this.bgMusic.pause();
        } else if (this.musicEnabled && this.bgMusic.paused && window.app && window.app.gameActive) {
            this.playMusic();
        }
    }

    playSound(synthCallback) {
        if (!this.enabled) return;

        try {
            if (!this.ctx) {
                const AudioContext = window.AudioContext || window.webkitAudioContext;
                this.ctx = new AudioContext();
            }
            
            if (this.ctx.state === 'suspended') { 
                this.ctx.resume().catch(e => console.log("Audio resume failed", e)); 
            }
            
            if (synthCallback) synthCallback.call(this);
        } catch (err) {
            console.warn("⚠️ Web Audio API je blokiran. Zvuk se privremeno isključuje kako bi igra nastavila sa radom.", err);
            this.enabled = false; 
        }
    }

    isEasterThemeActive() {
        const activeTheme = localStorage.getItem('yamb_theme') || 'dark';
        return activeTheme === 'easter' || !!document.body?.classList.contains('easter-theme');
    }

    isDesertThemeActive() {
        const activeTheme = localStorage.getItem('yamb_theme') || 'dark';
        return activeTheme === 'desert' || !!document.body?.classList.contains('desert-theme');
    }

    scheduleEasterTone(freq, start, duration, options = {}) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const filter = this.ctx.createBiquadFilter();
        const attack = options.attack ?? 0.018;
        const level = options.gain ?? 0.055;
        const safeDuration = Math.max(duration, attack + 0.025);

        osc.type = options.type || 'sine';
        osc.frequency.setValueAtTime(freq, start);
        if (options.to) {
            osc.frequency.exponentialRampToValueAtTime(Math.max(1, options.to), start + safeDuration * 0.92);
        }

        filter.type = options.filterType || 'lowpass';
        filter.frequency.setValueAtTime(options.filter ?? 4200, start);
        gain.gain.setValueAtTime(0.0001, start);
        gain.gain.linearRampToValueAtTime(level, start + attack);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + safeDuration);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(start);
        osc.stop(start + safeDuration + 0.03);
    }

    easterClick() {
        this.playSound(() => {
            const t = this.ctx.currentTime;
            this.scheduleEasterTone(659.25, t, 0.11, { type: 'triangle', gain: 0.045, filter: 3600 });
            this.scheduleEasterTone(987.77, t + 0.035, 0.14, { type: 'sine', gain: 0.030, filter: 5200 });
        });
    }

    easterAnnounce() {
        this.playSound(() => {
            const t = this.ctx.currentTime;
            [587.33, 739.99, 987.77, 1174.66].forEach((freq, i) => {
                this.scheduleEasterTone(freq, t + i * 0.055, 0.42, { type: 'sine', gain: 0.045, filter: 5200 });
            });
        });
    }

    easterRoll() {
        this.playSound(() => {
            const now = this.ctx.currentTime;
            const notes = [261.63, 329.63, 392.00, 493.88, 587.33, 659.25];
            notes.forEach((base, i) => {
                const offset = i * 0.052 + Math.random() * 0.018;
                const freq = base + Math.random() * 38;
                this.scheduleEasterTone(freq, now + offset, 0.13, {
                    type: i % 2 ? 'triangle' : 'sine',
                    gain: 0.040,
                    filter: 2800,
                    to: Math.max(80, freq * 0.62)
                });
            });
        });
    }

    easterScore() {
        this.playSound(() => {
            const t = this.ctx.currentTime;
            [523.25, 659.25, 783.99].forEach((freq, i) => {
                this.scheduleEasterTone(freq, t + i * 0.06, 0.28, { type: 'triangle', gain: 0.045, filter: 4600 });
            });
        });
    }

    easterWin() {
        this.playSound(() => {
            const t = this.ctx.currentTime;
            [523.25, 659.25, 783.99, 1046.50, 1174.66, 1318.51].forEach((freq, i) => {
                this.scheduleEasterTone(freq, t + i * 0.11, i > 3 ? 0.74 : 0.28, {
                    type: i % 2 ? 'sine' : 'triangle',
                    gain: i > 3 ? 0.060 : 0.050,
                    filter: 5600
                });
            });
        });
    }

    easterError() {
        this.playSound(() => {
            const t = this.ctx.currentTime;
            this.scheduleEasterTone(392.00, t, 0.18, { type: 'triangle', gain: 0.040, filter: 2200, to: 329.63 });
            this.scheduleEasterTone(293.66, t + 0.075, 0.22, { type: 'sine', gain: 0.032, filter: 1800, to: 246.94 });
        });
    }

    easterTrophy() {
        this.playSound(() => {
            const t = this.ctx.currentTime;
            [523.25, 659.25, 783.99].forEach((freq) => {
                this.scheduleEasterTone(freq, t, 1.15, { type: 'sine', gain: 0.060, filter: 5400 });
            });
            [1046.50, 1318.51, 1567.98].forEach((freq, i) => {
                this.scheduleEasterTone(freq, t + 0.18 + i * 0.085, 0.50, { type: 'triangle', gain: 0.040, filter: 6200 });
            });
        });
    }

    scheduleDesertTone(freq, start, duration, options = {}) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const filter = this.ctx.createBiquadFilter();
        const attack = options.attack ?? 0.022;
        const level = options.gain ?? 0.048;
        const safeDuration = Math.max(0.04, duration || 0.14);
        osc.type = options.type || 'triangle';
        osc.frequency.setValueAtTime(Math.max(45, freq), start);
        if (options.to) osc.frequency.exponentialRampToValueAtTime(Math.max(45, options.to), start + safeDuration);
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(options.filter ?? 2500, start);
        filter.Q.setValueAtTime(options.q ?? 0.7, start);
        gain.gain.setValueAtTime(0.0001, start);
        gain.gain.exponentialRampToValueAtTime(level, start + attack);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + safeDuration);
        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(start);
        osc.stop(start + safeDuration + 0.03);
    }

    desertClick() {
        this.playSound(() => {
            const t = this.ctx.currentTime;
            this.scheduleDesertTone(392.00, t, 0.14, { type: 'triangle', gain: 0.040, filter: 2400, to: 349.23 });
            this.scheduleDesertTone(523.25, t + 0.035, 0.17, { type: 'sine', gain: 0.025, filter: 3300 });
        });
    }

    desertAnnounce() {
        this.playSound(() => {
            const t = this.ctx.currentTime;
            [293.66, 369.99, 440.00, 587.33].forEach((freq, i) => this.scheduleDesertTone(freq, t + i * 0.065, 0.40, { type: 'sine', gain: 0.042, filter: 3000 }));
        });
    }

    desertRoll() {
        this.playSound(() => {
            const now = this.ctx.currentTime;
            [174.61, 196.00, 220.00, 246.94, 261.63, 293.66].forEach((base, i) => {
                const offset = i * 0.048 + Math.random() * 0.014;
                const freq = base + Math.random() * 18;
                this.scheduleDesertTone(freq, now + offset, 0.12, { type: i % 2 ? 'sine' : 'triangle', gain: 0.036, filter: 1800, to: Math.max(70, freq * 0.72) });
            });
        });
    }

    desertScore() {
        this.playSound(() => {
            const t = this.ctx.currentTime;
            [329.63, 440.00, 523.25].forEach((freq, i) => this.scheduleDesertTone(freq, t + i * 0.065, 0.30, { type: 'triangle', gain: 0.044, filter: 3100 }));
        });
    }

    desertWin() {
        this.playSound(() => {
            const t = this.ctx.currentTime;
            [329.63, 392.00, 493.88, 659.25, 783.99].forEach((freq, i) => this.scheduleDesertTone(freq, t + i * 0.105, i > 2 ? 0.66 : 0.26, { type: i % 2 ? 'sine' : 'triangle', gain: i > 2 ? 0.055 : 0.046, filter: 3800 }));
        });
    }

    desertError() {
        this.playSound(() => {
            const t = this.ctx.currentTime;
            this.scheduleDesertTone(261.63, t, 0.19, { type: 'triangle', gain: 0.038, filter: 1500, to: 220.00 });
            this.scheduleDesertTone(196.00, t + 0.075, 0.24, { type: 'sine', gain: 0.028, filter: 1200, to: 164.81 });
        });
    }

    desertTrophy() {
        this.playSound(() => {
            const t = this.ctx.currentTime;
            [392.00, 493.88, 587.33].forEach(freq => this.scheduleDesertTone(freq, t, 0.92, { type: 'sine', gain: 0.052, filter: 3600 }));
            [783.99, 987.77].forEach((freq, i) => this.scheduleDesertTone(freq, t + 0.18 + i * 0.10, 0.46, { type: 'triangle', gain: 0.036, filter: 4200 }));
        });
    }

    click() { 
        if (this.isEasterThemeActive()) {
            this.easterClick();
            return;
        }
        if (this.isDesertThemeActive()) {
            this.desertClick();
            return;
        }
        this.playSound(() => {
            const t = this.ctx.currentTime; const osc = this.ctx.createOscillator(); const gain = this.ctx.createGain();
            osc.type = 'sine'; osc.frequency.setValueAtTime(800, t); osc.frequency.exponentialRampToValueAtTime(300, t + 0.1);
            gain.gain.setValueAtTime(0.15, t); gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
            osc.connect(gain); gain.connect(this.ctx.destination); osc.start(t); osc.stop(t + 0.1);
        });
    }

    announce() {
        if (this.isEasterThemeActive()) {
            this.easterAnnounce();
            return;
        }
        if (this.isDesertThemeActive()) {
            this.desertAnnounce();
            return;
        }
        this.playSound(() => {
            const t = this.ctx.currentTime; const freqs = [523.25, 659.25, 783.99, 1046.50]; 
            freqs.forEach((f, i) => {
                const osc = this.ctx.createOscillator(); const gain = this.ctx.createGain();
                osc.type = 'sine'; osc.frequency.value = f;
                const start = t + (i * 0.05);
                gain.gain.setValueAtTime(0, start); gain.gain.linearRampToValueAtTime(0.1, start + 0.05); gain.gain.exponentialRampToValueAtTime(0.001, start + 0.8); 
                osc.connect(gain); gain.connect(this.ctx.destination); osc.start(start); osc.stop(start + 1.0);
            });
        });
    }

    roll() {
        if (this.isEasterThemeActive()) {
            this.easterRoll();
            return;
        }
        if (this.isDesertThemeActive()) {
            this.desertRoll();
            return;
        }
        this.playSound(() => {
            const count = 6; const now = this.ctx.currentTime;
            for (let i = 0; i < count; i++) {
                const offset = i * 0.06 + (Math.random() * 0.02);
                const osc = this.ctx.createOscillator(); const gain = this.ctx.createGain(); const filter = this.ctx.createBiquadFilter(); 
                osc.type = 'square'; filter.type = 'lowpass'; filter.frequency.setValueAtTime(400 + Math.random() * 200, now + offset);
                osc.frequency.setValueAtTime(150 + Math.random() * 50, now + offset);
                gain.gain.setValueAtTime(0.2, now + offset); gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.1); 
                osc.connect(filter); filter.connect(gain); gain.connect(this.ctx.destination);
                osc.start(now + offset); osc.stop(now + offset + 0.12);
            }
        });
    }

    score() { 
        if (this.isEasterThemeActive()) {
            this.easterScore();
            return;
        }
        if (this.isDesertThemeActive()) {
            this.desertScore();
            return;
        }
        this.playSound(() => {
            const t = this.ctx.currentTime; const osc = this.ctx.createOscillator(); const gain = this.ctx.createGain();
            osc.type = 'triangle'; osc.frequency.setValueAtTime(440, t); osc.frequency.linearRampToValueAtTime(880, t + 0.1); 
            gain.gain.setValueAtTime(0.1, t); gain.gain.linearRampToValueAtTime(0, t + 0.3);
            osc.connect(gain); gain.connect(this.ctx.destination); osc.start(t); osc.stop(t + 0.3);
        });
    }

    win() {
        if (this.isEasterThemeActive()) {
            this.easterWin();
            return;
        }
        if (this.isDesertThemeActive()) {
            this.desertWin();
            return;
        }
        this.playSound(() => {
            const t = this.ctx.currentTime; const notes = [523.25, 659.25, 783.99, 1046.50, 783.99, 1046.50];
            notes.forEach((freq, i) => {
                const osc = this.ctx.createOscillator(); const gain = this.ctx.createGain();
                osc.type = 'triangle'; osc.frequency.value = freq;
                const start = t + (i * 0.15); const duration = (i === notes.length - 1) ? 0.8 : 0.2;
                gain.gain.setValueAtTime(0.15, start); gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
                osc.connect(gain); gain.connect(this.ctx.destination); osc.start(start); osc.stop(start + duration);
            });
        });
    }

    error() { 
        if (this.isEasterThemeActive()) {
            this.easterError();
            return;
        }
        if (this.isDesertThemeActive()) {
            this.desertError();
            return;
        }
        this.playSound(() => {
            const t = this.ctx.currentTime; const osc = this.ctx.createOscillator(); const gain = this.ctx.createGain();
            osc.type = 'sawtooth'; osc.frequency.setValueAtTime(150, t); osc.frequency.linearRampToValueAtTime(100, t + 0.15);
            gain.gain.setValueAtTime(0.1, t); gain.gain.linearRampToValueAtTime(0, t + 0.15);
            osc.connect(gain); gain.connect(this.ctx.destination); osc.start(t); osc.stop(t + 0.2);
        });
    }

    trophy() {
        if (this.isEasterThemeActive()) {
            this.easterTrophy();
            return;
        }
        if (this.isDesertThemeActive()) {
            this.desertTrophy();
            return;
        }
        this.playSound(() => {
            const t = this.ctx.currentTime;
            [440, 554.37].forEach(f => {
                const osc = this.ctx.createOscillator(); const gain = this.ctx.createGain();
                osc.type = 'sine'; osc.frequency.value = f;
                gain.gain.setValueAtTime(0.2, t); gain.gain.exponentialRampToValueAtTime(0.001, t + 1.5);
                osc.connect(gain); gain.connect(this.ctx.destination); osc.start(t); osc.stop(t + 1.5);
            });
        });
    }

    ufoAbduction() {
        this.playSound(() => {
            const now = this.ctx.currentTime;

            const humOsc = this.ctx.createOscillator();
            const humGain = this.ctx.createGain();
            const humFilter = this.ctx.createBiquadFilter();
            humOsc.type = 'sawtooth';
            humOsc.frequency.setValueAtTime(78, now);
            humOsc.frequency.linearRampToValueAtTime(54, now + 1.6);
            humOsc.frequency.linearRampToValueAtTime(118, now + 4.6);
            humOsc.frequency.exponentialRampToValueAtTime(36, now + 7.2);
            humFilter.type = 'lowpass';
            humFilter.frequency.setValueAtTime(420, now);
            humFilter.frequency.linearRampToValueAtTime(1100, now + 2.4);
            humFilter.frequency.exponentialRampToValueAtTime(180, now + 7.2);
            humGain.gain.setValueAtTime(0, now);
            humGain.gain.linearRampToValueAtTime(0.18, now + 0.35);
            humGain.gain.linearRampToValueAtTime(0.24, now + 2.2);
            humGain.gain.exponentialRampToValueAtTime(0.001, now + 7.3);
            humOsc.connect(humFilter);
            humFilter.connect(humGain);
            humGain.connect(this.ctx.destination);
            humOsc.start(now);
            humOsc.stop(now + 7.4);

            [0.58, 0.92, 1.28, 4.45, 5.15, 5.78].forEach((offset, index) => {
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                osc.type = index % 2 ? 'square' : 'triangle';
                osc.frequency.setValueAtTime(index % 2 ? 980 : 620, now + offset);
                osc.frequency.exponentialRampToValueAtTime(index % 2 ? 360 : 1320, now + offset + 0.22);
                gain.gain.setValueAtTime(0, now + offset);
                gain.gain.linearRampToValueAtTime(0.08, now + offset + 0.025);
                gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.34);
                osc.connect(gain);
                gain.connect(this.ctx.destination);
                osc.start(now + offset);
                osc.stop(now + offset + 0.36);
            });
        });
    }

    iceAge() {
        this.playSound(() => {
            const now = this.ctx.currentTime;
            const bufferSize = Math.floor(this.ctx.sampleRate * 1.45);
            const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
            const output = noiseBuffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) output[i] = Math.random() * 2 - 1;

            const frostNoise = this.ctx.createBufferSource();
            const frostFilter = this.ctx.createBiquadFilter();
            const frostGain = this.ctx.createGain();
            frostNoise.buffer = noiseBuffer;
            frostFilter.type = 'bandpass';
            frostFilter.frequency.setValueAtTime(5200, now);
            frostFilter.frequency.exponentialRampToValueAtTime(540, now + 1.15);
            frostFilter.Q.setValueAtTime(1.4, now);
            frostGain.gain.setValueAtTime(0, now);
            frostGain.gain.linearRampToValueAtTime(0.18, now + 0.08);
            frostGain.gain.exponentialRampToValueAtTime(0.001, now + 1.45);
            frostNoise.connect(frostFilter);
            frostFilter.connect(frostGain);
            frostGain.connect(this.ctx.destination);
            frostNoise.start(now);
            frostNoise.stop(now + 1.5);

            const hum = this.ctx.createOscillator();
            const humGain = this.ctx.createGain();
            hum.type = 'sine';
            hum.frequency.setValueAtTime(96, now);
            hum.frequency.exponentialRampToValueAtTime(44, now + 1.4);
            humGain.gain.setValueAtTime(0, now);
            humGain.gain.linearRampToValueAtTime(0.08, now + 0.16);
            humGain.gain.exponentialRampToValueAtTime(0.001, now + 1.55);
            hum.connect(humGain);
            humGain.connect(this.ctx.destination);
            hum.start(now);
            hum.stop(now + 1.6);

            [1760, 1320, 2217, 2637].forEach((freq, i) => {
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                const start = now + 0.08 + i * 0.075;
                osc.type = i % 2 ? 'sine' : 'triangle';
                osc.frequency.setValueAtTime(freq, start);
                osc.frequency.exponentialRampToValueAtTime(freq * 0.62, start + 0.42);
                gain.gain.setValueAtTime(0, start);
                gain.gain.linearRampToValueAtTime(0.055, start + 0.025);
                gain.gain.exponentialRampToValueAtTime(0.001, start + 0.5);
                osc.connect(gain);
                gain.connect(this.ctx.destination);
                osc.start(start);
                osc.stop(start + 0.52);
            });
        });
    }
     
    // --- PROCEDURALNI ZVUK GROMA ---
    thunder() {
        this.playSound(() => {
            const now = this.ctx.currentTime;
            
            const bufferSize = this.ctx.sampleRate * 4.5; 
            const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
            const output = noiseBuffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) {
                output[i] = Math.random() * 2 - 1; 
            }
            const noiseSrc = this.ctx.createBufferSource();
            noiseSrc.buffer = noiseBuffer;

            const filter = this.ctx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(150, now);
            filter.frequency.linearRampToValueAtTime(1000, now + 0.1); 
            filter.frequency.exponentialRampToValueAtTime(40, now + 4.5); 
            
            const gain = this.ctx.createGain();
            gain.gain.setValueAtTime(0, now);
            gain.gain.linearRampToValueAtTime(1.5, now + 0.05); 
            gain.gain.exponentialRampToValueAtTime(0.4, now + 0.4); 
            gain.gain.linearRampToValueAtTime(0.01, now + 4.5); 

            noiseSrc.connect(filter);
            filter.connect(gain);
            gain.connect(this.ctx.destination);
            noiseSrc.start(now);
            
            const osc = this.ctx.createOscillator();
            const oscGain = this.ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(50, now); 
            osc.frequency.exponentialRampToValueAtTime(10, now + 4.5); 
            
            oscGain.gain.setValueAtTime(0, now);
            oscGain.gain.linearRampToValueAtTime(1.2, now + 0.1);
            oscGain.gain.exponentialRampToValueAtTime(0.01, now + 4.5);
            
            osc.connect(oscGain);
            oscGain.connect(this.ctx.destination);
            osc.start(now);
            osc.stop(now + 4.5);
        });
    }

    // --- ZVUK ZVIŽDUKA RAKETE PRI POLETANJU ---
    fireworkLaunch() {
        this.playSound(() => {
            const now = this.ctx.currentTime;
            
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(300, now);
            osc.frequency.exponentialRampToValueAtTime(1500, now + 1.0); 
            
            gain.gain.setValueAtTime(0, now);
            gain.gain.linearRampToValueAtTime(0.08, now + 0.1);
            gain.gain.linearRampToValueAtTime(0, now + 1.0); 
            
            const bufferSize = this.ctx.sampleRate * 1.0;
            const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
            const output = noiseBuffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) output[i] = Math.random() * 2 - 1;
            
            const noiseSrc = this.ctx.createBufferSource();
            noiseSrc.buffer = noiseBuffer;
            const noiseFilter = this.ctx.createBiquadFilter();
            noiseFilter.type = 'highpass';
            noiseFilter.frequency.value = 1000;
            
            const noiseGain = this.ctx.createGain();
            noiseGain.gain.setValueAtTime(0.03, now);
            noiseGain.gain.linearRampToValueAtTime(0, now + 1.0);
            
            noiseSrc.connect(noiseFilter);
            noiseFilter.connect(noiseGain);
            noiseGain.connect(this.ctx.destination);
            noiseSrc.start(now);

            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(now);
            osc.stop(now + 1.0);
        });
    }

    // --- ZVUK JAKE EKSPLOZIJE ---
    fireworkExplode() {
        this.playSound(() => {
            const now = this.ctx.currentTime;
            
            const bufferSize = this.ctx.sampleRate * 2.0;
            const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
            const output = noiseBuffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) output[i] = Math.random() * 2 - 1;
            
            const noiseSrc = this.ctx.createBufferSource();
            noiseSrc.buffer = noiseBuffer;

            const filter = this.ctx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(1000, now);
            filter.frequency.exponentialRampToValueAtTime(100, now + 1.5); 

            const gain = this.ctx.createGain();
            gain.gain.setValueAtTime(0, now);
            gain.gain.linearRampToValueAtTime(0.8, now + 0.05); 
            gain.gain.exponentialRampToValueAtTime(0.01, now + 1.5); 

            noiseSrc.connect(filter);
            filter.connect(gain);
            gain.connect(this.ctx.destination);
            noiseSrc.start(now);
        });
    }

    // --- EPSKI HEROJSKI ZVUK (ZA DRONOVE V.2) ---
    epicDroneShow() {
        this.playSound(() => {
            const now = this.ctx.currentTime;
            
            const humOsc = this.ctx.createOscillator();
            const humGain = this.ctx.createGain();
            humOsc.type = 'sawtooth';
            humOsc.frequency.setValueAtTime(40, now); 
            humOsc.frequency.linearRampToValueAtTime(60, now + 2); 
            
            const humFilter = this.ctx.createBiquadFilter();
            humFilter.type = 'lowpass';
            humFilter.frequency.setValueAtTime(200, now);
            humFilter.frequency.linearRampToValueAtTime(800, now + 3);
            
            humGain.gain.setValueAtTime(0, now);
            humGain.gain.linearRampToValueAtTime(0.5, now + 2);
            humGain.gain.linearRampToValueAtTime(0, now + 7.5);
            
            humOsc.connect(humFilter);
            humFilter.connect(humGain);
            humGain.connect(this.ctx.destination);
            humOsc.start(now);
            humOsc.stop(now + 8);

            const chordFreqs = [261.63, 329.63, 392.00, 523.25]; 
            chordFreqs.forEach((freq) => {
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                const filter = this.ctx.createBiquadFilter();
                
                osc.type = 'square'; 
                osc.frequency.value = freq;
                
                filter.type = 'lowpass';
                filter.frequency.setValueAtTime(100, now);
                filter.frequency.exponentialRampToValueAtTime(3000, now + 1.5); 
                filter.frequency.exponentialRampToValueAtTime(500, now + 6); 

                gain.gain.setValueAtTime(0, now);
                gain.gain.linearRampToValueAtTime(0.15, now + 1.5); 
                gain.gain.exponentialRampToValueAtTime(0.01, now + 7);

                osc.connect(filter);
                filter.connect(gain);
                gain.connect(this.ctx.destination);
                osc.start(now);
                osc.stop(now + 8);
            });
        });
    }

    stopBalkanMusic(resumeMusic = true) {
        if (this.balkanStopTimer) {
            clearTimeout(this.balkanStopTimer);
            this.balkanStopTimer = null;
        }

        this.balkanNodes.forEach(node => {
            try {
                if (typeof node.stop === 'function') node.stop();
            } catch (err) {}
            try {
                if (typeof node.disconnect === 'function') node.disconnect();
            } catch (err) {}
        });
        this.balkanNodes = [];

        const shouldResume = resumeMusic && this.balkanResumeMusic && this.musicEnabled && this.musicVolume > 0;
        this.balkanResumeMusic = false;
        if (shouldResume) this.playMusic();
    }

    // --- SVADBA V.4 - BRZO KOLO U 2/4 TAKTU ---
    balkanTrumpet() {
        this.stopBalkanMusic(false);

        this.playSound(() => {
            const now = this.ctx.currentTime + 0.04;
            const bpm = 142;
            const beat = 60 / bpm;
            const eighth = beat / 2;
            const bar = beat * 2;
            const midiToFreq = midi => 440 * Math.pow(2, (midi - 69) / 12);
            const nodes = this.balkanNodes;
            const register = node => {
                nodes.push(node);
                return node;
            };
            const scheduleGate = (param, start, length, level, attack = 0.012) => {
                const releaseStart = start + Math.max(attack + 0.01, length * 0.7);
                param.setValueAtTime(0.0001, start);
                param.linearRampToValueAtTime(level, start + attack);
                param.setValueAtTime(level, releaseStart);
                param.exponentialRampToValueAtTime(0.0001, start + length);
            };

            this.balkanResumeMusic = !!(this.bgMusic && !this.bgMusic.paused);
            if (this.balkanResumeMusic) this.bgMusic.pause();

            const master = register(this.ctx.createGain());
            const compressor = register(this.ctx.createDynamicsCompressor());
            compressor.threshold.value = -20;
            compressor.knee.value = 14;
            compressor.ratio.value = 4;
            compressor.attack.value = 0.006;
            compressor.release.value = 0.16;
            master.gain.setValueAtTime(0.0001, now);
            master.gain.linearRampToValueAtTime(0.52, now + 0.08);
            master.connect(compressor);
            compressor.connect(this.ctx.destination);

            // Deset taktova po četiri osmine: živahna, ali i dalje igriva fraza kola.
            const melody = [
                81, 81, 83, 81, 78, 79, 81, 78,
                76, 78, 79, 81, 79, 78, 76, 78,
                81, 83, 85, 86, 85, 83, 81, 78,
                79, 81, 83, 79, 78, 76, 74, 76,
                78, 79, 81, 79, 78, 76, 74, 74
            ];

            const leadFilter = register(this.ctx.createBiquadFilter());
            const leadGain = register(this.ctx.createGain());
            const leadMain = register(this.ctx.createOscillator());
            const leadReed = register(this.ctx.createOscillator());
            leadMain.type = 'sawtooth';
            leadReed.type = 'square';
            leadReed.detune.value = 7;
            leadFilter.type = 'lowpass';
            leadFilter.frequency.value = 3200;
            leadFilter.Q.value = 1.4;
            leadGain.gain.value = 0.0001;
            leadMain.connect(leadFilter);
            leadReed.connect(leadFilter);
            leadFilter.connect(leadGain);
            leadGain.connect(master);

            melody.forEach((midi, index) => {
                const noteStart = now + index * eighth;
                const target = midiToFreq(midi);
                const ornamented = index % 8 === 0 || index === 18 || index === 34;
                leadMain.frequency.setValueAtTime(ornamented ? midiToFreq(midi - 1) : target, noteStart);
                leadReed.frequency.setValueAtTime(ornamented ? midiToFreq(midi - 1) : target, noteStart);
                if (ornamented) {
                    leadMain.frequency.exponentialRampToValueAtTime(target, noteStart + 0.028);
                    leadReed.frequency.exponentialRampToValueAtTime(target, noteStart + 0.028);
                }
                scheduleGate(leadGain.gain, noteStart, eighth * 0.88, index % 4 === 0 ? 0.13 : 0.105);
            });

            const chordRoots = [50, 50, 55, 57, 50, 55, 57, 50, 57, 50];
            const chordGain = register(this.ctx.createGain());
            const chordFilter = register(this.ctx.createBiquadFilter());
            const chordOscillators = [0, 4, 7].map((interval, index) => {
                const osc = register(this.ctx.createOscillator());
                osc.type = index === 1 ? 'square' : 'sawtooth';
                osc.detune.value = (index - 1) * 5;
                osc.connect(chordFilter);
                return { osc, interval };
            });
            chordFilter.type = 'lowpass';
            chordFilter.frequency.value = 1700;
            chordFilter.Q.value = 0.8;
            chordGain.gain.value = 0.0001;
            chordFilter.connect(chordGain);
            chordGain.connect(master);

            const bass = register(this.ctx.createOscillator());
            const bassFilter = register(this.ctx.createBiquadFilter());
            const bassGain = register(this.ctx.createGain());
            bass.type = 'triangle';
            bassFilter.type = 'lowpass';
            bassFilter.frequency.value = 460;
            bassGain.gain.value = 0.0001;
            bass.connect(bassFilter);
            bassFilter.connect(bassGain);
            bassGain.connect(master);

            const hat = register(this.ctx.createOscillator());
            const hatFilter = register(this.ctx.createBiquadFilter());
            const hatGain = register(this.ctx.createGain());
            hat.type = 'square';
            hat.frequency.value = 5200;
            hatFilter.type = 'highpass';
            hatFilter.frequency.value = 3900;
            hatGain.gain.value = 0.0001;
            hat.connect(hatFilter);
            hatFilter.connect(hatGain);
            hatGain.connect(master);

            const noiseBuffer = this.ctx.createBuffer(1, Math.floor(this.ctx.sampleRate * 0.1), this.ctx.sampleRate);
            const noiseData = noiseBuffer.getChannelData(0);
            for (let i = 0; i < noiseData.length; i++) {
                noiseData[i] = Math.random() * 2 - 1;
            }

            chordRoots.forEach((root, barIndex) => {
                const barStart = now + barIndex * bar;
                chordOscillators.forEach(({ osc, interval }) => {
                    osc.frequency.setValueAtTime(midiToFreq(root + interval), barStart);
                });
                scheduleGate(chordGain.gain, barStart, beat * 0.46, 0.048);
                scheduleGate(chordGain.gain, barStart + beat, beat * 0.46, 0.064);

                bass.frequency.setValueAtTime(midiToFreq(root - 12), barStart);
                scheduleGate(bassGain.gain, barStart, beat * 0.58, 0.16);
                bass.frequency.setValueAtTime(midiToFreq(root - 5), barStart + beat);
                scheduleGate(bassGain.gain, barStart + beat, beat * 0.58, 0.13);

                const kick = register(this.ctx.createOscillator());
                const kickGain = register(this.ctx.createGain());
                kick.type = 'sine';
                kick.frequency.setValueAtTime(118, barStart);
                kick.frequency.exponentialRampToValueAtTime(48, barStart + 0.11);
                kickGain.gain.setValueAtTime(0.18, barStart);
                kickGain.gain.exponentialRampToValueAtTime(0.0001, barStart + 0.13);
                kick.connect(kickGain);
                kickGain.connect(master);
                kick.start(barStart);
                kick.stop(barStart + 0.14);

                const snare = register(this.ctx.createBufferSource());
                const snareFilter = register(this.ctx.createBiquadFilter());
                const snareGain = register(this.ctx.createGain());
                snare.buffer = noiseBuffer;
                snareFilter.type = 'bandpass';
                snareFilter.frequency.value = 1700;
                snareFilter.Q.value = 0.7;
                snareGain.gain.setValueAtTime(0.09, barStart + beat);
                snareGain.gain.exponentialRampToValueAtTime(0.0001, barStart + beat + 0.09);
                snare.connect(snareFilter);
                snareFilter.connect(snareGain);
                snareGain.connect(master);
                snare.start(barStart + beat);
                snare.stop(barStart + beat + 0.1);
            });

            melody.forEach((_, index) => {
                const hitTime = now + index * eighth;
                scheduleGate(hatGain.gain, hitTime, Math.min(0.045, eighth * 0.3), index % 2 === 0 ? 0.018 : 0.012, 0.004);
            });

            const totalDuration = melody.length * eighth;
            master.gain.setValueAtTime(0.52, now + totalDuration - 0.28);
            master.gain.exponentialRampToValueAtTime(0.0001, now + totalDuration + 0.04);

            [leadMain, leadReed, bass, hat, ...chordOscillators.map(item => item.osc)].forEach(osc => {
                osc.start(now);
                osc.stop(now + totalDuration + 0.08);
            });

            this.balkanStopTimer = setTimeout(() => {
                this.stopBalkanMusic(true);
            }, Math.ceil((totalDuration + 0.12) * 1000));
        });
    }
    
    chat() { this.click(); }
    loss() { this.error(); }
}

// --- 6. SHOP MANAGER ---
class ShopManager {
    constructor(config) {
        this.type = config.type;
        this.items = config.items;
        this.container = document.getElementById(config.containerId);
        this.balanceEl = document.getElementById(config.balanceId);
        
        // NOVO: Odvojeno čuvanje za teme da bi radilo sa game.js
        this.unlockKey = (this.type === 'theme') ? 'yamb_unlocked_themes' : 'yamb_unlocked';
        
        let savedUnlocked = JSON.parse(localStorage.getItem(this.unlockKey)) || [];
        let opstiNiz = JSON.parse(localStorage.getItem('yamb_unlocked')) || [];
        let storedStatsInventory = {};
        try {
            storedStatsInventory = JSON.parse(localStorage.getItem('yamb_stats')) || {};
        } catch(e) {
            storedStatsInventory = {};
        }
        const managerStatsInventory = (window.statsManager && window.statsManager.stats) ? window.statsManager.stats : {};
        const statsInventory = { ...storedStatsInventory, ...managerStatsInventory };
        
        if (this.type === 'theme') {
            const cloudThemes = [
                ...(Array.isArray(statsInventory.unlockedThemes) ? statsInventory.unlockedThemes : []),
                ...filterYambThemeIds(statsInventory.unlockedSkins)
            ];
            savedUnlocked = [...new Set([
                ...filterYambThemeIds(savedUnlocked),
                ...filterYambThemeIds(opstiNiz),
                ...filterYambThemeIds(cloudThemes)
            ])];
            YAMB_FREE_THEME_IDS.forEach(item => {
                if (!savedUnlocked.includes(item)) savedUnlocked.push(item);
            });
        } else {
            let typedCloudUnlocks = [];
            if (this.type === 'skin' && Array.isArray(statsInventory.unlockedSkins)) {
                typedCloudUnlocks = statsInventory.unlockedSkins.filter(item => !YAMB_THEME_IDS.includes(item));
            } else if (this.type === 'effect' && Array.isArray(statsInventory.unlockedEffects)) {
                typedCloudUnlocks = statsInventory.unlockedEffects;
            } else if (this.type === 'trophy') {
                typedCloudUnlocks = [
                    ...(Array.isArray(storedStatsInventory.unlockedTrophies) ? storedStatsInventory.unlockedTrophies : []),
                    ...(Array.isArray(managerStatsInventory.unlockedTrophies) ? managerStatsInventory.unlockedTrophies : [])
                ];
            }
            savedUnlocked = [...new Set([...savedUnlocked, ...opstiNiz, ...typedCloudUnlocks])];
            ['default', 'confetti', 'dark', 'light', 'medium', 'winter'].forEach(item => {
                if (!savedUnlocked.includes(item)) savedUnlocked.push(item);
            });
            if (this.type === 'skin' && !savedUnlocked.includes('green_clay')) {
                savedUnlocked.push('green_clay');
            }
            if (this.type === 'skin') {
                const retired = new Set(['desert_glass', 'easter_neumorphic', 'severna_nebula']);
                const giftItems = this.items.filter(item => item.themeGift);
                const ownedThemes = this.getOwnedThemeIds();
                const unavailable = new Set(giftItems.filter(item => !ownedThemes.includes(item.themeGift)).map(item => item.id));
                const allowed = id => !retired.has(id) && !unavailable.has(id);
                savedUnlocked = savedUnlocked.filter(allowed);
                giftItems.filter(item => ownedThemes.includes(item.themeGift)).forEach(item => {
                    if (!savedUnlocked.includes(item.id)) savedUnlocked.push(item.id);
                });
                for (const key of ['yamb_unlocked', 'yamb_unlocked_skins']) {
                    let entries = [];
                    try { entries = JSON.parse(localStorage.getItem(key) || '[]'); } catch (_) {}
                    const next = [...new Set([...(Array.isArray(entries) ? entries : []).filter(allowed), ...giftItems.filter(item => ownedThemes.includes(item.themeGift)).map(item => item.id)])];
                    localStorage.setItem(key, JSON.stringify(next));
                }
                if (window.statsManager?.stats) {
                    const current = Array.isArray(window.statsManager.stats.unlockedSkins) ? window.statsManager.stats.unlockedSkins : [];
                    window.statsManager.stats.unlockedSkins = [...new Set([...current.filter(allowed), ...giftItems.filter(item => ownedThemes.includes(item.themeGift)).map(item => item.id)])];
                    window.statsManager.saveStats();
                }
            }
        }
        
        this.unlocked = savedUnlocked;
        localStorage.setItem(this.unlockKey, JSON.stringify(this.unlocked));
        
        this.balance = parseInt(localStorage.getItem('yamb_dukati')) || 0;
        
        if (this.type === 'skin') {
            this.activeKey = 'yamb_active_skin';
            this.activeItem = localStorage.getItem(this.activeKey) || 'default';
            if (!this.items.some(item => item.id === this.activeItem) || !this.unlocked.includes(this.activeItem)) {
                this.activeItem = 'default';
                localStorage.setItem(this.activeKey, this.activeItem);
            }
        } else if (this.type === 'theme') {
            this.activeKey = 'yamb_theme';
            this.activeItem = localStorage.getItem(this.activeKey) || 'dark';
        } else {
            this.activeKey = 'yamb_active_effect';
            this.activeItem = localStorage.getItem(this.activeKey) || 'confetti';
        }

        this.discountedItems = {}; 
        
        this.updateBalanceDisplay();
        this.render();
    }

    updateBalanceDisplay() {
        if (!this.balanceEl) return;
        const balance = Math.max(0, Number(this.balance) || 0);
        const compact = (value, unit) => {
            const scaled = balance / value;
            return `${Number.isInteger(scaled) ? scaled : scaled.toFixed(1)}${unit}`;
        };
        this.balanceEl.innerText = balance >= 1000000
            ? compact(1000000, 'M')
            : balance >= 10000 ? compact(1000, 'K') : String(balance);
        const fullBalance = balance.toLocaleString('sr-RS');
        this.balanceEl.title = fullBalance;
        this.balanceEl.setAttribute('aria-label', fullBalance);
    }

    getOwnedThemeIds() {
        const read = key => {
            try { const value = JSON.parse(localStorage.getItem(key) || '[]'); return Array.isArray(value) ? value : []; }
            catch (_) { return []; }
        };
        const stats = window.statsManager?.stats || {};
        let storedStats = {};
        try { storedStats = JSON.parse(localStorage.getItem('yamb_stats') || '{}') || {}; } catch (_) {}
        return [...new Set([
            ...YAMB_FREE_THEME_IDS, ...filterYambThemeIds(read('yamb_unlocked_themes')),
            ...filterYambThemeIds(read('yamb_unlocked')),
            ...filterYambThemeIds(stats.unlockedThemes), ...filterYambThemeIds(stats.unlockedSkins),
            ...filterYambThemeIds(storedStats.unlockedThemes), ...filterYambThemeIds(storedStats.unlockedSkins)
        ])];
    }

    grantThemeDiceSkinForTheme(themeId) {
        if (this.type !== 'theme' || !window.app || typeof window.app.ensureThemeDiceSkin !== 'function') return;
        const gift = SHOP_DATA.SKINS.find(item => item.themeGift === themeId);
        if (gift) window.app.ensureThemeDiceSkin(themeId, gift.id, { activateAsDefault: true, refreshActiveSkin: true });
    }

    getItemById(id) {
        const itemId = String(id || '').trim();
        return this.items.find(item => item.id === itemId) || null;
    }

    getItemBasePrice(item) {
        return Math.max(0, parseInt(item?.price, 10) || 0);
    }

    getDiscountedPrice(item, discount = null) {
        const basePrice = this.getItemBasePrice(item);
        const serverPrice = Math.max(0, parseInt(discount?.discountedPrice, 10) || 0);
        if (serverPrice > 0 && serverPrice < basePrice) return serverPrice;
        return Math.max(0, Math.floor(basePrice * 0.8));
    }

    getActiveDiscount(itemId) {
        const id = String(itemId || '').trim();
        const discount = this.discountedItems[id];
        if (!discount) return null;

        const expiresAt = Math.max(0, parseInt(discount.expiresAt, 10) || 0);
        if (expiresAt > 0 && expiresAt <= Date.now()) {
            delete this.discountedItems[id];
            return null;
        }

        return discount;
    }

    getCurrentItemPrice(item) {
        const discount = this.getActiveDiscount(item?.id);
        return discount ? this.getDiscountedPrice(item, discount) : this.getItemBasePrice(item);
    }

    getShopDiscountRewardOptions(item) {
        const itemId = String(item?.id || '').trim();
        const basePrice = this.getItemBasePrice(item);
        const discountedPrice = this.getDiscountedPrice(item);
        return {
            context: `shop_discount:${itemId}`,
            amount: Math.max(1, basePrice - discountedPrice)
        };
    }

    getShopAdUnlockRewardOptions(item) {
        const itemId = String(item?.id || '').trim();
        return {
            context: `shop_ad_unlock:${itemId}`,
            amount: 1
        };
    }

    groupByCategory() {
        const grouped = {};
        this.items.forEach(item => {
            if (this.type === 'skin' && item.themeGift && !this.getOwnedThemeIds().includes(item.themeGift)) return;
            const cat = resolveText(item.category) || _safeT('category_other');
            if (!grouped[cat]) grouped[cat] = [];
            grouped[cat].push(item);
        });
        return grouped;
    }

    getEasterTreasuryCategoryMeta(categoryName) {
        if (this.type !== 'skin') return null;
        const name = String(categoryName || '').toLowerCase();
        if (name.includes('bronza') || name.includes('bronze')) return { type: 'bronze', label: categoryName.replace('🥉', '').trim() };
        if (name.includes('srebr') || name.includes('silver')) return { type: 'silver', label: categoryName.replace('🥈', '').trim() };
        if (name.includes('zlat') || name.includes('gold')) return { type: 'gold', label: categoryName.replace('🥇', '').trim() };
        return null;
    }

    getEasterTreasuryStatusIcon(iconName, className = '') {
        return `<img class="treasury-status-icon ${className}" data-treasury-control="${iconName}" src="${getThemeTreasuryControlSource(iconName)}" alt="" aria-hidden="true" decoding="async">`;
    }

    getTreasuryLockIcon() {
        return `<img class="treasury-lock-icon" data-treasury-control="status-locked" src="${getThemeTreasuryControlSource('status-locked')}" alt="" aria-hidden="true" decoding="async">`;
    }

    getThemedTrophyCardSource(item) {
        const activeTheme = localStorage.getItem('yamb_theme') || 'dark';
        const source = {
            dark: item?.greenIcon,
            light: item?.lightIcon,
            medium: item?.mediumIcon,
            winter: item?.winterIcon,
            neon: item?.neonIcon,
            amethyst: item?.amethystIcon,
            desert: item?.desertIcon,
            moon: item?.moonIcon,
            severna: item?.severnaIcon,
            easter: item?.easterIcon
        }[activeTheme];
        const safeSource = globalThis.resolveThemeQualityAsset?.(String(source || '')) || String(source || '');
        if (!safeSource) return '';
        if (safeSource.includes('-quality-v2.png')) return safeSource;
        return `${safeSource}${safeSource.includes('?') ? '&' : '?'}card=384-v1`;
    }

    getTreasuryThemePreviewSource(themeId) {
        // Small PNGs derived from the approved backgrounds; full backgrounds stay in the game.
        const knownThemes = ['dark', 'light', 'medium', 'winter', 'neon', 'amethyst',
            'easter', 'desert', 'moon', 'severna'];
        return knownThemes.includes(themeId)
            ? `assets/treasury-theme-previews/${themeId}-v1.png`
            : '';
    }

    getTreasuryEffectPreviewSource(effectId) {
        const previewRoot = 'assets/effects/treasury-thumbnails-v1';
        if (effectId === 'ice_age') return `${previewRoot}/universal-ice-age-v1.png`;
        const selected = localStorage.getItem('yamb_theme') || 'dark';
        const theme = YAMB_THEME_IDS.includes(selected) ? selected : 'dark';
        if (effectId === 'balkan') return `${previewRoot}/universal-balkan-v1.png`;
        if (effectId === 'dragon_fire') return `${previewRoot}/universal-dragon-fire-v1.png`;
        if (effectId === 'ufo_abduction') return `${previewRoot}/${theme}-ufo-abduction-v1.png`;
        if (effectId === 'royal_yamb') return `${previewRoot}/${theme}-royal-yamb-v1.png`;
        if (effectId === 'black_hole' && YAMB_THEME_IDS.includes(theme)) {
            return `${previewRoot}/${theme}-black-hole-v1.png`;
        }
        if (effectId === 'supernova') {
            return `${previewRoot}/${theme}-supernova-v1.png`;
        }
        const roles = {
            confetti: 'confetti', gold_rain: 'gold-rain', balkan: 'wedding',
            thunder: 'thunder', fireworks: 'fireworks', bubbles: 'bubbles',
            cosmic_dust: 'cosmic-dust', dragon_fire: 'dragon-fire',
            royal_yamb: 'royal-yamb', fireflies: 'fireflies', ice_age: 'ice-age',
            black_hole: 'black-hole', supernova: 'supernova', neon_pulse: 'neon-pulse',
            drones: 'drones', ufo_abduction: 'ufo-abduction'
        };
        const role = roles[effectId];
        if (theme === 'dark' && role) {
            const source = `assets/green-soft-clay/canonical/treasury-effect-thumbnails/preview-${role}-v${['fireflies', 'bubbles'].includes(role) ? 2 : 1}.png`;
            return globalThis.resolveThemeQualityAsset?.(source) || source;
        }
        const validThemes = ['light', 'medium', 'winter', 'neon', 'amethyst', 'easter',
            'desert', 'moon', 'severna'];
        const version = ['fireflies', 'bubbles'].includes(role) || (['easter', 'desert', 'severna'].includes(theme) && effectId === 'gold_rain') ? 2 : 1;
        const source = role && validThemes.includes(theme)
            ? `assets/theme-packs/${theme}/canonical/treasury-effect-thumbnails/preview-${role}-v${version}.png`
            : '';
        return globalThis.resolveThemeQualityAsset?.(source) || source;
    }

    getTreasuryRewardVideoIcon() {
        return '<img class="riznica-item-reward-video-green-soft-clay-icon" data-theme-src="assets/green-soft-clay/canonical/rewarded-video/rewarded-video-active-inline-v1.png?v=1" loading="lazy" alt="" aria-hidden="true" decoding="async">';
    }

    getTreasuryInsufficientIconPath() {
        return getThemeTreasuryControlSource('status-insufficient');
    }

    render() {
        if (!this.container) return;
        this.container.innerHTML = '';
        const groupedItems = this.groupByCategory();
        const isGreenTreasury = document.body.matches('body:not(:is(.light-theme, .medium-theme, .winter-theme, .neon-theme, .amethyst-theme, .easter-theme, .desert-theme, .moon-theme, .severna-theme))');

        for (const [categoryName, items] of Object.entries(groupedItems)) {
            const section = document.createElement('div');
            section.className = 'category-section';
            const categoryMeta = this.getEasterTreasuryCategoryMeta(categoryName);
            const categoryControl = {
                trophy: 'tab-trophies', skin: 'tab-skins',
                effect: 'tab-effects', theme: 'tab-themes'
            }[this.type];
            const cleanCategoryName = categoryName.replace(/^[^\p{L}\p{N}]+\s*/u, '');
            const categoryHtml = categoryMeta
                ? `<img class="theme-collection-medal" src="${getThemeMedalSource('collection', categoryMeta.type)}" loading="lazy" alt="" aria-hidden="true" decoding="async"><span>${categoryMeta.label}</span>`
                : `<img class="treasury-category-icon" data-treasury-control="${categoryControl}" src="${getThemeTreasuryControlSource(categoryControl)}" loading="lazy" alt="" aria-hidden="true" decoding="async"><span>${cleanCategoryName}</span>`;
            section.innerHTML = `<div class="category-header" ${categoryMeta ? `data-treasury-collection="${categoryMeta.type}"` : ''}>${categoryHtml}</div>`;
            
            const grid = document.createElement('div');
            grid.className = 'category-grid'; 

            items.forEach(item => {
                const isUnlocked = this.unlocked.includes(item.id);
                const isActive = this.activeItem === item.id;
                
                const card = document.createElement('div');
                const activeClass = (isActive) ? (this.type === 'skin' ? 'active-skin' : 'active-effect') : '';
                const lockedClass = (!isUnlocked && this.type === 'trophy') ? 'locked' : ''; 
                
                card.className = `card ${activeClass} ${lockedClass}`;

                let visualHtml = '';
                if (this.type === 'skin') {
                    const pipPreview = '<div class="dice-dots-wrapper val-6" aria-hidden="true">' + '<div class="dice-dot"></div>'.repeat(6) + '</div>';
                    const skinSource = `assets/treasury-skin-previews/${item.id}-face-v1.png`;
                    visualHtml = `<div class="dice-preview preview-${item.id}"><img class="treasury-skin-image" src="${skinSource}" loading="lazy" decoding="async" alt="" aria-hidden="true">${pipPreview}</div>`;
                } else if (this.type === 'effect') {
                    const canonicalEffectPreview = ['confetti', 'gold_rain', 'balkan', 'thunder', 'fireworks', 'bubbles', 'cosmic_dust', 'dragon_fire', 'royal_yamb', 'fireflies', 'ice_age', 'black_hole', 'supernova', 'neon_pulse', 'drones', 'ufo_abduction'].includes(item.id);
                    const effectPreview = item.id === 'royal_yamb'
                        ? `<img class="royal-yamb-logo-preview" src="${getActiveGameLogoSource()}" alt="" loading="lazy" decoding="async">`
                        : (item.innerHtml || '');
                    const effectSource = canonicalEffectPreview ? this.getTreasuryEffectPreviewSource(item.id) : '';
                    const effectImage = effectSource
                        ? `<img class="treasury-effect-image" src="${effectSource}" loading="lazy" decoding="async" alt="" aria-hidden="true">`
                        : '';
                    visualHtml = `<div class="effect-preview-box ${item.cssClass}">${effectImage || (canonicalEffectPreview ? '' : effectPreview)}</div>`;
                } else if (this.type === 'trophy' && item.easterIcon) {
                    visualHtml = `<div class="icon riznica-trophy-visual"><img class="riznica-trophy-soft-clay-icon" src="${this.getThemedTrophyCardSource(item)}" loading="lazy" fetchpriority="low" alt="" aria-hidden="true" decoding="async"></div>`;
                } else if (this.type === 'theme') {
                    const previewSource = this.getTreasuryThemePreviewSource(item.id);
                    visualHtml = `<div class="treasury-theme-preview"><img src="${previewSource}" loading="lazy" fetchpriority="low" alt="" aria-hidden="true" decoding="async"></div>`;
                } else {
                    visualHtml = `<div class="icon">${item.icon}</div>`;
                }

                const itemName = resolveText(item.title) || resolveText(item.name);
                const itemDesc = resolveText(item.desc);

                let priceHtml = '';
                if (this.type === 'trophy') {
                    const lockedStatusIcon = isUnlocked ? '' : this.getEasterTreasuryStatusIcon('status-locked');
                    priceHtml = `<div class="status ${isUnlocked ? 'status-unlocked' : 'status-locked'} ${isUnlocked ? '' : 'riznica-item-status riznica-item-status--locked'}">${lockedStatusIcon}<span>${isUnlocked ? _safeT('btn_won') : `${dukatIconHtml()} ${item.reward}`}</span></div>`;
                } else {
                    if (isUnlocked) {
                        const boughtLabel = _safeT('btn_bought');
                        const visibleBoughtLabel = boughtLabel.replace(/^\s*[✔✓]\s*/u, '');
                        priceHtml = `<div class="price riznica-item-status riznica-item-status--owned">${this.getEasterTreasuryStatusIcon('status-owned')}<span>${visibleBoughtLabel}</span></div>`;
                    } else {
                        // NOVO: Provera da li se otključava reklamama
                        if (this.type === 'skin' && item.themeGift) {
                            priceHtml = `<div class="price">${resolveText({ sr: 'Besplatno uz temu', en: 'Free with theme' })}</div>`;
                        } else if (item.adUnlock) {
                            const watchToUnlockLabel = String(_safeT('shop_watch_to_unlock') || 'Gledaj 📺 za otključavanje');
                            const watchToUnlockText = isGreenTreasury
                                ? `${this.getTreasuryRewardVideoIcon()}<span>${watchToUnlockLabel.replace(/\s*📺\s*/u, ' ').trim()}</span>`
                                : watchToUnlockLabel.replace('📺', this.getTreasuryRewardVideoIcon());
                            priceHtml = `<div class="price riznica-reward-video-copy" style="color: var(--text-muted); font-size: 0.75rem;">${watchToUnlockText}</div>`;
                        } else {
                            let price = item.price;
                            let displayPrice = `${price} ${dukatIconHtml()}`;
                            const activeDiscount = this.getActiveDiscount(item.id);
                            
                            if (activeDiscount) {
                                const discounted = this.getDiscountedPrice(item, activeDiscount);
                                displayPrice = `<span class="old-price">${price}</span> ${discounted} ${dukatIconHtml()}`;
                            }
                            priceHtml = `<div class="price">${displayPrice}</div>`;
                        }
                    }
                }

                let btnHtml = '';
                if (this.type !== 'trophy') {
                    if (isActive) {
                        btnHtml = `<button class="btn-action btn-active riznica-item-status riznica-item-status--active">${this.getEasterTreasuryStatusIcon('status-active')}<span>${_safeT('btn_active')}</span></button>`;
                    } else if (isUnlocked) {
                        btnHtml = `<button class="btn-action btn-equip" onclick="shop.equip('${item.id}')">${_safeT('btn_equip')}</button>`;
                    } else if (this.type === 'skin' && item.themeGift) {
                        const giftTheme = SHOP_DATA.THEMES.find(theme => theme.id === item.themeGift);
                        const giftThemeName = resolveText(giftTheme?.name) || item.themeGift;
                        btnHtml = `<div class="req-text riznica-item-status riznica-item-status--locked">${this.getEasterTreasuryStatusIcon('status-locked')}<span>${resolveText({ sr: 'Izaberi temu', en: 'Select theme' })}: ${giftThemeName}</span></div>`;
                    } else {
                        const reqMet = !item.req || this.unlocked.includes(item.req);
                        
                        if (reqMet) {
                            // NOVO: Logika za dugme koje otključava reklamama
                            if (item.adUnlock) {
                                let adProgress = parseInt(localStorage.getItem(`yamb_adprogress_${item.id}`)) || 0;
                                btnHtml = `<button class="btn-action btn-ad-state-aware riznica-reward-video-action" style="background: linear-gradient(45deg, #FF9800, #F57C00); color: white; border: none; border-radius: 8px; padding: 5px 10px; font-weight: bold; cursor: pointer; text-shadow: 1px 1px 0px rgba(0,0,0,0.3);" onclick="shop.watchAdForUnlock('${item.id}', ${item.adUnlock})">${this.getTreasuryRewardVideoIcon()}<span>${adProgress} / ${item.adUnlock}</span></button>`;
                            } else {
                                const activeDiscount = this.getActiveDiscount(item.id);
                                let currentPrice = this.getCurrentItemPrice(item);
                                const safeName = itemName.replace(/'/g, "\\'"); 
                                
                                let discountBtn = '';
                                if(!activeDiscount) {
                                    discountBtn = `<button class="btn-action btn-discount btn-ad-state-aware riznica-reward-video-action" onclick="shop.watchAdDiscount('${item.id}')">${this.getTreasuryRewardVideoIcon()}<span>-20%</span></button>`;
                                }

                                btnHtml = `
                                    <div class="btn-group">
                                        <button class="btn-action btn-buy" onclick="shop.tryBuy('${item.id}', '${safeName}', ${currentPrice})">${_safeT('btn_buy')}</button>
                                        ${discountBtn}
                                    </div>`;
                            }
                        } else {
                            btnHtml = `<div class="req-text riznica-item-status riznica-item-status--locked">${this.getEasterTreasuryStatusIcon('status-locked')}<span>${_safeT('shop_unlock')} ${resolveText(item.reqName)}</span></div>`;
                        }
                    }
                } else {
                    btnHtml = `<div class="desc">${isUnlocked ? itemDesc : `??? (${this.getTreasuryLockIcon()})`}</div>`;
                }

                card.innerHTML = `
                    ${visualHtml}
                    <div class="title">${itemName}</div>
                    ${this.type === 'effect' ? `<div class="duration">${resolveText(item.duration)}</div>` : ''} ${this.type !== 'trophy' ? `<div class="desc">${itemDesc || ''}</div>` : ''}
                    ${priceHtml}
                    ${btnHtml}
                `;

                grid.appendChild(card);
            });

            section.appendChild(grid);
            this.container.appendChild(section);
        }
        
        if(window.adMobGlobal) {
            const isAnyReady = window.adMobGlobal.ads.rewarded.isReady;
            window.adMobGlobal.updateUI(isAnyReady);
        }
    }

    equip(id) {
        const itemId = String(id || '').trim();
        const itemExists = this.items.some(item => item.id === itemId);
        const item = this.getItemById(itemId);
        if (!itemExists || !this.unlocked.includes(itemId) || (this.type === 'skin' && item?.themeGift && !this.getOwnedThemeIds().includes(item.themeGift))) {
            this.render();
            return;
        }

        this.activeItem = itemId;
        localStorage.setItem(this.activeKey, itemId);
        if (this.type === 'skin' && window.app) {
            window.app.skinManualSwitchUntil = Date.now() + 3500;
            localStorage.setItem('yamb_manual_active_skin', itemId);
            localStorage.setItem('yamb_manual_active_skin_at', String(Date.now()));
        }
        this.render();
        
        if(window.app && window.app.soundMgr) window.app.soundMgr.click();

        if (this.type === 'theme') {
            if (window.app && typeof window.app.applyTheme === 'function') {
                window.app.applyTheme(itemId);
            } else {
                document.body.className = ''; 
                if (itemId !== 'dark') document.body.classList.add(itemId + '-theme');
            }
            
            const themeSelect = document.getElementById('setting-theme');
            if (themeSelect) themeSelect.value = itemId;
        } else if (this.type === 'effect') {
            window.app?.effectMgr?.applyPermanent(itemId);
        } else if (this.type === 'skin' && window.app && window.app.features) {
            if (typeof window.app.updateDiceVisuals === 'function') {
                window.app.updateDiceVisuals();
            }
            document.querySelectorAll('.daily-glass-die.dice').forEach(el => {
                window.app.features.applySkinToElement(el, el.classList.contains('held'));
            });
        }

        if (window.app && window.app.socket && window.app.socket.connected && localStorage.getItem('yamb_uid')) {
            window.app.socket.emit('set_player_data', {
                uid: localStorage.getItem('yamb_uid'),
                name: window.app.playerName,
                stats: window.app.getFullLocalStats(),
                playerId: window.app.playerId
            });
        }
    }

    async tryBuy(id, name, price) {
        const item = this.getItemById(id);
        const currentPrice = item ? this.getCurrentItemPrice(item) : Math.max(0, parseInt(price, 10) || 0);

        if (this.balance < currentPrice) {
            if (typeof window.showNotification === 'function') {
                window.showNotification(_safeT('modal_title_info'), _safeT('msg_no_money') || "Nemate dovoljno dukata!", {
                    icon: this.getTreasuryInsufficientIconPath(),
                    className: 'treasury-insufficient-toast'
                });
            } else if (window.modalManager && window.modalManager.overlay) {
                window.modalManager.alert(_safeT('msg_no_money') || "Nemate dovoljno dukata!", _safeT('modal_title_info'));
            } else {
                alert(_safeT('msg_no_money') || "Nemate dovoljno dukata!");
            }
            return;
        }
        
        if (typeof window.openConfirmModal === 'function') {
            window.openConfirmModal(id, name, currentPrice);
        } else if (window.modalManager && window.modalManager.overlay) {
            const isConfirmed = await window.modalManager.confirm(`${_safeT('msg_confirm_buy')} ${name}?`);
            if (isConfirmed) {
                this.processTransaction(id, currentPrice);
            }
        }
    }

    processTransaction(id, price) {
        const itemId = String(id || '').trim();
        const item = this.getItemById(itemId);
        const safePrice = item ? this.getCurrentItemPrice(item) : Math.max(0, parseInt(price, 10) || 0);

        if (!itemId || !item) return false;

        // Tematski poklon se dobija uz otključanu temu, ne kupovinom za 0 dukata.
        if (this.type === 'skin' && item.themeGift && !this.unlocked.includes(itemId)) return false;

        if (this.unlocked.includes(itemId)) {
            this.updateBalanceDisplay();
            this.render();
            return false;
        }

        if (this.balance < safePrice) {
            if (typeof window.showNotification === 'function') {
                window.showNotification(_safeT('modal_title_info'), _safeT('msg_no_money') || "Nemate dovoljno dukata!", {
                    icon: this.getTreasuryInsufficientIconPath(),
                    className: 'treasury-insufficient-toast'
                });
            } else if (window.modalManager && window.modalManager.overlay) {
                window.modalManager.alert(_safeT('msg_no_money') || "Nemate dovoljno dukata!", _safeT('modal_title_info'));
            } else {
                alert(_safeT('msg_no_money') || "Nemate dovoljno dukata!");
            }
            this.updateBalanceDisplay();
            return false;
        }

        this.balance -= safePrice;
        this.unlocked.push(itemId);
        delete this.discountedItems[itemId];
        
        localStorage.setItem('yamb_dukati', this.balance);
        localStorage.setItem(this.unlockKey, JSON.stringify(this.unlocked));
        
        let opstiNiz = JSON.parse(localStorage.getItem('yamb_unlocked')) || [];
        if (!opstiNiz.includes(itemId)) {
            opstiNiz.push(itemId);
            localStorage.setItem('yamb_unlocked', JSON.stringify(opstiNiz));
        }

        if (window.statsManager) {
            window.statsManager.stats.balance = this.balance;
            const statsFieldByType = {
                skin: 'unlockedSkins',
                effect: 'unlockedEffects',
                theme: 'unlockedThemes'
            };
            const storageKeyByType = {
                skin: 'yamb_unlocked_skins',
                effect: 'yamb_unlocked_effects',
                theme: 'yamb_unlocked_themes'
            };
            const statsField = statsFieldByType[this.type];
            const storageKey = storageKeyByType[this.type];

            if (statsField) {
                if (!Array.isArray(window.statsManager.stats[statsField])) {
                    window.statsManager.stats[statsField] = [];
                }
                if (!window.statsManager.stats[statsField].includes(itemId)) {
                    window.statsManager.stats[statsField].push(itemId);
                }
            }

            if (storageKey) {
                const typedUnlocked = JSON.parse(localStorage.getItem(storageKey) || '[]');
                if (!typedUnlocked.includes(itemId)) {
                    typedUnlocked.push(itemId);
                    localStorage.setItem(storageKey, JSON.stringify(typedUnlocked));
                }
            }
            window.statsManager.saveStats();
        }

        if (this.type === 'theme') this.grantThemeDiceSkinForTheme(itemId);

        if (window.app && window.app.socket && window.app.socket.connected && localStorage.getItem('yamb_uid')) {
            window.app.socket.emit('set_player_data', {
                uid: localStorage.getItem('yamb_uid'),
                name: window.app.playerName,
                stats: window.app.getFullLocalStats(),
                playerId: window.app.playerId
            });
        }

        this.updateBalanceDisplay();
        this.render();
        
        if(window.app && window.app.soundMgr) window.app.soundMgr.trophy(); 

        if (typeof window.showNotification === 'function') {
            window.showNotification(_safeT('modal_title_info'), _safeT('msg_purchase_success') || "Kupovina uspešna!");
        } else if (window.modalManager && window.modalManager.overlay) {
            window.modalManager.alert(_safeT('msg_purchase_success'), _safeT('modal_title_info'));
        }
    }

    getAdController() {
        return window.adMobGlobal;
    }

    async watchAdDiscount(id) {
        const item = this.getItemById(id);
        if (!item || this.unlocked.includes(item.id) || this.getItemBasePrice(item) <= 0) return;

        const adCtrl = this.getAdController();
        if (adCtrl) {
            const rewardOptions = this.getShopDiscountRewardOptions(item);
            const isRewardReady = typeof adCtrl.isRewardVideoReadyFor === 'function'
                ? adCtrl.isRewardVideoReadyFor(rewardOptions)
                : adCtrl.ads.rewarded.isReady;

            if (!isRewardReady) adCtrl.prepareReward(rewardOptions);

            const success = await adCtrl.showRewardVideo(rewardOptions);
            if (success) {
                const ssvNonce = typeof adCtrl.consumeLastRewardSsvNonce === 'function'
                    ? adCtrl.consumeLastRewardSsvNonce()
                    : '';
                const discountResult = typeof adCtrl.claimRewardWithSsvRetry === 'function'
                    ? await adCtrl.claimRewardWithSsvRetry(
                        () => this.claimServerShopDiscount(item.id, ssvNonce),
                        { nonce: ssvNonce, context: rewardOptions.context }
                    )
                    : await this.claimServerShopDiscount(item.id, ssvNonce);

                if (!discountResult.ok) {
                    this.showAdClaimError(discountResult);
                    return;
                }

                this.discountedItems[item.id] = {
                    discountedPrice: discountResult.discountedPrice,
                    expiresAt: discountResult.expiresAt
                };
                this.render();
                this.showRewardMessage(_safeT('msg_discount_applied') || "Popust primenjen! -20%", _safeT('modal_title_info') || "INFO");
            }
        }
    }
    
    // NOVO: Funkcija za otključavanje predmeta/teme gledanjem serije reklama
    async watchAdForUnlock(id, target) {
        const item = this.getItemById(id);
        const requiredTarget = Math.max(1, parseInt(item?.adUnlock || target, 10) || 0);
        if (!item || this.unlocked.includes(item.id) || requiredTarget <= 0) return;

        const adCtrl = this.getAdController();
        if (adCtrl) {
            const rewardOptions = this.getShopAdUnlockRewardOptions(item);
            const isRewardReady = typeof adCtrl.isRewardVideoReadyFor === 'function'
                ? adCtrl.isRewardVideoReadyFor(rewardOptions)
                : adCtrl.ads.rewarded.isReady;

            if (!isRewardReady) adCtrl.prepareReward(rewardOptions);

            const success = await adCtrl.showRewardVideo(rewardOptions);
            if (success) {
                const ssvNonce = typeof adCtrl.consumeLastRewardSsvNonce === 'function'
                    ? adCtrl.consumeLastRewardSsvNonce()
                    : '';
                const unlockResult = typeof adCtrl.claimRewardWithSsvRetry === 'function'
                    ? await adCtrl.claimRewardWithSsvRetry(
                        () => this.claimServerShopAdUnlock(item.id, ssvNonce),
                        { nonce: ssvNonce, context: rewardOptions.context }
                    )
                    : await this.claimServerShopAdUnlock(item.id, ssvNonce);

                if (!unlockResult.ok) {
                    this.showAdClaimError(unlockResult);
                    return;
                }

                let progress = Math.max(0, parseInt(unlockResult.progress, 10) || 0);
                let unlocked = unlockResult.unlocked === true;
                if (unlockResult.localFallback) {
                    progress = (parseInt(localStorage.getItem(`yamb_adprogress_${item.id}`), 10) || 0) + 1;
                    unlocked = progress >= requiredTarget;
                }
                progress = Math.min(requiredTarget, progress);
                
                if (unlocked) {
                    // Otključano
                    if (!this.unlocked.includes(item.id)) {
                        this.unlocked.push(item.id);
                    }
                    localStorage.setItem(this.unlockKey, JSON.stringify(this.unlocked));
                    localStorage.removeItem(`yamb_adprogress_${item.id}`);

                    let opstiNiz = JSON.parse(localStorage.getItem('yamb_unlocked')) || [];
                    if (!opstiNiz.includes(item.id)) {
                        opstiNiz.push(item.id);
                        localStorage.setItem('yamb_unlocked', JSON.stringify(opstiNiz));
                    }

                    if (window.statsManager) {
                        const statsFieldByType = {
                            skin: 'unlockedSkins',
                            effect: 'unlockedEffects',
                            theme: 'unlockedThemes'
                        };
                        const statsField = statsFieldByType[this.type];
                        if (statsField) {
                            if (!Array.isArray(window.statsManager.stats[statsField])) {
                                window.statsManager.stats[statsField] = [];
                            }
                            if (!window.statsManager.stats[statsField].includes(item.id)) {
                                window.statsManager.stats[statsField].push(item.id);
                            }
                            window.statsManager.saveStats();
                        }
                    }

                    if (this.type === 'theme') this.grantThemeDiceSkinForTheme(item.id);
                    if(window.app && window.app.soundMgr) window.app.soundMgr.trophy();
                    this.syncShopStateToServer();
                    
                    if (typeof window.showNotification === 'function') {
                        window.showNotification(_safeT('success_title') || "USPEŠNO!", _safeT('theme_unlock_success') || "Tema je uspešno otključana!");
                    } else if (window.modalManager && window.modalManager.overlay) {
                        window.modalManager.alert(_safeT('theme_unlock_success') || "Tema je uspešno otključana!", _safeT('success_title') || "USPEŠNO!");
                    }
                } else {
                    // Samo napredak
                    localStorage.setItem(`yamb_adprogress_${item.id}`, progress);
                    if(window.app && window.app.soundMgr) window.app.soundMgr.win();
                }
                this.render();
            }
        }
    }

    addBalance(amount, syncToServer = true) {
        this.balance += amount;
        localStorage.setItem('yamb_dukati', this.balance);
        if (window.statsManager) {
            window.statsManager.stats.balance = this.balance;
            window.statsManager.saveStats();
        }
        this.updateBalanceDisplay();
        
        if (syncToServer && window.app && window.app.socket && window.app.socket.connected) {
            window.app.socket.emit('set_player_data', {
                uid: localStorage.getItem('yamb_uid') || window.app.playerId,
                name: window.app.playerName,
                stats: window.app.getFullLocalStats(),
                playerId: window.app.playerId
            });
        }

        return true;
    }

    setServerBalance(balance) {
        const safeBalance = Math.max(0, parseInt(balance) || 0);
        this.balance = safeBalance;
        localStorage.setItem('yamb_dukati', safeBalance);
        if (window.statsManager) {
            window.statsManager.stats.balance = safeBalance;
            window.statsManager.saveStats();
        }
        this.updateBalanceDisplay();
    }

    async claimServerAdReward(ssvNonce = '') {
        const app = window.app;
        if (!app || !app.socket || !app.socket.connected) {
            return { ok: false, reason: 'err_server_conn' };
        }

        if (typeof app.authenticateSocketIdentity === 'function') {
            const authResult = await app.authenticateSocketIdentity();
            if (!authResult || !authResult.ok) {
                return { ok: false, reason: 'auth_required' };
            }
        }

        return new Promise(resolve => {
            let settled = false;
            const timer = setTimeout(() => {
                if (settled) return;
                settled = true;
                resolve({ ok: false, reason: 'err_server_conn' });
            }, 45000);

            app.socket.emit('claim_shop_ad_reward', { ssvNonce, clientRewarded: true }, (result) => {
                if (settled) return;
                settled = true;
                clearTimeout(timer);
                resolve(result || { ok: false, reason: 'err_server_conn' });
            });
        });
    }

    async claimServerShopDiscount(itemId, ssvNonce = '') {
        const app = window.app;
        if (!app || !app.socket || !app.socket.connected) {
            return { ok: false, reason: 'err_server_conn' };
        }

        if (typeof app.authenticateSocketIdentity === 'function') {
            const authResult = await app.authenticateSocketIdentity();
            if (!authResult || !authResult.ok) {
                return { ok: false, reason: 'auth_required' };
            }
        }

        return new Promise(resolve => {
            let settled = false;
            const timer = setTimeout(() => {
                if (settled) return;
                settled = true;
                resolve({ ok: false, reason: 'err_server_conn' });
            }, 45000);

            app.socket.emit('claim_shop_discount', { itemId, ssvNonce, clientRewarded: true }, (result) => {
                if (settled) return;
                settled = true;
                clearTimeout(timer);
                resolve(result || { ok: false, reason: 'err_server_conn' });
            });
        });
    }

    async claimServerShopAdUnlock(itemId, ssvNonce = '') {
        const app = window.app;
        if (!app || !app.socket || !app.socket.connected) {
            return { ok: false, reason: 'err_server_conn' };
        }

        if (typeof app.authenticateSocketIdentity === 'function') {
            const authResult = await app.authenticateSocketIdentity();
            if (!authResult || !authResult.ok) {
                return { ok: false, reason: 'auth_required' };
            }
        }

        return new Promise(resolve => {
            let settled = false;
            const timer = setTimeout(() => {
                if (settled) return;
                settled = true;
                resolve({ ok: false, reason: 'err_server_conn' });
            }, 45000);

            app.socket.emit('claim_shop_ad_unlock', { itemId, ssvNonce, clientRewarded: true }, (result) => {
                if (settled) return;
                settled = true;
                clearTimeout(timer);
                resolve(result || { ok: false, reason: 'err_server_conn' });
            });
        });
    }

    showRewardMessage(message, title) {
        if (typeof window.showNotification === 'function') {
            window.showNotification(title, message);
        } else if (window.modalManager && window.modalManager.overlay) {
            window.modalManager.alert(message, title);
        }
    }

    showAdClaimError(result = {}) {
        const cooldown = Math.ceil((result.retryAfterMs || 0) / 1000);
        let message = _safeT('err_server_conn') || "Greška pri konekciji sa serverom.";
        if (result.reason === 'ad_reward_cooldown') {
            message = (_safeT('economy_reward_cooldown') || "Nagrada je već obrađena. Pokušajte ponovo za {0}s.").replace('{0}', cooldown || 1);
        } else if (result.reason === 'auth_required') {
            message = _safeT('auth_required') || "Morate se prijaviti da biste preuzeli nagradu.";
        } else if (result.reason === 'ad_verification_required' || result.reason === 'ad_verification_pending') {
            message = _safeT('ad_confirmation_retry') || "Potvrda reklame još nije stigla. Pokušajte preuzimanje nagrade za par sekundi.";
        } else if (result.reason === 'already_unlocked') {
            message = _safeT('btn_bought') || "Već kupljeno.";
        }
        this.showRewardMessage(message, _safeT('modal_title_info') || "INFO");
    }

    syncShopStateToServer() {
        if (window.app && window.app.socket && window.app.socket.connected && localStorage.getItem('yamb_uid')) {
            if (typeof window.app.emitPlayerData === 'function') {
                window.app.emitPlayerData();
                return;
            }

            window.app.socket.emit('set_player_data', {
                uid: localStorage.getItem('yamb_uid'),
                name: window.app.playerName,
                stats: window.app.getFullLocalStats(),
                playerId: window.app.playerId
            });
        }
    }

    async watchAdForCoins() {
        const adCtrl = this.getAdController();
        if (adCtrl) {
             const rewardOptions = { context: 'shop_ad_reward', amount: 500 };
             const isRewardReady = typeof adCtrl.isRewardVideoReadyFor === 'function'
                 ? adCtrl.isRewardVideoReadyFor(rewardOptions)
                 : adCtrl.ads.rewarded.isReady;
              if (!isRewardReady) adCtrl.prepareReward(rewardOptions);

              const success = await adCtrl.showRewardVideo(rewardOptions);
              if (success) {
                  const ssvNonce = typeof adCtrl.consumeLastRewardSsvNonce === 'function'
                      ? adCtrl.consumeLastRewardSsvNonce()
                      : '';
                  const rewardResult = typeof adCtrl.claimRewardWithSsvRetry === 'function'
                      ? await adCtrl.claimRewardWithSsvRetry(
                          () => this.claimServerAdReward(ssvNonce),
                          { nonce: ssvNonce, context: 'shop_ad_reward' }
                      )
                      : await this.claimServerAdReward(ssvNonce);
                  if (!rewardResult.ok) {
                      const cooldown = Math.ceil((rewardResult.retryAfterMs || 0) / 1000);
                      let message = _safeT('err_server_conn') || "Greška pri konekciji sa serverom.";
                      if (rewardResult.reason === 'ad_reward_cooldown') {
                          message = (_safeT('economy_reward_cooldown') || "Nagrada je već obrađena. Pokušajte ponovo za {0}s.").replace('{0}', cooldown || 1);
                      } else if (rewardResult.reason === 'auth_required') {
                          message = _safeT('auth_required') || "Morate se prijaviti da biste preuzeli nagradu.";
                      } else if (rewardResult.reason === 'ad_verification_required' || rewardResult.reason === 'ad_verification_pending') {
                          message = _safeT('ad_confirmation_retry') || "Potvrda reklame još nije stigla. Pokušajte preuzimanje nagrade za par sekundi.";
                      }
                     this.showRewardMessage(message, _safeT('modal_title_info') || "INFO");
                     return;
                 }

                 const rewardAmount = parseInt(rewardResult.reward) || 500;
                 if (rewardResult.localFallback) {
                     this.addBalance(rewardAmount, false);
                 } else if (rewardResult.balance !== undefined) {
                     this.setServerBalance(rewardResult.balance);
                 }
                 
                 if(window.app && window.app.soundMgr) window.app.soundMgr.win();

                 this.updateBalanceDisplay();
                 
                 this.showRewardMessage(`+${rewardAmount} ${dukatIconHtml()}`, _safeT('msg_reward_title') || "NAGRADA");
             }
        }
    }
}

// --- 7. ADMOB CONTROLLER (SAMO KLASIČAN REWARD I INTERSTITIAL) ---
class AdMobController {
    constructor() {
        this.appId = 'ca-app-pub-4319963185096437~6323121643';
        this.bannerId = 'ca-app-pub-4319963185096437/8508521924';
        this.rewardedId = 'ca-app-pub-4319963185096437/7896891915'; 
        this.interstitialId = 'ca-app-pub-4319963185096437/2913237519'; 
        
        this.adMobPlugin = null;
        this.consentPlugin = null;
        this.legacyConsentPlugin = null;
        this.legacyConsentRetryTimer = null;
        this.legacyConsentRetryCount = 0;
        this.canRequestAds = false;
        this.lifecycleListenersAttached = false;
        this.bannerVisible = false;
        this.bannerSlot = null;
        this.bannerLoaded = false;
        this.lastBannerMargin = null;
        this.bannerLoadTimer = null;
        this.bannerSyncTimer = null;
        this.bannerTestMode = localStorage.getItem('yamb_admob_test_ads') === '1';
        
        this.ads = {
            rewarded: { isReady: false, isLoading: false, retryCount: 0, retryTimer: null },
            interstitial: { isReady: false, isLoading: false, retryCount: 0, retryTimer: null }
        };

        this.adRetryPolicy = {
            rewarded: { baseDelay: 5000, maxDelay: 120000, maxAttempts: 6 },
            interstitial: { baseDelay: 30000, maxDelay: 900000, maxAttempts: 5 }
        };
        this.rewardSsvInfo = null;
        this.activeRewardSsvInfo = null;
        this.lastRewardSsvInfo = null;
        this.currentRewardOptions = null;
        this.pendingRewardOptions = null;
        this.activeRewardEarned = false;
        this.rewardDismissTimer = null;
        this.rewardShowTimer = null;
        this.rewardShowInProgress = false;
        this.adLoadedAt = { rewarded: 0, interstitial: 0 };
        this.adMaxAgeMs = 55 * 60 * 1000;
        this.interstitialCooldownMs = 10 * 60 * 1000;
        this.interstitialLastShownKey = 'yamb_interstitial_last_shown_at';
        this.lastInterstitialShownAt = 0;
        this.interstitialShowInProgress = false;
        this.rewardClaimRetryTimeoutMs = 60000;
        
        this.uiSelectors = ['.btn-ad-double', '.daily-glass-btn-double', '.btn-add-coins', '.btn-discount', '.btn-ad-state-aware'];
    }

    async initialize() {
        if (typeof YAMB_IS_PRODUCTION_SERVER !== 'undefined' && !YAMB_IS_PRODUCTION_SERVER) {
            console.info('🧪 Staging/local runtime: AdMob je isključen.');
            this.updateUI(false);
            return;
        }
        const capacitor = window.Capacitor;
        if (capacitor?.isPluginAvailable?.('AdConsent')) {
            try {
                this.consentPlugin = capacitor.Plugins?.AdConsent || capacitor.registerPlugin('AdConsent');
                const status = await this.consentPlugin.requestConsent();
                this.canRequestAds = !!status.canRequestAds;
                this.updatePrivacyOptionsUI(!!status.privacyOptionsRequired);
            } catch (err) {
                console.warn('UMP provera nije uspela; oglasi ostaju isključeni.', err);
                this.canRequestAds = false;
                this.updatePrivacyOptionsUI(false);
            }
        } else if (capacitor?.isNativePlatform?.()) {
            try {
                const legacyAdMob = capacitor.Plugins?.AdMob || capacitor.registerPlugin?.('AdMob');
                if (typeof legacyAdMob?.requestConsentInfo !== 'function' ||
                        typeof legacyAdMob?.showConsentForm !== 'function') {
                    throw new Error('Stara AdMob verzija nema UMP API.');
                }
                this.legacyConsentPlugin = legacyAdMob;
                const info = await legacyAdMob.requestConsentInfo();
                this.canRequestAds = info.status === 'OBTAINED' || info.status === 'NOT_REQUIRED';
                this.updatePrivacyOptionsUI(!!info.isConsentFormAvailable && info.status === 'OBTAINED');
                if (this.canRequestAds) {
                    this.clearLegacyConsentRetry();
                } else {
                    // Stari MainActivity već prikazuje UMP formu. Ne otvaraj drugi dijalog.
                    this.scheduleLegacyConsentRetry();
                }
            } catch (err) {
                console.warn('Stara UMP provera nije uspela; oglasi ostaju isključeni.', err);
                this.canRequestAds = false;
                this.updatePrivacyOptionsUI(false);
                if (this.legacyConsentPlugin) this.scheduleLegacyConsentRetry();
            }
        }
        if (!this.canRequestAds) {
            this.updateUI(false);
            return;
        }
        try {
            if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.AdMob) {
                this.adMobPlugin = window.Capacitor.Plugins.AdMob;
            } else if (window.Capacitor && window.Capacitor.registerPlugin) {
                this.adMobPlugin = window.Capacitor.registerPlugin('AdMob');
            }
        } catch (e) { console.error("Greška pri traženju AdMob plugina:", e); }

        if (this.adMobPlugin) {
            try {
                if (typeof this.adMobPlugin.initialize === 'function') {
                    await this.adMobPlugin.initialize();
                }
                
                await this.setupListeners();
                
                if (this.adMobPlugin) {
                    this.updateUI(false);
                    this.triggerHighPriorityLoad('interstitial');

                    if (!this.lifecycleListenersAttached) {
                        this.lifecycleListenersAttached = true;
                        document.addEventListener("resume", () => {
                            this.triggerHighPriorityLoad('interstitial');
                        }, false);

                        window.addEventListener("visibilitychange", () => {
                            if (document.visibilityState === 'visible') {
                                this.triggerHighPriorityLoad('interstitial');
                            }
                        });

                        window.addEventListener("online", () => {
                            this.updateUI(false);
                            this.triggerHighPriorityLoad('interstitial');
                        });
                    }
                }
            } catch (err) { 
                console.warn("⚠️ AdMob SDK nije podržan u ovom okruženju.", err); 
                this.adMobPlugin = null;
                this.updateUI(false);
            }
        } else {
            this.updateUI(false);
        }
    }

    updatePrivacyOptionsUI(required) {
        const button = document.getElementById('ad-privacy-options');
        if (button) button.hidden = !required;
    }

    clearLegacyConsentRetry() {
        if (this.legacyConsentRetryTimer) clearTimeout(this.legacyConsentRetryTimer);
        this.legacyConsentRetryTimer = null;
        this.legacyConsentRetryCount = 0;
    }

    scheduleLegacyConsentRetry() {
        if (this.legacyConsentRetryTimer || this.legacyConsentRetryCount >= 6) return;
        const delay = Math.min(2000 * Math.pow(2, this.legacyConsentRetryCount++), 30000);
        this.legacyConsentRetryTimer = setTimeout(() => {
            this.legacyConsentRetryTimer = null;
            this.initialize();
        }, delay);
    }

    async showPrivacyOptions() {
        if (!this.consentPlugin && !this.legacyConsentPlugin) return;
        try {
            if (this.consentPlugin) {
                const status = await this.consentPlugin.showPrivacyOptions();
                this.canRequestAds = !!status.canRequestAds;
                this.updatePrivacyOptionsUI(!!status.privacyOptionsRequired);
            } else {
                const status = await this.legacyConsentPlugin.showConsentForm();
                this.canRequestAds = status.status === 'OBTAINED' || status.status === 'NOT_REQUIRED';
                this.updatePrivacyOptionsUI(true);
            }
            for (const type of ['rewarded', 'interstitial']) {
                this.clearAdRetryTimer(type);
                this.ads[type].isReady = false;
                this.ads[type].isLoading = false;
            }
            await this.removeCurrentBanner();
            if (!this.canRequestAds) {
                this.updateUI(false);
            } else if (!this.adMobPlugin) {
                await this.initialize();
            } else {
                this.updateUI(false);
                this.triggerHighPriorityLoad('interstitial');
            }
        } catch (err) {
            console.warn('Izbori privatnosti nisu mogli da se otvore.', err);
        }
    }

    async setupListeners() {
        if (!this.adMobPlugin) return;

        try {
            await this.adMobPlugin.addListener('rewardedVideoAdLoaded', () => this.handleAdLoaded('rewarded'));
            await this.adMobPlugin.addListener('rewardedVideoAdFailedToLoad', (err) => this.handleAdFailed('rewarded', err));
            await this.adMobPlugin.addListener('rewardedVideoAdReward', () => this.handleRewardEarned());
            await this.adMobPlugin.addListener('rewardedVideoAdDismissed', () => {
                this.handleAdDismissed('rewarded');
            });

            await this.adMobPlugin.addListener('interstitialAdLoaded', () => this.handleAdLoaded('interstitial'));
            await this.adMobPlugin.addListener('interstitialAdFailedToLoad', (err) => this.handleAdFailed('interstitial', err));
            await this.adMobPlugin.addListener('interstitialAdDismissed', () => this.handleAdDismissed('interstitial'));

            await this.adMobPlugin.addListener('bannerAdLoaded', () => this.handleBannerLoaded());
            await this.adMobPlugin.addListener('bannerAdFailedToLoad', (err) => this.handleBannerFailed(err));
            await this.adMobPlugin.addListener('bannerAdSizeChanged', (size) => this.handleBannerSizeChanged(size));

            await this.adMobPlugin.addListener('onRewardedVideoAdLoaded', () => this.handleAdLoaded('rewarded'));
            await this.adMobPlugin.addListener('onRewardedVideoAdFailedToLoad', (err) => this.handleAdFailed('rewarded', err));
            await this.adMobPlugin.addListener('onRewardedVideoAdReward', () => this.handleRewardEarned());
            await this.adMobPlugin.addListener('onRewardedVideoAdFailedToShow', (err) => this.failRewardVideo(err));
            await this.adMobPlugin.addListener('onRewardedVideoAdDismissed', () => {
                this.handleAdDismissed('rewarded');
            });

            await this.adMobPlugin.addListener('onInterstitialAdLoaded', () => this.handleAdLoaded('interstitial'));
            await this.adMobPlugin.addListener('onInterstitialAdFailedToLoad', (err) => this.handleAdFailed('interstitial', err));
            await this.adMobPlugin.addListener('onInterstitialAdDismissed', () => this.handleAdDismissed('interstitial'));

        } catch (e) {
            console.warn("⚠️ Osluškivači za reklame pukli.", e);
            this.adMobPlugin = null; 
            this.updateUI(false);
        }
    }

    handleRewardEarned() {
        this.activeRewardEarned = true;
        this.lastRewardSsvInfo = this.activeRewardSsvInfo || this.rewardSsvInfo || null;
        this.settleRewardVideo(true);
    }

    settleRewardVideo(success) {
        if (this.rewardDismissTimer) {
            clearTimeout(this.rewardDismissTimer);
            this.rewardDismissTimer = null;
        }
        if (this.rewardShowTimer) {
            clearTimeout(this.rewardShowTimer);
            this.rewardShowTimer = null;
        }

        const resolve = this.rewardResolve;
        this.rewardResolve = null;

        if (success) {
            this.lastRewardSsvInfo = this.activeRewardSsvInfo || this.rewardSsvInfo || this.lastRewardSsvInfo || null;
        }

        this.activeRewardSsvInfo = null;
        this.activeRewardEarned = false;

        if (resolve) resolve(!!success);
    }

    failRewardVideo(err) {
        if (!this.rewardResolve) return;
        this.settleRewardVideo(false);
        this.handleAdFailed('rewarded', err);
        if (typeof window.showNotification === 'function') {
            window.showNotification(_safeT('info_title') || "INFO", _safeT('ad_not_ready') || "Reklama trenutno nije dostupna. Pokušajte ponovo.");
        }
    }

    handleAdLoaded(type) {
        if (!this.canRequestAds) {
            this.ads[type].isReady = false;
            this.ads[type].isLoading = false;
            return;
        }
        this.clearAdRetryTimer(type);
        this.ads[type].isReady = true; 
        this.ads[type].isLoading = false; 
        this.ads[type].retryCount = 0; 
        this.adLoadedAt[type] = Date.now();
        if (type === 'rewarded') {
            if (this.pendingRewardOptions && !this.isRewardSsvInfoMatch(this.rewardSsvInfo, this.pendingRewardOptions)) {
                const pendingOptions = this.pendingRewardOptions;
                this.pendingRewardOptions = null;
                this.ads.rewarded.isReady = false;
                this.rewardSsvInfo = null;
                this.updateUI(false);
                this.preloadAd('rewarded', pendingOptions);
                return;
            }

            this.pendingRewardOptions = null;
            this.updateUI(this.ads.rewarded.isReady);
        }
    }

    clearAdRetryTimer(type) {
        const adState = this.ads[type];
        if (!adState?.retryTimer) return;

        clearTimeout(adState.retryTimer);
        adState.retryTimer = null;
    }

    scheduleAdRetry(type, rewardOptions = {}) {
        const adState = this.ads[type];
        const policy = this.adRetryPolicy[type];
        if (!this.canRequestAds || !adState || !policy || adState.retryTimer || !navigator.onLine) return;

        adState.retryCount++;
        if (adState.retryCount > policy.maxAttempts) {
            console.warn(`AdMob ${type}: automatski retry je pauziran posle ${policy.maxAttempts} neuspelih pokušaja.`);
            return;
        }

        const nextDelay = Math.min(
            policy.baseDelay * Math.pow(2, adState.retryCount - 1),
            policy.maxDelay
        );

        adState.retryTimer = setTimeout(() => {
            adState.retryTimer = null;
            const nextOptions = type === 'rewarded'
                ? (this.pendingRewardOptions || rewardOptions)
                : rewardOptions;
            if (type === 'rewarded') this.pendingRewardOptions = null;
            this.preloadAd(type, nextOptions);
        }, nextDelay);
    }

    handleAdFailed(type, err) {
        if (type === 'rewarded') this.reportRewardAdDiagnostic('load_failed', err);
        this.ads[type].isReady = false; 
        this.ads[type].isLoading = false;
        this.adLoadedAt[type] = 0;
        if (type === 'rewarded') {
            this.rewardSsvInfo = null;
            this.activeRewardSsvInfo = null;
            this.activeRewardEarned = false;
            if (this.rewardDismissTimer) {
                clearTimeout(this.rewardDismissTimer);
                this.rewardDismissTimer = null;
            }
            const retryOptions = this.pendingRewardOptions || this.currentRewardOptions || {};
            this.updateUI(this.ads.rewarded.isReady);
            this.scheduleAdRetry(type, retryOptions);
            return;
        }

        this.scheduleAdRetry(type);
    }

    reportRewardAdDiagnostic(phase, err = {}) {
        const socket = window.app?.socket;
        if (!socket?.connected) return;
        const code = err?.code;
        socket.emit('admob_client_diagnostic', {
            phase,
            code: Number.isInteger(code) ? code : null,
            message: String(err?.message || '').slice(0, 160),
            loading: !!this.ads.rewarded.isLoading
        });
    }

    handleAdDismissed(type) {
        this.clearAdRetryTimer(type);
        this.ads[type].isReady = false;
        this.adLoadedAt[type] = 0;
        const nextRewardOptions = type === 'rewarded'
            ? (this.pendingRewardOptions || this.currentRewardOptions || {})
            : {};
        if (type === 'rewarded') {
            if (this.rewardResolve) {
                if (this.activeRewardEarned) {
                    this.settleRewardVideo(true);
                } else if (!this.rewardDismissTimer) {
                    this.rewardDismissTimer = setTimeout(() => this.settleRewardVideo(false), 5000);
                }
            } else {
                this.activeRewardSsvInfo = null;
                this.activeRewardEarned = false;
            }
        }
        if (type === 'rewarded') {
            this.updateUI(this.ads.rewarded.isReady);
        }
        this.ads[type].retryCount = 0; 
        setTimeout(() => this.preloadAd(type, nextRewardOptions), 500);
    }

    createRewardNonce() {
        if (window.crypto && typeof window.crypto.randomUUID === 'function') {
            return window.crypto.randomUUID().replace(/-/g, '');
        }

        const randomPart = Math.random().toString(36).slice(2);
        return `${Date.now().toString(36)}${randomPart}`.slice(0, 32);
    }

    normalizeRewardContext(value) {
        return String(value || 'generic_reward').replace(/[^A-Za-z0-9_.:-]/g, '').slice(0, 48) || 'generic_reward';
    }

    normalizeRewardAmount(value) {
        return Math.max(0, parseInt(value) || 0);
    }

    normalizeRewardOptions(options = {}) {
        return {
            uid: localStorage.getItem('yamb_uid') || window.app?.playerId || '',
            context: this.normalizeRewardContext(options.context),
            amount: this.normalizeRewardAmount(options.amount)
        };
    }

    createRewardSsvInfo(options = {}) {
        const { uid, context, amount } = this.normalizeRewardOptions(options);
        const nonce = this.createRewardNonce();
        const customData = JSON.stringify({
            v: 1,
            nonce,
            context,
            amount,
            uid
        });

        return {
            uid,
            nonce,
            context,
            amount,
            ssv: {
                userId: uid,
                customData
            }
        };
    }

    isRewardSsvInfoMatch(info, rewardOptions = {}) {
        const expected = this.normalizeRewardOptions(rewardOptions);
        return !!(
            info &&
            info.uid &&
            info.uid === expected.uid &&
            info.context === expected.context &&
            info.amount === expected.amount
        );
    }

    isRewardSsvReadyForCurrentUser(rewardOptions = {}) {
        return this.isRewardSsvInfoMatch(this.rewardSsvInfo, rewardOptions);
    }

    isAdFresh(type) {
        const loadedAt = this.adLoadedAt[type];
        return !!(loadedAt && Date.now() - loadedAt < this.adMaxAgeMs);
    }

    isRewardVideoReadyFor(rewardOptions = {}) {
        return !!(this.canRequestAds && this.ads.rewarded.isReady && this.isAdFresh('rewarded') && this.isRewardSsvReadyForCurrentUser(rewardOptions));
    }

    consumeLastRewardSsvNonce() {
        return this.lastRewardSsvInfo?.nonce || '';
    }

    isRewardClaimRetryable(result = {}, nonce = '') {
        if (!result || result.ok || result.permanent) return false;
        const reason = result.reason;
        if (reason === 'ad_verification_required' && !nonce) return false;
        return reason === 'ad_verification_pending' ||
            reason === 'ad_verification_required' ||
            (!!nonce && !!window.app?.socket?.connected && (
                reason === 'err_server_conn' ||
                reason === 'server_error' ||
                reason === 'game_reward_timeout' ||
                reason === 'empty_reward_response'
            ));
    }

    waitForRewardSsvEvent(nonce = '', context = '', timeoutMs = 2000) {
        const waitMs = Math.max(300, Math.min(8000, parseInt(timeoutMs) || 2000));
        const socket = window.app?.socket;
        const expectedContext = context ? this.normalizeRewardContext(context) : '';

        return new Promise(resolve => {
            let settled = false;
            let timer = null;

            const finish = (matched) => {
                if (settled) return;
                settled = true;
                clearTimeout(timer);
                if (socket && typeof socket.off === 'function') {
                    socket.off('admob_reward_verified', onVerified);
                }
                resolve(!!matched);
            };

            const onVerified = (payload = {}) => {
                const payloadContext = this.normalizeRewardContext(payload.context);
                if (payload.nonce === nonce && (!expectedContext || payloadContext === expectedContext)) {
                    finish(true);
                }
            };

            timer = setTimeout(() => finish(false), waitMs);
            if (socket && nonce && typeof socket.on === 'function') {
                socket.on('admob_reward_verified', onVerified);
            }
        });
    }

    async claimRewardWithSsvRetry(claimFn, options = {}) {
        if (typeof claimFn !== 'function') return { ok: false, reason: 'err_server_conn' };

        const nonce = typeof options.nonce === 'string' ? options.nonce : '';
        const context = options.context || '';
        const shouldCancel = typeof options.shouldCancel === 'function' ? options.shouldCancel : () => false;
        const maxWaitMs = Math.max(2000, parseInt(options.maxWaitMs) || this.rewardClaimRetryTimeoutMs);
        const deadline = Date.now() + maxWaitMs;
        let result = null;

        const claimOnce = async () => {
            try {
                return await claimFn();
            } catch (err) {
                console.warn("Reward claim pokušaj nije uspeo:", err);
                return { ok: false, reason: 'err_server_conn' };
            }
        };

        do {
            if (shouldCancel()) return { ok: false, reason: 'base_reward_selected', permanent: false };
            result = await claimOnce();
            if (shouldCancel()) return result && result.ok
                ? result
                : { ok: false, reason: 'base_reward_selected', permanent: false };
            if (!this.isRewardClaimRetryable(result, nonce)) return result;

            const remaining = deadline - Date.now();
            if (remaining <= 0) break;

            const retryAfterMs = Math.max(1000, Math.min(5000, parseInt(result.retryAfterMs) || 2000));
            await this.waitForRewardSsvEvent(nonce, context, Math.min(retryAfterMs, remaining));
        } while (Date.now() < deadline);

        return result || { ok: false, reason: 'ad_verification_pending', permanent: false };
    }

    async preloadAd(type, rewardOptions = {}) {
        if (!this.canRequestAds || !this.adMobPlugin || !navigator.onLine) return;
        if (type === 'rewarded' && !rewardOptions.context) return;
        if (this.ads[type].isLoading || this.ads[type].isReady) return;
        
        this.ads[type].isLoading = true;

        const timeoutId = setTimeout(() => {
            if (this.ads[type].isLoading) {
                this.ads[type].isLoading = false;
                this.handleAdFailed(type, new Error("Ad loading timeout")); 
            }
        }, 35000); 

        try {
            if (type === 'rewarded') {
                this.currentRewardOptions = this.normalizeRewardOptions(rewardOptions);
                this.rewardSsvInfo = this.createRewardSsvInfo(this.currentRewardOptions);
                await this.adMobPlugin.prepareRewardVideoAd({
                    adId: this.rewardedId,
                    isTesting: false,
                    ssv: this.rewardSsvInfo.ssv
                });
            } else if (type === 'interstitial') {
                await this.adMobPlugin.prepareInterstitial({ adId: this.interstitialId, isTesting: false, autoShow: false });
            } 
            clearTimeout(timeoutId); 
        } catch (e) {
            clearTimeout(timeoutId);
            this.handleAdFailed(type, e);
        }
    }

    triggerHighPriorityLoad(type = 'rewarded', rewardOptions = {}) {
        if (!this.canRequestAds) return;
        if (type === 'rewarded') {
            if (!this.ads.rewarded || !rewardOptions.context) return;

            const matchingReady = this.isRewardVideoReadyFor(rewardOptions);
            const matchingLoading = this.ads.rewarded.isLoading && this.isRewardSsvInfoMatch(this.rewardSsvInfo, rewardOptions);
            if (matchingReady || matchingLoading) return;

            // A tap during backoff must not create another request before the retry.
            if (this.ads.rewarded.retryTimer) {
                this.pendingRewardOptions = this.normalizeRewardOptions(rewardOptions);
                return;
            }

            if (this.ads.rewarded.isLoading) {
                this.pendingRewardOptions = this.normalizeRewardOptions(rewardOptions);
                return;
            }

            if (this.ads.rewarded.isReady) {
                this.ads.rewarded.isReady = false;
                this.rewardSsvInfo = null;
                this.activeRewardSsvInfo = null;
                this.updateUI(false);
            }

            this.clearAdRetryTimer('rewarded');
            this.ads.rewarded.retryCount = 0;
            this.preloadAd('rewarded', rewardOptions);
            return;
        }

        if (this.ads[type]?.isReady && !this.isAdFresh(type)) {
            this.ads[type].isReady = false;
            this.adLoadedAt[type] = 0;
        }
        if (!this.ads[type] || (!this.ads[type].isLoading && !this.ads[type].isReady)) {
            if (this.ads[type]) {
                this.clearAdRetryTimer(type);
                this.ads[type].retryCount = 0;
            }
            this.preloadAd(type, rewardOptions);
        }
    }

    loadRewardAd(rewardOptions = {}) { this.preloadAd('rewarded', rewardOptions); }
    loadInterstitialAd() { this.preloadAd('interstitial'); }
    prepareReward(rewardOptions = {}) {
        this.updateUI(false);
        this.triggerHighPriorityLoad('rewarded', rewardOptions);
    }

    async waitForRewardVideoReadyFor(rewardOptions = {}, timeoutMs = 12000) {
        const waitMs = Math.max(1000, Math.min(20000, parseInt(timeoutMs, 10) || 12000));
        const deadline = Date.now() + waitMs;

        this.triggerHighPriorityLoad('rewarded', rewardOptions);

        while (Date.now() < deadline) {
            if (this.isRewardVideoReadyFor(rewardOptions)) return true;
            await new Promise(resolve => setTimeout(resolve, 250));
        }

        const ready = this.isRewardVideoReadyFor(rewardOptions);
        if (!ready) this.reportRewardAdDiagnostic('ready_timeout');
        return ready;
    }

    setBannerSlotState(state, text = '') {
        const slotEl = this.bannerSlot || document.getElementById('economy-banner-slot');
        const overlay = document.getElementById('undo-menu-overlay');

        if (overlay) {
            overlay.dataset.bannerActive = state === 'loading' || state === 'loaded' ? 'true' : 'false';
        }

        if (!slotEl) return;

        slotEl.dataset.adState = state;
        slotEl.setAttribute('aria-hidden', state === 'loaded' ? 'true' : 'false');

        const label = slotEl.querySelector('[data-lang="economy_ad_label"]');
        if (label && text) label.innerText = text;
    }

    handleBannerLoaded() {
        if (!this.canRequestAds) return;
        this.clearBannerLoadTimer();
        this.bannerLoaded = true;
        this.setBannerSlotState('loaded');
        console.info("AdMob banner učitan.");
    }

    handleBannerFailed(err) {
        this.clearBannerLoadTimer();
        this.bannerVisible = false;
        this.bannerLoaded = false;
        this.lastBannerMargin = null;
        this.setBannerSlotState('failed', _safeT('economy_ad_failed') || 'AdMob nije spreman');
        console.warn("Banner reklama nije učitana.", err);
    }

    handleBannerSizeChanged(size = {}) {
        if (Number(size.height) > 0) {
            this.clearBannerLoadTimer();
            this.bannerLoaded = true;
            this.setBannerSlotState('loaded');
        }
    }

    clearBannerLoadTimer() {
        if (this.bannerLoadTimer) {
            clearTimeout(this.bannerLoadTimer);
            this.bannerLoadTimer = null;
        }
    }

    startBannerLoadTimer() {
        this.clearBannerLoadTimer();
        this.bannerLoadTimer = setTimeout(() => {
            if (!this.bannerLoaded) {
                this.bannerVisible = false;
                this.lastBannerMargin = null;
                this.setBannerSlotState('failed', _safeT('economy_ad_failed') || 'AdMob nije spreman');
                console.warn("⚠️ Banner reklama nije poslala load/fail signal na vreme.");
            }
        }, 15000);
    }

    scheduleBannerSync() {
        if (!this.bannerVisible || !this.bannerSlot) return;
        clearTimeout(this.bannerSyncTimer);
        this.bannerSyncTimer = setTimeout(() => {
            if (this.bannerVisible && this.bannerSlot?.isConnected) {
                this.showEconomyBanner(this.bannerSlot);
            }
        }, 180);
    }

    getEconomyBannerMargin(slotEl) {
        const rect = slotEl.getBoundingClientRect();
        const viewportHeight = window.visualViewport?.height || window.innerHeight || document.documentElement.clientHeight || 0;
        const bannerHeight = 50;
        const slotTop = Math.round(rect.top);
        const safeTop = Math.max(0, Math.round(window.visualViewport?.offsetTop || 0));
        const safeBottom = 8;
        const maxTop = viewportHeight > bannerHeight
            ? Math.max(safeTop, Math.floor(viewportHeight - bannerHeight - safeBottom))
            : safeTop;

        return Math.min(Math.max(slotTop, safeTop), maxTop);
    }

    async removeCurrentBanner() {
        if (!this.adMobPlugin) return;

        try {
            if (typeof this.adMobPlugin.removeBanner === 'function') {
                await this.adMobPlugin.removeBanner();
            } else if (typeof this.adMobPlugin.hideBanner === 'function') {
                await this.adMobPlugin.hideBanner();
            }
        } catch (e) {
            console.warn("⚠️ Banner reklama nije uklonjena.", e);
        } finally {
            this.clearBannerLoadTimer();
            clearTimeout(this.bannerSyncTimer);
            this.bannerSyncTimer = null;
            this.bannerVisible = false;
            this.bannerLoaded = false;
            this.lastBannerMargin = null;
        }
    }

    async showEconomyBanner(slotEl = document.getElementById('economy-banner-slot')) {
        if (!this.canRequestAds || !this.adMobPlugin || !slotEl || !navigator.onLine) return;

        const isSameSlot = this.bannerSlot === slotEl;
        this.bannerSlot = slotEl;
        const margin = 72;
        if (this.bannerVisible && this.lastBannerMargin === margin && isSameSlot) return;

        this.bannerLoaded = false;
        this.setBannerSlotState('loading', _safeT('economy_ad_loading') || 'Učitavanje oglasa...');

        await this.removeCurrentBanner();
        if (!this.canRequestAds) return;
        this.bannerSlot = slotEl;
        this.setBannerSlotState('loading', _safeT('economy_ad_loading') || 'Učitavanje oglasa...');
        this.startBannerLoadTimer();

        try {
            await this.adMobPlugin.showBanner({
                adId: this.bannerId,
                adSize: 'ADAPTIVE_BANNER',
                position: 'BOTTOM_CENTER',
                margin,
                isTesting: this.bannerTestMode
            });
            this.bannerVisible = true;
            this.lastBannerMargin = margin;
            console.info(`AdMob banner zatražen (${this.bannerTestMode ? 'test' : 'production'} mode).`);
        } catch (e) {
            this.clearBannerLoadTimer();
            this.bannerVisible = false;
            this.bannerLoaded = false;
            this.lastBannerMargin = null;
            this.setBannerSlotState('failed', _safeT('economy_ad_failed') || 'AdMob nije spreman');
            console.warn("⚠️ Banner reklama nije prikazana.", e);
        }
    }

    async hideEconomyBanner() {
        if (!this.adMobPlugin) return;

        await this.removeCurrentBanner();
        this.setBannerSlotState('idle', _safeT('economy_ad_label') || 'Oglas');
    }

    updateUI(ready) {
        // A loaded rewarded ad belongs to one SSV context. Other reward buttons must
        // remain clickable so their own context can be loaded when the user chooses it.
        const adsAvailable = !!(this.canRequestAds && this.adMobPlugin && navigator.onLine);
        this.uiSelectors.forEach(selector => {
            const buttons = document.querySelectorAll(selector);
            buttons.forEach(btn => {
                if (adsAvailable) {
                    btn.classList.remove('disabled', 'ad-loading'); btn.disabled = false; btn.style.opacity = '1'; btn.style.filter = 'none';
                    if (btn.dataset.originalHtml) btn.innerHTML = btn.dataset.originalHtml;
                } else {
                    btn.classList.add('disabled', 'ad-loading'); btn.disabled = true; btn.style.opacity = '0.6'; btn.style.filter = 'grayscale(100%)';
                    if (!btn.dataset.originalHtml) btn.dataset.originalHtml = btn.innerHTML;
                }
            });
        });
    }

    showRewardVideo(rewardOptions = {}) {
        if (!this.canRequestAds || !this.adMobPlugin || !rewardOptions.context || this.rewardShowInProgress) {
            return Promise.resolve(false);
        }

        this.rewardShowInProgress = true;
        return (async () => {
            try {
                if (!this.isRewardVideoReadyFor(rewardOptions) && typeof window.showNotification === 'function') {
                    window.showNotification(_safeT('info_title') || "INFO", _safeT('msg_ad_loading') || "Učitavanje reklame...");
                }

                const readyForReward = await this.waitForRewardVideoReadyFor(rewardOptions);
                if (!readyForReward) {
                    if (typeof window.showNotification === 'function') window.showNotification(_safeT('info_title') || "INFO", _safeT('ad_not_ready') || "Reklama se učitava. Pokušajte za par sekundi.");
                    return false;
                }

                return await new Promise(resolve => {
                    this.rewardResolve = resolve;
                    this.activeRewardSsvInfo = this.rewardSsvInfo;
                    this.activeRewardEarned = false;
                    this.rewardShowTimer = setTimeout(() => {
                        this.failRewardVideo(new Error('Rewarded ad show timeout'));
                    }, 180000);

                    Promise.resolve().then(() => this.adMobPlugin.showRewardVideoAd())
                        .then(rewardItem => {
                            if (rewardItem && this.rewardResolve) this.settleRewardVideo(true);
                        })
                        .catch(err => {
                            this.failRewardVideo(err);
                        });
                });
            } catch (err) {
                console.warn('Rewarded oglas nije mogao da se prikaže.', err);
                return false;
            } finally {
                this.rewardShowInProgress = false;
            }
        })();
    }

    async showInterstitial() {
        if (!this.canRequestAds || !this.adMobPlugin || this.interstitialShowInProgress) return false;

        let lastShownAt = this.lastInterstitialShownAt;
        try {
            lastShownAt = Math.max(lastShownAt, Number(localStorage.getItem(this.interstitialLastShownKey)) || 0);
        } catch (_) {}
        const elapsed = Date.now() - lastShownAt;
        if (lastShownAt > 0 && elapsed >= 0 && elapsed < this.interstitialCooldownMs) return false;

        if (!this.ads.interstitial.isReady || !this.isAdFresh('interstitial')) {
            this.triggerHighPriorityLoad('interstitial');
            return false;
        }

        this.interstitialShowInProgress = true;
        try {
            await this.adMobPlugin.showInterstitial();
            this.lastInterstitialShownAt = Date.now();
            try {
                localStorage.setItem(this.interstitialLastShownKey, String(this.lastInterstitialShownAt));
            } catch (_) {}
            return true;
        } catch (err) {
            this.handleAdFailed('interstitial', err);
            return false;
        } finally {
            this.interstitialShowInProgress = false;
        }
    }
}

// --- GLOBALNE INSTANCE ---
window.stateManager = new StateManager();
window.statsManager = new StatsManager();
window.adMobGlobal = new AdMobController();
window.modalManager = new ModalManager(); 
window.effectManager = new EffectManager();

document.addEventListener('DOMContentLoaded', () => {
    window.adMobGlobal.initialize();

    window.addEventListener('resize', () => window.adMobGlobal.scheduleBannerSync());
    window.addEventListener('orientationchange', () => window.adMobGlobal.scheduleBannerSync());

    // --- GLOBALNI CLICK LISTENER ZA UI ZVUKOVE ---
    document.body.addEventListener('click', function(event) {
        const target = event.target.closest('button, .mode-btn, .btn-square, .btn-special-square, .hs-tab-btn, .cm-btn, .chat-float-btn, .back-btn, .close-btn');

        if (target) {
            const ignoreClasses = ['dice', 'score-btn', 'daily-btn-main'];
            const ignoreIds = ['btn-bacaj', 'btn-najava'];

            const hasIgnoreClass = ignoreClasses.some(cls => target.classList.contains(cls));
            const hasIgnoreId = ignoreIds.includes(target.id);

            // FIX: Potpuno uklonjen 'new SoundManager()' fallback koji je izazivao krahiranje AudioContext-a!
            if (!hasIgnoreClass && !hasIgnoreId) {
                if (window.app && window.app.soundMgr) {
                    window.app.soundMgr.click();
                }
            }
        }
    });
});
