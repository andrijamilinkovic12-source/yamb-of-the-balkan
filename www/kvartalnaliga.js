// kvartalnaliga.js - Menadžer za Kvartalnu Ligu
class KvartalnaLigaManager {
    constructor() {
        this.storageKey = 'yamb_league_data';
        this.init();
    }

    // 1. Inicijalizacija i provera kvartala
    init() {
        let data = this.getScores();
        const { currentYear, currentQuarter } = this.getCurrentQuarterInfo();

        if (data.year !== currentYear || data.quarter !== currentQuarter) {
            // Ako se promenio kvartal, arhiviramo stare poene u baselineScore
            data.baselineScore += data.quarterlyScore;
            data.quarterlyScore = 0; // Resetujemo za novi kvartal
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
            try {
                return JSON.parse(raw);
            } catch (e) {
                console.error("Greška pri parsiranju lige:", e);
            }
        }
        
        const { currentYear, currentQuarter } = this.getCurrentQuarterInfo();
        return {
            year: currentYear,
            quarter: currentQuarter,
            baselineScore: 0,
            quarterlyScore: 0
        };
    }

    // 4. Čuvanje u lokalnu memoriju
    saveScores(data) {
        localStorage.setItem(this.storageKey, JSON.stringify(data));
    }

    // 5. Dodavanje poena nakon partije
    addPoints(points) {
        if (!points || points <= 0) return;
        
        this.init(); // Provera kvartala pre dodavanja
        let data = this.getScores();
        
        data.quarterlyScore += points;
        this.saveScores(data);
        
        // Slanje novog stanja na server
        this.syncWithServer();
        
        // Osvežavanje glavnog menija ako postoji
        if (typeof updateMainMenuDashboard === 'function') {
            updateMainMenuDashboard();
        }
    }

    // 6. Sinhronizacija sa serverom (POPRAVLJENO: SLANJE playerId)
    syncWithServer() {
        if (!window.app || !window.app.socket) return;

        const data = this.getScores();
        const { currentYear, currentQuarter } = this.getCurrentQuarterInfo();
        let pName = localStorage.getItem('yamb_player_name') || "Gost";

        // Hvatanje ID-a (Google UID ili generisani lokalni ID)
        let pId = localStorage.getItem('yamb_userid');
        if (!pId) {
            pId = 'guest_' + Math.random().toString(36).substr(2, 9);
            localStorage.setItem('yamb_userid', pId);
        }

        // Emitovanje poena na server sa uključenim ID-em
        window.app.socket.emit('submit_league_score', {
            playerId: pId, // OVO SADA SPREČAVA PREPISIVANJE TUĐIH POENA
            playerName: pName,
            score: data.quarterlyScore,
            year: currentYear,
            quarter: currentQuarter
        });
    }

    // 7. Određivanje ranga na osnovu trenutnih poena
    getRank(pts) {
        if (pts < 5000) return "AMATER";
        if (pts < 15000) return "PROFI";
        if (pts < 50000) return "MAJSTOR";
        if (pts < 100000) return "LEGENDA";
        return "TITAN";
    }

    // 8. Prikaz Modalnog prozora za Ligu
    openModal() {
        const data = this.getScores();
        const allTime = data.baselineScore + data.quarterlyScore;
        const rank = this.getRank(data.quarterlyScore);

        let modalHtml = `
        <div id="league-modal-overlay" class="modal-overlay" style="z-index: 999999; display: flex;">
            <div class="modal-box" style="width: 95%; max-width: 500px; max-height: 90vh; overflow-y: auto; padding: 20px; background: linear-gradient(135deg, #111, #222); border: 2px solid var(--gold-main);">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; border-bottom: 1px solid var(--gold-glow); padding-bottom: 10px;">
                    <h2 style="color: var(--gold-main); font-size: 1.5rem; margin: 0; text-transform: uppercase;" data-lang="menu_league">KVARTALNA LIGA</h2>
                    <span style="color: var(--danger); font-size: 1.5rem; cursor: pointer; font-weight: bold;" onclick="document.getElementById('league-modal-overlay').remove()">✖</span>
                </div>

                <div style="text-align: center; margin-bottom: 25px;">
                    <div style="font-size: 0.8rem; color: var(--text-muted); text-transform: uppercase;">Vaš rang</div>
                    <div style="font-size: 2rem; font-weight: 900; color: #fff; text-shadow: 0 0 10px var(--gold-main);">${rank}</div>
                    <div style="font-size: 1.2rem; color: var(--gold-main); font-weight: bold; margin-top: 5px;">${data.quarterlyScore} PTS</div>
                    <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 5px;" data-lang="league_all_time_desc">Sva vremena: ${allTime} PTS</div>
                </div>

                <div style="background: rgba(0,0,0,0.4); padding: 15px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.1); margin-bottom: 20px;">
                    <h3 style="color: var(--gold-main); font-size: 1rem; text-align: center; margin-bottom: 15px;" data-lang="league_top_list">🌍 TOP LISTA - TRENUTNI KVARTAL</h3>
                    <ul id="league-hs-list" style="list-style: none; padding: 0; margin: 0; max-height: 300px; overflow-y: auto;">
                        <li style="text-align: center; color: var(--text-muted); font-size: 0.85rem;" data-lang="league_loading">Učitavanje servera... ⏳</li>
                    </ul>
                </div>

                <button class="btn-menu btn-secondary" onclick="document.getElementById('league-modal-overlay').remove()" data-lang="modal_btn_cancel">ZATVORI</button>
            </div>
        </div>`;

        let existing = document.getElementById('league-modal-overlay');
        if (existing) existing.remove();

        document.body.insertAdjacentHTML('beforeend', modalHtml);

        if (typeof applyTranslations === 'function') applyTranslations();

        this.fetchLeaderboard();
    }

    // 9. Dohvatanje Top Liste Lige sa servera
    fetchLeaderboard() {
        if (!window.app || !window.app.socket) {
            document.getElementById('league-hs-list').innerHTML = `<li style="text-align:center; color: var(--danger); font-size: 0.85rem;" data-lang="league_no_conn">Nema konekcije sa serverom.</li>`;
            return;
        }

        const { currentYear, currentQuarter } = this.getCurrentQuarterInfo();

        window.app.socket.emit('get_league_highscores', { year: currentYear, quarter: currentQuarter });

        window.app.socket.once('league_highscores_data', (scores) => {
            const listEl = document.getElementById('league-hs-list');
            if (!listEl) return;

            if (!scores || scores.length === 0) {
                listEl.innerHTML = `<li style="text-align:center; color: var(--text-muted); font-size: 0.85rem;" data-lang="league_no_results">Nema upisanih rezultata za ovaj kvartal.</li>`;
                return;
            }

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
        });
    }
}

// Instanciranje globalnog objekta kako bi ga glavni fajlovi (poput game.js i index.html) prepoznali
window.kvartalnaLiga = new KvartalnaLigaManager();