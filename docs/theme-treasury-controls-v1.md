# Kontrole Riznice — DNK revizija 4 statusa

## Statusne ikone, revizija 4

Svih devet nezelenih tema ima po četiri **posebno ilustrovana** transparentna PNG statusa: Kupljeno, Aktivno, Zaključano i Nedovoljno dukata. Ovo zamenjuje proceduralne statusne oblike iz revizije 2. Svaka serija koristi oblik, materijal i paletu svoje teme; značenje statusa ostaje isto u svih deset tema. Nema prebojavanih kopija niti dekoracije koja skriva oznaku. Zelena ostaje referenca i nije menjana.

Za svaki status čuvaju se izvorni ImageGen PNG u `source-assets/theme-icon-packs/<tema>/treasury-status-v4/`, master 768 × 768 u `treasury-controls-v1/` i produkcioni 256 × 256 PNG u `www/assets/theme-packs/<tema>/canonical/treasury-controls/`. Prikaz je i dalje 22 CSS px, odnosno 20 CSS px za katanac. [Pregled devet paketa](theme-treasury-status-v4-review.html) prikazuje i uvećan i stvarni prikaz; korisnički vizuelni izbor čeka se. Učitavanje koristi postojeći kanonski resolver i keš ključ v4 za nove statuse.

## Ispravka tabova, revizija 3

Prethodna revizija jeste čuvala četiri taba kao PNG fajlove u svakoj temi, ali tri taba su bila umanjeni motivi postojećih asseta, a četvrti proceduralno nacrtan. To nije zasebno kreiran tab paket. Svih devet nezelenih tema sada imaju po četiri namenski ilustrovana transparentna PNG taba u svom stilu, pravcu i paleti: ukupno 36 novih ilustracija. Svaki tab ima izvorni generisani PNG u `source-assets/theme-icon-packs/<tema>/treasury-tabs-v3/`, master 768 × 768 u `treasury-controls-v1/` i produkcioni 256 × 256 PNG u `www/assets/theme-packs/<tema>/canonical/treasury-controls/`. Prikaz ostaje 34 CSS px u svim temama. [Pregled devet paketa na 112 i 34 px](theme-treasury-tabs-v3-review.html) čeka korisnički vizuelni izbor.

Revizija 3 menja samo četiri taba. [Specifikacija svih 36 ImageGen poziva](theme-treasury-tabs-v3-prompts.md) beleži motive po temama. Revizija 4 menja preostala četiri statusa. Zelena ostaje referenca.

Osam semantičkih uloga postoji u svakoj od deset tema: tabovi Trofeji, Kockice, Efekti i Teme; statusi Kupljeno, Aktivno, Zaključano i Nedovoljno dukata. Osam postojećih kontrola Zelene ostaje referenca. U ostalih devet tema zamenjena su 72 PNG-a jer je v1 imao previše zajedničke geometrije.

U reviziji 2 svaki produkcioni PNG je bio 256 × 256 RGBA, a master 768 × 768. Prva tri taba su koristila postojeći kanonski motiv **iste teme**, četvrti i statusi su nacrtani; ta metoda je povučena za četiri taba u devet tema. Veličine prikaza i dalje su kao u Zelenoj: tab 34 px, status 22 px, katanac 20 px; kartice i dugmad nisu menjani.

`getThemeTreasuryControlSource(role, theme)` u `www/config.js` daje jedinu kanonsku putanju. Četiri taba u `www/index.html` se menjaju istovremeno sa temom, statusi u `www/managers.js` koriste isti resolver, a tabovi pomenuti u Pravilima koriste isti PNG. Izbor sobe unapred učitava komplet kontrola. Izvorni masteri i manifesti su u `source-assets/theme-icon-packs/<tema>/treasury-controls-v1/`, a produkcioni fajlovi u `www/assets/theme-packs/<tema>/canonical/treasury-controls/`.

[Pregled svih deset tema](theme-treasury-controls-review.html) prikazuje svih osam kontrola; [pregled tabova](theme-treasury-tabs-v3-review.html) prikazuje stvarnih 34 px, a [pregled statusa](theme-treasury-status-v4-review.html) 22/20 px. `node scripts/check-theme-treasury-controls.js` proverava 80 jedinstvenih PNG-ova, format, katalog, mastere, generisane izvore i povezivanje. Izvori obe revizije su ugrađeni ImageGen sa po jednim pozivom za svaki asset; `scripts/import-theme-treasury-tabs-v3.py` i `scripts/import-theme-treasury-status-v4.py` pripremaju standardne dimenzije. [Android qaLocal izveštaj za tabove](qa-treasury-tabs-v3-emulator-2026-10-10.json) potvrđuje njihovo učitavanje na 34 px, a [izveštaj za statuse](qa-treasury-status-v4-emulator-2026-10-10.json) potvrđuje dekodiranje četiri izvora u deset tema na 22/20 px i prirodni prikaz Kupljeno/Aktivno/Zaključano u sobi. Nedovoljno dukata je provereno kao izvor i dimenzija, a ne izazivanjem kupovine. Korisnički vizuelni izbor još nije zabeležen.
