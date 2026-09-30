# Green Asset Standardization — Quarterly League Room Identity, Korak 2

## Ishod

Formiran je kanonski `quarterly-league-room-identity` paket iz postojećeg odobrenog romb logotipa, bez nove ilustracije ili izmene Green DNK-a. Izvorni manifest ima status `canonical`: paket je pripremljen, ali još nije povezan sa produkcionim UI-jem, centralnim registrom ili novom cache verzijom. Već zaključane porodice navigacije, rangova i kvartalnih medalja ostaju netaknute.

Sačuvani su forest-green glinena površina sa urezanom Yamb tabelom, ivory natpisi „YotB” i „QL”, zaobljeni ivory romb obod i četiri terracotta pina. Spoljni uglovi ostaju providni. Romb obod je deo glavnog logotipa, ne generička kvadratna kartica.

## Jedan master, dve isporuke

| Uloga | Putanja | Dimenzija | Bajtova | SHA-256 |
|---|---|---:|---:|---|
| Master | `source-assets/green-soft-clay-canonical/quarterly-league-room-identity/green-quarterly-league-room-master-v1.png` | `1254×1254` | `1.263.658` | `4b5f7c66d8a4cd7a859e355d12efc6cec5adfa546d77b78129283f575b4b6597` |
| Room | `www/assets/green-soft-clay/canonical/quarterly-league-room-identity/quarterly-league-room-v1.png` | `512×512` | `217.526` | `87a0a07b5abf5abc9dfa58a5265665fd2d1b81f62c48e692cfa0ffe4657a7ed4` |
| Menu | `www/assets/green-soft-clay/canonical/quarterly-league-room-identity/quarterly-league-room-menu-v1.png` | `384×384` | `136.653` | `f21cece394a0184082aaaa7ed7fa327d3beedd360c1f01383002965bd96191bb` |

Master je bajt-po-bajt kopija odobrenog `source-assets/green-soft-clay-hires/quarterly-league-yotb-ql-free-v2.png`. Room nastaje LANCZOS smanjenjem `1254→512`, a menu dvostepenim `1254→512→384`. Direktno `1254→384` ne reprodukuje postojeći odobreni menu PNG.

Obe kanonske izvedenice su pixel-identične i bajt-po-bajt identične postojećim aktivnim room i menu kopijama. Sva tri kanonska PNG-a su RGBA, imaju puni alpha opseg `0–255` i sva četiri transparentna ugla. Runtime izvedenice zajedno imaju `354.179 B / 1.638.400 decoded B`; master visoke rezolucije ostaje van `www`.

## Build, manifest i granice

`scripts/build-green-canonical-quarterly-league-room-identity-pack.py` pre pisanja proverava fiksni hash odobrenog izvora, dimenzije, alpha, očekivano PNG kodiranje izvedenica i, dok postoje, odobrene aktivne room/menu kopije uključujući pixel-identitet. Ako već postoji kanonski izlaz drugog otiska, prekida bez prepisivanja. Posle izrade ponovo proverava sva tri izlaza. Stare kopije služe za poređenje dok su prisutne; builder može reprodukovati paket i nakon njihovog planiranog uklanjanja u Koraku 3. Dva uzastopna pokretanja dala su iste otiske.

`source-assets/green-soft-clay-canonical/quarterly-league-room-identity/manifest.json` beleži identitet, poreklo, dve isporuke, buduće i sadašnje potrošače, stvarne prikazne veličine, motion ugovor, tri već zaključane zaštićene porodice i pending integraciju. Predviđeno je pet direktnih room referenci (intro, zaglavlje, room katalog, pobednički popup, mapiranje Pravila) i dve menu reference (CSS watermark i eksplicitni startup izvor). U produkcionim JS/HTML/CSS fajlovima još uvek je svih sedam starih referenci, a nijedna kanonska.

Rang/poeni/progress, šest bedževa, četiri tab ikonice, tri kvartalne podium medalje, obračun sezone i podaci sa servera nisu deo ove migracije. Ostaju postojeći menu watermark `86×86` na opacity `0,18`, intro `clamp(210px, 34vmin, 290px)` i `4,6 s`, header `42×42`, pobednički popup `96×96`, SR/EN Pravila i reduced-motion ponašanje. Kanonski master ne ulazi u isporuku aplikacije.

## Provere i privremeni performance bilans

`scripts/check-theme-performance.js` sada proverava status `canonical` bez prevremene centralne registracije, fiksne SHA-256 otiske, dimenzije i PNG alpha, netaknute aktivne kopije i svih sedam aktivnih naspram nula kanonskih produkcionih referenci. Takođe proverava da su navigacija, rangovi i medalje i dalje `locked`, a cache verzija `54`.

Pre i posle rada upoređeni su otisci 162 postojećih Green runtime PNG-ova i devet produkcionih UI/CSS/manifest/registry/provernih fajlova. Svi stari fajlovi, osim namerno dopunjene performance skripte, ostali su nepromenjeni. Pod `www` dodata su samo dva kanonska PNG-a; `www/game.js`, `www/kvartalnaliga.js`, `www/index.html`, `www/pravilaigre.js`, CSS, Green registry i theme manifest nisu menjani u ovom koraku.

Sa starim i kanonskim kopijama zajedno, Green runtime sada ima `164 PNG / 15.147.173 B` (`14,45 MB`). Privremeno povećanje od `354.179 B` nije dodatni aktivni preload: startup i dalje ima `17 PNG / 4,56 MB / 20,44 MB decoded`, a stvarni QL room matcher i dalje vraća samo stari room logo i tri kvartalne medalje. Uz neizmenjene resurse, posle kontrolisane zamene i uklanjanja dve stare kopije broj bi se vratio na `162 PNG / 14.792.994 B`; to je projekcija, ne trenutno stanje.

Ponovljeni build i `npm test` su prošli, uključujući svih devet projektnih provera. To su statičke i VM provere; nema merenja FPS-a, mrežnog učitavanja ili pregleda u Android emulatoru.

## Sledeći korak

Korak 3 je kontrolisana integracija kanonskog room PNG-a u intro, zaglavlje, pobednički popup, SR/EN Pravila i sobni katalog, a menu PNG-a u CSS watermark i eksplicitni startup izvor. Tada treba precizirati no-DOM startup fallback da ne vuče sobni `512` px logo, ažurirati Green registry/cache i testove, pa tek nakon potvrđenih nula legacy UI veza ukloniti stare dve runtime kopije. Korak 4 je završni audit i zaključavanje.

Nije rađen commit, objavljivanje niti pregled u emulatoru. Korak 2 je završen; cela room-identity migracija još nije završena.
