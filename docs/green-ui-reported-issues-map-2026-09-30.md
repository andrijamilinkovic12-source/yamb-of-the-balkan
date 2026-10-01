# Green UI — mapa prijavljenih problema (30. 9. 2026)

Opseg: isključivo Zelena tema. Ovo je inventar za proveru i ispravke, a ne potvrda da su problemi rešeni. `Prijavljeno` znači korisnički nalaz; `kod potvrđuje` znači da postoji konkretan mogući uzrok u implementaciji; `vizuelno proveriti` znači da treba snimiti i izmeriti stvarni prikaz na emulatoru. Postojeće nezavršene izmene u radnom stablu nisu deo ove mape.

## Dnevni izazov

| ID | Problem i očekivano ponašanje | Trag u kodu / status | Provera prihvatanja |
| --- | --- | --- | --- |
| DC-01 | Šest kockica jeste centrirano, ali su prevelike. Veličina treba vizuelno da odgovara kockicama u modovima igre na istom uređaju, uz očuvanje centriranja i razmaka. | `www/teme.css` Green `.daily-glass-die.dice` ograničava širinu na 82 px; `www/style.css` mobilna igra ima `.dice` do 60 px. **Kod potvrđuje razliku; vizuelno proveriti stvarnu izračunatu veličinu.** | Uporediti prečnik/stranicu kocke u Dnevnom i aktivnoj igri na istom viewportu (uključujući mali telefon); nijedna kocka ne izlazi iz kartice. |
| DC-02 | Tekst akcije „Dupliraj [dukat] (x2)” ponavlja isto značenje. Ukloniti redundantno „(x2)” i zadržati jasnu akciju i jedinstveni Green simbol dukata. | `www/dnevniizazov.js` gradi dugme sa `btn_double_short`, ikonom i doslovnim `(x2)` oko reda 1247. **Kod potvrđuje.** | SR/EN tekst bez suvišnog množitelja, normalno prelamanje i ista funkcija dupliranja. |
| DC-03 | Završno obaveštenje kaže „dukata/ducats” pored simbola dukata. Poruka za običnu i dupliranu nagradu treba da ima jednu nedvosmislenu oznaku valute. | `www/languages.js` poruke za obe nagrade sadrže `{DUKAT_ICON}` i naziv valute; `www/dnevniizazov.js` pomoćna metoda uklanja taj višak samo za Vaskrs, ne i za Green. **Kod potvrđuje.** | Proveriti oba ishoda (običan i dupli), SR/EN, broj i simbol; pročitljiv kontrast i položaj završnog toasta/modala. |

## Top lista

| ID | Problem i očekivano ponašanje | Trag u kodu / status | Provera prihvatanja |
| --- | --- | --- | --- |
| TL-01 | Isti Green logo u praznom stanju lokalne i globalne liste izgleda različite veličine. Istom stanju treba ista vizuelna mera. | `www/toplista.js` koristi Green state asset; `www/teme.css` daje uobičajenom state logou 86 × 86 px, a loading stanju 68 × 68 px. **Mogući uzrok je mešanje „prazno” i „učitavanje”; treba potvrditi stanje obe kartice u trenutku poređenja.** | Snimiti lokalnu i globalnu listu u istom stanju (prazno/prazno), kao i loading; uporediti vidljive dimenzije, centar i razmake. Ne ujednačavati loading naslepo ako je namerno drugačiji motiv. |

## Statistika — Vatreni niz i Power Index

| ID | Problem i očekivano ponašanje | Trag u kodu / status | Provera prihvatanja |
| --- | --- | --- | --- |
| ST-01 | „Moje mesto” u Vatrenom nizu ne treba posebnu donju karticu. Ako korisnik nije u trenutno prikazanoj top-listi, prikazati ga kao običan red **na kraju iste liste**, s njegovim stvarnim rangom. Ako već jeste na listi, ne duplirati red. | `www/vatreniniz.js` za Green uključuje izdvojeni `streak-my-rank-dock` nezavisno od vidljivosti igrača; `www/teme.css` ga posebno stilizuje. **Kod potvrđuje izdvajanje; proveriti uslove dupliranja i paginacije.** | Stanja: korisnik vidljiv u topu, van prikazanog topa, prazna lista, „učitaj još”; uvek najviše jedan sopstveni red, isti osnovni stil kao ostali. |
| ST-02 | Isti problem u Power Index listi. | `www/powerindex.js` analogno koristi `pi-my-rank-dock`. **Kod potvrđuje izdvajanje.** | Isti scenariji kao ST-01, uz proveru stvarnog mesta i bodova. |

## Pravila

| ID | Problem i očekivano ponašanje | Trag u kodu / status | Provera prihvatanja |
| --- | --- | --- | --- |
| PR-01 | Tačkice menjaju stranu, ali horizontalni swipe ne radi. Prevlačenje levo/desno treba da menja po jednu stranu kao u Kvartalnoj ligi, bez ometanja vertikalnog čitanja dugačkih pravila. | `www/pravilaigre.js` za Green preskače sopstvenu obradu `touchend` i oslanja se na native `scroll-snap`; `www/style.css` ima horizontalni track i vertikalno skrolabilan sadržaj slajda. **Kod objašnjava mogući prekid, ali ne dokazuje koji sloj hvata dodir.** | Prstom levo/desno po sadržaju, po praznoj površini i blizu ivica; jedna gestikulacija = jedna strana, tačkica se sinhronizuje, krajnje strane ne preskaču, vertikalni skrol teksta ostaje ispravan. |

## Turnir

| ID | Problem i očekivano ponašanje | Trag u kodu / status | Provera prihvatanja |
| --- | --- | --- | --- |
| TU-01 | U bracketu nisu vidljivi svi podaci takmičara i mečeva iako ima prostora. Ukloniti nepotrebno ugnježđavanje/sužavanje kartica samo ako je potvrđeno da ono skriva sadržaj; sačuvati hijerarhiju kola, rezultate i interakciju. | `www/turnir.js` gradi `tourney-page > tourney-card > tourney-matches > tourney-match`; CSS koristi dodatni horizontalni padding, više `overflow:hidden`, male avatare/tekst i ograničen prikaz imena. **Kod ukazuje na moguće odsecanje; konkretna polja i viewport tek vizuelno utvrditi.** | Četvrtfinale, polufinale i finale; zakazan/aktivan/završen meč; kratka i duga imena, rezultat/status/rang i oba takmičara vidljivi na telefonu. Meriti stvarni prostor pre promene strukture. |

## Pozovi prijatelja

| ID | Problem i očekivano ponašanje | Trag u kodu / status | Provera prihvatanja |
| --- | --- | --- | --- |
| PF-01 | Cela soba se nepotrebno pomera gore–dole. Na uobičajenoj visini telefona osnovni ekran treba da stane u safe zonu; horizontalni spisak prijatelja sme da se pomera horizontalno. Na izrazito maloj visini sadržaj ipak mora ostati dostupan. | `www/style.css` za `.waiting-screen-shell` dozvoljava `overflow-y:auto`; Green CSS povećava donji padding i slaže VS oblast u kolonu. **Kod potvrđuje mogućnost skrola, ne i koliki je višak.** | Meriti `scrollHeight/clientHeight` na standardnom i malom emulatoru, sa praznom/punom listom i otvorenom tastaturom. Ne „popravljati” zabranom skrola koja bi sakrila kontrole. |
| PF-02 | Avatar korisnika i najvećeg rivala prelaze okvir svojih kartica. Obe slike, uključujući border/senku, treba da ostanu unutar kartice sa istim optičkim centrom. | `www/index.html` sadrži obe kartice; Green CSS koristi grid red visine 54 px uz avatar od 54 px i dodatne margine/border. **Vrlo verovatan geometrijski uzrok; potvrditi DOM pravougaonike.** | Snimak i merenje `getBoundingClientRect` slike i roditelja na više širina; bez clippinga i dodira sa ivicom. |
| PF-03 | Online/offline status treba dosledno da stoji **na dnu glavne kartice svakog prijatelja**, umesto kao gornja tačka ili posredan tekst na pozivnom dugmetu. Akcija „Pozovi” ostaje odvojena od statusa. | `www/game.js` prijatelju dodaje gornju statusnu tačku i dugme „POZOVI”/„OFFLINE”. **Kod potvrđuje sadašnji raspored.** | Online, offline i prelaz statusa; isti položaj na karticama različitih imena, status jasan i bez oslanjanja samo na boju. |
| PF-04 | Podkartica sa moći, pobedama, nerešenim i porazima treba da ima istu strukturu, redosled, dimenzije i poravnanje za sve prijatelje; proveriti i kartice „ja”/„najveći rival” tamo gde dele te podatke. | `www/game.js` pravi `.easter-friend-records`, a Green `www/teme.css` ih posebno prikazuje i stilizuje. **Postoje različite prezentacije; vizuelno proveriti svaku vrstu kartice.** | Uporediti nekoliko prijatelja sa kratkim/dugim imenom i različitim brojem cifara; ništa ne iskače, nema nejednakih visina ni prelomljenih oznaka. |

## Kvartalna liga

| ID | Problem i očekivano ponašanje | Trag u kodu / status | Provera prihvatanja |
| --- | --- | --- | --- |
| KL-01 | Donja kartica ulazi u zonu sistemske navigacije. Sav važan sadržaj i kontrole moraju ostati iznad stvarnog Android navigation inseta. | `www/kvartalnaliga.js` dodaje donji pager; Green modal ima više CSS pravila za visinu/padding, uključujući poseban uski viewport. **Prijavljeno vizuelno; ranija provera drugog stanja/viewporta nije dokaz za ovaj nalaz.** | Emulator sa gesture i 3-button navigacijom, mali ekran, prva/poslednja strana, skrol do dna; meriti dno kartice i pagera prema `visualViewport`/safe insetu. |
| KL-02 | Kartica „Vaš rang / rang / poeni / sva vremena poeni” ostavlja prazan levi deo, a informacije se gomilaju desno. Potrebna je jasna, ravnomerna raspodela po celom raspoloživom prostoru i čitljiva hijerarhija. | `www/kvartalnaliga.js` pravi levi rang i desnu grupu poravnatu desno; Green CSS na uskim ekranima menja flex raspored. **Kod potvrđuje dve grupe, ali stvarni uzrok praznine treba izmeriti u prijavljenom stanju.** | Porediti kratak/dug naziv ranga i različite brojeve, 320–400 px širine i veći font; sve četiri informacije čitljive, bez velikog praznog prostora ili preklapanja. |

## Redosled i zajedničke provere

1. Snimiti polazno stanje svih sedam soba na istom Green profilu i zabeležiti viewport, sistemsku navigaciju i testne podatke. Prioritet za funkciju/safe zonu: KL-01, PR-01, TU-01, PF-02.
2. Ispraviti funkcionalni raspored i geometriju (PR-01, KL-01, TU-01, PF-01/02), pa proveriti da nijedan element nije odsečen i da su kontrole dostupne.
3. Ujednačiti sadržaj/listu/kartice (ST-01/02, PF-03/04, KL-02), uz posebna stanja „ja sam već u topu”, offline i duga imena.
4. Završiti vizuelni i tekstualni polish (DC-01/02/03, TL-01), SR/EN i obična/dupla nagrada.
5. Ponovo vizuelno proći svaku stavku i napraviti regresiju Vaskrs/Pustinjsko staklo. Menjati isključivo Green pravila ili zajednički kod uz uslov teme. Tek posle toga označiti stavku kao proverenu.

Mapa sama po sebi ne podrazumeva build, commit ili objavljivanje. Status nakon započetih lokalnih ispravki zabeležen je ispod; „urađeno u kodu” nije isto što i potvrđeno u Android emulatoru.

## Radni status nakon prvog prolaza ispravki

| Stavke | Urađeno u kodu | Potvrda |
| --- | --- | --- |
| DC-01/02/03 | Green kockice ograničene na mobilnu meru igre; „(x2)” uklonjen samo za Green; završne Green poruke prebacuju broj ispred jedinstvene ikone bez reči „dukata/ducats”. | Sintaksa i statički regresioni test prolaze; završni modal nije viđen u aktivnoj Android partiji. |
| TL-01 | Green empty i loading znak izjednačeni na 86 px; canonical manifest i test usklađeni. | Regresioni test prolazi; uporedni screenshot prazne lokalne i globalne liste još nije napravljen. |
| ST-01/02 | Green ne koristi donji rank dock; sopstveni red je poslednji red liste samo ako već nije među prikazanim igračima. | Sintaksa i statički regresioni test prolaze; server/paginacija nisu vizuelno isprobani. |
| PR-01 | Green horizontalni touch gest obrađuje se ručno iz početne strane, uz sprečavanje native dvostrukog pomeranja; vertikalni gest se ne presreće. | Statički regresioni test prolazi; fizički touch na emulatoru još nije potvrđen. |
| TU-01 | Proširen prostor bracket strane, čitljiviji font i Power Index; duga imena više nisu ograničena na dva reda, poraženi su manje izbledeli, a lista mečeva je skrolabilna ako stvarno nema mesta. | Kod i sintaksa provereni; potreban prikaz realnih mečeva sva tri kola u Android WebView-u. |
| PF-01/02/03/04 | Uklonjen dvostruki višak paddinga na običnoj visini; avatari staju u grid; Green status je pri dnu svake kartice; statistika ima četiri poravnata reda i jednake dimenzije. Na kratkom ekranu skrol je dozvoljen da kontrole ne budu odsečene. | Izolovani Green QA sa dva testna prijatelja: na 360×740 `scrollHeight = clientHeight = 740`; avatari unutar kartica; provereni online/offline i dugo ime. Produkcioni tok poziva nije aktiviran. |
| KL-01/02 | Visina fiksnog modala sada oduzima gornju i donju safe zonu; sažetak koristi dve ravnomerne kolone umesto gomilanja desno. | Izolovani Green QA: 43 px razmaka od dna na 360×740 i 360×640, pager unutar modala. Android gesture/3-button inset još nije potvrđen. |

Sve promene su lokalne. Prošli su direktni `node` testovi za sintaksu, game rules, trofeje, sinhronizaciju profila, rezultate, kvartalnu ligu, reconnect, H2H ledger, Green asset coverage i theme performance. `npm` prečica trenutno ne radi zbog lokalnog nedostajućeg `npm-cli.js`; isti testovi su pokrenuti direktno. `adb devices` ne prikazuje povezan emulator, pa stavke koje traže pravi touch, online podatke ili Android sistemsku navigaciju ostaju za završnu vizuelnu potvrdu.

## Dopunska provera na Android emulatoru

Postojeći `Pixel_7_Pro` je potom pokrenut sa lokalnim `www` sadržajem preko `adb reverse tcp:3000 tcp:3000`. Lokalni server je radio sa praznim `MONGO_URI`; nije građen ili instaliran novi APK, niti su slati pozivi, rezultati ili trošeni dukati. Snimci su u `screenshots/green-ui-step9/green-next-*.png`.

| Stavke | Nalaz na emulatoru | Preostala granica provere |
| --- | --- | --- |
| PR-01 | Swipe ulevo na prvoj strani Pravila prelazi tačno na drugu stranu; aktivna tačkica se menja zajedno sa sadržajem. | Povratni swipe i svih šest prelaza nisu zasebno snimljeni. |
| TU-01 | Prikaz četvrtfinala pokazuje puna imena, indekse moći i rezultate za četiri meča bez odsecanja. | Polufinale/finale i druga stanja bracket-a nisu pregledana. |
| KL-01/02 | Rang/poeni zauzimaju dve čitljive polovine; donji pager i panel su iznad Android gesture trake. | Serverska lista je ostala u stanju učitavanja bez baze; 3-button navigacija nije proverena. |
| PF-01/02/03/04 | Kartice „ja” i „najveći rival” drže avatare u okviru; nakon učitavanja liste prijatelja prikazani su statistika istim redosledom i status „Online” pri dnu kartice. Nije primećen vertikalni pomak osnovnog ekrana pri probnom gestu. | Offline prijatelj, duga imena, tastatura i kraći ekran nisu provereni u stvarnom toku; poziv nije poslat. |
| TL-01 | Lokalna prazna lista prikazuje Green znak normalne veličine i čitljiv tekst. | Globalna lista je imala podatke, pa uporedni snimak oba prazna stanja nije moguć na ovom profilu. |
| ST-01/02 | Power Index i Vatreni niz liste se otvaraju i redovi su čitljivi. | Lični red van prikazanog vrha nije potvrđen: lokalni odgovor nije dao takav završni slučaj. |
| DC-01/02/03 | Ulaz u Dnevni izazov i Green informativni modal rade. | Izazov je na emulatoru već bio odigran tog dana; aktivne kockice, dupliranje i završna nagrada nisu mogli biti viđeni bez menjanja podataka. |

Tokom pregleda pronađeno je da su X dugmad u zasebnim Power Index i Vatreni niz modalima ostala crvena. Green selektor je proširen na `#pi-modal-overlay` i `#streak-overlay`; oba X dugmeta su posle ponovnog otvaranja aplikacije vizuelno potvrđena kao bela na istoj zelenoj kružnoj podlozi kao u ostalim sobama. Ovo nije dokaz da su sve gore navedene stavke zatvorene.

## Izolovani završni prolaz nedostupnih stanja

Lokalni QA prikaz `qa/green-runtime.html` sada može da prikaže dodatna stanja koristeći postojeći DOM/CSS i, za složenije liste, izdvojene metode za renderovanje iz aplikacije sa sintetičkim podacima. Nije pokrenut bootstrap aplikacije niti veza sa nalogom, socketom ili bazom. Zato ovi snimci potvrđuju raspored i tekst u zadatom stanju, **ne** stvarni završetak izazova, rang sa servera ili online meč.

| Stavke | Izolovani nalaz na Android emulatoru | Granica |
| --- | --- | --- |
| DC-01/02/03 | Šest aktivnih kockica je centrirano u rasporedu 3 × 2 i ograničeno na mobilnu meru igre. Dugme ima „DUPLIRAJ” i jedan Green dukat bez „×2”; završna duplirana poruka ima broj i jednu ikonu bez ponavljanja reči „dukata”. | Nije odigran izazov; običan završetak i EN nisu zasebno snimljeni. [Kockice](../screenshots/green-ui-step9/green-remaining-daily-active.png), [dupliranje](../screenshots/green-ui-step9/green-remaining-daily-double.png), [završna poruka](../screenshots/green-ui-step9/green-remaining-daily-final.png). |
| TL-01 | Prazna globalna i lokalna Top lista koriste istu vizuelnu veličinu Green znaka i isti raspored. | U oba stanja su sintetički prazni podaci. [Globalna](../screenshots/green-ui-step9/green-remaining-top-global.png) / [lokalna](../screenshots/green-ui-step9/green-remaining-top-local.png). |
| ST-01/02 | Vatreni niz i Power Index prikazuju sopstveni rang 147 kao poslednji običan red, bez zasebnog donjeg panela. | Prikazivač je stvaran, rang/podaci su sintetički; nije potvrđena serverska paginacija. [Vatreni niz](../screenshots/green-ui-step9/green-remaining-streak-off-top.png) / [Power Index](../screenshots/green-ui-step9/green-remaining-pi-off-top.png). |
| TU-01 | Polufinale i finale iz stvarnog bracket prikazivača zadržavaju duga imena, indeks i rezultate unutar kartica. | Mečevi su sintetički; stanje uživo i interakcije nisu testirani. [Polufinale](../screenshots/green-ui-step9/green-remaining-tourney-semi.png) / [finale](../screenshots/green-ui-step9/green-remaining-tourney-final.png). |
| PF-01/03/04 | Na privremeno kraćem ekranu (1080 × 2100, 560 dpi) sa Android navigacijom na tri dugmeta, vertikalni skrol otkriva listu prijatelja iznad sistemskih dugmadi. Vodoravni swipe dovodi drugu, offline karticu u pun prikaz; dugo ime, četiri statistike, akcija i status su unutar nje. | Kratak viewport zahteva dozvoljeni rezervni vertikalni skrol; stvarni poziv i promena statusa nisu pokrenuti. [Dno](../screenshots/green-ui-step9/green-remaining-invite-short-bottom.png) / [offline kartica](../screenshots/green-ui-step9/green-remaining-invite-short-offline.png). |
| KL-01/02 | U istom kratkom režimu ligaški QA sažetak i pager ostaju iznad navigacije; dve kolone su čitljive. | Ovo je ogledalo rasporeda, ne serverski popunjena liga; „SVA VREMENA” se u toj širini lomi u više redova, ali ostaje u kartici. [Snimak](../screenshots/green-ui-step9/green-remaining-league-short-threebutton.png). |

Posle pregleda veličina emulatora je vraćena na fizičkih 1440 × 3120, a navigacija na prethodni gestualni režim (`navigation_mode = 2`). Produkcioni online tok i drugi fizički telefon ostaju otvorene provere, bez tvrdnje da je korak 9 kompletan.

## Spremnost za stvarni online QA

Provereni su lokalni konfiguracioni ključevi (bez čitanja ili objavljivanja njihovih vrednosti) i postojeća dokumentacija. Pronađen je `MONGO_URI`, ali nije označen kao test/staging; nisu pronađeni namenski test nalozi ni odvojena test konfiguracija. Nije otvarana veza sa bazom niti pokrenut matchmaking, poziv, upis rezultata ili nagrada.

Pre stvarnog online prolaza potrebno je potvrditi izolovanu testnu bazu/server, dva test naloga koji ne pripadaju pravim igračima i mogućnost bezbednog resetovanja njihovih podataka. Tek tada proveriti poziv prijatelja (online/offline i duga imena), random sparivanje i reconnect, turnirske faze, rang/paginaciju statistike, završetak Dnevnog izazova sa obe vrste nagrade i iznos dukata pre/posle. Svaki slučaj treba snimiti u Android WebView-u, ne samo u QA ogledalu.

Dodatna lokalna provera: u dostupnoj putanji i uobičajenim instalacionim lokacijama nema `mongod`, `mongosh`, Docker/Podman izvršnog fajla ili servisa, niti projektne `mongodb-memory-server` zavisnosti. Zato se iz trenutnog radnog okruženja ne može automatski podići izolovana lokalna baza. Postojeći Firebase Admin token i `MONGO_URI` ne smeju se tretirati kao testni samo zato što su lokalno konfigurisani.

Bez povezivanja na bazu ponovo su prošle lokalne provere: pravila igre, trofeji, sinhronizacija profila, rezultati mečeva, Kvartalna liga, online reconnect, H2H ledger i Green asset coverage. `check-js.js`, `check-theme-performance.js`, sintaksa QA ogledala i `git diff --check` takođe prolaze. To zatvara kodnu regresiju za ove provere, ali ne zamenjuje stvarni online QA.

## Dopunski EN / 130% font prolaz bez baze

QA ogledalo sada za `?lang=en` učitava stvarni rečnik iz `www/languages.js`, umesto ručno prepisanih engleskih poruka. Na postojećem emulatoru je privremeno korišćeno 1080 × 2100 fizičkih piksela, 560 dpi i Android font 130%; provera je rađena u Chrome-u preko lokalnog QA servera, **ne** u novom APK-u ili serverski popunjenoj sobi.

| Stanje | Vizuelni nalaz |
| --- | --- |
| Dnevni izazov | „DOUBLE” sa jednim dukatom staje u dugme. Obična i duplirana završna EN poruka staju u modal, bez reči „ducats” pored ikone. [Dugme](../screenshots/green-ui-step9/green-en-daily-double-130-clean.png), [obična](../screenshots/green-ui-step9/green-en-daily-final-130-final.png), [duplirana](../screenshots/green-ui-step9/green-en-daily-final-double-130-clean.png). |
| Top lista | Prazni globalni i lokalni prikaz koriste isti motiv i čitljiv „No results yet.”; tabovi i X staju u panel. [Globalna](../screenshots/green-ui-step9/green-en-leaderboard-empty-global-130-final.png) / [lokalna](../screenshots/green-ui-step9/green-en-leaderboard-empty-local-130-final.png). |
| Turnir | Finale sa dugim imenom, oba indeksa i rezultatom ostaje unutar kartice. [Snimak](../screenshots/green-ui-step9/green-en-tournament-final-130-clean.png). |
| Statistika | Power Index lični red van vrha ostaje u listi. U Vatrenom nizu je uočen slabo čitljiv sivi „Streak broken”; Green-specifični CSS ga je prebacio na svetao tekst. [Posle](../screenshots/green-ui-step9/green-en-streak-130-contrast-fixed.png). |
| Pozovi prijatelja | Uočen je mešoviti jezik: srpske oznake POB/NER/POR na EN ekranu. Statičke Green kartice i dinamičke kartice prijatelja sada koriste W/D/L; druge teme čuvaju prethodne oznake. Kratak ekran može da se pomeri vertikalno, a prijatelji vodoravno. [Gornje kartice](../screenshots/green-ui-step9/green-en-invite-130-localized.png) / [kartica prijatelja](../screenshots/green-ui-step9/green-en-invite-card-130-localized.png). |

Prošli su `check-js.js`, `check-theme-performance.js` (uključujući povratak oznaka pri promeni na drugu temu), sintaksa QA ogledala i `git diff --check`. Emulator je vraćen na font 100%, fizičkih 1440 × 3120 i gestualnu navigaciju (`navigation_mode = 2`), pa zatvoren; lokalni QA server je zaustavljen. Ovo je dopunska provera navedenih stanja, ne tvrdnja da su svi EN ekrani i stvarni online tok završeni.

Posle prekida rada ponovljen je kompletan lokalni skup od deset direktnih `node scripts/check-*.js` provera iz `package.json`: sintaksa, pravila igre, trofeji, profil, rezultati, liga, reconnect, H2H ledger, theme performance i Green coverage. Svih deset je završilo uspešno. Nije rađen build, commit niti test protiv konfigurisane baze.

## Izolovana provera Green toast poruka

QA ogledalo sada učitava samo definiciju postojećeg `showNotification` prikazivača iz `www/onlinenumber.js`; ostatak online modula i aplikacioni bootstrap se ne izvršavaju. Za toast stanja ne kopira glavni meni, da pregled ostane lagan. Poziv, kupovina i greška nisu stvarno izazvani u aplikaciji.

Na Android emulatoru privremeno podešenom na 1080 × 2100 i sistemski font 130% pregledane su poruke uspeha, greške povezivanja, poslatog poziva i nedovoljnog broja dukata, na srpskom i engleskom. Na svim snimcima naslov i telo su svetli i čitljivi na tamnozelenoj kartici; Green ikone poziva i dukata su prisutne i ne izlaze iz okvira. Zaseban sintetički stres-test duge pozivnice sa dugim imenom se prelama unutar kartice u oba jezika. Ovo potvrđuje prikaz navedenih primera u Android Chrome-u, ne ceo skup mogućih poruka niti ponašanje u produkcionom WebView-u.

Snimci: [SR uspeh](../screenshots/green-ui-step9/green-toast-sr-success-130.png), [greška](../screenshots/green-ui-step9/green-sr-toast-error-130.png), [poziv](../screenshots/green-ui-step9/green-sr-toast-invite-130.png), [nedovoljno dukata](../screenshots/green-ui-step9/green-sr-toast-insufficient-130.png), [duga pozivnica](../screenshots/green-ui-step9/green-sr-toast-long-invite-130.png); [EN uspeh](../screenshots/green-ui-step9/green-en-toast-success-130.png), [greška](../screenshots/green-ui-step9/green-en-toast-error-130.png), [poziv](../screenshots/green-ui-step9/green-en-toast-invite-130.png), [nedovoljno dukata](../screenshots/green-ui-step9/green-en-toast-insufficient-130.png), [duga pozivnica](../screenshots/green-ui-step9/green-en-toast-long-invite-130.png).

Prošli su sintaksna provera QA ogledala, `check-js.js`, `check-theme-performance.js` i `git diff --check`. Emulator je vraćen na fizičkih 1440 × 3120, font 100% i gestualnu navigaciju, zatim zatvoren; statički QA server je zaustavljen. U ovom dopunskom prolazu nisu menjani produkcioni JavaScript/CSS, građen APK niti pravljen commit.

## Izolovane potvrde, greške i zaključani trofej

U QA ogledalo su povezana izdvojena stvarna prikazivača `ModalManager` i `ShopManager` iz `www/managers.js`. Korišćeni su sintetički podaci: potvrda kupovine plaćenog skina, duga greška i jedan neosvojeni trofej. Nisu izvršeni konstruktor aplikacije, kupovina, upis u skladište, poziv serveru ili promena salda.

Na Android Chrome-u, 1080 × 2100 i fontu 130%, potvrda kupovine i duga greška u oba jezika imaju čitljiv tekst i dugmad koja ostaju u okviru: [SR potvrda](../screenshots/green-ui-step9/green-sr-modal-confirm-buy-verified-130.png), [EN potvrda](../screenshots/green-ui-step9/green-en-modal-confirm-buy-verified-130.png), [SR greška](../screenshots/green-ui-step9/green-sr-modal-error-long-verified-130.png), [EN greška](../screenshots/green-ui-step9/green-en-modal-error-long-verified-130.png). I stvarni modal za nedovoljan broj dukata je prikazan izolovano: [SR](../screenshots/green-ui-step9/green-sr-insufficient-verified-130.png), [EN](../screenshots/green-ui-step9/green-en-insufficient-verified-130.png).

Zaključani trofej je otkrio konkretan nedostatak: zajedničko `.card.locked` pravilo spuštalo je neprozirnost cele kartice i primenjivalo sivu skalu, pa je opis postao preslab. Samo u Green Riznici zaključano stanje sada koristi tamnozelenu površinu, svetao tekst i diskretnije obeležen motiv; ostale teme nisu menjane. [Pre](../screenshots/green-ui-step9/green-sr-treasury-locked-130.png) / [posle SR](../screenshots/green-ui-step9/green-sr-treasury-locked-fixed-130.png) / [posle EN](../screenshots/green-ui-step9/green-en-treasury-locked-verified-130.png). Dodata je statička regresiona provera Green selektora i kontrasta teksta na svetlijem kraju zaključane površine.

Ovo potvrđuje samo navedene vizuelne primere u izolovanom Chrome prikazu. Svi modali, funkcionalno zaključavanje, produkcioni Android WebView i online tokovi i dalje nisu potvrđeni.

## Online igrači — učitavanje, prazno, greška i nedostupne akcije

QA ogledalo sada izdvaja stvarnu funkciju `openOnlinePlayersModal` i njen prikazivač iz `www/onlinenumber.js`. Za listu koristi memorijski socket koji nikada ne izlazi na mrežu; periodični tajmeri i akcioni klikovi su isključeni. Prazna lista, greška veze i dva reda igrača (dugo ime, zauzet/slobodan, dostupne/nedostupne akcije) imaju sintetičke podatke. Stvarni server, nalog, poziv, prijateljstvo i meč nisu korišćeni.

Na Android Chrome-u pri 1080 × 2100 i fontu 130% potvrđeno je da su [učitavanje](../screenshots/green-ui-step9/green-online-loading-android-130.png), [prazna lista](../screenshots/green-ui-step9/green-online-empty-android-130-clean.png) i [greška veze](../screenshots/green-ui-step9/green-online-error-android-130.png) centrirani i čitljivi; [redovi i zaključane akcije](../screenshots/green-ui-step9/green-online-disabled-before-130.png) ostaju unutar kartica. U EN varijanti [greška](../screenshots/green-ui-step9/green-online-error-en-android-130-fixed.png) i [redovi](../screenshots/green-ui-step9/green-online-disabled-en-android-130.png) takođe staju u panel. Pri prvom EN snimku pretraga je ostala na srpskom zbog propusta u QA kopiranju atributa, ne u aplikacionom prevodiocu; ogledalo sada primenjuje i `data-lang-placeholder`, `data-lang-title` i `data-lang-aria`, pa ponovljeni snimak pokazuje engleski placeholder.

U ovom prolazu nije utvrđen novi produkcioni CSS/JS nedostatak; menjan je samo izolovani QA prikaz. Ovo ne potvrđuje stvarno učitavanje liste sa servera, promenu statusa uživo ili funkcionalnost dugmadi.

Sintaksa QA ogledala, `check-js.js`, `check-theme-performance.js` i `git diff --check` prolaze. Emulator je vraćen na 1440 × 3120, font 100% i gestualnu navigaciju, potom zatvoren; statički QA server je zaustavljen. Nije rađen build ni commit.

## Riznica — skinovi, efekti i teme

Izolovani `ShopManager.render` prikazuje stvarne kataloge i Green CSS uz sintetičko vlasništvo i saldo. Provera je rađena u Android Chrome-u na privremenih 1080 × 2100, pri fontu 130%. Ogledalo ne izvršava kupovinu, aktiviranje, reklamu, aplikacioni bootstrap ni upis salda.

Uočena je dvostruka kvačica u statusu „Kupljeno” (Green glinena ikona plus znak iz zajedničkog prevoda). Za Green je uklonjen samo tekstualni znak; druge teme zadržavaju postojeći prevod. Naslovi grupa skinova, efekata i tema u Green temi sada koriste postojeće Green glinene motive umesto početnih emoji oznaka. Kartica teme „Zelena” koristi svoj postojeći Green motiv umesto generičke kockice i opis koji odgovara sadašnjoj 3D Soft Clay temi. Novi motivi kategorija podešeni su na 24 px kako srpski naslov „ZELENI SOFT CLAY PACK” ostaje u jednom redu; motiv na kartici je 48 px.

Na snimcima [skinova](../screenshots/green-ui-step9/green-treasury-skin-sr-final2-130.png), [tema SR](../screenshots/green-ui-step9/green-treasury-theme-sr-final2-130.png), [tema EN](../screenshots/green-ui-step9/green-treasury-theme-en-130.png) i [efekata EN](../screenshots/green-ui-step9/green-treasury-effect-en-130.png) kartice, cene i statusi ostaju u okviru. Duži EN naslov kategorije efekata se lomi u dva reda, ali nije odsečen. U QA prevodu je ispravljeno prikazivanje markera `{DUKAT_ICON}`; produkcioni prevodilac ga je već zamenjivao ikonom, pa to nije bila greška aplikacije.

Otvoreno posle tog uzorka: nisu bile pregledane sve stavke; zaključani efekat nije bio potvrđen u celosti na snimku. Prikaz efekta „Konfete” koristio je zajednički emoji u preview-u, a kartice drugih tema zadržavaju svoje kataloške simbole. Stvarni tok kupovine/aktiviranja i produkcioni WebView nisu potvrđeni.

Svih deset `scripts/check-*.js` provera iz projektnog `test` skupa prošlo je direktnim Node pokretanjem; sintaksa QA ogledala i `git diff --check` takođe prolaze. `npm test` prečica nije mogla da krene zbog nedostajućeg lokalnog `npm-cli.js`, ne zbog testnih neuspeha.

## Dopuna: ceo katalog i stanja kartica Riznice

Izolovani QA sada može da prikaže ceo postojeći katalog (`?catalog=all`), a [read-only CDP provera](../qa/audit-treasury-cdp.js) na Android Chrome-u je izmerila horizontalne granice svih kartica i zaglavlja pri 1080 × 2100 i fontu 130%: 42 skina, 16 efekata i 10 tema, u SR i EN varijanti. Obuhvaćeni su primeri kupljeno/aktivno, plaćeno, zaključano uslovom i otključavanje reklamom; posebno je proverena sintetička snižena cena Zlatne kiše (`--discount`). Po završnim merenjima nijedna kartica niti zaglavlje ne prelazi svoju horizontalnu granicu. Ovo je geometrijski audit, ne ručna vizuelna potvrda svake od 68 pojedinačnih stavki.

Audit je otkrio preliv srpskog teksta za reklamno otključavanje na kartici „Pustinjsko Staklo”. Green prikaz sada postavlja postojeću Green ikonu iznad lokalizovanog teksta, pa oba staju u karticu; druge teme zadržavaju prethodni zajednički raspored. [Snimak posle ispravke](../screenshots/green-ui-step9/green-treasury-desert-ad-final-130.png). Zaključani „Gromovnik” sa uslovom „Sveti Ilija” je [vizuelno potvrđen](../screenshots/green-ui-step9/green-treasury-thunder-locked-130.png).

Besplatne „Konfete” sada u Green Riznici imaju tamnozelenu površinu, postojeći glineni Green motiv i diskretne konfete u paleti teme umesto zajedničkog 🎉; trajanje se u Green efekt karticama prikazuje bez starog emoji sata. [Snimak](../screenshots/green-ui-step9/green-treasury-confetti-final-130.png). Ostali efekti čuvaju svoje zajedničke preview animacije; neki i dalje sadrže emoji koji predstavljaju konkretan efekat. To nije dokaz potpune izolacije svih FX prikaza. Kupovina, gledanje reklame, aktiviranje efekta, saldo i produkcioni WebView nisu testirani.

## Dopuna: šest preostalih Green FX preview motiva

Šest zajedničkih emoji preview-a u karticama efekata (Svadba, Gromovnik, Vatromet, Magični Mehurići, Svemirska prašina i Zmajeva vatra) zamenjeno je sa šest zasebnih transparentnih 3D Soft Clay PNG motiva. Glavni izvori su 1536 × 1024, a mobilne verzije 384 × 256. Zajedno zauzimaju 476.393 bajta i učitavaju se samo uz Riznicu; početni Green paket ostao je 17 PNG / 4,56 MB. Manifest, SHA-256 i veza sa karticom zaključani su u automatskoj proveri. Izvorni efekti tokom igre nisu menjani.

Android Chrome QA, 1080 × 2100 i font 130%: sintetički puni katalog od 42 skina, 16 efekata i 10 tema prolazi proveru horizontalnih granica i na srpskom i na engleskom. Izmereno je da svih šest novih preview-a koristi očekivani PNG i da stari dekorativni `::after` sloj više nije prisutan. [Svadba i Gromovnik](../screenshots/green-ui-step9/green-treasury-wedding-clay-cdp.png) i [Mehurići](../screenshots/green-ui-step9/green-treasury-bubbles-clay-cdp.png) pregledani su i kao slike. Kod prvog snimka Svadbe je otkriven stari zlatni CSS ram; uklonjen je samo u Green temi i ponovo proveren. Android sistem je pri običnom `screencap` prikazao Chrome ANR dijalog, pa su završni dokazni snimci uzeti direktno iz Chrome stranice preko CDP-a. Oni potvrđuju sadržaj stranice, ne odsustvo sistemskog dijaloga niti performanse produkcionog WebView-a.

Svih deset lokalnih testova iz `package.json` prošlo je direktnim Node pozivima. Kupovina, aktiviranje, gledanje reklame, trošenje dukata i stvarni online tok nisu pokretani. Nije rađen APK build, commit ni objavljivanje.

## Dopuna: Green preview Kraljevskog Yamba

Kartica „Kraljevski Yamb” je, za razliku od šest prethodno zamenjenih efekata, još uvek u Green temi koristila generički `Logo_green.png`, zaseban sitan natpis i crveno-zlatne zrake. Napravljen je sedmi, transparentan 3D Soft Clay motiv — krunisana šumskozelena kockica sa pravilnim rasporedom pet tačkica. Green kartica sada koristi samo taj PNG na istoj tamnozelenoj podlozi kao ostali glineni efekti; zajednički `config.js` i izgled drugih tema nisu menjani. Pored starog logotipa, iz Green DOM-a uklonjeni su i dekorativni child elementi Svemirske prašine i Zmajeve vatre koji su mogli da prekriju njihove nove PNG-ove.

[Snimak u Android Chrome-u](../screenshots/green-ui-step9/green-treasury-royal-yamb-clay-cdp.png) prikazuje novu ikonu uz Zmajevu vatru na 1080 × 2100 i fontu 130%. CDP je u punom sintetičkom katalogu potvrdio sedam Green PNG preview-a bez starih `::after` slojeva i child elemenata, te bez horizontalnog prelivanja 42 skina, 16 efekata i 10 tema u oba jezika. Paket sedam preview-a je vezan za Riznicu, ne za početni ekran. Ovo ne potvrđuje živu animaciju „Kraljevskog Yamba” u igri, kupovinu ni produkcioni WebView.

Preostalih sedam efekata sa zajedničkim CSS preview-om — Magični svici, Ledeno doba, Crna rupa, Supernova, Neon puls, Svetleći dronovi i UFO Abdukcija — nisu obuhvaćeni ovom zamenom. Za njih je potreban zaseban vizuelni audit pre odluke da li je potreban novi asset ili samo Green stil.

## Dopuna: preostalih sedam Green FX preview-a

Prethodno otvorenih sedam preview-a sada imaju zasebne transparentne 3D Soft Clay motive. Izvorni PNG-ovi su 1536 × 1024, mobilni 384 × 256; novih sedam mobilnih datoteka zajedno zauzima 611.893 bajta. Manifest i Green registar sada obuhvataju svih 14 PNG preview-a. U Green karticama uklonjeni su stari CSS/HTML dekorativni slojevi; druge teme nisu menjane. Novi motivi se učitavaju uz Riznicu, pa početni paket ostaje 17 PNG / 4,56 MB.

U Android Chrome QA pri 1080 × 2100 i fontu 130% proverene su SR i EN varijante punog sintetičkog kataloga (42 skina, 16 efekata, 10 tema): kartice ne prelaze horizontalne granice, svih 14 preview-a pokazuje očekivani PNG bez starog `::after` sloja i child dekoracije. Vizuelno su pregledani [Magični svici](../screenshots/green-ui-step9/green-treasury-fireflies-clay-cdp.png), [Ledeno doba](../screenshots/green-ui-step9/green-treasury-ice-age-clay-cdp.png), [Crna rupa i Supernova](../screenshots/green-ui-step9/green-treasury-black-hole-clay-cdp.png), [Svetleći dronovi](../screenshots/green-ui-step9/green-treasury-drones-clay-cdp.png) i [UFO Abdukcija](../screenshots/green-ui-step9/green-treasury-ufo-abduction-clay-cdp.png); Neon puls je vidljiv uz Ledeno doba. UFO je u prvom snimku prikazan nepotpuno zbog snimanja pre dekodiranja pozadinske slike i nasledne providnosti; dekodiranje je sačekano, Green preview je postavljen na punu neprozirnost i završni snimak je ponovo pregledan.

Ovo završava izolaciju motiva u karticama Green Riznice, ali ne potvrđuje žive animacije efekata u partiji, kupovinu/aktiviranje, saldo, reklame, produkcioni WebView niti učinak na stvarnom telefonu. Nije rađen APK build, commit ni objavljivanje.

## Hitna dopuna TU-01: Turnir — navigacija i visina kostura

Green kostur sada koristi punu visinu prostora do donjih kontrola: uklonjen je suvišan površinski okvir unutrašnje kartice, a četiri četvrtfinalna meča raspoređena su u četiri ravnomerna reda bez unutrašnjeg skrola na testiranom mobilnom profilu. Polufinalna dva meča stoje u dve uravnotežene zone; finale je u sredini iste površine. Imena, avatari, indeksi moći i rezultati prilagođeni su sva tri kola istom tipografijom. Dodati su horizontalni swipe u oba smera i stvarna dugmad-tačkice sa zonom dodira od 44 px, aktivnim stanjem i pristupačnim nazivima.

Na izolovanom Android Chrome prikazu 1080 × 2100, 130% font: [četvrtfinale](../screenshots/green-ui-step9/green-tournament-quarter-swipe-layout-cdp.png), [polufinale](../screenshots/green-ui-step9/green-tournament-semi-swipe-layout-cdp.png), [finale](../screenshots/green-ui-step9/green-tournament-final-swipe-layout-cdp.png). CDP audit je potvrdio 4/2/1 vidljiva meča bez unutrašnjeg skrola ili odsečenog sadržaja, bez horizontalnog prelivanja, kao i dodir tačkice i prevlačenje levo/desno. Ponovljeno je na višem mobilnom viewportu (360 × 780 CSS px), gde se tekst i avatari povećavaju, a četiri meča i dalje staju. Na izuzetno kratkom viewportu (360 × 620 CSS px) postoji namerni unutrašnji skrol četvrtfinala kao zaštita od odsecanja podataka; navigacija ostaje dostupna. To je sintetički završen bracket bez naloga i upisa; zakazani/aktivni mečevi i produkcioni WebView ostaju za zasebnu proveru. Build i commit nisu rađeni.
