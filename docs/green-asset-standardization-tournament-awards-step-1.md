# Green Asset Standardization — Tournament Awards, Korak 1

## Opseg

Sledeća porodica za standardizaciju je `Tournament Awards`. Ovaj korak je inventar, vizuelna i semantička dijagnoza; nijedan runtime asset, intro, nagrada, turnirski podatak ili UI tok nije promenjen.

Porodica obuhvata dva Green identiteta koji su namerno ostali izvan zaključanih Tournament Navigation i Tournament States porodica.

## Kandidati u porodici

| Predloženi ID | Trenutni asset | Semantička uloga | Glavna silueta |
|---|---|---|---|
| `champion-trophy` | `tournament-free-v2.png` | zvanični identitet Turnira i počast šampionu | forest-green dvokraki pehar sa ivory ručkama i zvezdom, uz terracotta prsten |
| `finalist-silver` | `tournament/finalist-silver-v1.png` | počast finalisti / drugoplasiranom | srebrni medaljon sa ivory zvezdom, forest-green trakama i terracotta kopčom |

## Zaključak o dvostrukoj ulozi šampionskog pehara

`champion-trophy` se koristi i kao glavni identitet Tournament sobe i kao stvarna nagrada pobedniku. Ova ponovna upotreba je semantički opravdana: isti zvanični turnirski pehar identifikuje takmičenje, njegove osvajače i konkretnog šampiona.

To ne znači da pehar postaje generička oznaka svake pobede. Hotseat winner, Online winner, achievement trofeji, podium medalje i Quarterly League champion glyph ostaju zasebne porodice.

## Trenutni potrošači

### `champion-trophy`

Aktivni `512 × 512` asset koristi se na dvanaest mesta:

- Tournament intro mark;
- Tournament header;
- intro broj osvojenih turnira;
- Hall of Fame naslov i istorijske championship kartice;
- registration panel;
- finalna runda i pobednik finala;
- champion reward modal;
- završna award ceremony;
- Tournament sadržaj Pravila;
- Tournament room-on-demand paket.

Glavni meni koristi zasebnu optimizovanu `384 × 384` kopiju istog identiteta iz `runtime/menu/`.

### `finalist-silver`

Aktivni `384 × 384` asset koristi se na četiri mesta:

- finalist oznaka uz rezultat finala;
- runner-up reward modal;
- završna award ceremony za finalistu;
- Tournament room-on-demand paket.

## Tehnički inventar

| Identitet | Master | Aktivni runtime | Startup izvedenica | Alpha | Runtime SHA-256 |
|---|---:|---:|---:|---|---|
| `champion-trophy` | `1254 × 1254` | `512 × 512` | `384 × 384` | RGBA | `bf7216e839c742c625f502dc92a5a2720d438ef96c95d28990ee68b482fce801` |
| `finalist-silver` | `1254 × 1254` | `384 × 384` | — | RGBA | `6973e93ce0f8f652103f3d0123ce803721c37cc714eaf818c30488dbaad75daa` |

Champion master SHA-256 je `d0f6d9677e46f725c5b5cefca8d0650380348896918a0b09121ebe349abbbc4d`. Postojeća startup izvedenica ima SHA-256 `2a0cdbd77a321ce9964213a91087c8c2375660bb94ad4e4da9cd75588ccf01f5`.

Finalist master SHA-256 je `c9645d2c524275bcf3ebdbf2f380bce60c02b88f64d3ece47647553a04ee46e2`.

## Vizuelni zaključak

Nije potreban novi render. Oba postojeća asseta su kvalitetna i pripadaju odobrenom Green Soft Clay DNK-u:

- koriste forest-green, warm-ivory, terracotta i kontrolisani silver materijal;
- površine su matirane i glinene;
- imaju čiste transparentne ivice i čitljive siluete;
- nemaju zasebnu kvadratnu UI karticu;
- champion i finalist se trenutno jasno razlikuju peharom naspram medaljona.

Finalist medalja je vizuelno najbliža Treasury Collection Silver medalji, jer obe koriste zvezdu i zelene trake. Zato njihov identitet mora ostati zaključan kroz različitu konstrukciju:

- finalist: pun silver obod i lice, jednostavne pune zelene trake;
- collection silver: ivory spoljašnji obod, tamnije silver lice i prugaste trake sa ivory umetkom.

## Semantičke granice

Sledeći asseti ne pripadaju Tournament Awards porodici:

- General Podium gold/silver/bronze medalje;
- Quarterly League Podium medalje;
- Treasury Collection medalje;
- svih 26 achievement trofeja;
- Tournament Navigation glyph-i;
- Tournament Action & Match States;
- Quarterly League Navigation i Champions marker;
- Quarterly League rank bedževi;
- Hotseat, Online i generičke winner oznake;
- dukati, Undo tokeni i rewarded-video simboli.

Finalist srebro nije drugo mesto na generičkoj Top listi niti Treasury kolekcija. Ono označava isključivo finalist status u konkretnom Tournament toku i povraćaj finalnog uloga.

## Predlog standarda

Canonical paket treba da zadrži oba postojeća vizuelna identiteta i high-resolution mastere, uz:

1. `champion-trophy` kao jedan zvanični Tournament identitet za branding i šampionsku počast;
2. `finalist-silver` kao zasebnu finalist počast;
3. canonical champion runtime od `384 × 384`, dovoljan za najveći prikaz od približno 290 CSS piksela;
4. canonical finalist runtime od `256 × 256`, dovoljan za najveći prikaz od približno 92 CSS piksela;
5. uklanjanje duple startup kopije tako što će isti canonical champion asset biti eksplicitno učitan na startup-u i korišćen u sobi;
6. jednu canonical putanju po identitetu kroz meni, intro, Tournament ekran, Pravila, rezultate i ceremony;
7. zabranu zamene sa podium, collection, achievement, navigation, state, rank ili generic-winner assetima.

## Sledeći korak

Korak 2 je izrada canonical `tournament-awards` paketa iz postojećih odobrenih mastera, sa `384 × 384` champion i `256 × 256` finalist runtime izvedenicom, manifestom i kontrolom startup/room granice.

Nije rađen commit niti objavljivanje.
