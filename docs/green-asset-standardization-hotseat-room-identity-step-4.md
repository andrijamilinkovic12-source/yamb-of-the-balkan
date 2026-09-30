# Green Asset Standardization — Hotseat Room Identity, Korak 4

## Zaključak

Green identitet režima Dva igrača Hotseat je posle završnog **statičkog vizuelnog, semantičkog i tehničkog audita** označen kao `locked` u izvornom manifestu i centralnom registru. Zaključavanje se odnosi na dve ravnopravne glinene figure i njihove room/menu isporuke, ne na odlučeni Hotseat Winner, remi, H2H statistiku, Online Players ili druge režime.

U ovom koraku nisu menjani produkcijski PNG pikseli, UI putanje, prikazne dimenzije, motion, trajanje intra, winner/remi logika, gameplay ili cache verzija.

## Vizuelna i binarna provera

Reprodukovana i pregledana audit tabla `docs/green-asset-standardization-hotseat-room-identity-audit.png` (`1480×1398`, RGBA) prikazuje odobreni master, kanonske room i menu isporuke, stvarne prikazne veličine i poređenje sa Solo, Online Random, Invite, Hotseat Winner, H2H i Online Players identitetima.

Glavni znak ostaje par ravnopravnih zaobljenih glinenih figura: forest-green levo, warm-ivory desno i jedan terracotta spojni akcenat. Podloga je providna, sva četiri ugla su transparentna, bez kvadratnog rama, teksta, medalje ili winner check oznake.

Ponovljeni build potvrđuje iste fiksne otiske:

| Uloga | Dimenzija | Bajtova | SHA-256 |
|---|---:|---:|---|
| master | `1254×1254` | `741.942` | `ea4c3634a38bb596c9fb27541cb3a7c8f33e0514a3f279c00daa4128f30729bd` |
| room | `512×512` | `120.269` | `f1f006758f2b8fffde82401d6f89a4fc8ce3a72749114c1ad4833c3390954021` |
| menu | `384×384` | `74.765` | `de933f7fe0b272d177f4cd4521dc859af2045eed8ce879f3084055f3500ad0fc` |

LANCZOS `1254→512` ostaje pixel-identičan room isporuci, a `512→384` menu isporuci. Direktno `1254→384` očekivano nije identično, pa build zaključava dvostepeni postupak.

## Veze, motion i semantičke granice

- Room PNG ima dve pune kanonske kodne reference: Green sobni katalog i Hotseat intro konfiguraciju.
- Menu PNG ima dve pune kanonske kodne reference: karticu Dva igrača i eksplicitni fallback startup katalog.
- Povučene room/menu putanje imaju nula aktivnih JS/HTML/CSS referenci i njihove stare datoteke su odsutne.
- Zaključani Hotseat Winner ostaje `58×58` rezultatski znak sa reveal motionom `0,48 s`, samo kada važi `isHotseatResult && !isDraw`; remi nema winner znak.
- Solo, Online Random, Invite, H2H i Online Players identiteti ostaju zasebni.

Sačuvani su menu prikaz `68×68`, mobilni `60×60`, hover/press transformi, intro `clamp(210px, 34vmin, 290px)`, pulse `1,8 s`, otvaranje igre iza overlay-a posle `3,65 s`, završetak overlay-a posle `4,6 s` i reduced-motion zaštite.

Nisu menjani aktivni igrač, imena, poeni, dve table, swipe, automatsko praćenje, nastavak/nova igra, bodovanje, save recovery ili gameplay geometrija.

## Učitavanje, performance i izolacija

Izvršavanje stvarnih loading metoda u izolovanom VM-u potvrđuje da startup sa prisutnim ili odsutnim `#main-menu` učitava tačno jednu Hotseat menu sliku `384×384`, bez room PNG-a. Hotseat room-on-demand vraća tačno dva PNG-a: room znak i zaključani Hotseat Winner, bez menu slike.

Hotseat sobni paket iznosi `158.678 B / 1.310.720 decoded B`. Green runtime ostaje `162 PNG / 14.792.994 B` (`14,11 MB`), a startup `17 PNG / 4,56 MB / 20,44 MB decoded`. Easter, Desert i Severna tokovi ne dobijaju Green Hotseat putanje. Ovo nisu FPS ili mrežna merenja na telefonu.

## Status i granica verifikacije

`source-assets/green-soft-clay-canonical/hotseat-room-identity/manifest.json` i `hotseatRoomIdentity` u `www/themes/green/asset-registry.json` sada imaju status `locked`, isti DNK, dve kanonske isporuke, iste semantičke izuzetke i zaključanu final-audit oznaku. Green cache ostaje `57`, jer Korak 4 nije promenio runtime sadržaj ili putanje.

Ponovljeni build, audit skripta, svih devet `npm test` provera i `git diff --check` prolaze. Audit je statički; nije rađen pregled na Android emulatoru, mrežno profilisanje niti stvarno FPS merenje. Nije rađen commit ni objavljivanje.
