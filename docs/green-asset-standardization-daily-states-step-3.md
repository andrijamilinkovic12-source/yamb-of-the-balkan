# Green Asset Standardization — Daily States, Korak 3

## Ishod

Canonical `daily-states` paket je povezan sa svim aktivnim Green potrošačima. `task`, `complete` i `already-played` sada koriste putanje iz `canonical/daily-states/`, a source manifest i centralni registar imaju status `standardized`. Završni vizuelni, semantički i tehnički audit i `locked` status ostaju za Korak 4.

Nijedan asset nije ponovo renderovan niti vizuelno promenjen. Canonical PNG-ovi su isti odobreni `384 × 384` RGBA sadržaji iz Koraka 2.

## Povezani potrošači

| Stanje | UI prikaz | Room-on-demand | Sačuvana mera |
|---|---|---|---:|
| `task` | aktivna kartica zadatka | Daily paket | `44 × 44` |
| `complete` | rezultat uspešno završenog izazova | Daily paket | `58 × 58` |
| `already-played` | već odigran izazov i replay lock | Daily paket | `104 × 104` |

Svako stanje ima tačno dve pune canonical kodne reference: jednu u `www/dnevniizazov.js` i jednu u Daily room-on-demand katalogu u `www/game.js`. Stare putanje imaju nula aktivnih kodnih referenci.

## Room-on-demand i startup izolacija

Daily matcher sada eksplicitno prepoznaje `canonical/daily-states/`. Daily paket zato i dalje sadrži tačno pet PNG-ova:

1. canonical Daily room identitet;
2. canonical `task` stanje;
3. canonical `complete` stanje;
4. canonical `already-played` stanje;
5. postojeću Rewarded Video kompoziciju.

Paket ostaje `660.910 B` kompresovano i `3.407.872 B` procenjeno dekodirano. Canonical state glyph-ovi nisu dodati startup-u; startup ostaje `17 PNG / 4,56 MB / 20,44 MB decoded`.

## Funkcionalna i semantička zaštita

- Daily state glyph-ovi ostaju statični.
- `dailyDicePulse 0,32 s` ostaje vezan samo za rolling kockice.
- Prikazne mere `44`, `58` i `104` piksela nisu menjane.
- Daily Room Identity ostaje poseban glavni znak sobe.
- Rewarded Video i canonical dukat ostaju zasebne zaključane porodice.
- Eligibility, server-selected dice, bodovanje, nagrada, already-played i replay-lock logika nisu menjani.

## Registry, cache i stare kopije

`dailyStates` je dodat u `www/themes/green/asset-registry.json` sa:

- tri canonical runtime isporuke i njihovim SHA-256 otiscima;
- istim DNK-om i semantičkim granicama kao source manifest;
- zabranom tri stare putanje;
- istorijskim mapiranjem svake stare kopije na canonical zamenu;
- četiri jasna code-binding opisa.

Green theme/cache verzija povećana je `59 → 60`. Ranije porodice zadržavaju svoje istorijske integracione cache verzije.

Nakon potvrđenih nula aktivnih legacy referenci uklonjene su samo tri bajt-po-bajt identične runtime kopije:

- `www/assets/green-soft-clay/daily/task-v1.png` — `106.757 B`;
- `www/assets/green-soft-clay/daily/complete-v1.png` — `117.989 B`;
- `www/assets/green-soft-clay/daily/already-played-v1.png` — `118.655 B`.

Canonical runtime, tri canonical mastera i tri odobrena high-resolution izvora ostaju sačuvani. Uklonjene kopije su povratljive iz Git istorije.

## Performance i coverage

Posle privremenog Koraka 2 Green runtime se vratio sa `165` na `162 PNG`, odnosno sa `15.136.395 B` na `14.792.994 B` (`14,11 MiB`). Nema trajnog dupliranja niti promene dekodirane memorije Daily paketa.

Globalni coverage sada evidentira:

- `29` registrovanih porodica: `28 locked` i `1 standardized`;
- `130` centralno registrovanih PNG-ova;
- `16` manifestom zaštićenih funkcionalnih PNG-ova;
- `1` theme-foundation PNG;
- `15` kandidata u preostale tri canonical grupe;
- `0` staging ili neklasifikovanih PNG-ova.

Reproducibilni build više ne zavisi od uklonjenih legacy kopija: iz odobrenih mastera ponovo proizvodi sva tri očekivana canonical SHA-256 rezultata.

## Automatska kontrola

`check-theme-performance.js` i `check-green-asset-coverage.js` proveravaju:

- standardized manifest i registry status;
- kompletan canonical katalog i registry mapiranje;
- byte-identical source/master parove i zaključane runtime otiske;
- tačno šest canonical i nula aktivnih legacy veza;
- odsustvo tri zabranjena runtime fajla;
- očuvane prikazne mere, motion i reduced-motion granice;
- petočlani Daily room paket i nepromenjen startup;
- cache verziju `60` i finalni audit koji je namerno ostavljen za Korak 4;
- potpunu coverage klasifikaciju svih `162` Green runtime PNG-ova.

## Sledeći korak

Korak 4 je završni vizuelni, semantički i tehnički audit. Posle njegove potvrde `dailyStates` source manifest i centralni registry mogu preći iz `standardized` u `locked` bez nove promene runtime piksela.

Nije rađen commit, objavljivanje niti pregled u Android emulatoru.
