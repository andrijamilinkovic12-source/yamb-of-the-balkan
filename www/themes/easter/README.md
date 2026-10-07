# Vaskrs Soft Clay UI Theme Pack

Zaključani inventar, vizuelni DNK, budžeti učitavanja i povučene putanje nalaze se u `asset-registry.json` i automatski se proveravaju skriptom `scripts/check-easter-asset-coverage.js`.

Ovo je kompletan paket za Vaskršnju temu. Tema se aktivira samo kroz `body.easter-theme` odnosno kada je `localStorage.yamb_theme` podešen na `easter`.

## Šta paket pokriva

- pozadina: `www/assets/theme-backgrounds/easter-v6-1.png`
- glavni meni: Vaskr badges & pills ikonice za sobe, specijalne akcije i donji meni
- tabla za igranje: neumorphic tabla, kockice, polja, HUD i kontrolna zona bez promene dimenzija table
- UI komponente: kartice, fontovi, inputi, modali, obaveštenja, chat, riznica, stats, pravila i top lista
- posebni ekrani: splash, početni citat, waiting screen i game-over ekran
- motion pack: blagi panel entrance, shimmer, hover i waiting pulse
- empty/loading/error stanja: Vaskr pills stil sa simbolima
- audio pack: proceduralni Vaskr zvukovi u `SoundManager`, aktivni samo za Vaskr temu
- QA preview: `www/themes/easter/qa-preview.html` za lokalne screenshotove bez logovanja
- QA splash preview: `www/themes/easter/qa-splash.html` za izolovanu proveru login/citat ekrana
- QA game-over preview: `www/themes/easter/qa-gameover.html` za proveru završnog ekrana i kontrasta akcija

Za lokalni vizuelni prolaz otvoriti `themes/easter/qa-preview.html` uz fragment stanja. Novi probni prikazi koriste stvarne UI prikazivače, bez prijave ili slanja podataka serveru: `#rules-1` do `#rules-6`, `#invite`, `#streak`, `#power`, `#tournament-qf`, `#tournament-sf`, `#tournament-final` i `#league-winner`. Dodati `?lang=en` pre fragmenta za engleski tekst. Probni podaci nisu potvrda rada online servisa; svako stanje treba vizuelno proveriti na uskoj i visokoj mobilnoj veličini.

## Pravila za dalje izmene

1. Sve novo za ovu temu ide pod `body.easter-theme`.
2. Ne dirati globalne ikonice kao osnovu igre.
3. Ne menjati dimenzije table, soba/kartica i raspored bez posebne odluke.
4. Ako druga tema kasnije dobija svoj paket, pravi se novi izolovan skin za tu temu.

## Naziv paketa

Preporučen naziv za evidenciju i buduće šablone:

`Vaskr Neumorphic UI Theme Pack`
