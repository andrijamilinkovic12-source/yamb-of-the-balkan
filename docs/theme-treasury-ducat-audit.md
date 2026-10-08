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
