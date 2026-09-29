# Green Asset Standardization — Statistics Room Identity, Korak 1

## Opseg

Ovaj korak zaključava vizuelni i semantički identitet same sobe Statistika kroz glavni meni, intro, zaglavlje sobe i ponovnu upotrebu u Pravilima. Statistics Overview metrike, H2H identiteti, formule, podaci, layout, motion i aktivne putanje nisu menjani.

Vizuelni audit: `docs/green-asset-standardization-statistics-room-identity-audit.png`.

## Zaključana odluka

Green tema ima **jedan** Statistics Room Identity: slobodnostojeći grafikon sa tri rastuća warm-ivory glinena stuba, forest-green bazom i jednom kontrolisanom terracotta tačkom iznad najvišeg stuba.

To je postojeći `statistics-free-v2` identitet. On prati Green Room Pack DNK:

- matirani 3D Soft Clay Neumorphism;
- čista centralna silueta i transparentna pozadina;
- bez kvadratne kartice, rama ili generičke podloge;
- forest-green, warm-ivory i terracotta paleta;
- meko gornje-levo svetlo i kontrolisana glinena dubina;
- čitljivost od `34 px` zaglavlja do velike intro prezentacije.

`statistics-pro-v1` nije drugi Statistics identitet. To je napuštena kvadratna ilustrativna kartica sa zelenim ramom, narandžastom gornjom trakom i pejzažnim talasima. Nema nijednog aktivnog Green UI potrošača i krši dogovoreno pravilo slobodnostojećih ikona. Njen orphan runtime treba ukloniti u integracionom Koraku 3; high-resolution izvor može ostati kao audit trag izvan isporučenog `www` stabla.

## Jedan identitet, dve isporučne varijante

Različite dimenzije nisu različiti identiteti. Canonical paket će imati jedan high-resolution master i dve determinističke runtime isporuke:

| Uloga | Predložena canonical putanja | Dimenzija | Potrošači |
|---|---|---:|---|
| `room` | `canonical/statistics-room-identity/statistics-room-v1.png` | `512×512` | intro, zaglavlje, Rules inline identitet i room-on-demand preload |
| `menu` | `canonical/statistics-room-identity/statistics-room-menu-v1.png` | `384×384` | glavni meni i startup preload |

Obe varijante moraju zadržati identičnu siluetu, proporcije, boje i alpha ivice. Meni varijanta će namerno pratiti postojeću dvostepenu reprodukciju `1254 → 512 → 384`, jer je ona bajt-po-bajt odobreni sadašnji rezultat. Room varijanta je direktno LANCZOS smanjenje `1254 → 512`.

## Stvarni potrošači i prikaz

### Glavni meni

- putanja: `runtime/menu/statistics-free-v2.png`;
- CSS prikaz: `52×52`, odnosno `46×46` na uskom portrait ekranu;
- motion: zajednički `easterBottomIconWave` ciklus od `8,4 s`, Statistics kašnjenje `1,56 s`;
- hover/press i `prefers-reduced-motion` ponašanje ostaju nepromenjeni;
- asset pripada startup kritičnoj putanji.

### Statistics intro

- putanja: `statistics-free-v2.png`;
- okvir ikone: `clamp(210px, 34vmin, 290px)`;
- Statistics scale: `1.06`;
- Green icon-only `greenRoomIconPulse`: `1,8 s`;
- soba se otvara posle `3,65 s`, a overlay završava posle `4,6 s`;
- `prefers-reduced-motion` gasi animaciju.

### Zaglavlje sobe

- putanja: `statistics-free-v2.png`;
- prikaz: `34×34`, `object-fit: contain`;
- koristi isti room identitet, ne zaseban header glyph.

### Pravila

Isti Statistics identitet se pojavljuje četiri puta kroz srpski i engleski sadržaj: naslov „Kolone u igri / Game columns” i „Praćenje statistike / Tracking statistics”. Prikaz je responsivni inline glyph, standardno `1,42em`, sa manjim `1,22em` u listama i drugim postojećim kontekstualnim veličinama. Pravila ne dobijaju zaseban Statistics znak.

## Tehnički inventar

| Stavka | Dimenzija / B | SHA-256 | Odluka |
|---|---:|---|---|
| `source-assets/green-soft-clay-hires/statistics-free-v2.png` | `1254×1254 / 601.843` | `a6b66b766925133dd68cce4c290087770d602b633960d082cc42b90ac1a498ea` | jedini odobreni master |
| `www/assets/green-soft-clay/statistics-free-v2.png` | `512×512 / 99.726` | `1b410b9c5af60dfa552122a9eb2ba70abb05bb4f3fdfc4acd7ed0868679611f0` | budući canonical room runtime |
| `www/assets/green-soft-clay/runtime/menu/statistics-free-v2.png` | `384×384 / 60.928` | `e4ab3a61aecdb9e14e84159a11b4e5ca1608e87996d663114eedf903ab0654fa` | budući canonical menu runtime |
| `source-assets/green-soft-clay-hires/statistics-pro-v1.png` | `1254×1254 / 1.422.943` | `9d218e445b401c788dfcd0e0fd2dbb732e34006ab8cfc10c0f8139a4ea073c1e` | odbačeni alternate master |
| `www/assets/green-soft-clay/statistics-pro-v1.png` | `512×512 / 237.672` | `6d90b2ede4d24444469d9f017793a226ce96bf60e80bff9e0db3a5fa8330762d` | orphan runtime za uklanjanje |

Sva četiri PNG kandidata imaju direktan alpha kanal. Aktivni `512×512` asset je pixel-identičan direktnom LANCZOS smanjenju odobrenog mastera. Aktivni `384×384` meni asset je pixel-identičan LANCZOS smanjenju odobrenog `512×512` runtimea.

## Semantičke granice

Statistics Room Identity nije:

- nijedna od deset Statistics Overview metrika;
- H2H naslov, prazno stanje, VS ili detail glyph;
- Rules ilustracija „Statistika i liste”;
- Power Index watermark;
- medalja, trofej, rang ili rezultat jedne partije;
- ikona Top liste ili Solo Record identitet.

Ti sistemi ostaju u svojim već zaključanim porodicama. Deljenje Statistics podataka ili iste sobe nije razlog da se njihovi glyph-ovi spoje sa glavnom ikonom sobe.

## Preload i performance nalaz

Trenutni Green direktorijum ima `169 PNG` i `16.510.067 B` (`15,75 MB`). Aktivne room i menu varijante Statistics identiteta zajedno zauzimaju `160.654 B` i približno `1,56 MB` dekodirane memorije.

Startup zadržava jedan `384×384` Statistics meni asset; zato canonical migracija ne menja broj startup fajlova ni dekodiranu memoriju. `512×512` room varijanta ostaje van startup paketa i učitava se pri ulasku u Statistiku.

Filesystem performance audit trenutno broji `18` Statistics room PNG-ova zato što matcher po prefiksu uključuje neaktivni `statistics-pro-v1.png`. Stvarni app room paket ima `17`: jedan glavni identitet, deset Overview glyph-ova i šest H2H-specifičnih asseta. Posle uklanjanja orphan `pro` fajla i canonical zamene, oba broja treba da budu tačno `17`.

Konačna projekcija je `168 PNG` i `16.272.395 B` (`15,52 MB`) za celu Green temu. Smanjenje dolazi isključivo uklanjanjem neaktivnog `statistics-pro-v1.png`; dve aktivne isporučne varijante samo menjaju putanju, ne broj ili kvalitet.

## Sledeći korak

Korak 2 je izrada canonical `statistics-room-identity` paketa bez promene aktivnog UI-ja:

1. kopiranje odobrenog `1254×1254` mastera pod canonical imenom;
2. deterministička izrada `512×512` room i `384×384` menu varijante;
3. manifest sa jednim identitetom, dve delivery uloge, potrošačima, motion ugovorom i odbijenim `pro` kandidatom;
4. build skripta koja dokazuje LANCZOS reprodukciju i odobrene SHA-256 otiske;
5. početne automatske provere, dok aktivne putanje ostaju netaknute do Koraka 3.

Nije rađen commit niti objavljivanje.
