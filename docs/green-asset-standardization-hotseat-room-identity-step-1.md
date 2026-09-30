# Green Asset Standardization — Hotseat Room Identity, Korak 1

## Opseg i odluka

Ovaj korak je inventar i statički vizuelno-semantički audit **glavne ikone režima Dva igrača Hotseat**. Aktivni PNG-ovi, UI putanje, CSS, intro, pobednički prikaz, preload, centralni registar i cache nisu menjani. Dodati su samo ovaj dokument, audit tabla i njena reprodukcijska skripta.

Jedini zatečeni Green znak samog Hotseat režima je `mode-hotseat-free-v2.png`: dve ravnopravne glinene figure, forest-green levo i warm-ivory desno, spojene jednim terracotta akcentom. Znak je slobodnostojeći na transparentnoj podlozi, bez kvadratnog rama, teksta, medalje ili check oznake. Predstavlja **ulazak u lokalni režim za dva igrača**, ne pobednika završene partije.

Vizuelna tabla `docs/green-asset-standardization-hotseat-room-identity-audit.png` poredi postojeći izvor, room i menu kopiju, stvarne prikazne veličine i šest semantički različitih znakova. Skripta `scripts/make-green-hotseat-room-identity-audit-sheet.py` proverava RGBA/alpha, providne uglove, fiksne metapodatke, LANCZOS izvedenice i trenutni sobni paket. Tabla nije screenshot emulatora.

## Jedan glavni znak, dve isporuke

| Uloga | Aktivna putanja pod `www/assets/green-soft-clay/` | Dimenzija | Zatečeni potrošači |
|---|---|---:|---|
| room | `mode-hotseat-free-v2.png` | `512×512` | Hotseat icon-only intro i sobni katalog |
| menu | `runtime/menu/mode-hotseat-free-v2.png` | `384×384` | kartica Dva igrača u glavnom meniju i normalan DOM startup |

Odobreni izvor je `source-assets/green-soft-clay-hires/mode-hotseat-free-v2.png`, `1254×1254`. LANCZOS `1254→512` je pixel-identičan room isporuci, a `512→384` menu isporuci. Direktno `1254→384` nije pixel-identično, pa budući build mora zadržati dvostepeni postupak. Nije potreban novi render niti promena glinenog DNK-a.

Pretraga produkcionih JS/HTML/CSS fajlova nalazi dve pune room reference (`www/game.js` sobni katalog i intro konfiguracija) i jednu menu referencu (`www/index.html`). Ne postoji poseban Green Hotseat header ili Hotseat inline simbol u Pravilima koji bi trebalo izmišljati.

## Prikazi i motion

- Glavni meni: menu PNG se prikazuje `68×68` u postojećem `64×64` wrapperu, odnosno `60×60` na uskom portretnom ekranu. Zadržani su zajednički Green hover `translate(-50%, -54%) scale(1.035)` i active `translate(-50%, -47%) scale(.94)` transformi.
- Intro: room PNG koristi `clamp(210px, 34vmin, 290px)`, skalu `1`, `greenRoomIconPulse 1,8 s`, otvaranje igre iza overlay-a posle `3,65 s` i završetak posle `4,6 s`, uz reduced-motion zaštitu.
- Završni Hotseat ekran: već zaključani `canonical/hotseat-winner/hotseat-winner-v1.png` prikazuje se `58×58` samo kada postoji odlučeni pobednik. `has-result-winner` se postavlja samo za Hotseat rezultat koji nije remi; remi ispravno nema winner asset. Reveal traje `0,48 s` i ima reduced-motion fallback.

Glavna ikona dve ravnopravne figure zato ne treba da zameni pobednički znak sa istaknutom forest-green figurom i ivory check oznakom.

## Semantičke granice

1. `soloRoomIdentity` prikazuje jednog igrača; `mode-opponent-free-v2.png` prikazuje globus sa nasumičnim strelicama; `mode-invite-free-v2.png` povezane karike sa plusom. To su zasebni režimi, ne varijante Hotseat znaka.
2. `hotseatWinner` je već zaključana porodica samo za odlučenu lokalnu partiju. Ne sme se spojiti sa glavnom room ikonom niti prikazati pri remiju.
3. `h2hStatistics` prikazuje međusobni statistički odnos konkretnog rivala, a `onlinePlayersRoomIdentity` prisutnost i izbor online igrača. Dve ili tri figure u tim znakovima ne čine ih Hotseat identitetom.
4. Dve Yamb table, swipe, automatsko praćenje aktivnog igrača, aktivni igrač, nastavak/nova igra, bodovanje, završni rezultat i sva gameplay geometrija ostaju van ove room-identity standardizacije.

## Tehnički inventar

| Asset | Dimenzija / bajtova | SHA-256 |
|---|---:|---|
| `source-assets/green-soft-clay-hires/mode-hotseat-free-v2.png` | `1254×1254 / 741.942` | `ea4c3634a38bb596c9fb27541cb3a7c8f33e0514a3f279c00daa4128f30729bd` |
| `www/assets/green-soft-clay/mode-hotseat-free-v2.png` | `512×512 / 120.269` | `f1f006758f2b8fffde82401d6f89a4fc8ce3a72749114c1ad4833c3390954021` |
| `www/assets/green-soft-clay/runtime/menu/mode-hotseat-free-v2.png` | `384×384 / 74.765` | `de933f7fe0b272d177f4cd4521dc859af2045eed8ce879f3084055f3500ad0fc` |
| `www/assets/green-soft-clay/canonical/hotseat-winner/hotseat-winner-v1.png` | `256×256 / 38.409` | `4020edd452e925903508af646e4f56ec55320982fa573e3a97a25aefe4d7824b` |
| `www/assets/green-soft-clay/canonical/h2h-statistics/h2h-identity-v1.png` | `256×256 / 32.497` | `de557083a92dbb1c6a7b61286976a052ee04ad2a31db38c01708e8148aa87941` |
| `www/assets/green-soft-clay/canonical/online-players-room-identity/online-players-room-v1.png` | `512×512 / 154.856` | `319f2407117c1ec539af88248b48ee2c2daaf544342dbf36c13ed2697f2bd189` |

Svih devet auditovanih PNG-ova je RGBA sa alpha opsegom `0–255` i transparentna sva četiri ugla. Poređeni režimi i funkcionalni znakovi nisu odbačene Hotseat varijante, već ispravni zasebni identiteti.

## Preload i performance — zatečeno stanje

`prepareThemeRoomAssets('hotseat')` koristi postojeći uski matcher. Stvarni Hotseat sobni paket čine samo glavna room figura i zaključani Hotseat Winner: `2 PNG / 158.678 B / 1.310.720 decoded B`. Menu PNG nije deo sobnog paketa.

Normalni startup sa `#main-menu` DOM korenom skuplja `384 px` menu isporuku sa kartice. Rezervni tok bez glavnog menija trenutno filtrira `pack.assets`; široki `mode-hotseat` regex zato bira `512 px` room kopiju, jer menu kopija nije u odvojenom `menuAssets` katalogu. Korak 3 mora dodati precizni menu fallback i eksplicitni canonical room matcher, bez promene drugih tema i režima.

Green runtime ostaje `162 PNG / 14.792.994 B` (`14,11 MB`), startup `17 PNG / 4,56 MB / 20,44 MB decoded`, a theme/cache verzija `56`. Ovo nisu FPS ili mrežna merenja na telefonu.

## Sledeći korak

Korak 2 treba da formira kanonski `hotseat-room-identity` master i dve bit-identične izvedenice: room `512×512` i menu `384×384`, uz reprodukcijski build i manifest. Aktivni UI, intro, centralni registar, cache i stare runtime kopije ostaju netaknuti do Koraka 3. `hotseatWinner` ostaje zaključana zasebna porodica. Korak 4 je završni audit i zaključavanje.

Korak 1 ne zaključava Hotseat room identitet. Nije rađen commit, objavljivanje niti provera u Android emulatoru.
