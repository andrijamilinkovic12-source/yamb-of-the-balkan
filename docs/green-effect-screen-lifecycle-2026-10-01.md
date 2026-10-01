# Green efekti — granica ekrana i čišćenje (2026-10-01)

Nakon [provere prekida samih animacija](green-effect-navigation-audit-2026-10-01.md), pregledane su stvarne putanje u `game.js` i `dnevniizazov.js`. Efekti se pokreću pri Yamb upisu, pobedi i rezultatu Dnevnog izazova. U tim tokovima je otkriveno da povratak u glavni meni i zatvaranje završenog Dnevnog izazova nisu pozivali `EffectManager.stop()`; efekat je mogao nastaviti preko sledećeg ekrana do sopstvenog isteka.

Ispravljeno je na granici ekrana:

- `showMainMenu()` sada zaustavlja efekat **posle uspešne provere/potvrde nagrade, a pre prikaza menija**. Ako potvrda nagrade blokira izlazak, ekran i efekat se ne prekidaju.
- `DnevniIzazov.close()` zaustavlja efekat kada se stvarno zatvori aktivni overlay, ali ne dozvoljava zatvaranje tokom kotrljanja. Ponovljeni `close()` ne prekida neki drugi efekat. Kiša dukata i dalje traje dok je rezultat izazova otvoren; kod udvostručene nagrade nova konfeti animacija se pokreće nakon zatvaranja starog prikaza.

Obe metode su zajedničke temama, pa je ovo korekcija životnog ciklusa, ne zamena motiva ili CSS drugih tema. [Direktna provera stvarnih metoda](../scripts/check-effect-screen-lifecycle.js) simulira dozvoljen i blokiran izlaz, aktivno kotrljanje i ponovljeno zatvaranje. Prošli su i JS, profil/sinhronizacija i provera paketa tema. Izolovana provera ne zamenjuje stvarni Android WebView, završetak partije sa serverom ili vizuelni pregled efekta u svim temama. Nije rađen build ni commit.
