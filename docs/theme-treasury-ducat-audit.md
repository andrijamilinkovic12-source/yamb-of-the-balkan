# Riznica i kanonski dukat — provera svih tema

Datum: 2026-10-08. Pravilo: svaki dukat vidljiv u kovcegu Riznice mora pripadati istoj temi i imati isti oblik, materijal, boje i pet tacaka kao njen kanonski dukat. [Vizuelno poredjenje](theme-treasury-ducat-review.html) prikazuje svih deset tema.

| Tema | Nalaz | Radnja |
| --- | --- | --- |
| Zelena | Uskladjena referenca | Bez promene |
| Svetlo Zlato | Mat medeno-zlatni dukati sa pet udubljenja | Bez promene |
| Trula Visnja | Visnjini Clay dukati sa pet ispupcenih tacaka | Bez promene |
| Plavi Okean | Prethodni dukati u kovcegu bili su preuski/ovalni | Ispravljeni u skladu sa okruglim plavim dukatom |
| Neon Cyber | Prethodni dukati bili su zlatni, suprotno kanonskom tamnoplavom/tirkiznom dukatu | Zamenjeni tamnoplavim dukatima sa pet tirkiznih tacaka |
| Kraljevski Ametist | Ametistni Clay dukati sa pet svetlih tacaka | Bez promene |
| Vaskrsnja | Prethodni dukati bili su okrugli, bez ovalnog obrisa i sage ruba | Ispravljeni u skladu sa kanonskim dukatom |
| Pustinjsko Staklo | Prethodni dukati imali su ispupcene bele tacke | Zamenjeni dukatima sa pet tamnih udubljenja |
| Mesecev Sjaj | Prethodni dukati imali su ispupcene svetle tacke | Zamenjeni dukatima sa pet tamnih udubljenja |
| Severna Maglina | Ledeno-plavi dukati sa tamnim petotackastim licem | Bez promene |

Pet ispravljenih PNG mastera je u `source-assets/theme-icon-packs/<tema>/main-rooms-v1/treasury-master-v2.png`. Iz svakog su izvedene iste standardne produkcione velicine: 384 x 384 px za glavni meni i 512 x 512 px za sobu/intro. Aktivne putanje ostaju `runtime/menu/treasury-free-v3.png` i `treasury-free-v3.png`; URL sada koristi `?v=2` radi osvezavanja kesa. Originalni master v1 ostaje u istoriji izvora i Git-u.

Izrada: ugradjeni ImageGen, pojedinacna precizna izmena za svaku od pet tema. Svaki prompt je zahtevao da se promene samo tri dukata u postojecem kovcegu, uz referencu na kanonski `ducat-front-v1.png`; kovceg, kadar, materijal i providna pozadina ostaju isti. Za Neon: tamnoplavi dukati, tirkizni rub i pet tirkiznih tacaka, bez zlata. Za Plavi Okean: okrugli plavi dukati sa pet svetlih ispupcenih tacaka. Za Vaskrsnju: mat krem ovalni dukati sa sage rubom i pet udubljenja. Za Pustinjsko Staklo: koralni Clay dukati sa pet tamnih udubljenja. Za Mesecev Sjaj: sivo-beli Clay dukati sa pet tamnih udubljenja. Nijedan dizajn nije prebojena ikona druge teme.

## Ponovna provera 2026-10-20

Ovaj raniji pregled poredio je kovcege sa `ducat-front-v1.png`. Posle njega su Vaskrsnja, Pustinjsko Staklo i Severna Maglina dobile aktivnu kanonsku porodicu `ducat-*-v2.png` (`www/theme-ducat-pack.js`), dok su PNG kovcezi ostali renderovani sa starijim motivom. Zbog toga tvrdnja da su svih deset tema trenutno uskladjene vise ne vazi.

Direktni prikazi dukata koriste odgovarajucu kanonsku putanju svake teme: `assets/theme-packs/<tema>/canonical/ducat/ducat-front-v1|v2.png` odnosno `ducat-inline-v1|v2.png`; Zelena koristi `assets/green-soft-clay/canonical/ducat/*-v1.png`. Ikona Riznice u meniju je poseban `runtime/menu/treasury-free-v3.png` od 384 px, a soba/intro koristi `treasury-free-v3.png` od 512 px. Dukati u oba kovcega su ugradjeni u kompozitnu sliku i nikada se ne ucitavaju iz kanonske putanje. Svih 40 aktivnih fajlova iz ove cetiri uloge postoji i ima standardne dimenzije (front 512 px, inline 192 px, meni 384 px, soba 512 px).

| Tema | Trenutno stanje dukata u kovcegu |
| --- | --- |
| Zelena, Svetlo Zlato, Trula Visnja, Plavi Okean, Neon Cyber, Kraljevski Ametist, Mesecev Sjaj | Motiv odgovara aktivnoj v1 porodici, ali je zaseban render i nije ista PNG putanja. Neon je tamnoplav sa tirkiznim rubom i pet tacaka; ne koristi zlatni dukat. |
| Vaskrsnja | Kovceg zadrzava krem/sage v1 sa zelenim tackama; aktivni v2 ima bakarne tacke i drukciji obod. Potreban novi render oba kovcega. |
| Pustinjsko Staklo | Kovceg zadrzava raniji koralni v1 obod; aktivni v2 ima izrazitiji uglasti glineni obod. Potreban novi render oba kovcega. |
| Severna Maglina | Kovceg zadrzava svetlo lice i tamne udubljene tacke v1; aktivni v2 ima tamnoplavo lice i pet svetlih ispupcenih tacaka. Potreban novi render oba kovcega. |

[Aktuelno vizuelno poredjenje](theme-treasury-ducat-review.html) sada prikazuje aktivnu v2 verziju za ove tri teme. Ova ponovna provera nije zamenila produkcione PNG kovcege.

## Ispravka 2026-10-20

Za Vaskrsnju, Pustinjsko Staklo i Severnu Maglinu ImageGen-om su pojedinacno preradjeni kovcezi prema aktivnom kanonskom `ducat-front-v2.png`. Tri nova transparentna mastera su `source-assets/theme-icon-packs/<tema>/main-rooms-v1/treasury-master-v3.png`. Iz njih `scripts/build-treasury-v2-coin-composites.ps1` izvodi 384 px meni i 512 px sobu/intro sa istim faktorom popune (.88) kao prethodni paket. Aktivne putanje ostaju iste, a kod za ove tri teme koristi `?v=3` da se ukloni stara kesirana slika. Svaki od tri vidljiva dukata u svakom kovcegu ima pet tacaka; ostali delovi kovcega su sacuvani. Raniji zakljucak o neuskladjenosti iz ponovne provere iznad je time razresen.
