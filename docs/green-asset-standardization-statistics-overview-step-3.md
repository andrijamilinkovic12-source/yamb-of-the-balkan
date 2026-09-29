# Green Asset Standardization — Statistics Overview Metrics, Korak 3

## Ishod

Canonical `statistics-overview` paket povezan je sa kompletnim Green Statistics Overview tokom. Porodica je registrovana kao `standardized`; završno zaključavanje sledi u Koraku 4.

Vizuelni sadržaj, stvarne statističke vrednosti, formule, klik akcije, modali, CSS dimenzije, carousel, motion i UI geometrija nisu promenjeni.

## Povezani potrošači

### Statistics Overview

Prva strana Statistike sada koristi canonical identitete za:

- Power Index watermark;
- rekord i ukupan broj partija;
- pobede, remije i poraze;
- Vatreni niz, prosek, zbir trofeja i All-time poene.

Postojeće prikazne veličine ostaju `94 × 94`, `19 × 19`, `14 × 14` i `24 × 24` CSS piksela prema ulozi.

### Povezani modali

- Power Index modal koristi isti canonical `power-index` za naslov `27 × 27` i vrednost `16 × 16`;
- Vatreni niz modal koristi isti canonical `fire-streak` za naslov `32 × 32` i vrednost `23 × 23`.

Time jedan pojam više nema paralelne putanje između Statistics stranice i sopstvenog modala.

### Pravila

Green Rules mapiranje sada koristi canonical putanje za:

- Power Index;
- rekord;
- pobede;
- Vatreni niz;
- All-time poene.

Tekst, redosled slajdova, semantički naslov i ostali Rules asseti nisu menjani.

### Room-on-demand paket

Deset canonical putanja nalazi se u Green asset listi i stvarni Statistics matcher sada eksplicitno prepoznaje `canonical/statistics-overview/`.

Isti namespace dodat je internom performance klasifikatoru, pa izveštaj i stvarni app preload sada mere isti Statistics paket.

## Centralni registar

Porodica `statisticsOverview` dodata je u `www/themes/green/asset-registry.json` sa:

- statusom `standardized`;
- tačno deset canonical uloga i putanja;
- `256 × 256` runtime dimenzijom i SHA-256 otiskom za svaki ID;
- zaključanim Soft Clay identitetom;
- deset zabranjenih legacy putanja;
- istorijskim mapiranjem svake stare putanje na canonical zamenu;
- semantičkim izuzecima;
- pet grupa stvarnih code bindinga.

Source manifest sada ima isti `standardized` status i evidentira povezane Statistics Overview, Power Index, Vatreni niz, Rules i room-on-demand tokove.

## Uklonjene legacy kopije

Posle potvrde svih canonical veza uklonjeno je tačno deset starih runtime fajlova:

- `statistics/power-index-bolt-v1.png`
- `statistics/record-v1.png`
- `statistics/games-v1.png`
- `statistics/wins-v1.png`
- `statistics/draws-v1.png`
- `statistics/losses-v1.png`
- `statistics/fire-streak-v1.png`
- `statistics/average-v1.png`
- `statistics/trophies-v1.png`
- `statistics/all-time-points-v1.png`

Njihove odobrene high-resolution source kopije i canonical masteri ostaju sačuvani. Centralni registar čuva stare putanje kao zabranjene, tako da se ne mogu neprimetno vratiti.

## Reproducibilan build posle migracije

`build-green-canonical-statistics-overview-pack.py` više ne zavisi od uklonjenih aktivnih runtime kopija. Paket se reprodukuje direktno iz deset odobrenih `1254 × 1254` RGBA source asseta:

1. source se kopira kao canonical master;
2. runtime se izvodi direktnim LANCZOS skaliranjem na `256 × 256`;
3. manifest hash kontrola potvrđuje deterministički rezultat.

Build je ponovljen nakon brisanja legacy fajlova i svih deset hash vrednosti ostalo je nepromenjeno.

## H2H i dukat granice

Nisu prebačeni niti spojeni sa Statistics Overview porodicom:

- `statistics/h2h-v1.png`;
- `statistics/h2h-empty-v1.png`;
- svih sedam `statistics/h2h-detail/*.png` glyph-ova;
- zaključani `canonical/ducat/ducat-inline-v1.png` za Statistics stanje;
- glavna `statistics-free-v2.png` menu/intro ikona.

H2H ostaje sledeća zasebna Statistics porodica, a stanje dukata nastavlja da koristi jedini canonical Green currency identitet.

## Cache verzija

Green manifest verzija povećana je sa `45` na `46`, kako uređaj ne bi zadržao stare Statistics Overview URL-ove posle sledećeg web/Android sync procesa.

## Automatska kontrola

`check-theme-performance.js` sada proverava:

- `standardized` status source manifesta i centralnog registra;
- Green cache verziju `46`;
- tačan katalog, redosled, identity DNK, glyph siluete i display dimenzije;
- deset jedinstvenih master i runtime sadržaja;
- manifest/registry identitet, putanju, dimenziju i SHA-256 podudaranje;
- postojanje canonical mastera i runtimea sa direktnim alpha kanalom;
- odsustvo svih deset starih runtime fajlova i aktivnih legacy referenci;
- očekivani broj canonical veza za svaki ID;
- tačno istorijsko mapiranje i zabranjene putanje;
- povezane Statistics Overview, modal, Rules i room-on-demand tokove;
- stvarni i performance Statistics matcher;
- očuvanje canonical dukata i H2H granice;
- sve semantičke izuzetke.

## Performance posle integracije

- Green tema: `172 PNG`, ukupno `15,81 MB`.
- Startup paket: `17 PNG`, `4,56 MB` kompresovano / `20,44 MB` procenjeno dekodirano.
- Statistics room paket: `21 PNG`, `0,90 MB` kompresovano / `6,94 MB` procenjeno dekodirano. Broj uključuje obe glavne Statistics menu/intro varijante, deset Overview identiteta i zasebnu H2H porodicu.
- Statistics Overview podfamilija: `10 PNG`, `323.695` bajtova / `2,50 MB` procenjeno dekodirano.
- Najveći Green room paket ostaje Riznica: `44 PNG`, `2,94 MB` kompresovano / `13,70 MB` procenjeno dekodirano.

Green paket se vratio sa privremenih `182` na `172` PNG fajla. Startup nije povećan. Konačna veličina je ista kao pre migracije jer su canonical runtime fajlovi sadržajno identični optimalnim legacy izvedenicama.

## Sledeći korak

Korak 4 je završna vizuelna, semantička i tehnička kontrola. Proveriće se svi potrošači, stvarne CSS dimenzije i akcije, stats/profile veze, H2H i dukat granice, preload izolacija, build reprodukcija i zabranjene putanje, nakon čega porodica može preći iz `standardized` u `locked`.

Nije rađen commit niti objavljivanje.
