# Green Asset Standardization — Korak 1: audit dukata

Datum audita: 2026-09-28

Ovaj korak je samo inventar i dijagnoza. Nijedan runtime asset, UI element, efekat ili funkcionalnost aplikacije nije promenjen.

## Zaključak

Green Room Pack trenutno nema jedan vizuelni identitet dukata. Postoji sedam različitih PNG motiva koji se čitaju kao dukat, uz četiri dodatna SVG/CSS/Canvas prikaza. Najjači kandidat za kanonski master je izolovani `economy/ducat-v1.png`: terracotta lice, ivory obod i pet zelenih glinenih tačaka.

## PNG inventar

| ID | Asset | Trenutni motiv | Ocena |
|---|---|---|---|
| A1 | `economy/ducat-v1.png` | Terracotta lice, ivory obod, pet zelenih tačaka | Najbolji kandidat za kanonski master |
| A2 | `ducats-undo-free-v2.png` | Ivory lice, pet zelenih tačaka, terracotta undo strelica | Isti pojam, ali boje i konstrukcija dukata odstupaju od A1 |
| A3 | `ducats-undo-pro-v1.png` | Minijaturni ivory petotačkasti dukat unutar pločice | Isti problem kao A2; pro varijanta ne sme definisati novi dukat |
| A4 | `treasury-free-v2.png` | Dva obična terracotta novčića bez pet tačaka | Potrebno prerenderovati sadržaj kovčega kanonskim dukatima |
| A5 | `daily/reward-video-v1.png` | Terracotta novčić sa ivory zvezdom | Različit dukat; zameniti kanonskim ili ukloniti čitanje „novčića” |
| A8 | `treasury/reward-video-v1.png` | Terracotta novčić sa ivory krunom | Različit dukat; zameniti kanonskim ili pretvoriti u nedvosmislen reward bedž |
| A10 | `solo/finish-reward-video-v1.png` | Dva ivory novčića sa zelenom zvezdom | Različit dukat; prerenderovati kanonskim parom |
| A13 | `rules/pages/economy-treasury-v1.png` | Tri zelena novčića sa lisnatim reljefom plus Undo token | Potrebno prerenderovati stranicu sa kanonskim dukatima i postojećim Undo tokenom |

Kontrolni asseti A6, A7, A9, A11 i A12 ne prikazuju dukat i ne zahtevaju zamenu samo zbog standardizacije valute.

## Kodom generisani alternativni dukati

1. `#app-icon-dukat` u `www/index.html` koristi stari kružni SVG sa zakrivljenom oznakom i ukrštenim linijama.
2. `www/assets/dukat-icon.svg` ponavlja isti stari simbol za podrazumevane teme i fallback u Pravilima.
3. `getGoldRainSprites()` u `www/managers.js` Canvas kodom crta zlatni novčić sa zakrivljenom oznakom i linijama, a ne Green petotačkasti dukat.
4. `runRoyalYambCanvas()` pravi dodatne zlatne novčiće sa slovom `Y`.
5. `.prev-gold_rain::before` u `www/efekti.css` prikazuje obične prazne zlatne diskove u preview kartici efekta.
6. Fallback grana Zlatne kiše koristi `dukatIconHtml()`, ali Green tema u toj funkciji trenutno nema sopstvenu granu i dobija stari SVG.

## Mesta na kojima je A1 već pravilno korišćen

- zaglavlje, tab i veliki prikaz u sobi Dukati;
- nagrada `+500` u sobi Dukati;
- Statistika — kategorija Dukati;
- stanje i `+500` u Riznici;
- prikaz nagrade Dnevnog izazova;
- inline prikazi u Pravilima.

Postoji deset direktnih referenci na `economy/ducat-v1.png`, od kojih su dve tehničke reference za preload/mapiranje, a ostale su korisnički vidljive upotrebe.

## Mesta koja trenutno dobijaju stari SVG preko helpera

`dukatIconHtml()` nema Green/dark granu. Zbog toga približno dvadeset poziva i 32 prevedena stringa mogu u Green temi prikazati stari SVG umesto A1 mastera. Obuhvaćeni su:

- nagrade i kazne Kvartalne lige;
- prijava, odjava i nagrade Turnira;
- popup trofeja i ukupna trophy nagrada;
- online nagrade i toast poruke;
- cene u Riznici;
- rewarded-ad obaveštenja;
- završni ekran i dupliranje Solo nagrade;
- Daily Challenge rezultati;
- tehničke online pobede i druge prevedene poruke sa `{DUKAT_ICON}`.

## Potrebne izmene u sledećim koracima

1. Potvrditi ili doraditi A1 kao jedini Green dukat master.
2. Iz mastera izvesti UI, inline i particle verziju bez ponovnog generisanja simbola.
3. Dodati Green granu u `dukatIconHtml()` i time pokriti sve dinamičke poruke.
4. Gold Rain i Royal Yamb u Green temi prebaciti na particle izveden iz kanonskog mastera; ostale teme ostaju izolovane.
5. Prerenderovati A2, A3, A4, A5, A8, A10 i A13 tako da svaki prikaz valute koristi isti dukat.
6. Preview Zlatne kiše u Green temi vezati za isti particle asset.
7. Uvesti automatsku proveru da Green kod ne koristi legacy dukat na mestima gde je aktivna Green tema.

## Van opsega ovog podkoraka

- medalje i rank bedževi;
- Undo token, osim očuvanja njegovog postojećeg identiteta u zajedničkim kompozicijama;
- trofeji koji su nagrade/dostignuća, a ne valuta;
- asseti drugih tema.

