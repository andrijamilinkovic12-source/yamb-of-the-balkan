# Green UI standardizacija — korak 3: tekst i kontrast

Datum: 2026-09-29. Opseg: samo Zelena tema (`dark` je interni ID). Status: **osnovni tipografski i kontrastni ugovor je poboljšan i testiran; vizuelni prolaz svih stvarnih soba ostaje otvoren**. Nema native builda, commita niti objavljivanja.

## Konkretni nalazi

| Grupa | Pre | Sada | Dokaz / granica |
|---|---|---|---|
| Tekst na opštim Green karticama | Svetli kraj providnog `--green-clay-surface-soft` davao je približno 2,79:1 za osnovni i 2,14:1 za sekundarni tekst preko najsvetlije pozadine. | Površine su neznatno tamnije i gotovo neprovidne; najnepovoljniji parovi imaju približno 5,03:1 i 4,86:1. Pozadina teme, svetli detalji i clay identitet ostaju. | WCAG 4,5:1 regresioni test računa oba kraja oba gradijenta čak i preko bele podloge. Ovo ne meri svaku posebnu karticu sa zasebnom bojom. |
| Iskačuća poruka i modal | Kasna Green CSS pravila već su popravljala naslov i poruku; generičko dugme „Odustani“ je ipak nasleđivalo crven tekst čiji je kontrast na svetlijem Green modalu bio oko 1,5:1. | Green cancel dugme ima tamnozelenu podlogu i svetao tekst; toast/modal naslov i poruka ostaju svetli na tamnijoj zelenoj podlozi. Oba modal dugmeta koriste standardnu veličinu teksta od 14,4 px. | Statički QA prikaz je vizuelno pregledan u browseru, provereni su izračunati CSS stilovi. Stvarni toast u svakoj sobi nije viđen. |
| Hijerarhija fonta | Postoje zajednički Green tokeni za naslov, sekciju, telo i sitan tekst. Sekundarni opis je bio 12,48 px. | Sekundarni opis je 13,12 px. Provereni statički naslovi Podešavanja, Statistike, H2H, Top liste, Pravila, Global chata, Online igrača, Turnira i Riznice koriste Montserrat i zajedničku Green hijerarhiju. | Browser DOM pregled statičkih elemenata; duga imena, dinamički sadržaj i obe lokalizacije zahtevaju zasebno vizuelno ispitivanje. |

Za ponovljiv vizuelni pregled dopunjen je `www/themes/green/qa-preview.html` statičkim toast/modal primerima SR/EN i dugom porukom. Primer ne upisuje rezultate, ne šalje poruke i ne dira nalog. `teme.css` verzija u `www/index.html` je povećana na `6.86`, da novo učitavanje WebView-a dobije nove boje.

## Provera i otvoreno

`npm.cmd test` prolazi, uključujući nove kontrastne asercije u `scripts/check-theme-performance.js`. U lokalnom browseru su potvrđeni stvarno učitani tokeni, tekst, dugmad i prelamanje u QA uzorku. Stara instanca emulatora i dalje nije pouzdan dokaz za novu verziju: vraćala se u prethodno otvoren WebView bez ponovnog učitavanja. Zato T1/T2 nisu označeni kao završeni za svih 18 površina iz mape koraka 1. Pre zatvaranja grupe treba ponovo učitati aplikaciju i proći stvarne sobne poruke, greške, uspehe, dugačka imena i SR/EN na telefonu.
