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
            safeTitle: 'Lični nalozi ostaju aktivni', safeText: 'Ovaj postupak briše tvoj Yamb profil i povezane podatke igre. Tvoji lični Google i Facebook nalozi ostaju aktivni.',
            linkedTitle: 'Povezani Google i Facebook', linkedText: 'Ako si Google i Facebook povezao sa istim Yamb profilom, brisanje obuhvata ceo zajednički profil, Dukate, inventar i napredak. Posle završenog brisanja nijedan povezani način prijave ne omogućava pristup obrisanom profilu. Odjava i deinstaliranje igre nisu zahtev za brisanje.',
            removedTitle: 'Šta se briše', removed: 'Profil i profilna slika, sačuvana statistika i napredak, Dukati i inventar, prijateljstva, tokeni obaveštenja, poruke povezane sa nalogom i rezervne kopije profila koje čuva igra.',
            retainedTitle: 'Šta može ostati', retained: 'Rezultati zajedničkih partija mogu ostati u istoriji drugih igrača bez tvog imena, slike i identifikatora naloga. Stariji tehnički zapisi o prekidima veze mogu ostati do 30 dana. Minimalni zapis sa kriptografskim otiskom starog identifikatora čuva se do 90 dana radi sprečavanja vraćanja obrisanih podataka. Potvrda zahteva dostupna je 30 dana nakon završetka.',
            provider: 'Za Analytics podatke povezane sa nalogom šaljemo poseban zahtev Google-u, koji ga obrađuje naknadno. Stariji Analytics podaci koji nisu bili povezani sa nalogom ne mogu se naknadno pouzdano pripisati nalogu i podležu rokovima čuvanja. Nalog kojim se prijavljuješ ostaje aktivan. Detalje i korisničke kontrole pogledaj u politici privatnosti igre.',
            stepsTitle: 'Potvrdi brisanje', steps: 'Prijavi se Google ili Facebook nalogom povezanim sa Yamb profilom koji želiš da obrišeš. Proveri prikazano ime ili adresu, pa potvrdi trajno brisanje.',
            login: 'Prijavi se pomoću Google-a', loginFacebook: 'Prijavi se preko Facebooka', change: 'Promeni nalog', agree: 'Razumem da trajno gubim nalog u igri, Dukate, inventar i napredak i da se brisanje ne može poništiti.',
            continue: 'Nastavi', review: 'Poslednja potvrda', reviewText: 'Trajno će biti obrisan nalog u igri za ovaj identitet:',
            final: 'Trajno obriši nalog u igri', cancel: 'Odustani', check: 'Proveri status zahteva',
            loading: 'Proveravamo dostupnost usluge…', ready: 'Brisanje se pokreće tek nakon tvoje potvrde.',
            unavailable: 'Automatsko brisanje trenutno nije dostupno. Pokušaj kasnije ili kontaktiraj podršku ispod.',
            pending: 'Zahtev je primljen. Brisanje je u toku i nastavlja se na serveru. Možeš se vratiti na ovu stranicu i proveriti status.',
            complete: 'Nalog u igri i njegovi podaci na serveru igre su obrisani. Nalog kojim se prijavljuješ ostaje aktivan.',
            analyticsSubmitted: 'Google-u je poslat zahtev za brisanje povezanih Analytics podataka. Google ga obrađuje odvojeno; ova potvrda ne znači da je njihova obrada već završena.',
            error: 'Nismo mogli da potvrdimo rezultat. Ako je zahtev već primljen, obrada se nastavlja. Proveri status ili kontaktiraj podršku.',
            authError: 'Prijava nije uspela. Koristi pregledač telefona ili računara i dozvoli iskačući prozor za prijavu.',
            recent: 'Potrebna je ponovna prijava. Prijavi se ponovo na isti nalog, pa potvrdi brisanje.',
            support: 'Potrebna ti je pomoć?', supportText: 'Za pitanja ili pomoć pri brisanju kontaktiraj:', rights: 'Yamb of the Balkan'
        },
        en: {
            heading: 'Delete your account', intro: 'Delete your Yamb of the Balkan game account and associated data, even if you no longer have the game installed.',
            home: 'Home', privacy: 'Privacy policy', terms: 'Terms of service',
            safeTitle: 'Your personal accounts remain active', safeText: 'This process deletes your Yamb profile and associated game data. Your personal Google and Facebook accounts remain active.',
            linkedTitle: 'Linked Google and Facebook accounts', linkedText: 'If you linked Google and Facebook to the same Yamb profile, deletion covers the entire shared profile, Dukati, inventory and progress. Once deletion is complete, neither linked sign-in method provides access to the deleted profile. Signing out and uninstalling the game do not request deletion.',
            removedTitle: 'What is deleted', removed: 'Your profile and profile picture, saved statistics and progress, Dukati and inventory, friendships, notification tokens, associated messages, and profile backups maintained by the game.',
            retainedTitle: 'What may remain', retained: 'Shared match results may remain in other players’ history without your name, picture or account ID. Older connection diagnostics may remain for up to 30 days. A minimal record containing a cryptographic hash of the old identifier is kept for up to 90 days to prevent deleted data from being restored. The request receipt is available for 30 days after completion.',
            provider: 'We submit a separate request to Google for Analytics data linked to the account; Google processes it afterwards. Older Analytics data that were not associated with an account cannot reliably be attributed afterwards and remain subject to retention periods. Your sign-in account remains active. See the game’s privacy policy for details and user controls.',
            stepsTitle: 'Confirm account deletion', steps: 'Sign in with a Google or Facebook account linked to the Yamb profile you want to delete. Check the displayed name or address, then confirm permanent deletion.',
            login: 'Sign in with Google', loginFacebook: 'Sign in with Facebook', change: 'Change account', agree: 'I understand that I permanently lose my game account, Dukati, inventory and progress, and that deletion cannot be undone.',
            continue: 'Continue', review: 'Final confirmation', reviewText: 'The game account for this identity will be permanently deleted:',
            final: 'Permanently delete game account', cancel: 'Cancel', check: 'Check request status',
            loading: 'Checking service availability…', ready: 'Deletion starts only after you confirm.',
            unavailable: 'Automatic deletion is currently unavailable. Please try later or contact support below.',
            pending: 'Your request was received. Deletion is in progress and continues on the server. You can return to this page to check its status.',
            complete: 'Your game account and its data on the game server have been deleted. Your sign-in account remains active.',
            analyticsSubmitted: 'A request to delete linked Analytics data has been submitted to Google. Google processes it separately; this confirmation does not mean that its processing has already finished.',
            error: 'We could not confirm the result. If the request was already received, processing continues. Check its status or contact support.',
            authError: 'Sign-in failed. Use your phone or computer browser and allow the sign-in pop-up.',
            recent: 'Sign in again to verify your identity. Sign in again to the same account, then confirm deletion.',
            support: 'Need help?', supportText: 'For questions or assistance with deletion, contact:', rights: 'Yamb of the Balkan'
        }
    };

    function create({ document, client, auth, language = 'sr' }) {
        const lang = language === 'en' ? 'en' : 'sr';
        const text = translations[lang];
        const el = id => document.getElementById(id);
        const facebookLogin = el('deletion-login-facebook');
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
        const completionText = result => text.complete + (result.analytics?.state === 'submitted' ? '\n\n' + text.analyticsSubmitted : '');
        const show = (message, state = '') => {
            el('deletion-message').textContent = message;
            el('deletion-message').dataset.state = state;
        };
        function refresh() {
            const pending = !!client.savedReceipt();
            el('deletion-login').hidden = !auth || pending || !!user || completed;
            if (facebookLogin) {
                facebookLogin.hidden = !auth?.signInFacebook || pending || !!user || completed;
                facebookLogin.disabled = busy;
            }
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
                show(completed ? completionText(result) : text.pending, completed ? 'complete' : 'pending');
            } catch (_) { show(text.error, 'error'); }
            finally { busy = false; refresh(); }
        }
        async function signIn(method) {
            if (busy || !auth) return;
            busy = true; refresh();
            try {
                user = await auth[method]();
                el('deletion-email').textContent = user.email || user.displayName || '';
                el('deletion-agree').checked = false;
                show(text.ready);
            } catch (_) { show(text.authError, 'error'); }
            finally { busy = false; refresh(); }
        }
        el('deletion-login').addEventListener('click', () => signIn('signIn'));
        facebookLogin?.addEventListener('click', () => signIn('signInFacebook'));
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
                show(completed ? completionText(result) : text.pending, completed ? 'complete' : 'pending');
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
