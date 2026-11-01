# Izolovano PNG merenje — završeni prolazi i oporavak emulatora

Status: korisnik je završio Chrome početni korak, merenje je izvršeno. [Tabela, native kadrovi i granice](index.html), [JSON](report.json). Prethodni [neuspešan prviEaster na6.43](../postdeploy643-2026-10-31/index.html) ostaje istorijski dokaz.

| Pojedinačni uslov | Spremno | Ukupno |
| --- | --- | --- |
| Desktop lokalno, validacija | 28/28 | 0,247 s |
| Android lokalno, dva AVD-a/prvo Chrome pokretanje | 27/28, Chrome ANR | 60,411 s |
| Android lokalno, jedan AVD pre hladnog starta | 28/28 | 40,076 s |
| Android lokalno posle hladnog starta/foreground-a | 28/28 | 3,076 s |
| Android QA, prvi izmereni prolaz posle oporavka | 28/28 | 24,815 s |
| Desktop QA, svež browser | 28/28 | 0,569 s |
| Android QA, ponovljeni prolaz | 28/28 | 0,364 s |

Nezavisni lokalni Chrome takođe je zastajao bez koda igre i bez Rendera. To osporava pripisivanje svih zastoja samo aplikaciji/serveru. Hladni start, smanjen broj AVD-a, foreground i stanje keša nisu odvojeno kontrolisani faktori, pa ne proglašavamo jedan od njih dokazanim uzrokom. Kod oporavljenog QA mrežnog prolaza maxload24,706s/maxdecode0,189s/maxlag19,1ms/0longtask: uglavnom čekanje preonload, ne čisto CPU dekodiranje. Cross-origin transferSize0nije dokaz cachehita.

**Stvarna QAaplikacija posle oporavka:** jedanGreen->Easterodabir uspešan,28PNGreadydo1967ms,0timeout. Nije ukupno vreme promene/animacije; postojećiWebViewkešsačuvan. Nema nove runtime izmene i nema potvrde da je hladno preuzimanje ili fizičkiS25popravljen. QAapp vraćenaGreenmeni/saldo12168;prviAVDvraćen,obaADBuređajapovezana/bootcomplete. Chromezatvoren;oba privremena servera završila saexit0.

`scripts/serve-android-png-probe.cjs` služi isti Easter paket18menu+10Settings PNG (4.604.051 B). Dva režima: lokalni PNG sa host računara, zatim iste javne PNG putanje sa QA. Ne pokreće igru, nalog, Socket.IO ili privatni API. QA slike koriste CORS anonymous/referrer-policy no-referrer; merna JSON polja šalju se samo lokalnom serveru. Prate se onload/decode trajanje,60s granica, raspoloživi resource timing, event-loop kašnjenje i longtask maksimum. Chrome je zaseban proces: rezultat neće biti direktan dokaz uzroka u WebView-u igre.

Server sluša samo127.0.0.1, dozvoljava28unapred definisanihPNGputanja i lokalni schema-filtered rezultat. Sam se gasi posle12min ili na stdin `stop`. Android pristupa preko10.0.2.2. Ne služi proizvoljne repo fajlove i ne čuva sirove logove, naloge ili auth podatke. Za novi pokušaj proveriti da server još radi; ako ne, pokrenuti ga ponovo i koristiti novi port iz izlaza.

`scripts/test-android-png-probe.cjs` je u novom Edge kontekstu proverio28stvarnih lokalnihPNG, čuvanje rezultata, odbijanje proizvoljnih fajlova/stranogOrigin/lošeJSONšeme i izbacivanje dodatnih polja: PASS. Jedan desktop rezultat246,8ms/maxlag87,8ms je samo validacija fixture-a, **nije Android ili aplikaciono merenje**. Izvorni rezultat je u `tmp/android-png-isolation-2026-10-31/desktop-local-1793466901892.json`.

## Istorijski ručni korak pre merenja

Oba emulatora povezana. Drugi5556potvrđenGreenmeni/saldo12168, bez aktivne partije. Samo QAaplikacija force-stopovana da ne opterećuje izolovano merenje. Otvoren postojećiChrome sa lokalnim URL-om; Chrome je pokazao prvi ekran za izbor/prijavu naloga. Nije pritisnuto Continue as, nije izvršena prijava ili promena privatnosti. Korisniku je ostavljen ručni korak **Use without an account**. Taj screenshot sadrži podatke naloga i ne uključuje se u javnu evidenciju. Prvi emulator nije menjan.

Pozvano uputstvo `computer-use/.../docs/guidance.md`: “Do not automate user authentication dialogs.” Korisnik je potvrdio da je test otvoren. Nije automatizovana prijava i to nije odobrenje za igru, nagradu ili reklamu.

## Metod i granice

Mereni su local/QA/ponovljeniQA režimi sa istim28slikama. Lokalni server koristi no-store; potpuni lokalni prolazi imaju4.612.451BresourceTransferuzHTTPzaglavlja, pa nisu samo ponovno otvaranje ranije dekodiranogDOM-a. QA CORS metrika nemaTAOdetalje. Posle dvaChromeANR-a privremeno zatvoren neaktivni prviAVD(Androidhome), zatim hladno startovanisti drugiAVD sa-no-snapshot-load/-no-boot-anim,bezbrisanjapodataka/GPU/rezolucija. Foregroundaktiviran. Prvi neuspešni intermediateQA pokušaj nije imao sačuvan rezultat, lokalni serveristekao; ne računa se kao merenje QAputanje.

Dalje uporediti prvo/ponovljeno preuzimanje na fizičkomS25i stabilnomQAokruženju. Prioritet vidljivihSettingsnaspramskrivenihmenu/roompotrošača treba izmeriti pre runtimeizmene. Hladno učitavanje i raniji appANR ne zatvarati samo ovim oporavkom emulatora.

Nema nove appverzije, PNG crteža, CSS/dimenzija, paleta, game/economy pravila ili deploya u ovoj pripremi. Dodatni statički pregled pokazuje skrivene Treasury/quarterly/ducat potrošače kao kandidate za dalje merenje; nisu proglašeni uzrokom37s niti menjani bez dokaza.
