# Green UI standardizacija — korak 9: vizuelni prolaz i regresija

Datum: 2026-09-30. Opseg: postojeći `Pixel_7_Pro` emulator (1440 × 3120), aktuelni lokalni `www` preko `127.0.0.1:3000` i `adb reverse`. Dodatno je privremeno proverena emulirana veličina 1080 × 2100 na istoj gustini (560 dpi) i Android skala fonta 130%; obe postavke su vraćene na 1440 × 3120 i 100%. Lokalni server je pokrenut bez MongoDB veze. Postojeći APK nije ponovo izgrađen niti instaliran. Nema commita ili objavljivanja.

Lokalni server je zaustavljen na kraju pregleda; emulator je ostavljen na glavnom meniju. Proces je prijavio neuspele self-ping DNS pokušaje ka javnom hostu (`ENOTFOUND`), bez potvrđenog odgovora udaljenog servera.

Ovo je **delimični vizuelni prolaz**, ne završni release sertifikat: proverena su stanja koja su bila dostupna bez slanja poruka, poziva, rezultata, trošenja dukata ili završavanja meča. Prikazani profil i liste mogu koristiti ranije sačuvane podatke emulatora; izvor svakog podatka nije dokazivan.

## Potvrđeno na emulatoru

| Površina | Pregledano stanje | Nalaz |
|---|---|---|
| Glavni meni | Top kartice, četiri moda, Riznica/Turnir, donji red | Green motivi, kartice, tipografija i sistemske ivice se vide bez odsecanja. |
| Podešavanja | Profil, avatar, tri prekidača, tema/jezik, pravni linkovi, X | Elementi su unutar panela; avatar i X ne izlaze iz kartice. |
| Dnevni izazov | Početni ekran sa šest polja/kockica | Raspored 3 × 2 je centriran u unutrašnjoj kartici. Izazov nije zaustavljen ni predat. |
| Top lista | Globalna lista i prazna lokalna lista | Redovi, avatari, brojevi i prazno stanje staju u panel; X je dostupan. |
| Statistika / H2H | Metrike, pet kartica rivala, swipe na drugu stranu | Avatari i bedževi su unutar kartica; aktivna pager tačka prati prikazanu stranu. |
| Kvartalna liga | Rang Majstor, sledeći rang, Dvorana slavnih | Pager i tabovi rade. Otkriven i ispravljen horizontalni overflow panela; desna margina je sada vidljiva. |
| Riznica | Trofeji, skrol, početak liste skinova kockica | Kartice i gornje kontrole ostaju u granicama. Naslovi grupa trofeja su bili presvetli preko pejzaža; nakon ispravke su čitljivi. |
| Turnir | Bracket / četvrtfinale | Zaglavlje, tabovi, redovi mečeva i pager ne izlaze iz panela u prikazanom stanju. |
| Online igrači | Profil, još jedan igrač, pretraga i akcione ikone | Google avatar i inicijalni avatar staju u redove. Nije slat poziv niti pokrenut duel. |
| Global chat | Prazno stanje i otvorena Android tastatura | Unos i dugme za slanje ostaju iznad tastature i sistemske navigacije. Nije poslata poruka. |
| Dukati / Ispravi zadnji upis | Saldo, video opcija, stanje tokena | Ikone i tekst imaju čitljiv kontrast. Pri ulasku je prikazan test oglas; zatvoren je, a saldo je ostao 28535. Nagrada i potrošnja nisu testirane. |
| Pravila | Svih šest SR strana, pager nakon animacije | Aktivna tačka odgovara strani; naslovi i motivi odgovaraju sadržaju. Duži tekst ostaje u skrol panelu. |
| Solo / Hotseat | Prazna tabla; Hotseat unos imena i početna tabla | Šest numeričkih redova i šest mesta za kockice staju na ekran. Nema bacanja, upisa ili rezultata. |

## Dopunski prolaz: jezik i manji viewport

| Uslov | Pregledano | Nalaz |
|---|---|---|
| ENG, 1440 × 3120 | Meni, Podešavanja, svih šest strana Pravila, Statistika, H2H, Kvartalna liga i Dvorana slavnih | Naslovi i opisi u pregledanim stanjima staju; pager radi, kartice i avatari ostaju unutar panela. Duži tekst Pravila se skroluje. |
| ENG, privremeni 1080 × 2100 / 560 dpi | Meni, Kvartalna liga i Podešavanja, uključujući skrol do donjih opcija | Otkriveno i ispravljeno odsecanje gornjih menijskih kartica, naslov/rang/bodovi Kvartalne lige i pager preblizu sistemskoj navigaciji. Donji meni i jezik/pravni linkovi Podešavanja dostupni su skrolom. |
| SRB, 1440 × 3120, Android font 130% | Podešavanja | Zaglavlje, profil, prekidači, jezik i pravni linkovi ostaju čitljivi i u panelu. Ovo nije dokaz za sve sobe ni za drugi fizički telefon. |

Pri jednom učitavanju bez dostupne Google fotografije u Podešavanjima se video browserov simbol polomljene slike. Sada se pri grešci koristi inicijal igrača u kružnom okviru; proveren je ciljanim testom za `error`, `load` i odjavu. U ponovljenom vizuelnom prolazu fotografija se učitala, pa vizuelni izgled samog fallbacka na emulatoru nije zasebno potvrđen.

## Ispravke u ovom koraku

1. Green panel Kvartalne lige na mobilnom viewportu sada računa širinu zajedno s levim i desnim safe insetom. Pre ispravke zajednički `left` i Green `width: 100%` potiskivali su desnu ivicu van ekrana. [Pre](../screenshots/green-ui-step9/green-step9-league.png) / [posle](../screenshots/green-ui-step9/green-step9-league-fixed.png).
2. Obični naslovi grupa trofeja u Riznici dobili su tamnozelenu podlogu i svetao tekst; prethodni svetlozeleni tekst se stapao sa svetlim delovima pejzaža. Naslovi kolekcija sa zasebnim stilom nisu menjani. [Pre](../screenshots/green-ui-step9/green-step9-treasury.png) / [posle](../screenshots/green-ui-step9/green-step9-treasury-fixed.png).

3. Gornje kartice menija na viewportu do 360 CSS px sada mogu da se skupe bez skraćivanja iznosa i ranga, sa tipografijom usklađenom tom širini. [Pre](../screenshots/green-ui-step9/green-step9-narrow-menu.png) / [posle](../screenshots/green-ui-step9/green-step9-narrow-menu-fixed.png).
4. Kvartalna liga na istom uskom viewportu ima pun naslov, uspravni raspored ranga/bodova i dodatni razmak do Android navigacije. [Pre](../screenshots/green-ui-step9/green-step9-narrow-league.png) / [posle](../screenshots/green-ui-step9/green-step9-narrow-league-fixed.png).
5. Podešavanja imaju inicijal kao rezervni avatar kada fotografija ne uspe da se učita. Slika se opet prikazuje ako uspešno stigne, a rezervni avatar nestaje pri odjavi.
6. Na uskom ekranu naslov „Protivnik pronađen” više ne ulazi pod X u zaglavlju čekanja. [Pre](../screenshots/green-ui-step9/green-step9-qa-vs-narrow.png) / [posle](../screenshots/green-ui-step9/green-step9-qa-vs-narrow-fixed.png).
7. Na kratkom telefonu sadržaj Solo rezultata se skroluje bez sabijanja statistike i preklapanja dugmadi. [Pre](../screenshots/green-ui-step9/green-step9-qa-solo-narrow.png) / [posle, donji deo](../screenshots/green-ui-step9/green-step9-qa-solo-narrow-bottom.png).
8. Plavi emoji na dugmetu „Revanš” uklonjen je samo iz Green prevoda; srpski/engleski tekst i druge teme zadržavaju svoje oznake. [Pre](../screenshots/green-ui-step9/green-step9-qa-online-result-narrow.png) / [posle](../screenshots/green-ui-step9/green-step9-qa-online-result-narrow-fixed.png).

CSS promene menija, Riznice, Kvartalne lige, čekanja i rezultata su ograničene na Green selektor; avatar fallback je zajednički jer ista profilna slika služi svim temama. `npm test`, ciljani test fallbacka, ciljani SR/ENG prevod „Revanš” za Green i Uskrs, i `git diff --check` prolaze.

## Izolovani pregled teško dostupnih stanja

Dodato je [lokalno QA ogledalo](../www/themes/green/qa-runtime.html) koje parsira postojeći `index.html`, preuzima stvarne DOM ekrane i CSS, a ne izvršava aplikacione skripte. Sintetički podaci su samo primeri; ne postoji prijava, socket, meč, upis, nagrada ni izmena salda. To je pregled **rasporeda**, ne test online logike. Na privremeno suženom emulatoru pregledani su: [traženje protivnika](../screenshots/green-ui-step9/green-step9-qa-search.png), [VS sa dugim imenom](../screenshots/green-ui-step9/green-step9-qa-vs-narrow-fixed.png), [poziv prijatelja](../screenshots/green-ui-step9/green-step9-qa-invite-narrow.png), [Solo rezultat](../screenshots/green-ui-step9/green-step9-qa-solo-narrow-fixed.png), [online rezultat](../screenshots/green-ui-step9/green-step9-qa-online-result-narrow-fixed.png) i [poruka o nedovoljno dukata](../screenshots/green-ui-step9/green-step9-qa-insufficient-narrow.png). Poruka je čitljiva, a osnovne kartice i kontrole ostaju unutar ekrana. QA ogledalo ne prikazuje punu listu prijatelja niti potvrđuje stvarni tok poziva.

## Šta ostaje otvoreno pre zatvaranja koraka 9

- ENG i uski/kratki viewport su pregledani samo u gore navedenim sobama, ne u svim ekranima i stanjima. Android font 130% je pregledan u Podešavanjima, ne u svakoj sobi.
- Nisu pregledana sva stanja svih soba: rezultati i nagrade Dnevnog izazova, svi tabovi Riznice i Turnira, zaključana funkcionalna stanja, sve vrste toasta/potvrda/grešaka i sve varijante završnih ekrana. Neka od ovih stanja pokrivena su samo izolovanim vizuelnim ogledalom.
- Online random i Pozovi prijatelja nisu stvarno pokretani da se ne uspostavi meč ili poziv. Njihov VS ekran i rezultat su vizuelno pregledani sa sintetičkim podacima; povezivanje, ponovna konekcija, stvarni rezultati i puni tok poziva i dalje traže kontrolisanu bazu i dva test naloga.
- Native build i vizuelna regresija na još jednom telefonu nisu rađeni po prethodnom dogovoru. Automatski testovi ne zamenjuju te provere.
- `qa-runtime.html` je privremena statička vizuelna alatka unutar `www`; pre budućeg produkcionog builda treba je ukloniti iz isporučenog paketa ili premestiti u lokalnu QA infrastrukturu.

Sačuvani su samo ključni dokazni snimci u `screenshots/green-ui-step9/`; 32 prolazna snimka nastala tokom navigacije uklonjena su iz korena radne kopije.
