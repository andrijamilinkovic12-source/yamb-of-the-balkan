# Green Asset Standardization — Online Players Room Identity, Korak 3

## Ishod

Kanonski identitet sobe Online igrači povezan je sa aplikacijom. Source manifest i centralni registar imaju status `standardized`; završno zaključavanje ostaje za Korak 4. Stil, kvalitet, dimenzije, CSS motion i funkcionalnost liste nisu promenjeni.

Room `512×512` i menu `384×384` PNG ostaju bajt-po-bajt identični odobrenim isporukama iz Koraka 1/2. Ovo je migracija putanja jednog identiteta, ne nova ilustracija. High-resolution master i odbačeni izvor ostaju van `www`.

## Povezani potrošači

| Potrošač | Kanonska isporuka pod `www/assets/green-soft-clay/canonical/online-players-room-identity/` | Sačuvani prikaz |
|---|---|---|
| Main-menu kartica i startup | `online-players-room-menu-v1.png` | `384×384` PNG prikazan na `44×44`, postojeći wrapper `38×38`, card press `0,95→1` |
| Online Players icon-only intro | `online-players-room-v1.png` | `512×512` PNG, `clamp(210px, 34vmin, 290px)`, scale `1`, pulse `1,8 s`, soba `3,65 s`, overlay `4,6 s` |
| Zaglavlje sobe | `online-players-room-v1.png` | `32×32`, `contain` |
| SR/EN Pravila | `online-players-room-v1.png` | „Online igrači i interakcija” / „Online Players & Interaction” |
| Room-on-demand | `online-players-room-v1.png` | isti room znak uz zasebni state i tri akcije, bez menu PNG-a |

Room PNG ima četiri direktne pune UI reference: zaglavlje, intro, sobni katalog i Rules mapiranje. Menu PNG sada ima dve: main-menu karticu i eksplicitni startup fallback. Relativna room putanja u matcher-u je dodatno pravilo odabira, ne novi slikovni potrošač.

## Startup i sobna izolacija

U redovnom toku startup prikuplja menu sliku sa stvarne kartice. Precizan sobni matcher prepoznaje kanonski room PNG, ali ne menu izvedenicu. Sačuvani su prefiksi za state, add-friend, spectate i duel.

Pri proveri rezervnog toka potvrđeno je da samo dodavanje menu regex-a nije dovoljno: kada main-menu DOM nije dostupan, fallback čita `pack.assets`, a u njemu je sobna, ne menu isporuka. Zato Green pack dobija odvojeni `menuAssets` niz sa kanonskom Online Players menu slikom, a fallback razmatra i taj niz. `menuAssets` nije dodat u sobni `pack.assets` ili loading-gate `icons`.

Ova dopuna odnosi se na Online Players isporuku. Nije proširivan katalog drugih soba. Easter i Desert nemaju novi `menuAssets` niz i zadržavaju svoj prethodni fallback izbor. U uobičajenom DOM startup-u nema dodatnog učitavanja; rezultat se i dalje deduplikuje.

Online Players nije dodat u theme loading gate. Postojećih šest Green gate slika ostaje nepromenjeno.

## Registry, granice i cache

`onlinePlayersRoomIdentity` u `www/themes/green/asset-registry.json` beleži isti DNK kao source manifest, dve kanonske delivery uloge, otiske, tri zabranjene stare runtime putanje, master zamene i odbačeni kandidat. Status oba registra je `standardized`, sa final audit oznakom `pending step 4` u source manifestu.

Zasebni state, add-friend, spectate i duel PNG-ovi nisu precrtavani, preimenovani ili uklonjeni. Isti add-friend ostaje u pozivnici i Pravilima; isti spectate ostaje u gameplay zaglavlju, LIVE oznaci i Pravilima; duel ostaje u izazovima i odgovarajućim SR/EN stavkama. Rules Communication page scena je takođe sačuvana.

Živi online broj i presence tačka, profilne slike, statusi igrača, pretraga, refresh, paginacija, loading/empty prikazi, login i socket funkcije nisu menjani. `www/onlinenumber.js`, `www/teme.css` i `www/style.css` zadržavaju iste SHA-256 otiske. Motion je postojeći, uključujući reduced-motion, shell ulaz i loading-state pulse.

Green cache verzija povećana je `53→54` radi osvežavanja putanja. Ranije zaključane porodice zadržavaju svoje istorijske integracione verzije; Global Chat ostaje na svojoj istorijskoj `53`, iako je aktivna tema sada `54`.

## Uklonjene kopije i oporavak

Nakon prevezivanja i pretrage svih JS/HTML/CSS datoteka u `www` sa potvrdom nula starih UI referenci uklonjene su samo:

1. `www/assets/green-soft-clay/online-players-free-v2.png` — stara room isporuka (`154.856 B`);
2. `www/assets/green-soft-clay/runtime/menu/online-players-free-v2.png` — stara menu isporuka (`94.595 B`);
3. `www/assets/green-soft-clay/online-players-pro-v1.png` — neaktivna odbačena uramljena verzija (`249.836 B`).

Ukupno `499.287 B` privremenih/legacy kopija. Pre brisanja potvrđeni su tačni apsolutni ciljevi unutar Green asset foldera, fiksni otisci starih fajlova, identičnost zamena i Git praćenje. Sve tri kopije mogu se obnoviti iz Git istorije. Approved i rejected source PNG-ovi ostaju sačuvani.

Build skripta više ne zavisi od uklonjenih runtime datoteka: pravi room LANCZOS `1254→512` i menu `512→384`, proverava kodiranje u memoriji i fiksne otiske pre zapisa i proverava izlaze nakon zapisa. Uspešno je ponovljena posle uklanjanja kopija. Audit skripta čita kanonske isporuke i odbačeni izvor, pa takođe ostaje reproduktivna posle migracije.

## Bilans

- Green isporuka: `162 PNG / 14.792.994 B` (`14,11 MB`).
- Startup: `17 PNG / 4,56 MB / 20,44 MB decoded` — broj i budžet nisu porasli.
- Online Players room-on-demand: `5 PNG / 442.271 B / 3.407.872 decoded B`.
- Najveći Green room paket ostaje Riznica: `44 PNG / 2,94 MB / 13,70 MB decoded`.

U odnosu na stanje pre kanonskih kopija isporuka je manja za `249.836 B` neaktivne pro varijante. U odnosu na privremeno stanje Koraka 2 manja je za `499.287 B` tri uklonjene kopije. Dve aktivne slike zamenjene su kanonskim bez promene kvaliteta.

## Provere i sledeći korak

Performance provera štiti standardizaciju u oba registra, fiksne otiske, dimenzije/alpha, tačan broj kanonskih i nula legacy referenci, odsustvo tri stara fajla, sačuvane izdvojene slike, SR/EN veze, motion i startup/room razdvajanje.

Dodate su i izvršne provere stvarnih loading metoda iz `www/game.js` u izolovanom JS okruženju: startup sa malom DOM fixture-om, fallback bez DOM-a, tačan skup pet sobnih asseta i odsustvo Green curenja u Easter/Desert tokove. One ne pokreću celu aplikaciju, autentifikaciju, mrežu ili socket i nisu emulator test.

Upoređeno je 591 sačuvan fajl iz baseline-a: preostali Green runtime, Easter/Desert asseti i tri nepromenjena CSS/list-code fajla. Svi zadržavaju prethodne otiske; inventar je smanjen tačno za tri navedena fajla. Pregledana je osvežena statička audit tabla. Ponovljeni build, `npm test` sa svih devet projektnih provera i `git diff --check` prolaze.

Korak 3 je završen. Korak 4 je završni vizuelni, semantički i tehnički audit i tek potom prelazak porodice u `locked`. Nije rađen commit, objavljivanje niti pregled u Android emulatoru.
