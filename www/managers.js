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
const filterYambThemeIds = (items = []) => Array.isArray(items)
    ? items.filter(item => YAMB_THEME_IDS.includes(item))
    : [];

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
    constructor() {}

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
            
            this.setup(safeTitle, text, false);
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
        const contextClass = String(options.contextClass || '').replace(/[^a-zA-Z0-9_-]/g, '');
        if (contextClass) els.overlay.classList.add(`modal-context-${contextClass}`);

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

    open() { const els = this.elements; if(els.overlay) els.overlay.style.display = 'flex'; }
    close() { const els = this.elements; if(els.overlay) els.overlay.style.display = 'none'; }
}

// --- 4. EFFECT MANAGER (VISUALS) ---
class EffectManager {
    constructor() {
        this.activeEffects = [];
        this.confettiAnimationId = null;
        this.goldRainAnimationId = null;
        this.goldRainResizeHandler = null;
        this.goldRainSprites = null;
        this.effectTimeouts = [];
        this.iceAgeRunId = 0;
    }
    
    applyPermanent(type) {
        this.stop(); 
        if (!type || type === 'none') return;
    }
    
    trigger(type) {
        if (type === 'confetti') this.spawnConfetti();
        if (type === 'gold_rain') this.spawnGoldRain();
        if (type === 'fireflies') this.spawnFireflies(52, 'fireflies');
        if (type === 'bubbles') this.spawnBubbles(35, 'bubbles');
        
        if (type === 'ice_age') {
            let targetTable = null;
            const tables = document.querySelectorAll('.player-table');
            tables.forEach(tbl => { if (tbl.style.opacity === '1' || tbl.style.borderColor.includes('gold') || tbl.style.borderColor.includes('224')) { targetTable = tbl; } });
            if (!targetTable && tables.length > 0) targetTable = tables[0];

            if (targetTable) {
                this.iceAgeRunId += 1;
                const iceAgeRunId = this.iceAgeRunId;
                document.querySelectorAll('.ice-overlay-container, .ice-age-atmosphere').forEach(e => e.remove());
                document.querySelectorAll('.active-ice-table, .anim-ice-age-table').forEach(tbl => tbl.classList.remove('active-ice-table', 'anim-ice-age-table'));

                const rect = targetTable.getBoundingClientRect();
                const compactIce = window.matchMedia && (
                    window.matchMedia('(max-width: 760px)').matches ||
                    window.matchMedia('(hover: none) and (pointer: coarse)').matches ||
                    window.matchMedia('(prefers-reduced-motion: reduce)').matches
                );

                document.body.classList.add('fx-ice-age');
                targetTable.classList.add('active-ice-table', 'anim-ice-age-table');

                if (window.app && window.app.soundMgr && typeof window.app.soundMgr.iceAge === 'function') {
                    window.app.soundMgr.iceAge();
                }
                if (window.app && typeof window.app.vibrate === 'function') {
                    window.app.vibrate([24, 36, 72, 48, 120]);
                }

                const atmosphere = document.createElement('div');
                atmosphere.className = compactIce ? 'ice-age-atmosphere ice-age-atmosphere--compact' : 'ice-age-atmosphere';
                atmosphere.style.setProperty('--ice-x', (rect.left + rect.width / 2) + 'px');
                atmosphere.style.setProperty('--ice-y', (rect.top + rect.height / 2) + 'px');
                atmosphere.innerHTML = `
                    <div class="ice-age-aura"></div>
                    <div class="ice-age-wave"></div>
                    <div class="ice-age-fog ice-age-fog--one"></div>
                    <div class="ice-age-fog ice-age-fog--two"></div>
                `;

                const particleFragment = document.createDocumentFragment();
                const particleCount = compactIce ? 24 : 44;
                for (let i = 0; i < particleCount; i++) {
                    const particle = document.createElement('span');
                    particle.className = (i % 6 === 0) ? 'ice-particle ice-particle--shard' : 'ice-particle';
                    particle.style.setProperty('--x', (Math.random() * 100).toFixed(2) + 'vw');
                    particle.style.setProperty('--y-start', (-8 - Math.random() * 18).toFixed(1) + 'vh');
                    particle.style.setProperty('--fall', (72 + Math.random() * 44).toFixed(1) + 'vh');
                    particle.style.setProperty('--drift', (-48 + Math.random() * 96).toFixed(1) + 'px');
                    particle.style.setProperty('--size', (2.5 + Math.random() * (compactIce ? 3.5 : 5.5)).toFixed(1) + 'px');
                    particle.style.setProperty('--delay', (Math.random() * 1.15).toFixed(2) + 's');
                    particle.style.setProperty('--dur', (3.8 + Math.random() * 2.7).toFixed(2) + 's');
                    particle.style.setProperty('--spin', (120 + Math.random() * 520).toFixed(1) + 'deg');
                    particleFragment.appendChild(particle);
                }
                atmosphere.appendChild(particleFragment);
                document.body.appendChild(atmosphere);

                const container = document.createElement('div');
                container.className = 'ice-overlay-container';
                container.innerHTML = `
                    <div class="ice-freeze-wave"></div>
                    <div class="ice-glass"></div>
                    <div class="ice-crack ice-crack--one"></div>
                    <div class="ice-crack ice-crack--two"></div>
                    <div class="ice-crack ice-crack--three"></div>
                    <div class="ice-frost-border"></div>
                    <div class="ice-glint ice-glint--one"></div>
                    <div class="ice-glint ice-glint--two"></div>
                    <div class="ice-flake-center"><span>❄</span></div>
                    <div class="ice-cold-breath"></div>
                `;
                targetTable.appendChild(container);

                this.scheduleEffectTimeout(() => {
                    if (iceAgeRunId !== this.iceAgeRunId) return;
                    atmosphere.classList.add('ice-cooling-down');
                    container.classList.add('ice-softening');
                }, 5400);

                this.scheduleEffectTimeout(() => {
                    if (iceAgeRunId !== this.iceAgeRunId) return;
                    container.classList.add('ice-melting');
                    atmosphere.classList.add('ice-melting');
                    targetTable.classList.remove('active-ice-table', 'anim-ice-age-table');
                    this.scheduleEffectTimeout(() => {
                        if (container.parentNode) container.remove();
                        if (atmosphere.parentNode) atmosphere.remove();
                        document.body.classList.remove('fx-ice-age');
                    }, 1500);
                }, 6800);
            }
        }

        if (type === 'black_hole') {
            let targetTable = null;
            const tables = document.querySelectorAll('.player-table');
            tables.forEach(tbl => { if (tbl.style.opacity === '1' || tbl.style.borderColor.includes('gold') || tbl.style.borderColor.includes('224')) { targetTable = tbl; } });
            if (!targetTable && tables.length > 0) targetTable = tables[0];

            if (targetTable) {
                const rect = targetTable.getBoundingClientRect();
                const duration = 6400;
                const compactBlackHole = window.matchMedia && (
                    window.matchMedia('(max-width: 760px)').matches ||
                    window.matchMedia('(hover: none) and (pointer: coarse)').matches ||
                    window.matchMedia('(prefers-reduced-motion: reduce)').matches
                );
                const bhContainer = document.createElement('div');
                bhContainer.className = compactBlackHole ? 'black-hole-container black-hole-container--compact' : 'black-hole-container';
                bhContainer.style.setProperty('--bh-x', (rect.left + rect.width / 2) + 'px');
                bhContainer.style.setProperty('--bh-y', (rect.top + rect.height / 2) + 'px');
                bhContainer.innerHTML = `
                    <div class="bh-vignette"></div>
                    <div class="bh-starfield bh-starfield--far"></div>
                    <div class="bh-starfield bh-starfield--near"></div>
                    <div class="bh-shockwave"></div>
                    <div class="bh-gravity-well">
                        <div class="bh-lensing bh-lensing--outer"></div>
                        <div class="bh-lensing bh-lensing--inner"></div>
                        <div class="bh-accretion bh-accretion--back"></div>
                        <div class="bh-accretion bh-accretion--front"></div>
                        <div class="bh-photon-ring"></div>
                        <div class="bh-core"></div>
                        <div class="bh-core-glow"></div>
                    </div>
                `;

                const fragment = document.createDocumentFragment();
                const colors = ['#67f7ff', '#9b7cff', '#ffd66f', '#ffffff'];
                const debrisCount = compactBlackHole ? 28 : 46;
                for (let i = 0; i < debrisCount; i++) {
                    const particle = document.createElement('span');
                    particle.className = (i % 5 === 0) ? 'bh-debris bh-debris--pip' : 'bh-debris';
                    const orbit = 92 + (i % 9) * 23 + Math.random() * 38;
                    particle.style.setProperty('--a', (i * 137.5 + Math.random() * 28).toFixed(1) + 'deg');
                    particle.style.setProperty('--orbit', orbit.toFixed(1) + 'px');
                    particle.style.setProperty('--orbit-mid', (orbit * (0.48 + Math.random() * 0.14)).toFixed(1) + 'px');
                    particle.style.setProperty('--orbit-end', (12 + Math.random() * 20).toFixed(1) + 'px');
                    const spin = 220 + Math.random() * 280;
                    particle.style.setProperty('--spin', spin.toFixed(1) + 'deg');
                    particle.style.setProperty('--spin-rev', (-spin).toFixed(1) + 'deg');
                    particle.style.setProperty('--spin-end', (spin * 1.35).toFixed(1) + 'deg');
                    particle.style.setProperty('--size', (2.4 + Math.random() * (compactBlackHole ? 2.2 : 3.6)).toFixed(1) + 'px');
                    particle.style.setProperty('--delay', (Math.random() * 0.72).toFixed(2) + 's');
                    particle.style.setProperty('--dur', (4.6 + Math.random() * 1.1).toFixed(2) + 's');
                    particle.style.setProperty('--debris-color', colors[i % colors.length]);
                    fragment.appendChild(particle);
                }

                bhContainer.appendChild(fragment);
                document.body.appendChild(bhContainer);
                targetTable.classList.add('anim-black-hole-table');
                this.scheduleEffectTimeout(() => {
                    targetTable.classList.remove('anim-black-hole-table');
                    if (bhContainer.parentNode) bhContainer.remove();
                }, duration);
            }
        }

        if (type === 'supernova') {
            let targetTable = null;
            const tables = document.querySelectorAll('.player-table');
            tables.forEach(tbl => { 
                if (tbl.style.opacity === '1' || tbl.style.borderColor.includes('gold') || tbl.style.borderColor.includes('224')) { 
                    targetTable = tbl; 
                } 
            });
            if (!targetTable && tables.length > 0) targetTable = tables[0];

            if (targetTable) {
                const rect = targetTable.getBoundingClientRect();
                const compactSupernova = window.matchMedia && (
                    window.matchMedia('(max-width: 760px)').matches ||
                    window.matchMedia('(hover: none) and (pointer: coarse)').matches ||
                    window.matchMedia('(prefers-reduced-motion: reduce)').matches
                );
                const snContainer = document.createElement('div');
                snContainer.className = 'supernova-container';
                if (compactSupernova) snContainer.classList.add('supernova-container--compact');
                snContainer.style.position = 'fixed';
                snContainer.style.inset = '0';
                
                snContainer.innerHTML = `
                    <canvas class="sn-canvas"></canvas>
                `;
                document.body.appendChild(snContainer);

                const canvas = snContainer.querySelector('.sn-canvas');
                const ctx = canvas.getContext('2d');
                const center = {
                    x: rect.left + rect.width / 2,
                    y: rect.top + rect.height / 2
                };
                const duration = 7600;
                let rafId = 0;
                let lastSupernovaDraw = 0;

                const resizeCanvas = () => {
                    const dpr = Math.min(window.devicePixelRatio || 1, compactSupernova ? 1.15 : 1.5);
                    canvas.width = Math.floor(window.innerWidth * dpr);
                    canvas.height = Math.floor(window.innerHeight * dpr);
                    canvas.style.width = '100vw';
                    canvas.style.height = '100vh';
                    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
                };
                resizeCanvas();

                const clamp01 = v => Math.max(0, Math.min(1, v));
                const easeOutCubic = v => 1 - Math.pow(1 - clamp01(v), 3);
                const easeInOut = v => {
                    v = clamp01(v);
                    return v < 0.5 ? 4 * v * v * v : 1 - Math.pow(-2 * v + 2, 3) / 2;
                };

                const supernovaColors = [
                    'rgba(255,255,255,',
                    'rgba(255,222,140,',
                    'rgba(103,247,255,',
                    'rgba(173,132,255,'
                ];
                const particles = Array.from({ length: compactSupernova ? 36 : 96 }, (_, i) => {
                    const a = (i * 2.3999632297) + (i % 7) * 0.09;
                    const lane = i % 5;
                    return {
                        a,
                        r: 74 + lane * 34 + (i % 13) * 10,
                        size: 0.75 + (i % 6) * 0.34,
                        speed: 0.72 + (i % 11) * 0.032,
                        drift: ((i % 9) - 4) * 0.115,
                        delay: (i % 15) * 0.012,
                        color: supernovaColors[i % supernovaColors.length],
                        streak: i % 6 === 0
                    };
                });
                const glassCuts = Array.from({ length: compactSupernova ? 5 : 13 }, (_, i) => ({
                    a: (Math.PI * 2 * i) / (compactSupernova ? 5 : 13) + ((i % 4) - 1.5) * 0.055,
                    start: 110 + (i % 4) * 22,
                    len: 115 + (i % 6) * 22,
                    width: 0.7 + (i % 3) * 0.28
                }));

                const drawRing = (x, y, radius, alpha, width, blur, color = 'rgba(232,244,255,0.72)', shadow = 'rgba(214,235,255,0.85)') => {
                    if (alpha <= 0) return;
                    ctx.save();
                    ctx.globalAlpha = alpha;
                    ctx.shadowColor = shadow;
                    ctx.shadowBlur = compactSupernova ? Math.min(blur, 3) : blur;
                    ctx.strokeStyle = color;
                    ctx.lineWidth = width;
                    ctx.beginPath();
                    ctx.arc(x, y, radius, 0, Math.PI * 2);
                    ctx.stroke();
                    ctx.restore();
                };

                const renderFrame = start => now => {
                    if (compactSupernova && lastSupernovaDraw && now - lastSupernovaDraw < 32) {
                        if (snContainer.isConnected) rafId = requestAnimationFrame(renderFrame(start));
                        return;
                    }
                    lastSupernovaDraw = now;

                    const elapsed = now - start;
                    const p = clamp01(elapsed / duration);
                    const w = window.innerWidth;
                    const h = window.innerHeight;
                    const maxR = Math.hypot(Math.max(center.x, w - center.x), Math.max(center.y, h - center.y));
                    const birth = easeInOut(p / 0.18);
                    const blast = easeOutCubic((p - 0.14) / 0.46);
                    const fade = 1 - easeInOut((p - 0.82) / 0.18);
                    const alive = clamp01(fade);
                    const compression = Math.sin(clamp01(p / 0.24) * Math.PI);
                    const ignition = easeOutCubic((p - 0.18) / 0.16);
                    const nebula = Math.sin(clamp01((p - 0.28) / 0.54) * Math.PI) * alive;
                    const goldPulse = Math.sin(p * Math.PI * 18) * 0.5 + 0.5;

                    ctx.clearRect(0, 0, w, h);
                    ctx.globalCompositeOperation = 'source-over';

                    const bg = ctx.createRadialGradient(center.x, center.y, 0, center.x, center.y, maxR * 0.9);
                    bg.addColorStop(0, `rgba(255,246,205,${(0.20 + compression * 0.12) * alive})`);
                    bg.addColorStop(0.18, `rgba(103,247,255,${0.13 * alive})`);
                    bg.addColorStop(0.42, `rgba(83,45,142,${0.13 * alive})`);
                    bg.addColorStop(0.72, `rgba(5,14,29,${0.24 * alive})`);
                    bg.addColorStop(1, `rgba(0,0,0,${0.38 * alive})`);
                    ctx.fillStyle = bg;
                    ctx.fillRect(0, 0, w, h);

                    ctx.globalCompositeOperation = 'screen';
                    const coreR = 10 + birth * 22 + blast * (compactSupernova ? 58 : 76);
                    const core = ctx.createRadialGradient(center.x, center.y, 0, center.x, center.y, coreR * 3.45);
                    core.addColorStop(0, `rgba(255,255,255,${0.96 * alive})`);
                    core.addColorStop(0.10, `rgba(255,232,154,${0.86 * alive})`);
                    core.addColorStop(0.26, `rgba(103,247,255,${0.52 * alive})`);
                    core.addColorStop(0.50, `rgba(173,132,255,${0.25 * alive})`);
                    core.addColorStop(1, 'rgba(103,247,255,0)');
                    ctx.fillStyle = core;
                    ctx.beginPath();
                    ctx.arc(center.x, center.y, coreR * 3.2, 0, Math.PI * 2);
                    ctx.fill();

                    const flareAlpha = Math.sin(clamp01((p - 0.17) / 0.32) * Math.PI) * alive;
                    if (flareAlpha > 0) {
                        ctx.save();
                        ctx.globalCompositeOperation = 'screen';
                        const flareW = Math.min(maxR * 0.72, compactSupernova ? 320 : 520);
                        const horizontal = ctx.createRadialGradient(center.x, center.y, 0, center.x, center.y, flareW);
                        horizontal.addColorStop(0, `rgba(255,248,220,${0.25 * flareAlpha})`);
                        horizontal.addColorStop(0.18, `rgba(255,214,111,${0.10 * flareAlpha})`);
                        horizontal.addColorStop(0.42, `rgba(103,247,255,${0.07 * flareAlpha})`);
                        horizontal.addColorStop(1, 'rgba(255,255,255,0)');
                        ctx.fillStyle = horizontal;
                        ctx.save();
                        ctx.translate(center.x, center.y);
                        ctx.scale(1, compactSupernova ? 0.055 : 0.07);
                        ctx.beginPath();
                        ctx.arc(0, 0, flareW, 0, Math.PI * 2);
                        ctx.fill();
                        ctx.restore();

                        const vertical = ctx.createRadialGradient(center.x, center.y, 0, center.x, center.y, flareW * 0.46);
                        vertical.addColorStop(0, `rgba(255,255,255,${0.16 * flareAlpha})`);
                        vertical.addColorStop(0.42, `rgba(103,247,255,${0.05 * flareAlpha})`);
                        vertical.addColorStop(1, 'rgba(255,255,255,0)');
                        ctx.fillStyle = vertical;
                        ctx.save();
                        ctx.translate(center.x, center.y);
                        ctx.scale(0.075, 1);
                        ctx.beginPath();
                        ctx.arc(0, 0, flareW * 0.46, 0, Math.PI * 2);
                        ctx.fill();
                        ctx.restore();
                        ctx.restore();
                    }

                    if (p < 0.28) {
                        for (let i = 0; i < 4; i++) {
                            const rr = 18 + i * 16 + compression * (18 + i * 7);
                            drawRing(
                                center.x,
                                center.y,
                                rr,
                                (0.16 - i * 0.022) * compression * alive,
                                0.9,
                                8,
                                i % 2 ? 'rgba(103,247,255,0.84)' : 'rgba(255,222,140,0.86)',
                                i % 2 ? 'rgba(103,247,255,0.78)' : 'rgba(255,222,140,0.72)'
                            );
                        }
                    }

                    const shockR = 42 + blast * Math.min(maxR * 0.72, 620);
                    const sphereAlpha = Math.sin(clamp01((p - 0.16) / 0.64) * Math.PI) * alive;
                    if (sphereAlpha > 0) {
                        ctx.save();
                        ctx.globalCompositeOperation = 'screen';
                        const shell = ctx.createRadialGradient(center.x, center.y, shockR * 0.18, center.x, center.y, shockR * 0.96);
                        shell.addColorStop(0, `rgba(255,255,255,${0.045 * sphereAlpha})`);
                        shell.addColorStop(0.42, `rgba(103,247,255,${0.07 * sphereAlpha})`);
                        shell.addColorStop(0.64, `rgba(255,222,140,${0.15 * sphereAlpha})`);
                        shell.addColorStop(0.75, `rgba(232,246,255,${0.20 * sphereAlpha})`);
                        shell.addColorStop(0.84, `rgba(173,132,255,${0.07 * sphereAlpha})`);
                        shell.addColorStop(1, 'rgba(103,247,255,0)');
                        ctx.fillStyle = shell;
                        ctx.beginPath();
                        ctx.arc(center.x, center.y, shockR * 0.98, 0, Math.PI * 2);
                        ctx.fill();
                        ctx.restore();
                    }
                    drawRing(center.x, center.y, shockR, 0.56 * (1 - blast * 0.55) * alive, 1.4, 14, 'rgba(255,246,212,0.82)', 'rgba(255,222,140,0.76)');
                    drawRing(center.x, center.y, shockR * 0.72, 0.25 * alive, 0.85, 7, 'rgba(103,247,255,0.76)', 'rgba(103,247,255,0.62)');
                    drawRing(center.x, center.y, shockR * 1.06, 0.12 * alive, 1, 16, 'rgba(173,132,255,0.66)', 'rgba(173,132,255,0.48)');

                    if (nebula > 0 && !compactSupernova) {
                        ctx.save();
                        ctx.globalCompositeOperation = 'screen';
                        const nebulaColors = [
                            [0.92, -0.36, 'rgba(103,247,255,'],
                            [-0.62, 0.38, 'rgba(173,132,255,'],
                            [0.18, 0.72, 'rgba(255,222,140,'],
                            [-0.18, -0.68, 'rgba(103,247,255,']
                        ];
                        nebulaColors.forEach((blob, i) => {
                            const bx = center.x + Math.cos(p * 2.4 + i) * shockR * 0.16 + blob[0] * shockR * 0.34;
                            const by = center.y + Math.sin(p * 2.1 + i) * shockR * 0.10 + blob[1] * shockR * 0.24;
                            const r = shockR * (0.18 + i * 0.018);
                            const grad = ctx.createRadialGradient(bx, by, 0, bx, by, r);
                            grad.addColorStop(0, `${blob[2]}${0.14 * nebula})`);
                            grad.addColorStop(0.58, `${blob[2]}${0.045 * nebula})`);
                            grad.addColorStop(1, 'rgba(0,0,0,0)');
                            ctx.fillStyle = grad;
                            ctx.beginPath();
                            ctx.arc(bx, by, r, 0, Math.PI * 2);
                            ctx.fill();
                        });
                        ctx.restore();
                    }

                    const rayLife = Math.sin(clamp01((p - 0.18) / 0.40) * Math.PI) * alive;
                    if (rayLife > 0) {
                        ctx.save();
                        ctx.translate(center.x, center.y);
                        ctx.rotate(-0.18 + p * 0.22);
                        const rayCount = compactSupernova ? 7 : 16;
                        for (let i = 0; i < rayCount; i++) {
                            const a = (Math.PI * 2 * i) / rayCount + Math.sin(i * 1.7) * 0.05;
                            const len = shockR * (0.42 + (i % 4) * 0.08);
                            const inner = coreR * (0.9 + (i % 3) * 0.22);
                            const x1 = Math.cos(a) * inner;
                            const y1 = Math.sin(a) * inner;
                            const x2 = Math.cos(a) * len;
                            const y2 = Math.sin(a) * len;
                            const grad = ctx.createLinearGradient(x1, y1, x2, y2);
                            grad.addColorStop(0, `rgba(255,255,255,${0.26 * rayLife})`);
                            grad.addColorStop(0.38, i % 3 === 0 ? `rgba(255,222,140,${0.18 * rayLife})` : `rgba(103,247,255,${0.16 * rayLife})`);
                            grad.addColorStop(1, 'rgba(255,255,255,0)');
                            ctx.strokeStyle = grad;
                            ctx.lineWidth = 1.1 + (i % 3) * 0.38;
                            ctx.beginPath();
                            ctx.moveTo(x1, y1);
                            ctx.lineTo(x2, y2);
                            ctx.stroke();
                        }
                        ctx.restore();
                    }

                    ctx.save();
                    ctx.globalAlpha = alive;
                    ctx.translate(center.x, center.y);
                    ctx.rotate(p * 0.45);
                    glassCuts.forEach(cut => {
                        const local = easeOutCubic((p - 0.18) / 0.54);
                        const r1 = cut.start + local * 18;
                        const r2 = cut.start + cut.len * (0.34 + local * 0.76);
                        const x1 = Math.cos(cut.a) * r1;
                        const y1 = Math.sin(cut.a) * r1;
                        const x2 = Math.cos(cut.a + cut.width * 0.012) * r2;
                        const y2 = Math.sin(cut.a + cut.width * 0.012) * r2;
                        const grad = ctx.createLinearGradient(x1, y1, x2, y2);
                        grad.addColorStop(0, 'rgba(255,255,255,0)');
                        grad.addColorStop(0.34, 'rgba(255,239,185,0.22)');
                        grad.addColorStop(0.58, 'rgba(103,247,255,0.18)');
                        grad.addColorStop(1, 'rgba(173,132,255,0)');
                        ctx.strokeStyle = grad;
                        ctx.lineWidth = cut.width;
                        ctx.shadowBlur = 0;
                        ctx.beginPath();
                        ctx.moveTo(x1, y1);
                        ctx.lineTo(x2, y2);
                        ctx.stroke();
                    });
                    ctx.restore();

                    ctx.save();
                    ctx.translate(center.x, center.y);
                    ctx.rotate(-p * 0.28);
                    for (let i = 0; i < (compactSupernova ? 6 : 12); i++) {
                        const local = easeOutCubic((p - 0.2) / 0.58);
                        const base = shockR * (0.42 + (i % 4) * 0.11) + i * 6;
                        const start = i * 0.71 + p * 0.35;
                        const span = 0.26 + (i % 3) * 0.08;
                        const alpha = (0.20 + (i % 4) * 0.018) * alive * Math.sin(clamp01((p - 0.18) / 0.42) * Math.PI);
                        ctx.globalAlpha = Math.max(0, alpha);
                        ctx.strokeStyle = i % 3 === 0 ? 'rgba(255,222,140,0.68)' : (i % 2 ? 'rgba(103,247,255,0.66)' : 'rgba(255,255,255,0.58)');
                        ctx.lineWidth = 1 + (i % 3) * 0.45;
                        ctx.shadowBlur = 0;
                        ctx.beginPath();
                        ctx.arc(0, 0, base * (0.55 + local * 0.55), start, start + span);
                        ctx.stroke();
                    }
                    ctx.restore();

                    ctx.save();
                    ctx.translate(center.x, center.y);
                    ctx.rotate(p * 0.18);
                    for (let i = 0; i < (compactSupernova ? 5 : 11); i++) {
                        const local = easeOutCubic((p - 0.16 - (i % 5) * 0.012) / 0.64);
                        if (local <= 0 || local >= 1) continue;
                        const a = i * 0.448 + Math.sin(i) * 0.14;
                        const r1 = 34 + local * (70 + (i % 4) * 18);
                        const r2 = r1 + 58 + (i % 6) * 15;
                        const cpx = Math.cos(a + 0.22) * (r1 + r2) * 0.46;
                        const cpy = Math.sin(a - 0.18) * (r1 + r2) * 0.46;
                        const x1 = Math.cos(a) * r1;
                        const y1 = Math.sin(a) * r1;
                        const x2 = Math.cos(a + 0.08) * r2;
                        const y2 = Math.sin(a + 0.08) * r2;
                        const alpha = Math.sin(local * Math.PI) * 0.26 * alive;
                        const grad = ctx.createLinearGradient(x1, y1, x2, y2);
                        grad.addColorStop(0, 'rgba(255,255,255,0)');
                        grad.addColorStop(0.34, `rgba(255,222,140,${alpha * 0.85})`);
                        grad.addColorStop(0.5, `rgba(103,247,255,${alpha})`);
                        grad.addColorStop(0.68, `rgba(173,132,255,${alpha * 0.72})`);
                        grad.addColorStop(1, 'rgba(255,255,255,0)');
                        ctx.strokeStyle = grad;
                        ctx.lineWidth = 1.25;
                        ctx.shadowBlur = 0;
                        ctx.beginPath();
                        ctx.moveTo(x1, y1);
                        ctx.quadraticCurveTo(cpx, cpy, x2, y2);
                        ctx.stroke();
                    }
                    ctx.restore();

                    particles.forEach(pt => {
                        const life = clamp01((p - 0.17 - pt.delay) / 0.68);
                        if (life <= 0 || life >= 1) return;
                        const e = easeOutCubic(life);
                        const a = pt.a + pt.drift * life;
                        const r = (28 + pt.r * pt.speed) * e + shockR * 0.08;
                        const x = center.x + Math.cos(a) * r;
                        const y = center.y + Math.sin(a) * r;
                        const alpha = Math.sin(life * Math.PI) * 0.78 * alive;
                        if (pt.streak && !compactSupernova) {
                            const tail = 18 + e * 32;
                            const x2 = x - Math.cos(a) * tail;
                            const y2 = y - Math.sin(a) * tail;
                            const grad = ctx.createLinearGradient(x2, y2, x, y);
                            grad.addColorStop(0, 'rgba(255,255,255,0)');
                            grad.addColorStop(1, `${pt.color}${alpha})`);
                            ctx.strokeStyle = grad;
                            ctx.lineWidth = Math.max(0.9, pt.size * 0.82);
                            ctx.beginPath();
                            ctx.moveTo(x2, y2);
                            ctx.lineTo(x, y);
                            ctx.stroke();
                        } else {
                            ctx.fillStyle = `${pt.color}${alpha})`;
                            ctx.beginPath();
                            ctx.arc(x, y, pt.size * (1 + e), 0, Math.PI * 2);
                            ctx.fill();
                        }
                    });

                    ctx.globalCompositeOperation = 'lighter';
                    for (let i = 0; i < (compactSupernova ? 3 : 5); i++) {
                        const rr = coreR * (1.4 + i * 0.55) + blast * i * 12;
                        drawRing(
                            center.x,
                            center.y,
                            rr,
                            (0.16 - i * 0.022) * alive,
                            0.7,
                            8,
                            i % 2 ? 'rgba(103,247,255,0.74)' : 'rgba(255,222,140,0.78)',
                            i % 2 ? 'rgba(103,247,255,0.58)' : 'rgba(255,222,140,0.62)'
                        );
                    }

                    if (p < 1 && snContainer.isConnected) {
                        rafId = requestAnimationFrame(renderFrame(start));
                    }
                };

                rafId = requestAnimationFrame(now => renderFrame(now)(now));
                targetTable.classList.add('anim-supernova-table');
                if (compactSupernova) targetTable.classList.add('anim-supernova-table--compact');
                
                this.scheduleEffectTimeout(() => {
                    cancelAnimationFrame(rafId);
                    targetTable.classList.remove('anim-supernova-table', 'anim-supernova-table--compact');
                    if (snContainer.parentNode) snContainer.remove(); 
                }, duration);
            }
        }

        if (type === 'neon_pulse') {
            let targetTable = null;
            const tables = document.querySelectorAll('.player-table');
            tables.forEach(tbl => { if (tbl.style.opacity === '1' || tbl.style.borderColor.includes('gold') || tbl.style.borderColor.includes('224')) { targetTable = tbl; } });
            if (!targetTable && tables.length > 0) targetTable = tables[0];

            if (targetTable) {
                targetTable.classList.add('anim-neon-pulse');
                document.body.classList.add('fx-neon_pulse'); 
                
                this.scheduleEffectTimeout(() => {
                    targetTable.classList.remove('anim-neon-pulse'); 
                    document.body.classList.remove('fx-neon_pulse'); 
                }, 5000, 'neon_pulse');
            }
        }

        if (type === 'drones') {
            const duration = 8200;
            const compactDroneViewport = window.matchMedia && (
                window.matchMedia('(max-width: 760px)').matches ||
                window.matchMedia('(hover: none) and (pointer: coarse)').matches
            );
            const reducedDroneMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

            const sky = document.createElement('div');
            sky.className = 'drone-night-sky';
            if (compactDroneViewport || reducedDroneMotion) sky.classList.add('drone-night-sky--compact');
            sky.innerHTML = `
                <div class="drone-starfield drone-starfield--far"></div>
                <div class="drone-starfield drone-starfield--near"></div>
                <div class="drone-aurora drone-aurora--left"></div>
                <div class="drone-aurora drone-aurora--right"></div>
                <div class="drone-holo-stage">
                    <div class="drone-holo-ring drone-holo-ring--outer"></div>
                    <div class="drone-holo-ring drone-holo-ring--inner"></div>
                    <div class="drone-holo-grid"></div>
                    <div class="drone-holo-flare"></div>
                </div>
            `;
            document.body.appendChild(sky);

            let fullName = _safeT('hs_player') || "IGRAČ";
            if (window.app && window.app.players && window.app.players[window.app.currentPlayerIdx]) {
                fullName = window.app.players[window.app.currentPlayerIdx];
            } else if (window.app && window.app.playerName) {
                fullName = window.app.playerName;
            }

            let firstName = fullName.trim().split(/\s+/)[0] || (_safeT('hs_player') || "IGRAČ");
            firstName = firstName.substring(0, 12);

            const textEl = document.createElement('div');
            textEl.className = 'drone-text';
            if (compactDroneViewport || reducedDroneMotion) textEl.classList.add('drone-text--compact');
            textEl.innerText = firstName;
            textEl.dataset.text = firstName;
            textEl.style.setProperty('--name-length', String(firstName.length));
            document.body.appendChild(textEl);

            const colors = ['#66f7ff', '#ffffff', '#51ffd8', '#9d7cff', '#ffd66f'];
            const droneCount = reducedDroneMotion ? 24 : (compactDroneViewport ? 38 : 64);
            const fragment = document.createDocumentFragment();

            for (let i = 0; i < droneCount; i++) {
                const dot = document.createElement('div');
                dot.className = compactDroneViewport || reducedDroneMotion ? 'drone-dot drone-dot--lite' : 'drone-dot';

                const lane = i / Math.max(1, droneCount - 1);
                const formationX = 18 + lane * 64 + (Math.random() - 0.5) * 8;
                const wave = Math.sin(lane * Math.PI * 4.5) * 9;
                const formationY = 29 + wave + (Math.random() - 0.5) * 14;
                const side = Math.random() > 0.5 ? 1 : -1;

                dot.style.setProperty('--sx', (48 + side * (28 + Math.random() * 44)) + 'vw');
                dot.style.setProperty('--sy', (106 + Math.random() * 18) + 'vh');
                dot.style.setProperty('--mx', (8 + Math.random() * 84) + 'vw');
                dot.style.setProperty('--my', (62 + Math.random() * 22) + 'vh');
                dot.style.setProperty('--fx', formationX + 'vw');
                dot.style.setProperty('--fy', formationY + 'vh');
                dot.style.setProperty('--ex', (8 + Math.random() * 84) + 'vw');
                dot.style.setProperty('--ey', (-18 - Math.random() * 18) + 'vh');
                dot.style.setProperty('--delay', (Math.random() * 0.95).toFixed(2) + 's');
                dot.style.setProperty('--duration', (7.1 + Math.random() * 0.8).toFixed(2) + 's');
                dot.style.setProperty('--scale', (0.72 + Math.random() * 0.74).toFixed(2));
                dot.style.setProperty('--tilt', ((Math.random() - 0.5) * 28).toFixed(1) + 'deg');
                dot.style.setProperty('--drone-color', colors[Math.floor(Math.random() * colors.length)]);
                dot.style.setProperty('--strobe-speed', (0.46 + Math.random() * 0.32).toFixed(2) + 's');
                fragment.appendChild(dot);
            }

            document.body.appendChild(fragment);

            if(window.app && window.app.soundMgr && window.app.soundMgr.epicDroneShow) {
                window.app.soundMgr.epicDroneShow();
            }

            this.scheduleEffectTimeout(() => {
                if(sky.parentNode) sky.remove();
                if(textEl.parentNode) textEl.remove();
                document.querySelectorAll('.drone-dot').forEach(dot => dot.remove());
            }, duration);
        }

        if (type === 'thunder') {
            const flash = document.createElement('div');
            flash.className = 'anim-thunder'; 
            
            document.body.style.setProperty('--dir', Math.random() > 0.5 ? '1' : '-1');
            document.body.appendChild(flash);
            document.body.classList.add('fx-thunder-shake'); 
            
            if (window.app && window.app.soundMgr && typeof window.app.soundMgr.thunder === 'function') {
                window.app.soundMgr.thunder();
            }

            if (window.app && typeof window.app.vibrate === 'function') {
                window.app.vibrate([50, 50, 50, 600, 400, 150, 300, 100, 200, 100, 100]);
            }
            
            this.scheduleEffectTimeout(() => {
                if(flash.parentNode) flash.remove();
                document.body.classList.remove('fx-thunder-shake');
            }, 4500, 'thunder');
        }

        if (type === 'balkan') {
            document.body.classList.add('fx-balkan');

            const bg = document.createElement('div');
            bg.className = 'kafana-overlay';
            bg.innerHTML = `
                <div class="kafana-tablecloth"></div>
                <div class="kafana-tablecloth-frame"></div>
                <div class="kafana-ambient-lights"></div>
            `;
            document.body.appendChild(bg);

            const trumpetData = [
                { side: 'left', top: '15vh', delay: '0s' },
                { side: 'left', top: '58vh', delay: '0.18s' },
                { side: 'right', top: '24vh', delay: '0.08s' },
                { side: 'right', top: '66vh', delay: '0.26s' }
            ];
            const trumpets = trumpetData.map(data => {
                const trumpet = document.createElement('div');
                trumpet.innerText = '🎺';
                trumpet.className = `trumpet-icon-v2 trumpet-${data.side}`;
                trumpet.style.top = data.top;
                trumpet.style.animationDelay = data.delay;
                document.body.appendChild(trumpet);
                return trumpet;
            });

            this.spawnWeddingRain('balkan');

            if (window.app && window.app.soundMgr && window.app.soundMgr.balkanTrumpet) {
                window.app.soundMgr.balkanTrumpet();
            }

            this.scheduleEffectTimeout(() => {
                document.body.classList.remove('fx-balkan');
                if (bg.parentNode) bg.remove();
                trumpets.forEach(trumpet => trumpet.remove());
                if (window.app?.soundMgr?.stopBalkanMusic) {
                    window.app.soundMgr.stopBalkanMusic(true);
                }
            }, 8600, 'balkan');
        }
        
        if (type === 'fireworks') {
             for(let i=0; i<12; i++) { 
                 this.scheduleEffectTimeout(() => this.spawnRealFirework('fireworks'), i * 500 + Math.random() * 400, 'fireworks');
             }
        }
        
        if (type === 'cosmic_dust') {
            document.body.classList.add('fx-cosmic_dust');
            
            const container = document.createElement('div');
            container.className = 'cosmic-container';
            container.innerHTML = '<div class="stardust-layer layer-1"></div><div class="stardust-layer layer-2"></div><div class="stardust-layer layer-3"></div>';
            document.body.appendChild(container);
            
            this.scheduleEffectTimeout(() => {
                document.body.classList.remove('fx-cosmic_dust');
                if(container.parentNode) container.remove();
            }, 6000, 'cosmic_dust');
        }

        if (type === 'ufo_abduction') {
            this.runUfoAbduction();
        }

        if (type === 'dragon_fire') {
            document.body.classList.add('fx-dragon_fire');
            
            const container = document.createElement('div');
            container.className = 'dragon-container';
            container.innerHTML = '<div class="dragon-flames"></div><div class="dragon-embers"></div>';
            document.body.appendChild(container);

            if (window.app && window.app.soundMgr && typeof window.app.soundMgr.thunder === 'function') {
                window.app.soundMgr.thunder(); 
            }

            if (window.app && typeof window.app.vibrate === 'function') {
                window.app.vibrate([100, 150, 200, 300, 400, 200, 100]); 
            }

            this.scheduleEffectTimeout(() => {
                document.body.classList.remove('fx-dragon_fire');
                if(container.parentNode) container.remove();
            }, 5500, 'dragon_fire');
        }

        if (type === 'royal_yamb') {
            document.body.classList.add('fx-royal_yamb');

            const container = document.createElement('div');
            container.className = 'royal-yamb-container';
            container.innerHTML = `
                <div class="royal-yamb-light-rig">
                    <span class="royal-yamb-lamp lamp-left"></span>
                    <span class="royal-yamb-lamp lamp-center"></span>
                    <span class="royal-yamb-lamp lamp-right"></span>
                </div>
                <div class="royal-yamb-spotlight spotlight-left"></div>
                <div class="royal-yamb-spotlight spotlight-right"></div>
                <div class="royal-yamb-spotlight spotlight-center"></div>
                <div class="royal-yamb-rays"></div>
                <div class="royal-yamb-stage-glow"></div>
                <div class="royal-yamb-footlights"></div>
                <canvas class="royal-yamb-canvas"></canvas>
                <div class="royal-yamb-emblem">
                    <img src="Logo_green.png" alt="" draggable="false">
                </div>
                <div class="royal-yamb-title-active" aria-label="Yamb of the Balkan">
                    <span class="royal-yamb-title-main">YAMB</span>
                    <span class="royal-yamb-title-sub">OF THE BALKAN</span>
                </div>
                <div class="royal-yamb-sparkles"></div>
            `;
            document.body.appendChild(container);

            this.runRoyalYambCanvas(container.querySelector('.royal-yamb-canvas'), 8000);
            this.playRoyalYambAccents();

            if (window.app && window.app.soundMgr) {
                window.app.soundMgr.trophy();
            }

            if (window.app && typeof window.app.vibrate === 'function') {
                window.app.vibrate([80, 40, 120, 60, 220, 80, 120]);
            }

            this.scheduleEffectTimeout(() => {
                document.body.classList.remove('fx-royal_yamb');
                if (container.parentNode) container.remove();
            }, 8000, 'royal_yamb');
        }
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

    runUfoAbduction() {
        const targetTable = this.getTargetTable();
        if (!targetTable) return;

        const rect = targetTable.getBoundingClientRect();
        const viewportWidth = window.innerWidth || document.documentElement.clientWidth || rect.width;
        const viewportHeight = window.innerHeight || document.documentElement.clientHeight || rect.height;
        const ufoX = Math.max(110, Math.min(viewportWidth - 110, rect.left + rect.width / 2));
        const ufoY = Math.max(92, Math.min(viewportHeight - 170, rect.top + rect.height * 0.34));
        const beamHeight = Math.max(250, Math.min(viewportHeight * 0.74, rect.bottom - ufoY + 70));
        const beamWidth = Math.max(220, Math.min(viewportWidth * 0.86, rect.width * 1.08));

        document.body.classList.add('fx-ufo_abduction');
        targetTable.classList.add('anim-ufo-table');

        const container = document.createElement('div');
        container.className = 'ufo-abduction-container';
        container.setAttribute('aria-hidden', 'true');
        container.style.setProperty('--ufo-x', `${ufoX}px`);
        container.style.setProperty('--ufo-y', `${ufoY}px`);
        container.style.setProperty('--ufo-beam-height', `${beamHeight}px`);
        container.style.setProperty('--ufo-beam-width', `${beamWidth}px`);
        container.innerHTML = `
            <div class="ufo-space-layer"></div>
            <div class="ufo-scan-grid"></div>
            <div class="ufo-stage">
                <div class="ufo-speech">BIP?</div>
                <div class="ufo-beam">
                    <div class="ufo-beam-core"></div>
                    <div class="ufo-ray ray-one"></div>
                    <div class="ufo-ray ray-two"></div>
                    <div class="ufo-ray ray-three"></div>
                    <div class="ufo-ray ray-four"></div>
                </div>
                <div class="ufo-ship">
                    <div class="ufo-dome">
                        <div class="ufo-alien alien-left"><span></span><span></span></div>
                        <div class="ufo-alien alien-center"><span></span><span></span></div>
                        <div class="ufo-alien alien-right"><span></span><span></span></div>
                    </div>
                    <div class="ufo-body">
                        <i></i><i></i><i></i><i></i><i></i>
                    </div>
                    <div class="ufo-rim"></div>
                    <div class="ufo-legs"></div>
                </div>
                <div class="ufo-score-vortex"></div>
            </div>
        `;
        document.body.appendChild(container);

        const sound = window.app && window.app.soundMgr;
        if (sound && typeof sound.ufoAbduction === 'function') {
            sound.ufoAbduction();
        } else if (sound && typeof sound.epicDroneShow === 'function') {
            sound.epicDroneShow();
        }

        if (window.app && typeof window.app.vibrate === 'function') {
            window.app.vibrate([35, 45, 35, 90, 35, 45, 160]);
        }

        this.scheduleEffectTimeout(() => {
            if (!container.isConnected || !document.body.classList.contains('fx-ufo_abduction')) return;
            this.abductVisibleScores(container, targetTable, ufoX, ufoY);
        }, 1050, 'ufo_abduction');

        this.scheduleEffectTimeout(() => {
            document.body.classList.remove('fx-ufo_abduction');
            targetTable.classList.remove('anim-ufo-table');
            targetTable.querySelectorAll('.ufo-score-dimmed').forEach(btn => btn.classList.remove('ufo-score-dimmed'));
            document.querySelectorAll('.ufo-abducted-score, .ufo-target-ray').forEach(el => el.remove());
            if (container.parentNode) container.remove();
        }, 7500, 'ufo_abduction');
    }

    abductVisibleScores(container, targetTable, ufoX, ufoY) {
        const buttons = Array.from(targetTable.querySelectorAll('.score-btn.filled'))
            .filter(btn => (btn.textContent || '').trim() !== '');

        if (buttons.length === 0) return;

        const rayStep = Math.max(1, Math.ceil(buttons.length / 30));
        const stagger = Math.max(18, Math.min(46, 1450 / buttons.length));

        buttons.forEach((btn, index) => {
            const text = (btn.textContent || '').trim();
            const rect = btn.getBoundingClientRect();
            const startX = rect.left + rect.width / 2;
            const startY = rect.top + rect.height / 2;
            const targetX = ufoX + (Math.random() * 44 - 22);
            const targetY = ufoY + 20 + Math.random() * 22;
            const dx = targetX - startX;
            const dy = targetY - startY;
            const delay = 180 + index * stagger + Math.random() * 120;
            const duration = 2350 + Math.random() * 950;
            const wobble = (index % 2 === 0 ? 1 : -1) * (18 + Math.random() * 18);
            const spin = (index % 2 === 0 ? 1 : -1) * (220 + Math.random() * 260);

            btn.classList.add('ufo-score-dimmed');

            const clone = document.createElement('div');
            clone.className = 'ufo-abducted-score';
            clone.textContent = text;
            clone.style.left = `${startX}px`;
            clone.style.top = `${startY}px`;
            clone.style.setProperty('--score-hue', `${160 + (index % 5) * 22}deg`);
            container.appendChild(clone);

            const animation = clone.animate([
                { opacity: 0, transform: 'translate3d(0, 0, 0) scale(0.86) rotate(0deg)', filter: 'blur(2px)', offset: 0 },
                { opacity: 1, transform: `translate3d(${wobble}px, -10px, 0) scale(1.1) rotate(${spin * 0.08}deg)`, filter: 'blur(0)', offset: 0.16 },
                { opacity: 0.95, transform: `translate3d(${dx * 0.44 + wobble}px, ${dy * 0.42 - 24}px, 0) scale(0.82) rotate(${spin * 0.45}deg)`, filter: 'blur(0.5px)', offset: 0.62 },
                { opacity: 0, transform: `translate3d(${dx}px, ${dy}px, 0) scale(0.18) rotate(${spin}deg)`, filter: 'blur(5px)', offset: 1 }
            ], {
                duration,
                delay,
                easing: 'cubic-bezier(0.16, 0.8, 0.24, 1)',
                fill: 'forwards'
            });

            animation.onfinish = () => {
                if (clone.parentNode) clone.remove();
            };

            if (index % rayStep === 0) {
                this.spawnUfoTargetRay(container, ufoX, ufoY + 48, startX, startY, delay, Math.min(1900, duration));
            }
        });
    }

    spawnUfoTargetRay(container, fromX, fromY, toX, toY, delay, duration) {
        if (!container || !container.isConnected) return;

        const dx = toX - fromX;
        const dy = toY - fromY;
        const length = Math.hypot(dx, dy);
        const angle = Math.atan2(dy, dx);
        const ray = document.createElement('div');
        ray.className = 'ufo-target-ray';
        ray.style.left = `${fromX}px`;
        ray.style.top = `${fromY}px`;
        ray.style.width = `${length}px`;
        ray.style.transform = `rotate(${angle}rad)`;
        ray.style.animationDelay = `${delay}ms`;
        ray.style.animationDuration = `${duration}ms`;
        container.appendChild(ray);

        this.scheduleEffectTimeout(() => {
            if (ray.parentNode) ray.remove();
        }, delay + duration + 120, 'ufo_abduction');
    }

    playRoyalYambAccents() {
        const sound = window.app && window.app.soundMgr;
        if (!sound) return;

        [760, 1840, 3120, 4680].forEach(delay => {
            this.scheduleEffectTimeout(() => {
                if (typeof sound.fireworkLaunch === 'function') sound.fireworkLaunch();
                this.scheduleEffectTimeout(() => {
                    if (typeof sound.fireworkExplode === 'function') sound.fireworkExplode();
                }, 240, 'royal_yamb');
            }, delay, 'royal_yamb');
        });
    }

    runRoyalYambCanvas(canvas, duration = 8000) {
        if (!canvas || !canvas.getContext) return;

        const ctx = canvas.getContext('2d', { alpha: true, desynchronized: true });
        if (!ctx) return;

        const start = performance.now();
        let rafId = 0;
        let width = 0;
        let height = 0;
        let dpr = 1;

        const clamp01 = value => Math.max(0, Math.min(1, value));
        const random = (min, max) => min + Math.random() * (max - min);
        const easeOutCubic = value => 1 - Math.pow(1 - clamp01(value), 3);
        const easeInOut = value => {
            value = clamp01(value);
            return value < 0.5 ? 4 * value * value * value : 1 - Math.pow(-2 * value + 2, 3) / 2;
        };

        const resizeCanvas = () => {
            width = window.innerWidth || document.documentElement.clientWidth || 1;
            height = window.innerHeight || document.documentElement.clientHeight || 1;
            const compact = width < 560 || height < 620;
            dpr = Math.min(window.devicePixelRatio || 1, compact ? 1 : 1.25);
            canvas.width = Math.floor(width * dpr);
            canvas.height = Math.floor(height * dpr);
            canvas.style.width = '100vw';
            canvas.style.height = '100vh';
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            ctx.imageSmoothingEnabled = true;
        };

        resizeCanvas();
        window.addEventListener('resize', resizeCanvas, { passive: true });

        const compact = width < 560 || height < 620;
        const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
        const lowPower = compact || reducedMotion;
        const golds = ['#fff7c2', '#ffd66f', '#f6b63d', '#d98b18'];
        const burstColors = ['#fff7c2', '#ffd66f', '#ffffff', '#ffb13d', '#7fffe1'];
        const coinCount = reducedMotion ? 16 : (compact ? 24 : 36);
        const sparkleCount = reducedMotion ? 20 : (compact ? 28 : 42);
        const burstParticleCount = reducedMotion ? 10 : (compact ? 14 : 20);

        const createSprite = (size, paint) => {
            const sprite = document.createElement('canvas');
            sprite.width = size;
            sprite.height = size;
            const spriteCtx = sprite.getContext('2d');
            if (spriteCtx) paint(spriteCtx, size);
            return sprite;
        };

        const coinSprites = golds.map(color => createSprite(64, (spriteCtx, size) => {
            const center = size / 2;
            const radius = size * 0.31;
            const gradient = spriteCtx.createRadialGradient(center - 8, center - 10, 3, center, center, radius);
            gradient.addColorStop(0, '#fffde8');
            gradient.addColorStop(0.32, color);
            gradient.addColorStop(0.7, '#d88a16');
            gradient.addColorStop(1, '#6d3404');
            spriteCtx.shadowBlur = 8;
            spriteCtx.shadowColor = 'rgba(255, 215, 104, 0.72)';
            spriteCtx.fillStyle = gradient;
            spriteCtx.beginPath();
            spriteCtx.arc(center, center, radius, 0, Math.PI * 2);
            spriteCtx.fill();
            spriteCtx.shadowBlur = 0;
            spriteCtx.strokeStyle = 'rgba(75, 34, 3, 0.68)';
            spriteCtx.lineWidth = 3;
            spriteCtx.stroke();
            spriteCtx.strokeStyle = 'rgba(255, 255, 230, 0.58)';
            spriteCtx.lineWidth = 2;
            spriteCtx.beginPath();
            spriteCtx.arc(center, center, radius * 0.56, 0, Math.PI * 2);
            spriteCtx.stroke();
            spriteCtx.fillStyle = 'rgba(111, 59, 5, 0.72)';
            spriteCtx.font = 'bold 17px serif';
            spriteCtx.textAlign = 'center';
            spriteCtx.textBaseline = 'middle';
            spriteCtx.fillText('Y', center, center + 1);
        }));

        const diamondSprite = createSprite(52, (spriteCtx, size) => {
            const center = size / 2;
            const radius = size * 0.28;
            const gradient = spriteCtx.createLinearGradient(center, center - radius, center, center + radius);
            gradient.addColorStop(0, '#ffffff');
            gradient.addColorStop(0.42, '#92fff1');
            gradient.addColorStop(1, '#168b94');
            spriteCtx.shadowBlur = 10;
            spriteCtx.shadowColor = 'rgba(103, 255, 229, 0.82)';
            spriteCtx.fillStyle = gradient;
            spriteCtx.beginPath();
            spriteCtx.moveTo(center, center - radius);
            spriteCtx.lineTo(center + radius * 0.9, center);
            spriteCtx.lineTo(center, center + radius);
            spriteCtx.lineTo(center - radius * 0.9, center);
            spriteCtx.closePath();
            spriteCtx.fill();
        });

        const sparkleSprites = burstColors.map(color => createSprite(40, (spriteCtx, size) => {
            const center = size / 2;
            const gradient = spriteCtx.createRadialGradient(center, center, 0, center, center, size * 0.46);
            gradient.addColorStop(0, '#ffffff');
            gradient.addColorStop(0.12, color);
            gradient.addColorStop(0.42, color + '99');
            gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
            spriteCtx.fillStyle = gradient;
            spriteCtx.fillRect(0, 0, size, size);
            spriteCtx.strokeStyle = color;
            spriteCtx.lineWidth = 1.5;
            spriteCtx.beginPath();
            spriteCtx.moveTo(center, 6);
            spriteCtx.lineTo(center, size - 6);
            spriteCtx.moveTo(6, center);
            spriteCtx.lineTo(size - 6, center);
            spriteCtx.stroke();
        }));

        const falling = Array.from({ length: coinCount }, (_, index) => {
            const size = random(compact ? 7 : 8, compact ? 14 : 18);
            return {
                kind: index % 7 === 0 ? 'diamond' : 'coin',
                x: random(width * 0.04, width * 0.96),
                y: random(-height * 0.45, -size * 2),
                drift: random(-80, 80),
                size,
                delay: random(120, 3400),
                life: random(2800, 4300),
                spin: random(-5.2, 5.2),
                wobble: random(0.8, 2.4),
                sprite: index % 7 === 0 ? diamondSprite : coinSprites[index % coinSprites.length]
            };
        });

        const sparkles = Array.from({ length: sparkleCount }, (_, index) => ({
            x: random(width * 0.08, width * 0.92),
            y: random(height * 0.12, height * 0.86),
            size: random(1.3, compact ? 3.1 : 4.1),
            delay: random(0, 2400),
            life: random(2100, 5200),
            drift: random(-18, 18),
            phase: random(0, Math.PI * 2),
            sprite: sparkleSprites[index % sparkleSprites.length]
        }));

        const burstTimes = reducedMotion ? [980, 3300, 5200] : [760, 2100, 3650, 5200];
        const bursts = [];
        burstTimes.forEach((time, burstIndex) => {
            const originX = width * (0.22 + (burstIndex % 3) * 0.28) + random(-width * 0.05, width * 0.05);
            const originY = height * random(0.2, 0.42);
            for (let i = 0; i < burstParticleCount; i++) {
                const angle = (Math.PI * 2 * i) / burstParticleCount + random(-0.08, 0.08);
                bursts.push({
                    start: time + random(-80, 130),
                    life: random(1150, 1650),
                    x: originX,
                    y: originY,
                    angle,
                    speed: random(compact ? 68 : 92, compact ? 150 : 210),
                    size: random(1.4, compact ? 3.1 : 3.8),
                    sprite: sparkleSprites[(i + burstIndex) % sparkleSprites.length],
                    gravity: random(54, 104)
                });
            }
        });

        const drawSprite = (sprite, x, y, radius, rotation, alpha, scaleY = 1) => {
            ctx.save();
            ctx.globalAlpha = alpha;
            ctx.translate(x, y);
            ctx.rotate(rotation);
            ctx.scale(1, scaleY);
            ctx.drawImage(sprite, -radius, -radius, radius * 2, radius * 2);
            ctx.restore();
        };

        const draw = now => {
            if (!canvas.isConnected) {
                window.removeEventListener('resize', resizeCanvas);
                return;
            }

            const elapsed = now - start;
            ctx.clearRect(0, 0, width, height);
            ctx.globalCompositeOperation = 'lighter';

            sparkles.forEach(sparkle => {
                const local = (elapsed - sparkle.delay) % sparkle.life;
                const progress = local / sparkle.life;
                const alpha = Math.sin(progress * Math.PI) * (0.42 + 0.38 * Math.sin(elapsed / 180 + sparkle.phase));
                if (alpha <= 0.04) return;
                const size = sparkle.size * 5;
                ctx.globalAlpha = alpha;
                ctx.drawImage(
                    sparkle.sprite,
                    sparkle.x + Math.sin(elapsed / 900 + sparkle.phase) * sparkle.drift - size,
                    sparkle.y - easeInOut(progress) * 46 - size,
                    size * 2,
                    size * 2
                );
            });

            bursts.forEach(particle => {
                const local = elapsed - particle.start;
                if (local < 0 || local > particle.life) return;
                const progress = local / particle.life;
                const travel = easeOutCubic(progress);
                const x = particle.x + Math.cos(particle.angle) * particle.speed * travel;
                const y = particle.y + Math.sin(particle.angle) * particle.speed * travel + particle.gravity * progress * progress;
                const alpha = (1 - progress) * 0.95;
                const size = particle.size * 4.5;
                ctx.globalAlpha = alpha;
                ctx.drawImage(particle.sprite, x - size, y - size, size * 2, size * 2);
            });
            ctx.globalAlpha = 1;

            ctx.globalCompositeOperation = 'source-over';
            falling.forEach(item => {
                const local = elapsed - item.delay;
                if (local < 0 || local > item.life) return;
                const progress = local / item.life;
                const eased = easeInOut(progress);
                const alpha = progress < 0.12 ? progress / 0.12 : Math.min(1, (1 - progress) / 0.16);
                const x = item.x + item.drift * Math.sin(progress * Math.PI * item.wobble);
                const y = item.y + (height + Math.abs(item.y) + item.size * 4) * eased;
                const rotation = item.spin * progress * Math.PI * 2;
                const radius = item.kind === 'diamond' ? item.size * 1.28 : item.size * 1.45;
                drawSprite(item.sprite, x, y, radius, rotation, alpha, item.kind === 'diamond' ? 1 : 0.76);
            });

            if (elapsed < duration) {
                rafId = requestAnimationFrame(draw);
            } else {
                ctx.clearRect(0, 0, width, height);
                window.removeEventListener('resize', resizeCanvas);
            }
        };

        rafId = requestAnimationFrame(draw);
        this.scheduleEffectTimeout(() => {
            cancelAnimationFrame(rafId);
            window.removeEventListener('resize', resizeCanvas);
        }, duration + 120, 'royal_yamb');
    }

    spawnRealFirework(group = 'fireworks') {
        const startX = window.innerWidth * 0.1 + Math.random() * window.innerWidth * 0.8;
        const endY = window.innerHeight * 0.1 + Math.random() * window.innerHeight * 0.4;
        
        if (window.app && window.app.soundMgr && window.app.soundMgr.fireworkLaunch) {
            window.app.soundMgr.fireworkLaunch();
        }

        const rocket = document.createElement('div');
        rocket.className = 'fw-rocket';
        rocket.style.left = startX + 'px';
        document.body.appendChild(rocket);

        const duration = 800 + Math.random() * 400;
        rocket.animate([
            { transform: `translateY(100vh)`, opacity: 1 },
            { transform: `translateY(${endY}px)`, opacity: 0 }
        ], { duration: duration, easing: 'ease-out' }).onfinish = () => {
            if (!rocket.isConnected) return;
            rocket.remove();
            this.explodeRealFirework(startX, endY, group);
        };
    }

    explodeRealFirework(x, y, group = 'fireworks') {
        if (window.app && window.app.soundMgr && window.app.soundMgr.fireworkExplode) {
            window.app.soundMgr.fireworkExplode();
        }

        const flash = document.createElement('div');
        flash.className = 'fw-flash';
        document.body.appendChild(flash);
        this.scheduleEffectTimeout(() => { if(flash.parentNode) flash.remove(); }, 250, group);

        if (window.app && typeof window.app.vibrate === 'function') {
            window.app.vibrate([40, 50, 20]);
        }

        const colors = ['#FF0044', '#00FF44', '#0044FF', '#FFFF00', '#FF00FF', '#00FFFF', '#FFFFFF', '#FFD700'];
        const mainColor = colors[Math.floor(Math.random() * colors.length)];
        const particleCount = 45 + Math.random() * 30; 

        for (let i = 0; i < particleCount; i++) {
            const p = document.createElement('div');
            p.className = 'fw-particle';
            p.style.backgroundColor = mainColor;
            p.style.boxShadow = `0 0 8px ${mainColor}, 0 0 15px ${mainColor}`;
            p.style.left = x + 'px';
            p.style.top = y + 'px';

            const angle = Math.random() * Math.PI * 2;
            const velocity = Math.random() * 180 + 50; 
            
            p.style.setProperty('--dx', Math.cos(angle) * velocity + 'px');
            p.style.setProperty('--dy', Math.sin(angle) * velocity + 'px');

            document.body.appendChild(p);
            this.scheduleEffectTimeout(() => { if(p.parentNode) p.remove(); }, 1600, group);
        }
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
        if (this.goldRainAnimationId) {
            cancelAnimationFrame(this.goldRainAnimationId);
            this.goldRainAnimationId = null;
        }
        if (this.goldRainResizeHandler) {
            window.removeEventListener('resize', this.goldRainResizeHandler);
            this.goldRainResizeHandler = null;
        }
    }

    getGoldRainSprites() {
        if (this.goldRainSprites) return this.goldRainSprites;

        const makeSprite = (size, draw) => {
            const sprite = document.createElement('canvas');
            sprite.width = size;
            sprite.height = size;
            const ctx = sprite.getContext('2d');
            if (ctx) draw(ctx, size);
            return sprite;
        };

        const coin = makeSprite(144, (ctx, size) => {
            const cx = size / 2;
            const cy = size / 2;
            const glow = ctx.createRadialGradient(cx, cy, size * 0.18, cx, cy, size * 0.48);
            glow.addColorStop(0, 'rgba(255, 247, 198, 0.9)');
            glow.addColorStop(0.45, 'rgba(255, 189, 64, 0.42)');
            glow.addColorStop(1, 'rgba(255, 189, 64, 0)');
            ctx.fillStyle = glow;
            ctx.beginPath();
            ctx.arc(cx, cy, size * 0.48, 0, Math.PI * 2);
            ctx.fill();

            const body = ctx.createRadialGradient(cx - size * 0.12, cy - size * 0.14, size * 0.08, cx, cy, size * 0.32);
            body.addColorStop(0, '#fff3b0');
            body.addColorStop(0.35, '#ffd66f');
            body.addColorStop(0.7, '#ffae3d');
            body.addColorStop(1, '#b56a0a');
            ctx.fillStyle = body;
            ctx.beginPath();
            ctx.arc(cx, cy, size * 0.31, 0, Math.PI * 2);
            ctx.fill();

            ctx.strokeStyle = 'rgba(79, 44, 11, 0.62)';
            ctx.lineWidth = size * 0.035;
            ctx.stroke();

            ctx.fillStyle = '#ffe89a';
            ctx.beginPath();
            ctx.arc(cx, cy, size * 0.22, 0, Math.PI * 2);
            ctx.fill();

            ctx.strokeStyle = 'rgba(58, 31, 7, 0.45)';
            ctx.lineWidth = size * 0.02;
            ctx.stroke();

            ctx.lineCap = 'round';
            ctx.strokeStyle = '#17312b';
            ctx.lineWidth = size * 0.046;
            ctx.beginPath();
            ctx.arc(cx + size * 0.025, cy, size * 0.14, Math.PI * 0.25, Math.PI * 1.72);
            ctx.stroke();

            ctx.strokeStyle = 'rgba(255, 255, 220, 0.86)';
            ctx.lineWidth = size * 0.021;
            ctx.beginPath();
            ctx.arc(cx + size * 0.025, cy, size * 0.13, Math.PI * 0.34, Math.PI * 1.62);
            ctx.stroke();

            ctx.strokeStyle = 'rgba(255, 255, 220, 0.54)';
            ctx.lineWidth = size * 0.018;
            ctx.beginPath();
            ctx.moveTo(cx, cy - size * 0.21);
            ctx.lineTo(cx, cy + size * 0.21);
            ctx.moveTo(cx - size * 0.2, cy - size * 0.02);
            ctx.lineTo(cx + size * 0.2, cy - size * 0.02);
            ctx.stroke();
        });

        const gem = makeSprite(110, (ctx, size) => {
            const cx = size / 2;
            const cy = size / 2;
            const glow = ctx.createRadialGradient(cx, cy, size * 0.12, cx, cy, size * 0.42);
            glow.addColorStop(0, 'rgba(190, 245, 255, 0.82)');
            glow.addColorStop(0.5, 'rgba(63, 180, 255, 0.32)');
            glow.addColorStop(1, 'rgba(63, 180, 255, 0)');
            ctx.fillStyle = glow;
            ctx.beginPath();
            ctx.arc(cx, cy, size * 0.42, 0, Math.PI * 2);
            ctx.fill();

            const gradient = ctx.createLinearGradient(cx - size * 0.24, cy - size * 0.24, cx + size * 0.24, cy + size * 0.24);
            gradient.addColorStop(0, '#aef3ff');
            gradient.addColorStop(0.42, '#38bdf8');
            gradient.addColorStop(1, '#2563eb');
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.moveTo(cx, cy - size * 0.31);
            ctx.lineTo(cx + size * 0.28, cy - size * 0.06);
            ctx.lineTo(cx + size * 0.12, cy + size * 0.31);
            ctx.lineTo(cx - size * 0.25, cy + size * 0.18);
            ctx.lineTo(cx - size * 0.29, cy - size * 0.12);
            ctx.closePath();
            ctx.fill();
        });

        const crown = makeSprite(120, (ctx, size) => {
            const cx = size / 2;
            const cy = size / 2;
            const glow = ctx.createRadialGradient(cx, cy, size * 0.15, cx, cy, size * 0.45);
            glow.addColorStop(0, 'rgba(255, 244, 184, 0.82)');
            glow.addColorStop(0.55, 'rgba(255, 181, 55, 0.34)');
            glow.addColorStop(1, 'rgba(255, 181, 55, 0)');
            ctx.fillStyle = glow;
            ctx.beginPath();
            ctx.arc(cx, cy, size * 0.46, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = '#ffbf3f';
            ctx.strokeStyle = '#8a4a0a';
            ctx.lineWidth = size * 0.025;
            ctx.beginPath();
            ctx.moveTo(cx - size * 0.32, cy + size * 0.18);
            ctx.lineTo(cx - size * 0.36, cy - size * 0.18);
            ctx.lineTo(cx - size * 0.14, cy + size * 0.02);
            ctx.lineTo(cx, cy - size * 0.28);
            ctx.lineTo(cx + size * 0.14, cy + size * 0.02);
            ctx.lineTo(cx + size * 0.36, cy - size * 0.18);
            ctx.lineTo(cx + size * 0.32, cy + size * 0.18);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            ['#ef4444', '#38bdf8', '#a855f7'].forEach((color, index) => {
                ctx.fillStyle = color;
                ctx.beginPath();
                ctx.arc(cx + (index - 1) * size * 0.18, cy + size * 0.03, size * 0.04, 0, Math.PI * 2);
                ctx.fill();
            });
        });

        const spark = makeSprite(54, (ctx, size) => {
            const cx = size / 2;
            const cy = size / 2;
            const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, size * 0.48);
            glow.addColorStop(0, '#fffbe0');
            glow.addColorStop(0.26, '#ffd66f');
            glow.addColorStop(0.64, 'rgba(255, 178, 63, 0.28)');
            glow.addColorStop(1, 'rgba(255, 178, 63, 0)');
            ctx.fillStyle = glow;
            ctx.beginPath();
            ctx.arc(cx, cy, size * 0.48, 0, Math.PI * 2);
            ctx.fill();
        });

        this.goldRainSprites = { coin, gem, crown, spark };
        return this.goldRainSprites;
    }

    spawnGoldRain() {
        const reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        const isCompact = window.innerWidth < 640;
        const totalDuration = 6000;
        const emitDuration = reducedMotion ? 2600 : 4400;
        const coinCount = reducedMotion ? 26 : (isCompact ? 58 : 96);
        const sparkCount = reducedMotion ? 14 : (isCompact ? 26 : 48);
        const rand = (min, max) => min + Math.random() * (max - min);
        const ease = t => t * t * (3 - 2 * t);
        const sprites = this.getGoldRainSprites();

        this.clearEffectTimeouts('gold_rain');
        if (this.goldRainAnimationId) {
            cancelAnimationFrame(this.goldRainAnimationId);
            this.goldRainAnimationId = null;
        }
        if (this.goldRainResizeHandler) {
            window.removeEventListener('resize', this.goldRainResizeHandler);
            this.goldRainResizeHandler = null;
        }
        document.querySelectorAll('.gold-rain-atmosphere, .gold-rain-canvas, .falling-coin.gold-rain-coin, .gold-rain-spark').forEach(el => el.remove());
        document.body.classList.add('fx-gold-rain');

        const atmosphere = document.createElement('div');
        atmosphere.className = 'gold-rain-atmosphere';
        atmosphere.innerHTML = `
            <div class="gold-rain-spotlight gold-rain-spotlight--left"></div>
            <div class="gold-rain-spotlight gold-rain-spotlight--right"></div>
            <div class="gold-rain-glint gold-rain-glint--one"></div>
            <div class="gold-rain-glint gold-rain-glint--two"></div>
        `;
        document.body.appendChild(atmosphere);

        const canvas = document.createElement('canvas');
        canvas.className = 'gold-rain-canvas';
        document.body.appendChild(canvas);

        const ctx = canvas.getContext('2d', { alpha: true });
        if (!ctx) {
            this.spawnEmojiRain(['dukat-icon', '🪙', '💎', '👑'], reducedMotion ? 16 : 34, 'gold_rain');
            this.scheduleEffectTimeout(() => {
                document.body.classList.remove('fx-gold-rain');
                if (atmosphere.parentNode) atmosphere.remove();
                if (canvas.parentNode) canvas.remove();
            }, totalDuration, 'gold_rain');
            return;
        }

        let width = 0;
        let height = 0;
        let renderScale = 1;
        const resizeCanvas = () => {
            width = Math.max(window.innerWidth || document.documentElement.clientWidth || 1, 1);
            height = Math.max(window.innerHeight || document.documentElement.clientHeight || 1, 1);
            const dpr = window.devicePixelRatio || 1;
            renderScale = reducedMotion ? 1 : Math.min(dpr, isCompact ? 1.2 : 1.75);
            canvas.width = Math.ceil(width * renderScale);
            canvas.height = Math.ceil(height * renderScale);
            canvas.style.width = `${width}px`;
            canvas.style.height = `${height}px`;
            ctx.setTransform(renderScale, 0, 0, renderScale, 0, 0);
        };

        resizeCanvas();
        this.goldRainResizeHandler = resizeCanvas;
        window.addEventListener('resize', this.goldRainResizeHandler, { passive: true });

        const makeCoinParticle = () => {
            const roll = Math.random();
            const isDukat = roll < 0.78;
            const isCrown = !isDukat && roll > 0.93;
            const delay = rand(0, emitDuration);
            const preferredFallDuration = rand(reducedMotion ? 2600 : 2800, reducedMotion ? 3900 : 5000);
            const remainingFallWindow = Math.max(1700, totalDuration - delay + 180);
            return {
                kind: isDukat ? 'coin' : (isCrown ? 'crown' : (roll < 0.86 ? 'coin' : 'gem')),
                delay,
                duration: Math.min(preferredFallDuration, remainingFallWindow),
                x: rand(-width * 0.04, width * 1.02),
                drift: rand(isCompact ? -70 : -150, isCompact ? 70 : 150),
                wobble: rand(isCompact ? 12 : 20, isCompact ? 44 : 70),
                phase: rand(0, Math.PI * 2),
                size: rand(isCompact ? 21 : 24, isCompact ? 35 : 46),
                rotate: rand(-0.7, 0.7),
                rotateSpeed: rand(-2.4, 2.4),
                spinSpeed: rand(7.2, 13.5),
                scale: rand(0.82, 1.18)
            };
        };

        const makeSparkParticle = () => {
            const delay = rand(120, emitDuration + 500);
            const preferredFallDuration = rand(1800, 3800);
            const remainingFallWindow = Math.max(1200, totalDuration - delay + 120);
            return {
                kind: 'spark',
                delay,
                duration: Math.min(preferredFallDuration, remainingFallWindow),
                x: rand(0, width),
                drift: rand(isCompact ? -45 : -95, isCompact ? 45 : 95),
                wobble: rand(4, 18),
                phase: rand(0, Math.PI * 2),
                size: rand(3, isCompact ? 7 : 9),
                rotate: rand(0, Math.PI),
                rotateSpeed: rand(-1.1, 1.1),
                spinSpeed: 0,
                scale: 1
            };
        };

        const particles = [
            ...Array.from({ length: coinCount }, makeCoinParticle),
            ...Array.from({ length: sparkCount }, makeSparkParticle)
        ];

        const drawSprite = (sprite, particle, progress, elapsed) => {
            const eased = ease(progress);
            const fadeIn = Math.min(1, progress / 0.08);
            const fadeOut = Math.min(1, (1 - progress) / 0.16);
            const alpha = Math.max(0, Math.min(fadeIn, fadeOut));
            if (alpha <= 0) return;

            const y = -particle.size * 2 + (height + particle.size * 4) * eased;
            const x = particle.x
                + particle.drift * Math.sin(progress * Math.PI * 0.92)
                + particle.wobble * Math.sin(progress * Math.PI * 3 + particle.phase);
            const rotation = particle.rotate + particle.rotateSpeed * progress;
            const spin = elapsed * particle.spinSpeed * 0.001 + particle.phase;
            const flip = particle.kind === 'coin' ? 0.24 + Math.abs(Math.cos(spin)) * 0.76 : 1;
            const size = particle.size * particle.scale;

            ctx.save();
            ctx.globalAlpha = alpha;
            ctx.translate(x, y);
            ctx.rotate(rotation);
            ctx.scale(flip, 1);
            ctx.drawImage(sprite, -size / 2, -size / 2, size, size);
            ctx.restore();
        };

        const startedAt = performance.now();
        const render = (now) => {
            const elapsed = now - startedAt;
            ctx.clearRect(0, 0, width, height);

            particles.forEach(particle => {
                const progress = (elapsed - particle.delay) / particle.duration;
                if (progress < 0 || progress > 1) return;
                const sprite = sprites[particle.kind] || sprites.coin;
                drawSprite(sprite, particle, progress, elapsed);
            });

            if (elapsed <= totalDuration + 620) {
                this.goldRainAnimationId = requestAnimationFrame(render);
            } else {
                this.goldRainAnimationId = null;
            }
        };

        this.goldRainAnimationId = requestAnimationFrame(render);

        this.scheduleEffectTimeout(() => {
            if (atmosphere.parentNode) atmosphere.classList.add('closing');
            document.body.classList.remove('fx-gold-rain');
        }, totalDuration - 650, 'gold_rain');

        this.scheduleEffectTimeout(() => {
            if (atmosphere.parentNode) atmosphere.remove();
            if (canvas.parentNode) canvas.remove();
            if (this.goldRainResizeHandler) {
                window.removeEventListener('resize', this.goldRainResizeHandler);
                this.goldRainResizeHandler = null;
            }
            if (this.goldRainAnimationId) {
                cancelAnimationFrame(this.goldRainAnimationId);
                this.goldRainAnimationId = null;
            }
        }, totalDuration + 650, 'gold_rain');
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
                el.className = 'falling-coin';
                el.style.left = Math.random() * 100 + 'vw'; el.style.animationDuration = (Math.random() * 2 + 1) + 's';
                document.body.appendChild(el);
                this.scheduleEffectTimeout(() => el.remove(), 3000, group);
            }, Math.random() * 2000, group);
        }
    }

    spawnWeddingRain(group = 'balkan') {
        document.querySelectorAll('.wedding-rain').forEach(layer => layer.remove());

        const compact = window.matchMedia?.('(max-width: 760px)').matches;
        const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
        const count = reducedMotion ? 18 : (compact ? 28 : 40);
        const symbols = ['💶', '💵', '🥂', '🍾', '💖', '🎵', '🍻'];
        const layer = document.createElement('div');
        layer.className = 'wedding-rain';
        layer.setAttribute('aria-hidden', 'true');

        const fragment = document.createDocumentFragment();
        for (let i = 0; i < count; i++) {
            const particle = document.createElement('span');
            particle.className = 'wedding-particle';
            particle.innerText = symbols[i % symbols.length];
            particle.style.setProperty('--wedding-x', (2 + Math.random() * 96).toFixed(2) + 'vw');
            particle.style.setProperty('--wedding-drift', (-55 + Math.random() * 110).toFixed(1) + 'px');
            particle.style.setProperty('--wedding-delay', (Math.random() * 2.5).toFixed(2) + 's');
            particle.style.setProperty('--wedding-duration', (3.8 + Math.random() * 2.2).toFixed(2) + 's');
            particle.style.setProperty('--wedding-size', (compact ? 1.05 + Math.random() * 0.9 : 1.2 + Math.random() * 1.05).toFixed(2) + 'rem');
            particle.style.setProperty('--wedding-spin', (-220 + Math.random() * 440).toFixed(0) + 'deg');
            fragment.appendChild(particle);
        }

        layer.appendChild(fragment);
        document.body.appendChild(layer);
        this.scheduleEffectTimeout(() => layer.remove(), 8500, group);
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

    spawnFireflies(count = 52, group = 'fireflies') {
        document.querySelectorAll('.firefly-field').forEach(field => field.remove());

        const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
        const compact = window.matchMedia?.('(max-width: 760px)').matches;
        const particleCount = reducedMotion ? Math.min(count, 24) : (compact ? Math.min(count, 38) : count);
        const tone = this.getEffectSurfaceTone();
        const field = document.createElement('div');
        field.className = `firefly-field firefly-field--${tone}`;
        field.setAttribute('aria-hidden', 'true');

        const fragment = document.createDocumentFragment();
        for (let i = 0; i < particleCount; i++) {
            const fly = document.createElement('span');
            fly.className = `magic-firefly magic-firefly--${i % 3}`;
            fly.style.setProperty('--ff-x', (3 + Math.random() * 94).toFixed(2) + 'vw');
            fly.style.setProperty('--ff-y', (10 + Math.random() * 86).toFixed(2) + 'vh');
            fly.style.setProperty('--ff-dx-a', (-75 + Math.random() * 150).toFixed(1) + 'px');
            fly.style.setProperty('--ff-dy-a', (-45 - Math.random() * 105).toFixed(1) + 'px');
            fly.style.setProperty('--ff-dx-b', (-110 + Math.random() * 220).toFixed(1) + 'px');
            fly.style.setProperty('--ff-dy-b', (-120 - Math.random() * 190).toFixed(1) + 'px');
            fly.style.setProperty('--ff-size', (compact ? 5 + Math.random() * 5 : 6 + Math.random() * 7).toFixed(1) + 'px');
            fly.style.setProperty('--ff-delay', (i < 12 ? Math.random() * 0.25 : Math.random() * 1.35).toFixed(2) + 's');
            fly.style.setProperty('--ff-duration', (reducedMotion ? 5.6 : 4.8 + Math.random() * 2.2).toFixed(2) + 's');
            fly.style.setProperty('--ff-pulse', (0.72 + Math.random() * 0.75).toFixed(2) + 's');
            fly.innerHTML = '<span class="magic-firefly__trail"></span><span class="magic-firefly__light"></span>';
            fragment.appendChild(fly);
        }

        field.appendChild(fragment);
        document.body.appendChild(field);
        this.scheduleEffectTimeout(() => field.remove(), reducedMotion ? 6500 : 7800, group);
    }

    spawnBubbles(count, group = 'bubbles') {
        const emojis = ['🫧', '🫧', '⚪']; 
        for (let i = 0; i < count; i++) {
            this.scheduleEffectTimeout(() => {
                const el = document.createElement('div');
                el.innerText = emojis[Math.floor(Math.random() * emojis.length)];
                el.className = 'magic-bubble';
                el.style.left = Math.random() * 100 + 'vw';
                el.style.setProperty('--rnd-x', (Math.random() * 150 - 75) + 'px'); 
                
                el.style.animationDuration = (Math.random() * 1.5 + 3.5) + 's';
                
                const size = Math.random() * 1.5 + 1; 
                el.style.fontSize = size + 'rem';

                document.body.appendChild(el);
                
                this.scheduleEffectTimeout(() => el.remove(), 5500, group);
            }, Math.random() * 2000, group);
        }
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
        this.scheduleEffectTimeout(() => this.trigger('gold_rain'), 1000, 'celebrate_win');
    }
    
    stop() {
        this.clearEffectTimeouts();
        if (window.app?.soundMgr?.stopBalkanMusic) {
            window.app.soundMgr.stopBalkanMusic(true);
        }
        document.body.classList.remove('fx-glass', 'fx-neon_pulse', 'fx-balkan', 'fx-ice-age', 'fx-thunder-shake', 'fx-cosmic_dust', 'fx-ufo_abduction', 'fx-dragon_fire', 'fx-royal_yamb', 'fx-gold-rain');

        if (this.confettiAnimationId) {
            cancelAnimationFrame(this.confettiAnimationId);
            this.confettiAnimationId = null;
        }

        if (this.goldRainAnimationId) {
            cancelAnimationFrame(this.goldRainAnimationId);
            this.goldRainAnimationId = null;
        }
        if (this.goldRainResizeHandler) {
            window.removeEventListener('resize', this.goldRainResizeHandler);
            this.goldRainResizeHandler = null;
        }

        const confettiCanvas = document.getElementById('confetti-canvas');
        if (confettiCanvas) {
            const confettiCtx = confettiCanvas.getContext('2d');
            if (confettiCtx) confettiCtx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
        }
        
        document.querySelectorAll('.falling-coin, .firefly, .firefly-field, .trumpet-icon, .trumpet-icon-v2, .kafana-overlay, .wedding-rain, .firework-particle, .ice-overlay-container, .ice-age-atmosphere, .black-hole-container, .supernova-container, .drone-night-sky, .drone-text, .drone-dot, .magic-bubble, .anim-thunder, .fw-rocket, .fw-flash, .fw-particle, .cosmic-container, .ufo-abduction-container, .ufo-abducted-score, .ufo-target-ray, .dragon-container, .stardust-layer, .dragon-flames, .dragon-embers, .royal-yamb-container, .gold-rain-atmosphere, .gold-rain-canvas, .gold-rain-spark').forEach(e => e.remove());
        
        document.querySelectorAll('.active-ice-table').forEach(tbl => tbl.classList.remove('active-ice-table'));
        document.querySelectorAll('.anim-ice-age-table').forEach(tbl => tbl.classList.remove('anim-ice-age-table'));
        document.querySelectorAll('.anim-suck-in').forEach(tbl => tbl.classList.remove('anim-suck-in'));
        document.querySelectorAll('.anim-black-hole-table').forEach(tbl => tbl.classList.remove('anim-black-hole-table'));
        document.querySelectorAll('.anim-supernova-table').forEach(tbl => tbl.classList.remove('anim-supernova-table'));
        document.querySelectorAll('.anim-supernova-table--compact').forEach(tbl => tbl.classList.remove('anim-supernova-table--compact'));
        document.querySelectorAll('.anim-neon-pulse').forEach(tbl => tbl.classList.remove('anim-neon-pulse'));
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
        }
        
        this.unlocked = savedUnlocked;
        localStorage.setItem(this.unlockKey, JSON.stringify(this.unlocked));
        
        this.balance = parseInt(localStorage.getItem('yamb_dukati')) || 0;
        
        if (this.type === 'skin') {
            this.activeKey = 'yamb_active_skin';
            this.activeItem = localStorage.getItem(this.activeKey) || 'default';
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
        if(this.balanceEl) this.balanceEl.innerText = this.balance;
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
        return `<img class="riznica-status-soft-clay-icon ${className}" src="assets/easter-soft-clay/treasury/${iconName}-v2.png?v=1" alt="" aria-hidden="true" decoding="async"><img class="riznica-status-desert-soft-clay-icon ${className}" src="assets/desert-soft-clay/treasury/${iconName}.png?v=3" alt="" aria-hidden="true" decoding="async"><img class="riznica-status-nebula-soft-clay-icon ${className}" src="assets/severna-soft-clay/treasury/${iconName}.png?v=1" alt="" aria-hidden="true" decoding="async">`;
    }

    getTreasuryRewardVideoIcon() {
        return '<span class="riznica-item-reward-video-fallback" aria-hidden="true">📺</span><img class="riznica-item-reward-video-soft-clay-icon" src="assets/easter-soft-clay/treasury/reward-video-v2.png?v=1" alt="" aria-hidden="true" decoding="async"><img class="riznica-item-reward-video-desert-soft-clay-icon" src="assets/desert-soft-clay/economy/rewarded-video.png?v=1" alt="" aria-hidden="true" decoding="async"><img class="riznica-item-reward-video-nebula-soft-clay-icon" src="assets/severna-soft-clay/economy/rewarded-video-v3.png?v=1" alt="" aria-hidden="true" decoding="async">';
    }

    getTreasuryInsufficientIconPath() {
        const activeTheme = localStorage.getItem('yamb_theme') || 'dark';
        if (activeTheme === 'severna') return 'assets/severna-soft-clay/treasury/status-insufficient.png?v=1';
        return activeTheme === 'desert'
            ? 'assets/desert-soft-clay/treasury/status-insufficient.png?v=3'
            : 'assets/easter-soft-clay/treasury/status-insufficient-v2.png?v=1';
    }

    render() {
        if (!this.container) return;
        this.container.innerHTML = '';
        const groupedItems = this.groupByCategory();

        for (const [categoryName, items] of Object.entries(groupedItems)) {
            const section = document.createElement('div');
            section.className = 'category-section';
            const categoryMeta = this.getEasterTreasuryCategoryMeta(categoryName);
            const categoryHtml = categoryMeta
                ? `<span class="riznica-category-fallback" aria-hidden="true">${categoryName.match(/^[^\s]+/)?.[0] || ''}</span><img class="riznica-category-soft-clay-icon" src="assets/easter-soft-clay/treasury/collection-${categoryMeta.type}-v2.png?v=1" alt="" aria-hidden="true" decoding="async"><img class="riznica-category-desert-soft-clay-icon" src="assets/desert-soft-clay/treasury/collection-${categoryMeta.type}.png?v=3" alt="" aria-hidden="true" decoding="async"><img class="riznica-category-nebula-soft-clay-icon" src="assets/severna-soft-clay/treasury/collection-${categoryMeta.type}.png?v=1" alt="" aria-hidden="true" decoding="async"><span>${categoryMeta.label}</span>`
                : categoryName;
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
                    visualHtml = `<div class="dice-preview preview-${item.id}">⚅</div>`;
                } else if (this.type === 'effect') {
                    visualHtml = `<div class="effect-preview-box ${item.cssClass}">${item.innerHtml || ''}</div>`;
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
                        priceHtml = `<div class="price riznica-item-status riznica-item-status--owned">${this.getEasterTreasuryStatusIcon('status-owned')}<span>${_safeT('btn_bought')}</span></div>`;
                    } else {
                        // NOVO: Provera da li se otključava reklamama
                        if (item.adUnlock) {
                            const watchToUnlockText = String(_safeT('shop_watch_to_unlock') || 'Gledaj 📺 za otključavanje')
                                .replace('📺', this.getTreasuryRewardVideoIcon());
                            priceHtml = `<div class="price riznica-reward-video-copy" style="color: var(--text-muted); font-size: 0.75rem;">${watchToUnlockText}</div>`;
                        } else {
                            let price = item.price;
                            let displayPrice = `${price} ${_safeT('balance')}`;
                            const activeDiscount = this.getActiveDiscount(item.id);
                            
                            if (activeDiscount) {
                                const discounted = this.getDiscountedPrice(item, activeDiscount);
                                displayPrice = `<span class="old-price">${price}</span> ${discounted} ${_safeT('balance')}`;
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
                    btnHtml = `<div class="desc">${isUnlocked ? itemDesc : '??? (🔒)'}</div>`;
                }

                card.innerHTML = `
                    ${visualHtml}
                    <div class="title">${itemName}</div>
                    ${this.type === 'effect' ? `<div class="duration">⏱ ${resolveText(item.duration)}</div>` : ''} ${this.type !== 'trophy' ? `<div class="desc">${itemDesc || ''}</div>` : ''}
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
        if (!itemExists || !this.unlocked.includes(itemId)) {
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
        this.bannerVisible = false;
        this.bannerSlot = null;
        this.bannerLoaded = false;
        this.lastBannerMargin = null;
        this.bannerLoadTimer = null;
        this.bannerSyncTimer = null;
        this.bannerTestMode = localStorage.getItem('yamb_admob_test_ads') === '1';
        
        this.ads = {
            rewarded: { isReady: false, isLoading: false, retryCount: 0 },
            interstitial: { isReady: false, isLoading: false, retryCount: 0 }
        };
        
        this.baseRetryDelay = 1000;   
        this.maxRetryDelay = 30000;   
        this.rewardSsvInfo = null;
        this.activeRewardSsvInfo = null;
        this.lastRewardSsvInfo = null;
        this.currentRewardOptions = null;
        this.pendingRewardOptions = null;
        this.activeRewardEarned = false;
        this.rewardDismissTimer = null;
        this.rewardClaimRetryTimeoutMs = 60000;
        
        this.uiSelectors = ['.btn-ad-double', '.daily-glass-btn-double', '.btn-add-coins', '.btn-discount', '.btn-ad-state-aware'];
    }

    async initialize() {
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
                    this.triggerHighPriorityLoad('rewarded');
                    this.triggerHighPriorityLoad('interstitial');

                    document.addEventListener("resume", () => {
                        this.triggerHighPriorityLoad('rewarded');
                        this.triggerHighPriorityLoad('interstitial');
                    }, false);

                    window.addEventListener("visibilitychange", () => {
                        if (document.visibilityState === 'visible') {
                            this.triggerHighPriorityLoad('rewarded');
                            this.triggerHighPriorityLoad('interstitial');
                        }
                    });
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

        const resolve = this.rewardResolve;
        this.rewardResolve = null;

        if (success) {
            this.lastRewardSsvInfo = this.activeRewardSsvInfo || this.rewardSsvInfo || this.lastRewardSsvInfo || null;
        }

        this.activeRewardSsvInfo = null;
        this.activeRewardEarned = false;

        if (resolve) resolve(!!success);
    }

    handleAdLoaded(type) {
        this.ads[type].isReady = true; 
        this.ads[type].isLoading = false; 
        this.ads[type].retryCount = 0; 
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

    handleAdFailed(type, err) {
        this.ads[type].isReady = false; 
        this.ads[type].isLoading = false;
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
            this.ads[type].retryCount++;
            const nextDelay = Math.min(this.baseRetryDelay * Math.pow(1.2, this.ads[type].retryCount), this.maxRetryDelay);
            setTimeout(() => this.preloadAd(type, retryOptions), nextDelay);
            return;
        }

        this.ads[type].retryCount++;
        const nextDelay = Math.min(this.baseRetryDelay * Math.pow(1.2, this.ads[type].retryCount), this.maxRetryDelay);
        setTimeout(() => this.preloadAd(type), nextDelay);
    }

    handleAdDismissed(type) {
        this.ads[type].isReady = false;
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

    isRewardVideoReadyFor(rewardOptions = {}) {
        return !!(this.ads.rewarded.isReady && this.isRewardSsvReadyForCurrentUser(rewardOptions));
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
            result = await claimOnce();
            if (!this.isRewardClaimRetryable(result, nonce)) return result;

            const remaining = deadline - Date.now();
            if (remaining <= 0) break;

            const retryAfterMs = Math.max(1000, Math.min(5000, parseInt(result.retryAfterMs) || 2000));
            await this.waitForRewardSsvEvent(nonce, context, Math.min(retryAfterMs, remaining));
        } while (Date.now() < deadline);

        return result || { ok: false, reason: 'ad_verification_pending', permanent: false };
    }

    async preloadAd(type, rewardOptions = {}) {
        if (!this.adMobPlugin || !navigator.onLine) return; 
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
        if (type === 'rewarded') {
            if (!this.ads.rewarded) return;

            const matchingReady = this.ads.rewarded.isReady && this.isRewardSsvReadyForCurrentUser(rewardOptions);
            const matchingLoading = this.ads.rewarded.isLoading && this.isRewardSsvInfoMatch(this.rewardSsvInfo, rewardOptions);
            if (matchingReady || matchingLoading) return;

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

            this.ads.rewarded.retryCount = 0;
            this.preloadAd('rewarded', rewardOptions);
            return;
        }

        if (!this.ads[type] || (!this.ads[type].isLoading && !this.ads[type].isReady)) {
            if (this.ads[type]) this.ads[type].retryCount = 0; 
            this.preloadAd(type, rewardOptions);
        }
    }

    loadRewardAd() { this.preloadAd('rewarded'); }
    loadInterstitialAd() { this.preloadAd('interstitial'); }
    prepareReward(rewardOptions = {}) { this.triggerHighPriorityLoad('rewarded', rewardOptions); }

    async waitForRewardVideoReadyFor(rewardOptions = {}, timeoutMs = 12000) {
        const waitMs = Math.max(1000, Math.min(20000, parseInt(timeoutMs, 10) || 12000));
        const deadline = Date.now() + waitMs;

        this.triggerHighPriorityLoad('rewarded', rewardOptions);

        while (Date.now() < deadline) {
            if (this.isRewardVideoReadyFor(rewardOptions)) return true;
            await new Promise(resolve => setTimeout(resolve, 250));
        }

        return this.isRewardVideoReadyFor(rewardOptions);
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
        if (!this.adMobPlugin || !slotEl || !navigator.onLine) return;

        const isSameSlot = this.bannerSlot === slotEl;
        this.bannerSlot = slotEl;
        const margin = 72;
        if (this.bannerVisible && this.lastBannerMargin === margin && isSameSlot) return;

        this.bannerLoaded = false;
        this.setBannerSlotState('loading', _safeT('economy_ad_loading') || 'Učitavanje oglasa...');

        await this.removeCurrentBanner();
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
        this.uiSelectors.forEach(selector => {
            const buttons = document.querySelectorAll(selector);
            buttons.forEach(btn => {
                if (ready) {
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
        return new Promise(async (resolve) => {
            if (!this.adMobPlugin) { resolve(false); return; }
            const readyForReward = await this.waitForRewardVideoReadyFor(rewardOptions);
            if (readyForReward) {
                try {
                    this.rewardResolve = resolve;
                    this.activeRewardSsvInfo = this.rewardSsvInfo;
                    this.activeRewardEarned = false;
                    const rewardItem = await this.adMobPlugin.showRewardVideoAd();
                    if (rewardItem && this.rewardResolve) this.settleRewardVideo(true);
                } catch (e) {
                    this.settleRewardVideo(false); this.handleAdFailed('rewarded', e);
                }
            } else {
                if (typeof window.showNotification === 'function') window.showNotification(_safeT('info_title') || "INFO", _safeT('ad_not_ready') || "Reklama se učitava. Pokušajte za par sekundi.");
                this.triggerHighPriorityLoad('rewarded', rewardOptions); resolve(false);
            }
        });
    }

    showInterstitial() {
        return new Promise(async (resolve) => {
            if (!this.adMobPlugin) { resolve(false); return; }
            if (this.ads.interstitial.isReady) {
                try {
                    await this.adMobPlugin.showInterstitial(); resolve(true);
                } catch (e) {
                    this.handleAdFailed('interstitial', e); resolve(false);
                }
            } else {
                this.triggerHighPriorityLoad('interstitial'); resolve(false);
            }
        });
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
