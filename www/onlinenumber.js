// onlinenumber.js - Prikaz liste trenutno aktivnih igrača, statistike i statusa (SA PREVODIMA)

class OnlinePlayersManager {
    constructor(app) {
        this.app = app;
        this.createModal();
        this.setupSocketListeners();
    }

    createModal() {
        this.overlay = document.createElement('div');
        this.overlay.className = 'modal-overlay';
        this.overlay.id = 'online-players-overlay';
        this.overlay.style.display = 'none';
        this.overlay.style.zIndex = '10005';

        this.overlay.innerHTML = `
            <div class="modal-box" style="width: 90%; max-width: 450px; height: 65vh; max-height: 550px; padding: 0 !important; overflow: hidden; display: flex; flex-direction: column;">
                <div class="chat-header" style="background: rgba(0,0,0,0.2); padding: 15px 20px; border-bottom: 1px solid var(--glass-border); display: flex; justify-content: space-between; align-items: center;">
                    <span id="onl-title" style="color: var(--success); font-weight: 800; font-size: 1.1rem; letter-spacing: 1px;">${gt('online_players_title')}</span>
                    <span style="cursor: pointer; color: var(--danger); font-size: 1.2rem; font-weight: bold; padding: 0 5px;" onclick="window.onlinePlayersManager.closeModal()">✖</span>
                </div>
                <div id="online-players-list" style="flex: 1; overflow-y: auto; padding: 15px; display: flex; flex-direction: column; gap: 10px;">
                    <div style="text-align:center; color: var(--text-muted); font-size: 0.9rem;">${gt('online_searching')}</div>
                </div>
            </div>
        `;
        document.body.appendChild(this.overlay);
    }

    setupSocketListeners() {
        if (this.app && this.app.socket) {
            this.app.socket.on('online_players_list', (players) => {
                this.renderList(players);
            });
        } else {
            setTimeout(() => this.setupSocketListeners(), 1000);
        }
    }

    openModal() {
        if(this.app.soundMgr) this.app.soundMgr.click();
        
        // Osvežavamo naslov u slučaju da je promenjen jezik u međuvremenu
        const titleEl = document.getElementById('onl-title');
        if(titleEl) titleEl.innerText = gt('online_players_title');

        this.overlay.style.display = 'flex';
        this.requestPlayers();
    }

    closeModal() {
        if(this.app.soundMgr) this.app.soundMgr.click();
        this.overlay.style.display = 'none';
    }

    requestPlayers() {
        const listContainer = document.getElementById('online-players-list');
        listContainer.innerHTML = `<div style="text-align:center; color: var(--text-muted); font-size: 0.9rem;">${gt('online_loading')}</div>`;

        if (this.app && this.app.socket && this.app.socket.connected) {
            this.app.socket.emit('get_online_players'); 
        } else {
            listContainer.innerHTML = `<div style="text-align:center; color: var(--danger); font-size: 0.9rem;">${gt('online_no_conn')}</div>`;
        }
    }

    renderList(players) {
        const listContainer = document.getElementById('online-players-list');
        listContainer.innerHTML = '';

        if (!players || players.length === 0) {
            listContainer.innerHTML = `<div style="text-align:center; color: var(--text-muted); font-size: 0.9rem;">${gt('online_no_players')}</div>`;
            return;
        }

        players.forEach(player => {
            const isMe = this.app.socket && player.id === this.app.socket.id;
            const item = document.createElement('div');
            item.style.cssText = 'display: flex; justify-content: space-between; align-items: center; background: rgba(255,255,255,0.05); padding: 12px 15px; border-radius: 8px; border: 1px solid var(--glass-border); margin-bottom: 5px;';

            // --- LEVI DEO (Ime i Statistika) ---
            const infoDiv = document.createElement('div');
            infoDiv.style.cssText = 'display: flex; flex-direction: column; gap: 5px;';

            const nameSpan = document.createElement('span');
            nameSpan.style.cssText = 'color: var(--text-main); font-weight: 700; font-size: 1rem;';
            
            let displayName = player.name || gt('player_guest');
            if (isMe) {
                nameSpan.innerText = `${displayName} ${gt('online_you')}`;
                nameSpan.style.color = 'var(--gold-main)';
            } else {
                nameSpan.innerText = displayName;
            }

            // Statistika (W/L je ostavljeno na engleskom kao univerzalno: Wins/Losses, ali se može prevesti ako želiš)
            const statsSpan = document.createElement('span');
            statsSpan.style.cssText = 'font-size: 0.75rem; color: var(--text-muted); font-weight: 600; letter-spacing: 0.5px; background: rgba(0,0,0,0.3); padding: 3px 6px; border-radius: 4px; display: inline-block; width: fit-content;';
            
            const w = player.stats ? player.stats.wins : 0;
            const l = player.stats ? player.stats.losses : 0;
            let winRate = 0;
            if (w + l > 0) {
                winRate = Math.round((w / (w + l)) * 100);
            }
            
            statsSpan.innerHTML = `🏆 <span style="color:var(--success)">W:${w}</span> <span style="opacity:0.5">|</span> <span style="color:var(--danger)">L:${l}</span> <span style="font-size:0.65rem; opacity:0.8">(${winRate}%)</span>`;

            infoDiv.appendChild(nameSpan);
            infoDiv.appendChild(statsSpan);
            item.appendChild(infoDiv);

            // --- DESNI DEO (Dugme ili Status) ---
            const actionDiv = document.createElement('div');
            
            if (player.status === 'playing') {
                // Preveden status "IGRA U TOKU" / "IN GAME"
                actionDiv.innerHTML = `<span style="color: #FF9800; font-size: 0.7rem; font-weight: 800; background: rgba(255, 152, 0, 0.1); padding: 6px 10px; border-radius: 6px; border: 1px solid rgba(255, 152, 0, 0.3); letter-spacing: 0.5px; box-shadow: 0 0 8px rgba(255, 152, 0, 0.2);">${gt('online_playing')}</span>`;
            } else if (!isMe) {
                // Prevedeno dugme "IZAZOVI" / "CHALLENGE"
                const challengeBtn = document.createElement('button');
                challengeBtn.innerText = gt('online_challenge_btn');
                challengeBtn.style.cssText = 'background: linear-gradient(135deg, #FF9800, #F57C00); border: none; padding: 8px 14px; border-radius: 6px; color: #fff; font-weight: 800; cursor: pointer; font-size: 0.8rem; box-shadow: 0 4px 10px rgba(255, 152, 0, 0.4); text-shadow: 0 1px 2px rgba(0,0,0,0.3); transition: transform 0.1s;';
                
                challengeBtn.onmousedown = () => challengeBtn.style.transform = 'scale(0.95)';
                challengeBtn.onmouseup = () => challengeBtn.style.transform = 'scale(1)';
                
                challengeBtn.onclick = () => {
                    this.closeModal();
                    this.app.challengePlayer(player.id, displayName);
                };
                actionDiv.appendChild(challengeBtn);
            }

            item.appendChild(actionDiv);
            listContainer.appendChild(item);
        });
    }
}

// Inicijalizacija sistema kada se stranica učita
window.addEventListener('load', () => {
    setTimeout(() => {
        if (window.app) {
            window.onlinePlayersManager = new OnlinePlayersManager(window.app);
            
            const countEl = document.getElementById('live-online-count');
            if (countEl && countEl.parentElement) {
                const onlineCard = countEl.parentElement;
                onlineCard.style.cursor = 'pointer';
                onlineCard.style.transition = 'transform 0.1s';
                
                onlineCard.onmousedown = () => onlineCard.style.transform = 'scale(0.95)';
                onlineCard.onmouseup = () => onlineCard.style.transform = 'scale(1)';
                onlineCard.onclick = () => window.onlinePlayersManager.openModal();
            }
        }
    }, 1500); 
});