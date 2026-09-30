# Green Asset Standardization — Rules Page Illustrations, Korak 1

## Opseg i odluka

Inventar i statički vizuelno-semantički audit obuhvata četiri Green ilustracije stranica Pravila koje još nemaju sopstvenu canonical porodicu. Postojeći motivi su prikladni za 3D Soft Clay Neumorphism DNK i precizno odgovaraju naslovima; novi render nije potreban u ovom koraku. [Audit tabla](green-asset-standardization-rules-page-illustrations-audit.png) prikazuje sva četiri kandidata, dve zaštićene stranice i zaseban znak ulaska u sobu.

Aktivni PNG-ovi, UI putanje, tekst Pravila, SR/EN mapiranje, dimenzije, animacija, redosled stranica, room preload i cache verzija `61` nisu menjani. Porodica još nije registrovana.

## Svih šest stranica — tačno mapiranje

| Redosled | Naslov SR / EN | Aktivni PNG | Uloga i granica |
|---:|---|---|---|
| 1 | Pravila i bodovanje / Rules & scoring | `rules-scoring-v1.png` | otvoren Yamb listić sa označenim upisima; **kandidat**, nije glavni room znak knjige |
| 2 | Statistika i liste / Stats & leaderboards | `stats-leaderboards-v1.png` | rastući stubovi sa krunom; **kandidat**, nije Global/Local kontrola niti podium medalja |
| 3 | Multiplayer i takmičenja / Multiplayer & competitions | `multiplayer-competitions-v1.png` | dva igrača, kockica i pehar; **kandidat**, nije Online Random room znak |
| 4 | Komunikacija / Communication | `communication-v1.png` | dva razgovorna oblačića; **zaštićena postojeća cross-family scena**, nije Global Chat room znak |
| 5 | Dukati, tokeni i Riznica / Ducats, tokens & Treasury | `economy-treasury-v3.png` | kovčeg sa kanonskim dukatima i Undo tokenom; **već zaključana kompozicija**, ne prepravljati |
| 6 | Nalog, privatnost i server / Account, privacy & server | `account-server-v1.png` | nalog, štit i server; **kandidat**, nije ikona pojedinačne Settings kontrole |

Srpski i engleski naslovi u `www/pravilaigre.js` koriste istu mapu od šest tema. `www/game.js` sadrži svih šest slika u Rules room paketu. Postojeći testovi potvrđuju vezu svake slike sa oba odgovarajuća naslova. Inline ikone u tekstu Pravila pripadaju svojim drugim porodicama i nisu deo ova četiri page PNG-a.

## Tehnički inventar kandidata

Sve četiri datoteke su aktivni `512 × 512` RGBA PNG-ovi u `www/assets/green-soft-clay/rules/pages/`. Imaju puni alpha opseg, četiri transparentna ugla i prikazuju se kao naslovne ikonice od `38 × 38 px` uz `object-fit: contain` i `greenRulesIconBreath 4,8 s` sa reduced-motion zaštitom.

| ID | Bajtova | SHA-256 |
|---|---:|---|
| `rules-scoring-v1.png` | `188.200` | `58d0c32e0cd9c8a92e97a95b6ccb4468df19adde7901ef2052e42a45a3ea00ca` |
| `stats-leaderboards-v1.png` | `174.369` | `41b88e864d1933b43ba9081c5ebba6d6844e23afc3fba71f5cac45ecb6969b7a` |
| `multiplayer-competitions-v1.png` | `193.124` | `efa52e4b24c8d78602efb812bba4cde8c36fdf4b345fb683337386cd44cbe50b` |
| `account-server-v1.png` | `240.872` | `a1092f5af79c8a73982147c78713de0e0fe7b92cfe0bdf7557babb9ba6cfab7a` |

Zbir kandidata je `796.565 B`, bez dve zaštićene scene. Šest page PNG-ova zajedno zauzima `1.275.366 B`; Rules room paket sa glavnim room znakom ostaje `7 PNG / 1.450.680 B / 7.340.032` procenjeno dekodiranih bajtova. Nijedna page ilustracija ne pripada startup paketu od `17 PNG`.

## Vizuelna i semantička provera

Na audit tabli četiri kandidata imaju različite, čitljive siluete na stvarnih `38 px`, u usklađenoj forest-green, warm-ivory i terracotta glinenoj paleti. Nema kvadratne podloge, okvira ili ugrađenog teksta. Namerno su složenije scene od malih funkcionalnih kontrola, ali ne preuzimaju identitet glavne sobe ili drugih porodica.

Zaštićeni `communication-v1.png` (`175.405 B`, SHA-256 `50ed1ec25dbf9c1de01059ad2d4c15cf5ec230b69c29c370a2ba7e0c901ae05d`) ostaje deljena funkcionalna scena. `economy-treasury-v3.png` (`303.396 B`, SHA-256 `495fe82e49141fb40dcb195c6f1f2c7d0000511d9ea38a6753e61d3db85eb330`) čuva prethodno standardizovane dukate i Undo token. Glavni `rulesRoomIdentity` otvorene knjige (`175.314 B`, SHA-256 `48527b7eb726778604fc25ba437d0d350a3ab97708c7c4d3dd8ad19c537a8ae4`) ostaje odvojena zaključana porodica.

## Izvorni materijal i plan za Korak 2

Za ova četiri kandidata nije pronađen odgovarajući `1254 × 1254` Green high-resolution izvor u `source-assets/green-soft-clay-hires/`. Postoje samo odobrene aktivne `512 × 512` isporuke. Stoga Korak 2 treba da sačuva **bajt-po-bajt kopiju svakog postojećeg 512 px PNG-a kao odobreni master**, sa njegovim izvornim otiskom, i da iz njega reprodukuje identičan canonical runtime. Ne treba izmišljati original od 1254 px niti uvećavati 512 px sliku i predstavljati je kao viši kvalitet.

Korak 2 formira četiri canonical isporuke bez menjanja aktivnog UI-a. Korak 3 tek potom prebacuje SR/EN mapiranje i Rules sobni paket na nove putanje i uklanja stare četiri kopije posle provere referenci. Korak 4 zaključava porodicu završnim auditom. Zaštićene dve scene ostaju na svojim sadašnjim putanjama.

`scripts/make-green-rules-page-illustrations-audit-sheet.py` reprodukuje tablu `1480 × 974` i proverava tačne dimenzije, bajtove, SHA-256, RGBA, alpha i uglove svih sedam prikazanih motiva. `scripts/check-theme-performance.js` štiti otiske četiri kandidata, dve zaštićene scene, postojeće veze sa naslovima, motion i prisustvo audit table.

Ovo je statički audit, ne pregled na Android emulatoru. Nije rađen commit niti objavljivanje.
