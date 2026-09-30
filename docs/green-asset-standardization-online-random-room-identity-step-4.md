# Green Asset Standardization — Online Random Room Identity, Korak 4

## Zaključak

Green identitet režima Online Random je posle završnog **statičkog vizuelnog, semantičkog i tehničkog audita** označen kao `locked` u izvornom manifestu i centralnom registru. Zaključavanje se odnosi na glavni globus sa strelicama i njegove room/menu isporuke, ne na scanning, found, VS, disconnect/reconnect, spectate, stvarne profile igrača ili online logiku.

U ovom koraku nisu menjani produkcijski PNG pikseli, UI putanje, prikazne dimenzije, motion, trajanje intra, matchmaking, socket/reconnect logika, gameplay ili cache verzija.

## Vizuelna i binarna provera

Reprodukovana i pregledana audit tabla `docs/green-asset-standardization-online-random-room-identity-audit.png` (`1480×1398`, RGBA) prikazuje odobreni master, kanonske room i menu isporuke, stvarne prikazne veličine i šest odvojenih funkcionalnih/action znakova.

Glavni znak ostaje slobodnostojeći forest-green glineni globus sa warm-ivory meridijanima/paralelama i dve terracotta strelice u suprotnim smerovima. Podloga je providna, sva četiri ugla su transparentna, bez kvadratnog rama, teksta, profila igrača ili connection-state bedža. Čitljiv je na intro `210 px`, menu `68 px`, mobilnoj `60 px` i header `34 px` audit veličini.

Ponovljeni build potvrđuje iste fiksne otiske:

| Uloga | Dimenzija | Bajtova | SHA-256 |
|---|---:|---:|---|
| master | `1254×1254` | `767.104` | `a21b7126b79b31ae7bad4463d78f6e31c2788bded62065f91fc363d940c7541d` |
| room | `512×512` | `135.692` | `4a35ca20523d6ed8929f4179767841eee53dd1d15665078cf7e175a957a5820a` |
| menu | `384×384` | `83.367` | `a1593092e3f0634f2f07d824b9fc3173eb654f9f30690e3d20fbdf33a27aceb4` |

LANCZOS `1254→512` ostaje pixel-identičan room isporuci, a `512→384` menu isporuci. Direktno `1254→384` očekivano nije identično, pa build zaključava dvostepeni postupak.

## Veze i semantičke granice

- Room PNG ima četiri pune kanonske kodne reference: Green sobni katalog, Online Random intro, waiting-room header i mapiranje u Pravilima.
- Menu PNG ima dve pune kanonske kodne reference: karticu Online Random i eksplicitni fallback startup katalog.
- Povučene room/menu putanje imaju nula aktivnih JS/HTML/CSS referenci i njihove stare datoteke su odsutne.
- SR/EN Pravila zadržavaju dva srpska i dva engleska Multiplayer naslova koji prolaze kroz jedno Green tematsko mapiranje.
- Scanning, found, VS, disconnected i reconnected ostaju pet zasebnih funkcionalnih identiteta sa zaključanim otiscima.
- Spectate ostaje zasebna deljena online akcija i nije deo Online Random room preload paketa.

Hotseat, Online Players, H2H Statistics, Solo i Invite Friend ostaju zasebni identiteti/tokovi. Nisu menjani stvarni profili, imena, Power, POB/NER/POR podaci, matchmaking, timer pill, tehnički rezultat, spectator tok, swipe, automatsko praćenje igrača, bodovanje ili gameplay geometrija.

## Dimenzije, motion i učitavanje

Sačuvani su menu prikaz `68×68` i mobilni `60×60`, header `34×34`, intro `clamp(210px, 34vmin, 290px)` sa skalom `1,2`, pulse `1,8 s`, otvaranje igre posle `3,65 s` i završetak overlay-a posle `4,6 s`.

Scanning ostaje `54×54` sa radar motionom `1,65 s`, VS `42×42`, found `36×36` sa pop motionom `0,55 s`, a connection znak `27×27`. Reduced-motion zaštita ostaje aktivna.

Izvršavanje stvarnih loading metoda u izolovanom VM-u potvrđuje da startup sa prisutnim ili odsutnim `#main-menu` učitava tačno jednu Online Random menu sliku `384×384`, bez room PNG-a. Online Random room-on-demand vraća tačno šest PNG-ova: room znak i pet funkcionalnih stanja, bez menu i spectate slike. Easter, Desert i Severna tokovi ne dobijaju Green putanje.

## Performance i status

Online Random sobni paket ostaje `496.705 B / 3.997.696 decoded B`. Green runtime ostaje `162 PNG / 14.792.994 B` (`14,11 MB`), a startup `17 PNG / 4,56 MB / 20,44 MB decoded`. Cache verzija ostaje `58`, jer Korak 4 ne menja runtime sadržaj ili putanje. Ovo nisu FPS ili mrežna merenja na telefonu.

`source-assets/green-soft-clay-canonical/online-random-room-identity/manifest.json` i `onlineRandomRoomIdentity` u `www/themes/green/asset-registry.json` sada imaju status `locked`, isti DNK, dve kanonske isporuke, iste semantičke izuzetke i zaključanu final-audit oznaku.

Ponovljeni build, audit skripta, svih devet `npm test` provera i `git diff --check` prolaze. Audit je statički; nije rađen pregled na Android emulatoru, mrežno profilisanje niti stvarno FPS merenje. Nije rađen commit ni objavljivanje.

Online Random Room Identity ciklus Koraci 1–4 je završen.
