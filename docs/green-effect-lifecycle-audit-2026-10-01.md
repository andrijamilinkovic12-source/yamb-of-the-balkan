# Green efekti — ponavljanje i čišćenje resursa (2026-10-01)

Nastavak [provere Yamb upisa](green-yamb-route-audit-2026-10-01.md), bez native builda i online servera. Na Android emulatoru u lokalnom QA prikazu stvarne klase `EffectManager` svih 16 efekata pokrenuto je i zaustavljeno po četiri puta u kratkom razmaku. [Audit skripta](../qa/audit-green-live-effects-cdp.js) prati aktivne `requestAnimationFrame` zahteve, `resize` listenere, zakazane tajmere, FX klase i čvorove posle prekida.

Prvi prolaz je otkrio da Kraljevski Yamb ostavlja jedan animacioni zahtev i jedan `resize` listener posle `stop()`. Ponovljeni puni prolaz otkrio je i jedan zaostali animacioni zahtev Supernove. Oba canvasa sada imaju neposredno, idempotentno čišćenje pri prekidu; Kraljevski Yamb dodatno odbacuje zakasneli rezultat asinkronog učitavanja Green dukata. Izmena životnog ciklusa važi za sve teme jer iste animacione metode koriste sve teme; ne menja njihove vizuelne motive.

Posle ispravke stres-test prolazi za **16 × 4** brzih pokretanja/prekida: posle svake grupe nema zaostalih zahteva, listenera, tajmera, klasa ni FX čvorova. Ciljano su prošli i Uskrs/Kraljevski Yamb i Pustinjsko staklo/Supernova. Zasebno je sačekan prirodni završetak obe canvas animacije (7,6 odnosno 8 sekundi); ni tada nema zaostalih resursa. `managers.js` ima osveženu cache verziju u `index.html`.

Ovo meri čišćenje resursa, **ne FPS, potrošnju memorije u dugoj partiji ili produkcioni Android WebView**. Fixture ne pokreće stvarnu mrežnu sesiju, kupovinu ni upis rezultata. Nije rađen build ni commit.
