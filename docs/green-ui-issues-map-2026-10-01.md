# Green Room Pack — mapa novih UI problema (2026-10-01)

Status: koraci 1–3 su izmenjeni i provereni na izolovanom mobilnom QA prikazu. Korak 4 obuhvata izolovani Android Chrome QA i dodatni smoke u već instaliranom Capacitor WebView-u sa lokalno posluženim trenutnim `www`. Na uobičajenom i uskom ekranu sa uvećanim sistemskim fontom pronađena su i ispravljena dodatna preklapanja. Potpuna nativna regresija sa novim APK-om, kontrolisanim podacima, oba jezika i drugim temama **još nije završena**.

Korak 5: [ciljana provera EN/praznih stanja i izolacije tema](green-ui-step5-language-theme-regression-2026-10-01.md) pokriva Android Chrome fixture na dva formata, Green EN i po dva ekrana Vaskrs/Pustinjsko staklo SR. To nisu korisničke preference ni nativni EN test; preostale stavke su izričito zabeležene u zapisniku.

Provera koraka 1: obe statističke liste prikazuju dodatni profilni red sa stvarnim rangom 147 na kraju liste od 40 redova, bez duplikata kada je profil već rang 1; samo dodatni red ostaje vidljiv pri skrolu. Kartice mečeva QF/SF/finala izmerene su na istoj širini od 314 px u viewportu 360 px. Prozor meča u sve tri faze skriva stari SVG i prikazuje odgovarajući Green asset; u finalu je vraćen i ranije skriven red finaliste. U Pozovi prijatelja prikaz je `MOĆ`, a brojke POB/NER/POR na gornjim karticama koriste iste tri boje kao donje kartice. Oznake ostaju iste čitljive neutralne boje kao u donjim karticama. Ovo ne zamenjuje završni prolaz na emulatoru.

Provera koraka 2: Top lista, Statistika, Podešavanja, Turnir, Pravila, Kvartalna liga, Global chat, Online igrači, Vatreni niz, Power Index i Dukati/Ispravi zadnji upis imaju isti spoljašnji Green okvir (površina, ivica, radijus, senka i bezbedni razmaci). Na 360×780 meri se `x=10, y=45, 340×692`; na 320×568 `x=10, y=45, 300×480`. Sva X dugmad u tim omotačima su `44×44` i ostaju unutar kartice. Ekonomska soba je usklađena sa kartičnim tipom A; obe njene stranice i varijanta sa rezervisanim prostorom za reklamu imaju dostupan sadržaj. Ekrani tipa B i Dnevni izazov nisu pretvarani u ovaj omotač. Izolovani prikaz ne potvrđuje Android sistemske insete ni stvarni oglas.

Provera koraka 3: u Kvartalnoj ligi `MAJSTOR`, `LEGENDA` i `TITAN` ostaju levo od srednje linije na 320 i 360 px. Green preview padanja dukata ima glinenu zelenu podlogu; dukati i animacija ostaju vidljivi. U Riznici kartice skinova, efekata i tema zadržavaju istu geometriju pri prelazu `KORISTI` → `AKTIVNO`, uključujući uski prikaz na engleskom. Prozor pobednika kvartala dobio je funkcionalno vidljiv overlay, postojeću kanonsku Green medalju, unutrašnji skrol i raspored koji na 320×568 i 360×780 ostaje u raspoloživoj zoni; proveren je i dug naziv/veći font. Oznaka `Osvojeno` je centrirana u maloj podkartici na 320 i 360 px, bez smanjenja samog znaka i bez sudara sa tekstom. Ovo su rezultati izolovanog browser QA, ne potvrda Android sistemskih inseta, stvarnih podataka ili svih stanja na uređaju. Prošli su `node scripts/check-js.js`, `node scripts/check-green-asset-coverage.js` i `git diff --check`.

Provera koraka 4: [Android QA zapisnik sa snimcima](green-ui-step4-emulator-qa-2026-10-01.md) pokriva ciljana stanja S/T/F/A-C/L/R/W/D u izolovanom prikazu. Dodatni prolaz kroz već instalirani Android WebView potvrdio je osnovni raspored nekih soba i otkrio prelamanje tačkica Pravila, preklapanje naslova Podešavanja sa X i sečenje dugih imena u Pozovi prijatelja pri 130% fontu; te Green-only korekcije su ponovo pregledane. Nisu rađeni build, nova instalacija ni kompletan test sa kontrolisanim stvarnim podacima, pa se ovaj prolaz ne predstavlja kao završena nativna regresija.

## 1. Statistika — Vatreni niz i Power Index

- **S1, vidljivost sopstvenog mesta:** Ako moj profil nije među već prikazanim igračima, posle poslednjeg prikazanog reda treba dodati **običan red igrača**, istog izgleda i širine kao ostali. U njemu stoji stvarni rang (npr. posle 1–7 prikazuje se `47.`), moje ime, avatar i vrednost. Bez posebne podloge, zasebnog docka, isticanja kao druge vrste kartice ili pomeranja na vrh.
- **S2, doslednost dve liste:** Isto ponašanje u Vatrenom nizu i Power Indexu. Ako sam već među prikazanim redovima, nema duplikata. Proveriti slučaj učitavanja naredne strane i promenu sopstvenog ranga; ne prikazivati izmišljeni rang ako server ne vrati podatak.
- **Trag u kodu:** `www/vatreniniz.js` i `www/powerindex.js`, oba `renderList()`: za Green (`dark`) je `myRankHtml` pre liste i koristi `pinned: true`, dok se običan red na kraju dodaje samo za podrazumevanu `dark` temu. `www/teme.css` posebno stilizuje `.is-pinned` i dock. Treba razlikovati uklanjanje dock podloge od uklanjanja samog reda.

## 2. Turnir — braket i prozor meča

- **T1, širina meča:** U jedinstvenoj swipe kartici četvrtfinale i polufinale imaju užu karticu jednog meča od finala. Ujednačiti upotrebljivu širinu QF/SF/finala prema ispravnoj finalnoj kartici, bez ukidanja četiri/dva/jednog meča i bez promene swipe navigacije. Proveriti najduža imena, avatar, rezultat i stanje meča na uskom telefonu.
- **T2, stari pehar:** Pri otvaranju završenog meča prozor rezultata ne sme prikazati stari SVG pehar. Za Green koristiti odgovarajući kanonski Green motiv, uz proveru i četvrtfinala, polufinala i finala. `www/turnir.js` ubacuje i `.tourney-match-result-icon-default` i `.tourney-match-result-icon-green`; Green CSS koji skriva podrazumevanu ikonu trenutno je vezan za `#tournament-screen`, dok se detalj otvara preko opšteg `app.modal.alert` izvan te sobe. Vizuelno potvrditi koja ikona se zaista prikazuje.

## 3. Pozovi prijatelja

- **F1, naziv:** Na gornjoj kartici rivala `Moć` treba da bude `MOĆ` (srpski prikaz), bez nenamerne promene drugih jezika ili svih drugih upotreba prevoda `ws_power`.
- **F2, boje ishoda:** POB / NER / POR na gornjim karticama mog profila i rivala treba da koriste isti zeleni / narandžasti / crveni sistem kao donje kartice prijatelja. Ujednačiti i tekst i brojeve uz čitljiv kontrast; ne dirati geometriju i donje kartice koje već izgledaju dobro.
- **Trag:** Gornji blok je u `www/index.html` (`waiting-my-*`, `easter-invite-rival-*`), donje kartice nastaju u `www/game.js`; Green pravila su u `www/teme.css`.

## 4. Tip sobe, glavna kartica i X

### A — velika glavna kartica sa X, kandidat za zajednički standard

- Top lista (`#highscores-screen`, `.hs-card`)
- Statistika/H2H (`#stats-screen`, `.stats-shell`), kao i njene zasebne liste Vatreni niz (`#streak-overlay`) i Power Index (`#pi-modal-overlay`)
- Podešavanja (`#settings-screen`, `.settings-shell`)
- Turnir (`#tournament-screen`, `.tourney-shell`)
- Pravila (`#rules-overlay-ui`, `.rules-card`)
- Kvartalna liga (`#league-modal-overlay`, `.modal-box`)
- Global chat (`#global-chat-overlay`, `.global-chat-shell`)
- Online igrači (`#online-players-overlay`, `.online-players-shell`)

Za svaku stavku iz A izmeriti spoljne granice kartice u istom viewportu: širinu, gornju/donju bezbednu zonu, maksimalnu visinu, okvir, uglove, senku, poziciju zaglavlja i unutrašnji osnovni padding. Ispitati da li X ima iste dimenzije, izgled, položaj, kontrast i dodirnu zonu. Standardizovati **samo glavni omotač i X** tamo gde odstupaju; ne pomerati unutrašnje elemente soba niti brisati njihove posebne funkcije.

### B — ekran bez velike glavne kartice

- Riznica (`#riznica-screen`): pun ekran sa zaglavljem i karticama predmeta, ali bez jedne velike spoljne kartice.
- Online random i Pozovi/pronađi prijatelja (`#waiting-screen` u različitim stanjima): prikazi toka igre i liste prijatelja bez zajedničkog spoljnog modalnog omotača.
- Solo i dva igrača hotseat: neposredan ulazak u tablu/mod igre; ne uvoditi glavnu modalnu karticu.

Ove ekrane ne prilagođavati standardu A. Njihove postojeće X/kontrole nisu automatski iste vrste kao modalni X u grupi A.

### C — izuzeci i odluka o rasporedu

- Dnevni izazov (`#glass-daily-overlay`) ima sopstvenu veliku kartu, ali nema X u njenom sastavu; tretirati ga kao poseban tok, ne dodavati X radi ujednačavanja.
- Dukati / Ispravi zadnji upis (`#undo-menu-overlay`, `.economy-shell`) već imaju omotač nalik glavnoj kartici i X, ali je vizuelno hibrid. Preporučeni pravac za sledeću fazu je da se **spoljašnji omotač** uklopi u grupu A, jer najmanje menja postojeće tabove i sadržaj. Pre konačne primene potvrditi na emulatoru da taj pravac zaista bolje izgleda od rasporeda bez kartice.
- Ekran proglašenja pobednika kvartala (`#winner-modal-overlay`) jeste događajni modal, ne soba; zasebno se rešava u tački 7.

## 5. Kvartalna liga — naziv ranga

- **L1:** Zadržati sadašnju dvokolonsku podelu `.league-summary-card` i sve vrednosti. Samo oznaka ranga, posebno `MAJSTOR` i drugi duži naziv, mora stati u levu polovinu bez prelaska srednje linije. Proveriti različite rangove, uske ekrane i oba jezika; ne lomiti brojeve i poene na desnoj strani.
- **Trag:** `www/kvartalnaliga.js` kreira `.league-current-rank` i `.league-summary-points`; Green grid/linija su pri kraju `www/teme.css`.

## 6. Riznica — efekat i stabilnost kartica

- **R1, pozadina dukata:** Preview efekta padanja dukata (`gold_rain`, `.prev-gold_rain`) treba imati istu Green glinenu porodicu pozadina kao ostali efekti, uz očuvanje vidljivih dukata i animacije. Trenutno je osnovni preview tamni gradijent u `www/efekti.css`; ne pretpostaviti da su postojeće Green izmene pseudo-elementa dovoljne.
- **R2, KORISTI → AKTIVNO:** Pritiskom na `KORISTI` kartica ne sme promeniti spoljašnju širinu/visinu ni pomeriti susedne kartice. Proveriti sve tipove predmeta i prelaz aktivno/neaktivno, uključujući duže nazive i stanje zaključano/kupljeno. `www/managers.js` rekreira sadržaj kartice sa različitim dugmetom i dodatnom ikonom za aktivno; izmeriti geometriju pre i posle umesto pretpostavke da je uzrok samo tekst.

## 7. Kraj kvartala — kartica pobednika

- **W1:** `#winner-modal-overlay` mora ostati unutar gornje i donje bezbedne zone telefona; sadržaj mora biti pregledan na uskom/niskom ekranu, a dugme dostupno bez sečenja. Urediti hijerarhiju: Green logo, kvartal, medalja, avatar/ime, poeni, čestitka, akcija. Zadržati odgovarajući Green DNK i čitljiv kontrast.
- **Trag:** Modal nastaje u `www/game.js` sa mnogo inline dimenzija, `padding: 30px 20px`, elementima fiksne visine i bez posebnog ograničenja visine/skrola; Green CSS u `www/teme.css` menja uglavnom površinu i logo. Testirati dug naziv profila, mali telefon i veću sistemsku veličinu fonta. Ne menjati podatke o pobedniku.

## 8. Dnevni izazov — oznaka završetka

- **D1:** Po zaustavljanju svih šest kockica proveriti stvarno središte znaka `Osvojeno` prema maloj podkartici kojoj vizuelno pripada. Trenutno je `.daily-glass-complete-mark-green` apsolutno postavljen `left: 50%`, `top: -66px` u `.glass-daily-result`, pa može delovati kao da leži na donjoj ivici susedne podkartice. Cilj je optički pravilno centriranje i skladno preklapanje. Veličinu od 58 px smanjiti **samo ako** je pri vizuelnoj proveri dokazano prevelika; inače je zadržati.

## Redosled i kriterijum zatvaranja

1. Popraviti S1/S2, T1/T2 i F1/F2; potvrditi ponašanje, ne samo CSS.
2. Izmeriti A/C na istom viewportu, uskladiti omotače/X, a B ostaviti van ovog standarda.
3. Ciljano rešiti L1, R1/R2, W1 i D1.
4. Ponoviti proveru na emulatoru: mali i tipičan ekran, srpski/engleski, Green tema, ključna stanja učitano/prazno/aktivno; proveriti da druge teme nisu promenjene.

Zatvaranje stavke zahteva vizuelni prikaz i funkcionalnu proveru. Statički pregled koda nije potvrda da korisnički opisani problem više ne postoji.
