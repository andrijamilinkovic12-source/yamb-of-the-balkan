# Solo mod — inventar i standardizacija

Datum: 16. oktobar 2026. Obuhvat: svih deset tema. Zelena je zaključana geometrijska i funkcionalna referenca.

## Kanonski PNG skup

| Uloga | Po temi | Stanje |
| --- | ---: | --- |
| Ikona Solo sobe u glavnom meniju | 1 | Ranije napravljena kanonska PNG ikona, zadržana |
| Ikona Solo intra | 1 | Ranije napravljena kanonska PNG ikona, zadržana |
| Lični rekord | 1 | Tri Green rezultatska identiteta su zaključana; za ostalih devet tema napravljeno je po jedno novo zasebno rešenje |
| Oznaka konačnog rezultata | 1 | Isti raspored kao Green, nova PNG slika po ostaloj temi |
| Preuzmi nagradu i izađi | 1 | Isti raspored kao Green, nova PNG slika po ostaloj temi |
| Nagradni video na završnom ekranu | 1 | Postojeći kanonski Rewarded Video identitet, poseban za svaku temu |
| **Osnovni Solo skup** | **6** | **Isti broj u svih deset tema** |

Tri nova rezultatska PNG fajla po nezelenoj temi čine **27 zasebno generisanih mastera i 27 produkcionih fajlova**. Masteri su 512 × 512, produkcioni fajlovi 256 × 256 RGBA. [Manifest sa poreklom i SHA-256](../source-assets/theme-solo-results-v1/manifest.json) i [vizuelni pregled na stvarnim dimenzijama](theme-solo-results-review.html) omogućavaju proveru svake uloge. Zelena nastavlja da koristi svoje zaključane kanonske fajlove.

Ovaj broj obuhvata identitet Solo moda i završne Solo uloge. Tabla, kockice, skinovi, gornji kontrolni panel i dugmad Bacaj/Najava već pripadaju svojim zajedničkim porodicama asseta i nisu ponovo brojani u ovih šest uloga. Broj skinova koji je trenutno dostupan jednom takmičaru zavisi od kupljenih i otključanih skinova, a ne od teme.

## Geometrija i ponašanje

- Lični rekord: 30 × 30 CSS px, samo kada Solo rezultat strogo prevaziđe rekord pre partije.
- Konačni rezultat: 42 × 42 CSS px uz stvarni broj poena.
- Preuzimanje nagrade: 29 × 29 CSS px; dugme zadržava `claimReward(false)`.
- Kartica rezultata, skala od šest koraka i dve podkartice imaju istu geometriju kao u zelenoj temi. Sve teme sada prikazuju iste Solo informacione uloge, dok boje, površine i kontrast ostaju tematski.
- Učitavanje tri PNG fajla se priprema pri ulasku u Solo. Završni DOM ne traži ih na početnom ekranu; pri promeni teme prethodni PNG se odmah uklanja.
- Stare Solo result putanje u vaskršnjem, pustinjskom i severnom HTML prikazu i Solo paketu više nisu aktivne. Generički Rewarded Video koristi jednu tematsku putanju po temi.

Provera: `npm run check:theme-solo-results`, `npm run check:js` i `npm run check:game-rules`. Ručni pregled završnog ekrana u pokrenutoj igri ostaje potreban za konačan vizuelni prihvat.
