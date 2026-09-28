# Green Asset Standardization — Takmičarske medalje, Korak 1

Datum audita: 2026-09-28

Ovaj korak je inventar i semantička dijagnoza. Nijedan runtime PNG, rezultat takmičenja, rang, nagrada, UI element niti preload tok nije promenjen.

## Zaključak

Green tema ne treba da ima jednu univerzalnu medalju za sva takmičenja. Potrebne su dve jasno odvojene podium porodice:

1. **General Podium** — Top lista, Turnir, Power Index i Vatreni niz koriste isti trio za prvo, drugo i treće mesto.
2. **Quarterly League Podium** — Kvartalna liga koristi sopstveni trio, prepoznatljiv po centralnoj ivory zvezdi.

Kvartalna liga je već interno usklađena: sva tri nivoa imaju istu konstrukciju i centralnu zvezdu. General Podium nije potpuno usklađen: gold koristi zvezdu, dok silver i bronze koriste lovor. Da bi poreklo medalje bilo jasno, General Podium treba da zadrži lovor kao svoj zajednički znak, a samo gold medalja treba precizno da bude prerenderovana sa ivory lovorom uz očuvanje postojećeg tela, traka, palete i osvetljenja.

## PNG inventar

| ID | Asset | Semantika | Ocena |
|---|---|---|---|
| P1 | `leaderboard/medal-gold-v1.png` | General Podium — prvo mesto | Neusklađen centralni znak: zvezda umesto lovora |
| P2 | `leaderboard/medal-silver-v1.png` | General Podium — drugo mesto | Kanonski kandidat za geometriju i lovor |
| P3 | `leaderboard/medal-bronze-v1.png` | General Podium — treće mesto | Usklađen sa P2 |
| Q1 | `ql/medal-gold-v1.png` | Kvartalna liga — prvo mesto | Ispravan QL kandidat; centralna zvezda |
| Q2 | `ql/medal-silver-v1.png` | Kvartalna liga — drugo mesto | Usklađen sa Q1 |
| Q3 | `ql/medal-bronze-v1.png` | Kvartalna liga — treće mesto | Usklađen sa Q1 |
| C1–C3 | `treasury/collection-{gold,silver,bronze}-v1.png` | Napredak kolekcije u Riznici | Posebna kolekcionarska porodica, nije podium |
| F1 | `tournament/finalist-silver-v1.png` | Posebna finalist nagrada | Nije medalja za drugo mesto na podium listi |
| T1 | `ql/tab-medals-v1.png` | Navigacija do taba Medalje | Kategorijski glyph, nije osvojena medalja |

Vizuelni pregled je sačuvan u `docs/green-asset-standardization-competition-medals-audit.png`.

## General Podium — potvrđene upotrebe

Trio iz `leaderboard/` nije ograničen samo na Top listu. On predstavlja opšti rezultat takmičarskog plasmana i koristi se u:

- Globalnoj i Lokalnoj Top listi;
- turnirskom podium prikazu;
- Power Index rangiranju;
- Vatrenom nizu;
- zajedničkom rang-lista prikazu u `game.js`;
- room-on-demand paketu Top liste.

Zbog toga naziv kanonske podfamilije treba da bude `generalPodium`, a ne samo `leaderboardMedal`.

## Quarterly League Podium — potvrđene upotrebe

QL trio ostaje zaseban i koristi se u:

- live rang-listama svih šest ligaških nivoa;
- Dvorani slavnih / medaljama;
- ilustraciji podiuma u Pravilima;
- room-on-demand paketu Kvartalne lige.

Njegov identitet je ista kružna glinena medalja kroz sva tri nivoa, sa ivory zvezdom, QL rasporedom traka i gold/silver/bronze materijalom.

## Važno semantičko razdvajanje

Standardizacija ne sme svaku okruglu nagradu ili svaki simbol sa zvezdom pretvoriti u podium medalju:

1. Treasury `collection-*` trio prikazuje stepen završenosti kolekcije i ostaje posebna porodica.
2. `finalist-silver` potvrđuje status finaliste i povraćaj uloga; nije generička srebrna podium medalja.
3. `tab-medals` je navigaciona ikona koja predstavlja celu kategoriju.
4. Šest QL rank bedževa označavaju ligu/rang, ne plasman 1–3.
5. Dvadeset šest Treasury trofeja predstavljaju pojedinačna dostignuća.
6. Hotseat winner mark i turnirski pobednički simboli predstavljaju stanje pobede, ne trajnu medalju.
7. Kanonski dukat, Undo token i Rewarded Video ticket ostaju zaključane nezavisne porodice.

## Predlog zaključanih identiteta

### General Podium

- kružna gold/silver/bronze medalja od mat soft clay materijala;
- isti zaobljeni obod i proporcije kroz sva tri nivoa;
- jedan zajednički ivory lovor kao centralni znak;
- dve kratke forest-green trake sa uskom ivory prugom i terracotta vrhovima;
- bez slova, brojeva, QL zvezde, krune ili metalnog sjaja.

### Quarterly League Podium

- kružna gold/silver/bronze medalja od mat soft clay materijala;
- jedan zajednički ivory petokraki znak u sredini;
- isti QL raspored zelenih, ivory i terracotta traka;
- bez lovora, teksta, brojeva, rank naziva ili dodatnog logotipa.

## Sledeći koraci za ovu porodicu

1. Potvrditi `generalPodium` i `quarterlyLeaguePodium` kao dve podfamilije jedne `competitionMedals` registry porodice.
2. Precizno prerenderovati samo General Podium gold medalju: zameniti zvezdu ivory lovorom iz silver/bronze identiteta, bez menjanja ostatka medalje.
3. Napraviti canonical master/runtime pakete za oba trija i prebaciti sve potvrđene upotrebe na njihove canonical putanje.
4. Evidentirati collection, finalist, tab, rank i trophy assete kao semantičke izuzetke; ukloniti zastarele runtime kopije tek nakon provere svih veza.
5. Dodati automatske provere za poreklo medalje, trio komplet, dimenzije, alpha kanal, SHA-256 integritet i room-on-demand izolaciju, pa zaključati porodicu.

## Van opsega Koraka 1

- renderovanje ili zamena medalja;
- promena podataka rang-lista, plasmana ili nagrada;
- standardizacija Treasury kolekcija, QL rank bedževa, finalist nagrade ili achievement trofeja;
- asseti drugih tema.
