# Green Asset Standardization — Undo token, Korak 1

Datum audita: 2026-09-28

Ovaj korak je inventar i semantička dijagnoza. Nije promenjen nijedan runtime PNG, UI element, raspored, nagrada niti Undo funkcionalnost.

## Zaključak

Najjači kandidat za jedini Green Undo token već postoji kao `economy/undo-token-v1.png`: mat ivory obod, duboko šumsko-zeleno lice i jedna puna terracotta kružna Undo strelica. Direktni prikazi u sobi Dukati / Ispravi zadnji upis već koriste taj isti asset.

Jedina potvrđena PNG nedoslednost nalazi se u ilustraciji Pravila `rules/pages/economy-treasury-v2.png`, gde je Undo token nacrtan kao terracotta disk sa ivory strelicom. Taj token mora biti zamenjen kanonskim identitetom bez menjanja kovčega i tri kanonska dukata.

## PNG inventar

| ID | Asset | Semantika | Ocena |
|---|---|---|---|
| U1 | `economy/undo-token-v1.png` | Pravi potrošni Undo token | Kanonski kandidat; 512 px izvorni master i 384 px runtime |
| U2 | `ducats-undo-free-v3.png` | Zajednička oznaka sobe: dukat + velika Undo strelica | Nije zaseban token; strelica označava radnju |
| U3 | `ducats-undo-pro-v2.png` | Uramljena zajednička oznaka sobe | Trenutno postoji samo u opštem room preload spisku i nema potvrđen vidljivi Green prikaz; kandidat za uklanjanje iz runtime paketa |
| U4 | `rules/pages/economy-treasury-v2.png` | Tri dukata, kovčeg i pravi Undo token | Token nije usklađen sa U1; potreban precizan prerender samo tokena |
| U5 | `runtime/menu/ducats-undo-free-v3.png` | Startup izvedenica U2 | Ispravna 384 px izvedenica, nije novi identitet tokena |
| U6 | `economy/rewarded-video-v1.png` | Video nagrada | Nije token; uz njega se `+1` prikazuje pomoću U1 |
| U7 | `economy/ad-unavailable-v1.png` | Nedostupan video oglas | Nije token |

## Direktne upotrebe kanonskog kandidata U1

U1 je povezan na svim direktnim mestima unutar Green ekonomije:

- aktivno zaglavlje taba Ispravi zadnji upis;
- ikona samog Undo taba;
- prikaz broja `Vaši tokeni`;
- nagrada `+1` uz rewarded video;
- naslov odeljka Vraćanje upisa u srpskim i engleskim Pravilima preko tematskog mapiranja;
- room-on-demand priprema ekonomskog paketa.

Podrazumevani SVG `#app-icon-undo-token` postoji za druge teme i fallback, ali ga Green CSS sakriva i umesto njega prikazuje U1.

## Važno semantičko razdvajanje

Standardizacija ne sme svaku zakrivljenu strelicu pretvoriti u token:

1. **Undo token** je potrošna stavka i mora uvek koristiti puni U1 identitet.
2. **Undo action glyph** je velika terracotta strelica oko dukata u zajedničkoj ikoni sobe; ona govori „ispravi upis”, ali nije novčić ni token.
3. **Gameplay Undo kontrola** `#btn-undo-move` koristi znak `↩️`; to je funkcionalno dugme za radnju, ne prikaz inventara tokena.
4. Strelice za nazad, zatvaranje, slajdove i navigaciju nisu deo ove porodice.

## Predlog zaključanog identiteta

- mat 3D Soft Clay Neumorphism bez sjaja i metala;
- debeo, zaobljen ivory glineni obod;
- blago uvučeno duboko forest-green lice;
- jedna puna terracotta kružna strelica suprotna smeru kazaljke na satu;
- vrh strelice u gornjem levom sektoru;
- bez pet tačaka dukata, slova, zvezde, krune, medalje ili dodatnog ornamenta;
- čista transparentna pozadina i meko osvetljenje odozgo sleva.

## Sledeći koraci za ovu porodicu

1. Potvrditi U1 kao kanonski master i napraviti namenski canonical paket (`front`, `inline` i po potrebi manja UI izvedenica) isključivo skaliranjem istog mastera.
2. Zameniti neusaglašeni token u U4 kanonskim tokenom uz očuvanje svih ostalih elemenata kompozicije.
3. Proveriti U2/U5 kao dozvoljeni action glyph, a U3 ukloniti iz preloada ako ostane bez stvarne upotrebe.
4. Povezati sve direktne Green prikaze na canonical putanje i promeniti cache verzije.
5. Dodati `undoToken` porodicu u centralni Green registar, automatsku proveru i završno zaključavanje.

## Van opsega

- kanonski dukat, koji je već zaključan;
- obične navigacione i gameplay strelice;
- video play simboli i oznake nedostupnog oglasa;
- medalje, rank bedževi i trofeji;
- asseti drugih tema.
