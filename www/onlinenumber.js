// onlinenumber.js - MODUL ZA UPRAVLJANJE MREŽNIM FUNKCIJAMA SA I18N PREVODIMA
// Sadrži: Online broj igrača, Custom Notifikacije, Prikaz Rankova, Trofeja, Highscore Listenere

const onlineNumberSecurityFallback = {
    escapeHtml: (value) => String(value ?? '').replace(/[&<>"']/g, char => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    }[char])),
    escapeAttr(value) {
        return this.escapeHtml(value);
    },
    jsString: (value) => JSON.stringify(String(value ?? '')),
    safeUrl(value, fallback = '') {
        const raw = String(value ?? '').trim();
        if (!raw) return fallback;
        try {
            const parsed = new URL(raw, window.location.origin);
            return ['http:', 'https:'].includes(parsed.protocol) ? parsed.href : fallback;
        } catch (err) {
            return fallback;
        }
    }
};

function getOnlineNumberSecurity() {
    return window.YambSecurity || onlineNumberSecurityFallback;
}

function setOnlineActionButtonDisabled(button, isDisabled) {
    if (!button) return;
    button.disabled = !!isDisabled;
    button.classList.toggle('is-disabled', !!isDisabled);
}

window.handleOnlinePlayerFriendRequest = async function(button, socketId, name, uid) {
    const tr = (key, fallback) => {
        const value = window.t ? window.t(key) : key;
        return value && value !== key ? value : fallback;
    };

    if (!window.app || typeof window.app.sendFriendRequest !== 'function') {
        showNotification(tr('info_title', 'INFO'), tr('err_feature_unavailable', 'Funkcija nije dostupna.'), { className: 'online-players-notice' });
        return;
    }

    setOnlineActionButtonDisabled(button, true);

    try {
        const sent = await window.app.sendFriendRequest(socketId, name, uid, { contextClass: 'online-players' });
        if (!sent) setOnlineActionButtonDisabled(button, false);
    } catch (err) {
        console.warn('Zahtev za prijateljstvo iz online liste nije uspeo:', err);
        setOnlineActionButtonDisabled(button, false);
        showNotification(tr('err_title', 'GREŠKA'), tr('err_server_conn', 'Greška pri povezivanju sa serverom.'), { className: 'online-players-notice' });
    }
};

function syncVisibleOnlineCounters(count) {
    const safeCount = Math.max(0, Number(count) || 0);
    ['live-online-count', 'global-chat-online-count', 'waiting-online-count'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.innerText = safeCount;
    });
}

/**
 * Prikazuje custom toast notifikaciju iznad svih elemenata.
 */
window.showNotification = function(title, message, options = {}) {
    const sec = getOnlineNumberSecurity();
    const containerId = 'custom-notification-container';
    let container = document.getElementById(containerId);
    if (!container) {
        container = document.createElement('div');
        container.id = containerId;
        container.style.position = 'fixed';
        container.style.top = 'max(20px, calc(env(safe-area-inset-top) + 12px))';
        container.style.left = '50%';
        container.style.transform = 'translateX(-50%)';
        container.style.zIndex = '100000';
        container.style.display = 'flex';
        container.style.flexDirection = 'column';
        container.style.gap = '10px';
        container.style.pointerEvents = 'none';
        container.style.width = '90%';
        container.style.maxWidth = '350px';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    const safeClassName = String(options.className || '').replace(/[^a-zA-Z0-9_-]/g, '');
    toast.className = `custom-toast ${safeClassName}`.trim();
    if (document.getElementById('riznica-screen')?.classList.contains('active')) {
        toast.classList.add('treasury-notice');
    }
    if (document.getElementById('tournament-screen')?.classList.contains('active')) {
        toast.classList.add('tournament-notice');
    }
    if (document.getElementById('undo-menu-overlay')?.style.display === 'flex') {
        toast.classList.add('economy-notice');
    }
    toast.setAttribute('role', 'status');
    toast.setAttribute('aria-live', 'polite');
    const optionalIcon = options.icon
        ? `<img class="custom-toast-soft-clay-icon" src="${sec.escapeAttr(options.icon)}" alt="" aria-hidden="true" decoding="async">`
        : '';
    const iconTokens = [];
    const tokenizedMessage = String(message ?? '').replace(
        /<svg\b[^>]*\bdukat-icon-inline\b[^>]*>[\s\S]*?<\/svg>|<img\b[^>]*\bdukat-icon-inline\b[^>]*>/gi,
        () => `__YOTB_DUKAT_ICON_${iconTokens.push(true) - 1}__`
    );
    let safeMessageHtml = sec.escapeHtml(tokenizedMessage);
    const inlineDukat = typeof dukatIconHtml === 'function'
        ? dukatIconHtml('custom-toast-inline-ducat')
        : 'dukata';
    iconTokens.forEach((_, index) => {
        safeMessageHtml = safeMessageHtml.replace(`__YOTB_DUKAT_ICON_${index}__`, inlineDukat);
    });
    toast.innerHTML = `
        ${optionalIcon}
        <div class="custom-toast-copy">
            <div class="toast-title">${sec.escapeHtml(title)}</div>
            <div class="toast-msg">${safeMessageHtml}</div>
        </div>
    `;
    
    toast.style.background = 'var(--glass-panel)';
    toast.style.border = '2px solid var(--gold-main)';
    toast.style.borderRadius = '12px';
    toast.style.padding = '12px 15px';
    toast.style.color = 'var(--text-main)';
    toast.style.boxShadow = '0 5px 15px rgba(0,0,0,0.5), inset 0 0 10px rgba(224, 201, 149, 0.1)';
    toast.style.backdropFilter = 'blur(10px)';
    toast.style.WebkitBackdropFilter = 'blur(10px)';
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(-20px)';
    toast.style.transition = 'all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)';
    
    const titleEl = toast.querySelector('.toast-title');
    titleEl.style.color = 'var(--gold-main)';
    titleEl.style.fontWeight = 'bold';
    titleEl.style.fontSize = '0.9rem';
    titleEl.style.marginBottom = '5px';
    titleEl.style.textTransform = 'uppercase';
    
    const msgEl = toast.querySelector('.toast-msg');
    msgEl.style.fontSize = '0.85rem';
    msgEl.style.lineHeight = '1.3';

    container.appendChild(toast);

    requestAnimationFrame(() => {
        toast.style.opacity = '1';
        toast.style.transform = 'translateY(0)';
    });

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(-20px)';
        setTimeout(() => toast.remove(), 300);
    }, 4000);
};

let onlinePlayersRefreshTimer = null;
const ONLINE_PLAYERS_PAGE_SIZE = 30;
let onlinePlayersSnapshot = [];
let onlinePlayersVisibleCount = ONLINE_PLAYERS_PAGE_SIZE;
let onlinePlayersFilteredCount = 0;
let onlinePlayersSearchQuery = '';
let onlinePlayersRenderCurrent = null;
let onlinePlayersSearchTimer = null;
let onlinePlayersConnectionTimer = null;
let onlinePlayersPendingConnectHandler = null;
let onlinePlayersDisconnectHandler = null;
let onlinePlayersOpenedAt = 0;

function normalizeOnlinePlayerSearch(value) {
    return String(value || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLocaleLowerCase()
        .trim();
}

function fitOnlinePlayerNames(root = document) {
    const nameElements = root.querySelectorAll('.online-player-name[data-player-name]');
    if (!nameElements.length) return;

    requestAnimationFrame(() => {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        if (!context) return;

        nameElements.forEach(element => {
            element.style.fontSize = '';
            element.classList.remove('online-player-name--emergency-break');

            const availableWidth = Math.floor(element.getBoundingClientRect().width);
            const words = String(element.dataset.playerName || '').trim().split(/\s+/u).filter(Boolean);
            if (availableWidth <= 0 || words.length === 0) return;

            const computed = window.getComputedStyle(element);
            const baseFontSize = parseFloat(computed.fontSize) || 15;
            const minFontSize = 10;
            context.font = `${computed.fontWeight || 700} ${baseFontSize}px ${computed.fontFamily || 'sans-serif'}`;
            const widestWord = Math.max(...words.map(word => context.measureText(word).width));

            if (widestWord <= availableWidth - 2) return;

            const fittedSize = Math.max(minFontSize, Math.floor((baseFontSize * (availableWidth - 2) / widestWord) * 10) / 10);
            element.style.fontSize = `${fittedSize}px`;

            context.font = `${computed.fontWeight || 700} ${fittedSize}px ${computed.fontFamily || 'sans-serif'}`;
            const stillTooWide = words.some(word => context.measureText(word).width > availableWidth);
            element.classList.toggle('online-player-name--emergency-break', stillTooWide);
        });
    });
}

function isOnlinePlayersModalOpen() {
    const overlay = document.getElementById('online-players-overlay');
    return !!(overlay && overlay.style.display !== 'none');
}

function requestOnlinePlayersList() {
    if (window.app && window.app.socket && window.app.socket.connected) {
        window.app.socket.emit('get_online_players_list');
        return true;
    }
    return false;
}

function stopOnlinePlayersAutoRefresh() {
    if (onlinePlayersRefreshTimer) {
        clearInterval(onlinePlayersRefreshTimer);
        onlinePlayersRefreshTimer = null;
    }
}

function cleanupOnlinePlayersSocketListeners() {
    const socket = window.app && window.app.socket;
    if (onlinePlayersConnectionTimer) {
        clearTimeout(onlinePlayersConnectionTimer);
        onlinePlayersConnectionTimer = null;
    }
    if (!socket || typeof socket.off !== 'function') return;

    socket.off('online_players_list_data');
    socket.off('online_players_status_changed');
    if (onlinePlayersDisconnectHandler) {
        socket.off('disconnect', onlinePlayersDisconnectHandler);
        onlinePlayersDisconnectHandler = null;
    }
    if (onlinePlayersPendingConnectHandler) {
        socket.off('connect', onlinePlayersPendingConnectHandler);
        onlinePlayersPendingConnectHandler = null;
    }
}

function startOnlinePlayersAutoRefresh() {
    stopOnlinePlayersAutoRefresh();
    onlinePlayersRefreshTimer = setInterval(() => {
        if (!isOnlinePlayersModalOpen()) {
            window.closeOnlinePlayersModal({ skipOverlay: true });
            return;
        }
        requestOnlinePlayersList();
    }, 6000);
}

window.closeOnlinePlayersModal = function(options = {}) {
    const overlay = document.getElementById('online-players-overlay');
    const wasOpen = isOnlinePlayersModalOpen();
    const viewedLongEnough = Date.now() - onlinePlayersOpenedAt >= 8000;
    if (overlay && !options.skipOverlay) {
        overlay.style.display = 'none';
    }
    onlinePlayersOpenedAt = 0;

    stopOnlinePlayersAutoRefresh();
    cleanupOnlinePlayersSocketListeners();
    if (onlinePlayersSearchTimer) {
        clearTimeout(onlinePlayersSearchTimer);
        onlinePlayersSearchTimer = null;
    }
    const body = document.getElementById('online-players-body');
    const searchInput = document.getElementById('online-players-search');
    if (body) body.onscroll = null;
    if (searchInput) searchInput.oninput = null;
    onlinePlayersRenderCurrent = null;
    if (options.showAd === true && wasOpen && viewedLongEnough && window.app?.adMob?.showInterstitial) {
        void window.app.adMob.showInterstitial();
    }
};

window.refreshOnlinePlayersModal = function() {
    if (!isOnlinePlayersModalOpen()) return false;
    return requestOnlinePlayersList();
};

// --- NOVA FUNKCIJA: OTVARANJE MODALA ZA ONLINE IGRAČE ---
window.openOnlinePlayersModal = function() {
    cleanupOnlinePlayersSocketListeners();
    const sec = getOnlineNumberSecurity();
    const tr = (key, fallback) => {
        const value = window.t ? window.t(key) : key;
        return value && value !== key ? value : fallback;
    };
    const overlay = document.getElementById('online-players-overlay');
    window.themeOnlinePlayers.preload();

    if (overlay) {
        overlay.style.display = 'flex';
        onlinePlayersOpenedAt = Date.now();
    }

    const body = document.getElementById('online-players-body');
    const searchInput = document.getElementById('online-players-search');
    onlinePlayersSnapshot = [];
    onlinePlayersVisibleCount = ONLINE_PLAYERS_PAGE_SIZE;
    onlinePlayersFilteredCount = 0;
    onlinePlayersSearchQuery = '';
    if (searchInput) searchInput.value = '';
    const renderPlayersState = (state, text) => {
        if (!body) return;
        body.innerHTML = `
            <div class="online-players-state ${state === 'loading' ? 'is-loading' : ''}" data-online-state="${sec.escapeAttr(state)}" role="${state === 'error' ? 'alert' : 'status'}" aria-live="${state === 'error' ? 'assertive' : 'polite'}">
                <img class="theme-online-state-icon" data-online-role="state" src="${window.themeOnlinePlayers.asset('state')}" alt="" aria-hidden="true" decoding="async">
                <span>${sec.escapeHtml(text)}</span>
            </div>`;
        window.themeOnlinePlayers.apply(body);
    };
    if (body) {
        body.style.flex = '1';
        body.style.overflowY = 'auto';
        body.style.WebkitOverflowScrolling = 'touch';
        body.style.padding = '15px';
        body.style.display = 'flex';
        body.style.flexDirection = 'column';
        body.style.gap = '12px';

        const loadingText = tr('online_loading', 'Učitavam igrače...');
        renderPlayersState('loading', loadingText);

        body.onscroll = () => {
            const remaining = body.scrollHeight - body.scrollTop - body.clientHeight;
            if (remaining > 140 || onlinePlayersVisibleCount >= onlinePlayersFilteredCount) return;
            onlinePlayersVisibleCount += ONLINE_PLAYERS_PAGE_SIZE;
            if (typeof onlinePlayersRenderCurrent === 'function') {
                onlinePlayersRenderCurrent({ preserveScroll: true });
            }
        };
    }

    if (searchInput) {
        searchInput.oninput = () => {
            if (onlinePlayersSearchTimer) clearTimeout(onlinePlayersSearchTimer);
            onlinePlayersSearchTimer = setTimeout(() => {
                onlinePlayersSearchQuery = normalizeOnlinePlayerSearch(searchInput.value);
                onlinePlayersVisibleCount = ONLINE_PLAYERS_PAGE_SIZE;
                if (body) body.scrollTop = 0;
                if (typeof onlinePlayersRenderCurrent === 'function') {
                    onlinePlayersRenderCurrent({ preserveScroll: false });
                }
            }, 140);
        };
    }

    if (window.app && typeof window.app.initSocketConnection === 'function') {
        window.app.initSocketConnection();
    }

    if (window.app && window.app.socket) {
        const bindOnlinePlayersList = () => {
            if (onlinePlayersConnectionTimer) {
                clearTimeout(onlinePlayersConnectionTimer);
                onlinePlayersConnectionTimer = null;
            }
            onlinePlayersPendingConnectHandler = null;
            if (!isOnlinePlayersModalOpen()) return;
            const renderOnlinePlayers = (players, options = {}) => {
            if (!body) return;

            if (Array.isArray(players)) {
                onlinePlayersSnapshot = players;
            }

            const allPlayers = onlinePlayersSnapshot;
            const previousScrollTop = body.scrollTop;

            if (allPlayers.length === 0) {
                onlinePlayersFilteredCount = 0;
                const noPlayers = tr('online_no_players', 'Trenutno nema igrača.');
                renderPlayersState('empty', noPlayers);
                return;
            }

            const filteredPlayers = onlinePlayersSearchQuery
                ? allPlayers.filter(player => normalizeOnlinePlayerSearch(player && player.name).includes(onlinePlayersSearchQuery))
                : allPlayers;
            onlinePlayersFilteredCount = filteredPlayers.length;

            if (filteredPlayers.length === 0) {
                const noMatches = tr('online_search_empty', 'Nema online igrača sa tim imenom.');
                renderPlayersState('empty', noMatches);
                return;
            }

            const visiblePlayers = filteredPlayers.slice(0, onlinePlayersVisibleCount);

            let html = '';
            visiblePlayers.forEach(p => {
                const myUid = String(window.app.playerId || localStorage.getItem('yamb_uid') || '');
                const playerUid = String(p.uid || p.playerId || '');
                const roomId = String(p.roomId || '');
                const status = String(p.status || '').toLowerCase();
                const isMe = p.socketId === window.app.socket.id || (myUid && playerUid && myUid === playerUid);
                const youText = tr('online_you', '(Vi)');
                const rawName = String(p.name || 'Igrac');
                const safeNameHtml = sec.escapeHtml(rawName);
                const playerNameLength = Array.from(rawName.trim()).length;
                const playerNameLengthClass = playerNameLength > 26
                    ? ' online-player-name--very-long'
                    : (playerNameLength > 18 ? ' online-player-name--long' : '');
                const socketIdArg = sec.jsString(p.socketId || '');
                const nameArg = sec.jsString(rawName);
                const uidArg = sec.jsString(playerUid);
                const roomIdArg = sec.jsString(roomId);
                const externalPhoto = sec.safeUrl(p.photoUrl, '');
                const photoSrc = sec.escapeAttr(externalPhoto || window.themeOnlinePlayers.asset('avatar'));
                const avatarRole = externalPhoto ? '' : ' data-online-role="avatar"';

                let actionButtons = '';
                if (!isMe) {
                    const hasLiveRoom = !!roomId && !roomId.startsWith('local_');
                    const alreadyPlayingOnline = !!(window.app && window.app.gameActive && window.app.onlineMode && !window.app.isSpectator);
                    const canSpectate = !alreadyPlayingOnline && (!!p.canSpectate || (hasLiveRoom && (!!p.isPlaying || status === 'playing')));
                    const isBusy = !!p.isBusy || !!p.isPlaying || status === 'playing';
                    // Znamo sigurno sa servera da li su već prijatelji!
                    const isAlreadyFriend = p.isFriend;
                    const errorTitleArg = sec.jsString(tr('err_title', 'GREŠKA'));
                    const featureUnavailableArg = sec.jsString(tr('err_feature_unavailable', 'Funkcija nije dostupna.'));
                    const alreadyFriendTitle = tr('online_tooltip_already_friend', 'Već ste prijatelji');
                    const addFriendTitle = tr('online_tooltip_add_friend', 'Dodaj prijatelja');
                    const spectateBusySelfTitle = tr('online_tooltip_spectate_busy_self', 'Već ste u online partiji');
                    const spectateNotPlayingTitle = tr('online_tooltip_not_playing', 'Igrač trenutno ne igra');
                    const spectateTitleText = tr('online_tooltip_spectate', 'Gledaj partiju');
                    const playerBusyTitle = tr('online_tooltip_player_busy', 'Igrač trenutno igra');
                    const challengeTitleText = tr('online_tooltip_challenge', 'Izazovi na duel');
                    const addFriendHandler = sec.escapeAttr(`window.handleOnlinePlayerFriendRequest(this, ${socketIdArg}, ${nameArg}, ${uidArg})`);
                    const spectateHandler = sec.escapeAttr(`if(window.app && window.app.spectateGame) { window.app.spectateGame({ socketId: ${socketIdArg}, roomId: ${roomIdArg}, uid: ${uidArg} }, { contextClass: 'online-players' }) } else { showNotification(${errorTitleArg}, ${featureUnavailableArg}, { className: 'online-players-notice' }) }`);
                    const challengeHandler = sec.escapeAttr(`if(window.app && window.app.challengePlayer) { window.app.challengePlayer(${socketIdArg}, ${nameArg}, ${uidArg}, { contextClass: 'online-players' }) } else { showNotification(${errorTitleArg}, ${featureUnavailableArg}, { className: 'online-players-notice' }) }`);

                    const actionButton = (role, title, handler, disabled) => `
                        <button type="button" class="online-player-action online-player-action--${role}${disabled ? ' is-disabled' : ''}"
                            ${disabled ? 'disabled' : `onclick="${handler}"`}
                            title="${sec.escapeAttr(title)}">
                            <img class="theme-online-action-icon" data-online-role="${role}"
                                src="${window.themeOnlinePlayers.asset(role)}" alt="" aria-hidden="true" decoding="async">
                        </button>`;
                    const friendButton = actionButton('friend', isAlreadyFriend ? alreadyFriendTitle : addFriendTitle,
                        addFriendHandler, !!isAlreadyFriend);
                    const spectateButton = actionButton('spectate', canSpectate ? spectateTitleText
                        : (alreadyPlayingOnline ? spectateBusySelfTitle : spectateNotPlayingTitle),
                        spectateHandler, !canSpectate);
                    const duelButton = actionButton('duel', isBusy ? playerBusyTitle : challengeTitleText,
                        challengeHandler, isBusy);
                    actionButtons = `<div class="online-player-actions">${friendButton}${spectateButton}${duelButton}</div>`;
                }

                html += `
                <div class="online-player-card" style="display: flex; align-items: center; justify-content: space-between; background: rgba(0,0,0,0.2); padding: 12px 15px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.05); gap: 10px;">
                    <div class="online-player-identity" style="display: flex; align-items: center; gap: 12px; flex: 1; min-width: 0;">
                        <img class="theme-online-avatar${p.isPlaying ? ' is-playing' : (p.isBusy ? ' is-busy' : '')}"
                            src="${photoSrc}"${avatarRole} onerror="window.themeOnlinePlayers.handleAvatarError(this)"
                            alt="" aria-hidden="true" decoding="async">
                        <span class="online-player-name${playerNameLengthClass}" data-player-name="${sec.escapeAttr(rawName)}" title="${sec.escapeAttr(rawName)}">
                            ${safeNameHtml} ${isMe ? `<span style="font-size:0.75rem; color:var(--text-muted); display: block; margin-top: 4px;">${sec.escapeHtml(youText)}</span>` : ''}
                        </span>
                    </div>
                    ${actionButtons}
                </div>`;
            });

            if (visiblePlayers.length < filteredPlayers.length) {
                html += `
                    <div class="online-players-load-more" role="status">
                        ${sec.escapeHtml(tr('online_loading_more', 'Učitavam još igrača...'))}
                    </div>`;
            }

            body.innerHTML = html;
            window.themeOnlinePlayers.apply(body);
            body.querySelectorAll('.online-player-action[title]').forEach(button => {
                button.setAttribute('aria-label', button.title);
            });
            body.querySelectorAll('.online-player-identity > img').forEach(avatar => {
                avatar.alt = '';
                avatar.setAttribute('aria-hidden', 'true');
            });
            if (options.preserveScroll) body.scrollTop = previousScrollTop;
            fitOnlinePlayerNames(body);
        };

            onlinePlayersRenderCurrent = (options = {}) => renderOnlinePlayers(null, options);
            window.app.socket.off('online_players_list_data');
            window.app.socket.on('online_players_list_data', renderOnlinePlayers);

            window.app.socket.off('online_players_status_changed');
            window.app.socket.on('online_players_status_changed', () => {
                if (isOnlinePlayersModalOpen()) requestOnlinePlayersList();
            });
            if (onlinePlayersDisconnectHandler) window.app.socket.off('disconnect', onlinePlayersDisconnectHandler);
            onlinePlayersDisconnectHandler = () => {
                if (isOnlinePlayersModalOpen()) {
                    renderPlayersState('error', tr('online_no_conn', 'Niste povezani na server.'));
                }
            };
            window.app.socket.on('disconnect', onlinePlayersDisconnectHandler);

            startOnlinePlayersAutoRefresh();
            requestOnlinePlayersList();
        };

        if (window.app.socket.connected) {
            bindOnlinePlayersList();
        } else {
            onlinePlayersPendingConnectHandler = bindOnlinePlayersList;
            window.app.socket.once('connect', bindOnlinePlayersList);
            onlinePlayersConnectionTimer = setTimeout(() => {
                onlinePlayersConnectionTimer = null;
                if (!isOnlinePlayersModalOpen() || window.app.socket.connected) return;
                if (body?.querySelector('[data-online-state="loading"]')) {
                    renderPlayersState('error', tr('online_no_conn', 'Niste povezani na server.'));
                }
            }, 8000);
            if (window.app.socket.disconnected) window.app.socket.connect();
        }
    } else {
        if (body) {
            const noConnText = tr('online_no_conn', 'Niste povezani na server.');
            renderPlayersState('error', noConnText);
        }
    }
};

document.addEventListener('DOMContentLoaded', () => {
    
    // --- POMOĆNA FUNKCIJA ZA PREVODE ---
    const t = (key) => window.t ? window.t(key) : key;

    // --- 1. ONLINE BROJAČ ---
    // Broj online igrača dolazi kroz glavnu app socket konekciju (`users_count` u game.js).
    // Ovde samo sinhronizujemo postojeće DOM elemente pri kasnom učitavanju modula.
    if (window.app && typeof window.app.onlineUsersCount === 'number') {
        syncVisibleOnlineCounters(window.app.onlineUsersCount);
    }

    // --- 2. PRIKAZ DNEVNOG IZAZOVA I NAGRADA NA DASHBOARDU ---
    const rewardAlertContainer = document.getElementById('reward-alert-container');
    
    if (rewardAlertContainer) {
        rewardAlertContainer.innerHTML = ''; 
        rewardAlertContainer.style.display = 'block'; 
        rewardAlertContainer.style.width = '100%';
        rewardAlertContainer.style.maxWidth = '330px'; 
        rewardAlertContainer.style.margin = '0 auto 15px auto';

        const lastPlayed = localStorage.getItem('yamb_daily_last_played');
        const todayStr = new Date().toISOString().split('T')[0];
        const isPlayedToday = (lastPlayed === todayStr);

        let htmlContent = '';

        if (!isPlayedToday) {
            htmlContent = `
                <div class="alert-content">
                    <div class="alert-icon">🎲</div>
                    <div class="alert-text">
                        <div class="alert-title">${t('daily_challenge_title')}</div>
                        <div class="alert-desc">${t('daily_challenge_desc')}</div>
                    </div>
                    <div class="alert-reward">
                        <div class="reward-pill">
                            <span class="pill-icon">${dukatIconHtml()}</span>
                            <span>1000</span>
                            <span>${t('coins_upper')}</span>
                        </div>
                    </div>
                    <button class="alert-btn" onclick="window.stateManager.navigateTo('daily-challenge')">${t('play_now')}</button>
                </div>
            `;
        } else {
            rewardAlertContainer.style.display = 'none'; 
            return; 
        }

        const alertDiv = document.createElement('div');
        alertDiv.className = 'dashboard-alert active-alert';
        alertDiv.innerHTML = htmlContent;
        rewardAlertContainer.appendChild(alertDiv);
    }

    // --- 3. OSVEŽAVANJE STATISTIKE I RANKA NA DASHBOARDU ---
    window.addEventListener('updateDashboardStats', (e) => {
        const stats = e.detail || (window.statsManager ? window.statsManager.stats : null);
        if (!stats) return;

        const totalGames = stats.totalGames || 0;
        const wins = stats.wins || 0;
        const hs = stats.highscore || 0;
        const setText = (ids, value) => {
            const idList = Array.isArray(ids) ? ids : [ids];
            const el = idList.map(id => document.getElementById(id)).find(Boolean);
            if (el) el.innerText = value;
        };

        setText(['stat-hs', 'stat-high'], hs);
        setText('stat-games', totalGames);
        setText('stat-wins', wins);

        let wlRatio = 0;
        if (totalGames > 0) wlRatio = Math.round((wins / totalGames) * 100);
        setText(['stat-wl', 'stat-rate'], wlRatio + "%");
    });

    setTimeout(() => {
        window.dispatchEvent(new CustomEvent('updateDashboardStats'));
    }, 1500);

    // --- 4. OSLUŠKIVANJE ZA OSVOJEN TROFEJ ---
    window.addEventListener('trophyUnlocked', (e) => {
        const trophyId = e.detail;
        
        const popup = document.createElement('div');
        popup.className = 'trophy-popup active';
        popup.innerHTML = `
            <div class="tp-icon">🏆</div>
            <div class="tp-content">
                <div class="tp-title">${t('new_trophy') || "Novi Trofej!"}</div>
                <div class="tp-desc">${trophyId}</div> 
            </div>
        `;
        document.body.appendChild(popup);

        if (window.app && window.app.soundMgr) window.app.soundMgr.trophy();

        setTimeout(() => {
            popup.classList.remove('active');
            setTimeout(() => popup.remove(), 500);
        }, 4000);
    });
});
