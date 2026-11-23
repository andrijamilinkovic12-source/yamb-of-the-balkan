// Rules use the same canonical asset for a concept wherever that concept appears.
// Green remains the layout reference; each pack supplies its own PNGs.
const RULES_THEMES = new Set(['dark', 'light', 'medium', 'winter', 'neon', 'amethyst', 'easter', 'desert', 'moon', 'severna']);

function rulesActiveTheme() {
    const theme = document.documentElement?.dataset?.splashTheme || localStorage.getItem('yamb_theme') || 'dark';
    return RULES_THEMES.has(theme) ? theme : 'dark';
}

function rulesCanonicalSource(role, theme = rulesActiveTheme()) {
    const green = theme === 'dark';
    const root = green ? 'assets/green-soft-clay' : `assets/theme-packs/${theme}`;
    const canonical = `${root}/canonical`;
    if (green && ['addFriend', 'spectate', 'duel'].includes(role)) {
        const sharedRole = { addFriend: 'friend', spectate: 'spectate', duel: 'duel' }[role];
        return `assets/theme-packs/dark/canonical/online-players-internal/${sharedRole}-v1.png`;
    }
    const roles = {
        rules: 'rules-room-identity/rules-room-v1.png',
        scoring: green ? 'rules-page-illustrations/rules-scoring-v1.png' : 'statistics-overview/average-v2.png',
        statisticsPage: green ? 'rules-page-illustrations/stats-leaderboards-v1.png' : 'leaderboard-controls/global-v2.png',
        competitionsPage: green ? 'rules-page-illustrations/multiplayer-competitions-v1.png' : 'tournament-navigation/tab-bracket-v1.png',
        communicationPage: green ? '../rules/pages/communication-v1.png' : 'online-players-internal/state-v1.png',
        economyPage: green ? '../rules/pages/economy-treasury-v3.png' : `ducat/ducat-front-v${['easter', 'desert', 'severna'].includes(theme) ? 2 : 1}.png`,
        accountPage: green ? 'rules-page-illustrations/account-server-v1.png' : 'online-players-internal/avatar-v1.png',
        statistics: 'statistics-room-identity/statistics-room-v1.png',
        leaderboard: green ? 'leaderboard-room-identity/leaderboard-room-v1.png' : 'leaderboard-room-identity/leaderboard-room-v2.png',
        powerIndex: 'statistics-overview/power-index-v1.png',
        record: green ? 'statistics-overview/record-v1.png' : 'solo-record-icons/personal-v1.png',
        wins: green ? 'statistics-overview/wins-v1.png' : 'statistics-overview/wins-v2.png',
        fireStreak: green ? 'statistics-overview/fire-streak-v1.png' : 'statistics-overview/fire-streak-v2.png',
        allTimePoints: green ? 'statistics-overview/all-time-points-v1.png' : 'statistics-overview/all-time-points-v2.png',
        h2h: green ? 'h2h-statistics/h2h-identity-v1.png' : 'statistics-overview/h2h-v2.png',
        onlineRandom: 'online-random-room-identity/online-random-room-v1.png',
        inviteFriend: 'invite-friend-room-identity/invite-friend-room-v1.png',
        tournament: `tournament-awards/champion-trophy-v${['winter', 'neon', 'amethyst', 'easter', 'desert', 'moon', 'severna'].includes(theme) ? 2 : 1}.png`,
        tournamentStart: 'tournament-states/state-start-v1.png',
        hallOfFame: 'tournament-navigation/tab-hall-of-fame-v1.png',
        quarterly: 'quarterly-league-room-identity/quarterly-league-room-v2.png',
        onlinePlayers: 'online-players-room-identity/online-players-room-v1.png',
        addFriend: 'online-players-internal/friend-v1.png',
        spectate: 'online-players-internal/spectate-v1.png',
        duel: 'online-players-internal/duel-v1.png',
        globalChat: 'global-chat-room-identity/global-chat-room-v1.png',
        mailbox: 'player-mailbox/post-v1.png',
        hotseat: 'hotseat-room-identity/hotseat-room-v1.png',
        ducat: `ducat/ducat-inline-v${!green && ['easter', 'desert', 'severna'].includes(theme) ? 2 : 1}.png`,
        daily: 'daily-room-identity/daily-room-v1.png',
        video: 'rewarded-video/rewarded-video-active-inline-v1.png',
        undo: `undo-token/undo-token-inline-v${!green && ['easter', 'desert', 'severna'].includes(theme) ? 2 : 1}.png`,
        treasury: '../treasury-free-v3.png',
        trophyTab: 'treasury-controls/tab-trophies-v1.png',
        skinsTab: 'treasury-controls/tab-skins-v1.png',
        effectsTab: 'treasury-controls/tab-effects-v1.png',
        themesTab: 'treasury-controls/tab-themes-v1.png',
        settings: 'settings-room-identity/settings-room-v1.png',
        profile: green ? 'settings-controls/profile-v1.png' : 'settings-controls/profile-v2.png',
        privacy: green ? 'settings-controls/privacy-v1.png' : 'settings-controls/privacy-v2.png',
        reconnected: green ? '../opponent/reconnected-v1.png' : 'online-random-states/reconnected-v1.png',
        disconnected: green ? '../opponent/disconnected-v1.png' : 'online-random-states/disconnected-v1.png',
        solo: 'solo-room-identity/solo-room-v1.png',
        timer: 'game-header/timer-v1.png'
    };
    if (!Object.hasOwn(roles, role)) throw new Error(`Unknown rules asset role: ${role}`);
    const source = `${canonical}/${roles[role]}`;
    return globalThis.resolveThemeQualityAsset?.(source) || source;
}

function rulesCanonicalIcon(role, extraClass = '') {
    const className = `rules-inline-icon rules-asset-icon rules-canonical-icon${extraClass ? ` ${extraClass}` : ''}`;
    return `<img class="${className}" data-rules-role="${role}" src="${rulesCanonicalSource(role)}" loading="lazy" alt="" aria-hidden="true" decoding="async">`;
}

function rulesTextGlyphHtml(glyph) {
    const roles = { '🎯': 'scoring', '🎲': 'solo', '⏱️': 'timer', '⏳': 'timer' };
    return roles[glyph] ? rulesCanonicalIcon(roles[glyph]) : '';
}

function rulesQlPodiumPackHtml() {
    const medals = ['gold', 'silver', 'bronze']
        .map(tier => `<img data-medal-tier="${tier}" src="${getThemeMedalSource('quarterlyLeague', tier)}" loading="lazy" alt="" decoding="async">`)
        .join('');
    return `<span class="rules-podium-pack rules-podium-pack-canonical rules-ql-podium-pack" aria-hidden="true">${medals}</span>`;
}

const RulesData = {
    sr: [
        {
            title: `${rulesCanonicalIcon('scoring', 'rules-page-icon-canonical')} Pravila i bodovanje`,
            content: `
                <h3>${rulesTextGlyphHtml('🎯')} Cilj igre</h3>
                <p>Cilj je osvojiti što više poena bacanjem 6 kockica i upisivanjem najboljih kombinacija u tabelu. U svakom potezu imate do 3 bacanja, a posle svakog bacanja možete zadržati kockice koje želite da sačuvate.</p>
                <p>Za izabrani red igra sama bira pet od šest kockica. MAX sabira pet najvećih, MIN pet najmanjih, a u redovima 1–6 računa se najviše pet istih. Zadržane kockice ostaju iste; ponovo bacate samo ostale. Za bodovanje se uzima u obzir svih šest.</p>
                <p>Upis završava potez. Svako polje popunjavate jednom; ako nemate traženu kombinaciju, upisujete 0. Kad su obe tabele u duelu pune, pobeđuje igrač sa većim zbirom poena.</p>
                
                <h3>${rulesCanonicalIcon('hotseat')} Igra na jednom uređaju</h3>
                <p>U solo partiji popunjavate svoju tabelu i pokušavate da oborite lični rekord. U igri za dva igrača svako ima svoju tabelu; posle upisa uređaj preuzima sledeći igrač. Ako je na uređaju sačuvana prekinuta partija, možete je nastaviti kada ponovo otvorite isti način igre. Za Kvartalnu ligu računa se rezultat prijavljenog naloga.</p>
                <h3>${rulesCanonicalIcon('statistics')} Kolone u igri</h3>
                <ul>
                    <li><strong>↓ NADOLE:</strong> Popunjava se redom od broja 1 do Yamba. Ne sme se preskakati.</li>
                    <li><strong>↑ NAGORE:</strong> Popunjava se redom od Yamba do broja 1.</li>
                    <li><strong>⇅ SREDINA:</strong> Popunjava se od sredine ka krajevima. Gornja grana kreće od MAX ka 1, a donja od MIN ka Yambu.</li>
                    <li><strong>S SLOBODNA:</strong> Može se popunjavati bilo kojim redosledom u toku igre.</li>
                    <li><strong>R RUČNO:</strong> Boduje se samo posle prvog bacanja. Ako pokušate da upišete polje u ovoj koloni posle drugog ili trećeg bacanja, igra ga upisuje kao 0 tek nakon potvrde.</li>
                    <li><strong>📢 NAJAVA:</strong> Posle prvog bacanja možete odmah upisati rezultat u ovu kolonu ili najaviti prazno polje za sledeća bacanja. Najavu možete otkazati pre drugog bacanja. Posle njega morate upisati najavljeno polje, čak i ako vredi 0.</li>
                </ul>
                
                <h3>${rulesCanonicalIcon('leaderboard')} Bodovanje i sekcije</h3>
                <h4>1. SEKCIJA (1-6)</h4>
                <p>U svakoj koloni posebno saberite poene iz redova 1–6. Zbir od najmanje 60 donosi <strong>još 30 poena</strong> u toj koloni.</p>
                <h4>2. SEKCIJA (MIN - MAX)</h4>
                <p>Od MAX oduzmite MIN i razliku pomnožite brojem upisanim u red 1 iste kolone. Ako je rezultat najmanje 60, dodajte <strong>još 40 poena</strong>. Ako je MIN nula ili je veći od MAX, sekcija vredi 0.</p>
                <p>Primer: uz MAX 25, MIN 10 i četiri upisane jedinice dobijate (25 − 10) × 4 = 60. Sa bonusom to je 100 poena.</p>
                <h4>3. SEKCIJA (KOMBINACIJE)</h4>
                <ul>
                    <li><strong>TRILING (3 iste):</strong> Vrednost tri iste kockice + 20 poena.</li>
                    <li><strong>KENTA (5 u nizu):</strong> Niz 1-5 ili 2-6. Vredi 66 iz prvog bacanja, 56 iz drugog i 46 iz trećeg.</li>
                    <li><strong>FUL (3 iste + 2 iste):</strong> Zbir pet kockica + 30 poena. Yamb se može upisati i kao Ful.</li>
                    <li><strong>POKER (4 iste):</strong> Vrednost četiri iste kockice + 40 poena.</li>
                    <li><strong>YAMB (5 istih):</strong> Vrednost pet istih kockica + 50 poena.</li>
                </ul>
            `
        },
        {
            title: `${rulesCanonicalIcon('statisticsPage', 'rules-page-icon-canonical')} Statistika i liste`,
            content: `
                <h3>${rulesCanonicalIcon('statistics')} Praćenje statistike</h3>
                <p>Yamb of the Balkan čuva važne rezultate i pokazatelje napretka:</p>
                <ul>
                    <li><strong>${rulesCanonicalIcon('powerIndex')} Indeks moći (Power Index):</strong> Glavni pokazatelj uspeha koji spaja rezultate, pobede, trofeje i ligaški učinak.</li>
                    <li><strong>${rulesCanonicalIcon('record')} Rekord:</strong> Vaš najbolji lični rezultat.</li>
                    <li><strong>${rulesCanonicalIcon('wins')} Odnos pobeda/poraza (W/L):</strong> Prikazuje efikasnost u direktnim online duelima i turnirima.</li>
                    <li><strong>${rulesCanonicalIcon('fireStreak')} Vatreni niz:</strong> Uzastopne pobede u duelima i turnirima. Poraz ili remi prekida niz.</li>
                    <li><strong>${rulesCanonicalIcon('allTimePoints')} All-Time PTS:</strong> Ukupan zbir poena kroz sve završene partije.</li>
                    <li><strong>${rulesCanonicalIcon('h2h')} Rival:</strong> Protivnik sa kojim ste odigrali najviše duela.</li>
                </ul>
                
                <h3>${rulesCanonicalIcon('h2h')} Međusobni dueli (H2H)</h3>
                <p>Otvorite karticu protivnika da vidite istoriju svojih duela: pobede, porazi, nerešeno, najveća pobeda, najteži poraz, prosečni poeni i aktuelni vatreni niz protiv tog rivala.</p>
                
                <h3>${rulesCanonicalIcon('leaderboard')} Top liste i rangiranje</h3>
                <p>Globalna lista prikazuje jedan najbolji rezultat po igraču za izabrani period. Kod istog broja poena prednost ima ranije ostvaren rezultat.</p>
                <ul>
                    <li><strong>Nedeljna lista:</strong> Prikazuje najbolje rezultate iz tekuće nedelje.</li>
                    <li><strong>Mesečna lista:</strong> Prikazuje najbolje rezultate iz tekućeg meseca.</li>
                    <li><strong>Sva vremena:</strong> Čuva najjače rezultate od početka igre.</li>
                    <li><strong>Lokalna lista:</strong> Privatni pregled najboljih rezultata na vašem uređaju.</li>
                </ul>
            `
        },
        {
            title: `${rulesCanonicalIcon('competitionsPage', 'rules-page-icon-canonical')} Multiplayer i takmičenja`,
            content: `
                <h3>${rulesCanonicalIcon('onlineRandom')} Multiplayer i dueli</h3>
                <h4>${rulesCanonicalIcon('onlineRandom')} Klasični Multiplayer</h4>
                <p>Online igra vas spaja sa protivnikom koji je trenutno na mreži. I nasumični i privatni onlajn dueli ulaze u međusobnu statistiku (H2H).</p>
                <h4>${rulesCanonicalIcon('inviteFriend')} Privatni dueli</h4>
                <p>U sobi „Pozovi prijatelja“ podelite link do privatne sobe ili pošaljite poziv prijatelju u igri. To je poziv za zajedničku partiju, a ne kod za nagradu za preporuku.</p>

                <h3>${rulesCanonicalIcon('tournament')} Turniri</h3>
                <ul>
                    <li><strong>${rulesCanonicalIcon('tournament')} Sistem:</strong> Nedeljni turnir prima 8 igrača i igra se na ispadanje: četvrtfinale, polufinale i finale. Nerešena partija se ponavlja dok neko ne pobedi.</li>
                    <li><strong>${rulesCanonicalIcon('ducat')} Prijava:</strong> Kotizacija je 5.500 dukata. Pre početka možete se odjaviti uz pun povraćaj.</li>
                    <li><strong>Potvrda spremnosti:</strong> Ako turnir traži potvrdu, svih osam igrača mora da potvrdi učešće pre žreba. Za potvrdu imate šest sati; računa se samo vreme od 09 do 22 h po Beogradu. Ako propustite rok, mesto se oslobađa uz povraćaj kotizacije, bez kazne. Ako se u roku od 24 sata ne skupi osam potvrda, kotizacije se vraćaju i prijave počinju ponovo.</li>
                    <li><strong>${rulesCanonicalIcon('tournamentStart')} Zakazivanje:</strong> Otvorite svoj meč u kosturu i predložite termin, prihvatite protivnikov ili pošaljite drugi predlog. Potvrđen termin ne pokreće partiju automatski: otvorite meč i pokrenite duel ili prihvatite poziv protivnika. Ako je ponuđena evidencija prisustva, prijavite prisustvo i ostanite u sobi turnira dok čekate.</li>
                    <li><strong>${rulesCanonicalIcon('tournament')} Nagrade:</strong> Pobednik dobija 44.000 dukata, veliki rast Indeksa moći i ${rulesCanonicalIcon('hallOfFame')} upis u Dvoranu slavnih. Finalista koji izgubi finale dobija povraćaj uloga od 5500 dukata.</li>
                    <li><strong>${rulesCanonicalIcon('disconnected')} Tehnički rezultat:</strong> Napuštanje partije ili istek vremena mogu doneti tehničku pobedu protivniku. Kod turnira koji beleže prisustvo, prva dokazana neaktivnost donosi upozorenje. Ako se ponovi u naredna tri nastupa, preskačete sledeće izdanje. Sam prekid veze nije dokaz neaktivnosti.</li>
                </ul>
                
                <h3>${rulesCanonicalIcon('quarterly')} Kvartalna liga</h3>
                <p>Kvartal traje tri kalendarska meseca po vremenu Beograda. U redovnoj solo, AI, lokalnoj ili online partiji vaš konačni skor ulazi u kvartal u kojem je partija završena. Kod tehničkog ishoda dobitak i odbitak računaju se zasebno, prema proseku svakog igrača. Ligaški zbir ne može biti negativan.</p>
                <p>Rezultati za prethodni kvartal primaju se do 06:05 prvog dana novog kvartala, po vremenu Beograda. Naknadno potvrđena partija ostaje u istoriji i redovnoj statistici, ali ne menja ligaške zbirove, medalje ni nagrade.</p>
                <p>Rangovi su: Amater 0-4.999, Profi 5.000-14.999, Majstor 15.000-49.999, Legenda 50.000-99.999 i Titan od 100.000 poena.</p>
                <p>${rulesCanonicalIcon('quarterly', 'rules-asset-icon--png')} ${rulesQlPodiumPackHtml()} Posle završnog obračuna kvartala prva tri igrača dobijaju 10.000, 5.000 i 2.500 dukata i medalje, a prvoplasirani postaje Šampion ciklusa. Poeni prelaze u Sva vremena, dok novi kvartal kreće od nule.</p>
            `
        },
        {
            title: `${rulesCanonicalIcon('communicationPage', 'rules-page-icon-canonical')} Komunikacija`,
            content: `
                <h3>${rulesCanonicalIcon('onlinePlayers')} Online igrači i interakcija</h3>
                <p>Aplikacija prikazuje broj igrača koji su trenutno na mreži i listu dostupnih igrača.</p>
                <ul>
                    <li><strong>${rulesCanonicalIcon('addFriend')} Dodaj prijatelja:</strong> Pošaljite zahtev željenom igraču u realnom vremenu.</li>
                    <li><strong>${rulesCanonicalIcon('spectate')} Gledaj partiju:</strong> Posmatrajte tuđe mečeve uživo kada niste učesnik tog duela.</li>
                    <li><strong>${rulesCanonicalIcon('duel')} Izazov:</strong> Klikom na ikonicu možete direktno izazvati igrača na duel.</li>
                </ul>

                <h3>${rulesCanonicalIcon('mailbox')} Pošta</h3>
                <p>U Poštu stižu zahtevi za prijateljstvo, turnirski podsetnici i obaveštenja o nagradama. Preko opcije „Prijavi problem“ možete pisati podršci; odgovor stiže u Poštu. Neprimerenu poruku u četu prijavite uz samu poruku.</p>

                <h3>${rulesCanonicalIcon('globalChat')} Chat i komunikacija</h3>
                <ul>
                    <li><strong>${rulesCanonicalIcon('globalChat')} Globalni chat:</strong> Povezuje igrače na serveru. Zabranjene su uvrede po rasnoj, verskoj, nacionalnoj ili polnoj osnovi, kao i vulgarnost. Kršenja pravila vode do suspenzije chata.</li>
                    <li><strong>${rulesCanonicalIcon('duel')} Duel chat:</strong> Tokom meča možete pisati protivniku ili isključiti čet. Dok je čet isključen, protivnik vam ne može poslati poruku.</li>
                    <li><strong>${rulesCanonicalIcon('duel')} Izazov iz chata:</strong> Klikom na ime igrača u globalnom chatu možete ga direktno izazvati.</li>
                </ul>
            `
        },
        {
            title: `${rulesCanonicalIcon('economyPage', 'rules-page-icon-canonical')} Dukati, tokeni i Riznica`,
            content: `
                <h3>${rulesCanonicalIcon('ducat')} Dukati i ekonomija</h3>
                <p>Dukati su glavna valuta u igri. Koriste se za prijave na turnire, kupovine u Riznici i napredovanje kroz kolekcije.</p>
                <ul>
                    <li><strong>${rulesTextGlyphHtml('🎲')} Završene partije:</strong> Za regularno završenu partiju dobijate dukate prema svom rezultatu. U solo igri potvrđeni rekordi mogu povećati osnovicu. Nagradni video duplira iznos sa bonusima, do ukupno 8.000 dukata po partiji.</li>
                    <li><strong>${rulesCanonicalIcon('daily')} Dnevni izazov:</strong> Dnevna nagrada je dostupna jednom dnevno. Server određuje kockice: prve 4 se sabiraju, 5. kockica množi taj zbir, a 6. množi ceo rezultat. <br><strong>Yamb bonus:</strong> Pet ili šest istih kockica, na bilo kojim pozicijama, donosi jedan bonus od 1.000 dukata. Reklama duplira celu nagradu, uključujući bonus.</li>
                    <li><strong>${rulesCanonicalIcon('video')} Reklame za nagradu:</strong> U meniju dukata nagradni video donosi +500 dukata kada je dostupan i potvrđen na serveru.</li>
                    <li><strong>${rulesCanonicalIcon('tournament')} Takmičenja:</strong> Turniri i Kvartalna liga donose najveće nagrade najboljim igračima.</li>
                    <li><strong>${rulesCanonicalIcon('mailbox')} Preporuke:</strong> Kada je ova opcija dostupna u Pošti, podelite svoj poziv. Novi igrač unosi vaš kod pre prve prijave. Kada server potvrdi njegovu prvu regularno završenu onlajn partiju, dobijate nagradu: 3.000 dukata za prvu potvrđenu preporuku, 3.000 za drugu i 5.000 za treću. Dalje preporuke ne donose dukate.</li>
                </ul>

                <h3>${rulesCanonicalIcon('undo')} Vraćanje upisa</h3>
                <p>Dugme za ispravku postaje aktivno posle upisa u tabelu i vraća samo poslednji upis. Posle vraćanja dugme se gasi dok ne napravite novi upis.</p>
                <ul>
                    <li><strong>Online dueli:</strong> Vraćanje upisa troši 1 token i mora se iskoristiti pre nego protivnik započne sledeći potez. Zbog toga postoji zadrška od 2,5 sekunde pre protivnikovog bacanja.</li>
                    <li><strong>Lokalna igra:</strong> U mobilnoj aplikaciji poslednji upis vraćate tek posle odgledanog nagradnog videa. U pregledaču je dovoljna potvrda. Lokalno vraćanje ne troši token.</li>
                    <li><strong>Nabavka tokena:</strong> U meniju dukata nagradni video na kartici za tokene donosi +1 token. Možete imati najviše 250 tokena.</li>
                </ul>

                <h3>${rulesCanonicalIcon('treasury')} Riznica</h3>
                <p>Riznica je mesto za personalizaciju igre i pregled osvojenih stvari.</p>
                <ul>
                    <li><strong>${rulesCanonicalIcon('trophyTab')} Trofeji:</strong> Posebni izazovi se otključavaju tokom igre i mogu doneti nagrade u dukatima.</li>
                    <li><strong>${rulesCanonicalIcon('skinsTab')} Kockice:</strong> Izaberite izgled kockica. Neki kompleti idu uz odgovarajuću temu i ne kupuju se zasebno.</li>
                    <li><strong>${rulesCanonicalIcon('effectsTab')} Efekti:</strong> Kada upišete Yamb iz prvog bacanja, aktivira se grmljavina. Za Yamb iz drugog ili trećeg bacanja prikazuje se izabrani efekat.</li>
                    <li><strong>${rulesCanonicalIcon('themesTab')} Teme:</strong> Menjaju izgled aplikacije. Kod artikala sa oznakom −20% nagradni video snižava cenu tog artikla na deset minuta. Kupovinu i dalje plaćate dukatima.</li>
                </ul>
            `
        },
        {
            title: `${rulesCanonicalIcon('accountPage', 'rules-page-icon-canonical')} Nalog, privatnost i server`,
            content: `
                <h3>${rulesCanonicalIcon('profile')} Prijava i čuvanje naloga</h3>
                <p>Napredak pripada vašem Yamb nalogu. Na drugom uređaju prijavite se na isti nalog. Ako je ponuđena prijava preko Facebooka, a već igrate preko Googlea, prvo se prijavite na postojeći nalog i povežite Facebook u Podešavanjima.</p>
                <p>Na serveru se čuvaju statistika, H2H istorija, dukati, tokeni za vraćanje upisa, trofeji, inventar Riznice, aktivna tema/skin/efekat, Dnevni izazov, Kvartalna liga i turnirski status.</p>

                <h4>${rulesCanonicalIcon('privacy')} Koji podaci se prikupljaju i zašto?</h4>
                <p>Za prikaz vašeg naloga igra koristi sledeće podatke, kada su dostupni:</p>
                <ul>
                    <li><strong>Ime i prezime:</strong> Koristi se za ime u igri i prikaz na listama.</li>
                    <li><strong>Email adresa:</strong> Ako je dostupna, pomaže vam da prepoznate nalog, na primer pri potvrdi brisanja.</li>
                    <li><strong>Profilna slika:</strong> Koristi se kao avatar u multiplayer mečevima.</li>
                </ul>

                <p>U Podešavanjima birate temu i uključujete ili isključujete zvuk, muziku i vibraciju. Kada su ponuđene opcije privatnosti, tu možete promeniti izbor za oglase i analitiku korišćenja.</p>
                <p>U Podešavanjima možete zatražiti trajno brisanje naloga. Kada je opcija dostupna, ponovo potvrdite identitet i proverite koji nalog brišete. Posle slanja zahteva možete proveriti njegov status.</p>

                <h3>${rulesCanonicalIcon('settings')} Server i fer igra</h3>
                <ul>
                    <li><strong>${rulesCanonicalIcon('privacy')} Fer igra:</strong> Server proverava online mečeve, rezultate, ekonomiju i nagrade kako bi sprečio manipulacije.</li>
                    <li><strong>${rulesTextGlyphHtml('⏱️')} Vreme za potez:</strong> Za potez u onlajn duelu imate 90 sekundi. Istek tajmera može doneti tehničku pobedu protivniku.</li>
                    <li><strong>${rulesCanonicalIcon('reconnected')} Prekid veze:</strong> Tajmer poteza se pauzira. Za povratak imate do 30 sekundi u običnom duelu, a do 5 minuta u turnirskom. Ponovni prekid u istom potezu ne obnavlja potrošeno vreme.</li>
                    <li><strong>${rulesCanonicalIcon('disconnected')} Napuštanje meča:</strong> Namerno napuštanje online duela može doneti kaznu u ligi i dukatima.</li>
                </ul>

                <h3>${rulesCanonicalIcon('video')} Reklame (AdMob)</h3>
                <p>Reklame omogućavaju da igra ostane besplatna i da se nagrade potvrde na serveru.</p>
                <ul>
                    <li><strong>${rulesTextGlyphHtml('⏳')} Kratke reklame:</strong> Mogu se prikazati pri povratku u meni. Ne isplaćuju direktno dukate ni tokene.</li>
                    <li><strong>${rulesCanonicalIcon('video')} Nagradne reklame:</strong> Koriste se za dupliranje nagrade, Dnevni izazov, dukate, tokene i popust u Riznici, uz potvrdu na serveru.</li>
                </ul>
            `
        }
    ],
    en: [
        {
            title: `${rulesCanonicalIcon('scoring', 'rules-page-icon-canonical')} Rules & scoring`,
            content: `
                <h3>${rulesTextGlyphHtml('🎯')} Goal of the Game</h3>
                <p>The goal is to score as many points as possible by rolling 6 dice and entering the best combinations into the table. Each turn gives you up to 3 rolls, and after every roll you may hold dice you want to keep.</p>
                <p>The game picks five of your six dice for the chosen row. MAX adds the five highest, MIN the five lowest, and rows 1–6 count at most five matching dice. Held dice stay as they are; only the others are rerolled. All six are considered for scoring.</p>
                <p>Entering a score ends your turn. Fill each cell once; a missing combination scores 0. When both duel sheets are full, the higher total wins.</p>
                
                <h3>${rulesCanonicalIcon('hotseat')} Playing on one device</h3>
                <p>In solo play, fill your sheet and try to beat your personal best. In two-player local play, each player has a sheet; pass the device after entering a score. If an interrupted game is saved on the device, you can resume it when you reopen that mode. Only the signed-in account’s score counts toward the Quarterly League.</p>
                <h3>${rulesCanonicalIcon('statistics')} Game Columns</h3>
                <ul>
                    <li><strong>↓ DOWN:</strong> Must be filled sequentially from 1 to Yamb.</li>
                    <li><strong>↑ UP:</strong> Must be filled sequentially from Yamb to 1.</li>
                    <li><strong>⇅ MIDDLE:</strong> Filled from the middle outward. The upper branch starts at MAX and moves toward 1; the lower branch starts at MIN and moves toward Yamb.</li>
                    <li><strong>FREE:</strong> Can be filled in any order.</li>
                    <li><strong>HAND:</strong> Scores only after the first roll. If you try to enter a field in this column after the second or third roll, the game enters 0 after confirmation.</li>
                    <li><strong>📢 ANNOUNCE:</strong> After the first roll, you can score directly in this column or announce an empty cell for later rolls. You can cancel before the second roll. After that, you must score the announced cell, even if it scores 0.</li>
                </ul>
                
                <h3>${rulesCanonicalIcon('leaderboard')} Scoring & Sections</h3>
                <h4>SECTION 1 (Rows 1 to 6)</h4>
                <p>Add the scores in rows 1–6 separately for each column. A total of at least 60 earns <strong>30 extra points</strong> in that column.</p>
                <h4>SECTION 2 (MIN - MAX)</h4>
                <p>Subtract MIN from MAX, then multiply by the score in the ones row of the same column. If the result is at least 60, add <strong>40 extra points</strong>. If MIN is zero or higher than MAX, the section scores 0.</p>
                <p>Example: with MAX 25, MIN 10 and four ones, (25 − 10) × 4 = 60. With the bonus, that is 100 points.</p>
                <h4>SECTION 3 (COMBINATIONS)</h4>
                <ul>
                    <li><strong>THREE OF A KIND:</strong> Value of the three matching dice + 20 points.</li>
                    <li><strong>STRAIGHT:</strong> Sequence 1-5 or 2-6. Scores 66 on the first roll, 56 on the second, and 46 on the third.</li>
                    <li><strong>FULL HOUSE:</strong> Sum of five dice + 30 points. Yamb can also be entered as a Full House.</li>
                    <li><strong>POKER (4 of a kind):</strong> Value of the four matching dice + 40 points.</li>
                    <li><strong>YAMB (5 of a kind):</strong> Value of the five matching dice + 50 points.</li>
                </ul>
            `
        },
        {
            title: `${rulesCanonicalIcon('statisticsPage', 'rules-page-icon-canonical')} Stats & leaderboards`,
            content: `
                <h3>${rulesCanonicalIcon('statistics')} Stat tracking</h3>
                <p>Yamb of the Balkan saves the most important results and progress indicators:</p>
                <ul>
                    <li><strong>${rulesCanonicalIcon('powerIndex')} Power Index:</strong> The main success indicator, combining results, wins, trophies, and league performance.</li>
                    <li><strong>${rulesCanonicalIcon('record')} High score:</strong> Your personal best score.</li>
                    <li><strong>${rulesCanonicalIcon('wins')} W/L Ratio:</strong> Shows your efficiency in direct online duels and tournaments.</li>
                    <li><strong>${rulesCanonicalIcon('fireStreak')} Win Streak:</strong> Consecutive wins in duels and tournaments. A loss or draw ends the streak.</li>
                    <li><strong>${rulesCanonicalIcon('allTimePoints')} All-Time PTS:</strong> Total points across all finished games.</li>
                    <li><strong>${rulesCanonicalIcon('h2h')} Rival:</strong> The opponent you have played against most often.</li>
                </ul>
                
                <h3>${rulesCanonicalIcon('h2h')} Head-to-Head (H2H)</h3>
                <p>Open an opponent’s H2H card to see your duel history: wins, losses, draws, biggest win, worst loss, average points, and current win streak against that rival.</p>
                
                <h3>${rulesCanonicalIcon('leaderboard')} Leaderboards</h3>
                <p>The global leaderboard shows each player's best score for the selected period. If scores are tied, the earlier result ranks higher.</p>
                <ul>
                    <li><strong>Weekly:</strong> Best scores from the current week.</li>
                    <li><strong>Monthly:</strong> Best scores from the current month.</li>
                    <li><strong>All-Time:</strong> The strongest scores since the game began.</li>
                    <li><strong>Local List:</strong> Private best-score history on your device.</li>
                </ul>
            `
        },
        {
            title: `${rulesCanonicalIcon('competitionsPage', 'rules-page-icon-canonical')} Multiplayer & competitions`,
            content: `
                <h3>${rulesCanonicalIcon('onlineRandom')} Multiplayer & Duels</h3>
                <h4>${rulesCanonicalIcon('onlineRandom')} Classic Multiplayer</h4>
                <p>Online play matches you with an opponent who is currently online. Both random and private online duels count toward head-to-head stats (H2H).</p>
                <h4>${rulesCanonicalIcon('inviteFriend')} Friend Duels</h4>
                <p>In Invite a Friend, share your private room link or send an in-game invitation to a friend. This invites them to play a match; it is not the referral code used to earn rewards.</p>

                <h3>${rulesCanonicalIcon('tournament')} Tournaments</h3>
                <ul>
                    <li><strong>${rulesCanonicalIcon('tournament')} Format:</strong> The weekly tournament accepts 8 players and is played as a knockout bracket: quarterfinals, semifinals, and final. A tied game is replayed until one player wins.</li>
                    <li><strong>${rulesCanonicalIcon('ducat')} Entry:</strong> Entry costs 5,500 ducats. You can withdraw for a full refund before the tournament starts.</li>
                    <li><strong>Readiness check:</strong> In tournaments that require confirmation, all eight players must confirm before the draw. You have six hours to confirm; only time between 09:00 and 22:00 in Belgrade counts. Missing the deadline releases your spot with a full refund and no penalty. If eight players have not confirmed within 24 hours, entry fees are refunded and registration reopens.</li>
                    <li><strong>${rulesCanonicalIcon('tournamentStart')} Scheduling:</strong> Open your bracket match to propose a time, accept your opponent’s proposal or suggest another time. Agreeing on a time does not start the game: open the match and start the duel or accept your opponent’s invitation. If check-in is offered, check in and stay in the tournament room while waiting.</li>
                    <li><strong>${rulesCanonicalIcon('tournament')} Rewards:</strong> The winner receives 44,000 ducats, a major Power Index boost, and a ${rulesCanonicalIcon('hallOfFame')} Hall of Fame entry. The finalist who loses the final gets the 5500 ducat entry fee refunded.</li>
                    <li><strong>${rulesCanonicalIcon('disconnected')} Technical result:</strong> Leaving a game or timing out can award a technical win to the opponent. In tournaments that track attendance, the first verified inactivity incident earns a warning. A repeat within your next three appearances means missing the next edition. A connection drop alone is not proof of inactivity.</li>
                </ul>
                
                <h3>${rulesCanonicalIcon('quarterly')} Quarterly League</h3>
                <p>A quarter lasts three calendar months in Belgrade time. Your final score in a regular solo, AI, local or online game counts toward the quarter in which it finished. For a technical result, the gain and deduction are calculated separately using each player's average. League scores cannot fall below zero.</p>
                <p>Results for the previous quarter are accepted until 06:05 on the first day of the new quarter, Belgrade time. A game confirmed later still counts in match history and regular stats, but does not change league totals, medals or prizes.</p>
                <p>The ranks are: Amateur 0-4,999, Pro 5,000-14,999, Master 15,000-49,999, Legend 50,000-99,999, and Titan from 100,000 points.</p>
                <p>${rulesCanonicalIcon('quarterly', 'rules-asset-icon--png')} ${rulesQlPodiumPackHtml()} After the quarter's final settlement, the top three players receive 10,000, 5,000, and 2,500 ducats plus medals, while first place becomes the Cycle Champion. Points move to All-Time and the new quarter starts from zero.</p>
            `
        },
        {
            title: `${rulesCanonicalIcon('communicationPage', 'rules-page-icon-canonical')} Communication`,
            content: `
                <h3>${rulesCanonicalIcon('onlinePlayers')} Online Players & Interaction</h3>
                <p>The app shows how many players are currently online and lists available players.</p>
                <ul>
                    <li><strong>${rulesCanonicalIcon('addFriend')} Add Friend:</strong> Send a real-time friend request.</li>
                    <li><strong>${rulesCanonicalIcon('spectate')} Spectate:</strong> Watch other matches live when you are not a participant in that duel.</li>
                    <li><strong>${rulesCanonicalIcon('duel')} Challenge:</strong> Use the challenge icon to invite a player directly to a duel.</li>
                </ul>

                <h3>${rulesCanonicalIcon('mailbox')} Inbox</h3>
                <p>Your Inbox receives friend requests, tournament reminders and prize notices. Choose “Report a problem” to contact support; the reply arrives in your Inbox. To report an inappropriate chat message, use the report action on that message.</p>

                <h3>${rulesCanonicalIcon('globalChat')} Chat & Communication</h3>
                <ul>
                    <li><strong>${rulesCanonicalIcon('globalChat')} Global Chat:</strong> Connects players on the server. Insults based on race, religion, nationality, or gender are forbidden, as is profanity. Violations lead to chat suspension.</li>
                    <li><strong>${rulesCanonicalIcon('duel')} Duel Chat:</strong> You can message your opponent during the match or turn duel chat off. While it is off, your opponent cannot send you messages.</li>
                    <li><strong>${rulesCanonicalIcon('duel')} Chat challenge:</strong> Clicking a player's name in global chat can challenge that player directly.</li>
                </ul>
            `
        },
        {
            title: `${rulesCanonicalIcon('economyPage', 'rules-page-icon-canonical')} Ducats, tokens & Treasury`,
            content: `
                <h3>${rulesCanonicalIcon('ducat')} Ducats & economy</h3>
                <p>Ducats are the main in-game currency. They are used for tournament entries, Treasury purchases, and collection progress.</p>
                <ul>
                    <li><strong>${rulesTextGlyphHtml('🎲')} Finished games:</strong> A regularly finished game earns ducats based on your score. In solo play, verified records can increase the base reward. A rewarded video doubles the amount including bonuses, up to 8,000 ducats in total per game.</li>
                    <li><strong>${rulesCanonicalIcon('daily')} Daily Challenge:</strong> The daily reward is available once per day. The server sets the dice: the first 4 are summed, the 5th die multiplies that sum, and the 6th multiplies the total. <br><strong>Yamb bonus:</strong> Five or six matching dice in any positions earn one bonus of 1,000 ducats. An ad doubles the entire reward, including the bonus.</li>
                    <li><strong>${rulesCanonicalIcon('video')} Reward ads:</strong> In the ducat menu, a rewarded video grants +500 ducats when available and verified by the server.</li>
                    <li><strong>${rulesCanonicalIcon('tournament')} Competitions:</strong> Tournaments and the Quarterly League give the largest rewards to top players.</li>
                    <li><strong>${rulesCanonicalIcon('mailbox')} Referrals:</strong> When referrals are available in your Inbox, share your invite. The new player enters your code before their first sign-in. Once the server confirms their first regularly completed online game, you earn 3,000 ducats for your first confirmed referral, 3,000 for the second and 5,000 for the third. Further referrals earn no ducats.</li>
                </ul>

                <h3>${rulesCanonicalIcon('undo')} Undo entry</h3>
                <p>The undo button becomes active after an entry in the table and only restores the last entry. After undoing, the button deactivates until you make another entry.</p>
                <ul>
                    <li><strong>Online duels:</strong> Undoing costs 1 undo token and must be used before the opponent starts the next turn. This is why there is a 2.5-second delay before the opponent's roll.</li>
                    <li><strong>Local play:</strong> In the mobile app, you must finish a rewarded video to undo a local entry. In the browser, confirming is enough. Local undo does not spend a token.</li>
                    <li><strong>Getting tokens:</strong> The token tab in the ducat menu offers +1 token for a rewarded video. You can hold up to 250 tokens.</li>
                </ul>

                <h3>${rulesCanonicalIcon('treasury')} Treasury</h3>
                <p>The Treasury is where you personalize the game and review collected items.</p>
                <ul>
                    <li><strong>${rulesCanonicalIcon('trophyTab')} Trophies:</strong> Special challenges unlock during play and can reward ducats.</li>
                    <li><strong>${rulesCanonicalIcon('skinsTab')} Dice:</strong> Choose a dice skin. Some sets come with their matching theme and are not sold separately.</li>
                    <li><strong>${rulesCanonicalIcon('effectsTab')} Effects:</strong> Scoring Yamb on your first roll triggers thunder. Scoring it on your second or third roll plays your selected effect.</li>
                    <li><strong>${rulesCanonicalIcon('themesTab')} Themes:</strong> Change the app appearance. For items marked −20%, a rewarded video reduces that item's price for ten minutes. You still pay for the item in ducats.</li>
                </ul>
            `
        },
        {
            title: `${rulesCanonicalIcon('accountPage', 'rules-page-icon-canonical')} Account, privacy & server`,
            content: `
                <h3>${rulesCanonicalIcon('profile')} Sign-in & Cloud Save</h3>
                <p>Your progress belongs to your Yamb account. Sign in to the same account on another device to restore it. If Facebook sign-in is offered and you already play through Google, sign in to your existing account first and link Facebook in Settings.</p>
                <p>The server saves stats, H2H history, ducats, undo tokens, trophies, Treasury inventory, active theme/skin/effect, Daily Challenge, Quarterly League, and tournament status.</p>

                <h4>${rulesCanonicalIcon('privacy')} What data is collected and why?</h4>
                <p>When you sign in, the app uses available data from your sign-in profile:</p>
                <ul>
                    <li><strong>First and last name:</strong> Used for your in-game name and leaderboard display.</li>
                    <li><strong>Email address:</strong> When available, it helps you identify the account, for example when confirming deletion.</li>
                    <li><strong>Profile picture:</strong> Used as your avatar in multiplayer matches.</li>
                </ul>

                <p>In Settings, you can choose a theme and turn sound, music and vibration on or off. When privacy options are available, you can also change your choices for ads and usage analytics.</p>
                <p>You can request permanent account deletion in Settings when available. Verify your identity again and check which account you are deleting. After submitting the request, you can check its status.</p>

                <h3>${rulesCanonicalIcon('settings')} Server & Fair Play</h3>
                <ul>
                    <li><strong>${rulesCanonicalIcon('privacy')} Fair play:</strong> The server checks online matches, results, economy, and rewards to prevent manipulation.</li>
                    <li><strong>${rulesTextGlyphHtml('⏱️')} Turn timer:</strong> You have 90 seconds for an online turn. Running out of time can award a technical win to your opponent.</li>
                    <li><strong>${rulesCanonicalIcon('reconnected')} Reconnecting:</strong> The turn timer pauses. You have up to 30 seconds to return in a regular duel and up to 5 minutes in a tournament match. Disconnecting again on the same turn does not restore time already used.</li>
                    <li><strong>${rulesCanonicalIcon('disconnected')} Leaving a match:</strong> Intentionally leaving an online duel can cause league and ducat penalties.</li>
                </ul>

                <h3>${rulesCanonicalIcon('video')} Ads (AdMob)</h3>
                <p>Ads help keep the game free and allow rewards to be verified by the server.</p>
                <ul>
                    <li><strong>${rulesTextGlyphHtml('⏳')} Short ads:</strong> May appear when returning to the menu. They do not directly pay ducats or undo tokens.</li>
                    <li><strong>${rulesCanonicalIcon('video')} Rewarded ads:</strong> Used for reward doubling, Daily Challenge, ducats, undo tokens, and Treasury discounts, with server verification.</li>
                </ul>
            `
        }
    ]
};

class RulesUI {
    constructor() {
        this.currentLang = localStorage.getItem('yamb_lang') || 'sr';
        this.currentSlide = 0;
        this.overlay = null;
        this.sliderTrack = null;
        this.dots = [];
        this.touchStartX = 0;
        this.touchStartY = 0;
        this.previousFocus = null;
    }

    init() {
        const existing = document.getElementById('rules-overlay-ui');
        if (existing) existing.remove();

        this.overlay = document.createElement('div');
        this.overlay.id = 'rules-overlay-ui';
        this.overlay.className = 'modal-overlay global-chat-overlay rules-overlay';
        
        this.overlay.innerHTML = `
            <div class="rules-card modal-box global-chat-shell" role="dialog" aria-modal="true" aria-labelledby="rules-main-title">
                
                <div class="chat-header global-chat-header rules-card-header">
                    <div class="global-chat-title-group">
                        <span id="rules-main-title" class="global-chat-title rules-header-title">
                            <img class="rules-header-icon rules-header-icon-canonical" data-rules-role="rules" src="${rulesCanonicalSource('rules')}" alt="" aria-hidden="true" decoding="async">
                            <span>${typeof t === 'function' ? t('rules_header_title') : (this.currentLang === 'sr' ? 'PRAVILA I UPUTSTVO' : 'RULES & GUIDE')}</span>
                        </span>
                    </div>
                    <button id="btn-close-rules" type="button" class="global-chat-close" aria-label="${this.currentLang === 'sr' ? 'Zatvori pravila' : 'Close rules'}">&times;</button>
                </div>

                <div id="rules-slider-track" class="chat-body global-chat-body rules-slider-track">
                    ${this.generateSlides()}
                </div>

                <div id="rules-dots-container" class="chat-footer global-chat-footer rules-dots-container">
                    ${this.generateDots()}
                </div>
            </div>
        `;

        document.body.appendChild(this.overlay);
        this.sliderTrack = document.getElementById('rules-slider-track');
        this.dots = Array.from(document.querySelectorAll('.rule-dot'));

        this.attachEvents();
    }

    generateSlides() {
        const data = RulesData[this.currentLang];
        return data.map((slide, index) => `
            <div class="rules-slide">
                <h2 class="rules-slide-title">${slide.title}</h2>
                <div class="rules-slide-content">
                    ${slide.content}
                </div>
            </div>
        `).join('');
    }

    generateDots() {
        const data = RulesData[this.currentLang];
        const slideLabel = this.currentLang === 'sr' ? 'Slajd' : 'Slide';
        return data.map((_, index) => `
            <button type="button" class="rule-dot${index === 0 ? ' active' : ''}" data-index="${index}" aria-label="${slideLabel} ${index + 1}"${index === 0 ? ' aria-current="step"' : ''}></button>
        `).join('');
    }

    attachEvents() {
        document.getElementById('btn-close-rules').addEventListener('click', () => this.close());
        this.overlay.addEventListener('keydown', (event) => {
            if (event.key === 'Escape') this.close();
        });
        
        // Detekcija prelaska na drugi slajd pomoću nativnog skrola
        this.sliderTrack.addEventListener('scroll', () => {
            const index = Math.round(this.sliderTrack.scrollLeft / this.sliderTrack.clientWidth);
            if(this.currentSlide !== index) {
                this.currentSlide = index;
                this.updateDots();
            }
        }, { passive: true });

        // Klik na tačkice za promenu slajda
        this.dots.forEach((dot, i) => {
            dot.addEventListener('click', () => {
                this.goToSlide(i);
            });
        });

        this.sliderTrack.addEventListener('touchstart', (e) => {
            const touch = e.touches[0];
            if (!touch) return;
            this.touchStartX = touch.clientX;
            this.touchStartY = touch.clientY;
            this.touchStartScrollLeft = this.sliderTrack.scrollLeft;
            this.touchGestureHorizontal = false;
        }, { passive: true });

        this.sliderTrack.addEventListener('touchmove', (e) => {
            if (document.documentElement.dataset.splashTheme !== 'dark') return;
            const touch = e.touches[0];
            if (!touch) return;
            const deltaX = touch.clientX - this.touchStartX;
            const deltaY = touch.clientY - this.touchStartY;
            if (Math.abs(deltaX) > 12 && Math.abs(deltaX) > Math.abs(deltaY) * 1.2) {
                this.touchGestureHorizontal = true;
            }
            if (this.touchGestureHorizontal && e.cancelable) e.preventDefault();
        }, { passive: false });

        this.sliderTrack.addEventListener('touchend', (e) => {
            const touch = e.changedTouches[0];
            if (!touch) return;

            const deltaX = touch.clientX - this.touchStartX;
            const deltaY = touch.clientY - this.touchStartY;
            const isHorizontalSwipe = Math.abs(deltaX) > 45 && Math.abs(deltaX) > Math.abs(deltaY) * 1.2;

            if (!isHorizontalSwipe) return;

            // Native scroll-snap can already have advanced the Green carousel.
            // Use the gesture's starting page so one swipe never skips two pages.
            if (document.documentElement.dataset.splashTheme === 'dark') {
                const startIndex = Math.round(this.touchStartScrollLeft / this.sliderTrack.clientWidth);
                this.goToSlide(startIndex + (deltaX < 0 ? 1 : -1));
                return;
            }

            if (deltaX < 0) {
                this.goToSlide(this.currentSlide + 1);
            } else {
                this.goToSlide(this.currentSlide - 1);
            }
        }, { passive: true });
    }

    updateDots() {
        this.dots.forEach((dot, i) => {
            if (i === this.currentSlide) dot.setAttribute('aria-current', 'step');
            else dot.removeAttribute('aria-current');
            if (i === this.currentSlide) {
                dot.classList.add('active');
            } else {
                dot.classList.remove('active');
            }
        });
    }

    goToSlide(index) {
        const data = RulesData[this.currentLang] || [];
        const lastIndex = Math.max(0, data.length - 1);
        this.currentSlide = Math.min(Math.max(index, 0), lastIndex);
        this.updateDots();
        const targetScroll = this.sliderTrack.clientWidth * this.currentSlide;
        const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
        this.sliderTrack.scrollTo({ left: targetScroll, behavior: reduceMotion ? 'auto' : 'smooth' });
    }

    open() {
        this.previousFocus = document.activeElement;
        const currentStoredLang = localStorage.getItem('yamb_lang') || 'sr';
        if (this.currentLang !== currentStoredLang) {
            this.currentLang = currentStoredLang;
            this.init(); 
        }
        this.overlay.querySelectorAll('img[data-rules-role]').forEach(image => {
            image.src = rulesCanonicalSource(image.dataset.rulesRole);
        });
        this.overlay.querySelectorAll('.rules-podium-pack-canonical img[data-medal-tier]').forEach(image => {
            image.src = getThemeMedalSource('quarterlyLeague', image.dataset.medalTier);
        });
        
        this.overlay.style.display = 'flex';
        
        // Resetovanje pozicije trenutno bez animacije
        this.sliderTrack.style.scrollBehavior = 'auto';
        this.sliderTrack.scrollLeft = 0;
        this.currentSlide = 0;
        this.updateDots();

        // Ponovo uključivanje glatke animacije nakon renderovanja
        setTimeout(() => {
            const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
            this.sliderTrack.style.scrollBehavior = reduceMotion ? 'auto' : 'smooth';
            this.overlay.classList.add('active');
            this.overlay.querySelector('#btn-close-rules')?.focus({ preventScroll: true });
        }, 10);
    }

    close() {
        this.overlay.classList.remove('active');
        setTimeout(() => {
            this.overlay.style.display = 'none';
            if (this.previousFocus?.isConnected) this.previousFocus.focus({ preventScroll: true });
            this.previousFocus = null;
        }, 300);
    }
}

// Inicijalizuj instancu
const GameRules = new RulesUI();

document.addEventListener('DOMContentLoaded', () => {
    GameRules.init();
});

// Otključavamo globalnu funkciju za index.html i game.js
window.showGameRules = function() {
    GameRules.open();
};
