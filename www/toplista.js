// toplista.js - CLEAN & OPTIMIZED (Global First, Avatars & Dynamic Font Size)

class TopListManager {
    constructor(appContext) {
        this.app = appContext;
        this.storageKey = 'yamb_ultimate_scores';
        this.maxEntries = 100; // Ograničenje je sada 100
        
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
    async submitScore(name, score, mode, providedPhoto = undefined) {
        if (!score || score <= 0) return;

        // OBAVEZNO: Rešavanje tuđih avatara!
        // Ako je slika eksplicitno prosleđena iz igre, koristi nju. 
        // U suprotnom, povuci našu lokalnu sliku.
        let photo = '';
        if (providedPhoto !== undefined) {
            photo = providedPhoto; 
        } else {
            photo = localStorage.getItem('yamb_player_photo') || '';
        }

        // Pripremamo objekat za bazu
        const entry = {
            playerName: name || this._t('player_unknown'), 
            score: parseInt(score),
            mode: mode || 'Solo',
            date: new Date().toISOString(),
            photoUrl: photo, // Sada slika ide i u lokalnu top listu!
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
        // Obzirom da su obe liste sada u swipe karticama, odmah učitavamo obe
        this._loadLocal();
        this._loadGlobal();

        // LOGIKA ZA SKROL: Globalna je sada na indeksu 0 (prva), Lokalna je indeks 1
        const carousel = document.getElementById('hs-carousel');
        if(carousel) {
            if (tab === 'global') {
                carousel.scrollLeft = 0;
            } else if (tab === 'local') {
                carousel.scrollLeft = carousel.clientWidth;
            }
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
            if (listLocal) {
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

            const displayName = entry.playerName || entry.name || this._t('player_unknown');
            const scoreFormatted = entry.score.toLocaleString(currentLang);
            
            // --- DINAMIČKO SMANJIVANJE FONTA PREMA DUŽINI IMENA ---
            let nameStyle = "font-size: 0.85rem; line-height: 1.2;"; // Default
            if (displayName.length > 20) {
                nameStyle = "font-size: 0.60rem; line-height: 1.1;"; // Ekstremno dugačka imena
            } else if (displayName.length > 14) {
                nameStyle = "font-size: 0.70rem; line-height: 1.1;"; // Srednje dugačka imena
            }
            
            // LOGIKA ZA KRUNU: Sakrivamo broj 1 da bi se lepo video watermark krune
            const rankText = index === 0 ? '' : (index + 1);

            // LOGIKA ZA AVATAR (I na globalnoj i na lokalnoj)
            const photoUrl = (entry.photoUrl && entry.photoUrl.length > 5) 
                ? entry.photoUrl 
                : `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=333&color=E0C995`;
            
            // NAPOMENA: U HTML-u imamo grid postavljen na 4 kolone (Rang, Slika, Info, Skor)
            li.innerHTML = `
                <div class="${rankClass}"><span style="position: relative; z-index: 2;">${rankText}</span></div>
                <img src="${photoUrl}" style="width: 42px; height: 42px; border-radius: 50%; object-fit: cover; border: 1px solid rgba(255,215,0,0.3); box-shadow: 0 2px 5px rgba(0,0,0,0.5);">
                <div class="hs-info">
                    <div class="hs-name" style="${nameStyle} font-weight: 800; color: var(--text-main); white-space: normal; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; padding-bottom: 2px; margin-bottom: 2px;">${displayName}</div>
                    <div class="hs-meta" style="font-size: 0.65rem; color: var(--text-muted); display: flex; gap: 5px;">
                        <span>${entry.mode || 'Solo'}</span>
                        ${dateDisplay ? `<span>• ${dateDisplay}</span>` : ''}
                    </div>
                </div>
                <div class="hs-score-pill" style="justify-self: center;">${scoreFormatted}</div>
            `;

            list.appendChild(li);
        });
    }
}