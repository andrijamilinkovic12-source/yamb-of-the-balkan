# Green Asset Standardization — Solo Results, Korak 4

## Ishod

Green Solo Results porodica završno je vizuelno, semantički i tehnički proverena. Centralni registar i source manifest sada imaju status `locked`.

Ovaj korak nije menjao vizuelni sadržaj, pravila Solo igre, obračun rezultata i nagrade, geometriju interfejsa, postojeći motion ili način učitavanja. Zaključan je ugovor koji sprečava buduće tiho menjanje ili pogrešnu ponovnu upotrebu ova tri identiteta.

## Zaključani katalog

| ID | Uloga | UI veličina | Zaključana silueta |
|---|---|---:|---|
| `personal-best` | novi stvarni Solo lični rekord | `30 × 30` | tri rastuća forest-green stuba na ivory osnovi, check medaljon i jedna terracotta tačka |
| `finish-score-mark` | vizuelna oznaka konačnog Solo rezultata | `42 × 42` | forest-green prsten, ivory četvorokraka iskra i jedna terracotta tačka |
| `finish-claim` | preuzimanje osnovne Solo nagrade i izlazak | `29 × 29` | velika ivory strelica nadole koja ulazi u forest-green prijemnik, uz jednu terracotta tačku |

Svaka uloga ima tačno jedan canonical Green PNG identitet.

## Zaključani vizuelni DNK

Sva tri glyph-a zadržavaju:

- matirani 3D Soft Clay Neumorphism materijal;
- forest-green i warm-ivory paletu sa jednim kontrolisanim terracotta akcentom;
- meko gornje-levo osvetljenje i kontrolisanu glinenu dubinu;
- jednu čistu centralnu siluetu na transparentnoj pozadini;
- odsustvo teksta, scene i generičke kvadratne podloge;
- čitljivost u stvarnim malim UI dimenzijama.

Vizuelni pregled sva tri mastera i sva tri runtime PNG-a potvrđuje čist alpha rub, jasnu hijerarhiju oblika i očuvane proporcije posle LANCZOS redukcije.

## Zaključana logika prikaza

`Personal Best` glyph prikazuje se samo kada je završena Solo partija i rezultat je strogo veći od high-score vrednosti koja je postojala pre te partije. Tehnički i Online završeci uklanjaju Solo result stanje i skrivaju badge.

`Finish Score Mark` prikazuje se samo na `game-over-screen.is-solo-result` uz stvarni konačni broj poena.

`Finish Claim` ostaje povezan sa `claimReward(false)`. Zaključavanje čuva postojeću proveru `rewardClaimed || rewardClaimInProgress`, tako da PNG standardizacija ne može promeniti čuvanje nagrade ili dozvoliti duplo preuzimanje.

## Zaključani motion i prikaz

- glyph dimenzije ostaju `30 × 30`, `42 × 42` i `29 × 29` CSS piksela;
- `object-fit: contain` čuva cele siluete;
- generički Solo result mark i legacy dukat ostaju skriveni u Green Solo završnom prikazu;
- reveal koristi `easterSoloFinishReveal`, traje `0,48 s` i zadržava postojeću easing krivu;
- redosled ostaje poruka `0,06 s`, score card `0,12 s`, rewarded akcija `0,18 s`, claim akcija `0,24 s`;
- `prefers-reduced-motion: reduce` potpuno isključuje ovu animaciju.

## Zaključani potrošači

| Površina | Canonical identitet |
|---|---|
| Solo personal-best badge | `personal-best-v1.png` |
| Solo final-score red | `finish-score-mark-v1.png` |
| Solo claim-and-exit dugme | `finish-claim-v1.png` |
| Solo room-on-demand paket | ista tri canonical identiteta |

Svaki canonical URL pojavljuje se tačno jednom u HTML potrošaču i tačno jednom u Solo room paketu.

## Granica prema Rewarded Video porodici

`finish-reward-video-v3.png` nije deo Solo Results porodice. On ostaje zaključani `solo-double-reward` composite u Rewarded Video porodici i koristi canonical dukat sistem. Slična lokacija u završnom ekranu nije dozvola da se claim i rewarded-video identitet spoje.

## Integritet paketa

Zaključavanje pokriva:

- tri canonical mastera `512 × 512` sa direktnim alpha kanalom;
- tri canonical runtime PNG-a `256 × 256` sa direktnim alpha kanalom;
- SHA-256 otiske svakog mastera i runtime fajla;
- tačan redosled ID-eva, tri jedinstvene semantičke siluete i tri jedinstvene registry uloge;
- identične manifest i registry DNK podatke, putanje, dimenzije i hash vrednosti;
- proporcionalne LANCZOS izvedenice na punom transparentnom canvasu;
- tačne HTML i room-on-demand veze.

## Semantičke granice

Solo Results ostaje odvojen od:

- glavne Solo menu i intro ikone;
- zaključane Rewarded Video i canonical dukat porodice;
- CSS score tierova, summary kartica i tekstualnih rezultata;
- Statistics rekorda, pobeda i zbirnih metrika;
- Hotseat Winner identiteta;
- Online, Invite i tehničkih rezultata;
- Tournament nagrada i stanja;
- Quarterly League champion, rank i podium identiteta;
- General Podium, Collection medalja i achievement trofeja;
- Daily i Treasury stanja;
- gameplay, navigation i Undo strelica.

## Zabranjene stare putanje

Sledeće putanje ostaju evidentirane kao zabranjene:

- `assets/green-soft-clay/solo/personal-best-v1.png`
- `assets/green-soft-clay/solo/finish-score-mark-v1.png`
- `assets/green-soft-clay/solo/finish-claim-v1.png`

Automatska kontrola pada ako se vrati stari fajl, aktivna legacy referenca ili se promeni istorijsko mapiranje na canonical zamenu.

## Automatska kontrola

`check-theme-performance.js` proverava:

- `locked` status registra i source manifesta;
- evidentiran završni audit;
- zaključani vizuelni DNK, ID mapiranje, siluete i display dimenzije;
- manifest/registry identitet, putanju, dimenziju i SHA-256 podudaranje;
- master/runtime dimenzije, alpha kanal i hash integritet;
- canonical HTML i Solo room-on-demand veze;
- Solo matcher i odsustvo sve tri stare runtime putanje;
- stvarni `new high score` uslov za Personal Best;
- Solo-only result stanje, `claimReward(false)` i duplicate-claim zaštitu;
- tri UI dimenzije, `contain` prikaz, reveal redosled i reduced-motion zaštitu;
- vlasništvo Rewarded Video kompozicije i sve semantičke izuzetke.

## Performanse pri zaključavanju

- Green tema: `172 PNG`, ukupno `15,81 MB`.
- Startup paket: `17 PNG`, `4,56 MB` kompresovano / `20,44 MB` procenjeno dekodirano.
- Solo room paket: `5 PNG`, oko `0,36 MB` kompresovano / `2,31 MB` procenjeno dekodirano.
- Najveći Green room paket ostaje Riznica: `44 PNG`, `2,94 MB` kompresovano / `13,70 MB` procenjeno dekodirano.

Zaključavanje nije dodalo novi runtime PNG niti povećalo startup paket.

## Pravilo za buduće izmene

Promena zaključanog Solo Results asseta zahteva novi verzionisani master i runtime fajl, ažuriranje oba SHA-256 otiska, source manifesta, centralnog registra i svih pripadajućih veza. Postojeći canonical fajl ne sme se tiho prepisivati. Personal Best ne sme postati generički badge, Finish Claim ne sme menjati reward tok, a Rewarded Video, Statistics, Hotseat, Online, Tournament, League, Treasury ili navigation simboli ne smeju preuzeti nijednu od ove tri uloge.

Nije rađen commit niti objavljivanje.
