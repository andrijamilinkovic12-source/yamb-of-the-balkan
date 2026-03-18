// kvartalnaliga.js - Menadžer za Kvartalnu Ligu (Sa Swipe opcijom i rangovima)
class KvartalnaLigaManager {
    constructor() {
        this.storageKey = 'yamb_league_data';
        this.currentSlide = 0;
        
        // Definicija svih rangova za lakše mapiranje i slajdove
        this.ranks = [
            { id: 'amater', name: 'AMATER (0 - 4.9k)', min: 0, max: 4999 },
            { id: 'profi', name: 'PROFI (5k - 14.9k)', min: 5000, max: 14999 },
            { id: 'majstor', name: 'MAJSTOR (15k - 49.9k)', min: 15000, max: 49999 },
            { id: 'legenda', name: 'LEGENDA (50k - 99.9k)', min: 50000, max: 99999 },
            { id: 'titan', name: 'TITAN (100k+)', min: 100000, max: Infinity },
            { id: 'alltime', name: 'SVA VREMENA 👑', min: 0, max: Infinity }
        ];
        
        this.init();
    }

    // 1. Inicijalizacija i provera kvartala
    init() {
        let data = this.getScores();
        const { currentYear, currentQuarter } = this.getCurrentQuarterInfo();

        if (data.year !== currentYear || data.quarter !== currentQuarter) {
            data.baselineScore += data.quarterlyScore;
            data.quarterlyScore = 0; 
            data.year = currentYear;
            data.quarter = currentQuarter;
            this.saveScores(data);
        }
    }

    // 2. Dobijanje trenutne godine i kvartala
    getCurrentQuarterInfo() {
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth(); 
        const quarter = Math.floor(month / 3) + 1;
        return { currentYear: year, currentQuarter: quarter };
    }

    // 3. Čitanje poena iz lokalne memorije
    getScores() {
        let raw = localStorage.getItem(this.storageKey);
        if (raw) {
            try { return JSON.parse(raw); } 
            catch (e) { console.error("Greška pri parsiranju lige:", e); }
        }
        
        const { currentYear, currentQuarter } = this.getCurrentQuarterInfo();
        return { year: currentYear, quarter: currentQuarter, baselineScore: 0, quarterlyScore: 0 };
    }

    // 4. Čuvanje u lokalnu memoriju
    saveScores(data) {
        localStorage.setItem(this.storageKey, JSON.stringify(data));
    }

    // 5. Dodavanje poena nakon partije
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

    // 6. Sinhronizacija sa serverom
    syncWithServer() {
        if (!window.app || !window.app.socket) return;

        const data = this.getScores();
        const { currentYear, currentQuarter } = this.getCurrentQuarterInfo();
        let pName = localStorage.getItem('yamb_player_name') || "Gost";

        let pId = localStorage.getItem('yamb_uid') || localStorage.getItem('yamb_player_id');
        if (!pId) {
            pId = 'usr_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now().toString(36);
            localStorage.setItem('yamb_player_id', pId);
        }

        window.app.socket.emit('submit_league_score', {
            playerId: pId,
            playerName: pName,
            score: data.quarterlyScore,
            year: currentYear,
            quarter: currentQuarter
        });
    }

    // 7. Određivanje ranga
    getRank(pts) {
        if (pts < 5000) return "AMATER";
        if (pts < 15000) return "PROFI";
        if (pts < 50000) return "MAJSTOR";
        if (pts < 100000) return "LEGENDA";
        return "TITAN";
    }

    // 8. Prikaz Modalnog prozora za Ligu sa klizačem
    openModal() {
        const data = this.getScores();
        const allTime = data.baselineScore + data.quarterlyScore;
        const rank = this.getRank(data.quarterlyScore);
        
        // Podesi početni slajd na osnovu trenutnog ranga igrača
        this.currentSlide = this.ranks.findIndex(r => r.name.startsWith(rank));
        if (this.currentSlide === -1) this.currentSlide = 0;

        // Generisanje HTML-a za svaki slajd pojedinačno
        let slidesHtml = this.ranks.map((r) => `
            <div class="league-slide" style="min-width: 100%; box-sizing: border-box; padding: 0 10px;">
                <h3 style="color: var(--gold-main); font-size: 1rem; text-align: center; margin-bottom: 15px;">${r.name}</h3>
                <div style="background: rgba(0,0,0,0.4); padding: 15px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.1); margin-bottom: 20px;">
                    <ul id="league-list-${r.id}" style="list-style: none; padding: 0; margin: 0; max-height: 250px; overflow-y: auto;">
                        <li style="text-align: center; color: var(--text-muted); font-size: 0.85rem;">Učitavanje servera... ⏳</li>
                    </ul>
                </div>
            </div>
        `).join('');

        // Generisanje tačkica za navigaciju
        let dotsHtml = this.ranks.map((_, i) => `
            <div id="league-dot-${i}" style="width: 8px; height: 8px; border-radius: 50%; background: ${i === this.currentSlide ? 'var(--gold-main)' : 'rgba(255,255,255,0.2)'}; margin: 0 4px; transition: background 0.3s;"></div>
        `).join('');

        let modalHtml = `
        <div id="league-modal-overlay" class="modal-overlay" style="z-index: 999999; display: flex;">
            <div class="modal-box" style="width: 95%; max-width: 500px; max-height: 90vh; overflow-y: auto; padding: 20px; background: linear-gradient(135deg, #111, #222); border: 2px solid var(--gold-main); overflow-x: hidden;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; border-bottom: 1px solid var(--gold-glow); padding-bottom: 10px;">
                    <h2 style="color: var(--gold-main); font-size: 1.5rem; margin: 0; text-transform: uppercase;" data-lang="menu_league">KVARTALNA LIGA</h2>
                    <span style="color: var(--danger); font-size: 1.5rem; cursor: pointer; font-weight: bold;" onclick="document.getElementById('league-modal-overlay').remove()">✖</span>
                </div>

                <div style="text-align: center; margin-bottom: 20px;">
                    <div style="font-size: 0.8rem; color: var(--text-muted); text-transform: uppercase;">Vaš rang</div>
                    <div style="font-size: 2rem; font-weight: 900; color: #fff; text-shadow: 0 0 10px var(--gold-main);">${rank}</div>
                    <div style="font-size: 1.2rem; color: var(--gold-main); font-weight: bold; margin-top: 5px;">${data.quarterlyScore} PTS</div>
                    <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 5px;" data-lang="league_all_time_desc">Sva vremena: ${allTime} PTS</div>
                </div>

                <div id="league-carousel-container" style="overflow: hidden; width: 100%; position: relative;">
                    <div id="league-track" style="display: flex; transition: transform 0.3s ease-out; transform: translateX(-${this.currentSlide * 100}%);">
                        ${slidesHtml}
                    </div>
                </div>
                
                <div style="display: flex; justify-content: center; margin-top: 5px; margin-bottom: 15px;">
                    ${dotsHtml}
                </div>

                <button class="btn-menu btn-secondary" onclick="document.getElementById('league-modal-overlay').remove()" data-lang="modal_btn_cancel">ZATVORI</button>
            </div>
        </div>`;

        let existing = document.getElementById('league-modal-overlay');
        if (existing) existing.remove();

        document.body.insertAdjacentHTML('beforeend', modalHtml);

        if (typeof applyTranslations === 'function') applyTranslations();

        this.setupTouch();
        this.fetchLeaderboard();
    }

    // 9. Swipe (Touch) Osluškivači
    setupTouch() {
        const track = document.getElementById('league-track');
        if (!track) return;
        
        let startX = 0;
        let isDragging = false;

        track.addEventListener('touchstart', (e) => {
            startX = e.touches[0].clientX;
            isDragging = true;
            track.style.transition = 'none'; 
        }, { passive: true });

        track.addEventListener('touchmove', (e) => {
            if (!isDragging) return;
            const currentX = e.touches[0].clientX;
            const diff = currentX - startX;
            const diffPercent = (diff / track.parentElement.offsetWidth) * 100;
            track.style.transform = `translateX(calc(-${this.currentSlide * 100}% + ${diffPercent}%))`;
        }, { passive: true });

        track.addEventListener('touchend', (e) => {
            if (!isDragging) return;
            isDragging = false;
            track.style.transition = 'transform 0.3s ease-out';
            
            const endX = e.changedTouches[0].clientX;
            const diff = endX - startX;
            
            // Prag za promenu ekrana je 50 piksela prevlačenja
            if (diff < -50 && this.currentSlide < this.ranks.length - 1) {
                this.currentSlide++;
            } else if (diff > 50 && this.currentSlide > 0) {
                this.currentSlide--;
            }
            
            this.updateSlide();
        });
    }

    updateSlide() {
        const track = document.getElementById('league-track');
        if (track) track.style.transform = `translateX(-${this.currentSlide * 100}%)`;
        
        this.ranks.forEach((_, i) => {
            const dot = document.getElementById(`league-dot-${i}`);
            if (dot) dot.style.background = i === this.currentSlide ? 'var(--gold-main)' : 'rgba(255,255,255,0.2)';
        });
    }

    // 10. Dohvatanje Top Liste i Razvrstavanje po rangovima
    fetchLeaderboard() {
        if (!window.app || !window.app.socket) {
            this.ranks.forEach(r => {
                const listEl = document.getElementById(`league-list-${r.id}`);
                if(listEl) listEl.innerHTML = `<li style="text-align:center; color: var(--danger); font-size: 0.85rem;" data-lang="league_no_conn">Nema konekcije sa serverom.</li>`;
            });
            return;
        }

        const { currentYear, currentQuarter } = this.getCurrentQuarterInfo();

        // Osluškivanje podataka za tekući kvartal
        window.app.socket.once('league_highscores_data', (scores) => {
            this.populateRanks(scores, false);
        });

        // Osluškivanje podataka za All-Time (ako server podržava)
        window.app.socket.once('league_alltime_data', (scores) => {
            this.populateRanks(scores, true);
        });

        // Zahtevi prema serveru
        window.app.socket.emit('get_league_highscores', { year: currentYear, quarter: currentQuarter });
        window.app.socket.emit('get_league_alltime_highscores'); 

        // Fallback: Ako server ne pošalje "Sva Vremena" podatke (zbog nedostatka endpointa), prikazaćemo lokalni skor posle 2 sekunde
        setTimeout(() => {
            const allTimeList = document.getElementById('league-list-alltime');
            if (allTimeList && allTimeList.innerHTML.includes('Učitavanje')) {
                const localData = this.getScores();
                const localAllTime = localData.baselineScore + localData.quarterlyScore;
                const pName = localStorage.getItem('yamb_player_name') || "Gost";
                this.renderList('alltime', [{ playerName: pName, score: localAllTime }]);
            }
        }, 2000);
    }

    populateRanks(scores, isAllTime) {
        if (isAllTime) {
            this.renderList('alltime', scores);
            return;
        }
        
        // Razvrstavanje pristiglih podataka tekućeg kvartala po rangovima
        this.ranks.forEach(rank => {
            if (rank.id === 'alltime') return;
            const rankScores = scores ? scores.filter(s => s.score >= rank.min && s.score <= rank.max) : [];
            this.renderList(rank.id, rankScores);
        });
    }

    renderList(rankId, scores) {
        const listEl = document.getElementById(`league-list-${rankId}`);
        if (!listEl) return;

        if (!scores || scores.length === 0) {
            listEl.innerHTML = `<li style="text-align:center; color: var(--text-muted); font-size: 0.85rem;" data-lang="league_no_results">Nema upisanih rezultata u ovom rangu.</li>`;
            return;
        }

        // Sortiranje po bodovima opadajuće
        scores.sort((a,b) => b.score - a.score);

        listEl.innerHTML = '';
        scores.forEach((s, i) => {
            let isMe = (s.playerName === (localStorage.getItem('yamb_player_name') || "Gost"));
            let bg = isMe ? 'background: rgba(224, 201, 149, 0.15); border: 1px solid var(--gold-main);' : 'background: rgba(255,255,255,0.05);';
            let medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`;

            let li = document.createElement('li');
            li.style.cssText = `display: flex; justify-content: space-between; padding: 10px; margin-bottom: 5px; border-radius: 8px; font-size: 0.9rem; ${bg}`;
            li.innerHTML = `
                <div style="display: flex; gap: 10px; align-items: center;">
                    <span style="font-weight: bold; width: 25px; color: var(--gold-main);">${medal}</span>
                    <span style="color: ${isMe ? 'var(--gold-main)' : 'var(--text-main)'}; font-weight: ${isMe ? 'bold' : 'normal'};">${s.playerName}</span>
                </div>
                <span style="font-weight: bold; color: var(--text-main);">${s.score} PTS</span>
            `;
            listEl.appendChild(li);
        });
    }
}

// Instanciranje globalnog objekta
window.kvartalnaLiga = new KvartalnaLigaManager();