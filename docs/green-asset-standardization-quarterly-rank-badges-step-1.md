# Green Asset Standardization — Quarterly League Rank Badges, Korak 1

## Opseg

Sledeća porodica za standardizaciju je `Quarterly League Rank Badges`. Ovaj korak je inventar, vizuelna i semantička dijagnoza; nijedan runtime asset, rang, prag bodova, podatak lige ili UI tok nije promenjen.

Porodica sadrži šest Green bedževa:

| ID | Značenje | Master | Runtime |
|---|---|---:|---:|
| `amater` | početni sezonski rang, 0–4.999 bodova | 512 × 512 | 384 × 384 |
| `profi` | drugi sezonski rang, 5.000–14.999 | 512 × 512 | 384 × 384 |
| `majstor` | treći sezonski rang, 15.000–49.999 | 512 × 512 | 384 × 384 |
| `legenda` | četvrti sezonski rang, 50.000–99.999 | 512 × 512 | 384 × 384 |
| `titan` | najviši sezonski rang, 100.000+ | 512 × 512 | 384 × 384 |
| `alltime` | rang liste Sva vremena / Hall of Fame | 512 × 512 | 384 × 384 |

## Vizuelni nalaz

Svih šest postojećih asseta već formira kvalitetnu i prepoznatljivu porodicu Green Room Pack-a:

- zajednički forest-green, warm-ivory i terracotta Soft Clay DNK;
- transparentna pozadina bez kartice i teksta;
- jasno centralno poravnanje i čitljiva silueta;
- kontrolisano povećavanje vizuelnog autoriteta kroz rangove;
- dovoljne međusobne razlike i pri malom prikazu.

Hijerarhija je logična:

1. `amater` — štit sa mladicom;
2. `profi` — štit sa dvostrukim činom;
3. `majstor` — romb sa krunom;
4. `legenda` — lovor i zvezda;
5. `titan` — krilata kruna;
6. `alltime` — kruna, lovor i znak beskonačnosti.

Nije potreban novi ImageGen render. Postojeći 512 px masteri biće kanonski izvori, a sadašnje 384 px izvedenice vizuelno su odgovarajuće za mobilni prikaz.

## Aktivni potrošači

Audit je pronašao sledeće Green veze:

- dinamički resolver `getRankBadgeSource(rankId)` u Kvartalnoj ligi;
- preload svih šest bedževa pri otvaranju ligaškog toka;
- bedž u naslovu svakog od šest carousel rangova;
- bedž trenutnog ranga korisnika;
- eksplicitnih šest putanja u Quarterly League room-on-demand paketu.

Isti ID se trenutno rešava kroz isti PNG na svim aktivnim površinama. U narednim koracima to mapiranje treba premestiti u canonical paket i zaključati proverom.

## Semantička granica

U porodicu ne ulaze:

- `tab-medals`, `tab-league`, `tab-hall-of-fame` i `tab-champions` navigacioni glyph-ovi;
- Quarterly League podium medalje za osvojeno mesto;
- General Podium medalje;
- Treasury Collection medalje;
- Tournament finalist nagrada;
- Treasury achievement trofeji;
- zbirni Statistics trophies simbol;
- winner i victory-state oznake;
- intro i glavni Quarterly League logo;
- dukati i potrošni tokeni.

Rang označava ligaški nivo igrača. Medalja označava takmičarski plasman, tab glyph navigaciju, a winner simbol ishod jedne partije; te uloge se ne smeju mešati iako pojedini asseti koriste zvezdu, krunu ili lovor.

## Tehnički nalaz

- svih šest mastera postoji u `source-assets/green-soft-clay-hires/ql`;
- svih šest mastera je `512 × 512`, RGBA;
- svih šest runtime fajlova postoji u `www/assets/green-soft-clay/ql`;
- svih šest runtime fajlova je `384 × 384`, RGBA;
- master i runtime fajlovi imaju jedinstvene SHA-256 otiske;
- nema međusobno dupliranog sadržaja;
- asseti se učitavaju kroz Quarterly League tok, a ne kroz startup paket.

## Odluka za Korak 2

U sledećem koraku treba:

1. napraviti `source-assets/green-soft-clay-canonical/quarterly-rank-badges` paket;
2. sačuvati šest 512 px mastera bez vizuelne izmene;
3. izvesti šest 384 px canonical runtime asseta;
4. napraviti manifest sa ID, značenjem, pragom, master/runtime SHA-256 otiscima i semantičkim izuzecima;
5. ostaviti postojeći kod i stare runtime putanje netaknute do integracionog Koraka 3.

Audit list: `docs/green-asset-standardization-quarterly-rank-badges-audit.png`.

Nije rađen commit niti objavljivanje.
