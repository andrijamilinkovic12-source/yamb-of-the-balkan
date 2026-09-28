# Green Asset Standardization — Treasury Collection medalje, Korak 1

Datum audita: 2026-09-28

Ovaj korak je inventar i semantička dijagnoza. Nijedan runtime PNG, skin, cena, uslov otključavanja, kategorija Riznice, UI element niti preload tok nije promenjen.

## Zaključak

Treasury collection medalje predstavljaju tri kategorije skinova za kockice u Riznici — Bronze, Silver i Gold. One nisu medalje za plasman, nisu finalist nagrada i nisu achievement trofeji.

Trio već deli dobar osnovni DNK: ivory spoljni obod, tier-obojeno lice, podignutu petokraku zvezdu, forest-green trake i terracotta spoj. Međutim, konstrukcija nije potpuno standardizovana:

- Gold ima dve forest-green trake sa ivory prugama i okrugli terracotta spoj;
- Silver ima jednostavne zelene trake bez ivory pruga i četvrtasti terracotta spoj;
- Bronze ima jednostavne zelene trake bez ivory pruga i okrugli terracotta spoj.

Gold varijanta je najpotpuniji i najprepoznatljiviji Green Room Pack kandidat. Njena geometrija traka i okruglog spoja treba da postane zajednička osnova, dok Silver i Bronze moraju zadržati svoje tier materijale, boju lica i centralne zvezde.

## PNG inventar

| ID | Asset | Semantika | Ocena |
|---|---|---|---|
| C1 | `treasury/collection-gold-v1.png` | Gold kategorija skinova | Kanonski kandidat za konstrukciju i trake |
| C2 | `treasury/collection-silver-v1.png` | Silver kategorija skinova | Potrebne striped trake i okrugli spoj po C1 |
| C3 | `treasury/collection-bronze-v1.png` | Bronze kategorija skinova | Okrugli spoj je ispravan; nedostaju ivory pruge |

Sva tri high-resolution izvora su `512 × 512` RGBA PNG, a postojeće runtime izvedenice `256 × 256` RGBA PNG.

Vizuelni pregled je sačuvan u `docs/green-asset-standardization-collection-medals-audit.png`.

## Stvarna funkcionalna upotreba

Collection medalje prikazuju se samo u zaglavljima skin kategorija unutar Riznice:

- Bronze Collection — šest skinova;
- Silver Collection — šest skinova;
- Gold Collection — četiri skina.

`getEasterTreasuryCategoryMeta()` trenutno prepoznaje srpske i engleske nazive kategorija i dinamički bira `collection-${type}` asset. Uprkos istorijskom nazivu metode, Green tema koristi sopstveni Green PNG. Kada aktivni tip nije `skin`, collection medalja se ne prikazuje.

Sva tri Green runtime asseta nalaze se i u Treasury room-on-demand paketu. Nisu deo startup paketa.

## Važno semantičko razdvajanje

1. **Collection medalja** označava kategoriju skinova u Riznici.
2. **General Podium medalja** označava plasman u Top listi, Turniru, Power Index-u ili Vatrenom nizu i koristi lovor.
3. **Quarterly League medalja** označava QL plasman i koristi QL zvezdu i poseban raspored traka.
4. **Tournament finalist** je statusna nagrada povezana sa povraćajem uloga.
5. **QL medals tab** je navigacioni glyph za kategoriju.
6. **QL rank bedževi** označavaju ligu, ne collection tier.
7. **Treasury achievement trofeji** predstavljaju pojedinačna dostignuća.
8. Dukat, Undo token i Rewarded Video ostaju nezavisne zaključane porodice.

## Predlog zaključanog identiteta

- mat 3D Soft Clay Neumorphism bez metalnog sjaja;
- jedan debeo ivory zaobljeni spoljni obod;
- jedno tier-obojeno kružno lice: gold, silver ili bronze;
- jedna podignuta petokraka zvezda usklađena sa tier materijalom;
- dve simetrične forest-green ribbon trake;
- po jedna uska ivory pruga na svakoj ribbon traci;
- jedan mali okrugli terracotta spoj između medalje i traka;
- bez lovora, teksta, brojeva, QL logotipa, krune ili dodatnih medalja;
- transparentna pozadina i meko gornje-levo osvetljenje.

## Sledeći koraci za ovu porodicu

1. Potvrditi C1 kao kanonski konstrukcioni master.
2. ImageGen `precise-object-edit` obradom standardizovati samo trake i spoj C2/C3, uz potpuno očuvanje Silver/Bronze lica, oboda, zvezde i tier boje.
3. Formirati canonical `collectionMedals` master/runtime paket za sva tri nivoa, sa SHA-256 otiscima.
4. Prebaciti dinamički Treasury category template i room-on-demand paket na canonical namespace, evidentirati stare putanje kao zabranjene i ukloniti stare runtime kopije.
5. Dodati porodicu u centralni Green registar, proveriti semantičke izuzetke i završno je zaključati.

## Van opsega Koraka 1

- renderovanje ili zamena C2/C3;
- promene skinova, cena, otključavanja ili kategorija;
- General Podium i Quarterly League medalje, koje su već zaključane;
- finalist, tab, rank, trophy i winner asseti;
- asseti drugih tema.
