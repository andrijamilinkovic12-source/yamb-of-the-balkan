(function (root, factory) {
    const api = factory();
    if (typeof module === 'object' && module.exports) module.exports = api;
    else root.YambDeletionPage = api;
})(typeof window === 'object' ? window : globalThis, function () {
    'use strict';
    const translations = {
        sr: {
            heading: 'Brisanje naloga', intro: 'Obriši svoj nalog i povezane podatke iz igre Yamb of the Balkan, čak i ako igra više nije instalirana.',
            home: 'Početna', privacy: 'Politika privatnosti', terms: 'Uslovi korišćenja',
            safeTitle: 'Tvoj Google nalog ostaje aktivan', safeText: 'Briše se samo nalog u igri Yamb of the Balkan. Gmail, Google fotografije i ostale Google usluge ostaju nepromenjeni.',
            removedTitle: 'Šta se briše', removed: 'Profil i profilna slika, sačuvana statistika i napredak, Dukati i inventar, prijateljstva, tokeni obaveštenja, poruke povezane sa nalogom i rezervne kopije profila koje čuva igra.',
            retainedTitle: 'Šta može ostati', retained: 'Rezultati zajedničkih partija mogu ostati u istoriji drugih igrača bez tvog imena, slike i identifikatora naloga. Stariji tehnički zapisi o prekidima veze mogu ostati do 30 dana. Minimalni zapis sa kriptografskim otiskom starog identifikatora čuva se do 90 dana radi sprečavanja vraćanja obrisanih podataka. Potvrda zahteva dostupna je 30 dana nakon završetka.',
            provider: 'Podaci koje Google samostalno obrađuje za svoje usluge podležu Google politici privatnosti i kontrolama na tvom Google nalogu. Detalje o servisima i čuvanju podataka pogledaj u politici privatnosti igre.',
            stepsTitle: 'Potvrdi brisanje', steps: 'Prijavi se istim Google nalogom koji koristiš u igri. Proveri prikazanu adresu, pa potvrdi da želiš trajno brisanje.',
            login: 'Prijavi se pomoću Google-a', change: 'Promeni nalog', agree: 'Razumem da trajno gubim nalog u igri, Dukate, inventar i napredak i da se brisanje ne može poništiti.',
            continue: 'Nastavi', review: 'Poslednja potvrda', reviewText: 'Trajno će biti obrisan nalog u igri za ovu Google adresu:',
            final: 'Trajno obriši nalog u igri', cancel: 'Odustani', check: 'Proveri status zahteva',
            loading: 'Proveravamo dostupnost usluge…', ready: 'Brisanje se pokreće tek nakon tvoje potvrde.',
            unavailable: 'Automatsko brisanje trenutno nije dostupno. Pokušaj kasnije ili kontaktiraj podršku ispod.',
            pending: 'Zahtev je primljen. Brisanje je u toku i nastavlja se na serveru. Možeš se vratiti na ovu stranicu i proveriti status.',
            complete: 'Nalog u igri i povezani podaci su obrisani. Tvoj Google nalog ostaje aktivan.',
            error: 'Nismo mogli da potvrdimo rezultat. Ako je zahtev već primljen, obrada se nastavlja. Proveri status ili kontaktiraj podršku.',
            authError: 'Google prijava nije uspela. Koristi pregledač telefona ili računara i dozvoli iskačući prozor za prijavu.',
            recent: 'Potrebna je nova Google prijava. Prijavi se ponovo na isti nalog, pa potvrdi brisanje.',
            support: 'Potrebna ti je pomoć?', supportText: 'Za pitanja ili pomoć pri brisanju kontaktiraj:', rights: 'Yamb of the Balkan'
        },
        en: {
            heading: 'Delete your account', intro: 'Delete your Yamb of the Balkan game account and associated data, even if you no longer have the game installed.',
            home: 'Home', privacy: 'Privacy policy', terms: 'Terms of service',
            safeTitle: 'Your Google account remains active', safeText: 'Only your Yamb of the Balkan game account is deleted. Gmail, Google Photos and other Google services remain unchanged.',
            removedTitle: 'What is deleted', removed: 'Your profile and profile picture, saved statistics and progress, Dukati and inventory, friendships, notification tokens, associated messages, and profile backups maintained by the game.',
            retainedTitle: 'What may remain', retained: 'Shared match results may remain in other players’ history without your name, picture or account ID. Older connection diagnostics may remain for up to 30 days. A minimal record containing a cryptographic hash of the old identifier is kept for up to 90 days to prevent deleted data from being restored. The request receipt is available for 30 days after completion.',
            provider: 'Data Google independently processes for its own services is subject to Google’s privacy policy and your Google Account controls. See the game’s privacy policy for details about service providers and retention.',
            stepsTitle: 'Confirm account deletion', steps: 'Sign in with the same Google account you use in the game. Check the displayed address, then confirm that you want permanent deletion.',
            login: 'Sign in with Google', change: 'Change account', agree: 'I understand that I permanently lose my game account, Dukati, inventory and progress, and that deletion cannot be undone.',
            continue: 'Continue', review: 'Final confirmation', reviewText: 'The game account for this Google address will be permanently deleted:',
            final: 'Permanently delete game account', cancel: 'Cancel', check: 'Check request status',
            loading: 'Checking service availability…', ready: 'Deletion starts only after you confirm.',
            unavailable: 'Automatic deletion is currently unavailable. Please try later or contact support below.',
            pending: 'Your request was received. Deletion is in progress and continues on the server. You can return to this page to check its status.',
            complete: 'Your game account and associated data have been deleted. Your Google account remains active.',
            error: 'We could not confirm the result. If the request was already received, processing continues. Check its status or contact support.',
            authError: 'Google sign-in failed. Use your phone or computer browser and allow the sign-in pop-up.',
            recent: 'A new Google sign-in is required. Sign in again to the same account, then confirm deletion.',
            support: 'Need help?', supportText: 'For questions or assistance with deletion, contact:', rights: 'Yamb of the Balkan'
        }
    };

    function create({ document, client, auth, language = 'sr' }) {
        const lang = language === 'en' ? 'en' : 'sr';
        const text = translations[lang];
        const el = id => document.getElementById(id);
        document.documentElement.lang = lang;
        document.title = text.heading + ' | Yamb of the Balkan';
        for (const node of document.querySelectorAll('[data-text]')) node.textContent = text[node.dataset.text] || '';
        for (const node of document.querySelectorAll('[data-page]')) {
            const file = { home: lang === 'en' ? 'en.html' : 'index.html', privacy: 'privacy' + (lang === 'en' ? '_en' : '') + '.html', terms: 'terms' + (lang === 'en' ? '_en' : '') + '.html' }[node.dataset.page];
            if (file) node.href = file;
        }
        let user = null;
        let busy = false;
        let completed = false;
        const show = (message, state = '') => {
            el('deletion-message').textContent = message;
            el('deletion-message').dataset.state = state;
        };
        function refresh() {
            const pending = !!client.savedReceipt();
            el('deletion-login').hidden = !auth || pending || !!user || completed;
            el('deletion-account').hidden = !user || pending || completed;
            el('deletion-check').hidden = !pending;
            el('deletion-continue').disabled = busy || !el('deletion-agree').checked;
            for (const id of ['deletion-login', 'deletion-change', 'deletion-final', 'deletion-cancel', 'deletion-check']) el(id).disabled = busy;
        }
        async function check() {
            if (busy) return;
            busy = true;
            refresh();
            show(text.pending, 'pending');
            try {
                const result = await client.poll();
                completed = result.state === 'complete';
                show(completed ? text.complete : text.pending, completed ? 'complete' : 'pending');
            } catch (_) { show(text.error, 'error'); }
            finally { busy = false; refresh(); }
        }
        el('deletion-login').addEventListener('click', async () => {
            if (busy || !auth) return;
            busy = true; refresh();
            try {
                user = await auth.signIn();
                el('deletion-email').textContent = user.email || user.displayName || '';
                el('deletion-agree').checked = false;
                show(text.ready);
            } catch (_) { show(text.authError, 'error'); }
            finally { busy = false; refresh(); }
        });
        el('deletion-change').addEventListener('click', async () => {
            if (busy) return;
            await auth?.signOut().catch(() => {});
            user = null;
            el('deletion-email').textContent = '';
            el('deletion-review').hidden = true;
            el('deletion-agree').checked = false;
            refresh();
        });
        el('deletion-agree').addEventListener('change', refresh);
        el('deletion-continue').addEventListener('click', () => {
            if (busy || !user || !el('deletion-agree').checked) return;
            el('deletion-review-email').textContent = user.email || user.displayName || '';
            el('deletion-review').hidden = false;
            el('deletion-final').focus();
        });
        el('deletion-cancel').addEventListener('click', () => {
            if (busy) return;
            el('deletion-review').hidden = true;
            el('deletion-continue').focus();
        });
        el('deletion-final').addEventListener('click', async () => {
            if (busy || !user || !el('deletion-agree').checked || el('deletion-review').hidden) return;
            busy = true; refresh();
            let accepted = false;
            try {
                const expectedUid = user.uid;
                const verified = await auth.reauthenticate(user);
                if (verified.uid !== expectedUid) throw new Error('identity_changed');
                const token = await verified.getIdToken(true);
                const receipt = await client.request(token);
                accepted = true;
                el('deletion-review').hidden = true;
                show(text.pending, 'pending');
                user = null;
                refresh();
                await auth.signOut().catch(() => {});
                const result = await client.poll(receipt);
                completed = result.state === 'complete';
                show(completed ? text.complete : text.pending, completed ? 'complete' : 'pending');
            } catch (error) {
                const authenticationError = /auth\/|identity_changed|sign_in_required/.test(error.code || error.message || '');
                show(error.code === 'recent_sign_in_required' ? text.recent : authenticationError && !accepted ? text.authError : text.error, 'error');
            } finally { busy = false; refresh(); }
        });
        el('deletion-check').addEventListener('click', check);
        refresh();
        show(client.savedReceipt() ? text.pending : auth ? text.ready : text.unavailable, auth ? '' : 'error');
        return { check, refresh };
    }
    return { create, translations };
});
