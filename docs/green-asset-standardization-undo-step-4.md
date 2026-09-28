# Green Asset Standardization — Undo token, Korak 4

## Ishod

Završni globalni audit je prošao i porodica `undoToken` zaključana je statusom `locked` u `www/themes/green/asset-registry.json`.

Green tema sada ima jedan identitet potrošnog Undo tokena i jasno odvojene action glyph strelice. Buduća promena koja vrati staru putanju, ukloni kanonsku izvedenicu, promeni dimenziju ili alpha kanal, preskoči room preload ili zameni gameplay strelicu tokenom oboriće automatsku proveru.

## Potvrđene direktne veze

| Prikaz | Kanonska izvedenica | Rezultat |
|---|---|---|
| Zaglavlje ekonomije | `undo-token-front-v1.png` | povezano |
| Undo tab | `undo-token-front-v1.png` | povezano |
| Vaši tokeni | `undo-token-inline-v1.png` | povezano |
| Nagrada `+1` | `undo-token-inline-v1.png` | povezano |
| Naslov Vraćanje upisa u Pravilima | `undo-token-inline-v1.png` | povezano |
| Room-on-demand priprema | front + inline | povezano |

HTML sadrži tačno dve direktne `front` i dve direktne `inline` veze, što sprečava skrivenu alternativnu Green varijantu u sobi.

## Potvrđene složene veze

- `ducats-undo-free-v3.png` — intro i puna oznaka sobe;
- `runtime/menu/ducats-undo-free-v3.png` — optimizovana glavna menu ikona;
- `rules/pages/economy-treasury-v3.png` — kovčeg sa tri kanonska dukata i jednim kanonskim Undo tokenom.

Velika terracotta strelica oko dukata registrovana je kao `action glyph`, a ne kao potrošni token.

## Semantička izolacija

Završna provera potvrđuje da sledeći elementi nisu Undo tokeni:

- gameplay dugme `#btn-undo-move`, koje zadržava funkcionalni znak `↩️`;
- back i navigacione strelice;
- video play i unavailable-ad simboli;
- dukati, medalje, rank bedževi i trofeji.

## Zabranjene i uklonjene putanje

- `assets/green-soft-clay/economy/undo-token-v1.png`;
- `assets/green-soft-clay/ducats-undo-pro-v2.png`;
- `assets/green-soft-clay/rules/pages/economy-treasury-v2.png`.

One ne postoje u runtime paketu niti u aktivnom Green JS/HTML/CSS toku. High-resolution izvori su zadržani van `www` radi istorije i obnovljivosti.

## Performanse i validacija

- Green paket: 171 PNG / 16,91 MB.
- Startup: 17 PNG / 4,56 MB kompresovano i 20,44 MB decoded.
- Nijedna runtime ikona nije veća od dozvoljenih 768 px.
- Kanonski i složeni PNG asseti imaju direktan alpha kanal.
- Učitavanje ostaje room-on-demand; Undo paket nije dodat startup grupi.
- Svih devet projektnih provera prolazi.

## Zaključak

Standardizacija Undo tokena završena je kroz četiri koraka: audit, kanonski paket, standardizacija kompozicija i završno zaključavanje. Sledeća porodica može se obrađivati bez ponovnog otvaranja dukata ili Undo tokena, osim ako se uvodi nova funkcionalna upotreba koja mora biti evidentirana u registru.
