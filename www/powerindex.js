// powerindex.js - Menadžer za prikaz Top Liste Indeksa Moći (Glassmorphism UI)

class PowerIndexLeaderboard {
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
        this.setupSocket();
    }

    setupSocket() {
        // Koristimo setInterval za pouzdanije detektovanje socketa (izbegavamo race condition na sporijim mrežama)
        const checkSocket = setInterval(() => {
            if (window.app && window.app.socket) {
                window.app.socket.on('power_index_page_data', (payload) => {
                    this.handlePageData(payload);
                });

                // Kompatibilnost sa starim serverom: ako stigne TOP 50 niz, i dalje ga prikaži.
                window.app.socket.on('power_index_data', (data) => {
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

                clearInterval(checkSocket); // Prekidamo proveru čim uspešno nakačimo event
            }
        }, 500); // Proverava svakih pola sekunde
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

    openModal() {
        if(window.app && window.app.soundMgr) window.app.soundMgr.click();

        let existing = document.getElementById('pi-modal-overlay');
        if (existing) existing.remove();

        this.resetState();

        // Glassmorphism Modal Struktura
        const modalHtml = `
        <div id="pi-modal-overlay" class="modal-overlay global-chat-overlay pi-modal-overlay" style="z-index: 999999; display: flex;">
            <div class="modal-box global-chat-shell pi-modal-shell">

                <div class="chat-header global-chat-header pi-modal-header">
                    <h2 class="pi-modal-title">
                        <span class="power-index-title-legacy" style="font-size: 1.5rem;">⚡</span>
                        <img class="power-index-soft-clay-bolt power-index-title-bolt power-index-title-bolt-easter" src="assets/easter-soft-clay/statistics/power-index-bolt-v3.png?v=1" alt="" aria-hidden="true" decoding="async">
                        <img class="power-index-soft-clay-bolt power-index-title-bolt" src="assets/desert-soft-clay/statistics/power-index-bolt-v2.png?v=1" alt="" aria-hidden="true" decoding="async">
                        <img class="power-index-soft-clay-bolt power-index-title-bolt-nebula" src="assets/severna-soft-clay/statistics/power-index-bolt-v10.png?v=1" alt="" aria-hidden="true" decoding="async">
                        ${this.gt('pi_title', 'TOP IGRAČI')}
                    </h2>
                    <button type="button" class="global-chat-close" onclick="document.getElementById('pi-modal-overlay').remove()" aria-label="${this.gt('aria_close_power_index', 'Zatvori Power index listu')}">×</button>
                </div>

                <div class="chat-body global-chat-body pi-list-container" id="pi-list-container">
                    <div style="text-align: center; color: var(--text-muted); font-size: 0.9rem; padding: 20px;">
                        ${this.gt('league_loading', 'Učitavanje servera... ⏳')}
                    </div>
                </div>

            </div>
        </div>`;

        document.body.insertAdjacentHTML('beforeend', modalHtml);

        const container = document.getElementById('pi-list-container');
        if (container) container.addEventListener('scroll', this.boundHandleScroll);

        this.ensureSocketIdentity().finally(() => this.requestPage(0));
    }

    async ensureSocketIdentity() {
        if (!window.app || !localStorage.getItem('yamb_uid')) return;
        if (typeof window.app.authenticateSocketIdentity !== 'function') return;

        try {
            await window.app.authenticateSocketIdentity();
        } catch (err) {
            console.warn('Power Index verifikacija socketa nije uspela:', err);
        }
    }

    requestPage(offset) {
        const container = document.getElementById('pi-list-container');
        if (!window.app || !window.app.socket || !window.app.socket.connected) {
            if (container) {
                container.innerHTML = `
                    <div style="text-align:center; color: var(--danger); padding: 20px; font-weight: bold;">
                        ${this.gt('pi_no_conn', 'Nema konekcije sa serverom. Zakačite se na mrežu.')}
                    </div>`;
            }
            return;
        }

        if (this.loading) return;

        this.loading = true;
        if (offset === 0) {
            this.data = [];
        }
        this.renderList();

        window.app.socket.emit('get_power_index_leaderboard_page', {
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
        const container = event.currentTarget;
        if (!container || this.loading || !this.hasMore) return;
        const distanceFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
        if (distanceFromBottom < 140) {
            this.loadNextPage();
        }
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
            const key = player && (player.uid || `${player.playerName}:${player.rank}`);
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

    renderPlayerRow(p, options = {}) {
        const myUid = localStorage.getItem('yamb_uid') || '';
        const myName = localStorage.getItem('yamb_player_name') || this.gt('player_guest', 'Gost');
        const rank = Math.max(1, parseInt(p.rank, 10) || 1);
        const isMe = !!p.isMe || (!!p.uid && p.uid === myUid) || (!p.uid && p.playerName === myName);
        const isPinned = !!options.pinned;

        // Tema bira svoj Power Index podium pack; cache verzija se podiže samo za Severnu.
        const podiumTone = rank === 1 ? 'gold' : rank === 2 ? 'silver' : rank === 3 ? 'bronze' : '';
        const activeTheme = localStorage.getItem('yamb_theme') || 'dark';
        const podiumTheme = activeTheme === 'severna' ? 'severna' : (activeTheme === 'desert' ? 'desert' : 'easter');
        const podiumAssetSrc = podiumTheme === 'severna'
            ? `assets/severna-soft-clay/statistics/power-index/${podiumTone}-v10.png?v=1`
            : podiumTheme === 'easter'
                ? `assets/easter-soft-clay/statistics/power-index/${podiumTone}-v3.png?v=1`
                : `assets/${podiumTheme}-soft-clay/statistics/power-index/${podiumTone}.png?v=2`;
        const legacyRank = rank === 1 ? '⚡' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `<span style="color: var(--text-muted);">${rank}.</span>`;
        const podiumRank = podiumTone
            ? `<img class="power-index-podium-medal" src="${podiumAssetSrc}" alt="" aria-hidden="true">`
            : '';
        const rankTrophy = `<span class="power-index-rank-legacy">${legacyRank}</span>${podiumRank}`;

        const rawName = p.playerName || this.gt('player_unknown', 'Igrač');
        const displayName = this.escapeHtml(rawName);
        const photo = this.getAvatarUrl(rawName, p.photoUrl);
        const powerIndex = this.escapeHtml(p.powerIndex || 0);

        // Glassmorphism Card UI logika boja
        let bg = 'background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08);'; // Podrazumevani stil

        if (isMe) {
            // Trenutni igrač (TI) dobija jak zlatni okvir da bi se jasno istakao
            bg = 'background: linear-gradient(90deg, rgba(224, 201, 149, 0.15) 0%, rgba(0,0,0,0.2) 100%); border: 1px solid var(--gold-main);';
        } else if (rank === 1) {
            // Prvo mesto (kada to nisi ti) dobija suptilniji sjaj i poluprovidan okvir
            bg = 'background: linear-gradient(90deg, rgba(255,215,0,0.1) 0%, rgba(0,0,0,0.2) 100%); border: 1px solid rgba(255,215,0,0.3);';
        }

        if (isPinned) {
            bg = 'background: rgba(224, 201, 149, 0.12); border: 1px dashed var(--gold-main);';
        }

        // Boja imena: tebi tvoja zlatna, prvom mestu malo svetlija zlatna, ostalima standardna
        let nameColor = isMe ? 'var(--gold-main)' : (rank === 1 ? '#FFD700' : 'var(--text-main)');

        // Senka (glow)
        let glow = isMe ? 'box-shadow: 0 0 10px rgba(224, 201, 149, 0.3);' : (rank === 1 ? 'box-shadow: 0 4px 15px rgba(255,215,0,0.15);' : 'box-shadow: 0 2px 8px rgba(0,0,0,0.2);');

        // --- DINAMIČKO SMANJIVANJE FONTA PREMA DUŽINI IMENA ---
        let nameStyle = "font-size: 0.85rem; line-height: 1.2;"; // Default za kraća imena
        if (rawName.length > 20) {
            nameStyle = "font-size: 0.65rem; line-height: 1.1;"; // Ekstremno dugačka imena
        } else if (rawName.length > 14) {
            nameStyle = "font-size: 0.75rem; line-height: 1.1;"; // Srednje dugačka imena
        }

        const pinnedLabel = isPinned
            ? `<div style="font-size: 0.62rem; color: var(--gold-main); font-weight: 900; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 3px;">${this.gt('pi_my_rank', 'MOJE MESTO')}</div>`
            : '';

        return `
            <div class="power-index-player-row${rank === 1 ? ' is-first' : ''}${isMe ? ' is-me' : ''}" style="display: flex; flex-direction: column; gap: 4px; padding: 10px; border-radius: 12px; ${bg} ${glow} transition: transform 0.2s;">
                ${pinnedLabel}
                <div style="display: flex; justify-content: space-between; align-items: center; gap: 8px;">
                    <div style="display: flex; align-items: center; gap: 8px; overflow: hidden; flex: 1; padding-right: 5px;">
                        <div class="power-index-rank-mark${podiumTone ? ' has-podium' : ''}" aria-label="${rank}." style="font-size: 1.1rem; min-width: 32px; text-align: center; font-weight: 900; text-shadow: 0 0 5px rgba(255,215,0,0.5);">${rankTrophy}</div>

                        <img src="${photo}" style="width: 35px; height: 35px; border-radius: 50%; object-fit: cover; border: 2px solid ${rank === 1 || isMe ? 'var(--gold-main)' : 'rgba(255,255,255,0.2)'}; flex-shrink: 0;">

                        <span class="power-index-player-name" style="color: ${nameColor}; font-weight: 700; ${nameStyle} white-space: normal; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; word-break: break-word;">${displayName}</span>
                    </div>

                    <div style="display: flex; align-items: center; gap: 4px; background: rgba(0,0,0,0.4); padding: 5px 10px; border-radius: 15px; border: 1px solid rgba(255,140,0,0.3); flex-shrink: 0;">
                        <span style="color: #FFD700; font-weight: 900; font-size: 1rem; text-shadow: 0 0 5px rgba(255,140,0,0.5);">${powerIndex}</span>
                        <span class="power-index-value-legacy" style="font-size: 0.8rem;">⚡</span>
                        <img class="power-index-soft-clay-bolt power-index-value-bolt power-index-value-bolt-easter" src="assets/easter-soft-clay/statistics/power-index-bolt-v3.png?v=1" alt="" aria-hidden="true" decoding="async">
                        <img class="power-index-soft-clay-bolt power-index-value-bolt" src="assets/desert-soft-clay/statistics/power-index-bolt-v2.png?v=1" alt="" aria-hidden="true" decoding="async">
                        <img class="power-index-soft-clay-bolt power-index-value-bolt-nebula" src="assets/severna-soft-clay/statistics/power-index-bolt-v10.png?v=1" alt="" aria-hidden="true" decoding="async">
                    </div>
                </div>
            </div>`;
    }

    renderList() {
        const container = document.getElementById('pi-list-container');
        if (!container) return;

        if (this.loading && this.data.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; color: var(--text-muted); font-size: 0.9rem; padding: 20px;">
                    ${this.gt('league_loading', 'Učitavanje servera... ⏳')}
                </div>`;
            return;
        }

        if (!this.data || this.data.length === 0) {
            container.innerHTML = `<div style="text-align:center; color: var(--text-muted); padding: 20px;">${this.gt('pi_no_data', 'Još uvek nema dovoljno podataka na serveru.')}</div>`;
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
            ? `<div style="text-align:center; color: var(--text-muted); font-size: 0.8rem; padding: 12px;">${this.gt('pi_loading_more', 'Učitavam još igrača...')}</div>`
            : this.hasMore
                ? `<button type="button" onclick="window.powerIndexLeaderboard.loadNextPage()" style="width: 100%; margin-top: 8px; padding: 10px 12px; border-radius: 12px; border: 1px solid rgba(224,201,149,0.35); background: rgba(224,201,149,0.12); color: var(--gold-main); font-weight: 900; cursor: pointer;">${this.gt('pi_load_more', 'UČITAJ JOŠ')}</button>`
                : `<div style="text-align:center; color: var(--text-muted); font-size: 0.72rem; padding: 12px;">${this.gt('pi_all_loaded', 'Prikazani su svi igrači.')}</div>`;

        container.innerHTML = `
            ${myRankHtml}
            <div style="display: flex; flex-direction: column; gap: 8px;">
                ${rowsHtml}
            </div>
            ${footerHtml}`;
    }
}

// Inicijalizacija globalne instance
window.powerIndexLeaderboard = new PowerIndexLeaderboard();
