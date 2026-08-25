// globalchat.js - GLOBAL CHAT MANAGER

class GlobalChatManager {
    constructor(app) {
        this.app = app;
        this.lastGlobalMsg = null;
        this.chatReadyUid = null;
        this.chatReadyName = null;
        this.updateViewportVars = this.updateViewportVars.bind(this);
        this.initDOM();
        this.initViewportTracking();
    }

    // Pomoćna funkcija za prevode
    gt(key) {
        return typeof t === 'function' ? t(key) : key;
    }

    resizeInput(input = document.getElementById('global-chat-input')) {
        if (!input) return;
        input.style.height = 'auto';
        const maxHeight = parseInt(window.getComputedStyle(input).maxHeight, 10) || 132;
        input.style.height = `${Math.min(input.scrollHeight, maxHeight)}px`;
        input.style.overflowY = input.scrollHeight > maxHeight ? 'auto' : 'hidden';
    }

    initDOM() {
        // Event listeneri za slanje poruka
        const btnGlobalSend = document.getElementById('btn-global-send');
        if (btnGlobalSend) {
            btnGlobalSend.addEventListener('click', () => this.send());
            btnGlobalSend.addEventListener('touchend', (e) => { e.preventDefault(); this.send(); });
        }

        const inputGlobalChat = document.getElementById('global-chat-input');
        if (inputGlobalChat) {
            inputGlobalChat.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    this.send();
                }
            });
            
            // Dinamički brojač karaktera
            inputGlobalChat.addEventListener('input', (e) => {
                this.clearStatus();
                this.resizeInput(e.target);
                const charCountEl = document.getElementById('global-chat-char-count');
                if (charCountEl) {
                    charCountEl.innerText = `${e.target.value.length}/550`;
                }
            });
            this.resizeInput(inputGlobalChat);
        }
    }

    initViewportTracking() {
        this.updateViewportVars();
        window.addEventListener('resize', this.updateViewportVars);
        window.addEventListener('orientationchange', this.updateViewportVars);
        if (window.visualViewport) {
            window.visualViewport.addEventListener('resize', this.updateViewportVars);
            window.visualViewport.addEventListener('scroll', this.updateViewportVars);
        }
    }

    updateViewportVars() {
        const root = document.documentElement;
        const viewport = window.visualViewport;
        const height = viewport ? viewport.height : window.innerHeight;
        const top = viewport ? viewport.offsetTop : 0;

        root.style.setProperty('--global-chat-height', `${Math.max(320, Math.round(height))}px`);
        root.style.setProperty('--global-chat-top', `${Math.round(top)}px`);
    }

    showReadyError(reason) {
        const connectionErrors = new Set(['sys_no_conn', 'err_server_conn', 'err_friend_timeout', 'socket_disconnected', 'connect_error']);
        this.showStatus(connectionErrors.has(reason) ? 'sys_no_conn' : 'err_chat_auth_required');
    }

    renderHistoryState(state = 'empty') {
        const body = document.getElementById('global-chat-body');
        if (!body) return;
        const isLoading = state === 'loading';
        const key = isLoading ? 'global_chat_loading' : 'global_chat_empty';
        const fallback = isLoading ? 'Učitavam poruke...' : 'Još nema poruka. Započnite razgovor.';
        body.innerHTML = `
            <div class="global-chat-welcome global-chat-state${isLoading ? ' is-loading' : ''}" data-chat-state="${isLoading ? 'loading' : 'empty'}">
                <img class="global-chat-state-soft-clay-icon global-chat-state-soft-clay-icon-easter" src="assets/easter-soft-clay/global-chat-empty-pro.png?v=1" alt="" aria-hidden="true" decoding="async">
                <img class="global-chat-state-soft-clay-icon-desert" src="assets/desert-soft-clay/global-chat-empty-pro.png?v=1" alt="" aria-hidden="true" decoding="async">
                <img class="global-chat-state-soft-clay-icon-nebula" src="assets/severna-soft-clay/global-chat-empty-pro.png?v=1" alt="" aria-hidden="true" decoding="async">
                <span>${this.gt(key) || fallback}</span>
            </div>`;
    }

    renderWelcome() {
        const body = document.getElementById('global-chat-body');
        if (!body) return;
        body.innerHTML = `<div class="global-chat-welcome" data-lang="global_chat_welcome">${this.gt('global_chat_welcome') || 'Dobrodošli u Globalni Chat! Budite pristojni.'}</div>`;
    }

    waitForSocketConnection(timeoutMs = 8000) {
        if (!this.app.socket) return Promise.resolve({ ok: false, reason: 'sys_no_conn' });
        if (this.app.socket.connected) return Promise.resolve({ ok: true });
        if (typeof this.app.waitForSocketConnection === 'function') {
            return this.app.waitForSocketConnection(timeoutMs);
        }

        return new Promise(resolve => {
            let settled = false;
            const finish = (payload) => {
                if (settled) return;
                settled = true;
                clearTimeout(timer);
                this.app.socket.off('connect', onConnect);
                this.app.socket.off('connect_error', onError);
                resolve(payload);
            };
            const onConnect = () => finish({ ok: true });
            const onError = () => finish({ ok: false, reason: 'connect_error' });
            const timer = setTimeout(() => finish({ ok: false, reason: 'sys_no_conn' }), timeoutMs);
            this.app.socket.once('connect', onConnect);
            this.app.socket.once('connect_error', onError);
            if (this.app.socket.disconnected) this.app.socket.connect();
        });
    }

    async ensureChatReady(timeoutMs = 8000) {
        if (!this.app.requireLogin()) {
            this.showStatus('err_chat_auth_required');
            return false;
        }

        this.app.initSocketConnection();
        if (!this.app.socket) {
            this.showStatus('sys_no_conn');
            return false;
        }

        const ready = await this.waitForSocketConnection(timeoutMs);
        if (!ready || !ready.ok) {
            this.showReadyError(ready?.reason || 'sys_no_conn');
            return false;
        }

        const currentUid = localStorage.getItem('yamb_uid') || this.app.playerId || '';
        const currentName = this.app.playerName || localStorage.getItem('yamb_player_name') || '';
        if (currentUid &&
            this.chatReadyUid === currentUid &&
            this.chatReadyName === currentName &&
            this.app.socketVerifiedUid === currentUid) {
            return true;
        }

        const authTimeoutMs = Math.min(timeoutMs, 5000);
        if (typeof this.app.emitPlayerData === 'function') {
            const authResult = await this.app.emitPlayerData(false, { timeoutMs: authTimeoutMs });
            if (!authResult || !authResult.ok) {
                this.showReadyError(authResult?.reason || 'err_chat_auth_required');
                return false;
            }
            this.chatReadyUid = authResult.uid || currentUid;
            this.chatReadyName = currentName;
            return true;
        }

        if (typeof this.app.authenticateSocketIdentity === 'function') {
            const authResult = await this.app.authenticateSocketIdentity(false);
            if (!authResult || !authResult.ok) {
                this.showReadyError(authResult?.reason || 'err_chat_auth_required');
                return false;
            }
            this.chatReadyUid = authResult.uid || currentUid;
            this.chatReadyName = currentName;
        }

        return true;
    }

    async open() {
        if (!this.app.requireLogin()) return;

        this.app.initSocketConnection();
        const accepted = localStorage.getItem('yamb_chat_rules_accepted');

        const pokreniChat = async () => {
            const overlay = document.getElementById('global-chat-overlay');
            if (overlay) overlay.style.display = 'flex';
            this.updateViewportVars();
            this.resizeInput();
            this.clearStatus();
            this.renderHistoryState('loading');

            const ready = await this.ensureChatReady();
            if (ready && this.app.socket && this.app.socket.connected) {
                this.app.socket.emit('request_global_chat_history');
            } else {
                this.renderHistoryState('empty');
            }
        };

        if (!accepted) {
            const isConfirmed = await this.app.modal.confirm(this.gt('chat_rules_msg'));
            if (isConfirmed) {
                localStorage.setItem('yamb_chat_rules_accepted', 'true');
                await pokreniChat();
            }
        } else {
            await pokreniChat();
        }
    }

    async close(skipAd = false) {
        const overlay = document.getElementById('global-chat-overlay');
        if (overlay) overlay.style.display = 'none';
        document.documentElement.style.removeProperty('--global-chat-top');

        if (!skipAd && this.app.adMob && this.app.adMob.showInterstitial) {
            await this.app.adMob.showInterstitial();
        }
    }

    isOpen() {
        const overlay = document.getElementById('global-chat-overlay');
        return !!overlay && overlay.style.display !== 'none';
    }

    clearStatus() {
        const statusEl = document.getElementById('global-chat-status');
        if (!statusEl) return;
        statusEl.innerText = "";
        statusEl.style.display = "none";
    }

    showStatus(messageKey) {
        const statusEl = document.getElementById('global-chat-status');
        if (!statusEl) return;
        statusEl.innerText = this.gt(messageKey);
        statusEl.style.display = "block";
    }

    handleError(messageKey) {
        const chatErrors = new Set(['err_chat_slow_down', 'err_chat_suspended', 'err_chat_banned', 'err_chat_auth_required']);
        if (!chatErrors.has(messageKey) || !this.isOpen()) return false;
        this.showStatus(messageKey);
        return true;
    }

    async reportMessage(messageId) {
        if (!messageId) {
            this.showStatus('sys_no_conn');
            return;
        }

        const confirmed = await this.app.modal.confirm(this.gt('chat_report_confirm'));
        if (!confirmed) return;

        const ready = await this.ensureChatReady();
        if (!ready) return;

        this.app.socket.emit('report_global_chat_msg', { messageId });
    }

    appendMessage(sender, text, type, senderId = null, skipSound = false, senderUid = null, createdAt = null, messageId = null) { 
        const body = document.getElementById('global-chat-body'); 
        if (!body) return;
        const sec = window.YambSecurity;
        
        const sada = Date.now();
        // Sprečavanje spama
        if (this.lastGlobalMsg && 
            this.lastGlobalMsg.text === text && 
            this.lastGlobalMsg.sender === sender && 
            (sada - this.lastGlobalMsg.time < 1000)) {
            return; 
        }
        this.lastGlobalMsg = { text, sender, time: sada };

        const stateMessage = body.querySelector('[data-chat-state]');
        if (stateMessage) stateMessage.remove();

        const msgDiv = document.createElement('div'); 
        msgDiv.className = `msg-bubble ${type}`; 
        if (messageId) msgDiv.dataset.chatId = String(messageId);
        
        const safeSender = sec.escapeHtml(sender);
        const safeText = sec.escapeHtml(text);
        let nameHtml = `<strong>${safeSender}:</strong>`;
        const myUid = localStorage.getItem('yamb_uid');
        const canChallenge = (senderId || senderUid) &&
            senderId !== (this.app.socket ? this.app.socket.id : null) &&
            (!senderUid || senderUid !== myUid) &&
            sender !== this.gt('sys_name') &&
            type === "msg-incoming";
        if (canChallenge) {
            const handler = sec.escapeAttr(`window.app.challengePlayer(${sec.jsString(senderId)}, ${sec.jsString(sender)}, ${sec.jsString(senderUid)})`);
            const title = sec.escapeAttr(this.gt('tooltip_challenge') || 'Izazovi na duel ⚔️');
            nameHtml = `<strong style="cursor:pointer; color:var(--gold-main); text-decoration:underline;" onclick="${handler}" title="${title}">${safeSender}:</strong>`;
        }
        
        let timeHtml = "";
        if (createdAt) {
            const parsedTime = new Date(createdAt);
            if (!Number.isNaN(parsedTime.getTime())) {
                const safeTime = sec.escapeHtml(parsedTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
                timeHtml = `<span>${safeTime}</span>`;
            }
        }

        let reportHtml = "";
        if (messageId && type === "msg-incoming") {
            const reportTitle = sec.escapeAttr(this.gt('chat_report_action'));
            const handler = sec.escapeAttr(`window.app.globalChat.reportMessage(${sec.jsString(messageId)})`);
            reportHtml = `<button type="button" class="global-chat-report-btn" onclick="${handler}" title="${reportTitle}" aria-label="${reportTitle}">!</button>`;
        }

        const metaHtml = (timeHtml || reportHtml) ? `<div class="global-chat-meta">${timeHtml}${reportHtml}</div>` : "";
        msgDiv.innerHTML = `${nameHtml} ${safeText}${metaHtml}`;
        body.appendChild(msgDiv); 
        body.scrollTop = body.scrollHeight; 
        
        if (type === "msg-incoming" && this.app.soundMgr && !skipSound) {
            this.app.soundMgr.chat(); 
        }
    }

    async send() {
        const input = document.getElementById('global-chat-input'); 
        let text = input.value.trim(); 
        if (!text) return; 
        this.clearStatus();

        const ready = await this.ensureChatReady();
        if (!ready) return;

        if (!this.app.socket || !this.app.socket.connected) {
            this.showStatus('sys_no_conn');
            return;
        }
        
        input.value = ""; 
        this.resizeInput(input);
        
        const charCountEl = document.getElementById('global-chat-char-count');
        if (charCountEl) charCountEl.innerText = "0/550";
        
        this.app.socket.emit('global_chat_msg', { msg: text });
    }

    // Funkcija koja vezuje Socket listener-e za Globalni chat
    bindSocket(socket) {
        if (!socket) return;

        socket.off('global_chat_msg');
        socket.on('global_chat_msg', (data) => {
            const myUid = localStorage.getItem('yamb_uid');
            const isMe = (data.senderId === socket.id) || (data.senderUid && data.senderUid === myUid);
            this.appendMessage(data.sender, data.msg, isMe ? "msg-outgoing" : "msg-incoming", data.senderId, false, data.senderUid, data.createdAt, data.id);
        });

        socket.off('global_chat_history');
        socket.on('global_chat_history', (history) => {
            const body = document.getElementById('global-chat-body');
            if (!body) return;

            const messages = Array.isArray(history) ? history : [];
            if (messages.length === 0) {
                this.renderHistoryState('empty');
                return;
            }

            this.renderWelcome();
            messages.forEach(data => {
                const myUid = localStorage.getItem('yamb_uid');
                const isMe = (data.senderId === socket.id) || (data.senderUid && data.senderUid === myUid);
                this.appendMessage(data.sender, data.msg, isMe ? "msg-outgoing" : "msg-incoming", data.senderId, true, data.senderUid, data.createdAt, data.id);
            });
        });

        socket.off('global_chat_report_result');
        socket.on('global_chat_report_result', (result = {}) => {
            this.showStatus(result.reason || (result.ok ? 'chat_report_sent' : 'err_server_conn'));
        });
    }
}
