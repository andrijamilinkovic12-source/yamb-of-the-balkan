// toplista.js - CLEAN & OPTIMIZED (Fixed Layout & Name Display)

class TopListManager {
    constructor(appContext) {
        this.app = appContext;
        this.storageKey = 'yamb_ultimate_scores';
        this.maxEntries = 50;
        
        // Default filter za globalnu listu
        this.currentGlobalFilter = 'weekly'; 
        
        console.log("TopListManager initialized (Sync Ready).");
    }

    _t(key) {
        if (typeof t === 'function') return t(key);
        // Fallback prevodi
        const fallback = {
            'player_unknown': 'Nepoznat',
            'msg_connecting': 'Učitavanje...',
            'msg_no_connection': 'Nema konekcije sa serverom.',
            'msg_no_results': 'Još uvek nema rezultata.',
            'msg_be_first': 'Budi prvi!',
            'hs_weekly': 'NEDELJA',
            'hs_monthly': 'MESEC',
            'hs_all_time': 'SVE'
        };
        return fallback[key] || key;
    }

    /**
     * Upisuje skor (Prvo lokalno, pa pokušava na server)
     */
    async submitScore(name, score, mode) {
        if (!score || score <= 0) return;

        // Pripremamo objekat za bazu (koristimo 'playerName' da se slaže sa serverom)
        const entry = {
            playerName: name || this._t('player_unknown'), 
            score: parseInt(score),
            mode: mode || 'Solo',
            date: new Date().toISOString(),
            synced: false 
        };

        // 1. Uvek prvo sačuvaj lokalno
        await this._saveLocal(entry);

        // 2. Pokušaj odmah da sinhronizuješ ako ima neta
        this.syncOfflineScores();
    }

    /**
     * Šalje sve neposlate (unsynced) rezultate na server
     */
    async syncOfflineScores() {
        if (!this.app.socket || !this.app.socket.connected) return;

        try {
            let scores = [];
            if (window.localforage) {
                scores = (await localforage.getItem(this.storageKey)) || [];
            } else {
                const stored = localStorage.getItem(this.storageKey);
                if (stored) scores = JSON.parse(stored);
            }

            let needsUpdate = false;

            for (let i = 0; i < scores.length; i++) {
                if (!scores[i].synced) {
                    console.log(`📡 Sinhronizacija skora: ${scores[i].score}`);
                    this.app.socket.emit('submit_score', scores[i]);
                    scores[i].synced = true;
                    needsUpdate = true;
                }
            }

            if (needsUpdate) {
                if (window.localforage) {
                    await localforage.setItem(this.storageKey, scores);
                } else {
                    localStorage.setItem(this.storageKey, JSON.stringify(scores));
                }
            }
        } catch (e) {
            console.error("Sync error:", e);
        }
    }

    switchTab(tab) {
        const btnLocal = document.getElementById('tab-local');
        const btnGlobal = document.getElementById('tab-global');
        const listLocal = document.getElementById('local-hs-list');
        const listGlobal = document.getElementById('global-hs-list');
        const filtersDiv = document.getElementById('global-filters');

        if (!btnLocal || !btnGlobal) return;

        btnLocal.classList.remove('active');
        btnGlobal.classList.remove('active');
        if (listLocal) listLocal.classList.add('hidden');
        if (listGlobal) listGlobal.classList.add('hidden');

        if (tab === 'local') {
            btnLocal.classList.add('active');
            if (listLocal) listLocal.classList.remove('hidden');
            if (filtersDiv) filtersDiv.classList.add('hidden'); 
            this._loadLocal(); 
        } else {
            btnGlobal.classList.add('active');
            if (listGlobal) listGlobal.classList.remove('hidden');
            if (filtersDiv) filtersDiv.classList.remove('hidden'); 
            this._loadGlobal();
        }
    }

    filterGlobal(period) {
        this.currentGlobalFilter = period;
        const btns = document.querySelectorAll('.filter-btn');
        btns.forEach(b => b.classList.remove('active'));

        const map = { 'weekly': 0, 'monthly': 1, 'all_time': 2 };
        if (btns[map[period]]) btns[map[period]].classList.add('active');

        this._loadGlobal();
    }

    async _saveLocal(newEntry) {
        try {
            let scores = [];
            if (window.localforage) {
                scores = (await localforage.getItem(this.storageKey)) || [];
            } else {
                const stored = localStorage.getItem(this.storageKey);
                if (stored) scores = JSON.parse(stored);
            }

            scores.push(newEntry);
            scores.sort((a, b) => b.score - a.score);
            
            if (scores.length > this.maxEntries) {
                scores = scores.slice(0, this.maxEntries);
            }

            if (window.localforage) {
                await localforage.setItem(this.storageKey, scores);
            } else {
                localStorage.setItem(this.storageKey, JSON.stringify(scores));
            }
            
            const listLocal = document.getElementById('local-hs-list');
            if (listLocal && !listLocal.classList.contains('hidden')) {
                this.renderList(scores, 'local-hs-list');
            }
        } catch (e) {
            console.error("Local save error:", e);
        }
    }

    async _loadLocal() {
        try {
            let scores = [];
            if (window.localforage) {
                scores = (await localforage.getItem(this.storageKey)) || [];
            } else {
                const stored = localStorage.getItem(this.storageKey);
                if (stored) scores = JSON.parse(stored);
            }
            this.renderList(scores, 'local-hs-list');
        } catch (e) {
            console.error("Local load error:", e);
        }
    }

    _loadGlobal() {
        const listEl = document.getElementById('global-hs-list');
        if (!listEl) return;

        listEl.innerHTML = `<div class="loading-text" style="color:var(--text-muted); font-size:0.9rem; margin-top:20px;">${this._t('msg_connecting')} ⏳</div>`;
        
        if (this.app.socket && this.app.socket.connected) {
            this.app.socket.emit('get_global_highscores', this.currentGlobalFilter);
        } else {
            this.app.initSocketConnection();
            setTimeout(() => {
                if (!this.app.socket || !this.app.socket.connected) {
                     listEl.innerHTML = `<div style="text-align:center; padding:30px; color:var(--text-muted);">
                        <div style="font-size:2rem; margin-bottom:10px; opacity:0.5;">📡</div>
                        ${this._t('msg_no_connection')}
                    </div>`;
                }
            }, 3000);
        }
    }

    renderList(data, elementId) {
        const list = document.getElementById(elementId);
        if (!list) return;

        list.innerHTML = "";

        if (!data || !Array.isArray(data) || data.length === 0) {
            list.innerHTML = `<div style="text-align:center; padding:40px 20px; color:var(--text-muted); font-style:italic;">
                ${this._t('msg_no_results')}
            </div>`;
            return;
        }

        const currentLang = localStorage.getItem('yamb_lang') === 'en' ? 'en-US' : 'sr-RS';

        data.forEach((entry, index) => {
            const li = document.createElement('li');
            li.className = 'highscore-item'; 

            let rankClass = 'rank-circle';
            if (index === 0) rankClass += ' rank-1';
            else if (index === 1) rankClass += ' rank-2';
            else if (index === 2) rankClass += ' rank-3';

            let dateDisplay = "";
            if (entry.date) {
                const d = new Date(entry.date);
                if (!isNaN(d)) {
                    dateDisplay = `${d.getDate()}.${d.getMonth() + 1}.`;
                }
            }

            // Čitamo playerName (novo) ili name (staro)
            const displayName = entry.playerName || entry.name || this._t('player_unknown');
            const scoreFormatted = entry.score.toLocaleString(currentLang);
            
            // --- LOGIKA ZA SMANJENJE FONTA DUGAČKIH IMENA ---
            // Standardna veličina u style.css je 0.85rem. Za preko 16 karaktera smanjujemo na 0.72rem.
            let nameStyle = "";
            if (displayName.length > 16) {
                nameStyle = "font-size: 0.72rem; line-height: 1.1;"; 
            }
            
            // LOGIKA ZA KRUNU: Sakrivamo broj 1 da bi se lepo video watermark krune
            const rankText = index === 0 ? '' : (index + 1);
            
            li.innerHTML = `
                <div class="${rankClass}"><span style="position: relative; z-index: 2;">${rankText}</span></div>
                <div class="hs-info">
                    <div class="hs-name" style="${nameStyle}">${displayName}</div>
                    <div class="hs-meta">
                        <span>${entry.mode || 'Solo'}</span>
                        ${dateDisplay ? `<span>• ${dateDisplay}</span>` : ''}
                    </div>
                </div>
                <div class="hs-score-pill">${scoreFormatted}</div>
            `;

            list.appendChild(li);
        });
    }
}