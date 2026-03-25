// kvartalnaliga.js - Menadžer za Kvartalnu Ligu i Dvoranu Slavnih
class KvartalnaLigaManager {
    constructor() {
        this.storageKey = 'yamb_quarter_data'; 
        this.currentSlide = 0;
        this.hofData = null; 
        
        this.init();
    }

    get ranks() {
        const gt = (key, fallback) => (typeof t === 'function' && t(key) !== key) ? t(key) : fallback;
        return [
            { id: 'amater', name: `${gt('rank_amater', 'AMATER')} (0 - 4.9k)`, min: 0, max: 4999 },
            { id: 'profi', name: `${gt('rank_profi', 'PROFI')} (5k - 14.9k)`, min: 5000, max: 14999 },
            { id: 'majstor', name: `${gt('rank_majstor', 'MAJSTOR')} (15k - 49.9k)`, min: 15000, max: 49999 },
            { id: 'legenda', name: `${gt('rank_legenda', 'LEGENDA')} (50k - 99.9k)`, min: 50000, max: 99999 },
            { id: 'titan', name: `${gt('rank_titan', 'TITAN')} (100k+)`, min: 100000, max: Infinity },
            { id: 'alltime', name: gt('league_all_time', 'SVA VREMENA 👑'), min: 0, max: Infinity }
        ];
    }

    init() {
        let data = this.getScores();
        const { currentYear, currentQuarter } = this.getCurrentQuarterInfo();

        if (data.year !== currentYear || data.quarter !== currentQuarter) {
            localStorage.setItem('yamb_pending_quarter_check', JSON.stringify({
                year: data.year,
                quarter: data.quarter
            }));

            data.baselineScore += data.quarterlyScore;
            data.quarterlyScore = 0; 
            data.year = currentYear;
            data.quarter = currentQuarter;
            this.saveScores(data);
        }
    }

    getCurrentQuarterInfo() {
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth(); 
        const quarter = Math.floor(month / 3) + 1;
        return { currentYear: year, currentQuarter: quarter };
    }

    getScores() {
        const { currentYear, currentQuarter } = this.getCurrentQuarterInfo();
        let raw = localStorage.getItem(this.storageKey);
        
        if (raw) {
            try { 
                let parsed = JSON.parse(raw); 
                parsed.quarterlyScore = parseInt(parsed.quarterlyScore) || 0;
                parsed.baselineScore = parseInt(parsed.baselineScore) || 0;
                
                if (!parsed.year) parsed.year = currentYear;
                if (!parsed.quarter) parsed.quarter = currentQuarter;
                
                return parsed;
            } 
            catch (e) { console.error("Greška pri parsiranju lige:", e); }
        }
        
        return { year: currentYear, quarter: currentQuarter, baselineScore: 0, quarterlyScore: 0 };
    }

    saveScores(data) {
        localStorage.setItem(this.storageKey, JSON.stringify(data));
    }

    addPoints(points) {
        if (!points || points <= 0) return;
        
        this.init(); 
        let data = this.getScores();
        
        data.quarterlyScore += points;
        this.saveScores(data);
        
        this.syncWithServer();
        
        if (typeof updateMainMenuDashboard === 'function') {
            updateMainMenuDashboard();
        }
    }

    syncWithServer() {
        if (!window.app || !window.app.socket) return;

        const data = this.getScores();
        const { currentYear, currentQuarter } = this.getCurrentQuarterInfo();
        let pName = localStorage.getItem('yamb_player_name') || "Gost";
        let pPhoto = localStorage.getItem('yamb_player_photo') || ''; 

        let pId = localStorage.getItem('yamb_uid') || localStorage.getItem('yamb_player_id');
        if (!pId) {
            pId = 'usr_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now().toString(36);
            localStorage.setItem('yamb_player_id', pId);
        }

        window.app.socket.emit('submit_league_score', {
            playerId: pId,
            playerName: pName,
            photoUrl: pPhoto, 
            score: data.quarterlyScore,
            year: currentYear,
            quarter: currentQuarter
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

    openModal() {
        const gt = (key, fallback) => (typeof t === 'function' && t(key) !== key) ? t(key) : fallback;
        const data = this.getScores();
        
        const pts = parseInt(data.quarterlyScore) || 0;
        const allTime = (parseInt(data.baselineScore) || 0) + pts;
        const rank = this.getRank(pts);
        
        const currentRanks = this.ranks; 

        this.currentSlide = currentRanks.findIndex(r => r.name.startsWith(rank));
        if (this.currentSlide === -1) this.currentSlide = 0;

        let slidesHtml = currentRanks.map((r) => `
            <div class="league-slide" style="min-width: 100%; box-sizing: border-box; padding: 0 10px;">
                <h3 style="color: var(--gold-main); font-size: 1rem; text-align: center; margin-bottom: 15px;">${r.name}</h3>
                <div style="background: rgba(0,0,0,0.4); padding: 15px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.1); margin-bottom: 20px;">
                    <ul id="league-list-${r.id}" style="list-style: none; padding: 0; margin: 0; max-height: 250px; overflow-y: auto; overflow-x: hidden; -webkit-overflow-scrolling: touch;">
                        <li style="text-align: center; color: #aaa; font-size: 0.85rem; padding: 20px;">Učitavanje podataka... ⏳</li>
                    </ul>
                </div>
            </div>
        `).join('');

        let dotsHtml = currentRanks.map((_, i) => `
            <div id="league-dot-${i}" style="width: 8px; height: 8px; border-radius: 50%; background: ${i === this.currentSlide ? 'var(--gold-main)' : 'rgba(255,255,255,0.2)'}; margin: 0 4px; transition: background 0.3s;"></div>
        `).join('');

        let modalHtml = `
        <div id="league-modal-overlay" class="modal-overlay" style="z-index: 999999; display: flex;">
            <div class="modal-box" style="width: 95%; max-width: 500px; max-height: 90vh; overflow-y: auto; padding: 20px; background: linear-gradient(135deg, #111, #222); border: 2px solid var(--gold-main); overflow-x: hidden;">
                
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; border-bottom: 1px solid var(--gold-glow); padding-bottom: 10px;">
                    <h2 style="color: var(--gold-main); font-size: 1.5rem; margin: 0; text-transform: uppercase;">${gt('menu_league', 'KVARTALNA LIGA')}</h2>
                    <span style="color: var(--danger); font-size: 1.5rem; cursor: pointer; font-weight: bold;" onclick="document.getElementById('league-modal-overlay').remove()">✖</span>
                </div>

                <div style="display: flex; justify-content: center; gap: 10px; margin-bottom: 15px;">
                    <button id="tab-league-main" class="btn-menu btn-primary" style="flex: 1; padding: 8px; font-size: 0.85rem; height: auto;" onclick="window.kvartalnaLiga.toggleMainView('league')">${gt('hof_tab_league', 'LIGA')}</button>
                    <button id="tab-league-hof" class="btn-menu btn-secondary" style="flex: 1; padding: 8px; font-size: 0.85rem; height: auto;" onclick="window.kvartalnaLiga.toggleMainView('hof')">${gt('hof_tab_main', 'DVORANA SLAVNIH 🏛️')}</button>
                </div>

                <div id="league-main-content">
                    <div style="text-align: center; margin-bottom: 20px;">
                        <div style="font-size: 0.8rem; color: var(--text-muted); text-transform: uppercase;">${gt('league_your_rank', 'Vaš rang')}</div>
                        <div style="font-size: 2rem; font-weight: 900; color: #fff; text-shadow: 0 0 10px var(--gold-main);">${rank}</div>
                        <div style="font-size: 1.2rem; color: var(--gold-main); font-weight: bold; margin-top: 5px;">${pts} PTS</div>
                        <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 5px;">
                            ${gt('league_all_time_desc', 'Sva vremena')}: ${allTime} PTS
                        </div>
                    </div>

                    <div id="league-carousel-container" style="overflow: hidden; width: 100%; position: relative;">
                        <div id="league-track" style="display: flex; transition: transform 0.3s ease-out; transform: translateX(-${this.currentSlide * 100}%);">
                            ${slidesHtml}
                        </div>
                    </div>
                    
                    <div style="display: flex; justify-content: center; margin-top: 5px; margin-bottom: 15px;">
                        ${dotsHtml}
                    </div>
                </div>

                <div id="hof-main-content" style="display: none; width: 100%;">
                    <div style="display: flex; justify-content: center; gap: 5px; margin-bottom: 15px;">
                        <button id="hof-tab-medals" style="flex: 1; background: var(--gold-main); color: #000; font-weight: bold; border: none; border-radius: 8px; padding: 8px; cursor: pointer; transition: all 0.3s;" onclick="window.kvartalnaLiga.switchHofTab('medals')">${gt('hof_tab_medals', 'MEDALJE 🏅')}</button>
                        <button id="hof-tab-champions" style="flex: 1; background: rgba(255,255,255,0.1); color: #fff; font-weight: bold; border: 1px solid var(--gold-main); border-radius: 8px; padding: 8px; cursor: pointer; transition: all 0.3s;" onclick="window.kvartalnaLiga.switchHofTab('champions')">${gt('hof_tab_champs', 'ŠAMPIONI 🏆')}</button>
                    </div>
                    
                    <div style="background: rgba(0,0,0,0.4); padding: 15px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.1); max-height: 320px; overflow-y: auto;">
                        <ul id="hof-list" style="list-style: none; padding: 0; margin: 0;">
                            <li style="text-align: center; color: var(--text-muted); font-size: 0.85rem;">Učitavanje Dvorane Slavnih... ⏳</li>
                        </ul>
                    </div>
                </div>

                <button class="btn-menu btn-secondary" onclick="document.getElementById('league-modal-overlay').remove()">${gt('modal_btn_cancel', 'ZATVORI')}</button>
            </div>
        </div>`;

        let existing = document.getElementById('league-modal-overlay');
        if (existing) existing.remove();

        document.body.insertAdjacentHTML('beforeend', modalHtml);

        this.setupTouch();
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
            lMain.style.display = 'block';
            hMain.style.display = 'none';
            btnL.className = 'btn-menu btn-primary';
            btnH.className = 'btn-menu btn-secondary';
        } else {
            lMain.style.display = 'none';
            hMain.style.display = 'block';
            btnL.className = 'btn-menu btn-secondary';
            btnH.className = 'btn-menu btn-primary';
            this.fetchHallOfFame();
        }
    }

    switchHofTab(tab) {
        if(window.app && window.app.soundMgr) window.app.soundMgr.click();

        const btnM = document.getElementById('hof-tab-medals');
        const btnC = document.getElementById('hof-tab-champions');
        
        if (tab === 'medals') {
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
        if (!window.app || !window.app.socket) {
            document.getElementById('hof-list').innerHTML = `<li style="text-align:center; color: var(--danger); font-size: 0.85rem; padding: 15px;">Nema konekcije sa serverom.</li>`;
            return;
        }
        
        if (this.hofData) {
            this.renderHofMedals();
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

        if (!this.hofData || !this.hofData.medals || this.hofData.medals.length === 0) {
            const gt = (key, fallback) => (typeof t === 'function' && t(key) !== key) ? t(key) : fallback;
            list.innerHTML = `<li style="text-align: center; color: var(--text-muted); font-size: 0.85rem; padding: 15px;">${gt('hof_no_medals', 'Još uvek nema osvajača medalja.')}</li>`;
            return;
        }
        
        let html = '';
        this.hofData.medals.forEach((m, idx) => {
            const photo = m.photoUrl && m.photoUrl.length > 5 ? m.photoUrl : `https://ui-avatars.com/api/?name=${encodeURIComponent(m.playerName)}&background=333&color=E0C995`;
            const isFirst = idx === 0;
            
            html += `
            <li style="display: flex; align-items: center; background: rgba(255,255,255,0.05); padding: 10px; margin-bottom: 8px; border-radius: 8px; border-left: 4px solid ${isFirst ? 'var(--gold-main)' : 'rgba(255,255,255,0.2)'};">
                <div style="font-weight: 900; color: ${isFirst ? 'var(--gold-main)' : '#aaa'}; width: 25px; font-size: 1rem; text-align: center; margin-right: 5px;">${idx+1}.</div>
                <img src="${photo}" style="width: 40px; height: 40px; border-radius: 50%; border: 2px solid ${isFirst ? 'var(--gold-main)' : '#666'}; margin-right: 12px; object-fit: cover;">
                <div style="flex: 1;">
                    <div style="color: #fff; font-weight: bold; font-size: 0.95rem;">${m.playerName}</div>
                    <div style="display: flex; gap: 12px; margin-top: 4px; font-size: 0.85rem; font-weight: bold;">
                        <span style="color: #FFD700; text-shadow: 0 0 5px rgba(255,215,0,0.5);">🥇 ${m.gold}</span>
                        <span style="color: #C0C0C0;">🥈 ${m.silver}</span>
                        <span style="color: #CD7F32;">🥉 ${m.bronze}</span>
                    </div>
                </div>
            </li>`;
        });
        list.innerHTML = html;
    }

    renderHofChampions() {
        const list = document.getElementById('hof-list');
        if (!list) return;

        if (!this.hofData || !this.hofData.champions || this.hofData.champions.length === 0) {
            const gt = (key, fallback) => (typeof t === 'function' && t(key) !== key) ? t(key) : fallback;
            list.innerHTML = `<li style="text-align: center; color: var(--text-muted); font-size: 0.85rem; padding: 15px;">${gt('hof_no_champs', 'Još uvek nema završenih ciklusa.')}</li>`;
            return;
        }
        
        let html = '';
        this.hofData.champions.forEach((c) => {
            const photo = c.photoUrl && c.photoUrl.length > 5 ? c.photoUrl : `https://ui-avatars.com/api/?name=${encodeURIComponent(c.playerName)}&background=333&color=E0C995`;
            const romanCycle = this.toRoman(c.cycle);
            
            html += `
            <li style="display: flex; align-items: center; background: linear-gradient(90deg, rgba(224, 201, 149, 0.15) 0%, rgba(0,0,0,0) 100%); padding: 12px; margin-bottom: 10px; border-radius: 8px; border: 1px solid rgba(224, 201, 149, 0.3);">
                <div style="position: relative; margin-right: 15px;">
                    <img src="${photo}" style="width: 55px; height: 55px; border-radius: 50%; border: 3px solid var(--gold-main); object-fit: cover; box-shadow: 0 0 10px rgba(224,201,149,0.5);">
                    <div style="position: absolute; bottom: -8px; right: -5px; font-size: 1.3rem;">👑</div>
                </div>
                <div style="flex: 1;">
                    <div style="color: var(--gold-main); font-size: 0.75rem; font-weight: 900; letter-spacing: 1px; margin-bottom: 2px;">POBEDNIK ${romanCycle} CIKLUSA</div>
                    <div style="color: #fff; font-weight: bold; font-size: 1.15rem; margin-bottom: 4px;">${c.playerName}</div>
                    <div style="color: var(--text-muted); font-size: 0.8rem;">Q${c.quarter} / ${c.year} &nbsp;•&nbsp; <span style="color: #fff; font-weight: bold;">${c.score} PTS</span></div>
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
                return; 
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
            if (dot) dot.style.background = i === this.currentSlide ? 'var(--gold-main)' : 'rgba(255,255,255,0.2)';
        });
    }

    fetchLeaderboard() {
        if (!window.app || !window.app.socket) {
            this.ranks.forEach(r => {
                const listEl = document.getElementById(`league-list-${r.id}`);
                if(listEl) listEl.innerHTML = `<li style="text-align:center; color: var(--danger); font-size: 0.85rem; padding: 15px;">Nema konekcije sa serverom.</li>`;
            });
            return;
        }

        const { currentYear, currentQuarter } = this.getCurrentQuarterInfo();

        window.app.socket.off('league_highscores_data');
        window.app.socket.on('league_highscores_data', (scores) => {
            this.populateRanks(scores, false);
        });

        window.app.socket.off('league_alltime_data');
        window.app.socket.on('league_alltime_data', (scores) => {
            this.populateRanks(scores, true);
        });

        window.app.socket.emit('get_league_highscores', { year: currentYear, quarter: currentQuarter });
        window.app.socket.emit('get_league_alltime_highscores'); 
    }

    populateRanks(scores, isAllTime) {
        let safeScores = Array.isArray(scores) ? [...scores] : [];

        // LOKALNA INJEKCIJA: Uvek prikaži lokalnog igrača na listi čak i ako server kasni!
        const localData = this.getScores();
        const myName = localStorage.getItem('yamb_player_name') || "Gost";
        const myPhoto = localStorage.getItem('yamb_player_photo') || '';
        let myScore = isAllTime ? (localData.baselineScore + localData.quarterlyScore) : localData.quarterlyScore;

        if (myScore > 0) {
            let found = safeScores.find(s => s.playerName === myName);
            if (found) {
                if (myScore > found.score) found.score = myScore; // Osveži ako lokalno ima više
            } else {
                safeScores.push({ playerName: myName, photoUrl: myPhoto, score: myScore }); // Dodaj tebe ako te server nije poslao
            }
        }

        if (isAllTime) { 
            this.renderList('alltime', safeScores); 
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

    renderList(rankId, scores) {
        const listEl = document.getElementById(`league-list-${rankId}`);
        if (!listEl) return;

        // VRAĆEN NORMALAN DIZAJN SA PRAVIM TEKSTOM (Umesto crvene kutije)
        if (!scores || scores.length === 0) {
            const gt = (key, fallback) => (typeof t === 'function' && t(key) !== key) ? t(key) : fallback;
            listEl.innerHTML = `<li style="text-align:center; color: #aaa; font-size: 0.85rem; padding: 20px;">${gt('league_no_results', 'Još uvek nema upisanih rezultata za ovaj rang.<br>Budi prvi!')}</li>`;
            return;
        }

        scores.sort((a,b) => (Number(b.score) || 0) - (Number(a.score) || 0));
        listEl.innerHTML = '';
        
        scores.forEach((s, i) => {
            let pName = s.playerName || "Nepoznat Igrač";
            let pScore = s.score !== undefined ? s.score : "0";
            let isMe = (pName === (localStorage.getItem('yamb_player_name') || "Gost"));
            let bg = isMe ? 'background: rgba(224, 201, 149, 0.15); border: 1px solid var(--gold-main);' : 'background: rgba(255,255,255,0.05);';
            let medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`;
            let photo = s.photoUrl && s.photoUrl.length > 5 ? s.photoUrl : `https://ui-avatars.com/api/?name=${encodeURIComponent(pName)}&background=333&color=E0C995`;

            let li = document.createElement('li');
            li.style.cssText = `display: flex; justify-content: space-between; align-items: center; padding: 10px; margin-bottom: 5px; border-radius: 8px; font-size: 0.9rem; ${bg}`;
            li.innerHTML = `
                <div style="display: flex; gap: 10px; align-items: center; flex: 1; min-width: 0;">
                    <div style="font-weight: bold; min-width: 25px; color: var(--gold-main); text-align: center;">${medal}</div>
                    <img src="${photo}" style="width: 35px; height: 35px; border-radius: 50%; border: 2px solid ${isMe ? 'var(--gold-main)' : 'rgba(255,255,255,0.2)'}; object-fit: cover; flex-shrink: 0;">
                    <div style="color: ${isMe ? 'var(--gold-main)' : '#fff'}; font-weight: ${isMe ? 'bold' : 'normal'}; word-break: break-word; white-space: normal; line-height: 1.2; font-size: 0.85rem; padding-right: 5px;">${pName}</div>
                </div>
                <div style="font-weight: bold; color: #fff; margin-left: 10px; white-space: nowrap;">${pScore} PTS</div>
            `;
            listEl.appendChild(li);
        });
    }
}

// Instanciranje globalnog objekta
window.kvartalnaLiga = new KvartalnaLigaManager();