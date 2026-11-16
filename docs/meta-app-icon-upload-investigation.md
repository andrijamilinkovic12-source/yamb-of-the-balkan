# Istraživanje Meta greške pri slanju ikone

Datum pregleda: 16. 11. 2026. Povezano sa korakom 7 iz `facebook-production-release-plan.md` i produkcionom aplikacijom Yamb of the Balkan `1111460668363524`.

Pregledano je svih pet sličnih tema prikazanih uz korisnikovu objavu. Sadržaj i odgovori čitani su kroz prijavljeni Edge, jer ih javni web alat nije mogao otvoriti. Nalazi ispod su iskustva autora na javnom forumu; nisu zvanično saopštenje Mete niti potvrđena dijagnoza našeg naloga.

## Pregled nalaza

| Tema | Zabeleženo iskustvo | Odgovori i status pri pregledu |
| --- | --- | --- |
| [Ispravna ikona 1024 × 1024 — MIKI OATH](https://developers.facebook.com/community/threads/1040303502043466/) | Autor navodi isti odgovor HTTP 200 uz grešku 1357032, uprkos ispravnom punom kadru, RGB PNG-u bez providnosti i metapodataka, JPG-u i osveženim sesijama. Navodi da aplikacija ima poslovnog vlasnika, odgovarajući pristup i nema otvorene Required Actions. | Vidljivi odgovori drugih korisnika potvrđuju problem ili traže rešenje. Nema vidljivog rešenja; status Unresolved. |
| [Kellyn Nails Spa Assistant — slanje ikone blokira prijavu na pregled](https://developers.facebook.com/community/threads/986963957294075/) | Autor opisuje isti tok i grešku, sa tri mala PNG/JPG fajla, Chrome-om na macOS-u, ručnim pokušajem druge osobe, osvežavanjem i čekanjem. | Nema vidljivog odgovora; Unresolved. |
| [AEPRAX — App icon upload always fails](https://developers.facebook.com/community/threads/1000271553036379/) | Autor navodi neuspeh malih RGB PNG/JPG fajlova, iako je aplikacija objavljena, poslovna verifikacija završena i nema odgovarajućih otvorenih Required Actions. | **Mugo, 2. 10. 2026:** navodi da je slanje uspelo nakon otvaranja iste adrese podešavanja u incognito prozoru i nove prijave. **Egor, 10. 11. 2026:** potvrđuje da je taj postupak pomogao i njemu. Tema je i dalje Unresolved; odgovor nije označen kao zvanično rešenje. |
| [Postmina — upload ikone i zahtev za istragu](https://developers.facebook.com/community/threads/1458328282933278/) | Autor navodi istu putanju servisa za slike i kod 1357032. Kaže da nisu pomogli RGB PNG, puni kadar, Chrome, Safari niti pravljenje zamenske aplikacije. | Nema vidljivog odgovora; Unresolved. |
| [App Review screencast — neuspeh stvaranja sesije za video](https://developers.facebook.com/community/threads/2250328389092531/) | Sličan kod 1357032, ali **druga putanja i drugi tip slanja**: stvaranje video-sesije za App Review. Više autora navodi neuspeh različitih ispravnih video-fajlova. | Devet odgovora. Francisco navodi potvrdu problema od Direct Support-a i oporavak za svoju aplikaciju 20. 8. 2026. Kasniji autori opisuju nastavak problema, uključujući drugačije HTTP 503 greške pri prenosu. To nije dokaz da je problem sa našom ikonom isti ili popravljen. Unresolved. |

## Šta zaključci podržavaju

- Isti tok neuspeha prijavljuju autori drugih aplikacija. Dalje menjanje našeg crteža ili samo njegovog formata nema jaku potporu u tim nalazima.
- Pojedini autori navode da im se problem pojavljuje i na verifikovanim ili već objavljenim aplikacijama. Njihove izjave ne potvrđuju da dodatna verifikacija može rešiti naš upload.
- Kod 1357032 pojavljuje se i u drugom uploaderu; sam broj nije dovoljna dijagnoza uzroka.
- **Najkonkretniji postupak iz odgovora:** isti Meta formular otvoriti u potpuno novom privatnom prozoru, ručno se prijaviti i poslati isti postojeći PNG. Ovaj postupak je potom uspešno proveren i za naš nalog, kako je zabeleženo ispod.
- Ako privatni prozor pomogne, to bi podržalo pretpostavku da su sesija ili podaci profila pregledača povezani sa neuspehom; samo po sebi ne bi dokazalo konkretan uzrok u kolačićima, ekstenzijama ili Meta servisu.

## Rezultat testa na našoj aplikaciji

**Uspešno — 16. 11. 2026.** Otvoren je nov Edge InPrivate na https://developers.facebook.com/apps/1111460668363524/settings/basic/. Korisnik se ručno prijavio i potvrdio spremnost. Izabran je postojeći `tmp/yamb-meta-app-icon-1024-rgb.png` i kadar proširen do granica cele slike. Upload je prošao, prikazana je ikona, a zatim je izvršen Save Changes.

Posle potpunog osvežavanja stranice sačuvan je naziv `yamb-meta-app-icon-1024-rgb.png`, YB oznaka aplikacije je ostala vidljiva i nestalo je upozorenje o nedostajućoj ikoni. Time je potvrđeno čuvanje, a ne samo privremeni pregled slike.

Postupak iz privatne sesije pomogao je u našem testu. Tačan uzrok prvobitne greške nije potvrđen. Javna Meta objava, App Review, Firebase konfiguracija, Android build i objavljivanje odgovora na forumu nisu izvršeni ovim testom.
