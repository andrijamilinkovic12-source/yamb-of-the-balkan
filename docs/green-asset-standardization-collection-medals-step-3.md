# Green Collection Medals standardizacija — Korak 3

## Ishod

Canonical Gold, Silver i Bronze Collection medalje povezane su sa kompletnim Green Treasury runtime tokom. Porodica je registrovana kao `standardized`; završno zaključavanje sledi nakon posebne kontrole u narednom koraku.

## Runtime veze

- Dinamička zaglavlja Bronze, Silver i Gold kolekcija skinova koriste jedan canonical template iz `assets/green-soft-clay/canonical/collection-medals/`.
- Green Treasury room-on-demand paket priprema sva tri canonical asseta tek pri ulasku u Riznicu.
- Treasury room matcher eksplicitno obuhvata `canonical/collection-medals/` namespace.
- Mapiranje ostaje ograničeno na `skin` kolekcije i pokriva srpske i engleske nazive kategorija.

## Centralni registar

Porodica `collectionMedals` dodata je u `www/themes/green/asset-registry.json` sa:

- jedinstvenim Gold, Silver i Bronze runtime ulogama;
- zaključanim 256×256 dimenzijama, alpha kanalom i SHA-256 otiscima;
- zabranjenim starim Treasury runtime putanjama;
- vezom prema canonical source manifestu;
- eksplicitnim semantičkim izuzecima.

## Uklonjene runtime kopije

Uklonjene su tri zastarele kopije iz `www/assets/green-soft-clay/treasury/`:

- `collection-gold-v1.png`
- `collection-silver-v1.png`
- `collection-bronze-v1.png`

High-resolution izvori u `source-assets/green-soft-clay-hires/treasury/` nisu brisani. Centralni registar njihove stare putanje mapira na canonical runtime zamene.

## Semantička izolacija

Collection medalje se koriste isključivo za Treasury kategorije skinova. Nisu menjani niti spojeni:

- General Podium medalje;
- Quarterly League podium medalje;
- Tournament finalist nagrada;
- Quarterly League tab i rank simboli;
- Treasury achievement trofeji;
- winner/victory oznake;
- dukati i potrošni tokeni.

## Provera

- JSON manifesti su validni.
- Izmenjeni JavaScript fajlovi prolaze `node --check`.
- `check-theme-performance.js` proverava registry/manifest podudaranje, hash, dimenzije, alpha kanal, kategorijsko mapiranje, room preload i odsustvo starih runtime kopija.
- Green runtime: 173 PNG / 16,87 MB ukupno.
- Green startup: 17 PNG / 4,56 MB kompresovano i 20,44 MB dekodirano.
- Najveći Green room paket: Treasury, 44 PNG / 2,94 MB kompresovano i 13,70 MB dekodirano.

Nije rađen commit niti objavljivanje.
