# Standard izgleda tema — ciljna specifikacija

Datum: 2026-10-09. Mašinski izvor istine je [`theme-definitions.json`](theme-definitions.json); svih 186 obaveznih PNG uloga, sa Green referentnim dimenzijama i tipom PNG-a, nalazi se u [`theme-asset-role-catalog.json`](theme-asset-role-catalog.json). Merena Green mapa je u [`theme-asset-usage-map.json`](theme-asset-usage-map.json), a stanje rada u [`theme-progress.json`](theme-progress.json).

## Obuhvat i status

Zelena (`dark`) je zaključan ogledni primer. Ova specifikacija definiše cilj za preostalih devet tema. Ne tvrdi da su sadašnji asseti, boje i CSS već usklađeni. Svi zadržavaju stil **3D Soft Neomorphism**; jedini dozvoljeni pravci su **Clay** i **Mat silikon / Meka plastika (Smooth Rubber / Matte Plastic)**. Isti pravac konkretne teme važi za pozadinu, Icon Pack, logo, UI, tablu, kockice i intro. Isti raspored, veličine, podaci, pravila i trajanja važe za svaki odgovarajući ekran; tema menja materijal, paletu, pozadinu i originalne PNG motive.

Presek početnog stanja je u [`theme-rebuild-checkpoint-2026-10-06.md`](theme-rebuild-checkpoint-2026-10-06.md). Devet tema se izrađuje ponovo; Zelena ostaje zaključana. Ako se tokom rada javi nedorečeno pitanje, prvo važi definicija konkretne teme, zatim zajednički standard, pa aktivna Zelena kao primer za funkciju, geometriju, stanja i tok. Green izgled i PNG-ovi nisu predložak za kopiranje novih motiva. Uočeni kvar Zelene se beleži pre preuzimanja pravila.

Palete devet tema mogu se dorađivati. Svaka izmena HEX vrednosti ili namene boje beleži se u `theme-definitions.json`, usklađuje sa ovim dokumentom i ponovo prikazuje u ovom razgovoru sa razlogom. Zatim se ponavljaju provera kontrasta i vizuelni pregled; prethodne vrednosti ostaju u Git istoriji. Zelena zadržava postojeću paletu.

## Obavezno pravilo: bez kiča i nakićenosti

Ovo pravilo važi za **svih deset tema** i za svaki sloj: pozadinu, Icon Pack, logo, ilustracije, kartice, tablu, kontrole, stanja i animacije. Stil i pravac teme izražavaju se materijalom, svetlom i jasnim oblicima. Ukras koji ne pomaže prepoznatljivosti, funkciji ili čitljivosti se uklanja.

- **Pozadina:** jedan miran ambijentalni motiv; prostor iza teksta i igre ostaje jednostavan. Nema gomilanja rekvizita, sjajnih čestica, ornamentalnih ramova i više tačaka koje se nadmeću za pažnju.
- **Ikonice:** jedan čitljiv primarni simbol, uz samo neophodne pomoćne detalje. Bez minijaturnih scena, postolja, okvira, glitera i detalja koji nestaju u stvarnoj mobilnoj veličini.
- **Logo:** dvoredni naziv je glavni motiv. Materijal i oblik slova daju karakter teme; ukrasi i efekti ne smeju da nadvladaju naziv.
- **UI:** kartice, dugmad, tabla i modali koriste kontrolisanu dubinu. Nema naslaganih obruba, višestrukih senki, agresivnog sjaja i dekoracije koja zauzima prostor sadržaja.
- **Pokret:** nema stalnog treperenja ili ornamentalnih čestica. Animacija služi povratnoj informaciji i prelazu.

Na širini od **320 CSS px** proverava se da li motiv ostaje jasan, ikonica čitljiva, a sadržaj dominantan. Ako detalj ne doprinosi, pojednostavljuje se ili se predlog odbacuje. Ovo je zasebna obavezna provera i kada HEX kontrast, broj PNG-ova i tehničke mere prolaze. Zelena ostaje zaključana referenca; pravilo važi za sve naredne odluke i QA bez trenutnog prerenderovanja Zelene.

Sve pozadine iz V1 i V3 su odbijene, uključujući Vaskršnju iz V1. U V4 su prihvaćene samo Neon Cyber i Severna Maglina. Svih sedam novih V5 predloga je odbijeno; njihovi kandidatni PNG-ovi su uklonjeni. Nijedan od odbijenih predloga nije povezan sa aplikacijom. [Manifest V5](theme-backgrounds-v5.json) čuva odluku i otiske prethodnih fajlova kao istoriju.

## Obavezno pravilo pozadine: raznovrstan svet teme

Svaka pozadina mora da prikaže **prepoznatljiv svet teme**, ali ne mora biti pejzaž. Kadar može biti gradski detalj, arhitektura, enterijer, pogled sa nekog mesta, grupa predmeta u prostoru ili prirodni predeo. Dubina i atmosfera nastaju odnosom oblika, svetla i materijala koji odgovara konkretnom kadru. Samo boja, prazan gradijent, glatka apstraktna površina ili gotovo prazna scena nisu prihvatljivi. Prostor iza UI-ja ostaje čitljiv, bez obaveznog praznog centra i obavezne podele na tri pejzažna plana.

**Balkanska inspiracija je dozvoljena kada odgovara sceni.** To može biti ulica, trg, soba, obala, kuća, materijal, predmet ili priroda. Motiv ima ulogu mesta i atmosfere, ne ukrasa. Cyber grad i Mesec ne treba silom pretvarati u razglednicu. Nema niza crkava, kuća, tvrđava, zastava, narodnih šara i suvenirskih motiva. Zelenina crkva, brda, put i raspored nisu predložak. Pravilo **bez kiča i nakićenosti** važi za svaki detalj.

| Tema | Status ili mogući tip kadra; nije odobrena kompozicija |
|---|---|
| Svetlo Zlato | Sačuvati V6 dvorišni kadar i toplo svetlo; smanjiti mediteranski karakter kuća |
| Trula Višnja | Sačuvati V6 enterijer; zameniti mediteranske kuće i crvene krovove iza prozora |
| Plavi Okean | Novi grčki obalski kadar bez Santorinija: **nadvodno otvoreno more**, skromna luka ili kuće kosih crepnih krovova; bez belih kubnih kuća sa plavim kapcima |
| Neon Cyber | Prihvaćena V4 pozadina; ne menjati |
| Kraljevski Ametist | Prostor ili arhitektonski detalj, bez regalnog kiča |
| Vaskršnja | Uzdržan prolećni prizor ili enterijer sa najviše jednim jednostavnim prazničnim znakom |
| Pustinjsko Staklo | Pogled ili bliži kadar materijala u glinenom pustinjskom svetu; bez staklenog sjaja |
| Mesečev Sjaj | Samo površina Meseca i otvoreni svemir; bez Zemlje, teleskopa, opservatorija i kuća |
| Severna Maglina | Prihvaćena V4 pozadina; ne menjati |

Ovo su mogući smerovi, ne nalog da se sedam novih pozadina ponovo radi po jednoj šemi. Pre rendera se sedam predloga poredi zajedno po tipu kadra, položaju fokusa i vodilji pogleda. **Ponavljanje slova S kroz reku, put, stazu, obalu ili svetlosni trag je zabranjen univerzalni šablon.** Pozadina se pregleda zasebno i ispod stvarnog UI-ja na mobilnom ekranu. Ambijent mora odmah da se prepozna, a logo, tekst i tabla ostaju čitljivi.

**Trenutno su prihvaćene četiri pozadine:** Zelena, Neon Cyber V4, Severna Maglina V4 i Vaskršnja V6 verzija 1. Ti PNG-ovi se ne menjaju. Preostalih šest tema nema odobrenu pozadinu. Prihvatanje pozadine ne znači da je cela tema ili njen Icon Pack završen.

Sedam raznovrsnih V6 kadrova nalazi se u [pregledu](theme-backgrounds-v6-review.html) i na [označenoj zbirnoj slici](theme-backgrounds-v6-contact-sheet.png). Korisnik je definitivno izabrao **Vaskršnju verziju 1**; verzija 2 ostaje prethodna alternativa. Svetlo Zlato i Trula Višnja se dopadaju, ali treba smanjiti mediteranski stil kuća bez gubitka njihove kompozicije, palete i svetla. Plavi Okean V6 je odbijen; prerano izrađen [V7](theme-backgrounds-v7-blue-ocean-review.html) takođe je odbijen jer je previše realističan. Kraljevski Ametist, Pustinjsko Staklo i Mesečev Sjaj čekaju komentar. Ne rade se novi renderi dok korisnik ne završi komentarisanje i zatraži izradu. Nijedan V6/V7 PNG nije povezan sa aplikacijom.

**Mera detalja** su četiri prihvaćene pozadine: jasan glavni prizor, dovoljno karaktera da se tema prepozna i mirna zona za UI. Njihove vrste kadra, motivi i kompozicije se ne kopiraju. Odbacuje se i gotovo prazna površina i previše realističan ili nakićen prizor. V5 istorijski [pregled](theme-backgrounds-v5-review.html) i [poređenje](theme-backgrounds-v4-v5-compare.html) sada jasno označavaju sedam odbijenih kandidata; uklonjeni PNG-ovi se više ne prikazuju kao aktivni predlozi.

## 1. PNG katalog i identitet

- Cilj je **186 produkcionih PNG-ova po temi**: 185 mesta u Green Room Pack-u i jedna zasebna glavna pozadina. Glavni logo igre je već među 185 mesta.
- Svako od 186 mesta ima jedinstven ID, Green referentnu putanju, dimenzije i PNG tip u katalogu. Druga tema pravi svoj originalni asset za isto semantičko mesto. Green putanja nije šablon za kopiranje slike ili naziv koji drugi moraju doslovno koristiti.
- U broj ne ulaze izvorni masteri, QA snimci, povučeni asseti i stari fallback fajlovi. Tehničke izvedenice koje su navedene kao posebna produkciona mesta **ulaze** u 186.
- Svaka tema ima jedan kanonski dizajn dukata, logotipa i svakog drugog simbola koji se ponavlja. Dozvoljena promena rezolucije ne menja oblik, boje, materijal ili detalje identiteta.
- **Dukat u svih deset tema ima tačno pet tačaka na licu** (četiri oko jedne centralne). Pravilo važi za front, levu i desnu perspektivu, inline i particle PNG, kao i za svaki drugi asset koji prikazuje dukat. Romb ili drugi simbol ne može zameniti tačke. Materijal, rub, proporcije i boje ostaju originalni za svaku temu; pet tačaka nisu dozvola da se preslika ili samo preboji tuđi dukat.
- Svaka tema ima **18 medalja**: kolekcija, Top-lista, Turnir, Kvartalna liga, Indeks snage i Vatreni niz imaju zasebne zlatne, srebrne i bronzane PNG-ove. Ista medalja se koristi na svim ekranima tog takmičenja; drugo takmičenje ne preuzima njen motiv.
- Svaka tema ima **osam kontrolnih ikona Riznice**: četiri taba i četiri statusa. Ista kontrola se koristi u Riznici i na drugim mestima gde predstavlja istu radnju ili stanje, uključujući Pravila. Tab Kockice ima ispravno lice sa pet tačaka. Prikaz je prema geometriji Zelene.
- Ikonice i logo su optimizovani PNG-ovi sa transparentnom spoljašnjom pozadinom. Preslikavanje, trasiranje, ogledanje i puko prebojenje asseta druge teme nije dozvoljeno.
- Različit hash, promenjen ton ili sitno promenjen spoljašnji obris nisu dokaz jedinstvenog DNK. Istu semantičku ulogu uporediti kroz svih deset tema na 44 px: silueta, unutrašnja kompozicija, materijalni reljef i paleta moraju činiti prepoznatljiv paket. Potvrđeni promašaji i DNK revizija medalja i kontrola Riznice zabeleženi su u [pregledu od 10. oktobra 2026.](theme-asset-dna-audit-2026-10-10.md).
- Svaki Icon Pack, glavni logo, pozadina, sobni asset i UI komponenta koriste **isti pravac koji piše u tabeli teme**. U JSON-u `iconPackDirection`, `gameLogo.direction` i `direction` moraju se poklapati. Tema sa Clay pravcem nema staklene, satenske ili silikonske ikonice; tema sa Mat silikon / Meka plastika pravcem nema glinenu teksturu. Stari runtime asseti ne predstavljaju odobrenje novog pravca.

## 2. Zajedničke brojčane vrednosti

Vrednosti ispod potiču iz aktivnog Green rasporeda. Za komponente koje nisu pojedinačno navedene, merodavna je izračunata geometrija Zelene pri istom viewportu, jeziku, veličini fonta i stanju. Tematski CSS ne menja brojčane vrednosti geometrije.

| Element | Zajednička vrednost |
|---|---|
| Mobilni portret | Do 599 CSS px širine |
| Prelaz ekrana | 400 ms |
| Pojava splash logotipa | 4.500 ms |
| Ulaz u odgovarajuću sobu | 4.600 ms |
| Polje velike intro ikonice | `clamp(210px, 34vmin, 290px)` |
| Blagi intro puls | 1.800 ms; skala najviše 1,035 |
| Četiri kartice izbora igre | 2 kolone; širina do 330 px; razmak 15 px; visina kartice najmanje 120 px; zaobljenje 20 px |
| Kartica sadržaja | Zaobljenje 20 px; unutrašnji razmak 12 px; visina najmanje 180 px |
| Tabla | Zaobljenje 16 px; unutrašnji razmak 2 px; visina polja na mobilnom `clamp(20px, 3.2vh, 36px)` |
| Donja kontrola menija | Zona dodira 55 × 55 px; polje ikonice 44 × 44 px |
| Školjka sobe | Najviše 760 px; po 22 px od ivice viewporta; zaobljenje 22 px |
| Kompaktni modal | Najviše 420 px; po 14 px od ivice; zaobljenje 20 px; padding 18 px |
| Kockica u mobilnom portretu | `min(14vw, 60px)` |
| Mobilno dugme BACAJ / NAJAVA | Visine 50 / 40 px |
| Gornja / donja bezbedna zona | `max(45px, env(safe-area-inset-top))` / `max(35px, env(safe-area-inset-bottom))` |

Svi odgovarajući introi imaju isti početak, redosled faza, mesto prekida i završetak. Redovna i reduced-motion varijanta zadržavaju isti sadržaj i trajanje prelaza; u reduced-motion varijanti nema ukrasnog kretanja. Funkcionalne vrednosti igre dolaze iz zajedničke logike.

U devet nezelenih tema intro svake glavne sobe prikazuje odobrenu pozadinu aktivne teme preko celog ekrana. Ovo važi i za Riznicu, Dnevni izazov, Kvartalnu ligu i Turnir. Preko prizora nema zasebne tamne podloge, gradijenta ni zamućenja. Zelena zadržava svoju referentnu obradu.

## 3. Boje i tipografija

Svaka tema ima 21 precizan HEX token u registru: pozadina, površina, izdignuta i udubljena površina, glavni i sekundarni tekst, naslov, primarna akcija i tekst na njoj, akcenat, ivica, uspeh, greška, dve boje logotipa i šest boja Yamb kolona. Ovo su **ciljne boje za devet tema**. Kod Zelene ostaju važeći njen postojeći manifest i CSS.

| Tema | Pravac | Pozadina | Površina | Primarna akcija | Akcenat | Tekst |
|---|---|---|---|---|---|---|
| Svetlo Zlato | Mat silikon / Meka plastika | `#E6BE83` | `#FFF1D7` | `#875024` | `#76612B` | `#392817` |
| Trula Višnja | Clay | `#681D25` | `#431720` | `#F1C3B2` | `#E39A70` | `#FFF6F2` |
| Plavi Okean | Mat silikon / Meka plastika | `#0E5A9B` | `#FFF4E5` | `#0B5C8C` | `#BD684A` | `#18384B` |
| Neon Cyber | Mat silikon / Meka plastika | `#080D18` | `#121B2B` | `#56E5D2` | `#F08CE3` | `#F4FAFF` |
| Kraljevski Ametist | Clay | `#5A386A` | `#3C284B` | `#F2C879` | `#D691B5` | `#FBF6FF` |
| Vaskršnja | Mat silikon / Meka plastika | `#E5D4B9` | `#FFF8EA` | `#4D6B45` | `#A66443` | `#3D4434` |
| Pustinjsko Staklo | Clay | `#D79269` | `#FFF0DA` | `#87523C` | `#396B72` | `#443027` |
| Mesečev Sjaj | Clay | `#08090C` | `#252934` | `#E1E2E7` | `#A7A9B8` | `#F5F5F7` |
| Severna Maglina | Mat silikon / Meka plastika | `#0B1830` | `#182C44` | `#8AE3E4` | `#C3ACEA` | `#F5FBFF` |

Ovi HEX tokeni ostaju trenutne ciljne palete; promena pravca sama po sebi nije razlog da se bez provere menjaju boje. Clay koristi blagu ručno vajanu mekoću bez fotorealistične teksture. Mat silikon / Meka plastika koristi čiste, napumpane oblike bez otiska gline, staklene providnosti ili metalnog sjaja. Nazivi poput „Pustinjsko Staklo“ označavaju temu i paletu, ne dodatni materijalni pravac.

### Kartice, podkartice i okviri soba

Devet nezelenih tema sada koristi zajedničku geometriju Zelene i sopstvene `surface`, `raised`, `inset`, `border`, `text` i `primary` boje iz `theme-definitions.json`. Kartica sadržaja ima radius **20 px**, padding **12 px** i minimalnu visinu **180 px**. Odgovarajuće podkartice i puni okviri soba imaju isti radius, padding, širinu i granice kao Zelena pri istom viewportu i stanju. Clay teme imaju puniju meku dubinu; mat silikon i meka plastika čistiju mat ivicu. Jedan obris i kontrolisana senka čuvaju izgled bez kiča. Produkcioni sloj je `www/theme-card-surfaces.css`.

Četiri centralne kartice glavnog menija zadržavaju svoj posebno dogovoreni providni staklasti sloj, a tabla za igranje zasebnu paletu i providnost. Provera izračunatog CSS-a u pregledaču potvrdila je geometriju 13 reprezentativnih tipova kartica, podkartica i okvira za svih deset tema na prikazima 320 × 568, 360 × 780, 412 × 915 i 768 × 1024 CSS px, bez odstupanja u proveravanim dimenzijama. U ponovljenoj proveri ispravljene su širina isprekidane ivice kartice za dodavanje prijatelja i radius statistike turnira u Vaskršnjoj temi. Android prikaz još nije potvrđen za ovaj sloj.

UI tipografija je zajednička radi istog prelamanja i veličine kartica: **Montserrat**, težine 400/600/700/800; rezervni font Arial. Citat koristi Georgia italic. Skala za nove komponente: 12 px natpis, 14 px pomoćni tekst, 16 px osnovni tekst, 18 px naslov kartice, 22 px naslov odeljka, 28 px naslov sobe; line-height 1,45 za tekst i 1,2 za naslove. Postojeće Green komponente zadržavaju svoje aktivne metrike i služe kao referenca za odgovarajuće komponente drugih tema. Tematske boje teksta su u HEX tokenima, a posebna tipografija glavnog logotipa nalazi se unutar njegovog PNG-a.

Za normalan tekst i tekst na primarnoj akciji cilj je kontrast najmanje **4,5:1**; za veliki tekst i ključne ne-tekstualne kontrole najmanje **3:1**. To prati [WCAG 2.2](https://www.w3.org/TR/WCAG22/). Provera tokena ne zamenjuje proveru stvarnog teksta preko renderovane pozadine i poluprovidnih površina.

Šest boja Yamb kolona imaju najmanje 4,5:1 prema osnovnoj površini. Njihovo značenje u interfejsu prate naziv, položaj i ikonica, tako da boja nije jedini signal. Sekundarni tekst se stavlja na osnovnu ili izdignutu površinu; na udubljenoj površini koristi se glavni tekst token.

## 4. Glavni logo igre

- Svaka tema ima jedan originalni glavni logo sa nazivom **Yamb of the Balkan**, u svom stilu i pravcu. Natpis na slici ima dva reda: `YAMB OF THE` i `BALKAN`.
- Transparentni produkcioni PNG ima referentno platno **1672 × 941 px**. Prikaz koristi širinu `min(90vw, 700px)` i maksimalnu visinu `32vh`; slobodan prostor oko vidljivog znaka je najmanje 8% njegove visine.
- Jedan kanonski dizajn se koristi na splashu, u meniju i svuda gde se prikazuje glavni logo igre; promene rezolucije potiču od istog mastera. Tekst mora ostati čitljiv na prikazu širokom 320 CSS px.
- Zeleni logo pokazuje ulogu i veličinu. Ostalih devet dobijaju nove kompozicije i materijale, bez kopiranja Zelene ili međusobnog prebojenja.

## 5. Prihvatanje teme

Za svaku od devet tema pregled obuhvata 320 × 568, 360 × 780, 412 × 915 i 768 × 1024 CSS px, srpski i engleski, normalan i uvećan sistemski font (faktor 1,3). Proveravaju se svi primenljivi prikazi i stanja na splashu, meniju, u svim sobama, na tabli i na završnom ekranu.

Tema je spremna tek kada prođu sledeće provere:

1. **Asseti:** tačno 186 produkcionih PNG mesta; ispravan format, dimenzije i alpha prema katalogu; originalni motivi bez curenja druge teme; jedan kanonski izgled za svaki motiv koji se ponavlja.
2. **Kontrast i tekst:** pragovi iznad, bez odsečenog teksta, preklapanja i gubitka smisla na oba jezika i u svim primenljivim stanjima.
3. **Geometrija:** iste dimenzije, poravnanja, zone dodira, redosled slojeva i skrol granice kao Green referenca pri istom stanju i viewportu.
4. **Funkcionalnost i pokret:** ista pravila igre, podaci, nagrade, odbrojavanja, introi, vremena, prekidi i reduced-motion ponašanje.
5. **Učitavanje:** početni kadar učitava samo aktivnu pozadinu, logo i potrebne menu izvedenice; ostali PNG-ovi stižu pri ulasku u sobu. Na aktivnom prikazu nema asseta druge teme.
6. **Dokazi izgleda i potrošača:** pregledna tabla ima stvarne slike; svih 186 uloga ima potvrđenu produkcionu putanju, ekran/potrošača i optičke granice za tu temu.
7. **Performanse i rezerva:** izmereni budžeti za početak, svaku sobu i vrhunac memorije prolaze; nedostajući PNG čuva funkcionalan tekstualni/CSS prikaz bez asseta druge teme. Obavezni PNG i dalje mora postojati za prihvatanje.
8. **Vizuelna uzdržanost:** pozadina, Icon Pack, logo i UI prolaze pregled bez kiča i nakićenosti u stvarnom mobilnom prikazu.
9. **Živopisan predeo:** pozadina prikazuje prepoznatljiv ambijent sa dubinom, ne samo boju; Plavi Okean je nadvodni okeanski predeo, bez morskog dna.

Provere kontrasta tokena i konzistentnosti kataloga mogu se ponoviti komandom `node scripts/check-theme-design-spec.js`. Usklađenost stvarnog UI-ja zahteva vizuelni i funkcionalni QA; sam prolaz skripte ne označava temu završenom.

## 6. Pregledna tabla svake teme

[`theme-review-board.html`](theme-review-board.html) prikazuje svih deset tema na jednom mestu. Za svaku se proveravaju finalna portretna pozadina, dvoredni logo, najmanje šest originalnih ikonica (uključujući dukat), kartica u normalnom/pritisnutom/onemogućenom stanju, tabla sa kockicama i kolonama, jedan kadar room introa i uski SR/EN ekran. Pregled uključuje čitljivost, optičku ravnotežu, materijalni pravac i dovoljno različit identitet među temama.

Trenutna tabla prikazuje ciljane HEX boje i **šematske** kartice/table. Samo povezani PNG i snimci su stvarni. Zelena ima referentne PNG primere; kod ostalih tema prazna polja ostaju dok se originalni asseti i QA snimci ne izrade. Veza do finalnog dokaza unosi se u `theme-progress.json`, pa se tabla ponovo generiše komandom `node scripts/build-theme-review-board.js --write`. Šema boja nije odobrenje materijala niti završene sobe.

## 7. Upotreba asseta i vidljive granice

[`theme-asset-usage-map.json`](theme-asset-usage-map.json) daje zapis za svako od 186 mesta: očekivane kontekste, statičke reference putanje u produkcionom kodu, broj bajtova, procenu RGBA memorije i izmerene vidljive granice Zelene. Granice su najmanji pravougaonik piksela čija je alpha vrednost najmanje 16; neprozirna pozadina zauzima celo platno. Polazna mapa je napravljena pomoću `scripts/build-theme-asset-usage-map.py`, a nove medalje su dopunjene pomoću `scripts/record-theme-medals.js`.

Statičko pojavljivanje putanje ne potvrđuje da je PNG zaista vidljiv: dinamički sastavljene putanje, uslovni prikazi i duplirani elementi proveravaju se na stvarnom ekranu. [`theme-asset-implementation-map.json`](theme-asset-implementation-map.json) otvara po 186 pojedinačnih mesta za svaku od devet ciljnih tema. Za svaku ulogu se tokom izrade unose **njena** produkciona putanja, master, svi aktivni potrošači, veličina i izmerene optičke granice. Prazna polja znače da tema još nije potvrđena. Izolovana ikonica u istom CSS polju cilja 70–90% vidljive zauzetosti i centriran motiv, osim dokumentovanih namernih kompozicija poput širokog logotipa. Senke i reljef ne smeju biti isečeni. Ako slot nema aktivnog potrošača, potreban je dokumentovan razlog pre prihvatanja.

## 8. Budžeti učitavanja i nedostajući asset

Budžeti su ciljevi za **optimizovani produkcioni PNG**; MiB znači 1.048.576 bajtova. Dekodirana RGBA procena je širina × visina × 4 bajta po PNG-u. Početni kadar sme da dovede najviše **4 MiB transfera i 16 MiB dekodiranih PNG-ova**: aktivnu pozadinu, logo i neophodne menu izvedenice. Svaka soba sme dodatno da učita najviše **4 MiB transfera i 24 MiB dekodiranih PNG-ova** za svoje introe, ikone i stanja. Vrh trenutno dekodiranih PNG-ova aktivne teme cilja najviše **40 MiB**; neaktivne sobe se oslobađaju ili učitavaju po potrebi. Ovo se meri na sporijem ciljnom Android uređaju pri hladnom i toplom startu, sa zabeleženim buildom, mrežom, vremenom prvog interaktivnog kadra i vrhom memorije za svaku sobu. Prekoračenje traži optimizaciju ili obrazložen izuzetak pre prihvatanja.

Za orijentaciju, četiri Green fajla označena za početak u katalogu zbirno imaju oko **3,64 MiB na disku i 13,13 MiB RGBA procene**. To ne dokazuje stvarni transfer, dekodiranje ili vrh memorije aplikacije; te vrednosti se mere zasebno.

Ako PNG nedostaje ili padne učitavanje, isto polje prikazuje čitljiv tekst ili jednostavan CSS simbol u paleti aktivne teme, uz zadržanu interakciju i dijagnostiku teme, slota i putanje. Pozadina pada na `background` boju teme; logo na dvoredni tekst `YAMB OF THE` / `BALKAN` u istom bezbednom polju. Ne koristi se PNG druge teme, prebojen tuđi asset ni nejasan emoji. Fallback čuva upotrebljivost, ali nedostajući obavezni PNG blokira prihvatanje.

## 9. Napredak po temi i sobi

[`theme-progress.json`](theme-progress.json) sadrži svih deset tema i 19 zajedničkih prikaza/soba. Za preostalih devet početna faza je **defined**: specifikacija postoji, a izrada i provere tek treba da se potvrde. Zelena je označena **locked-reference**, bez tvrdnje da je ponovo prošla ovu QA matricu. Faze napretka su `defined → created → linked → visually-checked → accepted`. Svako podizanje faze zahteva dokaz: putanju finalnog asseta, verziju/build, QA zapis ili snimak sa veličinom ekrana i jezikom. Ukupan status teme ne može biti viši od najniže neproverene obavezne sobe i njenih asset/performance provera.

## Aktuelni izbor pozadina (V8)

Prihvacene su pozadine Zelene, Neon Cyber V4, Severne Magline V4, Vaskrsnje V6 verzije 1 i Kraljevskog Ametista V6. Njihove putanje i SHA-256 otisci su zakljucani u theme-definitions.json. Nove V8 pozadine za preostalih pet tema nalaze se u theme-backgrounds-v8.json i pregledu theme-backgrounds-v8-review.html; sve cekaju korisnicki izbor. Za Pustinjsko Staklo i Mesecev Sjaj sacuvane su i V6 slike koje su se korisniku dopale kao pravac. Nijedna V8 slika nije povezana sa aplikacijom.

## Dopuna: V8 izbor i V9 pregled

Pustinjsko Staklo V8 verzija 2 je prihvaceno i zakljucano SHA-256 otiskom u theme-definitions.json. Prihvacenih pozadina je sada sest. V8 predlozi preostale cetiri teme ostaju istorija zbog previse realisticnog utiska. Novi V9 predlozi za Svetlo Zlato, Trulu Visnju, Plavi Okean i Mesecev Sjaj cekaju korisnicki izbor; pregled i manifest su theme-backgrounds-v9-review.html i theme-backgrounds-v9.json. Nisu povezani sa aplikacijom.

## Trenutni izbor nakon V9

Trula Visnja V8 i V9 su ponuđene korisniku za poredjenje. Svetlo Zlato V9 ceka komentar. Plavi Okean V9 i Mesecev Sjaj V9 su odbijeni; bez nove izrade dok korisnik to ne zatrazi. Sest ranije prihvacenih pozadina ostaje zakljucano.

## Najnovija odluka

Trula Visnja V9 je prihvacena i zakljucana. V8 alternativa nije izabrana. Sada je prihvaceno sedam pozadina; po korisnickom zahtevu dalji rad ceka novo uputstvo.

## Presek prihvacenih pozadina

Svetlo Zlato V9 je prihvaceno i zakljucano. Ukupno osam od deset tema ima prihvacenu pozadinu; Plavi Okean i Mesecev Sjaj nemaju prihvacenu pozadinu, a njihove V9 verzije su odbijene. Ovaj presek se odnosi na pozadine, ne na zavrsetak celih tema, Icon Pack-ova ili povezivanje novih slika sa aplikacijom.

## V10 smer za preostale dve pozadine

Plavi Okean koristi grcki obalski identitet bez Santorinija: more je glavni motiv, sa skromnim kopnenim lukama i kucama kosih crepnih krovova, u mat-plasticnom pravcu. Mesecev Sjaj prikazuje samo oblikovanu lunarnu povrsinu i svemir, bez Zemlje i ljudskih gradjevina, u Clay pravcu. Novi V10 PNG-ovi su kandidati za pregled i nisu povezani sa aplikacijom.

## V11 pregled poslednje dve pozadine

Grcka luka je prihvacena kao smer za Plavi Okean, uz lokalnu doradu udaljenih planina. V10 radna skica 2 je pravac Mesecevog Sjaja, uz doradu realizma povrsine u Clay. Novi V11 PNG-ovi cekaju izbor; osam ranije odobrenih mastera ostaje zakljucano.

## V12 predlozi za preostale dve teme

Plavi Okean V11 je sacuvan za poredjenje. V12 donosi sasvim novi kadar morske luke nadahnut Atinom i Pirejem, uz more kao glavni motiv. Mesecev Sjaj V11 nije prihvacen; V12 prikazuje srebrnosivu glinenu povrsinu Meseca bez zvezda. Oba V12 PNG-a su predlozi za izbor i nisu povezana sa aplikacijom. Osam prihvacenih pozadina ostaje zakljucano.

## V13 povratna informacija

Plavi Okean V12 ima odobren pravac kadra, ali su udaljene planine delovale previse realisticno. V13 je lokalna dorada samo tog dalekog plana; prvi plan, luka, grad i more ostaju osnova. Mesecev Sjaj V12 ima odobren pravac kompozicije sa velikim kraterom levo i crnim nebom, bez tvrdnje da je cela slika konacno izabrana.

## V14 odluka i ispravka

Plavi Okean V13 je konacno prihvacena pozadina i zakljucan je otiskom. Za Mesecev Sjaj korisnik je ispravio polozaj glavnog kratera: desno, uz vecu vidljivu povrsinu Meseca. V14 je novi predlog prema toj ispravci. Raniji V12 kadar sa levim kraterom ostaje samo istorija, ne aktivan pravac.

## Zavrsni presek pozadina

Svih deset pozadina je prihvaceno. Mesecev Sjaj V14 je zakljucan uz devet ranije izabranih; Plavi Okean koristi V13. Odabrani PNG-ovi su povezani sa lokalnom aplikacijom za prikaz, pocetno ucitavanje i promenu teme. Tacne putanje, dimenzije i otisci mastera i runtime kopija su u `theme-backgrounds-final.json`, a vizuelni pregled u `theme-backgrounds-final-review.html`. Ovaj presek potvrdjuje pozadine, ne zavrsetak kompletnih tema i svih njihovih asseta.

## Čišćenje prethodnih verzija

Posle konačnog izbora obrisano je 58 neprihvaćenih izvornih PNG verzija, osam starih web pozadina i sedam zbirnih slika sa odbijenim predlozima. Raniji opisi izbora u ovom dokumentu su istorijski; reference na stare PNG fajlove i zbirne slike više ne označavaju postojeće fajlove. Stare HTML stranice pregleda preusmeravaju na [galeriju prihvaćenih pozadina](theme-backgrounds-final-review.html). Važeće putanje i otisci su isključivo u [konačnom manifestu](theme-backgrounds-final.json).

## Palete prema prihvaćenim pozadinama

Palete u `theme-definitions.json` su usklađene sa stvarnim prihvaćenim PNG pozadinama. Svetlo Zlato sada koristi medeno zlato i maslinastu senku; Trula Višnja crvenu glinu i toplo svetlo; Plavi Okean dublju egejsku plavu sa krem površinama i krovnim terakota akcentom; Kraljevski Ametist puderastu ljubičastu i svetlo zalaska; Vaskršnja toplu slonovaču, kadulju i svetlo drvo; Pustinjsko Staklo koralni peščar i prigušenu plavosivu; Mesečev Sjaj gotovo crni grafit i neutralnu srebrnosivu. Neon Cyber i Severna Maglina već odgovaraju svojim pozadinama. Zelena ostaje zaključana.

Promenjeni su samo boje, opis prihvaćenog kadra i osnovni UI tokeni u `www/teme.css`. Zajednički stil 3D Soft Neomorphism i pravac Clay ili Smooth Rubber / Matte Plastic svake teme su neizmenjeni. Postojeći posebni ekrani i ikone se dalje proveravaju u radu na svakoj temi; ova korekcija palete sama po sebi ne znači da su završeni.

Za Icon Pack je urađena dodatna [završna provera paleta i originalnosti](theme-icon-pack-palette-audit-2026-10-06.md). Devet ciljnih paketa ima zaseban jezik oblika, četiri kontrolisane boje i proverenu nosivu konturu. Zapažena sličnost postojećih Vaskršnjih i Pustinjskih dukata sa Zelenim znači da ti trenutni PNG-ovi nisu prihvaćeni kao konačan originalni dizajn; biće zamenjeni pri izradi kompletnih paketa.
