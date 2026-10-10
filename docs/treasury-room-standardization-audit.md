# Riznica — standardizacija sobe, faze 1 i 2

Datum: 2026-10-10. Zelena je geometrijska referenca, a provera obuhvata svih deset tema.

## Povezano

- Zaglavlje koristi kanonsku PNG ikonu Riznice odgovarajuce teme; stari `treasury-icon.svg` je uklonjen iz zaglavlja i Green preloada.
- Svaka kartica u tabu **Teme** prikazuje vec prihvacenu PNG pozadinu te teme, ukljucujuci Zelenu. To je isti fajl koji se koristi za samu temu, pa se ne uvodi drugi vizuelni identitet ni novi obavezni katalog slot.
- Deset PNG prikaza tema dele meru 72 × 96 CSS px; zaglavlje 46 × 46 px, odnosno 42 × 42 px na uzem ekranu. Kartice imaju Green minimum 180 px, padding 12 px i radius 20 px. Mreza je dve kolone na telefonu i cetiri na sirokom ekranu.
- Ulaz u Riznicu vise ne ucitava svih 26 trofeja i 14 prikaza efekata unapred. Zagrevanje trofeja ograniceno je na prve cetiri kartice, a ostali prikazi se ucitavaju kada se njihov tab prikaze.

## Status postojecih celina

- Trofeji dostignuca: 26 PNG po temi, povezani u Riznici i ponovljenim prikazima; korisnicki vizuelni izbor nije zabelezen.
- Skinovi: 48 zajednickih PNG, od kojih je 10 vezano za teme. Postojece pravilo besplatnog otkljucavanja uz vlasnistvo teme je sacuvano.
- Kontrole Riznice: osam PNG po temi je tehnicki povezano; prema `theme-progress.json` vizuelni DNK trazi doradu.
- Ispravka posle pregleda: četiri taba nisu bila namenski kreirana za svaku temu. Sada svih devet nezelenih tema ima po četiri zasebno ilustrovana PNG taba (v3), sa pregledom na 34 px. Novi Android qaLocal build potvrdio je sva četiri taba i oznaku aktivne kategorije u svih deset tema; nema zastarelih putanja u tim prikazima. Četiri statusne ikone po temi su posebna naredna vizuelna provera; tabovi čekaju korisnički izbor.
- Prikazi efekata: kanonski PNG postoje, ali vizuelni DNK i potpuna pokrivenost prikaza cekaju doradu.
- Medalje: motivi takmicenja i rangova cekaju zavrsno usaglasavanje sa kanonskim identitetima soba.

## Android provera sva cetiri taba

- Lokalni `qaLocal` APK je napravljen od aktuelnog `www` i pregledan na emulatoru 411 × 891 CSS px. [Zavrsni masinski izvestaj](qa-treasury-room-all-themes-final-emulator-2026-10-10.json) sadrzi deset tema i 40 kombinacija tema/taba; [vizuelni pregled](treasury-room-final-qa-review.html) prikazuje svih deset tema. Kartice imaju najmanje 180 px, padding 12 px i radius 20 px u svakoj kombinaciji.
- U svakoj temi prikazano je 26 trofeja, 42 trenutno dostupna skina, 16 efekata i 10 tema. Ostalih sest tematskih poklon skinova se ne prikazuje dok odgovarajuce teme nisu posedovane, prema pravilu kataloga.
- Sve vidljive slike u proveravanim delovima ekrana su ucitane. Svaka kategorija sada ima tematsku PNG oznaku iz kanonskih kontrola te teme, bez generickog emoji simbola. Zakljucani trofeji nisu izbledeli niti pretvoreni u sive kartice. Sve kartice tema prikazuju prihvacene pozadine u okviru 72 × 96 px.
- Vizuelni pregled na emulatoru pokazao je slab kontrast opisa u Neon Cyberu i genericki zeleni ton akcija. Sekundarni tekst i akcije u devet tema sada koriste njihove palete; dupli simbol potvrde u stanju „Kupljeno” je uklonjen. Zastareli opisi u katalogu (fotorealistican Mesec, staklasti detalji Pustinjskog Stakla i slicno) uskladjeni su sa definisanim pravcima.
- U uzak prikaz stanja dukata uveden je manji razmak do ikone. Veliki iznosi dobijaju kratak prikaz (K/M), a pun iznos ostaje u `title` i pristupacnoj oznaci.
- Neon Cyber i Zelena su naknadno izmereni na emulatoru: broj `1000` vise ne prelazi sirinu namenjenu tekstu. Snimak samog Android uredjaja otkrio je dve prazne Green oznake dukata (stanje i +500), jer njihove slike nisu imale `src`; povezani su postojeci kanonski PNG fajlovi. QA provera sada izricito proverava njihovo ucitavanje.

## Provere i preostalo

- Prosli su `npm run check:js`, `node scripts/check-universal-dice-skins.js`, `node scripts/check-theme-treasury-controls.js` i `node scripts/check-theme-design-spec.js`.
- Prosli su i `node scripts/check-theme-dice-entitlements.js` i `npm run check:trophies`. `npm run check:theme-performance` trenutno pada na staroj proveri koja ocekuje posebnu Vaskrs granu za uklanjanje teksta iz intra, dok je aktuelno pravilo za svih deset tema intro samo sa ikonom. Skripta nije menjana u ovoj fazi.
- Android QA potvrdjuje prikaz i osnovna stanja; stvarna isplata reklama i server kupovina nisu izvrsene na nalogu u ovoj fazi. Logika cena, poklon skinova, skrivenih skinova i otkljucavanja je proverena kroz `check-theme-dice-entitlements.js`.
- Zatim sledi vizuelna dorada 8 kontrola i 14 prikaza efekata po temi, pa medalje kada kanonski identiteti soba budu zakljuceni. Status sobe ostaje `defined` dok taj posao nije zavrsen i vizuelno odobren.
