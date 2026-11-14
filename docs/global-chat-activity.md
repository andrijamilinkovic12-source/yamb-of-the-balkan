# Global chat — stvarni indikator aktivnosti

U svih deset tema postojeći kanonski PNG ostaje isti. Dva odvojena živa UI elementa prate stanje servera:

| Prikaz | Značenje |
| --- | --- |
| Broj preko ikone | Nove poruke drugih korisnika od poslednjeg čitanja. |
| Tri pokretne tačke | Drugi prijavljeni korisnik trenutno kuca. |
| Mirna oznaka „0“ | Nema nepročitanih poruka u primljenoj istoriji. Pokriva nacrtane ukrasne tačke postojećih PNG-ova. |
| „?“ / „…“ kada nema sačuvanih novih poruka | Bez veze / proveravanje: trenutno stanje još nije potvrđeno. Sačuvani pozitivan broj se ne briše. Pristupačan naziv dodatno objašnjava stanje. |

Pri prvom povezivanju postojeća istorija predstavlja početnu tačku. Nakon toga se pozicija čitanja čuva lokalno po nalogu, uz ID-eve za poruke sa istim vremenom. Promena teme ne utiče na tu evidenciju. Drugi uređaj ima zasebnu poziciju čitanja. Server čuva najviše 50 poruka, pa je i broj ograničen dostupnom istorijom.

Otvaranje sobe ne briše oznaku dok istorija ne stigne i ne bude prikazana u vidljivoj aplikaciji. Sopstvene poruke i ponovljene isporuke istog ID-a ne povećavaju broj. Nedeljno čišćenje i brisanje poruka se usklađuju sa novom istorijom.

`global_chat_activity` prenosi samo metapodatke (ID, autorov UID i vreme), bez teksta poruke. Ažurira se po potvrđenom profilu i zahtevu pri povratku u aplikaciju. `global_chat_msg` ažurira broj u realnom vremenu. Nema stalnog intervala za polling.

Kucanje je potvrđeno serverskim identitetom, ograničeno po učestalosti i prolazno: klijent prestaje nakon pauze od 3,5 s, server briše stanje najkasnije nakon 6 s bez osvežavanja. Slanje i prekid veze ga prekidaju odmah. Sadržaj polja se ne šalje u ovom događaju i status se ne čuva u bazi.

Oznake koriste paletu svoje teme. Nema novih PNG fajlova, promene dimenzija ikone ili zamene kanonskog identiteta. Dostupni su srpski/engleski nazivi, tastatura i smanjena animacija.

Provere:

- `npm run check:global-chat-activity` — autentifikacija, deduplikacija, čitanje, pozadina, promena naloga, ponovno povezivanje, reset i prolazno kucanje.
- `node scripts/test-global-chat-activity-layout.cjs` — stvarni markup/CSS/klijent, 10 tema na 320×568, 360×780 i 430×932. Lokalni izolovani prikaz; bez stvarnih naloga i poruka. Najniži izmereni kontrast broja: 5,67:1.
- `node scripts/test-global-chat-activity-sockets.cjs` — dva izolovana Chromium klijenta povezana stvarnim lokalnim Socket.IO događajima: kucanje, slanje, čitanje i povratak veze sa zatvorenom ili otvorenom sobom. Bez produkcionih naloga.
- `npm run check:theme-global-chat-final` — postojeći registar PNG assetsa, geometrija, tipografija i palete sobe.

Za objavu je potrebno objaviti i novi klijent i serversku podršku iz iste izmene.

## Lokalna provera na Android emulatoru — 14.11.2026.

Provera je završena u Chrome-u na AVD-u `Easter_QA_10GB`, kroz izolovani lokalni prikaz sa stvarnim produkcionim markupom, CSS-om i `GlobalChatManager` kodom. Drugi klijent je izolovani Chromium na računaru. Povezani su samo na loopback QA server (`scripts/serve-global-chat-activity-qa.cjs`), bez produkcionih naloga ili poruka. Ovo potvrđuje Android Chrome prikaz i tok lokalnih Socket.IO događaja; nije provera instaliranog Capacitor paketa ni objavljenog servera.

Potvrđeno:

- Svih deset tema: isti položaj i dimenzije ikone; broj je vidljiv i ostaje isti pri promeni teme.
- Stvarno kucanje drugog klijenta aktivira tri tačke, a slanje ih prekida.
- Dolazak poruka menja broj `0 → 1 → 2`; otvaranje i prikaz istorije vraćaju `0`.
- Prekid lokalne veze prikazuje `?`; povratak veze pronalazi propuštenu poruku.
- Ponovno učitavanje zadržava nepročitanu poruku; sopstvena poruka ne povećava broj.

Na emulatoru je uočen nacrtan narandžasti indikator u Zelenoj PNG ikoni. Živa oznaka sada prikazuje i mirnu nulu, tako da ukrasni detalj više ne određuje status poruka. Odgovarajući prikaz i pravilo važe za svih deset tema.

Ponovljiv prolaz: `scripts/check-global-chat-activity-emulator.cjs`. Lokalni dokazi su u `tmp/global-chat-activity-emulator/report.json` i PNG snimcima u istom direktorijumu. Commit i deploy nisu rađeni.

## Izmena i brisanje sopstvenih poruka

Sopstvene poruke u aktivnoj istoriji imaju akcije **Izmeni** i **Obriši**. Izmena popunjava postojeće polje za pisanje; slanje čuva izmenu, a **Otkaži** vraća prethodni nacrt nove poruke. Originalni ID, autor i vreme nastanka ostaju isti. Uz ažuriranu poruku stoji **izmenjeno**. Brisanje traži potvrdu i uklanja poruku svim učesnicima, uključujući broj nepročitanih.

Vlasništvo se proverava na serveru preko potvrđenog UID-a, uključujući ponovnu prijavu sa drugog uređaja. Ime i trenutni Socket.IO ID nisu dokaz vlasništva. Sistemske i poruke bez potvrđenog autora se ne mogu menjati. Akcije rade dok je poruka u dostupnoj istoriji; nedeljno čišćenje i ograničenje poslednjih 50 poruka ostaju.

Svaka izmena proverava dužinu (1–550 znakova), postojeću moderaciju i zabranu pisanja. Zaštita revizijom sprečava da stari ekran drugog uređaja prepiše noviji tekst. Baza koristi atomski upit sa ID-em poruke, UID-em autora i revizijom, kroz isti red kao dodavanje poruka. Pri neuspelom upisu nema uspešne potvrde, promene u memoriji ili emitovanja drugim klijentima. Neuspeh veze ostavlja nacrt i otključava kontrole.

`npm run check:global-chat-mutations` proverava vlasništvo, validaciju, moderaciju, revizije, konkurentne zahteve, reset i neuspeh čuvanja. `scripts/test-global-chat-mutations-ui.cjs` proverava dva stvarna lokalna klijenta, tok dugmadi, otkazivanje, čuvanje nacrta, bezbedan prikaz teksta, brisanje nepročitane poruke i 30 kombinacija teme/veličine ekrana. Test baze koristi izolovan adapter i proveru Mongo upita, bez produkcione baze.

Izmena i potvrđeno brisanje provereni su i u lokalnom Chrome prikazu na Android emulatoru; drugi klijent je odmah dobio promenu. Pregled ostaje otvoren sa sopstvenom probnom porukom koja se može menjati i brisati. Produkcija, commit i deploy nisu korišćeni.

## Vlasnik i moderacija

Panel se otvara u Globalnom chatu dugmetom **Moderacija**. Pristup ima potvrđeni Firebase nalog čiji UID odgovara serverskoj varijabli `GLOBAL_CHAT_OWNER_UID`. Prazna vrednost ostavlja panel zaključan. Vrednost se postavlja zasebno za svako okruženje. Lokalne probe koriste izdvojene naloge, a lokalni `.env` sadrži potvrđeni UID za pripremu produkcione konfiguracije.

Četiri prikaza pokrivaju otvorene prijave, aktivne poruke, aktivne zabrane i evidenciju. Prijava čuva tekst iz trenutka prijave i opcioni razlog. Odluka traži potvrdu i razlog. Zabrana može trajati 15 minuta, sat, 24 sata, sedam dana ili neograničeno. Uklanjanje poruke osvežava chat svim povezanim klijentima. Aktivnu zabranu i razlog korisnik vidi i posle ponovnog povezivanja.

MongoDB transakcija zajedno čuva odluku i evidenciju. Rok zabrane odnosi se samo na pisanje u Globalnom chatu. Uslov za objavu je serverska konfiguracija UID-a i MongoDB koji podržava transakcije. Izgled i tok odlučivanja proveravaju `test-global-chat-moderation-ui.cjs` i `test-global-chat-moderation-db.cjs`.
