# Green Asset Standardization — Solo Room Identity, Korak 3

## Ishod

Kanonska Green Solo figura povezana je sa glavnim menijem, startup tokom, 4,6-sekundnim icon-only introm i Solo room-on-demand paketom. Source manifest i centralni registar imaju status `standardized`; završni audit i `locked` status ostaju za Korak 4.

Nije renderovana nova ikona niti su promenjeni njeni pikseli. Room `512×512` i menu `384×384` isporuke ostaju bajt-po-bajt jednake odobrenim kopijama. Sačuvani su prikaz `68×68` (`60×60` na uskom portretu), postojeći hover/press transformi, intro `clamp(210px, 34vmin, 290px)`, pulse `1,8 s`, otvaranje igre iza overlay-a posle `3,65 s`, trajanje `4,6 s` i reduced-motion zaštita.

## Povezani potrošači i izolacija

| Potrošač | Kanonska isporuka | Sačuvano ponašanje |
|---|---|---|
| Glavna Solo kartica | `solo-room-menu-v1.png` | postojeća mera, providna podloga i card motion |
| Startup sa ili bez main-menu DOM-a | `solo-room-menu-v1.png` | tačno jedna `384 px` slika; room kopija se ne učitava |
| Solo intro | `solo-room-v1.png` | postojeći icon-only motion i tajming |
| Solo room-on-demand | `solo-room-v1.png` | room figura uz četiri izdvojena rezultatska/nagradna asseta |

`www/game.js` sada drži `solo-room-v1.png` u sobnom katalogu i `solo-room-menu-v1.png` u odvojenom `menuAssets` fallback katalogu. Startup regex eksplicitno prepoznaje samo menu varijantu. Solo room matcher eksplicitno prepoznaje samo room varijantu, uz zaključani `canonical/solo-results/` i postojeći `solo/` reward asset. Stvarni VM pozivi potvrđuju pet izvora u Solo sobnom paketu (`373.688 B / 2.424.832 decoded B`) i odsustvo menu slike iz tog paketa.

U redovnom DOM toku menu PNG dolazi sa Solo kartice. U rezervnom toku bez `#main-menu` dolazi iz `menuAssets`; deduplikacija daje tačno jednu kopiju. Green Solo putanje ne ulaze u Easter, Desert ili Severna startup/room tokove.

## Završni ekran i semantičke granice

Istorijski `<img class="green-solo-result-mark">` bio je stalno sakriven Green CSS-om i duplirao identitet ulaska u sobu na završnom ekranu. Uklonjen je iz DOM-a zajedno sa dva neupotrebljiva CSS selektora. Vidljivi final-score znak ostaje `canonical/solo-results/finish-score-mark-v1.png`; Personal Best i Finish Claim ostaju druge zaključane Solo Results ikonice. Rewarded Video/dukat kompozicija, Hotseat Winner i tri druga moda nisu menjani.

Ovo ne menja bodovanje, čuvanje partije, high-score logiku, claim/double-reward tok, nagrade, tablu, login ili gameplay geometriju.

## Registry, cache i uklonjene kopije

`soloRoomIdentity` je dodat u `www/themes/green/asset-registry.json` sa istim DNK-om kao source manifest, dve kanonske isporuke, SHA-256 otiscima, semantičkim izuzecima, zabranjenim starim putanjama i istorijskim mapiranjem zamena. Green theme/cache verzija povećana je `55→56`; ranije porodice zadržavaju svoje istorijske integracione verzije.

Nakon potvrđenih nula aktivnih starih UI referenci uklonjene su samo dve praćene i bajt-po-bajt duplirane runtime kopije:

- `www/assets/green-soft-clay/mode-solo-free-v2.png` — `156.807 B`;
- `www/assets/green-soft-clay/runtime/menu/mode-solo-free-v2.png` — `93.182 B`.

Kanonske zamene, odobreni hires izvor i master ostaju sačuvani. Dve uklonjene kopije su dodatno povratljive iz Git istorije. Build skripta je uspešno ponovljena posle njihovog uklanjanja, a audit skripta i tabla sada čitaju kanonske isporuke.

## Performance i provere

Green runtime se posle privremenog Koraka 2 vratio sa `164` na `162 PNG`, odnosno `14.792.994 B` (`14,11 MB`). Startup ostaje `17 PNG / 4,56 MB / 20,44 MB decoded`; zamena putanje nije povećala startup budžet. Najveći Green paket ostaje Riznica.

`scripts/check-theme-performance.js` proverava oba registra, DNK, dimenzije, alpha, fiksne otiske, dve kanonske isporuke, četiri kanonske kodne reference, nula starih referenci i odsustvo obe stare datoteke. Dodatno izvršava stvarne startup i room metode u izolovanom VM-u i štiti postojeće Solo mere/motion, odvojene zaključane porodice i izolaciju drugih tema.

Korak 3 je završen. Korak 4 je završni vizuelni, semantički i tehnički audit, nakon kog porodica može dobiti status `locked`. Nije rađen commit, objavljivanje niti pregled u Android emulatoru.
