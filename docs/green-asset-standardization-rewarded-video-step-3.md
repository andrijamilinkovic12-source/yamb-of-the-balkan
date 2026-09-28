# Green Asset Standardization — Rewarded Video, Korak 3

## Ishod

Tri sobne kompozicije precizno su prerenderovane tako da koriste isti kanonski Green Rewarded Video ticket iz Koraka 2. Vizuelni identitet nagrade nije menjan: svaka kompozicija i dalje koristi kanonske Green dukate sa ivory obodom, terracotta licem i tačno pet forest-green tačaka.

Porodica `rewardedVideo` u centralnom Green registru sada ima status `standardized`.

## ImageGen obrada

Korišćen je ugrađeni ImageGen režim `precise-object-edit`, odvojeno za svaku kompoziciju, sa transparentnom pozadinom.

Svaki render dobio je tri reference:

- odgovarajući postojeći high-resolution `v2` target;
- `green-rewarded-video-active-master-v1.png` kao zaključani video identitet;
- `green-ducat-front-master-v1.png` kao zaključani identitet valute.

Prompt je ograničio izmenu samo na video simbol, uz očuvanje kompozicije, osvetljenja, Soft Clay Neumorphism materijala i tačnog broja dukata.

## Novi high-resolution masteri

| Soba | Zaključana nagrada | Master |
|---|---:|---|
| Dnevni izazov | 1 dukat | `source-assets/green-soft-clay-hires/daily/reward-video-v3.png` |
| Riznica | 1 dukat | `source-assets/green-soft-clay-hires/treasury/reward-video-v3.png` |
| Solo završetak | 2 dukata | `source-assets/green-soft-clay-hires/solo/finish-reward-video-v3.png` |

Sva tri mastera su `1254 × 1254` RGBA PNG fajlovi.

## Optimizovane runtime izvedenice

| Uloga | Rezolucija | Veličina | Putanja |
|---|---:|---:|---|
| Daily reward | 384 × 384 | 105 KB | `www/assets/green-soft-clay/daily/reward-video-v3.png` |
| Treasury reward | 256 × 256 | 49 KB | `www/assets/green-soft-clay/treasury/reward-video-v3.png` |
| Solo double reward | 384 × 384 | 89 KB | `www/assets/green-soft-clay/solo/finish-reward-video-v3.png` |

Izvedenice se deterministički reprodukuju skriptom `scripts/build-green-standardized-compositions.py` uz kvalitetno LANCZOS skaliranje.

## Povezivanje i čišćenje

- Dnevni izazov, Riznica i Solo koriste isključivo nove `v3` putanje.
- Sve tri kompozicije evidentirane su i u `ducat` i u `rewardedVideo` registry porodici, jer sadrže oba zaključana identiteta.
- Stari `v2` runtime fajlovi uklonjeni su iz `www` i označeni kao zabranjene putanje.
- High-resolution `v2` izvori nisu obrisani; ostaju kao istorijski ulazi i mapa zamena ih usmerava na `v3`.
- Green manifest verzija podignuta je na `30` radi invalidacije cache-a.

## Kontrola kvaliteta

Automatska provera potvrđuje:

- dimenzije i direktan alpha kanal sva tri runtime fajla;
- odsustvo starih `v2` runtime fajlova i aktivnih veza;
- tačne veze u Dnevnom izazovu, Riznici, Solo prikazu i room-on-demand paketu;
- postojanje odgovarajućih high-resolution mastera za optimizovane runtime fajlove;
- jedinstvenu mapu istorijskih master zamena.

Vizuelna kontrola potvrđuje isti ticket u sve tri kompozicije i raspored nagrada `1 / 1 / 2`, bez dodatnih video simbola ili dupliranih terracotta akcenata.

## Performanse posle Koraka 3

- Green tema: `173 PNG`, ukupno `16.86 MB`.
- Startup paket: `17 PNG`, `4.56 MB` kompresovano / `20.44 MB` procenjeno dekodirano.
- Najveći sobni paket: Riznica, `44 PNG`, `2.93 MB` kompresovano / `13.70 MB` procenjeno dekodirano.

Startup tok nije proširen: nove sobne kompozicije ostaju učitane na zahtev.

## Sledeći korak

Korak 4 je završna Rewarded Video kontrola i zaključavanje porodice: proveriti sve direktne, unavailable, inline i sobne upotrebe kao jednu celinu, zatim promeniti registry status iz `standardized` u `locked` ako nema odstupanja.
