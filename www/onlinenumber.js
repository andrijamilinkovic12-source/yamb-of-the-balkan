// onlinenumber.js - Prikaz liste trenutno aktivnih igrača sa slikama, PI i prijateljima

class OnlinePlayersManager {
    constructor(app) {
        this.app = app;
        this.createModal();
        this.lastPlayersData = [];
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
                    <span id="onl-title" style="color: var(--success); font-weight: 800; font-size: 1.1rem; letter-spacing: 1px;">${typeof t !== 'undefined' ? t('online_players_title') : 'ONLINE IGRAČI'}</span>
                    <span style="cursor: pointer; color: var(--danger); font-size: 1.2rem; font-weight: bold; padding: 0 5px;" onclick="window.onlinePlayersManager.closeModal()">✖</span>
                </div>
                <div id="online-players-list" style="flex: 1; overflow-y: auto; padding: 10px; display: flex; flex-direction: column; gap: 8px;">
                    <div class="loader" style="width: 30px; height: 30px; margin: 20px auto;"></div>
                </div>
            </div>
        `;
        document.body.appendChild(this.overlay);
    }

    setupSocketListeners() {
        if (!this.app.socket) return;
        
        this.app.socket.on('online_players_list', (players) => {
            this.lastPlayersData = players;
            this.renderPlayers(players);
        });

        // KLJUČNI FIX: Hvata novi format objekta { friends: [], requests: [] }
        this.app.socket.on('friends_list_data', (data) => {
            let friendsArray = Array.isArray(data) ? data : (data.friends || []);
            this.app.friendsListUids = friendsArray.map(f => f.uid); 
            
            if (this.overlay.style.display === 'flex' && this.lastPlayersData.length > 0) {
                this.renderPlayers(this.lastPlayersData);
            }
        });
    }

    openModal() {
        if (!this.app.requireLogin()) return;
        this.app.initSocketConnection();

        if (this.app.socket && this.app.socket.connected) {
            this.app.socket.emit('get_friends_list');
            this.app.socket.emit('get_online_players');
        }

        this.overlay.style.display = 'flex';
        setTimeout(() => this.overlay.classList.add('active'), 10);
        this.startAutoRefresh();
    }

    closeModal() {
        this.overlay.classList.remove('active');
        setTimeout(() => { this.overlay.style.display = 'none'; }, 300);
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
            this.refreshInterval = null;
        }
    }

    startAutoRefresh() {
        if (this.refreshInterval) clearInterval(this.refreshInterval);
        this.refreshInterval = setInterval(() => {
            if (this.overlay.style.display === 'flex' && this.app.socket && this.app.socket.connected) {
                this.app.socket.emit('get_friends_list');
                this.app.socket.emit('get_online_players');
            } else {
                clearInterval(this.refreshInterval);
            }
        }, 5000);
    }

    renderPlayers(players) {
        const listContainer = document.getElementById('online-players-list');
        if (!listContainer) return;

        if (players.length === 0) {
            listContainer.innerHTML = `<div style="text-align: center; color: var(--text-muted); font-size: 0.9rem; margin-top: 20px;">Nema drugih igrača online.</div>`;
            return;
        }

        const filteredPlayers = players.filter(p => p.playerId !== this.app.playerId);
        
        if (filteredPlayers.length === 0) {
            listContainer.innerHTML = `<div style="text-align: center; color: var(--text-muted); font-size: 0.9rem; margin-top: 20px;">Samo ste vi online.</div>`;
            return;
        }

        listContainer.innerHTML = '';

        filteredPlayers.forEach(player => {
            const item = document.createElement('div');
            item.style.cssText = 'display: flex; align-items: center; justify-content: space-between; background: rgba(0,0,0,0.3); padding: 10px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.05);';

            const leftSide = document.createElement('div');
            leftSide.style.cssText = 'display: flex; align-items: center; gap: 10px; flex: 1; overflow: hidden;';

            const displayName = player.name && player.name.trim() !== '' ? player.name : 'Gost';
            const avatarUrl = player.photoUrl && player.photoUrl.length > 5 ? player.photoUrl : `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=333&color=E0C995`;

            let statusColor = player.status === 'playing' ? 'var(--danger)' : 'var(--success)';
            let statusShadow = player.status === 'playing' ? 'rgba(244,67,54,0.5)' : 'rgba(76,175,80,0.5)';

            leftSide.innerHTML = `
                <div style="position: relative;">
                    <img src="${avatarUrl}" style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover; border: 2px solid ${statusColor}; box-shadow: 0 0 8px ${statusShadow};">
                    <div style="position: absolute; bottom: 0; right: 0; width: 12px; height: 12px; background: ${statusColor}; border-radius: 50%; border: 2px solid #222;"></div>
                </div>
                <div style="display: flex; flex-direction: column; overflow: hidden;">
                    <span style="font-weight: 800; color: var(--text-main); font-size: 0.9rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${displayName}</span>
                    <span style="font-size: 0.65rem; color: var(--gold-main); font-weight: bold;">Moć ⚡ ${this.app.calculatePowerIndex(player.stats, false)}</span>
                </div>
            `;

            const actionDiv = document.createElement('div');
            actionDiv.style.cssText = 'display: flex; gap: 8px; align-items: center;';

            const isFriend = this.app.friendsListUids && this.app.friendsListUids.includes(player.playerId);

            if (player.status === 'playing') {
                actionDiv.innerHTML = `<span style="font-size: 0.7rem; color: var(--danger); font-weight: bold; background: rgba(244,67,54,0.1); padding: 4px 8px; border-radius: 8px; border: 1px solid var(--danger);">U IGRI</span>`;
            } else {
                const duelBtn = document.createElement('button');
                duelBtn.innerHTML = '⚔️';
                duelBtn.title = typeof t !== 'undefined' ? t('btn_duel') : 'Izazovi na duel';
                duelBtn.style.cssText = 'background: rgba(255, 215, 0, 0.15); border: 1px solid var(--gold-main); border-radius: 8px; width: 34px; height: 34px; display: flex; align-items: center; justify-content: center; cursor: pointer; box-shadow: 0 4px 10px rgba(255, 215, 0, 0.2); transition: transform 0.1s;';
                duelBtn.onmousedown = () => duelBtn.style.transform = 'scale(0.9)';
                duelBtn.onmouseup = () => duelBtn.style.transform = 'scale(1)';
                duelBtn.onclick = () => { this.closeModal(); this.app.challengePlayer(player.id, displayName); };
                
                actionDiv.appendChild(duelBtn);

                if (!isFriend && player.playerId) {
                    const addBtn = document.createElement('button');
                    addBtn.innerHTML = '➕';
                    addBtn.title = typeof t !== 'undefined' ? t('btn_add_friend') : 'Dodaj prijatelja';
                    addBtn.style.cssText = 'background: rgba(76, 175, 80, 0.2); border: 1px solid var(--success); border-radius: 8px; width: 34px; height: 34px; display: flex; align-items: center; justify-content: center; cursor: pointer; box-shadow: 0 4px 10px rgba(76, 175, 80, 0.4); transition: transform 0.1s;';
                    addBtn.onmousedown = () => addBtn.style.transform = 'scale(0.9)';
                    addBtn.onmouseup = () => addBtn.style.transform = 'scale(1)';
                    addBtn.onclick = () => { this.closeModal(); this.app.sendFriendRequest(player.id, displayName, player.playerId); };

                    actionDiv.appendChild(addBtn);
                }
            }

            item.appendChild(leftSide);
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
                
                const clone = onlineCard.cloneNode(true);
                onlineCard.parentNode.replaceChild(clone, onlineCard);
                clone.addEventListener('click', () => window.onlinePlayersManager.openModal());
            }
        }
    }, 1000);
});