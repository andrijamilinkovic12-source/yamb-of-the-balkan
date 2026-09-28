# Green Asset Standardization — Rewarded Video, Korak 1

Datum audita: 2026-09-28

Ovaj korak je inventar i semantička dijagnoza. Nijedan runtime PNG, UI element, oglasni tok, nagrada niti funkcionalnost nije promenjena.

## Zaključak

Green Room Pack trenutno koristi četiri različita vizuelna oblika za istu radnju „pogledaj video za nagradu”: notched video-ticket u Ekonomiji, zaobljeni kvadrat u Dnevnom izazovu, filmski okvir u Riznici i slobodan play trougao u Solo rezultatu.

Najjači kanonski kandidat je postojeći par iz Ekonomije:

- `economy/rewarded-video-v1.png` — aktivna video akcija;
- `economy/ad-unavailable-v1.png` — odgovarajuće stanje nedostupnog oglasa.

Oba koriste isti Green DNK i gotovo istu osnovnu geometriju. Aktivni simbol ima forest-green glineni ticket, ivory unutrašnji okvir i play trougao plus mali terracotta akcenat. Nedostupno stanje koristi isti ticket i jasnu terracotta kosu zabranu.

## PNG inventar

| ID | Asset | Semantika | Ocena |
|---|---|---|---|
| V1 | `economy/rewarded-video-v1.png` | Univerzalna aktivna rewarded-video akcija | Najbolji kanonski kandidat |
| V2 | `economy/ad-unavailable-v1.png` | Univerzalno stanje nedostupnog oglasa | Prirodni par V1 i kandidat za kanonsko unavailable stanje |
| V3 | `daily/reward-video-v2.png` | Video akcija + jedan kanonski dukat | Dukat je ispravan; video osnova odstupa od V1 |
| V4 | `treasury/reward-video-v2.png` | Video akcija + jedan kanonski dukat | Dukat je ispravan; filmski okvir i tamni play odstupaju od V1 |
| V5 | `solo/finish-reward-video-v2.png` | Video akcija + dva kanonska dukata | Dukati su ispravni; slobodan play trougao odstupa od V1 |
| V6 | `solo/finish-claim-v1.png` | Preuzmi osnovnu Solo nagradu | Nije video; check/claim action ostaje zaseban simbol |
| V7 | `daily/already-played-v1.png` | Dnevni izazov je već odigran | Nije stanje oglasa i ne sme biti zamenjeno sa V2 |

## Aktivne runtime veze

V1 se koristi u oba taba Ekonomije za aktivnu rewarded-video karticu i u sadržaju Pravila. V2 se koristi u oba disabled reward stanja i u oba banner failure stanja Ekonomije, kao i u Pravilima.

V3 je povezan u Dnevnom izazovu, V4 u glavnom dugmetu Riznice i dinamičkim stavkama kolekcije, a V5 na Solo završnom ekranu. Svih pet aktivnih asseta pripremaju se room-on-demand kroz Green paket i nisu deo startup grupe.

Fallback emoji/SVG simboli postoje radi drugih tema i grešaka učitavanja. Green CSS prikazuje Green PNG varijante u odgovarajućoj temi; fallback nije novi Green identitet.

## Predlog zaključanog identiteta

### Aktivna video akcija

- mat 3D Soft Clay Neumorphism;
- forest-green horizontalni video-ticket sa blago usečenim bočnim ivicama;
- debeo zaobljen ivory unutrašnji okvir;
- jedan ivory play trougao usmeren udesno;
- mali terracotta četvorokraki akcenat u gornjem desnom uglu;
- transparentna pozadina i meko osvetljenje odozgo sleva.

### Nedostupan oglas

- ista osnovna ticket geometrija, paleta i play simbol kao aktivna varijanta;
- jedna debela terracotta kosa zabrana od gornjeg levog ka donjem desnom uglu;
- bez peščanog sata, sivog globalnog fallbacka ili dodatnog ornamenta.

## Pravilo za složene nagradne kompozicije

Dnevni izazov, Riznica i Solo treba da koriste isti kanonski video-ticket kao osnovu. Kanonski dukat ostaje odvojeni nagradni sloj:

- Dnevni izazov: ticket + jedan dukat;
- Riznica: ticket + jedan dukat;
- Solo double reward: ticket + dva dukata.

Broj dukata i značenje nagrade ne smeju se menjati. Video simbol ne sme preuzeti pet tačaka dukata, a dukat ne sme postati video bedž.

## Sledeći koraci

1. Potvrditi V1/V2 kao kanonski par i sačuvati njihove mastere.
2. Izvesti optimizovane `active`, `inline` i `unavailable` runtime verzije bez regenerisanja identiteta.
3. Povezati direktne Economy i Rules prikaze na canonical putanje.
4. Precizno prerenderovati V3, V4 i V5 koristeći isti video-ticket uz očuvanje broja i identiteta kanonskih dukata.
5. Dodati porodicu `rewardedVideo` u centralni Green registar, automatske provere i završno zaključavanje.

## Van opsega

- claim/check akcije;
- daily completed i already-played stanja;
- obična playback dugmad koja ne daju nagradu;
- turnirsko „pokreni meč” dugme;
- kanonski dukat i Undo token, koji su već zaključani;
- asseti drugih tema.
