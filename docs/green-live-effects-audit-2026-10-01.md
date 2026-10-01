# Green Riznica — živi efekti u partiji (lokalni QA, 2026-10-01)

Posle provere 14 Green preview kartica, proverena je odvojena putanja `EffectManager` koja izvodi animacije na tabli. Preview kartica sama po sebi nije dokaz da se isti motiv prikazuje u partiji.

## Opseg i rezultat

U izolovanom Android Chrome prikazu pokrenuto je svih 16 ID-jeva koje `EffectManager` podržava: `confetti`, `gold_rain`, `fireflies`, `bubbles`, `ice_age`, `black_hole`, `supernova`, `neon_pulse`, `drones`, `thunder`, `balkan`, `fireworks`, `cosmic_dust`, `ufo_abduction`, `dragon_fire` i `royal_yamb`. Svaki je imao očekivani DOM/canvas cilj, nije izazvao horizontalni overflow i očistio je svoje elemente i klase nakon `stop()`. Automatska provera je u [QA skripti](../qa/audit-green-live-effects-cdp.js), a izolovana tabla u [QA fixture-u](../qa/green-effect-runtime.html). Fixture koristi stvarnu klasu `EffectManager` iz `managers.js`, ali sintetičku tablu i utišane zvuke; nema naloga, kupovine, nagrade, mrežnog meča ni izmene rezultata.

Vizuelni snimci na uskom Android profilu (360 × 700 CSS px, sistemski font 130%) potvrđuju odabrane reprezentativne animacije: [Ledeno doba](../screenshots/green-ui-step9/green-live-fx-ice_age-cdp.png), [neonski puls](../screenshots/green-ui-step9/green-live-fx-neon_pulse-cdp.png), [Svadba](../screenshots/green-ui-step9/green-live-fx-balkan-cdp.png), [dronovi](../screenshots/green-ui-step9/green-live-fx-drones-cdp.png), [UFO](../screenshots/green-ui-step9/green-live-fx-ufo_abduction-cdp.png) i [Kraljevski Yamb](../screenshots/green-ui-step9/green-live-fx-royal_yamb-cdp.png). Ostalih deset je potvrđeno pokretanjem/čišćenjem, ne detaljnim vizuelnim pregledom svakog frejma.

## Ispravljeno samo za Green

- Svadba više ne ubacuje emoji trube ni stare crveno-bele čestice. Koristi postojeći kanonski glineni motiv, zelenu scenu i isti kanonski dukat u delu čestica.
- Mehurići više nisu emoji; stilizovani su kao zelene 3D clay sfere.
- Kraljevski Yamb koristi svoj kanonski Green PNG umesto starog `Logo_green.png`.
- Neonski puls i dronovi koriste svetlozelenu, tamnozelenu i krem paletu umesto ljubičasto-cijan varijante.
- UFO animacija koristi postojeći Green clay PNG letećeg tanjira i ujednačene zrake, brojeve i atmosferu. Originalni brod i njegova animacija ostaju u drugim temama.
- Green slike se postavljaju u `src` tek kada je Green efekat zaista aktiviran; skriveni motivi se ne učitavaju pri početnom ulasku.
- `Gold Rain` više ne može naknadno da oživi posle `stop()` ako se Green sprite dukata još učitava; namenski je testirana usporena slika i trenutno zaustavljanje.

Provera izolacije potvrdila je Green motiv za Svadbu/UFO/Kraljevski Yamb i odsustvo tih motiva u ciljanom Uskrs/Pustinjsko staklo testu. `check-theme-performance.js` i ostale projektne Node provere prolaze.

## Granica potvrde

Ovo je runtime animacije na izolovanoj tabli, ne produkcioni Android WebView. Nisu testirani stvarna kupovina/aktiviranje u Riznici, stvarni Yamb okidač tokom meča, zvuk, haptika, FPS/memorija u dugoj sesiji niti svih 16 animacija frejm po frejm. Igrina logika pri prvom Yambu može namenski da pusti `thunder` pre opremljenog efekta; to ovde nije menjano. Za te provere je potreban kontrolisan meč na emulatoru ili test okruženje. Nije rađen native build ni commit.
