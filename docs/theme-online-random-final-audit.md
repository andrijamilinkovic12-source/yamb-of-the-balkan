# Završna provera — Online Random

## Najnoviji Android pokušaj — 29.10.2026.

[Kontrolisani par na dva emulatora](theme-visual-audit/two-emulators-2026-10-29/index.html) uspešno je upario korisnikove naloge Saru i Andriju, ali test nije potvrdio potez pre isteka vremena. Prvi kadrovi table već prikazuju 12/8 sekundi. Uzrok potrošenog vremena nije izmeren. **Običan meč, njegov završetak, nagradna reklama, dupliranje, revanš i reconnect ostaju neprovereni na Androidu.** Nije izvršen novi prolaz svih deset tema.

Server je bez klika na preuzimanje automatski obračunao tehnički rezultat: Sara 4107 → 2349 dukata (−1758, prikazana kazna −20 Indeksa moći); Andrija 18547 → 20322 (+1775), liga 37969 → 39744. Server menja i statistiku/H2H, ali sve pojedinačne vrednosti nisu dodatno proverene. Nije urađena ručna izmena niti poništavanje ovih posledica. Korisnik je obavešten; dalje produkcione partije nisu pokretane.

**R32, lokalno:** zajednička serverova poruka o pobedi više se ne prikazuje poraženom. `game_over_timeout` bira postojeću lokalizovanu poruku prema ulozi. Osam izolovanih testova stvarnog handlera prolazi (obe uloge × sr/en × server/local obračun, duplicate/stale/offline zaštite). Ekonomija/tajmer ostaju postojeći. `game.js?v=6.36`, bez commita/deploya; Android kadrovi su pre ove ispravke. Osnovni napredak audita ostaje 13/15 uz ranije granice. Postojeći izolovani QA radi, ali koristi stariji klijent v5.49 i treba aktuelnu verziju pre narednih ovakvih testova.

## Raniji lokalni pregled i inventar

Datum: 23. oktobar 2026. Obuhvat: Zelena i devet ostalih tema. Zelena određuje dimenzije i raspored; svaka tema koristi svoju paletu i materijal.

| Provera | Nalaz |
| --- | --- |
| Intro | Koristi zajednički ulaz svih soba: otvaranje posle 2,4 s, završetak posle 3,2 s. Kanonska ikona sobe se prikazuje bez teksta. |
| Aktivni PNG | **23 uloge po temi**, ukupno 230 aktivnih putanja za meni, intro, traženje, obaveštenja i završni ekran. Svaka uloga ima deset različitih SHA-256 otisaka i ispravan PNG potpis. |
| Stari PNG/SVG | U aktivnim putanjama i HTML-u nema starih SVG ikona ni ranijih Vaskršnjih, Pustinjskih i Severnih PNG stanja. Uklonjen je mrtav preloader koji je mogao da vrati stari `opponent/` direktorijum. Istorijski PNG fajlovi ostaju na disku za stare QA prikaze i kataloge, ali ih igra ne učitava za ovu sobu. |
| Dimenzije | Karte igrača, VS oznaka, status i nedeljna lista dele Zelen raspored. Na kratkim ekranima smanjeni su prazni razmaci i visina redova liste, jednako za sve teme. **80** kombinacija (10 tema × 4 telefona × traženje/pronađen protivnik) staje u ekran; uključuje duga imena i popunjena tri mesta liste. |
| Boje i kontrast | Devet tema koristi `--theme-card-*` i `--theme-subcard-*`; Zelena svoje kanonske Clay površine. Provera paleta zahteva najmanje 4,5 : 1 za osnovni, prigušeni i akcentni tekst na kartici i podkartici. |
| Tipografija | Montserrat. Izmerene veličine i porodica fonta naslova, statusa, imena, statistike i liste jednake su Zelenoj na 320 × 568, 360 × 640, 390 × 844 i 430 × 932. |
| Završni ekran/obaveštenja | Sobna stanja su traženje, pronađen protivnik i nedeljna lista; u partiji su prekid i povratak veze sa tematskim PNG. Online završetak deli rezultat, rekord, nagradu i preuzimanje sa ostalim duelima i ima kanonski tematski PNG revanš. **80** kombinacija završnog ekrana staje bez skrolovanja, uključujući bezbedne margine 320 × 568. Ispravljen je manji font „Preuzmi i izađi“ u Vaskršnjoj temi. |

**Aktivne PNG uloge (23):** ikona menija; zajednička ikona intra i zaglavlja; traženje, pronađen protivnik, VS, prekid veze, povratak veze; tri medalje podijuma; stanje prazne liste; ikona i površina dugmeta revanša; oznaka rezultata, preuzimanja i panel rekorda; četiri vrste rekorda; Indeks moći; kanonski dukat; ikona nagradnog videa. Power Index i medalje dele iste kanonske fajlove sa drugim sobama iste teme.

**Provere:** `npm run check:theme-online-random-final`, `npm run check:js`, `npm run check:match-results`, `npm run check:online-reconnect`, `npm run check:ad-reward-flow`, `npm run check:theme-board`, `npm run check:theme-game-header`; Edge Playwright `scripts/check-theme-online-random-layout.js` (80 rasporeda) i `scripts/check-theme-online-random-finish-layout.js` (80 rasporeda).

Provera reklamnog servisa i stvarne online partije na fizičkom telefonu ostaje zasebna integraciona provera; ovde su provereni lokalna logika i raspored.

Stariji globalni `check:easter-coverage` trenutno ne prolazi zbog ranije promenjenog zaključanog Vaskršnjeg inventara (145/150 fajlova). Ova provera nije merilo aktivnih Online Random putanja; njihov broj, postojanje i različiti sadržaji provereni su namenskim testom iznad.


Dopuna29.10.2026: [lokalni produkcioni pregled i delimični Android](theme-visual-audit/online-random-2026-10-29/index.html),720stvarnih renderer/CSS slučajeva sa sintetičkim servisima. Novi R28–R30 ispravljaju razlike koje stariji preview nije obuhvatio: geometrija/fontovi/rubovi, foundtitle svih tema, zajednički onlinepager i uklanjanje privremenog disconnectPNG-a pre state-sync odgovora. Minimum kontrasta imena/uloga/poena5,20:1.23uloge/tema i230putanja provereni preko qualityresolvera. Nema novih PNG crteža.

Android je sada **samo delimičan offlineGreen/Easter**: greška veze i Greenčekaonica, hladniPNG nisu svi u kešu, Lightizbor odbijen. Nema pravog meča, protivnika, nagrade ili isplate, pa se ova soba ne dodaje kao13/15osnovnih Android prolaza. Mreža/Green/prijava/originalne mere vraćeni. Potrebni deploy i kontrolisan online test/drugi uređaj; nova primena nije još potvrđena na Androidu.
