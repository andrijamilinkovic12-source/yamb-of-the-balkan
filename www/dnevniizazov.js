// dnevniizazov.js - STANDALONE DAILY CHALLENGE (GLASSMORPHISM EDITION)

class DnevniIzazov {
    constructor(app) {
        this.app = app;
        this.currentIndex = 0;
        this.interval = null;
        this.diceValues = [0, 0, 0, 0, 0, 0];
        this.isActive = false;
        this.calculatedReward = 0;
        
        this.injectGlassCSS();
        this.buildUI();
    }

    injectGlassCSS() {
        if (document.getElementById('glass-daily-css')) return;
        const style = document.createElement('style');
        style.id = 'glass-daily-css';
        style.innerHTML = `
            .glass-overlay {
                position: fixed;
                inset: 0;
                width: 100vw;
                height: 100dvh;
                padding: max(18px, env(safe-area-inset-top)) 16px max(18px, env(safe-area-inset-bottom));
                background:
                    linear-gradient(180deg, rgba(5, 10, 18, 0.86), rgba(1, 5, 10, 0.94)),
                    radial-gradient(circle at 50% 0%, rgba(224, 201, 149, 0.16), transparent 44%);
                backdrop-filter: blur(18px);
                -webkit-backdrop-filter: blur(18px);
                z-index: 99999;
                display: none;
                align-items: center;
                justify-content: center;
                opacity: 0;
                transition: opacity 0.28s ease;
            }

            .glass-overlay.active { display: flex; opacity: 1; }

            .glass-card {
                width: min(430px, 100%);
                max-height: calc(100dvh - 34px);
                padding: 26px 18px 20px;
                display: flex;
                flex-direction: column;
                align-items: center;
                position: relative;
                overflow: hidden;
                isolation: isolate;
                border-radius: 22px;
                border: 1px solid rgba(224, 201, 149, 0.34);
                background:
                    linear-gradient(180deg, rgba(21, 31, 42, 0.96), rgba(7, 14, 22, 0.98)),
                    linear-gradient(135deg, rgba(255,255,255,0.10), rgba(255,255,255,0.02));
                box-shadow:
                    0 26px 70px rgba(0, 0, 0, 0.62),
                    0 0 0 1px rgba(255,255,255,0.05) inset,
                    0 14px 0 rgba(0,0,0,0.28);
            }

            .glass-card::before {
                content: '';
                position: absolute;
                inset: 0;
                background:
                    linear-gradient(90deg, transparent, rgba(224, 201, 149, 0.12), transparent) top / 100% 1px no-repeat,
                    linear-gradient(180deg, rgba(255,255,255,0.08), transparent 38%);
                pointer-events: none;
                z-index: 0;
            }

            .glass-card::after {
                content: '';
                position: absolute;
                left: 18px;
                right: 18px;
                bottom: 13px;
                height: 4px;
                border-radius: 999px;
                background: linear-gradient(90deg, transparent, rgba(224, 201, 149, 0.38), transparent);
                opacity: 0.75;
                pointer-events: none;
                z-index: 0;
            }

            .glass-header {
                z-index: 1;
                width: 100%;
                text-align: center;
                margin-bottom: 20px;
                padding: 0 10px;
            }

            .glass-title {
                color: var(--gold-main);
                font-size: clamp(1.45rem, 7vw, 1.95rem);
                font-weight: 950;
                letter-spacing: 0;
                text-shadow: 0 2px 0 rgba(0,0,0,0.48), 0 0 18px rgba(224, 201, 149, 0.28);
                margin: 0;
                line-height: 1.08;
            }

            .glass-subtitle {
                color: rgba(255,255,255,0.72);
                font-size: 0.78rem;
                text-transform: uppercase;
                letter-spacing: 1px;
                line-height: 1.45;
                margin-top: 8px;
            }

            .glass-dice-grid {
                display: grid;
                grid-template-columns: repeat(3, minmax(0, 1fr));
                gap: 12px;
                z-index: 1;
                width: 100%;
                margin-bottom: 18px;
                padding: 12px;
                border-radius: 18px;
                border: 1px solid rgba(255,255,255,0.09);
                background: rgba(0,0,0,0.22);
                box-shadow: inset 0 1px 0 rgba(255,255,255,0.06), inset 0 -18px 38px rgba(0,0,0,0.16);
            }

            .glass-die {
                min-width: 0;
                aspect-ratio: 1;
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: 16px;
                border: 1px solid rgba(255,255,255,0.15);
                background: linear-gradient(145deg, rgba(248, 250, 252, 0.98), rgba(218, 226, 236, 0.96));
                color: #111827;
                font-size: 2.1rem;
                font-weight: 900;
                box-shadow:
                    0 8px 0 rgba(92, 71, 25, 0.45),
                    0 14px 24px rgba(0,0,0,0.28),
                    inset 0 2px 0 rgba(255,255,255,0.82);
                transform: translateY(0);
                transition: transform 0.18s ease, filter 0.18s ease, box-shadow 0.18s ease;
            }

            .glass-die .dice-dots-wrapper {
                width: 68%;
                height: 68%;
            }

            .glass-die .dice-dot {
                background: #101827;
                box-shadow: 0 1px 0 rgba(255,255,255,0.24) inset;
            }

            .glass-die.rolling {
                color: var(--gold-main);
                background: linear-gradient(145deg, rgba(255, 249, 224, 1), rgba(224, 201, 149, 0.96));
                filter: saturate(1.08);
                animation: dailyDiceShake 0.24s infinite;
                box-shadow:
                    0 8px 0 rgba(128, 92, 18, 0.58),
                    0 0 26px rgba(224, 201, 149, 0.42),
                    inset 0 2px 0 rgba(255,255,255,0.88);
            }

            .glass-die.locked {
                transform: translateY(-3px);
                border-color: rgba(224, 201, 149, 0.56);
                box-shadow:
                    0 10px 0 rgba(97, 70, 17, 0.62),
                    0 18px 26px rgba(0,0,0,0.32),
                    0 0 18px rgba(224, 201, 149, 0.24),
                    inset 0 2px 0 rgba(255,255,255,0.88);
            }

            .glass-score-box {
                width: 100%;
                z-index: 1;
                margin-bottom: 18px;
                padding: 14px 18px;
                display: grid;
                grid-template-columns: 1fr auto;
                align-items: center;
                gap: 14px;
                border-radius: 16px;
                border: 1px solid rgba(224, 201, 149, 0.22);
                background: linear-gradient(180deg, rgba(255,255,255,0.08), rgba(255,255,255,0.03));
                box-shadow: inset 0 1px 0 rgba(255,255,255,0.08);
            }

            .glass-score-lbl {
                min-width: 0;
                color: rgba(255,255,255,0.66);
                font-size: 0.72rem;
                font-weight: 800;
                text-transform: uppercase;
                letter-spacing: 1px;
                text-align: left;
            }

            .glass-score-val {
                color: var(--gold-main);
                font-size: 2.25rem;
                font-weight: 950;
                line-height: 1;
                min-width: 72px;
                text-align: right;
                text-shadow: 0 2px 0 rgba(0,0,0,0.44), 0 0 16px rgba(224, 201, 149, 0.24);
            }

            .glass-btn {
                width: 100%;
                min-height: 54px;
                z-index: 1;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                gap: 10px;
                padding: 15px 20px;
                border: 1px solid rgba(255,255,255,0.42);
                border-radius: 16px;
                background: linear-gradient(180deg, #f7d76a, #d79a22);
                color: #161008;
                font-weight: 950;
                font-size: 1rem;
                letter-spacing: 0;
                text-transform: uppercase;
                cursor: pointer;
                box-shadow: 0 8px 0 #765018, 0 16px 28px rgba(0,0,0,0.34), inset 0 2px 0 rgba(255,255,255,0.45);
                transition: transform 0.1s ease, filter 0.2s ease, box-shadow 0.1s ease;
            }

            .glass-btn:active {
                transform: translateY(5px);
                box-shadow: 0 3px 0 #765018, 0 9px 18px rgba(0,0,0,0.32), inset 0 3px 8px rgba(88,55,6,0.22);
            }

            .glass-btn:disabled {
                filter: grayscale(85%);
                opacity: 0.62;
                cursor: not-allowed;
                transform: none;
            }

            .glass-daily-result {
                width: 100%;
                z-index: 2;
                display: flex;
                flex-direction: column;
                gap: 10px;
                margin-top: 2px;
            }

            .glass-btn-double {
                background: linear-gradient(180deg, #ffe27a, #e4a72a);
            }

            .glass-btn-claim {
                background: linear-gradient(180deg, rgba(255,255,255,0.14), rgba(255,255,255,0.07));
                color: #fff;
                border-color: rgba(255,255,255,0.18);
                box-shadow: 0 7px 0 rgba(0,0,0,0.36), 0 14px 24px rgba(0,0,0,0.24), inset 0 1px 0 rgba(255,255,255,0.12);
            }

            .glass-btn-claim:active {
                box-shadow: 0 2px 0 rgba(0,0,0,0.36), 0 9px 18px rgba(0,0,0,0.22), inset 0 3px 8px rgba(0,0,0,0.20);
            }

            @media (max-width: 380px) {
                .glass-card { padding: 22px 14px 18px; border-radius: 20px; }
                .glass-dice-grid { gap: 9px; padding: 9px; }
                .glass-die { border-radius: 13px; font-size: 1.75rem; }
                .glass-score-val { font-size: 2rem; min-width: 58px; }
                .glass-btn { min-height: 50px; font-size: 0.92rem; }
            }

            @keyframes dailyDiceShake {
                0% { transform: translate(1px, 1px) rotate(0deg); }
                25% { transform: translate(-2px, 1px) rotate(-1deg); }
                50% { transform: translate(2px, -1px) rotate(1deg); }
                75% { transform: translate(-1px, -2px) rotate(-1deg); }
                100% { transform: translate(1px, 1px) rotate(0deg); }
            }
        `;
        document.head.appendChild(style);
    }

    buildUI() {
        const txtTitle = t('dc_title');
        const txtSub = t('dc_desc');
        const txtSum = t('dc_sum');
        const txtStop = t('dc_stop');

        const overlay = document.createElement('div');
        overlay.id = 'glass-daily-overlay';
        overlay.className = 'glass-overlay';
        overlay.innerHTML = `
            <div class="glass-card" id="glass-daily-card">
                <div class="glass-header">
                    <h2 class="glass-title">${txtTitle}</h2>
                    <div class="glass-subtitle">${txtSub}</div>
                </div>
                
                <div class="glass-dice-grid">
                    <div id="gd-0" class="glass-die">?</div>
                    <div id="gd-1" class="glass-die">?</div>
                    <div id="gd-2" class="glass-die">?</div>
                    <div id="gd-3" class="glass-die">?</div>
                    <div id="gd-4" class="glass-die">?</div>
                    <div id="gd-5" class="glass-die">?</div>
                </div>

                <div class="glass-score-box">
                    <div class="glass-score-lbl">${txtSum}</div>
                    <div class="glass-score-val" id="glass-daily-sum">0</div>
                </div>

                <button id="glass-btn-action" class="glass-btn" onclick="dnevniIzazov.stopDice()">${txtStop}</button>
            </div>
        `;
        document.body.appendChild(overlay);
    }

    getDiceDotsHTML(val) {
        if (this.app && typeof this.app.getDiceDotsHTML === 'function') {
            return this.app.getDiceDotsHTML(val);
        }

        if (!val || val < 1 || val > 6) return '';
        let dots = '';
        for (let i = 0; i < val; i++) {
            dots += '<div class="dice-dot"></div>';
        }
        return `<div class="dice-dots-wrapper val-${val}">${dots}</div>`;
    }

    open() {
        if (!this.app.requireLogin()) return;

        const uid = localStorage.getItem('yamb_uid');
        const lastPlayed = localStorage.getItem('yamb_last_daily_' + uid);
        const today = new Date().toDateString();

        if (lastPlayed === today) {
            this.app.modal.alert(t('dc_done'), t('info_title'));
            return;
        }

        // --- ANTI-CHEAT: Zapisujemo odmah na klijentu čim se izazov otvori ---
        localStorage.setItem('yamb_last_daily_' + uid, today);
        
        // --- ANTI-CHEAT: Šaljemo odmah na server pre nego što igra i krene ---
        if (this.app.socket) {
            if (this.app.socket.disconnected) {
                this.app.socket.connect();
            }
            
            // Osiguravamo ispravno dohvatanje statistike 
            let currentStats = {};
            if (typeof getFullLocalStats === 'function') {
                currentStats = getFullLocalStats();
            } else if (typeof this.app.getFullLocalStats === 'function') {
                currentStats = this.app.getFullLocalStats();
            }
            currentStats.lastDaily = today;

            this.app.socket.emit('set_player_data', {
                uid: uid || this.app.playerId,
                name: this.app.playerName,
                stats: currentStats,
                playerId: this.app.playerId
            });
        }
        // ----------------------------------------------------------------------

        const overlay = document.getElementById('glass-daily-overlay');
        if(overlay) overlay.classList.add('active');

        this.resetGame();
        this.startRolling(0);
    }

    close() {
        if (this.isActive) return; // Ne daj izlaz usred rolanja
        const overlay = document.getElementById('glass-daily-overlay');
        if(overlay) overlay.classList.remove('active');
    }

    resetGame() {
        this.currentIndex = 0;
        this.diceValues = [0, 0, 0, 0, 0, 0];
        this.isActive = true;
        this.calculatedReward = 0;
        
        document.getElementById('glass-daily-sum').innerText = "0";
        
        const btn = document.getElementById('glass-btn-action');
        btn.disabled = false;
        btn.style.display = 'block';
        
        // Reset kockica i primena skinova
        for(let i=0; i<6; i++) {
            const el = document.getElementById(`gd-${i}`);
            el.innerHTML = "?";
            el.className = 'glass-die'; // Reset klasa
            if (this.app.features) this.app.features.applySkinToElement(el);
        }

        // Sakrij ako postoji Result UI od prošlog puta
        const resUI = document.getElementById('glass-daily-result');
        if (resUI) resUI.remove();
    }

    startRolling(index) {
        if (index >= 6) {
            this.finishGame();
            return;
        }

        const dieEl = document.getElementById(`gd-${index}`);
        dieEl.classList.add('rolling');
        
        this.interval = setInterval(() => {
            const rnd = Math.floor(Math.random() * 6) + 1;
            dieEl.innerHTML = this.getDiceDotsHTML(rnd);
            dieEl.dataset.val = rnd; 
        }, 50); 
    }

    stopDice() {
        if (!this.isActive) return;

        clearInterval(this.interval);
        if (this.app.soundMgr) this.app.soundMgr.click();
        if (this.app.vibrate) this.app.vibrate(20);

        const dieEl = document.getElementById(`gd-${this.currentIndex}`);
        let finalVal = parseInt(dieEl.dataset.val) || Math.floor(Math.random()*6)+1;
        
        this.diceValues[this.currentIndex] = finalVal;
        dieEl.innerHTML = this.getDiceDotsHTML(finalVal);
        
        dieEl.classList.remove('rolling');
        dieEl.classList.add('locked');

        this.calculateTempScore();

        this.currentIndex++;
        if (this.currentIndex < 6) {
            this.startRolling(this.currentIndex);
        } else {
            this.isActive = false; 
            document.getElementById('glass-btn-action').disabled = true; 
            setTimeout(() => this.finishGame(), 600); 
        }
    }

    calculateTempScore() {
        let tempVal = 0;
        let d = this.diceValues;
        let sumPrvaCetiri = d[0] + d[1] + d[2] + d[3];

        if (this.currentIndex <= 3) {
            tempVal = d.slice(0, this.currentIndex + 1).reduce((a,b)=>a+b, 0);
        } else if (this.currentIndex === 4) {
            tempVal = sumPrvaCetiri * d[4];
        } else if (this.currentIndex === 5) {
            tempVal = sumPrvaCetiri * d[4] * d[5];
        }

        document.getElementById('glass-daily-sum').innerText = tempVal;
        this.calculatedReward = tempVal;
    }

    finishGame() {
        this.isActive = false;

        // Više nema potrebe za upisom datuma ovde, jer smo to uradili na samom početku (open metoda)

        if (this.app.soundMgr) this.app.soundMgr.win();
        if (this.app.effectMgr) this.app.effectMgr.trigger('gold_rain');

        this.showResultModal();
    }

    showResultModal() {
        const card = document.getElementById('glass-daily-card');
        document.getElementById('glass-btn-action').style.display = 'none';
        
        const resDiv = document.createElement('div');
        resDiv.id = 'glass-daily-result';
        resDiv.className = 'glass-daily-result';

        resDiv.innerHTML = `
            <button class="glass-btn glass-btn-double" onclick="dnevniIzazov.watchAdToDouble()">
                🎥 ${t('btn_double_short')} ${dukatIconHtml()} (x2)
            </button>
            <button class="glass-btn glass-btn-claim" onclick="dnevniIzazov.claim(false)">
                ${t('btn_claim_short')}
            </button>
        `;
        
        card.appendChild(resDiv);
    }

    async watchAdToDouble() {
        if (window.adMobGlobal) {
            const success = await window.adMobGlobal.showRewardVideo();
            if (success) {
                this.claim(true);
            }
        } else {
            this.app.modal.alert(t('dc_ads_unavailable'), t('info_title'));
            this.claim(false);
        }
    }

    claim(doubled) {
        let finalAmount = doubled ? this.calculatedReward * 2 : this.calculatedReward;
        const uid = localStorage.getItem('yamb_uid') || this.app.playerId;
        const today = new Date().toDateString();
        
        // 1. Lokalni upis balansa
        let currentDukati = parseInt(localStorage.getItem('yamb_dukati')) || 0;
        currentDukati += finalAmount;
        localStorage.setItem('yamb_dukati', currentDukati);
        localStorage.setItem('yamb_daily_reward_claimed_' + uid, today);
        localStorage.setItem('yamb_daily_reward_amount_' + uid, String(finalAmount));
        
        // 2. Upis u Stats Manager
        if (window.statsManager) { 
            window.statsManager.stats.balance = currentDukati; 
            window.statsManager.saveStats(); 
        }

        // 3. Osveži UI glavnog menija
        if (typeof updateMainMenuDashboard === 'function') {
            updateMainMenuDashboard();
        }

        // 4. TIHA Sinhronizacija sa Cloud-om
        if (this.app.socket) {
            if (this.app.socket.disconnected) {
                this.app.socket.connect();
            }

            let currentStats = {};
            if (typeof getFullLocalStats === 'function') {
                currentStats = getFullLocalStats();
            } else if (typeof this.app.getFullLocalStats === 'function') {
                currentStats = this.app.getFullLocalStats();
            }
            currentStats.lastDaily = today;
            currentStats.dailyRewardClaimed = today;
            currentStats.dailyRewardAmount = finalAmount;

            this.app.socket.emit('set_player_data', {
                uid: uid,
                name: this.app.playerName,
                stats: currentStats,
                playerId: this.app.playerId
            });
        }

        // 5. Zatvori izazov i prikaži poruku
        this.close();

        if (doubled) {
            if (this.app.effectMgr) this.app.effectMgr.trigger('confetti');
            this.app.modal.alert(t('dc_reward_doubled').replace('{0}', finalAmount), t('dc_congrats'));
        } else {
            this.app.modal.alert(t('dc_reward_won').replace('{0}', finalAmount), t('dc_success'));
        }
    }
}
