# Emulator — delimična vizuelna provera, 25.10.2026.

## Ručni izbor teme — QA i lokalna R34,30.10.2026.

R34, lokalno game.jsv6.38: na QA v6.36 prvi izbor Green→Neon ostavio je Green, ponovljeni je uspeo. Tačan spor PNG/HTTP zahtev nije identifikovan. Ručni izbor iz Podešavanja sada ima jedan automatski retry preko postojećeg image/decode cachea; gate čeka oba vidljiva paketa i retry. Konačan neuspeh čuva prethodnu kompletnu temu. Noviji izbor, offline i promena naloga zaštićeni. Nije dokaz ubrzanog prvog preuzimanja ili popravke na Androidu pre deploya. [Native dokaz](theme-switch-2026-10-30/index.html). Zelena/SRB vraćeni na drugom emulatoru; originalna rezolucija nije menjana. Povremeni ADB screenshot failure i Windows capture timeout oporavljeni ponovnom proverom; nema nove partije/poziva/oglasa ili pritiska na nagradu.

## Lokalna dopuna — završni panel i tokovi,30.10.2026.

[150lokalnih stanja i20slika](finish-resize-2026-10-30/index.html):10tema,3ishoda,5uzastopnih viewporta, mobilni DPR3.5, animacije uključene. Granice/centar/PNG i bez skrola prolaze, nema nagradnih/revanš zahteva. Android wm/density problem nije ponovljen niti ovim zatvoren; runtime dizajn nije menjan. Handler testovi revanša/reconnecta prolaze. Lokalni Socket.IO test poziva dva klijenta prolazi; početni20srok pokretanja bio je nedovoljan, uz eksplicitno120sčekanje test završen. Podrazumevani rok i produkcioni server ostaju isti. Nema novog native meča, oglasa, nagrade ili poziva pravim nalozima. [Aktuelni plan](remaining-work-plan-2026-10-29.md) sada odvaja zatvorene stavke od preostalih.

## Važna dopuna pri ponovnom pokretanju — 30.10.2026.

Nastavak30.10: oba emulatora su bila ugašena; ponovo pokrenuta bez brisanja podataka, QA aplikacije otvorene i oba glavna menija pregledana. Postojeći recoverPendingGameRewards pri autentikaciji automatski je preuzeo439/675 osnovnih dukata iz prethodne sesije (runtimeId se promenio), iako korisnik nije odobrio preuzimanje. Nije bilo klika na nagradno dugme, reklame, dupliranja, revanša ili nove partije. Server potvrđuje rewardClaimedCount=2, salda2939/12168; Daily ostaje nepreuzet. Prethodni zapisi claim=0 opisuju stanje pre ponovnog pokretanja. Produkcija nije korišćena; salda nisu ručno menjana.

Završni panel posle promene rezolucije ima odvojeni otvoreni nalaz: jedan kasniji kadar drugog uređaja je pomeren/odsečen. Uzrok nije utvrđen. Oba današnja glavna menija pravilno su prikazana; završni panel nije ponovo otvaran novom igrom.

### Nastavak posle prekida — 30.10.2026.

Posle vraćanja rezolucije drugi emulator ima i ispravan i kasniji pomeren/odsečen kadar. Uzrok nije utvrđen. Dimenzije PNG fajla same po sebi nisu dokaz ispravnog rasporeda; potreban ponovljen stabilan prikaz bez promene geometrije. Oba emulatora su pri nastavku bila ugašena i ponovo su pokrenuta bez brisanja podataka. Ranija tvrdnja o ostavljanju završnih panela opisuje stanje prethodne sesije; nije dokaz današnjeg stanja. Nema novih partija, reklama ili preuzimanja nagrada.

## Dva emulatora posle restarta — 29.10.2026.

### Aktuelni izdvojeni QA — nastavak 29.10.2026.

Korisnik je objavio commit `910b816c` i prebacio QA servis na aktuelnu granu. Read-only health potvrđuje staging/reconnect-qa-01; javni `game.js?v=6.36` odgovara commitu nakon normalizacije CRLF/LF. Zasebni APK `com.yamb.balkan.staging` ima potvrđen QA URL, odvojeni Firebase i bazu `yamb_reconnect_qa`. Korisnik se ručno prijavio na oba uređaja. Test salda na početku: Andrija500, Sara9721. Ne mešati ove profile sa ranijim produkcionim testom.

**Daily: aktivni i završni panel svih10tema završen.** [20 Android snimaka i granice](daily-qa-2026-10-29/index.html). Isti legitimni nepreuzeti izazov ponovo otvaran posle restarta QA aplikacije, bez resetovanja pokušaja. Svaki put šest STOP pritisaka, serverove kockice6/6/2/5/3/1, zbir57. Nema reklame ili preuzimanja. Boje/PNG/fontovi/panel u snimljenim stanjima pregledni; Plavi okean jednom sa dozvoljenim univerzalnim skinom Trule višnje. Oglasi su u QA blokirani, pa sivo dugme dupliranja nije dokaz kvara produkcionog oglasa. Prvi izbor Light/Medium nije uspeo, ponovljeni jeste; hladno učitavanje ostaje otvoren nalaz.

**Priprema test podataka, odvojeno od UI provere:** samo dva proverena QA profila dobila su deset themeID-jeva u inventaru, uz sačuvan snapshot prethodnog stanja. Nekoliko promena activeTheme/activeSkin korišćeno kao početne QA postavke; klijentski sačuvani izbor ih je mogao nadjačati, pa su naredne teme izabrane kroz običan meni. Salda/pokušaji/rezultati nisu ručno menjani. Ove testne pripreme nisu dokaz kupovine ili otključavanja teme u produkciji.

Prvi emulator imao je zaleđen framebuffer; ponovo pokrenut sa SwiftShaderom bez brisanja podataka. Android SystemUI ANR oporavljen opcijomWait. Oba potom privremeno720×1560/280dpi, proporcionalno izvornim1440×3120/560dpi, isti logički viewport ~411×891. Originalne mere treba vratiti po završetku celog nastavka.

**Završna dopuna30.10.2026: osnovni vizuelni pregled15/15**, uz izričite granice pojedinačnih izveštaja. [Random27Androidsnimaka i stvarni regular rezultat](random-qa-2026-10-29/index.html): aktivna igra10tema, zasebna puna partija156upisa, Sara450/Andrija293, potvrđeni PowerIndex+106/0 i server `regular/completed_scores`. Oba završna panela pregledana uGreen/Moon, ostale završne teme imaju raniji izolovani dokaz. Najava, držanje kockice i drugo bacanje stvarno potvrđeni na oba uređaja. R27 Vaskršnji megafon vidljiv u obe table; R32 poruke imaju pravu perspektivu. Ovo nije potvrda svih retkih stanja i svih10nativezavršetaka.

Četiri prethodna QA pokušaja završena istekom tokom čekanja/neobrađenog mrežnog obaveštenja/preskočenih tapova vode se odvojeno; nisu obični završeci ni dokaz pogrešnog serverovog obračuna. Povratak veze i revanš ostaju netestirani. Korisnik je odbio dodatno preuzimanje439/675QAdukata; osnovne iDaily nagrade ostaju nepreuzete, bez reklame. Automatski trofejni bonusi pri završetku su zasebni: AndrijaProrok1500+Krompiruša500, SaraKrompiruša500. Salda nisu ručno menjana. Originalne1440×3120/560dpi i mreža1/1 vraćeni, QA prijave i završni paneli sačuvani bez restarta/nagradne navigacije.

R33 ostaje lokalno v6.37 i čeka korisnikov commit/deploy. Reklame/isplata na telefonu, hladno učitavanje, fizičkiS25 i potvrda svih drugih lokalnih nalaza nisu ovim završeni.

[Objedinjeni plan preostalih provera](remaining-work-plan-2026-10-29.md) razdvaja osnovne preglede, funkcionalne testove i potvrdu posle deploya.

[18 Android snimaka](two-emulators-2026-10-29/index.html), [rezultati i ograničenja](two-emulators-2026-10-29/report.json). Pokrenuti Easter_QA_10GB i Duel_QA_Player2, sačuvane prijave Andrije i Sare, originalnih 1440×3120/560dpi. Android SystemUI je pri startu drugog emulatora zastao; zakašnjeli unos otvorio je Random čekanje, otkazano pre uparivanja. Posle toga pokrenut je zaseban kontrolisani test dva korisnikova naloga.

**Dnevni izazov:** na Sarinom nalogu u Truloj višnji zaustavljeno svih šest kockica: `[4,2,3,5,1,4]`, rezultat `(4+2+3+5)×1×4=56`. Aktivni i završni panel staju u ekran. Završni PNG pojavio se tek u narednom kadru; brzina prvog učitavanja nije potvrđena. Bez reklame ili preuzimanja; nakon ponovnog otvaranja aplikacije saldo je ostao 4107. Ovo je stvarni aktivni/završni dokaz jedne teme, ne svih deset.

**Random:** uparivanje Sare i Andrije potvrđeno po imenima. Oba prikaza table viđena, ali prvi sačuvani kadrovi imaju samo 12/8 sekundi preostalog poteza. Test nije izvršio potvrđen upis pre isteka vremena. Nije izmeren uzrok potrošenog vremena; ne pripisivati ga aplikaciji, mreži ili introu. Običan završetak, reklama, dupliranje, revanš i reconnect nisu potvrđeni.

**Stvarne posledice neuspešnog test poteza:** server je automatski obračunao tehnički rezultat bez pritiska na preuzimanje. Sara: 4107 → 2349 dukata (−1758), prikazana kazna −20 Indeksa moći. Andrija: 18547 → 20322 dukata (+1775), liga 37969 → 39744. Serverov tok obračunava i statistiku/H2H; sve te pojedinačne vrednosti nisu dodatno proverene. Posledice nisu poništene, baza i salda nisu ručno menjani. Korisnik je obavešten.

**R32 — lokalna ispravka:** gubitnik je uz PORAZ video serverovu zajedničku poruku „Protivniku je isteklo vreme! Tehnička pobeda.” Klijent sada bira lokalizovanu poruku prema sopstvenoj ulozi. Osam izolovanih testova stvarnog handlera pokriva obe uloge, srpski/engleski, potvrđen serverski/lokalni obračun i zaštitu od ponovljenog ili zastarelog događaja. Ekonomija i tajmer nisu menjani. `game.js?v=6.36`, bez commita/deploya; emulator još ne potvrđuje ovu ispravku.

Oba uređaja ostavljena na svojim glavnim menijima (Zelena/Trula višnja), bez novog meča ili reda čekanja. Osnovni audit se **ne povećava automatski sa 13/15**: novi Daily dokaz je samo jedne teme, a običan Random tok nije završen. Dalji testovi koji menjaju profile treba da koriste odvojeni QA. Read-only `/healthz` potvrđuje postojeći izolovani servis `yamb-reconnect-qa`, staging instancu `reconnect-qa-01`, ali njegov klijent je stariji `game.js?v=5.49`; potrebno je posebno pripremiti aktuelnu QA verziju. Produkcioni commit/deploy nije rađen.

## Pozovi prijatelja — svih deset tema, 29.10.2026.

[Android i odvojeni lokalni prikazi](invite-friend-2026-10-29/index.html), [80 PNG putanja i granice](invite-friend-2026-10-29/report.json). Osnovni domaćin pregledan u svih deset tema na originalnih1440×3120/560dpi (~411×891CSSpx): nalog/rival, lista prijatelja/zahteva, pretraga i izlaz. Green dodatno vodoravni strip i fokus pretrage. Nema stvarnog slanja/prihvatanja/odbijanja poziva ili prijateljstva, duela, rezultata ili nagrada. Link za deljenje ostaje skriven.

**R31 — lokalno, nije objavljeno:** slučajni obrub sužavao devet tema, nejednaki profili/razmaci/fontovi/dugmad/prazna lista i Vaskršnji/Pustinjski nasleđeni stilovi. Ujednačeno premaGreen uz postojeće materijale/palete,34px zaglavnu ikonu i poseban `invite-friend` modalni kontekst. Statistika i status ostaju u kartici; do649px visine avatar+ime dele gornji red iste138px kartice. Novi PNG nisu potrebni.

450 izolovanih stvarnih produkcionih prikaza prolazi:10tema×9stanja×5veličina320×568/360×640/360×780/390×844/430×932. Host/prijatelji/zahtev/prazno/bezrivala/pretraga-refresh, guest čeka/pronađen, modal/toast. Green mere/fontovi, PNG decode i glavno rutiranje, bez sobnog skrola/safezone i prelivanja sadržaja kartice. Sintetički soketi/profili; bez konstruktora/naloga, blokirani spoljni zahtevi. Animacije isključene/offline font fallback moguć; nije stvarni guest ili nagrada na Androidu. Lokalni Socket.IO tokovi i ciljane regresije prolaze.

**Granice:** prvi Neon i Ametist izbor vratili prethodnu temu, ponovljeni uspeli; uzrok/stabilnost hladnog transfera otvoreni. Tastatura emulatora bila samo plutajući/stylus panel, ne puna resize tastatura. Intro2400/3200ms proveren statički, ne kadrovima. Gost, retka obaveštenja, pravi duel/nagrade i fizičkiS25 ostaju otvoreni. VraćeniGreen, prijava, originalne mere i tastatura0. Bez commita/deploya; Android ne potvrđuje R22–R31 lokalne dorade.

**Napredak13/15osnovnih Android prolaza:** preostaju kontrolisan Online random sa drugim uređajem i aktivni/završni Dnevni izazov. Naknadna potvrda svih lokalnih izmena posle deploya i retka stanja ostaju odvojeno otvoreni.

## Online random — lokalno svih10tema, Android delimično, 29.10.2026.

[158slika i lokalni prikazi](online-random-2026-10-29/index.html), [kanonske uloge/značenja i ograničenja](online-random-2026-10-29/report.json), [720lokalnih slučajeva](online-random-2026-10-29/local-layout-report.json).23osnovne PNGuloge/tema,230quality-resolved putanja. Nema novih PNGcrteža. Green meni/intro i sharedvideo/dukat/PowerIndex/medalje su kanonske porodice; general-podium se ne spaja sa turnirskim/kvartalnim medaljama.

**R28 — lokalno:** Green geometrija naslova, rubova/širina, loading liste i statistike u čekaonici. „Protivnik pronađen” sada ažurira naslov i uklanja waitporuku u svim temama; ranije samoGreen. Uklonjen nasleđeni Easterljubičasti rub. Online završni fontovi/razmaci i42pxscore/29pxclaim/55pxpreuzmi prateGreen; Revanš44px i uEaster. Online obaveštenja imaju zaseban modalni kontekst sa paletom teme.

**R29 — lokalno:** `highlightCurrentPlayer` uključivao je onlinepager i randomroomscope samo zaGreen/Easter/Severna. Ostalih7tema gubilo je i CSS opseg canonicaldisconnectPNG-a; Winter/Desert bile su flexsabijene. Zajednički vertikalni pager i zaštita od sabijanja sada obuhvataju sve online partije sa2igrača, bez promene dimenzija table, dugmadi ili pravila igre.

**R30 — lokalno:** privremeni disconnectPNG/tekst ostajao je u tajmeru do state-sync odgovora i posle uklanjanja reconnect klase gubio27pxmeru, pa mogao postati256px. Oporavak sada odmah briše/sklanja samo to privremeno stanje; običan tajmer ostaje.27pxmera važi kroz randomroomopseg. Povratni toast ima isti42pxcanonicalPNG, Greenfont/grid/rub i tematsku podlogu. Nova regresija proverava odmah prazan/sklonjen privremeni tajmer.

720izolovanih stvarnih renderera=10tema×18stanja×4veličine.4čekaonice, greška veze,9završnih stanja,2table, prekid/povratak veze; mere/fontovi/PNG i završni safezone/bezskrola prolaze. Provereni oba accountindeksa, TI/PROTIVNIK, pobeda/poraz/remi, records/pending/nula/limit8000 i potvrđen+24PowerIndex/pending—. Tekst igrača najmanje5,20:1. Sintetički socket/servis, bez appkonstruktora/naloga, blokirani spoljni zahtevi; UTF-8, animacije isključene i font može biti offlinefallback. To nije stvarna reklama/isplata ili stvarni duel.

**Android granica:** novo izričito odobrenje dozvolilo je izlazak/autosave praznog HotseatGost_QA testa. Zatim je mreža emulatora isključena pre ulaska uRandom, da se ne upari drugi igrač. Green/Easter stvarno pokazuju grešku veze; Green dodatno čekaonicu sa nalogom/Moć7620/4pobede/0remija/3poraza. Nekoliko canonicalPNG nije u offlinekešu (intro/prazna lista); izborLight odbijen sa porukom „Tema nije učitana”, ostaoGreen. Zato nije nastavljen lažni pregled ostalih tema bezslika. Originalne1440×3120/560dpi (~411×891CSSpx); nema potpunog novog Androidprolaza10tema.

**Vraćeno:** Green glavni meni/prijava/originalne mere; airplane-mode disabled,wifi1,data1 kao na početku. Nema reda za igru, novog duela/rezultata, reklame/nagrade, poruke ili commita/deploya. game.jsv6.35,managers.jsv6.36,online-roomCSSv4,online-finishCSSv7,compactCSSv5 čekaju deploy/Androidpotvrdu.

**Napredak ostaje12/15osnovnih Androidprolaza.** Online random ima završen lokalni deo svih10tema i delimičan Android; za punu proveru potreban kontrolisan online meč/drugi uređaj. Pozovi prijatelja ostaje sledeća soba; Daily aktivni/završni Android tok i ranija retka stanja ostaju otvoreni.

## Hotseat — svih deset tema, 29.10.2026.

[Android i odvojeni lokalni prikazi](emulator-hotseat-2026-10-29/index.html), [130 osnovnih PNG putanja i nalazi](emulator-hotseat-2026-10-29/report.json), [520 lokalnih slučajeva](emulator-hotseat-2026-10-29/local-layout-report.json). Korisnik je izričito odobrio novu praznu partiju sa Gost_QA. U svih deset tema pregledane obe table, gornji/donji panel i meni igre. Nema bacanja/upisa, promene poteza ili završetka/nagrade. Originalnih1440×3120/560dpi (~411×891CSSpx); pokušaj360×780 dao je oštećene emulator kadrove, oporavljene resetom i rebootom bez brisanja podataka. Povremeno kasni osvežavanje posle tap/swipe; uzrok nije utvrđen.

**R26 — lokalno:** Hotseat završni fontovi, padding/gap, statistički tracking/margine i PNG mere izjednačeni saGreen. Preuzimanje55px, score42px/claim29px. Unos gosta, izlaz i završna obaveštenja dobijaju Hotseat modal kontekst, tematske površine i Green tipografiju; Easter unos isti6px radijus. Online ekran ne nasleđuje ovaj kontekst. Uklonjene stare tekstualne senke, PNG volumen ostaje.

**R27 — lokalno:** stvarni Android Easter nakon promene teme u partiji pokazuje prazno polje megafona u obe table. Kanonski PNG je pripremljen, ali stari hydration koren ga ne povezuje; eksplicitna sinhronizacija postojala je samo zaNeon. Novi zajednički helper sada povezuje postojeće Easter/Neon megafone pri promeni teme i stvaranju table. Posebna regresija proverava obe table i da druge teme ostaju odložene. Nema novog PNG-a niti promene dimenzija/upisa. game.jsv6.34, managers.jsv6.35, compactCSSv4.

Izračunati kontrast imena, uloga i poena na podkarticama oba igrača je najmanje5,20:1 u360završnih prikaza. To nije merenje svih drugih površina ili fizičkog telefona.

520 izolovanih slučajeva stvarnog renderera:10tema×(9završnih stanja+2table+izlaz+unos gosta)×4mobilne veličine. Jednake Green mere/fontovi, učitani PNG, oba imena/poeni i pobeda/poraz/remi iz perspektive naloga0, oznake rekorda, limiti nagrade i bez offline revanša. Završni panel bez skrola/izlaska iz safezone. Solo400ponovo prolazi, kao i ciljane funkcionalne/PNG regresije. Servisni odgovori su sintetički, animacije isključene i font može biti offline fallback; to nije stvarna reklama/isplata ili Android završetak.

**Stanje:**34Android +100lokalnih snimaka. Green, originalne mere i prijava vraćeni; prazna test partija ostaje otvorena. Automatski reviewer je odbio potvrdu izlaska/autosave, pa je ona otkazana bez alternativnog puta napuštanja. Bez commita/deploya. Android snimci ne potvrđuju lokalne R22–R27. Intro PNG/timing2400/3200ms potvrđeni statički; sam PNG intro nije sada uhvaćen kadrom, citat viđen samo uGreen.

**Napredak:**12/15osnovnih Android prolaza svih10tema, uz ove granice. Preostaju Online random i Pozovi prijatelja, a Daily ima sve ponovne ulaske i lokalni dokaz, ali ne aktivni/završni Android tok. Retka stanja, prava isplata i potvrda novih lokalnih izmena ostaju odvojene obaveze.

## Solo — aktivna partija svih deset tema, 29.10.2026.

Dodatna dorada R25: `ModalManager` automatski prepoznaje obaveštenja aktivnog Solo završnog ekrana, uključujući nagradne/oglasne greške, i daje im istu tematsku tipografiju/paletu. Skriven Solo ekran i Hotseat/online završetak ne menjaju kontekst drugih soba; CI regresija to potvrđuje. managers.jsv6.34. Nasleđene zamućujuće tekstualne senke uklonjene su iz završnog teksta devet tema, bez uklanjanja PNG volumena/senki.

[Android i odvojeni lokalni prikazi](emulator-solo-2026-10-29/index.html), [kanonske putanje i nalazi](emulator-solo-2026-10-29/report.json), [400 lokalnih slučajeva](emulator-solo-2026-10-29/local-layout-report.json). Nastavljena postojeća partija, bez Nova igra/bacanja/upisa/završavanja. U svih deset tema pregledani tabla sa istim ranijim1/4upisima, zbirom5, istim kockicama i3/3, gornji/donji panel i quick-menu. Green dodatno inline Nastavi/Nova igra, intro i potvrda izlaska. Posle pregleda partija je sačuvana postojećim autoSave izlaskom; vraćeni Zelena,1440×3120/560dpi i prijava.

**R24 — važna funkcionalna ispravka, lokalno:** `localResultAccepted` bio je deklarisan unutar `if` bloka, a korišćen izvan njega pri slanju rezultata. Stvarni renderer je ponovljivo pokazao `ReferenceError`, uhvaćen kao greška Top liste, pa slanje/potvrda rekorda nije ni izvršeno. Deklaracija sada važi u potrebnom opsegu. Nova Node regresija poziva stvarni pre-render tok Solo/Hotseat, proverava rezultat vlasnika naloga i accepted/rejected/pending odgovor; nepotvrđen rezultat ne dobija izmišljenu potvrdu nagrade. Nema promene pravila nagrađivanja ili stvarne isplate.

**R25 — lokalno:** Solo završni naslov, kratki padding/gap/margine i statistički tracking prate Green. Preuzimanje55px, oznake rezultata42px i preuzimanja29px ostaju jednake Green i na kratkim ekranima; ranije su ostale teme imale28/20px. Potvrda izlaska koristi Solo kontekst sa Green tipografijom i tematskim kontrastom. Green preuzimanje koristi postojeće tamnije tonove (paletni par5,98:1 naspram3,06:1). game.jsv6.33, compactCSSv3. Tabla, veličine aktivnih BACAJ/NAJAVA i PNG crteži nisu menjani.

400 izolovanih stvarnih `handleGameOver/createScoreTables/ModalManager` prikaza:10tema ×(9rezultatskih stanja+potvrda izlaska) ×4mobilne veličine. Bez skrola/izlaska iz safe zone, jednake mere/fontovi/razmaci i vidljivi kanonski PNG. Iznosi preuzimanja/dupliranja potvrđeni iz DOM-a; postojeći test pokriva svih9validnih kombinacija rekorda. Oznaka najjače kolone kopira stvarnu boju/font/PNG sopstvene table; unutrašnja širina Neon/Easter megafona je namerni izuzetak. Sintetički odgovori nisu stvarni nalog/server/reklama ili isplata; offline font fallback moguć, animacije isključene za merenje.

12 osnovnih Solo PNG uloga po temi /120 quality-resolved putanja; dodatni deljeni skinovi, game-header, akcijska dugmad i brojač vode se odvojeno. Nema potrebe za novim PNG crtežima u pregledanim stanjima. Android je **pre lokalnih R24/R25 i prethodnih R22/R23**, koje čekaju commit/deploy i novu potvrdu.

**Napredak:** ranijih10osnovnih sobnih prolaza + Solo aktivna partija svih10tema =11/15osnovnih Android prolaza, uz navedene granice. Daily trenutno ima svih10ponovnih ulazaka i lokalne renderere, ali ne novi aktivni/završni Android tok. Slede Hotseat, Online random i Pozovi prijatelja. Stvarni završeci/nagrade, retka stanja i fizički S25 nisu time proglašeni završenim.

## Dnevni izazov — ponovni ulazak svih deset tema, 29.10.2026.

[Android i odvojeni lokalni prikazi](emulator-daily-2026-10-29/index.html), [kanonski inventar i granice](emulator-daily-2026-10-29/report.json), [150 lokalnih slučajeva](emulator-daily-2026-10-29/local-layout-report.json). Stvarno pregledano obaveštenje „već odigrano“ na360×780 u svih deset tema, osam intro kadrova. Nalog je već odigrao današnji izazov, zato odobreni test šest zaustavljanja nije korišćen. Aktivni/završni panel, nagradna i serverska poruka imaju zaseban izolovani dokaz stvarnih Daily/Modal renderera sa sintetičkim podacima i stvarnim YambFeatures/PNG skinom na tri mobilne veličine. To nije stvarna isplata ili Android završetak novog izazova.

**R22 — lokalno:** jednaka Green tipografija i mere Daily obaveštenja; tematske površine/kontrast, bez crnog teksta na braon/plavom dugmetu i stare Easter razlike2px. Dva Green akcijska gradijenta koriste postojeće tamnije paletne tonove (najmanje5,46:1 tekst). Daily CSSv4/JSv3.4. **R23 — lokalno:** X priprema je koristila ?v=1, a CSS?v=3/4. Resolver sada priprema isti puni URL koji se prikazuje, u svih deset tema; HeaderJSv5 i regresija. Novi PNG crteži, dimenzije i funkcije nisu menjani.

Šest semantičkih PNG uloga po temi,60različitih fajlova; kanonski dukat/video su deljeni sa drugim sobama. Aktivne/završne lokalne mere/fontovi jednaki Green, nema odsecanja/skrola u150slučajeva. Najmanji kontrast dugmeta obaveštenja5,67:1. Animacije isključene radi merenja, offline font može biti fallback. Svih devet prvih izbora tema uspelo; Desert X kasnio, pa brzo hladno učitavanje nije proglašeno potvrđenim.

Prethodne izmene sada su korisnikovim commitom/deployem objavljene; javni TournamentCSSv3 odgovara lokalnom fajlu. To nije automatska nova potvrda svih ranijih soba. Ovi Android snimci su **pre novih R22/R23**, koje čekaju deploy i novu potvrdu. Vraćeni Zelena, originalnih1440×3120/560dpi i otvorena prijava. Bez novih partija, kupovina, nagrada, reklama ili slanja poruka.

**Sledeće:** Solo, Hotseat, Online random i Pozovi prijatelja. Ranijih10osnovnih sobnih prolaza ostaju evidentirani; Daily ponovni ulazak sada pokriva svih10tema, ali aktivni/završni Android tok i stvarna isplata ostaju otvoreni. Ne sabirati sintetičke testove kao potpuno završenu Android sobu ili svih15/15.

## Turnir — svih deset tema, 28–29.10.2026.

[62 Android snimka](emulator-tournament-2026-10-29/index.html), [kanonske putanje i rezultati](emulator-tournament-2026-10-29/report.json), [210 lokalnih slučajeva](emulator-tournament-2026-10-29/local-layout-report.json). U svim temama stvarno pregledani Info sa već prijavljenim nalogom/osam učesnika, četvrtfinale, finale, detalj odigranog meča i prve kartice Dvorane slavnih. Green dodatno polufinale i Put do titule. U tim prikazima PNG identiteti odgovaraju temi i pehari imaju zvezdu; nema nove PNG zamene. Aktivne navigacione tačke su cele i funkcije nisu menjane.

**R21 — lokalno ispravljeno, bez deploya:** rezultat ispod imena oslobađa prostor u kartici osvajača, bez promene njene širine/avatara. Ujednačena Green tipografija naslova/tabova/modala; tematske površine i kontrast opisa/prijave/statusa/tabova/kartica/navigacije. Uklonjeni Easter ljubičasti rubovi i plavi status, generička siva/zelena/zlatna podloga i stare senke teksta; poraženi ostaje čitljiv bez opacity/filter sloja. CSS v3. Stvarni izolovani rendereri sa sintetičkim turnirom prolaze 210 slučajeva, vidljive PNG i izračunate mere/fontove. Font može biti offline fallback, animacije su isključene radi stabilnog merenja.

Statički potvrđeno 14 turnirskih semantičkih PNG uloga po temi; kanonski dukat/Indeks moći/X dolaze iz zajedničkog registra. Devet dodatnih room izvedenica pehara ostaju tehnički izuzetak. Nisu sada izazivani nove prijave/odjave, zakazivanje, duel, nagrade ili ceremonije. Svaka istorijska titula i fizički S25 nisu pregledani. Svi prvi izbori tema ovog prolaza uspeli, ali pojedini PNG-ovi kasne; lokalno učitavanje/R21 čekaju deploy i novu Android potvrdu.

Nema partija, kupovina, isplate, poziva/poruka ili deljenja. Test interstitiali zatvoreni Back kontrolom. Vraćeni Zelena i originalnih 1440×3120/560dpi uz očuvanu prijavu. Bez commita/deploya.

**Trenutni osnovni prolazi: 10/15 soba**, uz navedene granice i neobjavljene dorade. Preostalih pet: **Dnevni izazov, Solo, Hotseat, Online random i Pozovi prijatelja**. Retka stanja i potvrda lokalnih izmena ostaju odvojena obaveza.

## Riznica — nastavak dovršen, 28.10.2026.

[65 Android snimaka](emulator-treasury-2026-10-28/index.html), [aktivni inventar i statusi](emulator-treasury-2026-10-28/report.json), [120 lokalnih slučajeva](emulator-treasury-2026-10-28/local-layout-report.json). Sva četiri taba osnovno pregledana u svih deset tema na360×780; Severna završena posle prekida. Trofeji su pregledani u početnim kategorijama, skinovi u klasičnoj kolekciji, efekti kroz proslave/atmosferu/kosmos, teme u različitim delovima kataloga. Nije pregledana svaka pojedinačna kartica ili živa animacija. U snimljenim stanjima nema potrebe za novim PNG crtežima.

**R20 — lokalno ispravljeno, bez deploya:** tematsko zaglavlje, statusne/nagradne podloge i kontrast; Green Clay statusi; izjednačena debljina i razmak slova sa Green referencom, bez zamućujuće tekstualne senke. CSS v8. R14/R15 i ove dorade čekaju novu Android potvrdu. Izolovani stvarni renderer/CSS sa sintetičkim inventarom prolazi120 kombinacija tema/tab/tri mobilne širine, uključujući PNG dimenzije i izračunate fontove. Offline font može biti fallback.

Popis prati **stvarno aktivne** kvalitetne putanje:116 uloga po temi =55 tematskih +61 zajednička (48skinova,10tema,3univerzalna efekta). Ranijih58+58 uključivalo je tri originala koja više nisu aktivne sličice. Direktan izbor svih devet posedovanih tema uspeo prvi put, ali prve sekunde pokazuju stare/nepotpune ikone; hladna promena i ranije lokalne popravke nisu time potvrđene.

Nema novih partija, kupovina, nagrada, promene skina/efekta ili slanja poruka. Novi Lidijin poziv nestao sam dok je traženo odobrenje; nije odbijen/prihvaćen. Zelena, originalnih1440×3120/560dpi i prijava vraćeni. Bez commita/deploya.

**Trenutni osnovni prolazi:9/15 soba**, uz navedene granice i lokalne dorade koje čekaju potvrdu. Preostalih šest: **Dnevni izazov, Turnir, Solo, Hotseat, Online random i Pozovi prijatelja**. Njihovi raniji delimični snimci ne računaju se kao dovršeni prolazi.

## Kvartalna liga — nastavak posle blokade, 28.10.2026.

[44 Android snimka](emulator-league-2026-10-28/index.html), [PNG putanje i statusi](emulator-league-2026-10-28/report.json), [lokalni test 40 kombinacija](emulator-league-2026-10-28/local-layout-report.json). Sačuvan je prethodni Green pregled (Liga, Medalje, Šampioni, dodatno Amater/Sva vremena), a u nastavku stvarno pregledan isti osnovni sadržaj preostalih devet tema na 360×780. Posle zatečenog Android Home ekrana aplikacija je otvorena vidljivom ikonom i ostala prijavljena/odzivna; raniji ANR nije ponovljen, ali njegov uzrok nije utvrđen.

**R18/R19 — lokalno ispravljeno, bez deploya:** Green mere/fontovi/dvokolonski rezime i navigacija 44px/10px sada važe za sve teme; uklonjeno nasleđeno tablet pomeranje i zaštićen avatar uz dugo ime. Stara pastelna/tirkizna i previše svetla stanja tabova Vaskršnje/Pustinjskog stakla/Severne zamenjena su već definisanim tematskim površinama i mastilom. PNG nisu precrtavani. CSS je v9; ciljane provere lige i 40 izolovanih Chromium scenarija prolaze. Android galerija je pre novih ispravki i ne potvrđuje ih.

**Otvoreno:** svih devet prvih izbora teme u nastavku vratilo je prethodnu, drugi izbor je uspeo. To je potvrđen nalaz objavljene verzije; ranije lokalne dorade učitavanja i nove CSS izmene čekaju korisnikov deploy i Android potvrdu. Nisu sada pregledani svih šest rangova u svakoj temi, šampionsko/nagradno obaveštenje, prazne/grešne liste ili fizički S25. Poziv Lidije odbijen uz novo izričito odobrenje; test oglasi zatvoreni Back kontrolom. Nema novih partija ili nagrada. Zelena, originalnih 1440×3120/560dpi i otvorena prijava vraćeni. Bez commita/deploya.

**Trenutni osnovni prolazi: 8/15 soba**, uz navedene granice i lokalne dorade koje još čekaju potvrdu. Preostalih sedam bez potpunog ovakvog prolaza: Dnevni izazov, Riznica, Turnir, Solo, Hotseat, Online random i Pozovi prijatelja. Raniji delimični kadrovi i retka stanja ne računaju se kao dovršeni.

## Dukati / Ispravi upis — svih deset tema, 28.10.2026.

[23 snimka svih deset tema](emulator-economy-2026-10-28/index.html), [PNG putanje i procene](emulator-economy-2026-10-28/report.json), [precizan obuhvat i granice](emulator-economy-checkpoint-2026-10-28.md). Oba taba pregledana na 360×780; Zelena dodatno na kratkom 320×568 sa unutrašnjim skrolom. U tim stanjima nema nove uočene greške rasporeda, čitljivosti ili identiteta ikona. Automatske provere prolaze: osam aktivnih PNG fajlova u šest semantičkih uloga po temi, bez starih aktivnih SVG/legacy putanja. Nema nove izmene economy implementacije ili PNG-a.

Poziv Ivana Ilića zatvoren je levom opcijom otkazivanja/odbijanja posle korisnikovog izričitog odobrenja. Nisu prihvatani dueli, pokretane partije ili pritiskane nagradne kartice. Stvarna isplata, spremnost oglasa, potvrde i retka grešna stanja nisu ovim vizuelno potvrđeni; na pojedinim kadrovima ostaje status učitavanja oglasa. Vraćeni Zelena, originalnih 1440×3120/560dpi i otvorena prijavljena aplikacija. Ranije lokalne dorade i evidencija ostaju bez commita/deploya.

**Napredak osnovnih prolaza:** sedam od petnaest soba ima pregled svih deset tema: Podešavanja, Top lista, Statistika sa rang-listama, Pravila (prva strana), Globalni chat (prazna istorija), Online igrači (lista/pretraga) i Dukati/Ispravi upis (oba taba). Još osam nema dovršen ovakav prolaz: Dnevni izazov, Kvartalna liga, Riznica, Turnir, Solo, Hotseat, Online random i Pozovi prijatelja. Njihovi delimični raniji kadrovi ne računaju se kao završeni prolazi; ostaju i retka stanja i naknadna Android potvrda lokalnih ispravki.

## Online igrači — nastavak i emulator, 28.10.2026.

[45 snimaka svih deset tema](emulator-online-players-2026-10-28/index.html), [rezultati i konačne PNG putanje](emulator-online-players-2026-10-28/report.json). Prekid je bio posle Green/Light/Medium i prve Winter liste27.10. Ta tri dovršena prolaza su sačuvana; Winter je ponovo otvoren28.10. i dovršen sa ostalih šest tema. U emulatoru360×780 provereni su lista, fokus pretrage i tastatura, filtrirani rezultat bez poklapanja sa tastaturom i bez nje, kao i izlazak. Raspored, tekst i površine su pregledni u tim stanjima. Desert native X za brisanje pretrage vraća listu. Moon je imao samo sopstveni nalog, pa akcije uz drugog igrača u toj temi nemaju novi vizuelni dokaz.

**R16 — lokalno ispravljeno, nije objavljeno:** standardni X za brisanje pretrage u većini paleta ostaje plav. Native cancel pseudo-element sada koristi postojeći `--theme-room-close-image` PNG za svaku temu. Funkcija brisanja i dimenzije kartica/pretrage ostaju. Nije napravljen dodatni asset.

**R17 — lokalno ispravljeno, nije objavljeno:** stari `body.easter-theme #online-players-body img` selektor dodavao je ljubičasti rub avatarima i pravougaonu senku transparentnom PNG prazne liste. Uklonjen je samo taj blanket selektor; kanonski PNG ostaju, a avatar zadržava postojeće `op-available/busy/playing` boje statusa. CSS verzije: `teme.css?v=7.11`, `theme-online-players-room.css?v=4`. Galerija pokazuje objavljenu verziju pre ove ispravke.

Statička provera prolazi za deset tema, osam različitih aktivnih PNG uloga po temi, uključujući konačne quality-resolved putanje, jednake Green dimenzije i fontove u četiri prethodno sačuvana viewporta; najmanji kontrast proverenih parova4,59:1. Kanonski registar/use-map osveženi i provere prolaze. Definicija teme ima zasebnu evidenciju ovog prolaza, bez promene DNK, pravca ili palete.

**Ograničenja:** nisu testirani slanje prijateljstva/duela, posmatranje, potvrde i greške tih tokova, duga lista ili fizički S25. Tačno vreme intra nije mereno screenshotima. Pri prvom izboru Neon28.10. gate se zatvorio sa povratkom na Winter, ponovljeni izbor uspeo — stabilnost hladnog učitavanja nije potvrđena. Posle pokretanja emulatora aplikacija se jednom vratila na Android Home; ponovno otvaranje uspelo, crash buffer nije dao zapis. Uzrok nije utvrđen niti pripisan sobi.

Nema slanja poruka/poziva, kupovina, novih partija ili nagrada. Automatski test interstitiali zatvoreni Android back kontrolom. Vraćeni Zelena, originalnih1440×3120/560dpi i `show_ime_with_hard_keyboard=0`. Emulator otvoren i prijavljen. Sve ranije i nove promene ostaju **bez commita/deploya** prema korisnikovom zahtevu; njihova naknadna Android potvrda ostaje odvojena.

## Globalni chat — svih deset tema, 27.10.2026.

[22 nova snimka i rezultati po temi](emulator-global-chat-2026-10-27/index.html), [PNG putanje i granice provere](emulator-global-chat-2026-10-27/report.json). Stvarno je pregledan Globalni chat u svih deset tema na logičkom prikazu 360×780: ulazak, prazna istorija, zaglavlje i online oznaka, unos bez tastature i sa otvorenom tastaturom, slanje/X PNG i izlazak. U tim stanjima nema novog uočenog problema: tekst i footer nisu odsečeni, tastatura ne prekriva unos, površine i ikonice prate temu, a raspored odgovara Zelenoj. Nije bilo potrebe za novom izmenom implementacije ove sobe.

`check:theme-global-chat-final` potvrđuje četiri različite aktivne PNG uloge po temi, deset različitih hashova za svaku ulogu, odsustvo ranijih Easter/Desert/Severna rezervnih putanja i SVG iz aktivnog markup-a. Sačuvani rasporedi za četiri viewporta i paletni parovi imaju najmanje 4,59:1 odnosno 4,54:1 kontrast; to je zaseban statički dokaz, ne novi Android snimak sva četiri viewporta. Intro konfiguracija ostaje zajednička: otvaranje 2400ms, kraj 3200ms; tačno vreme nije mereno u ovom prolazu.

**Granica:** istorija je bila prazna u svim temama. Stvarne poruke, avatari, duge poruke, meni drugog igrača i potvrda prijave poruke nisu sada vizuelno potvrđeni. Početna potvrda pravila pregledana je i prihvaćena samo u Zelenoj. Nisu slati pozivi, poruke ili prijave niti pokretane partije/nagrade. Jedan slučajno unet znak odmah je obrisan bez slanja; taj kadar nije deo galerije. Automatski test interstitiali zatvoreni su Android back kontrolom.

Prethodne lokalne dorade R07/R12/R14/R15 ostaju **necommitovane i neobjavljene na izričit zahtev korisnika**; ova galerija nije njihova potvrda. Vraćeni su Zelena tema, originalnih1440×3120/560dpi i početno podešavanje `show_ime_with_hard_keyboard=0`; emulator ostaje otvoren i prijavljen. Ostatak soba i dinamičkih stanja glavnog registra ostaje za nastavak.

## Potvrda posle deploya — 27.10.2026.

[25 snimaka i precizni statusi](emulator-verified-2026-10-27/index.html). Objavljeni JS/CSS odgovara poslednjem HEAD-u; početni radni direktorijum bio je čist. Desert/Moon/Severna izabrani su iz prvog pokušaja i zadržani pri povratku u Podešavanja; Moon ostaje posle restarta. Aktivirano je već posedovano Svetlo zlato iz Riznice i izbor je zadržan. Ovo nije benchmark praznog mrežnog cache-a: loader se javlja pri prvim izborima, ponovni Moon prikaz je brzo kompletan.

Vizuelno potvrđeni R08/R09 na Moon i Easter primerima, R10 glavne Easter kartice i Vatreni niz, R11 brojevi mesta4+. R07 nije prošao na originalnoj širini: kasniji CSS lige vraćao je veći font. Lokalno dodatno popravljeni R07, R12 delimično učitane sličice i stari veo, R14 direktno aktiviranje teme iz Riznice pre PNG pripreme i R15 Easter ljubičasti tab/Light tamno zaglavlje. **Te nove dorade još nisu objavljene niti Android potvrđene.**

Nisu pokretane nove partije ni nagrade. Nije bilo novog Android pregleda game panela jer nema otvorene partije za nastavak; njegov kod prolazi regresione provere. Automatski test interstitial je zatvoren. Emulator vraćen na Zelenu i originalnih1440×3120/560dpi, prijava očuvana. Ostatak soba i retkih stanja iz glavnog registra ostaje za nastavak; ne označavati ceo projekat završenim.

## Nastavak — stabilnost promene teme

[Dijagnostika i regresioni dokazi R01/R13](../theme-switch-stability-2026-10-25.md). Lokalno je uklonjen vremenski prozor od 2,5s koji dopušta zakasnelom cloud odgovoru da vrati prethodnu temu. Ručni izbor sada ima prvenstvo u sesiji istog naloga, uz nalogom ograničen nepotvrđen izbor i proveru inventara. Obuhvaćeni su Settings, game panel i Riznica. Generički PNG preloader deli download/decode i ima ograničen cache; Settings ne priprema isti paket dva puta. Regresione provere prolaze. Brzina prvog transfera i potvrda u Android aplikaciji čekaju naredni korisnikov deploy; ranija galerija nije dokaz ovih novih izmena.

## Najnoviji prolaz — posle korisnikovog commit/deploya

[Galerija 80 stvarnih snimaka i nalazi R01–R13](emulator-deployed-2026-10-25/index.html), [strukturisana evidencija](emulator-deployed-2026-10-25/report.json). Javni Settings JS, Vatreni niz, Statistics CSS i menu typography provereni su kao HTTP 200 i normalizovano jednaki lokalnim verzijama na početku prolaza.

Preostalih osam tema sada je pregledano u **Top listi (globalna i prazna lokalna), Statistici (pregled, H2H, obe rang-liste) i prvoj strani Pravila**. Zelena i Svetlo zlato imaju prethodni detaljniji prolaz; Zelena power kartica ponovo je potvrđena posle deploya. Potvrđena je popravka zaglavlja Vatrenog niza kroz osam dodatnih tema. U Ametistu su ponovo proverene manje kartice efekata, uključujući Crnu rupu i Supernovu.

Nove lokalne ispravke, koje **još nisu objavljene**: R07 cache verzija menija; R08 Green geometrija unutrašnjeg podnožja i 44px navigacioni dodiri statistike; R09 tematski H2H kontrast; R10 Vaskršnje zaostale pastelne površine/redovi/skrol; R11 nevidljivi redni brojevi 4+ u Vaskršnjoj Top listi; R12 paleta i pozadina gate-a pripadaju odredišnoj temi. Palete su evidentirane u `docs/theme-definitions.json`; identiteti PNG nisu precrtavani zbog CSS problema.

**Otvoreno:** R01 prvi hladni transfer tema Desert/Moon/Severna prekoračio je rok, ponovni izbor je uspeo. R13 pri kasnijem ulasku u Podešavanja primećen povratak na Desert; uzrok nije potvrđen i zahteva odvojenu proveru sinhronizacije, bez pretpostavke da je problem u samim PNG. Nova CSS popravka gate-a ne rešava transfer. Ostatak svih soba, retkih stanja i završnih ekrana nije označen kao potpuno pregledan.

Provere: Statistics sa ponovnim otvaranjem istog Fire modala u deset tema i kontrastom H2H; Top lista i zaštita od zakašnjelog starog PNG; Pravila (10 tema / 2 jezika / 6 strana); decoded game theme switch; gate (10 usvojenih pozadina / 4.5:1 mastilo). Vizuelna potvrda novih lokalnih izmena čeka sledeći korisnikov deploy.

Emulator je vraćen na Zelenu, originalni ekran 1440×3120 / 560 dpi, uz očuvanu prijavu. Nisu pokretane nove partije, kupovine ni nagradne reklame. Blokirajući poziv Lidije odbijan je prema izričitom korisnikovom odobrenju; automatski test interstitiali su zatvoreni Android back kontrolom. Tokom završnog vraćanja prozora došlo je do duže pauze alata/uređaja; iz nje se ne izvode merenja performansi aplikacije.

## Prethodni nastavak — pre gornjeg deploya

[Novi snimci i nalazi R04–R07](emulator-followup-2026-10-25/index.html). U ovom nastavku stvarno su otvoreni Top lista (globalna i prazna lokalna), Statistika (pregled, H2H i obe rang-liste) i Pravila u **Zelenoj i Svetlom zlatu**. Zeleni H2H detalj i šesta strana Pravila su dodatno pregledani. Preostalih osam tema ovih soba još nisu označene kao vizuelno potvrđene.

Četiri nova lokalna popravka: kontrast Green kartice Indeksa moći, osvežavanje ranije skrivenog zaglavlja Vatrenog niza, Green bezbedne margine u Statistici/rang-listama za ostalih devet tema i prelom teksta glavne kartice Kvartalne lige na 411px. Regresioni test otvara isti Vatreni niz u svih deset tema. Objavljena verzija još nema prethodne lokalne ispravke: javni `theme-settings-room.js` je HTTP 200, ali se razlikuje i nema novi decoded-prepare kod. Potreban je sledeći deploy za poštenu vizuelnu potvrdu R01–R07.

Emulator je ponovo ostavljen otvoren, prijavljen, u Zelenoj temi, na originalnim dimenzijama. U ovom nastavku nisu pokretane partije ni nagradne reklame niti preuzimane nagrade. Automatski test interstitial pri jednom izlasku je zatvoren.

## Prethodni prolaz

Korisnik je ručno završio prijavu i objavio poslednje izmene. Javni `theme-quality-assets.js` sada vraća **HTTP 200**, sa istim normalizovanim SHA-256 kao lokalni fajl (26.334 bajta). Pregledani deploy uključuje prethodnih 121 PNG zamenu i kanonsko povezivanje video-ikona.

[Galerija sa nalazima i granicama provere](emulator-2026-10-25/index.html).

Pregledani su glavni meni i konačno učitana Podešavanja svih deset tema na logičkom prikazu 360 × 780. Dodatno: Zelena / Dnevni izazov (aktivni i završni panel), Ametist / deo trofeja i efekata Riznice. Ovo **nije završena provera svih soba i stanja aplikacije**, niti test na fizičkom Samsungu S25.

Pronađena su tri problema: prethodne ikone pri promeni teme, slab kontrast na pojedinim delovima menija, i veliki PNG originali u malim karticama efekata. Lokalne ispravke su pripremljene uz regresione provere. Njihova vizuelna potvrda čeka sledeći korisnikov deploy; snimci prikazuju verziju pre tih ispravki.

Automatska bezbednosna provera odbila je ADB prosleđivanje WebView debug porta zbog mogućeg izlaganja prijavljene sesije. Prosleđivanje nije izvršeno i nije korišćen zaobilazni pristup. Dalji pregled koristi vidljive kontrole i snimke ekrana, bez debug pristupa nalogu.

Korisnik je izričito odobrio završavanje već otvorenog Dnevnog izazova zaustavljanjem šest kockica. Test je završen sa **96**, bez reklame i bez preuzimanja nagrade. Dodatni pokušaji, kupovine, slanje poziva, izmene profila i odjava nisu rađeni. Izbor tema je privremeno menjan kroz postojeći UI; na kraju je vraćena Zelena i originalni ekran emulatora (1440 × 3120, 560 dpi). Prijava je očuvana.
