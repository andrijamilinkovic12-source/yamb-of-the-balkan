# Green Asset Standardization — Rules Room Identity, Korak 4

## Ishod

Završen je završni statički vizuelni, semantički i tehnički audit Green `rules-room-identity` porodice. Izvorni manifest i centralni registry sada imaju status `locked`.

Ovaj korak nije menjao odobrenu otvorenu knjigu, CSS dimenzije, motion, tekst Pravila, šest ilustracija stranica, redosled stranica, navigaciju ili ponašanje swipe gestova. Audit tabla poredi kanonske PNG-ove u stvarnim CSS veličinama i prikazuje zasebne motive svih šest stranica.

## Vizuelna kontrola

Audit tabla: `docs/green-asset-standardization-rules-room-identity-audit.png`.

Na tabli su odobreni `1254×1254` master, kanonske `512×512` room i `384×384` menu isporuke, intro proba na minimalnih `210 px` i mali prikazi od `52`, `46`, `34` i `45 px`. Odbačeni `rules-pro-v1` sa kvadratnim ramom prikazan je samo iz sačuvanog high-resolution izvora, kao poređenje. Šest ilustracija stranica prikazano je zasebno.

Na statičnoj probi i pri najmanjem prikazu ostaju prepoznatljivi svetla otvorena knjiga, forest-green hrbat i terracotta obeleživač. Glavni znak nema sopstveni kvadratni ram ili podlogu. Ilustracije stranica se semantički razlikuju od ikone ulaska u sobu. Ova kontrola nije snimak Android emulatora niti zamena za kasniji pregled na uređaju.

## Reproducibilnost i kvalitet

Build ponovo pravi obe runtime varijante isključivo iz odobrenog izvora: LANCZOS `1254→512`, pa za menu LANCZOS `512→384`. Proverava RGBA, dimenzije, pun alpha opseg, transparentan ugao i fiksne SHA-256 otiske. Obe runtime datoteke ostaju bajt-po-bajt identične odobrenim aktivnim slikama pre migracije.

| Uloga | Dimenzija | Bajtova | SHA-256 |
|---|---:|---:|---|
| Master | `1254×1254` | `1.034.779` | `f53a6399c03855ca78bd6c78335bffe61be1f4da744a36406ad49e12b948218a` |
| Room | `512×512` | `175.314` | `48527b7eb726778604fc25ba437d0d350a3ab97708c7c4d3dd8ad19c537a8ae4` |
| Menu | `384×384` | `108.123` | `d00302c37418b3f87b8d4077a54a6c1742e1d78199dd1065e32dc3685a742d1a` |

## Zaključani potrošači i semantika

- Glavni meni: canonical menu PNG, `52×52` / uski portrait `46×46`, talas `8,4 s`, delay `1,92 s` i reduced-motion fallback.
- Icon-only intro: canonical room PNG, `clamp(210px, 34vmin, 290px)`, scale `1,16`, Green pulse `1,8 s`, otvaranje sobe na `3,65 s` i završetak overlay-a na `4,6 s`, uz reduced-motion fallback.
- Zaglavlje Pravila: isti room PNG, `34×34`, `contain`.
- Theme loading gate: isti room PNG u zajedničkom `45×45` floating prikazu.
- Room-on-demand: tačna canonical room putanja; menu izvedenica se ne preuzima ponovo kao deo sobe.
- Šest ilustracija stranica: `38×38`, `greenRulesIconBreath 4,8 s` i reduced-motion fallback. Svaka je proverena uz odgovarajući srpski i engleski naslov: Pravila/bodovanje, Statistika/liste, Multiplayer/takmičenja, Komunikacija, Dukati/tokeni/Riznica, Nalog/privatnost/server.

Ilustracije stranica, inline simboli, kanonski dukat i Undo token nisu zamenjeni glavnom ikonom sobe. Odbačeni uramljeni kandidat nema aktivnih UI veza; njegov runtime je uklonjen, a high-resolution izvor sačuvan za audit.

## Preload i performance izolacija

- Green tema: `164 PNG / 15.293.345 B` (`14,58 MB`).
- Startup: `17 PNG / 4,56 MB / 20,44 MB decoded`; od ovog identiteta sadrži samo `384×384` menu varijantu.
- Rules room-on-demand: `7 PNG / 1.450.680 B / 7.340.032 decoded B`; sadrži room identitet i šest ilustracija stranica.
- Tri stare runtime putanje: nijedna prisutna niti aktivno referencirana. Git istorija omogućava oporavak; high-resolution izvori ostaju van `www` isporuke.
- Green cache verzija: `52`.

Automatska kontrola štiti `locked` status, identitet i semantičke granice, SHA-256 vrednosti, dve kanonske uloge, tačan broj UI potrošača, odsustvo starih putanja, tačne SR/EN veze svih šest stranica, CSS veličine i motion, kao i startup/room izolaciju. Reproducibilni build i projektni testovi ponovljeni su nakon zaključavanja.

## Status

Rules Room Identity je završen i zaključan. Nije rađen commit niti objavljivanje. Android emulator nije pokrenut u ovom koraku.
