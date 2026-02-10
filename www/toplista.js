/* toplista.js - FIXED by Gemini */

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
        return key;
    }

    /**
     * Upisuje skor (Prvo lokalno, pa pokušava na server)
     */
    async submitScore(name, score, mode) {
        if (!score || score <= 0) return;

        // --- POPRAVKA OVDE ---
        // Koristimo 'playerName' umesto 'name' da se poklopi sa MongoDB šemom
        const entry = {
            playerName: name || this._t('player_unknown'), 
            score: parseInt(score),
            mode: mode || 'Solo',
            date: new Date().toISOString(),
            synced: false 
        };

        console.log(`[Score] Čuvam lokalno: ${entry.playerName} - ${score}`); // Logujemo playerName

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
            let scores = (await localforage.getItem(this.storageKey)) || [];
            let needsUpdate = false;

            for (let i = 0; i < scores.length; i++) {
                if (!scores[i].synced) {
                    // Ovde logujemo šta se tačno šalje radi provere
                    console.log(`📡 Sinhronizujem skor:`, scores[i]);
                    
                    this.app.socket.emit('submit_score', scores[i]);
                    scores[i].synced = true;
                    needsUpdate = true;
                }
            }

            if (needsUpdate) {
                await localforage.setItem(this.storageKey, scores);
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
        listLocal.classList.add('hidden');
        listGlobal.classList.add('hidden');

        if (tab === 'local') {
            btnLocal.classList.add('active');
            listLocal.classList.remove('hidden');
            if(filtersDiv) filtersDiv.classList.add('hidden'); 
            this._loadLocal(); 
        } else {
            btnGlobal.classList.add('active');
            listGlobal.classList.remove('hidden');
            if(filtersDiv) filtersDiv.classList.remove('hidden'); 
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
            let scores = (await localforage.getItem(this.storageKey)) || [];
            scores.push(newEntry);
            scores.sort((a, b) => b.score - a.score);
            
            if (scores.length > this.maxEntries) {
                scores = scores.slice(0, this.maxEntries);
            }

            await localforage.setItem(this.storageKey, scores);
            
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
            const scores = (await localforage.getItem(this.storageKey)) || [];
            this.renderList(scores, 'local-hs-list');
        } catch (e) {
            console.error("Greška pri učitavanju:", e);
        }
    }

    _loadGlobal() {
        const listEl = document.getElementById('global-hs-list');
        if(!listEl) return;

        if (!listEl.innerHTML.includes('loading-text')) {
             listEl.innerHTML = `<div class="loading-text">${this._t('msg_connecting')} 🌍</div>`;
        }
        
        if (this.app.socket && this.app.socket.connected) {
            this.app.socket.emit('get_global_highscores', this.currentGlobalFilter);
        } else {
            listEl.innerHTML = `<div class="loading-text" style="color:var(--danger)">${this._t('msg_no_connection')}</div>`;
            this.app.initSocketConnection();
        }
    }

    renderList(data, elementId) {
        const list = document.getElementById(elementId);
        if(!list) return;

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

            // --- POPRAVKA PRIKAZA ---
            // Podržavamo i staro polje 'name' i novo 'playerName'
            // Ovo rešava problem da se stari lokalni rezultati ne vide
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