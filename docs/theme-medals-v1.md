# Medalje tema — DNK revizija 2

**Status:** ovo je istorijski zapis tehničke revizije 2, ne vizuelno prihvaćen standard. Novo pravilo u `theme-definitions.json` zahteva da motiv medalje bude isti kanonski predmet kao u odgovarajućoj sobi, u sve tri rang varijante. Pravilo važi i za prvo obrađeno Svetlo zlato i za Zelenu temu. Izrada novih medalja je pauzirana do standardizacije soba.

## Obuhvat

Svih deset tema ima po 18 kanonskih PNG medalja, ukupno 180. Šest namena imaju zasebne medalje za zlato, srebro i bronzu: kolekcija u Riznici, Top-lista, Turnir, Kvartalna liga, Indeks snage i Vatreni niz. Svako takmičenje ima svoj znak i siluetu. Unutar jedne teme ista kombinacija namene i ranga svuda koristi istu datoteku.

Devet nezelenih tema ima po 18 novih PNG-ova. Za Zelenu su zadržane postojeće tri medalje kolekcije, tri Top-liste i tri Kvartalne lige; njenih devet naknadno dodatih medalja za Turnir, Indeks snage i Vatreni niz prerađeno je u njenom stilu. Ukupno je u ovoj DNK reviziji zamenjeno 171 produkcionih PNG-ova.

## Standard

- Produkcija: 256 × 256 px, PNG RGBA sa providnom pozadinom. Izvorni masteri su 768 × 768 px.
- Stil, pravac i ograničena paleta prate definiciju svake teme; ukras je sveden da medalja ostane čitljiva i u malom prikazu.
- Geometrija prikaza na ekranima prati Zelenu temu; medalje ne menjaju dimenzije kartica.
- V1 medalje imale su previše zajedničkih apstraktnih znakova. Revizija 2 koristi šest zasebnih motiva iz **iste teme**: Riznica, Top-lista, Turnir, Kvartalna liga, Indeks snage i Vatreni niz. Materijal, lice medalje i silueta prate DNK paketa. Motivi se ne preuzimaju iz druge teme. Svih 180 produkcionih PNG-ova ima različit SHA-256; hash sam po sebi nije dokaz vizuelne originalnosti.
- Kanonska putanja se određuje funkcijom `getThemeMedalSource(context, tier, theme)` u `www/config.js`. Koriste je Riznica, Top-lista, Turnir, Kvartalna liga, Pravila, Indeks snage, Vatreni niz i završni/prateći prikazi u `www/game.js`.
- Kanonski PNG-ovi su u `www/assets/theme-packs/<tema>/canonical/{collection-medals,competition-medals}/`. Zelena koristi `www/assets/green-soft-clay/canonical/`.

## Evidencija i pregled

Katalog sada ima 186 obaveznih PNG uloga po temi (ranije 177). Implementacija i mesta upotrebe su upisani u `theme-asset-implementation-map.json`, `theme-asset-role-catalog.json` i `theme-asset-usage-map.json`. Izvorni masteri i manifesti su u `source-assets/theme-icon-packs/<tema>/medals-v1/`. Pregled svih setova je u [theme-medals-review.html](theme-medals-review.html).

`node scripts/check-theme-medals.js` proverava broj, format, jedinstvenost, katalog, mastere i povezane potrošače. Izvor za reviziju 2 je `scripts/rebuild-theme-dna-medals-controls.py`; svaki manifest beleži iz kog aktivnog PNG-a **iste teme** potiče centralni motiv. Novi [Android qaLocal izveštaj](qa-theme-dna-medals-controls-emulator-2026-10-10.json) potvrđuje da se svih 18 PNG medalja učitava u svakoj od deset tema. Položaji u stvarnim rezultatima takmičenja i korisnički vizuelni izbor još nisu potvrđeni.
