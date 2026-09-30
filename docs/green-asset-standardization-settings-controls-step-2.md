# Green Asset Standardization — Settings Controls, Korak 2

## Ishod

Pripremljena je canonical porodica za svih osam funkcionalnih ikonica u Podešavanjima. [Source manifest](../source-assets/green-soft-clay-canonical/settings-controls/manifest.json) precizno vezuje svaku ulogu, odobreni 1254 px izvor, sačuvani master i buduću 256 px canonical putanju. Glavni Settings room zupčanik ostaje zasebna zaključana porodica. Profil i privatnost ostaju predviđeni i za inline upotrebu u Pravilima.

| Uloga | Canonical PNG | Bajtova | Trenutni prikaz |
|---|---|---:|---:|
| Profil i nalog | `profile-v1.png` | 40.077 | 20 px |
| Zvučni efekti | `sound-v1.png` | 41.850 | 25 px |
| Muzika | `music-v1.png` | 31.850 | 25 px |
| Vibracija | `vibration-v1.png` | 42.238 | 25 px |
| Prikaz i tema | `display-theme-v1.png` | 57.344 | 20 px |
| Jezik | `language-v1.png` | 47.659 | 20 px |
| Uslovi | `terms-v1.png` | 50.701 | 18 px |
| Privatnost | `privacy-v1.png` | 46.345 | 18 px |

Masteri su u `source-assets/green-soft-clay-canonical/settings-controls/`, a canonical isporuke u `www/assets/green-soft-clay/canonical/settings-controls/`. Svaka canonical datoteka je **bajt-po-bajt identična** sadašnjoj aktivnoj ikoni; ništa nije vizuelno izmenjeno. Ponavljanje builda proverava SHA-256, dimenzije, RGBA alpha, transparentne uglove i direktno LANCZOS smanjenje sa PNG `optimize=True`, pa odbija prepisivanje ako postojeća datoteka odstupa. [Audit tabla iz Koraka 1](green-asset-standardization-settings-controls-audit.png) ostaje vizuelna referenca.

## Staging i granice

Novih osam PNG-ova dodaje privremeno `358.064 B` u shipped `www` stablo: sada je `170 PNG / 15.151.058 B`. To su neuvezane staging kopije, pa startup ostaje `17 PNG / 4,56 MiB / 20,44 MiB` procenjeno dekodirano, a aktivni Settings room paket `9 PNG / 554.053 B / 3.145.728` procenjenih dekodiranih bajtova. Coverage provera sada pokazuje `8 stagedCanonical` i `8 pending` starih aktivnih putanja. Centralni registar i cache verzija `62` ostaju nepromenjeni.

U Koraku 3 treba zameniti tačno osam referenci u Settings ekranu, osam u room-on-demand katalogu i po jednu dodatnu za profil i privatnost u Pravilima; zatim dodati canonical room matcher i registraciju porodice. Stare aktivne kopije uklanjaju se tek kada se dokaže da ih nijedan produkcioni potrošač više ne koristi. Korak 4 je završni audit, ponovno merenje i zaključavanje manifesta. Kontrole, vrednosti podešavanja, pravni linkovi, glavni zupčanik i sve druge teme ostaju netaknuti.

Nije rađen commit, objavljivanje niti pregled na Android emulatoru.
