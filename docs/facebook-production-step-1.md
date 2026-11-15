# Korak 1 — popis i priprema izdanja

Završeno 15. 11. 2026. Ovo potvrđuje popis i pripremu izvora, ne završne regresije, deploy ili javnu dostupnost Facebook prijave.

## Izvor izdanja

- Glavni direktorijum: `C:/Users/andri/OneDrive/Desktop/Yamb_of_the_Balkan`, grana `main`.
- Lokalni `HEAD`, `origin/main` i neposredno provereni udaljeni `main` odgovaraju commitu `b764a026f11ba4e7d7c19686a691466c4827744d`.
- Facebook QA grana je na `4057a26c5c3bb18d79c39b2991485ff717cac6b3`. Svih 17 fajlova tog commita postoji u glavnom direktorijumu. Deset fajlova je identično po sadržaju, a ostali uključuju kasnije namerne izmene i pripremu nove verzije.
- Pet lokalnih izmena Facebook QA radnog direktorijuma posebno je poređeno sa glavnim izvorom: kontrole povezivanja/prikaza, oba jezika, HTML dugmad, stilovi i kompaktna Podešavanja već su zastupljeni u glavnom direktorijumu. Jedanaest ciljanih poređenja prolazi. Nije potrebno spajati staru QA granu i unositi njene starije brojeve/cache oznake preko novijih izmena.
- Provereni su i nepraćeni fajlovi svih dostupnih izdvojenih radnih direktorijuma. Jedini je FB logo u Facebook QA direktorijumu, koji već postoji i u glavnom kandidatskom izvoru. U ostalim dostupnim izdvojenim direktorijumima nema nepraćenih fajlova.
- Drugi izdvojeni radni direktorijumi pregledani su samo za čitanje. Stari cold-start release ima IDE i generisane Gradle izmene, koje nisu nova funkcionalnost za ovo izdanje. Stara registracija `reconnect-security` više ne dozvoljava status radnog direktorijuma; njen commit i grana ostaju zabeleženi i ništa nije brisano.
- VSC proces nije bio pronađen tokom provere. Kada se editor otvori, izvor za ovaj plan je gornji glavni direktorijum, a ne jedan od `tmp/*worktree` direktorijuma.

## Sadržaj pripremljenog izdanja

Popis obuhvata **54 izmenjena praćena fajla i 114 novih fajlova, ukupno 168**, bez dva evidenciona fajla ovog koraka. Za svaki fajl zabeleženi su relativna putanja, namena, veličina i SHA-256 u [mašinskom inventaru](facebook-production-step-1-inventory.json).

| Grupa | Šta ulazi |
| --- | --- |
| Facebook i Google | Facebook prijava, dobrovoljno povezivanje provajdera, nativni `AccountIdentity`, FB logo, kontrole „POVEŽI SE / POVEZAN SI“, podrška za potvrdu brisanja i Analytics izbor uz oba provajdera. |
| Pošta | Nova soba, indikator, istorija i skrol liste, čitanje, arhiviranje/brisanje poruka, vlasničke objave i podrška igračima. |
| Automatske sistemske poruke | Turnirska upozorenja, šampioni turnira i lige, globalni rekordi, rang lige, indeks moći, vatreni niz, odgovori podrške i moderacije, za odgovarajuće naloge i jezike. |
| Preporuke | Lični link/kod, novi Google/Facebook igrač i prva potvrđena regularna online partija; tri isplate 3.000 + 3.000 + 5.000, ukupno 11.000 po pošiljaocu; numerisane privatne potvrde i trajni limit. |
| Prijatelji i prateće ispravke | Brisanje prijateljstva sa potvrdom, usklađen prikaz kartice i obaveštenja, povezane izmene moderacije i turnirskih postupaka. |
| Dnevni izazov | Tri nova zasebna PNG dugmeta po temi, ukupno 30; povezivanje, priprema slika, SR/EN natpisi i evidencija prethodnih provera dimenzija/kontrasta. |
| Pravni sajt | Generator, pripremljene SR/EN stranice i javno brisanje naloga. Dopuna o zajedničkom profilu sledi u koraku 2; objava sajta je korak 6. |
| Provere i dokumentacija | Postojeće i nove ciljane regresije, manifesti PNG fajlova, pregledne stranice i plan izdanja. |

## PNG i povezivanje fajlova

- **41 novi produkcioni PNG:** 30 dugmadi Dnevnog izazova, 10 tematskih ikona Pošte i FB logo.
- **40 izvornih PNG mastera** za dve tematske grupe, sa manifestima.
- Za svih 30 Daily i 10 Mailbox PNG provereni su prisustvo produkcije/mastera, PNG potpis, RGBA format i podudaranje SHA-256 sa manifestom. Svi prolaze.
- Svi lokalni moduli koje server direktno uvozi postoje. Nema nedostajućih statičkih JS/CSS fajlova iz početne stranice.
- `capacitor.js` je posebno evidentiran kao most koji obezbeđuje Android/Capacitor runtime; nije zamišljen kao novi ručno napravljen fajl u `www`. Nativna potvrda ostaje deo testiranja Android izdanja.
- `.env`, privatni ključevi, servisni kredencijali, `tmp` i generisani build izlazi nisu u kandidatskom popisu. U izmene ulaze samo `.env.example` šabloni.

## Android kandidat

U `android/app/build.gradle` pripremljeni su **versionName 12.5 / versionCode 115**, nakon dotadašnjih 12.4 / 114. Produkcioni package ostaje `com.yamb.balkan`, Firebase projekat `yamb-of-the-balkan`, a server `https://yamb-of-the-balkan.onrender.com`.

Ovo je priprema kandidata, bez APK/AAB izgradnje. Pre slanja u Play Console, u koraku 9 potvrditi da je 115 veći od svih već korišćenih kodova u svim kanalima. Osnovni Capacitor config navodi Google; Facebook se uključuje build okruženjem kroz postojeću opcionalnu konfiguraciju. Produkcione Meta/Firebase vrednosti proveravaju se u koracima 7 i 8.

## Otvoreno pre commita

1. **Korak 2:** dopuniti Politiku/Uslove i generator na oba jezika, uključujući zajednički Google/Facebook profil i njegovo brisanje.
2. **Automatska poruka o Android ažuriranju:** zahtev je u planu, ali još nema okidač/proveru javno objavljenog izdanja. Implementaciju i lokalne testove završiti u okviru koraka 3, pre commita. Poruka mora ići svim nalozima jednom po stvarno javno dostupnoj verziji, sa SR/EN tekstom i Play linkom. Običan Render deploy ili interni test nisu signal za objavu. Produkciono povezivanje/provera signala pripada koraku 11.
3. **Korak 3:** završna provera celog obuhvata izdanja. Raniji lokalni prolazi nisu zamena za novu zbirnu proveru ili za stvarne Android testove iz koraka 10.

Commit, push, deploy, nova Android izgradnja i promene na produkcionim nalozima nisu rađeni u ovom koraku. Sledeći korak je **2 — dopuna pravnih dokumenata**.
