# Green Asset Standardization — Tournament Navigation, Korak 1

## Opseg

Sledeća porodica za standardizaciju je `Tournament Navigation`. Ovaj korak je inventar, vizuelna i semantička dijagnoza; nijedan runtime asset, tab, turnirski podatak, akcija ili UI tok nije promenjen.

Porodica sadrži tri Green navigaciona identiteta:

| ID | Značenje | Source master | Aktivni runtime |
|---|---|---:|---:|
| `tab-info` | informacije i pravila aktuelnog turnira | 1254 × 1254 | 256 × 256 |
| `tab-bracket` | turnirski kostur i mečevi | 1230 × 1278 | 246 × 256 |
| `tab-hall-of-fame` | istorija turnira i osvajači | 1254 × 1254 | 256 × 256 |

## Vizuelni nalaz

Sva tri postojeća glyph-a kvalitetno prate Green Room Pack DNK:

- `tab-info` — ivory slovo `i` unutar forest-green kružnog oboda sa terracotta donjom tačkom;
- `tab-bracket` — simetrični turnirski kostur sa ivory učesnicima, forest-green vezama i centralnom terracotta zvezdom;
- `tab-hall-of-fame` — ivory istorijski zapis/svitak sa forest-green linijama i terracotta pečatom.

Dele matirani 3D Soft Clay Neumorphism materijal, forest-green / warm-ivory / terracotta paletu, transparentnu pozadinu, centralno poravnanje i kontrolisanu dubinu. Siluete su jasne i pri stvarnom prikazu od `38 × 38` CSS piksela.

Nije potreban novi ImageGen render. Postojeći high-resolution source asseti su odgovarajući canonical izvori.

## Uočena tehnička nedoslednost

`tab-info` i `tab-hall-of-fame` imaju kvadratne `256 × 256` runtime fajlove. `tab-bracket` ima `246 × 256`, zato što je izvorni master blago viši od širine i dosadašnji thumbnail proces čuva odnos stranica bez kvadratnog canvasa.

To ne pravi vidljiv problem jer UI koristi `object-fit: contain`, ali remeti standard porodice. Odluka za canonical paket je:

- sva tri runtime asseta imaju canvas `256 × 256`;
- bracket glyph zadržava postojeći odnos stranica i približno `246 × 256` vidljivi sadržaj;
- dodatni prostor je transparentan i simetrično raspoređen levo/desno;
- nema rastezanja, crop-a ili promene kompozicije.

## Aktivni potrošači

Audit je pronašao sledeće Green veze:

- Info dugme direktno koristi `tab-info`;
- Kostur dugme direktno koristi `tab-bracket`;
- Slavni / Dvorana slavnih dugme direktno koristi `tab-hall-of-fame`;
- sadržaj Pravila ponovo koristi Tournament Hall of Fame identitet uz odgovarajući naslov;
- Tournament room-on-demand paket sadrži po jednu eksplicitnu putanju za sva tri taba.

Svaki od tri ID-ja trenutno ima samo jednu semantičku ulogu. Rules prikaz ne uvodi novi identitet, već ponavlja isti Hall of Fame pojam.

## Semantička granica

Turnir mora ostati podeljen na zasebne porodice. U `Tournament Navigation` ne ulaze:

- šest Tournament action/state ikona: register, unregister, registration locked, start, match active i match complete;
- Tournament finalist nagrada;
- glavni Tournament logo, intro i winner trofej;
- Quarterly League navigacioni tabovi;
- Quarterly League rank bedževi i podium medalje;
- Treasury navigacioni tabovi, Collection medalje i achievement trofeji;
- Statistics aggregate trophies simbol;
- winner i victory-state oznake;
- dukati i potrošni tokeni.

Tournament Hall of Fame svitak ostaje poseban od Quarterly League Hall of Fame građevine. Oba vode ka istorijskim podacima, ali pripadaju različitim sobama i ne smeju deliti PNG identitet.

## Tehnički nalaz

- sva tri high-resolution source fajla postoje i imaju direktan alpha kanal;
- dva source mastera su `1254 × 1254`, bracket izvor je `1230 × 1278`;
- sva tri aktivna runtime fajla postoje i imaju direktan alpha kanal;
- runtime sadržaji imaju tri jedinstvena SHA-256 otiska;
- tabovi se prikazuju na `38 × 38` CSS px, pa je 256 px canonical canvas više nego dovoljan;
- nijedna od tri ikone ne pripada startup paketu;
- sve se učitavaju tek kroz Tournament room tok.

## Odluka za Korak 2

U sledećem koraku treba:

1. napraviti `source-assets/green-soft-clay-canonical/tournament-navigation` paket;
2. sačuvati sva tri odobrena high-resolution source asseta bez vizuelne izmene;
3. izvesti tri `256 × 256` canonical runtime PNG fajla;
4. za bracket koristiti providni kvadratni canvas bez rastezanja ili crop-a;
5. potvrditi da su Info i Hall of Fame bajt-po-bajt identični aktivnim runtime fajlovima;
6. vizuelno potvrditi da normalizovani bracket zadržava isti glyph;
7. napraviti manifest sa semantikom, dimenzijama i SHA-256 otiscima;
8. ostaviti aktivne putanje netaknute do integracionog Koraka 3.

Audit list: `docs/green-asset-standardization-tournament-navigation-audit.png`.

Nije rađen commit niti objavljivanje.
