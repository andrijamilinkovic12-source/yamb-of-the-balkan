# Završna provera — Podešavanja (10 tema)

Datum: 22.10.2026. Referenca za raspored i dimenzije: Zelena tema. Ova provera obuhvata aktivnu sobu, izbor teme i obaveštenje kada nova tema ne može da se učita.

| Tačka | Nalaz |
| --- | --- |
| Intro | `showSettings()` poziva zajednički intro. Sadržaj se otvara posle 2.400 ms, a intro se završava posle 3.200 ms, iz jednog `ROOM_INTRO_TIMING` ugovora za sobe i teme. |
| PNG i stari asseti | Svaka tema ima istih 21 dostupnih PNG putanja u sobi: 9 sobnih/deljenih ikona, kanonski X, tematski katanac i 10 zajedničkih pregleda tema iz Riznice. Katanac se prikazuje samo uz zaključanu temu. Pet kontrolnih PNG po svakoj od devet novih tema imaju zasebne mastere i hash; Zelena koristi pet kanonskih v1. Aktivni DOM i mape ne upućuju na stare settings PNG/SVG. Stari fajlovi postoje u repozitorijumu kao nasleđena građa, ali nisu deo prikaza ove sobe. |
| Dimenzije | Zaglavlje ima najmanje 58 px; redovi i kartica naloga najmanje 48 px; polje i izbor teme 45 px; dugmad jezika najmanje 40 px. Glavni X i X u izboru teme koriste kanonski PNG u 44 px klik zoni. Sadržaj sobe ima unutrašnji skrol na niskim ekranima, a izbor tema skroluje unutar modala. |
| Površine i kontrast | Devet tema koristi svoje `surface/raised/inset/border/ink/muted/primary` tokene i odgovarajući materijal. Zelena zadržava svoju Clay paletu. Najniži statički kontrast teksta protiv nosećih `surface`/`raised` boja je 4,85:1 (Vaskršnja); sve proverene kombinacije su iznad 4,5:1. Prozor izbora teme i obaveštenje o neuspelom učitavanju koriste paletu aktivne teme. Providni gradijenti i stvarna fotografija iza njih traže vizuelnu proveru na uređaju. |
| Tipografija | Usklađena je Montserrat skala sa Zelenom: naslov `clamp(1.05rem,4.2vw,1.22rem)` (na širini do 360 px `.84rem`), naslovi sekcija `clamp(.98rem,3.6vw,1.08rem)`, oznake redova `.9rem`, ime naloga `.88rem`, unos `.95rem`, jezička dugmad `.85rem`, pravni linkovi `.65rem`. Zatečena devetotemska sekcija od `.75rem` i oznaka reda od `.88rem` su usklađene. |
| Završni ekran i obaveštenja | Podešavanja nemaju završni ekran. Imaju modal izbora teme i generičko obaveštenje kada izabrana tema ne uspe da se učita. Tom obaveštenju je dodeljen tematski stil i kontrast. |

Automatizovano: `npm run check:theme-settings-room`, `npm run check:js`, `git diff --check` — prolaze. Test proverava 21 putanju po temi, parity uloga, postojanje PNG, pet zasebnih novih kontrolnih datoteka po novoj temi, zajednički intro, tipografsku skalu, povezivanje deljenih kontrola i kanonskog X, kontrast osnovnih paleta, zaključavanje tema, promenu jezika i ponašanje prozora.

Granica provere: ovo nije merenje stvarnog WebView prikaza na fizičkim malim, srednjim i velikim telefonima; završni vizuelni pregled i dodirne zone na uređaju ostaju potreban QA korak. Različit hash potvrđuje zasebne PNG, ali sam po sebi ne dokazuje potpunu likovnu različitost svih silueta.
