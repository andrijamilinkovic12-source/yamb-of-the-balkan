# Medalje Svetlog zlata — pojedinačne PNG ilustracije

**Status: privremeno, nije prihvaćeno.** Paket je tehnički povezan, ali je rad na medaljama zaustavljen dok se ne standardizuje identitet svih soba. Posebno, motiv turnirske medalje mora biti isti kanonski pehar turnira u tri ranga. Ovaj paket treba uskladiti pre prihvatanja.

Ovo je prvi paket u ponovnoj izradi posle trofeja. Sadrži 18 zasebnih master PNG-ova sa transparentnom pozadinom: šest takmičenja × tri ranga. Svako takmičenje ima sopstvenu siluetu, a rangovi unutar istog takmičenja čuvaju istu ikonografiju.

| Takmičenje | Prepoznatljiv motiv |
|---|---|
| Kolekcija | Reljefni kovčežić sa dukatima od pet tačaka |
| Rang lista | Podijum i strelica |
| Turnir | Pehar u štitu |
| Kvartalna liga | Četiri režnja i kockica sa pet tačaka |
| Indeks moći | Rastući stubići |
| Vatreni niz | Stilizovani plamen |

**Način izrade:** ugrađeni ImageGen, po jedan poziv za svaki novi motiv i varijantu ranga. Osnovni opis: 3D Soft Neomorphism u pravcu Smooth Rubber / Matte Plastic; paleta Svetlog zlata (`#E6BE83`, `#FFF1D7`, `#875024`, `#76612B`); čist, čitljiv reljef, bez teksta, šljokica, kitnjastih ukrasa i pozadine. Srebrni i bronzani rangovi izvedeni su uređivanjem odgovarajućeg zlatnog mastera uz očuvanje siluete i centralnog motiva. Srebrni koristi toplu slonovaču i biserno sivu, bronzani prigušenu terakotu.

Masteri i hash zapisi su u `source-assets/theme-icon-packs/light/medals-v3-imagegen/`. Skripta `scripts/import-light-medals-v3.py` centrira vidljiv oblik u standardni RGBA PNG 256 × 256 px. Kanonske putanje u `www/assets/theme-packs/light/canonical/` zadržavaju uloge postojećih potrošača, uz verziju učitavanja `v=3` samo za ovu temu.

[Vizuelni pregled 18 medalja na velikoj i 44 px veličini](theme-medals-light-v3-review.png). Statičke provere potvrđuju format, dimenzije i povezivanje. Korisnički izbor i prikaz na stvarnom ekranu takmičenja još čekaju pregled.
