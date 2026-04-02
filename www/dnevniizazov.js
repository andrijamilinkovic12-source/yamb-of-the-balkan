// dnevniizazov.js - STANDALONE DAILY CHALLENGE (GLASSMORPHISM EDITION)

class DnevniIzazov {
    constructor(app) {
        this.app = app;
        this.currentIndex = 0;
        this.interval = null;
        this.diceValues = [0, 0, 0, 0, 0, 0];
        this.isActive = false;
        this.UNICODE = ["", "⚀", "⚁", "⚂", "⚃", "⚄", "⚅"];
        this.calculatedReward = 0;
        
        this.injectGlassCSS();
        this.buildUI();
    }

    injectGlassCSS() {
        if (document.getElementById('glass-daily-css')) return;
        const style = document.createElement('style');
        style.id = 'glass-daily-css';
        style.innerHTML = `
            /* Glassmorphism Osnova */
            .glass-overlay {
                position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
                background: rgba(0, 0, 0, 0.6);
                backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
                z-index: 99999; display: none; align-items: center; justify-content: center;
                opacity: 0; transition: opacity 0.4s ease;
            }
            .glass-overlay.active { display: flex; opacity: 1; }
            
            /* Glavna Kartica */
            .glass-card {
                background: linear-gradient(135deg, rgba(255,255,255,0.1), rgba(255,255,255,0.03));
                border: 1px solid rgba(255, 215, 0, 0.3);
                border-radius: 24px;
                box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.5), inset 0 0 20px rgba(224, 201, 149, 0.1);
                width: 90%; max-width: 420px; padding: 30px 20px;
                display: flex; flex-direction: column; align-items: center;
                position: relative; overflow: hidden;
            }
            
            /* Zlatni odsjaj na ivicama */
            .glass-card::before {
                content: ''; position: absolute; top: -50%; left: -50%; width: 200%; height: 200%;
                background: radial-gradient(circle, rgba(255,215,0,0.15) 0%, transparent 60%);
                pointer-events: none; z-index: 0;
            }

            .glass-header { z-index: 1; text-align: center; margin-bottom: 25px; }
            .glass-title { color: var(--gold-main); font-size: 1.8rem; font-weight: 900; letter-spacing: 2px; text-shadow: 0 4px 10px rgba(0,0,0,0.8); margin: 0; }
            .glass-subtitle { color: #ddd; font-size: 0.85rem; text-transform: uppercase; letter-spacing: 1px; margin-top: 5px; }

            /* Kockice Mreža */
            .glass-dice-grid {
                display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px;
                z-index: 1; margin-bottom: 25px; width: 100%; padding: 0 10px;
            }
            
            .glass-die {
                background: rgba(0, 0, 0, 0.4); border: 1px solid rgba(255,255,255,0.1);
                border-radius: 16px; aspect-ratio: 1; display: flex; align-items: center; justify-content: center;
                font-size: 2.5rem; color: #fff; box-shadow: inset 0 4px 10px rgba(0,0,0,0.5);
                transition: transform 0.2s, box-shadow 0.2s;
            }
            .glass-die.rolling { color: var(--gold-main); text-shadow: 0 0 15px var(--gold-glow); animation: shake 0.2s infinite; }
            .glass-die.locked { border-color: var(--gold-main); box-shadow: 0 0 15px rgba(255,215,0,0.3), inset 0 4px 10px rgba(0,0,0,0.5); transform: scale(1.05); }

            /* Score Box */
            .glass-score-box {
                background: rgba(0, 0, 0, 0.5); border-radius: 16px; padding: 15px 30px;
                display: flex; flex-direction: column; align-items: center; z-index: 1; margin-bottom: 25px;
                border: 1px solid rgba(255,215,0,0.2); width: 80%;
            }
            .glass-score-lbl { font-size: 0.7rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 1px; }
            .glass-score-val { font-size: 2.5rem; font-weight: 900; color: var(--gold-main); text-shadow: 0 2px 5px rgba(0,0,0,0.8); line-height: 1; margin-top: 5px; }

            /* Dugmići */
            .glass-btn {
                background: linear-gradient(135deg, rgba(255,215,0,0.8), rgba(255,160,0,0.8));
                border: 1px solid rgba(255,255,255,0.4); border-radius: 30px;
                color: #000; font-weight: 900; font-size: 1.1rem; letter-spacing: 1px;
                padding: 15px 40px; cursor: pointer; box-shadow: 0 8px 20px rgba(0,0,0,0.4);
                transition: transform 0.1s, filter 0.2s; z-index: 1; width: 80%; text-transform: uppercase;
            }
            .glass-btn:active { transform: scale(0.95); }
            .glass-btn:disabled { filter: grayscale(100%); opacity: 0.6; cursor: not-allowed; transform: none; }
            
            .glass-btn-close {
                position: absolute; top: 15px; right: 20px; background: transparent; border: none;
                color: #fff; font-size: 1.5rem; cursor: pointer; z-index: 2; opacity: 0.7;
            }
            
            @keyframes shake { 0% { transform: translate(1px, 1px) rotate(0deg); } 10% { transform: translate(-1px, -2px) rotate(-1deg); } 20% { transform: translate(-3px, 0px) rotate(1deg); } 30% { transform: translate(3px, 2px) rotate(0deg); } 40% { transform: translate(1px, -1px) rotate(1deg); } 50% { transform: translate(-1px, 2px) rotate(-1deg); } 60% { transform: translate(-3px, 1px) rotate(0deg); } 70% { transform: translate(3px, 1px) rotate(-1deg); } 80% { transform: translate(-1px, -1px) rotate(1deg); } 90% { transform: translate(1px, 2px) rotate(0deg); } 100% { transform: translate(1px, -2px) rotate(-1deg); } }
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
                <button class="glass-btn-close" onclick="dnevniIzazov.close()">✖</button>
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

    open() {
        if (!this.app.requireLogin()) return;

        const uid = localStorage.getItem('yamb_uid');
        const lastPlayed = localStorage.getItem('yamb_last_daily_' + uid);
        const today = new Date().toDateString();

        if (lastPlayed === today) {
            this.app.modal.alert(t('dc_done'), t('info_title'));
            return;
        }

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
            el.innerText = "?";
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
            dieEl.innerText = this.UNICODE[rnd];
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
        dieEl.innerText = this.UNICODE[finalVal];
        
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
        
        // Zapisujemo da je odigrao danas
        const uid = localStorage.getItem('yamb_uid');
        const today = new Date().toDateString();
        localStorage.setItem('yamb_last_daily_' + uid, today);

        if (this.app.soundMgr) this.app.soundMgr.win();
        if (this.app.effectMgr) this.app.effectMgr.trigger('gold_rain');

        this.showResultModal();
    }

    showResultModal() {
        const card = document.getElementById('glass-daily-card');
        document.getElementById('glass-btn-action').style.display = 'none';
        
        const resDiv = document.createElement('div');
        resDiv.id = 'glass-daily-result';
        resDiv.style.width = '100%';
        resDiv.style.display = 'flex';
        resDiv.style.flexDirection = 'column';
        resDiv.style.gap = '10px';
        resDiv.style.marginTop = '10px';
        resDiv.style.zIndex = '2';

        resDiv.innerHTML = `
            <button class="glass-btn" style="width: 100%; background: linear-gradient(45deg, #FFD700, #FFA000); display: flex; align-items: center; justify-content: center; gap: 10px; font-size: 0.95rem;" onclick="dnevniIzazov.watchAdToDouble()">
                🎥 ${t('btn_double_short')} 💰 (x2)
            </button>
            <button class="glass-btn" style="width: 100%; background: rgba(255,255,255,0.1); color: #fff; border: 1px solid rgba(255,255,255,0.2); font-size: 0.95rem;" onclick="dnevniIzazov.claim(false)">
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
        
        // 1. Lokalni upis balansa
        let currentDukati = parseInt(localStorage.getItem('yamb_dukati')) || 0;
        currentDukati += finalAmount;
        localStorage.setItem('yamb_dukati', currentDukati);
        
        // 2. Upis u Stats Manager
        if (window.statsManager) { 
            window.statsManager.stats.balance = currentDukati; 
            window.statsManager.saveStats(); 
        }

        // 3. Osveži UI glavnog menija
        if (typeof updateMainMenuDashboard === 'function') {
            updateMainMenuDashboard();
        }

        // 4. TIHA Sinhronizacija sa Cloud-om (Plan B)
        if (this.app.socket) {
            // Ako je socket uspavan zbog pozadinskog rada, probudi ga pre slanja
            if (this.app.socket.disconnected) {
                this.app.socket.connect();
            }

            this.app.socket.emit('set_player_data', {
                uid: localStorage.getItem('yamb_uid') || this.app.playerId,
                name: this.app.playerName,
                stats: this.app.getFullLocalStats(),
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