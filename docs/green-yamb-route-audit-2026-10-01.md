# Green — putanja opremljenog efekta do Yamb upisa (2026-10-01)

Ovaj korak nadovezuje se na [izolovanu proveru svih 16 animacija](green-live-effects-audit-2026-10-01.md). Ovde je provereno povezivanje Riznice i upisa rezultata, ne samo neposredno pozivanje `EffectManager.trigger()`.

## Šta je izvršeno

Lokalni QA ekran [green-yamb-route.html](../qa/green-yamb-route.html) preuzima stvarni `#game-scene` iz `index.html` i izvršava izdvojene stvarne metode `ShopManager.equip`, `YambApp.createScoreTables`, `YambApp.getBest5`, `YambApp.calcPoints`, `YambApp.writeScore` i klasu `EffectManager`. Ostali delovi aplikacije i mrežni pozivi nisu pokrenuti. Sintetički igrač ima šest šestica, otključana su samo dva test efekta, a aktivni efekat u lokalnom Chrome skladištu se vraća posle svakog scenarija. Nema naloga, kupovine, nagrade, socket-a, upisa na server ni stvarnog meča.

[Android CDP provera](../qa/audit-green-yamb-route-cdp.js) je prošla za tri slučaja:

| Scenario | Proveren ishod |
|---|---|
| Prvi hitac, u Riznici opremljen UFO | `writeScore` upisuje 80 poena, uključuje oznaku Sveti Ilija i okida namenski Grom, ne UFO. [Snimak Green glinenog Groma](../screenshots/green-ui-step9/green-yamb-route-first-roll-thunder-cdp.png). |
| Drugi hitac, opremljen UFO | Upisuje 80 poena; aktivira se kanonski Green UFO bez starog broda ili Groma. [Snimak na stvarnoj tabli](../screenshots/green-ui-step9/green-yamb-route-equipped-ufo-cdp.png). |
| Drugi hitac, opremljen Kraljevski Yamb | Upisuje 80 poena i koristi svoj Green PNG, ne stari `Logo_green.png`. |

Nakon svakog scenarija efekat je zaustavljen; nisu ostali FX elementi/klase ni horizontalni overflow na testiranom viewportu. Headless emulator je ponekad odlagao CSS kadrove, pa su **samo dokazni snimci** pomereni na vidljivu tačku animacije preko Web Animations API-ja. To ne dokazuje realni tempo animacije ili FPS.

## Ispravka otkrivena u ovom koraku

Green Grom, koji se namenski pušta na Yamb iz prvog bacanja, sada prikazuje već postojeći kanonski glineni oblak i toplu krem-zelenkastu munju. Green varijanta ima blaži potres bez rotacije i uvećanja tela, kako tabla ne bi izlazila iz bočnih granica. Sve je ograničeno na Green; Uskrs i Pustinjsko staklo zadržavaju staru animaciju. Ciljane provere izolacije sva tri izbora teme prolaze. Promenjeni JS/CSS imaju nove cache verzije u `index.html`.

## Šta nije potvrđeno

Ovo i dalje nije produkcioni Android WebView ili pun Solo/Hotseat tok sa lokalnom sesijom, zvukom, haptikom i stvarnim bacanjem. Native build nije rađen po dogovoru. Puni end-to-end test zahteva kontrolisano okruženje za lokalnu sesiju i novu instalaciju kada odobrimo build; do tada ne treba označiti taj deo kao zatvoren. Nije rađen commit.
