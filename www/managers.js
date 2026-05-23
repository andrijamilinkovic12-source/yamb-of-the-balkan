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
                if (s.highScore && !s.highscore) s.highscore = s.highScore;
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

    alert(text, title) {
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
            
            this.setup(safeTitle, text, false);
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
        this.effectTimeouts = [];
    }
    
    applyPermanent(type) {
        this.stop(); 
        if (!type || type === 'none') return;
    }
    
    trigger(type) {
        if (type === 'confetti') this.spawnConfetti();
        if (type === 'gold_rain') this.spawnGoldRain();
        if (type === 'fireflies') this.spawnFloatingEmoji(['✨', '🌟', '💫', '🧚'], 40);
        if (type === 'bubbles') this.spawnBubbles(35); 
        
        if (type === 'ice_age') {
            let targetTable = null;
            const tables = document.querySelectorAll('.player-table');
            tables.forEach(tbl => { if (tbl.style.opacity === '1' || tbl.style.borderColor.includes('gold') || tbl.style.borderColor.includes('224')) { targetTable = tbl; } });
            if (!targetTable && tables.length > 0) targetTable = tables[0];

            if (targetTable) {
                targetTable.classList.add('active-ice-table');
                const container = document.createElement('div');
                container.className = 'ice-overlay-container';
                container.innerHTML = `<div class="ice-glass"></div><div class="ice-frost-border"></div><div class="ice-flake-center">❄️</div>`;
                targetTable.appendChild(container);
                setTimeout(() => {
                    container.style.animation = 'iceMeltOut 1.5s forwards';
                    targetTable.classList.remove('active-ice-table');
                    setTimeout(() => { if (container.parentNode) container.remove(); }, 1500);
                }, 6000);
            }
        }

        if (type === 'black_hole') {
            let targetTable = null;
            const tables = document.querySelectorAll('.player-table');
            tables.forEach(tbl => { if (tbl.style.opacity === '1' || tbl.style.borderColor.includes('gold') || tbl.style.borderColor.includes('224')) { targetTable = tbl; } });
            if (!targetTable && tables.length > 0) targetTable = tables[0];

            if (targetTable) {
                const rect = targetTable.getBoundingClientRect();
                const bhContainer = document.createElement('div');
                bhContainer.className = 'black-hole-container';
                bhContainer.style.position = 'fixed';
                bhContainer.style.top = (rect.top + rect.height / 2) + 'px';
                bhContainer.style.left = (rect.left + rect.width / 2) + 'px';
                bhContainer.innerHTML = `<div class="bh-core"></div><div class="bh-ring"></div><div class="bh-particles"></div>`;
                document.body.appendChild(bhContainer);
                targetTable.classList.add('anim-suck-in');
                setTimeout(() => { targetTable.classList.remove('anim-suck-in'); if (bhContainer.parentNode) bhContainer.remove(); }, 6000);
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
                const snContainer = document.createElement('div');
                snContainer.className = 'supernova-container';
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
                const duration = 7500;
                let rafId = 0;

                const resizeCanvas = () => {
                    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
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

                const particles = Array.from({ length: 78 }, (_, i) => {
                    const a = (i * 2.3999632297) + (i % 7) * 0.09;
                    const lane = i % 4;
                    return {
                        a,
                        r: 90 + lane * 42 + (i % 13) * 11,
                        size: 0.9 + (i % 5) * 0.34,
                        speed: 0.78 + (i % 11) * 0.025,
                        drift: ((i % 9) - 4) * 0.10,
                        delay: (i % 13) * 0.012
                    };
                });
                const glassCuts = Array.from({ length: 10 }, (_, i) => ({
                    a: (Math.PI * 2 * i) / 10 + ((i % 4) - 1.5) * 0.055,
                    start: 110 + (i % 4) * 22,
                    len: 115 + (i % 6) * 22,
                    width: 0.7 + (i % 3) * 0.28
                }));

                const drawRing = (x, y, radius, alpha, width, blur) => {
                    if (alpha <= 0) return;
                    ctx.save();
                    ctx.globalAlpha = alpha;
                    ctx.shadowColor = 'rgba(214,235,255,0.85)';
                    ctx.shadowBlur = blur;
                    ctx.strokeStyle = 'rgba(232,244,255,0.72)';
                    ctx.lineWidth = width;
                    ctx.beginPath();
                    ctx.arc(x, y, radius, 0, Math.PI * 2);
                    ctx.stroke();
                    ctx.restore();
                };

                const renderFrame = start => now => {
                    const elapsed = now - start;
                    const p = clamp01(elapsed / duration);
                    const w = window.innerWidth;
                    const h = window.innerHeight;
                    const maxR = Math.hypot(Math.max(center.x, w - center.x), Math.max(center.y, h - center.y));
                    const birth = easeInOut(p / 0.18);
                    const blast = easeOutCubic((p - 0.14) / 0.46);
                    const fade = 1 - easeInOut((p - 0.82) / 0.18);
                    const alive = clamp01(fade);

                    ctx.clearRect(0, 0, w, h);
                    ctx.globalCompositeOperation = 'source-over';

                    const bg = ctx.createRadialGradient(center.x, center.y, 0, center.x, center.y, maxR * 0.9);
                    bg.addColorStop(0, `rgba(232,248,255,${0.24 * alive})`);
                    bg.addColorStop(0.22, `rgba(73,121,178,${0.16 * alive})`);
                    bg.addColorStop(0.62, `rgba(5,14,29,${0.18 * alive})`);
                    bg.addColorStop(1, `rgba(0,0,0,${0.34 * alive})`);
                    ctx.fillStyle = bg;
                    ctx.fillRect(0, 0, w, h);

                    ctx.globalCompositeOperation = 'screen';
                    const coreR = 14 + birth * 26 + blast * 82;
                    const core = ctx.createRadialGradient(center.x, center.y, 0, center.x, center.y, coreR * 3.2);
                    core.addColorStop(0, `rgba(255,255,255,${0.92 * alive})`);
                    core.addColorStop(0.12, `rgba(224,244,255,${0.78 * alive})`);
                    core.addColorStop(0.34, `rgba(116,184,242,${0.50 * alive})`);
                    core.addColorStop(1, 'rgba(116,184,242,0)');
                    ctx.fillStyle = core;
                    ctx.beginPath();
                    ctx.arc(center.x, center.y, coreR * 3.2, 0, Math.PI * 2);
                    ctx.fill();

                    const shockR = 42 + blast * Math.min(maxR * 0.72, 620);
                    const sphereAlpha = Math.sin(clamp01((p - 0.16) / 0.64) * Math.PI) * alive;
                    if (sphereAlpha > 0) {
                        ctx.save();
                        ctx.globalCompositeOperation = 'screen';
                        const shell = ctx.createRadialGradient(center.x, center.y, shockR * 0.18, center.x, center.y, shockR * 0.96);
                        shell.addColorStop(0, `rgba(255,255,255,${0.04 * sphereAlpha})`);
                        shell.addColorStop(0.48, `rgba(110,177,235,${0.055 * sphereAlpha})`);
                        shell.addColorStop(0.72, `rgba(232,246,255,${0.18 * sphereAlpha})`);
                        shell.addColorStop(0.78, `rgba(120,190,245,${0.075 * sphereAlpha})`);
                        shell.addColorStop(1, 'rgba(120,190,245,0)');
                        ctx.fillStyle = shell;
                        ctx.beginPath();
                        ctx.arc(center.x, center.y, shockR * 0.98, 0, Math.PI * 2);
                        ctx.fill();
                        ctx.restore();
                    }
                    drawRing(center.x, center.y, shockR, 0.56 * (1 - blast * 0.55) * alive, 1.4, 16);
                    drawRing(center.x, center.y, shockR * 0.72, 0.25 * alive, 0.8, 8);
                    drawRing(center.x, center.y, shockR * 1.06, 0.12 * alive, 1, 20);

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
                        grad.addColorStop(0.42, 'rgba(235,248,255,0.22)');
                        grad.addColorStop(1, 'rgba(135,196,255,0)');
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
                    for (let i = 0; i < 12; i++) {
                        const local = easeOutCubic((p - 0.2) / 0.58);
                        const base = shockR * (0.42 + (i % 4) * 0.11) + i * 6;
                        const start = i * 0.71 + p * 0.35;
                        const span = 0.26 + (i % 3) * 0.08;
                        const alpha = (0.20 + (i % 4) * 0.018) * alive * Math.sin(clamp01((p - 0.18) / 0.42) * Math.PI);
                        ctx.globalAlpha = Math.max(0, alpha);
                        ctx.strokeStyle = i % 2 ? 'rgba(205,236,255,0.66)' : 'rgba(255,255,255,0.58)';
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
                    for (let i = 0; i < 11; i++) {
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
                        grad.addColorStop(0.5, `rgba(185,228,255,${alpha})`);
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
                        const alpha = Math.sin(life * Math.PI) * 0.62 * alive;
                        ctx.fillStyle = `rgba(210,236,255,${alpha})`;
                        ctx.beginPath();
                        ctx.arc(x, y, pt.size * (1 + e * 0.8), 0, Math.PI * 2);
                        ctx.fill();
                    });

                    ctx.globalCompositeOperation = 'lighter';
                    for (let i = 0; i < 5; i++) {
                        const rr = coreR * (1.4 + i * 0.55) + blast * i * 12;
                        drawRing(center.x, center.y, rr, (0.16 - i * 0.022) * alive, 0.7, 8);
                    }

                    if (p < 1 && snContainer.isConnected) {
                        rafId = requestAnimationFrame(renderFrame(start));
                    }
                };

                rafId = requestAnimationFrame(now => renderFrame(now)(now));
                targetTable.classList.add('anim-supernova-table');
                
                setTimeout(() => { 
                    cancelAnimationFrame(rafId);
                    targetTable.classList.remove('anim-supernova-table'); 
                    if (snContainer.parentNode) snContainer.remove(); 
                }, 7500);
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
                
                setTimeout(() => { 
                    targetTable.classList.remove('anim-neon-pulse'); 
                    document.body.classList.remove('fx-neon_pulse'); 
                }, 5000); 
            }
        }

        if (type === 'drones') {
            const sky = document.createElement('div');
            sky.className = 'drone-night-sky';
            document.body.appendChild(sky);

            let fullName = _safeT('hs_player') || "IGRAČ";
            if (window.app && window.app.players && window.app.players[window.app.currentPlayerIdx]) {
                fullName = window.app.players[window.app.currentPlayerIdx];
            } else if (window.app && window.app.playerName) {
                fullName = window.app.playerName;
            }
            
            let firstName = fullName.trim().split(/\s+/)[0]; 
            firstName = firstName.substring(0, 12); 

            const textEl = document.createElement('div');
            textEl.className = 'drone-text';
            textEl.innerText = firstName;
            document.body.appendChild(textEl);

            const colors = ['#00d4ff', '#ffffff', '#00ffcc', '#aa00ff'];
            for (let i = 0; i < 60; i++) {
                const dot = document.createElement('div');
                dot.className = 'drone-dot';
                
                dot.style.setProperty('--sx', (20 + Math.random() * 60) + 'vw');
                dot.style.setProperty('--dx', (10 + Math.random() * 80) + 'vw');
                dot.style.setProperty('--dx2', (Math.random() * 80 + 10) + 'vw');
                dot.style.setProperty('--dy2', (Math.random() * 40 + 20) + 'vh');
                dot.style.setProperty('--dx3', (Math.random() * 100) + 'vw');
                
                const color = colors[Math.floor(Math.random() * colors.length)];
                dot.style.color = color;
                dot.style.background = '#fff';

                document.body.appendChild(dot);
                setTimeout(() => { if(dot.parentNode) dot.remove(); }, 8000);
            }

            if(window.app && window.app.soundMgr && window.app.soundMgr.epicDroneShow) {
                window.app.soundMgr.epicDroneShow();
            }

            setTimeout(() => {
                if(sky.parentNode) sky.remove();
                if(textEl.parentNode) textEl.remove();
            }, 8000);
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
            
            setTimeout(() => {
                if(flash.parentNode) flash.remove();
                document.body.classList.remove('fx-thunder-shake');
            }, 4500); 
        }

        if (type === 'balkan') {
            document.body.classList.add('fx-balkan');
            
            const bg = document.createElement('div');
            bg.className = 'kafana-overlay';
            document.body.appendChild(bg);

            const tr1 = document.createElement('div'); tr1.innerText = '🎺'; tr1.className = 'trumpet-icon-v2 trumpet-left'; tr1.style.top = '15vh';
            const tr2 = document.createElement('div'); tr2.innerText = '🎺'; tr2.className = 'trumpet-icon-v2 trumpet-left'; tr2.style.top = '55vh'; tr2.style.animationDelay = '0.2s';
            const tr3 = document.createElement('div'); tr3.innerText = '🎺'; tr3.className = 'trumpet-icon-v2 trumpet-right'; tr3.style.top = '25vh';
            const tr4 = document.createElement('div'); tr4.innerText = '🎺'; tr4.className = 'trumpet-icon-v2 trumpet-right'; tr4.style.top = '65vh'; tr4.style.animationDelay = '0.3s';
            
            document.body.appendChild(tr1); document.body.appendChild(tr2); document.body.appendChild(tr3); document.body.appendChild(tr4);

            this.spawnEmojiRain(['💶', '💵', '🥂', '🍾', '🍖', '💖', '🎵', '🍻'], 80);

            if (window.app && window.app.soundMgr && window.app.soundMgr.balkanTrumpet) {
                window.app.soundMgr.balkanTrumpet();
            }

            setTimeout(() => { 
                document.body.classList.remove('fx-balkan');
                if(bg.parentNode) bg.remove(); 
                if(tr1.parentNode) tr1.remove(); 
                if(tr2.parentNode) tr2.remove(); 
                if(tr3.parentNode) tr3.remove(); 
                if(tr4.parentNode) tr4.remove(); 
            }, 8500); 
        }
        
        if (type === 'fireworks') {
             for(let i=0; i<12; i++) { 
                 setTimeout(() => this.spawnRealFirework(), i * 500 + Math.random() * 400); 
             }
        }
        
        if (type === 'cosmic_dust') {
            document.body.classList.add('fx-cosmic_dust');
            
            const container = document.createElement('div');
            container.className = 'cosmic-container';
            container.innerHTML = '<div class="stardust-layer layer-1"></div><div class="stardust-layer layer-2"></div><div class="stardust-layer layer-3"></div>';
            document.body.appendChild(container);
            
            setTimeout(() => {
                document.body.classList.remove('fx-cosmic_dust');
                if(container.parentNode) container.remove();
            }, 6000); 
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

            setTimeout(() => {
                document.body.classList.remove('fx-dragon_fire');
                if(container.parentNode) container.remove();
            }, 5500); 
        }

        if (type === 'royal_yamb') {
            document.body.classList.add('fx-royal_yamb');

            const container = document.createElement('div');
            container.className = 'royal-yamb-container';
            container.innerHTML = `
                <div class="royal-yamb-spotlight spotlight-left"></div>
                <div class="royal-yamb-spotlight spotlight-right"></div>
                <div class="royal-yamb-spotlight spotlight-center"></div>
                <div class="royal-yamb-rays"></div>
                <div class="royal-yamb-stage-glow"></div>
                <canvas class="royal-yamb-canvas"></canvas>
                <div class="royal-yamb-crown-active">&#128081;</div>
                <div class="royal-yamb-title-active">YAMB</div>
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

            setTimeout(() => {
                document.body.classList.remove('fx-royal_yamb');
                if (container.parentNode) container.remove();
            }, 8000);
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

        setTimeout(() => {
            if (!container.isConnected || !document.body.classList.contains('fx-ufo_abduction')) return;
            this.abductVisibleScores(container, targetTable, ufoX, ufoY);
        }, 1050);

        setTimeout(() => {
            document.body.classList.remove('fx-ufo_abduction');
            targetTable.classList.remove('anim-ufo-table');
            targetTable.querySelectorAll('.ufo-score-dimmed').forEach(btn => btn.classList.remove('ufo-score-dimmed'));
            document.querySelectorAll('.ufo-abducted-score, .ufo-target-ray').forEach(el => el.remove());
            if (container.parentNode) container.remove();
        }, 7500);
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

        setTimeout(() => {
            if (ray.parentNode) ray.remove();
        }, delay + duration + 120);
    }

    playRoyalYambAccents() {
        const sound = window.app && window.app.soundMgr;
        if (!sound) return;

        [760, 1840, 3120, 4680].forEach(delay => {
            setTimeout(() => {
                if (typeof sound.fireworkLaunch === 'function') sound.fireworkLaunch();
                setTimeout(() => {
                    if (typeof sound.fireworkExplode === 'function') sound.fireworkExplode();
                }, 240);
            }, delay);
        });
    }

    runRoyalYambCanvas(canvas, duration = 8000) {
        if (!canvas || !canvas.getContext) return;

        const ctx = canvas.getContext('2d', { alpha: true });
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
            dpr = Math.min(window.devicePixelRatio || 1, compact ? 1.15 : 1.45);
            canvas.width = Math.floor(width * dpr);
            canvas.height = Math.floor(height * dpr);
            canvas.style.width = '100vw';
            canvas.style.height = '100vh';
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        };

        resizeCanvas();
        window.addEventListener('resize', resizeCanvas, { passive: true });

        const compact = width < 560 || height < 620;
        const golds = ['#fff7c2', '#ffd66f', '#f6b63d', '#d98b18'];
        const burstColors = ['#fff7c2', '#ffd66f', '#ffffff', '#ffb13d', '#7fffe1'];
        const coinCount = compact ? 34 : 52;
        const sparkleCount = compact ? 46 : 72;
        const burstParticleCount = compact ? 24 : 36;

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
                color: golds[index % golds.length]
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
            color: index % 4 === 0 ? '#ffffff' : '#ffe79a'
        }));

        const burstTimes = [760, 1840, 3120, 4680, 5900];
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
                    color: burstColors[(i + burstIndex) % burstColors.length],
                    gravity: random(54, 104)
                });
            }
        });

        const drawStar = (x, y, radius, color, alpha, rotation = 0) => {
            ctx.save();
            ctx.globalAlpha = alpha;
            ctx.translate(x, y);
            ctx.rotate(rotation);
            ctx.strokeStyle = color;
            ctx.lineWidth = Math.max(1, radius * 0.42);
            ctx.shadowBlur = radius * 3.5;
            ctx.shadowColor = color;
            ctx.beginPath();
            ctx.moveTo(-radius, 0);
            ctx.lineTo(radius, 0);
            ctx.moveTo(0, -radius);
            ctx.lineTo(0, radius);
            ctx.stroke();
            ctx.restore();
        };

        const drawCoin = (x, y, radius, rotation, alpha, color) => {
            ctx.save();
            ctx.globalAlpha = alpha;
            ctx.translate(x, y);
            ctx.rotate(rotation);
            ctx.scale(1, 0.74);
            const gradient = ctx.createRadialGradient(-radius * 0.28, -radius * 0.32, radius * 0.12, 0, 0, radius);
            gradient.addColorStop(0, '#fffbe0');
            gradient.addColorStop(0.35, color);
            gradient.addColorStop(0.72, '#d88614');
            gradient.addColorStop(1, '#6e3504');
            ctx.fillStyle = gradient;
            ctx.shadowBlur = radius * 1.4;
            ctx.shadowColor = 'rgba(255, 216, 111, 0.55)';
            ctx.beginPath();
            ctx.arc(0, 0, radius, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;
            ctx.strokeStyle = 'rgba(92, 44, 4, 0.55)';
            ctx.lineWidth = Math.max(1, radius * 0.14);
            ctx.stroke();
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.42)';
            ctx.lineWidth = Math.max(1, radius * 0.08);
            ctx.beginPath();
            ctx.arc(0, 0, radius * 0.58, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
        };

        const drawDiamond = (x, y, radius, rotation, alpha) => {
            ctx.save();
            ctx.globalAlpha = alpha;
            ctx.translate(x, y);
            ctx.rotate(rotation);
            ctx.shadowBlur = radius * 2.2;
            ctx.shadowColor = 'rgba(132, 255, 232, 0.7)';
            const gradient = ctx.createLinearGradient(0, -radius, 0, radius);
            gradient.addColorStop(0, '#ffffff');
            gradient.addColorStop(0.45, '#8dfff2');
            gradient.addColorStop(1, '#168b94');
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.moveTo(0, -radius);
            ctx.lineTo(radius * 0.86, 0);
            ctx.lineTo(0, radius);
            ctx.lineTo(-radius * 0.86, 0);
            ctx.closePath();
            ctx.fill();
            ctx.restore();
        };

        const draw = now => {
            if (!canvas.isConnected) {
                window.removeEventListener('resize', resizeCanvas);
                return;
            }

            const elapsed = now - start;
            ctx.clearRect(0, 0, width, height);

            const stagePulse = Math.sin(elapsed / 520);
            const glow = ctx.createRadialGradient(width * 0.5, height * 0.43, 0, width * 0.5, height * 0.43, Math.min(width, height) * 0.42);
            glow.addColorStop(0, `rgba(255, 255, 255, ${0.11 + stagePulse * 0.025})`);
            glow.addColorStop(0.22, 'rgba(255, 214, 111, 0.12)');
            glow.addColorStop(1, 'rgba(255, 214, 111, 0)');
            ctx.globalCompositeOperation = 'lighter';
            ctx.fillStyle = glow;
            ctx.fillRect(0, 0, width, height);

            sparkles.forEach(sparkle => {
                const local = (elapsed - sparkle.delay) % sparkle.life;
                const progress = local / sparkle.life;
                const alpha = Math.sin(progress * Math.PI) * (0.42 + 0.38 * Math.sin(elapsed / 180 + sparkle.phase));
                if (alpha <= 0.04) return;
                drawStar(
                    sparkle.x + Math.sin(elapsed / 900 + sparkle.phase) * sparkle.drift,
                    sparkle.y - easeInOut(progress) * 46,
                    sparkle.size,
                    sparkle.color,
                    alpha,
                    elapsed / 1200 + sparkle.phase
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
                ctx.globalAlpha = alpha;
                ctx.fillStyle = particle.color;
                ctx.shadowBlur = particle.size * 5;
                ctx.shadowColor = particle.color;
                ctx.beginPath();
                ctx.arc(x, y, particle.size * (1 - progress * 0.35), 0, Math.PI * 2);
                ctx.fill();
            });
            ctx.shadowBlur = 0;
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
                if (item.kind === 'diamond') {
                    drawDiamond(x, y, item.size * 0.86, rotation, alpha);
                } else {
                    drawCoin(x, y, item.size, rotation, alpha, item.color);
                }
            });

            if (elapsed < duration) {
                rafId = requestAnimationFrame(draw);
            } else {
                ctx.clearRect(0, 0, width, height);
                window.removeEventListener('resize', resizeCanvas);
            }
        };

        rafId = requestAnimationFrame(draw);
        setTimeout(() => {
            cancelAnimationFrame(rafId);
            window.removeEventListener('resize', resizeCanvas);
        }, duration + 120);
    }

    spawnRealFirework() {
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
            rocket.remove();
            this.explodeRealFirework(startX, endY);
        };
    }

    explodeRealFirework(x, y) {
        if (window.app && window.app.soundMgr && window.app.soundMgr.fireworkExplode) {
            window.app.soundMgr.fireworkExplode();
        }

        const flash = document.createElement('div');
        flash.className = 'fw-flash';
        document.body.appendChild(flash);
        setTimeout(() => { if(flash.parentNode) flash.remove(); }, 250);

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
            setTimeout(() => { if(p.parentNode) p.remove(); }, 1600);
        }
    }

    scheduleEffectTimeout(callback, delay) {
        const timeoutId = setTimeout(() => {
            this.effectTimeouts = this.effectTimeouts.filter(id => id !== timeoutId);
            callback();
        }, delay);
        this.effectTimeouts.push(timeoutId);
        return timeoutId;
    }

    clearEffectTimeouts() {
        this.effectTimeouts.forEach(timeoutId => clearTimeout(timeoutId));
        this.effectTimeouts = [];
    }

    goldRainDukatHtml() {
        return `
            <svg class="dukat-icon-inline gold-rain-dukat" viewBox="0 0 96 96" aria-hidden="true" focusable="false">
                <circle cx="48" cy="48" r="39" fill="rgba(255,214,111,0.18)"/>
                <circle cx="48" cy="46" r="34" fill="#FFB23F"/>
                <circle cx="48" cy="46" r="27" fill="#FFD66F" stroke="#5A3514" stroke-opacity="0.35" stroke-width="2"/>
                <path d="M35 36c4-7 15-10 24-5 5 3 8 8 8 15 0 8-4 14-11 17-8 4-18 2-23-5" fill="none" stroke="#132727" stroke-width="5" stroke-linecap="round"/>
                <path d="M36 38c5-5 13-7 20-3 4 2 6 6 6 11 0 6-3 10-8 13-6 3-14 2-18-3" fill="none" stroke="#FFF5BA" stroke-width="3" stroke-linecap="round" opacity="0.85"/>
                <path d="M48 24v44M30 43h36" stroke="#FFF5BA" stroke-opacity="0.48" stroke-width="3" stroke-linecap="round"/>
            </svg>
        `;
    }

    spawnGoldRain() {
        const reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        const isCompact = window.innerWidth < 640;
        const totalDuration = 6000;
        const emitDuration = reducedMotion ? 2600 : 4400;
        const coinCount = reducedMotion ? 28 : (isCompact ? 72 : 104);
        const sparkCount = reducedMotion ? 12 : (isCompact ? 34 : 58);
        const rand = (min, max) => min + Math.random() * (max - min);

        this.clearEffectTimeouts();
        document.querySelectorAll('.gold-rain-atmosphere, .falling-coin.gold-rain-coin, .gold-rain-spark').forEach(el => el.remove());
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

        const createCoin = (delay = 0) => {
            const el = document.createElement('div');
            const roll = Math.random();
            const isDukat = roll < 0.78;
            const isCrown = !isDukat && roll > 0.93;
            const coinSize = rand(isCompact ? 20 : 23, isCompact ? 34 : 44);
            const preferredFallDuration = rand(reducedMotion ? 2600 : 2800, reducedMotion ? 3900 : 5000);
            const remainingFallWindow = Math.max(1700, totalDuration - delay + 180);
            const fallDuration = Math.min(preferredFallDuration, remainingFallWindow);
            const drift = rand(isCompact ? -70 : -150, isCompact ? 70 : 150);
            const startX = rand(-4, 98);
            const coinScale = rand(0.82, 1.18);
            const spinX = rand(540, 1180);
            const spinY = rand(320, 980);
            const spinZ = rand(-180, 180);

            el.className = `falling-coin gold-rain-coin${isDukat ? '' : (isCrown ? ' gold-rain-crown' : ' gold-rain-gem')}`;
            el.innerHTML = isDukat ? this.goldRainDukatHtml() : (isCrown ? '👑' : (roll < 0.86 ? '🪙' : '💎'));
            el.style.left = `${startX}vw`;
            el.style.setProperty('--coin-size', `${coinSize}px`);
            el.style.setProperty('--drift-start', `${drift * -0.18}px`);
            el.style.setProperty('--drift-mid', `${drift * 0.42}px`);
            el.style.setProperty('--drift-end', `${drift}px`);
            el.style.setProperty('--coin-scale-start', `${coinScale * 0.72}`);
            el.style.setProperty('--coin-scale', `${coinScale}`);
            el.style.setProperty('--coin-scale-end', `${rand(0.68, 0.95)}`);
            el.style.setProperty('--coin-tilt', `${rand(-34, 34)}deg`);
            el.style.setProperty('--coin-spin-x-mid', `${spinX * 0.52}deg`);
            el.style.setProperty('--coin-spin-y-mid', `${spinY * 0.48}deg`);
            el.style.setProperty('--coin-spin-z-mid', `${spinZ * 0.45}deg`);
            el.style.setProperty('--coin-spin-x', `${spinX}deg`);
            el.style.setProperty('--coin-spin-y', `${spinY}deg`);
            el.style.setProperty('--coin-spin-z', `${spinZ}deg`);
            el.style.animationDuration = `${fallDuration}ms`;

            document.body.appendChild(el);
            this.scheduleEffectTimeout(() => {
                if (el.parentNode) el.remove();
            }, fallDuration + 450);
        };

        const createSpark = (delay = 0) => {
            const spark = document.createElement('span');
            const size = rand(3, isCompact ? 7 : 9);
            const preferredFallDuration = rand(1800, 3800);
            const remainingFallWindow = Math.max(1200, totalDuration - delay + 120);
            const fallDuration = Math.min(preferredFallDuration, remainingFallWindow);

            spark.className = 'gold-rain-spark';
            spark.style.left = `${rand(0, 100)}vw`;
            spark.style.setProperty('--spark-size', `${size}px`);
            spark.style.setProperty('--spark-drift', `${rand(isCompact ? -45 : -95, isCompact ? 45 : 95)}px`);
            spark.style.animationDuration = `${fallDuration}ms`;
            document.body.appendChild(spark);

            this.scheduleEffectTimeout(() => {
                if (spark.parentNode) spark.remove();
            }, fallDuration + 350);
        };

        for (let i = 0; i < coinCount; i++) {
            const delay = rand(0, emitDuration);
            this.scheduleEffectTimeout(() => createCoin(delay), delay);
        }

        for (let i = 0; i < sparkCount; i++) {
            const delay = rand(120, emitDuration + 500);
            this.scheduleEffectTimeout(() => createSpark(delay), delay);
        }

        this.scheduleEffectTimeout(() => {
            if (atmosphere.parentNode) atmosphere.classList.add('closing');
            document.body.classList.remove('fx-gold-rain');
        }, totalDuration - 650);

        this.scheduleEffectTimeout(() => {
            if (atmosphere.parentNode) atmosphere.remove();
            document.querySelectorAll('.falling-coin.gold-rain-coin, .gold-rain-spark').forEach(el => el.remove());
        }, totalDuration + 650);
    }
    
    spawnEmojiRain(emojis, count) {
        for (let i = 0; i < count; i++) {
            setTimeout(() => {
                const el = document.createElement('div');
                const emoji = emojis[Math.floor(Math.random() * emojis.length)];
                if (emoji === 'dukat-icon') {
                    el.innerHTML = dukatIconHtml();
                } else {
                    el.innerText = emoji;
                }
                el.className = 'falling-coin';
                el.style.left = Math.random() * 100 + 'vw'; el.style.animationDuration = (Math.random() * 2 + 1) + 's';
                document.body.appendChild(el); setTimeout(() => el.remove(), 3000);
            }, Math.random() * 2000);
        }
    }
    
    spawnFloatingEmoji(emojis, count) {
        for (let i = 0; i < count; i++) {
            setTimeout(() => {
                const el = document.createElement('div'); 
                el.innerText = emojis[Math.floor(Math.random() * emojis.length)]; 
                el.className = 'firefly';
                el.style.left = Math.random() * 100 + 'vw'; 
                el.style.setProperty('--rnd-x', (Math.random() * 200 - 100) + 'px'); 
                
                el.style.animationDuration = (Math.random() * 2 + 3) + 's'; 
                
                document.body.appendChild(el); 
                
                setTimeout(() => el.remove(), 5500); 
            }, Math.random() * 2000); 
        }
    }

    spawnBubbles(count) {
        const emojis = ['🫧', '🫧', '⚪']; 
        for (let i = 0; i < count; i++) {
            setTimeout(() => {
                const el = document.createElement('div');
                el.innerText = emojis[Math.floor(Math.random() * emojis.length)];
                el.className = 'magic-bubble';
                el.style.left = Math.random() * 100 + 'vw';
                el.style.setProperty('--rnd-x', (Math.random() * 150 - 75) + 'px'); 
                
                el.style.animationDuration = (Math.random() * 1.5 + 3.5) + 's';
                
                const size = Math.random() * 1.5 + 1; 
                el.style.fontSize = size + 'rem';

                document.body.appendChild(el);
                
                setTimeout(() => el.remove(), 5500);
            }, Math.random() * 2000); 
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
            document.body.appendChild(el); setTimeout(() => el.remove(), 1000);
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
                    setTimeout(drift, 180);
                }
            };

            setTimeout(drift, 260);
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
        setTimeout(() => this.trigger('gold_rain'), 1000);
    }
    
    stop() {
        this.clearEffectTimeouts();
        document.body.classList.remove('fx-glass', 'fx-neon_pulse', 'fx-balkan', 'fx-ice-age', 'fx-thunder-shake', 'fx-cosmic_dust', 'fx-ufo_abduction', 'fx-dragon_fire', 'fx-royal_yamb', 'fx-gold-rain');

        if (this.confettiAnimationId) {
            cancelAnimationFrame(this.confettiAnimationId);
            this.confettiAnimationId = null;
        }

        const confettiCanvas = document.getElementById('confetti-canvas');
        if (confettiCanvas) {
            const confettiCtx = confettiCanvas.getContext('2d');
            if (confettiCtx) confettiCtx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
        }
        
        document.querySelectorAll('.falling-coin, .firefly, .trumpet-icon, .trumpet-icon-v2, .kafana-overlay, .firework-particle, .ice-overlay-container, .black-hole-container, .supernova-container, .drone-night-sky, .drone-text, .drone-dot, .magic-bubble, .anim-thunder, .fw-rocket, .fw-flash, .fw-particle, .cosmic-container, .ufo-abduction-container, .ufo-abducted-score, .ufo-target-ray, .dragon-container, .stardust-layer, .dragon-flames, .dragon-embers, .royal-yamb-container, .gold-rain-atmosphere, .gold-rain-spark').forEach(e => e.remove());
        
        document.querySelectorAll('.active-ice-table').forEach(tbl => tbl.classList.remove('active-ice-table'));
        document.querySelectorAll('.anim-suck-in').forEach(tbl => tbl.classList.remove('anim-suck-in'));
        document.querySelectorAll('.anim-supernova-table').forEach(tbl => tbl.classList.remove('anim-supernova-table'));
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

        // --- INICIJALIZACIJA MUZIKE ---
        this.bgMusic = new Audio('Before_the_Numbers_Settle.mp3');
        this.bgMusic.volume = this.musicVolume; 
        
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

    click() { 
        this.playSound(() => {
            const t = this.ctx.currentTime; const osc = this.ctx.createOscillator(); const gain = this.ctx.createGain();
            osc.type = 'sine'; osc.frequency.setValueAtTime(800, t); osc.frequency.exponentialRampToValueAtTime(300, t + 0.1);
            gain.gain.setValueAtTime(0.15, t); gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
            osc.connect(gain); gain.connect(this.ctx.destination); osc.start(t); osc.stop(t + 0.1);
        });
    }

    announce() {
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
        this.playSound(() => {
            const t = this.ctx.currentTime; const osc = this.ctx.createOscillator(); const gain = this.ctx.createGain();
            osc.type = 'triangle'; osc.frequency.setValueAtTime(440, t); osc.frequency.linearRampToValueAtTime(880, t + 0.1); 
            gain.gain.setValueAtTime(0.1, t); gain.gain.linearRampToValueAtTime(0, t + 0.3);
            osc.connect(gain); gain.connect(this.ctx.destination); osc.start(t); osc.stop(t + 0.3);
        });
    }

    win() {
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
        this.playSound(() => {
            const t = this.ctx.currentTime; const osc = this.ctx.createOscillator(); const gain = this.ctx.createGain();
            osc.type = 'sawtooth'; osc.frequency.setValueAtTime(150, t); osc.frequency.linearRampToValueAtTime(100, t + 0.15);
            gain.gain.setValueAtTime(0.1, t); gain.gain.linearRampToValueAtTime(0, t + 0.15);
            osc.connect(gain); gain.connect(this.ctx.destination); osc.start(t); osc.stop(t + 0.2);
        });
    }

    trophy() {
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

    // --- BALKANSKA TRUBA (V.3) - GLAVNI REFREN UŽIČKOG KOLA ---
    balkanTrumpet() {
        this.playSound(() => {
            const now = this.ctx.currentTime;
            
            // PRAVI REFREN UŽIČKOG KOLA (Visoki, najluđi deo!)
            const melody = [
                // Prva fraza
                { f: 880.0, d: 0.12 }, { f: 880.0, d: 0.12 }, { f: 880.0, d: 0.12 }, { f: 830.6, d: 0.12 },
                { f: 880.0, d: 0.12 }, { f: 987.8, d: 0.12 }, { f: 880.0, d: 0.12 }, { f: 830.6, d: 0.12 },
                { f: 740.0, d: 0.12 }, { f: 830.6, d: 0.12 }, { f: 880.0, d: 0.12 }, { f: 830.6, d: 0.12 },
                { f: 740.0, d: 0.12 }, { f: 659.3, d: 0.25 }, // pauza na E
                
                // Druga fraza
                { f: 880.0, d: 0.12 }, { f: 880.0, d: 0.12 }, { f: 880.0, d: 0.12 }, { f: 830.6, d: 0.12 },
                { f: 880.0, d: 0.12 }, { f: 987.8, d: 0.12 }, { f: 880.0, d: 0.12 }, { f: 830.6, d: 0.12 },
                { f: 740.0, d: 0.12 }, { f: 659.3, d: 0.12 }, { f: 740.0, d: 0.12 }, { f: 830.6, d: 0.12 },
                { f: 880.0, d: 0.35 }  // Završni A
            ];

            let t = now;
            
            // Ponavljamo melodiju tačno 2 puta, što traje ukupno oko 8.3 sekunde
            for (let k = 0; k < 2; k++) {
                melody.forEach(note => {
                    const osc = this.ctx.createOscillator();
                    const filter = this.ctx.createBiquadFilter();
                    const gain = this.ctx.createGain();

                    // 'Square' oscilator najbolje simulira prodoran zvuk trube/harmonike
                    osc.type = 'square'; 
                    osc.frequency.value = note.f;

                    // Lowpass filter da ton bude oštar ali da ne probija bubne opne
                    filter.type = 'lowpass';
                    filter.frequency.setValueAtTime(800, t);
                    filter.frequency.linearRampToValueAtTime(3500, t + note.d * 0.3);
                    filter.frequency.exponentialRampToValueAtTime(1000, t + note.d);

                    // Glasnoća nota (kratki odsečni udarci tipični za kolo)
                    gain.gain.setValueAtTime(0, t);
                    gain.gain.linearRampToValueAtTime(0.20, t + 0.02); // Brz ulazak
                    gain.gain.exponentialRampToValueAtTime(0.01, t + note.d - 0.02); // Brzo stišavanje

                    osc.connect(filter);
                    filter.connect(gain);
                    gain.connect(this.ctx.destination);

                    osc.start(t);
                    osc.stop(t + note.d);

                    // Razmak između nota za pravi stakato skok
                    t += note.d + 0.02; 
                });
                
                // Pauza pre ponavljanja
                t += 0.2;
            }
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

    groupByCategory() {
        const grouped = {};
        this.items.forEach(item => {
            const cat = resolveText(item.category) || _safeT('category_other');
            if (!grouped[cat]) grouped[cat] = [];
            grouped[cat].push(item);
        });
        return grouped;
    }

    render() {
        if (!this.container) return;
        this.container.innerHTML = '';
        const groupedItems = this.groupByCategory();

        for (const [categoryName, items] of Object.entries(groupedItems)) {
            const section = document.createElement('div');
            section.className = 'category-section';
            section.innerHTML = `<div class="category-header">${categoryName}</div>`;
            
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
                    priceHtml = `<div class="status ${isUnlocked ? 'status-unlocked' : 'status-locked'}">${isUnlocked ? _safeT('btn_won') : `${dukatIconHtml()} ${item.reward}`}</div>`;
                } else {
                    if (isUnlocked) {
                        priceHtml = `<div class="price">${_safeT('btn_bought')}</div>`;
                    } else {
                        // NOVO: Provera da li se otključava reklamama
                        if (item.adUnlock) {
                            priceHtml = `<div class="price" style="color: var(--text-muted); font-size: 0.75rem;">Gledaj 📺 za otključavanje</div>`;
                        } else {
                            let price = item.price;
                            let displayPrice = `${price} ${_safeT('balance')}`;
                            
                            if (this.discountedItems[item.id]) {
                                const discounted = Math.floor(price * 0.8);
                                displayPrice = `<span class="old-price">${price}</span> ${discounted} ${_safeT('balance')}`;
                            }
                            priceHtml = `<div class="price">${displayPrice}</div>`;
                        }
                    }
                }

                let btnHtml = '';
                if (this.type !== 'trophy') {
                    if (isActive) {
                        btnHtml = `<button class="btn-action btn-active">${_safeT('btn_active')}</button>`;
                    } else if (isUnlocked) {
                        btnHtml = `<button class="btn-action btn-equip" onclick="shop.equip('${item.id}')">${_safeT('btn_equip')}</button>`;
                    } else {
                        const reqMet = !item.req || this.unlocked.includes(item.req);
                        
                        if (reqMet) {
                            // NOVO: Logika za dugme koje otključava reklamama
                            if (item.adUnlock) {
                                let adProgress = parseInt(localStorage.getItem(`yamb_adprogress_${item.id}`)) || 0;
                                btnHtml = `<button class="btn-action btn-ad-state-aware" style="background: linear-gradient(45deg, #FF9800, #F57C00); color: white; border: none; border-radius: 8px; padding: 5px 10px; font-weight: bold; cursor: pointer; text-shadow: 1px 1px 0px rgba(0,0,0,0.3);" onclick="shop.watchAdForUnlock('${item.id}', ${item.adUnlock})">📺 ${adProgress} / ${item.adUnlock}</button>`;
                            } else {
                                let currentPrice = this.discountedItems[item.id] ? Math.floor(item.price * 0.8) : item.price;
                                const safeName = itemName.replace(/'/g, "\\'"); 
                                
                                let discountBtn = '';
                                if(!this.discountedItems[item.id]) {
                                    discountBtn = `<button class="btn-action btn-discount btn-ad-state-aware" onclick="shop.watchAdDiscount('${item.id}')">📺 -20%</button>`;
                                }

                                btnHtml = `
                                    <div class="btn-group">
                                        <button class="btn-action btn-buy" onclick="shop.tryBuy('${item.id}', '${safeName}', ${currentPrice})">${_safeT('btn_buy')}</button>
                                        ${discountBtn}
                                    </div>`;
                            }
                        } else {
                            btnHtml = `<div class="req-text">${_safeT('shop_unlock')} ${resolveText(item.reqName)}</div>`;
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
        this.activeItem = id;
        localStorage.setItem(this.activeKey, id);
        this.render();
        
        if(window.app && window.app.soundMgr) window.app.soundMgr.click();

        if (this.type === 'theme') {
            if (window.app && typeof window.app.applyTheme === 'function') {
                window.app.applyTheme(id); 
            } else {
                document.body.className = ''; 
                if (id !== 'dark') document.body.classList.add(id + '-theme'); 
            }
            
            const themeSelect = document.getElementById('setting-theme');
            if (themeSelect) themeSelect.value = id;
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
        if (this.balance < price) {
            if (typeof window.showNotification === 'function') {
                window.showNotification(_safeT('modal_title_info'), _safeT('msg_no_money') || "Nemate dovoljno dukata!");
            } else if (window.modalManager && window.modalManager.overlay) {
                window.modalManager.alert(_safeT('msg_no_money') || "Nemate dovoljno dukata!", _safeT('modal_title_info'));
            } else {
                alert(_safeT('msg_no_money') || "Nemate dovoljno dukata!");
            }
            return;
        }
        
        if (typeof window.openConfirmModal === 'function') {
            window.openConfirmModal(id, name, price);
        } else if (window.modalManager && window.modalManager.overlay) {
            const isConfirmed = await window.modalManager.confirm(`${_safeT('msg_confirm_buy')} ${name}?`);
            if (isConfirmed) {
                this.processTransaction(id, price);
            }
        }
    }

    processTransaction(id, price) {
        this.balance -= price;
        this.unlocked.push(id);
        
        localStorage.setItem('yamb_dukati', this.balance);
        localStorage.setItem(this.unlockKey, JSON.stringify(this.unlocked));
        
        let opstiNiz = JSON.parse(localStorage.getItem('yamb_unlocked')) || [];
        if (!opstiNiz.includes(id)) {
            opstiNiz.push(id);
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
                if (!window.statsManager.stats[statsField].includes(id)) {
                    window.statsManager.stats[statsField].push(id);
                }
            }

            if (storageKey) {
                const typedUnlocked = JSON.parse(localStorage.getItem(storageKey) || '[]');
                if (!typedUnlocked.includes(id)) {
                    typedUnlocked.push(id);
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
        const adCtrl = this.getAdController();
        if (adCtrl) {
            const success = await adCtrl.showRewardVideo();
            if (success) {
                this.discountedItems[id] = true;
                this.render();
            }
        }
    }
    
    // NOVO: Funkcija za otključavanje predmeta/teme gledanjem serije reklama
    async watchAdForUnlock(id, target) {
        const adCtrl = this.getAdController();
        if (adCtrl) {
            if (!adCtrl.ads.rewarded.isReady) {
                if (typeof window.showNotification === 'function') {
                    window.showNotification(_safeT('modal_title_info') || "INFO", _safeT('ad_not_ready') || "Reklama se učitava. Pokušajte za par sekundi.");
                } else if (window.modalManager && window.modalManager.overlay) {
                    window.modalManager.alert(_safeT('ad_not_ready') || "Reklama se učitava. Pokušajte za par sekundi.", _safeT('modal_title_info') || "INFO");
                }
                adCtrl.prepareReward();
                return;
            }
            const success = await adCtrl.showRewardVideo();
            if (success) {
                let progress = parseInt(localStorage.getItem(`yamb_adprogress_${id}`)) || 0;
                progress++;
                
                if (progress >= target) {
                    // Otključano
                    if (!this.unlocked.includes(id)) {
                        this.unlocked.push(id);
                    }
                    localStorage.setItem(this.unlockKey, JSON.stringify(this.unlocked));
                    localStorage.removeItem(`yamb_adprogress_${id}`);

                    let opstiNiz = JSON.parse(localStorage.getItem('yamb_unlocked')) || [];
                    if (!opstiNiz.includes(id)) {
                        opstiNiz.push(id);
                        localStorage.setItem('yamb_unlocked', JSON.stringify(opstiNiz));
                    }

                    if(window.app && window.app.soundMgr) window.app.soundMgr.trophy();
                    this.syncShopStateToServer();
                    
                    if (typeof window.showNotification === 'function') {
                        window.showNotification("USPEŠNO!", "Tema je uspešno otključana!");
                    } else if (window.modalManager && window.modalManager.overlay) {
                        window.modalManager.alert("Tema je uspešno otključana!", "USPEŠNO!");
                    }
                } else {
                    // Samo napredak
                    localStorage.setItem(`yamb_adprogress_${id}`, progress);
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

            app.socket.emit('claim_shop_ad_reward', { ssvNonce }, (result) => {
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
             if (!isRewardReady) {
                 if (typeof window.showNotification === 'function') {
                     window.showNotification(_safeT('modal_title_info') || "INFO", _safeT('ad_not_ready') || "Reklama se učitava ili trenutno nije dostupna. Pokušajte za par sekundi.");
                 } else if (window.modalManager && window.modalManager.overlay) {
                     window.modalManager.alert(_safeT('ad_not_ready') || "Reklama se učitava ili trenutno nije dostupna na mreži. Pokušajte za par sekundi.", _safeT('modal_title_info') || "INFO");
                 }
                 adCtrl.prepareReward(rewardOptions);
                 return;
             }

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
                          message = `Nagrada je već obrađena. Pokušajte ponovo za ${cooldown || 1}s.`;
                      } else if (rewardResult.reason === 'auth_required') {
                          message = _safeT('auth_required') || "Morate se prijaviti da biste preuzeli nagradu.";
                      } else if (rewardResult.reason === 'ad_verification_required' || rewardResult.reason === 'ad_verification_pending') {
                          message = "Potvrda reklame još nije stigla. Pokušajte preuzimanje nagrade za par sekundi.";
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
            if (this.ads.rewarded.isReady && this.isRewardSsvReadyForCurrentUser(rewardOptions)) {
                try {
                    this.rewardResolve = resolve;
                    this.activeRewardSsvInfo = this.rewardSsvInfo;
                    this.activeRewardEarned = false;
                    await this.adMobPlugin.showRewardVideoAd();
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
