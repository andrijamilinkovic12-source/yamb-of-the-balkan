// globalchat.js - GLOBAL CHAT MANAGER

class GlobalChatManager {
    constructor(app) {
        this.app = app;
        this.lastGlobalMsg = null;
        this.initDOM();
    }

    // Pomoćna funkcija za prevode
    gt(key) {
        return typeof t === 'function' ? t(key) : key;
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
            inputGlobalChat.addEventListener('keydown', (e) => { if (e.key === 'Enter') this.send(); });
            
            // Dinamički brojač karaktera
            inputGlobalChat.addEventListener('input', (e) => {
                this.clearStatus();
                const charCountEl = document.getElementById('global-chat-char-count');
                if (charCountEl) {
                    charCountEl.innerText = `${e.target.value.length}/550`;
                }
            });
        }
    }

    async open() {
        if (!this.app.requireLogin()) return;

        this.app.initSocketConnection();
        const accepted = localStorage.getItem('yamb_chat_rules_accepted');

        const pokreniChat = () => {
            const overlay = document.getElementById('global-chat-overlay');
            if (overlay) overlay.style.display = 'flex';
            this.clearStatus();
            
            if (this.app.socket && this.app.socket.connected) {
                this.app.socket.emit('request_global_chat_history');
            } else {
                setTimeout(() => {
                    if (this.app.socket && this.app.socket.connected) {
                        this.app.socket.emit('request_global_chat_history');
                    }
                }, 500);
            }
        };

        if (!accepted) {
            const isConfirmed = await this.app.modal.confirm(this.gt('chat_rules_msg'));
            if (isConfirmed) {
                localStorage.setItem('yamb_chat_rules_accepted', 'true');
                pokreniChat();
            }
        } else {
            pokreniChat();
        }
    }

    async close(skipAd = false) {
        const overlay = document.getElementById('global-chat-overlay');
        if (overlay) overlay.style.display = 'none';

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
        if (!messageId || !this.app.socket || !this.app.socket.connected) {
            this.showStatus('sys_no_conn');
            return;
        }

        const confirmed = await this.app.modal.confirm(this.gt('chat_report_confirm'));
        if (!confirmed) return;

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

        const infoMsg = body.querySelector('div[style*="text-align: center"]');
        if (infoMsg && body.children.length === 1) {
            infoMsg.style.display = 'none';
        }

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

    send() { 
        const input = document.getElementById('global-chat-input'); 
        let text = input.value.trim(); 
        if (!text) return; 
        
        input.value = ""; 
        this.clearStatus();
        
        const charCountEl = document.getElementById('global-chat-char-count');
        if (charCountEl) charCountEl.innerText = "0/550";
        
        if (this.app.socket && this.app.socket.connected) { 
            this.app.socket.emit('global_chat_msg', { msg: text }); 
        } else {
            this.app.initSocketConnection();
            setTimeout(() => {
                if (this.app.socket && this.app.socket.connected) {
                    this.app.socket.emit('global_chat_msg', { msg: text }); 
                } else {
                    this.appendMessage(this.gt('sys_name') || "Sistem", this.gt('sys_no_conn') || "Niste povezani na server.", "msg-incoming");
                }
            }, 800);
        }
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
            
            body.innerHTML = `<div style="text-align: center; font-size: 0.75rem; color: var(--text-muted); margin-bottom: 10px;" data-lang="global_chat_welcome">${this.gt('global_chat_welcome') || "Dobrodošli u Globalni Chat! Budite pristojni."}</div>`;
            
            history.forEach(data => {
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
