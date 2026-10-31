# Lokalna dijagnostika učitavanja — v6.42

**Dopuna31.10:** v6.42je objavljena/potvrđena. [Native zapis](../postdeploy642-2026-10-31/index.html) pokazuje prvih6+6sisteklihpre završetka poslednjegEasterPNG-a18052ms. Lokalna6.43ispravlja prerano odustajanje jednim dužimretry-em; nije još objavljena. Collector sada koristi isti trenutniQAPIDi tačanprefiks prekoinfo-tagova, jer početniCapacitor/Consolefilter nije pronalazio događaje na ovomWebView-u. Donji tekst čuva originalnu pripremu.

Status: lokalno, bez commita ili deploya. Poslednja potvrđena javna verzija ostaje v6.41/429cec22. Ovo je priprema za utvrđivanje uzroka prvog neuspešnog izbora Vaskršnje teme i sporog pokretanja; nije potvrda da su ti problemi popravljeni.

## Šta je promenjeno

`www/theme-loading-diagnostics.js` uključuje se isključivo na hostu `yamb-reconnect-qa.onrender.com`. Beleži javnu PNG putanju bez query/hash dela, potrošača (`theme-preloader` ili `settings`), čekanje `onload` događaja, dekodiranje, ukupno vreme, grešku, istek roka i konačnu spremnost. Posebno se vidi kada PNG stigne posle isteka roka i posluži ponovnom pokušaju.

Kružni memorijski zapis ograničen je na 200 događaja. Samo završni sažeci i isteci rokova idu u konzolu sa prefiksom `[YAMB_THEME_LOAD]`. Produkcioni host nema aktivan recorder. Nema dodatnog slanja telemetrije, podataka naloga, imena, tokena, tekstova grešaka ili rezultata partije.

Pozivi su dodati u postojeći deljeni preloader i pripremu Podešavanja. Rokovi, retry, LRU, čuvanje prethodne teme pri neuspehu i zaštite od zastarelog izbora/naloga ostaju isti. PNG crteži, putanje, dimenzije, palete i funkcije igre nisu menjani. Cache reference: game.js6.42, Settings5, diagnostics1.

## Izolovane provere

- `test-theme-loading-diagnostics.cjs`: QA host ograničenje, skrivanje query/hash podataka, ograničen buffer, čekanje slike naspram dekodiranja, timeout, deljen retry, greška, decode fallback i izvoz samo dozvoljenih polja. PASS.
- `test-theme-diagnostics-browser.cjs`: stvarne metode i PNG za meni/Podešavanja, 10 tema × 28 spremnih PNG; bez greške/timeout/fallback, 200 zadržanih zapisa. Edge411×891; QA origin u testu potpuno presretnut i poslužen iz lokalnih fajlova. Nema poziva pravom QA serveru ili naloga. [Rezultat](report.json).
- Preload cache, retention, decode gate, Settings switch/retry, in-game readiness i izolacija izbora po nalogu: PASS.
- Stvarni lokalni PNG/menu retention, 10 tema: povratak Green ponovo pripremi 18 izbačenih slika, 0 nedostaje; odmah ponovljen izbor 0 novih Image objekata. PASS.
- Skrivene header/Settings kontrole i tri sobna kontrolera: 0 automatskih PNG zahteva pri startu i skrivenim promenama; 10 vidljivih tema i 40 sobnih slučajeva. PASS.

Sandbox nije uspeo da pokrene Edge. Isti izolovani testovi uspešno su ponovljeni van sandboxa. To nije Android rezultat.

## Veličine paketa i PNG eksperiment

Popis stvarnih metoda/putanja pokazuje Vaskršnja meni+Podešavanja paket od 4.604.051 B, od toga pozadina 1.849.355 B. Zbir uključuje 18 menu i 10 Settings izvora; nije meren mrežni transfer, kompresija HTTP odgovora ili vreme prikaza. Sve teme su u [izveštaju](report.json).

Četiri Easter PNG-a probno su kompresovana samo u memoriji, sa eksplicitnim `palette:false`. Dekodirani RGBA ostaje identičan. Pozadina može biti manja za 74.743 B, daily ikona za 57.161 B, Settings room za 88.402 B; sound je veći za 38 B. **Ništa od toga nije primenjeno.** Sama ušteda ne dokazuje uzrok native zastoja; nije menjana rezolucija ili izgled.

## Sledeća native provera posle objave

1. Potvrditi javne reference game6.42/Settings5/diagnostics1 na QA i njihov sadržaj. Produkcija ostaje bez aktivnog recordera čak i ako dobije iste fajlove.
2. Na postojećem QA nalogu otvoriti Podešavanja, zabeležiti prvi i ponovljeni izbor Vaskršnje i povratak prethodne teme; bez nove igre, oglasa ili nagrade. Ne brisati keš/podatke.
3. `node scripts/collect-qa-theme-loading.cjs emulator-5556` čita samo trenutni proces `com.yamb.balkan.staging`, logcat tag `Capacitor/Console` i namenski prefiks. U `tmp/qa-theme-loading` čuva samo validirane PNG sažetke, nikada sirovi logcat. Skripta je lokalno proverena sintetičkim zapisima; na uređaju još nije pokrenuta. Android Console mora biti uključen u QA debug APK-u; prazan zapis nije dokaz da nije bilo zastoja.
4. Uporediti istek roka sa kasnijim `ready`: `waiting-load` uključuje raspoređivanje zahteva, dostupnost slike i čekanje JS događaja; nije sama po sebi dokaz sporog servera. `decode` pokazuje čekanje decode promise-a. Vremena uključuju opterećenje JS-a i malu cenu QA praćenja, pa ne dokazuju uzrok Android ANR-a.

U ovom nastavku nema novih emulator radnji. Ne tvrdi se nova native provera deset tema, fizičkog S25, aktivnih skinova ili nagrada.
