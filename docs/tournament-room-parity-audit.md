# Turnir — poređenje sobe sa zelenom temom

Datum: 2026-10-10. Status: **Svetlo Zlato, Trula Višnja, Plavi Okean, Neon Cyber, Kraljevski Ametist i Vaskršnja imaju po 14/14 kanonskih uloga; tri teme čekaju obradu, a pregled u pokrenutoj aplikaciji ostaje otvoren**.

## Referenca i zatečeno stanje

Zelena tema ima 14 kanonskih turnirskih PNG uloga: pehar šampiona, srebro finaliste, tri navigaciona simbola, šest simbola stanja i tri takmičarske medalje. Pehar za meni i sobu je jedan identitet. Na početku audita svaka od devet ostalih tema imala je pet PNG datoteka u novom `theme-packs/<theme>/canonical` paketu: pehar za meni, veću izvedenicu istog pehara za sobu i tri turnirske medalje. To je pokrivalo četiri od 14 semantičkih uloga; **deset kanonskih uloga nedostajalo je po temi**.

Svetlo Zlato, Trula Višnja, Plavi Okean, Neon Cyber, Kraljevski Ametist i Vaskršnja imaju svih deset ranije nedostajućih PNG uloga u sopstvenim paketima. Tri stare medalje Svetlog Zlata su dodatno zamenjene jer su prikazivale drugi pehar; nove nose siluetu stvarnog pehara sobe. Postojeće medalje ostalih pet završenih tema već prikazuju karakteristični pehar svoje sobe i zadržane su. Preostale tri teme, Pustinjsko Staklo, Mesečev Sjaj i Severna Maglina, imaju kanonsku ikonu Kostura sa osam učesnika, dok ostale uloge čekaju redovnu obradu. Status `linked` označava proverenu putanju, format i potrošača, ne završnu vizuelnu potvrdu u pokrenutoj aplikaciji.

| Uloga | Zelena | Svaka od devet tema | Ciljna produkciona veličina |
| --- | --- | --- | --- |
| Pehar šampiona | kanonski PNG | kanonski PNG + sobna izvedenica | 384 × 384; sobna izvedenica 512 × 512 iz istog mastera je dozvoljena |
| Srebro finaliste | kanonski PNG | šest tema povezano; tri čekaju | 256 × 256 RGBA |
| Navigacija: info, kostur, slavni | tri kanonska PNG | šest kompletnih tema povezano; Pustinjsko Staklo, Mesečev Sjaj i Severna Maglina imaju kanonski Kostur, ostale uloge čekaju | svaki 256 × 256 RGBA |
| Stanja: prijava, odjava, zaključana prijava, početak, aktivan meč, završen meč | šest kanonskih PNG | šest tema povezano; tri čekaju | svaki 256 × 256 RGBA |
| Turnirske medalje: zlato, srebro, bronza | tri kanonska PNG | Svetlo Zlato: tri nove medalje; ostalih pet završenih tema: postojeće medalje odgovaraju peharu; tri teme čekaju proveru | svaka 256 × 256 RGBA; prikaz u intru 30 CSS px |

Vaskršnja tema sada ima novi kanonski paket za tri taba i šest stanja; stare slike su isključene iz prikaza sobe i iz prethodnog spiska za učitavanje. Pustinjsko Staklo, Mesečev Sjaj i Severna Maglina imaju kanonski Kostur; njihove ostale stare ili opšte turnirske ikone i srebro finaliste čekaju proveru. Stare datoteke se ne smatraju odobrenim kanonskim assetima samo zato što postoje.

## Pravilo ikone Kostura

Svaka ikona Kostura prikazuje **tačno osam početnih takmičara**, četiri levo i četiri desno, kroz četiri para do jednog finala. Provereno je svih deset tema: Zelena, Svetlo Zlato, Trula Višnja, Plavi Okean i Vaskršnja već su prikazivale osam. Neon Cyber je imao šest; Pustinjsko Staklo i Severna Maglina po četiri; Kraljevski Ametist i Mesečev Sjaj nisu imali namenski PNG. Ovih pet tema sada imaju originalne tematske 256 × 256 RGBA ikone sa osam učesnika. Vaskršnji stariji osmočlani Kostur je dodatno zamenjen novim koji prati sadašnju paletu. Stari četvoročlani PNG za Pustinjsko Staklo i dve stare verzije za Severnu Maglinu uklonjeni su nakon prevezivanja potrošača. Ostale uloge u Pustinjskom Staklu, Mesečevom Sjaju i Severnoj Maglini čekaju redovnu obradu.

## Mesta prikaza i geometrija

Novi tematski pehar se već bira za ulaz u Turnir, intro, zaglavlje, prijavni panel, Hall of Fame, kostur i nagradne prikaze kroz `theme-main-room-icons.js`. Izbor teme ne sme promeniti motiv tog pehara. Intro ostaje na zajedničkom okviru `clamp(210px, 34vmin, 290px)` i trajanju iz Green ugovora.

U ovom auditu je ispravljena geometrija devet tema za zaglavlje (42 × 42 CSS px), tri ikone tabova (38 × 38 CSS px) i mesto akcione ikone (38 × 38 CSS px). Pre toga je mapirani pehar u zaglavlju padao na opštu veličinu od 36 px, a SVG tabovi šest tema na 32/34 px. Kostur Turnira sada u svih devet tema preuzima Green raspored redova, razmake, veličine avatara, tipografiju učesnika i visine mečeva na istim responsive pragovima, dok pozadine i okviri ostaju iz palete svake teme. CSS korekcija ne zamenjuje nedostajuće PNG simbole niti potvrđuje vizuelni prikaz u pokrenutoj aplikaciji.

## Kriterijum za završetak Turnira po temi

1. Svih 14 semantičkih uloga ima originalni kanonski PNG identitet odgovarajuće teme i proverene dimenzije/alfu.
2. Isti pehar se vidi u meniju, intru, zaglavlju, prijavi, istoriji, finalu i nagradi. Tehničke veličine mogu biti izvedenice jednog mastera.
3. Svaki tab i svako stanje koristi svoj PNG na svim odgovarajućim mestima; nema aktivnog SVG/emoji ili starog tematskog dvojnika.
4. Raspored, zone dodira, kartice, tipografija, motion, intro i funkcionalna stanja odgovaraju Zelenoj na istom viewportu.
5. Medalje se vizuelno potvrđuju tek kada je pehar kanonski usklađen: zlato, srebro i bronza nose prepoznatljivu siluetu istog turnirskog pehara.

Prva produkciona tema je **Svetlo Zlato**: deset originalnih imagegen mastera i tri nova medaljska mastera sačuvani su u `source-assets/theme-icon-packs/light/tournament-room-v1/`, sa 13 izvedenica od 256 × 256 RGBA u `www/assets/theme-packs/light/canonical/`. Sve putanje, veličine i SHA-256 otisci su u manifestu. Srebrna nagrada finaliste i medalje čuvaju siluetu istog tematskog pehara.

Druga tema je **Trula Višnja**: deset zasebnih mastera u `source-assets/theme-icon-packs/medium/tournament-room-v1/` i deset izvedenica od 256 × 256 RGBA povezani su sa istim ulogama, u sopstvenom Clay jeziku. Njene tri postojeće medalje zadržavaju se jer sadrže isti uvijeni pehar kao soba.

Treća tema je **Plavi Okean**: deset zasebnih mastera u `source-assets/theme-icon-packs/winter/tournament-room-v1/` i deset izvedenica od 256 × 256 RGBA imaju oblike širokog luka, blago suženih ivica i mat plastični materijal iz definicije teme. Srebrni pehar finaliste zadržava ručke i terakota znak šampionskog pehara. Postojeće tri medalje nose istu siluetu pehara. Ikona aktivnog meča prikazuje jednu kockicu sa pet tačaka u rasporedu četiri ugla i sredina.

Četvrta tema je **Neon Cyber**: deset zasebnih mastera u `source-assets/theme-icon-packs/neon/tournament-room-v1/` i deset izvedenica od 256 × 256 RGBA koriste tamnu mat plastiku, zaobljene pravougaone segmente, jedan jasan urez i kontrolisanu cijan ivicu. Srebrni pehar finaliste zadržava segmentirane ručke, cijan obod i mali magenta znak postojećeg pehara; tri medalje već nose istu siluetu. Kockica aktivnog meča ima pet pravilno raspoređenih cijan tačaka. Završeni meč ima 15 CSS px, aktivni 34 px, rezultat 36 px, kao Green.

Peta tema je **Kraljevski Ametist**: deset zasebnih mastera u `source-assets/theme-icon-packs/amethyst/tournament-room-v1/` i deset izvedenica od 256 × 256 RGBA koriste teške glinene lukove i nekoliko širokih faseta u ametist, ljubičastoj i lila paleti, uz minimalan zlatni akcenat. Srebrni finalista zadržava isti uvijeni pehar, štit, zlatni prsten i postolje kao šampion. Tri postojeće medalje već prikazuju taj pehar. Kockica aktivnog meča ima pet tačaka u pravilnom rasporedu.

Šesta tema je **Vaskršnja**: deset zasebnih mastera u `source-assets/theme-icon-packs/easter/tournament-room-v1/` i deset izvedenica od 256 × 256 RGBA koriste kompaktne glatke ovalne forme mat silikona, krem i kadulja paletu i štedljiv terakota akcenat. Srebrni finalista zadržava ovalne ručke i postolje šampionskog pehara; tri postojeće medalje nose isti pehar. Novi Kostur ima osam učesnika, a kockica aktivnog meča pet pravilno raspoređenih tačaka. Prelaz kroz šest kompletnih tema i nazad na Zelenu proverava `scripts/check-tournament-room-packs.js`. Preostale tri teme obrađuju se pojedinačno.
