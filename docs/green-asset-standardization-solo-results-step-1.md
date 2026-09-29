# Green Asset Standardization — Solo Results, Korak 1

## Opseg

Sledeća porodica za standardizaciju je `Solo Results`. Ovaj korak je inventar, vizuelna i semantička dijagnoza; nijedan runtime asset, rezultat, nagrada, claim tok, motion ili UI geometrija nije promenjen.

Porodica obuhvata tri samostalna Green PNG identiteta završnog Solo prikaza. Rewarded Video kompozicija, glavna Solo ikona i CSS score-tier elementi ostaju izvan ove porodice.

## Kandidati u porodici

| Predloženi ID | Trenutni asset | Semantička uloga | Glavna silueta |
|---|---|---|---|
| `personal-best` | `solo/personal-best-v1.png` | novi lični rekord u Solo partiji | tri rastuća forest-green stuba na ivory bazi, uz kružni ivory/green check i terracotta tačku |
| `finish-score-mark` | `solo/finish-score-mark-v1.png` | vizuelna oznaka konačnog Solo rezultata | forest-green prsten sa ivory četvorokrakom iskrom i jednom terracotta tačkom |
| `finish-claim` | `solo/finish-claim-v1.png` | potvrda i izlazak nakon preuzimanja Solo nagrade | velika ivory strelica nadole ulazi u forest-green prijemnik sa jednom terracotta tačkom |

Tri ID-ja predstavljaju različite pojmove: dostignuće, rezultat i akciju. Ne smeju se međusobno zamenjivati samo zato što dele Green paletu i terracotta akcenat.

## Trenutni potrošači

### `personal-best`

- jedan `<img>` potrošač unutar `solo-personal-best-badge` u `www/index.html`;
- jedan Solo room-on-demand preload zapis u `www/game.js`;
- prikazuje se na `30 × 30` CSS piksela;
- badge se prikazuje samo kada je završena Solo partija i novi rezultat je strogo veći od prethodnog `stats.highscore`.

### `finish-score-mark`

- jedan `<img>` potrošač uz konačni broj poena;
- jedan Solo room-on-demand preload zapis;
- prikazuje se na `42 × 42` CSS piksela;
- vidljiv je samo u `is-solo-result` završnom prikazu.

### `finish-claim`

- jedan `<img>` potrošač unutar postojećeg claim dugmeta;
- jedan Solo room-on-demand preload zapis;
- prikazuje se na `29 × 29` CSS piksela;
- ne menja `claimReward(false)` akciju, zaštitu od dvostrukog claima ili tok čuvanja nagrade.

Sva tri asseta učitavaju se kroz Solo room paket i nisu deo startup paketa.

## Tehnički inventar

| ID | Source | Aktivni runtime | Alpha | Source SHA-256 | Runtime SHA-256 |
|---|---:|---:|---|---|---|
| `personal-best` | `512 × 512`, 128.388 B | `384 × 384`, 76.340 B | RGBA | `b4db90b668914c1f6e7f48bc18b167d470ee7cbc0964983562ff4a9dcb16a11c` | `ac213fdc20049f52b14cbea78cfa919bb7cb8cf7ee2eb61453a1fb238ae52a06` |
| `finish-score-mark` | `512 × 512`, 165.089 B | `384 × 384`, 100.491 B | RGBA | `2166314a33094c8055224fc7a60fe3b640cd631b30b4550a627890ea25613297` | `9748e8219e899584cce92ee6dbd41d594a308070d321551eb04c919878cd9cbc` |
| `finish-claim` | `512 × 512`, 140.664 B | `384 × 384`, 84.639 B | RGBA | `2c166c068fc0e791b695a6a9b30226105e42f7bbb874910ae9d926dafc71ad99` | `b75d44838805a8de1022d6a35ca418049a52371387921f45a54b6adca3a14ec7` |

Sva tri source asseta i sva tri runtime asseta imaju direktan alpha kanal. Aktivni runtime fajlovi zajedno imaju `261.470` bajtova.

Najveći stvarni prikaz je `42 × 42` CSS piksela. Canonical runtime od `256 × 256` za svaki identitet zadržava veliki sigurnosni faktor za mobilne ekrane visoke gustine i omogućava smanjenje paketa bez vidljivog gubitka kvaliteta.

## Vizuelni zaključak

Nije potreban novi render. Sva tri asseta pripadaju odobrenom Green Soft Clay DNK-u:

- koriste matirani 3D Soft Clay Neumorphism materijal;
- dele forest-green, warm-ivory i jedan kontrolisani terracotta akcenat;
- imaju centralnu, čitljivu siluetu na transparentnoj pozadini;
- nemaju tekst, scenu ili generičku kvadratnu karticu;
- koriste meko gornje-levo osvetljenje i kontrolisanu glinenu dubinu;
- ostaju jasno različiti pri stvarnim malim UI dimenzijama.

## Zaključane semantičke razlike

- `personal-best` je dostignuće konkretnog novog Solo rekorda, a ne zbirna Statistics `record` ili `wins` ikona.
- `finish-score-mark` označava prikaz konačnog broja Solo poena; nije dukat, sparkle efekat, Tournament state ili winner oznaka.
- `finish-claim` predstavlja potvrdu preuzimanja i izlazak; nije download, Invite accepted, Treasury owned, Daily complete ili gameplay strelica.

Zajednički check, iskra, strelica ili terracotta tačka ne dozvoljavaju zamenu između ovih ili drugih porodica. Funkcionalni kontekst i kompletna silueta deo su identiteta.

## Asseti izvan porodice

### Rewarded Video

`solo/finish-reward-video-v3.png` ostaje složena kompozicija već zaključane `rewardedVideo` porodice. Sadrži odobreni video identitet i dva canonical dukata. Ne sme biti ponovo registrovan kao Solo Results canonical glyph niti dobiti drugi izvor istine.

### Glavna Solo ikona

`mode-solo-free-v2.png` ostaje identitet Solo sobe, menija i intro prikaza. Element `.green-solo-result-mark` postoji u HTML-u radi tematske strukture, ali ga Green završni CSS namenski skriva; ne predstavlja četvrti aktivni Solo Result identitet.

### CSS elementi

Šest score-tier koraka, best-column/no-zero kartice, tekst rezultata i kompletna game-over kartica generisani su HTML/CSS kodom. Nisu PNG asseti i ne ulaze u canonical katalog.

## Motion i ponašanje koje treba očuvati

- završni Solo ekran koristi `easterSoloFinishReveal` od `0,48 s`;
- score card kasni `0,12 s`, Rewarded Video dugme `0,18 s`, a claim dugme `0,24 s`;
- `prefers-reduced-motion: reduce` potpuno isključuje završnu animaciju;
- personal-best badge ostaje vezan za stvarni novi high score;
- claim i double-reward funkcionalni tokovi ostaju nepromenjeni.

## Semantičke granice

Solo Results ostaje odvojen od:

- glavne Solo menu/intro ikone;
- canonical Rewarded Video i dukat porodica;
- Statistics record, wins, average i ostalih statističkih ikona;
- Hotseat Winner identiteta;
- Online, Invite i tehničkih result/state oznaka;
- Tournament awards, states i navigation glyph-ova;
- Quarterly League champion, rank i podium identiteta;
- General Podium, Collection medalja i achievement trofeja;
- Daily completed/already-played stanja;
- Treasury owned/active/locked/insufficient stanja;
- gameplay, navigation i Undo strelica.

## Predlog standarda

Canonical `solo-results` paket treba da:

1. zadrži tri postojeća odobrena vizuelna identiteta bez prerenderovanja;
2. sačuva svaki `512 × 512` source kao zaseban canonical master;
3. izvede tri transparentna `256 × 256` runtime PNG-a direktno iz odgovarajućih mastera;
4. koristi jednu canonical putanju po ID-ju za završni ekran i Solo room preload;
5. očuva prikaze `30 × 30`, `42 × 42` i `29 × 29` CSS piksela;
6. očuva high-score uslov, claim logiku, motion redosled i reduced-motion zaštitu;
7. ne duplira već zaključani `finish-reward-video-v3` u novom registry katalogu;
8. ukloni tri stare runtime kopije tek posle kompletne zamene aktivnih veza;
9. zabrani zamenu sa Statistics, Hotseat, Online, Tournament, League, Treasury, Daily ili generičkim state/winner simbolima.

## Sledeći korak

Korak 2 je izrada canonical `solo-results` paketa iz tri odobrena source asseta: čuvanje mastera, izrada tri transparentna `256 × 256` runtime PNG-a, source manifest i početna automatska kontrola dimenzija, alpha kanala, SHA-256 integriteta, kataloga i semantičkih granica.

Nije rađen commit niti objavljivanje.
