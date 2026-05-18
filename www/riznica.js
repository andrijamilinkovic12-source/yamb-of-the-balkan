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
        const introText = document.getElementById('riznica-intro-text');

        if (!overlay || !introText) {
            onComplete();
            return;
        }

        this.isIntroPlaying = true;
        this.applyIntroTheme(overlay);
        overlay.classList.remove('hidden');
        overlay.setAttribute('aria-hidden', 'false');
        introText.textContent = '';

        const lang = localStorage.getItem('yamb_lang') || 'sr';
        const introLabel = lang === 'en' ? 'T R E A S U R Y' : 'R I Z N I C A';
        const typeDuration = 2600;
        const openBehindOverlayAt = 3700;
        const introDuration = 4700;
        let step = 0;
        let completed = false;

        const typeTimer = setInterval(() => {
            step += 1;
            introText.textContent = introLabel.slice(0, step);

            if (step >= introLabel.length) {
                clearInterval(typeTimer);
            }
        }, typeDuration / introLabel.length);

        setTimeout(() => {
            clearInterval(typeTimer);
            introText.textContent = introLabel;
        }, typeDuration + 80);

        setTimeout(() => {
            if (completed) return;
            completed = true;
            onComplete();
        }, openBehindOverlayAt);

        setTimeout(() => {
            if (!completed) {
                completed = true;
                onComplete();
            }
            overlay.classList.add('hidden');
            overlay.setAttribute('aria-hidden', 'true');
            this.isIntroPlaying = false;
        }, introDuration);
    }

    applyIntroTheme(overlay) {
        const knownThemes = ['dark', 'light', 'medium', 'winter', 'neon', 'amethyst', 'easter', 'desert', 'moon', 'severna'];
        const activeTheme = localStorage.getItem('yamb_theme') || 'dark';
        const introTheme = knownThemes.includes(activeTheme) ? activeTheme : 'dark';

        knownThemes.forEach(theme => overlay.classList.remove(`theme-${theme}`));
        overlay.classList.add(`theme-${introTheme}`);
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
            if (this.shop && this.shop.getAdController()) {
                this.shop.getAdController().prepareReward({ context: 'shop_ad_reward', amount: 500 });
            }
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
