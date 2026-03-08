// kvartalnaliga.js - Upravljanje kvartalnim ligama i prikaz globalne statistike

class KvartalnaLigaManager {
    constructor() {
        this.ranks = [
            { id: 'amater', name: 'AMATER', max: 5000, color: '#A0522D', icon: '🥉' },
            { id: 'profi', name: 'PROFI', max: 15000, color: '#C0C0C0', icon: '🥈' },
            { id: 'majstor', name: 'MAJSTOR', max: 50000, color: '#FFD700', icon: '🥇' },
            { id: 'legenda', name: 'LEGENDA', max: 100000, color: '#9C27B0', icon: '💎' },
            { id: 'titan', name: 'TITAN', max: Infinity, color: '#FF3D00', icon: '⚡' }
        ];
        this.init();
        this.createModalDOM();
    }

    init() {
        // Logika za 3 kvartala godišnje (Jan-Apr, Maj-Avg, Sep-Dec)
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth(); // 0-11
        const currentQuarter = Math.floor(currentMonth / 4) + 1; // 1, 2, ili 3

        let quarterData = JSON.parse(localStorage.getItem('yamb_quarter_data')) || {};
        const stats = JSON.parse(localStorage.getItem('yamb_stats')) || { totalScoreSum: 0 };

        // Ako se godina ili kvartal ne poklapaju, resetujemo kvartalnu ligu!
        if (quarterData.year !== currentYear || quarterData.quarter !== currentQuarter) {
            quarterData = {
                year: currentYear,
                quarter: currentQuarter,
                baselineScore: stats.totalScoreSum || 0 // Pravimo presek stanja
            };
            localStorage.setItem('yamb_quarter_data', JSON.stringify(quarterData));
        }
        this.quarterData = quarterData;
    }

    getScores() {
        const stats = JSON.parse(localStorage.getItem('yamb_stats')) || { totalScoreSum: 0 };
        const allTimeScore = stats.totalScoreSum || 0;
        const baseline = this.quarterData.baselineScore || 0;
        let quarterlyScore = allTimeScore - baseline;
        
        if (quarterlyScore < 0) quarterlyScore = 0; 
        
        return { allTimeScore, quarterlyScore };
    }

    createModalDOM() {
        const overlay = document.createElement('div');
        overlay.id = 'league-modal-overlay';
        overlay.className = 'modal-overlay';
        overlay.style.zIndex = '999999';
        overlay.style.display = 'none';

        // Layout podeljen na GORNJI deo (tvoj progres) i DONJI deo (top lista)
        overlay.innerHTML = `
            <div class="modal-box" style="width: 90%; max-width: 420px; height: 85vh; max-height: 800px; padding: 0 !important; display: flex; flex-direction: column; overflow: hidden; position: relative;">
                
                <div style="background: rgba(0,0,0,0.2); padding: 15px; border-bottom: 1px solid var(--glass-border); display: flex; justify-content: space-between; align-items: center; flex-shrink: 0;">
                    <span style="color: var(--gold-main); font-weight: 800; letter-spacing: 1px;">🏆 KVARTALNA LIGA</span>
                    <span style="cursor: pointer; color: var(--danger); font-size: 1.2rem; font-weight: bold; padding: 0 5px;" onclick="window.kvartalnaLiga.closeModal()">✖</span>
                </div>
                
                <div id="league-slider" style="display: flex; overflow-x: auto; scroll-snap-type: x mandatory; scroll-behavior: smooth; width: 100%; -webkit-overflow-scrolling: touch; flex-shrink: 0; min-height: 250px;">
                    </div>
                
                <div style="text-align: center; padding: 5px; font-size: 0.7rem; color: var(--text-muted); flex-shrink: 0;">
                    ← Prevuci levo-desno za svoje lige →
                </div>

                <div style="background: rgba(0,0,0,0.4); padding: 10px; border-top: 1px solid var(--glass-border); border-bottom: 1px solid var(--glass-border); text-align: center; color: var(--gold-main); font-size: 0.8rem; font-weight: bold; letter-spacing: 1px; flex-shrink: 0;">
                    🌍 TOP LISTA IGRACA - TRENUTNI KVARTAL
                </div>

                <div id="league-global-list" style="flex: 1; overflow-y: auto; width: 100%; -webkit-overflow-scrolling: touch; padding-bottom: 15px;">
                    <div style="text-align:center; padding:20px; color:var(--text-muted); font-size:0.8rem;">Učitavanje servera... ⏳</div>
                </div>

            </div>
        `;
        document.body.appendChild(overlay);
    }

    renderSlides() {
        const slider = document.getElementById('league-slider');
        slider.innerHTML = '';
        const { allTimeScore, quarterlyScore } = this.getScores();

        // Generišemo slajd za svaku ligu
        this.ranks.forEach((rank, index) => {
            const isUnlocked = quarterlyScore >= (index === 0 ? 0 : this.ranks[index - 1].max);
            const isCurrent = quarterlyScore >= (index === 0 ? 0 : this.ranks[index - 1].max) && quarterlyScore < rank.max;
            
            let progressPts = quarterlyScore;
            let percent = 0;

            if (isUnlocked) {
                if (isCurrent) {
                    percent = Math.min(100, Math.round((quarterlyScore / rank.max) * 100));
                } else {
                    percent = 100; // Prešli su ovaj nivo
                }
            }

            const slide = document.createElement('div');
            slide.style.cssText = 'min-width: 100%; scroll-snap-align: center; padding: 15px 20px; display: flex; flex-direction: column; align-items: center; justify-content: center; opacity: ' + (isUnlocked ? '1' : '0.4') + '; transition: 0.3s;';

            slide.innerHTML = `
                <div style="font-size: 3.5rem; margin-bottom: 5px; filter: drop-shadow(0 0 15px ${rank.color}80);">${rank.icon}</div>
                <h2 style="color: ${rank.color}; margin-bottom: 5px; letter-spacing: 2px; font-size: 1.3rem;">${rank.name}</h2>
                <div style="font-size: 0.75rem; color: var(--text-muted); margin-bottom: 15px;">
                    ${rank.max === Infinity ? 'Krajnja granica' : 'Do ' + rank.max.toLocaleString('sr-RS') + ' PTS'}
                </div>
                
                <div style="width: 100%; background: rgba(0,0,0,0.4); height: 10px; border-radius: 5px; border: 1px solid var(--glass-border); overflow: hidden; position: relative;">
                    <div style="width: ${percent}%; height: 100%; background: ${rank.color}; box-shadow: 0 0 10px ${rank.color};"></div>
                </div>
                
                <div style="margin-top: 10px; font-weight: bold; color: var(--text-main); font-size: 0.9rem;">
                    ${isUnlocked ? (isCurrent ? progressPts.toLocaleString('sr-RS') + ' / ' + rank.max.toLocaleString('sr-RS') : 'ZAVRŠENO ✔') : 'ZAKLJUČANO 🔒'}
                </div>
            `;
            slider.appendChild(slide);
        });

        // Poslednji slajd: SVA VREMENA
        const allTimeSlide = document.createElement('div');
        allTimeSlide.style.cssText = 'min-width: 100%; scroll-snap-align: center; padding: 15px 20px; display: flex; flex-direction: column; align-items: center; justify-content: center; border-left: 1px dashed var(--glass-border);';
        allTimeSlide.innerHTML = `
            <div style="font-size: 3.5rem; margin-bottom: 5px; filter: drop-shadow(0 0 10px gold);">🌍</div>
            <h2 style="color: var(--gold-main); margin-bottom: 5px; letter-spacing: 2px; font-size: 1.3rem;">SVA VREMENA</h2>
            <div style="font-size: 0.7rem; color: var(--text-muted); margin-bottom: 15px; text-align: center;">Ukupni poeni od prvog pokretanja.</div>
            
            <div style="font-size: 2rem; font-weight: 900; color: #fff; text-shadow: 0 2px 10px rgba(0,0,0,0.8); background: rgba(0,0,0,0.3); padding: 8px 20px; border-radius: 12px; border: 1px solid var(--gold-main);">
                ${allTimeScore.toLocaleString('sr-RS')} PTS
            </div>
        `;
        slider.appendChild(allTimeSlide);
    }

    // Povlačenje podataka sa servera
    fetchLeaderboard() {
        const list = document.getElementById('league-global-list');
        if (!list) return;

        // Reset statusa u slucaju novog otvaranja
        list.innerHTML = `<div style="text-align:center; padding:20px; color:var(--text-muted); font-size:0.8rem;">Učitavanje igrača... ⏳</div>`;

        // Koristimo app socket ako postoji
        if (window.app && window.app.socket && window.app.socket.connected) {
            
            // Šaljemo zahtev serveru sa trenutnom godinom i kvartalom
            window.app.socket.emit('get_league_highscores', { 
                year: this.quarterData.year, 
                quarter: this.quarterData.quarter 
            });

            // Čekamo odgovor servera (koristimo .once da se ne bi gomilali listeneri)
            window.app.socket.once('league_highscores_data', (data) => {
                this.renderLeaderboard(data);
            });

        } else {
            list.innerHTML = `<div style="text-align:center; padding:20px; color:var(--text-muted); font-size:0.8rem;">Niste povezani na server.<br><span style="font-size:0.7rem; opacity:0.6;">Lista nije dostupna u offline modu.</span></div>`;
        }
    }

    // Renderovanje Top Liste ispod slajdera
    renderLeaderboard(data) {
        const list = document.getElementById('league-global-list');
        if (!list) return;
        
        list.innerHTML = '';
        
        if (!data || data.length === 0) {
            list.innerHTML = `<div style="text-align:center; padding:30px 20px; color:var(--text-muted); font-size:0.8rem; font-style:italic;">Još uvek nema upisanih rezultata za ovaj kvartal.<br>Budi prvi!</div>`;
            return;
        }

        data.forEach((entry, index) => {
            // Iskoristićemo tvoje postojeće CSS klase iz style.css (rank-circle, rank-1, itd.)
            let rankClass = 'rank-circle';
            if (index === 0) rankClass += ' rank-1';
            else if (index === 1) rankClass += ' rank-2';
            else if (index === 2) rankClass += ' rank-3';

            let crownIcon = (index === 0) ? ' 👑' : '';

            const li = document.createElement('div');
            li.style.cssText = "display: flex; align-items: center; justify-content: space-between; padding: 12px 15px; border-bottom: 1px solid rgba(255,255,255,0.05);";
            
            li.innerHTML = `
                <div style="display: flex; align-items: center; gap: 15px; overflow: hidden;">
                    <div class="${rankClass}" style="flex-shrink: 0; width: 32px; height: 32px; font-size: 0.8rem;">${index + 1}</div>
                    <div style="font-weight: 700; color: var(--text-main); font-size: 0.85rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                        ${entry.playerName}${crownIcon}
                    </div>
                </div>
                <div style="background: rgba(0, 0, 0, 0.4); border: 1px solid var(--gold-main); color: var(--gold-main); padding: 4px 10px; border-radius: 20px; font-weight: 800; font-size: 0.85rem; white-space: nowrap; flex-shrink: 0;">
                    ${entry.score.toLocaleString('sr-RS')}
                </div>
            `;
            list.appendChild(li);
        });
    }

    openModal() {
        this.init(); 
        this.renderSlides();
        document.getElementById('league-modal-overlay').style.display = 'flex';
        
        // Automatski traži podatke sa servera cim se prozor otvori
        this.fetchLeaderboard();
        
        if (window.app && window.app.soundMgr) window.app.soundMgr.click();
    }

    closeModal() {
        document.getElementById('league-modal-overlay').style.display = 'none';
        if (window.app && window.app.soundMgr) window.app.soundMgr.click();
    }
}

// Inicijalizacija
window.kvartalnaLiga = new KvartalnaLigaManager();