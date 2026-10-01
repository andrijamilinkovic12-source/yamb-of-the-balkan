# Green Pack — završna kontrola pre builda (2026-10-01)

Ovo je stanje lokalne radne kopije, **ne potvrda da je tema spremna za objavljivanje**. Polazna matrica je [korak 1](green-ui-standardization-step-1-map.md); konkretni emulator/izolovani nalazi su u [koraku 9](green-ui-standardization-step-9-visual-regression.md) i [mapi prijavljenih problema](green-ui-reported-issues-map-2026-09-30.md). „Prošlo u kodu” i „prikazano u izolovanom Chrome-u” nisu isto što i verifikacija produkcionog Android WebView-a.

| Grupa | Dokazano lokalno | Još nije zatvoreno |
|---|---|---|
| T1 — tekst | Green hijerarhija i kontrastni tokeni imaju regresione provere; SR/EN i 130% font pregledani su u reprezentativnim sobama. | Sva stvarna stanja svih soba, duga imena i oba jezika u produkcionom WebView-u. |
| T2 — toast/modal | Četiri česte poruke, duga poruka i odabrani modali pregledani su izolovano; Green kontrast ima kodnu proveru. | Svaka stvarna greška/potvrda/nagrada tokom upotrebe. |
| G1 — kartice | Standardni paneli mereni su u CSS-u; Turnir, Riznica, Liga i više drugih soba pregledani su na emulatoru ili u QA ogledalu. | Sve varijante sadržaja i duge server-liste u aktivnim sobama. |
| G2 — dugmad i X | Zajednička Green geometrija X je izmerena, a više X i akcija vizuelno pregledano. | Dodir i enabled/disabled stanje svakog kontrolnog dugmeta u svim sobama. |
| P1 — containment | Kockice Dnevnog izazova, avatari i kartice prijatelja te bracket sa sintetičkim podacima provereni su na mobilnom prikazu. | Stvarni avatari, ekstremno duga imena i puni rezultati svih modova. |
| S1 — safe area | Uski/kratki ekran, gesture/3-button primeri, tastatura u chatu i ligaški pager imaju ciljane nalaze. | Potpuna matrica svih soba sa tastaturom, reklamom i sistemskim insetima na produkcionom WebView-u i drugom telefonu. |
| N1 — pager/swipe | Pravila, Statistika/H2H, Liga i Turnir imaju kodne i ciljane dodirne provere; Turnir je pregledan u tri faze izolovano. | Svi prelazi prstom u aktivnim sobama, uključujući povratni gest i dugačak vertikalni sadržaj. |
| A1 — motivi/izolacija | Green coverage i performance testovi prolaze; 14 Green preview motiva i 16 živih efekata imaju izolovane provere; prelazi/prekidi ne ostavljaju FX resurse. | Vizuelni pregled svake dinamičke grane u produkcionom WebView-u i potvrda da nijedan stari fallback ne proviruje. |
| Q1 — stanja/pristupačnost | SR/EN oznake, status/alert grane, fokus i reduced-motion imaju kodne provere; deo loading/empty/error/locked stanja je prikazan izolovano. | Stvarni server odgovori, svaka transakcija/zaključavanje, tastaturna navigacija i čitač ekrana u aktivnoj aplikaciji. |

## Dodatne granice i sledeća vrata

- Asset paket se lokalno proverava: Green startup je 17 PNG / 4,56 MB, a 11 projektnih `node` provera u ovom prolazu prošlo je uspešno. `npm test` prečica na ovom računaru pokazuje na nepostojeći lokalni `npm-cli.js`; provere su izvršene direktno. `git diff --check` i sintaksa tri QA CDP skripte prolaze.
- Šest reprezentativnih efekata profilisano je u headless Android Chrome-u; njegov broj frejmova varira i u mirovanju, pa **nema pouzdane FPS tvrdnje**. JS heap/DOM i čišćenje efekata u izolovanom uzorku nisu pokazali trajne FX resurse.
- Stvarni online tok nije izvođen: lokalni `MONGO_URI` nije označen kao staging, a dva namenski izolovana test naloga nisu potvrđena. Ne koristiti postojeću bazu i naloge za probni matchmaking, nagrade, kupovinu ili upis rezultata.
- Nije rađen novi native build, instalacija, commit ili objavljivanje. Postojeći snimci iz QA ogledala ne dokazuju izgled najnovijih izmena u isporučenom APK-u.

Pre konačnog zatvaranja koraka 9 potrebni su: **(1)** kada build bude odobren, nova instalacija i vizuelni prolaz Green sobe-po-sobe u produkcionom WebView-u (SR/EN, uski/kratki ekran, 130% font, gesture/3-button), uključujući merenje FPS-a; **(2)** potvrđen izolovan online server/baza i dva test naloga za stvarni matchmaking, poziv, reconnect, turnir, rang, nagrade i saldo; **(3)** regresija na drugom telefonu i kratki smoke test ostalih tema. Dok ove provere nedostaju, standardizacija je lokalno napredovala, ali nije release-certifikovana.

Naknadno je urađena [globalna blokada vodoravnog prikaza](global-portrait-lock-2026-10-01.md) za sve sobe i teme; izolovani Android Chrome test potvrđuje njeno prekrivanje menija/sobe/modala na telefonu i tabletu. Novi APK još nije proveren.
