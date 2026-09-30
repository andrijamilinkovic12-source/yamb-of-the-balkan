# Green Asset Standardization — Invite Friend Room Identity, Korak 4

## Zaključak

Green identitet sobe „Pronađi/Pozovi prijatelja“ je posle završnog **statičkog vizuelnog, semantičkog i tehničkog audita** označen kao `locked` u izvornom manifestu i centralnom registru. Zaključavanje se odnosi na glavni znak dve povezane glinene karike sa plusom i njegove room/menu isporuke, ne na add/search, send, empty, sent, accepted, H2H podatke, stvarne profile prijatelja ili invitation/socket logiku.

U ovom koraku nisu menjani produkcijski PNG pikseli, UI putanje, prikazne dimenzije, motion, trajanje intra, friend/invitation funkcionalnost, gameplay ili cache verzija.

## Vizuelna i binarna provera

Reprodukovana i pregledana audit tabla `docs/green-asset-standardization-invite-friend-room-identity-audit.png` (`1480×1398`, RGBA) prikazuje odobreni master, kanonske room i menu isporuke, stvarne prikazne veličine, četiri odvojena invitation stanja, deljenu add-friend akciju i zaključani H2H empty identitet.

Glavni znak ostaje par povezanih forest-green i warm-ivory glinenih karika sa odvojenim terracotta plusom. Podloga je providna, sva četiri ugla su transparentna, bez kvadratnog rama, teksta, profila igrača ili invitation-state bedža. Čitljiv je na intro `210 px`, menu `68 px`, mobilnoj `60 px` i header `34 px` audit veličini.

Ponovljeni build potvrđuje iste fiksne otiske:

| Uloga | Dimenzija | Bajtova | SHA-256 |
|---|---:|---:|---|
| master | `1254×1254` | `930.755` | `5a59eccad3f26779dbe2e8388f51916681e285cffd31b7f904231ffb3872a183` |
| room | `512×512` | `150.862` | `30894f35a73c1ae1e1ca27267c2342e7c2aac46753c3d8ccffcc5bfaaa0dd356` |
| menu | `384×384` | `92.386` | `ae634e3928fef02d57d8dc13f5415ff5de76e1451575a92a155319fd1c5b77e4` |

LANCZOS `1254→512` ostaje pixel-identičan room isporuci, a `512→384` menu isporuci. Direktno `1254→384` očekivano nije identično, pa build zaključava dvostepeni postupak.

## Veze i semantičke granice

- Room PNG ima četiri pune kanonske kodne reference: Green sobni katalog, Invite Friend intro, waiting-room header i mapiranje u Pravilima.
- Menu PNG ima dve pune kanonske kodne reference: karticu Invite Friend i eksplicitni fallback startup katalog.
- Povučene room/menu putanje imaju nula aktivnih JS/HTML/CSS referenci i njihove stare datoteke su odsutne.
- SR/EN Pravila zadržavaju srpski i engleski naslov privatnih duela kroz jedno Green tematsko mapiranje.
- Send, empty, sent i accepted ostaju četiri zasebna funkcionalna identiteta sa zaključanim otiscima.
- Add/search friend ostaje zasebna deljena akcija i nije deo uskog Invite Friend room preload paketa.
- H2H empty i greatest-rival prikaz ostaju u zasebnoj zaključanoj H2H porodici.

Online Players, Online Random i Hotseat ostaju zasebni identiteti/tokovi. Nisu menjani stvarni profili, imena, Power, POB/NER/POR podaci, pretraga prijatelja, zahtevi, slanje i prihvatanje pozivnica, room join, socket/reconnect tok, table, swipe, automatsko praćenje aktivnog igrača, bodovanje ili gameplay geometrija.

## Dimenzije, motion i učitavanje

Sačuvani su menu prikaz `68×68` i mobilni `60×60`, header `34×34`, intro `clamp(210px, 34vmin, 290px)` sa skalom `1,05`, pulse `1,8 s`, otvaranje sobe posle `3,65 s` i završetak overlay-a posle `4,6 s`.

Shared add-friend ostaje `52×52` sa `greenInviteSoftBreath 2,1 s`, empty `64×64`, send `18×18`, sent/accepted toast znakovi `52×52`, a panel-lift `0,44 s`. Reduced-motion zaštita ostaje aktivna.

Izvršavanje stvarnih loading metoda u izolovanom VM-u potvrđuje da startup sa prisutnim ili odsutnim `#main-menu` učitava tačno jednu Invite Friend menu sliku `384×384`, bez room PNG-a. Invite Friend room-on-demand vraća tačno pet PNG-ova: room znak i četiri funkcionalna stanja, bez menu, shared add-friend i H2H slike. Easter, Desert i Severna tokovi ne dobijaju Green putanje.

## Performance i status

Invite Friend sobni paket ostaje `447.128 B / 3.407.872 decoded B`. Green runtime ostaje `162 PNG / 14.792.994 B` (`14,11 MB`), a startup `17 PNG / 4,56 MB / 20,44 MB decoded`. Cache verzija ostaje `59`, jer Korak 4 ne menja runtime sadržaj ili putanje. Ovo nisu FPS ili mrežna merenja na telefonu.

`source-assets/green-soft-clay-canonical/invite-friend-room-identity/manifest.json` i `inviteFriendRoomIdentity` u `www/themes/green/asset-registry.json` sada imaju status `locked`, isti DNK, dve kanonske isporuke, iste semantičke izuzetke i zaključanu final-audit oznaku.

Ponovljeni build, audit skripta, kompletan `npm test` skup i `git diff --check` prolaze. Audit je statički; nije rađen pregled na Android emulatoru, mrežno profilisanje niti stvarno FPS merenje. Nije rađen commit ni objavljivanje.

Invite Friend Room Identity ciklus Koraci 1–4 je završen.
