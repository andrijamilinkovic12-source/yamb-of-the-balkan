# Green Asset Standardization — Statistics Overview Metrics, Korak 1

## Opseg

Sledeća porodica za standardizaciju je `Statistics Overview Metrics`. Ovaj korak je inventar, vizuelna i semantička dijagnoza; nijedan runtime asset, statistički podatak, modal, preload tok, motion ili UI geometrija nije promenjen.

Porodica obuhvata deset stabilnih Green glyph-ova koji opisuju zbirne metrike na prvoj strani Statistike. H2H identitet, H2H prazno stanje i sedam H2H detail glyph-ova namerno ostaju izvan ove porodice i biće obrađeni kao posebna celina.

## Kandidati u porodici

| Predloženi ID | Trenutni asset | Semantička uloga | Glavna silueta |
|---|---|---|---|
| `power-index` | `statistics/power-index-bolt-v1.png` | globalna Power Index vrednost i rang | ivory munja u forest-green prstenu sa jednom terracotta tačkom |
| `record` | `statistics/record-v1.png` | najbolji sačuvani Solo rezultat | rastuća ivory putanja sa green tačkama i terracotta vrhom strelice |
| `games` | `statistics/games-v1.png` | ukupan broj završenih partija | vertikalni niz tri glinene kockice sa pravilnim licima `1`, `3` i `5` |
| `wins` | `statistics/wins-v1.png` | ukupan broj pobeda | veliki ivory check na green osnovi i terracotta zvezda |
| `draws` | `statistics/draws-v1.png` | ukupan broj nerešenih partija | dva ivory horizontalna kraka sa green završecima i terracotta središtem |
| `losses` | `statistics/losses-v1.png` | ukupan broj poraza | terracotta strelica nadole, ivory tačka i green osnova |
| `fire-streak` | `statistics/fire-streak-v1.png` | trenutni/najbolji Vatreni niz | terracotta plamen sa ivory sredinom i green jezgrom |
| `average` | `statistics/average-v1.png` | prosečan broj poena | rastući green stubovi presečeni ivory linijom proseka i terracotta tačkom |
| `trophies` | `statistics/trophies-v1.png` | zbir otključanih achievement trofeja | ivory pehar sa terracotta zvezdom i green osnovom |
| `all-time-points` | `statistics/all-time-points-v1.png` | zbir svih osvojenih poena | green orbitalna konstrukcija sa ivory zvezdom i terracotta tačkom |

Slična paleta, zvezda, check, strelica ili tačka nisu dovoljan razlog za zamenu između ovih uloga. Kompletna silueta i podatak koji glyph označava čine njegov identitet.

## Trenutni potrošači

### Prva strana Statistike

- `power-index` je veliki `94 × 94` watermark u Power Index kartici;
- `record` i `games` koriste prikaz `19 × 19`;
- `wins`, `draws` i `losses` koriste kompaktni prikaz `14 × 14`;
- `fire-streak`, `average`, `trophies` i `all-time-points` koriste prikaz `24 × 24`;
- svih deset asseta učitavaju se kroz Statistics room-on-demand paket i nisu zasebno dodati startup paketu.

### Dodatni povezani potrošači

- `power-index` se ponavlja u Power Index modalu kao naslovni glyph `27 × 27` i value glyph `16 × 16`;
- `fire-streak` se ponavlja u Vatreni niz modalu kao naslovni glyph `32 × 32` i value glyph `23 × 23`;
- Pravila koriste `power-index`, `record`, `wins`, `fire-streak` i `all-time-points` kao tematske reference;
- ista putanja u svim potrošačima čuva jedan identitet po metrici.

## Tehnički inventar

Svi odobreni izvori su `1254 × 1254` RGBA PNG fajlovi. Svi aktivni runtime fajlovi su `256 × 256` RGBA PNG fajlovi.

| ID | Source B | Runtime B | Source SHA-256 | Runtime SHA-256 |
|---|---:|---:|---|---|
| `power-index` | 737.420 | 38.478 | `77545e0f854f6d501c886e84670a9fc8b7d4f96db28064f50d6481e230a44bb3` | `aca987078b4173c89cdae4d44b8ab471792558d24bd52ec5c86b0f5519910fe1` |
| `record` | 295.583 | 16.242 | `b8b9a067524f56cd4daf5ec4d9a4a4b1b222a2d53ad97e65836731f5aa5acdbe` | `9e3cca29bc7ec413863ca360b07de2f322cef1e2d35deab686a35a8957e6380b` |
| `games` | 460.094 | 24.371 | `13189b80a7ecae4564457fb40a5e3b3a366bef15aa30f7addaf3fe7e9d362977` | `41c1f718f4af64d8286d3f39caa7a90d3a2b07240130a53a1939b8e68619ddb7` |
| `wins` | 965.175 | 44.712 | `fc00372c7ba5154902f11332d456a017e60c4e6f9c907228ba1daf03f459f5e2` | `56c08c3ffcd753a10d87b81b721086dbd1415f9e13ed246a36bd7b05b8f950c4` |
| `draws` | 451.581 | 21.877 | `8925a428c85256924cfb5f7a6e7f23d3639c302ad6d30824c095443b174d9a1d` | `ac875bb7e77abcc37b672a2e5a46251c001a36fa219906595669b6fe820aac82` |
| `losses` | 536.135 | 24.382 | `fe9c5a2f0f21acc673520af2dc8eba5125e10425f0866830278cbafa6468a17e` | `e0f872aa3fc25541c9b5fb394dfbca40137f8c99c7ae510b890c1502243cd3fc` |
| `fire-streak` | 784.068 | 37.145 | `67fff13074702422654052a870ddfdceec7b9660734368cc7cc4dd7fffada89a` | `9d9cb7a4189caf38d4cbb0b166a8f2cebed7aab5a969763de3c55763db7a3847` |
| `average` | 674.525 | 28.397 | `a89b376e9a43030d00e05f5034544bb366cabe8fffaad33d4594ca6e48adaeed` | `fdc3b6eae21540d3003eadc697c24862aa69667293bc0fa75790499ba59b2a12` |
| `trophies` | 752.663 | 39.193 | `b59ea27b291e47ee76b53b74cdc8efd323ee9773284aa1ab0f1a4d2857b910ae` | `b698d3624653518ba0bb7014ee94e411d73da87fd8e3fa0b52f7c26fc635880e` |
| `all-time-points` | 904.469 | 48.898 | `b6b8661ec764c02819ce2d56df07ea73ffaef0fffb2e6228d177823eeac432d5` | `670e8f0a5773e56b423cc205a0dc10ca3454d4591f0b6a57a1304acc6fbd933c` |

Deset source asseta zajedno zauzima `6.561.713` bajtova, a aktivni runtime paket `323.695` bajtova. Runtime paket dekodira se na približno `2,50 MB`.

Pixel-level provera potvrđuje da je svaki postojeći runtime identičan direktnom proporcionalnom LANCZOS smanjenju svog odobrenog high-resolution izvora na `256 × 256`. Canonical standardizacija zato ne zahteva prerenderovanje niti vizuelnu korekciju.

## Vizuelni zaključak

Nije potreban novi render. Svih deset asseta pripada odobrenom Green Soft Clay DNK-u:

- matirani 3D Soft Clay Neumorphism materijal;
- forest-green i warm-ivory baza sa jednim kontrolisanim terracotta akcentom;
- meko gornje-levo osvetljenje i kontrolisana glinena dubina;
- jedna čista centralna silueta na transparentnoj pozadini;
- bez teksta, scene ili generičke kvadratne podloge;
- jasna čitljivost pri stvarnim prikazima od `14 × 14` do `94 × 94` piksela.

Vizuelni audit: `docs/green-asset-standardization-statistics-overview-audit.png`.

## Zaključane semantičke razlike

- `record` predstavlja sačuvanu zbirnu high-score metriku, ne trenutak novog Solo ličnog rekorda.
- `games` broji završene partije; tri kockice nisu gameplay dice skin niti dugme za bacanje.
- `wins`, `draws` i `losses` predstavljaju zbirne brojače, ne rezultat jedne Hotseat, Online ili Tournament partije.
- `fire-streak` predstavlja statistički niz i njegov modal, ne reward efekat ili generički plamen.
- `trophies` je zbir otključanih achievementa, ne Treasury tab, pojedinačni achievement, Tournament nagrada ili League medalja.
- `all-time-points` označava lifetime score, ne dukat, saldo, ligu ili rang.
- `power-index` je metrika/rang, ne action munja, rewarded state ili podium medalja.

## Asseti izvan porodice

### H2H porodica

`h2h-v1.png`, `h2h-empty-v1.png` i svih sedam `statistics/h2h-detail/*.png` asseta ostaju posebna funkcionalna celina. Oni opisuju rivala, prazan H2H ledger i metrike jednog međusobnog duela, a ne zbirni Statistics Overview profil.

### Canonical dukat

Kartica stanja u Statistici već koristi zaključani `canonical/ducat/ducat-inline-v1.png`. Saldo nije nova Statistics valuta i dukat se ne kopira u ovu porodicu.

### Rezultati i nagrade

Solo Personal Best, Hotseat Winner, Online/Invite rezultati, Tournament Awards, League rank/podium identiteti, General Podium medalje i pojedinačni achievement trofeji ostaju izvan porodice.

### Glavna Statistics ikona

`statistics-free-v2.png` ostaje identitet sobe, glavnog menija i intra. Ne predstavlja jedanaestu overview metriku.

## Ponašanje koje treba očuvati

- vrednosti nastavljaju da dolaze iz postojećeg stats/profile toka bez promene formule ili izvora;
- Power Index i Vatreni niz kartice nastavljaju da otvaraju svoje postojeće modale;
- trophy kartica nastavlja da otvara Riznicu;
- Statistics carousel i H2H strana ostaju nepromenjeni;
- postojeće CSS veličine, transparentnost, responsive raspored i reduced-motion ponašanje ne menjaju se ovom standardizacijom;
- room-on-demand učitavanje ostaje odvojeno od startup paketa.

## Semantičke granice

Statistics Overview Metrics ostaje odvojen od:

- H2H overview, empty i detail glyph-ova;
- glavne Statistics menu/intro ikone;
- canonical dukata i Economy identiteta;
- Solo Results i Hotseat Winner porodica;
- Online, Invite i tehničkih result/state oznaka;
- Tournament Awards, States i Navigation porodica;
- Quarterly League rank, navigation i podium identiteta;
- General Podium i Collection medalja;
- pojedinačnih Achievement Trophies;
- Treasury navigation/statusa;
- Daily stanja;
- gameplay kockica, dice skinova, strelica i Undo tokena.

## Predlog standarda

Canonical `statistics-overview` paket treba da:

1. zadrži svih deset postojećih odobrenih vizuelnih identiteta bez prerenderovanja;
2. sačuva svaki `1254 × 1254` RGBA source kao zaseban canonical master;
3. deterministički izvede deset transparentnih `256 × 256` runtime PNG-ova LANCZOS skaliranjem;
4. koristi jednu canonical putanju po metrici u Statistici, povezanim modalima, Pravilima i room preloadu;
5. očuva prikaze `14`, `16`, `19`, `23`, `24`, `27`, `32` i `94` CSS piksela prema postojećem potrošaču;
6. ne duplira zaključani canonical dukat niti bilo koji H2H asset;
7. ukloni deset starih `statistics/*-v1.png` runtime kopija tek posle potpune zamene svih aktivnih veza;
8. zabrani zamenu sa Solo, Hotseat, Online, Tournament, League, Treasury, Daily, achievement, navigation ili gameplay simbolima;
9. zadrži Statistics room paket van startup kritične putanje;
10. evidentira sve master/runtime hash vrednosti i istorijsko mapiranje u source manifestu i centralnom registru.

Pošto postojeći runtime fajlovi već jesu pixel-identične `256 × 256` izvedenice, očekivana finalna veličina i broj Green PNG fajlova ostaju praktično nepromenjeni nakon uklanjanja starih kopija. Canonical kopije u Koraku 2 biće samo privremeno dodatne do integracije u Koraku 3.

## Performance baseline

- Green tema: `172 PNG`, ukupno `15,81 MB`.
- Startup paket: `17 PNG`, `4,56 MB` kompresovano / `20,44 MB` procenjeno dekodirano.
- Kompletan Statistics room paket: `21 PNG`, `0,90 MB` kompresovano / `6,94 MB` procenjeno dekodirano. Precizirani zbir uključuje obe glavne Statistics menu/intro varijante.
- Statistics Overview podfamilija iz ovog koraka: `10 PNG`, `0,31 MB` kompresovano / `2,50 MB` procenjeno dekodirano.
- Najveći Green room paket ostaje Riznica: `44 PNG`, `2,94 MB` kompresovano / `13,70 MB` procenjeno dekodirano.

Korak 1 nije dodao nijedan shipped runtime PNG niti promenio startup ili room preload tok.

## Sledeći korak

Korak 2 je izrada canonical `statistics-overview` paketa: čuvanje deset odobrenih high-resolution mastera, deterministička reprodukcija deset `256 × 256` runtime PNG-ova, source manifest i početna automatska kontrola kataloga, dimenzija, alpha kanala, SHA-256 integriteta, pixel-identične LANCZOS normalizacije i semantičkih granica.

Nije rađen commit niti objavljivanje.
