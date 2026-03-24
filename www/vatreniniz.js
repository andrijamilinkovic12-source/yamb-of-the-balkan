// vatreniniz.js - TOP LISTA VATRENOG NIZA

class VatreniNizManager {
    constructor() {
        this.createModal();
        this.setupSocket();
    }

    // 1. Kreiranje HTML strukture modala koja se ubacuje u body
    createModal() {
        const modalHtml = `
        <div id="streak-overlay" class="modal-overlay" style="display: none; z-index: 100000;">
            <div class="modal-box" style="width: 90%; max-width: 400px; max-height: 80vh; display: flex; flex-direction: column; padding: 0 !important; overflow: hidden; background: var(--glass-bg); border: 1px solid var(--glass-border);">
                
                <div class="chat-header" style="background: rgba(0,0,0,0.2); padding: 15px; border-bottom: 1px solid var(--glass-border); display: flex; justify-content: space-between; align-items: center;">
                    <span style="color: #FF5722; font-weight: 800;">🔥 TOP VATRENI NIZ</span>
                    <span style="cursor: pointer; color: var(--danger); font-size: 1.2rem; font-weight: bold;" onclick="document.getElementById('streak-overlay').style.display='none'">✖</span>
                </div>

                <div id="streak-list-body" style="flex: 1; overflow-y: auto; padding: 15px; display: flex; flex-direction: column; gap: 10px;">
                    <div style="text-align: center; font-size: 0.8rem; color: var(--text-muted);">Učitavam listu... ⏳</div>
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
        document.getElementById('streak-list-body').innerHTML = '<div class="loader" style="width: 25px; height: 25px; margin: 20px auto;"></div><div style="text-align: center; font-size: 0.8rem; color: var(--text-muted); margin-top: 10px;">Tražim najvatrenije igrače...</div>';

        if (window.app && window.app.socket && window.app.socket.connected) {
            window.app.socket.emit('get_streak_leaderboard');
        } else {
            document.getElementById('streak-list-body').innerHTML = '<div style="text-align: center; color: var(--danger); font-weight: bold;">Niste povezani na server.</div>';
        }
    }

    // 4. Crtanje liste
    renderList(data) {
        const body = document.getElementById('streak-list-body');
        body.innerHTML = '';

        if (!data || data.length === 0) {
            body.innerHTML = '<div style="text-align: center; font-size: 0.8rem; color: var(--text-muted);">Još uvek nema podataka. Odigrajte partiju!</div>';
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
                : 'background: rgba(0,0,0,0.2); border: 1px solid transparent;';

            const photo = (player.photoUrl && player.photoUrl.length > 5) 
                ? player.photoUrl 
                : `https://ui-avatars.com/api/?name=${encodeURIComponent(player.name)}&background=333&color=E0C995`;

            const card = `
            <div style="display: flex; align-items: center; padding: 10px; border-radius: 8px; ${isMe}">
                <div style="font-size: 1.2rem; font-weight: bold; width: 35px; text-align: center; color: var(--text-muted);">${rankTrophy}</div>
                <img src="${photo}" style="width: 35px; height: 35px; border-radius: 50%; margin: 0 10px; border: 1px solid #FF5722; object-fit: cover;">
                <div style="flex: 1; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; font-weight: bold; color: var(--text-main); font-size: 0.95rem;">${player.name}</div>
                <div style="font-size: 1.3rem; font-weight: 900; color: #FF5722; text-shadow: 0 0 8px rgba(255, 87, 34, 0.6);">🔥 ${player.streak || 0}</div>
            </div>`;
            
            body.insertAdjacentHTML('beforeend', card);
        });
    }
}

// Inicijalizacija čim se učita DOM
document.addEventListener('DOMContentLoaded', () => {
    window.vatreniNiz = new VatreniNizManager();
});