# Green Asset Standardization — H2H Statistics, Korak 4

## Ishod

Završeni su vizuelni, semantički i tehnički audit Green `h2h-statistics` porodice. Source manifest i centralni Green registar imaju status `locked`.

Korak nije menjao glyph dizajn, H2H podatke, formule, normalizaciju, sortiranje rivala, modal, share ponašanje, CSS dimenzije, motion ili UI geometriju. Uvedene su automatske zaštite koje čuvaju odobreno stanje.

## Završni vizuelni katalog

Audit tabla `docs/green-asset-standardization-h2h-statistics-audit.png` sada prikazuje stvarno produkciono stanje:

- šest sopstvenih H2H canonical identiteta;
- tri zaključana deljena Statistics Overview pojma;
- tri ključna semantička izuzetka.

Sopstveni H2H identiteti su:

1. H2H/rival identity;
2. H2H empty state;
3. highest score protiv jednog rivala;
4. maximum win margin;
5. worst loss margin;
6. versus separator.

Deljeni pojmovi su:

- Fire Streak;
- Draws;
- Average.

Svi ostaju u istom matiranom Green 3D Soft Clay Neumorphism DNK-u, sa forest-green, warm-ivory i jednim kontrolisanim terracotta akcentom, transparentnom pozadinom i bez generičke kartične podloge.

## Potvrđene semantičke razlike

- `highest-score` je najbolji rezultat protiv izabranog rivala i ne zamenjuje zbirni Solo `record`.
- `worst-loss-margin` je veličina jednog najtežeg poraza i ne zamenjuje zbirni broj `losses`.
- `versus` označava suprotstavljanje dva igrača i nije winner, result ili matchmaking state.
- `h2h-empty` označava odsustvo istorije duela; ne označava offline igrača, praznu listu prijatelja ili network problem.
- Fire Streak, Draws i Average dele vizuelne identitete jer predstavljaju iste pojmove, ali ne dele izvore podataka sa globalnom statistikom.
- Hotseat Winner, Online/Invite rezultati, Power Index, medalje, trofeji, avatari i gameplay simboli ostaju van porodice.

## Zaključane prikazne dimenzije

Automatska kontrola čuva stvarne prikaze:

- rival glyph na Statistics kartici: `16 × 16`;
- naslov H2H strane: `29 × 29`;
- Statistics empty state: `92 × 92`;
- Invite empty-rival state: `54 × 54`, `object-fit: contain`;
- šest detail metričkih redova: `26 × 26`;
- VS separator: `50 × 50`;
- modal close kontrola: `34 × 34`;
- share kontrola: puna širina i najmanje `44 px` visine;
- osnovna rival kartica: najmanje `144 px` visine;
- detail modal: najviše `420 px` širine i `680 px` visine u okviru viewporta.

`h2h-empty` runtime ostaje `384 × 384`, a široki `max-win-margin` ostaje `256 × 128` bez razvlačenja na kvadrat.

## Zaključani data binding

H2H overview nastavlja da:

- čita i normalizuje `yamb_h2h_stats`;
- odbacuje neispravne rivale bez validnog imena;
- normalizuje sve brojače na nenegativne cele vrednosti;
- sortira rivale po zbiru pobeda, poraza i nerešenih duela;
- otvara detail modal za tačno izabranu karticu rivala.

Detail modal zadržava izvore:

- Highest Score → `r.myHighScore`;
- Max Win Margin → `r.maxWinMargin`;
- Worst Loss → `r.maxLossMargin`;
- Win Streak → `r.currentWinStreak` i `r.maxWinStreak`;
- Draws → `r.draws`;
- Average → zaokruženi `r.myTotalScore / r.gamesWithScore`;
- Win/Draw/Loss procenti → isti normalizovani record izabranog rivala.

Favorite Rival na Statistics Overview strani i Greatest Rival u Invite toku nastavljaju da koriste postojeće stvarne H2H zapise; standardizacija PNG asseta nije menjala izbor rivala.

## Modal, pristupačnost i share tok

Automatska zaštita potvrđuje:

- otvaranje detail modala klikom na rival karticu;
- `active` i `aria-hidden` stanja;
- zaključavanje body scrolla dok je modal otvoren;
- zatvaranje backdropom, close kontrolom i tasterom Escape;
- vraćanje fokusa na prethodnu rival karticu;
- prosleđivanje kompletnog share snapshot-a sa imenima, recordom, procentima i prosekom;
- native `H2HShare` putanju kada je dostupna;
- Web Share fajl putanju;
- PNG download i informativni fallback;
- vraćanje share dugmeta iz loading stanja posle uspeha ili greške.

Postojeće escape/safe URL kontrole za imena i avatare ostaju nepromenjene.

## Soft Clay površine

Green rival kartice i detail modal zadržavaju postojeću svetliju dark-green Soft Clay obradu. Detail kartica ostaje bez blur filtera, sa punom glinenom površinom, dok zajednički modalni raspored i bezbedne zone ostaju nepromenjeni.

## Preload i performance izolacija

H2H canonical namespace nije deo Green startup paketa. Šest H2H-specific runtime fajlova učitava se samo sa Statistics sobom, dok tri deljena pojma koriste Overview fajlove koji su već deo iste sobe.

Zaključani bilans:

- Green tema: `169 PNG`, `15,75 MB`;
- startup: `17 PNG`, `4,56 MB / 20,44 MB decoded`;
- Statistics room: `18 PNG`, `867.793 B / 6.488.064 decoded B`;
- H2H-specific canonical sadržaj: `6 PNG`, `206.700 B / 1.769.472 decoded B`;
- devet legacy H2H runtime fajlova: `0`;
- aktivne legacy aplikacione reference: `0`.

## Reproducibilnost i zaštita

Build se ponovo izvodi iz šest odobrenih native high-resolution RGBA izvora. Svaki canonical runtime mora odgovarati manifestu i centralnom registru po putanji, dimenziji i SHA-256 otisku.

Kontrola dodatno zahteva:

- šest jedinstvenih sopstvenih identiteta;
- tri tačno mapirane spoljne canonical reference;
- tačan broj canonical potrošača;
- odsustvo svih devet legacy fajlova i aplikacionih veza;
- tačno istorijsko mapiranje svih zamena;
- očuvanje native pravougaone dimenzije Max Win Margin asseta;
- Green cache verziju `47`;
- oba Statistics room matchera;
- odsustvo H2H paketa iz startupa;
- `finalAudit` vezu prema centralnom registru i performance kontroli.

## Status

H2H Statistics porodica je završena i zaključana. Ne treba je ponovo otvarati osim ako se namenski menja njen dizajn, semantika ili funkcionalno ponašanje.

Nije rađen commit niti objavljivanje.
