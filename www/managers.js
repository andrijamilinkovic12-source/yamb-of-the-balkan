// managers.js - KOMPLETAN KOD (OPTIMIZOVAN ADMOB v2.0)

// --- POMOĆNE FUNKCIJE ZA LOKALIZACIJU ---
const getLang = () => localStorage.getItem('yamb_lang') || 'sr';
const _safeT = (key) => (typeof t !== 'undefined' ? t(key) : key);
const resolveText = (data) => {
    const lang = getLang();
    if (typeof data === 'object' && data !== null) {
        return data[lang] || data['sr'] || "";
    }
    return data; 
};

// --- STATE MANAGER ---
class StateManager {
    constructor() {
        this.currentPage = 'index';
        this.pages = { 'index': 'main-menu', 'kockice': 'game-container', 'riznica': 'riznica-container' };
    }
    navigateTo(pageId) { console.log(`Navigating to: ${pageId}`); }
}

// --- STATS MANAGER ---
class StatsManager {
    constructor() {
        this.stats = this.loadStats() || {
            wins: 0, losses: 0, totalGames: 0, currentWinStreak: 0, currentLossStreak: 0,
            balance: 1000, unlockedTrophies: [], highscore: 0
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

// --- SOUND MANAGER ---
class SoundManager {
    constructor() {
        this.enabled = localStorage.getItem('yamb_sound') !== 'false';
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        this.ctx = new AudioContext();
    }

    playTone(freq, type, duration, startTime = 0, volume = 0.08) {
        if (!this.enabled || !this.ctx) return;
        if (this.ctx.state === 'suspended') {
            this.ctx.resume().catch(e => console.log("Audio resume failed", e));
        }

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = type; 
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime + startTime);
        
        gain.gain.setValueAtTime(volume, this.ctx.currentTime + startTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + startTime + duration);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(this.ctx.currentTime + startTime);
        osc.stop(this.ctx.currentTime + startTime + duration);
    }

    click() { this.playTone(600, 'sine', 0.05, 0, 0.05); }
    score() { this.playTone(800, 'triangle', 0.1, 0, 0.06); }
    chat() { this.playTone(600, 'sine', 0.1, 0, 0.05); this.playTone(900, 'sine', 0.1, 0.1, 0.05); }

    roll() {
        if (!this.enabled) return;
        if (this.ctx.state === 'suspended') this.ctx.resume();
        const count = 8; 
        for (let i = 0; i < count; i++) {
            const randomTimeOffset = Math.random() * 0.03;
            const time = (i * 0.07) + randomTimeOffset; 
            const freq = 800 + Math.random() * 800; 
            this.playTone(freq, 'triangle', 0.05, time, 0.06);
        }
    }

    win() {
        this.playTone(523.25, 'sine', 0.3, 0, 0.1);    
        this.playTone(659.25, 'sine', 0.3, 0.2, 0.1);  
        this.playTone(783.99, 'sine', 0.3, 0.4, 0.1);  
        this.playTone(1046.50, 'triangle', 0.6, 0.6, 0.08); 
    }

    loss() {
        this.playTone(300, 'sine', 0.4, 0, 0.1);
        this.playTone(250, 'sine', 0.4, 0.3, 0.1);
        this.playTone(200, 'triangle', 0.8, 0.6, 0.1);
    }

    trophy() {
        this.playTone(523.25, 'triangle', 0.15, 0, 0.1);
        this.playTone(659.25, 'triangle', 0.15, 0.1, 0.1);
        this.playTone(783.99, 'triangle', 0.6, 0.2, 0.1);
    }

    error() { this.playTone(150, 'triangle', 0.2, 0, 0.1); }
}

// --- SHOP MANAGER ---
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
                            
                            // PROVERA STANJA REKLAME ZA DISCOUNT DUGME
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
        
        // Osveži UI stanje dugmića nakon renderovanja
        if(window.adMobGlobal) {
            window.adMobGlobal.updateUI(window.adMobGlobal.isAdReady);
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

    tryBuy(id, name, price) {
        if (this.balance < price) {
            if (typeof showNotification === 'function') {
                showNotification(_safeT('modal_title_info'), _safeT('msg_no_money'), "❌", "error");
            } else {
                alert(_safeT('msg_no_money'));
            }
            return;
        }
        
        if (typeof openConfirmModal === 'function') {
            openConfirmModal(id, name, price);
        } else if(confirm(`${_safeT('msg_confirm_buy')} ${name}?`)) {
            this.processTransaction(id, price);
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

        if (typeof showNotification === 'function') {
            window.showNotification(_safeT('modal_title_info'), _safeT('msg_purchase_success'), "🛍️", "success");
        } else {
            alert(_safeT('msg_purchase_success'));
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

    async watchAdForCoins() {
        const adCtrl = this.getAdController();
        if (adCtrl) {
             const success = await adCtrl.showRewardVideo();
             if (success) {
                 this.addBalance(500); 
                 
                 if(window.app && window.app.soundMgr) window.app.soundMgr.win(); 
                 else { const sm = new SoundManager(); sm.win(); }

                 this.updateBalanceDisplay();
                 
                 // Show success message
                 if (typeof showNotification === 'function') {
                     showNotification(_safeT('msg_reward_title'), "+500 💰", "🎉", "success");
                 } else {
                     alert("💰 " + _safeT('msg_reward_title') + "\n+500 Dukata!");
                 }
             }
        }
    }
}

// --- UNAPREĐENI ADMOB CONTROLLER (SMART PRELOAD v2.0) ---
class AdMobController {
    constructor() {
        // Tvoj AdMob ID
        this.rewardedId = 'ca-app-pub-4319963185096437/7896891915'; 
        this.adMobPlugin = null;
        this.isAdReady = false; 
        this.isLoading = false; 
        
        // Retry logika (Smart Backoff)
        this.retryAttempt = 0; 
        this.maxRetryDelay = 30000; // Max 30s
        
        this.uiSelectors = ['.btn-ad-double', '#btn-ad-coins', '.btn-discount', '.btn-ad-state-aware']; 

        this.createSimulationOverlay();
        this.initialize();
    }

    async initialize() {
        let attempts = 0;
        // Proveravamo plugin agresivnije na početku (svakih 500ms)
        const initInterval = setInterval(async () => {
            attempts++;
            if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.AdMob) {
                clearInterval(initInterval);
                this.adMobPlugin = window.Capacitor.Plugins.AdMob;
                console.log("✅ AdMob Plugin: PRONAĐEN! Pokrećem inicijalizaciju...");

                try {
                    await this.adMobPlugin.initialize({
                        requestTrackingAuthorization: true
                    });
                    
                    await this.setupListeners();
                    
                    // ODMAH učitaj prvu reklamu, bez čekanja!
                    this.loadAd(); 
                    
                } catch (e) {
                    console.error("AdMob Init Error:", e);
                }
            } else {
                // Odustajemo posle 10 sekundi (20 * 500ms)
                if (attempts >= 20) clearInterval(initInterval);
            }
        }, 500);
        
        this.updateUI(false);
    }

    async setupListeners() {
        if (!this.adMobPlugin) return;

        // 1. REKLAMA JE STIGLA
        await this.adMobPlugin.addListener('onRewardedVideoAdLoaded', () => {
            console.log("✅ ADMOB: Reklama spremna! (Attempt: " + this.retryAttempt + ")");
            this.isAdReady = true;
            this.isLoading = false;
            this.retryAttempt = 0; // Resetujemo brojač grešaka jer smo uspeli
            this.updateUI(true); 
        });

        // 2. GREŠKA U UČITAVANJU (SMART RETRY)
        await this.adMobPlugin.addListener('onRewardedVideoAdFailedToLoad', (err) => {
            this.isAdReady = false;
            this.isLoading = false;
            this.updateUI(false); 

            // Izračunaj pametno vreme čekanja: 2s, 4s, 8s, 16s, 30s (max)
            // Ovo rešava problem sporog starta!
            let nextDelay = Math.min(2000 * Math.pow(2, this.retryAttempt), this.maxRetryDelay);
            
            console.warn(`❌ ADMOB: Greška. Ponovni pokušaj za ${nextDelay/1000}s.`, err);
            
            this.retryAttempt++;
            setTimeout(() => this.loadAd(), nextDelay);
        });

        // 3. KORISNIK JE POGLEDAO REKLAMU
        await this.adMobPlugin.addListener('onRewardedVideoAdClosed', () => {
            console.log("🏁 ADMOB: Reklama zatvorena.");
            this.isAdReady = false;
            this.updateUI(false);
            this.retryAttempt = 0; // Reset
            
            // Odmah pre-loaduj sledeću za kasnije
            setTimeout(() => this.loadAd(), 100);
        });
    }

    async loadAd() {
        if (this.isAdReady || this.isLoading || !this.adMobPlugin) return;
        
        console.log("⏳ ADMOB: Učitavam reklamu...");
        this.isLoading = true;
        try {
            await this.adMobPlugin.prepareRewardVideoAd({ adId: this.rewardedId });
        } catch (e) {
            console.error("Prepare Error:", e);
            this.isLoading = false;
            // Ako prepare pukne sinhrono, odmah triggiraj retry logiku
            this.adMobPlugin.notifyListeners('onRewardedVideoAdFailedToLoad', { error: e });
        }
    }
    
    // Metoda koju možeš pozvati kad korisnik uđe u Riznicu da ubrzaš stvar
    triggerHighPriorityLoad() {
        if (!this.isAdReady && !this.isLoading) {
            console.log("🚀 ADMOB: Forsirano prioritetno učitavanje!");
            this.retryAttempt = 0; // Resetujemo da bi pokušao odmah
            this.loadAd();
        }
    }
    
    // Metoda za Game Over ekran da osigura da je reklama spremna za dupliranje
    prepareReward() {
        this.triggerHighPriorityLoad();
    }

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
                    // Ne menjamo opacity drastično da se vidi loading ikonica (iz CSS-a)
                    btn.style.opacity = '0.7'; 
                    btn.style.filter = 'grayscale(100%)';
                    if (!btn.dataset.originalText) btn.dataset.originalText = btn.innerText;
                }
            });
        });
    }

    showRewardVideo() {
        return new Promise(async (resolve) => {
            if (!this.adMobPlugin) {
                this.runSimulation(resolve); 
                return;
            }

            if (this.isAdReady) {
                try {
                    await this.adMobPlugin.showRewardVideoAd();
                    resolve(true);
                } catch (e) {
                    console.error("Greška pri prikazu:", e);
                    this.isAdReady = false;
                    this.updateUI(false);
                    this.loadAd(); 
                    resolve(false);
                }
            } else {
                console.log("⚠️ Korisnik kliknuo, reklama nije spremna. Forsiram load.");
                this.triggerHighPriorityLoad();
                
                const msg = (typeof t !== 'undefined') ? t('msg_ad_loading') : "Učitavanje reklame... Pokušaj ponovo za par sekundi.";
                if(typeof showNotification === 'function') {
                    showNotification("AdMob", msg, "⏳", "info");
                } else {
                    alert(msg);
                }
                resolve(false);
            }
        });
    }
    
    // --- SIMULACIJA (BEZ PROMENA) ---
    createSimulationOverlay() {
        if (document.getElementById('sim-ad-overlay')) return;
        const overlay = document.createElement('div');
        overlay.id = 'sim-ad-overlay';
        overlay.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.95); z-index: 99999; display: none; flex-direction: column; align-items: center; justify-content: center; color: white; font-family: sans-serif;';
        const txtTitle = (typeof resolveText !== 'undefined') ? resolveText('ad_sim_title') : "REKLAMA";
        overlay.innerHTML = `<div style="font-size: 1.2rem; margin-bottom: 20px;">${txtTitle}</div><div id="sim-spinner" style="border: 4px solid #333; border-top: 4px solid #2196F3; border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite; margin-bottom: 20px;"></div><div id="sim-counter" style="font-size: 3rem; font-weight: bold; color: #2196F3;">5</div><style>@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }</style>`;
        document.body.appendChild(overlay);
    }

    runSimulation(resolve) {
        const overlay = document.getElementById('sim-ad-overlay');
        const counter = document.getElementById('sim-counter');
        if (!overlay || !counter) { this.createSimulationOverlay(); setTimeout(() => this.runSimulation(resolve), 100); return; }
        let timeLeft = 5; 
        counter.innerText = timeLeft; 
        overlay.style.display = 'flex';
        
        const interval = setInterval(() => { 
            timeLeft--; 
            counter.innerText = timeLeft; 
            if (timeLeft <= 0) { 
                clearInterval(interval); 
                overlay.style.display = 'none'; 
                resolve(true); 
            } 
        }, 1000);
    }
}

// Globalne instance
window.stateManager = new StateManager();
window.statsManager = new StatsManager();
window.adMobGlobal = new AdMobController();