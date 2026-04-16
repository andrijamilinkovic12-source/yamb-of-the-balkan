// vatreniniz.js - TOP LISTA VATRENOG NIZA

class VatreniNizManager {
    constructor() {
        this.createModal();
        this.setupSocket();
    }

    // 1. Kreiranje HTML strukture modala koja se ubacuje u body
    createModal() {
        // Dinamičko preuzimanje prevoda uz pomoć funkcije t() iz languages.js
        const title = typeof t !== 'undefined' ? t('streak_top_title') : '🔥 TOP VATRENI NIZ';
        const loading = typeof t !== 'undefined' ? t('streak_loading') : 'Učitavam listu... ⏳';

        const modalHtml = `
        <div id="streak-overlay" class="modal-overlay" style="display: none; z-index: 100000;">
            <div class="modal-box" style="width: 95%; max-width: 500px; height: 80vh; max-height: 800px; display: flex; flex-direction: column; padding: 0 !important; overflow: hidden; background: var(--glass-bg); border: 1px solid var(--glass-border);">
                
                <div class="chat-header" style="background: rgba(0,0,0,0.2); padding: 15px 20px; border-bottom: 1px solid var(--glass-border); display: flex; justify-content: space-between; align-items: center;">
                    <span style="color: #FF5722; font-weight: 800; font-size: 1.1rem; letter-spacing: 1px;">${title}</span>
                    <span style="cursor: pointer; color: var(--danger); font-size: 1.2rem; font-weight: bold; padding: 0 5px;" onclick="document.getElementById('streak-overlay').style.display='none'">✖</span>
                </div>

                <div id="streak-body" style="flex: 1; overflow-y: auto; padding: 15px; display: flex; flex-direction: column; gap: 10px; width: 100%;">
                    <div style="text-align: center; font-size: 0.8rem; color: var(--text-muted);">${loading}</div>
                </div>

            </div>
        </div>`;

        document.body.insertAdjacentHTML('beforeend', modalHtml);
    }

    // 2. Metoda za otvaranje modala (poziva se na klik iz UI-a)
    openModal() {
        // Zvuk klika
        if (window.app && window.app.soundMgr) {
            window.app.soundMgr.click();
        }

        const overlay = document.getElementById('streak-overlay');
        if (overlay) overlay.style.display = 'flex';

        // Tražimo podatke od servera svaki put kad se otvori
        if (window.app && window.app.socket && window.app.socket.connected) {
            
            // Postavljamo loading tekst dok čekamo odgovor
            const loading = typeof t !== 'undefined' ? t('streak_searching') : 'Tražim najvatrenije igrače...';
            document.getElementById('streak-body').innerHTML = `<div style="text-align: center; font-size: 0.8rem; color: var(--text-muted); margin-top: 20px;">${loading}</div>`;
            
            window.app.socket.emit('get_streak_leaderboard');
        } else {
            const noConn = typeof t !== 'undefined' ? t('streak_no_conn') : 'Niste povezani na server.';
            document.getElementById('streak-body').innerHTML = `<div style="text-align: center; font-size: 0.8rem; color: var(--danger); margin-top: 20px;">${noConn}</div>`;
        }
    }

    // 3. Osluškivanje odgovora sa servera
    setupSocket() {
        // Pošto VatreniNizManager može biti inicijalizovan pre nego što socket bude spreman,
        // sačekaćemo kratko i vezati event ako app i socket postoje.
        setTimeout(() => {
            if (window.app && window.app.socket) {
                window.app.socket.on('streak_leaderboard_data', (data) => {
                    const body = document.getElementById('streak-body');
                    if (!body) return;

                    // Dinamički preuzimamo prevod za tekstove
                    const noData = typeof t !== 'undefined' ? t('streak_no_data') : 'Još uvek nema podataka. Odigrajte partiju!';
                    const tCurrent = typeof t !== 'undefined' ? t('streak_current') : 'Trenutni';
                    const tBroken = typeof t !== 'undefined' ? t('streak_broken') : 'Prekinut niz';

                    if (!data || data.length === 0) {
                        body.innerHTML = `<div style="text-align: center; font-size: 0.85rem; color: var(--text-muted); margin-top: 20px; font-style: italic;">${noData}</div>`;
                        return;
                    }

                    let html = '';
                    const myUid = localStorage.getItem('yamb_uid');

                    data.forEach((player, idx) => {
                        let isMe = (player.uid === myUid);
                        
                        // Rangiranje: Vatra za prvo mesto, medalje za drugo i treće
                        let rankTrophy = idx === 0 ? '🔥' : (idx === 1 ? '🥈' : (idx === 2 ? '🥉' : `${idx + 1}.`));
                        
                        // Stilovi kartice zavisno od toga da li si ti u pitanju
                        let bgStyle = isMe ? 'background: rgba(255, 87, 34, 0.15); border: 1px solid #FF5722; box-shadow: 0 0 10px rgba(255,87,34,0.2);' : 'background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.05);';
                        
                        let photo = (player.photoUrl && player.photoUrl.length > 5) 
                            ? player.photoUrl 
                            : `https://ui-avatars.com/api/?name=${encodeURIComponent(player.name)}&background=333&color=E0C995`;

                        // Boje imena (Prvo mesto i TI dobijate vatrenu boju)
                        let nameColor = (idx === 0 || isMe) ? '#FF5722' : 'var(--text-main)';

                        // --- DINAMIČKO SMANJIVANJE FONTA PREMA DUŽINI IMENA ---
                        let displayName = player.name || 'Gost';
                        let nameStyle = "font-size: 0.9rem; line-height: 1.2;"; // Default
                        if (displayName.length > 20) {
                            nameStyle = "font-size: 0.65rem; line-height: 1.1;";
                        } else if (displayName.length > 14) {
                            nameStyle = "font-size: 0.75rem; line-height: 1.1;";
                        }

                        // --- LOGIKA ZA MAX I TRENUTNI NIZ ---
                        let currentStreakColor = (player.currentWinStreak || 0) > 0 ? 'var(--success, #4CAF50)' : '#888';
                        let currentStreakText = (player.currentWinStreak || 0) > 0 ? `${tCurrent}: ${player.currentWinStreak}` : tBroken;

                        const card = `
                        <div style="display: flex; align-items: center; padding: 12px 15px; border-radius: 10px; ${bgStyle} transition: transform 0.2s;">
                            <div style="font-size: 1.3rem; font-weight: bold; width: 35px; text-align: center; color: var(--text-muted); flex-shrink: 0; text-shadow: ${idx===0 ? '0 0 10px rgba(255,87,34,0.5)' : 'none'};">${rankTrophy}</div>
                            
                            <img src="${photo}" style="width: 45px; height: 45px; border-radius: 50%; margin: 0 12px; border: 2px solid ${idx===0 || isMe ? '#FF5722' : 'rgba(255,255,255,0.2)'}; object-fit: cover; flex-shrink: 0;">
                            
                            <div style="flex: 1; min-width: 0; overflow: hidden; font-weight: bold; color: ${nameColor}; ${nameStyle} word-break: break-word; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;">${displayName}</div>
                            
                            <div style="text-align: right; line-height: 1.2; min-width: 80px; display: flex; flex-direction: column; align-items: flex-end;">
                                <div style="color: #FF5722; font-weight: 900; font-size: 1.25rem; text-shadow: 0 0 5px rgba(255, 87, 34, 0.4);">
                                    🔥 ${player.maxWinStreak || 0}
                                </div>
                                <div style="font-size: 0.65rem; font-weight: bold; margin-top: 4px; background: rgba(0,0,0,0.4); padding: 2px 6px; border-radius: 4px;">
                                    <span style="color: ${currentStreakColor};">${currentStreakText}</span>
                                </div>
                            </div>
                        </div>`;
                        
                        html += card;
                    });

                    body.innerHTML = html;
                });
            }
        }, 1500); 
    }
}

// Globalna instanca
window.vatreniNiz = new VatreniNizManager();