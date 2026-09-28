# Green Asset Standardization — Tournament Action & Match States, Korak 2

## Ishod

Formiran je kompletan canonical `tournament-states` paket sa svih šest odobrenih Green identiteta. Nije korišćen ImageGen i nijedan glyph nije redizajniran.

Paket trenutno ima status `canonical`. Aktivne veze ostaju na postojećim `tournament/state-*` putanjama do Koraka 3, kada će Tournament ekran, odgovarajuća referenca u Pravilima i room-on-demand paket biti kontrolisano prebačeni na canonical namespace.

## Canonical podgrupe

### Registration actions

| ID | Semantička uloga | Glyph | Canonical runtime |
|---|---|---|---:|
| `state-register` | ulazak u prijavu za Turnir | ulaznica sa check oznakom | 256 × 256 |
| `state-unregister` | povlačenje prijave | ulaznica sa povratnom strelicom | 256 × 256 |
| `state-registration-locked` | prijava nije dostupna | ulaznica sa katancem | 256 × 256 |

### Flow states

| ID | Semantička uloga | Glyph | Canonical runtime |
|---|---|---|---:|
| `state-start` | Turnir počinje ili je aktivan | play trougao u kružnom prstenu | 256 × 256 |
| `state-match-active` | meč je dostupan za pokretanje | povezane kockice sa terracotta akcentom | 256 × 256 |
| `state-match-complete` | meč ima završen rezultat | medaljon sa check oznakom | 256 × 256 |

## Canonical master paket

Direktorijum:

`source-assets/green-soft-clay-canonical/tournament-states/`

- `registration-actions/` sadrži tri mastera ticket podgrupe;
- `flow-states/` sadrži tri mastera toka Turnira;
- svih šest mastera su bajt-po-bajt kopije odobrenih Green high-resolution source asseta;
- originalne rezolucije od `1247 × 1261` do `1536 × 1024` ostaju sačuvane;
- svaki master ima zaseban SHA-256 otisak u manifestu.

## Canonical runtime paket

Direktorijum:

`www/assets/green-soft-clay/canonical/tournament-states/`

- sadrži šest runtime PNG fajlova;
- svaki fajl koristi transparentni `256 × 256` canvas;
- svaki glyph je izveden direktno iz svog odobrenog high-resolution mastera;
- zadržane su originalne proporcije, paleta, osvetljenje i glinena dubina;
- nema kropovanja, rastezanja, promene kompozicije niti dodavanja nove podloge;
- svih šest canonical sadržaja imaju različite SHA-256 otiske.

## Normalizacija canvasa

### `state-register`

Pejzažni master `1536 × 1024` proporcionalno je sveden na `256 × 171` i centriran na `x = 0`, `y = 42` unutar transparentnog `256 × 256` canvasa. Ticket ostaje pejzažan, kao u odobrenom prikazu.

### `state-registration-locked`

Master `1247 × 1261` proporcionalno je sveden na `253 × 256` i centriran na `x = 1`, `y = 0`. Nije rastegnut do pune širine.

### Preostala četiri asseta

Kvadratni masteri proporcionalno su svedeni na punih `256 × 256`. Njihov odnos stranica i kompozicija nisu menjani.

Vizuelna kontrola svih šest canonical rendera potvrđuje čist alpha obod, punu siluetu i čitljivost pri stvarnim prikazima od približno 18–38 CSS piksela.

## Reproducibilan build

`scripts/build-green-canonical-tournament-states-pack.py`:

1. koristi eksplicitne liste tri `registration-actions` i tri `flow-states` ID-ja;
2. zahteva prisustvo svakog odobrenog source mastera i aktivnog runtime asseta;
3. kopira mastere bez izmene sadržaja;
4. pravi runtime direktno iz high-resolution mastera LANCZOS redukcijom;
5. čuva odnos stranica i centrira glyph na transparentni `256 × 256` canvas;
6. ispisuje master, aktivne, sadržajne i konačne dimenzije sa offsetom.

## Source manifest

`source-assets/green-soft-clay-canonical/tournament-states/manifest.json` evidentira:

- `canonical` status;
- dve eksplicitne podgrupe;
- šest jedinstvenih action/state ID-ja;
- semantičku ulogu, glyph i potrošače svakog ID-ja;
- master, canonical runtime i trenutno aktivnu putanju;
- master, aktivne, sadržajne i canonical dimenzije;
- sadržajni offset na transparentnom canvasu;
- sve SHA-256 otiske i precizno pravilo normalizacije;
- zajednički Green Soft Clay DNK i semantičke granice.

## Automatska kontrola

`check-theme-performance.js` sada proverava:

- `canonical` status paketa;
- tačne `registrationActions` i `flowStates` podgrupe;
- tačan skup šest ID-ja i jedinstvenost sadržaja;
- postojanje svih master, canonical i aktivnih runtime fajlova;
- evidentirane master, aktivne, sadržajne i canonical dimenzije;
- `256 × 256` canonical canvas i direktan alpha kanal;
- canonical konvenciju imena i sve SHA-256 otiske;
- preciznu canvas normalizaciju svakog glyph-a;
- postojeće Tournament, Rules i room-on-demand veze pre integracije;
- semantičku izolaciju od Navigation, finalist, Treasury, Daily, Invite, Undo, rewarded-video i winner porodica;
- kompletan plan integracije za Korak 3.

## Privremeni performance bilans

Dok zajedno postoje aktivne i canonical runtime kopije:

- Green tema: `179 PNG`, ukupno `17,09 MB`;
- startup paket: nepromenjen, `17 PNG`, `4,56 MB` kompresovano / `20,44 MB` dekodirano;
- najveći aktivni Green room paket ostaje Riznica, `44 PNG`, `2,94 MB` kompresovano / `13,70 MB` dekodirano;
- šest canonical fajlova zajedno ima `287.625` bajtova;
- šest postojećih aktivnih kopija zajedno ima `956.402` bajta.

Nakon Koraka 3 i uklanjanja starih runtime kopija očekivana ušteda je `668.777` bajtova kompresovano i približno `4,15 MB` dekodirane memorije. Broj Green PNG fajlova vraća se na `173`.

## Van opsega Koraka 2

- menjanje action/state putanja u `turnir.js`;
- menjanje Tournament Start reference u Pravilima;
- promena Tournament room-on-demand liste;
- brisanje starih `tournament/state-*` runtime kopija;
- dodavanje porodice u centralni registry;
- registracija porodice kao `standardized` ili `locked`;
- promena turnirskih akcija, state logike, podataka, motion ponašanja ili UI geometrije.

## Sledeći korak

Korak 3 je povezivanje svih potrošača na canonical putanje, registracija porodice kao `standardized`, uključivanje namespace-a u Tournament room matcher i uklanjanje šest starih runtime kopija nakon provere da nema aktivnih legacy referenci.

Nije rađen commit niti objavljivanje.
