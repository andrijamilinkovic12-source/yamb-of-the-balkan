# Green Asset Standardization — Takmičarske medalje, Korak 4

## Ishod

Green takmičarske medalje završno su proverene i zaključane. Centralni registar i source manifest sada imaju status `locked`.

Ovaj korak nije menjao vizuelni sadržaj, plasman, podatke takmičenja niti nagrade. Zaključane su granice između dva podium identiteta i potvrđeno je da posebne nagrade nisu greškom pretvorene u generičke medalje.

## Zaključani identiteti

### General Podium

- koristi se u Top listi, Turniru, Power Index-u, Vatrenom nizu i waiting-room Hall of Fame prikazu;
- centralni znak je jedan ivory lovor;
- gold, silver i bronze koriste isti Green Soft Clay jezik i zajedničku konstrukciju traka;
- ne koristi QL zvezdu.

### Quarterly League Podium

- koristi se samo u live QL rang-listama, Dvorani slavnih i QL sadržaju Pravila;
- centralni znak je jedna ivory petokraka zvezda;
- gold, silver i bronze ostaju zaseban QL trio;
- ne koristi General Podium lovor.

## Zaključana matrica potrošača

| Podfamilija | Potrošač | Canonical veza |
|---|---|---|
| General Podium | Top lista | dinamički `general-podium-${tier}` |
| General Podium | Turnir | dinamički `general-podium-${tier}` |
| General Podium | Power Index | dinamički `general-podium-${tier}` |
| General Podium | Vatreni niz | dinamički `general-podium-${tier}` |
| General Podium | Waiting-room Hall of Fame | dinamički `general-podium-${tier}` |
| Quarterly League | QL rang-liste i Dvorana slavnih | dinamički `quarterly-league-${tier}` |
| Quarterly League | Pravila | tri statičke canonical veze |

`game.js` sadrži i tačno po jednu eksplicitnu room-on-demand vezu za svih šest medalja.

## Integritet paketa

Zaključavanje pokriva:

- šest canonical runtime PNG fajlova rezolucije `256 × 256`;
- tri General Podium mastera rezolucije `1254 × 1254`;
- tri Quarterly League mastera rezolucije `512 × 512`;
- direktan alpha kanal svakog fajla;
- SHA-256 otisak svih dvanaest master/runtime fajlova;
- identičan runtime skup u source manifestu i centralnom registru;
- kompletne i jedinstvene gold/silver/bronze nivoe obe podfamilije.

## Semantičke granice

Automatska kontrola posebno potvrđuje da sledeći asseti ostaju netaknuti i izvan podium porodice:

- Treasury collection gold/silver/bronze;
- Tournament finalist-silver nagrada;
- QL medals-tab navigacioni glyph;
- QL rank bedževi od Amatera do Svih vremena;
- Treasury achievement trofeji;
- winner i victory-state simboli;
- dukati i potrošni tokeni.

## Zabranjene stare putanje

Šest starih `leaderboard/medal-*` i `ql/medal-*` runtime putanja ostaje evidentirano kao zabranjeno. Test pada ako se vrati bilo koji stari fajl ili aktivna referenca. High-resolution istorijski izvori ostaju sačuvani i mapirani na canonical zamene.

## Automatska kontrola

`check-theme-performance.js` sada proverava:

- `locked` status centralnog registra i source manifesta;
- zaključani lovor i zvezda identitet;
- poklapanje manifest i registry runtime skupova;
- tačan broj dinamičkih, statičkih i room-on-demand veza;
- dimenzije, alpha kanal i SHA-256 integritet;
- odsustvo starih runtime fajlova i referenci;
- prisustvo i očuvanje collection, finalist, tab i rank izuzetaka;
- pravilnu room preload izolaciju.

## Performanse pri zaključavanju

- Green tema: `173 PNG`, ukupno `16.87 MB`.
- Startup paket: `17 PNG`, `4.56 MB` kompresovano / `20.44 MB` procenjeno dekodirano.
- Najveći sobni paket: Riznica, `44 PNG`, `2.93 MB` kompresovano / `13.70 MB` procenjeno dekodirano.

Medalje se ne učitavaju na startup-u. General Podium i Quarterly League trio ulaze samo u odgovarajuće room pakete.

## Pravilo za buduće izmene

Promena bilo koje zaključane medalje zahteva novu verziju mastera i runtime asseta, ažuriranje SHA-256 otiska, centralnog registra i svih relevantnih veza. Postojeći canonical fajlovi ne smeju se tiho prepisivati, a General i Quarterly League namespace-i ne smeju se međusobno zamenjivati.
