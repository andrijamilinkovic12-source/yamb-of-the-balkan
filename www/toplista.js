// toplista.js - CLEAN & OPTIMIZED (Global First, Avatars & Dynamic Font Size)

class TopListManager {
    constructor(appContext) {
        this.app = appContext;
        this.storageKey = 'yamb_ultimate_scores';
        this.validPeriods = ['weekly', 'monthly', 'all_time'];
        this.leaderboardTimeZone = 'Europe/Belgrade';
        this.globalPageSize = 50;
        this.globalRequestSerial = 0;
        this.globalPages = new Map();
        this.globalScrollContainer = null;
        this.globalScrollHandler = null;
        
        // Default filteri za top liste
        this.currentGlobalFilter = 'weekly';
        this.currentLocalFilter = 'weekly';
        
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

    _stateMarkup(message, state = 'empty', fallbackIcon = '📜') {
        return `
            <div class="hs-list-state hs-list-state-${state}">
                <span class="hs-state-fallback" aria-hidden="true">${fallbackIcon}</span>
                <img class="hs-state-soft-clay-icon" src="assets/easter-soft-clay/leaderboard/empty-loading.png?v=1" alt="" aria-hidden="true" decoding="async">
                <img class="hs-state-soft-clay-icon-desert" src="assets/desert-soft-clay/leaderboard/empty-loading.png?v=1" alt="" aria-hidden="true" decoding="async">
                <img class="hs-state-soft-clay-icon-nebula" src="assets/severna-soft-clay/leaderboard/empty-loading.png?v=1" alt="" aria-hidden="true" decoding="async">
                <span class="hs-list-state-text">${message}</span>
            </div>
        `;
    }

    _podiumMarkup(index) {
        const medal = ['gold', 'silver', 'bronze'][index];
        if (!medal) return '';
        const activeTheme = localStorage.getItem('yamb_theme') || 'dark';
        const medalSrc = activeTheme === 'severna'
            ? `assets/severna-soft-clay/leaderboard/medal-${medal}.png?v=1`
            : `assets/yotb-podium/leaderboard/${medal}.png?v=1`;

        return `
            <img class="hs-podium-medal" src="${medalSrc}" alt="" aria-hidden="true" decoding="async">
            <span class="hs-podium-rank-number">${index + 1}</span>
        `;
    }

    _getGlobalPageState(period = this.currentGlobalFilter) {
        const safePeriod = this._normalizePeriod(period);
        if (!this.globalPages.has(safePeriod)) {
            this.globalPages.set(safePeriod, {
                items: [],
                keys: new Set(),
                nextOffset: 0,
                hasMore: true,
                loading: false,
                requestId: 0
            });
        }
        return this.globalPages.get(safePeriod);
    }

    _globalEntryKey(entry) {
        const uid = String(entry?.stableUid || entry?.uid || entry?.playerId || '');
        if (uid) return `uid:${uid}`;
        return `score:${entry?.playerName || entry?.name || ''}:${entry?.score || 0}:${entry?.date || ''}`;
    }

    _ensureGlobalScrollListener() {
        const list = document.getElementById('global-hs-list');
        const container = list?.closest('.hs-list-container');
        if (!container || this.globalScrollContainer === container) return;

        if (this.globalScrollContainer && this.globalScrollHandler) {
            this.globalScrollContainer.removeEventListener('scroll', this.globalScrollHandler);
        }

        this.globalScrollContainer = container;
        this.globalScrollHandler = () => {
            const remaining = container.scrollHeight - container.scrollTop - container.clientHeight;
            if (remaining <= 180) this.loadMoreGlobal();
        };
        container.addEventListener('scroll', this.globalScrollHandler, { passive: true });
    }

    _removeGlobalLoadMoreState() {
        document.getElementById('global-hs-load-more')?.remove();
    }

    _showGlobalLoadMoreState() {
        const list = document.getElementById('global-hs-list');
        if (!list || document.getElementById('global-hs-load-more')) return;

        const row = document.createElement('li');
        row.id = 'global-hs-load-more';
        row.className = 'hs-load-more-state';
        row.setAttribute('aria-live', 'polite');
        row.innerHTML = `<span class="hs-load-more-dots" aria-hidden="true"><i></i><i></i><i></i></span><span>${this._t('msg_connecting')}</span>`;
        list.appendChild(row);
    }

    /**
     * Upisuje skor (Prvo lokalno, pa pokušava na server)
     */
    async submitScore(name, score, mode, providedPhoto = undefined, matchId = '') {
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
            matchId: String(matchId || ''),
            playerName: name || this._t('player_unknown'), 
            score: parseInt(score),
            mode: mode || 'Solo',
            date: new Date().toISOString(),
            photoUrl: photo, // Sada slika ide i u lokalnu top listu!
            synced: false 
        };

        // 1. Uvek prvo sačuvaj lokalno
        await this._saveLocal(entry);
        if (this.app && typeof this.app.recordSubmittedScoreAsHighscore === 'function') {
            this.app.recordSubmittedScoreAsHighscore(entry.score);
        }

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

    _normalizePeriod(period, fallback = 'weekly') {
        return this.validPeriods.includes(period) ? period : fallback;
    }

    _getTimeZoneParts(date, timeZone = this.leaderboardTimeZone) {
        const parts = new Intl.DateTimeFormat('en-US', {
            timeZone,
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hourCycle: 'h23'
        }).formatToParts(date);

        return Object.fromEntries(parts
            .filter(part => part.type !== 'literal')
            .map(part => [part.type, Number(part.value)]));
    }

    _getTimeZoneOffsetMs(date, timeZone = this.leaderboardTimeZone) {
        const parts = this._getTimeZoneParts(date, timeZone);
        const zonedAsUtc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
        return zonedAsUtc - date.getTime();
    }

    _zonedLocalDateTimeToUtc(year, month, day, hour, minute, second, timeZone = this.leaderboardTimeZone) {
        const localAsUtc = Date.UTC(year, month - 1, day, hour, minute, second);
        let result = new Date(localAsUtc - this._getTimeZoneOffsetMs(new Date(localAsUtc), timeZone));
        result = new Date(localAsUtc - this._getTimeZoneOffsetMs(result, timeZone));
        return result;
    }

    _getPeriodStart(period, now = new Date()) {
        const safePeriod = this._normalizePeriod(period, 'all_time');
        if (safePeriod === 'all_time') return null;

        const parts = this._getTimeZoneParts(now);

        if (safePeriod === 'monthly') {
            return this._zonedLocalDateTimeToUtc(parts.year, parts.month, 1, 0, 0, 0);
        }

        if (safePeriod === 'weekly') {
            const utcCalendarDay = new Date(Date.UTC(parts.year, parts.month - 1, parts.day));
            const dayOfWeek = utcCalendarDay.getUTCDay() || 7;
            const monday = new Date(Date.UTC(parts.year, parts.month - 1, parts.day - dayOfWeek + 1));
            return this._zonedLocalDateTimeToUtc(
                monday.getUTCFullYear(),
                monday.getUTCMonth() + 1,
                monday.getUTCDate(),
                0,
                0,
                0
            );
        }

        return null;
    }

    _getEntryTime(entry) {
        if (!entry || entry.date === undefined || entry.date === null) return null;
        const parsed = new Date(entry.date).getTime();
        return Number.isFinite(parsed) ? parsed : null;
    }

    _filterScoresForPeriod(scores, period) {
        const safePeriod = this._normalizePeriod(period, 'all_time');
        const start = this._getPeriodStart(safePeriod);
        if (!start) return Array.isArray(scores) ? scores : [];

        const startMs = start.getTime();
        return (Array.isArray(scores) ? scores : []).filter(entry => {
            const entryMs = this._getEntryTime(entry);
            return Number.isFinite(entryMs) && entryMs >= startMs;
        });
    }

    _sortScores(scores) {
        return (Array.isArray(scores) ? [...scores] : []).sort((a, b) => {
            const scoreDiff = (Number(b?.score) || 0) - (Number(a?.score) || 0);
            if (scoreDiff !== 0) return scoreDiff;

            const aTime = this._getEntryTime(a) ?? Number.MAX_SAFE_INTEGER;
            const bTime = this._getEntryTime(b) ?? Number.MAX_SAFE_INTEGER;
            return aTime - bTime;
        });
    }

    async _readLocalScores() {
        if (window.localforage) {
            const scores = await localforage.getItem(this.storageKey);
            return Array.isArray(scores) ? scores : [];
        }

        const stored = localStorage.getItem(this.storageKey);
        if (!stored) return [];

        const scores = JSON.parse(stored);
        return Array.isArray(scores) ? scores : [];
    }

    async _writeLocalScores(scores) {
        const safeScores = Array.isArray(scores) ? scores : [];
        if (window.localforage) {
            await localforage.setItem(this.storageKey, safeScores);
        } else {
            localStorage.setItem(this.storageKey, JSON.stringify(safeScores));
        }
    }

    _renderLocalScores(scores) {
        const periodScores = this._filterScoresForPeriod(scores, this.currentLocalFilter);
        this.renderList(periodScores, 'local-hs-list');
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
            let scores = await this._readLocalScores();

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

            await this._writeLocalScores(scores);
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
            let scores = await this._readLocalScores();

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
                await this._writeLocalScores(scores);
            }
        } catch (e) {
            console.error("Sync error:", e);
        }
    }

    switchTab(tab) {
        const activeTab = tab === 'local' ? 'local' : 'global';
        document.querySelectorAll('.hs-tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.hsTab === activeTab);
        });

        document.querySelectorAll('.hs-panel').forEach(panel => {
            panel.classList.toggle('active', panel.dataset.hsPanel === activeTab);
        });

        if (activeTab === 'global') this._loadGlobal({ reset: true });
        else this._loadLocal();
    }

    filterGlobal(period) {
        this.currentGlobalFilter = this._normalizePeriod(period);
        const btns = document.querySelectorAll('#global-filters .filter-btn');
        btns.forEach(b => b.classList.remove('active'));

        const map = { 'weekly': 0, 'monthly': 1, 'all_time': 2 };
        if (btns[map[this.currentGlobalFilter]]) btns[map[this.currentGlobalFilter]].classList.add('active');

        this._loadGlobal();
    }

    filterLocal(period) {
        this.currentLocalFilter = this._normalizePeriod(period);
        const btns = document.querySelectorAll('#local-filters .filter-btn');
        btns.forEach(b => b.classList.remove('active'));

        const map = { 'weekly': 0, 'monthly': 1, 'all_time': 2 };
        if (btns[map[this.currentLocalFilter]]) btns[map[this.currentLocalFilter]].classList.add('active');

        this._loadLocal();
    }

    async _saveLocal(newEntry) {
        try {
            let scores = await this._readLocalScores();

            scores.push(newEntry);
            scores = this._sortScores(scores);

            await this._writeLocalScores(scores);
            
            const listLocal = document.getElementById('local-hs-list');
            if (listLocal) {
                this._renderLocalScores(scores);
            }
        } catch (e) {
            console.error("Local save error:", e);
        }
    }

    async _loadLocal() {
        try {
            let scores = await this._readLocalScores();
            this._renderLocalScores(scores);
        } catch (e) {
            console.error("Local load error:", e);
        }
    }

    _loadGlobal({ reset = true } = {}) {
        const listEl = document.getElementById('global-hs-list');
        if (!listEl) return;

        this._ensureGlobalScrollListener();
        const period = this.currentGlobalFilter;
        const state = this._getGlobalPageState(period);

        if (reset) {
            state.items = [];
            state.keys = new Set();
            state.nextOffset = 0;
            state.hasMore = true;
            state.loading = false;
            state.requestId = ++this.globalRequestSerial;
            listEl.innerHTML = this._stateMarkup(this._t('msg_connecting'), 'loading', '⏳');
            if (this.globalScrollContainer) this.globalScrollContainer.scrollTop = 0;
        }

        if (state.loading || !state.hasMore) return;
        state.loading = true;

        if (!reset) this._showGlobalLoadMoreState();

        if (this.app.socket && this.app.socket.connected) {
            this.app.socket.emit('get_global_highscores', {
                period,
                offset: state.nextOffset,
                limit: this.globalPageSize,
                requestId: state.requestId
            });
        } else {
            state.loading = false;
            this._removeGlobalLoadMoreState();
            this.app.initSocketConnection();
            setTimeout(() => {
                if ((!this.app.socket || !this.app.socket.connected) && state.requestId === this._getGlobalPageState(period).requestId) {
                    listEl.innerHTML = this._stateMarkup(this._t('msg_no_connection'), 'offline', '📡');
                }
            }, 3000);
        }
    }

    loadMoreGlobal() {
        this._loadGlobal({ reset: false });
    }

    handleGlobalPage(payload) {
        if (Array.isArray(payload)) {
            this.renderList(payload, 'global-hs-list');
            return;
        }

        if (!payload || typeof payload !== 'object') return;
        const period = this._normalizePeriod(payload.period);
        const state = this._getGlobalPageState(period);
        if (payload.requestId !== state.requestId || period !== this.currentGlobalFilter) return;

        state.loading = false;
        this._removeGlobalLoadMoreState();

        const offset = Math.max(0, Number(payload.offset) || 0);
        const page = Array.isArray(payload.data) ? payload.data : [];
        if (offset === 0) {
            state.items = [];
            state.keys = new Set();
        } else if (offset !== state.nextOffset) {
            return;
        }

        const rankOffset = state.items.length;
        const uniquePage = page.filter(entry => {
            const key = this._globalEntryKey(entry);
            if (state.keys.has(key)) return false;
            state.keys.add(key);
            return true;
        });

        state.items.push(...uniquePage);
        state.nextOffset = offset + page.length;
        state.hasMore = Boolean(payload.hasMore) && page.length > 0;

        this.renderList(uniquePage, 'global-hs-list', {
            append: offset > 0,
            rankOffset
        });

        if (state.hasMore && this.globalScrollContainer &&
            this.globalScrollContainer.scrollHeight <= this.globalScrollContainer.clientHeight + 40) {
            requestAnimationFrame(() => this.loadMoreGlobal());
        }
    }

    renderList(data, elementId, options = {}) {
        const list = document.getElementById(elementId);
        if (!list) return;

        const isGlobalList = elementId === 'global-hs-list';
        const append = isGlobalList && Boolean(options.append);
        const rankOffset = isGlobalList ? Math.max(0, Number(options.rankOffset) || 0) : 0;

        if (!append) list.innerHTML = "";

        let validData = [];
        if (data && Array.isArray(data)) {
            validData = data.filter(entry => {
                const score = Number(entry?.score);
                if (!Number.isFinite(score) || score <= 0) return false;

                if (!isGlobalList) return true;

                const uid = entry.uid || entry.playerId;
                return uid && typeof uid === 'string' && uid.length >= 20 && !uid.toLowerCase().includes('guest');
            });
        }

        validData = this._sortScores(validData);

        // Ako nakon filtriranja nema rezultata
        if (validData.length === 0 && !append) {
            list.innerHTML = this._stateMarkup(this._t('msg_no_results'), 'empty', '');
            return;
        }

        const currentLang = localStorage.getItem('yamb_lang') === 'en' ? 'en-US' : 'sr-RS';
        const sec = window.YambSecurity;

        validData.forEach((entry, index) => {
            const absoluteIndex = rankOffset + index;
            const li = document.createElement('li');
            li.className = 'highscore-item'; 

            let rankClass = 'rank-circle';
            if (absoluteIndex === 0) rankClass += ' rank-1';
            else if (absoluteIndex === 1) rankClass += ' rank-2';
            else if (absoluteIndex === 2) rankClass += ' rank-3';

            let dateDisplay = "";
            if (entry.date) {
                const d = new Date(entry.date);
                if (!isNaN(d)) {
                    dateDisplay = `${d.getDate()}.${d.getMonth() + 1}.`;
                }
            }

            const displayName = String(entry.playerName || entry.name || this._t('player_unknown'));
            const safeDisplayName = sec.escapeHtml(displayName);
            const numericScore = Number(entry.score) || 0;
            const scoreFormatted = numericScore.toLocaleString(currentLang);
            
            // --- DINAMIČKO SMANJIVANJE FONTA PREMA DUŽINI IMENA ---
            let nameStyle = "font-size: 0.85rem; line-height: 1.2;"; // Default
            if (displayName.length > 20) {
                nameStyle = "font-size: 0.60rem; line-height: 1.1;"; // Ekstremno dugačka imena
            } else if (displayName.length > 14) {
                nameStyle = "font-size: 0.70rem; line-height: 1.1;"; // Srednje dugačka imena
            }
            
            // LOGIKA ZA KRUNU: Sakrivamo broj 1 da bi se lepo video watermark krune
            const rankText = absoluteIndex === 0 ? '' : (absoluteIndex + 1);

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
                <div class="${rankClass}">
                    <span class="hs-rank-legacy" style="position: relative; z-index: 2;">${rankText}</span>
                    ${this._podiumMarkup(absoluteIndex)}
                </div>
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
