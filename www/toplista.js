// toplista.js - FIXED & IMPROVED

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
        // Fallback prevodi ako t() funkcija nije dostupna
        const fallback = {
            'player_unknown': 'Nepoznat',
            'msg_connecting': 'Povezujem se...',
            'msg_no_connection': 'Nema konekcije sa serverom.',
            'msg_no_results': 'Još uvek nema rezultata.',
            'msg_be_first': 'Budi prvi!',
            'btn_retry': '↻ POKUŠAJ PONOVO'
        };
        return fallback[key] || key;
    }

    /**
     * Upisuje skor (Prvo lokalno, pa pokušava na server)
     */
    async submitScore(name, score, mode) {
        if (!score || score <= 0) return;

        const entry = {
            playerName: name || this._t('player_unknown'), 
            score: parseInt(score),
            mode: mode || 'Solo',
            date: new Date().toISOString(),
            synced: false 
        };

        console.log(`[Score] Čuvam lokalno: ${entry.playerName} - ${score}`);

        // 1. Uvek prvo sačuvaj lokalno
        await this._saveLocal(entry);

        // 2. Pokušaj odmah da sinhronizuješ
        this.syncOfflineScores();
    }

    /**
     * Šalje sve neposlate (unsynced) rezultate na server
     */
    async syncOfflineScores() {
        if (!this.app.socket || !this.app.socket.connected) {
            console.log("Nema konekcije, sinhronizacija čeka.");
            return;
        }

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
                    console.log(`📡 Sinhronizujem skor:`, scores[i]);
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
                console.log("✅ Lokalni rezultati ažurirani (označeni kao synced).");
            }
            
        } catch (e) {
            console.error("Greška pri sinhronizaciji:", e);
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

        const listEl = document.getElementById('global-hs-list');
        if (listEl) listEl.innerHTML = `<div class="loading-text">${this._t('msg_connecting')}... ⏳</div>`;

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
            console.error("Greška pri čuvanju lokalnog skora:", e);
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
            console.error("Greška pri učitavanju:", e);
        }
    }

    _loadGlobal() {
        const listEl = document.getElementById('global-hs-list');
        if (!listEl) return;

        // Prikaži loading samo ako već nije tu
        if (!listEl.innerHTML.includes('loading-text') && !listEl.innerHTML.includes('hs-item')) {
             listEl.innerHTML = `<div class="loading-text">${this._t('msg_connecting')} 🌍</div>`;
        }
        
        if (this.app.socket && this.app.socket.connected) {
            this.app.socket.emit('get_global_highscores', this.currentGlobalFilter);
        } else {
            // --- POBOLJŠANO RUKOVANJE GREŠKOM (Retry Button) ---
            // Render serveri spavaju, pa je korisno imati dugme za ponovni pokušaj
            listEl.innerHTML = `
                <div style="text-align:center; padding:20px; color:var(--danger); display:flex; flex-direction:column; align-items:center; justify-content:center; height:100%;">
                    <p style="font-weight:bold; margin-bottom:10px;">${this._t('msg_no_connection')}</p>
                    <p style="font-size:0.7rem; color:var(--text-muted); margin-bottom:15px;">(Server se možda budi...)</p>
                    <button class="btn-menu btn-primary" style="width:auto; padding: 10px 25px; font-size:0.85rem;" 
                        onclick="if(window.app) { window.app.initSocketConnection(); setTimeout(() => { window.app.topListManager._loadGlobal() }, 1000); }">
                        ${this._t('btn_retry') || '↻ POKUŠAJ PONOVO'}
                    </button>
                </div>`;
            
            // Automatski pokušaj rekoneksiju u pozadini
            if (this.app) this.app.initSocketConnection();
        }
    }

    renderList(data, elementId) {
        const list = document.getElementById(elementId);
        if (!list) return;

        list.innerHTML = "";

        if (!data || !Array.isArray(data) || data.length === 0) {
            list.innerHTML = `<div style="text-align:center; padding:40px 20px; color:var(--text-muted); font-style:italic;">
                ${this._t('msg_no_results')}<br><br>${this._t('msg_be_first')} 🎲
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

            let crownIcon = (index === 0) ? ' 👑' : '';

            let dateDisplay = "";
            if (entry.date) {
                const d = new Date(entry.date);
                if (!isNaN(d)) {
                    dateDisplay = `${d.getDate()}.${d.getMonth() + 1}.`;
                }
            }

            // Podrška za stara (name) i nova (playerName) polja
            const displayName = entry.playerName || entry.name || "Nepoznat";
            const scoreFormatted = entry.score.toLocaleString(currentLang);
            
            li.innerHTML = `
                <div class="${rankClass}">${index + 1}</div>
                
                <div class="hs-info">
                    <div class="hs-name">${displayName}${crownIcon}</div>
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