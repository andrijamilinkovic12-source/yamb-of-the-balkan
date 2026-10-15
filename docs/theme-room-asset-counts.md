# Aktivni PNG po sobama i temama — ugovor za brojanje

Datum: 15. oktobar 2026. Obuhvat: Turnir, Riznica, Global Chat, Online igrači, Dukati / Ispravi zadnji upis, Dnevni izazov i Top lista u svih deset tema.

## Pravilo

1. **Uloga** je jedna funkcija slike: npr. „trofej šampiona”, „skin kockice” ili „zatvori sobu”. Ista uloga mora postojati u svakoj temi. Jedan PNG prikazan pet puta u jednoj sobi broji se kao jedna datoteka te sobe.
2. **PNG datoteka** je jedna stvarna produkciona putanja. Tehničke izvedenice (velika/mala ikona, lice skina/pregled, prednja/inline verzija) broje se odvojeno u ovoj koloni. Ne broje se masteri, review slike, stari fajlovi koje aktivni prikaz ne koristi ni CSS/emoji.
3. Univerzalni katalog se računa **ponovo u svakoj temi**: svih 48 skinova i njihovih 48 PNG pregleda u Riznici, kao i svih 10 malih pregleda tema. Zaključavanje poklon skina menja ono što vidi konkretan nalog, ne broj uloga kataloga. Provera stvarno vidljivih kartica mora koristiti isti nalog i isti skup kupljenih tema.
4. Isti PNG korišćen u različitim sobama broji se jednom **u svakoj sobi**. Kolona „jedinstveno kroz sedam soba” uklanja takva ponavljanja. Glavni meni, intro i ekrani same partije nisu uključeni u ovih sedam soba.
5. Jednak broj potvrđuje pokrivenost inventara, ali ne potvrđuje da je svaka slika vidljiva u svakom stanju, da se učitava brzo, niti da je estetski prihvaćena. Za to ostaje pregled u pokrenutoj aplikaciji.

| Soba | Uloga po temi | PNG putanja po temi | Sadržaj |
| --- | ---: | ---: | --- |
| Turnir | 16 | 16 | 14 turnirskih uloga, indeks snage, X |
| Riznica | 116 | 180 | identitet, 8 kontrola, 26 trofeja, 16 efekata sa po dve PNG izvedenice, 3 medalje zbirke, 2 video ikone, dukat, 48 skinova sa po dve PNG izvedenice, 10 pregleda tema, X |
| Global Chat | 4 | 4 | identitet, prazno/učitavanje, slanje, X |
| Online igrači | 8 | 8 | identitet, 6 unutrašnjih ikona, X |
| Dukati / Ispravi zadnji upis | 6 | 8 | identitet, dukat i token sa po dve izvedenice, aktivna i nedostupna video ikona, X |
| Dnevni izazov | 6 | 6 | identitet, zadatak, završetak, već odigrano, video, dukat |
| Top lista | 8 | 8 | identitet, globalna, lokalna, prazno/učitavanje, tri medalje, X |
| **Zbir prikaza po sobama** | **164** | **230** | Ponavljene zajedničke slike broje se u svakoj sobi |

Svih deset tema imaju isti rezultat po svakom redu, bez nedostajućih putanja. Posle uklanjanja ponavljanja između soba, **svaka tema ima 222 jedinstvene PNG putanje** u ovom definisanom obuhvatu. Pojedinačni rezultati i lista nedostajućih fajlova su u [mašinskom izveštaju](theme-room-asset-counts.json). Ponovna provera: `npm run audit:theme-room-assets`.

| Tema | Turnir | Riznica | Global Chat | Online igrači | Dukati / Upis | Dnevni izazov | Top lista | Jedinstveni PNG |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Zelena | 16 | 180 | 4 | 8 | 8 | 6 | 8 | 222 |
| Svetlo zlato | 16 | 180 | 4 | 8 | 8 | 6 | 8 | 222 |
| Trula višnja | 16 | 180 | 4 | 8 | 8 | 6 | 8 | 222 |
| Plavi okean | 16 | 180 | 4 | 8 | 8 | 6 | 8 | 222 |
| Neon Cyber | 16 | 180 | 4 | 8 | 8 | 6 | 8 | 222 |
| Kraljevski ametist | 16 | 180 | 4 | 8 | 8 | 6 | 8 | 222 |
| Vaskršnja | 16 | 180 | 4 | 8 | 8 | 6 | 8 | 222 |
| Pustinjsko staklo | 16 | 180 | 4 | 8 | 8 | 6 | 8 | 222 |
| Mesečev sjaj | 16 | 180 | 4 | 8 | 8 | 6 | 8 | 222 |
| Severna maglina | 16 | 180 | 4 | 8 | 8 | 6 | 8 | 222 |

Brojevi u ovoj tabeli predstavljaju PNG putanje koje propisuje inventar aktivnih stanja sobe. To je statička provera povezanih fajlova, a ne zapis stvarno učitanih slika u otvorenoj partiji. Posebna provera u aplikaciji ostaje potrebna za prikaz, keširanje i stanja kupljenih sadržaja.

## Provera DNK i starih asseta

Jednak broj fajlova **nije potvrda** da su sve slike nove ili da prate DNK teme. Kontrolna suma tematskih PNG fajlova iz inventara nije pokazala nijednu doslovno identičnu datoteku između dve teme za istu ulogu (`crossThemeIdentical: []` u izveštaju). Ta provera ne otkriva prebojene kopije i ne ocenjuje stil, pravac, materijal, paletu ili kontrast. Za njih je potreban pojedinačan pregled PNG slike u stvarnoj veličini, uz poreklo iz zasebnog mastera.

Ranije pronađene 42 stare HTML reference u sobi Dukati / Ispravi zadnji upis za Vaskršnju, Pustinjsko staklo i Severnu maglinu su uklonjene. Za četiri motiva u svakoj od te tri teme napravljeni su zasebni novi masteri i povezane su njihove kanonske `-v2.png` izvedenice; [pregled novih slika](theme-economy-critical-v2-review.png) i [manifest porekla i SHA-256](../source-assets/theme-economy-critical-v2/manifest.json) omogućavaju pojedinačnu proveru. Stari fajlovi u istorijskom paketu ostaju na disku radi kompatibilnosti sa ranije keširanim izdanjima, ali nisu aktivni u HTML-u ove sobe. U izveštaju je `legacyEconomyReferences.occurrences: 0`. **Stvarna vidljivost u svim stanjima sobe i vizuelni DNK ostaju za proveru u pokrenutoj aplikaciji; statička provera ih ne potvrđuje.**

Za Top listu je dodato 27 zasebno generisanih PNG slika, po tri unutrašnje uloge za devet tema. [Pregled](theme-leaderboard-controls-v2-review.png) i [manifest porekla](../source-assets/theme-leaderboard-controls-v2/manifest.json) beleže mastere i produkcione fajlove. Za istih devet tema posebno je generisan identitet sobe sa petokrakom iznad odgovarajućeg postolja, sa [vizuelnim poređenjem](theme-leaderboard-room-identity-v2-review.png) i [manifestom porekla](../source-assets/theme-leaderboard-room-identity-v2/manifest.json). Zelena zadržava svoj kanonski identitet. Za svih deset tema sada postoje tri nove, zasebno generisane medalje plasmana u Top listi i u Top 3 prikazu tokom čekanja online partije: [pregled na 44 px](theme-leaderboard-medals-v2-room-review.png), [pregled na 38 px](theme-leaderboard-medals-v2-waiting-review.png) i [manifest 30 PNG asseta](../source-assets/theme-leaderboard-medals-v2/manifest.json). X ostaje kanonski tematski fajl. Provera `npm run check:theme-leaderboard-room` potvrđuje jedinstvene fajlove, dimenzije i povezivanje. Stvarni prikaz u aplikaciji ostaje zasebna provera.

Pri prihvatanju svake sobe treba potvrditi tri stvari odvojeno: paritet broja, poreklo i vizuelni DNK tematskih asseta, zatim prikaz bez starih PNG/SVG fajlova u pokrenutoj aplikaciji. Detaljan ugovor je `roomAssetParityRules` u [definiciji tema](theme-definitions.json).

Ovaj broj zamenjuje raniji presek od 108 tematskih fajlova: taj presek nije uključio univerzalne skinove i preglede, zajednički X, kao ni tehničke izvedenice koje aktivni kod koristi. Uključivao je i jedan prethodno pripreman, ali ne nužno prikazan PNG nagradnog videa Riznice, pa nije bio mera aktivnog inventara.
