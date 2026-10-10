# Provera kockica u temama — 9. oktobar 2026.

## Obavezno pravilo

Pravilo je u `docs/theme-definitions.json` (`diceFaceRules`). Standardna kockica ima naspramne parove 1–6, 2–5 i 3–4. Svaka trojka vidljivih strana mora biti stvarna rotacija jedne kockice. Tačke imaju propisan raspored za 1–6. Pravilo važi za svih deset tema i svaki prikaz kockice, čak i kada je ona samo mali detalj u trofeju ili ilustraciji. Pet tačaka dukata označava valutu i nije kockica.

## Pregled

Pregledani su aktivni PNG-ovi glavnih soba, ostalih ikona paketa, ekranâ Riznice, dostupnih trofeja, ilustracija pravila i vidljivi runtime prikazi u svih deset tema. Provereni su i CSS/JS raspored tačaka na kockicama tokom igre i dnevnog izazova. Nisu menjane teme bez potvrđene greške. Trofeji Severne Magline još nisu izrađeni u redovnom nizu; isti uslov će važiti pri njihovoj izradi.

| Tema | Zamenjeni motivi | Razlog |
| --- | --- | --- |
| Zelena | Snajper, Krompiruša, ilustracija „Multiplayer i takmičenja” | ponovljene/suprotne strane i nepravilan raspored četiri tačke |
| Svetlo Zlato | Za dlaku, Prvo bacanje | susedne strane 2 i 5 |
| Trula Višnja | Božanstvo, Hazarder, Neuništiv | susedne suprotne strane ili ponovljena vrednost |
| Neon Cyber | Prvo bacanje | nečitljiva gornja strana i nejasna tačka |
| Pustinjsko Staklo | Prvo bacanje | susedne strane 2 i 5 |
| Mesečev Sjaj | Prvo bacanje, Božanstvo, Armirani beton | susedne strane 2 i 5; beton je imao rupice nalik neispravnoj kockici |

Ukupno je zamenjeno 13 aktivnih PNG-ova. Kod kockica u ispravljenim motivima vidljive su strane **1 gore / 2 napred / 3 desno**. Kod „Armiranog betona” blokovi su sada glatki i nedvosmisleno nisu kockice. Pregled produkcionih slika je u `docs/dice-face-corrections-review.png`, a njihove SHA-256 vrednosti i vizuelno potvrđen raspored u `docs/dice-face-corrections.json`.

Novi masteri su zasebne verzije. Postojeći produkcioni slotovi zadržavaju standardno ime `-v1.png`, uz osvežen `?v=2` samo za ispravljene potrošače. Manifesti, Green registar i mapa implementacije pokazuju nove mastere i bajtove. Stari masteri ostaju kao istorija, ali nisu izvor pri narednom pokretanju import skripti.

## Kontrola

- `node scripts/check-theme-dice-faces.js` — proverava pravilo, 13 otisaka PNG-a, dimenzije, povezivanje i CSS/JS raspored tačaka.
- `node scripts/check-{moon,desert,light,medium,neon}-achievement-trophies.js` — svih pet tematskih provera prolazi pojedinačno.
- `scripts/build-green-canonical-achievement-trophies-pack.py` i `scripts/build-green-canonical-rules-page-illustrations-pack.py` ponovo generišu iste ispravljene Green produkcione datoteke.

Širi `scripts/check-theme-performance.js` trenutno se prekida na ranijoj, nepovezanoj proveri teksta Vaskršnjeg Riznica intra, pre nego što stigne do novih provera kockica.
