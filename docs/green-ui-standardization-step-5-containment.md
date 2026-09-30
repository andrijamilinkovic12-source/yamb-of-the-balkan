# Green UI standardizacija — korak 5: centriranje i containment (P1)

Datum: 2026-09-29. Opseg: Zelena tema (`dark`). Bez builda, commita i objavljivanja.

## Provereno u kodu i lokalnom DOM-u

| Element | Nalaz | Postupak / status |
|---|---|---|
| Dnevni izazov — 6 kockica | Stvarni DOM sadrži 6 elemenata; Green CSS drži 3 jednake kolone, centriranje po koloni, `box-sizing: border-box` i maksimum 82 px po kockici. | Postojeća zaštita zadržana; nema dokazanog razloga za novu promenu dimenzije. Vidljivo stanje tokom bacanja i rezultata na emulatoru ostaje otvoreno. |
| Online random / poziv — glavni avatari | Dva postojeća avatar slota imaju izračunatih 54 × 54 px, `max-width: 100%` i `object-fit: cover`; kartice imaju `min-width: 0` i `overflow: hidden`. | Postojeća zaštita zadržana; stvarni Google avatar i dugo ime u svakom stanju treba još pogledati na emulatoru. |
| Pozovi prijatelja — vlasnička kartica | Vlasnička kartica je iznutra podeljena na profil i najvećeg rivala, a spolja je do sada stajala pored druge kartice i VS oznake. Pri viewportu 390 px to je ostavljalo oko 147 px po spoljnoj kartici, oko 58 px po unutrašnjoj koloni i praktično nultu širinu za ime pored avatara od 54 px. | Green spoljne kartice sada stoje vertikalno, svaka koristi punu raspoloživu širinu; VS je između i centriran. Dva unutrašnja profila ostaju jedan pored drugog unutar vlasničke kartice. |
| Online igrači, Podešavanja, H2H, lista prijatelja | Postoje `min-width: 0`, ograničenja slika, `object-fit: cover` i prelamanje/ograničenje imena; nisu pronađeni dokazi za slepo menjanje njihovih veličina. | Kod pregledan; vizuelni QA sa stvarnim avatarima, ekstremno dugim imenima i akcijama ostaje otvoren. |

## Provera i granice dokaza

- `teme.css?v=6.88` je učitan u lokalnom browseru. Izračunati stilovi potvrđuju 3 kolone i 6 kockica, kao i avatar slotove 54 × 54 px. Lokalna aplikacija se bez prijave zaustavlja na welcome ekranu, pa dinamična stanja nisu bila prikazana.
- Pokušaj pregleda Android emulatora nije dao pouzdan kadar aplikacije (alat je vratio drugi prozor). Zato **ne tvrdimo** da je ceo P1 vizuelno potvrđen na telefonu.
- `npm test` i Green asset coverage prolaze. Test dodaje zaštitu da raspored poziva i mreža kockica ne skliznu nazad pri budućim izmenama.
- Za zatvaranje P1 još treba otvoriti Dnevni izazov (bacanje/rezultat), Online random i Pozovi prijatelja (traženje/pronađen protivnik), Podešavanja, H2H i Online igrače na uskom i standardnom telefonu, sa Google avatarom i dugim SR/EN imenom. Proveriti i bedževe/duge vrednosti koji nastaju tek iz stvarnih podataka.

Sledeći planirani korak iz mape je S1 — safe area i responsivnost.
