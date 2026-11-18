# Turnir — poruke u Pošti

Implementacija: 18. novembar 2026. Kod je lokalno pripremljen; objavljivanje nije deo ovog koraka.

| Primaoci | Poruke |
| --- | --- |
| Svi nalozi | Početak turnira i četvrtfinalni parovi |
| Svi nalozi | Jedan zbirni pregled završene četvrtfinalne/polufinalne runde: parovi, stvarni rezultati, tehnički ishodi, diskvalifikacija oba igrača i prolazak dalje |
| Svi nalozi | Potvrđen termin finala i promena potvrđenog termina; predlog nije javna potvrda |
| Svi nalozi | Postojeća objava pobednika, dopunjena protivnikom i rezultatom finala; tehnički rezultat nema izmišljene poene |
| Svi nalozi | Otkazivanje ciklusa ili završetak bez pobednika |
| Pojedinačni učesnik | Potvrda nove prijave i spremnosti, protivnik i rok meča |
| Učesnici konkretnog meča | Predlog i potvrda termina, podsetnici, pobeda/poraz, prolazak dalje, nerešeno i ponavljanje |
| Pogođeni učesnici | Slobodan prolaz, disciplinsko upozorenje/suspenzija, vraćen iznos i eventualni preostali deo kotizacije |
| Pogođeni učesnici | Postojeće obrazložene poruke o diskvalifikaciji, tehničkoj odluci, poništenju i produženju roka; nova obrada ih ne duplira |
| Primalac nagrade | Postojeća potvrda nakon stvarne uplate nagrade |

`lib/tournament-mailbox.js` predstavlja odvojeni prikaz potvrđenog stanja. Pregled na 15 sekundi koristi upisani turnir, pouzdana turnirska obaveštenja i evidenciju prijava; ne dodeljuje rezultat, kaznu, rok ili novac. Greška u dostavi ne zaustavlja meč. Stabilni ID-jevi i potvrde obrade omogućavaju ponovno pokretanje i nastavak nakon delimične greške bez duplikata. Brisanje ili arhiviranje poruke ne stvara novu kopiju. Javni izveštaji ne uključuju privatna obrazloženja, UID-jeve ili podatke o novcu drugih igrača.

Novi sistem potvrde i zakazivanja prenosi postojeće događaje. Staro izdanje bez te politike koristi sačuvano stanje i prati promene rezultata od aktiviranja; raniji rezultati se ne izmišljaju i ne šalju ponovo. Stare potvrde prijave se ne učitavaju masovno. Zatvorene i zastarele pozive ne predstavljamo kao aktuelne zahteve.

Tekst je u `www/tournamentMailCore.js` i menja se prema srpskom/engleskom jeziku aplikacije. Vreme je eksplicitno `Europe/Belgrade`. Podaci i imena prikazuju se kao tekst, bez izvršavanja HTML-a. Liste i detalji svih turnirskih tipova koriste kanonski pehar trenutne teme preko `getCanonicalTournamentTrophySource`, istog rutiranja kao soba Turnir; postojeći PNG fajlovi se ne menjaju.

Provere: `scripts/test-tournament-mailbox.cjs` (pravila i opciona izolovana MongoDB baza), `scripts/test-tournament-mail-warnings.cjs`, `scripts/test-player-mailbox-history.cjs`, `scripts/test-tournament-notifications.cjs`, `scripts/test-tournament-match-audit.cjs`, `scripts/test-tournament-scheduling.cjs` i `scripts/test-tournament-prize-notice.cjs`. Testovi pokrivaju privatne primaoce, javne sažetke, potvrđen/promenjen termin, nedodeljivanje lažnih poena, ponovno slanje, grešku pre i posle upisa, restart, istovremenu obradu i nepromenjene salde/stanje. Browser provera koristi stvarni klijent, deset tema i oba jezika, uz 720 osnovnih rasporeda; ne pristupa stvarnim nalozima.

Širi postojeći `audit-theme-canonical-use.cjs --check` prijavljuje nepodudaranje potrošača `www/managers.js / ducat-particle` i neažurnu mapu. To nije prepravljano u ovom koraku; nova putanja pehara proverava se direktno i dekodira u svih deset tema.

Rezultat završne provere: navedeni funkcionalni testovi prolaze, uključujući istovremenu obradu, prekid posle upisa poruke a pre potvrde obrade, odvojene javne/privatne primaoce, slobodan prolaz, otkazivanje i nove rezultate starog izdanja. Prošlo je svih 720 rasporeda i 20 kombinacija tema/jezika za turnirski PNG u listi i detalju. Finalna objava proverena je za redovan i tehnički rezultat na oba jezika. Probni snimci: `tmp/player-mailbox-review/tournament-neon-inbox.png` i `tournament-neon-detail.png`. Nije bilo produkcionog slanja, commita ili deploya.
