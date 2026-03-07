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

// --- 2. STATS MANAGER ---
class StatsManager {
    constructor() {
        this.stats = this.loadStats() || {
            wins: 0, losses: 0, totalGames: 0, currentWinStreak: 0, currentLossStreak: 0,
            balance: CONFIG.INITIAL_BALANCE || 1000, unlockedTrophies: [], highscore: 0
        };
        
        const legacyBalance = parseInt(localStorage.getItem('yamb_dukati'));
        if (!isNaN(legacyBalance) && legacyBalance > this.stats.balance) {
            this.stats.balance = legacyBalance;
        }
        
        this.selfHealTrophies();
        this.previousBalance = this.stats.balance; 
    }
    
    loadStats() { 
        try { 
            let s = JSON.parse(localStorage.getItem('diceGameStats')); 
            if(s && !s.highscore && s.highScore) s.highscore = s.highScore;
            return s;
        } catch(e) { return null; } 
    }
    
    selfHealTrophies() {
        let changed = false;
        const s = this.stats;
        const t = s.unlockedTrophies || [];

        if (s.totalGames > 0 && !t.includes('first_play')) { t.push('first_play'); changed = true; }
        if (s.totalGames >= 10 && !t.includes('apprentice')) { t.push('apprentice'); changed = true; }
        if (s.totalGames >= 50 && !t.includes('veteran')) { t.push('veteran'); changed = true; }
        if (s.highscore >= 1000 && !t.includes('score_1000')) { t.push('score_1000'); changed = true; }

        s.unlockedTrophies = t;

        let riznicaList = JSON.parse(localStorage.getItem('yamb_unlocked')) || ['default', 'confetti'];
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
        localStorage.setItem('diceGameStats', JSON.stringify(this.stats)); 
        localStorage.setItem('yamb_dukati', this.stats.balance);
        
        if(this.stats.unlockedTrophies && this.stats.unlockedTrophies.length > 0) {
            let riznicaList = JSON.parse(localStorage.getItem('yamb_unlocked')) || ['default', 'confetti'];
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
        this.stats.totalGames++;
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
    constructor() {
        this.overlay = document.getElementById('custom-modal-overlay');
        this.title = document.getElementById('cm-title');
        this.msg = document.getElementById('cm-msg');
        this.input = document.getElementById('cm-input');
        this.btnCancel = document.getElementById('cm-cancel');
        this.btnOk = document.getElementById('cm-ok');
    }
    alert(text, title) {
        const safeTitle = title || _safeT('modal_title_info') || "OBAVEŠTENJE";
        return new Promise(resolve => {
            if(!this.overlay) { console.warn("Modal overlay missing! Alert:", text); resolve(true); return; } 
            this.setup(safeTitle, text, false);
            this.btnOk.onclick = () => { this.close(); resolve(true); };
            this.open();
        });
    }
    confirm(text) {
        const safeTitle = _safeT('modal_title_confirm') || "POTVRDA";
        return new Promise(resolve => {
            if(!this.overlay) { console.warn("Modal overlay missing! Confirm:", text); resolve(false); return; }
            this.setup(safeTitle, text, false);
            this.btnCancel.classList.remove('hidden');
            this.btnOk.onclick = () => { this.close(); resolve(true); };
            this.btnCancel.onclick = () => { this.close(); resolve(false); };
            this.open();
        });
    }
    prompt(text) {
        const safeTitle = _safeT('modal_title_input') || "UNOS";
        return new Promise(resolve => {
            if(!this.overlay) { console.warn("Modal overlay missing! Prompt:", text); resolve(null); return; }
            this.setup(safeTitle, text, true);
            this.btnOk.onclick = () => { 
                const val = this.input.value; 
                this.close(); 
                resolve(val); 
            };
            this.open();
        });
    }
    setup(title, msg, hasInput) {
        if(this.title) this.title.innerText = title;
        if(this.msg) this.msg.innerHTML = msg; 
        
        if(this.btnCancel) this.btnCancel.classList.add('hidden');
        if(hasInput && this.input) { this.input.classList.remove('hidden'); this.input.value = ""; this.input.focus(); } 
        else if (this.input) { this.input.classList.add('hidden'); }
        
        if(this.btnOk) { const newOk = this.btnOk.cloneNode(true); this.btnOk.parentNode.replaceChild(newOk, this.btnOk); this.btnOk = newOk; }
        if(this.btnCancel) { const newCancel = this.btnCancel.cloneNode(true); this.btnCancel.parentNode.replaceChild(newCancel, this.btnCancel); this.btnCancel = newCancel; }
        
        if(typeof t !== 'undefined') {
            if(this.btnOk) this.btnOk.innerText = t('modal_btn_ok') || "U REDU";
            if(this.btnCancel) this.btnCancel.innerText = t('modal_btn_cancel') || "OTKAŽI";
        }
    }
    open() { if(this.overlay) this.overlay.style.display = 'flex'; }
    close() { if(this.overlay) this.overlay.style.display = 'none'; }
}

// --- 4. EFFECT MANAGER (VISUALS) ---
class EffectManager {
    constructor() {
        this.activeEffects = [];
    }
    
    applyPermanent(type) {
        this.stop(); 
        if (!type || type === 'none') return;
        
        if (type === 'neon_pulse') document.body.classList.add('fx-neon_pulse');
    }
    
    trigger(type) {
        if (type === 'confetti') this.spawnConfetti();
        if (type === 'gold_rain') this.spawnEmojiRain(['💰', '🪙', '💎', '👑'], 50);
        if (type === 'fireflies') this.spawnFloatingEmoji(['✨', '🌟', '💫', '🧚'], 40);
        
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

        if (type === 'thunder') {
            const flash = document.createElement('div');
            flash.className = 'anim-thunder';
            flash.style.position = 'fixed'; flash.style.top = '0'; flash.style.left = '0'; flash.style.width = '100%'; flash.style.height = '100%';
            flash.style.background = '#fff'; flash.style.zIndex = '99999'; flash.style.mixBlendMode = 'overlay'; flash.style.pointerEvents = 'none';
            document.body.appendChild(flash);
            setTimeout(() => flash.remove(), 600);
            document.body.classList.add('fx-balkan'); 
            setTimeout(() => document.body.classList.remove('fx-balkan'), 500);
        }
        if (type === 'balkan') {
            document.body.classList.add('fx-balkan');
            const t1 = document.createElement('div'); t1.innerText = '🎺'; t1.className = 'trumpet-icon'; t1.style.left = '10px'; t1.style.bottom = '10px';
            const t2 = document.createElement('div'); t2.innerText = '🎺'; t2.className = 'trumpet-icon'; t2.style.right = '10px'; t2.style.bottom = '10px'; t2.style.transform = 'scaleX(-1)';
            document.body.appendChild(t1); document.body.appendChild(t2);
            this.spawnEmojiRain(['💶', '💵', '🥂', '🍾', '🍖'], 40);
            setTimeout(() => { document.body.classList.remove('fx-balkan'); if(t1.parentNode) t1.remove(); if(t2.parentNode) t2.remove(); }, 4000);
        }
        if (type === 'fireworks') {
             for(let i=0; i<8; i++) { setTimeout(() => this.spawnExplosion(), i * 400); }
        }
    }
    
    spawnEmojiRain(emojis, count) {
        for (let i = 0; i < count; i++) {
            setTimeout(() => {
                const el = document.createElement('div'); el.innerText = emojis[Math.floor(Math.random() * emojis.length)]; el.className = 'falling-coin';
                el.style.left = Math.random() * 100 + 'vw'; el.style.animationDuration = (Math.random() * 2 + 1) + 's';
                document.body.appendChild(el); setTimeout(() => el.remove(), 3000);
            }, Math.random() * 2000);
        }
    }
    
    spawnFloatingEmoji(emojis, count) {
        for (let i = 0; i < count; i++) {
            setTimeout(() => {
                const el = document.createElement('div'); el.innerText = emojis[Math.floor(Math.random() * emojis.length)]; el.className = 'firefly';
                el.style.left = Math.random() * 100 + 'vw'; el.style.setProperty('--rnd-x', (Math.random() * 200 - 100) + 'px'); el.style.animationDuration = (Math.random() * 2 + 2) + 's';
                document.body.appendChild(el); setTimeout(() => el.remove(), 4000);
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
        if (window.confetti) { window.confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } }); } 
        else { this.spawnEmojiRain(['🎉', '🎊', '🎈'], 30); }
    }
    
    celebrateYamb() {
        const active = localStorage.getItem('yamb_active_effect') || 'confetti';
        this.trigger(active); 
        document.body.classList.add('fx-neon_pulse');
        setTimeout(() => document.body.classList.remove('fx-neon_pulse'), 2000);
    }
    
    celebrateWin() {
        this.trigger('fireworks');
        setTimeout(() => this.trigger('gold_rain'), 1000);
    }
    
    stop() {
        document.body.classList.remove('fx-glass', 'fx-neon_pulse', 'fx-balkan', 'fx-ice-age');
        document.querySelectorAll('.falling-coin, .firefly, .trumpet-icon, .firework-particle, .ice-overlay-container, .black-hole-container').forEach(e => e.remove());
        document.querySelectorAll('.active-ice-table').forEach(tbl => tbl.classList.remove('active-ice-table'));
        document.querySelectorAll('.anim-suck-in').forEach(tbl => tbl.classList.remove('anim-suck-in'));
    }
}

// --- 5. SOUND MANAGER (WEB AUDIO API SYNTH) ---
class SoundManager {
    constructor() {
        this.enabled = localStorage.getItem('yamb_sound') !== 'false';
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        this.ctx = new AudioContext();
        this.audioCache = {};
        if (typeof CONFIG !== 'undefined' && CONFIG.SOUNDS) {
            Object.entries(CONFIG.SOUNDS).forEach(([key, file]) => {
                this.audioCache[key] = new Audio(`assets/sounds/${file}`);
                this.audioCache[key].volume = 0.6; 
            });
        }
    }

    playSound(key, synthCallback) {
        if (!this.enabled) return;
        if (this.ctx.state === 'suspended') { this.ctx.resume().catch(e => console.log("Audio resume failed", e)); }
        if (this.audioCache[key]) {
            const sound = this.audioCache[key].cloneNode(); sound.volume = 0.5;
            const playPromise = sound.play();
            if (playPromise !== undefined) { playPromise.catch(() => { if (synthCallback) synthCallback.call(this); }); }
        } else {
            if (synthCallback) synthCallback.call(this);
        }
    }

    click() { 
        this.playSound('CLICK', () => {
            const t = this.ctx.currentTime; const osc = this.ctx.createOscillator(); const gain = this.ctx.createGain();
            osc.type = 'sine'; osc.frequency.setValueAtTime(800, t); osc.frequency.exponentialRampToValueAtTime(300, t + 0.1);
            gain.gain.setValueAtTime(0.15, t); gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
            osc.connect(gain); gain.connect(this.ctx.destination); osc.start(t); osc.stop(t + 0.1);
        });
    }

    announce() {
        this.playSound('ANNOUNCE', () => {
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
        this.playSound('DICE_ROLL', () => {
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
        this.playSound('ACHIEVEMENT', () => {
            const t = this.ctx.currentTime; const osc = this.ctx.createOscillator(); const gain = this.ctx.createGain();
            osc.type = 'triangle'; osc.frequency.setValueAtTime(440, t); osc.frequency.linearRampToValueAtTime(880, t + 0.1); 
            gain.gain.setValueAtTime(0.1, t); gain.gain.linearRampToValueAtTime(0, t + 0.3);
            osc.connect(gain); gain.connect(this.ctx.destination); osc.start(t); osc.stop(t + 0.3);
        });
    }

    win() {
        this.playSound('WIN', () => {
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
        const t = this.ctx.currentTime; const osc = this.ctx.createOscillator(); const gain = this.ctx.createGain();
        osc.type = 'sawtooth'; osc.frequency.setValueAtTime(150, t); osc.frequency.linearRampToValueAtTime(100, t + 0.15);
        gain.gain.setValueAtTime(0.1, t); gain.gain.linearRampToValueAtTime(0, t + 0.15);
        osc.connect(gain); gain.connect(this.ctx.destination); osc.start(t); osc.stop(t + 0.2);
    }

    trophy() {
        this.playSound('TROPHY', () => {
            const t = this.ctx.currentTime;
            [440, 554.37].forEach(f => {
                const osc = this.ctx.createOscillator(); const gain = this.ctx.createGain();
                osc.type = 'sine'; osc.frequency.value = f;
                gain.gain.setValueAtTime(0.2, t); gain.gain.exponentialRampToValueAtTime(0.001, t + 1.5);
                osc.connect(gain); gain.connect(this.ctx.destination); osc.start(t); osc.stop(t + 1.5);
            });
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
        
        this.unlocked = JSON.parse(localStorage.getItem('yamb_unlocked')) || ['default', 'confetti'];
        this.balance = parseInt(localStorage.getItem('yamb_dukati')) || 0;
        
        this.activeKey = this.type === 'skin' ? 'yamb_active_skin' : 'yamb_active_effect';
        this.activeItem = localStorage.getItem(this.activeKey) || (this.type === 'skin' ? 'default' : 'confetti');

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
                    priceHtml = `<div class="status ${isUnlocked ? 'status-unlocked' : 'status-locked'}">${isUnlocked ? _safeT('btn_bought') : `💰 ${item.reward}`}</div>`;
                } else {
                    if (isUnlocked) {
                        priceHtml = `<div class="price">✔ ${_safeT('btn_bought')}</div>`;
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

                let btnHtml = '';
                if (this.type !== 'trophy') {
                    if (isActive) {
                        btnHtml = `<button class="btn-action btn-active">${_safeT('btn_active')}</button>`;
                    } else if (isUnlocked) {
                        btnHtml = `<button class="btn-action btn-equip" onclick="shop.equip('${item.id}')">${_safeT('btn_equip')}</button>`;
                    } else {
                        const reqMet = !item.req || this.unlocked.includes(item.req);
                        
                        if (reqMet) {
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
            window.adMobGlobal.updateUI(window.adMobGlobal.ads.rewarded.isReady);
        }
    }

    equip(id) {
        this.activeItem = id;
        localStorage.setItem(this.activeKey, id);
        this.render();
        if(window.app && window.app.soundMgr) window.app.soundMgr.click();
        else if (window.statsManager) { 
            const sm = new SoundManager();
            sm.click();
        }
    }

    async tryBuy(id, name, price) {
        if (this.balance < price) {
            if (window.modalManager) {
                window.modalManager.alert(_safeT('msg_no_money'), _safeT('modal_title_info'));
            }
            return;
        }
        
        if (window.modalManager) {
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
        localStorage.setItem('yamb_unlocked', JSON.stringify(this.unlocked));
        
        if (window.statsManager) {
            window.statsManager.stats.balance = this.balance;
            window.statsManager.saveStats();
        }

        this.updateBalanceDisplay();
        this.render();
        
        if(window.app && window.app.soundMgr) window.app.soundMgr.trophy(); 
        else { const sm = new SoundManager(); sm.trophy(); }

        if (window.modalManager) {
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
    
    addBalance(amount) {
        this.balance += amount;
        localStorage.setItem('yamb_dukati', this.balance);
        if (window.statsManager) {
            window.statsManager.stats.balance = this.balance;
            window.statsManager.saveStats();
        }
        this.updateBalanceDisplay();
    }

    // ISPRAVKA: Dodata provera isReady i notifikacija za nagradno dugme
    async watchAdForCoins() {
        const adCtrl = this.getAdController();
        if (adCtrl) {
             if (!adCtrl.ads.rewarded.isReady) {
                 if (window.modalManager) {
                     window.modalManager.alert(_safeT('ad_not_ready') || "Reklama se još učitava ili trenutno nema dostupnih reklama na mreži. Pokušajte ponovo za par sekundi.", _safeT('modal_title_info') || "INFO");
                 }
                 adCtrl.prepareReward(); // Forsiraj ponovno učitavanje
                 return;
             }

             const success = await adCtrl.showRewardVideo();
             if (success) {
                 this.addBalance(500); 
                 
                 if(window.app && window.app.soundMgr) window.app.soundMgr.win(); 
                 else { const sm = new SoundManager(); sm.win(); }

                 this.updateBalanceDisplay();
                 
                 if (window.modalManager) {
                     window.modalManager.alert("+500 💰", _safeT('msg_reward_title') || "NAGRADA");
                 }
             }
        }
    }
}

// --- 7. ADMOB CONTROLLER (PRODUKCIJA - ČIST NATIVE, BEZ SIMULACIJE) ---
class AdMobController {
    constructor() {
        this.rewardedId = 'ca-app-pub-4319963185096437/7896891915'; 
        this.interstitialId = 'ca-app-pub-4319963185096437/2913237519'; 
        
        this.adMobPlugin = null;
        
        this.ads = {
            rewarded: { isReady: false, isLoading: false, retryCount: 0 },
            interstitial: { isReady: false, isLoading: false, retryCount: 0 }
        };
        
        this.baseRetryDelay = 1000;   
        this.maxRetryDelay = 30000;   
        
        // ISPRAVKA: Promenjeno #btn-ad-coins u .btn-add-coins kako bi se slagalo sa HTML dugmićima u prodavnici
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
                await this.adMobPlugin.initialize();
                await this.setupListeners();
                this.triggerHighPriorityLoad('rewarded');
                this.triggerHighPriorityLoad('interstitial');
            } catch (err) { console.error("❌ AdMob SDK greška pri inicijalizaciji:", err); }
        } else {
            this.updateUI(false);
        }
    }

    async setupListeners() {
        if (!this.adMobPlugin) return;

        await this.adMobPlugin.addListener('onRewardedVideoAdLoaded', () => this.handleAdLoaded('rewarded'));
        await this.adMobPlugin.addListener('onRewardedVideoAdFailedToLoad', (err) => this.handleAdFailed('rewarded', err));
        
        await this.adMobPlugin.addListener('onRewardedVideoAdReward', (reward) => {
            if (this.rewardResolve) { this.rewardResolve(true); this.rewardResolve = null; }
        });

        await this.adMobPlugin.addListener('onRewardedVideoAdDismissed', () => {
            if (this.rewardResolve) { this.rewardResolve(false); this.rewardResolve = null; }
            this.handleAdDismissed('rewarded');
        });

        await this.adMobPlugin.addListener('interstitialAdLoaded', () => this.handleAdLoaded('interstitial'));
        await this.adMobPlugin.addListener('interstitialAdFailedToLoad', (err) => this.handleAdFailed('interstitial', err));
        await this.adMobPlugin.addListener('interstitialAdDismissed', () => this.handleAdDismissed('interstitial'));
    }

    handleAdLoaded(type) {
        this.ads[type].isReady = true;
        this.ads[type].isLoading = false;
        this.ads[type].retryCount = 0; 
        if (type === 'rewarded') this.updateUI(true);
    }

    handleAdFailed(type, err) {
        this.ads[type].isReady = false;
        this.ads[type].isLoading = false;
        if (type === 'rewarded') this.updateUI(false);

        this.ads[type].retryCount++;
        const nextDelay = Math.min(this.baseRetryDelay * Math.pow(1.2, this.ads[type].retryCount), this.maxRetryDelay);
        setTimeout(() => this.preloadAd(type), nextDelay);
    }

    handleAdDismissed(type) {
        this.ads[type].isReady = false;
        if (type === 'rewarded') this.updateUI(false);
        this.ads[type].retryCount = 0; 
        this.preloadAd(type);
    }

    async preloadAd(type) {
        if (!this.adMobPlugin) return;
        if (this.ads[type].isLoading || this.ads[type].isReady) return;
        this.ads[type].isLoading = true;

        try {
            if (type === 'rewarded') {
                await this.adMobPlugin.prepareRewardVideoAd({ adId: this.rewardedId, isTesting: false });
            } else if (type === 'interstitial') {
                await this.adMobPlugin.prepareInterstitial({ adId: this.interstitialId, isTesting: false, autoShow: false });
            }
        } catch (e) {
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

    updateUI(ready) {
        this.uiSelectors.forEach(selector => {
            const buttons = document.querySelectorAll(selector);
            buttons.forEach(btn => {
                if (ready) {
                    btn.classList.remove('disabled', 'ad-loading');
                    btn.disabled = false;
                    btn.style.opacity = '1';
                    btn.style.filter = 'none';
                    if (btn.dataset.originalText) btn.innerText = btn.dataset.originalText;
                } else {
                    btn.classList.add('disabled', 'ad-loading');
                    btn.disabled = true;
                    btn.style.opacity = '0.6'; 
                    btn.style.filter = 'grayscale(100%)';
                    if (!btn.dataset.originalText) btn.dataset.originalText = btn.innerText;
                }
            });
        });
    }

    // ISPRAVKA: Dodato upozorenje ako se metoda otegne / nije spremna
    showRewardVideo() {
        return new Promise(async (resolve) => {
            if (!this.adMobPlugin) { resolve(false); return; }

            if (this.ads.rewarded.isReady) {
                try {
                    this.rewardResolve = resolve;
                    await this.adMobPlugin.showRewardVideoAd();
                } catch (e) {
                    this.rewardResolve = null;
                    this.handleAdFailed('rewarded', e);
                    resolve(false);
                }
            } else {
                if(window.modalManager) {
                    window.modalManager.alert(_safeT('ad_not_ready') || "Reklama se učitava ili trenutno nije dostupna na mreži. Pokušajte za par sekundi.", _safeT('modal_title_info') || "INFO");
                }
                this.triggerHighPriorityLoad('rewarded');
                resolve(false);
            }
        });
    }

    showInterstitial() {
        return new Promise(async (resolve) => {
            if (!this.adMobPlugin) { resolve(false); return; }
            
            if (this.ads.interstitial.isReady) {
                try {
                    await this.adMobPlugin.showInterstitial();
                    resolve(true);
                } catch (e) {
                    this.handleAdFailed('interstitial', e);
                    resolve(false);
                }
            } else {
                this.triggerHighPriorityLoad('interstitial');
                resolve(false);
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
});