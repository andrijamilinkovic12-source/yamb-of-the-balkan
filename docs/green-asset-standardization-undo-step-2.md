# Green Asset Standardization — Undo token, Korak 2

## Ishod

Postojeći U1 je potvrđen kao jedini kanonski Green Undo token. Njegov izgled nije regenerisan niti kreativno menjan: odobreni 512 px RGBA izvor je sačuvan kao kanonski master, a runtime izvedenice su deterministički napravljene iz njega LANCZOS skaliranjem.

Kanonski identitet:

- mat 3D Soft Clay Neumorphism;
- debeo, zaobljen ivory glineni obod;
- uvučeno tamno forest-green lice;
- jedna puna terracotta kružna Undo strelica suprotna smeru kazaljke na satu;
- vrh strelice u gornjem levom sektoru;
- transparentna pozadina i bez dodatnih simbola.

## Kanonski paket

| Uloga | Putanja | Rezolucija | Namena |
|---|---|---:|---|
| Master | `source-assets/green-soft-clay-canonical/undo-token/green-undo-token-front-master-v1.png` | 512 × 512 | Jedini odobreni izvor identiteta |
| Front | `www/assets/green-soft-clay/canonical/undo-token/undo-token-front-v1.png` | 512 × 512 | Zaglavlje i tab sobe |
| Inline | `www/assets/green-soft-clay/canonical/undo-token/undo-token-inline-v1.png` | 192 × 192 | Brojač tokena, nagrada `+1` i naslov u Pravilima |

Manifest izvora nalazi se u `source-assets/green-soft-clay-canonical/undo-token/manifest.json`, a reprodukcija paketa u `scripts/build-green-canonical-undo-pack.py`.

## Runtime integracija

Na canonical putanje prebačeni su:

1. Green Undo ikona u zaglavlju ekonomije;
2. Green ikona Undo taba;
3. prikaz `Vaši tokeni`;
4. prikaz nagrade `+1`;
5. srpski i engleski naslov Vraćanje upisa u Pravilima;
6. room-on-demand lista ekonomskog paketa.

Stari `www/assets/green-soft-clay/economy/undo-token-v1.png` uklonjen je iz aplikacionog paketa nakon prebacivanja svih referenci. Njegov originalni high-resolution izvor ostaje sačuvan, kao i kanonska kopija mastera.

## Registar i automatska kontrola

Porodica `undoToken` dodata je u `www/themes/green/asset-registry.json` sa statusom `canonical`. Registar definiše identitet, odobrene runtime izvedenice, staru zabranjenu putanju, zamenu za istorijski master i semantičke izuzetke.

`scripts/check-theme-performance.js` sada proverava sve registrovane Green porodice, ne samo dukat:

- prisustvo i dimenzije svakog registrovanog PNG-a;
- direktan alpha kanal;
- stvarnu runtime vezu;
- odsustvo zabranjenih starih putanja i fajlova;
- jednoznačnu mapu zamena za stare mastere.

Posle Koraka 2 Green paket ima 172 PNG i 17,18 MB. Startup ostaje nepromenjen na 17 PNG i 4,56 MB, jer se Undo paket učitava tek pri ulasku u odgovarajuću sobu.

## Namerno ostavljeno za Korak 3

- zamena neusaglašenog terracotta/ivory tokena u `rules/pages/economy-treasury-v2.png`;
- konačna odluka o nepotrebnom `ducats-undo-pro-v2.png` preloadu;
- registracija dozvoljenih zajedničkih kompozicija i zaključavanje porodice statusom `locked`.

Velika terracotta strelica oko dukata i gameplay/navigacione strelice nisu Undo tokeni i nisu menjane.
