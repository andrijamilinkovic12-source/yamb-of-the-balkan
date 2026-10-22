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
    const roles = {
        rules: 'rules-room-identity/rules-room-v1.png',
        scoring: green ? 'rules-page-illustrations/rules-scoring-v1.png' : 'rules-room-identity/rules-room-v1.png',
        statisticsPage: green ? 'rules-page-illustrations/stats-leaderboards-v1.png' : 'statistics-room-identity/statistics-room-v1.png',
        competitionsPage: green ? 'rules-page-illustrations/multiplayer-competitions-v1.png' : 'tournament-awards/champion-trophy-v1.png',
        communicationPage: green ? '../rules/pages/communication-v1.png' : 'global-chat-room-identity/global-chat-room-v1.png',
        economyPage: green ? '../rules/pages/economy-treasury-v3.png' : 'ducat/ducat-front-v1.png',
        accountPage: green ? 'rules-page-illustrations/account-server-v1.png' : 'settings-room-identity/settings-room-v1.png',
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
        tournament: 'tournament-awards/champion-trophy-v1.png',
        tournamentStart: 'tournament-states/state-start-v1.png',
        hallOfFame: 'tournament-navigation/tab-hall-of-fame-v1.png',
        quarterly: 'quarterly-league-room-identity/quarterly-league-room-v2.png',
        onlinePlayers: 'online-players-room-identity/online-players-room-v1.png',
        addFriend: green ? '../online-add-friend-v1.png' : 'online-players-internal/friend-v1.png',
        spectate: green ? '../online-spectate-v1.png' : 'online-players-internal/spectate-v1.png',
        duel: green ? '../online-duel-v1.png' : 'online-players-internal/duel-v1.png',
        globalChat: 'global-chat-room-identity/global-chat-room-v1.png',
        ducat: 'ducat/ducat-inline-v1.png',
        daily: 'daily-room-identity/daily-room-v1.png',
        video: 'rewarded-video/rewarded-video-active-inline-v1.png',
        undo: 'undo-token/undo-token-inline-v1.png',
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
    return `${canonical}/${roles[role]}`;
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
                <p>Svako polje u tabeli može se popuniti samo jednom. Ako kombinacija ne postoji, u polje se upisuje 0.</p>
                
                <h3>${rulesCanonicalIcon('statistics')} Kolone u igri</h3>
                <ul>
                    <li><strong>↓ NADOLE:</strong> Popunjava se redom od broja 1 do Yamba. Ne sme se preskakati.</li>
                    <li><strong>↑ NAGORE:</strong> Popunjava se redom od Yamba do broja 1.</li>
                    <li><strong>⇅ SREDINA:</strong> Popunjava se od sredine ka krajevima. Gornja grana kreće od MAX ka 1, a donja od MIN ka Yambu.</li>
                    <li><strong>S SLOBODNA:</strong> Može se popunjavati bilo kojim redosledom u toku igre.</li>
                    <li><strong>R RUČNO:</strong> Boduje se samo posle prvog bacanja. Ako pokušate da upišete polje u ovoj koloni posle drugog ili trećeg bacanja, igra ga upisuje kao 0 tek nakon potvrde.</li>
                    <li><strong>${rulesTextGlyphHtml('📢')} NAJAVA:</strong> Posle prvog bacanja možete uključiti Najavu, izabrati tačno polje u koloni Najava i zatim morate upisati baš to polje. Najava se može otkazati dok još nije zaključana.</li>
                </ul>
                
                <h3>${rulesCanonicalIcon('leaderboard')} Bodovanje i sekcije</h3>
                <h4>1. SEKCIJA (1-6)</h4>
                <p>Sabiraju se samo odgovarajući brojevi. Ako je zbir u ovoj sekciji najmanje 60, dobijate <strong>bonus od +30 poena</strong>.</p>
                <h4>2. SEKCIJA (MIN - MAX)</h4>
                <p>Računa se formulom: <em>(Max - Min) * broj jedinica</em>. Ako je rezultat najmanje 60, dodaje se <strong>bonus od +40 poena</strong>. Ako je MIN 0 ili je obračun negativan, ova sekcija vredi 0.</p>
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
                    <li><strong>${rulesCanonicalIcon('fireStreak')} Vatreni niz:</strong> Broj uzastopnih pobeda ostvarenih u duelima i turnirima.</li>
                    <li><strong>${rulesCanonicalIcon('allTimePoints')} All-Time PTS:</strong> Ukupan zbir poena kroz sve završene partije.</li>
                    <li><strong>${rulesCanonicalIcon('h2h')} Rival:</strong> Prijatelj sa kojim imate najviše odigranih međusobnih duela.</li>
                </ul>
                
                <h3>${rulesCanonicalIcon('h2h')} Međusobni dueli (H2H)</h3>
                <p>Za svakog prijatelja-rivala formira se H2H kartica sa istorijom okršaja: pobede, porazi, nerešeno, najveća pobeda, najteži poraz, prosečni poeni i aktuelni vatreni niz protiv tog rivala.</p>
                
                <h3>${rulesCanonicalIcon('leaderboard')} Top liste i rangiranje</h3>
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
                <p>Online igra vas spaja sa protivnikom koji je trenutno na mreži. Direktni dueli sa prijateljima čuvaju H2H istoriju i utiču na pobede, poraze i vatreni niz.</p>
                <h4>${rulesCanonicalIcon('inviteFriend')} Privatni dueli</h4>
                <p>Prijatelja možete dodati preko liste aktivnih igrača ili pozivnice. Kada protivnik prihvati izazov, otvara se privatni duel.</p>

                <h3>${rulesCanonicalIcon('tournament')} Turniri</h3>
                <ul>
                    <li><strong>${rulesCanonicalIcon('tournament')} Sistem:</strong> Nedeljni turnir prima 8 igrača i igra se na ispadanje: četvrtfinale, polufinale i finale. Svaki duel je jedna partija.</li>
                    <li><strong>${rulesCanonicalIcon('ducat')} Prijava:</strong> Kotizacija je 5500 dukata. Odjava i povraćaj mogući su samo dok traje faza prijave, pre početka turnira.</li>
                    <li><strong>${rulesCanonicalIcon('tournamentStart')} Zakazivanje:</strong> Kada se prijavi svih 8 igrača, protivnici u kosturu predlažu i prihvataju termin meča. Meč se pokreće kada je termin potvrđen.</li>
                    <li><strong>${rulesCanonicalIcon('tournament')} Nagrade:</strong> Pobednik dobija 44.000 dukata, veliki rast Indeksa moći i ${rulesCanonicalIcon('hallOfFame')} upis u Dvoranu slavnih. Finalista koji izgubi finale dobija povraćaj uloga od 5500 dukata.</li>
                    <li><strong>${rulesCanonicalIcon('disconnected')} Tehnički rezultat:</strong> Napuštanje, istek vremena ili prekid veze mogu doneti tehničku pobedu protivniku.</li>
                </ul>
                
                <h3>${rulesCanonicalIcon('quarterly')} Kvartalna liga</h3>
                <p>Kvartalna liga traje 3 kalendarska meseca po vremenu Beograda. U svakoj regularno završenoj solo, AI, lokalnoj ili online partiji Vaš konačni rezultat se dodaje ligaškom zbiru. Kod tehničkog ishoda pobedniku se dodaje izračunata nagrada, a poraženom se isti obračunati iznos oduzima do najmanje 0 poena.</p>
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

                <h3>${rulesCanonicalIcon('globalChat')} Chat i komunikacija</h3>
                <ul>
                    <li><strong>${rulesCanonicalIcon('globalChat')} Globalni chat:</strong> Povezuje igrače na serveru. Zabranjeni su uvrede po rasnoj, verskoj, nacionalnoj ili polnoj osnovi, kao i vulgarnost. Kršenja pravila vode do suspenzije chata.</li>
                    <li><strong>${rulesCanonicalIcon('duel')} Duel chat:</strong> Privatni chat tokom meča sa protivnikom. I ovde važe ista pravila fer i kulturnog ponašanja.</li>
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
                    <li><strong>${rulesTextGlyphHtml('🎲')} Završene partije:</strong> Na kraju partije dobijate dukate u skladu sa rezultatom, a nagradu možete duplirati nagradnom reklamom.</li>
                    <li><strong>${rulesCanonicalIcon('daily')} Dnevni izazov:</strong> Dnevna nagrada je dostupna jednom dnevno. Server određuje kockice: prve 4 se sabiraju, 5. kockica množi taj zbir, a 6. množi ceo rezultat. Nagrada se može duplirati reklamom.</li>
                    <li><strong>${rulesCanonicalIcon('video')} Reklame za nagradu:</strong> U meniju dukata nagradni video donosi +500 dukata kada je dostupan i potvrđen na serveru.</li>
                    <li><strong>${rulesCanonicalIcon('tournament')} Takmičenja:</strong> Turniri i Kvartalna liga donose najveće nagrade najboljim igračima.</li>
                </ul>

                <h3>${rulesCanonicalIcon('undo')} Vraćanje upisa</h3>
                <p>Dugme za ispravku postaje aktivno posle upisa u tabelu i vraća samo poslednji upis. Posle vraćanja dugme se gasi dok ne napravite novi upis.</p>
                <ul>
                    <li><strong>Online dueli:</strong> Vraćanje upisa troši 1 token i mora se iskoristiti pre nego protivnik započne sledeći potez. Zbog toga postoji zadrška od 2.5 sekunde pre protivnikovog bacanja.</li>
                    <li><strong>Lokalna igra:</strong> U solo i igri za dva igrača vraćanje se potvrđuje gledanjem reklame kada je dostupna na uređaju.</li>
                    <li><strong>Nabavka tokena:</strong> U meniju dukata kartica za tokene nudi +1 token za nagradni video.</li>
                </ul>

                <h3>${rulesCanonicalIcon('treasury')} Riznica</h3>
                <p>Riznica je mesto za personalizaciju igre i pregled osvojenih stvari.</p>
                <ul>
                    <li><strong>${rulesCanonicalIcon('trophyTab')} Trofeji:</strong> Posebni izazovi se otključavaju tokom igre i mogu doneti nagrade u dukatima.</li>
                    <li><strong>${rulesCanonicalIcon('skinsTab')} Kockice:</strong> Kupujete i birate skinove za kockice.</li>
                    <li><strong>${rulesCanonicalIcon('effectsTab')} Efekti:</strong> Animacije se aktiviraju kada u partiji dobijete Yamb.</li>
                    <li><strong>${rulesCanonicalIcon('themesTab')} Teme:</strong> Menjaju izgled aplikacije. Neki artikli se kupuju dukatima, a neki podržavaju reklamu ili popust od 20%.</li>
                </ul>
            `
        },
        {
            title: `${rulesCanonicalIcon('accountPage', 'rules-page-icon-canonical')} Nalog, privatnost i server`,
            content: `
                <h3>${rulesCanonicalIcon('profile')} Google integracija i cloud čuvanje</h3>
                <p>Yamb of the Balkan koristi Google prijavu da bi se napredak vezao za vaš nalog i vratio pri promeni uređaja.</p>
                <p>Na serveru se čuvaju statistika, H2H istorija, dukati, tokeni za vraćanje upisa, trofeji, inventar Riznice, aktivna tema/skin/efekat, Dnevni izazov, Kvartalna liga i turnirski status.</p>

                <h4>${rulesCanonicalIcon('privacy')} Koji podaci se prikupljaju i zašto?</h4>
                <p>Prilikom prijave aplikacija koristi osnovne podatke sa Google profila:</p>
                <ul>
                    <li><strong>Ime i prezime:</strong> Koristi se za ime u igri i prikaz na listama.</li>
                    <li><strong>Email adresa:</strong> Služi kao jedinstveni identifikator naloga. Ne koristi se za spam poruke.</li>
                    <li><strong>Profilna slika:</strong> Koristi se kao avatar u multiplayer mečevima.</li>
                </ul>

                <h3>${rulesCanonicalIcon('settings')} Server podrška i bezbednost</h3>
                <ul>
                    <li><strong>${rulesCanonicalIcon('privacy')} Fer igra:</strong> Server proverava online mečeve, rezultate, ekonomiju i nagrade kako bi sprečio manipulacije.</li>
                    <li><strong>${rulesTextGlyphHtml('⏱️')} Anti-troll tajmer:</strong> Ako protivnik namerno odugovlači, server može dodeliti tehničku pobedu.</li>
                    <li><strong>${rulesCanonicalIcon('reconnected')} Grace period:</strong> Kod kratkog prekida veze postoji pauza od 30 sekundi za povratak u meč.</li>
                    <li><strong>${rulesCanonicalIcon('disconnected')} Napuštanje meča:</strong> Namerno napuštanje online duela može doneti kaznu u ligi i dukatima.</li>
                </ul>

                <h3>${rulesCanonicalIcon('video')} Reklame (AdMob)</h3>
                <p>Reklame omogućavaju da igra ostane besplatna i da se nagrade potvrde na serveru.</p>
                <ul>
                    <li><strong>${rulesTextGlyphHtml('⏳')} Kratke reklame:</strong> Koriste se za pojedine akcije, povratak u meni, lokalno vraćanje upisa ili odjavu sa turnira. Ne isplaćuju direktno dukate ni tokene.</li>
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
                <p>Each table field can be filled only once. If the combination does not exist, the field scores 0.</p>
                
                <h3>${rulesCanonicalIcon('statistics')} Game Columns</h3>
                <ul>
                    <li><strong>↓ DOWN:</strong> Must be filled sequentially from 1 to Yamb.</li>
                    <li><strong>↑ UP:</strong> Must be filled sequentially from Yamb to 1.</li>
                    <li><strong>⇅ MIDDLE:</strong> Filled from the middle outward. The upper branch starts at MAX and moves toward 1; the lower branch starts at MIN and moves toward Yamb.</li>
                    <li><strong>S FREE:</strong> Can be filled in any order.</li>
                    <li><strong>R HAND:</strong> Scores only after the first roll. If you try to enter a field in this column after the second or third roll, the game enters 0 after confirmation.</li>
                    <li><strong>${rulesTextGlyphHtml('📢')} ANNOUNCE:</strong> After the first roll, you may enable Announce, select the exact field in the Announce column, and then you must fill that field. The announcement can be canceled before it is locked.</li>
                </ul>
                
                <h3>${rulesCanonicalIcon('leaderboard')} Scoring & Sections</h3>
                <h4>SECTION 1 (Rows 1 to 6)</h4>
                <p>Only matching numbers are summed. If the section total is at least 60, you receive a <strong>+30 point bonus</strong>.</p>
                <h4>SECTION 2 (MIN - MAX)</h4>
                <p>Formula: <em>(Max - Min) * number of ones</em>. If the result is at least 60, a <strong>+40 point bonus</strong> is added. If MIN is 0 or the calculation is negative, this section scores 0.</p>
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
                    <li><strong>${rulesCanonicalIcon('fireStreak')} Win Streak:</strong> Number of consecutive wins in duels and tournaments.</li>
                    <li><strong>${rulesCanonicalIcon('allTimePoints')} All-Time PTS:</strong> Total points across all finished games.</li>
                    <li><strong>${rulesCanonicalIcon('h2h')} Rival:</strong> The friend you have played against the most.</li>
                </ul>
                
                <h3>${rulesCanonicalIcon('h2h')} Head-to-Head (H2H)</h3>
                <p>Every friend-rival gets an H2H card with your duel history: wins, losses, draws, biggest win, worst loss, average points, and current win streak against that rival.</p>
                
                <h3>${rulesCanonicalIcon('leaderboard')} Leaderboards</h3>
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
                <p>Online play matches you with an opponent who is currently online. Direct friend duels save H2H history and affect wins, losses, and win streaks.</p>
                <h4>${rulesCanonicalIcon('inviteFriend')} Friend Duels</h4>
                <p>You can add friends from the active player list or by invite. Once the opponent accepts, a private duel opens.</p>

                <h3>${rulesCanonicalIcon('tournament')} Tournaments</h3>
                <ul>
                    <li><strong>${rulesCanonicalIcon('tournament')} Format:</strong> The weekly tournament accepts 8 players and is played as a knockout bracket: quarterfinals, semifinals, and final. Each duel is one game.</li>
                    <li><strong>${rulesCanonicalIcon('ducat')} Entry:</strong> The entry fee is 5500 ducats. Unregistering and refunds are possible only during registration, before the tournament starts.</li>
                    <li><strong>${rulesCanonicalIcon('tournamentStart')} Scheduling:</strong> Once all 8 players register, opponents in the bracket propose and accept match times. A match starts after the time is confirmed.</li>
                    <li><strong>${rulesCanonicalIcon('tournament')} Rewards:</strong> The winner receives 44,000 ducats, a major Power Index boost, and a ${rulesCanonicalIcon('hallOfFame')} Hall of Fame entry. The finalist who loses the final gets the 5500 ducat entry fee refunded.</li>
                    <li><strong>${rulesCanonicalIcon('disconnected')} Technical result:</strong> Leaving, timing out, or disconnecting can award a technical win to the opponent.</li>
                </ul>
                
                <h3>${rulesCanonicalIcon('quarterly')} Quarterly League</h3>
                <p>The Quarterly League lasts 3 calendar months in Belgrade time. In every regularly completed solo, AI, local, or online game, your final score is added to your league total. For a technical result, the calculated reward is added to the winner and the same calculated amount is deducted from the loser, down to a minimum of 0 points.</p>
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

                <h3>${rulesCanonicalIcon('globalChat')} Chat & Communication</h3>
                <ul>
                    <li><strong>${rulesCanonicalIcon('globalChat')} Global Chat:</strong> Connects players on the server. Insults based on race, religion, nationality, or gender are forbidden, as is profanity. Violations lead to chat suspension.</li>
                    <li><strong>${rulesCanonicalIcon('duel')} Duel Chat:</strong> Private chat during a match with your opponent. The same fair-play rules apply.</li>
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
                    <li><strong>${rulesTextGlyphHtml('🎲')} Finished games:</strong> At the end of a game, you earn ducats based on your score, and you can double the reward with a rewarded ad.</li>
                    <li><strong>${rulesCanonicalIcon('daily')} Daily Challenge:</strong> The daily reward is available once per day. The server sets the dice: the first 4 are summed, the 5th die multiplies that sum, and the 6th multiplies the total. The reward can be doubled with an ad.</li>
                    <li><strong>${rulesCanonicalIcon('video')} Reward ads:</strong> In the ducat menu, a rewarded video grants +500 ducats when available and verified by the server.</li>
                    <li><strong>${rulesCanonicalIcon('tournament')} Competitions:</strong> Tournaments and the Quarterly League give the largest rewards to top players.</li>
                </ul>

                <h3>${rulesCanonicalIcon('undo')} Undo entry</h3>
                <p>The undo button becomes active after an entry in the table and only restores the last entry. After undoing, the button deactivates until you make another entry.</p>
                <ul>
                    <li><strong>Online duels:</strong> Undoing costs 1 undo token and must be used before the opponent starts the next turn. This is why there is a 2.5-second delay before the opponent's roll.</li>
                    <li><strong>Local play:</strong> In solo and two-player local games, undo is confirmed by watching an ad when available on the device.</li>
                    <li><strong>Getting tokens:</strong> The token tab in the ducat menu offers +1 token for a rewarded video.</li>
                </ul>

                <h3>${rulesCanonicalIcon('treasury')} Treasury</h3>
                <p>The Treasury is where you personalize the game and review collected items.</p>
                <ul>
                    <li><strong>${rulesCanonicalIcon('trophyTab')} Trophies:</strong> Special challenges unlock during play and can reward ducats.</li>
                    <li><strong>${rulesCanonicalIcon('skinsTab')} Dice:</strong> Buy and equip dice skins.</li>
                    <li><strong>${rulesCanonicalIcon('effectsTab')} Effects:</strong> Animations trigger when you score Yamb in a game.</li>
                    <li><strong>${rulesCanonicalIcon('themesTab')} Themes:</strong> Change the app appearance. Some items are bought with ducats, and some support ads or a 20% discount.</li>
                </ul>
            `
        },
        {
            title: `${rulesCanonicalIcon('accountPage', 'rules-page-icon-canonical')} Account, privacy & server`,
            content: `
                <h3>${rulesCanonicalIcon('profile')} Google Integration & Cloud Save</h3>
                <p>Yamb of the Balkan uses Google sign-in so your progress is tied to your account and can be restored on another device.</p>
                <p>The server saves stats, H2H history, ducats, undo tokens, trophies, Treasury inventory, active theme/skin/effect, Daily Challenge, Quarterly League, and tournament status.</p>

                <h4>${rulesCanonicalIcon('privacy')} What data is collected and why?</h4>
                <p>When you sign in, the app uses basic Google profile data:</p>
                <ul>
                    <li><strong>First and last name:</strong> Used for your in-game name and leaderboard display.</li>
                    <li><strong>Email address:</strong> Used as a unique account identifier. It is not used for spam.</li>
                    <li><strong>Profile picture:</strong> Used as your avatar in multiplayer matches.</li>
                </ul>

                <h3>${rulesCanonicalIcon('settings')} Server Support & Security</h3>
                <ul>
                    <li><strong>${rulesCanonicalIcon('privacy')} Fair play:</strong> The server checks online matches, results, economy, and rewards to prevent manipulation.</li>
                    <li><strong>${rulesTextGlyphHtml('⏱️')} Anti-troll timer:</strong> If an opponent intentionally stalls, the server can award a technical win.</li>
                    <li><strong>${rulesCanonicalIcon('reconnected')} Grace period:</strong> A short connection drop gives you a 30-second pause to return to the match.</li>
                    <li><strong>${rulesCanonicalIcon('disconnected')} Leaving a match:</strong> Intentionally leaving an online duel can cause league and ducat penalties.</li>
                </ul>

                <h3>${rulesCanonicalIcon('video')} Ads (AdMob)</h3>
                <p>Ads help keep the game free and allow rewards to be verified by the server.</p>
                <ul>
                    <li><strong>${rulesTextGlyphHtml('⏳')} Short ads:</strong> Used for some actions, returning to the menu, local undo, or tournament unregistering. They do not directly pay ducats or undo tokens.</li>
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
        const reduceMotion = document.documentElement.dataset.splashTheme === 'dark'
            && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
        this.sliderTrack.scrollTo({ left: targetScroll, behavior: reduceMotion ? 'auto' : 'smooth' });
    }

    open() {
        if (document.documentElement.dataset.splashTheme === 'dark') this.previousFocus = document.activeElement;
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
            const reduceMotion = document.documentElement.dataset.splashTheme === 'dark'
                && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
            this.sliderTrack.style.scrollBehavior = reduceMotion ? 'auto' : 'smooth';
            this.overlay.classList.add('active');
            if (document.documentElement.dataset.splashTheme === 'dark') {
                this.overlay.querySelector('#btn-close-rules')?.focus({ preventScroll: true });
            }
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
