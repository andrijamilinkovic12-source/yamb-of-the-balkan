// onlinenumber.js - Prikaz liste trenutno aktivnih igrača sa slikama, PI i prijateljima

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
                    <span id="onl-title" style="color: var(--success); font-weight: 800; font-size: 1.1rem; letter-spacing: 1px;">${gt('online_players_title') || 'ONLINE IGRAČI'}</span>
                    <span style="cursor: pointer; color: var(--danger); font-size: 1.2rem; font-weight: bold; padding: 0 5px;" onclick="window.onlinePlayersManager.closeModal()">✖</span>
                </div>
                <div id="online-players-list" style="flex: 1; overflow-y: auto; padding: 15px; display: flex; flex-direction: column; gap: 10px;">
                    <div style="text-align:center; color: var(--text-muted); font-size: 0.9rem;">${gt('online_loading') || 'Učitavanje... ⏳'}</div>
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
        const titleEl = document.getElementById('onl-title');
        if(titleEl) titleEl.innerText = gt('online_players_title') || 'ONLINE IGRAČI';
        this.overlay.style.display = 'flex';
        this.requestPlayers();
    }

    closeModal() {
        if(this.app.soundMgr) this.app.soundMgr.click();
        this.overlay.style.display = 'none';
    }

    requestPlayers() {
        const listContainer = document.getElementById('online-players-list');
        listContainer.innerHTML = `<div style="text-align:center; color: var(--text-muted); font-size: 0.9rem;">${gt('online_loading') || 'Učitavanje... ⏳'}</div>`;

        if (this.app && this.app.socket && this.app.socket.connected) {
            this.app.socket.emit('get_online_players'); 
        } else {
            listContainer.innerHTML = `<div style="text-align:center; color: var(--danger); font-size: 0.9rem;">${gt('online_no_conn') || 'Nema konekcije sa serverom.'}</div>`;
        }
    }

    renderList(players) {
        const listContainer = document.getElementById('online-players-list');
        listContainer.innerHTML = '';

        if (!players || players.length === 0) {
            listContainer.innerHTML = `<div style="text-align:center; color: var(--text-muted); font-size: 0.9rem;">${gt('online_no_players') || 'Trenutno nema drugih igrača.'}</div>`;
            return;
        }

        players.forEach(player => {
            const isMe = this.app.socket && player.id === this.app.socket.id;
            const item = document.createElement('div');
            item.style.cssText = 'display: flex; justify-content: space-between; align-items: center; background: rgba(255,255,255,0.05); padding: 10px 15px; border-radius: 12px; border: 1px solid var(--glass-border); margin-bottom: 5px; box-shadow: 0 4px 6px rgba(0,0,0,0.2);';

            // --- LEVI DEO (Slika, Ime i Statistika) ---
            const infoDiv = document.createElement('div');
            infoDiv.style.cssText = 'display: flex; align-items: center; gap: 12px;';

            let displayName = player.name || gt('player_guest') || 'Gost';
            
            // SLIKA IGRAČA
            const avatarUrl = player.photoUrl && player.photoUrl.length > 5 ? player.photoUrl : `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=333&color=E0C995`;
            const imgEl = document.createElement('img');
            imgEl.src = avatarUrl;
            imgEl.style.cssText = 'width: 45px; height: 45px; border-radius: 50%; border: 2px solid var(--gold-main); object-fit: cover;';
            
            const textDiv = document.createElement('div');
            textDiv.style.cssText = 'display: flex; flex-direction: column; gap: 4px;';

            const nameSpan = document.createElement('span');
            nameSpan.style.cssText = 'color: var(--text-main); font-weight: 800; font-size: 0.95rem;';
            if (isMe) {
                nameSpan.innerText = `${displayName} ${gt('online_you') || '(Ti)'}`;
                nameSpan.style.color = 'var(--gold-main)';
                imgEl.style.borderColor = 'var(--success)';
            } else {
                nameSpan.innerText = displayName;
            }

            // STATISTIKA (W/L i Indeks moći)
            const statsSpan = document.createElement('span');
            statsSpan.style.cssText = 'font-size: 0.7rem; color: var(--text-muted); font-weight: 700; background: rgba(0,0,0,0.3); padding: 3px 6px; border-radius: 6px; display: inline-block; border: 1px solid rgba(255,255,255,0.05);';
            
            const w = player.stats ? player.stats.wins : 0;
            const l = player.stats ? player.stats.losses : 0;
            let pi = 0;
            if (this.app.calculatePowerIndex && player.stats) {
                pi = this.app.calculatePowerIndex(player.stats, false);
            }
            
            statsSpan.innerHTML = `W:<span style="color:var(--success)">${w}</span> <span style="opacity:0.5">|</span> L:<span style="color:var(--danger)">${l}</span> <span style="opacity:0.5">|</span> <span style="color:#FFD700;">⚡ ${pi}</span>`;

            textDiv.appendChild(nameSpan);
            textDiv.appendChild(statsSpan);
            
            infoDiv.appendChild(imgEl);
            infoDiv.appendChild(textDiv);
            item.appendChild(infoDiv);

            // --- DESNI DEO (Dugmad) ---
            const actionDiv = document.createElement('div');
            actionDiv.style.cssText = 'display: flex; gap: 8px;';
            
            if (player.status === 'playing') {
                actionDiv.innerHTML = `<span style="color: #FF9800; font-size: 0.7rem; font-weight: 800; background: rgba(255, 152, 0, 0.1); padding: 6px 10px; border-radius: 6px; border: 1px solid rgba(255, 152, 0, 0.3);">${gt('online_playing_short') || 'IGRA'}</span>`;
            } else if (!isMe) {
                // Dugme Izazovi (Mačevi) - UVEK VIDLJIVO
                const duelBtn = document.createElement('button');
                duelBtn.innerHTML = '⚔️';
                duelBtn.title = gt('online_challenge_btn') || "Izazovi na duel";
                duelBtn.style.cssText = 'background: linear-gradient(135deg, #E53935, #C62828); border: none; width: 35px; height: 35px; border-radius: 8px; font-size: 1rem; display: flex; align-items: center; justify-content: center; cursor: pointer; box-shadow: 0 4px 10px rgba(229, 57, 53, 0.4); transition: transform 0.1s;';
                duelBtn.onmousedown = () => duelBtn.style.transform = 'scale(0.9)';
                duelBtn.onmouseup = () => duelBtn.style.transform = 'scale(1)';
                duelBtn.onclick = () => { this.closeModal(); this.app.challengePlayer(player.id, displayName); };
                
                actionDiv.appendChild(duelBtn);

                // PROVERA DA LI JE IGRAČ VEĆ TVOJ PRIJATELJ
                let isFriend = false;
                if (window.app && window.app.friendsListUids && window.app.friendsListUids.includes(player.playerId)) {
                    isFriend = true;
                }

                // Prikazujemo + dugme SAMO ako ti NIJE prijatelj
                if (!isFriend) {
                    const addBtn = document.createElement('button');
                    addBtn.innerHTML = '➕';
                    addBtn.title = (gt('btn_add_friend') || "Dodaj prijatelja").replace('<br>', ' ');
                    addBtn.style.cssText = 'background: linear-gradient(135deg, #4CAF50, #2E7D32); border: none; width: 35px; height: 35px; border-radius: 8px; font-size: 1rem; color: white; display: flex; align-items: center; justify-content: center; cursor: pointer; box-shadow: 0 4px 10px rgba(76, 175, 80, 0.4); transition: transform 0.1s;';
                    addBtn.onmousedown = () => addBtn.style.transform = 'scale(0.9)';
                    addBtn.onmouseup = () => addBtn.style.transform = 'scale(1)';
                    // Prosleđujemo i player.playerId kao treći argument
                    addBtn.onclick = () => { this.closeModal(); this.app.sendFriendRequest(player.id, displayName, player.playerId); };

                    actionDiv.appendChild(addBtn);
                }
            }

            item.appendChild(actionDiv);
            listContainer.appendChild(item);
        });
    }
}

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