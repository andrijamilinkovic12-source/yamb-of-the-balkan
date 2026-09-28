# Green Asset Standardization — Korak 3

## Ishod

Kanonski Green dukat je povezan sa svim direktnim runtime prikazima koji nisu deo već renderovane kompozicije.

## Povezano

- Dukati / Ispravi zadnji upis: zaglavlje, tab, glavni prikaz i nagradni video.
- Riznica: stanje, nagradni video i Green preview efekta Zlatna kiša.
- Statistika, Dnevni izazov i Pravila.
- Sve dinamičke i prevedene poruke preko `dukatIconHtml()`.
- Green Zlatna kiša: svaki padajući novčić je kanonski dukat; nema mešanja dijamanata i kruna.
- Green Royal Yamb canvas: koristi isti kanonski particle dukat umesto posebnog novčića sa slovom Y.

## Kanonski runtime izvori

- `ducat-front-v1.png` — veliki direktni UI prikazi.
- `ducat-inline-v1.png` — tekst, stanje i mali indikatori.
- `ducat-particle-v1.png` — animacije i preview efekta.
- `ducat-angle-left-v1.png` i `ducat-angle-right-v1.png` — odobrene perspektive za naredni render korak.

## Izolacija

Promene efekata i asseta aktiviraju se samo za internu `dark` temu, odnosno Green Room Pack. Easter, Desert i ostale teme zadržavaju postojeće prikaze i efekte.

## Namerno odloženo za Korak 4

Već renderovane kompozicije koje u sebi imaju nacrtane dukate nisu menjane u ovom koraku. Tu spadaju kovčezi, nagradne scene, paket-ikone i drugi PNG asseti gde je stari novčić „zapečen” u slici. Oni moraju biti zasebno prerađeni iz kanonskih front/angle mastera, bez promene kompozicije i značenja.

## Provera

- Stari runtime put `green-soft-clay/economy/ducat-v1.png` više se ne koristi u `www` kodu.
- JavaScript sintaksa je ispravna.
- Svih devet direktno pokrenutih regresionih provera prolazi, uključujući `check-theme-performance.js`.
- Green startup paket ostaje 17 PNG / 4.57 MB; kanonski dukati se učitavaju po ulasku u sobu ili pri pokretanju efekta.
