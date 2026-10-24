# Devet efekata i Ledeno doba — 24.10.2026.

Implementirano za svih deset tema u `www/live-effects-stage.js`, povezano preko stvarnog `EffectManager` i kartica Riznice. Trenutni animirani pregled: [effects-final-animation.html](effects-final-animation.html). Efekat i tema biraju se u vrhu; dugme Ponovi pokrece stvarni runtime.

| Efekat | Trajanje | Ziva animacija | PNG i identitet |
|---|---:|---|---|
| Neon puls | 5 s | Tri putujuca impulsa oko stvarne table i jedan mirniji scan | Svetlosna geometrija, paleta teme |
| Gromovnik | 4.5 s | Razgranati kratki povratni udari i lokalno osvetljenje | Svetlosna geometrija, paleta teme |
| Svadba | 8.6 s | Cetiri ritmicke trube, svetlosni talasi i papirne trake | Novi univerzalni PNG prave mesingane trube; okolno svetlo i trake po temi |
| Vatromet | 7 s | Uspon raketa, razliciti raspadi, otpor, gravitacija i gasenje | Zive cestice i paleta teme |
| Svetleci dronovi | 8.2 s | Pojedinacni dronovi formiraju prvo ime igraca, zatim se razilaze | Canvas tacke, bez nepokretnog naslova preko roja |
| Svemirska prasina | 6 s | Tri dubinska sloja magline i razlicito brze cestice | Zive cestice i paleta teme |
| UFO abdukcija | 7.5 s | Dolazak, lebdenje, zrak, spiralne cestice i kopije upisanih brojeva | Deset zasebno generisanih novih tanjira razlicitih silueta i materijala |
| Zmajeva vatra | 5.5 s | Povezani plameni jezici iz donje ivice, talasanje, uzdizanje zara | Novi univerzalni volumetrijski plamen; deo zara prati temu |
| Kraljevski Yamb | 8 s | Pokretno scensko svetlo, dolazak logotipa i fizicki pad/okretanje dukata | Postojeci kanonski logo i particle dukat izabrane teme |
| Ledeno doba, ispravka | 6.5 s | Istovremeno sirenje leda iz cetiri ugla do sredine, kroz pun obuhvat table | Novi univerzalni PNG ledenog ugla, bez ranije slike skracene table |

Svi novi PNG fajlovi nalaze se u `www/assets/effects/stage-v1/`. Izradjeni su built-in image_gen alatom. Masteri, tacni promptovi, dimenzije, namerni univerzalni izuzeci i SHA-256 su u `source-assets/theme-live-stage-v1/manifest.json` i `prompts.md`. Trinaest runtime PNG fajlova ukupno zauzima oko 3 MB. Slike su pripremljene za isporuku kropovanjem prozirnih margina i smanjenjem rezolucije, bez promene njihovih boja.

Stari aktivni UFO, kraljevski, svadbeni i vatrometni rendereri uklonjeni su iz upravljaca. Stari runtime PNG-ovi Ledenog doba v4 uklonjeni su; izvorni master ostaje oznacen kao povucen u njegovom manifestu. Svih 16 kartica efekata i dalje ostaje u katalogu.

Provera obuhvata 100 scena, tri dimenzije ekrana, stvarno povezivanje preko EffectManager-a, promenu teme, prekid, zakasnelo ucitavanje, smanjeni pokret, ciscenje vizuelno zatamnjenih brojeva i nepromenjen rezultat partije. Zajednicka proslava pobede zadrzava vatromet dok zasebno pocinje kisa kanonskih dukata. Pregledani su i rasterizovani Canvas2D kadrovi i cetiri faze zaleđivanja. Te provere ne potvrđuju konacnu fluidnost Android WebView-a na Samsung S25; to ostaje proba na uredjaju.
