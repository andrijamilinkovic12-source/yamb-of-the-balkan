// pravilaigre.js - Pravila igre i mogućnosti aplikacije (Bilingual + Native Scroll Snap Carousel UI + HTML Website Content)

function rulesIconHtml(symbolId, extraClass = '') {
    const className = `rules-inline-icon${extraClass ? ` ${extraClass}` : ''}`;
    return `<svg class="${className}" aria-hidden="true" focusable="false"><use href="#${symbolId}"></use></svg>`;
}

function rulesAssetIconHtml(src, extraClass = '') {
    const className = `rules-inline-icon rules-asset-icon${extraClass ? ` ${extraClass}` : ''}`;
    return `<img class="${className}" src="${src}" alt="" aria-hidden="true" decoding="async">`;
}

const RulesData = {
    sr: [
        {
            title: `${rulesAssetIconHtml('assets/rules-icon.svg')} Pravila i bodovanje`,
            content: `
                <h3>🎯 Cilj igre</h3>
                <p>Cilj je osvojiti što više poena bacanjem 6 kockica i upisivanjem najboljih kombinacija u tabelu. U svakom potezu imate do 3 bacanja, a posle svakog bacanja možete zadržati kockice koje želite da sačuvate.</p>
                <p>Svako polje u tabeli može se popuniti samo jednom. Ako kombinacija ne postoji, u polje se upisuje 0.</p>
                
                <h3>${rulesIconHtml('menu-icon-stats')} Kolone u igri</h3>
                <ul>
                    <li><strong>↓ NADOLE:</strong> Popunjava se redom od broja 1 do Yamba. Ne sme se preskakati.</li>
                    <li><strong>↑ NAGORE:</strong> Popunjava se redom od Yamba do broja 1.</li>
                    <li><strong>⇅ SREDINA:</strong> Popunjava se od sredine ka krajevima. Gornja grana kreće od MAX ka 1, a donja od MIN ka Yambu.</li>
                    <li><strong>S SLOBODNA:</strong> Može se popunjavati bilo kojim redosledom u toku igre.</li>
                    <li><strong>R RUČNO:</strong> Boduje se samo posle prvog bacanja. Ako pokušate da upišete polje u ovoj koloni posle drugog ili trećeg bacanja, igra ga upisuje kao 0 tek nakon potvrde.</li>
                    <li><strong>📢 NAJAVA:</strong> Posle prvog bacanja možete uključiti Najavu, izabrati tačno polje u koloni Najava i zatim morate upisati baš to polje. Najava se može otkazati dok još nije zaključana.</li>
                </ul>
                
                <h3>${rulesIconHtml('menu-icon-leaderboard')} Bodovanje i sekcije</h3>
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
            title: `${rulesAssetIconHtml('assets/stats-icon.svg')} Statistika i liste`,
            content: `
                <h3>${rulesAssetIconHtml('assets/stats-icon.svg')} Praćenje statistike</h3>
                <p>Yamb of the Balkan čuva važne rezultate i pokazatelje napretka:</p>
                <ul>
                    <li><strong>⚡ Indeks moći (Power Index):</strong> Glavni pokazatelj uspeha koji spaja rezultate, pobede, trofeje i ligaški učinak.</li>
                    <li><strong>${rulesIconHtml('menu-icon-leaderboard')} Rekord:</strong> Vaš najbolji lični rezultat.</li>
                    <li><strong>⚖️ Odnos pobeda/poraza (W/L):</strong> Prikazuje efikasnost u direktnim online duelima i turnirima.</li>
                    <li><strong>🔥 Vatreni niz:</strong> Broj uzastopnih pobeda ostvarenih u duelima i turnirima.</li>
                    <li><strong>🌟 All-Time PTS:</strong> Ukupan zbir poena kroz sve završene partije.</li>
                    <li><strong>⚔️ Rival:</strong> Prijatelj sa kojim imate najviše odigranih međusobnih duela.</li>
                </ul>
                
                <h3>⚔️ Međusobni dueli (H2H)</h3>
                <p>Za svakog prijatelja-rivala formira se H2H kartica sa istorijom okršaja: pobede, porazi, nerešeno, najveća pobeda, najteži poraz, prosečni poeni i aktuelni vatreni niz protiv tog rivala.</p>
                
                <h3>${rulesAssetIconHtml('assets/leaderboard-icon.svg')} Top liste i rangiranje</h3>
                <ul>
                    <li><strong>Nedeljna lista:</strong> Prikazuje najbolje rezultate iz tekuće nedelje.</li>
                    <li><strong>Mesečna lista:</strong> Prikazuje najbolje rezultate iz tekućeg meseca.</li>
                    <li><strong>Sva vremena:</strong> Čuva najjače rezultate od početka igre.</li>
                    <li><strong>Lokalna lista:</strong> Privatni pregled najboljih rezultata na vašem uređaju.</li>
                </ul>
            `
        },
        {
            title: `${rulesAssetIconHtml('assets/tournament-icon.svg')} Multiplayer i takmičenja`,
            content: `
                <h3>🌍 Multiplayer i dueli</h3>
                <h4>🎲 Klasični Multiplayer</h4>
                <p>Online igra vas spaja sa protivnikom koji je trenutno na mreži. Direktni dueli sa prijateljima čuvaju H2H istoriju i utiču na pobede, poraze i vatreni niz.</p>
                <h4>🤝 Privatni dueli</h4>
                <p>Prijatelja možete dodati preko liste aktivnih igrača ili pozivnice. Kada protivnik prihvati izazov, otvara se privatni duel.</p>

                <h3>${rulesAssetIconHtml('assets/tournament-info-icon.svg')} Turniri</h3>
                <ul>
                    <li><strong>${rulesAssetIconHtml('assets/tournament-icon.svg')} Sistem:</strong> Nedeljni turnir prima 8 igrača i igra se na ispadanje: četvrtfinale, polufinale i finale. Svaki duel je jedna partija.</li>
                    <li><strong>${dukatIconHtml()} Prijava:</strong> Kotizacija je 5500 dukata. Odjava i povraćaj mogući su samo dok traje faza prijave, pre početka turnira.</li>
                    <li><strong>📅 Zakazivanje:</strong> Kada se prijavi svih 8 igrača, protivnici u kosturu predlažu i prihvataju termin meča. Meč se pokreće kada je termin potvrđen.</li>
                    <li><strong>${rulesAssetIconHtml('assets/tournament-trophy-yotb.svg')} Nagrade:</strong> Pobednik dobija 44.000 dukata, veliki rast Indeksa moći i upis u Dvoranu slavnih. Finalista koji izgubi finale dobija povraćaj uloga od 5500 dukata.</li>
                    <li><strong>🏁 Tehnički rezultat:</strong> Napuštanje, istek vremena ili prekid veze mogu doneti tehničku pobedu protivniku.</li>
                </ul>
                
                <h3>${rulesAssetIconHtml('assets/quarterly-league-icon.svg')} Kvartalna liga</h3>
                <p>Kvartalna liga traje 3 meseca. Svaka završena partija donosi ligaške poene, a napredak ide kroz rangove: Amater, Profi, Majstor, Legenda i Titan.</p>
                <p>${rulesAssetIconHtml('assets/quarterly-league-watermark.png', 'rules-asset-icon--png')} Na kraju kvartala najbolji igrači dobijaju nagrade u dukatima i medalje, prvoplasirani postaje Šampion ciklusa, poeni prelaze u Sva vremena, a novi kvartal kreće od nule.</p>
            `
        },
        {
            title: "🟢 Komunikacija",
            content: `
                <h3>🟢 Online igrači i interakcija</h3>
                <p>Aplikacija prikazuje broj igrača koji su trenutno na mreži i listu dostupnih igrača.</p>
                <ul>
                    <li><strong>➕ Dodaj prijatelja:</strong> Pošaljite zahtev željenom igraču u realnom vremenu.</li>
                    <li><strong>👁️ Gledaj partiju:</strong> Posmatrajte tuđe mečeve uživo kada niste učesnik tog duela.</li>
                    <li><strong>⚔️ Izazov:</strong> Klikom na ikonicu možete direktno izazvati igrača na duel.</li>
                </ul>

                <h3>💬 Chat i komunikacija</h3>
                <ul>
                    <li><strong>🌍 Globalni chat:</strong> Povezuje igrače na serveru. Zabranjeni su uvrede po rasnoj, verskoj, nacionalnoj ili polnoj osnovi, kao i vulgarnost. Kršenja pravila vode do suspenzije chata.</li>
                    <li><strong>🎮 Duel chat:</strong> Privatni chat tokom meča sa protivnikom. I ovde važe ista pravila fer i kulturnog ponašanja.</li>
                    <li><strong>⚔️ Izazov iz chata:</strong> Klikom na ime igrača u globalnom chatu možete ga direktno izazvati.</li>
                </ul>
            `
        },
        {
            title: `${dukatIconHtml()} Dukati, tokeni i Riznica`,
            content: `
                <h3>${dukatIconHtml()} Dukati i ekonomija</h3>
                <p>Dukati su glavna valuta u igri. Koriste se za prijave na turnire, kupovine u Riznici i napredovanje kroz kolekcije.</p>
                <ul>
                    <li><strong>🎲 Završene partije:</strong> Na kraju partije dobijate dukate u skladu sa rezultatom, a nagradu možete duplirati nagradnom reklamom.</li>
                    <li><strong>${rulesAssetIconHtml('assets/daily-challenge-icon.svg')} Dnevni izazov:</strong> Dnevna nagrada je dostupna jednom dnevno. Server određuje kockice: prve 4 se sabiraju, 5. kockica množi taj zbir, a 6. množi ceo rezultat. Nagrada se može duplirati reklamom.</li>
                    <li><strong>${rulesAssetIconHtml('assets/ad-ticket-icon.svg')} Reklame za nagradu:</strong> U meniju dukata kratka reklama donosi +200 dukata, a nagradni video +500 dukata kada je dostupan.</li>
                    <li><strong>${rulesAssetIconHtml('assets/tournament-trophy-yotb.svg')} Takmičenja:</strong> Turniri i Kvartalna liga donose najveće nagrade najboljim igračima.</li>
                </ul>

                <h3>${rulesAssetIconHtml('assets/undo-token-icon.svg')} Vraćanje upisa</h3>
                <p>Dugme za ispravku postaje aktivno posle upisa u tabelu i vraća samo poslednji upis. Posle vraćanja dugme se gasi dok ne napravite novi upis.</p>
                <ul>
                    <li><strong>Online dueli:</strong> Vraćanje upisa troši 1 token i mora se iskoristiti pre nego protivnik započne sledeći potez. Zbog toga postoji zadrška od 2.5 sekunde pre protivnikovog bacanja.</li>
                    <li><strong>Lokalna igra:</strong> U solo i igri za dva igrača vraćanje se potvrđuje gledanjem reklame kada je dostupna na uređaju.</li>
                    <li><strong>Nabavka tokena:</strong> U meniju dukata kartica za tokene nudi +1 token za kratku reklamu i +3 tokena za nagradni video.</li>
                </ul>

                <h3>${rulesAssetIconHtml('assets/treasury-icon.svg')} Riznica</h3>
                <p>Riznica je mesto za personalizaciju igre i pregled osvojenih stvari.</p>
                <ul>
                    <li><strong>🏆 Trofeji:</strong> Posebni izazovi se otključavaju tokom igre i mogu doneti nagrade u dukatima.</li>
                    <li><strong>🎲 Kockice:</strong> Kupujete i birate skinove za kockice.</li>
                    <li><strong>✨ Efekti:</strong> Animacije se aktiviraju kada u partiji dobijete Yamb.</li>
                    <li><strong>🎨 Teme:</strong> Menjaju izgled aplikacije. Neki artikli se kupuju dukatima, a neki podržavaju reklamu ili popust od 20%.</li>
                </ul>
            `
        },
        {
            title: `${rulesAssetIconHtml('assets/settings-icon.svg')} Nalog, privatnost i server`,
            content: `
                <h3>🔐 Google integracija i cloud čuvanje</h3>
                <p>Yamb of the Balkan koristi Google prijavu da bi se napredak vezao za vaš nalog i vratio pri promeni uređaja.</p>
                <p>Na serveru se čuvaju statistika, H2H istorija, dukati, tokeni za vraćanje upisa, trofeji, inventar Riznice, aktivna tema/skin/efekat, Dnevni izazov, Kvartalna liga i turnirski status.</p>

                <h4>🛡️ Koji podaci se prikupljaju i zašto?</h4>
                <p>Prilikom prijave aplikacija koristi osnovne podatke sa Google profila:</p>
                <ul>
                    <li><strong>Ime i prezime:</strong> Koristi se za ime u igri i prikaz na listama.</li>
                    <li><strong>Email adresa:</strong> Služi kao jedinstveni identifikator naloga. Ne koristi se za spam poruke.</li>
                    <li><strong>Profilna slika:</strong> Koristi se kao avatar u multiplayer mečevima.</li>
                </ul>

                <h3>🖥️ Server podrška i bezbednost</h3>
                <ul>
                    <li><strong>🛡️ Fer igra:</strong> Server proverava online mečeve, rezultate, ekonomiju i nagrade kako bi sprečio manipulacije.</li>
                    <li><strong>⏱️ Anti-troll tajmer:</strong> Ako protivnik namerno odugovlači, server može dodeliti tehničku pobedu.</li>
                    <li><strong>🔌 Grace period:</strong> Kod kratkog prekida veze postoji pauza od 30 sekundi za povratak u meč.</li>
                    <li><strong>🚪 Napuštanje meča:</strong> Namerno napuštanje online duela može doneti kaznu u ligi i dukatima.</li>
                </ul>

                <h3>📺 Reklame (AdMob)</h3>
                <p>Reklame omogućavaju da igra ostane besplatna i da se nagrade potvrde na serveru.</p>
                <ul>
                    <li><strong>⏳ Kratke reklame:</strong> Koriste se za manje nagrade, povraćaje i pojedine akcije.</li>
                    <li><strong>🎁 Nagradne reklame:</strong> Koriste se za dupliranje nagrade, Dnevni izazov, dukate, tokene i popust u Riznici.</li>
                </ul>
            `
        }
    ],
    en: [
        {
            title: `${rulesAssetIconHtml('assets/rules-icon.svg')} Rules & scoring`,
            content: `
                <h3>🎯 Goal of the Game</h3>
                <p>The goal is to score as many points as possible by rolling 6 dice and entering the best combinations into the table. Each turn gives you up to 3 rolls, and after every roll you may hold dice you want to keep.</p>
                <p>Each table field can be filled only once. If the combination does not exist, the field scores 0.</p>
                
                <h3>${rulesIconHtml('menu-icon-stats')} Game Columns</h3>
                <ul>
                    <li><strong>↓ DOWN:</strong> Must be filled sequentially from 1 to Yamb.</li>
                    <li><strong>↑ UP:</strong> Must be filled sequentially from Yamb to 1.</li>
                    <li><strong>⇅ MIDDLE:</strong> Filled from the middle outward. The upper branch starts at MAX and moves toward 1; the lower branch starts at MIN and moves toward Yamb.</li>
                    <li><strong>S FREE:</strong> Can be filled in any order.</li>
                    <li><strong>R HAND:</strong> Scores only after the first roll. If you try to enter a field in this column after the second or third roll, the game enters 0 after confirmation.</li>
                    <li><strong>📢 ANNOUNCE:</strong> After the first roll, you may enable Announce, select the exact field in the Announce column, and then you must fill that field. The announcement can be canceled before it is locked.</li>
                </ul>
                
                <h3>${rulesIconHtml('menu-icon-leaderboard')} Scoring & Sections</h3>
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
            title: `${rulesAssetIconHtml('assets/stats-icon.svg')} Stats & leaderboards`,
            content: `
                <h3>${rulesAssetIconHtml('assets/stats-icon.svg')} Stat tracking</h3>
                <p>Yamb of the Balkan saves the most important results and progress indicators:</p>
                <ul>
                    <li><strong>⚡ Power Index:</strong> The main success indicator, combining results, wins, trophies, and league performance.</li>
                    <li><strong>${rulesIconHtml('menu-icon-leaderboard')} High score:</strong> Your personal best score.</li>
                    <li><strong>⚖️ W/L Ratio:</strong> Shows your efficiency in direct online duels and tournaments.</li>
                    <li><strong>🔥 Win Streak:</strong> Number of consecutive wins in duels and tournaments.</li>
                    <li><strong>🌟 All-Time PTS:</strong> Total points across all finished games.</li>
                    <li><strong>⚔️ Rival:</strong> The friend you have played against the most.</li>
                </ul>
                
                <h3>⚔️ Head-to-Head (H2H)</h3>
                <p>Every friend-rival gets an H2H card with your duel history: wins, losses, draws, biggest win, worst loss, average points, and current win streak against that rival.</p>
                
                <h3>${rulesAssetIconHtml('assets/leaderboard-icon.svg')} Leaderboards</h3>
                <ul>
                    <li><strong>Weekly:</strong> Best scores from the current week.</li>
                    <li><strong>Monthly:</strong> Best scores from the current month.</li>
                    <li><strong>All-Time:</strong> The strongest scores since the game began.</li>
                    <li><strong>Local List:</strong> Private best-score history on your device.</li>
                </ul>
            `
        },
        {
            title: `${rulesAssetIconHtml('assets/tournament-icon.svg')} Multiplayer & competitions`,
            content: `
                <h3>🌍 Multiplayer & Duels</h3>
                <h4>🎲 Classic Multiplayer</h4>
                <p>Online play matches you with an opponent who is currently online. Direct friend duels save H2H history and affect wins, losses, and win streaks.</p>
                <h4>🤝 Friend Duels</h4>
                <p>You can add friends from the active player list or by invite. Once the opponent accepts, a private duel opens.</p>

                <h3>${rulesAssetIconHtml('assets/tournament-info-icon.svg')} Tournaments</h3>
                <ul>
                    <li><strong>${rulesAssetIconHtml('assets/tournament-icon.svg')} Format:</strong> The weekly tournament accepts 8 players and is played as a knockout bracket: quarterfinals, semifinals, and final. Each duel is one game.</li>
                    <li><strong>${dukatIconHtml()} Entry:</strong> The entry fee is 5500 ducats. Unregistering and refunds are possible only during registration, before the tournament starts.</li>
                    <li><strong>📅 Scheduling:</strong> Once all 8 players register, opponents in the bracket propose and accept match times. A match starts after the time is confirmed.</li>
                    <li><strong>${rulesAssetIconHtml('assets/tournament-trophy-yotb.svg')} Rewards:</strong> The winner receives 44,000 ducats, a major Power Index boost, and a Hall of Fame entry. The finalist who loses the final gets the 5500 ducat entry fee refunded.</li>
                    <li><strong>🏁 Technical result:</strong> Leaving, timing out, or disconnecting can award a technical win to the opponent.</li>
                </ul>
                
                <h3>${rulesAssetIconHtml('assets/quarterly-league-icon.svg')} Quarterly League</h3>
                <p>The Quarterly League lasts 3 months. Every finished game grants league points, and progress moves through the ranks: Amateur, Pro, Master, Legend, and Titan.</p>
                <p>${rulesAssetIconHtml('assets/quarterly-league-watermark.png', 'rules-asset-icon--png')} At the end of the quarter, top players receive ducat rewards and medals, first place becomes the Cycle Champion, points move to All-Time, and the new quarter starts from zero.</p>
            `
        },
        {
            title: "🟢 Communication",
            content: `
                <h3>🟢 Online Players & Interaction</h3>
                <p>The app shows how many players are currently online and lists available players.</p>
                <ul>
                    <li><strong>➕ Add Friend:</strong> Send a real-time friend request.</li>
                    <li><strong>👁️ Spectate:</strong> Watch other matches live when you are not a participant in that duel.</li>
                    <li><strong>⚔️ Challenge:</strong> Use the challenge icon to invite a player directly to a duel.</li>
                </ul>

                <h3>💬 Chat & Communication</h3>
                <ul>
                    <li><strong>🌍 Global Chat:</strong> Connects players on the server. Insults based on race, religion, nationality, or gender are forbidden, as is profanity. Violations lead to chat suspension.</li>
                    <li><strong>🎮 Duel Chat:</strong> Private chat during a match with your opponent. The same fair-play rules apply.</li>
                    <li><strong>⚔️ Chat challenge:</strong> Clicking a player's name in global chat can challenge that player directly.</li>
                </ul>
            `
        },
        {
            title: `${dukatIconHtml()} Ducats, tokens & Treasury`,
            content: `
                <h3>${dukatIconHtml()} Ducats & economy</h3>
                <p>Ducats are the main in-game currency. They are used for tournament entries, Treasury purchases, and collection progress.</p>
                <ul>
                    <li><strong>🎲 Finished games:</strong> At the end of a game, you earn ducats based on your score, and you can double the reward with a rewarded ad.</li>
                    <li><strong>${rulesAssetIconHtml('assets/daily-challenge-icon.svg')} Daily Challenge:</strong> The daily reward is available once per day. The server sets the dice: the first 4 are summed, the 5th die multiplies that sum, and the 6th multiplies the total. The reward can be doubled with an ad.</li>
                    <li><strong>${rulesAssetIconHtml('assets/ad-ticket-icon.svg')} Reward ads:</strong> In the ducat menu, a short ad grants +200 ducats, and a rewarded video grants +500 ducats when available.</li>
                    <li><strong>${rulesAssetIconHtml('assets/tournament-trophy-yotb.svg')} Competitions:</strong> Tournaments and the Quarterly League give the largest rewards to top players.</li>
                </ul>

                <h3>${rulesAssetIconHtml('assets/undo-token-icon.svg')} Undo entry</h3>
                <p>The undo button becomes active after an entry in the table and only restores the last entry. After undoing, the button deactivates until you make another entry.</p>
                <ul>
                    <li><strong>Online duels:</strong> Undoing costs 1 undo token and must be used before the opponent starts the next turn. This is why there is a 2.5-second delay before the opponent's roll.</li>
                    <li><strong>Local play:</strong> In solo and two-player local games, undo is confirmed by watching an ad when available on the device.</li>
                    <li><strong>Getting tokens:</strong> The token tab in the ducat menu offers +1 token for a short ad and +3 tokens for a rewarded video.</li>
                </ul>

                <h3>${rulesAssetIconHtml('assets/treasury-icon.svg')} Treasury</h3>
                <p>The Treasury is where you personalize the game and review collected items.</p>
                <ul>
                    <li><strong>🏆 Trophies:</strong> Special challenges unlock during play and can reward ducats.</li>
                    <li><strong>🎲 Dice:</strong> Buy and equip dice skins.</li>
                    <li><strong>✨ Effects:</strong> Animations trigger when you score Yamb in a game.</li>
                    <li><strong>🎨 Themes:</strong> Change the app appearance. Some items are bought with ducats, and some support ads or a 20% discount.</li>
                </ul>
            `
        },
        {
            title: `${rulesAssetIconHtml('assets/settings-icon.svg')} Account, privacy & server`,
            content: `
                <h3>🔐 Google Integration & Cloud Save</h3>
                <p>Yamb of the Balkan uses Google sign-in so your progress is tied to your account and can be restored on another device.</p>
                <p>The server saves stats, H2H history, ducats, undo tokens, trophies, Treasury inventory, active theme/skin/effect, Daily Challenge, Quarterly League, and tournament status.</p>

                <h4>🛡️ What data is collected and why?</h4>
                <p>When you sign in, the app uses basic Google profile data:</p>
                <ul>
                    <li><strong>First and last name:</strong> Used for your in-game name and leaderboard display.</li>
                    <li><strong>Email address:</strong> Used as a unique account identifier. It is not used for spam.</li>
                    <li><strong>Profile picture:</strong> Used as your avatar in multiplayer matches.</li>
                </ul>

                <h3>🖥️ Server Support & Security</h3>
                <ul>
                    <li><strong>🛡️ Fair play:</strong> The server checks online matches, results, economy, and rewards to prevent manipulation.</li>
                    <li><strong>⏱️ Anti-troll timer:</strong> If an opponent intentionally stalls, the server can award a technical win.</li>
                    <li><strong>🔌 Grace period:</strong> A short connection drop gives you a 30-second pause to return to the match.</li>
                    <li><strong>🚪 Leaving a match:</strong> Intentionally leaving an online duel can cause league and ducat penalties.</li>
                </ul>

                <h3>📺 Ads (AdMob)</h3>
                <p>Ads help keep the game free and allow rewards to be verified by the server.</p>
                <ul>
                    <li><strong>⏳ Short ads:</strong> Used for smaller rewards, refunds, and some actions.</li>
                    <li><strong>🎁 Rewarded ads:</strong> Used for reward doubling, Daily Challenge, ducats, undo tokens, and Treasury discounts.</li>
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
    }

    init() {
        const existing = document.getElementById('rules-overlay-ui');
        if (existing) existing.remove();

        this.overlay = document.createElement('div');
        this.overlay.id = 'rules-overlay-ui';
        this.overlay.className = 'modal-overlay global-chat-overlay rules-overlay';
        
        this.overlay.innerHTML = `
            <div class="rules-card modal-box global-chat-shell">
                
                <div class="chat-header global-chat-header rules-card-header">
                    <div class="global-chat-title-group">
                        <span id="rules-main-title" class="global-chat-title rules-header-title">
                            <img class="rules-header-icon" src="assets/rules-icon.svg" alt="" aria-hidden="true" decoding="async">
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
            <button type="button" class="rule-dot${index === 0 ? ' active' : ''}" data-index="${index}" aria-label="${slideLabel} ${index + 1}"></button>
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

        this.sliderTrack.addEventListener('touchstart', (e) => {
            const touch = e.touches[0];
            if (!touch) return;
            this.touchStartX = touch.clientX;
            this.touchStartY = touch.clientY;
        }, { passive: true });

        this.sliderTrack.addEventListener('touchend', (e) => {
            const touch = e.changedTouches[0];
            if (!touch) return;

            const deltaX = touch.clientX - this.touchStartX;
            const deltaY = touch.clientY - this.touchStartY;
            const isHorizontalSwipe = Math.abs(deltaX) > 45 && Math.abs(deltaX) > Math.abs(deltaY) * 1.2;

            if (!isHorizontalSwipe) return;

            if (deltaX < 0) {
                this.goToSlide(this.currentSlide + 1);
            } else {
                this.goToSlide(this.currentSlide - 1);
            }
        }, { passive: true });
    }

    updateDots() {
        this.dots.forEach((dot, i) => {
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
