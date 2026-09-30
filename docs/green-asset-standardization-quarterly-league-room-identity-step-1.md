# Green Asset Standardization — Quarterly League Room Identity, Korak 1

## Opseg i zaključak inventara

Ovaj korak je statički vizuelno-semantički i tehnički audit **glavnog romb logotipa Kvartalne lige**. Aktivne slike, putanje, CSS, motion, preload, pravila, bedževi, navigacija i medalje nisu menjani. Dodati su samo ovaj dokument, audit tabla i reprodukcijska skripta.

Jedan odobreni glineni znak već se koristi u sobi i meniju: forest-green zaobljeni romb sa toplim ivory obodom, četiri terracotta glinena pina, izdignutim natpisima „YotB” i „QL” i urezanom Yamb tabelom u pozadini. Obod je **sastavni deo traženog romb logotipa**, a ne generička kvadratna podloga koju treba ukloniti. Izvor ima transparentne spoljne uglove. Nema dokaza o drugoj aktivnoj Green `pro` ili konkurentskoj verziji glavnog logotipa.

Vizuelna tabla je `docs/green-asset-standardization-quarterly-league-room-identity-audit.png`. Skripta `scripts/make-green-quarterly-league-room-identity-audit-sheet.py` prikazuje postojeće slike, primere njihovih CSS veličina, proverava RGBA/alpha i ispisuje dimenzije, bajtove, SHA-256 i poređenje derivata. Prikaz watermarka na tabli samo približno primenjuje opacity `0,18`; ne reprodukuje CSS filtere, stvarnu pozadinu, animaciju ni Android emulator.

## Jedan glavni znak, dve isporuke

| Uloga | Putanja pod `www/assets/green-soft-clay/` | Dimenzija | Potrošači |
|---|---|---:|---|
| room | `quarterly-league-yotb-ql-free-v2.png` | `512×512` | intro, zaglavlje sobe, pobednički popup, Pravila, sobni asset katalog |
| menu | `runtime/menu/quarterly-league-yotb-ql-free-v2.png` | `384×384` | CSS watermark glavne kartice i startup preload |

Izvor je `source-assets/green-soft-clay-hires/quarterly-league-yotb-ql-free-v2.png`, `1254×1254`. LANCZOS `1254→512` jeste pixel-identičan aktivnoj room slici, a `512→384` aktivnoj menu slici. Direktno `1254→384` **nije** pixel-identično, pa budući kanonski build mora očuvati dvostepeni postupak. Nema opravdanja za novu generaciju ili promenu oblika logotipa u ovom inventaru.

Doslovne Green reference su: `www/index.html` intro; `www/kvartalnaliga.js` zaglavlje; `www/game.js` room katalog, pobednički popup i eksplicitni menu watermark preload; `www/teme.css` CSS watermark; `www/pravilaigre.js` Green mapiranje. SVG i Easter/Desert/Nebula reference na istim mestima jesu namerne druge teme, ne Green duplikati. U Pravilima jedno Green mapiranje pokriva naslov Kvartalne lige i tekst kvartalnog obračuna u srpskoj i engleskoj verziji; zasebni podium trio ostaje medalja.

## Stvarni prikazi, intro i motion

- Glavna kartica: `86×86` CSS background watermark, `contain`, opacity `0,18`, blagi filter/senka, bez samostalne animacije. Tekst ranga, bodovi i progress su živi UI podaci iznad watermarka. Kartica ima postojeći press odgovor `0,98→1`; ne dodavati talasni efekat donjeg reda.
- Poseban Green league intro: logo u `clamp(210px, 34vmin, 290px)`, `contain`, sa `easterRoomIconPulse 1,8 s`; naslov je skriven, tako da se slova ne dupliraju. Soba se otvara iza overlay-a nakon `3,65 s`, a overlay nestaje nakon `4,6 s`. Postojeći `prefers-reduced-motion` gasi animacije.
- Zaglavlje modalne sobe: isti room logo `42×42`, `contain`.
- Pobednički popup: isti room logo `96×96`, `contain`. Zlatna kvartalna medalja ispod njega ostaje zaseban, već zaključan znak nagrade.
- Pravila: isti room logo je inline ikona uz naslov i kvartalni obračun; Green pravila koriste baznu meru `1,42em`, odnosno `1,62em` za `rules-asset-icon--png`. To je stil prikaza, ne zaseban PNG identitet.

## Semantičke granice — već zaključano

1. Glavni „YotB / QL” romb označava **celu sobu i ligu**, a ne rang, tab akciju ili osvojenu medalju.
2. Četiri ikonice `canonical/quarterly-navigation/` označavaju tabove liga, Kuća slavnih, medalje i šampioni. `tab-league` je grafikon sa zvezdom; čak ni on nije zamena za glavni room logo. Porodica i putanje su već zaključane.
3. Šest `canonical/quarterly-rank-badges/` PNG-ova označava `amater`, `profi`, `majstor`, `legenda`, `titan` i `alltime`. Bedž `majstor` takođe ima romb, ali je to znak **jednog nivoa ranga** sa krunom, ne drugi logo lige. Porodica je već zaključana.
4. Tri `canonical/competition-medals/quarterly-league-{gold,silver,bronze}-v1.png` označavaju kvartalni podium. Zlatna je na audit tabli kao uzorak. Ne stapati ih sa glavnim rombom ili ikonama tabova; porodica je već zaključana.
5. U zaglavlju tabele, titulama, bodovima, live rangu, stanju sezone i pravilima obračuna podaci ostaju postojeći funkcionalni UI. Asset standardizacija ne sme menjati geometriju sobe, rang pragove, podatke ili dužinu intra.

## Tehnički inventar

| Asset | Dimenzija / bajtova | SHA-256 |
|---|---:|---|
| `source-assets/green-soft-clay-hires/quarterly-league-yotb-ql-free-v2.png` | `1254×1254 / 1.263.658` | `4b5f7c66d8a4cd7a859e355d12efc6cec5adfa546d77b78129283f575b4b6597` |
| `www/assets/green-soft-clay/quarterly-league-yotb-ql-free-v2.png` | `512×512 / 217.526` | `87a0a07b5abf5abc9dfa58a5265665fd2d1b81f62c48e692cfa0ffe4657a7ed4` |
| `www/assets/green-soft-clay/runtime/menu/quarterly-league-yotb-ql-free-v2.png` | `384×384 / 136.653` | `f21cece394a0184082aaaa7ed7fa327d3beedd360c1f01383002965bd96191bb` |
| `www/assets/green-soft-clay/canonical/quarterly-navigation/tab-league-v1.png` | `256×256 / 29.593` | `f40a3b7929a00158136f08df1520492d0a3917dfd3082a82c36a6167c72b27a2` |
| `www/assets/green-soft-clay/canonical/quarterly-navigation/tab-champions-v1.png` | `256×256 / 63.985` | `a4274e7e793e34f7c7797d2b6eceda11850de2949ab62d072e7841f5698d1a8b` |
| `www/assets/green-soft-clay/canonical/quarterly-rank-badges/rank-majstor-v1.png` | `384×384 / 136.674` | `eb47e9946a7d8f5682ae1d5251b61613561b59151038cc840d0bbc5795ee7f2e` |
| `www/assets/green-soft-clay/canonical/competition-medals/quarterly-league-gold-v1.png` | `256×256 / 61.215` | `103af0ef4870d349e8309e2f4cfe27b1c3392c472c65fb42a8ed50ca6cbfa436` |

Svih sedam proveravanih PNG-ova je RGBA, alpha opsega `0–255`, sa potpuno providna četiri ugla. Upoređeni navigacioni, rang i medalja PNG-ovi su ilustracije granice, ne kandidati za migraciju ove porodice.

## Preload i performanse — zatečeno stanje

Green startup konfiguracija broji menu watermark, ne room logo: `17 PNG / 4,56 MB / 20,44 MB decoded`. Ukupan Green runtime je `162 PNG / 14.792.994 B` (`14,11 MB`); manifest/cache verzija je `54`.

`openModal()` pokreće `prepareThemeRoomAssets('quarterlyLeague')`, zatim čeka preload šest rank bedževa pre intra. Stvarni `getThemeRoomSources('dark','quarterlyLeague')` trenutno vraća **četiri** PNG-a: glavni room logo i tri kanonske kvartalne podium medalje (`393.393 B / 1.835.008 decoded B`). Navigacione ikonice i rank bedževi nisu u tom užem matcher rezultatu; rank bedževe zasebno učitava resolver sobe. Širi statički obračun cele QL oblasti — glavni logo, četiri taba, šest rangova i tri medalje — ima `14 PNG / 1.466.088 B / 6.422.528 decoded B`. To nije tvrdnja da se svih 14 istovremeno preuzima istom metodom.

U VM proveri stvarnih metoda primećena je precizna razlika: sa prisutnim `#main-menu` startup izvor za glavni QL znak je samo eksplicitni `384` px watermark; **bez** tog DOM korena fallback trenutno ubacuje i `512` px room sliku jer generički regex hvata `quarterly-league` u `pack.assets`. To nije kvar vidljivog DOM toka i nije menjano u Koraku 1, ali u integracionom Koraku 3 treba precizirati fallback tako da startup ne preuzima room kopiju. Sobni `512` px logo mora ostati u on-demand putanji.

`node scripts/check-js.js` i `node scripts/check-theme-performance.js` prolaze. Provere su statičke/VM; nisu merenje FPS-a niti pregled na Android emulatoru.

## Sledeći korak

Korak 2 treba da formira kanonski `quarterly-league-room-identity` paket iz postojećeg odobrenog izvora, sa reprodukcijskim dvostepenim LANCZOS buildom, room `512×512`, menu `384×384` i manifestom sa SHA-256 otiscima. Aktivne putanje i Green registry ostaju netaknuti do integracionog Koraka 3, kada se povezuju svi potrošači i precizira startup fallback, a zatim proveravaju nula legacy UI veza i tek tada razmatra uklanjanje starih runtime kopija. Korak 4 je završni audit i zaključavanje.

Korak 1 ne zaključava celu sobu. Nije rađen commit, objavljivanje niti pokretanje emulatora.
