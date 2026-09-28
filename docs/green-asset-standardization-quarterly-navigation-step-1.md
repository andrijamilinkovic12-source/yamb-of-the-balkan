# Green Asset Standardization — Quarterly League Navigation, Korak 1

## Opseg

Sledeća porodica za standardizaciju je `Quarterly League Navigation`. Ovaj korak je inventar, vizuelna i semantička dijagnoza; nijedan runtime asset, tab, prikaz lige, podatak ili UI tok nije promenjen.

Porodica sadrži četiri Green navigaciona identiteta:

| ID | Značenje | Master | Aktivni runtime |
|---|---|---:|---:|
| `tab-league` | glavni pregled živih ligaških rang-lista | 512 × 512 | 256 × 256 |
| `tab-hall-of-fame` | Dvorana slavnih i istorijski pregled | 512 × 512 | 256 × 256 |
| `tab-medals` | arhiva osvojenih Quarterly League medalja | 512 × 512 | 256 × 256 |
| `tab-champions` | arhiva šampiona i oznaka šampiona | 512 × 512 | 384 × 384 |

## Vizuelni nalaz

Sva četiri postojeća asseta čine kvalitetnu i međusobno jasnu Green Room Pack porodicu:

- `tab-league` — rastući stubići sa ivory zvezdom;
- `tab-hall-of-fame` — ceremonijalna građevina sa terracotta zvezdom;
- `tab-medals` — gold, silver i bronze trio sa QL trakom;
- `tab-champions` — ivory kruna unutar forest-green lovora.

Dele matirani 3D Soft Clay Neumorphism materijal, forest-green / warm-ivory / terracotta paletu, transparentnu pozadinu i centralno poravnanje. Siluete su čitljive i pri postojećem prikazu od 28–30 CSS piksela.

Nije potreban novi ImageGen render. Postojeći 512 px masteri su odgovarajući canonical izvori.

## Uočena tehnička nedoslednost

Tri aktivna runtime asseta imaju `256 × 256`, dok `tab-champions` ima `384 × 384`. To nije vizuelno opravdano postojećim UI prikazom:

- tab ikone se prikazuju na `28 × 28` CSS px;
- champion marker se prikazuje približno na `30 × 30` CSS px;
- transparentni 256 px PNG ostavlja više nego dovoljan raster rezervni kvalitet i za uređaje visoke gustine.

Odluka za canonical paket je da sva četiri runtime asseta budu ujednačena na `256 × 256`. Sam glyph, proporcije, transparentnost, osvetljenje i boje ostaju nepromenjeni; menja se samo optimizovana runtime dimenzija `tab-champions` izvedenice.

## Aktivni potrošači

Audit je pronašao sledeće Green veze:

- `getMainTabIcon('league')` koristi `tab-league`;
- `getMainTabIcon('hof')` koristi `tab-hall-of-fame`;
- podtab Medalje koristi `tab-medals`;
- podtab Šampioni koristi `tab-champions`;
- champion marker na šampionskoj kartici namerno ponovo koristi isti `tab-champions` identitet;
- Quarterly League room-on-demand paket sadrži četiri eksplicitne putanje.

Ponovna upotreba `tab-champions` na markeru je prihvatljiva: oba mesta označavaju isti pojam šampiona. To nije generička winner oznaka jedne partije.

## Semantička granica

U porodicu ne ulaze:

- Quarterly League rank bedževi, uključujući `alltime`;
- Quarterly League podium medalje;
- General Podium medalje;
- Tournament Hall of Fame tab i ostale Tournament kontrole;
- Treasury navigacioni tabovi;
- Treasury Collection medalje i achievement trofeji;
- zbirni Statistics trophies simbol;
- Tournament finalist nagrada;
- winner i victory-state oznake;
- glavni Quarterly League logo i intro asset;
- dukati i potrošni tokeni.

Navigacioni glyph bira sadržaj sobe. Rank bedž označava nivo igrača, podium medalja plasman, trofej dostignuće, a winner simbol ishod jedne partije. Zajednički motiv zvezde, krune ili medalje ne spaja te semantike.

## Tehnički nalaz

- sva četiri mastera postoje u `source-assets/green-soft-clay-hires/ql`;
- sva četiri mastera su `512 × 512`, RGBA;
- sva četiri aktivna runtime fajla postoje i imaju direktan alpha kanal;
- svi master i runtime fajlovi imaju jedinstven sadržaj;
- tri runtime fajla već su optimalnih `256 × 256`;
- `tab-champions` je jedini kandidat za mehaničku optimizaciju na 256 px;
- nijedna od četiri ikone ne pripada startup paketu.

## Odluka za Korak 2

U sledećem koraku treba:

1. napraviti `source-assets/green-soft-clay-canonical/quarterly-navigation` paket;
2. sačuvati četiri 512 px mastera bez vizuelne izmene;
3. izvesti četiri ujednačena `256 × 256` canonical runtime asseta;
4. potvrditi da su prva tri bajt-po-bajt identična aktivnim runtime fajlovima;
5. vizuelno potvrditi da optimizovani `tab-champions` zadržava isti izgled;
6. napraviti manifest sa master/runtime SHA-256 otiscima i semantičkim granicama;
7. ostaviti aktivne putanje netaknute do integracionog Koraka 3.

Audit list: `docs/green-asset-standardization-quarterly-navigation-audit.png`.

Nije rađen commit niti objavljivanje.
