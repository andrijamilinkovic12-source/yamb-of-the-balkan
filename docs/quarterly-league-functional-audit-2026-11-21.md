# Kvartalna liga: funkcionalna provera, 21.11.2026.

**Status posle popravki: granicni slucajevi iz ovog izvestaja prosli su lokalnu regresionu proveru. Promene nisu objavljene na produkciji.**

Za partiju zavrsenu pre ponoci odlucuje kvartal zavrsetka. Ako je upis za prethodni kvartal u toku neposredno pre 06:05 po Beogradu, zakljucavanje ceka taj upis pre izbora pobednika. Ako validan rezultat prvi put dodje nakon zakljucavanja, ostaje u istoriji i redovnoj statistici tacno jednom. Ne ulazi u stari ni novi kvartal, niti u ligaski zbir za sva vremena; medalje i nagrade ostaju nepromenjene.

Provera posle popravki: `scripts/test-quarterly-booking.cjs` proverava ponavljanje upisa, kasnjenje odgovora, promenu naloga i prelazak ponoci. Dodatno pokrenut sa opcijom `--replica` na izolovanom lokalnom MongoDB-u, test je proverio ponistavanje delimicnog upisa, prelazak milion poena, datum izjednacenog skora, istovremeno zakljucavanje i upis, ponovljeni tehnicki ishod i redovnu statistiku kasne partije. Ovo nije test produkcionih naloga niti naknadni obracun istorijskih isplata.

**Prvobitna ocena, pre popravki:** redovna partija prolazi; konacan plasman nije bio pouzdan u svim slucajevima. U nastavku su sacuvani pocetni nalazi.
Proveren je lokalni radni primerak, ne objavljena verzija. Testovi sa dva ili vise igraca koriste izmisljene naloge. Nije citana niti menjana produkciona baza.

## Nalazi koji mogu promeniti plasman ili isplatu

| Prioritet | Uslov i posmatrani rezultat | Gde proveriti | Kriterijum za zatvaranje |
| --- | --- | --- | --- |
| P1 | Obe table regularnog online duela su gotove. Prvi trajni upis rezultata ne uspe. Soba ipak objavi zavrsetak i oznaci partiju kao zavrsenu; test ima 0/2 upisana igraca i nema zapisa iz kog se rezultat moze obnoviti. | `server.js`: `ensureMatchResult`, `applyServerSideCompletedDuel`, `settleCompletedOnlineRoom` | Ne potvrditi konacan upis dok ishod nije trajno sacuvan; ponavljanje istog meca mora upisati oba skora tacno jednom. |
| P1 | Stari kvartal je arhiviran sa A na 1.000.400. Lokalni rezultat D zavrsen u 23:59 stigne u 07:00 po Beogradu. Stara tabela podigne D na 1.000.800, novi kvartal ispravno ostane na 0, ali arhiva i izbor dobitnika ostaju na A. | `server.js`: `submit_match_result` (dozvoljen naknadni prenos), `applyTechnicalLeagueDelta`, `archiveLeagueQuarter`, `check_quarter_reward` | Odrediti jedan rok za plasman i primeniti ga dosledno na tabelu, arhivu i isplatu. Politika za zakasnele rezultate ne sme precutno menjati vec isplacene nagrade. |
| P1 | Za prosli kvartal najpre se poveca red tabele pa se posebno cuva profil sa oznakom obradjene partije. Ako se proces prekine izmedju, pri ponavljanju istih +900 red ide sa 999.900 na 1.001.700 umesto na 1.000.800. | `server.js`: grana `!isCurrentPeriod` u `applyTechnicalLeagueDelta` i pozivioci koji zatim rade `user.save()` | Simulirati prekid posle svake trajne izmene; tabela, profil i istorija moraju dati isti zbir kao jedan uspesan upis. |
| P1 | Server vec vidi obe zavrsene online table u 23:59:59.950. Cekanje na profil od samo 150 ms pomera zabelezeni kraj u 00:00:00.100 narednog kvartala. | `server.js`: `applyServerSideCompletedDuel`, vreme se uzima iza `profileWrites.run` | Jednom zabeleziti trenutak kada server potvrdi poslednji potez, pa isti trenutak koristiti i pri cekanju i pri ponavljanju. |
| P1 | Dva takmicara imaju po 5.000. A je ispred B; posle obicne sinhronizacije profila A padne iza B, bez nove partije. Otvaranje sobe takodje salje zbir, a oba serverska puta osvezavaju datum koji razresava isti skor. Ovo vazi i za mesta koja nose medalju. | `server.js`: `syncCurrentLeagueScoreFromUserProfile`, `submit_league_score`, `fetchTopLeagueScoresForPeriod`; `www/kvartalnaliga.js`: `showModal` | Otvaranje, prijava, osvezavanje slike i ponavljanje potvrde ne smeju promeniti redosled. |

## Pravila i prikaz

- **P2, tehnicki ishod:** pravila na srpskom i engleskom obecavaju da gubitnik gubi isti iznos koji pobednik dobija. Server racuna zasebno iz proseka svakog igraca: u primeru je to +650 i -1.100 kada gubitnik ima dovoljno liga poena. Pre promene ekonomije odluciti da li treba uskladiti tekst ili obracun. Vidi `www/pravilaigre.js` i `server.js: applyServerSideTechnicalResult`.
- **P2, stara strana tabele:** pokrenuti dve ture ucitavanja istog ranga. Posle odgovora nove ture (8.000) zakasneli odgovor stare (7.000) ipak precrta prikaz. Provera serijskog broja gleda stari objekat umesto trenutno aktivne stranice. Ne menja serverski zbir. Vidi `www/kvartalnaliga.js: loadLeaguePage`.
- **P2, promena naloga:** uspesna potvrda za A koja stigne posle prelaska na B ne proverava primaoca. U rezervnom putu reprodukovan je upis 250.000 pod lokalnim kljucem B; glavni put takodje prosledjuje podatke bez `recipientUid` koji bi inace proverio `applyCloudProfileSync`. Ovo nije dokaz promene B u bazi. Vidi `www/kvartalnaliga.js: syncWithServer`.
- Soba dobavlja pocetnu tabelu pri otvaranju i naredne strane pri skrolovanju. Prikaz nije prenos uzivo svih promena ostalih igraca. Licni zbir i rang se iscrtavaju pri otvaranju; nemoj koristiti neosvezen prikaz kao dokaz trajnog upisa.

## Obuhvat i granice dokaza

- Prosli su `npm run check:match-results`, `npm run check:game-modes`, `npm run check:online-duel-finish`, `npm run check:theme-quarterly-league-final` i `npm run check:economy-safety`. To ukljucuje celu solo, lokalnu i nasumicnu online partiju, povezivanje podrzanih tokova rezultata, proglasenje i proveru prethodno nepreuzetih nagrada. Provera povezivanja moda nije isto sto i puna partija sa trajnom bazom za svaki mod. Kod lokalne partije racuna se rezultat prijavljenog naloga, ne svih imena na uredjaju.
- Proveren je prikaz u Chromium-u: 10 tema puta 4 velicine ekrana, navigacija, dugacka imena, medalje i sampioni. Test rasporeda koristi sinteticne liste i ne proverava iznose u bazi.
- Posebno su pozvane funkcije radnog primerka za sve granice rangova, prelaz 999.800 + 600 = 1.000.400, donju granicu 60 - 200 = 0 i reset pri prelasku kvartala po Beogradu. Te provere su prosle.
- Primeri gresaka gore su izolovane simulacije sa kontrolisanim satom, redosledom odgovora i zamenom skladista u memoriji. Nisu izvodjeni prekidi pravog MongoDB procesa niti je utvrdjeno da je bilo koji konkretan takmicar ostecen.
- Za potvrdu popravke treba izvesti iste granicne scenarije na izolovanoj MongoDB bazi sa dva prijavljena klijenta i uporediti zapis partije, profil, tabelu, arhivu i stvarnu promenu novcanika. Jedna uspesna partija na objavljenoj verziji nije zamena za te testove.
