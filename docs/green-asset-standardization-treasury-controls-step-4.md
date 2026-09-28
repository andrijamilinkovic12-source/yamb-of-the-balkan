# Green Asset Standardization — Treasury Controls, Korak 4

## Ishod

Green Treasury Controls paket završno je vizuelno, semantički i tehnički proverен. Centralni registar i source manifest sada imaju status `locked`.

Ovaj korak nije menjao izgled PNG asseta, Treasury funkcionalnost, cene, uslove otključavanja, aktivaciju predmeta, tekstove, Rules sadržaj niti geometriju interfejsa.

## Zaključane podfamilije

`navigationTabs` sadrži tačno četiri navigaciona identiteta:

- `tab-trophies` — katalog dostignuća;
- `tab-skins` — katalog skinova kockica;
- `tab-effects` — katalog vizuelnih efekata;
- `tab-themes` — katalog tema interfejsa.

`itemStatuses` sadrži tačno četiri stanja predmeta:

- `status-owned` — predmet je kupljen ili već posedovan;
- `status-active` — posedovani predmet je trenutno aktiviran;
- `status-locked` — uslov za predmet još nije ispunjen;
- `status-insufficient` — nema dovoljno dukata za kupovinu.

Navigacione ikone i statusi ostaju odvojene semantičke podfamilije. `owned` nije isto što i `active`, a `locked` nije isto što i `insufficient`.

## Zaključani vizuelni DNK

Svih osam ikona zadržava:

- matirani 3D Soft Clay Neumorphism materijal;
- forest-green, warm-ivory i terracotta paletu;
- jedan centralni, lako čitljiv semantički glyph;
- transparentnu pozadinu bez kartice, okvira ili teksta;
- meko gornje-levo svetlo i kontrolisanu glinenu dubinu.

Završni audit list potvrđuje jasnu razliku svih osam silueta i njihovu usklađenost sa Green Room Pack DNK-om.

## Zaključani potrošači

| Površina | Veza |
|---|---|
| Treasury četiri taba | četiri canonical navigation glyph-a |
| Rules Treasury navigacija | isti canonical navigation glyph-ovi |
| Treasury kartice | zajednički status helper za owned, active i locked |
| Skriven opis predmeta | canonical locked status |
| Nedovoljno dukata | canonical insufficient status |
| Treasury room-on-demand paket | osam eksplicitnih canonical putanja |

## Integritet paketa

Zaključavanje pokriva:

- osam master PNG fajlova rezolucije `512 × 512`;
- osam runtime PNG fajlova rezolucije `256 × 256`;
- direktan alpha kanal svih 16 fajlova;
- SHA-256 otisak svakog master/runtime fajla;
- tačno osam jedinstvenih ID-jeva i registry uloga;
- odsustvo dupliranog runtime sadržaja;
- identične manifest i registry putanje i otiske;
- zaključana imena master i runtime fajlova izvedena iz ID-jeva.

## Semantičke granice

Treasury Controls ne obuhvataju achievement trofeje, zbirni Statistics trofej, Collection medalje, Tournament ili Quarterly League kontrole, Daily završna stanja, Invite accepted, Solo claim, Rewarded Video kontrole, generičke check/play radnje, CSS aktivno stanje taba, dukate, tokene ili winner oznake.

## Zabranjene stare putanje

Osam starih `treasury/tab-*` i `treasury/status-*` runtime putanja ostaje evidentirano kao zabranjeno. Automatska kontrola pada ako se vrati stari fajl ili aktivna referenca. Originalni high-resolution izvori ostaju sačuvani i mapirani na canonical zamene.

## Automatska kontrola

`check-theme-performance.js` proverava:

- `locked` status registra i source manifesta;
- evidentiran završni audit;
- tačne podfamilije, osam ID-jeva i njihove semantičke uloge;
- zaključani vizuelni DNK i konvenciju imena;
- dimenzije, alpha kanal, SHA-256 integritet i jedinstvenost sadržaja;
- manifest/registry podudaranje;
- Treasury, Rules, helper, upozorenje i room-on-demand veze;
- odsustvo starih runtime fajlova i aktivnih referenci;
- očuvanje semantičkih izuzetaka i preload izolacije.

## Performanse pri zaključavanju

- Green tema: `173 PNG`, ukupno `16,87 MB`.
- Startup paket: `17 PNG`, `4,56 MB` kompresovano / `20,44 MB` procenjeno dekodirano.
- Najveći Green room paket: Riznica, `44 PNG`, `2,94 MB` kompresovano / `13,70 MB` procenjeno dekodirano.

Treasury Controls se ne učitavaju na startup-u. Učitavaju se pri ulasku u Riznicu kroz postojeći room-on-demand tok.

## Pravilo za buduće izmene

Promena bilo koje zaključane kontrole zahteva novu verziju mastera i runtime asseta, ažuriranje oba SHA-256 otiska, source manifesta, centralnog registra i odgovarajućih potrošača. Postojeći canonical fajl ne sme se tiho prepisivati, niti se različite semantičke uloge smeju spajati u jedan glyph.

Nije rađen commit niti objavljivanje.
