# Green Asset Standardization — Tournament Navigation, Korak 2

## Ishod

Formiran je kompletan canonical `tournament-navigation` paket sa sva tri odobrena Green navigaciona identiteta. Nije korišćen ImageGen i nijedan glyph nije redizajniran.

Paket trenutno ima status `canonical`. Aktivne veze ostaju na postojećim `tournament/tab-*` putanjama do Koraka 3, kada će tabovi, Rules Hall of Fame referenca i room-on-demand paket biti kontrolisano prebačeni na canonical namespace.

## Canonical katalog

| ID | Semantička uloga | Glyph | Canonical runtime |
|---|---|---|---:|
| `tab-info` | informacije i pravila turnira | information mark u kružnom obodu | 256 × 256 |
| `tab-bracket` | turnirski kostur i mečevi | simetrični osmočlani bracket | 256 × 256 |
| `tab-hall-of-fame` | istorija turnira i osvajači | istorijski svitak sa pečatom | 256 × 256 |

## Canonical master paket

Direktorijum:

`source-assets/green-soft-clay-canonical/tournament-navigation/`

- sadrži tri eksplicitno imenovana mastera;
- Info i Hall of Fame masteri su `1254 × 1254` RGBA;
- Bracket master je `1230 × 1278` RGBA;
- svi masteri su bajt-po-bajt kopije odobrenih Green source asseta;
- svaki master ima zaseban SHA-256 otisak u manifestu.

## Canonical runtime paket

Direktorijum:

`www/assets/green-soft-clay/canonical/tournament-navigation/`

- sadrži tri runtime PNG fajla;
- sva tri koriste `256 × 256` transparentni canvas;
- `tab-info` i `tab-hall-of-fame` bajt-po-bajt su identični aktivnim runtime fajlovima;
- sva tri canonical sadržaja imaju različite SHA-256 otiske.

### Normalizacija `tab-bracket`

Aktivni bracket runtime ima `246 × 256`. Canonical fajl koristi providni `256 × 256` canvas:

- originalnih `246 × 256` RGBA piksela preneto je bez izmene;
- glyph je pomeren na `x = 5`, `y = 0`;
- levo i desno ostaje po 5 providnih piksela;
- nema rastezanja, crop-a, novog resamplinga niti promene osvetljenja;
- canonical fajl je 35.866 bajtova, 74 bajta manji od aktivne kopije.

Vizuelna kontrola potvrđuje potpuno isti prikaz kroz postojeći `object-fit: contain` i tab dimenziju od `38 × 38` CSS piksela.

## Reproducibilan build

`scripts/build-green-canonical-tournament-navigation-pack.py`:

1. koristi eksplicitnu listu tri dozvoljena ID-ja;
2. zahteva prisustvo svakog odobrenog source mastera i aktivnog runtime asseta;
3. kopira mastere bez izmene sadržaja;
4. prenosi odobrene runtime piksele bez resamplinga;
5. kvadratne assete kopira bajt-po-bajt;
6. nekvadratni bracket centrira na providni `256 × 256` canvas;
7. prekida build ako aktivni sadržaj prelazi dozvoljenu dimenziju.

## Source manifest

`source-assets/green-soft-clay-canonical/tournament-navigation/manifest.json` evidentira:

- `canonical` status;
- tri jedinstvena navigaciona ID-ja;
- semantičku ulogu, glyph i potrošače svakog ID-ja;
- master, canonical runtime i trenutno aktivnu putanju;
- sve master, runtime i aktivne dimenzije;
- sve SHA-256 otiske;
- precizno pravilo normalizacije bracket canvasa;
- zajednički Green Soft Clay DNK i semantičke granice.

## Automatska kontrola

`check-theme-performance.js` sada proverava:

- `canonical` status paketa;
- tačan skup tri ID-ja;
- postojanje svih master, canonical runtime i aktivnih runtime fajlova;
- manifestom evidentirane master i aktivne dimenzije;
- `256 × 256` canonical runtime canvas;
- direktan alpha kanal svih fajlova;
- canonical konvenciju imena;
- sadržaj svih SHA-256 otisaka;
- bajt-po-bajt identitet Info i Hall of Fame izvedenica;
- precizno evidentiranu bracket normalizaciju;
- odsustvo dupliranog canonical sadržaja;
- po jednu aktivnu tab i room vezu za svaki ID;
- Rules Hall of Fame vezu;
- semantičku izolaciju od state, finalist, QL, Treasury, trophy i winner porodica.

## Privremeni performance bilans

Dok zajedno postoje aktivne i canonical runtime kopije:

- Green tema: `176 PNG`, ukupno `16,93 MB`;
- startup paket: nepromenjen, `17 PNG` / `4,56 MB`;
- najveći aktivni Green room paket ostaje Riznica, `44 PNG` / `2,94 MB`.

Canonical kopije još nisu povezane i ne ulaze u startup niti aktivni Tournament room paket. Nakon Koraka 3 tri stare runtime kopije biće uklonjene, pa se broj Green PNG fajlova vraća na 173.

## Van opsega Koraka 2

- menjanje tab putanja u `turnir.js`;
- menjanje Tournament Hall of Fame reference u Pravilima;
- promena Tournament room-on-demand liste;
- brisanje starih `tournament/tab-*` runtime kopija;
- registracija porodice kao `standardized` ili `locked`;
- promena tab akcija, state ikona, finalist nagrade, podataka turnira ili UI geometrije.

Nije rađen commit niti objavljivanje.
