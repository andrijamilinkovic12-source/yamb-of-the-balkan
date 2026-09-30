# Green Asset Standardization — Settings Controls, Korak 3

## Ishod

Osam funkcionalnih ikonica u Podešavanjima sada se isporučuju iz `www/assets/green-soft-clay/canonical/settings-controls/`. Zamenjene su tačno osam Green putanja u `www/index.html`, osam u Settings room-on-demand katalogu u `www/game.js` i dve dodatne mape (`profile`, `privacy`) u `www/pravilaigre.js`. Svaki canonical URL ima očekivane dve, odnosno tri produkcione reference, a starih produkcionih referenci nema.

Sve canonical datoteke su bajt-po-bajt identične ranijim aktivnim PNG-ovima. Nisu menjani pikseli, dimenzije prikaza (`20 / 25 / 18 px`), tekst, vrednosti podešavanja, prekidači, pravni URL-ovi ni glavni Settings room zupčanik. Profil i privatnost i dalje koriste svoj isti motiv u Pravilima.

## Učitavanje i registar

Settings room matcher sada prepoznaje `canonical/settings-controls/`. Njegova kontrolna kopija u performance testu prati isti obrazac. Aktivni sobni paket ostaje `9 PNG / 554.053 B / 3.145.728` procenjenih dekodiranih bajtova. Startup ostaje `17 PNG / 4,56 MiB / 20,44 MiB` procenjeno dekodirano; nijedna od osam malih kontrola nije dodata u njega. Green cache verzija je povećana na `63` zbog novih URL-ova.

Source manifest i centralni registar imaju privremeni status `standardized`, sa tačno osam canonical isporuka, osam zabranjenih starih putanja, SHA-256 otiscima i mapiranjem zamena. Završni status `locked` ostaje za Korak 4. Coverage audit sada prikazuje `162 PNG / 14.792.994 B`, od kojih je `145` registrovano, `16` manifestom zaštićeno i `1` foundation; staged i pending grupa su prazne. Centralni registar ima `31 locked + 1 standardized` porodicu.

## Bezbedno povlačenje

Pre uklanjanja je za svaku od osam starih `settings/*.png` kopija potvrđena ista veličina i SHA-256 kao kod canonical datoteke, a produkcioni HTML/JS više nije sadržao staru putanju. Uklonjeno je samo tih osam suvišnih runtime kopija, ukupno `358.064 B`. Odobreni 1254 px izvori i sačuvani masteri ostaju van shipped `www` stabla, a build skripta uspešno reprodukuje canonical PNG-ove i bez starih kopija. Ovo uklanjanje je oporavljivo iz mastera/builda i prethodnog Git stanja.

[Audit tabla](green-asset-standardization-settings-controls-audit.png) ponovo je generisana iz canonical PNG-ova. Završni Korak 4 treba da potvrdi vizuelnu čitljivost na stvarnim dimenzijama, semantičke granice, sve URL veze, izolaciju drugih tema, veličine i cache, pa da zaključa porodicu. Nije rađen commit, objavljivanje niti pregled na Android emulatoru.
