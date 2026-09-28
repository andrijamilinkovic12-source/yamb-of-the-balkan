# Green Asset Standardization — Treasury Achievement trofeji, Korak 1

Datum audita: 2026-09-28

Ovaj korak je inventar, vizuelna kontrola i semantička dijagnoza. Nijedan runtime PNG, uslov osvajanja, nagrada, statistika, Treasury raspored, popup, showcase niti preload tok nije promenjen.

## Zaključak

Green Treasury već ima kompletan i vizuelno koherentan set od 26 achievement trofeja. Svaki trofej predstavlja drugo dostignuće i zato se ova porodica ne sme svesti na jednu generičku medalju ili isti simbol u različitim bojama.

Standardizacija ove porodice znači:

1. svaki achievement ID ima tačno jedan zaključan Green PNG identitet;
2. isti PNG se ponavlja svuda gde se taj achievement prikazuje — na kartici Riznice, u popup-u i u završnom showcase-u;
3. svih 26 simbola deli isti Green Room Pack materijal, paletu, svetlo i transparentnu prezentaciju;
4. navigacioni, zbirni, turnirski i podium simboli ostaju izvan porodice.

Vizuelni audit nije pronašao asset koji zahteva ponovno renderovanje. Svih 26 postojećih mastera prihvataju se kao canonical kandidati za naredni korak.

## Zajednički DNK

- mat 3D Soft Clay Neumorphism;
- forest-green, warm-ivory i terracotta osnovna paleta;
- meko osvetljenje odozgo/levo i kontrolisana glinena senka;
- slobodan semantički glyph na transparentnoj pozadini;
- bez kvadratne kartice, okvira, pejzažne baze ili teksta unutar PNG-a;
- čitljiva centralna silueta pri mobilnoj veličini;
- terracotta detalji služe kao akcenat, a ne kao zaseban konkurentski identitet;
- kockice koriste prepoznatljive standardne rasporede tačkica.

Zajednički DNK ne znači identičnu geometriju. Kruna, šešir, zmaj, alat, sova, štit i ostali objekti namerno ostaju različiti jer nose različitu achievement semantiku.

## Kompletan inventar

| # | ID | Achievement | Zaključana semantika |
|---:|---|---|---|
| 1 | `first_play` | Prvo bacanje | prva završena partija; jedna Yamb kockica |
| 2 | `apprentice` | Šegrt | deset partija; početnički alat |
| 3 | `veteran` | Veteran | pedeset partija; veteranska medalja |
| 4 | `kafana` | Kafanski sto | Hotseat partija; dve zdravice |
| 5 | `score_1000` | Vojvoda | rezultat preko 1000; vojvodska kruna |
| 6 | `grandmaster` | Velemajstor | rezultat preko 1250; majstorski cilindar |
| 7 | `legend` | Legenda | rezultat preko 2000; istaknuta zvezda |
| 8 | `mythic` | Mitski igrač | rezultat preko 2500; glava zmaja |
| 9 | `godlike` | Božanstvo | rezultat 3000+; munja i lovor kao achievement ilustracija |
| 10 | `surgeon` | Hirurg | Ručno bez nule; skalpel i štit |
| 11 | `prophet` | Prorok | tri Najave zaredom; kristalna kugla |
| 12 | `sniper` | Snajper | Yamb u Najavi; meta sa kockicom |
| 13 | `math` | Matematičar | tačno 63 u Zbiru 1; geometrijski alat i olovka |
| 14 | `concrete` | Armirani beton | sve Kente; tri glinene cigle |
| 15 | `perfectionist` | Perfekcionista | bonus u svim kolonama; listić i potvrda |
| 16 | `miner` | Rudar | Zbir 2 preko 60; pijuk i kristal |
| 17 | `immortal` | Neuništiv | partija bez nule; štit i zvezda |
| 18 | `sveti_ilija` | Sveti Ilija | Yamb iz prvog bacanja; munja na oblaku |
| 19 | `hazard` | Hazarder | Yamb u Ručno; upozorenje sa kockicom |
| 20 | `firecracker` | Petarda | svih pet Yambova; petarde |
| 21 | `potato` | Krompiruša | precrtan Yamb; krompir i poništena kockica |
| 22 | `minimal` | Minimalac | Min manji od sedam; niski stubičasti prikaz |
| 23 | `achilles` | Ahilova peta | samo Yamb je nula; napukli štit |
| 24 | `close_call` | Za dlaku | razlika manja od pet; dve bliske kockice |
| 25 | `night_owl` | Noćna ptica | partija između 03–05h; sova i polumesec |
| 26 | `spite` | Inat | završena partija uz 200+ zaostatka; podignuta pesnica |

Vizuelni pregled je sačuvan u `docs/green-asset-standardization-achievement-trophies-audit.png`.

## Tehnički inventar

- `config.js`: 26 achievement ID-jeva;
- runtime direktorijum: 26 PNG fajlova;
- source/master direktorijum: 26 PNG fajlova;
- Green Treasury room-on-demand lista: 26 jedinstvenih veza;
- nedostajući, višak ili duplirani ID-jevi: 0;
- identični SHA-256 sadržaji unutar runtime seta: 0;
- svi masteri: `384 × 384`, RGBA;
- svi runtime asseti: `256 × 256`, RGBA.

## Stvarna funkcionalna upotreba

`config.js` gradi jedan `greenIcon` iz istog achievement ID-ja. Taj izvor koriste:

- kartice Trofeji taba u Riznici preko `getThemedTrophyCardSource()`;
- Green achievement popup u `trophyManager.js`;
- završni Green trophy showcase u `game.js`.

Svih 26 asseta je u Treasury room-on-demand listi. `riznica.js` ih zagreva u najviše četiri paralelna toka tokom Green intro animacije Riznice. Nisu deo startup paketa.

Uslovi osvajanja i iznosi nagrada ostaju u postojećoj konfiguraciji i trophy logici; standardizacija PNG identiteta ih ne menja.

## Semantički izuzeci

Sledeći simboli nisu pojedinačni achievement trofeji i ne ulaze u ovu porodicu:

- `treasury/tab-trophies-v1.png` — navigacioni glyph taba;
- `statistics/trophies-v1.png` — zbirni brojač osvojenih trofeja;
- Tournament pobednički pehar i ceremonijalni trofej;
- Tournament finalist nagrada;
- General Podium i Quarterly League medalje;
- Treasury Bronze/Silver/Gold Collection medalje;
- QL rank bedževi i medals-tab glyph;
- winner, victory-state i room-intro simboli;
- dukati, Undo tokeni i Rewarded Video simboli.

`godlike` lovor i `veteran` medalja ostaju achievement ilustracije vezane isključivo za svoje ID-jeve. Ne smeju se koristiti kao podium medalje niti zameniti zaključane competition porodice.

## Sledeći koraci za ovu porodicu

1. Formirati canonical `achievementTrophies` paket iz postojećih 26 odobrenih mastera, bez ImageGen izmene.
2. Generisati optimizovan canonical runtime set i manifest sa ID-jem, ulogom, dimenzijom i SHA-256 otiskom svakog asseta.
3. Prebaciti `config.js`, Treasury room-on-demand listu, kartice, popup i showcase na jedan canonical namespace.
4. Evidentirati stare runtime putanje kao zabranjene i ukloniti samo njihove runtime kopije; istorijske source fajlove sačuvati.
5. Dodati `achievementTrophies` u centralni Green registar, proveriti 1:1 mapiranje svih 26 ID-jeva i završno zaključati porodicu.

## Van opsega Koraka 1

- renderovanje ili vizuelna promena trofeja;
- promena uslova, nagrada, statistike ili server potvrde;
- menjanje drugih tema;
- menjanje tab, statistics, tournament, podium, collection, rank ili winner asseta;
- premeštanje ili brisanje runtime fajlova.
