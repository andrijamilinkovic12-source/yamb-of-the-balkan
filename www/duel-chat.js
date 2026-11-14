class DuelChat {
    constructor(app) {
        this.app = app;
        this.roomId = '';
        this.messages = new Map();
        this.unread = new Set();
        this.position = new WeakMap();
        this.launcher = document.getElementById('chat-float-btn');
        this.panel = document.getElementById('chat-window');
        this.body = document.getElementById('chat-body');
        this.input = document.getElementById('chat-input-field');
        this.sendButton = document.getElementById('btn-chat-send');
        this.toggleButton = document.getElementById('duel-chat-switch');
        this.status = document.getElementById('duel-chat-status');
        this.generation = 0;
        this.preferenceVersion = 0;
        this.legacyId = 0;
        this.launcher.addEventListener('click', () => this.setOpen(!this.open));
        document.getElementById('duel-chat-minimize').addEventListener('click', () => this.setOpen(false, true));
        this.toggleButton.addEventListener('click', () => this.changePreference());
        this.sendButton.addEventListener('click', () => void this.send());
        this.input.addEventListener('keydown', event => {
            if (event.key === 'Enter' && !event.isComposing) {
                event.preventDefault();
                void this.send();
            }
        });
        this.panel.addEventListener('keydown', event => {
            if (event.key === 'Escape' && this.open) this.setOpen(false, true);
        });
        this.drag(this.launcher, this.launcher, true);
        this.drag(this.panel, document.getElementById('duel-chat-handle'));
        const resize = () => this.layout();
        window.addEventListener('resize', resize);
        window.visualViewport?.addEventListener('resize', resize);
        window.visualViewport?.addEventListener('scroll', resize);
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') {
                if (this.open) this.markRead();
                void this.sync();
            }
        });
        window.addEventListener('yamb:languageChanged', () => {
            this.refreshControls();
            this.render();
        });
    }

    tr(key) { return t(key); }
    uid() { return localStorage.getItem('yamb_uid') || ''; }
    preferenceKey() { return 'yamb_duel_chat_disabled_' + this.uid(); }
    eligible() {
        return this.app.onlineMode && !this.app.isSpectator && this.app.modeTag === 'Online'
            && !!this.app.roomId && !String(this.app.roomId).startsWith('local_');
    }
    reset(roomId = '') {
        this.roomId = roomId;
        this.accountUid = this.uid();
        this.generation++;
        this.messages.clear();
        this.unread.clear();
        this.input.value = '';
        this.pending = false;
        this.preferencePending = true;
        this.enabled = this.uid() && localStorage.getItem(this.preferenceKey()) !== '1';
        this.supportsReports = false;
        this.matchId = '';
        this.setOpen(false);
        this.setStatus('');
        this.render();
    }
    navigate(screen) {
        const roomId = this.eligible() ? this.app.roomId : '';
        if (roomId !== this.roomId || this.accountUid !== this.uid()) this.reset(roomId);
        this.visible = screen === 'game-scene' && !!roomId && this.app.gameActive;
        this.launcher.classList.toggle('hidden', !this.visible);
        if (!this.visible) this.setOpen(false);
        else {
            this.refreshControls();
            this.layout();
            void this.sync();
        }
    }
    bind(socket) {
        if (socket === this.socket) return;
        if (this.socket) {
            for (const [event, listener] of this.socketListeners) this.socket.off(event, listener);
        }
        this.socket = socket;
        this.socketListeners = [
            ['duel_chat_message', data => this.receive(data)],
            ['chat_msg', data => {
                const entities = { amp: '&', lt: '<', gt: '>', quot: '"', '#39': "'" };
                const msg = data?.legacyEscaped && typeof data.msg === 'string'
                    ? data.msg.replace(/&(amp|lt|gt|quot|#39);/g, (_, key) => entities[key]) : data?.msg;
                this.receive({ ...data, msg });
            }],
            ['connect', () => { void this.sync(); }],
            ['disconnect', () => {
                this.preferencePending = true;
                this.refreshControls();
                if (this.open) this.setStatus('sys_no_conn');
            }]
        ];
        for (const [event, listener] of this.socketListeners) socket.on(event, listener);
    }
    async rpc(event, data) {
        const socket = this.app.socket;
        if (!socket?.connected) return { ok: false, reason: 'sys_no_conn' };
        return new Promise(resolve => socket.timeout(6500).emit(event, { roomId: this.roomId, ...data },
            (error, result) => resolve(error ? { ok: false, reason: 'sys_no_conn' }
                : result || { ok: false, reason: 'err_server_conn' })));
    }
    async sync() {
        if (!this.visible || !this.roomId || !this.app.socket?.connected || this.accountUid !== this.uid()) return;
        const generation = this.generation, preference = this.preferenceVersion;
        const result = await this.rpc('duel_chat_sync', { enabled: !!this.enabled });
        if (generation !== this.generation || preference !== this.preferenceVersion) return;
        if (!result.ok) {
            if (this.open) this.setStatus(result.reason || 'err_server_conn');
            return;
        }
        this.preferencePending = false;
        const newMatch = this.matchId && result.matchId && this.matchId !== result.matchId;
        if (newMatch) {
            this.messages.clear();
            this.unread.clear();
            this.input.value = '';
        }
        this.matchId = result.matchId || this.matchId;
        const firstSnapshot = !this.supportsReports || newMatch;
        this.supportsReports = true;
        if (this.enabled) for (const message of result.messages || []) this.receive(message, { silent: true, baseline: firstSnapshot });
        this.refreshControls();
        if (['sys_no_conn', 'duel_chat_inactive', 'duel_chat_wait'].includes(this.status.dataset.key)) this.setStatus('');
        if (this.open) this.render();
    }
    changePreference() {
        this.enabled = !this.enabled;
        this.preferenceVersion++;
        this.preferencePending = true;
        if (this.uid()) localStorage.setItem(this.preferenceKey(), this.enabled ? '0' : '1');
        if (!this.enabled) { this.input.blur(); this.unread.clear(); }
        this.setStatus(this.enabled ? 'duel_chat_wait' : '');
        this.refreshControls();
        this.render();
        void this.sync();
    }
    setStatus(key) {
        this.status.dataset.key = key;
        this.status.textContent = key ? this.tr(key) : '';
        this.status.hidden = !key;
    }
    setOpen(open, focus = false) {
        this.open = open && this.visible;
        this.panel.classList.toggle('active', this.open);
        this.panel.inert = !this.open;
        this.launcher.setAttribute('aria-expanded', String(this.open));
        if (this.open) {
            if (document.visibilityState === 'visible') this.markRead();
            this.layout();
            this.render();
            if (this.preferencePending) void this.sync();
        } else {
            this.input.blur();
            if (focus && this.visible) this.launcher.focus({ preventScroll: true });
        }
    }
    markRead() { this.unread.clear(); this.refreshControls(); }
    refreshControls() {
        const badge = document.getElementById('chat-badge');
        badge.hidden = !this.enabled || !this.unread.size;
        badge.textContent = String(this.unread.size);
        this.toggleButton.textContent = this.tr(this.enabled ? 'duel_chat_disable_action' : 'duel_chat_enable_action');
        document.getElementById('duel-chat-compose').hidden = !this.enabled;
        this.launcher.dataset.disabledChat = String(!this.enabled);
        this.launcher.setAttribute('aria-label', this.tr('duel_chat_title')
            + (this.unread.size ? ' · ' + this.tr('global_chat_unread_count').replace('{0}', this.unread.size) : ''));
        this.input.readOnly = this.pending;
        this.sendButton.disabled = this.pending || this.preferencePending || !this.app.socket?.connected;
    }
    receive(data, { silent = false, baseline = false } = {}) {
        if (!this.enabled || this.accountUid !== this.uid() || !this.eligible() || this.app.roomId !== this.roomId || data?.roomId !== this.roomId
            || typeof data.msg !== 'string' || (this.matchId && data.matchId && this.matchId !== data.matchId)) return;
        const id = data.id || 'old-' + ++this.legacyId;
        if (this.messages.has(id)) {
            if (data.reported === true) this.messages.get(id).reported = true;
            return;
        }
        const outgoing = data.senderUid === this.uid();
        this.messages.set(id, { ...data, outgoing, reportable: !outgoing && !!data.id });
        if (this.messages.size > 50) {
            const oldest = this.messages.keys().next().value;
            this.messages.delete(oldest);
            this.unread.delete(oldest);
        }
        if (!outgoing && !baseline && (!this.open || document.visibilityState !== 'visible')) {
            this.unread.add(id);
            if (this.visible && !silent && document.visibilityState === 'visible') this.app.soundMgr?.chat();
        }
        this.refreshControls();
        if (this.open) this.render();
    }
    render() {
        const wasNearBottom = this.body.scrollHeight - this.body.scrollTop - this.body.clientHeight < 42;
        this.body.replaceChildren();
        if (!this.enabled || !this.messages.size) {
            const state = document.createElement('p');
            state.className = 'duel-chat-empty';
            state.textContent = this.tr(this.enabled ? 'duel_chat_empty' : 'duel_chat_disabled');
            this.body.append(state);
            return;
        }
        const messages = [...this.messages.values()].sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
        for (const message of messages) {
            const bubble = document.createElement('article');
            bubble.className = 'msg-bubble ' + (message.outgoing ? 'msg-outgoing' : 'msg-incoming');
            const name = document.createElement('strong');
            name.textContent = this.tr(message.outgoing ? 'chat_you' : 'chat_opponent');
            const content = document.createElement('div');
            content.className = 'duel-chat-text';
            content.textContent = message.msg;
            bubble.append(name, content);
            if (message.reportable) {
                const report = document.createElement('button');
                report.type = 'button';
                report.className = 'duel-chat-report';
                report.textContent = this.tr(message.reported ? 'duel_chat_reported' : 'duel_chat_report');
                report.disabled = !!message.reported;
                report.addEventListener('click', () => void this.report(message));
                bubble.append(report);
            }
            this.body.append(bubble);
        }
        if (wasNearBottom) this.body.scrollTop = this.body.scrollHeight;
    }
    async send() {
        const text = this.input.value.trim();
        if (!text || this.pending || this.preferencePending || !this.enabled || !this.visible) return;
        const generation = this.generation;
        this.pending = true;
        this.refreshControls();
        this.setStatus('');
        try {
            const result = await this.rpc('chat_msg', { msg: text });
            if (generation !== this.generation) return;
            if (!result.ok) return this.setStatus(result.reason || 'err_server_conn');
            this.input.value = '';
            this.receive(result.message);
            this.body.scrollTop = this.body.scrollHeight;
        } finally {
            if (generation === this.generation) { this.pending = false; this.refreshControls(); }
        }
    }
    async report(message) {
        if (this.reporting || message.reported) return;
        const generation = this.generation;
        this.reporting = true;
        try {
            const reason = await this.app.modal.prompt(this.tr('chat_mod_report_prompt'), { contextClass: 'global-chat', cancellable: true });
            if (reason == null || generation !== this.generation || !this.visible) return;
            const result = await this.rpc('report_duel_chat_msg', { messageId: message.id, reason: reason.trim().slice(0, 300) });
            if (generation !== this.generation) return;
            if (!result.ok) return this.setStatus(result.reason || 'err_server_conn');
            message.reported = true;
            this.setStatus('duel_chat_reported');
            this.render();
        } finally { this.reporting = false; }
    }
    viewport() {
        const vv = window.visualViewport;
        const style = getComputedStyle(this.panel);
        const inset = key => Math.max(parseFloat(style.getPropertyValue('--duel-safe-' + key)) || 0,
            parseFloat(style.getPropertyValue('--safe-' + key)) || 0);
        return { x: (vv?.offsetLeft || 0) + inset('left'), y: (vv?.offsetTop || 0) + inset('top'),
            width: (vv?.width ?? innerWidth) - inset('left') - inset('right'),
            height: (vv?.height ?? innerHeight) - inset('top') - inset('bottom') };
    }
    place(element, left, top, viewport = this.viewport()) {
        const bounds = element.getBoundingClientRect(), inset = 8;
        const x = Math.min(Math.max(left, viewport.x + inset), Math.max(viewport.x + inset, viewport.x + viewport.width - bounds.width - inset));
        const y = Math.min(Math.max(top, viewport.y + inset), Math.max(viewport.y + inset, viewport.y + viewport.height - bounds.height - inset));
        Object.assign(element.style, { left: x + 'px', top: y + 'px', right: 'auto', bottom: 'auto' });
    }
    layout() {
        if (!this.visible) return;
        const viewport = this.viewport();
        this.panel.style.setProperty('--duel-viewport-width', viewport.width + 'px');
        this.panel.style.setProperty('--duel-viewport-height', viewport.height + 'px');
        const launcher = this.position.get(this.launcher);
        if (launcher) this.place(this.launcher, launcher.x, launcher.y, viewport);
        else {
            const anchor = this.launcher.getBoundingClientRect();
            this.place(this.launcher, viewport.x + viewport.width - anchor.width - 12,
                viewport.y + viewport.height - 145 - anchor.height, viewport);
        }
        if (!this.open) return;
        const position = this.position.get(this.panel), width = this.panel.offsetWidth, height = this.panel.offsetHeight;
        const anchor = this.launcher.getBoundingClientRect();
        this.place(this.panel, position?.x ?? anchor.right - width, position?.y ?? anchor.top - height - 8, viewport);
    }
    drag(element, handle, activateOnTouch = false) {
        let gesture;
        let suppressClick = false;
        handle.addEventListener('pointerdown', event => {
            if (!event.isPrimary || event.button !== 0) return;
            const rect = element.getBoundingClientRect();
            suppressClick = false;
            gesture = { id: event.pointerId, x: event.clientX, y: event.clientY, left: rect.left, top: rect.top, moved: false };
            handle.setPointerCapture(event.pointerId);
        });
        handle.addEventListener('pointermove', event => {
            if (gesture?.id !== event.pointerId) return;
            const dx = event.clientX - gesture.x, dy = event.clientY - gesture.y;
            if (!gesture.moved && Math.hypot(dx, dy) < 6) return;
            gesture.moved = true;
            const next = { x: gesture.left + dx, y: gesture.top + dy };
            this.place(element, next.x, next.y);
            const rect = element.getBoundingClientRect();
            this.position.set(element, { x: rect.left, y: rect.top });
        });
        const end = event => {
            if (gesture?.id !== event.pointerId) return;
            const touchTap = activateOnTouch && event.type === 'pointerup'
                && event.pointerType === 'touch' && !gesture.moved;
            suppressClick = gesture.moved || touchTap;
            gesture = null;
            if (touchTap) this.setOpen(!this.open);
        };
        handle.addEventListener('pointerup', end);
        handle.addEventListener('pointercancel', end);
        handle.addEventListener('lostpointercapture', end);
        handle.addEventListener('click', event => {
            if (suppressClick && event.detail) { event.preventDefault(); event.stopImmediatePropagation(); suppressClick = false; }
        }, true);
    }
}
