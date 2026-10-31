# Početno učitavanje — 30.10.2026.

## Lokalna v6.42 — dijagnostika, još bez objave

[Pripremljeni zapis i provere](loading-diagnostics-2026-10-30/README.md): QA-only PNG load/decode/timeout/ready, bez podataka naloga; retry i rokovi isti. Stvarni lokalni PNG: 10 tema × 28 spremnih slika, bez grešaka, plus retention/skrivene kontrole regresije PASS. Vaskršnja paket 4.604.051 B; probna lossless kompresija nije primenjena. Prvi Easter i ANR ostaju otvoreni. Nema novih emulator radnji, commita ili deploya. Objavljena osnova i dalje v6.41; odeljci niže čuvaju istoriju.

## Posle objave v6.41 — ciljana native potvrda, prviEaster ostaje otvoren

[Javne verzije i23Android kadra](postdeploy641-2026-10-30/index.html). Oba servisa429cec22, šest JS fajlova potvrđeno. Tri sobeGreen/Neon prikazuju svojePNG pri otvaranju: Top lista oba taba, Online igrači header/search/sopstveni red, Pozovi prijatelja dinamičke kartice iPowerIndex/friend/search/send. Native mrežni zahtevi nisu instrumentovani, pa lokalnih14→0i126→0ostaju izolovane mere.

Neon/Moon prvi izbor i povratakNeon/Green uspešni. PrviEaster ostavioNeon; ponovljeni uspeo. Keš nije brisan. ActivityCOLD13476msnije app-ready vreme niti validna mera ubrzanja u odnosu na6.40; prvi emulator bio pauziran tokom ovog pregleda i potom vraćenrunning. Prelazni/nepotpuni kadrovi i uzrokANR-a ostaju otvoreni. Hotseat unos za novu partiju otkazan; aktivni skin test nije izvršen. Bez nove partije, oglasa/nagradnog dugmeta, DB pristupa ili runtime izmene; drugiGreen meni, prikazani saldo12168isti.

## Aktuelno: v6.40 objavljena; R37/v6.41 lokalna

[Android i lokalni dokazi](postdeploy640-2026-10-30/index.html). Oba servisa d38aa6aa, game.js6.40/header6/Settings4. Uspešan povratakGreen i konačni prikazi pet tema, ali prviNeon/Easter/Moon izbori tražili ponavljanje.56javno proverene PNG putanje sve200. Activity COLD19194msnije vreme spremnog menija; start i uzrok ANR-a nisu zatvoreni. Bez novih partija, reklama/nagradnih dugmadi ili DB pristupa. Oba emulatora vraćena u rad, drugiGreen meni.

Tri dodatna kontrolera automatski su pripremala skrivene sobe: Top lista, Online igrači, Pozovi prijatelja. R37 obrađuje prikazane slike i reaguje na otvaranje sobe/dinamički sadržaj; eksplicitna priprema ostaje. Stvarni lokalni kontroleri/PNG:14zahteva/719184B→0 pri startu,126→0tokom deset skrivenih tema.40vidljivih slučajeva10tema, deljeno oko/prazna lista u igri i dinamičkiPowerIndex prolaze. To nisu ukupni zahtevi aplikacije ili dokaz uzroka Android zastoja. Izgled i dimenzije nisu menjani. **v6.41 je lokalna; čeka korisnikov commit/deploy i ciljanu native proveru.**

## Dopuna posle korisnikovog deploya v6.39

Oba servisa potvrđena na commitu7985cb39. Javno objavljeni game.js6.39, header6 i Settings4 odgovaraju lokalnom sadržaju posle CRLF/LF normalizacije. [Android snimci, hash-evi i granice](postdeploy639-2026-10-30/index.html).

Na QA emulatoru pregledane kompletne Settings kontrole u Green/Neon/Easter/Light. Uz korisnikovo izričito odobrenje otvorena prazna lokalna Hotseat Sara/Gost_QA; Green i Light paneli i meni igre učitani, jedna promena teme i jedan ručni izbor Žadne Gline u Light temi primenjeni. Kockice, BACAJ/NAJAVA i brojač prate skin. Nema bacanja, upisa, završavanja, oglasa ili isplate. Potvrđen izlazak i vraćena Green tema. Read-only poređenje potvrđuje iste QA profile, rezultate i preuzimanja; salda2939/12168.

**Brzina ostaje otvorena.** Komanda am-start-W istekla je, prvi kadar pokazao samo podlogu, kasniji oporavljen meni. Neki kadrovi kasne ili hvataju nepotpuno iscrtavanje/animaciju. Nije čišćen cache ili precizno meren app-ready trenutak. Na početku je zabeležen stari FocusEvent ANR; na kraju nema novog potvrđenog događaja, ali to ne dokazuje da je uzrok otklonjen. Prvi emulator privremeno pauziran, zatim vraćen u rad; oba na kraju running. Ovo je ciljana potvrda primene R35, nije novi native10/10ili provera S25/reklama.

Odeljci niže čuvaju lokalno poređenje i prethodnu v6.38 dijagnostiku.

## R35 — skrivene kontrole, lokalna v6.39

Objavljena osnova je v6.38/41d6598f. Dva kontrolera su pri pokretanju i promeni teme u meniju učitavala PNG za skrivene Podešavanja i panel igre. Lokalna v6.39 odlaže njihov automatski rad do aktiviranja odgovarajuće sobe. Javne `prepare`/`apply` funkcije i kompletna priprema pri promeni teme ostaju dostupne. Trenutni panel igre priprema se tokom citata/čekanja, pre otvaranja igre; postojeća priprema sledeće teme i skinova ostaje aktivna.

Zakašnjeli rezultat pripreme mora odgovarati i aktuelnom request tokenu i trenutno aktivnoj temi. To sprečava da stari skriveni panel prepiše zajedničke audio ikone u novoj temi Podešavanja.

Nema promene PNG crteža, paleta, dimenzija, ekonomije ili pravila igre. Cache verzije: game.js6.39, theme-game-header.js6, theme-settings-room.js4. Promena još nije objavljena niti potvrđena na Androidu.

## Izolovano browser poređenje

`scripts/test-hidden-control-loading.cjs` koristi stvarna dva kontrolera i njihove PNG fajlove. Sve uloge panela preuzima iz stvarnog index.html. Reprezentativni DOM sadrži meni i skrivene/aktivne sobe, mobile viewport411×891. Nema autentikacije, konstruktora igre, socket-a, računa ili spoljnog hosta. Istorijska osnova čita se iz navedenog commita, lokalna verzija iz radnog stabla.

| Provera | Pre izmene | Posle izmene |
| --- | ---: | ---: |
| PNG zahtevi dva skrivena kontrolera pri početnom meniju | 17 | 0 |
| Veličina tih PNG odgovora | 1.172.537 B | 0 B |
| PNG zahtevi pri promenama teme dok oba prikaza ostaju skrivena | Nije mereno | 0 |
| Otvaranje Podešavanja i igre, svih deset tema | Nije predmet početnog baseline prolaza | 10/10 PASS |

Svaka tema ima devet Settings i devet header PNG kontrola u testu. Provereni su naturalWidth, dovršeno učitavanje i tačna kanonska putanja; timer i lock pripremljeni su kroz isti kontroler. Eksplicitna priprema skrivenih prikaza i dalje prolazi. Nema browser grešaka/404. Izvori i faze zahteva: [pre](startup-loading-2026-10-30/before.json), [posle](startup-loading-2026-10-30/after.json).

Poseban slučaj namerno zadržava Green header PNG, otvara Neon Podešavanja, pa pušta zakašnjeli Green odgovor. Neon audio ikone i prethodno odsustvo Green lock potvrde ostaju ispravni. Dodatni izolovani Settings test proverava završavanje pripreme skrivene stare teme bez novog apply poziva.

Ovo je smanjenje nepotrebnog rada u ova dva kontrolera. Nije merenje ukupnog starta aplikacije, uštede vremena preko stvarne mreže ili dokaz uzroka/popravke Android ANR-a. Cache pravog telefona nije brisan.

## Emulator — objavljena v6.38

Oba emulatora su pri prethodnom prolazu bila povezana. Javni snimak drugog uređaja potvrđuje Green glavni meni; nije otvorena nova partija ili reklama niti pritisnuta nagrada. Nije restartovana aplikacija u tom dijagnostičkom prolazu. [Snimak](startup-loading-2026-10-30/qa-menu-before.jpg).

Filtrirani sistemski sažetak poslednjeg ANR-a za QA aplikaciju navodi `Input dispatching timed out`, čekanje5009ms za `FocusEvent(hasFocus=false)`. Taj sažetak ne daje uzrok blokade glavnog threada niti dokazuje da je uzrok mrežno učitavanje PNG-a.

Zbirna gfxinfo statistika te sesije:17.415iscrtanih kadrova,17.403janky, percentili150/400/2600ms. Ovo su kumulativni Android brojači, nisu izolovano merenje pokretanja ili vremena izvršavanja JavaScript-a. Host je imao2,18GB slobodnog od15,23GB RAM-a. Jedan meminfo sažetak QA paketa: PSS172.304KB, RSS330.252KB; nije zbir svih renderer/AVD procesa. Uzročnost nije utvrđena. Nalaz zastoja i hladnog učitavanja ostaje otvoren.

## Provere i sledeća potvrda

Prolaze: izolovani browser prolaz10tema, Settings switch/room/picker, game header/eye/timer/action lock, quick skins, theme retry/readiness/decode/preload cache i JS sintaksa. Regresija proverava i pripremu trenutnog panela pre igre, uključujući nalog sa samo Zelenom temom.

Posle korisnikovog commita/deploya potvrditi novo pokretanje, prvi ulazak u Podešavanja i panel igre na Androidu. Posebno izmeriti hladni start i prvi/ponovljeni izbor teme i skina na S25. Ovim nisu zatvoreni ANR, kašnjenje skinova ili drugi otvoreni funkcionalni testovi.
