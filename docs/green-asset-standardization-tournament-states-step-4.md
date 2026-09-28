# Green Asset Standardization — Tournament Action & Match States, Korak 4

## Ishod

Green Tournament Action & Match States katalog završno je vizuelno, semantički i tehnički proveren. Centralni registar i source manifest sada imaju status `locked`.

Ovaj korak nije menjao vizuelni sadržaj, akcije prijave i odjave, pending motion, registration ili match logiku, rezultate, fallback ponašanje, sadržaj Pravila niti geometriju interfejsa.

## Zaključani katalog

### Registration actions

| ID | Uloga | Zaključana silueta |
|---|---|---|
| `state-register` | prijava na Turnir | ivory ulaznica sa forest-green check oznakom i jednim terracotta akcentom |
| `state-unregister` | povlačenje prijave | ivory ulaznica sa forest-green povratnom strelicom i tri terracotta oznake |
| `state-registration-locked` | prijava nije dostupna | ivory ulaznica sa forest-green katancem i terracotta ključaonicom |

### Flow states

| ID | Uloga | Zaključana silueta |
|---|---|---|
| `state-start` | Turnir počinje ili je aktivan | ivory play trougao unutar forest-green prstena sa terracotta baznim akcentom |
| `state-match-active` | meč je dostupan za pokretanje | dve ivory kockice povezane forest-green prstenom oko terracotta iskre |
| `state-match-complete` | meč ima završen rezultat | forest-green medaljon sa ivory check oznakom i terracotta unutrašnjim prstenom |

Jedan Tournament action/state ID uvek koristi jedan isti canonical Green PNG identitet.

## Zaključane semantičke razlike

- `state-unregister` koristi povratnu strelicu na admission ticketu i nije potrošni Undo token.
- `state-start` koristi kružni Tournament flow simbol i nije rewarded-video ticket ili obična playback kontrola.
- `state-registration-locked` opisuje dostupnost prijave i nije Treasury item lock.
- `state-match-complete` označava evidentiran rezultat Turnira i nije Treasury ownership, Daily completion, Invite acceptance ili winner mark.
- `state-match-active` označava konkretan turnirski meč i nije Online Random ili generička multiplayer ikona.

Zajednički check, strelica, katanac, play ili dice motiv ne dozvoljava zamenu između navedenih porodica. Konstrukcija i funkcionalni kontekst su deo identiteta.

## Zaključani vizuelni DNK

Svih šest glyph-ova zadržava:

- matirani 3D Soft Clay Neumorphism materijal;
- forest-green, warm-ivory i terracotta paletu;
- centralni semantički glyph na transparentnom canvasu;
- odsustvo teksta i generičke kvadratne kartice;
- meko gornje-levo osvetljenje i kontrolisanu glinenu dubinu;
- jasne, međusobno različite siluete pri prikazu od približno 18–38 CSS piksela.

Ticket podloga je deo tri registration identiteta, a ne spoljašnja UI kartica.

## Zaključani potrošači

| Površina | Veza |
|---|---|
| Register dugme | `state-register` |
| Unregister dugme | `state-unregister` |
| Dinamički registration panel | `state-registration-locked`, `state-start` ili `state-match-complete` |
| Start match dugme | `state-match-active` |
| Završen bracket rezultat i match prikaz | `state-match-complete` |
| Rules Tournament start referenca | isti `state-start` identitet |
| Tournament room paket | šest eksplicitnih canonical putanja |

Postojeći click handleri, disabled i pending stanja, fallback simboli, rezultati i motion ostaju nepromenjeni.

## Integritet paketa

Zaključavanje pokriva:

- šest canonical master PNG fajlova u originalnim odobrenim rezolucijama;
- šest canonical runtime PNG fajlova rezolucije `256 × 256`;
- direktan alpha kanal svih dvanaest fajlova;
- SHA-256 otisak svakog master/runtime fajla;
- tačne dve podgrupe, skup, redosled i siluetu šest ID-jeva;
- odsustvo dupliranog master ili runtime sadržaja;
- identične manifest i registry putanje, dimenzije i otiske;
- 1:1 mapiranje action/state ID-ja na canonical PNG.

Zaključana canvas pravila ostaju:

- `state-register`: sadržaj `256 × 171`, offset `0,42`;
- `state-registration-locked`: sadržaj `253 × 256`, offset `1,0`;
- ostala četiri glyph-a: pun `256 × 256` sadržaj.

## Semantičke granice

Tournament States ostaje odvojena od:

- Tournament Navigation tabova;
- Tournament finalist nagrade;
- Tournament winner trofeja, intro i glavnog logotipa;
- Treasury item statusa;
- Daily Challenge completed i already-played stanja;
- Invite Friend sent i accepted stanja;
- Hotseat i generičkih winner oznaka;
- Rewarded Video aktivnog i unavailable stanja;
- canonical Undo tokena;
- podium i collection medalja;
- Quarterly League rank bedževa;
- achievement trofeja i dukata.

## Zabranjene stare putanje

Šest starih `tournament/state-*-v1.png` runtime putanja ostaje evidentirano kao zabranjeno. Automatska kontrola pada ako se vrati stari fajl ili aktivna referenca. Originalni high-resolution source asseti ostaju sačuvani i mapirani na canonical zamene.

## Automatska kontrola

`check-theme-performance.js` proverava:

- `locked` status registra i source manifesta;
- evidentiran završni audit;
- dve zaključane podgrupe;
- tačan skup, redosled i semantičku siluetu šest ID-jeva;
- zaključani vizuelni DNK i nepromenljivo ID-to-PNG mapiranje;
- dimenzije, alpha kanal, SHA-256 integritet i jedinstvenost sadržaja;
- manifest/registry podudaranje;
- canvas normalizaciju svakog glyph-a;
- sve Tournament, Rules i room-on-demand veze;
- odsustvo starih runtime fajlova i aktivnih referenci;
- očuvanje semantičkih izuzetaka i Tournament room preload izolacije.

## Performanse pri zaključavanju

- Green tema: `173 PNG`, ukupno `16,18 MB`.
- Startup paket: `17 PNG`, `4,56 MB` kompresovano / `20,44 MB` procenjeno dekodirano.
- Tournament paket: `11 PNG`, `0,62 MB` kompresovano / `3,81 MB` procenjeno dekodirano.
- Najveći Green room paket: Riznica, `44 PNG`, `2,94 MB` kompresovano / `13,70 MB` procenjeno dekodirano.

Tournament state asseti nisu deo startup paketa. Učitavaju se samo kroz Tournament room paket.

## Pravilo za buduće izmene

Promena bilo kog zaključanog glyph-a zahteva novu verziju mastera i runtime asseta, ažuriranje oba SHA-256 otiska, source manifesta, centralnog registra i svih aktivnih veza. Postojeći canonical fajl ne sme se tiho prepisivati, a action/state simbol ne sme biti zamenjen navigation, Undo, rewarded-video, Treasury, Daily, Invite, finalist, medal, rank, trophy, dukat ili winner assetom.

Nije rađen commit niti objavljivanje.
