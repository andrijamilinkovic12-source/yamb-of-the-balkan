# Green Asset Standardization — Rewarded Video, Korak 4

## Ishod

Green Rewarded Video porodica završno je proverena i zaključana. Centralni registar i source manifest sada imaju status `locked`.

Ovaj korak nije menjao vizuelni sadržaj niti pravio nove rendere. Njegova svrha je bila da potvrdi kompletnu integraciju Koraka 2 i 3, pooštri regresione kontrole i spreči neprimetnu zamenu kanonskih asseta.

## Zaključana matrica upotrebe

| Kontekst | Zaključana uloga | Broj runtime veza |
|---|---|---:|
| Economy aktivna nagrada | `active` | 2 |
| Economy nedostupan oglas | `unavailable` | 4 |
| Pravila — aktivno stanje | `active-inline` | 1 |
| Pravila — nedostupno stanje | `unavailable-inline` | 1 |
| Dnevni izazov | `daily-reward` | 1 prikaz + 1 room-on-demand veza |
| Riznica | `treasury-reward` | 1 statički + 1 dinamički prikaz + 1 room-on-demand veza |
| Solo završetak | `solo-double-reward` | 1 prikaz + 1 room-on-demand veza |

## Vizuelni identitet

Zaključani direktni simbol je forest-green glineni ticket sa blago usečenim bočnim ivicama, debelim ivory unutrašnjim okvirom i jednim ivory trouglom usmerenim udesno.

- Aktivno stanje koristi mali terracotta četvorokraki akcenat.
- Unavailable stanje koristi isti ticket sa jednom terracotta dijagonalnom zabranom.
- Dnevni izazov i Riznica imaju po jedan kanonski dukat.
- Solo double reward ima tačno dva kanonska dukata.

Claim, check, Daily completed, already-played, tournament start i obične playback kontrole ostaju izvan ove porodice.

## Zaključavanje sadržaja

Za sva četiri kanonska runtime asseta i sve tri sobne kompozicije u `www/themes/green/asset-registry.json` upisan je SHA-256 otisak. Automatska kontrola sada odbija i PNG koji ima tačnu putanju, rezoluciju i alpha kanal ako mu je sadržaj promenjen.

SHA-256 otisci dva odobrena high-resolution mastera upisani su i u `source-assets/green-soft-clay-canonical/rewarded-video/manifest.json`.

## Automatske kontrole

`scripts/check-theme-performance.js` sada proverava:

- `locked` status u centralnom registru i source manifestu;
- tačno četiri jedinstvene canonical uloge i tri jedinstvene sobne uloge;
- propisane rezolucije i direktan alpha kanal;
- SHA-256 integritet svih sedam runtime asseta;
- tačan broj veza u Economy, Pravilima, Dnevnom izazovu, Riznici i Solo završetku;
- tačno jednu room-on-demand vezu za svaki canonical i sobni asset;
- odsustvo svih zabranjenih starih runtime putanja;
- semantičko razdvajanje od claim/check, completed/already-played i ordinary playback simbola;
- postojanje optimizovanih runtime zamena za istorijske high-resolution mastere;
- nepromenjen startup i sobni preload tok.

## Performanse pri zaključavanju

- Green tema: `173 PNG`, ukupno `16.86 MB`.
- Startup paket: `17 PNG`, `4.56 MB` kompresovano / `20.44 MB` procenjeno dekodirano.
- Najveći sobni paket: Riznica, `44 PNG`, `2.93 MB` kompresovano / `13.70 MB` procenjeno dekodirano.

Rewarded Video porodica ne dodaje assete u startup paket. Direktni Economy asseti i sobne kompozicije ostaju učitani na zahtev.

## Pravilo za buduće izmene

Promena zaključanog vizuelnog sadržaja zahteva novu verziju asseta, ažuriranje registry putanje i SHA-256 otiska, proveru svih semantičkih upotreba i ponovni prolazak kompletnog test paketa. Postojeći `v1` canonical i `v3` sobni fajlovi ne smeju se tiho prepisivati drugim sadržajem.
