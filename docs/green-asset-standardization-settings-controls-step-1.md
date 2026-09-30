# Green Asset Standardization — Settings Controls, Korak 1

## Odluka i opseg

Osam preostalih Green PNG-ova su funkcionalne ikonice unutar Podešavanja, ne glavni znak sobe. [Audit tabla](green-asset-standardization-settings-controls-audit.png) upoređuje svaki odobreni 1254 px izvor sa aktivnom 256 px isporukom i prikazuje stvarnu veličinu u interfejsu. Postojeće siluete su jasne i ujednačene u forest-green, warm-ivory i terracotta 3D Soft Clay Neumorphism stilu; nov render nije potreban. Nijedna ikonica nema kvadratni ram ili pozadinsku pločicu.

Ovo je inventar i vizuelno-semantički audit. Aktivni PNG-ovi, masteri, UI i CSS putanje, podešavanja, sobni preload, cache verzija `62` i registar nisu menjani. Ovih osam PNG-ova su i dalje `pending`, ne canonical porodica.

## Jedna funkcija — jedan motiv

| Ikonica | Značenje i vizuelni motiv | Mesto u Podešavanjima | Prikaz | Dodatna upotreba |
|---|---|---|---:|---|
| `profile-v1.png` | osoba sa malim zupčanikom: profil i nalog | naslov sekcije | 20 px | inline znak profila u Pravilima |
| `sound-v1.png` | megafon sa zvučnim talasom: efekti | red prekidača | 25 px | nema |
| `music-v1.png` | muzička nota: muzika | red prekidača | 25 px | nema |
| `vibration-v1.png` | telefon sa vibracionim talasima | red prekidača | 25 px | nema |
| `display-theme-v1.png` | paleta boja: prikaz i tema | naslov sekcije | 20 px | nema |
| `language-v1.png` | globus u govornom oblačiću: jezik | isti naslov sekcije | 20 px | nema |
| `terms-v1.png` | dokument sa pečatom: uslovi | pravni link | 18 px | nema |
| `privacy-v1.png` | štit sa ključanicom: privatnost | pravni link | 18 px | inline znak privatnosti u Pravilima |

`profile` i `privacy` imaju po tri produkcione reference: `www/index.html`, Settings sobni paket u `www/game.js` i Green mapu u `www/pravilaigre.js`. Ostalih šest ima po dve: ekran i sobni paket. Ikonice su statične oznake, a ne animirani ON/OFF prikazi. Stanje prekidača, vrednosti naloga, odabrana tema/jezik i sadržaj pravnih linkova ostaju u postojećim kontrolama; PNG ne kodira te podatke. Glavni zupčanik `settingsRoomIdentity` je zasebna, već zaključana porodica i nije kandidat za ovu grupu.

## Tehnički inventar

Svaki master je `1254 × 1254` RGBA u `source-assets/green-soft-clay-hires/settings/`, a aktivna datoteka `256 × 256` RGBA u `www/assets/green-soft-clay/settings/`. Kod svih osam izvor → runtime je piksel-po-piksel identičan direktnom LANCZOS smanjenju celog providnog platna. Puni alpha opseg i četiri potpuno transparentna ugla su potvrđeni. CSS koristi `object-fit: contain`; veličine su 20, 25 ili 18 px, prema ulozi.

| ID | Master B | Master SHA-256 | Runtime B | Runtime SHA-256 |
|---|---:|---|---:|---|
| `profile` | 807.043 | `a6bf8e46a6ac89249aa0400dbec86a7efd4e01efa22f2657ca19a0fbb2772461` | 40.077 | `4d9dbbce33cecc87901eabdb67719b9f8253526a8f5df7340fb9dfda50b901c4` |
| `sound` | 797.913 | `a53fdcd89e0ca31a949808d4fe1137f9529fb00fbbc973d811a136f3b29f1b9f` | 41.850 | `0b5a470fb79fc8e8805a4a627a88d4639aafc68ee631ff1d9f9ab0c8561a7ce4` |
| `music` | 608.863 | `9dd53e944a937547c883f406089f58c16e494272c9d8c17c4cce2056f9c76ad8` | 31.850 | `8c81adfd83a6389ef5c5f55ab098e36610e1a11427731bbaad1edfb9468bd88f` |
| `vibration` | 866.300 | `028339d0c92a881096026bfce9d607e982129d3206a60bae111be753e576268a` | 42.238 | `893e80c00e4cf4432bd7fcd9cba2deeeee96807faf7ce95c7421c28ee6b871c0` |
| `display-theme` | 1.190.402 | `10b61a698a5a7667f8253fe098ec3bd8ef1b7bd0ea5d943e3949af383504b00d` | 57.344 | `9c9332adbc012cbd3211bf4c909437d09cc1a10ee960d683e00fdea81ea5669a` |
| `language` | 923.063 | `ce9196112ef4a688e1f922b23230bc4d4f8ea3f24f3989f31dc9e8cc9380dcee` | 47.659 | `ea983bc0e7b24162e7682897fdd6cbe4da45a5383664297eb76a29fb70f0b742` |
| `terms` | 1.053.642 | `2fc6173c8fdefa0602f91b0017e57a79351e2d2ce885a0876ed9b7e57aa1d5d9` | 50.701 | `07cebe403288e99f12c63e1f3afa2fb5de884cc6387514f82e28e7de71c2ebc5` |
| `privacy` | 927.823 | `d10f9f8275165593c52c5d37908dbf35ec5407b87bfc70d45fb305155806f803` | 46.345 | `4118758bdf0cc8798654c48f4d15a05e28124426d61f3d4f404d629dada3a48b` |

Zbir aktivnih osam je `358.064 B`. Settings sobni paket ostaje `9 PNG / 554.053 B / 3.145.728` procenjenih dekodiranih bajtova; ove male ikonice se učitavaju pri ulasku u sobu, ne u startup paketu.

## Nastavak

Korak 2 treba da formira jednu `settingsControls` canonical porodicu iz ovih osam odobrenih mastera i da izda identične 256 px canonical PNG-ove, bez promene aktivnih referenci. Korak 3 prebacuje ekran, sobni paket i dve reference u Pravilima; stare kopije se uklanjaju tek posle provere da nema preostalih referenci. Završni audit potom zaključava porodicu i ponovo meri paket i cache. Glavni room zupčanik se ne menja.

`scripts/make-green-settings-controls-audit-sheet.py` reprodukuje tablu `1480 × 974` i proverava otiske, format, alpha i tačno umanjenje. `scripts/check-theme-performance.js` štiti inventar i trenutne UI veze. Ovo nije pregled na Android emulatoru; nema commita ni objavljivanja.
