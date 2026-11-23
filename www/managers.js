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
        const finishScreen = document.getElementById('game-over-screen');
        const soloFinishOpen = finishScreen?.classList.contains('active')
            && finishScreen.classList.contains('is-solo-result') && !finishScreen.classList.contains('is-hotseat-result');
        const hotseatFinishOpen = finishScreen?.classList.contains('active')
            && finishScreen.classList.contains('is-hotseat-result') && !finishScreen.classList.contains('is-online-duel-result');
        const onlineFinishOpen = finishScreen?.classList.contains('active') && finishScreen.classList.contains('is-online-duel-result');
        const waitingScreen = document.getElementById('waiting-screen');
        const randomWaitingOpen = waitingScreen?.classList.contains('active') && waitingScreen.classList.contains('is-random-online');
        const friendWaitingOpen = waitingScreen?.classList.contains('active') && waitingScreen.classList.contains('is-friend-invite');
        const contextClass = String(options.contextClass || (economyOpen ? 'economy' : treasuryOpen ? 'treasury' : tournamentOpen ? 'tournament' : soloFinishOpen ? 'solo' : hotseatFinishOpen ? 'hotseat' : onlineFinishOpen || randomWaitingOpen ? 'online-duel' : friendWaitingOpen ? 'invite-friend' : ''))
            .replace(/[^a-zA-Z0-9_-]/g, '');
        if (contextClass) els.overlay.classList.add(`modal-context-${contextClass}`);
        if (contextClass === 'tourney-winner' || contextClass === 'tourney-finalist') {
            els.overlay.classList.add('modal-context-tournament');
        }

        // Cloud profile translations must not replace this dialog's explicit action labels.
        for (const element of [els.title, els.btnOk, els.btnCancel]) element?.removeAttribute?.('data-lang');
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
        this.goldRainSpritePromises = {};
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

    async spawnStageEffect(type, yambFace) {
        this.stageScene?.stop();
        const scene = new LiveEffectsStage(this, type, yambFace);
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

    captureEffectBoard(table, rect, glow, dpr, edges) {
        const sheet = document.createElement('canvas'), ink = sheet.getContext('2d');
        if (!ink || !rect.width || !rect.height) return null;
        const scale = Math.min(dpr, 900 / Math.max(rect.width, rect.height));
        sheet.width = Math.ceil(rect.width * scale); sheet.height = Math.ceil(rect.height * scale);
        ink.scale(sheet.width / rect.width, sheet.height / rect.height);
        ink.fillStyle = 'rgba(13,22,29,.88)';
        ink.beginPath(); ink.roundRect(0, 0, rect.width, rect.height, 7); ink.fill();
        ink.strokeStyle = `rgba(${glow},.85)`; ink.lineWidth = 2; ink.stroke();
        const scores = [];
        const cells = table.querySelectorAll('.grid-cell, .player-name, .total-score, .qa-board-grid > span');
        const fontOf = s => `${s.fontWeight} ${s.fontSize} ${s.fontFamily}`;
        for (const [i, cell] of cells.entries()) {
            const r = cell.getBoundingClientRect();
            if (!r.width || !r.height) continue;
            const x = r.left - rect.left, y = r.top - rect.top, cs = getComputedStyle(cell);
            const qa = cell.parentElement.classList.contains('qa-board-grid');
            if (edges && (qa || cell.classList.contains('grid-cell'))) {
                edges.x.add(x); edges.y.add(y);
            }
            const score = qa ? (i > 6 && i % 7 !== 0 ? cell : null) : cell.querySelector('.score-btn.filled');
            const value = score?.textContent.trim();
            ink.fillStyle = cs.backgroundColor === 'rgba(0, 0, 0, 0)' ? `rgba(${glow},.13)` : cs.backgroundColor;
            ink.fillRect(x + 0.5, y + 0.5, Math.max(1, r.width - 1), Math.max(1, r.height - 1));
            ink.strokeStyle = `rgba(${glow},.3)`; ink.lineWidth = 0.7;
            ink.strokeRect(x + 0.5, y + 0.5, r.width - 1, r.height - 1);
            if (value && /^\d+$/.test(value)) {
                const sr = score.getBoundingClientRect(), style = getComputedStyle(score);
                scores.push({ node: score, value, font: fontOf(style), color: style.color,
                    x: sr.left + sr.width / 2 - rect.left, y: sr.top + sr.height / 2 - rect.top });
            } else if (cell.textContent.trim()) {
                ink.fillStyle = cs.color; ink.font = fontOf(cs); ink.textAlign = 'center'; ink.textBaseline = 'middle';
                ink.fillText(cell.textContent.trim(), x + r.width / 2, y + r.height / 2, r.width);
            }
        }
        return { sheet, scores };
    }

    prepareBlackHolePull(table, rect, scene, theme) {
        const width = window.innerWidth, height = window.innerHeight;
        const layer = document.createElement('canvas'), c = layer.getContext('2d');
        const dpr = Math.min(window.devicePixelRatio || 1, width <= 760 ? 1.15 : 1.5);
        const { glow, glint } = GOLD_RAIN_THEME_PROFILES[theme];
        const snapshot = this.captureEffectBoard(table, rect, glow, dpr);
        if (!c || !snapshot) return null;
        const { sheet, scores } = snapshot;
        layer.className = 'black-hole-projection';
        layer.width = Math.ceil(width * dpr); layer.height = Math.ceil(height * dpr);
        const cx = rect.width / 2, cy = rect.height / 2, diagonal = Math.hypot(cx, cy);
        for (const [i, s] of scores.entries()) {
            s.dx = s.x - cx; s.dy = s.y - cy;
            s.rank = Math.min(1, Math.hypot(s.dx, s.dy) / diagonal) * 0.86 + (i % 5) * 0.035;
        }
        scene.appendChild(layer);
        const clamp = v => Math.max(0, Math.min(1, v));
        const ease = v => { const u = clamp(v); return u * u * (3 - 2 * u); };
        let left = rect.left, top = rect.top, raf = 0, last = -100, veil;
        const start = performance.now();
        const move = () => {
            const r = table.getBoundingClientRect(); left = r.left; top = r.top;
            scene.style.setProperty('--bh-x', (left + cx) + 'px');
            scene.style.setProperty('--bh-y', (top + cy) + 'px');
        };
        const render = now => {
            if (!scene.isConnected || !table.isConnected) { this.blackHoleCleanup?.(); return; }
            raf = requestAnimationFrame(render);
            if (width <= 760 && now - last < 30) return;
            last = now;
            const t = (now - start) / 1000;
            const phase = t < 0.60 ? 'opening' : t < 2.08 ? 'capture' : t < 3.30 ? 'collapse'
                : t < 3.53 ? 'core' : t < 5.57 ? 'return' : 'restored';
            if (scene.dataset.pullPhase !== phase) scene.dataset.pullPhase = phase;
            c.setTransform(dpr, 0, 0, dpr, 0, 0); c.clearRect(0, 0, width, height);
            c.translate(left + cx, top + cy);
            const pull = ease((t - 2.08) / 1.22) * (1 - ease((t - 3.53) / 0.98));
            const ghost = ease((t - 1.86) / 0.32) * (1 - ease((t - 4.40) / 0.29));
            if (ghost > 0 && !veil) {
                // Hotseat pins opacity with !important. Append a visual filter; leave hits and player styles alone.
                veil = table.animate([{ filter: 'opacity(1)' }, { filter: 'opacity(0)', offset: 0.32 / 2.83 },
                    { filter: 'opacity(0)', offset: 2.54 / 2.83 }, { filter: 'opacity(1)' }],
                { duration: 2830, composite: 'add', fill: 'none' });
                veil.currentTime = (t - 1.86) * 1000;
            }
            if (ghost > 0 && pull < 0.995) {
                c.globalAlpha = ghost * (1 - pull * 0.36);
                // Bend horizontal strips of one cached board image into the same singularity.
                for (let i = 0; i < 24; i++) {
                    const a = Math.round(i * sheet.height / 24), b = Math.round((i + 1) * sheet.height / 24);
                    const y = (a / sheet.height - 0.5) * rect.height;
                    const shrink = 1 - pull * 0.985, twist = pull * (1.25 + 1.6 * y / rect.height);
                    c.save(); c.rotate(twist); c.scale(shrink, shrink);
                    c.drawImage(sheet, 0, a, sheet.width, b - a, -cx, y, rect.width, (b - a) * rect.height / sheet.height + 0.5);
                    c.restore();
                }
            }
            c.textAlign = 'center'; c.textBaseline = 'middle';
            for (const s of scores) {
                const enter = 0.60 + 0.68 * s.rank, back = 4.27 + 0.45 * (1 - s.rank);
                const away = t > enter && t < back + 0.85;
                if (away !== !!s.hidden) { s.node.toggleAttribute('data-bh-score-away', away); s.hidden = away; }
                if (!away) continue;
                const u = t < back ? ease((t - enter) / 1.12) : 1 - ease((t - back) / 0.85);
                if (u >= 0.997) continue;
                const radius = 1 - u, angle = u * (2.25 + 0.9 * s.rank);
                const cos = Math.cos(angle), sin = Math.sin(angle);
                c.save(); c.translate(radius * (s.dx * cos - s.dy * sin * 0.70), radius * (s.dy * cos + s.dx * sin * 0.70));
                c.rotate(u * 0.50); const zoom = (1 - u * 0.84) * (1 + 0.31 * Math.sin(Math.PI * u));
                c.scale(zoom, zoom); c.globalAlpha = 1 - ease((u - 0.78) / 0.22);
                c.font = s.font; c.strokeStyle = 'rgba(9,14,20,.86)'; c.lineWidth = 2.2; c.strokeText(s.value, 0, 0);
                c.fillStyle = u < 0.08 ? s.color : `rgb(${glint})`; c.fillText(s.value, 0, 0); c.restore();
            }
            c.globalAlpha = 1;
        };
        raf = requestAnimationFrame(render);
        document.addEventListener('scroll', move, true);
        return () => {
            cancelAnimationFrame(raf); veil?.cancel();
            document.removeEventListener('scroll', move, true);
            for (const s of scores) if (s.hidden) s.node.removeAttribute('data-bh-score-away');
        };
    }

    async spawnBlackHole() {
        const runId = ++this.blackHoleRunId;
        const theme = this.getGoldRainThemeId();
        this.clearEffectTimeouts('black_hole');
        this.blackHoleCleanup?.();
        const player = window.app?.currentPlayerIdx;
        const targetTable = (Number.isInteger(player) && document.getElementById('ptable-' + player)) || this.getTargetTable();
        if (!targetTable) return;
        const sprite = await this.loadBlackHoleSprite(theme);
        if (!sprite || document.hidden || !targetTable.isConnected || runId !== this.blackHoleRunId || theme !== this.getGoldRainThemeId()) return;
        const rect = targetTable.getBoundingClientRect();
        if (!rect.width || !rect.height) return;
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
        }
        document.body.appendChild(scene);

        const stopPull = !reduced && this.prepareBlackHolePull(targetTable, rect, scene, theme);
        let observer = null;
        const cleanup = () => {
            if (this.blackHoleCleanup !== cleanup) return;
            this.clearEffectTimeouts('black_hole');
            observer?.disconnect();
            window.removeEventListener('resize', cleanup);
            document.removeEventListener('visibilitychange', visibility);
            if (stopPull) stopPull();
            scene.remove();
            if (this.blackHoleCleanup === cleanup) this.blackHoleCleanup = null;
        };
        const visibility = () => { if (document.hidden) cleanup(); };
        this.blackHoleCleanup = cleanup;
        window.addEventListener('resize', cleanup, { passive: true });
        document.addEventListener('visibilitychange', visibility);
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

    prepareSupernovaEjecta(table, rect, overlay, profile, center, farthest, dpr) {
        const edges = { x: new Set(), y: new Set() };
        const snapshot = this.captureEffectBoard(table, rect, profile.main, dpr, edges);
        if (!snapshot) return null;
        const { sheet, scores } = snapshot, w = rect.width, h = rect.height;
        const layer = document.createElement('canvas'), c = layer.getContext('2d');
        if (!c) return null;
        layer.className = 'sn-board-projection';
        layer.width = Math.ceil(window.innerWidth * dpr); layer.height = Math.ceil(window.innerHeight * dpr);
        overlay.appendChild(layer);
        const clamp = n => Math.max(0, Math.min(1, n));
        const smooth = n => { const u = clamp(n); return u * u * (3 - 2 * u); };
        // Invert the same cubic expansion used by the visible pressure front.
        const contact = (x, y) => 2200 * (1 - Math.cbrt(1 - clamp((Math.hypot(x, y) - 12) / (1.09 * farthest))));
        const pieces = [];
        const cuts = (pixels, extent, count, starts) => Array.from({length: count + 1}, (_, i) => {
            if (i === 0 || i === count) return i ? pixels : 0;
            const ideal = extent * i / count;
            let best = ideal, distance = extent / count * 0.48;
            for (const edge of starts) if (Math.abs(edge - ideal) < distance) {
                best = edge; distance = Math.abs(edge - ideal);
            }
            return Math.round(best * pixels / extent);
        });
        const cols = cuts(sheet.width, w, 3, edges.x), rows = cuts(sheet.height, h, 4, edges.y);
        for (let row = 0; row < 4; row++) for (let col = 0; col < 3; col++) {
            const a = cols[col], b = rows[row], sw = cols[col+1] - a, sh = rows[row+1] - b;
            if (sw <= 0 || sh <= 0) continue;
            const pw = sw * w / sheet.width, ph = sh * h / sheet.height;
            const x = (a + sw / 2) * w / sheet.width - w / 2, y = (b + sh / 2) * h / sheet.height - h / 2;
            pieces.push({ a, b, sw, sh, pw, ph, x, y, hit: contact(x, y), tilt: (col - 1) * 0.11 + (row - 1.5) * 0.036 });
        }
        for (const [i, score] of scores.entries()) {
            score.x -= w / 2; score.y -= h / 2;
            score.hit = contact(score.x, score.y);
            score.depth = 0.76 + 0.32 * ((i * 7) % 13) / 12;
            c.font = score.font;
            score.halfWidth = c.measureText(score.value).width / 2;
        }
        const lift = (age, hit) => {
            const time = age - hit;
            return (1 - (1 - clamp(time / 720)) ** 3) * (1 - smooth((time - 850) / 1550));
        };
        let veil;
        return {
            paint(ctx, time) {
                c.setTransform(dpr, 0, 0, dpr, 0, 0);
                c.clearRect(0, 0, layer.width / dpr, layer.height / dpr);
                if (time <= 0 || time >= 3850) return;
                if (!veil) {
                    // Filter composition also works when the two-player layout pins opacity.
                    veil = table.animate([{ filter: 'opacity(1)' }, { filter: 'opacity(0)', offset: 0.04 },
                        { filter: 'opacity(0)', offset: 0.91 }, { filter: 'opacity(1)' }],
                    { duration: 3850, composite: 'add', fill: 'none' });
                    veil.currentTime = time;
                }
                const coverage = clamp(time / 154) * clamp((3850 - time) / 346.5);
                c.translate(center.x, center.y);
                for (const part of pieces) {
                    const z = lift(time, part.hit);
                    c.save(); c.translate(part.x * (1 + 0.43 * z), part.y * (1 + 0.36 * z));
                    c.rotate(z * part.tilt); c.scale(1 + z * 0.22, 1 + z * 0.19);
                    c.globalAlpha = coverage * (1 - 0.22 * z);
                    c.drawImage(sheet, part.a, part.b, part.sw, part.sh, -part.pw / 2, -part.ph / 2, part.pw, part.ph);
                    if (z > 0.01) {
                        c.strokeStyle = `rgba(${profile.main},${0.50 * z})`; c.lineWidth = 1.2;
                        c.strokeRect(-part.pw / 2, -part.ph / 2, part.pw, part.ph);
                    }
                    c.restore();
                }
                ctx.save(); ctx.globalCompositeOperation = 'source-over'; ctx.translate(center.x, center.y);
                ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
                for (const s of scores) {
                    const z = lift(time, s.hit) * s.depth;
                    const zoom = 1 + 1.05 * z, margin = s.halfWidth * zoom + 4;
                    const reach = s.x * 0.72 * z;
                    const travel = reach < 0 ? Math.max(reach, Math.min(0, margin - (center.x + s.x)))
                        : Math.min(reach, Math.max(0, window.innerWidth - margin - (center.x + s.x)));
                    ctx.save(); ctx.translate(s.x + travel, s.y * (1 + 0.55 * z) - z * 13);
                    ctx.scale(zoom, zoom);
                    ctx.font = s.font; ctx.globalAlpha = coverage;
                    if (z > 0.01) {
                        ctx.strokeStyle = `rgba(12,16,22,${0.8 * Math.min(1, z * 4)})`;
                        ctx.lineWidth = 2; ctx.strokeText(s.value, 0, 0);
                    }
                    ctx.fillStyle = z > 0.15 ? `rgb(${profile.accent})` : s.color;
                    ctx.fillText(s.value, 0, 0); ctx.restore();
                }
                ctx.restore();
            },
            stop() { veil?.cancel(); layer.remove(); }
        };
    }

    async spawnSupernova() {
        const runId = ++this.supernovaRunId;
        this.supernovaCanvasCleanup?.();
        const theme = this.getGoldRainThemeId();
        const player = window.app?.currentPlayerIdx;
        const table = (Number.isInteger(player) && document.getElementById('ptable-' + player)) || this.getTargetTable();
        const sprite = await this.loadSupernovaSprite(theme);
        if (!sprite || document.hidden || (table && !table.isConnected) || runId !== this.supernovaRunId || theme !== this.getGoldRainThemeId()) return;

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
        const followTable = () => {
            const rect = table?.getBoundingClientRect();
            center.x = rect ? rect.left + rect.width / 2 : width / 2;
            center.y = rect ? rect.top + rect.height / 2 : height / 2;
            plasma.style.left = `${center.x}px`;
            plasma.style.top = `${center.y}px`;
        };
        width = window.innerWidth; height = window.innerHeight;
        followTable();
        farthest = Math.hypot(Math.max(center.x, width - center.x), Math.max(center.y, height - center.y));
        const dpr = Math.min(window.devicePixelRatio || 1, mobile ? 1.2 : 1.5);
        canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        const projection = !reduced && table ? this.prepareSupernovaEjecta(table, table.getBoundingClientRect(), overlay, profile, center, farthest, dpr) : null;

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
            if (this.supernovaCanvasCleanup !== cleanup) return;
            cancelAnimationFrame(rafId);
            this.clearEffectTimeouts('supernova');
            window.removeEventListener('resize', cleanup);
            document.removeEventListener('scroll', followTable, true);
            document.removeEventListener('visibilitychange', visibility);
            projection?.stop();
            overlay.remove();
            if (this.supernovaCanvasCleanup === cleanup) this.supernovaCanvasCleanup = null;
        };
        const visibility = () => { if (document.hidden) cleanup(); };
        this.supernovaCanvasCleanup = cleanup;
        window.addEventListener('resize', cleanup, { passive: true });
        document.addEventListener('scroll', followTable, true);
        document.addEventListener('visibilitychange', visibility);

        const draw = start => now => {
            if (runId !== this.supernovaRunId) return;
            if (!overlay.isConnected || (table && !table.isConnected) || theme !== this.getGoldRainThemeId()) { cleanup(); return; }
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
            projection?.paint(ctx, blastTime);
            if (elapsed < duration) rafId = requestAnimationFrame(draw(start));
            else cleanup();
        };
        rafId = requestAnimationFrame(now => draw(now)(now));
        this.scheduleEffectTimeout(() => {
            if (runId === this.supernovaRunId) cleanup();
        }, duration + 80, 'supernova');
    }

    trigger(type, yambFace) {
        this.stop();
        if (type === 'ice_age') { void this.spawnIceAge(); return; }
        if (LIVE_STAGE_EFFECT_IDS.includes(type)) { void this.spawnStageEffect(type, yambFace); return; }
        this.stageScene?.stop();
        if (type === 'confetti') this.spawnConfetti();
        if (type === 'gold_rain') this.spawnGoldRain();
        if (type === 'fireflies') this.spawnFireflies();
        if (type === 'bubbles') this.spawnBubbles();
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

    loadGoldRainSprites(theme = this.getGoldRainThemeId()) {
        if (!YAMB_THEME_IDS.includes(theme)) return Promise.resolve([]);
        if (this.goldRainSpritePromises[theme]) return this.goldRainSpritePromises[theme];
        const root = theme === 'dark' ? 'assets/green-soft-clay' : `assets/theme-packs/${theme}`;
        const version = ['easter', 'desert', 'severna'].includes(theme) ? 2 : 1;
        const load = pose => new Promise(resolve => {
            const image = new Image();
            image.decoding = 'async';
            image.onload = () => resolve(image);
            image.onerror = () => resolve(null);
            image.src = `${root}/canonical/ducat/ducat-${pose}-v${version}.png`;
        });
        this.goldRainSpritePromises[theme] = Promise.all(['front', 'angle-left', 'angle-right'].map(load)).then(async images => {
            const sprites = images.filter(Boolean);
            if (sprites.length === images.length) return sprites;
            delete this.goldRainSpritePromises[theme];
            if (sprites.length) return sprites;
            const fallback = await load('particle');
            return fallback ? [fallback] : [];
        });
        return this.goldRainSpritePromises[theme];
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

        const ducatSprites = await this.loadGoldRainSprites(themeId);
        if (runId !== this.goldRainRunId || themeId !== this.getGoldRainThemeId() || !ducatSprites.length) return;

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

        const addCoin = (size, poseIndex) => {
            const coin = document.createElement('img');
            coin.className = reducedMotion ? 'gold-rain-static-particle' : 'gold-rain-particle';
            coin.src = ducatSprites[poseIndex % ducatSprites.length].src;
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
            const coinCount = isCompact ? 72 : 104;
            const waveCount = 4;
            const lanes = coinCount / waveCount;
            for (let index = 0; index < coinCount; index++) {
                const wave = index % waveCount;
                const lane = Math.floor(index / waveCount);
                const depth = ((lane + wave) % 3) / 2;
                const size = Math.round((isCompact ? 23 : 28) + depth * (isCompact ? 16 : 21) + rand(0, 6));
                const coin = addCoin(size, lane + wave * 2);
                const origin = 2 + ((lane + rand(0.1, 0.9)) / lanes) * 96;
                const direction = Math.random() < 0.5 ? -1 : 1;
                const inward = origin < 15 ? 1 : origin > 85 ? -1 : direction;
                const travel = inward * rand(14, isCompact ? 48 : 82) * profile.drift;
                const sway = direction * rand(9, isCompact ? 25 : 36) * (0.8 + depth * 0.4) * profile.drift;
                const period = Math.round(rand(790, 1280) + (1 - depth) * 180);
                const tilt = direction * rand(22, 53) * profile.spin;
                const turn = direction * (rand(30, 54) + profile.spin * 30);
                coin.style.left = `${origin.toFixed(1)}%`;
                coin.style.zIndex = String(depth * 2);
                coin.style.setProperty('--coin-opacity', (0.77 + depth * 0.23).toFixed(2));
                coin.style.setProperty('--fall-delay', `${Math.round(wave * 390 + rand(0, 270))}ms`);
                coin.style.setProperty('--fall-duration', `${Math.round(rand(3500, 4280) - depth * 620)}ms`);
                coin.style.setProperty('--fall-travel', `${Math.round(travel)}px`);
                coin.style.setProperty('--fall-sway', `${Math.round(sway)}px`);
                coin.style.setProperty('--rock-period', `${period}ms`);
                coin.style.setProperty('--rock-phase', `${-Math.floor(rand(0, period))}ms`);
                coin.style.setProperty('--fall-tilt', `${Math.round(tilt)}deg`);
                coin.style.setProperty('--fall-turn', `${Math.round(turn)}deg`);
            }
        }

        let observer = null;
        const cleanup = () => {
            if (runId !== this.goldRainRunId) return;
            this.clearEffectTimeouts('gold_rain');
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
        const load = (name, atlas) => new Promise(resolve => {
            const image = new Image();
            image.decoding = 'async';
            image.onload = () => resolve({ src: image.src, atlas });
            image.onerror = () => resolve(null);
            image.src = `${root}/canonical/effects/${name}.png`;
        });
        this.fireflySpritePromises[theme] = load('firefly-flight-v2', true).then(async sprite => {
            if (sprite) return sprite;
            const fallback = await load('firefly-v1', false);
            delete this.fireflySpritePromises[theme];
            return fallback;
        });
        return this.fireflySpritePromises[theme];
    }

    async spawnFireflies(count = 32, group = 'fireflies') {
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
        const particleCount = reducedMotion ? 3 : Math.min(count, compact ? 23 : 32);
        const tone = this.getEffectSurfaceTone();
        const field = document.createElement('div');
        field.className = `firefly-field firefly-field--${tone}${reducedMotion ? ' firefly-field--reduced' : ''}`;
        field.style.setProperty('--ff-glow', FIREFLY_THEME_GLOW[themeId]);
        field.setAttribute('aria-hidden', 'true');

        const flight = document.createElement('div');
        flight.className = 'firefly-flight';
        field.appendChild(flight);
        document.body.appendChild(field);
        const { width, height } = flight.getBoundingClientRect();
        const fragment = document.createDocumentFragment();
        const routes = [[-1, -1], [1, -1], [-1, 1], [1, 1], [1, 0], [-1, 0], [0, 1], [0, -1]];
        const fitPath = (offsets, origin, length, margin) => {
            const inward = Math.max(0, origin - margin);
            const outward = Math.max(0, length - origin - margin);
            const scale = offsets.reduce((limit, offset) => {
                if (offset === 0) return limit;
                return Math.min(limit, (offset < 0 ? inward : outward) / Math.abs(offset));
            }, 1);
            return offsets.map(offset => (offset * scale).toFixed(1) + 'px');
        };
        for (let i = 0; i < particleCount; i++) {
            const fly = document.createElement('span');
            fly.className = 'magic-firefly';
            const size = compact ? 32 + Math.random() * 13 : 36 + Math.random() * 16;
            const x = 0.075 + ((i + Math.random() * 0.6) / particleCount) * 0.85;
            const y = 0.065 + (i % 3) * 0.305 + Math.random() * 0.195;
            let [horizontal, vertical] = routes[i % routes.length];
            if ((x < 0.17 && horizontal < 0) || (x > 0.83 && horizontal > 0)) horizontal = -horizontal;
            if ((y < 0.15 && vertical < 0) || (y > 0.76 && vertical > 0)) vertical = -vertical;
            const stepX = horizontal * (62 + Math.random() * 85) * (compact ? 0.7 : 1);
            const stepY = vertical * (52 + Math.random() * 88);
            const dx = fitPath([stepX * 0.52, stepX * 0.18 - vertical * 22, stepX * 1.12],
                x * width, width, size * 0.45);
            const dy = fitPath([stepY * 0.35, stepY * 0.82, stepY * 1.22],
                y * height, height, size * 0.72);
            fly.style.setProperty('--ff-x', (x * 100).toFixed(2) + '%');
            fly.style.setProperty('--ff-y', (y * 100).toFixed(2) + '%');
            ['a', 'b', 'c'].forEach((key, index) => {
                fly.style.setProperty('--ff-dx-' + key, dx[index]);
                fly.style.setProperty('--ff-dy-' + key, dy[index]);
            });
            fly.style.setProperty('--ff-size', size.toFixed(1) + 'px');
            fly.style.setProperty('--ff-delay', (i < 6 ? Math.random() * 0.3 : 0.2 + Math.random() * 1.2).toFixed(2) + 's');
            fly.style.setProperty('--ff-duration', (5.2 + Math.random() * 1.25).toFixed(2) + 's');
            fly.style.setProperty('--ff-flap', (0.12 + Math.random() * 0.07).toFixed(2) + 's');
            fly.style.setProperty('--ff-phase', (-Math.random() * 0.24).toFixed(2) + 's');
            const halo = document.createElement('span');
            halo.className = 'magic-firefly__halo';
            const image = document.createElement('img');
            image.className = 'magic-firefly__sprite';
            image.src = sprite.src;
            image.alt = '';
            image.decoding = 'async';
            image.draggable = false;
            fly.appendChild(halo);
            if (sprite.atlas) {
                // Rows are front, left and right; choose the pose after reflecting edge routes.
                const row = reducedMotion ? i % 3 : horizontal < 0 ? 1 : horizontal > 0 ? 2 : 0;
                const frame = document.createElement('span');
                frame.className = 'magic-firefly__frame';
                image.style.top = -row * 100 + '%';
                frame.appendChild(image);
                fly.appendChild(frame);
            } else {
                fly.appendChild(image);
            }
            fragment.appendChild(fly);
        }

        flight.appendChild(fragment);
        let observer = null;
        const cleanup = () => {
            if (runId !== this.fireflyRunId) return;
            this.clearEffectTimeouts(group);
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

    async spawnBubbles(count = 42, group = 'bubbles') {
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
        const particleCount = reducedMotion ? 3 : Math.min(count, compact ? 30 : 42);
        const field = document.createElement('div');
        field.className = `bubble-field${reducedMotion ? ' bubble-field--reduced' : ''}`;
        field.setAttribute('aria-hidden', 'true');
        const fragment = document.createDocumentFragment();
        const sizeRanges = compact ? [[20, 30], [34, 48], [56, 72]] : [[24, 34], [42, 58], [68, 88]];
        const laneCount = Math.ceil(particleCount / sizeRanges.length);
        const laneDurations = Array.from({ length: laneCount }, () => 4.8 + Math.random() * 1.5);
        const layout = Array.from({ length: particleCount }, (_, i) => {
            const sizeIndex = i % sizeRanges.length;
            const lane = Math.floor(i / sizeRanges.length);
            const [minSize, maxSize] = sizeRanges[sizeIndex];
            return { sizeIndex, lane, size: Math.round(minSize + Math.random() * (maxSize - minSize)),
                center: 6 + ((lane + .2 + Math.random() * .6) / laneCount) * 88,
                drift: (Math.random() - .5) * (compact ? 110 : 180),
                delay: (lane + sizeIndex) % 3 * .62 + Math.random() * .22,
                duration: laneDurations[lane] + sizeIndex * .18 };
        });
        if (!reducedMotion) {
            const width = window.innerWidth, height = window.innerHeight;
            // Sample bubbleFloat once at launch. A little grazing looks natural;
            // penalize paths where one bubble hides another for multiple samples.
            const sample = b => Array.from({ length: 24 }, (_, i) => {
                const t = (.45 + i * .29 - b.delay) / b.duration;
                if (t <= 0 || t >= 1) return null;
                const first = t < .34, last = t >= .68;
                const u = first ? t / .34 : last ? (t - .68) / .32 : (t - .34) / .34;
                const e = u * u * (3 - 2 * u);
                const dx = first ? .55 * e : last ? -.3 + 1.3 * e : .55 - .85 * e;
                const rise = first ? .37 * height * e : last ? .75 * height + (.25 * height + 130) * e
                    : (.37 + .38 * e) * height;
                const y = height + 60 - b.size / 2 - rise;
                return y >= 0 && y <= height ? [width * b.center / 100 + b.drift * dx, y] : null;
            });
            const occupied = layout.filter(b => b.sizeIndex !== 0).map(b => ({
                radius: b.size / 2, weight: b.sizeIndex === 2 ? 1 : .28, path: sample(b)
            }));
            for (const b of layout.filter(b => b.sizeIndex === 0)) {
                let best = Infinity, bestPath;
                for (let attempt = 0; attempt < 12 && best > 0; attempt++) {
                    const route = attempt === 0 ? b : { ...b,
                        center: Math.min(94, Math.max(6, 6 + (b.lane + .5 + (Math.random() - .5) * 2.4) / laneCount * 88)),
                        delay: b.lane % 3 * .62 + Math.random() * .22,
                        drift: (Math.random() - .5) * (compact ? 110 : 180),
                        duration: 4.8 + Math.random() * 1.5 };
                    const path = sample(route);
                    let cost = 0;
                    for (const other of occupied) {
                        if (cost >= best) break;
                        const gap = (b.size / 2 + other.radius) * .88;
                        for (let i = 0; i < path.length; i++) {
                            const p = path[i], q = other.path[i];
                            if (!p || !q) continue;
                            const dx = p[0]-q[0], dy = p[1]-q[1];
                            cost += other.weight * Math.max(0, 1 - (dx*dx + dy*dy) / (gap*gap));
                        }
                    }
                    if (cost < best) {
                        best = cost;
                        bestPath = path;
                        Object.assign(b, route);
                    }
                }
                occupied.push({ radius: b.size / 2, weight: .35, path: bestPath });
            }
        }
        for (const [i, {sizeIndex, size, drift, center, delay, duration}] of layout.entries()) {
            const bubble = document.createElement('img');
            bubble.className = `magic-bubble magic-bubble--${['small', 'medium', 'large'][sizeIndex]}`;
            bubble.src = sprite.src;
            bubble.alt = '';
            bubble.decoding = 'async';
            bubble.draggable = false;
            bubble.style.setProperty('--bubble-size', `${size}px`);
            bubble.style.setProperty('--bubble-x', `calc(${center.toFixed(1)}vw - ${size / 2}px)`);
            bubble.style.setProperty('--bubble-drift-a', `${Math.round(drift * .55)}px`);
            bubble.style.setProperty('--bubble-drift-b', `${Math.round(-drift * .3)}px`);
            bubble.style.setProperty('--bubble-drift-c', `${Math.round(drift)}px`);
            bubble.style.setProperty('--bubble-delay', `${delay.toFixed(2)}s`);
            bubble.style.setProperty('--bubble-duration', `${duration.toFixed(2)}s`);
            if (reducedMotion) {
                bubble.style.setProperty('--bubble-x', `calc(${20 + i * 30}vw - ${size / 2}px)`);
                bubble.style.setProperty('--bubble-static-y', `${30 + i * 20}vh`);
            }
            fragment.appendChild(bubble);
        }
        field.appendChild(fragment);
        document.body.appendChild(field);
        let observer = null;
        const cleanup = () => {
            if (runId !== this.bubbleRunId) return;
            this.clearEffectTimeouts(group);
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
        let width = 0;
        let height = 0;
        const resize = () => {
            width = window.innerWidth || document.documentElement.clientWidth || 1;
            height = window.innerHeight || document.documentElement.clientHeight || 1;
            const dpr = Math.min(window.devicePixelRatio || 1, width < 640 ? 1.5 : 2);
            canvas.width = Math.ceil(width * dpr);
            canvas.height = Math.ceil(height * dpr);
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        };
        resize();
        const count = width < 640 ? 228 : 324;
        const particles = Array.from({ length: count }, (_, index) => {
            const spread = (index / (count - 1)) * 2 - 1;
            const followThrough = index % 4 === 0;
            // One in twelve starts just ahead of the main fan. Cycle through all three themed shapes.
            const lead = index % 12 === 2 + 4 * (Math.floor(index / 12) % 3);
            const advance = lead ? rand(0.075, 0.12) : 0;
            return {
                image: sprites[index % sprites.length],
                x: width * (0.5 + rand(-0.06, 0.06) + spread * (followThrough ? 0.12 : advance)),
                y: height * (rand(0.75, 0.82) - advance * (1.36 - 0.36 * Math.abs(spread))),
                vx: spread * width * (followThrough ? rand(0.36, 0.6) : rand(0.72, 1.08)) + rand(-30, 30),
                vy: -height * rand(1.08, 1.78),
                gravity: height * rand(1.35, 1.82),
                wobble: rand(0, Math.PI * 2),
                rotation: rand(-0.45, 0.45),
                spin: rand(-2.8, 2.8),
                size: rand(14, 24),
                age: followThrough ? -rand(0.16, 0.36) : lead || index % 2 === 1 ? 0 : -rand(0.02, 0.12),
                ttl: rand(2.35, 2.95)
            };
        });
        let lastFrame = null;
        const animate = now => {
            if (runId !== this.confettiRunId || theme !== this.getGoldRainThemeId()) {
                ctx.clearRect(0, 0, width, height);
                this.confettiAnimationId = null;
                return;
            }
            if (window.innerWidth !== width || window.innerHeight !== height) resize();
            const firstFrame = lastFrame === null;
            const delta = firstFrame ? 0 : Math.min(0.05, (now - lastFrame) / 1000);
            lastFrame = now;
            if (firstFrame) window.app?.soundMgr?.confettiPop?.();
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
                if (particle.y < -particle.size) continue; // Offscreen at the apex; still simulate its return.
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
    
    celebrateYamb(yambFace) {
        const active = localStorage.getItem('yamb_active_effect') || 'confetti';
        this.trigger(active, yambFace);
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
        
        const savedMusicVolume = localStorage.getItem('yamb_music_volume');
        this.musicVolume = this.normalizeMusicVolume(savedMusicVolume);
        if (savedMusicVolume !== null) localStorage.setItem('yamb_music_volume', this.musicVolume);
        const lastVolume = this.normalizeMusicVolume(localStorage.getItem('yamb_music_last_volume'));
        this.lastAudibleMusicVolume = this.musicVolume > 0 ? this.musicVolume : (lastVolume || 0.4);
        
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

    normalizeMusicVolume(value, fallback = 0.4) {
        const volume = typeof value === 'number' ? value
            : (typeof value === 'string' && value.trim() ? Number(value) : NaN);
        return Number.isFinite(volume) ? Math.max(0, Math.min(1, volume)) : fallback;
    }

    setMusicEnabled(enabled, { restoreVolume = false } = {}) {
        this.musicEnabled = !!enabled;
        if (this.musicEnabled && restoreVolume && this.musicVolume === 0) {
            this.setMusicVolume(this.lastAudibleMusicVolume);
            return;
        }
        if (!enabled) {
            this.bgMusic.pause();
        } else if (window.app && window.app.gameActive && this.musicVolume > 0) {
            this.playMusic(); 
        }
    }

    setMusicVolume(vol) {
        this.musicVolume = this.normalizeMusicVolume(vol, this.musicVolume);
        this.bgMusic.volume = this.musicVolume;
        localStorage.setItem('yamb_music_volume', this.musicVolume);
        if (this.musicVolume > 0) {
            this.lastAudibleMusicVolume = this.musicVolume;
        }
        localStorage.setItem('yamb_music_last_volume', this.lastAudibleMusicVolume);
        
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

    dragonBreath(breathDelay = 0.9) {
        let cleanup;
        this.playSound(() => {
            const ctx = this.ctx, now = ctx.currentTime;
            const start = now + breathDelay, end = start + 2.9;
            const master = ctx.createGain();
            master.gain.setValueAtTime(0.8, now);
            master.connect(ctx.destination);
            if (this.dragonWindBuffer?.sampleRate !== ctx.sampleRate) {
                this.dragonWindBuffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
                const samples = this.dragonWindBuffer.getChannelData(0);
                for (let i = 0; i < samples.length; i++) samples[i] = Math.random() * 2 - 1;
            }
            const wind = ctx.createBufferSource();
            wind.buffer = this.dragonWindBuffer; wind.loop = true;
            const filter = ctx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(600, now);
            filter.frequency.linearRampToValueAtTime(950, start);
            filter.frequency.linearRampToValueAtTime(3400, start + 0.12);
            filter.frequency.exponentialRampToValueAtTime(1300, start + 1.8);
            filter.frequency.linearRampToValueAtTime(3800, start + 2.53);
            filter.frequency.exponentialRampToValueAtTime(750, end);
            const windGain = ctx.createGain();
            windGain.gain.setValueAtTime(0, now);
            windGain.gain.linearRampToValueAtTime(0.025, now + breathDelay * 0.65);
            windGain.gain.linearRampToValueAtTime(0.012, start);
            windGain.gain.linearRampToValueAtTime(0.18, start + 0.09);
            windGain.gain.linearRampToValueAtTime(0.115, start + 1.8);
            windGain.gain.linearRampToValueAtTime(0.235, start + 2.53);
            windGain.gain.exponentialRampToValueAtTime(0.0001, end);
            wind.connect(filter); filter.connect(windGain); windGain.connect(master);
            wind.start(now); wind.stop(end);

            const growl = ctx.createOscillator(), growlFilter = ctx.createBiquadFilter(), growlGain = ctx.createGain();
            growl.type = 'sawtooth'; growlFilter.type = 'lowpass';
            growlFilter.frequency.value = 160;
            growl.frequency.setValueAtTime(62, now);
            growl.frequency.linearRampToValueAtTime(48, start + 0.2);
            growl.frequency.linearRampToValueAtTime(64, start + 1.5);
            growl.frequency.linearRampToValueAtTime(39, end);
            growlGain.gain.setValueAtTime(0, now);
            growlGain.gain.linearRampToValueAtTime(0.035, start);
            growlGain.gain.linearRampToValueAtTime(0.045, start + 0.15);
            growlGain.gain.exponentialRampToValueAtTime(0.0001, end);
            growl.connect(growlFilter); growlFilter.connect(growlGain); growlGain.connect(master);
            growl.start(now); growl.stop(end);

            const impact = ctx.createOscillator(), impactGain = ctx.createGain();
            impact.type = 'triangle';
            impact.frequency.setValueAtTime(150, start);
            impact.frequency.exponentialRampToValueAtTime(50, start + 0.18);
            impactGain.gain.setValueAtTime(0, start);
            impactGain.gain.linearRampToValueAtTime(0.07, start + 0.015);
            impactGain.gain.exponentialRampToValueAtTime(0.0001, start + 0.24);
            impact.connect(impactGain); impactGain.connect(master);
            impact.start(start); impact.stop(start + 0.26);
            let stopped = false;
            cleanup = () => {
                if (stopped) return;
                stopped = true;
                const cut = ctx.currentTime;
                master.gain.setValueAtTime(0.8, cut);
                master.gain.linearRampToValueAtTime(0, cut + 0.03);
                [wind, growl, impact].forEach(source => { try { source.stop(cut + 0.035); } catch (_) {} });
            };
        });
        return cleanup;
    }

    royalFanfare(crestDelay = 2.6) {
        let cleanup;
        this.playSound(() => {
            const ctx = this.ctx, now = ctx.currentTime;
            const master = ctx.createGain();
            master.gain.setValueAtTime(0.8, now);
            master.connect(ctx.destination);
            const sources = [];
            const note = (frequency, offset, duration, volume) => {
                const start = now + offset;
                const envelope = ctx.createGain();
                envelope.gain.setValueAtTime(0, start);
                envelope.gain.linearRampToValueAtTime(volume, start + 0.035);
                envelope.gain.exponentialRampToValueAtTime(volume * 0.55, start + duration * 0.38);
                envelope.gain.exponentialRampToValueAtTime(0.0001, start + duration);
                envelope.connect(master);
                for (const [harmonic, level] of [[1, 1], [2, 0.2]]) {
                    const oscillator = ctx.createOscillator();
                    const gain = ctx.createGain();
                    oscillator.type = harmonic === 1 ? 'triangle' : 'sine';
                    oscillator.frequency.setValueAtTime(frequency * harmonic, start);
                    gain.gain.value = level;
                    oscillator.connect(gain); gain.connect(envelope);
                    oscillator.start(start); oscillator.stop(start + duration + 0.02);
                    sources.push(oscillator);
                }
            };
            [[0, 261.63], [0.26, 329.63], [0.52, 392], [0.94, 523.25], [1.44, 392]]
                .filter(([offset]) => offset + 0.43 < crestDelay)
                .forEach(([offset, frequency]) => note(frequency, offset, 0.43, 0.075));
            [130.81, 261.63, 329.63, 392, 523.25].forEach((frequency, i) =>
                note(frequency, crestDelay, 1.15 + i * 0.06, i === 0 ? 0.035 : 0.043));
            note(1046.5, crestDelay + 0.02, 0.6, 0.014);
            let stopped = false;
            cleanup = () => {
                if (stopped) return;
                stopped = true;
                const cut = ctx.currentTime;
                master.gain.setValueAtTime(0.8, cut);
                master.gain.linearRampToValueAtTime(0, cut + 0.03);
                sources.forEach(source => { try { source.stop(cut + 0.035); } catch (_) {} });
            };
        });
        return cleanup;
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

    ufoAbduction(beamAt = 1.35, releaseAt = 5) {
        let cleanup;
        this.playSound(() => {
            const ctx = this.ctx, now = ctx.currentTime, bus = ctx.createGain();
            bus.connect(ctx.destination);
            const sources = [];
            const voice = (type, start, frequencies, levels) => {
                const osc = ctx.createOscillator(), amp = ctx.createGain();
                const at = now + start;
                osc.type = type;
                osc.frequency.setValueAtTime(frequencies[0][1], at);
                for (const [dt, hz] of frequencies.slice(1)) osc.frequency.exponentialRampToValueAtTime(hz, at + dt);
                amp.gain.setValueAtTime(0, at);
                for (const [dt, value] of levels) amp.gain.linearRampToValueAtTime(value, at + dt);
                osc.connect(amp); amp.connect(bus);
                osc.onended = () => { osc.disconnect(); amp.disconnect(); };
                osc.start(at); osc.stop(at + levels[levels.length - 1][0] + .015);
                sources.push(osc);
            };
            // A low motor under a rising carrier; the falling interval cues the return to the board.
            voice('triangle', 0, [[0,106],[beamAt,76],[releaseAt,91],[7.25,52]],
                [[.42,.055],[beamAt,.078],[releaseAt,.060],[6.15,.046],[7.25,0]]);
            const capture = releaseAt - beamAt;
            voice('sine', beamAt, [[0,185],[.78,277],[capture-.18,440],[capture,415],[capture+.85,185]],
                [[.30,.042],[capture-.25,.055],[capture,.032],[capture+.85,0]]);
            voice('sine', releaseAt, [[0,622],[.40,415],[.90,277]],
                [[.06,.044],[.32,.035],[.94,0]]);
            let stopped = false;
            cleanup = () => {
                if (stopped) return;
                stopped = true;
                const cut = ctx.currentTime;
                bus.gain.setValueAtTime(1, cut);
                bus.gain.linearRampToValueAtTime(0, cut + .025);
                for (const osc of sources) { try { osc.stop(cut + .03); } catch (_) {} }
            };
        });
        return cleanup;
    }

    iceAge(growthSeconds = 2.8) {
        let stop;
        this.playSound(() => {
            const ctx = this.ctx;
            const now = ctx.currentTime;
            const end = now + growthSeconds;
            const bufferSize = Math.ceil(ctx.sampleRate * growthSeconds);
            if (this.iceGrowBuffer?.length !== bufferSize || this.iceGrowBuffer.sampleRate !== ctx.sampleRate) {
                this.iceGrowBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
                const output = this.iceGrowBuffer.getChannelData(0);
                for (let i = 0; i < bufferSize; i++) output[i] = Math.random() * 2 - 1;
            }
            this.prepareIceCrack(ctx);
            const master = ctx.createGain();
            master.gain.setValueAtTime(1, now);
            master.connect(ctx.destination);

            const frostNoise = this.ctx.createBufferSource();
            const frostFilter = this.ctx.createBiquadFilter();
            const frostGain = this.ctx.createGain();
            frostNoise.buffer = this.iceGrowBuffer;
            frostFilter.type = 'bandpass';
            frostFilter.frequency.setValueAtTime(5200, now);
            frostFilter.frequency.exponentialRampToValueAtTime(780, end);
            frostFilter.Q.setValueAtTime(1.4, now);
            frostGain.gain.setValueAtTime(0, now);
            frostGain.gain.linearRampToValueAtTime(0.12, now + 0.08);
            frostGain.gain.exponentialRampToValueAtTime(0.065, now + growthSeconds * 0.68);
            frostGain.gain.exponentialRampToValueAtTime(0.001, end);
            frostNoise.connect(frostFilter);
            frostFilter.connect(frostGain);
            frostGain.connect(master);
            frostNoise.start(now);
            frostNoise.stop(end);

            const hum = this.ctx.createOscillator();
            const humGain = this.ctx.createGain();
            hum.type = 'sine';
            hum.frequency.setValueAtTime(96, now);
            hum.frequency.exponentialRampToValueAtTime(44, end);
            humGain.gain.setValueAtTime(0, now);
            humGain.gain.linearRampToValueAtTime(0.045, now + 0.16);
            humGain.gain.exponentialRampToValueAtTime(0.001, end);
            hum.connect(humGain);
            humGain.connect(master);
            hum.start(now);
            hum.stop(end);

            const sources = [frostNoise, hum];
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
                gain.connect(master);
                osc.start(start);
                osc.stop(start + 0.52);
                sources.push(osc);
            });
            stop = () => {
                if (ctx.currentTime >= end) return;
                const cut = ctx.currentTime;
                master.gain.setValueAtTime(1, cut);
                master.gain.linearRampToValueAtTime(0, cut + 0.025);
                sources.forEach(source => source.stop(cut + 0.025));
            };
        });
        return stop;
    }

    prepareIceCrack(ctx) {
        if (this.iceCrackBuffer?.sampleRate === ctx.sampleRate) return this.iceCrackBuffer;
        const buffer = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * 0.62), ctx.sampleRate);
        const samples = buffer.getChannelData(0);
        // One close snap followed by smaller splits travelling through the sheet.
        for (const [onset, level, pitch] of [[0, 0.48, 260], [0.058, 0.23, 870],
            [0.137, 0.16, 1320], [0.196, 0.11, 1780]]) {
            const start = Math.round(onset * ctx.sampleRate);
            let previous = 0;
            for (let i = start; i < samples.length; i++) {
                const t = (i - start) / ctx.sampleRate, noise = Math.random() * 2 - 1;
                const snap = (noise - previous * 0.67) * Math.exp(-t / 0.012) * 0.66;
                const ring = Math.sin(2 * Math.PI * (pitch * t + 3.5 * (1 - Math.exp(-t * 27)))) * Math.exp(-t / 0.066);
                samples[i] += level * (snap + 0.54 * ring) * Math.min(1, t * 1800, (samples.length - i - 1) / (ctx.sampleRate * 0.018));
                previous = noise;
            }
        }
        this.iceCrackBuffer = buffer;
        return buffer;
    }

    iceAgeCrack() {
        let stop;
        this.playSound(() => {
            const ctx = this.ctx;
            const source = ctx.createBufferSource(), volume = ctx.createGain();
            source.buffer = this.prepareIceCrack(ctx);
            source.connect(volume); volume.connect(ctx.destination);
            let ended = false;
            source.onended = () => { ended = true; source.disconnect(); volume.disconnect(); };
            source.start();
            stop = () => {
                if (ended) return;
                ended = true;
                volume.gain.setValueAtTime(1, ctx.currentTime);
                volume.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.016);
                source.stop(ctx.currentTime + 0.018);
            };
        });
        return stop;
    }
     
    // --- PROCEDURALNI ZVUK GROMA ---
    thunder(strikeDelay = 1.48) {
        let cleanup;
        this.playSound(() => {
            const ctx = this.ctx, now = ctx.currentTime, strike = now + strikeDelay, end = now + 4.2;
            const master = ctx.createGain(), sources = [];
            master.gain.setValueAtTime(0.72, now); master.connect(ctx.destination);
            if (!this.thunderNoiseBuffer) {
                this.thunderNoiseBuffer = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * 1.6), ctx.sampleRate);
                const samples = this.thunderNoiseBuffer.getChannelData(0);
                for (let i = 0; i < samples.length; i++) samples[i] = Math.random() * 2 - 1;
            }
            const noise = (type, frequency, start, finish) => {
                const source = ctx.createBufferSource(), filter = ctx.createBiquadFilter(), gain = ctx.createGain();
                source.buffer = this.thunderNoiseBuffer; source.loop = true;
                filter.type = type; filter.frequency.setValueAtTime(frequency, start); filter.Q.value = 0.6;
                gain.gain.setValueAtTime(0, start);
                source.connect(filter); filter.connect(gain); gain.connect(master);
                source.start(start); source.stop(finish); sources.push(source);
                return { filter, envelope: gain.gain };
            };
            const wind = noise('lowpass', 280, now, strike);
            wind.envelope.linearRampToValueAtTime(0.035, now + 0.45);
            wind.envelope.linearRampToValueAtTime(0.055, strike - 0.1);
            wind.envelope.linearRampToValueAtTime(0, strike);

            // The original thunder opened up from a low rumble, not a separate high-pitched pop.
            const rumble = noise('lowpass', 150, strike, end);
            rumble.filter.frequency.linearRampToValueAtTime(1000, strike + 0.085);
            rumble.filter.frequency.exponentialRampToValueAtTime(45, end);
            rumble.envelope.linearRampToValueAtTime(0.92, strike + 0.045);
            rumble.envelope.exponentialRampToValueAtTime(0.34, strike + 0.4);
            rumble.envelope.linearRampToValueAtTime(0.22, strike + 0.65);
            rumble.envelope.linearRampToValueAtTime(0.29, strike + 0.88);
            rumble.envelope.exponentialRampToValueAtTime(0.0001, end - 0.06);

            const bass = ctx.createOscillator(), bassGain = ctx.createGain();
            bass.type = 'triangle';
            bass.frequency.setValueAtTime(50, strike);
            bass.frequency.exponentialRampToValueAtTime(14, end);
            bassGain.gain.setValueAtTime(0, strike);
            bassGain.gain.linearRampToValueAtTime(0.33, strike + 0.095);
            bassGain.gain.exponentialRampToValueAtTime(0.0001, end - 0.05);
            bass.connect(bassGain); bassGain.connect(master);
            bass.start(strike); bass.stop(end); sources.push(bass);
            let remaining = sources.length;
            sources.forEach(source => { source.onended = () => {
                source.disconnect();
                if (!--remaining) master.disconnect();
            }; });
            let stopped = false;
            cleanup = () => {
                if (stopped) return;
                stopped = true;
                const cut = ctx.currentTime;
                master.gain.setValueAtTime(0.72, cut);
                master.gain.linearRampToValueAtTime(0, cut + 0.025);
                sources.forEach(source => { try { source.stop(cut + 0.03); } catch (_) {} });
            };
        });
        return cleanup;
    }

    // --- ZVUK ZVIŽDUKA RAKETE PRI POLETANJU ---
    fireworkVoice(volume = 1) {
        const ctx = this.ctx, master = ctx.createGain(), sources = [];
        master.gain.setValueAtTime(volume * 0.8, ctx.currentTime);
        master.connect(ctx.destination);
        let stopped = false;
        return { master, sources, stop: () => {
            if (stopped) return;
            stopped = true;
            const now = ctx.currentTime;
            master.gain.setValueAtTime(volume * 0.8, now);
            master.gain.linearRampToValueAtTime(0, now + 0.025);
            sources.forEach(source => { try { source.stop(now + 0.03); } catch (_) {} });
        } };
    }

    getFireworkNoise() {
        if (!this.fireworkNoiseBuffer) {
            const ctx = this.ctx;
            this.fireworkNoiseBuffer = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * 1.6), ctx.sampleRate);
            const samples = this.fireworkNoiseBuffer.getChannelData(0);
            for (let i = 0; i < samples.length; i++) samples[i] = Math.random() * 2 - 1;
        }
        return this.fireworkNoiseBuffer;
    }

    fireworkLaunch(duration = 0.72, variation = 0) {
        let cleanup;
        this.playSound(() => {
            const ctx = this.ctx, now = ctx.currentTime;
            const voice = this.fireworkVoice();
            const osc = ctx.createOscillator(), gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(320 + variation % 3 * 45, now);
            osc.frequency.exponentialRampToValueAtTime(1450 + variation % 3 * 90, now + duration);
            gain.gain.setValueAtTime(0, now);
            gain.gain.linearRampToValueAtTime(0.027, now + 0.08);
            gain.gain.linearRampToValueAtTime(0, now + duration);
            osc.connect(gain); gain.connect(voice.master);
            osc.start(now); osc.stop(now + duration);
            const noise = ctx.createBufferSource(), filter = ctx.createBiquadFilter(), noiseGain = ctx.createGain();
            noise.buffer = this.getFireworkNoise();
            filter.type = 'bandpass'; filter.frequency.value = 2100; filter.Q.value = 0.8;
            noiseGain.gain.setValueAtTime(0, now);
            noiseGain.gain.linearRampToValueAtTime(0.018, now + 0.06);
            noiseGain.gain.linearRampToValueAtTime(0, now + duration);
            noise.connect(filter); filter.connect(noiseGain); noiseGain.connect(voice.master);
            noise.start(now); noise.stop(now + duration);
            voice.sources.push(osc, noise);
            cleanup = voice.stop;
        });
        return cleanup;
    }

    confettiPop() {
        this.playSound(() => {
            const { sampleRate } = this.ctx;
            if (!this.confettiPopBuffer) {
                const length = Math.ceil(sampleRate * 0.16);
                const buffer = this.ctx.createBuffer(1, length, sampleRate);
                const samples = buffer.getChannelData(0);
                let softNoise = 0;
                const smoothing = 1 - Math.exp(-2 * Math.PI * 1400 / sampleRate);
                for (let i = 0; i < length; i++) {
                    const t = i / sampleRate;
                    const noise = Math.random() * 2 - 1;
                    softNoise += (noise - softNoise) * smoothing;
                    // A dry crack and a short paper rustle, with no long explosion tail.
                    const crack = (noise * 0.32 + softNoise * 0.24) * Math.exp(-t / 0.010);
                    const thump = Math.sin(2 * Math.PI * (136 * t + 1.85 * (1 - Math.exp(-t * 79))))
                        * 0.24 * Math.exp(-t / 0.024);
                    const paper = (noise - softNoise) * (0.064 + 0.036 * Math.sin(164 * t) ** 2) * Math.exp(-t / 0.043);
                    samples[i] = (crack + thump + paper) * Math.min(1, t / 0.0015, (length - i - 1) / (sampleRate * 0.015));
                }
                this.confettiPopBuffer = buffer;
            }
            const source = this.ctx.createBufferSource();
            source.buffer = this.confettiPopBuffer;
            source.connect(this.ctx.destination);
            source.start();
        });
    }

    fireworkExplode(kind = 'sphere', variation = 0, volume = 1, crackles = [], elapsed = 0) {
        let cleanup;
        this.playSound(() => {
            const ctx = this.ctx, now = ctx.currentTime, voice = this.fireworkVoice(volume);
            const ring = kind === 'ring', willow = kind === 'willow';
            const duration = willow ? 1.25 : ring ? 0.6 : 0.85;
            const noise = ctx.createBufferSource(), filter = ctx.createBiquadFilter(), gain = ctx.createGain();
            noise.buffer = this.getFireworkNoise();
            filter.type = ring ? 'bandpass' : 'lowpass';
            filter.frequency.setValueAtTime((willow ? 950 : ring ? 2100 : 1550) + variation % 3 * 90, now);
            filter.frequency.exponentialRampToValueAtTime(willow ? 100 : ring ? 520 : 170, now + duration);
            filter.Q.value = ring ? 0.7 : 0.5;
            gain.gain.setValueAtTime(0, now);
            gain.gain.linearRampToValueAtTime(ring ? 0.2 : 0.25, now + 0.008);
            gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
            noise.connect(filter); filter.connect(gain); gain.connect(voice.master);
            noise.start(now, variation % 3 * 0.08); noise.stop(now + duration);
            const thump = ctx.createOscillator(), bass = ctx.createGain();
            thump.type = 'sine';
            thump.frequency.setValueAtTime(willow ? 82 : ring ? 170 : 120, now);
            thump.frequency.exponentialRampToValueAtTime(willow ? 36 : 55, now + 0.26);
            bass.gain.setValueAtTime(0, now);
            bass.gain.linearRampToValueAtTime(ring ? 0.04 : 0.085, now + 0.012);
            bass.gain.exponentialRampToValueAtTime(0.0001, now + 0.42);
            thump.connect(bass); bass.connect(voice.master);
            thump.start(now); thump.stop(now + 0.45);
            voice.sources.push(noise, thump);
            if (willow && crackles.length) {
                const fizz = ctx.createBufferSource(), high = ctx.createBiquadFilter(), amp = ctx.createGain();
                fizz.buffer = this.getFireworkNoise(); high.type = 'highpass'; high.frequency.value = 1900;
                amp.gain.value = 0;
                for (const cue of crackles) {
                    const at = now + Math.max(0, cue - elapsed);
                    amp.gain.setValueAtTime(0, at);
                    amp.gain.linearRampToValueAtTime(0.12, at + 0.003);
                    amp.gain.exponentialRampToValueAtTime(0.001, at + 0.028);
                    amp.gain.linearRampToValueAtTime(0.053, at + 0.043);
                    amp.gain.exponentialRampToValueAtTime(0.0001, at + 0.078);
                }
                fizz.connect(high); high.connect(amp); amp.connect(voice.master);
                fizz.start(now); fizz.stop(now + crackles[crackles.length - 1] - elapsed + 0.09);
                voice.sources.push(fizz);
            }
            cleanup = voice.stop;
        });
        return cleanup;
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

    // Original ten-bar kolo in 2/4. Each bar contains eight sixteenth-note ticks.
    balkanTrumpet(beat = 60 / 144, pickup = 0.045) {
        const resume = this.balkanResumeMusic;
        this.stopBalkanMusic(false);
        this.playSound(() => {
            const ctx = this.ctx, now = ctx.currentTime + pickup, bar = 2 * beat, tick = beat / 4;
            this.balkanResumeMusic = resume || !!(this.bgMusic && !this.bgMusic.paused);
            if (this.bgMusic && !this.bgMusic.paused) this.bgMusic.pause();
            const keep = node => { this.balkanNodes.push(node); return node; };
            const mix = keep(ctx.createGain()), compressor = keep(ctx.createDynamicsCompressor());
            mix.gain.value = 0.76;
            compressor.threshold.value = -13; compressor.ratio.value = 3;
            mix.connect(compressor); compressor.connect(ctx.destination);
            const freq = key => 440 * 2 ** ((key - 69) / 12);
            const gate = (param, at, length, level, attack) => {
                param.setValueAtTime(0.0001, at);
                param.linearRampToValueAtTime(level, at + attack);
                param.exponentialRampToValueAtTime(level * 0.71, at + length * 0.59);
                param.exponentialRampToValueAtTime(0.0001, at + length);
            };
            const wave = harmonics => ctx.createPeriodicWave(new Float32Array(harmonics.length), Float32Array.from(harmonics));
            const bell = wave([0, 1, 0.56, 0.48, 0.22, 0.19, 0.10, 0.06]);
            const reed = wave([0, 1, 0.26, 0.41, 0.11, 0.15, 0.07]);
            const voice = (shape, cutoff, detune = 0) => {
                const osc = keep(ctx.createOscillator()), tone = keep(ctx.createBiquadFilter()), amp = keep(ctx.createGain());
                if (typeof shape === 'string') osc.type = shape;
                else osc.setPeriodicWave(shape);
                osc.detune.value = detune; tone.type = 'lowpass'; tone.frequency.value = cutoff; tone.Q.value = 0.72;
                amp.gain.value = 0.0001; osc.connect(tone); tone.connect(amp); amp.connect(mix);
                osc.start(now); osc.stop(now + 10 * bar + 0.08);
                return { osc, amp, tone };
            };
            const lead = voice(bell, 3000), reply = voice(reed, 2500, -4);
            const chord = [voice(reed, 1850, -5), voice(reed, 1950, 5), voice(reed, 2050)];
            const bass = voice('triangle', 520), drum = voice('sine', 260);
            const rim = keep(ctx.createBufferSource()), skin = keep(ctx.createBiquadFilter()), rimGain = keep(ctx.createGain());
            if (!this.weddingDrumSkin || this.weddingDrumSkin.sampleRate !== ctx.sampleRate) {
                this.weddingDrumSkin = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * 0.19), ctx.sampleRate);
                const samples = this.weddingDrumSkin.getChannelData(0);
                for (let i = 0; i < samples.length; i++) samples[i] = Math.random() * 2 - 1;
            }
            rim.buffer = this.weddingDrumSkin; rim.loop = true;
            skin.type = 'bandpass'; skin.frequency.value = 1650; skin.Q.value = 0.8;
            rimGain.gain.value = 0.0001;
            rim.connect(skin); skin.connect(rimGain); rimGain.connect(mix);
            rim.start(now); rim.stop(now + 10 * bar + 0.08);
            const phrase = [
                [[74,2],[78,2],[81,3],[79,1]], [[78,2],[76,1],[78,1],[74,3],[73,1]],
                [[74,2],[78,2],[81,2],[83,2]], [[81,3],[79,1],[78,2],[76,2]],
                [[83,2],[81,1],[79,1],[78,2],[79,2]], [[81,3],[78,1],[76,2],[74,2]],
                [[79,2],[83,2],[86,2],[85,1],[83,1]], [[81,2],[79,2],[76,3],[73,1]],
                [[74,1],[76,1],[78,2],[81,2],[78,2]], [[76,2],[73,2],[74,4]]
            ];
            const roots = [50, 50, 50, 57, 55, 50, 55, 57, 50, 50];
            const drumHit = (at, level) => {
                drum.osc.frequency.setValueAtTime(118, at);
                drum.osc.frequency.exponentialRampToValueAtTime(52, at + 0.105);
                gate(drum.amp.gain, at, 0.125, level, 0.004);
            };
            phrase.forEach((notes, i) => {
                const start = now + bar * i, root = roots[i];
                let position = 0;
                for (const [note, ticks] of notes) {
                    const at = start + position * tick, length = ticks * tick * (ticks > 2 ? 0.94 : 0.86);
                    const grace = position === 0 && [0, 2, 4, 6, 8].includes(i);
                    lead.osc.frequency.setValueAtTime(freq(grace ? note - 2 : note), at);
                    if (grace) lead.osc.frequency.setValueAtTime(freq(note), at + 0.029);
                    lead.tone.frequency.setValueAtTime(1550, at);
                    lead.tone.frequency.exponentialRampToValueAtTime(position % 4 ? 2500 : 3600, at + 0.025);
                    gate(lead.amp.gain, at, length, position % 4 ? 0.19 : 0.23, 0.012);
                    if ((i >= 4 && i % 2 === 0) || (i % 2 && position >= 4)) {
                        const third = [2, 4, 7, 9].includes(note % 12) ? 3 : 4;
                        reply.osc.frequency.setValueAtTime(freq(note - third), at + 0.009);
                        gate(reply.amp.gain, at + 0.009, length * 0.93, 0.09, 0.018);
                    }
                    position += ticks;
                }
                for (let j = 0; j < 2; j++) {
                    const down = start + j * beat, off = down + beat / 2 + 0.008;
                    const tonic = i === 9 && j === 0 ? 57 : root;
                    bass.osc.frequency.setValueAtTime(freq(tonic - (j && i !== 9 ? 5 : 12)), down);
                    gate(bass.amp.gain, down, beat * 0.64, j ? 0.21 : 0.25, 0.014);
                    drumHit(down, j ? 0.11 : 0.19);
                    if (j) {
                        gate(rimGain.gain, down, 0.071, 0.22, 0.003);
                        if (i === 3 || i === 7) gate(rimGain.gain, down + beat * 0.75, 0.05, 0.12, 0.004);
                    }
                    const finale = i === 9 && j === 1;
                    const stab = finale ? down + 0.012 : off;
                    chord.forEach(({osc, amp}, k) => {
                        osc.frequency.setValueAtTime(freq(tonic + [7, 12, 16][k]), stab);
                        gate(amp.gain, stab, beat * (finale ? 0.82 : 0.29), 0.069, 0.012);
                    });
                }
            });
            mix.gain.setValueAtTime(0.76, now + 10 * bar - 0.11);
            mix.gain.exponentialRampToValueAtTime(0.0001, now + 10 * bar + 0.04);
            this.balkanStopTimer = setTimeout(() => this.stopBalkanMusic(true), (pickup + 10 * bar + 0.12) * 1000);
        });
    }
    
    chat() { this.click(); }
    loss() { this.error(); }
}

// --- 6. SHOP MANAGER ---
class ShopManager {
    constructor(config) {
        this.type = config.type;
        this.accountId = localStorage.getItem('yamb_uid') || 'guest';
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

        this.discountedItems = this.readStoredObject(this.getDiscountStorageKey());
        
        this.updateBalanceDisplay();
        this.render();
    }

    readStoredObject(key) {
        try {
            const value = JSON.parse(localStorage.getItem(key) || '{}');
            return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
        } catch (_) { return {}; }
    }

    isCurrentAccount() {
        return this.accountId === undefined || this.accountId === (localStorage.getItem('yamb_uid') || 'guest');
    }

    getDiscountStorageKey() {
        return `yamb_shop_discounts_${this.accountId || 'guest'}`;
    }

    saveDiscounts() {
        localStorage.setItem(this.getDiscountStorageKey(), JSON.stringify(this.discountedItems));
    }

    refreshState() {
        if (!this.isCurrentAccount()) return;
        const readArray = key => {
            try {
                const value = JSON.parse(localStorage.getItem(key) || '[]');
                return Array.isArray(value) ? value : [];
            } catch (_) { return []; }
        };
        this.discountedItems = this.readStoredObject(this.getDiscountStorageKey());
        const stored = this.readStoredObject('yamb_stats');
        const stats = window.statsManager?.stats || stored;
        const field = { skin: 'unlockedSkins', effect: 'unlockedEffects', trophy: 'unlockedTrophies' }[this.type];
        const typedKey = { skin: 'yamb_unlocked_skins', effect: 'yamb_unlocked_effects' }[this.type];
        let unlocked = [
            ...readArray('yamb_unlocked'),
            ...(typedKey ? readArray(typedKey) : []),
            ...(Array.isArray(stats[field]) ? stats[field] : []),
            ...(Array.isArray(stats.unlockedTrophies) ? stats.unlockedTrophies : []),
            ...YAMB_FREE_THEME_IDS, 'default', 'confetti', 'green_clay'
        ];
        if (this.type === 'theme') unlocked = this.getOwnedThemeIds();
        if (this.type === 'skin') {
            const ownedThemes = this.getOwnedThemeIds();
            const retired = new Set(['desert_glass', 'easter_neumorphic', 'severna_nebula']);
            unlocked = unlocked.filter(id => !retired.has(id)
                && (!this.getItemById(id)?.themeGift || ownedThemes.includes(this.getItemById(id).themeGift)));
            unlocked.push(...this.items.filter(item => item.themeGift && ownedThemes.includes(item.themeGift)).map(item => item.id));
        }
        this.unlocked = [...new Set(unlocked)];
        this.balance = Math.max(0, parseInt(localStorage.getItem('yamb_dukati'), 10) || 0);
        if (this.type !== 'trophy') {
            const fallback = { skin: 'default', effect: 'confetti', theme: 'dark' }[this.type];
            this.activeItem = localStorage.getItem(this.activeKey) || fallback;
            if (!this.getItemById(this.activeItem) || !this.unlocked.includes(this.activeItem)) {
                this.activeItem = fallback;
                localStorage.setItem(this.activeKey, fallback);
            }
        }
    }

    refreshTreasuryView() {
        const visibleShop = window.riznicaManager?.shop || this;
        if (!visibleShop.isCurrentAccount()) return;
        visibleShop.refreshState();
        visibleShop.updateBalanceDisplay();
        if (document.getElementById('riznica-screen')?.classList.contains('active')) visibleShop.render();
    }

    canPurchaseItem(item) {
        return !!item && ['skin', 'effect', 'theme'].includes(this.type)
            && !item.adUnlock && !item.themeGift && (!item.req || this.unlocked.includes(item.req));
    }

    updateBalanceDisplay() {
        if (!this.balanceEl) return;
        const balance = Math.max(0, Number(this.balance) || 0);
        const locale = localStorage.getItem('yamb_lang') === 'en' ? 'en-US' : 'sr-RS';
        const compact = (value, unit) => {
            const scaled = balance / value;
            return `${scaled.toLocaleString(locale, { maximumFractionDigits: 1, useGrouping: false })}${unit}`;
        };
        this.balanceEl.innerText = balance >= 1000000
            ? compact(1000000, 'M')
            : balance >= 10000 ? compact(1000, 'K') : String(balance);
        const fullBalance = balance.toLocaleString(locale);
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
            this.saveDiscounts();
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
        if (themeId === 'dark') return 'assets/treasury-theme-previews/dark-v2.png';
        const knownThemes = ['light', 'medium', 'winter', 'neon', 'amethyst',
            'easter', 'desert', 'moon', 'severna'];
        return knownThemes.includes(themeId)
            ? `assets/treasury-theme-previews/${themeId}-v1.png`
            : '';
    }

    getTreasuryEffectPreviewSource(effectId) {
        const previewRoot = 'assets/effects/treasury-thumbnails-v1';
        if (effectId === 'ice_age') return `${previewRoot}/universal-ice-age-v1.png`;
        if (effectId === 'neon_pulse') return `${previewRoot}/universal-neon-pulse-v1.png`;
        const selected = localStorage.getItem('yamb_theme') || 'dark';
        const theme = YAMB_THEME_IDS.includes(selected) ? selected : 'dark';
        if (effectId === 'balkan') return `${previewRoot}/universal-balkan-v1.png`;
        if (effectId === 'drones') return `assets/effects/drones-v1/${theme}-drone-v1.png`;
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
            black_hole: 'black-hole', supernova: 'supernova',
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

    async equip(id) {
        if (!this.isCurrentAccount()) return;
        this.refreshState();
        const itemId = String(id || '').trim();
        const itemExists = this.items.some(item => item.id === itemId);
        const item = this.getItemById(itemId);
        if (this.type === 'trophy' || !itemExists || !this.unlocked.includes(itemId) || (this.type === 'skin' && item?.themeGift && !this.getOwnedThemeIds().includes(item.themeGift))) {
            this.refreshTreasuryView();
            return;
        }

        if (this.type === 'theme' && window.app?.prepareTreasuryTheme) {
            const app = window.app;
            const token = app.themeSwitchRequestToken = (app.themeSwitchRequestToken || 0) + 1;
            let ready = false;
            try { ready = await app.prepareTreasuryTheme(itemId); }
            catch (error) { console.warn('Treasury theme artwork unavailable:', itemId, error); }
            this.refreshState();
            if (token !== app.themeSwitchRequestToken || this.type !== 'theme'
                || !this.isCurrentAccount()
                || !this.items.some(entry => entry.id === itemId) || !this.unlocked.includes(itemId)) return;
            if (!ready) {
                window.showNotification?.(_safeT('modal_title_info'),
                    (localStorage.getItem('yamb_lang') || 'sr').startsWith('en')
                        ? 'Theme unavailable. Try again.' : 'Tema nije učitana. Pokušaj ponovo.');
                return;
            }
        }

        this.activeItem = itemId;
        localStorage.setItem(this.activeKey, itemId);
        if (this.type === 'skin' && window.app) {
            window.app.skinManualSwitchUntil = Date.now() + 3500;
            localStorage.setItem('yamb_manual_active_skin', itemId);
            localStorage.setItem('yamb_manual_active_skin_at', String(Date.now()));
        }
        this.refreshTreasuryView();
        
        if(window.app && window.app.soundMgr) window.app.soundMgr.click();

        if (this.type === 'theme') {
            if (window.app && typeof window.app.applyTheme === 'function') {
                window.app.rememberManualThemeSelection?.(itemId);
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

        if (window.app?.socket?.connected && localStorage.getItem('yamb_uid')) {
            window.app.socket.emit('set_player_data', {
                uid: localStorage.getItem('yamb_uid'),
                name: window.app.playerName,
                stats: window.app.getFullLocalStats(),
                playerId: window.app.playerId
            });
        }
    }

    async tryBuy(id, name, price) {
        if (!this.isCurrentAccount()) return false;
        this.refreshState();
        const item = this.getItemById(id);
        if (!this.canPurchaseItem(item) || this.unlocked.includes(item.id)) return false;
        const currentPrice = item ? this.getCurrentItemPrice(item) : Math.max(0, parseInt(price, 10) || 0);

        if (this.balance < currentPrice) {
            this.refreshTreasuryView();
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
            window.openConfirmModal(id, name, currentPrice, this);
        } else if (window.modalManager && typeof window.modalManager.confirm === 'function') {
            const isConfirmed = await window.modalManager.confirm(`${_safeT('msg_confirm_buy')} ${name}?`);
            if (isConfirmed) {
                this.processTransaction(id, currentPrice);
            }
        } else if (confirm(`${_safeT('msg_confirm_buy')} ${name}?`)) {
            this.processTransaction(id, currentPrice);
        }
    }

    async processTransaction(id, price) {
        if (!this.isCurrentAccount()) return false;
        this.refreshState();
        const itemId = String(id || '').trim();
        const item = this.getItemById(itemId);
        const safePrice = item ? this.getCurrentItemPrice(item) : Math.max(0, parseInt(price, 10) || 0);

        if (!itemId || !this.canPurchaseItem(item)) return false;

        if (this.unlocked.includes(itemId)) {
            this.refreshTreasuryView();
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
            this.refreshTreasuryView();
            return false;
        }

        const economy = window.adMobGlobal;
        if (!economy || !window.app?.socket?.connected) {
            this.showRewardMessage(_safeT('err_server_conn') || 'Nema veze sa serverom.', _safeT('modal_title_info'));
            return false;
        }
        const identity = economy.economyIdentity();
        if (!economy.isEconomyIdentityCurrent(identity)) return false;
        const pending = economy.readEconomyClaims(identity.uid).find(entry => entry.context === 'purchase' &&
            !entry.blocked && entry.claimData.itemId === itemId && entry.claimData.expectedPrice === safePrice);
        let entry;
        try {
            entry = pending || economy.rememberEconomyClaim({ context: 'purchase', uid: identity.uid,
                claimData: { requestId: economy.createRewardNonce(), itemId, expectedPrice: safePrice } });
            if (economy.economyClaimsInFlight.has(entry.key)) return false;
            economy.economyClaimsInFlight.add(entry.key);
            const result = await economy.sendEconomyRequest('purchase_shop_item', entry.claimData, identity);
            if (!this.isCurrentAccount() || !economy.isEconomyIdentityCurrent(identity)) return false;
            if (result.cloudStats) window.app.applyCloudProfileSync(result.cloudStats);
            economy.finishEconomyClaim(entry, result.ok && !result.cloudStats ? { ok: false, reason: 'profile_pending' } : result);
            this.refreshTreasuryView();
            if (!result.ok || !result.cloudStats) {
                const message = result.reason === 'shop_price_changed' ? _safeT('economy_price_changed')
                    : result.reason === 'shop_insufficient_balance' ? _safeT('msg_no_money') : _safeT('economy_purchase_pending');
                this.showRewardMessage(message || 'Kupovina čeka potvrdu servera.', _safeT('modal_title_info'));
                return false;
            }
            if (this.type === 'theme') this.grantThemeDiceSkinForTheme(itemId);
            if (!result.alreadyPurchased) window.app.soundMgr?.trophy();
            this.showRewardMessage(_safeT('msg_purchase_success') || 'Kupovina uspešna!', _safeT('modal_title_info'));
            return true;
        } catch (error) {
            console.warn('Kupovina nije potvrđena.', error);
            this.showRewardMessage(_safeT('err_server_conn') || 'Kupovina nije potvrđena.', _safeT('modal_title_info'));
            return false;
        } finally {
            if (entry) economy.economyClaimsInFlight.delete(entry.key);
            economy.scheduleEconomyRecovery();
        }
    }

    getAdController() {
        return window.adMobGlobal;
    }

    async watchAdDiscount(id) {
        if (!this.isCurrentAccount()) return;
        this.refreshState();
        const item = this.getItemById(id);
        if (!this.canPurchaseItem(item) || this.unlocked.includes(item.id) || this.getItemBasePrice(item) <= 0) return;

        const adCtrl = this.getAdController();
        if (adCtrl) {
            const rewardOptions = this.getShopDiscountRewardOptions(item);
            const isRewardReady = typeof adCtrl.isRewardVideoReadyFor === 'function'
                ? adCtrl.isRewardVideoReadyFor(rewardOptions)
                : adCtrl.ads.rewarded.isReady;

            if (!isRewardReady) adCtrl.prepareReward(rewardOptions);

            const success = await adCtrl.showRewardVideo(rewardOptions);
            if (success && this.isCurrentAccount()) {
                const ssvNonce = typeof adCtrl.consumeLastRewardSsvNonce === 'function'
                    ? adCtrl.consumeLastRewardSsvNonce()
                    : '';
                const discountResult = typeof adCtrl.claimRewardWithSsvRetry === 'function'
                    ? await adCtrl.claimRewardWithSsvRetry(
                        () => this.claimServerShopDiscount(item.id, ssvNonce),
                        { nonce: ssvNonce, context: rewardOptions.context }
                    )
                    : await this.claimServerShopDiscount(item.id, ssvNonce);

                if (!this.isCurrentAccount()) return;
                if (!discountResult.ok) {
                    this.showAdClaimError(discountResult);
                    return;
                }
                if (discountResult.alreadyClaimed && discountResult.expiresAt <= Date.now()) {
                    delete this.discountedItems[item.id];
                    this.saveDiscounts();
                    this.refreshTreasuryView();
                    return;
                }

                this.discountedItems = this.readStoredObject(this.getDiscountStorageKey());
                this.discountedItems[item.id] = {
                    discountedPrice: discountResult.discountedPrice,
                    expiresAt: discountResult.expiresAt
                };
                this.saveDiscounts();
                this.refreshTreasuryView();
                this.showRewardMessage(_safeT('msg_discount_applied') || "Popust primenjen! -20%", _safeT('modal_title_info') || "INFO");
            }
        }
    }
    
    // NOVO: Funkcija za otključavanje predmeta/teme gledanjem serije reklama
    async watchAdForUnlock(id, target) {
        if (!this.isCurrentAccount()) return;
        this.refreshState();
        const item = this.getItemById(id);
        const requiredTarget = Math.max(1, parseInt(item?.adUnlock || target, 10) || 0);
        if (!item?.adUnlock || this.unlocked.includes(item.id) || (item.req && !this.unlocked.includes(item.req))) return;

        const adCtrl = this.getAdController();
        if (adCtrl) {
            const rewardOptions = this.getShopAdUnlockRewardOptions(item);
            const isRewardReady = typeof adCtrl.isRewardVideoReadyFor === 'function'
                ? adCtrl.isRewardVideoReadyFor(rewardOptions)
                : adCtrl.ads.rewarded.isReady;

            if (!isRewardReady) adCtrl.prepareReward(rewardOptions);

            const success = await adCtrl.showRewardVideo(rewardOptions);
            if (success && this.isCurrentAccount()) {
                const ssvNonce = typeof adCtrl.consumeLastRewardSsvNonce === 'function'
                    ? adCtrl.consumeLastRewardSsvNonce()
                    : '';
                const unlockResult = typeof adCtrl.claimRewardWithSsvRetry === 'function'
                    ? await adCtrl.claimRewardWithSsvRetry(
                        () => this.claimServerShopAdUnlock(item.id, ssvNonce),
                        { nonce: ssvNonce, context: rewardOptions.context }
                    )
                    : await this.claimServerShopAdUnlock(item.id, ssvNonce);

                if (!this.isCurrentAccount()) return;
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
                    this.refreshState();
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
                this.refreshTreasuryView();
            }
        }
    }

    addBalance(amount, syncToServer = true) {
        if (!this.isCurrentAccount()) return false;
        this.refreshState();
        this.balance += amount;
        localStorage.setItem('yamb_dukati', this.balance);
        if (window.statsManager) {
            window.statsManager.stats.balance = this.balance;
            window.statsManager.saveStats();
        }
        this.refreshTreasuryView();
        
        if (syncToServer) this.syncShopStateToServer();

        return true;
    }

    setServerBalance(balance) {
        if (!this.isCurrentAccount()) return;
        const safeBalance = Math.max(0, parseInt(balance) || 0);
        this.balance = safeBalance;
        localStorage.setItem('yamb_dukati', safeBalance);
        if (window.statsManager) {
            window.statsManager.stats.balance = safeBalance;
            window.statsManager.saveStats();
        }
        this.refreshTreasuryView();
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
        if (!this.isCurrentAccount()) return;
        const adCtrl = this.getAdController();
        if (adCtrl) {
             const rewardOptions = { context: 'shop_ad_reward', amount: 500 };
             const isRewardReady = typeof adCtrl.isRewardVideoReadyFor === 'function'
                 ? adCtrl.isRewardVideoReadyFor(rewardOptions)
                 : adCtrl.ads.rewarded.isReady;
              if (!isRewardReady) adCtrl.prepareReward(rewardOptions);

              const success = await adCtrl.showRewardVideo(rewardOptions);
              if (success && this.isCurrentAccount()) {
                  const ssvNonce = typeof adCtrl.consumeLastRewardSsvNonce === 'function'
                      ? adCtrl.consumeLastRewardSsvNonce()
                      : '';
                  const rewardResult = typeof adCtrl.claimRewardWithSsvRetry === 'function'
                      ? await adCtrl.claimRewardWithSsvRetry(
                          () => this.claimServerAdReward(ssvNonce),
                          { nonce: ssvNonce, context: 'shop_ad_reward' }
                      )
                      : await this.claimServerAdReward(ssvNonce);
                  if (!this.isCurrentAccount()) return;
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

                 const rewardAmount = Number.isFinite(Number(rewardResult.reward))
                     ? Math.max(0, Number(rewardResult.reward)) : 500;
                 if (rewardResult.localFallback) {
                     this.addBalance(rewardAmount, false);
                 } else if (rewardResult.balance !== undefined) {
                     this.setServerBalance(rewardResult.balance);
                 }
                 if (rewardResult.alreadyClaimed) return;
                 
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
        this.bannerRequestVersion = 0;
        this.bannerTask = Promise.resolve();
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
        this.rewardRequestOptions = null;
        this.adLoadedAt = { rewarded: 0, interstitial: 0 };
        this.adMaxAgeMs = 55 * 60 * 1000;
        this.interstitialCooldownMs = 10 * 60 * 1000;
        this.interstitialLastShownKey = 'yamb_interstitial_last_shown_at';
        this.lastInterstitialShownAt = 0;
        this.interstitialShowInProgress = false;
        this.rewardClaimRetryTimeoutMs = 60000;
        this.economyRuntimeId = `${Date.now()}_${Math.random().toString(36).slice(2)}`;
        this.economyClaimsInFlight = new Set();
        this.economyRecoveries = new Map();
        this.economyRecoveryTimer = null;
        
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
            await this.hideEconomyBanner();
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
            if (resolve && this.lastRewardSsvInfo?.context !== 'offline_undo') {
                try { this.rememberEconomyClaim(this.lastRewardSsvInfo); }
                catch (error) { console.warn('Reward queue storage failed; signed server receipt remains recoverable.', error); }
            }
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
            const desiredOptions = this.rewardRequestOptions || this.pendingRewardOptions;
            if (desiredOptions && !this.isRewardSsvInfoMatch(this.rewardSsvInfo, desiredOptions)) {
                if (!this.rewardRequestOptions) this.pendingRewardOptions = null;
                this.ads.rewarded.isReady = false;
                this.rewardSsvInfo = null;
                this.updateUI(false);
                this.preloadAd('rewarded', desiredOptions);
                return;
            }

            if (!this.rewardRequestOptions || (this.pendingRewardOptions &&
                this.isRewardSsvInfoMatch(this.rewardSsvInfo, this.pendingRewardOptions))) this.pendingRewardOptions = null;
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
                ? (this.rewardRequestOptions || this.pendingRewardOptions || rewardOptions)
                : rewardOptions;
            if (type === 'rewarded' && !this.rewardRequestOptions) this.pendingRewardOptions = null;
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
            const retryOptions = this.rewardRequestOptions || this.pendingRewardOptions || this.currentRewardOptions || {};
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
            amount: this.normalizeRewardAmount(options.amount),
            claimData: options.claimData && typeof options.claimData === 'object' ? { ...options.claimData } : {}
        };
    }

    createRewardSsvInfo(options = {}) {
        const { uid, context, amount, claimData } = this.normalizeRewardOptions(options);
        const nonce = this.createRewardNonce();
        const customData = JSON.stringify({
            v: 1,
            nonce,
            context,
            amount,
            uid, claimData
        });

        return {
            uid,
            nonce,
            context,
            amount,
            claimData,
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
            info.amount === expected.amount && JSON.stringify(info.claimData || {}) === JSON.stringify(expected.claimData)
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

    economyIdentity() {
        return { uid: localStorage.getItem('yamb_uid') || '', version: Number(window.yambAuthSessionVersion) || 0 };
    }

    isEconomyIdentityCurrent(identity) {
        return !!identity.uid && identity.uid === localStorage.getItem('yamb_uid') &&
            identity.version === (Number(window.yambAuthSessionVersion) || 0) && !window.yambAccountDeletionInProgress;
    }

    readEconomyClaims(uid = this.economyIdentity().uid) {
        if (!uid) return [];
        try {
            const entries = JSON.parse(localStorage.getItem(`yamb_pending_economy_${uid}`) || '[]');
            return Array.isArray(entries) ? entries.filter(entry => entry && typeof entry.key === 'string' && entry.uid === uid) : [];
        } catch (_) { return []; }
    }

    writeEconomyClaims(uid, entries) {
        if (uid) localStorage.setItem(`yamb_pending_economy_${uid}`, JSON.stringify(entries));
    }

    rememberEconomyClaim(info) {
        const uid = info.uid || this.economyIdentity().uid;
        if (!uid || !info.context) return null;
        const data = { ...(info.claimData || {}) };
        const key = info.key || (info.nonce ? `ad:${info.nonce}` : `${info.context}:${data.requestId || data.dayKey || `${data.year}_Q${data.quarter}`}`);
        const entries = this.readEconomyClaims(uid);
        const previous = entries.find(entry => entry.key === key);
        const entry = { ...previous, ...info, uid, key, claimData: data,
            createdAt: previous?.createdAt || Date.now(), runtimeId: previous?.runtimeId || this.economyRuntimeId };
        this.writeEconomyClaims(uid, [...entries.filter(item => item.key !== key), entry]);
        return entry;
    }

    economyRequest(entry) {
        const data = entry.claimData || {};
        const ad = { ssvNonce: entry.nonce, clientRewarded: true };
        if (entry.context === 'shop_ad_reward') return ['claim_shop_ad_reward', ad];
        if (entry.context === 'undo_tokens') return ['claim_undo_token_reward', { ...ad, type: 'rewarded' }];
        if (entry.context.startsWith('shop_discount:')) return ['claim_shop_discount', { ...ad, itemId: entry.context.split(':')[1] }];
        if (entry.context.startsWith('shop_ad_unlock:')) return ['claim_shop_ad_unlock', { ...ad, itemId: entry.context.split(':')[1] }];
        if (entry.context === 'game_double' && data.matchId) return ['claim_game_reward', { ...ad, ...data, doubled: true, verificationWaitMs: 4000 }];
        if (['daily_base', 'daily_double'].includes(entry.context) && data.dayKey) return ['claim_daily_reward', { ...ad, ...data, doubled: entry.context === 'daily_double' }];
        if (entry.context === 'purchase') return ['purchase_shop_item', data];
        if (entry.context === 'quarter_reward') return ['check_quarter_reward', data];
        return null;
    }

    async sendEconomyRequest(event, data, identity = this.economyIdentity(), timeoutMs = 45000) {
        if (!this.isEconomyIdentityCurrent(identity)) return { ok: false, reason: 'account_changed' };
        const app = window.app;
        const socket = app?.socket;
        if (!socket?.connected) return { ok: false, reason: 'err_server_conn' };
        if (typeof app.authenticateSocketIdentity === 'function') {
            const auth = await app.authenticateSocketIdentity();
            if (!this.isEconomyIdentityCurrent(identity)) return { ok: false, reason: 'account_changed' };
            if (!auth?.ok) return { ok: false, reason: 'auth_required' };
        }
        return new Promise(resolve => {
            let settled = false;
            const finish = result => {
                if (settled) return;
                settled = true;
                clearTimeout(timer);
                resolve(this.isEconomyIdentityCurrent(identity) ? (result || { ok: false, reason: 'empty_reward_response' })
                    : { ok: false, reason: 'account_changed' });
            };
            const timer = setTimeout(() => finish({ ok: false, reason: 'err_server_conn' }), timeoutMs);
            socket.emit(event, data, finish);
        });
    }

    finishEconomyClaim(entry, result) {
        const entries = this.readEconomyClaims(entry.uid);
        const complete = (result?.ok && !result.localFallback) || result?.reason === 'daily_already_claimed';
        if (complete) {
            this.writeEconomyClaims(entry.uid, entries.filter(item => item.key !== entry.key));
        } else {
            const updated = entries.map(item => item.key === entry.key ? { ...item, active: false,
                blocked: !!result?.permanent, reason: result?.reason,
                retryAt: Date.now() + Math.max(5000, Number(result?.retryAfterMs) || 30000) } : item);
            this.writeEconomyClaims(entry.uid, updated);
        }
    }

    scheduleEconomyRecovery({ discover = false } = {}) {
        clearTimeout(this.economyRecoveryTimer);
        const identity = this.economyIdentity();
        const entries = this.readEconomyClaims(identity.uid).filter(entry => !entry.blocked && !(entry.active && entry.runtimeId === this.economyRuntimeId));
        if (!identity.uid || (!entries.length && !discover) || !window.app?.socket?.connected) return;
        const next = entries.length ? Math.min(...entries.map(entry => entry.retryAt || Date.now() + 30000)) : Date.now() + 1000;
        this.economyRecoveryTimer = setTimeout(() => {
            if (this.isEconomyIdentityCurrent(identity)) this.recoverPendingEconomyClaims().catch(error => console.warn('Reward recovery failed.', error));
        }, Math.max(1000, Math.min(1800000, next - Date.now())));
        this.economyRecoveryTimer?.unref?.();
    }

    async recoverPendingEconomyClaims() {
        const identity = this.economyIdentity();
        if (!this.isEconomyIdentityCurrent(identity) || !window.app?.socket?.connected) return;
        if (this.economyRecoveries.has(identity.uid)) return this.economyRecoveries.get(identity.uid);
        const recovery = (async () => {
            let after = '';
            do {
                const page = await this.sendEconomyRequest('get_pending_ad_rewards', { after }, identity, 18000);
                if (!page.ok || !this.isEconomyIdentityCurrent(identity)) break;
                for (const info of page.entries || []) {
                    if (!this.readEconomyClaims(identity.uid).some(entry => entry.nonce === info.nonce)) this.rememberEconomyClaim({ ...info, uid: identity.uid });
                }
                after = page.next || '';
            } while (after);
            const quarters = await this.sendEconomyRequest('get_pending_quarter_rewards', {}, identity, 18000);
            if (!this.isEconomyIdentityCurrent(identity)) return;
            if (quarters.ok) for (const period of quarters.entries || []) {
                const key = `quarter_reward:${period.year}_Q${period.quarter}`;
                if (!this.readEconomyClaims(identity.uid).some(entry => entry.key === key)) this.rememberEconomyClaim({ uid: identity.uid, context: 'quarter_reward', key, claimData: period });
            }
            for (const entry of this.readEconomyClaims(identity.uid)) {
                if (!this.isEconomyIdentityCurrent(identity)) return;
                if (entry.blocked || entry.retryAt > Date.now() || this.economyClaimsInFlight.has(entry.key) ||
                    (entry.active && entry.runtimeId === this.economyRuntimeId) || (entry.nonce && this.activeRewardSsvInfo?.nonce === entry.nonce)) continue;
                const request = this.economyRequest(entry);
                if (!request) {
                    this.finishEconomyClaim(entry, { ok: false, reason: 'missing_reward_target', permanent: true });
                    continue;
                }
                this.economyClaimsInFlight.add(entry.key);
                try {
                    if (entry.context === 'game_double' && typeof window.app.ensurePendingRewardMatchSubmitted === 'function') {
                        const submitted = await window.app.ensurePendingRewardMatchSubmitted(entry.claimData.matchId);
                        if (!submitted.ok) continue;
                    }
                    const result = await this.sendEconomyRequest(request[0], request[1], identity);
                    if (!this.isEconomyIdentityCurrent(identity)) return;
                    this.finishEconomyClaim(entry, result);
                    if (result.ok && entry.context === 'game_double') window.app.forgetPendingGameReward?.(entry.claimData.matchId);
                    if (result.cloudStats) window.app.applyCloudProfileSync?.(result.cloudStats);
                } finally { this.economyClaimsInFlight.delete(entry.key); }
            }
            if (this.isEconomyIdentityCurrent(identity)) {
                const profile = await this.sendEconomyRequest('request_profile_sync', {}, identity, 18000);
                if (this.isEconomyIdentityCurrent(identity) && profile.cloudStats) window.app.applyCloudProfileSync?.(profile.cloudStats);
            }
        })();
        this.economyRecoveries.set(identity.uid, recovery);
        try { await recovery; } finally { this.economyRecoveries.delete(identity.uid); this.scheduleEconomyRecovery(); }
    }

    isRewardClaimRetryable(result = {}, nonce = '') {
        if (!result || result.ok || result.permanent) return false;
        const reason = result.reason;
        if (reason === 'ad_verification_required' && !nonce) return false;
        return reason === 'ad_verification_pending' ||
            reason === 'ad_verification_required' ||
            reason === 'game_reward_metadata_pending' ||
            reason === 'ad_reward_cooldown' ||
            reason === 'undo_tokens_max' ||
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
        const uid = localStorage.getItem('yamb_uid') || '';
        const sessionVersion = Number(window.yambAuthSessionVersion) || 0;
        const accountChanged = () => localStorage.getItem('yamb_uid') !== uid ||
            (Number(window.yambAuthSessionVersion) || 0) !== sessionVersion || window.yambAccountDeletionInProgress;

        const nonce = typeof options.nonce === 'string' ? options.nonce : '';
        const key = nonce ? `ad:${nonce}` : '';
        if (key) this.economyClaimsInFlight.add(key);
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

        try { do {
            if (accountChanged()) return { ok: false, reason: 'account_changed', permanent: true };
            if (shouldCancel()) return { ok: false, reason: 'base_reward_selected', permanent: false };
            result = await claimOnce();
            const entry = key && this.readEconomyClaims(uid).find(item => item.key === key);
            if (entry && !accountChanged()) this.finishEconomyClaim(entry, result);
            if (accountChanged()) return { ok: false, reason: 'account_changed', permanent: true };
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
        } finally { if (key) this.economyClaimsInFlight.delete(key); this.scheduleEconomyRecovery(); }
    }

    deferRewardLoad(rewardOptions = {}) {
        if (!this.rewardRequestOptions) return false;
        // Preloads cannot replace the SDK ad selected by an in-flight reward request.
        if (this.isRewardSsvInfoMatch(this.rewardRequestOptions, rewardOptions)) return !!this.rewardResolve;
        this.pendingRewardOptions = this.normalizeRewardOptions(rewardOptions);
        return true;
    }

    async preloadAd(type, rewardOptions = {}) {
        if (!this.canRequestAds || !this.adMobPlugin || !navigator.onLine) return;
        if (type === 'rewarded' && !rewardOptions.context) return;
        if (type === 'rewarded' && this.deferRewardLoad(rewardOptions)) return;
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
            if (this.deferRewardLoad(rewardOptions)) return;

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

    queueEconomyBannerUpdate(operation) {
        const task = this.bannerTask.then(operation);
        this.bannerTask = task.catch(err => console.warn('Banner update failed.', err));
        return task;
    }

    showEconomyBanner(slotEl = document.getElementById('economy-banner-slot')) {
        const version = ++this.bannerRequestVersion;
        return this.queueEconomyBannerUpdate(() => this.updateEconomyBanner(slotEl, version));
    }

    async updateEconomyBanner(slotEl, version) {
        if (version !== this.bannerRequestVersion) return;
        if (!this.canRequestAds || !this.adMobPlugin || !slotEl || !navigator.onLine) return;

        const isSameSlot = this.bannerSlot === slotEl;
        this.bannerSlot = slotEl;
        const margin = 72;
        if (this.bannerVisible && this.lastBannerMargin === margin && isSameSlot) return;

        this.bannerLoaded = false;
        this.setBannerSlotState('loading', _safeT('economy_ad_loading') || 'Učitavanje oglasa...');

        await this.removeCurrentBanner();
        if (!this.canRequestAds || version !== this.bannerRequestVersion) return;
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
            if (!this.canRequestAds || version !== this.bannerRequestVersion) {
                await this.removeCurrentBanner();
                return;
            }
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

    hideEconomyBanner() {
        const version = ++this.bannerRequestVersion;
        return this.queueEconomyBannerUpdate(async () => {
            if (!this.adMobPlugin || version !== this.bannerRequestVersion) return;
            await this.removeCurrentBanner();
            if (version === this.bannerRequestVersion) {
                this.setBannerSlotState('idle', _safeT('economy_ad_label') || 'Oglas');
            }
        });
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

        const requestedReward = this.normalizeRewardOptions(rewardOptions);
        this.rewardRequestOptions = requestedReward;
        this.rewardShowInProgress = true;
        return (async () => {
            try {
                const identity = this.economyIdentity();
                const existing = this.readEconomyClaims(identity.uid).find(entry => entry.nonce && !entry.blocked && entry.context === requestedReward.context &&
                    JSON.stringify(entry.claimData || {}) === JSON.stringify(requestedReward.claimData));
                if (existing) { this.lastRewardSsvInfo = existing; return true; }
                if (!this.isRewardVideoReadyFor(requestedReward) && typeof window.showNotification === 'function') {
                    window.showNotification(_safeT('info_title') || "INFO", _safeT('msg_ad_loading') || "Učitavanje reklame...");
                }

                const readyForReward = await this.waitForRewardVideoReadyFor(requestedReward);
                if (!readyForReward) {
                    if (typeof window.showNotification === 'function') window.showNotification(_safeT('info_title') || "INFO", _safeT('ad_not_ready') || "Reklama se učitava. Pokušajte za par sekundi.");
                    return false;
                }

                const preparedInfo = this.rewardSsvInfo;
                if (!this.isRewardSsvInfoMatch(preparedInfo, requestedReward)) return false;
                if (requestedReward.context !== 'offline_undo') {
                    const eligible = await this.sendEconomyRequest('check_reward_eligibility', {
                        context: requestedReward.context, claimData: requestedReward.claimData
                    }, identity, 18000);
                    if (!eligible.ok) {
                        const message = eligible.reason === 'undo_tokens_max' ? _safeT('undo_tokens_max')
                            : eligible.reason === 'wallet_capacity' ? _safeT('economy_wallet_full')
                            : eligible.reason === 'ad_reward_cooldown' ? (_safeT('economy_reward_cooldown') || '').replace('{0}', Math.ceil(eligible.retryAfterMs / 1000))
                            : _safeT('err_server_conn');
                        window.showNotification?.(_safeT('info_title') || 'INFO', message || 'Nagrada trenutno nije dostupna.');
                        return false;
                    }
                }
                if (!this.isEconomyIdentityCurrent(identity) || this.rewardSsvInfo !== preparedInfo ||
                    !this.isRewardVideoReadyFor(requestedReward)) return false;

                return await new Promise(resolve => {
                    this.rewardResolve = resolve;
                    this.activeRewardSsvInfo = preparedInfo;
                    this.activeRewardEarned = false;
                    this.rewardShowTimer = setTimeout(() => {
                        this.failRewardVideo(new Error('Rewarded ad show timeout'));
                    }, 180000);

                    Promise.resolve().then(() => {
                        if (!this.isEconomyIdentityCurrent(identity) || this.rewardSsvInfo !== preparedInfo ||
                            !this.isRewardVideoReadyFor(requestedReward)) {
                            this.settleRewardVideo(false);
                            return;
                        }
                        return this.adMobPlugin.showRewardVideoAd();
                    })
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
                this.rewardRequestOptions = null;
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
