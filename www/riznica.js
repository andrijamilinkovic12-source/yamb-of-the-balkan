// riznica.js - Objedinjena logika za Trofeje, Kockice, Efekte i Teme

class RiznicaManager {
    constructor() {
        this.currentTab = 'trophy';
        this.shop = null;
        this.initGlobalModals();
    }

    open() {
        if(window.app) {
            window.app.navigateTo('riznica-screen');
        }
        this.switchTab(this.currentTab);
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
            if (type === 'trophy') itemsData = SHOP_DATA.TROPHIES || [];
            if (type === 'skin') itemsData = SHOP_DATA.SKINS || [];
            if (type === 'effect') itemsData = SHOP_DATA.EFFECTS || [];
            if (type === 'theme') itemsData = SHOP_DATA.THEMES || []; // NOVO: Podaci za teme
        }

        // 3. Inicijalizacija ShopManager-a
        this.shop = new ShopManager({
            type: type,
            items: itemsData,
            containerId: 'riznica-shop-container',
            balanceId: 'riznica-balance'
        });

        // Mapiramo na window.shop kako bi HTML onclick atributi radili nesmetano
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
                if(confirm(`Želite li kupiti ${name}?`)) this.shop.processTransaction(id, price);
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

// Inicijalizacija prilikom učitavanja
window.addEventListener('DOMContentLoaded', () => {
    window.riznicaManager = new RiznicaManager();
});