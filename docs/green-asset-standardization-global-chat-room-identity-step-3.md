# Green Asset Standardization — Global Chat Room Identity, Korak 3

## Ishod

Kanonski `global-chat-room-identity` paket povezan je sa svim aktivnim Green potrošačima. Izvorni manifest i centralni registry imaju status `standardized`; završni audit i `locked` status ostaju za Korak 4.

Glavni razgovorni znak nije ponovo dizajniran. Kanonske room i menu isporuke imaju iste SHA-256 otiske kao prethodne aktivne isporuke. `www/globalchat.js`, oba CSS fajla, empty/loading i send PNG-ovi, te ilustracija stranice Komunikacija u Pravilima nisu menjani: njihove vrednosti upoređene su pre i posle migracije.

## Povezani potrošači

| Potrošač | Kanonska varijanta | Očuvan prikaz |
|---|---|---|
| Glavni meni i startup | `global-chat-room-menu-v1.png`, `384×384` | `52×52` slika u postojećoj kontroli `44×44`, transparentna podloga i press scale `0,9→1` |
| Global Chat icon-only intro | `global-chat-room-v1.png`, `512×512` | `clamp(210px, 34vmin, 290px)`, scale `1`, pulse `1,8 s`, soba `3,65 s`, overlay `4,6 s` |
| Zaglavlje Global chata | `global-chat-room-v1.png` | `32×32`, `contain` |
| Pravila, SR i EN | `global-chat-room-v1.png` | „Chat i komunikacija / Chat & Communication” i „Globalni chat / Global Chat” |
| Room-on-demand | `global-chat-room-v1.png` | samo pri ulasku u Global Chat sobu, zajedno sa zasebnim empty/send motivima |

Main-menu startup fallback prepoznaje kanonsku menu putanju. Sobni matcher prepoznaje tačnu room putanju, ali ne i menu izvedenicu. U uobičajenom toku startup čita menu sliku sa stvarnog dugmeta glavnog menija.

Global chat nije dodat u theme loading gate; postojećih šest Green gate ikona ostaje nepromenjeno. Povezivanje chata u `pack.assets` služi sobnom učitavanju, ne predstavlja novu gate ulogu.

## Registry, granice i cache

`globalChatRoomIdentity` u `www/themes/green/asset-registry.json` definiše jedan identitet, dve delivery uloge, dimenzije, SHA-256 otiske, tri zabranjene stare runtime putanje, zamene i odbačeni kandidat. Terracotta akcenat ostaje statički deo slike, ne zamena za žive online/unread podatke.

Empty/loading istorija, paper-plane send akcija, Rules Communication page scena, online broj i tačka, karakter counter, error status, close/report kontrole i socket/autentifikacija/moderacija ostaju odvojeni. Raspored, klik-zone i funkcije nisu menjani. Reduced-motion fallback, intro pulse, ulaz shell-a i loading-state pulse ostaju postojeći.

Green cache verzija povećana je sa `52` na `53` radi osvežavanja novih putanja. Ranije zaključane porodice zadržavaju svoje istorijske integracione cache verzije.

## Uklonjene runtime kopije

Nakon prevezivanja i potvrde nula aktivnih UI referenci uklonjene su samo ove tri datoteke:

1. `www/assets/green-soft-clay/global-chat-free-v2.png` — stara room/intro/header isporuka (`178.822 B`);
2. `www/assets/green-soft-clay/runtime/menu/global-chat-free-v2.png` — stara menu isporuka (`108.756 B`);
3. `www/assets/green-soft-clay/global-chat-pro-v1.png` — odbačena uramljena, neaktivna varijanta (`250.515 B`).

Ukupno je uklonjeno `538.093 B` starih runtime kopija. Git prati sve tri datoteke, pa se mogu obnoviti iz istorije. Odobreni i odbijeni high-resolution izvori ostaju u `source-assets`, van runtime isporuke.

Build skripta više ne zavisi od uklonjenih kopija: iz odobrenog izvora ponovo pravi room LANCZOS `1254→512` i menu `512→384`, proverava RGBA, alpha i fiksne otiske. Build je ponovljen nakon uklanjanja i daje iste odobrene SHA-256 vrednosti: room `ea96cb6a2f1a83768074adb6d2d9be44cbf4e9a21819619dbc18bfe7a1237e7e`, menu `57e55c8e9fef67d9576e112cc78bbcc3ba5f1ac006e1d5bd5405e8260517d070`.

Audit skripta sada čita kanonske room/menu PNG-ove i odbijeni izvor, ne uklonjeni framed runtime. Ponovljena audit tabla zato ostaje reproduktivna i posle migracije.

## Bilans učitavanja

- Green tema: `163 PNG / 15.042.830 B` (`14,35 MB`).
- Startup: `17 PNG / 4,56 MB / 20,44 MB decoded` — broj i memorijski budžet nisu porasli; od ovog identiteta sadrži samo menu isporuku.
- Global Chat room-on-demand: `3 PNG / 351.688 B / 2.228.224 decoded B` — kanonski room identitet, postojeći empty/loading i send PNG.
- Najveći Green room paket ostaje Riznica: `44 PNG / 2,94 MB / 13,70 MB decoded`.

U odnosu na stanje pre formiranja kanonskih kopija isporuka je manja za `250.515 B` neaktivnog framed runtimea. Dve aktivne slike su premeštene na kanonske putanje bez promene sadržaja ili kvaliteta.

## Provere i sledeći korak

Performance test štiti status u oba registra, DNK, SHA-256 vrednosti, tačan broj kanonskih referenci i nula legacy veza, odsustvo tri uklonjene kopije, SR/EN reference, očuvane zasebne motive, dimenzije i intro, te startup/room izolaciju. Build i audit skripta rade nakon uklanjanja starih kopija. Ponovljeno je svih devet projektnih provera; svi testovi prolaze. `git diff --check` nema grešaka belina.

Korak 4 je završni vizuelni, semantički i tehnički audit u stvarnim prikaznim veličinama. Tek posle toga porodica prelazi iz `standardized` u `locked`.

Nije rađen commit, objavljivanje ili pregled u Android emulatoru.
