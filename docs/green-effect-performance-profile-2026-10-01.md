# Green efekti — lokalni profil performansi (2026-10-01)

Merenje je rađeno u Android Chrome-u na headless Pixel 7 Pro emulatoru, u lokalnom izolovanom `EffectManager` prikazu (360 × 700 CSS px). Nisu korišćeni nalog, kupovina, meč ni server. [Ponovljiva CDP skripta](../qa/profile-green-effects-cdp.js) zagreva efekat, meri 1,8 s animacije, zaustavlja ga, poziva GC i očitava JS heap, DOM čvorove, aktivne animacije, tajmere i listenere. Ovo **nije profil produkcionog WebView-a**.

| Efekat | JS heap pre → posle zaustavljanja/GC | DOM čvorovi pre → posle | Nalaz |
|---|---:|---:|---|
| Kiša dukata | 0,79 → 0,78 MB | 137 → 137 | Bez trajnog rasta u uzorku. |
| Supernova | 0,81 → 0,85 MB | 137 → 137 | Mali pomak heapa; bez zaostalih FX resursa. |
| Kraljevski Yamb | 0,88 → 0,89 MB | 137 → 191, zatim ~133 nakon 5 s | Privremeno zadržani odvojeni čvorovi se oslobađaju. |
| Dronovi | 0,95 → 0,95 MB | 191 → 137 | Bez trajnog rasta u uzorku. |
| UFO | 0,96 → 0,98 MB | 137 → 205, zatim 137 nakon 5 s | Privremeno zadržani odvojeni čvorovi se oslobađaju. |
| Svadba | 0,99 → 0,99 MB | 137 → 137 | Bez trajnog rasta u uzorku. |

Posle svakog efekta broj povezanih DOM čvorova u QA prikazu bio je 75; nije bilo aktivnih FX klasa, FX čvorova, tajmera, `resize` listenera ni animacionih zahteva. Brojevi heapa su samo kratak uzorak Chrome-ovog JS heap-a posle prinudnog GC-a; ne uključuju pouzdano GPU teksture i punu potrošnju Android aplikacije.

Broj `requestAnimationFrame` poziva tokom 1,8 s jako je varirao **čak i u mirovanju** (u dva pokretanja 8 i 52 kadra). Zato iz headless emulatora nije opravdano izvesti stvarni FPS niti tvrditi da efekti ne seckaju. Gubitak kadrova posebno treba proveriti u vidljivom produkcionom WebView-u na uređaju kada build bude dozvoljen.

## Urađena optimizacija

- Green Kraljevski Yamb više ne crta četiri stare verzije dukata i dragulj koji se nikad ne koriste kada je kanonski dukat učitan. Green iskrice koriste krem/sage paletu; stare teme su nepromenjene.
- Green Kiša dukata više ne pravi stare sprite-ove dragulja i krune: koristi kanonski PNG dukata i jedan mali Green sprite iskrice. Uskršnji DOM efekat takođe ne pravi neupotrebljene canvas sprite-ove.
- Ako PNG Green dukata ne uspe da se učita, rezervni prikaz koristi kanonsku inline Green ikonu, ne stari novčić. Proveren je namerno izazvan neuspeh učitavanja.

Ove promene smanjuju nepotrebno kreiranje canvas površina pri pokretanju efekta, ali ovo merenje **ne dokazuje numerički porast FPS-a**. Nije rađen native build ni commit.
