(function (root, factory) {
    const api = factory();
    if (typeof module === 'object' && module.exports) module.exports = api;
    else root.YambAccountDeletionClient = api;
})(typeof window === 'object' ? window : globalThis, function () {
    'use strict';
    class Client {
        constructor(origin, options = {}) {
            const url = new URL(origin);
            if (url.protocol !== 'https:' && !(url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname))) {
                throw new Error('invalid_deletion_origin');
            }
            this.origin = url.origin;
            // Browser fetch must not receive the Client instance as its `this`.
            this.fetch = options.fetch || ((...args) => fetch(...args));
            this.storage = options.storage || null;
            this.storageKey = 'yamb_deletion_receipt:' + this.origin;
            this.sleep = options.sleep || (ms => new Promise(resolve => setTimeout(resolve, ms)));
            this.now = options.now || Date.now;
        }
        async json(path, options = {}) {
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), 20000);
            try {
                const response = await this.fetch(this.origin + path, {
                    cache: 'no-store', credentials: 'omit', ...options, signal: controller.signal
                });
                const data = await response.json();
                if (!response.ok || !data || data.ok === false) throw Object.assign(new Error(data?.reason || 'request_failed'), { code: data?.reason || 'request_failed' });
                return data;
            } finally { clearTimeout(timer); }
        }
        config() { return this.json('/api/account-deletion/config'); }
        remember(receipt) {
            try { this.storage?.setItem(this.storageKey, JSON.stringify({ jobId: receipt.jobId, receipt: receipt.receipt })); }
            catch (_) { /* Deletion can continue even when browser storage is full. */ }
        }
        savedReceipt() {
            try {
                const receipt = JSON.parse(this.storage?.getItem(this.storageKey) || 'null');
                return receipt && /^[a-f0-9-]{36}$/.test(receipt.jobId) && /^[A-Za-z0-9_-]{43}$/.test(receipt.receipt) ? receipt : null;
            } catch (_) { return null; }
        }
        forget() { try { this.storage?.removeItem(this.storageKey); } catch (_) {} }
        async request(token) {
            const receipt = await this.json('/api/account-deletion', {
                method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
                body: JSON.stringify({ confirmation: 'DELETE' })
            });
            if (!/^[a-f0-9-]{36}$/.test(receipt.jobId || '') || !/^[A-Za-z0-9_-]{43}$/.test(receipt.receipt || '')) throw new Error('invalid_deletion_receipt');
            this.remember(receipt);
            return receipt;
        }
        status(receipt = this.savedReceipt()) {
            if (!receipt) return Promise.reject(new Error('missing_deletion_receipt'));
            return this.json('/api/account-deletion/status/' + encodeURIComponent(receipt.jobId), {
                headers: { 'X-Deletion-Receipt': receipt.receipt }
            });
        }
        async poll(receipt = this.savedReceipt(), maxWaitMs = 25000) {
            const deadline = this.now() + maxWaitMs;
            do {
                const result = await this.status(receipt);
                if (result.state === 'complete') { this.forget(); return result; }
                if (result.state !== 'pending') throw new Error('invalid_deletion_status');
                if (this.now() >= deadline) return result;
                await this.sleep(1500);
            } while (this.now() <= deadline);
            return { ok: true, state: 'pending' };
        }
    }
    const text = {
        sr: {
            label: 'Obriši nalog', status: 'Proveri zahtev za brisanje',
            warning: 'Trajno se brišu tvoj nalog u igri, profil, statistika, Dukati, inventar, prijateljstva i poruke povezane sa nalogom. Ovo se ne može poništiti. Tvoj Google nalog se ne briše. Nastavi sa potvrdom identiteta?',
            confirm: 'Trajno obrisati nalog u igri za:',
            finalWarning: 'Gubiš profil, statistiku, Dukate, inventar, prijateljstva i povezane poruke. Brisanje se ne može poništiti. Tvoj Google nalog ostaje aktivan.',
            login: 'Za brisanje se prvo prijavi na svoj nalog u igri.',
            unavailable: 'Automatsko brisanje trenutno nije dostupno. Pokušaj kasnije ili se obrati na andrija.milinkovic12@gmail.com.',
            wrong: 'Izabran je drugi Google nalog. Brisanje nije pokrenuto. Prijavi se ponovo na nalog koji želiš da obrišeš.',
            complete: 'Nalog u igri i povezani podaci su obrisani. Tvoj Google nalog ostaje aktivan.',
            pending: 'Zahtev za brisanje je primljen. Postupak još traje i nastaviće se na serveru. Status možeš ponovo proveriti ovim dugmetom.',
            uncertain: 'Nije bilo moguće potvrditi status brisanja. Ako je zahtev primljen, server nastavlja postupak. Proveri status ponovo ili kontaktiraj podršku.',
            recent: 'Potrebna je nova Google prijava. Prijavi se ponovo i zatim potvrdi brisanje.',
            received: 'Zahtev za brisanje ovog naloga je primljen. Nalog je odjavljen sa ovog uređaja.'
        },
        en: {
            label: 'Delete account', status: 'Check deletion request',
            warning: 'Your game account, profile, statistics, Dukati, inventory, friendships and associated messages will be permanently deleted. This cannot be undone. Your Google account will remain. Continue to verify your identity?',
            confirm: 'Permanently delete the game account for:',
            finalWarning: 'You will lose your profile, statistics, Dukati, inventory, friendships and associated messages. Deletion cannot be undone. Your Google account remains active.',
            login: 'Sign in to your game account before requesting deletion.',
            unavailable: 'Automatic deletion is currently unavailable. Please try later or contact andrija.milinkovic12@gmail.com.',
            wrong: 'A different Google account was selected. Deletion has not started. Sign in again to the account you want to delete.',
            complete: 'Your game account and associated data have been deleted. Your Google account remains active.',
            pending: 'Your deletion request was received. Processing is still in progress and will continue on the server. You can check its status again with this button.',
            uncertain: 'The deletion status could not be confirmed. If the request was received, processing continues on the server. Check again or contact support.',
            recent: 'A new Google sign-in is required. Sign in again, then confirm deletion.',
            received: 'A deletion request for this account was received. The account has been signed out on this device.'
        }
    };
    function webApiOrigin(location) {
        return ['localhost', '127.0.0.1', 'yamb-reconnect-qa.onrender.com'].includes(location.hostname)
            ? location.origin : 'https://yamb-of-the-balkan.onrender.com';
    }
    return { Client, text, webApiOrigin };
});
