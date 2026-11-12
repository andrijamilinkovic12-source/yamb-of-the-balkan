# Priprema Podešavanja na aktuelnoj osnovi

Javni `index.html` i `game.js` produkcije i QA provereni 2026-11-05: oba servisa isporučuju klijent 6.47. Normalizovani sadržaj oba fajla odgovara commitovima `7d28d5af` i `114eeb3c`. Ovo potvrđuje javni klijent; ne potvrđuje Render Branch podešavanje niti sve serverske fajlove.

Root folder je i dalje na `codex/reconnect-cold-start-qa` / `6e68ee00`, sa klijentom 6.46 u HEAD-u i današnjim lokalnim izmenama. `main` na GitHubu je i dalje `8f7cdc57`. Ne koristiti `main` kao pretpostavljenu najnoviju verziju.

Osam fajlova promene Podešavanja pripremljeno je bez konflikta na čistoj grani `codex/reconnect-cold-start-release`, osnova `7d28d5af`, u folderu:

`C:/Users/andri/OneDrive/Desktop/Yamb_of_the_Balkan/tmp/reconnect-cold-start-release-worktree`

Nova radna kopija sadrži jutrošnju popravku povratka u duel i nova Podešavanja. `server.js`, `www/game.js` i reconnect provera ostaju identični osnovi 7d28d5af. Referenca na `game.js?v=6.47` je očuvana. Izmena `android/gradle.properties` i reports/screenshots iz drugih radnji nisu prenošeni.

Provere na spojenoj verziji: `check:theme-settings-room`, `check-online-reconnect.js`, `test-account-deletion-ui.cjs`, `test-analytics-privacy.cjs`, `git diff --check` PASS. Lokalni browser: 80/80 kombinacija Podešavanja PASS. Ovo nije dokaz svih funkcija cele aplikacije niti stvarnog S25 prikaza.

Backup paketa i lista fajlova: `tmp/settings-release-preparation-2026-11-05/`. Originalni root folder nije prebačen na drugu granu; njegove izmene su sačuvane. Nema commita, staginga, pusha ili deploya u ovoj pripremi.

Za korisnika: u VS Code otvoriti gore navedeni release folder; grana treba da bude `codex/reconnect-cold-start-release`, a Source Control treba da sadrži samo osam fajlova Podešavanja. Pre push-a ili opcije Sync proveriti stvarnu vrednost produkcionog Render polja Settings → Build & Deploy → Branch i Auto-Deploy. Te vrednosti nisu pročitane ovom proverom. Ne menjati Render granu ili objavljivati `main` na osnovu pretpostavke. Produkciona objava ostaje zaseban korak korisnika.
