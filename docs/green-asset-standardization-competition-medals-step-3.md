# Green Asset Standardization — Takmičarske medalje, Korak 3

## Ishod

Oba Green canonical podium paketa povezana su sa svim potvrđenim potrošačima. Porodica `competitionMedals` dodata je u centralni Green registar sa statusom `standardized`.

Aktivne putanje sada jasno kodiraju poreklo medalje:

- `canonical/competition-medals/general-podium-*` za opšte takmičarske plasmane;
- `canonical/competition-medals/quarterly-league-*` isključivo za Kvartalnu ligu.

## General Podium povezivanje

Canonical trio sa ivory lovorom povezan je u:

- Globalnoj i Lokalnoj Top listi;
- turnirskom podium prikazu;
- Power Index rangiranju;
- Vatrenom nizu;
- waiting-room Hall of Fame prikazu u `game.js`;
- Green room-on-demand paketu i leaderboard filteru.

Dinamički template-i zadržavaju stvarni tier iz podataka (`gold`, `silver`, `bronze`); rezultat, pozicija i rang-lista nisu menjani.

## Quarterly League Podium povezivanje

Canonical trio sa ivory zvezdom povezan je u:

- live rang-listama svih ligaških nivoa;
- Dvorani slavnih i njenom medals prikazu;
- Quarterly League podium ilustraciji u Pravilima;
- Green room-on-demand paketu i quarterly-league filteru.

Funkcija `getQlAssetSource()` za Green medalje sada eksplicitno vraća Quarterly League canonical namespace. Ostali QL asseti i druge teme zadržavaju postojeći tok.

## Centralni registar

`www/themes/green/asset-registry.json` sada definiše:

- dve podfamilije i njihove dozvoljene potrošače;
- šest canonical runtime uloga;
- propisanu rezoluciju `256 × 256` i SHA-256 otisak svake medalje;
- šest zabranjenih starih runtime putanja;
- mapu starih high-resolution mastera ka canonical runtime zamenama;
- semantičke izuzetke za collection, finalist, tab, rank, trophy, winner, dukat i token assete.

Source manifest ima isti status `standardized` i evidentira potpuno povezivanje oba trija.

## Uklonjeni runtime duplikati

Nakon provere da u aktivnom kodu više nema starih veza, uklonjeni su:

- `leaderboard/medal-{gold,silver,bronze}-v1.png`;
- `ql/medal-{gold,silver,bronze}-v1.png`.

Njihovi high-resolution izvori nisu obrisani. Centralna mapa zamena ih usmerava na odgovarajuće canonical runtime fajlove, tako da performance provera i dalje potvrđuje postojanje optimizovane zamene za svaki istorijski master.

## Netaknuti semantički izuzeci

Nisu menjani:

- Treasury `collection-{gold,silver,bronze}` medalje;
- Tournament `finalist-silver` nagrada;
- QL `tab-medals` navigaciona ikona;
- šest QL rank bedževa;
- 26 Treasury achievement trofeja;
- winner i victory-state simboli.

## Automatska kontrola

`check-theme-performance.js` sada proverava:

- `standardized` status registra i source manifesta;
- tačno dve podfamilije i kompletna dva gold/silver/bronze trija;
- jedinstvene registry uloge;
- master dimenzije, runtime rezolucije i direktan alpha kanal;
- SHA-256 integritet master i runtime sadržaja;
- canonical namespace u svakom General Podium potrošaču;
- canonical namespace u Kvartalnoj ligi;
- tačno jednu QL medalju svakog nivoa u Pravilima;
- tačno jednu room-on-demand vezu za svih šest medalja;
- odsustvo svih šest starih runtime fajlova i aktivnih veza;
- očuvanje semantičkih izuzetaka.

## Performanse posle povezivanja

- Green tema: `173 PNG`, ukupno `16.87 MB`.
- Startup paket: `17 PNG`, `4.56 MB` kompresovano / `20.44 MB` procenjeno dekodirano.
- Najveći sobni paket: Riznica, `44 PNG`, `2.93 MB` kompresovano / `13.70 MB` procenjeno dekodirano.

Privremenih šest duplikata iz Koraka 2 je uklonjeno. Medalje nisu deo startup paketa i učitavaju se samo uz odgovarajuću sobu.

## Sledeći korak

Korak 4 je završni globalni audit i zaključavanje porodice: proveriti oba identiteta, sve dinamičke i statičke veze, hash otiske, zabranjene putanje, preload izolaciju i semantičke granice, zatim promeniti status `competitionMedals` iz `standardized` u `locked` ako nema odstupanja.
