# Green Asset Standardization — Treasury Achievement trofeji, Korak 4

## Ishod

Green Achievement Trophies katalog završno je vizuelno, semantički i tehnički proverен. Centralni registar i source manifest sada imaju status `locked`.

Ovaj korak nije menjao vizuelni sadržaj, uslove osvajanja, iznose nagrada, server potvrdu, lokalni fallback, retry/rollback tok, statistiku niti Treasury geometriju.

## Zaključani sistem

Porodica sadrži 26 različitih dostignuća. Zaključano pravilo nije „jedan generički pehar“, već:

- jedan nepromenljiv Green PNG identitet za svaki achievement ID;
- isti PNG identitet na Treasury kartici, unlock popup-u i end-game showcase-u;
- zajednički forest-green, warm-ivory i terracotta Soft Clay DNK;
- slobodan centralni glyph na transparentnoj pozadini, bez kartice i teksta;
- jedinstvena semantička silueta svakog dostignuća.

## Zaključana 1:1 matrica

Svih 26 ID-jeva iz `config.js` mora postojati tačno jednom u:

1. source manifest katalogu;
2. canonical master paketu;
3. canonical runtime paketu;
4. centralnom Green registru;
5. Treasury room-on-demand listi.

Ime mastera mora biti `green-${id}-master-v1.png`, a runtime putanja `canonical/achievement-trophies/${id}-v1.png`. Registry uloga mora biti identična achievement ID-ju, a registry hash mora biti identičan odgovarajućem manifest hash-u.

## Zaključani potrošači

| Površina | Izvor identiteta |
|---|---|
| Treasury trophy kartica | `item.greenIcon` |
| Achievement unlock popup | `trophy.greenIcon` |
| End-game trophy showcase | `trophy.greenIcon` |
| Green Treasury warmup | `item.greenIcon` |
| Treasury room-on-demand paket | 26 eksplicitnih canonical putanja |

`config.js` ostaje jedino mesto koje dinamički formira Green achievement putanju iz ID-ja.

## Integritet paketa

Zaključavanje pokriva:

- 26 master PNG fajlova rezolucije `384 × 384`;
- 26 runtime PNG fajlova rezolucije `256 × 256`;
- direktan alpha kanal svih 52 fajla;
- SHA-256 otisak svakog master/runtime fajla;
- 26 jedinstvenih ID-jeva i 26 jedinstvenih registry uloga;
- odsustvo dupliranih runtime sadržaja;
- identičan runtime katalog u source manifestu i centralnom registru;
- tačno izvedena imena fajlova iz zaključanih ID-jeva.

## Semantičke granice

Automatska kontrola čuva van achievement porodice:

- Treasury trophies-tab navigacioni glyph;
- Statistics zbirni brojač trofeja;
- Tournament pobedničke i ceremonijalne pehare;
- Tournament finalist nagradu;
- General Podium i Quarterly League medalje;
- Treasury Collection medalje;
- QL rank bedževe i medals-tab glyph;
- winner, victory-state i room-intro simbole;
- dukate i potrošne tokene.

`godlike` lovor i `veteran` medalja ostaju isključivo achievement ilustracije svojih ID-jeva i ne smeju se koristiti kao generički competition asseti.

## Zabranjene stare putanje

Svih 26 starih `treasury/trophies/*-v1.png` runtime putanja ostaje u registru kao zabranjeno. Test pada ako se vrati bilo koji stari fajl ili aktivna referenca. Svih 26 istorijskih/source PNG fajlova ostaje sačuvano i mapirano na canonical zamene.

## Automatska kontrola

`check-theme-performance.js` proverava:

- `locked` status centralnog registra i source manifesta;
- evidentiranu završnu kontrolu;
- tačan skup 26 ID-jeva iz `config.js`;
- identitet materijala, palete i nepromenljivog ID-to-PNG mapiranja;
- imena master/runtime fajlova izvedena iz ID-ja;
- manifest/registry putanje i SHA-256 podudaranje;
- dimenzije, alpha kanal i sadržaj svih 52 fajla;
- jedinstvenost svih runtime sadržaja;
- tačan broj template, card, popup, showcase, warmup i room veza;
- odsustvo starih runtime fajlova i referenci;
- očuvanje semantičkih izuzetaka;
- Treasury room preload izolaciju.

## Performanse pri zaključavanju

- Green tema: `173 PNG`, ukupno `16,87 MB`.
- Startup paket: `17 PNG`, `4,56 MB` kompresovano / `20,44 MB` procenjeno dekodirano.
- Najveći Green room paket: Riznica, `44 PNG`, `2,94 MB` kompresovano / `13,70 MB` procenjeno dekodirano.

Achievement trofeji se ne učitavaju na startup-u. Učitavaju se pri ulasku u Riznicu, uz postojeći ograničeni paralelni warmup.

## Pravilo za buduće izmene

Promena bilo kog zaključanog achievement trofeja zahteva novu verziju mastera i runtime asseta, ažuriranje oba SHA-256 otiska, source manifesta, centralnog registra i room veze. Postojeći canonical fajl ne sme se tiho prepisivati, a jedan achievement ID ne sme na različitim površinama koristiti različite Green PNG-ove.

Nije rađen commit niti objavljivanje.
