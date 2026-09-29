# Green Asset Standardization — Hotseat Winner, Korak 2

## Ishod

Formiran je canonical `hotseat-winner` paket iz postojećeg odobrenog Green identiteta. Nije korišćen ImageGen i asset nije redizajniran.

Paket trenutno ima status `canonical`. Aktivne veze ostaju na postojećoj `hotseat/winner-v1.png` putanji do Koraka 3, kada će game-over prikaz i Hotseat room-on-demand paket biti kontrolisano prebačeni na canonical namespace.

## Canonical identitet

| ID | Semantička uloga | Glyph | Canonical runtime |
|---|---|---|---:|
| `hotseat-winner` | pobednik završene lokalne partije za dva igrača bez remija | dve glinene figure sa forest-green pobednikom napred, ivory check oznakom i terracotta tačkom | `256 × 256` |

Jedan ID predstavlja samo Hotseat pobednika. Ne predstavlja Online pobedu, Statistics wins, Tournament šampiona, QL champion oznaku ili generički winner simbol.

## Canonical master

Direktorijum:

`source-assets/green-soft-clay-canonical/hotseat-winner/`

- `green-hotseat-winner-master-v1.png` ima `512 × 512` RGBA;
- master je bajt-po-bajt kopija odobrenog Green source asseta;
- SHA-256 mastera je `99f6cb072816aba333f883a4e2ad3def3fdc0fdb5bb29a40e6e70954acd30beb`;
- originalni kadar, paleta, osvetljenje, transparentnost i proporcije nisu menjani.

## Canonical runtime

`www/assets/green-soft-clay/canonical/hotseat-winner/hotseat-winner-v1.png`:

- koristi transparentni `256 × 256` RGBA canvas;
- izveden je direktno iz odobrenog `512 × 512` mastera LANCZOS redukcijom;
- zadržava punu kvadratnu kompoziciju bez kropovanja i rastezanja;
- ima `38.409` bajtova;
- SHA-256 runtimea je `4020edd452e925903508af646e4f56ec55320982fa573e3a97a25aefe4d7824b`;
- više je nego dovoljan za najveći stvarni prikaz od `58 × 58` CSS piksela.

Vizuelna kontrola potvrđuje da su dve figure, ivory check, terracotta tačka, glinena tekstura i transparentne ivice ostali čisti i čitljivi.

## Reproducibilan build

`scripts/build-green-canonical-hotseat-winner-pack.py`:

1. zahteva odobreni `512 × 512` source i postojeći `384 × 384` aktivni runtime;
2. proverava RGBA format i očekivane dimenzije oba ulaza;
3. kopira source bajt-po-bajt kao canonical master;
4. izvodi `256 × 256` runtime iz mastera LANCZOS redukcijom;
5. prekida build ako format, dimenzije ili kvadratna kompozicija odstupaju;
6. ispisuje master, aktivne i canonical dimenzije sa veličinom rezultata.

## Source manifest

`source-assets/green-soft-clay-canonical/hotseat-winner/manifest.json` evidentira:

- `canonical` status;
- jedan zaključani ID i njegovu Hotseat-only ulogu;
- vizuelni DNK i tačan opis siluete;
- master, canonical runtime i trenutno aktivnu legacy putanju;
- master, runtime i aktivne dimenzije;
- sva tri SHA-256 otiska i pravilo normalizacije;
- plan game-over i room-on-demand integracije za Korak 3;
- semantičke granice prema Statistics, Solo, Online, Tournament, League, Treasury i drugim state/winner porodicama.

## Automatska kontrola

`check-theme-performance.js` sada proverava:

- `canonical` status paketa i odsustvo prevremene registry registracije;
- tačno jedan `hotseat-winner` identitet;
- zaključani materijal, paletu, mapiranje i semantičku siluetu;
- postojanje master, canonical i aktivnog runtime fajla;
- sve dimenzije, direktan alpha kanal i SHA-256 otiske;
- canonical konvenciju imena i precizno pravilo LANCZOS normalizacije;
- jednu game-over i jednu Hotseat preload legacy vezu pre integracije;
- semantičku izolaciju i kompletan plan povezivanja za Korak 3.

## Privremeni performance bilans

Dok zajedno postoje aktivna i canonical kopija:

- Green tema: `173 PNG`, ukupno `16,02 MB`;
- startup paket: nepromenjen, `17 PNG`, `4,56 MB` kompresovano / `20,44 MB` procenjeno dekodirano;
- najveći Green room paket ostaje Riznica, `44 PNG`, `2,94 MB` kompresovano / `13,70 MB` procenjeno dekodirano;
- aktivni `384 × 384` runtime ima `81.039` bajtova;
- canonical `256 × 256` runtime ima `38.409` bajtova.

Nakon Koraka 3 i uklanjanja stare runtime kopije očekivana ušteda je `42.630` bajtova kompresovano i približno `0,31 MB` dekodirane memorije. Broj Green PNG fajlova vratiće se sa privremenih `173` na `172`.

## Van opsega Koraka 2

- menjanje game-over potrošača;
- menjanje Hotseat room-on-demand putanje;
- menjanje uslova `is-hotseat-result` i `has-result-winner`;
- menjanje reveal motiona ili reduced-motion ponašanja;
- menjanje veličine od `58 × 58` CSS piksela;
- brisanje stare `hotseat/winner-v1.png` kopije;
- dodavanje porodice u centralni registry;
- registracija porodice kao `standardized` ili `locked`;
- pravljenje novih Online ili generičkih winner asseta.

## Sledeći korak

Korak 3 je povezivanje game-over potrošača i Hotseat room paketa na canonical putanju, registracija porodice kao `standardized`, dodavanje canonical Hotseat matchera i uklanjanje stare runtime kopije nakon potvrde da nema aktivnih legacy referenci.

Nije rađen commit niti objavljivanje.
