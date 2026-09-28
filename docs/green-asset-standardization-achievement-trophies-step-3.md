# Green Asset Standardization — Treasury Achievement trofeji, Korak 3

## Ishod

Canonical katalog svih 26 Green achievement trofeja povezan je sa kompletnim runtime tokom. Porodica je registrovana kao `standardized`; završno zaključavanje sledi nakon posebne kontrole u Koraku 4.

Vizuelni sadržaj nije promenjen. Uslovi osvajanja, iznosi nagrada, server potvrda, lokalni fallback, pending retry, rollback i statistika ostaju netaknuti.

## Jedan identitet kroz sve prikaze

`config.js` sada za svaki achievement ID formira Green putanju iz jednog canonical namespace-a:

`assets/green-soft-clay/canonical/achievement-trophies/${item.id}-v1.png`

Isti `greenIcon` koriste:

- kartica trofeja u Riznici;
- achievement unlock popup;
- end-game trophy showcase;
- Green warmup tokom intro animacije Riznice.

Time isti achievement više nema mogućnost da na različitim površinama dobije različit Green PNG.

## Room-on-demand povezivanje

- `game.js` sadrži tačno po jednu eksplicitnu canonical vezu za svih 26 trofeja;
- Treasury matcher obuhvata `canonical/achievement-trophies/` namespace;
- svi trofeji ostaju izvan startup paketa;
- `riznica.js` ih zagreva tokom Green Treasury intro animacije u najviše četiri paralelna toka.

## Centralni registar

Porodica `achievementTrophies` dodata je u `www/themes/green/asset-registry.json` sa:

- statusom `standardized`;
- 26 jedinstvenih canonical runtime uloga;
- zaključanim `256 × 256` dimenzijama i SHA-256 otiscima;
- eksplicitnim identitetom i semantičkim granicama;
- vezama prema karticama, popup-u, showcase-u i room paketu;
- 26 zabranjenih starih runtime putanja;
- mapiranjem svakog istorijskog source asseta na canonical zamenu.

## Uklonjene runtime kopije

Uklonjeno je svih 26 zastarelih PNG kopija iz:

`www/assets/green-soft-clay/treasury/trophies/`

Brisanje je izvršeno tek nakon provere da nijedna aktivna JS/HTML referenca više ne koristi staru putanju. Svih 26 source fajlova u `source-assets/green-soft-clay-hires/treasury/trophies/` ostalo je sačuvano.

## Semantička izolacija

Nisu menjani niti spojeni sa achievement katalogom:

- Treasury trophies-tab navigacioni glyph;
- Statistics zbirni brojač trofeja;
- Tournament pobednički i ceremonijalni pehari;
- Tournament finalist nagrada;
- General Podium i Quarterly League medalje;
- Treasury Collection medalje;
- QL rank bedževi i medals-tab glyph;
- winner, victory-state i room-intro simboli;
- dukati i potrošni tokeni.

`godlike` lovor i `veteran` medalja ostaju vezani samo za svoje achievement ID-jeve i nisu podium asseti.

## Automatska kontrola

`check-theme-performance.js` sada proverava:

- `standardized` status registra i source manifesta;
- potpuno 1:1 poklapanje 26 ID-jeva između manifesta i `config.js`;
- isti katalog runtime putanja u manifestu i centralnom registru;
- master/runtime dimenzije, alpha kanal i SHA-256 integritet;
- odsustvo dupliranih achievement sadržaja;
- tačno jednu dinamičku Green template vezu u `config.js`;
- tačno po jednu eksplicitnu room-on-demand vezu za svaki od 26 asseta;
- zajednički `greenIcon` u kartici, popup-u, showcase-u i warmup-u;
- odsustvo svih starih runtime fajlova i aktivnih referenci;
- očuvanje semantičkih izuzetaka i room preload izolacije.

## Performanse nakon migracije

- Green tema: `173 PNG`, ukupno `16,87 MB`.
- Startup paket: `17 PNG`, `4,56 MB` kompresovano / `20,44 MB` procenjeno dekodirano.
- Najveći Green room paket: Riznica, `44 PNG`, `2,94 MB` kompresovano / `13,70 MB` procenjeno dekodirano.

Privremenih 26 duplih runtime fajlova iz Koraka 2 više ne postoji. Startup i aktivni Treasury paket nisu uvećani.

## Sledeći korak

Korak 4 radi završnu vizuelnu, semantičku i tehničku kontrolu, pooštrava regresione uslove i menja status porodice iz `standardized` u `locked`.

Nije rađen commit niti objavljivanje.
