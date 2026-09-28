# Green Asset Standardization — Treasury navigacija i statusi, Korak 1

Datum audita: 2026-09-28

Ovaj korak je inventar, vizuelna kontrola i semantička dijagnoza. Nijedan runtime PNG, tab akcija, stanje artikla, cena, uslov otključavanja, alert modal, tekst Pravila niti preload tok nije promenjen.

## Zaključak

Green Treasury kontrole čine jednu širu porodicu sa dve jasno odvojene podfamilije:

1. **Navigation Tabs** — četiri simbola koji biraju sadržaj Riznice;
2. **Item Statuses** — četiri simbola koji objašnjavaju stanje konkretnog artikla ili kupovine.

Svih osam postojećih PNG asseta vizuelno je kvalitetno, semantički jasno i usklađeno sa Green Room Pack DNK-om. Nije potrebno ponovno renderovanje. Svi se prihvataju kao canonical kandidati za naredni korak.

Standardizacija ne sme pretvoriti navigacioni trofej u achievement trofej, niti statusnu kvačicu koristiti za svaku claim/completed akciju u aplikaciji. Zajednički vizuelni jezik ne ukida razliku između navigacije, stanja prodavnice i stanja igre.

## Podfamilija A — Navigation Tabs

| ID | Asset | Semantika | Potrošači |
|---|---|---|---|
| `trophies` | `tab-trophies-v1.png` | otvara katalog achievement trofeja | Treasury tab i oba jezika Pravila |
| `skins` | `tab-skins-v1.png` | otvara skinove kockica | Treasury tab i oba jezika Pravila |
| `effects` | `tab-effects-v1.png` | otvara vizuelne efekte | Treasury tab i oba jezika Pravila |
| `themes` | `tab-themes-v1.png` | otvara teme interfejsa | Treasury tab i oba jezika Pravila |

Zaključani identiteti su pehar, Yamb kockica, dvostruka svetlucava zvezda i slikarska paleta. Oni su navigacioni glyph-ovi, ne prikazi trenutnog artikla i ne achievement nagrade.

## Podfamilija B — Item Statuses

| ID | Asset | Semantika | Stvarna upotreba |
|---|---|---|---|
| `owned` | `status-owned-v1.png` | artikal je već kupljen/osvojen | oznaka `Kupljeno` |
| `active` | `status-active-v1.png` | kupljeni artikal je trenutno opremljen | aktivno dugme/status |
| `locked` | `status-locked-v1.png` | uslov artikla ili trofeja još nije ispunjen | trophy status, requirement tekst i skriven opis |
| `insufficient` | `status-insufficient-v1.png` | nema dovoljno dukata za kupovinu | insufficient-funds alert u dva purchase toka |

`owned` i `active` nisu sinonimi: artikal može biti kupljen, a da trenutno nije opremljen. `locked` nije isto što i nedovoljan balans, a `insufficient` nije unavailable-ad stanje.

## Zajednički DNK

- mat 3D Soft Clay Neumorphism;
- forest-green, warm-ivory i terracotta paleta;
- meko osvetljenje odozgo/levo;
- slobodan centralni glyph na transparentnoj pozadini;
- bez kvadratne pozadinske kartice i bez teksta u PNG-u;
- čitljiva silueta pri maloj mobilnoj veličini;
- jasna razlika između četiri navigacione uloge i četiri statusna značenja.

## Tehnički inventar

- osam odobrenih source/master PNG fajlova;
- osam odgovarajućih runtime PNG fajlova;
- svi masteri: `512 × 512`, RGBA;
- svi runtime asseti: `256 × 256`, RGBA;
- osam jedinstvenih master sadržaja;
- osam jedinstvenih runtime sadržaja;
- nedostajući parovi master/runtime: 0.

Vizuelni pregled sa semantičkim izuzecima sačuvan je u `docs/green-asset-standardization-treasury-controls-audit.png`.

## Stvarne kodske veze

Navigation Tabs:

- `index.html` prikazuje četiri Green taba;
- `riznica.js` čuva postojeće `trophy`, `skin`, `effect` i `theme` akcije;
- `pravilaigre.js` mapira ista četiri Green simbola u srpski i engleski Treasury sadržaj;
- `game.js` ih priprema u Treasury room-on-demand paketu.

Item Statuses:

- `getEasterTreasuryStatusIcon()` dinamički bira `owned`, `active` i `locked` status za sve podržane teme;
- `getTreasuryLockIcon()` koristi isti Green `locked` identitet u skrivenom opisu;
- `getTreasuryInsufficientIconPath()` koristi Green `insufficient` identitet u oba purchase alert toka;
- `game.js` priprema sva četiri statusa u Treasury room-on-demand paketu.

Istorijski naziv helpera `getEasterTreasuryStatusIcon()` ne menja semantiku: Green varijanta već koristi svoj Green PNG.

## Semantički izuzeci

Sledeći asseti ne pripadaju Treasury Controls porodici:

- pojedinačni achievement trofeji;
- Statistics zbirni `trophies` metric glyph;
- Treasury Collection medalje;
- Tournament registracija `locked`, aktivan meč i završen meč;
- Tournament tabs i ceremonijalni pehari;
- Quarterly League tabovi, podium medalje i rank bedževi;
- Daily completed i already-played stanja;
- Invite accepted stanje;
- Solo claim akcija;
- Rewarded Video active/unavailable ticketi;
- generičke check/claim/playback akcije;
- CSS `.active` stanje samog taba;
- dukati, Undo tokeni i winner/victory simboli.

Slična reč u nazivu nije dovoljan razlog za spajanje. Na primer, `status-active` označava opremljen shop artikal, dok `state-match-active` označava živ turnirski meč.

## Predlog zaključanog modela

Porodica `treasuryControls` treba da ima dve podfamilije:

- `navigationTabs`: `trophies`, `skins`, `effects`, `themes`;
- `itemStatuses`: `owned`, `active`, `locked`, `insufficient`.

Svaka uloga dobija tačno jedan canonical master i jedan canonical runtime PNG. Tabovi se mogu ponoviti u Riznici i Pravilima, dok statusi ostaju ograničeni na stanje Treasury artikla/kupovine.

## Sledeći koraci

1. Formirati canonical paket iz postojećih osam odobrenih mastera, bez ImageGen izmene.
2. Generisati optimizovan runtime set i manifest sa dve podfamilije, dimenzijama i SHA-256 otiscima.
3. Prebaciti `index.html`, `pravilaigre.js`, status helper-e i Treasury room-on-demand paket na canonical namespace.
4. Evidentirati stare runtime putanje kao zabranjene i ukloniti samo njihove runtime kopije; source fajlove sačuvati.
5. Dodati `treasuryControls` u centralni Green registar i završno zaključati semantičke granice.

## Van opsega Koraka 1

- renderovanje ili zamena bilo kog PNG-a;
- promena tab akcija ili aktivnog taba;
- promena cena, kupovine, equip logike ili uslova otključavanja;
- promena teksta Pravila ili alert ponašanja;
- spajanje sa tournament, QL, daily, invite, solo ili rewarded-video stanjima;
- menjanje drugih tema.
