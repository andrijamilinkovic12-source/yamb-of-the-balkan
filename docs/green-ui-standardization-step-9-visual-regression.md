# Green UI standardizacija — korak 9: vizuelni prolaz i regresija

Datum: 2026-09-30. Opseg: postojeći `Pixel_7_Pro` emulator (1440 × 3120), aktuelni lokalni `www` preko `127.0.0.1:3000` i `adb reverse`. Dodatno je privremeno proverena emulirana veličina 1080 × 2100 na istoj gustini (560 dpi) i Android skala fonta 130%; obe postavke su vraćene na 1440 × 3120 i 100%. Lokalni server je pokrenut bez MongoDB veze. Postojeći APK nije ponovo izgrađen niti instaliran. Nema commita ili objavljivanja.

Lokalni server je zaustavljen na kraju pregleda; emulator je ostavljen na glavnom meniju. Proces je prijavio neuspele self-ping DNS pokušaje ka javnom hostu (`ENOTFOUND`), bez potvrđenog odgovora udaljenog servera.

Ovo je **delimični vizuelni prolaz**, ne završni release sertifikat: proverena su stanja koja su bila dostupna bez slanja poruka, poziva, rezultata, trošenja dukata ili završavanja meča. Prikazani profil i liste mogu koristiti ranije sačuvane podatke emulatora; izvor svakog podatka nije dokazivan.

## Potvrđeno na emulatoru

| Površina | Pregledano stanje | Nalaz |
|---|---|---|
| Glavni meni | Top kartice, četiri moda, Riznica/Turnir, donji red | Green motivi, kartice, tipografija i sistemske ivice se vide bez odsecanja. |
| Podešavanja | Profil, avatar, tri prekidača, tema/jezik, pravni linkovi, X | Elementi su unutar panela; avatar i X ne izlaze iz kartice. |
| Dnevni izazov | Početni ekran sa šest polja/kockica | Raspored 3 × 2 je centriran u unutrašnjoj kartici. Izazov nije zaustavljen ni predat. |
| Top lista | Globalna lista i prazna lokalna lista | Redovi, avatari, brojevi i prazno stanje staju u panel; X je dostupan. |
| Statistika / H2H | Metrike, pet kartica rivala, swipe na drugu stranu | Avatari i bedževi su unutar kartica; aktivna pager tačka prati prikazanu stranu. |
| Kvartalna liga | Rang Majstor, sledeći rang, Dvorana slavnih | Pager i tabovi rade. Otkriven i ispravljen horizontalni overflow panela; desna margina je sada vidljiva. |
| Riznica | Trofeji, skrol, početak liste skinova kockica | Kartice i gornje kontrole ostaju u granicama. Naslovi grupa trofeja su bili presvetli preko pejzaža; nakon ispravke su čitljivi. |
| Turnir | Bracket / četvrtfinale | Zaglavlje, tabovi, redovi mečeva i pager ne izlaze iz panela u prikazanom stanju. |
| Online igrači | Profil, još jedan igrač, pretraga i akcione ikone | Google avatar i inicijalni avatar staju u redove. Nije slat poziv niti pokrenut duel. |
| Global chat | Prazno stanje i otvorena Android tastatura | Unos i dugme za slanje ostaju iznad tastature i sistemske navigacije. Nije poslata poruka. |
| Dukati / Ispravi zadnji upis | Saldo, video opcija, stanje tokena | Ikone i tekst imaju čitljiv kontrast. Pri ulasku je prikazan test oglas; zatvoren je, a saldo je ostao 28535. Nagrada i potrošnja nisu testirane. |
| Pravila | Svih šest SR strana, pager nakon animacije | Aktivna tačka odgovara strani; naslovi i motivi odgovaraju sadržaju. Duži tekst ostaje u skrol panelu. |
| Solo / Hotseat | Prazna tabla; Hotseat unos imena i početna tabla | Šest numeričkih redova i šest mesta za kockice staju na ekran. Nema bacanja, upisa ili rezultata. |

## Dopunski prolaz: jezik i manji viewport

| Uslov | Pregledano | Nalaz |
|---|---|---|
| ENG, 1440 × 3120 | Meni, Podešavanja, svih šest strana Pravila, Statistika, H2H, Kvartalna liga i Dvorana slavnih | Naslovi i opisi u pregledanim stanjima staju; pager radi, kartice i avatari ostaju unutar panela. Duži tekst Pravila se skroluje. |
| ENG, privremeni 1080 × 2100 / 560 dpi | Meni, Kvartalna liga i Podešavanja, uključujući skrol do donjih opcija | Otkriveno i ispravljeno odsecanje gornjih menijskih kartica, naslov/rang/bodovi Kvartalne lige i pager preblizu sistemskoj navigaciji. Donji meni i jezik/pravni linkovi Podešavanja dostupni su skrolom. |
| SRB, 1440 × 3120, Android font 130% | Podešavanja | Zaglavlje, profil, prekidači, jezik i pravni linkovi ostaju čitljivi i u panelu. Ovo nije dokaz za sve sobe ni za drugi fizički telefon. |

Pri jednom učitavanju bez dostupne Google fotografije u Podešavanjima se video browserov simbol polomljene slike. Sada se pri grešci koristi inicijal igrača u kružnom okviru; proveren je ciljanim testom za `error`, `load` i odjavu. U ponovljenom vizuelnom prolazu fotografija se učitala, pa vizuelni izgled samog fallbacka na emulatoru nije zasebno potvrđen.

## Ispravke u ovom koraku

1. Green panel Kvartalne lige na mobilnom viewportu sada računa širinu zajedno s levim i desnim safe insetom. Pre ispravke zajednički `left` i Green `width: 100%` potiskivali su desnu ivicu van ekrana. [Pre](../screenshots/green-ui-step9/green-step9-league.png) / [posle](../screenshots/green-ui-step9/green-step9-league-fixed.png).
2. Obični naslovi grupa trofeja u Riznici dobili su tamnozelenu podlogu i svetao tekst; prethodni svetlozeleni tekst se stapao sa svetlim delovima pejzaža. Naslovi kolekcija sa zasebnim stilom nisu menjani. [Pre](../screenshots/green-ui-step9/green-step9-treasury.png) / [posle](../screenshots/green-ui-step9/green-step9-treasury-fixed.png).

3. Gornje kartice menija na viewportu do 360 CSS px sada mogu da se skupe bez skraćivanja iznosa i ranga, sa tipografijom usklađenom tom širini. [Pre](../screenshots/green-ui-step9/green-step9-narrow-menu.png) / [posle](../screenshots/green-ui-step9/green-step9-narrow-menu-fixed.png).
4. Kvartalna liga na istom uskom viewportu ima pun naslov, uspravni raspored ranga/bodova i dodatni razmak do Android navigacije. [Pre](../screenshots/green-ui-step9/green-step9-narrow-league.png) / [posle](../screenshots/green-ui-step9/green-step9-narrow-league-fixed.png).
5. Podešavanja imaju inicijal kao rezervni avatar kada fotografija ne uspe da se učita. Slika se opet prikazuje ako uspešno stigne, a rezervni avatar nestaje pri odjavi.
6. Na uskom ekranu naslov „Protivnik pronađen” više ne ulazi pod X u zaglavlju čekanja. [Pre](../screenshots/green-ui-step9/green-step9-qa-vs-narrow.png) / [posle](../screenshots/green-ui-step9/green-step9-qa-vs-narrow-fixed.png).
7. Na kratkom telefonu sadržaj Solo rezultata se skroluje bez sabijanja statistike i preklapanja dugmadi. [Pre](../screenshots/green-ui-step9/green-step9-qa-solo-narrow.png) / [posle, donji deo](../screenshots/green-ui-step9/green-step9-qa-solo-narrow-bottom.png).
8. Plavi emoji na dugmetu „Revanš” uklonjen je samo iz Green prevoda; srpski/engleski tekst i druge teme zadržavaju svoje oznake. [Pre](../screenshots/green-ui-step9/green-step9-qa-online-result-narrow.png) / [posle](../screenshots/green-ui-step9/green-step9-qa-online-result-narrow-fixed.png).

CSS promene menija, Riznice, Kvartalne lige, čekanja i rezultata su ograničene na Green selektor; avatar fallback je zajednički jer ista profilna slika služi svim temama. `npm test`, ciljani test fallbacka, ciljani SR/ENG prevod „Revanš” za Green i Uskrs, i `git diff --check` prolaze.

## Izolovani pregled teško dostupnih stanja

Dodato je [lokalno QA ogledalo](../qa/green-runtime.html) koje parsira postojeći `index.html` i preuzima stvarne DOM ekrane i CSS. Prvobitna stanja nisu izvršavala aplikacione skripte; dopunska stanja opisana ispod pozivaju samo izdvojene prikazivače aplikacije sa sintetičkim podacima, bez njenog pokretanja. Ne postoji prijava, socket, meč, upis, nagrada ni izmena salda. To je pregled **rasporeda**, ne test online logike. Na privremeno suženom emulatoru pregledani su: [traženje protivnika](../screenshots/green-ui-step9/green-step9-qa-search.png), [VS sa dugim imenom](../screenshots/green-ui-step9/green-step9-qa-vs-narrow-fixed.png), [poziv prijatelja](../screenshots/green-ui-step9/green-step9-qa-invite-narrow.png), [Solo rezultat](../screenshots/green-ui-step9/green-step9-qa-solo-narrow-fixed.png), [online rezultat](../screenshots/green-ui-step9/green-step9-qa-online-result-narrow-fixed.png) i [poruka o nedovoljno dukata](../screenshots/green-ui-step9/green-step9-qa-insufficient-narrow.png). Poruka je čitljiva, a osnovne kartice i kontrole ostaju unutar ekrana. Prvobitni snimak poziva ne prikazuje punu listu prijatelja niti potvrđuje stvarni tok poziva.

Ogledalo je sada izvan isporučenog `www` stabla. Za ponavljanje pregleda pokrenuti `npm run qa:green` i otvoriti `http://127.0.0.1:3130/__green_qa__/green-runtime.html#waiting-search`. Lokalni QA server služi samo statički `www` i ogledalo, vezan je za `127.0.0.1`, bez baze i Firebase-a; izdvojene prikazivače dopunskih stanja pokreće isključivo stranica ogledala. Na Android emulatoru je potreban `adb reverse tcp:3130 tcp:3130`.

Posle premeštanja su lokalno potvrđeni HTTP 200 za QA HTML, `index.html`, Green CSS i PNG, i HTTP 404 za pokušaj izlaska iz dozvoljene putanje. Emulator je potom pokrenut i novi URL je [vizuelno potvrđen na njemu](../screenshots/green-ui-step9/green-step9-qa-isolated.png): pozadina, Green ikone, kartice, tekst i X učitani su ispravno. Gornji snimci drugih stanja napravljeni su pre premeštanja, sa istim sadržajem ogledala.

Za naredni stvarni online test postoji `MONGO_URI` u lokalnom `.env`, ali nije označen kao test/staging. Nije korišćen. U repozitorijumu nisu pronađeni odvojena test konfiguracija ni dva namenski pripremljena test naloga. Bez potvrde izolovanog okruženja ne pokretati stvarni matchmaking, poziv, upis rezultata ili trošenje dukata.

## Šta ostaje otvoreno pre zatvaranja koraka 9

- ENG i uski/kratki viewport su pregledani samo u gore navedenim sobama, ne u svim ekranima i stanjima. Android font 130% je pregledan u Podešavanjima, ne u svakoj sobi.
- Nisu pregledana sva stanja svih soba: rezultati i nagrade Dnevnog izazova, svi tabovi Riznice i Turnira, funkcionalno zaključavanje, sve vrste potvrda/grešaka i sve varijante završnih ekrana. Četiri česta Green toasta, duga poruka, tri modala, jedan zaključani trofej i četiri stanja sobe Online igrači pregledani su samo izolovano u Android Chrome-u ([toast nalaz](green-ui-reported-issues-map-2026-09-30.md#izolovana-provera-green-toast-poruka), [modal/trofej nalaz](green-ui-reported-issues-map-2026-09-30.md#izolovane-potvrde-greške-i-zaključani-trofej), [Online igrači](green-ui-reported-issues-map-2026-09-30.md#online-igrači--učitavanje-prazno-greška-i-nedostupne-akcije)); ostale varijante i produkcioni WebView nisu potvrđeni.
- Online random i Pozovi prijatelja nisu stvarno pokretani da se ne uspostavi meč ili poziv. Njihov VS ekran i rezultat su vizuelno pregledani sa sintetičkim podacima; povezivanje, ponovna konekcija, stvarni rezultati i puni tok poziva i dalje traže kontrolisanu bazu i dva test naloga.
- Native build i vizuelna regresija na još jednom telefonu nisu rađeni po prethodnom dogovoru. Automatski testovi ne zamenjuju te provere.

## Dopuna: preostali tabovi Riznice u izolovanom prikazu

Na Android Chrome-u pri privremenih 1080 × 2100 i sistemskom fontu 130% provereni su sintetički primeri skinova, efekata i tema kroz stvarni `ShopManager.render`. Status „Kupljeno” u Green temi više ne duplira kvačicu; zaglavlja grupa imaju postojeće Green motive, a kartica „Zelena” svoj motiv i tačan opis. [Skinovi](../screenshots/green-ui-step9/green-treasury-skin-sr-final2-130.png), [efekti EN](../screenshots/green-ui-step9/green-treasury-effect-en-130.png), [teme SR](../screenshots/green-ui-step9/green-treasury-theme-sr-final2-130.png) i [teme EN](../screenshots/green-ui-step9/green-treasury-theme-en-130.png) ne pokazuju odsecanje pregledanih kartica. Detalji i ograničenja su u [mapi nalaza](green-ui-reported-issues-map-2026-09-30.md#riznica--skinovi-efekti-i-teme).

Ovaj prvi dopunski prolaz pregledao je uzorak; sledeći prolaz celog kataloga opisan je u [mapi nalaza](green-ui-reported-issues-map-2026-09-30.md#dopuna-ceo-katalog-i-stanja-kartica-riznice). Green preview konfeta više ne koristi emoji, a tekst za otključavanje reklamom staje u karticu. Stvarna kupovina/aktiviranje i WebView nisu testirani. Nije rađen build ni commit.

Dopunski korak je sada zamenio i preostalih šest zajedničkih emoji preview motiva efekata zasebnim Green clay PNG-ovima. Svadba/Gromovnik i Mehurići su [vizuelno pregledani](../screenshots/green-ui-step9/green-treasury-wedding-clay-cdp.png) ([drugi snimak](../screenshots/green-ui-step9/green-treasury-bubbles-clay-cdp.png)); svih šest je provereno po PNG putanji, pseudo-slojevima i horizontalnim granicama u SR i EN punom katalogu. Stari ram Svadbe je uklonjen iz Green varijante. Detalji i ograničenja, uključujući Chrome ANR pri običnom snimanju emulatora, nalaze se u [mapi nalaza](green-ui-reported-issues-map-2026-09-30.md#dopuna-šest-preostalih-green-fx-preview-motiva). Početno učitavanje je nepromenjeno; novi asseti pripadaju samo paketu Riznice. Live efekti, produkcioni WebView i stvarne transakcije nisu potvrđeni.

Naredni lokalni prolaz je izdvojio i zamenio Green karticu „Kraljevski Yamb”, koja je još koristila stari `Logo_green.png` i crveno-zlatne zrake. [Završni snimak](../screenshots/green-ui-step9/green-treasury-royal-yamb-clay-cdp.png) i automatski audit potvrđuju sedmi glineni PNG, bez starog unutrašnjeg logotipa i bez prelivanja kartice na uskom Android prikazu; [mapa nalaza](green-ui-reported-issues-map-2026-09-30.md#dopuna-green-preview-kraljevskog-yamba) navodi granice te provere. Nije rađen build, commit ni aktiviranje efekta.

Poslednji prolaz je zamenio i sedam preostalih zajedničkih CSS preview-a zasebnim Green clay PNG-ovima. Time svih 14 kartica efekata koristi motiv teme. [CDP snimci i ograničenja](green-ui-reported-issues-map-2026-09-30.md#dopuna-preostalih-sedam-green-fx-preview-a) dokumentuju SR/EN audit punog sintetičkog kataloga na emulatoru; izmena ne obuhvata žive efekte u igri ili produkcioni WebView. Nije rađen build ni commit.

Hitna ispravka Turnira pre narednog koraka Riznice: Green četvrtfinale, polufinale i finale sada koriste punu raspoloživu visinu bez nepotrebnog unutrašnjeg okvira; četvrtfinale ne skroluje na testiranom mobilnom profilu. Tačkice su dodirljiva dugmad, a swipe radi u oba smera. [Dokazni snimci i granice provere](green-ui-reported-issues-map-2026-09-30.md#hitna-dopuna-tu-01-turnir--navigacija-i-visina-kostura). Nije rađen build ni commit.

Nastavak normalnog redosleda: [izolovana provera živih efekata Riznice](green-live-effects-audit-2026-10-01.md) pokrenula je svih 16 `EffectManager` animacija na Android emulatoru, proverila čišćenje posle `stop()` i ispravila Green-specifične razlike između preview motiva i animacije u partiji. Stvarni meč, kupovina i produkcioni WebView ostaju otvoreni.

Sledeći dopunski korak proverio je [putanju opremljenog efekta do Yamb upisa](green-yamb-route-audit-2026-10-01.md) preko stvarnog `ShopManager.equip`, `writeScore` i HTML table, ali bez pokretanja aplikacionog backend-a. Prvi hitac namenski koristi Grom, kasniji hitac izabrani efekat. Green Grom je dobio kanonski clay motiv i blaži potres table. Puni native end-to-end i dalje ostaje otvoren bez builda i kontrolisane lokalne sesije.

[Regresija životnog ciklusa efekata](green-effect-lifecycle-audit-2026-10-01.md) zatvorila je curenje animacionih zahteva i `resize` listenera pri prekidu Kraljevskog Yamba i Supernove. Svih 16 efekata prošlo je po četiri brza pokretanja/zaustavljanja bez zaostalih resursa; prirodni završetak dve canvas animacije je zasebno potvrđen. To nije merenje FPS-a ili produkcionog WebView-a.

[Lokalni profil performansi](green-effect-performance-profile-2026-10-01.md) proverio je JS heap i DOM pre/posle šest reprezentativnih efekata i uklonio nepotrebne Green canvas sprite-ove. Headless emulator je imao promenljiv broj frejmova i u mirovanju, pa FPS i dalje nije potvrđen; za to je potreban vidljiv produkcioni WebView kada build bude dozvoljen.

[Provera prekida i prelaska između efekata](green-effect-navigation-audit-2026-10-01.md) obuhvatila je pobedničku animaciju pre i tokom kiše dukata, kao i tri uzastopna ciklusa svih 16 efekata u svakoj od tri teme. Lokalni izolovani prikaz nije pokazao zaostale FX resurse; stvarna partija i produkcioni WebView ostaju otvoreni.

[Granica ekrana i efekata](green-effect-screen-lifecycle-2026-10-01.md) ispravlja dva pozivaoca koji ranije nisu gasili efekat: povratak u meni posle partije i zatvaranje završenog Dnevnog izazova. Direktan test stvarnih metoda potvrđuje redosled prema potvrdi nagrade i zaštitu aktivnog kotrljanja. Produkcioni WebView ostaje nepotvrđen.

[Završna kontrola pre builda](green-prebuild-readiness-2026-10-01.md) grupiše devet kategorija iz početne matrice po nivou dokaza i izdvaja tri preostala vrata: produkcioni WebView, izolovan online QA i drugi telefon. Ona ne proglašava korak 9 potpuno zatvorenim.

Sačuvani su samo ključni dokazni snimci u `screenshots/green-ui-step9/`; 32 prolazna snimka nastala tokom navigacije uklonjena su iz korena radne kopije.
