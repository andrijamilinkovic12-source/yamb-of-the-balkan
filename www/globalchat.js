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

    appendMessage(sender, text, type, senderId = null, skipSound = false) { 
        const body = document.getElementById('global-chat-body'); 
        if (!body) return;
        
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
        
        let nameHtml = `<strong>${sender}:</strong>`;
        if (senderId && senderId !== (this.app.socket ? this.app.socket.id : null) && sender !== this.gt('sys_name') && type === "msg-incoming") {
            nameHtml = `<strong style="cursor:pointer; color:var(--gold-main); text-decoration:underline;" onclick="window.app.challengePlayer('${senderId}', '${sender}')" title="${this.gt('tooltip_challenge') || 'Izazovi na duel ⚔️'}">${sender}:</strong>`;
        }
        
        msgDiv.innerHTML = `${nameHtml} ${text}`; 
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
        
        const charCountEl = document.getElementById('global-chat-char-count');
        if (charCountEl) charCountEl.innerText = "0/550";
        
        if (this.app.socket && this.app.socket.connected) { 
            this.app.socket.emit('global_chat_msg', { sender: this.app.playerName, msg: text }); 
        } else {
            this.app.initSocketConnection();
            setTimeout(() => {
                if (this.app.socket && this.app.socket.connected) {
                    this.app.socket.emit('global_chat_msg', { sender: this.app.playerName, msg: text }); 
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
            const isMe = (data.senderId === socket.id);
            this.appendMessage(data.sender, data.msg, isMe ? "msg-outgoing" : "msg-incoming", data.senderId);
        });

        socket.off('global_chat_history');
        socket.on('global_chat_history', (history) => {
            const body = document.getElementById('global-chat-body');
            if (!body) return;
            
            body.innerHTML = `<div style="text-align: center; font-size: 0.75rem; color: var(--text-muted); margin-bottom: 10px;" data-lang="global_chat_welcome">${this.gt('global_chat_welcome') || "Dobrodošli u Globalni Chat! Budite pristojni."}</div>`;
            
            history.forEach(data => {
                const isMe = (data.senderId === socket.id);
                this.appendMessage(data.sender, data.msg, isMe ? "msg-outgoing" : "msg-incoming", data.senderId, true);
            });
        });
    }
}