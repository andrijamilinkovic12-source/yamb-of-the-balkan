# Green Asset Standardization — Statistics Room Identity, Korak 4

## Ishod

Završen je završni vizuelni, semantički i tehnički audit Green `statistics-room-identity` porodice. Source manifest i centralni registar sada imaju status `locked`.

Ovaj korak nije menjao approved glyph, CSS dimenzije, motion, Statistics/H2H podatke ili raspored. Ažurirana audit tabla prikazuje produkcione canonical PNG-ove i probe u stvarnim CSS veličinama. Automatska kontrola sada čuva granice porodice, potrošače, motion ugovor i preload izolaciju.

## Vizuelna kontrola

Audit tabla: `docs/green-asset-standardization-statistics-room-identity-audit.png`.

Na tabli su:

- odobreni `1254×1254` master;
- canonical `512×512` room i `384×384` menu izvedenice;
- proba intro prikaza `210 px × 1,06` i prikaza od `52`, `46` i `34 px`;
- odbijeni framed `statistics-pro-v1` izvor kao audit trag;
- po jedan Overview glyph, H2H identitet i Rules ilustracija kao semantičke granice.

Pregled je potvrdio čitljiva tri uzlazna ivory stuba, forest-green bazu i jednu terracotta tačku u malim prikazima. Asset ima transparentne uglove, bez sopstvenog kvadratnog rama. Kompozicija ostaje ista od intro prikaza do malog zaglavlja. Audit tabla je statična vizuelna proba; nije snimak Android emulatora.

## Reproducibilnost i alpha kvalitet

Build ponovo pravi obe runtime varijante isključivo iz approved izvora:

1. `1254→512` direktnim LANCZOS smanjenjem;
2. `512→384` drugim LANCZOS smanjenjem, kao u odobrenoj menu izvedenici.

Build sada odbija pogrešnu RGBA dimenziju, opaque ugao, nedostatak celog alpha opsega ili odstupanje od fiksnih SHA-256 otisaka.

| Uloga | Dimenzija | Bajtova | SHA-256 |
|---|---:|---:|---|
| Master | `1254×1254` | `601.843` | `a6b66b766925133dd68cce4c290087770d602b633960d082cc42b90ac1a498ea` |
| Room | `512×512` | `99.726` | `1b410b9c5af60dfa552122a9eb2ba70abb05bb4f3fdfc4acd7ed0868679611f0` |
| Menu | `384×384` | `60.928` | `e4ab3a61aecdb9e14e84159a11b4e5ca1608e87996d663114eedf903ab0654fa` |

Room i menu sadržaj ostaje bajt-po-bajt isti kao odobreni runtime pre migracije.

## Zaključani prikazi i ponašanje

- Glavni meni: `52×52`, odnosno `46×46` na uskom portrait ekranu, `8,4 s` talas sa `1,56 s` Statistics delay i reduced-motion fallback.
- Intro: icon-only prikaz u okviru `clamp(210px, 34vmin, 290px)`, scale `1,06`, `1,8 s` pulse, otvaranje sobe posle `3,65 s` i završetak overlay-a posle `4,6 s`, uz reduced-motion fallback.
- Statistics header: `34×34`, `object-fit: contain`.
- Pravila: isti room glyph u oba jezika na naslovima „Kolone u igri / Game Columns” i „Praćenje statistike / Stat tracking”, ukupno četiri upotrebe; standardni inline prikaz `1,42em` sa `contain`.
- Theme loading gate: canonical room PNG u postojećem paketu ikona za promenu teme, `45×45` sa `contain`, `2,6 s` float motion i reduced-motion fallback.

Kontrola zahteva tačne veze u HTML-u, intro konfiguraciji, Rules mapi i loading paketu. Tako promena puta ili zamena druge Statistics ikone ne može tiho proći performance proveru.

## Semantičke granice

Glavna ikona sobe predstavlja ulazak u Statistiku. Ne preuzima značenje deset Statistics Overview metrika, H2H identiteta i detail glyph-ova, Power Index watermarka, Rules scene „Statistika i liste”, Solo Recorda, Top liste, medalja, trofeja ili rezultata jedne partije.

`statistics-pro-v1` je odbačeni framed alternate sa nula aktivnih UI veza. Njegov runtime je uklonjen. High-resolution izvor je sačuvan van `www` stabla samo za poređenje i proveru dizajnerske odluke.

## Preload i performance izolacija

Startup sadrži samo `384×384` menu izvedenicu Statistics identiteta. `512×512` room izvedenica ulazi u Statistics room-on-demand paket. Obe izvedenice se ne učitavaju zajedno kao deo istog room paketa.

Zaključani bilans:

- Green tema: `168 PNG`, `16.272.395 B` (`15,52 MB`);
- startup: `17 PNG`, `4,56 MB / 20,44 MB decoded`;
- Statistics room: `17 PNG`, `630.121 B / 5.439.488 decoded B`;
- tri uklonjena legacy runtime fajla: `0` prisutnih, `0` aktivnih referenci;
- cache verzija: `48`.

Statistics room paket čine jedan room identitet, deset Overview i šest H2H-specific PNG-ova. Menu izvedenica ostaje izvan ovog broja. Dosadašnji startup broj i memorijski budžet nisu porasli.

## Automatska zaštita

`check-theme-performance.js` zahteva:

- `locked` status u source manifestu i centralnom registru;
- identičan opis Green Soft Clay identiteta, palete i semantičkih granica u oba izvora;
- tačno dve canonical uloge, dimenzije, bajtove i SHA-256 otiske;
- bajt-po-bajt odobreni master i istorijski identične dve runtime izvedenice;
- tačan broj canonical veza i nula legacy veza;
- odsustvo tri zabranjene runtime putanje;
- sačuvan odbačeni high-resolution izvor i odsustvo njegovog runtimea;
- četiri Rules upotrebe kroz srpski i engleski sadržaj;
- meni/header/intro prikaze, wave, pulse i reduced-motion ponašanje;
- startup isključivo sa menu varijantom i Statistics room isključivo sa room varijantom;
- šest povezanih tokova, cache verziju i `finalAudit` vezu prema registru i testu.

Reproducibilan build, audit tabla i kompletan projektni test skup ponovljeni su nakon zaključavanja. Android emulator nije pokrenut u ovom koraku; vizuelni pregled odnosi se na canonical PNG-ove i statičnu probu u CSS veličinama.

## Status

Statistics Room Identity porodica je završena i zaključana. Nije rađen commit niti objavljivanje.
