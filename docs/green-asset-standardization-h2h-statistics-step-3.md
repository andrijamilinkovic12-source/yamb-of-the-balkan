# Green Asset Standardization — H2H Statistics, Korak 3

## Ishod

Canonical `h2h-statistics` paket povezan je sa kompletnim Green H2H tokom. Porodica je registrovana kao `standardized`; završni audit i status `locked` ostaju za Korak 4.

Izgled glyph-ova, H2H podaci, formule, normalizacija zapisa, sortiranje rivala, modal, share akcija, CSS dimenzije, motion i UI geometrija nisu promenjeni.

## Povezani potrošači

### H2H identitet

`canonical/h2h-statistics/h2h-identity-v1.png` sada koriste:

- Statistics kartica omiljenog rivala;
- naslov strane Međusobni dueli;
- obe H2H reference u Pravilima;
- Statistics room-on-demand paket.

### H2H prazno stanje

`canonical/h2h-statistics/h2h-empty-v1.png` sada koriste:

- prazna H2H lista kada nema odigranih duela;
- prazan Greatest Rival prikaz u Invite/Pronađi prijatelja toku;
- Statistics room-on-demand paket.

### H2H detail modal

Sopstveni canonical H2H glyph-ovi povezani su za:

- `highest-score` → najbolji rezultat protiv izabranog rivala;
- `max-win-margin` → najveća pobednička razlika;
- `worst-loss-margin` → najteži poraz;
- `versus` → separator dva igrača.

Postojeći detail mapper sada koristi eksplicitnu Green mapu, umesto konstruisanja jedne legacy putanje iz imena fajla. Easter i Desert mapiranje nije menjano.

## Deljeni pojmovi bez duplikata

Tri H2H reda sada koriste već zaključane Statistics Overview identitete:

- H2H Vatreni niz → `canonical/statistics-overview/fire-streak-v1.png`;
- H2H Nerešeno → `canonical/statistics-overview/draws-v1.png`;
- H2H Prosek → `canonical/statistics-overview/average-v1.png`.

Deljen je samo PNG identitet pojma. Podaci ostaju H2H-specifični:

- niz čita `r.currentWinStreak` i `r.maxWinStreak`;
- nerešeno čita `r.draws`;
- prosek računa `r.myTotalScore / r.gamesWithScore`.

Globalna Statistics strana nastavlja da koristi sopstvene aggregate izvore i formule.

## Room-on-demand integracija

Green lista asseta sada sadrži šest canonical H2H putanja. Tri deljena Overview asseta već su prisutna u istoj Statistics sobi, pa nisu dodata drugi put.

Stvarni matcher i performance klasifikator prepoznaju:

- `canonical/statistics-overview/`;
- `canonical/h2h-statistics/`.

H2H paket ostaje izvan startup kritične putanje.

## Centralni registar

Porodica `h2hStatistics` dodata je u `www/themes/green/asset-registry.json` sa:

- statusom `standardized`;
- šest sopstvenih canonical runtime uloga;
- tri spoljne reference na zaključanu `statisticsOverview` porodicu;
- RGBA dimenzijama i SHA-256 otiscima;
- podrškom za native `256 × 128` Max Win Margin format;
- devet zabranjenih legacy putanja;
- istorijskim mapiranjem svake stare putanje na canonical zamenu;
- semantičkim izuzecima i šest grupa code bindinga.

Source manifest sada ima isti `standardized` status i evidentira šest povezanih tokova: Statistics stranu, H2H empty state, Invite empty rival, detail modal, Pravila i room-on-demand paket.

## Uklonjene legacy kopije

Posle potvrde da imaju nula aktivnih aplikacionih referenci uklonjeno je tačno devet runtime fajlova:

- `statistics/h2h-v1.png`;
- `statistics/h2h-empty-v1.png`;
- `statistics/h2h-detail/highest-score-v1.png`;
- `statistics/h2h-detail/max-margin-v1.png`;
- `statistics/h2h-detail/worst-loss-v1.png`;
- `statistics/h2h-detail/win-streak-v1.png`;
- `statistics/h2h-detail/draw-v1.png`;
- `statistics/h2h-detail/average-v1.png`;
- `statistics/h2h-detail/vs-v1.png`.

Odobreni high-resolution izvori i šest canonical mastera ostaju sačuvani. Tri uklonjena semantička duplikata imaju postojeće zaključane Overview zamene. Centralni registar zabranjuje povratak svih devet starih runtime putanja.

## Reproducibilan build posle migracije

`build-green-canonical-h2h-statistics-pack.py` više ne zavisi od uklonjenih aktivnih runtime kopija. Paket se ponovo gradi direktno iz šest odobrenih native RGBA source fajlova:

1. source se kopira kao canonical master;
2. runtime se izvodi LANCZOS skaliranjem na deklarisanu dimenziju;
3. čuvaju se `384 × 384` empty state i `256 × 128` Max Win Margin format;
4. manifest i performance kontrola potvrđuju dimenzije i hash vrednosti.

Build je uspešno ponovljen nakon brisanja legacy fajlova i svih šest hash vrednosti ostalo je nepromenjeno.

## Cache verzija

Green manifest verzija povećana je sa `46` na `47`, kako uređaj ne bi zadržao stare H2H URL-ove posle sledećeg web/Android sync procesa.

## Automatska kontrola

`check-theme-performance.js` sada proverava:

- `standardized` status registra i source manifesta;
- Green cache verziju `47`;
- šest sopstvenih i tri deljene H2H uloge;
- manifest/registry identitet, putanje, dimenzije i hash vrednosti;
- jedinstvenost canonical master/runtime sadržaja;
- postojanje šest canonical fajlova i odsustvo devet legacy fajlova;
- očekivani broj canonical potrošača i nula legacy referenci;
- tačno mapiranje spoljnih Fire Streak, Draws i Average identiteta;
- očuvanje H2H izvora podataka i formula;
- stvarni i performance Statistics matcher;
- odsustvo H2H paketa iz startup preloada;
- istorijsko mapiranje, zabranjene putanje i semantičke granice;
- pravougaone registry dimenzije za Max Win Margin.

## Performance posle integracije

- Green tema: `169 PNG`, ukupno `15,75 MB`.
- Startup: nepromenjen, `17 PNG`, `4,56 MB / 20,44 MB decoded`.
- Statistics room: `18 PNG`, `867.793 B / 6.488.064 decoded B`.
- H2H-specifični canonical paket: `6 PNG`, `206.700 B / 1.769.472 decoded B`.
- Najveći Green room paket ostaje Riznica: `44 PNG`, `2,94 MB / 13,70 MB decoded`.

U odnosu na stanje pre H2H standardizacije uklonjena su tri semantička duplikata, `72.303` kompresovana bajta i `786.432` procenjena dekodirana bajta iz Statistics room paketa. Startup nije povećan.

## Sledeći korak

Korak 4 je završna vizuelna, semantička i tehnička kontrola. Proveriće se stvarne CSS dimenzije, empty/invite/detail prikazi, H2H data binding, share i modal ponašanje, deljeni Overview identiteti, preload izolacija, build reprodukcija i zabranjene putanje, nakon čega porodica može preći iz `standardized` u `locked`.

Nije rađen commit niti objavljivanje.
