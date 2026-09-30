# Green Asset Standardization — Quarterly League Room Identity, Korak 4

## Zaključak

Glavni Green identitet Kvartalne lige je posle završnog **statičkog vizuelnog, semantičkog i tehničkog audita** označen kao `locked` u izvornom manifestu i centralnom registru. Zaključavanje se odnosi na jedan glineni `YotB / QL` romb i njegove dve isporuke, **ne** na ponovnu standardizaciju navigacionih tabova, rang bedževa ili kvartalnih medalja. Produkcijski izgled, geometrija, motion, trajanje intra i cache verzija nisu menjani u ovom koraku.

## Vizuelna i binarna provera

Reprodukovana i pregledana audit tabla `docs/green-asset-standardization-quarterly-league-room-identity-audit.png` prikazuje odobreni `1254×1254` master, room `512×512`, menu `384×384`, primere CSS prikaznih veličina i poređenje sa posebnim tab, rank i medalja identitetima. Na rombu ostaju forest-green urezana Yamb tabela, topli ivory „YotB / QL” natpis i obod, četiri terracotta pina, glinena dubina i providni spoljni uglovi. Ivory romb obod je deo znaka, ne generička kvadratna podloga. Prikaz watermarka u audit tabli približno koristi opacity `0,18`, ali ne simulira CSS filter, stvarni ekran ili emulator.

`scripts/make-green-quarterly-league-room-identity-audit-sheet.py` sada prekida sa greškom ako LANCZOS `1254→512` ili `512→384` više nisu pixel-identični kanonskim PNG-ovima. Direktno `1254→384` očekivano nije identično. Svih sedam proveravanih PNG-ova je RGBA, sa alpha opsegom `0–255` i transparentna sva četiri ugla. `scripts/build-green-canonical-quarterly-league-room-identity-pack.py` ponovo daje iste fiksne SHA-256 otiske:

| Uloga | Dimenzija | Bajtova | SHA-256 |
|---|---:|---:|---|
| master | `1254×1254` | `1.263.658` | `4b5f7c66d8a4cd7a859e355d12efc6cec5adfa546d77b78129283f575b4b6597` |
| room | `512×512` | `217.526` | `87a0a07b5abf5abc9dfa58a5265665fd2d1b81f62c48e692cfa0ffe4657a7ed4` |
| menu | `384×384` | `136.653` | `f21cece394a0184082aaaa7ed7fa327d3beedd360c1f01383002965bd96191bb` |

## Semantičke granice i veze

- Isti room znak je direktno vezan na intro, zaglavlje, pobednički popup, sobni katalog i jedno mapiranje koje koriste srpska i engleska Pravila. Oba jezička naslova i oba odeljka o kvartalnom obračunu su proverena.
- Jedan menu znak je vezan na CSS watermark i eksplicitni startup izvor. Tekst ranga, poeni i progres ostaju živi UI slojevi, ne deo PNG-a.
- Četiri zaključane `quarterlyNavigation` ikonice jesu akcije tabova; nijedna nije zamena za glavni romb. Šest `quarterlyRankBadges` prikazuje nivoe ranga; čak je i romb `majstor` samo bedž ranga. Tri medalje `competitionMedals.quarterlyLeaguePodium` jesu nagrade; gold medalja u pobedničkom prozoru ne postaje drugi logo.
- Pretraga produkcionih JS/HTML/CSS veza nalazi **pet** direktnih kanonskih room referenci, **dve** menu reference i **nula** referenci na dve povučene runtime putanje. Stare kopije su odsutne; odobreni izvor i kanonski master su sačuvani.

## Motion, učitavanje i izolacija tema

Zadržani su mirni CSS watermark `86×86` na opacity `0,18`, intro `clamp(210px, 34vmin, 290px)` sa pulse `1,8 s`, otvaranje sobe posle `3,65 s`, završetak overlay-a posle `4,6 s`, header `42×42`, popup `96×96` i `prefers-reduced-motion` zaštita. Nisu menjani tabovi, swipe, paginacija, rang pragovi, kvartalni obračun ili serverski podaci.

VM pozivi stvarnih metoda potvrđuju da Green startup sa prisutnim i odsutnim `#main-menu` bira **tačno jedan menu watermark `384×384`**, bez room PNG-a. Room-on-demand vraća **room logo i tri odvojene podium medalje**, bez menu PNG-a. Easter, Desert i Severna tokovi ne dobijaju Green putanje. Rank bedževi zadržavaju svoj poseban preload, a tab ikonice svoje postojeće navigacione potrošače.

Green runtime ostaje `162 PNG / 14.792.994 B` (`14,11 MB`). Startup ostaje `17 PNG / 4,56 MB / 20,44 MB decoded`. Uski runtime room matcher vraća `4 PNG / 393.393 B / 1.835.008 decoded B`; šira statička QL oblast ima `14 PNG / 1.466.088 B / 6.422.528 decoded B`. Brojke nisu dokaz brzine renderovanja ili FPS-a na telefonu.

## Status i granica verifikacije

Izvorni manifest `source-assets/green-soft-clay-canonical/quarterly-league-room-identity/manifest.json` i porodica `quarterlyLeagueRoomIdentity` u `www/themes/green/asset-registry.json` imaju status `locked`, isti DNK, dve kanonske isporuke i iste semantičke izuzetke. `scripts/check-theme-performance.js` čuva otiske, putanje, uloge, obim, SR/EN reference, motion mere, startup i room izolaciju. Green cache ostaje `55`, jer u Koraku 4 nema novih runtime putanja ili bajtova.

Ponovljeni build, audit skripta, `npm test` i `git diff --check` prolaze. Nije rađen pregled na Android emulatoru, mrežno profilisanje ili stvarno merenje FPS-a; takva provera ostaje preporučena pre objavljivanja cele teme. Nije rađen commit ni objavljivanje.
