# Green Asset Standardization — Hotseat Winner, Korak 4

## Ishod

Green Hotseat Winner porodica završno je vizuelno, semantički i tehnički proverena. Centralni registar i source manifest sada imaju status `locked`.

Ovaj korak nije menjao vizuelni sadržaj, rezultat partije, uslove pobede ili remija, veličinu prikaza, motion, reduced-motion ponašanje niti geometriju interfejsa.

## Zaključani katalog

| ID | Uloga | Zaključana silueta |
|---|---|---|
| `hotseat-winner` | pobednik završene lokalne partije za dva igrača bez remija | dve glinene figure sa forest-green pobednikom napred, velikom ivory check oznakom i jednom terracotta tačkom; ivory protivnik pozadi |

Jedan Hotseat Winner ID uvek koristi jedan isti canonical Green PNG identitet.

## Zaključani vizuelni DNK

Winner mark zadržava:

- matirani 3D Soft Clay Neumorphism materijal;
- forest-green, warm-ivory i jedan kontrolisani terracotta akcenat;
- dve centralne figure na transparentnoj pozadini;
- odsustvo teksta, scene i generičke kvadratne kartice;
- meko gornje-levo osvetljenje i kontrolisanu glinenu dubinu;
- čitljivu foreground/background hijerarhiju i check oznaku pri prikazu od `58 × 58` piksela.

Vizuelni pregled mastera i runtimea potvrđuje da LANCZOS redukcija nije promenila kadar, proporcije, paletu ili značenje glyph-a.

## Zaključana logika prikaza

Winner mark se prikazuje samo kada:

1. rezultat pripada režimu `Hotseat`;
2. završetak nije remi;
3. `game-over-screen` ima klase `is-hotseat-result` i `has-result-winner`.

Online i tehnički rezultati brišu Hotseat winner klase pre prikaza. Remi ne postavlja `has-result-winner`. Ova logika je deo zaključanog semantičkog identiteta i automatski se proverava.

## Zaključani motion i prikaz

- UI dimenzija ostaje `58 × 58` CSS piksela;
- `object-fit: contain` čuva punu siluetu;
- postojeći drop-shadow ostaje deo UI prezentacije, ne PNG sadržaja;
- reveal koristi `easterSoloFinishReveal` trajanja `0,48 s` sa postojećom easing krivom;
- `prefers-reduced-motion: reduce` potpuno isključuje animaciju.

## Zaključani potrošači

| Površina | Veza |
|---|---|
| Hotseat game-over winner card | `hotseat-winner-v1.png` |
| Hotseat room-on-demand paket | isti canonical identitet |

Isti URL koristi se za prikaz i preload. Asset nije deo startup paketa.

## Integritet paketa

Zaključavanje pokriva:

- canonical master `512 × 512` RGBA;
- canonical runtime `256 × 256` RGBA;
- SHA-256 otisak mastera i runtimea;
- tačno jedan ID, jednu semantičku siluetu i jednu registry ulogu;
- identične manifest i registry putanju, dimenziju, hash i identitet;
- proporcionalnu LANCZOS izvedenicu na punom transparentnom canvasu;
- jednu game-over i jednu room-on-demand vezu.

## Semantičke granice

Hotseat Winner ostaje odvojen od:

- Statistics wins, draws i losses ikona;
- Solo result markova i akcija;
- Online, Invite i tehničkih rezultata;
- Tournament champion/finalist nagrada i completed-match stanja;
- Quarterly League champion, rank i podium identiteta;
- General Podium i Treasury Collection medalja;
- achievement trofeja;
- Invite accepted i Treasury owned check stanja;
- dukata, Undo tokena i Rewarded Video simbola.

Zajednički motiv check oznake ne dozvoljava zamenu između porodica. Hotseat glyph predstavlja odnos dva lokalna igrača i odlučeni rezultat, ne zbir pobeda, takmičarsku titulu ili generičko završeno stanje.

## Zabranjena stara putanja

`assets/green-soft-clay/hotseat/winner-v1.png` ostaje evidentirana kao zabranjena. Automatska kontrola pada ako se vrati stari fajl, aktivna legacy referenca ili se promeni istorijsko mapiranje na canonical zamenu.

Odobreni source i canonical master ostaju sačuvani izvan shipped runtime stabla.

## Automatska kontrola

`check-theme-performance.js` proverava:

- `locked` status registra i source manifesta;
- evidentiran završni audit;
- zaključani vizuelni DNK, ID mapiranje i semantičku siluetu;
- manifest/registry identitet, putanju, dimenziju i SHA-256 podudaranje;
- master/runtime dimenzije, alpha kanal i hash integritet;
- game-over i room-on-demand canonical veze;
- Hotseat matcher i odsustvo stare runtime putanje;
- uslov `Hotseat && !isDraw` i čišćenje stanja u Online/tehničkom toku;
- `58 × 58` prikaz, reveal motion i reduced-motion zaštitu;
- sve zaključane semantičke izuzetke.

## Performanse pri zaključavanju

- Green tema: `172 PNG`, ukupno `15,94 MB`.
- Startup paket: `17 PNG`, `4,56 MB` kompresovano / `20,44 MB` procenjeno dekodirano.
- Hotseat paket: `2 PNG`, `0,15 MB` kompresovano / `1,25 MB` procenjeno dekodirano.
- Najveći Green room paket ostaje Riznica, `44 PNG`, `2,94 MB` kompresovano / `13,70 MB` procenjeno dekodirano.

Zaključavanje nije dodalo novi runtime PNG niti povećalo startup paket.

## Pravilo za buduće izmene

Promena zaključanog Hotseat Winner asseta zahteva novu verziju mastera i runtime fajla, ažuriranje oba SHA-256 otiska, source manifesta, centralnog registra i obe aktivne veze. Postojeći canonical fajl ne sme se tiho prepisivati, Hotseat-only uslov ne sme se širiti na Online ili generičke rezultate, a winner glyph ne sme biti zamenjen Statistics, Tournament, League, Solo, Treasury ili state simbolom.

Nije rađen commit niti objavljivanje.
