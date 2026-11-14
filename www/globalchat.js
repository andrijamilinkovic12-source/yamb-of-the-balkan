// globalchat.js - GLOBAL CHAT MANAGER

class GlobalChatManager {
    constructor(app) {
        this.app = app;
        this.lastGlobalMsg = null;
        this.chatReadyUid = null;
        this.chatReadyName = null;
        this.activityUid = '';
        this.activityMessages = [];
        this.readCursor = null;
        this.activityLoaded = false;
        this.historyReady = false;
        this.historyPending = false;
        this.typingUids = [];
        this.lastTypingAt = 0;
        this.messagesById = new Map();
        this.editingMessage = null;
        this.mutationPending = false;
        this.updateViewportVars = this.updateViewportVars.bind(this);
        this.initDOM();
        this.initViewportTracking();
        this.syncActivityIdentity();
        this.moderation = typeof window.GlobalChatModeration === 'function' ? new window.GlobalChatModeration(this) : null;
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState !== 'visible') return this.stopTyping();
            this.requestActivity();
            this.requestHistory();
        });
        window.addEventListener('yamb:languageChanged', () => { this.renderActivity(); this.syncEditor(); });
    }

    syncActivityIdentity() {
        const uid = localStorage.getItem('yamb_uid') || '';
        if (uid !== this.activityUid) {
            this.moderation?.resetForIdentity(uid);
            this.cancelEdit();
            this.messagesById.clear();
            this.stopTyping();
            clearTimeout(this.typingExpiryTimer);
            this.activityUid = uid;
            this.activityMessages = [];
            this.activityLoaded = false;
            this.historyReady = false;
            this.historyPending = false;
            this.typingUids = [];
            this.readCursor = null;
            try {
                const saved = JSON.parse(localStorage.getItem(`yamb_global_chat_read_${uid}`));
                if (uid && saved?.v === 1 && Number.isFinite(saved.at) && Array.isArray(saved.ids)) {
                    this.readCursor = { at: saved.at, ids: saved.ids.filter(id => typeof id === 'string').slice(-50) };
                }
            } catch (_) { /* An unavailable cache must never block the room. */ }
        }
        this.renderActivity();
    }

    activityText(key, count) {
        const translated = this.gt(key);
        return (translated && translated !== key ? translated : key).replace('{0}', String(count ?? ''));
    }

    isViewingMessages() {
        return document.visibilityState === 'visible' && this.isOpen() && !this.moderation?.opened;
    }

    normalizeActivity(messages) {
        const unique = new Map();
        for (const message of Array.isArray(messages) ? messages : []) {
            if (!message || typeof message.id !== 'string' || !message.id || !Number.isFinite(message.createdAt)) continue;
            unique.set(message.id, { id: message.id, senderUid: message.senderUid || '', createdAt: message.createdAt });
        }
        return [...unique.values()].sort((a, b) => a.createdAt - b.createdAt).slice(-50);
    }

    saveReadCursor() {
        if (!this.activityUid || !this.readCursor) return;
        try {
            localStorage.setItem(`yamb_global_chat_read_${this.activityUid}`, JSON.stringify({ v: 1, ...this.readCursor }));
        } catch (_) { /* Keep the in-memory cursor when storage is full. */ }
    }

    markMessagesRead() {
        if (!this.activityUid || !this.activityLoaded) return;
        const at = this.activityMessages.at(-1)?.createdAt || 0;
        const ids = this.activityMessages.filter(message => message.createdAt === at).map(message => message.id);
        if (this.readCursor?.at !== at || JSON.stringify(this.readCursor?.ids) !== JSON.stringify(ids)) {
            this.readCursor = { at, ids };
            this.saveReadCursor();
        }
        this.renderActivity();
    }

    unreadCount() {
        if (!this.activityUid || !this.readCursor) return 0;
        return this.activityMessages.filter(message => message.senderUid !== this.activityUid &&
            (message.createdAt > this.readCursor.at ||
             (message.createdAt === this.readCursor.at && !this.readCursor.ids.includes(message.id)))).length;
    }

    renderActivity() {
        const button = document.querySelector('.main-global-chat-btn');
        if (!button) return;
        const badge = document.getElementById('global-chat-unread');
        const dots = document.getElementById('global-chat-typing');
        const count = this.unreadCount();
        const typing = !!this.activityUid && this.typingUids.some(uid => uid !== this.activityUid);
        const connected = !!this.app.socket?.connected;
        const state = count ? 'unread' : !connected ? 'offline' : !this.activityLoaded ? 'syncing' : typing ? 'typing' : 'current';
        button.dataset.chatActivity = state;
        if (badge) {
            badge.hidden = !this.activityUid;
            badge.dataset.state = state;
            badge.textContent = count ? count > 99 ? '99+' : String(count) :
                state === 'offline' ? '?' : state === 'syncing' ? '…' : '0';
        }
        if (dots) dots.hidden = !typing || !connected;
        let status = this.activityText(count ? 'global_chat_unread_count' :
            !connected ? 'global_chat_indicator_offline' :
            !this.activityLoaded ? 'global_chat_indicator_syncing' : 'global_chat_all_read', count);
        if (count && !connected) status += ` · ${this.activityText('global_chat_indicator_offline')}`;
        if (typing && connected) status += ` · ${this.activityText('global_chat_someone_typing')}`;
        const label = `${this.gt('ui_global_chat_title')} · ${status}`;
        button.setAttribute('aria-label', label);
        button.title = label;
        const roomTyping = document.getElementById('global-chat-typing-status');
        if (roomTyping) {
            roomTyping.hidden = !typing || !connected;
            roomTyping.textContent = this.activityText('global_chat_someone_typing');
        }
    }

    requestActivity() {
        this.syncActivityIdentity();
        if (this.activityUid && this.app.socket?.connected) this.app.socket.emit('request_global_chat_activity');
    }

    requestHistory() {
        if (!this.isOpen() || !this.app.socket?.connected || this.historyPending) return;
        this.historyReady = false;
        this.historyPending = true;
        this.app.socket.emit('request_global_chat_history');
    }

    receiveActivity(messages) {
        this.syncActivityIdentity();
        if (!this.activityUid) return;
        this.activityMessages = this.normalizeActivity(messages);
        this.activityLoaded = true;
        // First use starts at the current history; later visits preserve the account's read position.
        if (!this.readCursor) this.markMessagesRead();
        else this.renderActivity();
    }

    receiveMessage(data, socket) {
        this.syncActivityIdentity();
        if (!this.activityUid || !data) return;
        if (!this.readCursor && Number.isFinite(data.createdAt)) {
            this.readCursor = { at: data.createdAt - 1, ids: [] };
            this.saveReadCursor();
        }
        this.activityMessages = this.normalizeActivity([...this.activityMessages, data]);
        this.activityLoaded = true;
        const isMe = data.senderUid === this.activityUid || data.senderId === socket.id;
        if (this.isOpen()) {
            this.appendMessage(data.sender, data.msg, isMe ? 'msg-outgoing' : 'msg-incoming',
                data.senderId, !this.isViewingMessages(), data.senderUid, data.createdAt, data.id, data.editedAt, data.revision);
            if (this.historyReady && this.isViewingMessages()) this.markMessagesRead();
        }
        if (data.senderUid) this.typingUids = this.typingUids.filter(uid => uid !== data.senderUid);
        this.renderActivity();
    }

    updateTyping() {
        if (this.moderation?.isRestricted()) return this.stopTyping();
        const input = document.getElementById('global-chat-input');
        if (!this.isViewingMessages() || !input?.value.trim()) return this.stopTyping();
        if (!this.app.socket?.connected || this.app.socketVerifiedUid !== this.activityUid) return;
        const now = Date.now();
        if (!this.lastTypingAt || now - this.lastTypingAt >= 2500) {
            this.app.socket.emit('global_chat_typing', { active: true });
            this.lastTypingAt = now;
        }
        clearTimeout(this.stopTypingTimer);
        this.stopTypingTimer = setTimeout(() => this.stopTyping(), 3500);
    }

    stopTyping() {
        clearTimeout(this.stopTypingTimer);
        if (this.lastTypingAt && this.app.socket?.connected) this.app.socket.emit('global_chat_typing', { active: false });
        this.lastTypingAt = 0;
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
        document.getElementById('btn-global-cancel-edit')?.addEventListener('click', () => this.cancelEdit());
        document.querySelector('.main-global-chat-btn')?.addEventListener('keydown', event => {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                this.app.openGlobalChat();
            }
        });
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
                this.updateTyping();
                this.resizeInput(e.target);
                const charCountEl = document.getElementById('global-chat-char-count');
                if (charCountEl) {
                    charCountEl.innerText = `${e.target.value.length}/550`;
                }
            });
            this.resizeInput(inputGlobalChat);
            inputGlobalChat.addEventListener('blur', () => this.stopTyping());
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
        // Green overlays must follow the actual visible area when the keyboard is open.
        root.style.setProperty('--green-visible-viewport-height', `${Math.max(1, Math.round(height))}px`);
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
            <div class="global-chat-welcome global-chat-state${isLoading ? ' is-loading' : ''}" data-chat-state="${isLoading ? 'loading' : 'empty'}" role="status" aria-live="polite">
                <img class="global-chat-state-soft-clay-icon-green theme-chat-state-icon" data-theme-src="assets/green-soft-clay/global-chat-empty-v1.png?v=opt2" loading="lazy" alt="" aria-hidden="true" decoding="async">
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
            this.moderation?.close();
            void this.moderation?.refreshCapabilities();
            const overlay = document.getElementById('global-chat-overlay');
            if (overlay) overlay.style.display = 'flex';
            this.openedAt = Date.now();
            this.updateViewportVars();
            this.resizeInput();
            this.clearStatus();
            this.historyReady = false;
            this.historyPending = false;
            this.renderHistoryState('loading');

            const ready = await this.ensureChatReady();
            if (ready && this.app.socket && this.app.socket.connected) {
                this.requestActivity();
                this.requestHistory();
            } else {
                this.renderHistoryState('empty');
            }
        };

        if (!accepted) {
            const isConfirmed = await this.app.modal.confirm(this.gt('chat_rules_msg'), { contextClass: 'global-chat' });
            if (isConfirmed) {
                localStorage.setItem('yamb_chat_rules_accepted', 'true');
                await pokreniChat();
            }
        } else {
            await pokreniChat();
        }
    }

    async close(skipAd = false) {
        this.moderation?.close();
        this.stopTyping();
        this.cancelEdit();
        this.historyReady = false;
        this.historyPending = false;
        const overlay = document.getElementById('global-chat-overlay');
        const wasOpen = !!overlay && overlay.style.display !== 'none';
        const viewedLongEnough = Date.now() - (this.openedAt || 0) >= 8000;
        if (overlay) overlay.style.display = 'none';
        this.openedAt = 0;
        document.documentElement.style.removeProperty('--global-chat-top');

        if (!skipAd && wasOpen && viewedLongEnough && this.app.adMob && this.app.adMob.showInterstitial) {
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

    showStatus(messageKey, tone = 'error') {
        const statusEl = document.getElementById('global-chat-status');
        if (statusEl) statusEl.dataset.tone = tone;
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

        const reason = await this.app.modal.prompt(this.gt('chat_mod_report_prompt'), { contextClass: 'global-chat', cancellable: true });
        if (reason == null) return;

        const ready = await this.ensureChatReady();
        if (!ready) return;

        this.app.socket.emit('report_global_chat_msg', { messageId, reason: String(reason).trim().slice(0, 300) });
    }

    getMessageElement(id) {
        return [...(document.getElementById('global-chat-body')?.querySelectorAll('[data-chat-id]') || [])]
            .find(element => element.dataset.chatId === id);
    }

    beginEdit(id) {
        if (this.mutationPending) return;
        const message = this.messagesById.get(id);
        if (!message || message.senderUid !== localStorage.getItem('yamb_uid')) return;
        const input = document.getElementById('global-chat-input');
        if (!input) return;
        const draftBefore = this.editingMessage?.draftBefore ?? input.value;
        this.editingMessage = { id, revision: message.revision || 0, draftBefore };
        input.value = message.msg;
        this.clearStatus();
        this.syncEditor();
        this.resizeInput(input);
        input.focus();
    }

    cancelEdit(restoreDraft = true) {
        if (this.editingMessage) {
            const input = document.getElementById('global-chat-input');
            if (input && restoreDraft) input.value = this.editingMessage.draftBefore;
            this.editingMessage = null;
            this.syncEditor();
            this.resizeInput(input);
        }
    }

    syncEditor() {
        const restricted = !!this.moderation?.isRestricted();
        const editing = document.getElementById('global-chat-editing');
        if (editing) editing.hidden = !this.editingMessage;
        const input = document.getElementById('global-chat-input');
        if (input) input.readOnly = this.mutationPending || restricted;
        const count = document.getElementById('global-chat-char-count');
        if (count && input) count.textContent = `${input.value.length}/550`;
        const send = document.getElementById('btn-global-send');
        if (send) {
            const key = this.editingMessage ? 'chat_save_edit' : 'aria_send_message';
            send.setAttribute('aria-label', this.gt(key));
            send.dataset.langAria = key;
            send.title = this.gt(key);
            send.disabled = this.mutationPending || restricted;
        }
        document.getElementById('global-chat-overlay')?.querySelectorAll('.global-chat-message-action, #btn-global-cancel-edit')
            .forEach(button => { button.disabled = this.mutationPending || (restricted && button.dataset.lang === 'chat_edit_action'); });
    }

    async mutateMessage(event, payload) {
        if (this.mutationPending) return { ok: false, reason: 'err_chat_slow_down' };
        const uid = localStorage.getItem('yamb_uid');
        this.mutationPending = true;
        this.syncEditor();
        try {
            if (!await this.ensureChatReady() || uid !== localStorage.getItem('yamb_uid'))
                return { ok: false, reason: 'err_chat_auth_required' };
            const socket = this.app.socket;
            if (!socket?.connected) return { ok: false, reason: 'sys_no_conn' };
            return await new Promise(resolve => {
                let done = false;
                const finish = result => {
                    if (done) return;
                    done = true;
                    clearTimeout(timer);
                    socket.off('disconnect', disconnected);
                    resolve(uid === localStorage.getItem('yamb_uid') ? result : { ok: false, reason: 'err_chat_auth_required' });
                };
                const disconnected = () => finish({ ok: false, reason: 'sys_no_conn' });
                const timer = setTimeout(() => finish({ ok: false, reason: 'err_chat_save_failed' }), 8000);
                socket.on('disconnect', disconnected);
                socket.emit(event, payload, result => finish(result && typeof result.ok === 'boolean'
                    ? result : { ok: false, reason: 'err_chat_save_failed' }));
            });
        } catch (_) { return { ok: false, reason: 'err_chat_save_failed' }; }
        finally { this.mutationPending = false; this.syncEditor(); }
    }

    async saveEditedMessage() {
        const editing = this.editingMessage;
        if (!editing || this.mutationPending) return;
        const text = document.getElementById('global-chat-input')?.value.trim() || '';
        if (!text || text.length > 550) return this.showStatus('err_chat_edit_length');
        this.stopTyping();
        const result = await this.mutateMessage('edit_global_chat_msg', { messageId: editing.id, revision: editing.revision, msg: text });
        if (result.ok) {
            if (result.message) this.receiveMessageUpdate(result.message);
            if (this.editingMessage === editing) this.cancelEdit();
            this.showStatus('chat_edit_saved', 'success');
        } else {
            this.showStatus(result.reason || 'err_chat_save_failed');
            this.requestHistory();
        }
    }

    async deleteMessage(id) {
        if (this.mutationPending || this.deletePromptOpen) return;
        const message = this.messagesById.get(id);
        const uid = localStorage.getItem('yamb_uid');
        if (!message || message.senderUid !== uid) return;
        this.deletePromptOpen = true;
        let confirmed;
        try { confirmed = await this.app.modal.confirm(this.gt('chat_delete_confirm'), { contextClass: 'global-chat' }); }
        finally { this.deletePromptOpen = false; }
        if (!confirmed || uid !== localStorage.getItem('yamb_uid')) return;
        if (this.editingMessage?.id === id) this.cancelEdit();
        const result = await this.mutateMessage('delete_global_chat_msg', { messageId: id, revision: message.revision || 0 });
        if (result.ok) {
            if (result.deleted) this.receiveMessageDelete(result.deleted);
            this.showStatus('chat_delete_saved', 'success');
        } else {
            this.showStatus(result.reason || 'err_chat_save_failed');
            this.requestHistory();
        }
    }

    receiveMessageUpdate(data) {
        if (!data || typeof data.id !== 'string' || typeof data.msg !== 'string') return;
        const current = this.messagesById.get(data.id);
        if (!current || (current.revision || 0) > (data.revision || 0)) return;
        const body = document.getElementById('global-chat-body');
        const old = this.getMessageElement(data.id);
        if (!body || !old || !this.isOpen()) {
            this.messagesById.set(data.id, { ...current, ...data });
            return;
        }
        const scrollTop = body.scrollTop;
        const element = this.appendMessage(data.sender, data.msg, current.type, data.senderId, true,
            data.senderUid, data.createdAt, data.id, data.editedAt, data.revision, true);
        if (element) old.replaceWith(element);
        body.scrollTop = scrollTop;
        this.syncEditor();
    }

    receiveMessageDelete(data) {
        if (!data || typeof data.id !== 'string') return;
        this.messagesById.delete(data.id);
        this.activityMessages = this.activityMessages.filter(message => message.id !== data.id);
        this.getMessageElement(data.id)?.remove();
        if (this.editingMessage?.id === data.id) {
            this.cancelEdit(false);
            this.showStatus('err_chat_message_missing');
        }
        if (this.isOpen() && !document.getElementById('global-chat-body')?.querySelector('.msg-bubble'))
            this.renderHistoryState('empty');
        this.renderActivity();
    }

    appendMessage(sender, text, type, senderId = null, skipSound = false, senderUid = null, createdAt = null, messageId = null, editedAt = 0, revision = 0, replace = false) {
        const body = document.getElementById('global-chat-body'); 
        if (!body) return;
        const sec = window.YambSecurity;
        if (messageId && !replace && this.getMessageElement(messageId)) return this.getMessageElement(messageId);
        
        const sada = Date.now();
        // Sprečavanje spama
        if (!messageId && this.lastGlobalMsg &&
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
        if (messageId) this.messagesById.set(messageId, { id: messageId, sender, msg: text, type, senderId, senderUid, createdAt, editedAt, revision });
        
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

        let actions = '';
        if (messageId && senderUid && senderUid === myUid) {
            actions = `<span class="global-chat-message-actions">${[['chat_edit_action', 'beginEdit'], ['chat_delete_action', 'deleteMessage']].map(([key, method]) => {
                const handler = sec.escapeAttr(`window.app.globalChat.${method}(${sec.jsString(messageId)})`);
                return `<button type="button" class="global-chat-message-action" data-lang="${key}" onclick="${handler}"${this.mutationPending ? ' disabled' : ''}>${sec.escapeHtml(this.gt(key))}</button>`;
            }).join('')}</span>`;
        }
        const edited = editedAt ? `<span class="global-chat-edited" data-lang="chat_edited">${sec.escapeHtml(this.gt('chat_edited'))}</span>` : '';
        const metaHtml = (timeHtml || reportHtml || actions || edited) ? `<div class="global-chat-meta">${timeHtml}${edited}${reportHtml}${actions}</div>` : '';
        msgDiv.innerHTML = `${nameHtml} <span class="global-chat-message-text">${safeText}</span>${metaHtml}`;
        body.appendChild(msgDiv); 
        body.scrollTop = body.scrollHeight; 
        
        if (type === "msg-incoming" && this.app.soundMgr && !skipSound) {
            this.app.soundMgr.chat(); 
        }
        return msgDiv;
    }

    async send() {
        if (this.moderation?.isRestricted()) return this.showStatus('err_chat_suspended');
        if (this.mutationPending) return;
        if (this.editingMessage) return this.saveEditedMessage();
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
        this.stopTyping();
        input.value = ""; 
        this.resizeInput(input);
        
        const charCountEl = document.getElementById('global-chat-char-count');
        if (charCountEl) charCountEl.innerText = "0/550";
        
        this.app.socket.emit('global_chat_msg', { msg: text });
    }

    // Funkcija koja vezuje Socket listener-e za Globalni chat
    bindSocket(socket) {
        if (!socket) return;
        this.moderation?.bindSocket(socket);

        socket.off('global_chat_msg');
        socket.on('global_chat_msg', (data) => {
            this.receiveMessage(data, socket);
        });
        socket.off('global_chat_msg_updated');
        socket.on('global_chat_msg_updated', data => this.receiveMessageUpdate(data));
        socket.off('global_chat_msg_deleted');
        socket.on('global_chat_msg_deleted', data => this.receiveMessageDelete(data));

        socket.off('global_chat_activity');
        socket.on('global_chat_activity', (state = {}) => {
            if (state.uid !== localStorage.getItem('yamb_uid')) return;
            this.receiveActivity(state.messages);
            this.receiveTyping(state.typingUids);
            if (!this.historyReady) this.requestHistory();
        });
        socket.off('global_chat_typing');
        socket.on('global_chat_typing', (state = {}) => this.receiveTyping(state.uids));
        if (this.activitySocket !== socket) {
            if (this.activitySocket) {
                this.activitySocket.off('disconnect', this.activityDisconnect);
            }
            this.activitySocket = socket;
            this.activityDisconnect = () => {
                this.chatReadyUid = null;
                this.historyReady = false;
                this.historyPending = false;
                this.stopTyping();
                this.typingUids = [];
                this.syncActivityIdentity();
            };
            socket.on('disconnect', this.activityDisconnect);
        }
        this.requestActivity();

        socket.off('global_chat_history');
        socket.on('global_chat_history', (history) => {
            this.historyPending = false;
            this.receiveActivity(history);
            if (!this.isOpen()) return;
            const body = document.getElementById('global-chat-body');
            if (!body) return;

            const messages = Array.isArray(history) ? history : [];
            this.messagesById.clear();
            if (messages.length === 0) {
                if (this.editingMessage) this.cancelEdit(false);
                this.renderHistoryState('empty');
                this.historyReady = true;
                if (this.isViewingMessages()) this.markMessagesRead();
                return;
            }

            this.renderWelcome();
            this.lastGlobalMsg = null;
            messages.forEach(data => {
                const myUid = localStorage.getItem('yamb_uid');
                const isMe = (data.senderId === socket.id) || (data.senderUid && data.senderUid === myUid);
                this.appendMessage(data.sender, data.msg, isMe ? "msg-outgoing" : "msg-incoming", data.senderId, true, data.senderUid, data.createdAt, data.id, data.editedAt, data.revision);
            });
            if (this.editingMessage && !this.messagesById.has(this.editingMessage.id)) this.cancelEdit(false);
            this.historyReady = true;
            if (this.isViewingMessages()) this.markMessagesRead();
        });

        socket.off('global_chat_report_result');
        socket.on('global_chat_report_result', (result = {}) => {
            this.showStatus(result.reason || (result.ok ? 'chat_report_sent' : 'err_server_conn'), result.ok ? 'success' : 'error');
        });
        socket.off('global_chat_post_rejected');
        socket.on('global_chat_post_rejected', result => { if (this.isOpen()) this.showStatus(result?.reason || 'err_server_conn'); });
    }

    receiveTyping(uids) {
        this.typingUids = Array.isArray(uids) ? uids.filter(uid => typeof uid === 'string').slice(0, 200) : [];
        clearTimeout(this.typingExpiryTimer);
        if (this.typingUids.length) this.typingExpiryTimer = setTimeout(() => {
            this.typingUids = [];
            this.renderActivity();
        }, 6500);
        this.renderActivity();
    }
}
