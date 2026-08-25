// kvartalnaliga.js - Menadžer za Kvartalnu Ligu i Dvoranu Slavnih
class KvartalnaLigaManager {
    constructor() {
        this.storageKey = 'yamb_quarter_data'; 
        this.currentSlide = 0;
        this.hofData = null; 
        this.isIntroPlaying = false;
        this.isOpenPending = false;
        this.rankBadgePreloadPromise = null;
        this.rankBadgePreloadTheme = '';
        this.rankBadgeImageCache = new Map();
        this.leaderboardPageSize = 50;
        this.leaderboardPages = new Map();
        this.leaderboardRequestSerial = 0;
        
        this.selfHeal(); // <-- Pametna funkcija za čišćenje
        this.init();
        this.preloadRankBadges();
    }

    get ranks() {
        const gt = (key, fallback) => (typeof t === 'function' && t(key) !== key) ? t(key) : fallback;
        return [
            { id: 'amater', name: `${gt('rank_amater', 'AMATER')} (0 - 4.9k)`, min: 0, max: 4999 },
            { id: 'profi', name: `${gt('rank_profi', 'PROFI')} (5k - 14.9k)`, min: 5000, max: 14999 },
            { id: 'majstor', name: `${gt('rank_majstor', 'MAJSTOR')} (15k - 49.9k)`, min: 15000, max: 49999 },
            { id: 'legenda', name: `${gt('rank_legenda', 'LEGENDA')} (50k - 99.9k)`, min: 50000, max: 99999 },
            { id: 'titan', name: `${gt('rank_titan', 'TITAN')} (100k+)`, min: 100000, max: Infinity },
            { id: 'alltime', name: String(gt('league_all_time', 'SVA VREMENA')).replace(/👑/gu, '').trim(), min: 0, max: Infinity }
        ];
    }

    selfHeal() {
        // KORAK 1: Trajno brišemo stari opšti fajl bez UID-a da ne bi nastavio da inficira druge naloge
        if (localStorage.getItem('yamb_quarter_data')) {
            if (!localStorage.getItem('yamb_quarter_data_legacy')) {
                localStorage.setItem('yamb_quarter_data_legacy', localStorage.getItem('yamb_quarter_data'));
            }
            if (!localStorage.getItem('yamb_uid') && !localStorage.getItem('yamb_quarter_data_guest')) {
                localStorage.setItem('yamb_quarter_data_guest', localStorage.getItem('yamb_quarter_data'));
            }
            console.log("🛠️ Self-Heal: Pronađen i arhiviran stari globalni ligaški fajl!");
            localStorage.removeItem('yamb_quarter_data');
        }

        // KORAK 2: Čišćenje fantomskih bodova
        const key = this.getDynamicKey();
        const raw = localStorage.getItem(key);
        
        if (raw) {
            try {
                let parsed = JSON.parse(raw);
                if ((!parsed.year || parsed.year === 0 || !parsed.quarter || parsed.quarter === 0) && parsed.quarterlyScore > 0) {
                    console.log(`🛠️ Self-Heal: Otkriveni fantomski bodovi (${parsed.quarterlyScore})! Resetujem ligu na 0.`);
                    parsed.quarterlyScore = 0;
                    
                    const { currentYear, currentQuarter } = this.getCurrentQuarterInfo();
                    parsed.year = currentYear;
                    parsed.quarter = currentQuarter;
                    
                    localStorage.setItem(key, JSON.stringify(parsed));
                }
            } catch (e) {
                console.error("Greška pri automatskoj popravci:", e);
            }
        }
    }

    init() {
        this.getScores();
    }

    getCurrentQuarterInfo() {
        const now = new Date();
        let year = now.getFullYear();
        let month = now.getMonth();

        try {
            const parts = new Intl.DateTimeFormat('en-US', {
                timeZone: 'Europe/Belgrade',
                year: 'numeric',
                month: 'numeric'
            }).formatToParts(now);
            year = Number(parts.find(part => part.type === 'year')?.value) || year;
            month = (Number(parts.find(part => part.type === 'month')?.value) || (month + 1)) - 1;
        } catch (_err) {
            // Lokalno vreme ostaje rezervna opcija na starijim WebView verzijama.
        }

        const quarter = Math.floor(month / 3) + 1;
        return { currentYear: year, currentQuarter: quarter };
    }

    getDynamicKey() {
        const uid = localStorage.getItem('yamb_uid') || 'guest';
        return `${this.storageKey}_${uid}`;
    }

    normalizeScoresForCurrentQuarter(rawData, key = null) {
        const { currentYear, currentQuarter } = this.getCurrentQuarterInfo();
        const data = rawData && typeof rawData === 'object'
            ? { ...rawData }
            : { year: currentYear, quarter: currentQuarter, baselineScore: 0, quarterlyScore: 0 };

        data.quarterlyScore = Math.max(0, parseInt(data.quarterlyScore, 10) || 0);
        data.baselineScore = Math.max(0, parseInt(data.baselineScore, 10) || 0);
        data.year = parseInt(data.year, 10) || 0;
        data.quarter = parseInt(data.quarter, 10) || 0;

        if (data.year !== currentYear || data.quarter !== currentQuarter) {
            localStorage.setItem('yamb_pending_quarter_check', JSON.stringify({
                year: data.year,
                quarter: data.quarter
            }));

            data.baselineScore += data.quarterlyScore;
            data.quarterlyScore = 0;
            data.year = currentYear;
            data.quarter = currentQuarter;

            if (key) localStorage.setItem(key, JSON.stringify(data));
        }

        return data;
    }

    getScores() {
        const { currentYear, currentQuarter } = this.getCurrentQuarterInfo();
        const key = this.getDynamicKey();
        
        let raw = localStorage.getItem(key);

        // Migracija starog globalnog formata (samo za prvi nalog koji uđe)
        if (!raw) {
            const oldRaw = localStorage.getItem(this.storageKey);
            if (oldRaw) {
                raw = oldRaw;
                localStorage.setItem(key, raw);
                localStorage.removeItem(this.storageKey); // Brišemo stari da ga Nalog 2 ne bi povukao
            }
        }

        if (raw) {
            try { 
                return this.normalizeScoresForCurrentQuarter(JSON.parse(raw), key);
            } 
            catch (e) { console.error("Greška pri parsiranju lige:", e); }
        }
        
        return { year: currentYear, quarter: currentQuarter, baselineScore: 0, quarterlyScore: 0 };
    }

    saveScores(data) {
        localStorage.setItem(this.getDynamicKey(), JSON.stringify(data));
    }

    addPoints(points) {
        const safePoints = Number(points);
        if (!Number.isFinite(safePoints)) return;
        
        this.init(); 
        let data = this.getScores();
        
        data.quarterlyScore += Math.floor(safePoints);
        
        // Sprečavamo odlazak lige u minus
        if (data.quarterlyScore < 0) {
            data.quarterlyScore = 0;
        }

        this.saveScores(data);
        this.syncWithServer();
        
        if (typeof updateMainMenuDashboard === 'function') {
            updateMainMenuDashboard();
        }
    }

    syncWithServer() {
        if (!window.app || !window.app.socket || !window.app.socket.connected) return;
        const gt = (key, fallback) => (typeof t === 'function' && t(key) !== key) ? t(key) : fallback;

        const data = this.getScores();
        let pName = localStorage.getItem('yamb_player_name') || gt('player_guest', "Gost");
        let pPhoto = localStorage.getItem('yamb_player_photo') || ''; 

        let pId = localStorage.getItem('yamb_uid');
        if (!pId) return;

        window.app.socket.emit('submit_league_score', {
            playerId: pId,
            playerName: pName,
            photoUrl: pPhoto, 
            score: data.quarterlyScore,
            year: data.year,
            quarter: data.quarter
        }, (result) => {
            if (result && result.ok) {
                if (result.leagueData) {
                    if (window.app && typeof window.app.applyCloudProfileSync === 'function') {
                        window.app.applyCloudProfileSync({ leagueData: result.leagueData });
                    } else {
                        this.saveScores(result.leagueData);
                        if (typeof updateMainMenuDashboard === 'function') {
                            updateMainMenuDashboard();
                        }
                    }
                }
                return;
            }
            console.warn(`Server je odbio upis u Kvartalnu Ligu: ${result?.reason || 'unknown_error'}`);
        });
    }

    getRank(pts) {
        const gt = (key, fallback) => (typeof t === 'function' && t(key) !== key) ? t(key) : fallback;
        if (pts < 5000) return gt('rank_amater', "AMATER");
        if (pts < 15000) return gt('rank_profi', "PROFI");
        if (pts < 50000) return gt('rank_majstor', "MAJSTOR");
        if (pts < 100000) return gt('rank_legenda', "LEGENDA");
        return gt('rank_titan', "TITAN");
    }

    getQlVisualTheme() {
        const activeTheme = localStorage.getItem('yamb_theme') || 'dark';
        if (activeTheme === 'severna' || document.body.classList.contains('severna-theme')) return 'severna';
        if (activeTheme === 'desert' || document.body.classList.contains('desert-theme')) return 'desert';
        if (activeTheme === 'easter' || document.body.classList.contains('easter-theme')) return 'easter';
        return 'default';
    }

    getQlAssetRoot() {
        const visualTheme = this.getQlVisualTheme();
        if (visualTheme === 'severna') return 'assets/severna-soft-clay/ql';
        if (visualTheme === 'desert') return 'assets/desert-soft-clay/ql';
        return 'assets/easter-soft-clay/ql';
    }

    getRankBadgeSource(rankId, retryToken = '') {
        const retrySuffix = retryToken ? `&retry=${encodeURIComponent(retryToken)}` : '';
        const badgeVersion = this.getQlVisualTheme() === 'severna' ? 4 : 3;
        return `${this.getQlAssetRoot()}/rank-${rankId}.png?v=${badgeVersion}${retrySuffix}`;
    }

    preloadRankBadge(rankId, attempt = 0) {
        return new Promise((resolve) => {
            const image = new Image();
            let settled = false;
            const finish = (loaded) => {
                if (settled) return;
                settled = true;
                resolve(loaded);
            };

            image.onload = () => {
                const decodeResult = typeof image.decode === 'function'
                    ? image.decode().catch(() => undefined)
                    : Promise.resolve();
                decodeResult.finally(() => finish(true));
            };
            image.onerror = () => {
                if (attempt < 1) {
                    setTimeout(() => {
                        this.preloadRankBadge(rankId, attempt + 1).then(finish);
                    }, 120);
                    return;
                }
                finish(false);
            };

            this.rankBadgeImageCache.set(rankId, image);
            image.src = this.getRankBadgeSource(rankId, attempt ? Date.now() : '');
        });
    }

    preloadRankBadges() {
        const visualTheme = this.getQlVisualTheme();
        if (visualTheme !== 'easter' && visualTheme !== 'desert' && visualTheme !== 'severna') return Promise.resolve([]);
        if (this.rankBadgePreloadTheme !== visualTheme) {
            this.rankBadgePreloadPromise = null;
            this.rankBadgeImageCache.clear();
            this.rankBadgePreloadTheme = visualTheme;
        }
        if (this.rankBadgePreloadPromise) return this.rankBadgePreloadPromise;

        const rankIds = ['amater', 'profi', 'majstor', 'legenda', 'titan', 'alltime'];
        this.rankBadgePreloadPromise = Promise.all(rankIds.map(rankId => this.preloadRankBadge(rankId)))
            .then((results) => {
                if (!results.every(Boolean)) this.rankBadgePreloadPromise = null;
                return results;
            });
        return this.rankBadgePreloadPromise;
    }

    retryRankBadgeElement(image, rankId) {
        if (!image) return;
        const retryCount = Number(image.dataset.rankBadgeRetry || 0);
        if (retryCount >= 2) return;
        image.dataset.rankBadgeRetry = String(retryCount + 1);
        setTimeout(() => {
            image.src = this.getRankBadgeSource(rankId, `${Date.now()}-${retryCount + 1}`);
        }, 120 * (retryCount + 1));
    }

    toRoman(num) {
        const lookup = {M:1000,CM:900,D:500,CD:400,C:100,XC:90,L:50,XL:40,X:10,IX:9,V:5,IV:4,I:1};
        let roman = '';
        for (let i in lookup) {
            while (num >= lookup[i]) {
                roman += i;
                num -= lookup[i];
            }
        }
        return roman;
    }

    async openModal() {
        if (this.isIntroPlaying || this.isOpenPending) return;
        this.isOpenPending = true;
        try {
            await this.preloadRankBadges();
        } finally {
            this.isOpenPending = false;
        }
        if (this.isIntroPlaying) return;
        this.playIntro(() => this.showModal());
    }

    playIntro(onComplete) {
        const overlay = document.getElementById('league-intro');
        const titleElement = overlay?.querySelector('.league-intro-title');

        if (!overlay) {
            onComplete();
            return;
        }

        this.isIntroPlaying = true;
        this.applyIntroTheme(overlay);
        this.setIntroTitle(titleElement, overlay.classList.contains('theme-easter') || overlay.classList.contains('theme-desert') || overlay.classList.contains('theme-severna'));
        overlay.classList.remove('hidden');
        overlay.setAttribute('aria-hidden', 'false');

        let completed = false;
        const openBehindOverlayAt = 3650;
        const introDuration = 4600;

        setTimeout(() => {
            if (completed) return;
            completed = true;
            onComplete();
        }, openBehindOverlayAt);

        setTimeout(() => {
            if (!completed) {
                completed = true;
                onComplete();
            }
            overlay.classList.add('hidden');
            overlay.setAttribute('aria-hidden', 'true');
            this.isIntroPlaying = false;
        }, introDuration);
    }

    applyIntroTheme(overlay) {
        const knownThemes = ['dark', 'light', 'medium', 'winter', 'neon', 'amethyst', 'easter', 'desert', 'moon', 'severna'];
        const activeTheme = localStorage.getItem('yamb_theme') || 'dark';
        const introTheme = knownThemes.includes(activeTheme) ? activeTheme : 'dark';

        knownThemes.forEach(theme => overlay.classList.remove(`theme-${theme}`));
        overlay.classList.add(`theme-${introTheme}`);
    }

    setIntroTitle(titleElement, isEaster = false) {
        if (!titleElement) return;
        const gt = (key, fallback) => (typeof t === 'function' && t(key) !== key) ? t(key) : fallback;
        const label = gt('menu_league', 'Kvartalna Liga');
        const normalizedLabel = label.trim().toUpperCase();

        if (isEaster) {
            titleElement.replaceChildren(...Array.from(normalizedLabel).map((character, index) => {
                const letter = document.createElement('span');
                letter.className = character === ' '
                    ? 'league-intro-easter-wave-space'
                    : 'league-intro-easter-wave-letter';
                letter.textContent = character === ' ' ? '\u00A0' : character;
                letter.style.setProperty('--wave-index', index);
                return letter;
            }));
            titleElement.setAttribute('aria-label', normalizedLabel);
            return;
        }

        const parts = label.trim().split(/\s+/);
        const leftWord = document.createElement('span');
        const rightWord = document.createElement('span');
        leftWord.className = 'league-intro-word league-intro-word-left';
        rightWord.className = 'league-intro-word league-intro-word-right';
        leftWord.textContent = parts[0] || 'Kvartalna';
        rightWord.textContent = parts.slice(1).join(' ') || 'Liga';
        titleElement.replaceChildren(leftWord, rightWord);
        titleElement.removeAttribute('aria-label');
    }

    getMainTabIcon(icon) {
        const assetRoot = this.getQlAssetRoot();
        const tabVersion = this.getQlVisualTheme() === 'severna' ? 3 : 2;
        const softClaySource = icon === 'hof'
            ? `${assetRoot}/tab-hall-of-fame.png?v=${tabVersion}`
            : `${assetRoot}/tab-league.png?v=${tabVersion}`;
        const softClayIcon = `<img class="league-tab-soft-clay-icon" src="${softClaySource}" alt="" aria-hidden="true" decoding="async">`;
        if (icon === 'hof') {
            return `${softClayIcon}
                <svg class="league-tab-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                    <path d="M4 9.3L12 4.8L20 9.3H4Z" fill="currentColor" opacity="0.22"/>
                    <path d="M4 9.3L12 4.8L20 9.3M6 19H18M7.5 16.7H16.5M8 10.5V16.5M12 10.5V16.5M16 10.5V16.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
                    <path d="M12 6.7L12.8 8.2L14.5 8.45L13.25 9.62L13.55 11.28L12 10.48L10.45 11.28L10.75 9.62L9.5 8.45L11.2 8.2L12 6.7Z" fill="currentColor"/>
                </svg>
            `;
        }

        return `${softClayIcon}
            <svg class="league-tab-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                <path d="M6.5 18.5V12.5H10V18.5H6.5ZM10.7 18.5V8.5H14.3V18.5H10.7ZM15 18.5V10.8H18.5V18.5H15Z" fill="currentColor" opacity="0.22"/>
                <path d="M5 19H19M8.2 18.5V12.5M12.5 18.5V8.5M16.8 18.5V10.8" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
                <path d="M8.6 7.4L10.8 8.15L12.5 6L14.2 8.15L16.4 7.4L15.65 11.25H9.35L8.6 7.4Z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>
            </svg>
        `;
    }

    showModal() {
        const gt = (key, fallback) => (typeof t === 'function' && t(key) !== key) ? t(key) : fallback;
        const data = this.getScores();
        
        const pts = parseInt(data.quarterlyScore) || 0;
        const allTime = (parseInt(data.baselineScore) || 0) + pts;
        const rank = this.getRank(pts);
        
        const currentRanks = this.ranks; 
        const currentRankData = currentRanks.find(r => r.name.startsWith(rank)) || currentRanks[0];

        this.currentSlide = currentRanks.findIndex(r => r.name.startsWith(rank));
        if (this.currentSlide === -1) this.currentSlide = 0;
        const leagueTabLabel = gt('hof_tab_league', 'LIGA');
        const hofTabLabel = gt('hof_tab_main', 'DVORANA SLAVNIH');
        const medalsTabLabel = String(gt('hof_tab_medals', 'MEDALJE 🏅')).replace(/🏅/gu, '').trim();
        const championsTabLabel = String(gt('hof_tab_champs', 'ŠAMPIONI 🏆')).replace(/🏆/gu, '').trim();
        const qlAssetRoot = this.getQlAssetRoot();
        const qlTabVersion = this.getQlVisualTheme() === 'severna' ? 3 : 2;

        let slidesHtml = currentRanks.map((r) => `
            <div class="league-slide" style="min-width: 100%; box-sizing: border-box; padding: 0 15px; display: flex; flex-direction: column; height: 100%; min-height: 0;">
                <h3 class="league-rank-heading" style="color: var(--gold-main); font-size: 0.85rem; text-align: center; margin-bottom: 8px; flex-shrink: 0; letter-spacing: 1px;"><img class="league-rank-soft-clay-badge" src="${this.getRankBadgeSource(r.id)}" alt="" aria-hidden="true" decoding="sync" loading="eager" onerror="window.kvartalnaLiga && window.kvartalnaLiga.retryRankBadgeElement(this, '${r.id}')"><span>${r.name}</span></h3>
                <div class="league-rank-scroll" data-league-rank="${r.id}" style="flex: 1; min-height: 0; overflow-y: auto; overflow-x: hidden; background: rgba(0,0,0,0.2); border-radius: 12px; border: 1px solid rgba(255,255,255,0.05); padding: 5px; -webkit-overflow-scrolling: touch;">
                    <ul id="league-list-${r.id}" style="list-style: none; padding: 0; margin: 0;">
                        <li style="text-align: center; color: #aaa; font-size: 0.85rem; padding: 20px;">${gt('league_loading', 'Učitavanje podataka... ⏳')}</li>
                    </ul>
                </div>
            </div>
        `).join('');

        let dotsHtml = currentRanks.map((_, i) => `
            <div id="league-dot-${i}" style="width: 8px; height: 8px; border-radius: 50%; background: ${i === this.currentSlide ? 'var(--carousel-dot-active)' : 'var(--carousel-dot-idle)'}; margin: 0 4px; transition: background 0.3s, box-shadow 0.3s; box-shadow: ${i === this.currentSlide ? '0 0 10px var(--carousel-dot-glow)' : 'inset 0 0 3px rgba(0,0,0,0.5)'};"></div>
        `).join('');

        let modalHtml = `
        <div id="league-modal-overlay" class="modal-overlay" style="z-index: 999999; display: flex;">
            <div class="modal-box" style="width: 95%; max-width: 450px; height: 85vh; max-height: 800px; display: flex; flex-direction: column; padding: 0; background: linear-gradient(135deg, #111, #222); border: 2px solid var(--gold-main); overflow: hidden;">
                
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 15px 20px; border-bottom: 1px solid rgba(255,215,0,0.2); background: rgba(0,0,0,0.3); flex-shrink: 0;">
                    <div class="league-modal-title-group">
                        <img class="league-modal-header-icon league-modal-header-icon-default" src="assets/quarterly-league-icon.svg" alt="" aria-hidden="true" decoding="async">
                        <img class="league-modal-header-icon league-modal-header-icon-easter" src="assets/easter-soft-clay/quarterly-league-yotb-ql-pro.png?v=1" alt="" aria-hidden="true" decoding="async">
                        <img class="league-modal-header-icon league-modal-header-icon-desert" src="assets/desert-soft-clay/quarterly-league-yotb-ql-pro.png?v=2" alt="" aria-hidden="true" decoding="async">
                        <img class="league-modal-header-icon league-modal-header-icon-nebula" src="assets/severna-soft-clay/quarterly-league-yotb-ql-pro.png?v=2" alt="" aria-hidden="true" decoding="async">
                        <h2 style="color: var(--gold-main); font-size: 1.1rem; margin: 0; text-transform: uppercase; letter-spacing: 1px;">${gt('menu_league', 'KVARTALNA LIGA')}</h2>
                    </div>
                    <span style="color: var(--danger); font-size: 1.5rem; cursor: pointer; font-weight: bold; line-height: 1;" onclick="document.getElementById('league-modal-overlay').remove()">✖</span>
                </div>

                <div style="display: flex; justify-content: center; gap: 10px; padding: 15px 15px 5px 15px; flex-shrink: 0;">
                    <button id="tab-league-main" class="btn-menu btn-primary league-tab-button" style="flex: 1; padding: 8px; font-size: 0.75rem; margin: 0; height: auto;" onclick="window.kvartalnaLiga.toggleMainView('league')">${this.getMainTabIcon('league')}<span>${leagueTabLabel}</span></button>
                    <button id="tab-league-hof" class="btn-menu btn-secondary league-tab-button" style="flex: 1; padding: 8px; font-size: 0.75rem; margin: 0; height: auto;" onclick="window.kvartalnaLiga.toggleMainView('hof')">${this.getMainTabIcon('hof')}<span>${hofTabLabel}</span></button>
                </div>

                <div id="league-main-content" style="display: flex; flex-direction: column; flex: 1; overflow: hidden; width: 100%; min-height: 0;">
                    <div style="padding: 10px 15px; flex-shrink: 0;">
                        <div style="display: flex; justify-content: space-between; align-items: center; background: rgba(224, 201, 149, 0.08); padding: 10px 15px; border-radius: 12px; border: 1px solid rgba(224, 201, 149, 0.2);">
                            <div style="text-align: left;">
                                <div style="font-size: 0.65rem; color: var(--text-muted); text-transform: uppercase;">${gt('league_your_rank', 'Vaš rang')}</div>
                                <div class="league-current-rank" style="font-size: 1.2rem; font-weight: 900; color: #fff; text-shadow: 0 0 5px var(--gold-main);"><img class="league-current-rank-soft-clay-badge" src="${this.getRankBadgeSource(currentRankData.id)}" alt="" aria-hidden="true" decoding="sync" loading="eager" onerror="window.kvartalnaLiga && window.kvartalnaLiga.retryRankBadgeElement(this, '${currentRankData.id}')"><span>${rank}</span></div>
                            </div>
                            <div style="text-align: right;">
                                <div style="font-size: 1.1rem; color: var(--gold-main); font-weight: bold;">${pts} PTS</div>
                                <div id="league-summary-alltime" style="font-size: 0.65rem; color: var(--text-muted);">${gt('league_all_time', 'SVA VREMENA')}: ${allTime}</div>
                            </div>
                        </div>
                    </div>

                    <div id="league-carousel-container" style="flex: 1; overflow: hidden; width: 100%; position: relative; display: flex; flex-direction: column; min-height: 0;">
                        <div id="league-track" style="display: flex; flex: 1; min-height: 0; transition: transform 0.3s ease-out; transform: translateX(-${this.currentSlide * 100}%);">
                            ${slidesHtml}
                        </div>
                    </div>
                    
                    <div style="display: flex; justify-content: center; padding: 10px 0 15px 0; flex-shrink: 0;">
                        ${dotsHtml}
                    </div>
                </div>

                <div id="hof-main-content" style="display: none; flex-direction: column; flex: 1; overflow: hidden; width: 100%; padding: 10px 15px 15px 15px; min-height: 0;">
                    <div style="display: flex; justify-content: center; gap: 5px; margin-bottom: 10px; flex-shrink: 0;">
                        <button id="hof-tab-medals" class="league-hof-tab-button is-active" aria-selected="true" style="flex: 1; background: var(--gold-main); color: #000; font-weight: bold; border: none; border-radius: 8px; padding: 8px; font-size: 0.75rem; cursor: pointer; transition: all 0.3s;" onclick="window.kvartalnaLiga.switchHofTab('medals')"><img class="league-hof-tab-soft-clay-icon" src="${qlAssetRoot}/tab-medals.png?v=${qlTabVersion}" alt="" aria-hidden="true" decoding="async"><span>${medalsTabLabel}</span><span class="league-hof-tab-fallback" aria-hidden="true">🏅</span></button>
                        <button id="hof-tab-champions" class="league-hof-tab-button" aria-selected="false" style="flex: 1; background: rgba(255,255,255,0.1); color: #fff; font-weight: bold; border: 1px solid var(--gold-main); border-radius: 8px; padding: 8px; font-size: 0.75rem; cursor: pointer; transition: all 0.3s;" onclick="window.kvartalnaLiga.switchHofTab('champions')"><img class="league-hof-tab-soft-clay-icon" src="${qlAssetRoot}/tab-champions.png?v=${qlTabVersion}" alt="" aria-hidden="true" decoding="async"><span>${championsTabLabel}</span><span class="league-hof-tab-fallback" aria-hidden="true">🏆</span></button>
                    </div>
                    
                    <div style="flex: 1; min-height: 0; overflow-y: auto; background: rgba(0,0,0,0.2); border-radius: 12px; border: 1px solid rgba(255,255,255,0.05); padding: 5px; -webkit-overflow-scrolling: touch;">
                        <ul id="hof-list" style="list-style: none; padding: 0; margin: 0;">
                            <li style="text-align: center; color: var(--text-muted); font-size: 0.85rem; padding: 15px;">${gt('hof_loading', 'Učitavanje Dvorane Slavnih... ⏳')}</li>
                        </ul>
                    </div>
                </div>

            </div>
        </div>`;

        let existing = document.getElementById('league-modal-overlay');
        if (existing) existing.remove();

        document.body.insertAdjacentHTML('beforeend', modalHtml);

        this.setupTouch();
        this.setupLeaderboardInfiniteScroll();
        this.syncWithServer(); 
        
        setTimeout(() => {
            this.fetchLeaderboard();
        }, 300);
    }

    toggleMainView(view) {
        if(window.app && window.app.soundMgr) window.app.soundMgr.click();

        const lMain = document.getElementById('league-main-content');
        const hMain = document.getElementById('hof-main-content');
        const btnL = document.getElementById('tab-league-main');
        const btnH = document.getElementById('tab-league-hof');
        
        if(view === 'league') {
            lMain.style.display = 'flex';
            hMain.style.display = 'none';
            btnL.className = 'btn-menu btn-primary league-tab-button';
            btnH.className = 'btn-menu btn-secondary league-tab-button';
        } else {
            lMain.style.display = 'none';
            hMain.style.display = 'flex';
            btnL.className = 'btn-menu btn-secondary league-tab-button';
            btnH.className = 'btn-menu btn-primary league-tab-button';
            this.fetchHallOfFame();
        }
    }

    switchHofTab(tab) {
        if(window.app && window.app.soundMgr) window.app.soundMgr.click();

        const btnM = document.getElementById('hof-tab-medals');
        const btnC = document.getElementById('hof-tab-champions');
        const medalsActive = tab === 'medals';
        btnM.classList.toggle('is-active', medalsActive);
        btnC.classList.toggle('is-active', !medalsActive);
        btnM.setAttribute('aria-selected', String(medalsActive));
        btnC.setAttribute('aria-selected', String(!medalsActive));
        
        if (medalsActive) {
            btnM.style.background = 'var(--gold-main)'; btnM.style.color = '#000';
            btnM.style.border = 'none';
            btnC.style.background = 'rgba(255,255,255,0.1)'; btnC.style.color = '#fff';
            btnC.style.border = '1px solid var(--gold-main)';
            this.renderHofMedals();
        } else {
            btnC.style.background = 'var(--gold-main)'; btnC.style.color = '#000';
            btnC.style.border = 'none';
            btnM.style.background = 'rgba(255,255,255,0.1)'; btnM.style.color = '#fff';
            btnM.style.border = '1px solid var(--gold-main)';
            this.renderHofChampions();
        }
    }

    fetchHallOfFame() {
        const gt = (key, fallback) => (typeof t === 'function' && t(key) !== key) ? t(key) : fallback;

        if (!window.app || !window.app.socket) {
            document.getElementById('hof-list').innerHTML = `<li style="text-align:center; color: var(--danger); font-size: 0.85rem; padding: 15px;">${gt('league_no_conn', 'Nema konekcije sa serverom.')}</li>`;
            return;
        }
        
        window.app.socket.off('hall_of_fame_data'); 
        window.app.socket.on('hall_of_fame_data', (data) => {
            this.hofData = data;
            this.renderHofMedals();
        });
        window.app.socket.emit('get_hall_of_fame');
    }

    renderHofMedals() {
        const list = document.getElementById('hof-list');
        if (!list) return;
        const gt = (key, fallback) => (typeof t === 'function' && t(key) !== key) ? t(key) : fallback;
        const qlAssetRoot = this.getQlAssetRoot();
        const qlTabVersion = this.getQlVisualTheme() === 'severna' ? 3 : 2;

        if (!this.hofData || !this.hofData.medals || this.hofData.medals.length === 0) {
            list.innerHTML = `<li style="text-align: center; color: var(--text-muted); font-size: 0.85rem; padding: 15px;">${gt('hof_no_medals', 'Još uvek nema osvajača medalja.')}</li>`;
            return;
        }
        
        let html = '';
        this.hofData.medals.forEach((m, idx) => {
            const photo = m.photoUrl && m.photoUrl.length > 5 ? m.photoUrl : `https://ui-avatars.com/api/?name=${encodeURIComponent(m.playerName)}&background=333&color=E0C995`;
            const isFirst = idx === 0;
            
            html += `
            <li style="display: flex; align-items: center; background: rgba(255,255,255,0.05); padding: 8px 10px; margin-bottom: 6px; border-radius: 8px; border-left: 4px solid ${isFirst ? 'var(--gold-main)' : 'rgba(255,255,255,0.2)'};">
                <div style="font-weight: 900; color: ${isFirst ? 'var(--gold-main)' : '#aaa'}; width: 25px; font-size: 0.9rem; text-align: center; margin-right: 5px;">${idx+1}.</div>
                <img src="${photo}" style="width: 35px; height: 35px; border-radius: 50%; border: 2px solid ${isFirst ? 'var(--gold-main)' : '#666'}; margin-right: 12px; object-fit: cover;">
                <div style="flex: 1;">
                    <div style="color: #fff; font-weight: bold; font-size: 0.85rem;">${m.playerName}</div>
                    <div style="display: flex; gap: 10px; margin-top: 4px; font-size: 0.8rem; font-weight: bold;">
                        <span class="ql-medal-count ql-medal-count--gold" style="color: #FFD700; text-shadow: 0 0 5px rgba(255,215,0,0.5);"><img class="ql-placement-medal" src="${qlAssetRoot}/medal-gold.png?v=2" alt="" aria-hidden="true" decoding="async"><span class="ql-medal-fallback" aria-hidden="true">🥇</span> ${m.gold}</span>
                        <span class="ql-medal-count ql-medal-count--silver" style="color: #C0C0C0;"><img class="ql-placement-medal" src="${qlAssetRoot}/medal-silver.png?v=2" alt="" aria-hidden="true" decoding="async"><span class="ql-medal-fallback" aria-hidden="true">🥈</span> ${m.silver}</span>
                        <span class="ql-medal-count ql-medal-count--bronze" style="color: #CD7F32;"><img class="ql-placement-medal" src="${qlAssetRoot}/medal-bronze.png?v=2" alt="" aria-hidden="true" decoding="async"><span class="ql-medal-fallback" aria-hidden="true">🥉</span> ${m.bronze}</span>
                    </div>
                </div>
            </li>`;
        });
        list.innerHTML = html;
    }

    renderHofChampions() {
        const list = document.getElementById('hof-list');
        if (!list) return;
        const gt = (key, fallback) => (typeof t === 'function' && t(key) !== key) ? t(key) : fallback;
        const qlAssetRoot = this.getQlAssetRoot();

        if (!this.hofData || !this.hofData.champions || this.hofData.champions.length === 0) {
            list.innerHTML = `<li style="text-align: center; color: var(--text-muted); font-size: 0.85rem; padding: 15px;">${gt('hof_no_champs', 'Još uvek nema završenih ciklusa.')}</li>`;
            return;
        }
        
        let html = '';
        this.hofData.champions.forEach((c) => {
            const photo = c.photoUrl && c.photoUrl.length > 5 ? c.photoUrl : `https://ui-avatars.com/api/?name=${encodeURIComponent(c.playerName)}&background=333&color=E0C995`;
            const romanCycle = this.toRoman(c.cycle);
            
            html += `
            <li style="display: flex; align-items: center; background: linear-gradient(90deg, rgba(224, 201, 149, 0.15) 0%, rgba(0,0,0,0) 100%); padding: 10px; margin-bottom: 8px; border-radius: 8px; border: 1px solid rgba(224, 201, 149, 0.3);">
                <div style="position: relative; margin-right: 15px;">
                    <img src="${photo}" style="width: 45px; height: 45px; border-radius: 50%; border: 2px solid var(--gold-main); object-fit: cover; box-shadow: 0 0 10px rgba(224,201,149,0.5);">
                    <div class="ql-champion-marker" style="position: absolute; bottom: -5px; right: -5px; font-size: 1.1rem;"><img class="ql-champion-soft-clay-icon" src="${qlAssetRoot}/tab-champions.png?v=${qlTabVersion}" alt="" aria-hidden="true" decoding="async"><span class="ql-champion-fallback" aria-hidden="true">👑</span></div>
                </div>
                <div style="flex: 1;">
                    <div style="color: var(--gold-main); font-size: 0.7rem; font-weight: 900; letter-spacing: 1px; margin-bottom: 2px;">${gt('hof_winner_prefix', 'POBEDNIK')} ${romanCycle} ${gt('hof_winner_suffix', 'CIKLUSA')}</div>
                    <div style="color: #fff; font-weight: bold; font-size: 1rem; margin-bottom: 2px;">${c.playerName}</div>
                    <div style="color: var(--text-muted); font-size: 0.75rem;">Q${c.quarter} / ${c.year} &nbsp;•&nbsp; <span style="color: #fff; font-weight: bold;">${c.score} PTS</span></div>
                </div>
            </li>`;
        });
        list.innerHTML = html;
    }

    setupTouch() {
        const track = document.getElementById('league-track');
        if (!track) return;
        
        let startX = 0;
        let startY = 0;
        let isDragging = false;
        let isScrolling = false; 

        track.addEventListener('touchstart', (e) => {
            if(document.getElementById('league-main-content').style.display === 'none') return;
            
            startX = e.touches[0].clientX;
            startY = e.touches[0].clientY;
            isDragging = true;
            isScrolling = false;
            track.style.transition = 'none'; 
        }, { passive: true });

        track.addEventListener('touchmove', (e) => {
            if (!isDragging) return;
            
            const currentX = e.touches[0].clientX;
            const currentY = e.touches[0].clientY;
            const diffX = currentX - startX;
            const diffY = currentY - startY;

            if (!isScrolling) {
                if (Math.abs(diffY) > Math.abs(diffX) && Math.abs(diffY) > 5) {
                    isScrolling = true;
                }
            }

            if (isScrolling) {
                return; // Pusti browser da obradi vertikalni skrol
            }

            const diffPercent = (diffX / track.parentElement.offsetWidth) * 100;
            track.style.transform = `translateX(calc(-${this.currentSlide * 100}% + ${diffPercent}%))`;
        }, { passive: true });

        track.addEventListener('touchend', (e) => {
            if (!isDragging) return;
            isDragging = false;
            track.style.transition = 'transform 0.3s ease-out';
            
            if (isScrolling) {
                this.updateSlide();
                return;
            }

            const endX = e.changedTouches[0].clientX;
            const diff = endX - startX;
            const swipeThreshold = 120;
            
            if (diff < -swipeThreshold && this.currentSlide < this.ranks.length - 1) {
                this.currentSlide++;
            } else if (diff > swipeThreshold && this.currentSlide > 0) {
                this.currentSlide--;
            }
            
            this.updateSlide();
        });
    }

    updateSlide() {
        const track = document.getElementById('league-track');
        const currentRanks = this.ranks;
        if (track) track.style.transform = `translateX(-${this.currentSlide * 100}%)`;
        
        currentRanks.forEach((_, i) => {
            const dot = document.getElementById(`league-dot-${i}`);
            if (dot) {
                dot.style.background = i === this.currentSlide ? 'var(--carousel-dot-active)' : 'var(--carousel-dot-idle)';
                dot.style.boxShadow = i === this.currentSlide ? '0 0 10px var(--carousel-dot-glow)' : 'inset 0 0 3px rgba(0,0,0,0.5)';
            }
        });
    }

    resetLeaderboardPagination() {
        this.leaderboardPages = new Map(this.ranks.map(rank => [rank.id, {
            offset: 0,
            hasMore: true,
            loading: false,
            requestSerial: 0,
            seenPlayers: new Set()
        }]));
    }

    getLeaderboardPageState(rankId) {
        if (!this.leaderboardPages.has(rankId)) {
            this.leaderboardPages.set(rankId, {
                offset: 0,
                hasMore: true,
                loading: false,
                requestSerial: 0,
                seenPlayers: new Set()
            });
        }
        return this.leaderboardPages.get(rankId);
    }

    setupLeaderboardInfiniteScroll() {
        document.querySelectorAll('#league-modal-overlay .league-rank-scroll').forEach(container => {
            container.addEventListener('scroll', () => {
                const remaining = container.scrollHeight - container.scrollTop - container.clientHeight;
                if (remaining <= 180) this.loadLeaguePage(container.dataset.leagueRank);
            }, { passive: true });
        });
    }

    setLeaguePageStatus(rankId, status) {
        const listEl = document.getElementById(`league-list-${rankId}`);
        if (!listEl) return;
        listEl.querySelectorAll('.league-page-status').forEach(element => element.remove());
        if (!status) return;

        const gt = (key, fallback) => (typeof t === 'function' && t(key) !== key) ? t(key) : fallback;
        const item = document.createElement('li');
        item.className = `league-page-status league-page-status--${status}`;
        item.style.cssText = 'text-align:center; color:var(--text-muted); font-size:0.78rem; padding:12px 8px; list-style:none;';
        if (status === 'loading') {
            item.textContent = gt('league_loading', 'Učitavanje podataka...');
        } else {
            const label = gt('league_no_conn', 'Učitavanje nije uspelo.');
            const retryLabel = gt('btn_retry', 'Pokušaj ponovo');
            item.innerHTML = `<span>${this.escapeHtml(label)}</span><br><button type="button" style="margin-top:7px; padding:6px 10px; border-radius:8px; cursor:pointer;" onclick="window.kvartalnaLiga.loadLeaguePage('${rankId}')">${this.escapeHtml(retryLabel)}</button>`;
        }
        listEl.appendChild(item);
    }

    loadLeaguePage(rankId, options = {}) {
        const rank = this.ranks.find(item => item.id === rankId);
        if (!rank) return;

        if (options.reset) {
            this.leaderboardPages.delete(rankId);
            const listEl = document.getElementById(`league-list-${rankId}`);
            if (listEl) listEl.innerHTML = '';
        }

        const state = this.getLeaderboardPageState(rankId);
        if (state.loading || !state.hasMore) return;
        if (!window.app || !window.app.socket || !window.app.socket.connected) {
            this.setLeaguePageStatus(rankId, 'error');
            return;
        }

        state.loading = true;
        state.requestSerial = ++this.leaderboardRequestSerial;
        const requestSerial = state.requestSerial;
        const { currentYear, currentQuarter } = this.getCurrentQuarterInfo();
        this.setLeaguePageStatus(rankId, 'loading');

        let completed = false;
        const finish = (response) => {
            if (completed || requestSerial !== state.requestSerial) return;
            completed = true;
            clearTimeout(timeoutId);
            state.loading = false;

            if (!response || response.ok !== true || response.rankId !== rankId) {
                this.setLeaguePageStatus(rankId, 'error');
                return;
            }

            const responseOffset = Math.max(0, Number(response.offset) || 0);
            const rows = Array.isArray(response.items) ? response.items : [];
            const uniqueRows = [];
            rows.forEach((row, index) => {
                const identity = String(row?.playerId || row?._id || `${row?.playerName || 'unknown'}_${responseOffset + index}`);
                if (state.seenPlayers.has(identity)) return;
                state.seenPlayers.add(identity);
                uniqueRows.push({ ...row, _leaguePosition: responseOffset + index + 1 });
            });

            if (rankId === 'alltime') {
                const myUid = localStorage.getItem('yamb_uid') || '';
                const myName = localStorage.getItem('yamb_player_name') || '';
                const myEntry = rows.find(row => {
                    const rowUid = String(row?.playerId || row?._id || '');
                    return myUid ? rowUid === myUid : (myName && row?.playerName === myName);
                });
                if (myEntry) this.updateAllTimeSummary(myEntry.score);
            }

            this.setLeaguePageStatus(rankId, null);
            this.renderList(rankId, uniqueRows, {
                append: responseOffset > 0,
                preserveOrder: true,
                startIndex: responseOffset
            });
            state.offset = Math.max(responseOffset + rows.length, Number(response.nextOffset) || 0);
            state.hasMore = response.hasMore === true;

            const container = document.querySelector(`#league-modal-overlay .league-rank-scroll[data-league-rank="${rankId}"]`);
            if (state.hasMore && container && container.scrollHeight <= container.clientHeight + 4) {
                setTimeout(() => this.loadLeaguePage(rankId), 0);
            }
        };
        const timeoutId = setTimeout(() => finish(null), 8000);

        window.app.socket.emit('get_league_rank_page', {
            rankId,
            year: currentYear,
            quarter: currentQuarter,
            offset: state.offset,
            limit: this.leaderboardPageSize
        }, finish);
    }

    fetchLeaderboard() {
        const gt = (key, fallback) => (typeof t === 'function' && t(key) !== key) ? t(key) : fallback;

        if (!window.app || !window.app.socket || !window.app.socket.connected) {
            this.ranks.forEach(r => {
                const listEl = document.getElementById(`league-list-${r.id}`);
                if(listEl) listEl.innerHTML = `<li style="text-align:center; color: var(--danger); font-size: 0.85rem; padding: 15px;">${gt('league_no_conn', 'Nema konekcije sa serverom.')}</li>`;
            });
            return;
        }

        this.resetLeaderboardPagination();
        this.ranks.forEach(rank => this.loadLeaguePage(rank.id, { reset: true }));
    }

    populateRanks(scores, isAllTime) {
        let safeScores = Array.isArray(scores) ? [...scores] : [];
        const gt = (key, fallback) => (typeof t === 'function' && t(key) !== key) ? t(key) : fallback;

        const localData = this.getScores();
        const myName = localStorage.getItem('yamb_player_name') || gt('player_guest', "Gost");
        const myPhoto = localStorage.getItem('yamb_player_photo') || '';
        let myScore = isAllTime ? (localData.baselineScore + localData.quarterlyScore) : localData.quarterlyScore;
        const myUid = localStorage.getItem('yamb_uid') || '';
        const isMyScore = (score) => {
            const scoreUid = score && (score.playerId || score._id || '');
            return myUid ? scoreUid === myUid : score?.playerName === myName;
        };

        if (myScore > 0) {
            let found = safeScores.find(isMyScore);
            if (found) {
                if (myScore > found.score) found.score = myScore; 
            } else {
                safeScores.push({ _id: myUid, playerId: myUid, playerName: myName, photoUrl: myPhoto, score: myScore }); 
            }
        }

        if (isAllTime) { 
            this.renderList('alltime', safeScores); 
            const myAllTimeEntry = safeScores.find(isMyScore);
            this.updateAllTimeSummary(myAllTimeEntry ? myAllTimeEntry.score : myScore);
            return; 
        }
        
        this.ranks.forEach(rank => {
            if (rank.id === 'alltime') return;
            const rankScores = safeScores.filter(s => {
                const poeni = Number(s.score) || 0;
                return poeni >= rank.min && poeni <= rank.max;
            });
            this.renderList(rank.id, rankScores);
        });
    }

    updateAllTimeSummary(score) {
        const summaryEl = document.getElementById('league-summary-alltime');
        if (!summaryEl) return;
        const gt = (key, fallback) => (typeof t === 'function' && t(key) !== key) ? t(key) : fallback;
        summaryEl.textContent = `${gt('league_all_time', 'SVA VREMENA')}: ${parseInt(score) || 0}`;
    }

    escapeHtml(value) {
        if (window.YambSecurity && typeof window.YambSecurity.escapeHtml === 'function') {
            return window.YambSecurity.escapeHtml(value);
        }

        return String(value ?? '').replace(/[&<>"']/g, char => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
        }[char]));
    }

    escapeAttr(value) {
        if (window.YambSecurity && typeof window.YambSecurity.escapeAttr === 'function') {
            return window.YambSecurity.escapeAttr(value);
        }

        return this.escapeHtml(value);
    }

    safeImageUrl(value, fallback) {
        if (window.YambSecurity && typeof window.YambSecurity.safeUrl === 'function') {
            return window.YambSecurity.safeUrl(value, fallback);
        }

        const raw = String(value || '').trim();
        if (!raw) return fallback;

        try {
            const parsed = new URL(raw, window.location.origin);
            return ['http:', 'https:'].includes(parsed.protocol) ? parsed.href : fallback;
        } catch (err) {
            return fallback;
        }
    }

    renderList(rankId, scores, options = {}) {
        const listEl = document.getElementById(`league-list-${rankId}`);
        if (!listEl) return;
        const gt = (key, fallback) => (typeof t === 'function' && t(key) !== key) ? t(key) : fallback;
        const append = options.append === true;
        const preserveOrder = options.preserveOrder === true;
        const startIndex = Math.max(0, Number(options.startIndex) || 0);
        const qlAssetRoot = this.getQlAssetRoot();

        if (!scores || scores.length === 0) {
            if (!append && listEl.children.length === 0) {
                listEl.innerHTML = `<li style="text-align:center; color: #aaa; font-size: 0.85rem; padding: 20px;">${gt('league_no_results', 'Još uvek nema upisanih rezultata za ovaj rang.<br>Budi prvi!')}</li>`;
            }
            return;
        }

        if (!preserveOrder) scores.sort((a,b) => (Number(b.score) || 0) - (Number(a.score) || 0));
        if (!append) listEl.innerHTML = '';
        
        scores.forEach((s, i) => {
            const position = Math.max(1, Number(s._leaguePosition) || (startIndex + i + 1));
            const placementIndex = position - 1;
            let pName = String(s.playerName || gt('league_unknown', "Nepoznat Igrač"));
            let pScore = Math.max(0, parseInt(s.score, 10) || 0);
            const myName = localStorage.getItem('yamb_player_name') || gt('player_guest', "Gost");
            const myUid = localStorage.getItem('yamb_uid') || '';
            const scoreUid = s && (s.playerId || s._id || '');
            let isMe = myUid ? scoreUid === myUid : pName === myName;
            let bg = isMe ? 'background: rgba(224, 201, 149, 0.15); border: 1px solid var(--gold-main);' : 'background: rgba(255,255,255,0.05);';
            let medal = placementIndex < 3
                ? `<img class="ql-placement-medal ql-placement-medal--rank" src="${qlAssetRoot}/medal-${['gold', 'silver', 'bronze'][placementIndex]}.png?v=2" alt="" aria-hidden="true" decoding="async"><span class="ql-medal-fallback" aria-hidden="true">${['🥇', '🥈', '🥉'][placementIndex]}</span>`
                : `${position}.`;
            const fallbackPhoto = `https://ui-avatars.com/api/?name=${encodeURIComponent(pName)}&background=333&color=E0C995`;
            let photo = this.safeImageUrl(s.photoUrl && s.photoUrl.length > 5 ? s.photoUrl : '', fallbackPhoto);
            const safeName = this.escapeHtml(pName);
            const safePhoto = this.escapeAttr(photo);

            let li = document.createElement('li');
            li.style.cssText = `display: flex; justify-content: space-between; align-items: center; padding: 8px 10px; margin-bottom: 5px; border-radius: 8px; font-size: 0.85rem; ${bg}`;
            li.innerHTML = `
                <div style="display: flex; gap: 8px; align-items: center; flex: 1; min-width: 0;">
                    <div class="ql-list-placement ${placementIndex < 3 ? 'ql-list-placement--medal' : ''}" style="font-weight: bold; min-width: 20px; color: var(--gold-main); text-align: center;">${medal}</div>
                    <img src="${safePhoto}" style="width: 30px; height: 30px; border-radius: 50%; border: 2px solid ${isMe ? 'var(--gold-main)' : 'rgba(255,255,255,0.2)'}; object-fit: cover; flex-shrink: 0;">
                    <div style="color: ${isMe ? 'var(--gold-main)' : '#fff'}; font-weight: ${isMe ? 'bold' : 'normal'}; word-break: break-word; white-space: normal; line-height: 1.2; font-size: 0.8rem; padding-right: 5px;">${safeName}</div>
                </div>
                <div style="font-weight: bold; color: #fff; margin-left: 8px; white-space: nowrap;">${pScore} PTS</div>
            `;
            listEl.appendChild(li);
        });
    }
}

// Instanciranje globalnog objekta
window.kvartalnaLiga = new KvartalnaLigaManager();
