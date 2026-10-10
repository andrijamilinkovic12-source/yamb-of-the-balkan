# Četiri taba Riznice — specifikacija ImageGen poziva

Ugrađeni ImageGen je pozvan zasebno za svaki od 36 novih PNG asseta. Svaki poziv je tražio izolovanu ikonu na zaista providnoj kvadratnoj pozadini, bez teksta i okvira, čitljivu na 34 CSS px. Zajednički stil je 3D Soft Neomorphism. Pravac, materijal, paleta i silueta preuzeti su iz `docs/theme-definitions.json`; bez metalnog sjaja, realizma, kiča, sitnih ornamenata, kopiranja ili prostog bojenja ikona druge teme.

Za tab Kockice svaki poziv je tražio pravilnu fizičku kockicu sa tačno tri vidljive strane: prednja **pet** (četiri ugla i sredina), gornja **jedan** (sredina), bočna **tri** (dijagonala). Vizuelni pregled tih rasporeda je deo završne kontrole; izlaz generativnog alata nije formalna geometrijska garancija.

| Tema | Pravac i paleta | Trofeji | Kockice | Efekti | Teme |
|---|---|---|---|---|---|
| Svetlo Zlato | mat silikon; med, slonovača, maslinasti akcenat | široka spljoštena posuda sa mirnim kosim rezom | glatka krem kockica | tri široka uzlazna talasa | dve mat pločice sa kosim uglom |
| Trula Višnja | Clay; bordo, bleda glina, kajsija | asimetrična vajana posuda sa širokom udubinom | ručno vajana bordo kockica | široka dvostruka glinena spirala | tri preklopljene glinene pločice |
| Plavi Okean | mat silikon; duboka plava, slonovača, terakota | nizak pehar sa obalnim lukovima | plava kockica sa čistim lukom ivice | dva široka zakrivljena poteza | dve preklopljene lučne ploče |
| Neon Cyber | mat plastika; tamnoplava, jedan cijan rub, malo magente | kompaktan segmentiran pehar sa jednim urezom | tamna kockica sa cijan tačkama | jedan kontrolisan prekinuti impulsni luk | dve zaobljene panel ploče sa urezom |
| Kraljevski Ametist | Clay; ljubičasta, bleda lavanda, malo okera | težak pehar sa širokim fasetama | glinena kockica sa dve mirne fasete | jedan presavijeni glineni luk | dve šestostrane glinene ploče |
| Vaskršnja | mat silikon; žalfija, slonovača, tamnozelena | kompaktan ovalni pehar sa jednim listastim zasekom | glatka žalfija kockica | dva ovalna poteza | dve ovalno zaobljene pločice |
| Pustinjsko Staklo | Clay; pesak, slonovača, braon, malo plavosive | pehar iz širokih horizontalnih slojeva | slojevita peščana kockica | jedna uzlazna široka glinena traka | dve slojevite glinene ploče |
| Mesečev Sjaj | Clay; grafit, bledo siva, ugalj | nizak pehar sa širokom konkavnom ivicom | grafitna kockica sa bledim tačkama | nizak konkavni potez sa svetlim umetkom | dve konkavne reljefne ploče |
| Severna Maglina | mat silikon; tamnoplava, ledenobela, prigušeni cijan | neprekidno obli pehar sa ledenim završetkom | plava kockica sa ledenim tačkama | jedna široka savijena traka | dve meko sužene ploče |

Izvorni ImageGen izlazi su po temi u `source-assets/theme-icon-packs/<tema>/treasury-tabs-v3/tab-*-generated.png`. `scripts/import-theme-treasury-tabs-v3.py` čuva 768 × 768 master, izvodi 256 × 256 RGBA produkcioni PNG i pregled na 112/34 px. Zelena nije menjana.
