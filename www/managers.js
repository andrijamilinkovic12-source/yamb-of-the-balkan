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

    confirm(text) {
        const safeTitle = _safeT('modal_title_confirm') || "POTVRDA";
        return new Promise(resolve => {
            const els = this.elements;
            if(!els.overlay) { console.warn("Modal overlay missing! Confirm:", text); resolve(false); return; }
            
            this.setup(safeTitle, text, false);
            els.btnCancel.classList.remove('hidden');
            
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
    }
    
    applyPermanent(type) {
        this.stop(); 
        if (!type || type === 'none') return;
    }
    
    trigger(type) {
        if (type === 'confetti') this.spawnConfetti();
        if (type === 'gold_rain') this.spawnEmojiRain(['dukat-icon', '🪙', '💎', '👑'], 50);
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
        if (window.confetti) { 
            const colors = ['#FFD700', '#FF007F', '#00E5FF', '#39FF14', '#FF4500', '#9400D3'];
            const end = Date.now() + 5000; 
            
            (function frame() {
                window.confetti({
                    particleCount: 6,
                    angle: 60,
                    spread: 60,
                    origin: { x: 0, y: 0.9 },
                    colors: colors,
                    zIndex: 99999
                });
                window.confetti({
                    particleCount: 6,
                    angle: 120,
                    spread: 60,
                    origin: { x: 1, y: 0.9 }, 
                    colors: colors,
                    zIndex: 99999
                });
                
                if (Date.now() < end) {
                    requestAnimationFrame(frame);
                }
            }());
        } else { 
            const end = Date.now() + 5000;
            const interval = setInterval(() => {
                if (Date.now() > end) {
                    clearInterval(interval);
                    return;
                }
                this.spawnEmojiRain(['🎉', '🎊', '🎈', '✨', '🏆', '💫'], 5);
            }, 250); 
        }
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
        document.body.classList.remove('fx-glass', 'fx-neon_pulse', 'fx-balkan', 'fx-ice-age', 'fx-thunder-shake', 'fx-cosmic_dust', 'fx-dragon_fire');
        
        document.querySelectorAll('.falling-coin, .firefly, .trumpet-icon, .trumpet-icon-v2, .kafana-overlay, .firework-particle, .ice-overlay-container, .black-hole-container, .supernova-container, .drone-night-sky, .drone-text, .drone-dot, .magic-bubble, .anim-thunder, .fw-rocket, .fw-flash, .fw-particle, .cosmic-container, .dragon-container, .stardust-layer, .dragon-flames, .dragon-embers').forEach(e => e.remove());
        
        document.querySelectorAll('.active-ice-table').forEach(tbl => tbl.classList.remove('active-ice-table'));
        document.querySelectorAll('.anim-suck-in').forEach(tbl => tbl.classList.remove('anim-suck-in'));
        document.querySelectorAll('.anim-supernova-table').forEach(tbl => tbl.classList.remove('anim-supernova-table'));
        document.querySelectorAll('.anim-neon-pulse').forEach(tbl => tbl.classList.remove('anim-neon-pulse'));
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
        let cloudSkins = (window.statsManager && window.statsManager.stats.unlockedSkins) ? window.statsManager.stats.unlockedSkins : [];
        savedUnlocked = [...new Set([...savedUnlocked, ...opstiNiz, ...cloudSkins])];
        
        if (this.type === 'theme') {
            ['dark', 'light', 'medium', 'winter'].forEach(item => {
                if (!savedUnlocked.includes(item)) savedUnlocked.push(item);
            });
        } else {
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
            if (!window.statsManager.stats.unlockedSkins) window.statsManager.stats.unlockedSkins = [];
            if (!window.statsManager.stats.unlockedSkins.includes(id)) {
                window.statsManager.stats.unlockedSkins.push(id);
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

    async claimServerAdReward() {
        const app = window.app;
        if (!app || !app.socket || !app.socket.connected) {
            return { ok: true, localFallback: true, reward: 500 };
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
            }, 8000);

            app.socket.emit('claim_shop_ad_reward', {}, (result) => {
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
             if (!adCtrl.ads.rewarded.isReady) {
                 if (typeof window.showNotification === 'function') {
                     window.showNotification(_safeT('modal_title_info') || "INFO", _safeT('ad_not_ready') || "Reklama se učitava ili trenutno nije dostupna. Pokušajte za par sekundi.");
                 } else if (window.modalManager && window.modalManager.overlay) {
                     window.modalManager.alert(_safeT('ad_not_ready') || "Reklama se učitava ili trenutno nije dostupna na mreži. Pokušajte za par sekundi.", _safeT('modal_title_info') || "INFO");
                 }
                 adCtrl.prepareReward(); 
                 return;
             }

             const success = await adCtrl.showRewardVideo();
             if (success) {
                 const rewardResult = await this.claimServerAdReward();
                 if (!rewardResult.ok) {
                     const cooldown = Math.ceil((rewardResult.retryAfterMs || 0) / 1000);
                     let message = _safeT('err_server_conn') || "Greška pri konekciji sa serverom.";
                     if (rewardResult.reason === 'ad_reward_cooldown') {
                         message = `Nagrada je već obrađena. Pokušajte ponovo za ${cooldown || 1}s.`;
                     } else if (rewardResult.reason === 'auth_required') {
                         message = _safeT('auth_required') || "Morate se prijaviti da biste preuzeli nagradu.";
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
        
        this.ads = {
            rewarded: { isReady: false, isLoading: false, retryCount: 0 },
            interstitial: { isReady: false, isLoading: false, retryCount: 0 }
        };
        
        this.baseRetryDelay = 1000;   
        this.maxRetryDelay = 30000;   
        
        this.uiSelectors = ['.btn-ad-double', '.btn-add-coins', '.btn-discount', '.btn-ad-state-aware']; 
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
            await this.adMobPlugin.addListener('rewardedVideoAdReward', () => { if (this.rewardResolve) { this.rewardResolve(true); this.rewardResolve = null; } });
            await this.adMobPlugin.addListener('rewardedVideoAdDismissed', () => {
                if (this.rewardResolve) { this.rewardResolve(false); this.rewardResolve = null; }
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
            await this.adMobPlugin.addListener('onRewardedVideoAdReward', () => { if (this.rewardResolve) { this.rewardResolve(true); this.rewardResolve = null; } });
            await this.adMobPlugin.addListener('onRewardedVideoAdDismissed', () => {
                if (this.rewardResolve) { this.rewardResolve(false); this.rewardResolve = null; }
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

    handleAdLoaded(type) {
        this.ads[type].isReady = true; 
        this.ads[type].isLoading = false; 
        this.ads[type].retryCount = 0; 
        if (type === 'rewarded') {
            this.updateUI(this.ads.rewarded.isReady);
        }
    }

    handleAdFailed(type, err) {
        this.ads[type].isReady = false; 
        this.ads[type].isLoading = false;
        if (type === 'rewarded') {
            this.updateUI(this.ads.rewarded.isReady);
        }

        this.ads[type].retryCount++;
        const nextDelay = Math.min(this.baseRetryDelay * Math.pow(1.2, this.ads[type].retryCount), this.maxRetryDelay);
        setTimeout(() => this.preloadAd(type), nextDelay);
    }

    handleAdDismissed(type) {
        this.ads[type].isReady = false;
        if (type === 'rewarded') {
            this.updateUI(this.ads.rewarded.isReady);
        }
        this.ads[type].retryCount = 0; 
        setTimeout(() => this.preloadAd(type), 500);
    }

    async preloadAd(type) {
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
                await this.adMobPlugin.prepareRewardVideoAd({ adId: this.rewardedId, isTesting: false });
            } else if (type === 'interstitial') {
                await this.adMobPlugin.prepareInterstitial({ adId: this.interstitialId, isTesting: false, autoShow: false });
            } 
            clearTimeout(timeoutId); 
        } catch (e) {
            clearTimeout(timeoutId);
            this.handleAdFailed(type, e);
        }
    }

    triggerHighPriorityLoad(type = 'rewarded') {
        if (!this.ads[type] || (!this.ads[type].isLoading && !this.ads[type].isReady)) {
            if (this.ads[type]) this.ads[type].retryCount = 0; 
            this.preloadAd(type);
        }
    }

    loadRewardAd() { this.preloadAd('rewarded'); }
    loadInterstitialAd() { this.preloadAd('interstitial'); }
    prepareReward() { this.triggerHighPriorityLoad('rewarded'); }

    setBannerSlotState(state, text = '') {
        const slotEl = this.bannerSlot || document.getElementById('economy-banner-slot');
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
    }

    handleBannerFailed(err) {
        this.clearBannerLoadTimer();
        this.bannerVisible = false;
        this.bannerLoaded = false;
        this.lastBannerMargin = null;
        this.setBannerSlotState('failed', _safeT('economy_ad_failed') || 'AdMob nije spreman');
        console.warn("⚠️ Banner reklama nije učitana.", err);
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

    getEconomyBannerMargin(slotEl) {
        const rect = slotEl.getBoundingClientRect();
        const viewportHeight = window.visualViewport?.height || window.innerHeight || document.documentElement.clientHeight || 0;
        const bannerHeight = 50;
        const slotTop = Math.round(rect.top);
        const slotCenteredTop = Math.round(rect.top + Math.max(0, rect.height - bannerHeight) / 2);
        const safeTop = Math.max(0, Math.round(window.visualViewport?.offsetTop || 0));
        const safeBottom = 8;
        const maxTop = viewportHeight > bannerHeight
            ? Math.max(safeTop, Math.floor(viewportHeight - bannerHeight - safeBottom))
            : safeTop;

        if (slotTop >= safeTop && slotTop <= maxTop) {
            return Math.min(Math.max(slotCenteredTop, safeTop), maxTop);
        }

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
            this.bannerVisible = false;
            this.bannerLoaded = false;
            this.lastBannerMargin = null;
        }
    }

    async showEconomyBanner(slotEl = document.getElementById('economy-banner-slot')) {
        if (!this.adMobPlugin || !slotEl || !navigator.onLine) return;

        this.bannerSlot = slotEl;
        const margin = this.getEconomyBannerMargin(slotEl);
        if (this.bannerVisible && this.lastBannerMargin === margin) return;

        this.bannerLoaded = false;
        this.setBannerSlotState('loading', _safeT('economy_ad_loading') || 'Učitavanje oglasa...');

        await this.removeCurrentBanner();
        this.bannerSlot = slotEl;
        this.setBannerSlotState('loading', _safeT('economy_ad_loading') || 'Učitavanje oglasa...');
        this.startBannerLoadTimer();

        try {
            await this.adMobPlugin.showBanner({
                adId: this.bannerId,
                adSize: 'BANNER',
                position: 'TOP_CENTER',
                margin,
                isTesting: false
            });
            this.bannerVisible = true;
            this.lastBannerMargin = margin;
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
                    if (btn.dataset.originalText) btn.innerText = btn.dataset.originalText;
                } else {
                    btn.classList.add('disabled', 'ad-loading'); btn.disabled = true; btn.style.opacity = '0.6'; btn.style.filter = 'grayscale(100%)';
                    if (!btn.dataset.originalText) btn.dataset.originalText = btn.innerText;
                }
            });
        });
    }

    showRewardVideo() {
        return new Promise(async (resolve) => {
            if (!this.adMobPlugin) { resolve(false); return; }
            if (this.ads.rewarded.isReady) {
                try {
                    this.rewardResolve = resolve;
                    await this.adMobPlugin.showRewardVideoAd();
                } catch (e) {
                    this.rewardResolve = null; this.handleAdFailed('rewarded', e); resolve(false);
                }
            } else {
                if (typeof window.showNotification === 'function') window.showNotification(_safeT('info_title') || "INFO", _safeT('ad_not_ready') || "Reklama se učitava. Pokušajte za par sekundi.");
                this.triggerHighPriorityLoad('rewarded'); resolve(false);
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
