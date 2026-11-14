// The client only displays capabilities; every privileged operation is checked by the server.
(() => {
    const node = (tag, className, text) => {
        const element = document.createElement(tag);
        if (className) element.className = className;
        if (text != null) element.textContent = text;
        return element;
    };
    class GlobalChatModeration {
        constructor(manager) {
            this.manager = manager;
            this.tab = 'reports';
            this.rows = [];
            this.owner = false;
            this.opened = false;
            this.busy = false;
            this.restriction = null;
            this.identity = localStorage.getItem('yamb_uid') || '';
            document.getElementById('btn-chat-moderation')?.addEventListener('click', () => this.opened ? this.showChat() : this.open());
            document.querySelectorAll('[data-chat-mod-tab]').forEach(button => button.addEventListener('click', () => {
                if (this.busy) return;
                this.cancelDecision();
                this.tab = button.dataset.chatModTab;
                this.rows = [];
                this.nextOffset = null;
                this.renderRows();
                void this.load();
            }));
            document.getElementById('chat-mod-refresh')?.addEventListener('click', () => { if (!this.busy) void this.load(); });
            document.getElementById('chat-mod-more')?.addEventListener('click', () => { if (!this.busy && this.nextOffset != null) void this.load(true); });
            document.getElementById('chat-mod-cancel')?.addEventListener('click', () => this.cancelDecision());
            document.getElementById('chat-mod-submit')?.addEventListener('click', () => this.submit());
            window.addEventListener('yamb:languageChanged', () => { this.renderBar(); this.renderRows(); this.renderRestriction(); });
        }
        tr(key) { return this.manager.gt(key); }
        resetForIdentity(uid) {
            if (this.identity === uid) return;
            this.identity = uid;
            this.owner = false;
            this.rows = [];
            this.nextOffset = null;
            this.decision = null;
            this.busy = false;
            this.pending = 0;
            this.restriction = null;
            this.close();
            this.renderRows();
            this.renderBar();
            this.renderRestriction();
        }
        isRestricted() { return !!this.restriction && (this.restriction.permanent || this.restriction.until > Date.now()); }
        renderRestriction() {
            const element = document.getElementById('chat-moderation-restriction');
            if (element) {
                element.hidden = !this.isRestricted();
                element.textContent = this.isRestricted() ? `${this.tr('chat_mod_restricted')} ${this.restriction.permanent
                    ? this.tr('chat_mod_permanent') : this.date(this.restriction.until)}. ${this.reason(this.restriction.reason)}` : '';
            }
            clearTimeout(this.expiryTimer);
            if (this.isRestricted() && !this.restriction.permanent) this.expiryTimer = setTimeout(() => {
                this.renderRestriction(); void this.refreshCapabilities();
            }, Math.min(2147483647, Math.max(20, this.restriction.until - Date.now() + 50)));
            if (this.isRestricted()) this.manager.stopTyping();
            this.manager.syncEditor();
        }
        reason(value) { return value === 'chat_auto_profanity' ? this.tr('chat_auto_profanity') : value || ''; }
        date(value) { return value ? new Date(value).toLocaleString(localStorage.getItem('yamb_lang') === 'en' ? 'en-GB' : 'sr-Latn-RS') : ''; }
        renderBar() {
            const bar = document.getElementById('chat-owner-bar');
            if (bar) bar.hidden = !this.owner;
            const button = document.getElementById('btn-chat-moderation');
            if (button) button.textContent = this.opened ? this.tr('chat_mod_back') : `${this.tr('chat_mod_panel')}${this.pending ? ` (${this.pending})` : ''}`;
        }
        async rpc(event, data = {}) {
            const socket = this.manager.app.socket, uid = localStorage.getItem('yamb_uid');
            if (!uid || !socket?.connected) return { ok: false, reason: 'sys_no_conn' };
            return new Promise(resolve => {
                let settled = false;
                const finish = result => {
                    if (settled) return;
                    settled = true; clearTimeout(timer); socket.off('disconnect', disconnected);
                    resolve(uid === localStorage.getItem('yamb_uid') ? result : { ok: false, reason: 'err_chat_auth_required' });
                };
                const disconnected = () => finish({ ok: false, reason: 'sys_no_conn' });
                const timer = setTimeout(() => finish({ ok: false, reason: 'err_server_conn' }), 10000);
                socket.on('disconnect', disconnected);
                try { socket.emit(event, data, result => finish(result && typeof result.ok === 'boolean' ? result : { ok: false, reason: 'err_server_conn' })); }
                catch (_) { finish({ ok: false, reason: 'err_server_conn' }); }
            });
        }
        acceptCapabilities(data) {
            if (!data?.ok || data.uid !== localStorage.getItem('yamb_uid')) return;
            this.identity = data.uid;
            this.owner = data.owner === true;
            this.pending = Math.max(0, Number(data.pending) || 0);
            this.restriction = data.restriction || null;
            if (!this.owner) this.close();
            this.renderBar(); this.renderRestriction();
        }
        async refreshCapabilities() {
            if (this.refreshing || !this.manager.app.socket?.connected || !localStorage.getItem('yamb_uid')) return;
            this.refreshing = true;
            try { this.acceptCapabilities(await this.rpc('request_global_chat_moderation_capabilities')); }
            finally { this.refreshing = false; }
        }
        bindSocket(socket) {
            if (this.socket && this.socket !== socket) this.socket.off('connect', this.connectHandler);
            if (this.socket !== socket) {
                this.socket = socket;
                this.connectHandler = () => this.refreshCapabilities();
                socket.on('connect', this.connectHandler);
            }
            for (const event of ['global_chat_moderation_capabilities', 'global_chat_restriction', 'global_chat_moderation_changed', 'global_chat_moderation_notice']) socket.off(event);
            socket.on('global_chat_moderation_capabilities', data => this.acceptCapabilities(data));
            socket.on('global_chat_restriction', data => {
                if (data?.uid !== localStorage.getItem('yamb_uid')) return;
                this.restriction = data.restriction || null; this.renderRestriction();
            });
            socket.on('global_chat_moderation_changed', () => {
                if (!this.owner) return;
                void this.refreshCapabilities();
                if (this.opened && !this.busy && !this.decision) void this.load();
            });
            socket.on('global_chat_moderation_notice', data => {
                if (data?.uid === localStorage.getItem('yamb_uid')) this.manager.showStatus(`${this.tr('chat_mod_removed_notice')} ${data.reason || ''}`);
            });
            void this.refreshCapabilities();
        }
        close() {
            this.opened = false;
            const panel = document.getElementById('chat-moderation-panel');
            if (panel) panel.hidden = true;
            for (const id of ['global-chat-body', 'global-chat-footer']) { const element = document.getElementById(id); if (element) element.hidden = false; }
            this.cancelDecision(); this.renderBar();
        }
        showChat() { this.close(); this.manager.requestHistory(); }
        open() {
            if (!this.owner) return;
            this.manager.stopTyping(); this.manager.cancelEdit(); this.opened = true;
            document.getElementById('chat-moderation-panel').hidden = false;
            for (const id of ['global-chat-body', 'global-chat-footer']) document.getElementById(id).hidden = true;
            this.renderBar(); void this.load();
        }
        status(key, success = false) {
            const element = document.getElementById('chat-mod-status');
            if (element) { element.textContent = key ? this.tr(key) : ''; element.dataset.success = String(success); }
        }
        async load(more = false) {
            if (!this.owner) return;
            const tab = this.tab;
            const request = this.requestSequence = (this.requestSequence || 0) + 1;
            this.loading = true; this.status('global_chat_loading');
            try {
                const result = await this.rpc('request_global_chat_moderation', { tab, offset: more ? this.nextOffset : 0 });
                if (!this.opened || tab !== this.tab || request !== this.requestSequence) return;
                if (!result.ok) { this.status(result.reason); return; }
                this.rows = more ? [...this.rows, ...result.rows] : result.rows;
                this.nextOffset = result.nextOffset;
                this.renderRows(); this.status('');
            } finally { if (request === this.requestSequence) this.loading = false; }
        }
        actionButton(label, context) {
            const button = node('button', 'chat-mod-action', this.tr(label));
            button.type = 'button'; button.disabled = this.busy;
            button.addEventListener('click', () => this.startDecision(context));
            return button;
        }
        renderRows() {
            const list = document.getElementById('chat-mod-list');
            if (!list) return;
            list.replaceChildren();
            document.querySelectorAll('[data-chat-mod-tab]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.chatModTab === this.tab)));
            const more = document.getElementById('chat-mod-more'); if (more) more.hidden = this.nextOffset == null;
            if (!this.rows.length) list.append(node('p', 'chat-mod-empty', this.tr('chat_mod_empty')));
            for (const row of this.rows) {
                const card = node('article', 'chat-mod-card');
                const name = row.senderName || row.sender || row.playerName || this.tr('chat_mod_player');
                card.append(node('strong', '', name));
                const buttons = node('div', 'chat-mod-actions');
                if (this.tab === 'reports' || this.tab === 'messages') {
                    card.append(node('p', 'chat-mod-message', row.msg));
                    const current = this.tab === 'reports' ? row.currentMessage : row;
                    const context = { targetUid: row.senderUid, name, reportId: this.tab === 'reports' ? row._id : '' };
                    if (this.tab === 'reports') {
                        card.append(node('small', '', `${this.tr('chat_mod_reported_by')} ${row.reportedByName || ''} · ${this.date(row.reportedAt)}`));
                        if (row.reportReason) card.append(node('p', 'chat-mod-note', row.reportReason));
                        if (row.source === 'duel') card.append(node('p', 'chat-mod-note',
                            [this.tr('duel_chat_report_source'), row.duelMatchId || row.duelRoomId].filter(Boolean).join(' · ')));
                        else if (!current) card.append(node('p', 'chat-mod-note', this.tr('err_chat_message_missing')));
                        else if (current.msg !== row.msg) card.append(node('p', 'chat-mod-note', `${this.tr('chat_mod_current_text')} ${current.msg}`));
                        buttons.append(this.actionButton('chat_mod_resolve', { ...context, action: 'resolve' }), this.actionButton('chat_mod_dismiss', { ...context, action: 'dismiss' }));
                    }
                    if (current?.senderUid && current.senderUid !== 'system')
                        buttons.append(this.actionButton('chat_mod_remove', { ...context, action: 'delete', messageId: current.id, revision: current.revision || 0 }));
                    if (row.senderUid && ![this.identity, 'system'].includes(row.senderUid))
                        buttons.append(this.actionButton('chat_mod_mute', { ...context, action: 'mute' }));
                } else if (this.tab === 'bans') {
                    card.append(node('p', '', row.chatBanPermanent ? this.tr('chat_mod_permanent') : this.date(row.chatBanUntil)), node('p', 'chat-mod-message', this.reason(row.chatBanReason)));
                    buttons.append(this.actionButton('chat_mod_unmute', { action: 'unmute', targetUid: row.firebaseUid, name }));
                } else {
                    card.append(node('p', '', `${this.tr(`chat_mod_audit_${String(row.action).replace('manual_', '')}`)} · ${this.date(row.createdAt)}`),
                        node('p', 'chat-mod-message', row.reason), node('small', '', `${this.tr('chat_mod_actor')} ${row.actorName || ''}`));
                    if (row.originalMsg) card.append(node('p', 'chat-mod-note', row.originalMsg));
                    if (row.action === 'manual_mute') card.append(node('p', '', row.permanent
                        ? this.tr('chat_mod_permanent') : this.date(row.banUntil)));
                }
                if (buttons.children.length) card.append(buttons);
                list.append(card);
            }
        }
        startDecision(context) {
            if (this.busy) return;
            this.decision = context;
            document.getElementById('chat-mod-decision').hidden = false;
            document.getElementById('chat-mod-decision-title').textContent = `${this.tr(`chat_mod_audit_${context.action}`)} · ${context.name}`;
            document.getElementById('chat-mod-duration-wrap').hidden = context.action !== 'mute';
            document.getElementById('chat-mod-reason').value = '';
            document.getElementById('chat-mod-reason').focus({ preventScroll: true });
            this.status('');
        }
        cancelDecision() {
            if (this.busy) return;
            this.decision = null;
            const form = document.getElementById('chat-mod-decision'); if (form) form.hidden = true;
        }
        async submit() {
            if (!this.decision || this.busy) return;
            const context = this.decision;
            const reason = document.getElementById('chat-mod-reason').value.trim();
            if (reason.length < 3 || reason.length > 300) return this.status('err_chat_moderation_reason');
            this.busy = true;
            document.getElementById('chat-mod-submit').disabled = true;
            try {
                const accepted = await this.manager.app.modal.confirm(this.tr('chat_mod_confirm'), { contextClass: 'global-chat' });
                if (!accepted) return;
                const result = await this.rpc('global_chat_moderation_action', { ...context, reason,
                    duration: document.getElementById('chat-mod-duration').value });
                if (!result.ok) { this.status(result.reason); return; }
                this.busy = false; this.cancelDecision();
                await this.load(); void this.refreshCapabilities(); this.status('chat_mod_saved', true);
            } catch (_) { this.status('err_server_conn'); }
            finally {
                this.busy = false;
                document.getElementById('chat-mod-submit').disabled = false;
            }
        }
    }
    window.GlobalChatModeration = GlobalChatModeration;
})();
