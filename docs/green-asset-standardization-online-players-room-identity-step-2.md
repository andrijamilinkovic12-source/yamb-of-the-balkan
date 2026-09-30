# Green Asset Standardization — Online Players Room Identity, Korak 2

## Ishod

Formiran je kanonski `online-players-room-identity` paket iz postojećeg odobrenog znaka tri igrača, bez nove ilustracije ili promene Green DNK-a. Izvorni manifest ima status `canonical`: paket je pripremljen, ali još nije povezan sa UI-jem niti centralnim registrom i nije zaključan.

Sačuvani su velika forest-green figura u sredini, dve ivory figure iza nje, mali ivory vratni detalj, glinena dubina i transparentna pozadina bez kvadratne podloge. Živa online tačka i broj igrača ostaju zasebni funkcionalni UI, ne deo PNG-a.

## Jedan master, dve isporuke

| Uloga | Putanja | Dimenzija | Bajtova | SHA-256 |
|---|---|---:|---:|---|
| Master | `source-assets/green-soft-clay-canonical/online-players-room-identity/green-online-players-room-master-v1.png` | `1254×1254` | `912.657` | `d72cf7d27bfbd93662b68ef819bb6376e99018e0b56e61f1666104c4dc5ee65d` |
| Room | `www/assets/green-soft-clay/canonical/online-players-room-identity/online-players-room-v1.png` | `512×512` | `154.856` | `319f2407117c1ec539af88248b48ee2c2daaf544342dbf36c13ed2697f2bd189` |
| Menu | `www/assets/green-soft-clay/canonical/online-players-room-identity/online-players-room-menu-v1.png` | `384×384` | `94.595` | `330662c03ccc96c84ddd920834bb16a73ee5cc8ff4143cd9fcbaf0089ea6623f` |

Master je bajt-po-bajt kopija odobrenog `source-assets/green-soft-clay-hires/online-players-free-v2.png`. Room nastaje LANCZOS smanjenjem `1254→512`, a menu dvostepenim `1254→512→384`. Direktno `1254→384` ne reprodukuje odobrenu menu sliku.

Obe kanonske izvedenice su pixel-identične i bajt-po-bajt identične postojećim aktivnim PNG-ovima. Sva tri kanonska PNG-a su RGBA, imaju puni alpha opseg `0–255` i sva četiri transparentna ugla. Runtime izvedenice zajedno imaju `249.451 B / 1.638.400 decoded B`; master visoke rezolucije ostaje van `www`.

## Build i manifest

`scripts/build-green-canonical-online-players-room-identity-pack.py` pre zapisivanja proverava fiksne otiske izvora i dve još aktivne isporuke, dimenzije, RGBA, alpha i pixel-identitet. Proverava i PNG kodiranje u memoriji pre zapisivanja; ako se rezultat razlikuje ili postojeći kanonski izlaz ima drugi otisak, prekida pre prepisivanja. Posle builda ponovo proverava sve tri kanonske datoteke. Dva uzastopna pokretanja dala su iste otiske.

U Koraku 2 build namerno zavisi od starih aktivnih room/menu fajlova radi poređenja. Ta zavisnost se uklanja u Koraku 3 pre njihovog uklanjanja. Ne uklanjati stare kopije pre tog prilagođavanja.

Manifest `source-assets/green-soft-clay-canonical/online-players-room-identity/manifest.json` beleži identitet, dve delivery uloge, sadašnje i buduće putanje, potrošače, prikazne veličine, motion ugovor, odbačenu uramljenu verziju i pending integraciju. Čuva i otiske četiri zasebne state/action ikone i Rules Communication page scene.

## Granice i nepromenjene uloge

- Glavni room PNG je samo identitet sobe Online igrači: meni, intro, zaglavlje, SR/EN Pravila i room-on-demand paket.
- `online-players-state-v1.png` ostaje zasebno prazno/loading stanje, ne druga verzija glavnog logoa.
- `online-add-friend-v1.png` ostaje isti znak dodavanja prijatelja u listi, pozivnici i Pravilima.
- `online-spectate-v1.png` ostaje isti znak gledanja u listi, gameplay zaglavlju, LIVE oznaci i Pravilima.
- `online-duel-v1.png` ostaje isti duel/izazov znak, uključujući Duel chat i Izazov iz chata u SR/EN Pravilima.
- Rules Communication page ilustracija, live statusi, profilne fotografije, pretraga, refresh, paginacija, friend-request kontrole, login i socket tok ostaju van ovog paketa.

Zadržani su menu `44×44` u wrapperu `38×38`, header `32×32`, intro veličina/tajming/pulse i reduced-motion, shell ulaz, state `88×88` i loading pulse, dugmad `38×38` sa slikama `36×36` / `27×27`, kao i deljeni invite/spectator prikazi. Online igrači ne dobijaju novu loading-gate ulogu: gate ostaje sa šest prethodnih slika.

## Provere

`scripts/check-theme-performance.js` sada proverava pripremljeni paket, `canonical` status bez prevremene registracije, fiksne master/room/menu otiske, dimenzije i alpha, sačuvane četiri aktivne room i jednu menu referencu i nula kanonskih UI referenci. Proverava i nepromenjen cache `53`, sačuvan neaktivni pro runtime, pet izdvojenih asseta, SR/EN naslove, postojeće UI veze, veličine i motion, deljenu upotrebu akcija i startup bez novog kanonskog paketa.

Pre i posle rada upoređeni su otisci svih 163 postojećih Green runtime fajlova i osam UI/CSS/manifest/registry fajlova — ukupno 171 fajl. Svi su nepromenjeni. Pod `www` dodata su samo dva kanonska PNG-a; nije promenjen produkcijski kod, centralni registar ili tematski manifest. Izmenjena performance skripta je razvojna provera, ne runtime učitavanje.

Prošli su ponovljeni build, statički vizuelni pregled osvežene audit table i `npm test` sa svih devet projektnih provera: JS sintaksa, pravila igre, trofeji, profilna sinhronizacija, rezultati partija, Kvartalna liga, online reconnect, H2H ledger rebuild i theme performance. `git diff --check` nema grešaka belina.

## Privremeni performance bilans

Dok stare i kanonske kopije postoje zajedno, Green folder ima `165 PNG / 15.292.281 B` (`14,58 MB`). To je privremeno povećanje isporuke od `249.451 B`, ne dodatno runtime učitavanje: kanonski PNG-ovi još nemaju aktivne UI/preload reference.

Startup ostaje `17 PNG / 4,56 MB / 20,44 MB decoded`. Aktivni Online Players paket ostaje `5 PNG / 442.271 B / 3.407.872 decoded B`; široki statički skener broji šest PNG-ova, jer uključuje i neaktivni pro runtime (`692.107 B / 4.456.448 decoded B`).

U Koraku 3 stare room/menu kopije biće zamenjene kanonskim, a neaktivni pro runtime uklonjen. Projekcija posle toga je `162 PNG / 14.792.994 B` (`14,11 MB`), ne trenutno stanje. State i tri deljene akcije ostaju sačuvane.

## Sledeći korak

Korak 3 je kontrolisana integracija menija, introa, zaglavlja, Pravila i sobnog paketa, preciznog startup fallback-a i sobnog matcher-a, centralnog registra i cache osvežavanja. Posle potvrde nula starih UI referenci uklanjaju se tri legacy runtime kopije. Korak 4 je završni audit i zaključavanje.

Nije rađen commit, objavljivanje niti pregled u Android emulatoru. Korak 2 je završen; cela room-identity migracija još nije završena.
