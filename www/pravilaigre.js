// pravilaigre.js - Pravila igre i mogućnosti aplikacije (Bilingual + Native Scroll Snap Carousel UI + HTML Website Content)

const RulesData = {
    sr: [
        {
            title: "🎲 Pravila i Bodovanje",
            content: `
                <h3>🎯 Cilj Igre</h3>
                <p>Cilj je osvojiti što više bodova bacanjem 6 kockica i kombinovanjem dobijenih vrednosti u tabelu. Imate 3 bacanja po potezu.</p>
                
                <h3>📊 Kolone u Igri</h3>
                <ul>
                    <li><strong>↓ NADOLE:</strong> Popunjava se redom od broja 1 do Yamba. Ne sme se preskakati.</li>
                    <li><strong>↑ NAGORE:</strong> Popunjava se redom od Yamba do broja 1.</li>
                    <li><strong>⇅ SREDINA:</strong> Popunjava se od sredine ka krajevima (od polja MAX i MIN ka 1 i Yambu).</li>
                    <li><strong>S SLOBODNA:</strong> Može se popunjavati bilo kojim redosledom u toku igre.</li>
                    <li><strong>R RUČNO:</strong> Popunjava se isključivo nakon PRVOG bacanja kockica.</li>
                    <li><strong>📢 NAJAVA:</strong> Morate izričito najaviti željeno polje odmah nakon prvog bacanja.</li>
                </ul>
                
                <h3>🏆 Bodovanje i Sekcije</h3>
                <h4>1. SEKCIJA (Polja od 1 do 6)</h4>
                <p>Sabiraju se samo odgovarajući brojevi. Ukoliko je zbir u ovoj sekciji ≥ 60, ostvarujete <strong>bonus od +30 poena</strong>.</p>
                <h4>2. SEKCIJA (MIN - MAX)</h4>
                <p>Računa se po formuli: <em>(Max - Min) * Broj jedinica</em> (iz prve sekcije). Ako je rezultat ovog obračuna ≥ 60, dobijate <strong>bonus od +40 poena</strong>.</p>
                <h4>3. SEKCIJA (KOMBINACIJE)</h4>
                <ul>
                    <li><strong>TRILING (3 iste):</strong> Donosi zbir kockica + 20 poena bonusa.</li>
                    <li><strong>FUL (3 iste + 2 iste):</strong> Donosi zbir kockica + 30 poena bonusa. <br><em>*Napomena: 5 istih kockica (Yamb) se takođe može upisati kao Ful, jer igra to automatski prepoznaje i tretira kao 3 iste i 2 iste kockice.</em></li>
                    <li><strong>POKER (4 iste):</strong> Donosi zbir kockica + 40 poena bonusa.</li>
                    <li><strong>YAMB (5 istih):</strong> Donosi zbir kockica + 50 poena bonusa.</li>
                    <li><strong>KENTA (5 u nizu):</strong> Predstavlja niz od 5 uzastopnih brojeva (1, 2, 3, 4, 5 ili 2, 3, 4, 5, 6). Boduje se zavisno od toga iz kog bacanja je dobijena: iz 1. bacanja vredi 66, iz 2. bacanja 56, a iz 3. bacanja 46 poena.</li>
                </ul>
            `
        },
        {
            title: "📈 Statistika i Liste",
            content: `
                <h3>📊 Praćenje Statistike</h3>
                <p>Yamb of the Balkan beleži svaki vaš potez. Evo šta sve pratimo:</p>
                <ul>
                    <li><strong>⚡ Indeks moći (Power Index):</strong> Glavni pokazatelj vašeg uspeha koji analizira sve vaše rezultate i veštinu.</li>
                    <li><strong>🏆 Rekord:</strong> Vaš lični najbolji rezultat ikada ostvaren u bilo kom modu igre.</li>
                    <li><strong>⚖️ Odnos Pobeda/Poraza (W/L Ratio):</strong> Prikazuje vašu ukupnu efikasnost u direktnim okršajima u online modovima i turnirima.</li>
                    <li><strong>🔥 Vatreni niz:</strong> Broj uzastopnih pobeda ostvarenih u duelima i turnirima.</li>
                    <li><strong>🌟 All-Time PTS:</strong> Ukupan broj poena koje ste osvojili od instalacije igre.</li>
                    <li><strong>⚔️ Rival:</strong> Prijatelj sa kojim ste ukrstili kockice najviše puta.</li>
                </ul>
                
                <h3>⚔️ Međusobni Dueli (H2H)</h3>
                <p>Za svakog rivala koji postane prijatelj, formira se posebna H2H kartica u statistici koja čuva istoriju vaših okršaja (Najveća pobeda, najteži poraz, prosečni poeni i aktuelni vatreni niz protiv tog rivala).</p>
                
                <h3>🏆 Top Liste i Rangiranje</h3>
                <ul>
                    <li><strong>Nedeljna lista:</strong> Borba za vrh se resetuje svake nedelje. Prikazuje najbolje rezultate ostvarene u tekućoj nedelji.</li>
                    <li><strong>Mesečna lista:</strong> Prikazuje najupornije i najuspešnije igrače koji su dominirali tokom celog meseca.</li>
                    <li><strong>Sva vremena (All-Time):</strong> Večna lista apsolutno najboljih rezultata od postanka igre.</li>
                    <li><strong>Lokalna Lista:</strong> Privatni dnevnik uspeha na vašem uređaju koji beleži vaše najbolje lične rekorde.</li>
                </ul>
            `
        },
        {
            title: "⚔️ Multiplayer i Turniri",
            content: `
                <h3>🌍 Multiplayer & Dueli</h3>
                <h4>🎲 Klasični Multiplayer</h4>
                <p>Brzo uskočite u partiju sa nasumično odabranim protivnikom koji je trenutno na mreži i testirajte svoje veštine.</p>
                <h4>🤝 Dueli sa Prijateljima</h4>
                <p>Organizujte privatne mečeve i gradite istoriju okršaja sa svojim poznanicima! Prijatelja možete dodati preko liste aktivnih igrača ili direktnim unosom njegovog imena.</p>

                <h3>🏆 TAKMIČENJA</h3>
                <h4>⚔️ TURNIRI</h4>
                <ul>
                    <li><strong>Sistem takmičenja:</strong> Nedeljni turnir sa 8 igrača koji se igra na ispadanje (četvrtfinale, polufinale, finale). Svaki duel je na jednu dobijenu partiju.</li>
                    <li><strong>Prijava:</strong> Kotizacija košta 2500 dukata. Kada se skupi 8 igrača, turnir počinje!</li>
                    <li><strong>Nagrade:</strong> Pobednik turnira osvaja ogromno povećanje Indeksa Moći, biće zauvek upisan u Dvoranu slavnih, uz bogate nagrade u dukatima!</li>
                </ul>
                
                <h4>🏅 KVARTALNA LIGA</h4>
                <p>Kvartalna liga je sezonsko takmičenje koje traje 3 meseca. Svaka završena partija (solo ili online) donosi poene. Napredujete kroz rangove: Amater, Profi, Majstor, Legenda i Titan.</p>
                <p>Na kraju svakog kvartala, najbolje plasirani igrači osvajaju izuzetno vredne nagrade u dukatima i medalje, a prvoplasirani nosi prestižnu titulu Šampiona ciklusa!</p>
            `
        },
        {
            title: "🟢 Komunikacija",
            content: `
                <h3>🟢 Online Igrači i Interakcija</h3>
                <p>Aplikacija vam u svakom trenutku prikazuje tačan broj igrača koji su trenutno na mreži. Dostupne su vam sledeće opcije:</p>
                <ul>
                    <li><strong>➕ Dodaj prijatelja:</strong> Pošaljite zahtev željenom igraču u realnom vremenu.</li>
                    <li><strong>👁️ Gledaj partiju (Spectate):</strong> Posmatrajte tuđe mečeve, idealno za nove igrače da shvate pravila ili iskusne da analiziraju taktike.</li>
                    <li><strong>⚔️ Bitka (Izazov):</strong> Klikom na ikonicu direktno izazivate bilo kog igrača na listi na duel!</li>
                </ul>

                <h3>💬 Chat i Komunikacija</h3>
                <ul>
                    <li><strong>🌍 Globalni Chat:</strong> Povezuje sve igrače na serveru. Strogo je zabranjeno vređanje na rasnoj, verskoj, nacionalnoj ili polnoj osnovi. Upotreba vulgarnosti povlači isključenje sa servera! Klikom na ime u chatu možete direktno izazvati tog igrača!</li>
                    <li><strong>🎮 Duel Chat:</strong> Privatni chat tokom meča sa protivnikom, gde takođe važe sva pravila fer i kulturnog ponašanja.</li>
                </ul>
            `
        },
        {
            title: "💎 Dukati i Riznica",
            content: `
                <h3>💰 Dukati i Ekonomija</h3>
                <p>Dukati su glavna valuta. Kako ih zaraditi:</p>
                <ul>
                    <li><strong>🎲 Igranje partija:</strong> Svaka završena partija donosi vam dukata srazmerno poenima. Zaradu na kraju meča možete duplirati reklamom!</li>
                    <li><strong>🎁 Dnevni izazov:</strong> Okušajte sreću svaki dan! 4 kockice se sabiraju, 5. kockica ih množi, a 6. kockica množi celokupan iznos!</li>
                    <li><strong>🏆 Turniri i Kvartalna liga:</strong> Najbolji na turnirima i u ligi se nagrađuju ogromnim svotama dukata.</li>
                </ul>

                <h3>💎 Riznica (Prodavnica)</h3>
                <p>Riznica je mesto za personalizaciju vaše igre. Ovde možete trošiti zarađene dukate:</p>
                <ul>
                    <li><strong>🏆 Trofeji:</strong> Pratite sve otključane i zaključane izazove (npr. osvojen Yamb iz prvog bacanja, odigrano 50 partija).</li>
                    <li><strong>🎲 Kockice (Skinovi):</strong> Promenite standardne bele kockice i kupite unikatne setove.</li>
                    <li><strong>✨ Efekti:</strong> Spektakularne vizuelne animacije koje se aktiviraju ISKLJUČIVO kada u partiji dobijete Yamb!</li>
                    <li><strong>🎨 Teme:</strong> Promenite boju i celokupan vizuelni stil aplikacije.</li>
                </ul>
            `
        },
        {
            title: "⚙️ Nalog, Privatnost i Server",
            content: `
                <h3>🔐 Google Integracija i Cloud Save</h3>
                <p>Yamb of the Balkan koristi bezbednu Google Sign-In tehnologiju kako bi vam pružio najbolje moguće igračko iskustvo, bez muke oko pamćenja novih lozinki.</p>
                <p>Zahvaljujući povezivanju sa vašim Google nalogom, vaš napredak nikada neće biti izgubljen. Na našim sigurnim serverima automatski se čuva vaša kompletna statistika, H2H kartice međusobnih duela, osvojeni dukati i trofeji, kao i trenutno stanje u Kvartalnoj ligi i na turnirima. Pored toga, trajno se pamti i ceo vaš inventar.</p>

                <h4>🛡️ Koji podaci se prikupljaju i zašto?</h4>
                <p>Vaša privatnost nam je na prvom mestu. Prilikom prijave, aplikacija traži pristup <strong>samo najosnovnijim podacima</strong> sa vašeg Google profila:</p>
                <ul>
                    <li><strong>Ime i Prezime:</strong> Koristimo ga isključivo kako bismo generisali vaše ime u igri i prikazali ga na rang listama.</li>
                    <li><strong>Email adresa:</strong> Služi kao jedinstveni identifikator vašeg naloga. Ne šaljemo spam poruke.</li>
                    <li><strong>Profilna slika (Avatar):</strong> Koristi se za vizuelni prikaz vašeg profila tokom multiplayer mečeva.</li>
                </ul>

                <h3>🖥️ Server Podrška i Bezbednost</h3>
                <ul>
                    <li><strong>🛡️ Anti-Cheat i Fer Igra:</strong> Server aktivno nadgleda mečeve sprečavajući hakerske pokušaje. Ugrađen je "Anti-Troll" tajmer koji vam dodeljuje pobedu ako protivnik namerno odugovlači potez.</li>
                    <li><strong>🔌 Grace Period:</strong> Ako vam nestane interneta, server aktivira pauzu od 30 sekundi da stignete da se vratite pre nego što dodeli pobedu protivniku!</li>
                </ul>

                <h3>📺 Reklame (AdMob)</h3>
                <p>Kako bi igra ostala besplatna, postoje reklame:</p>
                <ul>
                    <li><strong>⏳ Kratke reklame (Interstitial):</strong> Prikazuju se povremeno prilikom izlaska iz chata ili spectate moda kako bi se pokrili troškovi servera.</li>
                    <li><strong>🎁 Reklame za nagradu:</strong> Vi birate kada ih gledate, a donose dupliranje dukata na kraju partije i 20% popusta pri kupovini u Riznici!</li>
                </ul>
            `
        }
    ],
    en: [
        {
            title: "🎲 Game Rules & Scoring",
            content: `
                <h3>🎯 Goal of the Game</h3>
                <p>The goal is to score as many points as possible by rolling 6 dice and combining the values into the table. You have 3 rolls per turn.</p>
                
                <h3>📊 Game Columns</h3>
                <ul>
                    <li><strong>↓ DOWN:</strong> Must be filled sequentially from 1 to Yamb.</li>
                    <li><strong>↑ UP:</strong> Must be filled sequentially from Yamb to 1.</li>
                    <li><strong>⇅ MIDDLE:</strong> Filled from the middle outwards (from MAX and MIN towards 1 and Yamb).</li>
                    <li><strong>S FREE:</strong> Can be filled in any order.</li>
                    <li><strong>R HAND (MANUAL):</strong> Can only be filled after the FIRST roll.</li>
                    <li><strong>📢 ANNOUNCE:</strong> You must explicitly announce the field immediately after the first roll.</li>
                </ul>
                
                <h3>🏆 Scoring & Sections</h3>
                <h4>SECTION 1 (Rows 1 to 6)</h4>
                <p>Sum of the respective numbers. If the sum is ≥ 60, you get a <strong>+30 point bonus</strong>.</p>
                <h4>SECTION 2 (MIN - MAX)</h4>
                <p>Formula: <em>(Max - Min) * Number of 1s</em>. If the result is ≥ 60, you get a <strong>+40 point bonus</strong>.</p>
                <h4>SECTION 3 (COMBINATIONS)</h4>
                <ul>
                    <li><strong>THREE OF A KIND:</strong> Sum of dice + 20 points.</li>
                    <li><strong>FULL HOUSE:</strong> 3 of a kind + 2 of a kind. Sum of dice + 30 points. <em>*Yamb can also be entered as a Full House.</em></li>
                    <li><strong>POKER (4 of a kind):</strong> Sum of dice + 40 points.</li>
                    <li><strong>YAMB (5 of a kind):</strong> Sum of dice + 50 points.</li>
                    <li><strong>STRAIGHT (5 in a row):</strong> Sequence of 5 numbers. Scores 66 (1st roll), 56 (2nd roll), 46 (3rd roll).</li>
                </ul>
            `
        },
        {
            title: "📈 Stats & Leaderboards",
            content: `
                <h3>📊 Stat Tracking</h3>
                <p>Yamb of the Balkan tracks every move. Here is what we monitor:</p>
                <ul>
                    <li><strong>⚡ Power Index:</strong> The main indicator of your success analyzing all your results and skill.</li>
                    <li><strong>🏆 Highscore:</strong> Your personal best score ever achieved.</li>
                    <li><strong>⚖️ W/L Ratio:</strong> Shows your overall efficiency in direct online and tournament matchups.</li>
                    <li><strong>🔥 Win Streak:</strong> Number of consecutive wins in duels and tournaments.</li>
                    <li><strong>🌟 All-Time PTS:</strong> Total sum of points you've scored since installation.</li>
                    <li><strong>⚔️ Rival:</strong> The friend you've played against the most.</li>
                </ul>
                
                <h3>⚔️ Head-to-Head (H2H)</h3>
                <p>For every rival who becomes a friend, a special H2H card is created in stats keeping track of your history (Biggest win, worst loss, average points, and current win streak against that rival).</p>
                
                <h3>🏆 Leaderboards</h3>
                <ul>
                    <li><strong>Weekly:</strong> The battle for the top resets every week.</li>
                    <li><strong>Monthly:</strong> The most persistent and successful players of the month.</li>
                    <li><strong>All-Time:</strong> The eternal list of the absolute best scores.</li>
                    <li><strong>Local List:</strong> Your personal diary of success on your device.</li>
                </ul>
            `
        },
        {
            title: "⚔️ Multiplayer & Tourneys",
            content: `
                <h3>🌍 Multiplayer & Duels</h3>
                <h4>🎲 Classic Multiplayer</h4>
                <p>Quickly jump into a game with a random online opponent to test your skills.</p>
                <h4>🤝 Friend Duels</h4>
                <p>Host private matches and build a rivalry history with your acquaintances! Add friends via the player list or by direct invite.</p>

                <h3>🏆 COMPETITIONS</h3>
                <h4>⚔️ TOURNAMENTS</h4>
                <ul>
                    <li><strong>System:</strong> An 8-player weekly knockout tournament (Quarter-finals, semi-finals, finals). Single elimination matches.</li>
                    <li><strong>Entry:</strong> Entry fee is 2500 coins. When 8 players join, the tournament starts!</li>
                    <li><strong>Rewards:</strong> The winner gets a massive Power Index boost, a Hall of Fame spot, and rich coin rewards!</li>
                </ul>
                
                <h4>🏅 QUARTERLY LEAGUE</h4>
                <p>A seasonal 3-month competition. Every finished match brings points. Progress through ranks: Amateur, Pro, Master, Legend, and Titan.</p>
                <p>At the end of each quarter, top players win medals, coins, and the 1st place claims the prestigious Champion title!</p>
            `
        },
        {
            title: "🟢 Communication",
            content: `
                <h3>🟢 Online Players & Interaction</h3>
                <p>The app shows exactly how many players are currently online. Available options:</p>
                <ul>
                    <li><strong>➕ Add Friend:</strong> Send a real-time friend request.</li>
                    <li><strong>👁️ Spectate:</strong> Watch other players' matches, perfect for analysis and learning.</li>
                    <li><strong>⚔️ Battle (Challenge):</strong> Directly challenge any player from the active list to a duel!</li>
                </ul>

                <h3>💬 Chat & Communication</h3>
                <ul>
                    <li><strong>🌍 Global Chat:</strong> Connects all players. Insults and profanity are strictly forbidden. You can challenge a player to a duel just by clicking their name!</li>
                    <li><strong>🎮 Duel Chat:</strong> Private chat during a match with your opponent.</li>
                </ul>
            `
        },
        {
            title: "💎 Economy & Treasury",
            content: `
                <h3>💰 Coins & Economy</h3>
                <p>Coins are the main currency. How to earn them:</p>
                <ul>
                    <li><strong>🎲 Playing matches:</strong> Every finished match earns you coins based on your score. Double your earnings with an ad!</li>
                    <li><strong>🎁 Daily Challenge:</strong> Try your luck every day! 4 dice are summed, the 5th multiplies the sum, and the 6th multiplies everything!</li>
                    <li><strong>🏆 Tournaments & League:</strong> Best players are rewarded with thousands of coins.</li>
                </ul>

                <h3>💎 Treasury (Shop)</h3>
                <p>Personalize your game. Spend coins on:</p>
                <ul>
                    <li><strong>🏆 Trophies:</strong> View unlocked special achievements (e.g., getting Yamb on the 1st roll).</li>
                    <li><strong>🎲 Dice (Skins):</strong> Buy unique dice sets.</li>
                    <li><strong>✨ Effects:</strong> Special visual animations that trigger ONLY when you roll a Yamb!</li>
                    <li><strong>🎨 Themes:</strong> Change the entire visual style of the app.</li>
                </ul>
            `
        },
        {
            title: "⚙️ Account, Privacy & Server",
            content: `
                <h3>🔐 Google Integration & Cloud Save</h3>
                <p>Yamb of the Balkan uses secure Google Sign-In technology to provide the best possible gaming experience without the hassle of remembering new passwords.</p>
                <p>Your stats, H2H duels, Treasury inventory, coins, League, and Tournaments are automatically saved. Even if you change your phone, everything is restored upon login.</p>

                <h4>🛡️ What data is collected and why?</h4>
                <p>Your privacy is our priority. Upon login, the app requests access to <strong>only the most basic data</strong> from your Google profile:</p>
                <ul>
                    <li><strong>First and Last Name:</strong> Used exclusively to generate your in-game name and display it on leaderboards.</li>
                    <li><strong>Email Address:</strong> Serves as a unique identifier for your account. We do not send spam.</li>
                    <li><strong>Profile Picture (Avatar):</strong> Used to visually represent your profile during multiplayer matches.</li>
                </ul>

                <h3>🖥️ Server Support & Security</h3>
                <ul>
                    <li><strong>🛡️ Anti-Cheat & Anti-Troll:</strong> Server prevents manipulation and automatically awards you the win if your opponent intentionally stalls.</li>
                    <li><strong>🔌 Grace Period:</strong> If you lose connection, the server grants you a 30s pause to return before awarding the win to your opponent!</li>
                </ul>

                <h3>📺 Ads (AdMob)</h3>
                <p>To keep the game free, there are ads:</p>
                <ul>
                    <li><strong>⏳ Interstitial Ads:</strong> Short ads upon leaving chat or spectate mode to cover server costs.</li>
                    <li><strong>🎁 Rewarded Ads:</strong> You choose when to watch them for double coins at the end of a match and 20% discounts in the Treasury!</li>
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
    }

    init() {
        const existing = document.getElementById('rules-overlay-ui');
        if (existing) existing.remove();

        this.overlay = document.createElement('div');
        this.overlay.id = 'rules-overlay-ui';
        this.overlay.className = 'modal-overlay';
        
        // --- KLJUČNA PROMENA: CSS SCROLL SNAP umesto custom JS transformacije ---
        // Takođe ugrađen kompletan CSS da sadržaj izgleda fenomenalno u modalu
        this.overlay.innerHTML = `
            <style>
                #rules-slider-track::-webkit-scrollbar { display: none; }
                .rules-slide-content { text-align: left; padding: 0 5px; }
                .rules-slide-content h3 { color: var(--pure-white); font-size: 1.2rem; margin-bottom: 10px; margin-top: 15px; border-bottom: 1px solid rgba(255,215,0,0.2); padding-bottom: 5px;}
                .rules-slide-content h3:first-child { margin-top: 0; }
                .rules-slide-content h4 { color: var(--success); margin-top: 15px; margin-bottom: 5px; font-size: 1rem; text-transform: uppercase; }
                .rules-slide-content p { color: var(--text-muted); line-height: 1.5; margin-bottom: 10px; font-size: 0.9rem; }
                .rules-slide-content ul { list-style-type: none; padding: 0; display: flex; flex-direction: column; gap: 8px; margin-bottom: 15px; }
                .rules-slide-content li { background: rgba(0, 0, 0, 0.25); border: 1px solid rgba(255,255,255,0.05); padding: 10px 12px; border-radius: 8px; color: var(--text-muted); line-height: 1.4; font-size: 0.85rem; }
                .rules-slide-content li strong { color: var(--gold-main); font-weight: bold; }
            </style>

            <div class="rules-card modal-box" style="padding: 0; width: 90%; max-width: 500px; height: 80vh; max-height: 700px; display: flex; flex-direction: column; position: relative; overflow: hidden;">
                
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 15px 20px; background: rgba(0,0,0,0.2); border-bottom: 1px solid var(--glass-border); flex-shrink: 0;">
                    <h3 id="rules-main-title" style="color: var(--gold-main); margin: 0; font-size: 1.1rem; text-transform: uppercase;">
                        ${this.currentLang === 'sr' ? 'Pravila i Uputstvo' : 'Rules & Guide'}
                    </h3>
                    <button id="btn-close-rules" style="background: transparent; border: none; color: var(--danger); font-size: 1.5rem; cursor: pointer; font-weight: bold;">&times;</button>
                </div>

                <div id="rules-slider-track" style="flex: 1; display: flex; width: 100%; overflow-x: auto; overflow-y: hidden; scroll-snap-type: x mandatory; scroll-behavior: smooth;">
                    ${this.generateSlides()}
                </div>

                <div id="rules-dots-container" style="display: flex; justify-content: center; flex-wrap: wrap; gap: 8px; padding: 15px; background: rgba(0,0,0,0.2); border-top: 1px solid var(--glass-border); flex-shrink: 0;">
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
            <div class="rules-slide" style="flex: 0 0 100%; width: 100%; height: 100%; display: flex; flex-direction: column; padding: 15px; box-sizing: border-box; overflow: hidden; scroll-snap-align: center;">
                <h2 style="color: var(--gold-main); font-size: 1.2rem; margin-bottom: 10px; text-align: center; text-transform: uppercase; font-weight: 900; letter-spacing: 1px; flex-shrink: 0;">${slide.title}</h2>
                <div class="pravni-tekst-container rules-slide-content" style="flex: 1; overflow-y: auto; max-height: none; background: transparent; border: none; padding: 5px; -webkit-overflow-scrolling: touch;">
                    ${slide.content}
                </div>
            </div>
        `).join('');
    }

    generateDots() {
        const data = RulesData[this.currentLang];
        return data.map((_, index) => `
            <div class="rule-dot" data-index="${index}" style="width: 10px; height: 10px; border-radius: 50%; background: ${index === 0 ? 'var(--gold-main)' : 'rgba(255,255,255,0.2)'}; cursor: pointer; transition: 0.3s; box-shadow: ${index === 0 ? '0 0 10px var(--gold-glow)' : 'none'};"></div>
        `).join('');
    }

    attachEvents() {
        document.getElementById('btn-close-rules').addEventListener('click', () => this.close());
        
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
    }

    updateDots() {
        this.dots.forEach((dot, i) => {
            if (i === this.currentSlide) {
                dot.style.background = 'var(--gold-main)';
                dot.style.boxShadow = '0 0 10px var(--gold-glow)';
                dot.style.transform = 'scale(1.3)';
            } else {
                dot.style.background = 'rgba(255,255,255,0.2)';
                dot.style.boxShadow = 'none';
                dot.style.transform = 'scale(1)';
            }
        });
    }

    goToSlide(index) {
        this.currentSlide = index;
        this.updateDots();
        const targetScroll = this.sliderTrack.clientWidth * index;
        this.sliderTrack.scrollTo({ left: targetScroll, behavior: 'smooth' });
    }

    open() {
        const currentStoredLang = localStorage.getItem('yamb_lang') || 'sr';
        if (this.currentLang !== currentStoredLang) {
            this.currentLang = currentStoredLang;
            this.init(); 
        }
        
        this.overlay.style.display = 'flex';
        
        // Resetovanje pozicije trenutno bez animacije
        this.sliderTrack.style.scrollBehavior = 'auto';
        this.sliderTrack.scrollLeft = 0;
        this.currentSlide = 0;
        this.updateDots();

        // Ponovo uključivanje glatke animacije nakon renderovanja
        setTimeout(() => {
            this.sliderTrack.style.scrollBehavior = 'smooth';
            this.overlay.classList.add('active');
        }, 10);
    }

    close() {
        this.overlay.classList.remove('active');
        setTimeout(() => {
            this.overlay.style.display = 'none';
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