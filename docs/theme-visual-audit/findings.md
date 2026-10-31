# Vizuelni audit PNG assetsa

## R38 — lokalna v6.42, merenje faze učitavanja

[Dijagnostika i granice](loading-diagnostics-2026-10-30/README.md). QA-only javni PNG timing load/decode/timeout/ready; bez promene rokova/retry/LRU ili PNG. Kontrolisani kvarovi i stvarni lokalni PNG10tema×28prolaze; retention i odlaganje skrivenih kontrola/soba ostaju ispravni. Produkcioni recorder isključen. Nema commita/deploya ili novih native radnji; prviEaster i uzrokANR-a ostaju otvoreni. R38 je dijagnostička priprema, nije potvrđena popravka.

## R37 posle objave v6.41/429cec22 — ciljana potvrda

[23 Android kadra i granice dokaza](postdeploy641-2026-10-30/index.html). Oba javna servisa odgovaraju aktuelnom sadržaju šest proverenih JS fajlova. Tri izmenjene sobe imaju odgovarajuće PNG uGreen/Neon: Top lista oba taba; Online igrači header/search/sopstveni red; Pozovi prijatelja dinamičke kartice i deljeniPowerIndex/friend/search/send. To nisu svi native prikazi10tema ili dokaz nultih skrivenih zahteva naAndroidu.

Neon/Moon prvi izbor i povratakNeon/Green uspeli. **PrviEaster izbor i dalje neuspešan**, ponovljeni uspeo. ActivityCOLD13476msnije app-ready vreme ili validno poređenje sa6.40. Nema novog potvrđenog uzrokaANR-a. Hotseat ponudio unos za novu partiju, otkazano; skinovi u aktivnoj igri nisu provereni. Oba emulatora u radu, drugiGreen meni, prikazani saldo12168isti; bez nove partije, oglasa, nagradnih dugmadi ili DB pristupa. Nema novih runtime izmena; istorijske „čeka deploy” napomene niže opisuju ranije preseke.

## Posle v6.40 i lokalna R37/v6.41 — 30.10.2026.

[14 Android kadrova, javne verzije i lokalno poređenje](postdeploy640-2026-10-30/index.html). Oba servisa na d38aa6aa/v6.40. Povratak na Green posle Neon/Easter/Light/Moon i završni meni kompletni. **Prvi Neon/Easter/Moon izbori nisu pouzdani**, ponovljeni su uspeli; jedan Neon retry neodređen pri zakašnjelim native komandama. Activity COLD19194ms nije app-ready mera. Uzrok sporog starta/ranijeg ANR-a ostaje otvoren.56 javnih PNG HEAD putanja sve200. Nema nove partije, reklame, nagradnog dugmeta ili DB pristupa; prvi emulator vraćen iz pauze, drugiGreen meni.

R37 lokalno odlaže automatski rad tri skrivena kontrolera: Top lista, Online igrači, Pozovi prijatelja. Stvarni kontroleri/PNG u izolovanom browseru:14zahteva/719184B pri startu→0,126zahteva kroz deset skrivenih tema→0.40vidljivih slučajeva10tema, deljeno oko/prazna lista u igri, inline otvaranje, dinamički PowerIndex i eksplicitna priprema prolaze. Nema promene PNG/izgleda/dimenzija. Ovo nije ukupni saobraćaj aplikacije ili dokaz uzroka Android zastoja. **Lokalna v6.41 čeka korisnikov commit/deploy i Android potvrdu.** Istorijski „čeka deploy” R36 odeljci niže opisuju prethodni presek.

## R36 — zastarela priprema i izbačeni nezavršeni zahtevi, lokalna v6.40

Reprodukovano u v6.39/7985cb39: završena themeWarmups priprema prijavljuje spremno i kada je LRU izbacio njene dekodirane slike. U lokalnom browseru sa stvarnim PNG, posle deset tema Green ima18nedostajućih slika uz spremnu staru pripremu. Posle ispravke ponovo priprema svih18i nedostaje0; odmah ponovljen izbor nema novu Image pripremu. Drugi kontrolisani slučaj: LRU izbacuje nezavršen URL, kasniji poziv stvara2Imagezahteva; sada ostaje1. Dodati proveru preklopljenih izvora i zaštitu da neuspeh stare pripreme ne izbriše novu. Završeni keš i dalje64/12Mpiksela.

[Mere pre/posle i ograničenja](preload-retention-2026-10-30/index.html). Svi PNG/metode stvarni, navigacija i pritisak na keš lokalni. Bez naloga, igre, oglasa, emulator unosa ili runtime izmena izgleda. Javni QA uzorak potvrđuje Brotli za tekst i dugotrajni PNG keš; ne dokazuje uzrok ANR-a. Čeka korisnikov commit/deploy i Android potvrdu. Nema tvrdnje da je hladni start ili raniji ANR rešen.

## R35 posle deploya v6.39/7985cb39 — ciljana potvrda

Objavljena sva tri izmenjena klijentska fajla na oba servisa. Na QA Androidu Settings4teme i prazan odobreni Hotseat panel2teme kompletni; jedan izbor teme i jedan univerzalni skin primenjeni. Bez bacanja/upisa/završetka/oglasa/nagrade, identični QA profili i rezultati pre/posle. [Snimci i precizna granica dokaza](postdeploy639-2026-10-30/index.html).

R35 primena ima ciljanu native potvrdu; **performanse/ANR ostaju otvoreni**. am-start-W je istekao, prvo samo podloga pa meni, pojedini kadrovi kasne ili su nepotpuni. Cache nije brisan, nema app-ready merenja. Nema novog potvrđenog ANR-a u pregledanim stanjima; prethodni uzrok nije utvrđen. Prvi emulator privremeno pauziran i potom vraćen u rad, oba running. Formulacije „lokalno/čeka deploy” niže opisuju raniji presek.

## R35 — skriveni Settings/header PNG pri pokretanju, lokalna v6.39

Dva kontrolera od sada automatski pripremaju slike samo dok je njihov prikaz aktivan; eksplicitna priprema ostaje dostupna. Trenutni panel priprema se tokom citata/čekanja. U izolovanom browser poređenju stvarnih kontrolera i PNG:17zahteva/1.172.537B pri skrivenom meniju→0; otvaranje oba prikaza10/10tema prolazi. Zakašnjeli stari header ne prepisuje novu temu Podešavanja. Nema promene izgleda/dimenzija. [Mere, regresije i granice](startup-loading-2026-10-30.md). Čeka korisnikov commit/deploy i Android potvrdu.

ANR ostaje otvoren: sistemski sažetak navodi FocusEvent timeout5009ms, ali ne utvrđuje uzrok. Zbirna frame statistika emulatora veoma je loša i nije izolovano merenje starta. Native pregled u prethodnom prolazu ostaje na objavljenoj v6.38; bez nove partije ili nagrade.

## Posle deploya v6.38 — 30.10.2026.

Oba javna servisa odgovaraju v6.38/41d6598f; game.js isti je posle CRLF/LF normalizacije. Na izdvojenom QA Androidu svih deset tema primenjeno jednim izborom u Podešavanjima; Zelena vraćena. R34 ima ovu native potvrdu, bez instrumentacije unutrašnjeg retry ogranka ili merenja brzine. R33 kod je objavljen; native nulta kazna još nije ponovljena. Ranije formulacije „lokalno/čeka deploy” niže opisuju vreme nastanka nalaza. [Dokaz i granice](postdeploy-2026-10-30/index.html).

**Otvoren nalaz pokretanja:** drugi emulator prijavio je da QA aplikacija ne odgovara. Opcija Sačekaj oporavila je glavni meni; uzrok nije utvrđen. Cache nije brisan i ne tvrdi se da je hladni start popravljen. Read-only poređenje potvrđuje nepromenjene QA profile, rezultate i nagrade tokom ovog pregleda. Nema nove partije ili oglasa.

## Važna dopuna pri ponovnom pokretanju — 30.10.2026.

Nastavak30.10: oba emulatora su bila ugašena; ponovo pokrenuta bez brisanja podataka, QA aplikacije otvorene i oba glavna menija pregledana. Postojeći recoverPendingGameRewards pri autentikaciji automatski je preuzeo439/675 osnovnih dukata iz prethodne sesije (runtimeId se promenio), iako korisnik nije odobrio preuzimanje. Nije bilo klika na nagradno dugme, reklame, dupliranja, revanša ili nove partije. Server potvrđuje rewardClaimedCount=2, salda2939/12168; Daily ostaje nepreuzet. Prethodni zapisi claim=0 opisuju stanje pre ponovnog pokretanja. Produkcija nije korišćena; salda nisu ručno menjana.

Završni panel posle promene rezolucije ima odvojeni otvoreni nalaz: jedan kasniji kadar drugog uređaja je pomeren/odsečen. Uzrok nije utvrđen. Oba današnja glavna menija pravilno su prikazana; završni panel nije ponovo otvaran novom igrom.

Pregled statičkih PNG u većoj i 28px veličini na površini teme; resolveri, kanonski potrošači, dimenzije i alpha uzorci provereni. Delimični pregled na emulatoru je u zasebnoj evidenciji emulator-2026-10-25/index.html; nije potvrđen svaki dinamički prikaz niti fizički Samsung S25.

| Tema | Aktivne putanje | Prihvatljivo | Dorada | Zamena |
|---|---:|---:|---:|---:|
| Zelena | 201 | 201 | 0 | 0 |
| Svetlo Zlato | 194 | 194 | 0 | 0 |
| Trula Višnja | 194 | 194 | 0 | 0 |
| Plavi Okean | 194 | 194 | 0 | 0 |
| Neon Cyber | 195 | 195 | 0 | 0 |
| Kraljevski Ametist | 194 | 194 | 0 | 0 |
| Vaskršnja | 196 | 196 | 0 | 0 |
| Pustinjsko Staklo | 195 | 195 | 0 | 0 |
| Mesečev Sjaj | 194 | 194 | 0 | 0 |
| Severna Maglina | 195 | 195 | 0 | 0 |
| Univerzalni skinovi i materijali | 438 | 438 | 0 | 0 |

## Primena dorada

121/121 novih PNG-ova je vizuelno provereno i povezano. 30 starih ilustracija video-nagrade vodi na postojeći kanonski video PNG odgovarajuće teme. Sve planirane PNG zamene ovog prolaza pregledane su i povezane.

## Ispravljene zvezde

35 zasebnih generisanih mastera i 42 produkciona PNG-a za sedam tema. Zelena, Svetlo zlato i Trula višnja zadržavaju postojeće zvezde. Sve prethodne canvas dimenzije su sačuvane.

## Aktivni nalazi

### R34 — prvi ručni izbor teme se prekida,30.10.2026.

R34, lokalno game.jsv6.38: na QA v6.36 prvi izbor Green→Neon ostavio je Green, ponovljeni je uspeo. Tačan spor PNG/HTTP zahtev nije identifikovan. Ručni izbor iz Podešavanja sada ima jedan automatski retry preko postojećeg image/decode cachea; gate čeka oba vidljiva paketa i retry. Konačan neuspeh čuva prethodnu kompletnu temu. Noviji izbor, offline i promena naloga zaštićeni. Nije dokaz ubrzanog prvog preuzimanja ili popravke na Androidu pre deploya. [Četiri native snimka i ograničenja](theme-switch-2026-10-30/index.html). Lokalne regresije proveravaju spor početak i uspešan retry, konačan neuspeh bez promene, offline bez dodatnog pokušaja, noviji izbor i promenu naloga. Poseban gate test sprečava prerano skrivanje posle samog menu paketa. Bez novog PNG-a ili promene DNK/palete/dimenzija.


### R33 — nulta kazna u dukatima zamenjena PI poenima, QA29.10.2026.

Na objavljenomQA v6.36 tehnički poraz sa `coinPenalty=0`, `penalty=20` prikazivao je u kartici sa dukatom20, dok tekst ispravno kaže−0dukata i−20PowerIndex. Handler je slao `coinPenalty || penalty`, čime su dve različite jedinice pomešane samo u prikazu. Lokalno sada šalje `coinPenalty` i čuva nulu; serverova ekonomija/statistika nisu menjane. `game.js?v=6.37`, proširena regresija16slučajeva (obe uloge×sr/en×server/local×nulti/nenulti dukati). Nije još objavljeno ili potvrđeno na uređaju. Ranija R32 ispravna perspektiva poruke sada je potvrđena na stvarnom QA tehničkom završetku.

### R32 — pogrešna perspektiva poruke tehničkog poraza, 29.10.2026.

Stvarni kontrolisani Random par Andrija/Sara završio se istekom poteza pre potvrđenog upisa. Server emituje isti pobednički `message` obema stranama; klijent ga je prikazivao i uz PORAZ. Lokalno `game_over_timeout` sada bira postojeće lokalizovane poruke za pobednika/poraženog. Nisu menjani nagrade, kazne, statistika ili trajanje poteza. Osam izolovanih slučajeva stvarnog handlera prolazi, uključujući srpski/engleski i izbegavanje dvostrukog lokalnog obračuna već potvrđenog serverskog rezultata. Čeka deploy i novu Android potvrdu.

Dopuna posle korisnikovog deploya `910b816c`: R32 je potvrđen na stvarnom QA tehničkom završetku v6.36. Poraženi vidi sopstvenu poruku o isteku poteza, pobednik poruku o tehničkoj pobedi. Otvorena naknadna ispravka je R33 iznad; njome se ne menja perspektiva ili serverski obračun.

[Dokazi i posledice testa](two-emulators-2026-10-29/index.html): server je automatski promenio stvarna salda (Sara −1758, Andrija +1775) i statistiku, bez pritiska na preuzimanje. Nije urađeno poništavanje. To je neuspešan test običnog toka, ne dokaz pravilnog normalnog završetka/revanša/dupliranja. Dalji transakcioni testovi zahtevaju aktuelni izolovani QA.

### R24 / R25 — Solo završni tok i standardizacija, 29.10.2026.

R24 pomera `localResultAccepted` u potreban opseg: ranije je `ReferenceError` preskakao slanje/potvrdu lokalnog rezultata. Nova regresija pokriva Solo i Hotseat uz accepted/rejected/pending odgovor, bez stvarnog naloga ili nagrade. R25 usklađuje Solo završne mere/fontove/PNG dimenzije i potvrdu izlaska sa Green; Green akcijski gradijent koristi čitljivije postojeće tonove. [Dokazi i granice](emulator-solo-2026-10-29/index.html): aktivna Android partija/quick-menu svih10tema,400izolovanih lokalnih slučajeva. Nove dorade još nisu objavljene, a pravi završetak/isplata nisu testirani na nalogu.

### R22 / R23 — Dnevni izazov i priprema X, 29.10.2026.

Lokalno ispravljeni Daily fontovi/mere obaveštenja i kontrast tematskog dugmeta, plus Green akcijski gradijenti koriste tamnije postojeće tonove. Priprema X sada učitava isti URL/cache verziju kao prikazani CSS. PNG crteži nisu menjani. [Dokazi i precizan obuhvat](emulator-daily-2026-10-29/index.html): Android reentry svih10tema,150izolovanih lokalnih stanja/veličina. Nove dorade čekaju deploy i Android potvrdu; aktivni/završni Daily tok nije sada odigran jer je današnji izazov već završen na nalogu.




## R26 — Hotseat tipografija i geometrija završetka, lokalno 29.10.2026.
Stvarni izolovani renderer je pokazao razlike Green/ostalih tema u naslovu, kratkom paddingu/gap-u, statističkim fontovima/marginama, score/claim PNG veličinama i modalu. Ujednačeno samo za lokalne završetke (online izuzet), dodati Hotseat kontekst unosa gosta/izlaza/završnih obaveštenja i postojeći tematski površinski tokeni. Završni/aktivni BACAJ/NAJAVA PNG crteži nisu menjani.520lokalnih slučajeva, Solo400 i funkcionalne regresije prolaze. Čeka deploy/Android potvrdu.

## R27 — Vaskršnji board megafon bez src posle promene teme, lokalno 29.10.2026.
Android Hotseat prikazuje prazno najava zaglavlje u obe table posle ulaska iz druge teme. Stara generička hidratacija proverava assets/easter-soft-clay/, dok novi PNG živi u assets/theme-packs/easter/canonical/game-board/. Preloader ga dekodira, ali DOM ne dobija src; observer ne reaguje na samu promenu teme. syncGameBoardThemeImages povezuje postojeći canonical PNG za Easter/Neon i na applyTheme i po createScoreTables. Nova regresija proverava obe table i odložene neaktivne ikone, a stvarni lokalni renderer proverava src pre svog pomoćnog učitavanja. Nema nove slike/promene dimenzija. Čeka deploy/Android potvrdu.


## R28 — Online random čekaonica/završetak/modali, lokalno29.10.2026.
Stvarni renderer je otkrio različite širine/rubove, fontove, loading visinu i Green-only naslov pronađenog protivnika. Usklađeno premaGreen uz sopstvene palete i uklonjen Easterljubičasti rub. Zajednički završni tip/PNGmere sada važe i online; Revanš44px i uEaster, online modalni kontekst je zaseban.720lokalnih slučajeva; čeka deploy/Android potvrdu.

## R29 — Online pager i reconnect CSS opseg samo u3teme, lokalno29.10.2026.
Uslov je uključivao theme-dual-board-view/online-duel-room/random-online-duel-room samo zaGreen/Easter/Severna. Ostalih7tema nema sharedscope, Winter/Desert table su sabijene; disconnect PNG CSSne važi. Sve online partije sa2igrača sada imaju isti pager i sprečeno flexsabijanje. Brza CI regresija izvršava pravi uslov kroz10tema. Nema promene serverskih pravila ili dimenzija.

## R30 — DisconnectPNG ostaje/raste posle povratka veze, lokalno29.10.2026.
Privremeni timerPNG ostaje uDOM-u, a gubi27pxCSS kad se ukloni opponent-reconnecting. Lokalni screenshot pokazao je256pxPNG dok se čeka state-sync. clearOpponentReconnectGraceCountdown sada briše/sklanja samo disconnected sadržaj, uz trajnu27pxmeru unutar randomscope-a. Povratni canonical42pxPNG toast ima ujednačen font/grid/rub i tematsku površinu. Reconnect i720runtime slučajeva proveravaju sklanjanje/oporavak bez uticaja na obračun.

## R31 — Pozovi prijatelja: nejednaka geometrija i prelivanje statistike, lokalno29.10.2026.
450 stvarnih izolovanih renderera i Android domaćin svih10tema. Uklonjen nasleđeni obrub sobe koji sužava9tema, ujednačeni profili/razmaci/fontovi/gost/prazna lista i34px zaglavna ikona; Vaskršnji/Pustinjski posebni padding više ne pomera sadržaj. Četiri statistička reda ostaju u podkartici, status je vidljiv u svim temama; na niskom ekranu avatar i ime dele gornji red postojeće138px kartice. Modali imaju zaseban invite-friend kontekst i paletu/Green tipografiju, toast isti radijus/font. Kanonski8PNGuloga po temi ostaju isti, bez novog crteža ili promene DNK. Prolazi svih450slučajeva/5mobilnih veličina, uključujući granice statistike/statusa. Android prikazuje pre-deploy verziju; lokalne dorade čekaju objavu/potvrdu. Prvi Neon/Ametist izbor vraćen na prethodnu temu, ponovljeni uspeli — hladno učitavanje ostaje otvoreno.
