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
                    <span style="color: #FF5722; font-weight: 800; font-size: 1.2rem; letter-spacing: 1px;">${title}</span>
                    <span style="cursor: pointer; color: var(--danger); font-size: 1.5rem; font-weight: bold; line-height: 1;" onclick="document.getElementById('streak-overlay').style.display='none'">✖</span>
                </div>

                <div id="streak-list-body" style="flex: 1; overflow-y: auto; -webkit-overflow-scrolling: touch; padding: 15px; display: flex; flex-direction: column; gap: 12px;">
                    <div style="text-align: center; font-size: 0.9rem; color: var(--text-muted); padding-top: 20px;">${loading}</div>
                </div>

            </div>
        </div>`;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
    }

    // 2. Osluškivanje odgovora sa servera
    setupSocket() {
        const checkSocket = setInterval(() => {
            if (window.app && window.app.socket) {
                // Kada server pošalje listu igrača sa najdužim nizom
                window.app.socket.on('streak_leaderboard_data', (data) => {
                    this.renderList(data);
                });
                clearInterval(checkSocket);
            }
        }, 500);
    }

    // 3. Otvaranje prozora i slanje zahteva serveru
    openModal() {
        if (window.app && window.app.soundMgr) window.app.soundMgr.click();
        
        document.getElementById('streak-overlay').style.display = 'flex';
        
        const searching = typeof t !== 'undefined' ? t('streak_searching') : 'Tražim najvatrenije igrače...';
        document.getElementById('streak-list-body').innerHTML = `<div class="loader" style="width: 30px; height: 30px; margin: 30px auto 15px auto;"></div><div style="text-align: center; font-size: 0.9rem; color: var(--text-muted);">${searching}</div>`;

        if (window.app && window.app.socket && window.app.socket.connected) {
            window.app.socket.emit('get_streak_leaderboard');
        } else {
            const noConn = typeof t !== 'undefined' ? t('streak_no_conn') : 'Niste povezani na server.';
            document.getElementById('streak-list-body').innerHTML = `<div style="text-align: center; color: var(--danger); font-weight: bold; padding-top: 20px;">${noConn}</div>`;
        }
    }

    // 4. Crtanje liste
    renderList(data) {
        const body = document.getElementById('streak-list-body');
        body.innerHTML = '';

        if (!data || data.length === 0) {
            const noData = typeof t !== 'undefined' ? t('streak_no_data') : 'Još uvek nema podataka. Odigrajte partiju!';
            body.innerHTML = `<div style="text-align: center; font-size: 0.9rem; color: var(--text-muted); padding-top: 20px;">${noData}</div>`;
            return;
        }

        const myUid = localStorage.getItem('yamb_uid');

        data.forEach((player, index) => {
            let rankTrophy = `${index + 1}.`;
            if (index === 0) rankTrophy = '🥇';
            if (index === 1) rankTrophy = '🥈';
            if (index === 2) rankTrophy = '🥉';

            // Označavamo igrača ako je to njegov nalog
            const isMe = (player.uid === myUid) 
                ? 'border: 1px solid var(--gold-main); background: rgba(224, 201, 149, 0.15); box-shadow: inset 0 0 10px rgba(224, 201, 149, 0.1);' 
                : 'background: rgba(0,0,0,0.2); border: 1px solid rgba(255,255,255,0.05);';

            const photo = (player.photoUrl && player.photoUrl.length > 5) 
                ? player.photoUrl 
                : `https://ui-avatars.com/api/?name=${encodeURIComponent(player.name)}&background=333&color=E0C995`;

            // Smanjen font imena na 0.9rem, dodato prelamanje do 2 reda (line-clamp) i min-width: 0 za flex sigurnost
            const card = `
            <div style="display: flex; align-items: center; padding: 12px 15px; border-radius: 10px; ${isMe}">
                <div style="font-size: 1.3rem; font-weight: bold; width: 35px; text-align: center; color: var(--text-muted); flex-shrink: 0;">${rankTrophy}</div>
                <img src="${photo}" style="width: 45px; height: 45px; border-radius: 50%; margin: 0 12px; border: 2px solid #FF5722; object-fit: cover; flex-shrink: 0;">
                <div style="flex: 1; min-width: 0; overflow: hidden; font-weight: bold; color: var(--text-main); font-size: 0.9rem; word-break: break-word; line-height: 1.2; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;">${player.name}</div>
                <div style="font-size: 1.4rem; font-weight: 900; color: #FF5722; text-shadow: 0 0 10px rgba(255, 87, 34, 0.6); margin-left: 10px; flex-shrink: 0;">🔥 ${player.streak || 0}</div>
            </div>`;
            
            body.insertAdjacentHTML('beforeend', card);
        });
    }
}

// Inicijalizacija čim se učita DOM
document.addEventListener('DOMContentLoaded', () => {
    window.vatreniNiz = new VatreniNizManager();
});