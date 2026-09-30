# Green Asset Standardization — Invite Friend Room Identity, Korak 1

## Opseg i odluka

Ovaj korak je inventar i statički vizuelno-semantički audit **glavnog identiteta sobe Pozovi/Pronađi prijatelja**. Aktivni PNG-ovi, UI putanje, Pravila, CSS, intro, friend/H2H podaci, socket tok, preload, centralni registar i cache nisu menjani. Dodati su samo ovaj dokument, audit tabla i reprodukcijska skripta.

Jedini zatečeni Green znak same sobe je `mode-invite-free-v2.png`: jedna forest-green i jedna warm-ivory zaobljena glinena karika, spojene u lanac, uz izdvojeni terracotta plus. Znak je slobodnostojeći na transparentnoj podlozi, bez kvadratnog rama, teksta, profila igrača ili statusne oznake. Predstavlja **ulazak u privatni duel preko prijatelja/pozivnice**, ne dodavanje prijatelja, slanje poziva, praznu listu, poslatu/prihvaćenu pozivnicu ili konkretnog H2H rivala.

Audit tabla `docs/green-asset-standardization-invite-friend-room-identity-audit.png` poredi odobreni izvor, room i menu kopiju, četiri stvarne prikazne veličine i šest zasebnih funkcionalnih/semantičkih znakova. `scripts/make-green-invite-friend-room-identity-audit-sheet.py` proverava RGBA/alpha, providne uglove, fiksne otiske, LANCZOS izvedenice i trenutni sobni paket. Tabla nije screenshot emulatora.

## Jedan glavni znak, dve isporuke

| Uloga | Aktivna putanja pod `www/assets/green-soft-clay/` | Dimenzija | Zatečeni potrošači |
|---|---|---:|---|
| room | `mode-invite-free-v2.png` | `512×512` | sobni katalog, icon-only intro, waiting-room header i Green mapiranje privatnog duela u SR/EN Pravilima |
| menu | `runtime/menu/mode-invite-free-v2.png` | `384×384` | kartica Pozovi prijatelja u glavnom meniju i normalan DOM startup |

Odobreni izvor je `source-assets/green-soft-clay-hires/mode-invite-free-v2.png`, `1254×1254`. LANCZOS `1254→512` je pixel-identičan room isporuci, a `512→384` menu isporuci. Direktno `1254→384` nije pixel-identično; budući build mora zadržati dvostepeni postupak. Nije potreban novi render niti promena glinenog DNK-a.

Pretraga produkcionih JS/HTML/CSS fajlova nalazi četiri pune room reference: sobni katalog i intro u `www/game.js`, waiting-room header u `www/index.html` i Green mapiranje u `www/pravilaigre.js`. Menu ima jednu punu referencu na kartici.

## Prikazi i motion

- Glavni meni: menu PNG je `68×68`, odnosno `60×60` na uskom portretu, sa postojećim zajedničkim Green hover/press transformima.
- Intro: room PNG koristi wrapper `clamp(210px, 34vmin, 290px)`, konfiguracionu skalu `1,05`, `greenRoomIconPulse 1,8 s`, otvaranje sobe posle `3,65 s` i završetak overlay-a posle `4,6 s`, uz reduced-motion zaštitu.
- Waiting-room header: room PNG je `34×34` za domaćina i pozvanog igrača, bez dodatnog motiona.
- Add-friend: deljena akcija je `52×52` sa `greenInviteSoftBreath 2,1 s` i reduced-motion fallbackom.
- Invite stanja: prazna lista koristi `64×64`; send akcija na kartici `18×18`; sent/accepted toast znakovi `52×52`.
- Ulazni paneli sobe zadržavaju postojeći lift motion `0,44 s` sa sekvencijalnim kašnjenjima i reduced-motion zaštitom.
- Greatest-rival prikaz koristi stvarnu fotografiju/profil kada postoji; zajednički zaključani H2H empty znak prikazuje se na `54×54` samo kada rival ne postoji.

Ove mere i animacije pripadaju postojećem UI-ju; Korak 1 ih samo evidentira.

## Funkcionalni asseti i semantičke granice

| Asset | Uloga | Granica |
|---|---|---|
| `online-add-friend-v1.png` | dodavanje/pretraga prijatelja | deljena akcija Online Players i Invite toka; nije room logo |
| `invite/send-v1.png` | slanje pozivnice sa stvarne kartice | akcija, ne ulaz u sobu |
| `invite/empty-v1.png` | nema dostupnih prijatelja/zahteva | list-state, ne room logo |
| `invite/sent-v1.png` | potvrda da je poziv poslat | toast status |
| `invite/accepted-v1.png` | potvrda da je poziv prihvaćen | toast status |
| `canonical/h2h-statistics/h2h-empty-v1.png` | najveći rival ne postoji | zaključani H2H Statistics identitet, samo ponovna upotreba istog pojma |

Sva četiri invite state runtime PNG-a su verne LANCZOS `512→384` izvedenice svojih odobrenih source PNG-ova. Isto važi za deljeni add-friend asset. Oni nisu odbačene varijante glavnog znaka.

Stvarne friend/rival kartice, fotografije, imena, Power i POB/NER/POR podaci ostaju živi UI. Friend search, zahtevi, lista i dostupnost, slanje/prihvatanje pozivnice, room join, socket/reconnect, ručni swipe, automatsko praćenje aktivnog igrača, bodovanje i gameplay geometrija ostaju van room-identity standardizacije.

Online Players, Online Random, Hotseat, H2H Statistics i Solo ostaju zasebne zaključane porodice/tokovi. `online-duel-v1.png` pripada direktnom izazovu iz Online Players konteksta i nije deo uskog Invite Friend room-identity inventara.

## Tehnički inventar

| Asset | Dimenzija / bajtova | SHA-256 |
|---|---:|---|
| `source-assets/green-soft-clay-hires/mode-invite-free-v2.png` | `1254×1254 / 930.755` | `5a59eccad3f26779dbe2e8388f51916681e285cffd31b7f904231ffb3872a183` |
| `www/assets/green-soft-clay/mode-invite-free-v2.png` | `512×512 / 150.862` | `30894f35a73c1ae1e1ca27267c2342e7c2aac46753c3d8ccffcc5bfaaa0dd356` |
| `www/assets/green-soft-clay/runtime/menu/mode-invite-free-v2.png` | `384×384 / 92.386` | `ae634e3928fef02d57d8dc13f5415ff5de76e1451575a92a155319fd1c5b77e4` |
| `www/assets/green-soft-clay/online-add-friend-v1.png` | `384×384 / 76.237` | `61dc2f1a57f475a2279f48337590784f527edcf2044e53c52df43f1814ef0dda` |
| `www/assets/green-soft-clay/invite/send-v1.png` | `384×384 / 73.781` | `232862a11b63bf8e637980184c56289c584fd1cd45f71ed6298e08e0053e1628` |
| `www/assets/green-soft-clay/invite/empty-v1.png` | `384×384 / 60.682` | `be936013867a9a3946bac39846ec254c2bc77ee9241901c55625648a74aff6b9` |
| `www/assets/green-soft-clay/invite/sent-v1.png` | `384×384 / 70.705` | `809b913c55e33e080f238c0a71b5b3ff002bb3237f49d584be434d171f286994` |
| `www/assets/green-soft-clay/invite/accepted-v1.png` | `384×384 / 91.098` | `dc90636ed9aabdacf4f61a70d49c1056dbdaeee46bedb3b1e838b29aaa22925a` |
| `www/assets/green-soft-clay/canonical/h2h-statistics/h2h-empty-v1.png` | `384×384 / 49.705` | `43bc21b1893ae56d609d69ad429cdfc502e343fcd08c1df7956bbfb74f358c70` |

Svih devet auditovanih PNG-ova je RGBA sa punim alpha opsegom i transparentna sva četiri ugla.

## Preload i performance — zatečeno stanje

Trenutni `invite` matcher bira `invite/` ili `mode-invite`. Kataloški room-on-demand paket zato ima pet PNG-ova: glavni room znak i četiri invite stanja, ukupno `447.128 B / 3.407.872 decoded B`. Deljeni add-friend i zaključani H2H empty nisu deo ovog uskog matchera; učitavaju se preko svojih postojećih deljenih/dinamičkih veza kada su potrebni.

Normalni startup sa `#main-menu` DOM korenom skuplja `384 px` menu isporuku. Rezervni tok bez glavnog menija trenutno filtrira `pack.assets`; široki `mode-invite` regex zato bira `512 px` room kopiju, jer menu kopija nije u odvojenom `menuAssets` katalogu. Korak 3 mora dodati precizni menu fallback i canonical room matcher, bez promene drugih tema ili friend/socket funkcionalnosti.

Green runtime ostaje `162 PNG / 14.792.994 B` (`14,11 MB`), startup `17 PNG / 4,56 MB / 20,44 MB decoded`, a theme/cache verzija `58`. Ovo nisu FPS, socket ili mrežna merenja na telefonu.

## Sledeći korak

Korak 2 treba da formira kanonski `invite-friend-room-identity` master i dve bit-identične izvedenice: room `512×512` i menu `384×384`, uz reprodukcijski build i manifest. Aktivni UI, header, Pravila, invite states, add-friend, H2H, preload, registar, cache i stare runtime kopije ostaju netaknuti do Koraka 3. Korak 4 je završni audit i zaključavanje.

Korak 1 ne zaključava Invite Friend room identitet. Nije rađen commit, objavljivanje niti provera u Android emulatoru.
