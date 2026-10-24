# Emulator — provera verzije, 25.10.2026.

Emulator `Easter_QA_10GB` je pokrenut, aplikacija `com.yamb.balkan` otvorena, a korisnik je ručno završio prijavu. Potvrđen je prikaz glavnog menija Zelene teme na emulatoru 1440 × 3120, gustina 560 dpi.

Instalirani APK u javnoj `assets/capacitor.config.json` konfiguraciji koristi `https://yamb-of-the-balkan.onrender.com`. Javni zahtev bez kolačića i autentifikacije za `/theme-quality-assets.js` vratio je **HTTP 404**. Zbog toga ovaj prikaz ne potvrđuje poslednjih 121 PNG zamenu i 30 kanonskih video povezivanja.

Status: **vizuelna potvrda najnovijih izmena na čekanju**. Potrebna je objavljena završna verzija ili lokalni QA APK koji sadrži sadašnji `www`. Prikaz starije verzije nije označen kao prolazna provera novih assetsa.

Automatska bezbednosna provera odbila je ADB prosleđivanje WebView debug porta zbog mogućeg izlaganja prijavljene sesije. Prosleđivanje nije izvršeno i nije korišćen zaobilazni pristup. Dalji pregled koristi vidljive kontrole i snimke ekrana, bez debug pristupa nalogu.

Podaci naloga, vlasništvo tema/skinova, dukati i rezultati nisu menjani radi provere.
