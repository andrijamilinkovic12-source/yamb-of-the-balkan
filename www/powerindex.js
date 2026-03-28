// powerindex.js - Menadžer za prikaz Top Liste Indeksa Moći (Glassmorphism UI)

class PowerIndexLeaderboard {
    constructor() {
        this.data = [];
        this.setupSocket();
    }
    
    setupSocket() {
        // Koristimo setInterval za pouzdanije detektovanje socketa (izbegavamo race condition na sporijim mrežama)
        const checkSocket = setInterval(() => {
            if (window.app && window.app.socket) {
                window.app.socket.on('power_index_data', (data) => {
                    this.data = data;
                    this.renderList();
                });
                clearInterval(checkSocket); // Prekidamo proveru čim uspešno nakačimo event
            }
        }, 500); // Proverava svakih pola sekunde
    }

    openModal() {
        if(window.app && window.app.soundMgr) window.app.soundMgr.click();
        
        let existing = document.getElementById('pi-modal-overlay');
        if (existing) existing.remove();

        // Helper za prevod
        const gt = (key, fallback) => (typeof t === 'function' && t(key) !== key) ? t(key) : fallback;

        // Glassmorphism Modal Struktura
        const modalHtml = `
        <div id="pi-modal-overlay" class="modal-overlay" style="z-index: 999999; display: flex;">
            <div class="modal-box" style="width: 95%; max-width: 450px; height: 80vh; max-height: 700px; display: flex; flex-direction: column; padding: 0; background: var(--glass-panel); border: var(--glass-border); box-shadow: var(--glass-shadow); backdrop-filter: blur(12px); border-radius: 16px; overflow: hidden;">
                
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 15px 20px; border-bottom: 1px solid rgba(255,215,0,0.2); background: rgba(0,0,0,0.2); flex-shrink: 0;">
                    <h2 style="color: var(--gold-main); font-size: 1.1rem; margin: 0; text-transform: uppercase; letter-spacing: 1px; display: flex; align-items: center; gap: 8px;">
                        <span style="font-size: 1.5rem;">⚡</span> ${gt('pi_title', 'TOP IGRAČI')}
                    </h2>
                    <span style="color: var(--danger); font-size: 1.5rem; cursor: pointer; font-weight: bold; line-height: 1;" onclick="document.getElementById('pi-modal-overlay').remove()">✖</span>
                </div>

                <div style="flex: 1; overflow-y: auto; padding: 15px; -webkit-overflow-scrolling: touch; display: flex; flex-direction: column; gap: 10px;" id="pi-list-container">
                    <div style="text-align: center; color: var(--text-muted); font-size: 0.9rem; padding: 20px;">
                        ${gt('league_loading', 'Učitavanje servera... ⏳')}
                    </div>
                </div>
                
            </div>
        </div>`;

        document.body.insertAdjacentHTML('beforeend', modalHtml);

        // Zatraži podatke od servera
        if (window.app && window.app.socket && window.app.socket.connected) {
            window.app.socket.emit('get_power_index_leaderboard');
        } else {
            document.getElementById('pi-list-container').innerHTML = `
                <div style="text-align:center; color: var(--danger); padding: 20px; font-weight: bold;">
                    ${gt('pi_no_conn', 'Nema konekcije sa serverom. Zakačite se na mrežu.')}
                </div>`;
        }
    }

    renderList() {
        const container = document.getElementById('pi-list-container');
        if (!container) return;
        
        // Helper za prevod
        const gt = (key, fallback) => (typeof t === 'function' && t(key) !== key) ? t(key) : fallback;

        if (!this.data || this.data.length === 0) {
            container.innerHTML = `<div style="text-align:center; color: var(--text-muted); padding: 20px;">${gt('pi_no_data', 'Još uvek nema dovoljno podataka na serveru.')}</div>`;
            return;
        }

        const myName = localStorage.getItem('yamb_player_name') || gt('player_guest', 'Gost');
        let html = '';

        this.data.forEach((p, i) => {
            let isMe = p.playerName === myName;
            
            // NOVO: Prvo mesto Grom, drugo Srebro, treće Bronza, ostali brojevi
            let rankTrophy = i === 0 ? '⚡' : i === 1 ? '🥈' : i === 2 ? '🥉' : `<span style="color: var(--text-muted);">${i + 1}.</span>`;
            
            // Profilna slika sa fallback-om
            let photo = p.photoUrl && p.photoUrl.length > 5 ? p.photoUrl : `https://ui-avatars.com/api/?name=${encodeURIComponent(p.playerName)}&background=333&color=E0C995`;
            
            // Glassmorphism Card UI logika boja
            let bg = 'background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08);'; // Podrazumevani stil

            if (isMe) {
                // Trenutni igrač (TI) dobija jak zlatni okvir da bi se jasno istakao
                bg = 'background: linear-gradient(90deg, rgba(224, 201, 149, 0.15) 0%, rgba(0,0,0,0.2) 100%); border: 1px solid var(--gold-main);';
            } else if (i === 0) {
                // Prvo mesto (kada to nisi ti) dobija suptilniji sjaj i poluprovidan okvir
                bg = 'background: linear-gradient(90deg, rgba(255,215,0,0.1) 0%, rgba(0,0,0,0.2) 100%); border: 1px solid rgba(255,215,0,0.3);';
            }

            // Boja imena: tebi tvoja zlatna, prvom mestu malo svetlija zlatna, ostalima standardna
            let nameColor = isMe ? 'var(--gold-main)' : (i === 0 ? '#FFD700' : 'var(--text-main)');

            // Senka (glow)
            let glow = isMe ? 'box-shadow: 0 0 10px rgba(224, 201, 149, 0.3);' : (i === 0 ? 'box-shadow: 0 4px 15px rgba(255,215,0,0.15);' : 'box-shadow: 0 2px 8px rgba(0,0,0,0.2);');

            // --- DINAMIČKO SMANJIVANJE FONTA PREMA DUŽINI IMENA ---
            let displayName = p.playerName;
            let nameStyle = "font-size: 0.85rem; line-height: 1.2;"; // Default za kraća imena
            if (displayName.length > 20) {
                nameStyle = "font-size: 0.65rem; line-height: 1.1;"; // Ekstremno dugačka imena
            } else if (displayName.length > 14) {
                nameStyle = "font-size: 0.75rem; line-height: 1.1;"; // Srednje dugačka imena
            }

            html += `
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px; border-radius: 12px; ${bg} ${glow} transition: transform 0.2s;">
                
                <div style="display: flex; align-items: center; gap: 8px; overflow: hidden; flex: 1; padding-right: 5px;">
                    <div style="font-size: 1.1rem; min-width: 22px; text-align: center; font-weight: 900; text-shadow: 0 0 5px rgba(255,215,0,0.5);">${rankTrophy}</div>
                    
                    <img src="${photo}" style="width: 35px; height: 35px; border-radius: 50%; object-fit: cover; border: 2px solid ${i === 0 || isMe ? 'var(--gold-main)' : 'rgba(255,255,255,0.2)'}; flex-shrink: 0;">
                    
                    <span style="color: ${nameColor}; font-weight: 700; ${nameStyle} white-space: normal; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; word-break: break-word;">${displayName}</span>
                </div>
                
                <div style="display: flex; align-items: center; gap: 4px; background: rgba(0,0,0,0.4); padding: 5px 10px; border-radius: 15px; border: 1px solid rgba(255,140,0,0.3); flex-shrink: 0;">
                    <span style="color: #FFD700; font-weight: 900; font-size: 1rem; text-shadow: 0 0 5px rgba(255,140,0,0.5);">${p.powerIndex || 0}</span>
                    <span style="font-size: 0.8rem;">⚡</span>
                </div>
                
            </div>`;
        });

        container.innerHTML = html;
    }
}

// Inicijalizacija globalne instance
window.powerIndexLeaderboard = new PowerIndexLeaderboard();