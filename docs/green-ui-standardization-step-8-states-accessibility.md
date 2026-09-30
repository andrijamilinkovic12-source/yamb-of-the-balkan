# Green UI standardizacija — korak 8: stanja, lokalizacija i pristupačnost (Q1)

Datum: 2026-09-30. Opseg: samo Zelena tema (`dark`) za vizuelne promene; zajedničke semantičke oznake ne menjaju izgled drugih tema. Bez builda, commita i objavljivanja.

## Nalazi i ispravke

| Grupa | Konkretan nalaz | Ispravka |
|---|---|---|
| SR/EN navigacija | Pager Statistike/H2H imao je samo srpske `aria-label` oznake; Liga je imala srpski naziv ranga i X dugmeta i u EN režimu. | Uvedeni su SR/EN ključevi; statički pager koristi `data-lang-aria`, a dinamički pager, X i nazivi grupa Lige koriste aktivni prevod. Pravila već pri sledećem otvaranju obnavljaju jezik i svih šest strana. |
| Loading / empty / error | Dinamička stanja Top liste, Global chata, Online igrača, H2H i Lige nisu svuda bila najavljena čitaču ekrana. Online igrači su pri neuspešnom početnom povezivanju mogli ostati na „Učitavam igrače...“. | Stanja imaju `status`/`alert` prema ozbiljnosti. Posle 8 s bez veze Online igrači prikazuju prevedenu grešku; prekid posle povezivanja takođe prikazuje grešku. Postojeći reconnect/refresh ostaje, a novi timer i socket listener se čiste pri zatvaranju. |
| Success / disabled / locked | Rezultat Dnevnog izazova nije imao najavu uspeha. Dugmad Online igrača sa samo PNG simbolom i `title` atributom nisu imala pouzdano pristupačno ime. | Dnevni rezultat dobija lokalizovanu statusnu oznaku; akcije Online igrača dobijaju `aria-label` iz odgovarajućeg, već prevedenog opisa. Postojeći `disabled` atributi i Green vizuelni stilovi ostaju; nisu menjana pravila dostupnosti nagrada, kupovina ili turnira. |
| Modal i fokus | Zajednički modal, Pravila i Liga nisu dosledno identifikovani kao dijalozi; fokus je mogao ostati na okidaču iza njih. | Dodati su nazivi dijaloga i Green fokus na X/primarnu kontrolu pri otvaranju, sa vraćanjem fokusa po zatvaranju. Dugmad sekcija Lige koriste `aria-pressed`, a ne neodgovarajući `aria-selected` bez `role=tab`. |
| Smanjeni pokret | Green pager Pravila i Statistike i inline animacija Lige nisu poštovali `prefers-reduced-motion` u svim putevima. | Za Green se uklanja glatki skrol i animacija pagera, kao i tranzicije modala/toasta, kada korisnik traži smanjeni pokret. Ostali postojeći Green reduce-motion stilovi ostaju. |

## Mapa stanja pregledana u kodu

| Površina | Pregledano | Granica potvrde |
|---|---|---|
| Dnevni izazov | zadatak, već odigrano, rezultat/uspeh, onemogućena akcija | Pravi rezultat i nagradni video nisu pokrenuti na emulatoru. |
| Top lista, Statistika/H2H, Kvartalna liga | loading/prazno/offline, pager, rangovi i Dvorana slavnih | Nema prijavljenog server-sadržaja i dugih listi u lokalnom browseru. |
| Global chat i Online igrači | prazno/učitavanje, greška veze, pretraga, akcije i disabled | Socket prekid, duga poruka i avatar nisu vizuelno potvrđeni u aktivnoj sobi. |
| Turnir, Riznica i Dukati/Undo | zaključano, disabled, dostupno, nagrada/greška; postojeći Green stilovi i prevodi | Stvarne transakcione/reklamne i turnirske grane nisu izvođene. |
| Pravila i zajednički popup | svih šest definisanih SR/EN strana; dijalog, X, status/tekst | Browser nije mogao da otvori sobu bez prijave; nisu potvrđeni svi sadržaji u oba jezika na telefonu. |
| Solo, Hotseat i online modovi | postojeći kod završnih, waiting i reconnect stanja | Stvarne partije i mrežni scenariji nisu izvođeni. |

## Provera i otvoreno

- Lokalni browser 320 × 568: Green (`dark`) i statusni elementi Global chata/Online igrača imaju `role=status`; tačke Statistike su 44 px. Promenom jezika na splash ekranu, obe `aria-label` oznake Statistike prešle su na engleski, pa su vraćene na srpski. Ovo nije test aktivne sobe.
- Regresioni test proverava da šest novih ARIA prevoda postoji u oba jezika, vezu oznaka sa pagerom/Ligom, statusne/greška grane i reduced-motion put. `npm test` i `git diff --check` prolaze (uz postojeća Git upozorenja o LF/CRLF završecima redova).
- **Q1 nije vizuelno zatvoren za svaku sobu.** Potreban je prijavljen Android emulator sa Green temom, SR/EN i uključenom opcijom smanjenog pokreta. Posebno ostaju proverni slučajevi: zaista prazan/greška/loading/success, zaključano/disabled, vrlo duga imena, fokus unutar svakog otvorenog modala i povratak fokusa. `aria-modal` i inicijalni fokus nisu potpuna zamena za ručni test tastature/čitača ekrana.

Sledeći planirani korak: završni vizuelni prolaz po svakoj sobi (korak 9) i regresija drugih tema; otvoreni nalazi ostaju otvoreni dok se ne vide u aktivnom emulatoru.
