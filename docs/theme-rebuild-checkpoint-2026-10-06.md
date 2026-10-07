# Presek stanja za ponovnu izradu tema

Datum: 2026-10-06. Ovaj zapis je početna tačka za rad na devet tema. [`theme-definitions.json`](theme-definitions.json) je ugovor za izgled, funkciju i prihvatanje; [`theme-progress.json`](theme-progress.json) prati dokazani napredak. Postojeća aplikacija nije ovim zapisom automatski usklađena sa novim pravilima.

## Zaključena odluka

- **Zelena (`dark`) se ne radi ponovo.** Njenih 176 PNG-ova u Green Room Pack-u i zasebna pozadina čine 177 referentnih mesta. Njena aktivna geometrija, stanja, trajanja i tokovi služe kao primer kada eksplicitni standard ne odgovori na pitanje.
- Kontrolni SHA-256 otisci svih 177 Green PNG-ova sačuvani su u [`green-reference-sha256.json`](green-reference-sha256.json). Komanda `node scripts/check-green-reference-fingerprint.js` prijavljuje svaku kasniju promenu tih fajlova.
- **Ostalih devet tema se izrađuje ponovo.** Svaka zadržava zajednički stil **3D Soft Neomorphism**, ali dobija sopstveni pravac, paletu, renderovanu pozadinu, logo, 177 originalnih produkcionih PNG uloga i tematski UI. Ne preuzima se niti prebojava Green PNG ili PNG druge teme.
- Red odlučivanja je: definicija konkretne teme → zajednički standard → Green primer za nedorečenu funkciju/geometriju/tok. Ako se u Green referenci otkrije kvar, prvo se beleži; kvar se ne prenosi u nove teme.
- Postojeći nezeleni asseti i CSS ostaju zatečeno stanje tokom prelaza. Broj postojećih fajlova nije potvrda da su njihove uloge, originalnost ili izgled prihvaćeni. Zamena se povezuje i proverava po ulozi pre uklanjanja starog fajla.

## Inventar na početku (istorijski pravci, pre promene)

Brojevi ispod su **sirovi PNG fajlovi u navedenom direktorijumu**, ne broj potvrđenih uloga. Pozadina je posebno označena. Neke teme imaju druge postojeće assete i CSS van tih direktorijuma; zato se nula ne tumači kao da tema trenutno nema vizuelni kod.

| Tema (`id`) | Pravac | PNG u namenskom direktorijumu | Poznata zasebna pozadina | Cilj |
|---|---|---:|---|---:|
| Zelena (`dark`) | Clay | 176 | Da | 177 — zaključana referenca |
| Svetlo Zlato (`light`) | Soft Satin / Brushed Pearl | 0 | Ne | 177 |
| Trula Višnja (`medium`) | Felt / Soft Velvet | 0 | Ne | 177 |
| Plavi Okean (`winter`) | Frosted Glass | 0 | Da | 177 |
| Neon Cyber (`neon`) | Smooth Rubber / Matte Plastic | 0 | Ne | 177 |
| Kraljevski Ametist (`amethyst`) | Soft Satin / Brushed Pearl | 0 | Ne | 177 |
| Vaskršnja (`easter`) | Smooth Rubber / Matte Plastic | 156 | Da | 177 |
| Pustinjsko Staklo (`desert`) | Relief | 235 | Da | 177 |
| Mesečev Sjaj (`moon`) | Frosted Glass | 0 | Da | 177 |
| Severna Maglina (`severna`) | Frosted Glass | 245 | Da | 177 |

Direktorijumi u tabeli: `www/assets/green-soft-clay`, `easter-soft-clay`, `desert-soft-clay` i `severna-soft-clay`. Ostale teme trenutno nemaju zaseban direktorijum tog tipa. Poznate pozadine proverene su kao postojeći fajlovi u `www/assets`, ali njihov postojeći izgled nije ovde prihvaćen kao finalni dizajn.

## Stanje standarda i granica prihvatanja

- Definisano je 10 tema, uključujući 9 ciljnih tema sa svojim pravcima i paletama, 177 zajedničkih PNG uloga, 19 prikaza/soba, zajedničke UI vrednosti, introi, stanja, tipografija, logo i pravila originalnosti.
- Green referentna mapa ima dimenzije, veličine, statičke reference i merene vidljive granice svih 177 PNG mesta. Mapa devet novih tema ima ukupno **1.593 otvorena mesta** za njihove nove fajlove i dokaze.
- Pregledna tabla, budžeti učitavanja, fallback i faze napretka su definisani. Stvarni prikaz i performanse novih tema još nisu potvrđeni.
- U [`theme-progress.json`](theme-progress.json) svih devet tema i njihovih 19 prikaza počinju u fazi `defined`. Zelena je `locked-reference`. Nijedna nova tema nema status `accepted`.

## Redosled izrade

Rad ide redom `light`, `medium`, `winter`, `neon`, `amethyst`, `easter`, `desert`, `moon`, `severna`. Prvi paket je **Svetlo Zlato**: finalna pozadina, originalni logo i početni Icon Pack za splash i glavni meni, zatim sobe i ostale obavezne uloge. Za svaku temu se po završetku stvarne faze ažuriraju per-slot mapa, napredak i pregledna tabla. Tema se prihvata tek po asset, vizuelnoj, funkcionalnoj i Android proveri iz standarda.

Ovaj presek ne briše postojeće nezelene assete, ne menja Green runtime i ne tvrdi da su nove teme već izrađene.

## Dopuna istog dana: vizuelna uzdržanost i pauza pozadina

Korisnik je uveo obavezno pravilo **bez kiča i nakićenosti detaljima** za svih deset tema, uključujući pozadine, Icon Pack, logotipe i UI. Provera je opisana u `theme-definitions.json` i `theme-design-standard.md`. Prva generisana serija od devet pozadina je odbačena kao smer. Fajlovi su arhivirani van isporučivanih `www` asseta; nijedna nova pozadina nije povezana sa aplikacijom. Vaskršnji render je samo mogući privremeni primer, bez odobrenja. Rad na novim renderima čeka dodatne korisničke definicije.

Drugo korisničko pravilo za pozadine zahteva **živopisne, prepoznatljive predele**, ne samo boju ili praznu površinu. Green je primer nivoa živosti, bez kopiranja njegove kompozicije. Plavi Okean mora prikazati nadvodni okeanski predeo; morsko dno je izričito odbačeno. Početni smer svakog od devet predela je upisan u definiciju i standard, uz istovremenu zabranu kiča. Novi renderi još nisu pokrenuti.

## Dopuna: dva važeća pravca

Korisnik je zatim odbacio ranije materijalne pravce jer su vodili ka previše realističnim prikazima. Od ovog trenutka jedini važeći pravci za sve nove dizajne su **Clay** i **Mat silikon / Meka plastika (Smooth Rubber / Matte Plastic)**. Mapa je u `theme-definitions.json`, a odnosi se na pozadinu, Icon Pack, glavni logo, UI, tablu, kockice, sobne prikaze i animacije. Zelena ostaje zaključani Clay primer. Prethodna tabela beleži inventar i odluke u trenutku prvog preseka; njena kolona „Pravac“ više nije aktivna definicija.

Clay: Trula Višnja, Kraljevski Ametist, Pustinjsko Staklo i Mesečev Sjaj. Mat silikon / Meka plastika: Svetlo Zlato, Plavi Okean, Neon Cyber, Vaskršnja i Severna Maglina. Zapoceta druga serija pozadina sa starim pravcima nije odobrena niti povezana; za naredni render merodavna je nova mapa.

## Dopuna: balkanski motivi i poređenje pozadina

Korisnik je pojasnio da nije tražio izradu V3 pozadina u trenutku promene pravca. One ostaju sačuvane kao kandidati, bez povezivanja sa aplikacijom. Pozadine smeju selektivno koristiti balkanske predele, prirodu, materijale, lokalne kuće i jedno smisleno obeležje, ali bez kiča, gomilanja detalja i kopiranja Green kompozicije. Nije nužno umetati balkansku građevinu u svaku temu. Nova serija od devet V4 kandidata primenjuje ovu dopunu, a V3 i V4 se porede po temi. Korisnik bira najbolje rešenje nakon uporednog pregleda.

## Odluka posle poređenja V3/V4

Korisnik je definitivno izabrao **Neon Cyber V4** i **Severnu Maglinu V4**. Ti masteri ostaju neizmenjeni, sa SHA-256 otiscima u `theme-definitions.json`. Preostalih sedam V3/V4 rešenja je odbijeno. Korisnik je naglasio da je problem i nedostatak sredine između previše prazne i previše detaljne slike, kao i nedovoljno stroga primena pravila bez kiča. Naredna V5 serija obuhvata samo sedam odbijenih tema i cilja nivo živosti, slojevitosti i detalja dve prihvaćene pozadine, bez kopiranja njihovih motiva.

U prethodnom koraku izrađeno je sedam V5 kandidata u `source-assets/theme-backgrounds-v5/`; tada su bili pripremljeni za pregled i nijedan nije povezan sa aplikacijom. Kasnija korisnička odluka o tim kandidatima zabeležena je ispod.

Naknadna odluka korisnika: svih sedam V5 predloga je odbijeno, posebno Vaskršnja zbog kiča. Korisnik je pojasnio da živopisnost ne znači ponavljanje pejzaža i S-krivine koju čini reka, put, staza ili svetlosni trag. Dopušteni su i gradski balkanski detalji, enterijeri, pogledi i predmeti. Sedam V5 PNG-ova je uklonjeno; njihovi otisci i odluka ostaju u manifestu. Prihvaćene su samo pozadine Zelene, Neon Cyber V4 i Severne Magline V4. Naredni kadrovi moraju se međusobno razlikovati po kompoziciji i tipu scene.

V6 odluka: korisnik je uporedio dve nove Vaskršnje verzije i **definitivno izabrao verziju 1** (`source-assets/theme-backgrounds-v6/easter-background-variant-1-v6.png`). Ona je zaključana u definiciji teme otiskom SHA-256. Verzija 2 ostaje prethodna alternativa, bez statusa kandidata. Šest drugih V6 pozadina čeka izbor; nijedna V6 pozadina još nije povezana sa aplikacijom.

Sledeća povratna informacija: korisniku se Svetlo Zlato i Trula Višnja V6 dopadaju, ali su njihove kuće previše mediteranske; kadar, svetlo i paleta ostaju smer, dok se mediteranski karakter smanjuje. Plavi Okean V6 je odbijen. Novi V7 kadar koristi grčka egejska ostrva nadahnuta Santorinijem, bele kuće sa plavim prozorima i otvoreno more; još nije prihvaćen. Kraljevski Ametist, Pustinjsko Staklo i Mesečev Sjaj čekaju komentar.

Korisnik je pojasnio da je komentarisao smernice i nije tražio da se odmah renderuje. Zato je Plavi Okean V7, koji je u međuvremenu prerano izrađen, označen kao odbijen zbog previše realističnog izgleda. Slede samo komentari za Kraljevski Ametist, Pustinjsko Staklo i Mesečev Sjaj; bez novih rendera do novog zahteva korisnika.

## Odluka i novi kandidati V8

Korisnik je prihvatio Kraljevski Ametist V6; master je zakljucan otiskom SHA-256 u theme-definitions.json. Pravci Pustinjskog Stakla i Mesecevog Sjaja V6 se dopadaju, ali korisnik trazi jos verzija pre izbora. V6 slike ostaju netaknute. Napravljene su po dve nove V8 verzije za te teme i po jedna V8 za Svetlo Zlato, Trulu Visnju i Plavi Okean. Svetlo Zlato i Trula Visnja imaju manje mediteranskog karaktera; Plavi Okean je grcki ostrvski kadar u mat-plasticnom pravcu. Pregled sa jasnim oznakama je docs/theme-backgrounds-v8-review.html, a putanje, statusi i otisci u docs/theme-backgrounds-v8.json. Sve V8 slike su kandidati koji cekaju korisnicku odluku, bez runtime povezivanja.

## Odluka za Pustinjsko Staklo i nova V9 serija

Korisnik je izabrao Pustinjsko Staklo V8, novu verziju 2 (siroki kanjon). PNG je sacuvan neizmenjen i zakljucan SHA-256 otiskom u theme-definitions.json. Ostale V8 pozadine korisniku deluju previse realisticno, posebno zbog sitnih detalja. Cetiri nova V9 kandidata su napravljena za Svetlo Zlato, Trulu Visnju, Plavi Okean i Mesecev Sjaj, sa izrazitijim glinenim ili mat-plasticnim oblicima. Kod Trule Visnje i Mesecevog Sjaja izabrane su dodatno pojednostavljene dorade. Njihove putanje, statusi i otisci su u docs/theme-backgrounds-v9.json; pregled u docs/theme-backgrounds-v9-review.html. Nijedna V9 slika nije povezana sa igrom.

## Dopuna: izbor Trule Visnje; odbijene V9 pozadine

Korisnik je zatrazio direktno poredjenje Trule Visnje V8 i V9 da izabere jednu. V8 je zato ponovo ponudjena za izbor; V9 takodje ceka odluku. Plavi Okean V9 i Mesecev Sjaj V9 su odbijeni i korisnik ne zeli da se sada rade nove verzije tih tema. Preostala tema sa kucama je Svetlo Zlato, ciji V9 predlog jos ceka komentar. Nijedan novi render nije trazen u ovom koraku.

## Odluka: Trula Visnja V9

Korisnik je izabrao Trulu Visnju V9 i zatrazio da se saceka sa daljim radom. Master source-assets/theme-backgrounds-v9/medium-background-master-v9 je zakljucan SHA-256 otiskom u theme-definitions.json. V8 alternativa nije izabrana. Sedam pozadina je sada prihvaceno; Svetlo Zlato V9 i dalje ceka komentar, a Plavi Okean V9 i Mesecev Sjaj V9 ostaju odbijeni. Nema daljih rendera do novog korisnickog uputstva.

## Odluka: Svetlo Zlato V9 i presek 8/10

Korisnik je prihvatio Svetlo Zlato V9. Master source-assets/theme-backgrounds-v9/light-background-master-v9 je zakljucan SHA-256 otiskom u theme-definitions.json; V8 nije izabrana. Osam pozadina je sada prihvaceno: Zelena, Svetlo Zlato V9, Trula Visnja V9, Neon Cyber V4, Kraljevski Ametist V6, Vaskrsnja V6 verzija 1, Pustinjsko Staklo V8 verzija 2 i Severna Maglina V4. Plavi Okean V9 i Mesecev Sjaj V9 su odbijeni i jos nemaju prihvacenu pozadinu. Odobrenje pozadine ne znaci da je cela tema ili njen Icon Pack zavrsen.

## Novi smer i V10 kandidati za poslednje dve pozadine

Korisnik je za Mesecev Sjaj trazio samo povrsinu Meseca i svemir: bez Zemlje, teleskopskih kuca/opservatorija ili druge gradjevine. Za Plavi Okean trazio je grcki stil, ali izricito bez Santorinija. Definicija je izmenjena: grcka kopnena luka sa kosim crepnim krovovima umesto belih kubnih kuca; oblikovana glinena lunarna povrsina i otvoreni svemir bez objekata. Dva dodatno stilizovana V10 mastera su sacuvana u source-assets/theme-backgrounds-v10/ i evidentirana u docs/theme-backgrounds-v10.json. Oba cekaju korisnicki izbor; osam prethodno prihvacenih pozadina ostaje zakljucano, a novi masteri nisu povezani sa igrom.

## V11 dorade posle povratne informacije za V10

Korisniku se svidela V10 grcka luka Plavog Okeana, ali su udaljene planine bile previse realisticne. Novi V11 zadrzava luku, kuce, camac, kej i more, a pojednostavljuje planine u mat-plasticne oblike. Korisnik je za Mesecev Sjaj izabrao V10 radnu skicu 2 kao pravac. Novi V11 zadrzava njena dva velika kratera, grebene, oble stene i svemir, uz glatkiju Clay povrsinu. V11 PNG-ovi i njihovi otisci su u docs/theme-backgrounds-v11.json; pregled sa polaznim slikama je docs/theme-backgrounds-v11-review.html. Oba cekaju odluku, bez runtime povezivanja.

## V12: Pirej i nova lunarna površina

Korisnik je tražio da se Plavi Okean V11 sačuva, uz sasvim nov kadar s motivima Atine, Pireja i mora. V11 ostaje kandidat za poređenje. Mesečev Sjaj V11 nije prihvaćen; zvezde su posebno odbačene. Novi V12 prikazuje srebrnosivu glinenu površinu, izražen krater i mirno nebo bez zvezda. Oba V12 PNG-a su sačuvana u `source-assets/theme-backgrounds-v12/`, a njihovi otisci i poređenje s V11 u `docs/theme-backgrounds-v12.json` i `docs/theme-backgrounds-v12-review.html`. Osam odobrenih pozadina ostaje neizmenjeno; V12 još nije povezan sa aplikacijom.

## V13: dorada udaljenih planina

Korisniku se dopada kadar Plavog Okeana V12, posebno prvi plan, luka i more. Udaljene planine su previše realistične; nova V13 slika menja samo taj deo u glatke mat-plastične oblike i čeka pregled. Korisniku odgovara pravac Mesečevog Sjaja V12: veliki krater levo i crni svemir. To još nije konačno odobrenje cele slike. V12 i V13 su sačuvani, a osam ranije prihvaćenih pozadina ostaje zaključano.

## V14: odobren Okean, novi Mesec

Korisnik je prihvatio Plavi Okean V13. PNG je zaključan SHA-256 otiskom u `theme-definitions.json`; sada je prihvaćeno devet pozadina. Korisnik je ispravio smer Meseca: glavni krater treba da bude desno, a površina Meseca mnogo veća u kadru. Novi V14 je glineni predlog sa desnim kraterom, širokom površinom i crnim nebom bez zvezda. Čeka izbor i nije povezan sa aplikacijom.

## Završni izbor i povezivanje svih deset pozadina

Korisnik je prihvatio Mesečev Sjaj V14. Svih deset pozadina sada ima konačni, zaključani master. Devet odobrenih mastera kopirano je bez promene u `www/assets/theme-backgrounds/`; Zelena zadržava postojeći runtime PNG. Lokalna aplikacija koristi nove putanje pri prvom učitavanju, promeni teme i u CSS pozadinama. Master i runtime SHA-256 otisci, dimenzije i putanje su u `docs/theme-backgrounds-final.json`, a pregled svih slika u `docs/theme-backgrounds-final-review.html`. Icon Packovi i ostali delovi tema nisu ovim korakom proglašeni završenim.

## Čišćenje neprihvaćenih verzija

Na korisnikov zahtev obrisani su svi neprihvaćeni i radni PNG predlozi iz `source-assets/theme-backgrounds-v*/` (58 fajlova), osam starih web pozadina i sedam zbirnih slika koje su sadržale odbijene verzije. Stare stranice pregleda sada vode na galeriju deset prihvaćenih pozadina. Zapisi o ranijim odlukama u ovom dokumentu i starim JSON manifestima ostaju istorija; njihove prethodne slike više nisu sačuvane. Android web kopija je ponovo sinhronizovana sa `www/`. Devet odobrenih mastera, Zelena i devet aktivnih kopija ostali su neizmenjeni.

## Usklađivanje paleta sa odobrenim pozadinama

Pregledano je svih devet novih pozadina. Ciljne HEX palete sedam tema i osnovni UI tokeni usklađeni su sa njihovim materijalom i svetlom; Neon Cyber i Severna Maglina već su bili usklađeni. Zelena, zajednički stil, pravci i zaključani PNG masteri nisu menjani. Odgovarajući pregled paleta je `docs/theme-review-board.html`, a izvor istine ostaje `docs/theme-definitions.json`.

Naknadna provera Icon Pack-a je u `docs/theme-icon-pack-palette-audit-2026-10-06.md`. Utvrđena je sličnost aktivnih Vaskršnjih i Pustinjskih dukata sa Zelenim; oni ostaju privremeni runtime asseti, ne odobreni primeri originalnog Icon Pack-a. Novi `iconDna` u definiciji teme zadaje jedinstven oblik, lice dukata i ograničenu paletu za svaki budući paket.
