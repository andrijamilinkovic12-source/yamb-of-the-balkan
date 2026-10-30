# Početno učitavanje — 30.10.2026.

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
