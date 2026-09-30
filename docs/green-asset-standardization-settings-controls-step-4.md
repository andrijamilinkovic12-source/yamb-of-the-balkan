# Green Asset Standardization — Settings Controls, Korak 4 (završni audit)

## Rezultat

Porodica `settingsControls` je zaključana u [source manifestu](../source-assets/green-soft-clay-canonical/settings-controls/manifest.json) i [centralnom registru](../www/themes/green/asset-registry.json). Osam funkcionalnih simbola zadržava odobreni 3D Soft Clay Neumorphism DNK: šumsko-zelenu, toplu ivory i uzdržanu terracotta paletu, mat glinenu dubinu i slobodnu siluetu bez teksta ili kvadratne podloge. [Završna audit tabla](green-asset-standardization-settings-controls-audit.png) poredi 1254 px master sa tačnom 256 px canonical isporukom i pokazuje stvarne prikaze od 20, 25 i 18 px. Mali pravni simboli ostaju uz tekstualne oznake, ne nose značenje sami.

Glavni zupčanik Podešavanja (`settingsRoomIdentity`) je zaseban zaključan identitet za meni, intro i zaglavlje. Ovih osam oznaka unutar sobe su statične; ne predstavljaju stanje prekidača, sačuvane vrednosti, korisničke podatke ili sadržaj pravnih linkova. `profile` i `privacy` zadržavaju iste odobrene motive i u Pravilima.

## Zatvorene provere

| Provera | Rezultat |
|---|---|
| Izvor i isporuka | osam `1254 × 1254` RGBA mastera i osam `256 × 256` RGBA canonical PNG-ova; svi SHA-256 i bajtovi provereni |
| Reprodukcija | direktno LANCZOS smanjenje sa providnim uglovima i punim alpha opsegom reprodukuje tačne odobrene runtime bajtove, i bez starih kopija |
| Produkcione veze | 18 canonical referenci: 8 ekran, 8 sobni katalog, 2 Pravila; 0 starih referenci |
| Stare kopije | osam `settings/*.png` putanja zabranjeno u registru i odsutno iz shipped `www`; masteri ostaju za oporavak |
| Druge teme | svih 8 odgovarajućih Easter, Desert i Severna ikonica ostaje povezano u HTML-u |
| Učitavanje | Settings soba `9 PNG / 554.053 B / 3.145.728` dekodiranih B; startup `17 PNG / 4,56 MiB / 20,44 MiB` dekodirano; kontrole su van startup-a |
| Coverage | Green `162 PNG / 14.792.994 B`; `145` registrovanih, `16` zaštićenih, `1` foundation; `0` staged i `0` pending |
| Cache | Green manifest verzija `63`; drugi tematski paketi nisu prošireni ovim ikonama |

CSS veličine, `object-fit: contain`, Settings ekran, tekst, pravni URL-ovi, intro motion i korisnička podešavanja nisu menjani. Zaključane semantičke granice i mapiranje osam povučenih putanja ostaju u registru. `scripts/check-theme-performance.js` i `scripts/check-green-asset-coverage.js` sada zahtevaju `locked` status i proveravaju veze, otiske i paket; `npm test` prolazi.

Ovaj korak uključuje statički vizuelni audit i automatizovane provere, ne fizički pregled na Android emulatoru. Nije rađen commit niti objavljivanje.
