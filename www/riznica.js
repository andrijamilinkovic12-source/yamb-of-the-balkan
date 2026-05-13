// riznica.js - Objedinjena logika za Trofeje, Kockice, Efekte i Teme

class RiznicaManager {
    constructor() {
        this.currentTab = 'trophy';
        this.shop = null;
        this.isIntroPlaying = false;
        this.initGlobalModals();
    }

    open() {
        if (this.isIntroPlaying) return;

        if (!document.getElementById('riznica-screen')?.classList.contains('active')) {
            this.playIntro(() => this.showRiznica());
            return;
        }
        this.showRiznica();
    }

    showRiznica() {
        if(window.app) {
            window.app.navigateTo('riznica-screen');
        }
        this.switchTab(this.currentTab);
    }

    playIntro(onComplete) {
        const overlay = document.getElementById('riznica-intro');
        const srLine = document.getElementById('riznica-intro-sr');
        const enLine = document.getElementById('riznica-intro-en');

        if (!overlay || !srLine || !enLine) {
            onComplete();
            return;
        }

        this.isIntroPlaying = true;
        overlay.classList.remove('hidden');
        overlay.setAttribute('aria-hidden', 'false');
        srLine.textContent = '';
        enLine.textContent = '';

        const srText = 'R I Z N I C A';
        const enText = 'T R E A S U R Y';
        const steps = Math.max(srText.length, enText.length);
        const typeDuration = 1850;
        let step = 0;

        const typeTimer = setInterval(() => {
            step += 1;
            srLine.textContent = srText.slice(0, step);
            enLine.textContent = enText.slice(0, step);

            if (step >= steps) {
                clearInterval(typeTimer);
            }
        }, typeDuration / steps);

        setTimeout(() => {
            clearInterval(typeTimer);
            srLine.textContent = srText;
            enLine.textContent = enText;
        }, typeDuration + 80);

        setTimeout(() => {
            overlay.classList.add('hidden');
            overlay.setAttribute('aria-hidden', 'true');
            this.isIntroPlaying = false;
            onComplete();
        }, 2400);
    }

    close() {
        if(window.app) {
            window.app.showMainMenu();
        }
    }

    switchTab(type) {
        this.currentTab = type;
        
        // 1. Ažuriranje UI Tabova
        document.querySelectorAll('#riznica-screen .tab-btn').forEach(btn => btn.classList.remove('active'));
        if (type === 'trophy') document.getElementById('tab-trophies').classList.add('active');
        if (type === 'skin') document.getElementById('tab-skins').classList.add('active');
        if (type === 'effect') document.getElementById('tab-effects').classList.add('active');
        if (type === 'theme') document.getElementById('tab-themes').classList.add('active'); // NOVO: Tab za teme

        // 2. Pribavljanje odgovarajućih podataka iz config.js
        let itemsData = [];
        if (typeof SHOP_DATA !== 'undefined') {
            if (type === 'skin') itemsData = SHOP_DATA.SKINS || [];
            else if (type === 'effect') itemsData = SHOP_DATA.EFFECTS || [];
            else if (type === 'theme') itemsData = SHOP_DATA.THEMES || [];
            else if (type === 'trophy') itemsData = SHOP_DATA.TROPHIES || [];
        }

        // 3. Inicijalizacija i Renderovanje (Koristi univerzalni ShopManager)
        this.shop = new ShopManager({
            type: type,
            items: itemsData,
            containerId: 'riznica-shop-container',
            balanceId: 'riznica-balance'
        });

        // Poveži globalnu referencu da bi HTML onclick='shop.tryBuy()' radili nesmetano
        window.shop = this.shop;

        // Priprema reklame u pozadini
        setTimeout(() => {
            if (this.shop && this.shop.getAdController()) this.shop.getAdController().prepareReward();
        }, 1000);
    }

    // Povezujemo funkcije sa postojećim ModalManager-om
    initGlobalModals() {
        window.openConfirmModal = (id, name, price) => {
            if (window.modalManager) {
                let msg = (typeof t === 'function') ? `${t('msg_confirm_buy')} <b style="color:var(--gold-main)">${name}</b>?` : `Želite li kupiti <b>${name}</b>?`;
                window.modalManager.confirm(msg).then(isConfirmed => {
                    if (isConfirmed) {
                        this.shop.processTransaction(id, price);
                    }
                });
            } else {
                let fallbackMsg = (typeof t === 'function') ? `${t('msg_confirm_buy')} ${name}?` : `Želite li kupiti ${name}?`;
                if(confirm(fallbackMsg)) this.shop.processTransaction(id, price);
            }
        };

        window.showNotification = (titleText, message) => {
            if (window.modalManager) {
                window.modalManager.alert(message, titleText);
            } else {
                alert(message);
            }
        };

        window.closeConfirmModal = () => {
            if (window.modalManager) window.modalManager.close();
        };
    }
}

// Inicijalizacija
window.riznicaManager = new RiznicaManager();
