# Green Room Pack — korak 5: jezik, prazna stanja i izolacija tema (2026-10-01)

Status: **ciljani izolovani Android QA prolaz urađen; nativni WebView sa EN i testnim online podacima nije potvrđen**. Nije rađen build, instalacija, commit, meč, kupovina, slanje poziva niti promena preferencija prijavljenog naloga.

Test je koristio lokalni `qa/green-runtime.html`, stvarne CSS fajlove, prevode i odabrane prikazivače igre u Android Chrome-u, bez servera igre i naloga. Proveren je standardni emulator 1440 × 3120 / font 100%, zatim uski 1080 × 2100 / sistemski font 130%. Za poređenje Vaskrs i Pustinjsko staklo fixture bira njihove postojeće body klase i assete preko `?theme=easter` / `?theme=desert`; izbor je izolovan i ne menja korisnikovu sačuvanu temu. Fixture sada bira i odgovarajuću vrednost u polju teme i skriva profilnu fotografiju kada simulira neprijavljenog igrača, kao što to inače radi `auth.js`.

| Provera | Nalaz |
| --- | --- |
| Green / EN, Podešavanja | Naslov, X, sekcije i polja ostaju u okviru na oba formata; na uskom prikazu nema sudara naslova sa X. [Uski prikaz](../screenshots/green-ui-step9/green-step5-en-settings-narrow.png). |
| Green / EN, prazna Top lista | Prazna lokalna lista, filteri, ikona, poruka i X ostaju čitljivi pri fontu 130%. [Uski prikaz](../screenshots/green-ui-step9/green-step5-en-leaderboard-empty-narrow.png). |
| Green / EN, prazni Online igrači | Pretraga, ikona i poruka „There are no other players at the moment.” staju u karticu na oba formata. Ovo je sintetičko prazno stanje, ne stvarni online odgovor. |
| Green / EN, Pozovi prijatelja | Gornje kartice, imena, `POWER`, W/D/L i oznaka rivala staju u uski prikaz. Donji spisak zahteva vertikalni fallback na 1080 × 2100 / 130%, kao i na srpskom. Nije poslat poziv. |
| Green / EN, Dnevni izazov i obaveštenja | Završna poruka prikazuje broj i jedan kanonski dukat; dug tekst greške u modalu se prelama i ostaje čitljiv. Nagrada nije dodeljivana. |
| Green / EN, turnirski meč | Na standardnom ekranu prozor sa dugim imenima, rezultatom i Green medaljom ostaje pregledan. Ovo je sintetički završen meč. |
| Green / EN, pobednik Kvartalne lige | Na uskom ekranu dug naziv, medalja, ime i poeni ostaju unutar kartice; dugme `CONTINUE` dostupno je unutrašnjim skrolom. [Posle skrola](../screenshots/green-ui-step9/green-step5-en-winner-scroll-narrow.png). |
| Vaskrs i Pustinjsko staklo / SR | Podešavanja i prazna lokalna Top lista na standardnom i uskom ekranu zadržavaju sopstvene boje, ikone, X i raspored, bez prodora Green CSS-a. [Vaskrs Podešavanja](../screenshots/green-ui-step9/green-step5-easter-settings-narrow.png) · [Pustinjsko staklo Podešavanja](../screenshots/green-ui-step9/green-step5-desert-settings-narrow.png). |

Izolovani fixture za Pravila proverava samo zaglavlje i jednostavnu test-stranu; **ne** dokazuje EN raspored svih šest stvarnih strana ili swipe. Srpski swipe u već instaliranom WebView-u potvrđen je u prethodnom [koraku 4](green-ui-step4-emulator-qa-2026-10-01.md). Engleski pregled ostalih soba, realni server rangovi, avatar mrežni fallback, online tokovi, reklame, sve strane Pravila i pun vizuelni prolaz drugih tema ostaju otvoreni. Ovaj prolaz ne menja status „potpuna nativna regresija” u završen.

Automatski ponovo prošli: `node scripts/check-js.js`, `node scripts/check-theme-performance.js`, `node scripts/check-green-asset-coverage.js` i `git diff --check` (uz uobičajena LF/CRLF upozorenja). Privremeni QA snimci iz `Download` na emulatoru uklonjeni su po tačnim imenima nakon kopiranja potrebnih primera; zatvoreni su i Chrome tabovi otvoreni tokom ove sesije. Emulator je tokom snimanja prijavio gotovo punu korisničku particiju; nakon čišćenja QA datoteka ostalo je oko 74 MB slobodno od 5,8 GB. Pre budućeg APK testa treba proveriti/slobodno osloboditi prostor uz korisnikovu odluku šta sme da se ukloni. Prethodni Chrome tabovi, tuđi podaci i aplikacioni storage nisu brisani.
