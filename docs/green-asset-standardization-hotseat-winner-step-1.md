# Green Asset Standardization — Hotseat Winner, Korak 1

## Opseg

Sledeća porodica za standardizaciju je `Hotseat Winner`. Ovaj korak je inventar, vizuelna i semantička dijagnoza; nijedan runtime asset, rezultat partije, motion, nagrada ili UI tok nije promenjen.

Porodica trenutno ima jedan stvarni Green PNG identitet. Online, tehnički i turnirski rezultati nemaju pravo da ga automatski naslede samo zato što mogu prikazati tekst „Pobeda“.

## Kandidat u porodici

| Predloženi ID | Trenutni asset | Semantička uloga | Glavna silueta |
|---|---|---|---|
| `hotseat-winner` | `hotseat/winner-v1.png` | pobednik lokalne partije za dva igrača | dve glinene figure: forest-green pobednik napred sa ivory check oznakom i terracotta tačkom, ivory protivnik pozadi |

## Trenutno ponašanje

Asset se prikazuje samo kada su istovremeno ispunjena tri uslova:

1. rezultat pripada režimu `Hotseat`;
2. partija nije završena nerešeno;
3. `game-over-screen` ima klase `is-hotseat-result` i `has-result-winner`.

Kod remija `has-result-winner` nije postavljen. Online i tehnički rezultat uklanjaju Hotseat klase, pa ne prikazuju ovaj mark. Time trenutna logika pravilno čuva lokalni multiplayer kontekst.

Aktivne veze su:

- jedan `<img>` potrošač u `www/index.html`;
- jedna Hotseat room-on-demand preload veza u `www/game.js`;
- Green CSS pravilo za prikaz na `58 × 58` CSS piksela;
- reveal motion od `0,48 s`, uz potpuno isključenje animacije kada je aktivan `prefers-reduced-motion: reduce`.

## Tehnički inventar

| Sloj | Putanja | Dimenzije | Alpha | SHA-256 |
|---|---|---:|---|---|
| sačuvani source | `source-assets/green-soft-clay-hires/hotseat/winner-v1.png` | `512 × 512` | RGBA | `99f6cb072816aba333f883a4e2ad3def3fdc0fdb5bb29a40e6e70954acd30beb` |
| aktivni runtime | `www/assets/green-soft-clay/hotseat/winner-v1.png` | `384 × 384` | RGBA | `396a608821feaa3f02597e2c06c7681032f93a857f5a7cbf3dad940591994981` |

Aktivni runtime ima `81.039` bajtova. Za najveći prikaz od `58` CSS piksela, canonical runtime od `256 × 256` zadržava više nego dovoljnu gustinu i omogućava smanjenje paketa bez vidljivog gubitka kvaliteta.

## Vizuelni zaključak

Nije potreban novi render. Postojeći asset je kvalitetan i pripada odobrenom Green Soft Clay DNK-u:

- koristi forest-green, warm-ivory i jedan kontrolisani terracotta akcenat;
- ima matirani glineni materijal i meko gornje-levo osvetljenje;
- silueta dve figure jasno komunicira lokalni duel;
- veliki ivory check nedvosmisleno označava pobedničku stranu;
- nema tekst, scenu ili zasebnu kvadratnu karticu;
- transparentna pozadina i čiste ivice dobro rade na postojećoj game-over kartici.

## Semantičke granice

Sledeći asseti i pojmovi ne pripadaju Hotseat Winner porodici:

- `statistics/wins-v1.png`, koji predstavlja zbir pobeda u Statistici;
- `statistics/draws-v1.png` i `statistics/losses-v1.png`;
- Tournament `champion-trophy` i `finalist-silver` nagrade;
- Quarterly League champion oznaka, rank bedževi i podium medalje;
- General Podium i Treasury Collection medalje;
- achievement trofeji;
- Solo personal-best, score mark, claim i reward-video kontrole;
- Online Random, Invite Friend i tehnički win/loss/draw rezultati;
- Tournament completed-match check;
- Invite accepted i Treasury owned check oznake.

Zajednički motiv check oznake nije dovoljan razlog za ponovnu upotrebu. Hotseat mark predstavlja odnos dva lokalna igrača; Statistics wins predstavlja zbir, Tournament pehar predstavlja takmičarsku titulu, a state check predstavlja završeno stanje.

## Online i generički winner slučajevi

Trenutni Online i tehnički game-over tokovi koriste naslov, poruku, rezultat i postojeći celebration efekat, ali nemaju poseban Green winner PNG. U ovom koraku se novi asset ne izmišlja, jer standardizacija treba da zaključava postojeće semantičke identitete, a ne da menja dizajn rezultata bez posebnog zahteva.

Ako se kasnije uvede Online winner mark, mora dobiti sopstveni ID i jasno različitu multiplayer/network siluetu. Ne sme preuzeti `hotseat-winner` samo zbog reči „Pobeda“.

## Predlog standarda

Canonical paket treba da zadrži postojeći odobreni vizuelni identitet uz:

1. ID `hotseat-winner` kao jedini Green identitet pobednika lokalne partije za dva igrača;
2. sačuvani `512 × 512` source kao canonical master;
3. canonical runtime od `256 × 256`, izveden proporcionalno iz istog mastera;
4. jednu canonical putanju za game-over prikaz i Hotseat room preload;
5. očuvanje postojećeg `58 × 58` prikaza, reveal motiona i reduced-motion ponašanja;
6. uklanjanje stare runtime putanje tek nakon potpune zamene svih aktivnih veza;
7. zabranu korišćenja kao Statistics, Online, Solo, Tournament, League, Treasury ili generički winner simbol.

## Sledeći korak

Korak 2 je izrada canonical `hotseat-winner` paketa iz postojećeg odobrenog source asseta: čuvanje mastera, izrada transparentnog `256 × 256` runtime PNG-a, source manifest i početna automatska kontrola dimenzija, alpha kanala i SHA-256 integriteta.

Nije rađen commit niti objavljivanje.
