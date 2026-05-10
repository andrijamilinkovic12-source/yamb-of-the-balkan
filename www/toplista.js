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
        let photo = '';
        if (providedPhoto !== undefined) {
            photo = providedPhoto; 
        } else {
            photo = localStorage.getItem('yamb_player_photo') || '';
        }

        // NOVO: Uzimamo aktivni Google UID 
        const currentUid = localStorage.getItem('yamb_uid');

        // Pripremamo objekat za bazu
        const entry = {
            localId: `${Date.now()}_${Math.random().toString(36).slice(2)}`,
            uid: currentUid, // <-- DODATO OVO POLJE
            playerName: name || this._t('player_unknown'), 
            score: parseInt(score),
            mode: mode || 'Solo',
            date: new Date().toISOString(),
            photoUrl: photo, // Sada slika ide i u lokalnu top listu!
            synced: false 
        };

        // 1. Uvek prvo sačuvaj lokalno
        await this._saveLocal(entry);

        // 2. Skor iz upravo završene partije šaljemo odmah i čekamo odgovor,
        // dok server još ima aktivnu validnu game sesiju za taj socket.
        if (this.app.socket && this.app.socket.connected) {
            const result = await this._submitScoreToServer(entry);
            await this._markLocalSubmitResult(entry, result);

            if (result && result.ok) {
                this._loadGlobal();
                return;
            }
        }

        // 3. Neuspeh bez trajnog odbijanja ostaje za kasniji pokušaj.
        this.syncOfflineScores();
    }

    _submitScoreToServer(entry) {
        return new Promise(resolve => {
            let settled = false;
            const finish = (result) => {
                if (settled) return;
                settled = true;
                resolve(result || { ok: false, reason: 'no_response', permanent: false });
            };

            setTimeout(() => finish({ ok: false, reason: 'score_submit_timeout', permanent: false }), 8000);
            this.app.socket.emit('submit_score', entry, finish);
        });
    }

    async _markLocalSubmitResult(entry, result) {
        if (!entry || !result) return;
        if (!result.ok && !result.permanent) return;

        try {
            let scores = [];
            if (window.localforage) {
                scores = (await localforage.getItem(this.storageKey)) || [];
            } else {
                const stored = localStorage.getItem(this.storageKey);
                if (stored) scores = JSON.parse(stored);
            }

            const idx = scores.findIndex(item => {
                if (entry.localId && item.localId === entry.localId) return true;
                return !item.synced &&
                    item.uid === entry.uid &&
                    item.score === entry.score &&
                    item.date === entry.date;
            });

            if (idx === -1) return;

            if (result.ok) {
                scores[idx].synced = true;
                delete scores[idx].syncRejected;
            } else if (result.permanent) {
                scores[idx].syncRejected = result.reason || 'server_rejected';
            }

            if (window.localforage) {
                await localforage.setItem(this.storageKey, scores);
            } else {
                localStorage.setItem(this.storageKey, JSON.stringify(scores));
            }
        } catch (e) {
            console.warn("Nije moguće označiti sync status skora:", e);
        }
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
                if (!scores[i].synced && !scores[i].syncRejected) {
                    console.log(`📡 Sinhronizacija skora: ${scores[i].score}`);
                    const result = await this._submitScoreToServer(scores[i]);
                    if (result && result.ok) {
                        scores[i].synced = true;
                        needsUpdate = true;
                    } else if (result && result.permanent) {
                        scores[i].syncRejected = result.reason || 'server_rejected';
                        needsUpdate = true;
                        console.warn(`Server je odbio skor ${scores[i].score}: ${scores[i].syncRejected}`);
                    }
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

        // --- NOVO: STRIKTNO FILTRIRANJE GOSTIJU I STARIH REZULTATA ---
        let validData = [];
        if (data && Array.isArray(data)) {
            validData = data.filter(entry => {
                // Firebase Google UID je uvek dugačak (oko 28 karaktera).
                // Odbacujemo sve koji nemaju UID, koji su kraći od 20 karaktera ili sadrže reč 'guest'
                return entry.uid && typeof entry.uid === 'string' && entry.uid.length > 20 && !entry.uid.toLowerCase().includes('guest');
            });
        }

        // Ako nakon filtriranja nema rezultata
        if (validData.length === 0) {
            list.innerHTML = `<div style="text-align:center; padding:40px 20px; color:var(--text-muted); font-style:italic;">
                ${this._t('msg_no_results')}
            </div>`;
            return;
        }

        const currentLang = localStorage.getItem('yamb_lang') === 'en' ? 'en-US' : 'sr-RS';
        const sec = window.YambSecurity;

        // Rendamo samo validne Google igrače (koristimo validData umesto data)
        validData.forEach((entry, index) => {
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

            const displayName = String(entry.playerName || entry.name || this._t('player_unknown'));
            const safeDisplayName = sec.escapeHtml(displayName);
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

            // LOGIKA ZA AVATAR
            const photoUrl = (entry.photoUrl && entry.photoUrl.length > 5) 
                ? entry.photoUrl 
                : `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=333&color=E0C995`;
            const fallbackPhotoUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=333&color=E0C995`;
            const safePhotoUrl = sec.escapeAttr(sec.safeUrl(photoUrl, fallbackPhotoUrl));
            const safeMode = sec.escapeHtml(entry.mode || 'Solo');
            const safeDateDisplay = sec.escapeHtml(dateDisplay);
            
            // NAPOMENA: U HTML-u imamo grid postavljen na 4 kolone (Rang, Slika, Info, Skor)
            li.innerHTML = `
                <div class="${rankClass}"><span style="position: relative; z-index: 2;">${rankText}</span></div>
                <img src="${safePhotoUrl}" style="width: 42px; height: 42px; border-radius: 50%; object-fit: cover; border: 1px solid rgba(255,215,0,0.3); box-shadow: 0 2px 5px rgba(0,0,0,0.5);">
                <div class="hs-info">
                    <div class="hs-name" style="${nameStyle} font-weight: 800; color: var(--text-main); white-space: normal; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; padding-bottom: 2px; margin-bottom: 2px;">${safeDisplayName}</div>
                    <div class="hs-meta" style="font-size: 0.65rem; color: var(--text-muted); display: flex; gap: 5px;">
                        <span>${safeMode}</span>
                        ${safeDateDisplay ? `<span>• ${safeDateDisplay}</span>` : ''}
                    </div>
                </div>
                <div class="hs-score-pill" style="justify-self: center;">${scoreFormatted}</div>
            `;

            list.appendChild(li);
        });
    }
}
