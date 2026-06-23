// vatreniniz.js - TOP LISTA VATRENOG NIZA

class VatreniNizManager {
    constructor() {
        this.pageSize = 50;
        this.data = [];
        this.total = 0;
        this.offset = 0;
        this.hasMore = false;
        this.loading = false;
        this.myRank = null;
        this.myPlayer = null;
        this.boundHandleScroll = this.handleScroll.bind(this);
        this.createModal();
        this.setupSocket();
    }

    gt(key, fallback) {
        return (typeof t === 'function' && t(key) !== key) ? t(key) : fallback;
    }

    resetState() {
        this.data = [];
        this.total = 0;
        this.offset = 0;
        this.hasMore = false;
        this.loading = false;
        this.myRank = null;
        this.myPlayer = null;
    }

    // 1. Kreiranje HTML strukture modala koja se ubacuje u body
    createModal() {
        const modalHtml = `
        <div id="streak-overlay" class="modal-overlay global-chat-overlay streak-modal-overlay" style="display: none; z-index: 100000;">
            <div class="modal-box global-chat-shell streak-modal-shell">

                <div class="chat-header global-chat-header streak-modal-header">
                    <span class="streak-modal-title">${this.gt('streak_top_title', '🔥 TOP VATRENI NIZ')}</span>
                    <button type="button" class="global-chat-close" onclick="document.getElementById('streak-overlay').style.display='none'" aria-label="Zatvori Vatreni niz listu">×</button>
                </div>

                <div id="streak-body" class="chat-body global-chat-body streak-list-container">
                    <div style="text-align: center; font-size: 0.8rem; color: var(--text-muted);">${this.gt('streak_loading', 'Učitavam listu... ⏳')}</div>
                </div>

            </div>
        </div>`;

        document.body.insertAdjacentHTML('beforeend', modalHtml);

        const body = document.getElementById('streak-body');
        if (body) body.addEventListener('scroll', this.boundHandleScroll);
    }

    // 2. Metoda za otvaranje modala (poziva se na klik iz UI-a)
    openModal() {
        // Zvuk klika
        if (window.app && window.app.soundMgr) {
            window.app.soundMgr.click();
        }

        const overlay = document.getElementById('streak-overlay');
        if (overlay) overlay.style.display = 'flex';

        this.resetState();
        this.renderList();
        this.ensureSocketIdentity().finally(() => this.requestPage(0));
    }

    async ensureSocketIdentity() {
        if (!window.app || !localStorage.getItem('yamb_uid')) return;
        if (typeof window.app.authenticateSocketIdentity !== 'function') return;

        try {
            await window.app.authenticateSocketIdentity();
        } catch (err) {
            console.warn('Vatreni niz verifikacija socketa nije uspela:', err);
        }
    }

    requestPage(offset) {
        const body = document.getElementById('streak-body');
        if (!window.app || !window.app.socket || !window.app.socket.connected) {
            if (body) {
                body.innerHTML = `<div style="text-align: center; font-size: 0.8rem; color: var(--danger); margin-top: 20px;">${this.gt('streak_no_conn', 'Niste povezani na server.')}</div>`;
            }
            return;
        }

        if (this.loading) return;

        this.loading = true;
        if (offset === 0) {
            this.data = [];
        }
        this.renderList();

        window.app.socket.emit('get_streak_leaderboard_page', {
            offset,
            limit: this.pageSize,
            uid: localStorage.getItem('yamb_uid') || ''
        });
    }

    loadNextPage() {
        if (this.loading || !this.hasMore) return;
        this.requestPage(this.offset);
    }

    handleScroll(event) {
        const body = event.currentTarget;
        if (!body || this.loading || !this.hasMore) return;

        const distanceFromBottom = body.scrollHeight - body.scrollTop - body.clientHeight;
        if (distanceFromBottom < 140) {
            this.loadNextPage();
        }
    }

    // 3. Osluškivanje odgovora sa servera
    setupSocket() {
        // VatreniNizManager može biti inicijalizovan pre socketa, zato čekamo dok app.socket ne postoji.
        const checkSocket = setInterval(() => {
            if (window.app && window.app.socket) {
                window.app.socket.on('streak_leaderboard_page_data', (payload) => {
                    this.handlePageData(payload);
                });

                // Kompatibilnost sa starim serverom: ako stigne TOP 50 niz, i dalje ga prikaži.
                window.app.socket.on('streak_leaderboard_data', (data) => {
                    if (!Array.isArray(data)) return;
                    this.data = data.map((player, index) => ({
                        ...player,
                        rank: player.rank || index + 1
                    }));
                    this.total = this.data.length;
                    this.offset = this.data.length;
                    this.hasMore = false;
                    this.loading = false;
                    this.renderList();
                });

                clearInterval(checkSocket);
            }
        }, 500);
    }

    handlePageData(payload) {
        const safePayload = payload && typeof payload === 'object' ? payload : {};
        const incoming = Array.isArray(safePayload.players) ? safePayload.players : [];
        const payloadOffset = Math.max(0, parseInt(safePayload.offset, 10) || 0);

        if (payloadOffset === 0) {
            this.data = incoming;
        } else {
            this.data = this.mergePlayers(this.data, incoming);
        }

        this.total = Math.max(0, parseInt(safePayload.total, 10) || this.data.length);
        this.offset = payloadOffset + incoming.length;
        this.hasMore = !!safePayload.hasMore;
        this.myRank = safePayload.myRank || null;
        this.myPlayer = safePayload.myPlayer || null;
        this.loading = false;
        this.renderList();
    }

    mergePlayers(existing, incoming) {
        const seen = new Set();
        const merged = [];

        [...existing, ...incoming].forEach(player => {
            const key = player && (player.uid || `${player.name}:${player.rank}`);
            if (!key || seen.has(key)) return;
            seen.add(key);
            merged.push(player);
        });

        return merged;
    }

    escapeHtml(value) {
        return String(value || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    getAvatarUrl(playerName, photoUrl) {
        const rawPhoto = String(photoUrl || '').trim();
        if (/^https?:\/\//i.test(rawPhoto)) return this.escapeHtml(rawPhoto);
        return `https://ui-avatars.com/api/?name=${encodeURIComponent(playerName || 'Igrac')}&background=333&color=E0C995`;
    }

    renderPlayerRow(player, options = {}) {
        const myUid = localStorage.getItem('yamb_uid') || '';
        const myName = localStorage.getItem('yamb_player_name') || this.gt('player_guest', 'Gost');
        const rank = Math.max(1, parseInt(player.rank, 10) || 1);
        const isMe = !!player.isMe || (!!player.uid && player.uid === myUid) || (!player.uid && player.name === myName);
        const isPinned = !!options.pinned;
        const rawName = player.name || this.gt('player_guest', 'Gost');
        const displayName = this.escapeHtml(rawName);
        const photo = this.getAvatarUrl(rawName, player.photoUrl);
        const maxWinStreak = Math.max(0, parseInt(player.maxWinStreak, 10) || 0);
        const currentWinStreak = Math.max(0, parseInt(player.currentWinStreak, 10) || 0);

        // Rangiranje: Vatra za prvo mesto, medalje za drugo i treće
        const rankTrophy = rank === 1 ? '🔥' : (rank === 2 ? '🥈' : (rank === 3 ? '🥉' : `${rank}.`));

        // Stilovi kartice zavisno od toga da li si ti u pitanju
        let bgStyle = isMe
            ? 'background: rgba(255, 87, 34, 0.15); border: 1px solid #FF5722; box-shadow: 0 0 10px rgba(255,87,34,0.2);'
            : 'background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.05);';

        if (isPinned) {
            bgStyle = 'background: rgba(255, 87, 34, 0.12); border: 1px dashed #FF5722; box-shadow: 0 0 10px rgba(255,87,34,0.16);';
        }

        // Boje imena (Prvo mesto i TI dobijate vatrenu boju)
        const nameColor = (rank === 1 || isMe) ? '#FF5722' : 'var(--text-main)';

        // --- DINAMIČKO SMANJIVANJE FONTA PREMA DUŽINI IMENA ---
        let nameStyle = "font-size: 0.9rem; line-height: 1.2;"; // Default
        if (rawName.length > 20) {
            nameStyle = "font-size: 0.65rem; line-height: 1.1;";
        } else if (rawName.length > 14) {
            nameStyle = "font-size: 0.75rem; line-height: 1.1;";
        }

        // --- LOGIKA ZA MAX I TRENUTNI NIZ ---
        const tCurrent = this.gt('streak_current', 'Trenutni');
        const tBroken = this.gt('streak_broken', 'Prekinut niz');
        const currentStreakColor = currentWinStreak > 0 ? 'var(--success, #4CAF50)' : '#888';
        const currentStreakText = currentWinStreak > 0 ? `${tCurrent}: ${currentWinStreak}` : tBroken;
        const pinnedLabel = isPinned
            ? `<div style="font-size: 0.62rem; color: #FF8A50; font-weight: 900; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 2px;">${this.gt('streak_my_rank', 'MOJE MESTO')}</div>`
            : '';

        return `
            <div style="display: flex; flex-direction: column; gap: 4px; padding: 12px 15px; border-radius: 10px; ${bgStyle} transition: transform 0.2s;">
                ${pinnedLabel}
                <div style="display: flex; align-items: center;">
                    <div style="font-size: 1.3rem; font-weight: bold; width: 35px; text-align: center; color: var(--text-muted); flex-shrink: 0; text-shadow: ${rank === 1 ? '0 0 10px rgba(255,87,34,0.5)' : 'none'};">${rankTrophy}</div>

                    <img src="${photo}" style="width: 45px; height: 45px; border-radius: 50%; margin: 0 12px; border: 2px solid ${rank === 1 || isMe ? '#FF5722' : 'rgba(255,255,255,0.2)'}; object-fit: cover; flex-shrink: 0;">

                    <div style="flex: 1; min-width: 0; overflow: hidden; font-weight: bold; color: ${nameColor}; ${nameStyle} word-break: break-word; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;">${displayName}</div>

                    <div style="text-align: right; line-height: 1.2; min-width: 80px; display: flex; flex-direction: column; align-items: flex-end;">
                        <div style="color: #FF5722; font-weight: 900; font-size: 1.25rem; text-shadow: 0 0 5px rgba(255, 87, 34, 0.4);">
                            🔥 ${maxWinStreak}
                        </div>
                        <div style="font-size: 0.65rem; font-weight: bold; margin-top: 4px; background: rgba(0,0,0,0.4); padding: 2px 6px; border-radius: 4px;">
                            <span style="color: ${currentStreakColor};">${this.escapeHtml(currentStreakText)}</span>
                        </div>
                    </div>
                </div>
            </div>`;
    }

    renderList() {
        const body = document.getElementById('streak-body');
        if (!body) return;

        if (this.loading && this.data.length === 0) {
            body.innerHTML = `<div style="text-align: center; font-size: 0.8rem; color: var(--text-muted); margin-top: 20px;">${this.gt('streak_searching', 'Tražim najvatrenije igrače...')}</div>`;
            return;
        }

        if (!this.data || this.data.length === 0) {
            body.innerHTML = `<div style="text-align: center; font-size: 0.85rem; color: var(--text-muted); margin-top: 20px; font-style: italic;">${this.gt('streak_no_data', 'Još uvek nema podataka. Odigrajte partiju!')}</div>`;
            return;
        }

        const myUid = localStorage.getItem('yamb_uid') || '';
        const isMyPlayerVisible = !!(this.myPlayer && this.data.some(player => player.isMe || (myUid && player.uid && player.uid === myUid)));
        const myRankHtml = this.myPlayer && !isMyPlayerVisible
            ? `<div style="display: flex; flex-direction: column; gap: 8px; margin-bottom: 10px;">${this.renderPlayerRow(this.myPlayer, { pinned: true })}</div>`
            : '';
        const rowsHtml = this.data
            .map(player => this.renderPlayerRow(player))
            .join('');
        const footerHtml = this.loading
            ? `<div style="text-align:center; color: var(--text-muted); font-size: 0.8rem; padding: 12px;">${this.gt('streak_loading_more', 'Učitavam još igrača...')}</div>`
            : this.hasMore
                ? `<button type="button" onclick="window.vatreniNiz.loadNextPage()" style="width: 100%; margin-top: 8px; padding: 10px 12px; border-radius: 12px; border: 1px solid rgba(255,87,34,0.35); background: rgba(255,87,34,0.12); color: #FF8A50; font-weight: 900; cursor: pointer;">${this.gt('streak_load_more', 'UČITAJ JOŠ')}</button>`
                : `<div style="text-align:center; color: var(--text-muted); font-size: 0.72rem; padding: 12px;">${this.gt('streak_all_loaded', 'Prikazani su svi igrači.')}</div>`;

        body.innerHTML = `
            ${myRankHtml}
            <div style="display: flex; flex-direction: column; gap: 8px;">
                ${rowsHtml}
            </div>
            ${footerHtml}`;
    }
}

// Globalna instanca
window.vatreniNiz = new VatreniNizManager();
