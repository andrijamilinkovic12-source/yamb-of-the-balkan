# Promena teme — nastavak dijagnostike 25.10.2026.

Ovaj korak sledi [stvarni Android pregled](theme-visual-audit/emulator-deployed-2026-10-25/index.html). Lokalne izmene nisu commitovane niti objavljene od strane agenta. Snimci tog prolaza prikazuju prethodno objavljeni kod; nisu dokaz nove brzine.

## Vraćanje prethodne teme (R13)

Potvrđen mehanizam u kodu: `applyCloudProfileSync` je štitio ručni izbor samo 2.500 ms. `emitPlayerData` pre slanja može čekati cloud restore, Firebase autentifikaciju i trofejne zahteve. Odgovor sa prethodnom temom nakon te zaštite ponovo je primenjivao staru temu. Ovo je reprodukovano regresionim scenarijima; tačan redosled zahteva prethodnog Android snimka nije čitan kroz privatnu sesiju ili debugger.

Ručni izbor sada je vezan za nalog i ima prvenstvo tokom te sesije. Nepotvrđen izbor ostaje pod nalogovim ključem i kroz restart, dok cloud ne potvrdi isti izbor. Potvrda ne dopušta da kasniji, stariji odgovor vrati drugu temu u istoj sesiji. Drugi nalog i nova sesija bez nepotvrđenog izbora i dalje mogu da obnove cloud podešavanje. Inventar i pravo pristupa temama ostaju provereni. Namerno: izmena na drugom uređaju ne nadjačava izričit izbor u tekućoj sesiji ovog uređaja.

Obuhvaćena su tri mesta izbora: Podešavanja, panel tokom igre i aktiviranje teme iz Riznice. Cloud poruka sa istom temom više ne poziva nepotrebno kompletan `applyTheme`.

## Učitavanje PNG paketa (R01)

Uklonjena je paralelna priprema istih Settings slika u dva kontrolera. Settings kontroler već čuva dekodirane slike potrebne za vidljivu sobu; sada je on jedina prepreka za taj paket. Vidljive slike imaju visok prioritet.

Generički preloader sada deli isti Image i dekodiranje za istu razrešenu putanju, zadržava uspešno dekodirane slike u ograničenom cache-u i dopušta ponovnom pokušaju da se priključi transferu koji još traje. Greška mreže briše neuspelu stavku. Rokovi nisu produženi. Cache čuva najviše 64 reference i 12 miliona dekodiranih piksela; to nije ukupan memorijski budžet aplikacije.

Nijedan PNG nije precrtan, prebojen, smanjen ili zamenjen u ovom koraku. Paketi glavnog menija, pre Settings dodatka, i dalje imaju oko 3,48–4,19 MB po temi (18 URL-ova). Samo pozadina Mesečevog sjaja ima 1.530.933 bajta. Zato **trenutan prvi prelazak na slaboj vezi nije potvrđen**. Potrebno je merenje na narednom deployu; smanjen broj Image objekata i zaštita sinhronizacije nisu dokaz mrežnog ubrzanja.

## Regresione provere

- `test-theme-selection-sync.cjs`: zakasneli odgovor bez vremenskog prozora, potvrda pa stariji odgovor, najnoviji izbor, restart bez potvrde, drugi nalog, nedostupna tema i normalan cloud restore.
- `test-theme-preload-cache.cjs`: isti URL deli download/decode; viši prioritet; priključivanje retry-a sporom transferu; novi pokušaj posle greške; ograničenje broja referenci i piksela.
- `test-game-theme-switch-preload.js`: sačekati dekodirane game/Settings slike; ne pripremati Settings paket dva puta; neuspešna priprema zadržava prethodnu temu.
- `check:theme-settings-room`, `check:theme-game-header`, `check:profile-sync` i `check:js` prolaze.

Šira istorijska provera `check:theme-performance` pada na starom uslovu za Green katalog Riznice (`data-green-category`, `riznica-green-theme-icon` i stari tekst opisa). Isti markeri nedostaju u početnom HEAD-u pre ovog koraka; problem nije nastao ovim izmenama. Nije predstavljena kao uspešna provera niti je vraćen stari prikaz radi njenog prolaska.

## Posle korisnikovog deploya

1. Ponoviti prvi i sledeći prelazak Desert → Moon → Severna iz Podešavanja. Proveriti ishod nakon povratka u meni i ponovnog ulaska u Podešavanja.
2. Proveriti isto iz game panela i Riznice, bez kupovine i pokretanja nove partije samo radi testa.
3. Potvrditi prethodne lokalne vizuelne ispravke R07–R12. Tek potom nastaviti sledeće sobe i retka stanja iz glavnog registra.

Cache verzije: `game.js?v=6.31`, `managers.js?v=6.32`, `theme-settings-room.js?v=3`.
