# Pošta — usklađivanje glavne kartice, 18. novembar 2026.

Glavni okvir sada koristi širinu standardnih soba Top lista, Statistika i Podešavanja na telefonu: ekran umanjen za bezbedne bočne margine od najmanje 10 CSS px. Uklonjeno je ograničenje malog dijaloga na 440 px. Visina koristi raspoloživ ekran između gornje safe zone i donje safe zone + 8 px; na tabletu se širina ograničava na 760 px.

Zaglavlje ima kanonski PNG Pošte svoje teme od 32 px, naziv POŠTA/INBOX velikim slovima i kanonsko tematsko X dugme sa površinom dodira 44 × 44 px. Veličina i težina fonta su zajedničke kroz deset tema. Pozadina, podkartice i kontrast zadržavaju paletu aktivne teme. Zaglavlje i povratak ostaju fiksni, a skroluje se samo unutrašnji sadržaj. Liste, vlasničke radnje, detalj poruke i obrasci koriste novu širinu bez vodoravnog prelivanja.

Prošlo je **720 izolovanih prikaza**: deset tema × srpski/engleski × šest dimenzija × šest stanja (primljeno, detalj, prijava problema, nova objava, vlasnički pregled prijava i prazno sanduče). Telefoni: 320×568, 360×640, 360×780, 390×844 i 430×932; tablet: 800×1024 CSS px. Test simulira gornju safe zonu 24 px i donju 48 px, uz dodatnih 8 px razmaka ispod kartice. Na telefonima stvarna širina poredi se sa sve tri referentne sobe; provereni su fiksno zaglavlje, tematski PNG, jednake mere, odsustvo vodoravnog prelivanja i ispravan unutrašnji skrol. Ulazne animacije referentnih soba isključene su samo tokom merenja.

Postojeće funkcionalne provere prolaze: 137 poruka sa paginacijom, čitanje i indikator, arhiviranje/vraćanje/brisanje, zastareli odgovori, zajednički intro i pozivanje izlazne reklame preko zamenskog testnog interfejsa. Osnovna serverska provera identiteta naloga, validacije i sistemskih objava takođe prolazi. Nisu slati zahtevi pravim igračima, menjani produkcioni podaci niti prikazivane stvarne reklame.

Reprodukcija: `scripts/test-player-mailbox-layout.cjs`; izveštaj i snimci: `tmp/player-mailbox-review/layout-report.json` i `room-*.png`. Interaktivan pregled: [Pošta](theme-player-mailbox-review.html). Provera je lokalna u Chromiumu; ovaj korak ne uključuje commit, deploy ili novu proveru na fizičkom telefonu.

## Dve zasebne stalne poruke

Facebook podrška je prva poruka, a poziv za tri igrača druga. Obe imaju trajan zaseban ID i serversku zaštitu od brisanja i arhiviranja. Novi poziv ne menja identitet, datum ili status već pročitane Facebook objave. Pravila poziva ostaju 3.000 + 3.000 + 5.000 dukata, ukupno najviše 11.000; Facebook poruka sadrži samo poziv za podršku stranici. Statusi pročitanosti su odvojeni. Serverski redosled ima prednost nad datumom običnih poruka.

Izolovan test privremene lokalne MongoDB baze potvrđuje zaštitu obe poruke, stabilan redosled posle restarta, očuvanje istorije, paginacije i odvojene pročitanosti. Prikaz dve poruke i odvojena dugmad proveravaju se stvarnim klijentom na oba jezika u svih deset tema.
