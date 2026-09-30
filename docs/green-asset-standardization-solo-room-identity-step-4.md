# Green Asset Standardization — Solo Room Identity, Korak 4

## Zaključak

Green identitet Solo sobe je posle završnog **statičkog vizuelnog, semantičkog i tehničkog audita** označen kao `locked` u izvornom manifestu i centralnom registru. Zaključavanje se odnosi na jednu slobodnostojeću glinenu figuru igrača i njene room/menu isporuke. Solo Results, Rewarded Video, Hotseat Winner i ostala tri režima ostaju zasebne zaključane ili nezavisne porodice.

U ovom koraku nisu menjani produkcijski PNG pikseli, UI putanje, prikazne dimenzije, motion, trajanje intra, gameplay ili cache verzija.

## Vizuelna i binarna provera

Reprodukovana i pregledana audit tabla `docs/green-asset-standardization-solo-room-identity-audit.png` (`1480×1398`, RGBA) prikazuje odobreni master, kanonske room i menu isporuke, stvarne prikazne veličine i semantičko poređenje sa Hotseat, Online Random, Invite, Solo Results i Hotseat Winner znakovima.

Solo znak ostaje jedna zaobljena forest-green glinena figura, sa toplim ivory prstenom oko vrata i jednim terracotta visećim akcentom. Pozadina je providna, sva četiri spoljna ugla su transparentna i nema kvadratnog rama, natpisa, medalje ili rezultatskog simbola.

Ponovljeni build potvrđuje iste fiksne otiske:

| Uloga | Dimenzija | Bajtova | SHA-256 |
|---|---:|---:|---|
| master | `1254×1254` | `958.718` | `d2f92460d5f04efebf7ac708a1ff49d62521550335ead7a4e94fa543a2beecd9` |
| room | `512×512` | `156.807` | `d697e38721762c01fcf90a13475ff67dc7413b677765c70865ff3453e589ceb4` |
| menu | `384×384` | `93.182` | `71ea4a39070b18d03403818a26689add95223ccbd952736282ddaf4031bd4ee5` |

LANCZOS `1254→512` ostaje pixel-identičan room isporuci, a `512→384` menu isporuci. Direktno `1254→384` očekivano nije identično, zato reprodukcijska skripta zaključava dvostepeni postupak.

## Veze, motion i semantičke granice

- Room PNG ima dve pune kanonske kodne reference: Green sobni katalog i Solo intro konfiguraciju.
- Menu PNG ima dve pune kanonske kodne reference: Solo karticu i eksplicitni fallback startup katalog.
- Povučene room/menu putanje imaju nula aktivnih JS/HTML/CSS referenci i njihove stare datoteke su odsutne.
- Istorijski skriveni `green-solo-result-mark` više ne postoji. Vidljivi završni znak ostaje zaključani `soloResults/finish-score-mark-v1.png`; Personal Best i Finish Claim ostaju zasebni rezultatski identiteti.
- Rewarded Video/dukat kompozicija, Hotseat Winner, Hotseat, Online Random i Invite nisu preimenovani, spojeni ili zamenjeni Solo figurom.

Sačuvani su menu prikaz `68×68`, mobilni `60×60`, hover/press transformi, intro `clamp(210px, 34vmin, 290px)`, pulse `1,8 s`, otvaranje igre iza overlay-a posle `3,65 s`, završetak overlay-a posle `4,6 s` i reduced-motion zaštita.

## Učitavanje, performance i izolacija

Izvršavanje stvarnih loading metoda u izolovanom VM-u potvrđuje da startup sa prisutnim ili odsutnim `#main-menu` učitava tačno jednu Solo menu sliku `384×384`, bez room PNG-a. Solo room-on-demand vraća pet PNG-ova: room figuru, Personal Best, Final Score Mark, Rewarded Video kompoziciju i Finish Claim, bez menu slike.

Solo sobni paket iznosi `373.688 B / 2.424.832 decoded B`. Green runtime ostaje `162 PNG / 14.792.994 B` (`14,11 MB`), a startup `17 PNG / 4,56 MB / 20,44 MB decoded`. Easter, Desert i Severna tokovi ne dobijaju Green Solo putanje. Ove brojke nisu merenje FPS-a ili vremena prikaza na telefonu.

## Status i granica verifikacije

`source-assets/green-soft-clay-canonical/solo-room-identity/manifest.json` i `soloRoomIdentity` u `www/themes/green/asset-registry.json` sada imaju status `locked`, isti DNK, dve kanonske isporuke, iste semantičke izuzetke i zaključanu final-audit oznaku. Green cache ostaje `56`, jer Korak 4 nije promenio runtime sadržaj ili putanje.

Ponovljeni build, audit skripta, svih devet `npm test` provera i `git diff --check` prolaze. Audit je statički; nije rađen pregled na Android emulatoru, mrežno profilisanje niti stvarno FPS merenje. Nije rađen commit ni objavljivanje.
