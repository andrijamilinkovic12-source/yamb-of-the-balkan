# Green efekti — prekid i prelazak između animacija (2026-10-01)

Sledeći lokalni QA korak proširuje proveru životnog ciklusa na izlazak iz pobedničkog prikaza i uzastopno aktiviranje različitih efekata. Provera koristi stvarnu klasu `EffectManager` u izolovanom Android Chrome prikazu sa sintetičkom tablom. Nema naloga, meča, kupovine, upisa rezultata ni produkcionog servera.

Nova opcija `--navigation` u [audit skripti](../qa/audit-green-live-effects-cdp.js) proverava:

1. `celebrateWin()` se prekida pre zakazane kiše dukata; nakon čekanja ona se ne pojavljuje.
2. Pobednička animacija se pušta do početka kiše dukata, pa prekida; ne ostaju animacija, tajmeri ni čvorovi.
3. Svih 16 efekata se smenjuje tri puta, sa brzim prelaskom na sledeći i završnim `stop()` posle svakog kruga.

Sva tri scenarija prošla su zasebno za Green, Uskrs i Pustinjsko staklo. Posle svakog prekida nije bilo zaostalih FX čvorova/klasa, `requestAnimationFrame` zahteva, `resize` listenera ni zakazanih tajmera. Ovo potvrđuje ponašanje prekida u izolovanom prikazu, ali **nije dokaz** za trajanje FPS-a, stvarni meč, produkcioni Android WebView ili dugotrajnu potrošnju memorije. Native build i commit nisu rađeni.
