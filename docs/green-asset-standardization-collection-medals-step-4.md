# Green Asset Standardization — Collection medalje, Korak 4

## Ishod

Green Treasury Collection medalje završno su vizuelno i tehnički proverene. Centralni registar i source manifest sada imaju status `locked`.

Ovaj korak nije menjao cene, skinove, uslove otključavanja, nazive kolekcija, raspored Riznice niti druge vrste medalja i nagrada.

## Zaključani identitet

Gold, Silver i Bronze koriste istu konstrukciju:

- prednja kružna Soft Clay medalja;
- jedan debeli zaobljeni warm-ivory obod;
- jedna podignuta petokraka tier zvezda;
- dve simetrične forest-green glinene trake;
- po jedna uska warm-ivory umetnuta pruga na svakoj traci;
- jedna mala centralna okrugla terracotta kopča;
- transparentna pozadina bez kartice ili dekorativne ploče.

Materijal lica i zvezde jasno razlikuje gold, silver i bronze nivo, dok zajednička konstrukcija ostaje prepoznatljiva.

## Zaključana matrica potrošača

| Potrošač | Veza |
|---|---|
| Treasury Bronze Collection | dinamički `collection-bronze-v1.png` |
| Treasury Silver Collection | dinamički `collection-silver-v1.png` |
| Treasury Gold Collection | dinamički `collection-gold-v1.png` |
| Treasury room-on-demand paket | po jedna eksplicitna veza za sva tri canonical asseta |

Mapiranje je ograničeno na `skin` kategorije i podržava srpske i engleske nazive Bronze, Silver i Gold kolekcija.

## Integritet paketa

Zaključavanje pokriva:

- tri canonical runtime PNG fajla rezolucije `256 × 256`;
- tri transparentna high-resolution mastera;
- direktan alpha kanal svih master/runtime fajlova;
- SHA-256 otisak svih šest fajlova;
- isti canonical runtime trio u source manifestu i centralnom registru;
- kompletne i jedinstvene Gold, Silver i Bronze uloge;
- tačan identitet oboda, zvezde, traka, pruga i kopče.

## Semantičke granice

Collection medalje su isključivo oznake Treasury dice-skin kategorija. Zaključavanje ih razdvaja od:

- General Podium medalja sa ivory lovorom;
- Quarterly League podium medalja;
- Tournament finalist nagrade;
- Quarterly League medals-tab glyph-a i rank bedževa;
- Treasury achievement trofeja;
- winner i victory-state oznaka;
- dukata i potrošnih tokena.

## Zabranjene stare putanje

Tri stare `treasury/collection-*` runtime putanje ostaju evidentirane kao zabranjene. Test pada ako se vrati stari fajl ili aktivna referenca. Originalni high-resolution istorijski izvori ostaju sačuvani i mapirani na canonical zamene.

## Automatska kontrola

`check-theme-performance.js` proverava:

- `locked` status centralnog registra i source manifesta;
- evidentiranu završnu kontrolu;
- canonical identitet i Gold/Silver/Bronze trio;
- poklapanje manifest i registry runtime skupova;
- tačno jednu dinamičku category-template vezu;
- tačno po jednu room-on-demand vezu za svaki asset;
- ograničenje na skin kolekcije i dvojezičko mapiranje;
- dimenzije, alpha kanal i SHA-256 integritet;
- odsustvo starih runtime fajlova i referenci;
- očuvanje svih semantičkih izuzetaka;
- pravilnu Treasury room preload izolaciju.

## Performanse pri zaključavanju

- Green tema: `173 PNG`, ukupno `16,87 MB`.
- Startup paket: `17 PNG`, `4,56 MB` kompresovano / `20,44 MB` procenjeno dekodirano.
- Najveći Green room paket: Riznica, `44 PNG`, `2,94 MB` kompresovano / `13,70 MB` procenjeno dekodirano.

Collection medalje se ne učitavaju pri startup-u; ulaze samo u Treasury room paket.

## Pravilo za buduće izmene

Promena bilo koje zaključane Collection medalje zahteva novu verziju mastera i runtime asseta, ažuriranje SHA-256 otiska, oba manifesta i relevantnih veza. Postojeći canonical fajlovi ne smeju se tiho prepisivati, niti se Collection medalje smeju zameniti podium, finalist, rank, trophy, currency ili token simbolima.

Nije rađen commit niti objavljivanje.
