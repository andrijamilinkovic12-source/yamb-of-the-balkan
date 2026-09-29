# Green Asset Standardization — Tournament Awards, Korak 4

## Ishod

Green Tournament Awards porodica završno je vizuelno, semantički i tehnički proverena. Centralni registar i source manifest sada imaju status `locked`.

Ovaj korak nije menjao izgled asseta, nagradne iznose, Tournament podatke, finalnu ceremoniju, motion, sadržaj Pravila niti geometriju interfejsa.

## Zaključani katalog

| ID | Uloga | Zaključana silueta |
|---|---|---|
| `champion-trophy` | zvanični identitet Turnira i počast šampionu | forest-green dvokraki pehar sa ivory ručkama i zvezdom, uz jedan terracotta prsten |
| `finalist-silver` | počast drugoplasiranom finalisti | pun silver medaljon sa ivory zvezdom, punim forest-green trakama i jednim terracotta spojem |

Jedan award ID uvek koristi jedan isti canonical Green PNG identitet.

## Zaključana ponovna upotreba champion pehara

`champion-trophy` je namerno zajednički identitet Turnira i šampionske počasti. Koristi se u:

- kartici glavnog menija i startup paketu;
- Tournament intro prikazu, headeru i registration panelu;
- broju osvojenih turnira, Hall of Fame prikazu i championship history karticama;
- finalnoj rundi, champion reward modalu i ceremony prikazu;
- odgovarajućoj Tournament referenci u Pravilima.

Ova ponovna upotreba je dozvoljena samo unutar Tournament konteksta. Pehar nije generički winner simbol, achievement trofej, Quarterly League oznaka ili podium medalja.

## Zaključani finalist identitet

`finalist-silver` predstavlja isključivo drugoplasiranog učesnika Tournament finala. Njegov pun srebrni medaljon, ivory zvezda, pune zelene trake i terracotta spoj razlikuju ga od General Podium Silver i Treasury Collection Silver medalje.

Finalist identitet koristi se u rezultatu finala, runner-up reward modalu i finalist ceremony prikazu. Ne koristi se kao generička srebrna medalja.

## Zaključani vizuelni DNK

Oba asseta zadržavaju:

- matirani 3D Soft Clay Neumorphism materijal;
- forest-green, warm-ivory, terracotta i kontrolisanu silver-clay paletu;
- jednu centralnu nagradu na transparentnoj pozadini;
- odsustvo teksta, scene i generičke kvadratne kartice;
- meko gornje-levo osvetljenje i kontrolisanu glinenu dubinu;
- međusobno jasne siluete pri malom prikazu.

## Zaključani potrošači

| Površina | Veza |
|---|---|
| Glavni meni i startup | `champion-trophy-v1.png` |
| Tournament intro, header, registration i istorija | isti champion identitet |
| Champion rezultat, modal i ceremony | isti champion identitet |
| Rules Tournament referenca | isti champion identitet |
| Finalist rezultat, modal i ceremony | `finalist-silver-v1.png` |
| Tournament room paket | oba canonical asseta |

Postojeća logika nagrada, rezultata, animacija, fallback ponašanje i podaci ostaju nepromenjeni.

## Integritet paketa

Zaključavanje pokriva:

- dva odobrena high-resolution master PNG fajla rezolucije `1254 × 1254`;
- champion runtime rezolucije `384 × 384` i finalist runtime rezolucije `256 × 256`;
- direktan alpha kanal sva četiri master/runtime fajla;
- SHA-256 otisak svakog master i runtime fajla;
- tačan skup, redosled i siluetu dva ID-ja;
- jedinstvene master i runtime sadržaje;
- identične manifest i registry putanje, dimenzije i otiske;
- 1:1 mapiranje award ID-ja na canonical PNG.

Champion `384 × 384` runtime ostaje bajt-po-bajt identičan ranije odobrenoj startup izvedenici. Finalist je proporcionalno izveden iz odobrenog mastera na pun transparentni `256 × 256` canvas.

## Semantičke granice

Tournament Awards ostaje odvojen od:

- General Podium i Quarterly League podium medalja;
- Treasury Collection medalja i achievement trofeja;
- Tournament Navigation i Tournament States porodica;
- Quarterly League navigacije, champion oznake i rank bedževa;
- Hotseat, Online i generičkih winner oznaka;
- dukata, Undo tokena i Rewarded Video simbola.

Zajednički motiv zvezde, medaljona, pehara ili zelene palete ne dozvoljava zamenu između porodica. Funkcionalni kontekst i konstrukcija nagrade deo su zaključanog identiteta.

## Zabranjene stare putanje

Tri stare runtime putanje ostaju evidentirane kao zabranjene:

- `tournament-free-v2.png`;
- `runtime/menu/tournament-free-v2.png`;
- `tournament/finalist-silver-v1.png`.

Automatska kontrola pada ako se vrati stari fajl, promeni zaključani skup putanja ili pojavi aktivna legacy referenca. Originalni high-resolution source asseti ostaju sačuvani.

## Automatska kontrola

`check-theme-performance.js` proverava:

- `locked` status registra i source manifesta;
- evidentiran završni audit;
- zaključani Green vizuelni DNK, redosled i semantičku siluetu oba ID-ja;
- dimenzije, alpha kanal, SHA-256 integritet i jedinstvenost sadržaja;
- manifest/registry podudaranje i jedinstvene registry uloge;
- sve startup, branding, champion, finalist, Rules i room-on-demand veze;
- tačan skup zabranjenih starih putanja i odsustvo legacy fajlova;
- očuvanje semantičkih izuzetaka i Tournament preload toka.

## Performanse pri zaključavanju

- Green tema: `172 PNG`, ukupno `15,98 MB`.
- Startup paket: `17 PNG`, `4,56 MB` kompresovano / `20,44 MB` procenjeno dekodirano.
- Tournament paket: `11 PNG`, `0,52 MB` kompresovano / `3,06 MB` procenjeno dekodirano.
- Najveći Green room paket ostaje Riznica, `44 PNG`, `2,94 MB` kompresovano / `13,70 MB` procenjeno dekodirano.

Canonical champion zamenjuje staru startup kopiju, a oba award asseta dele isti URL između svih svojih Tournament potrošača. Zaključavanje nije dodalo novi PNG niti povećalo startup paket.

## Pravilo za buduće izmene

Promena bilo kog zaključanog Tournament award asseta zahteva novu verziju mastera i runtime fajla, ažuriranje oba SHA-256 otiska, source manifesta, centralnog registra i svih aktivnih veza. Postojeći canonical fajl ne sme se tiho prepisivati, champion identitet ne sme postati generički winner simbol, a finalist medalja ne sme biti zamenjena podium ili Collection srebrom.

Nije rađen commit niti objavljivanje.
