# Preostale provere tema i soba

Aktuelni presek: 30.10.2026. Ovaj presek zamenjuje staru listu13/15. Istorija pokušaja i posledica ostaje u [checkpointu](emulator-checkpoint.md).

## Potvrđeno

| Oblast | Potvrđen obuhvat | Granica dokaza |
| --- | --- | --- |
| Osnovni pregled soba | 15/15 osnovnih vizuelnih prolaza kroz deset tema, prema pojedinačnim izveštajima | Nije potvrda svakog retkog stanja, oglasa ili isplate. |
| Dnevni izazov | Aktivna igra i završni panel10/10tema, šest STOP pritisaka, rezultat57, bez resetovanja pokušaja | Nagrada nije preuzeta. Prava reklama nije proverena. [Android dokaz](daily-qa-2026-10-29/index.html). |
| Online Random | Aktivna igra10/10tema; odvojena puna partija156upisa, Sara450/Andrija293, regular/completed_scores, PI+106/0 | Pravi završni paneliGreen/Moon; ostale završne teme imaju izolovani lokalni dokaz. [Android pregled](random-qa-2026-10-29/index.html). |
| Završni panel pri promeni veličine | 150lokalnih stanja:10tema×pobeda/poraz/remi×5uzastopnih viewporta; centar/granice, PNG, bez sobnog/kartičnog skrola ili nagradnih/revanš zahteva | Mobilna Chromium emulacija DPR3.5, animacije uključene; nije Android wm/density ili fizičkiS25. [Mere i20lokalnih snimaka](finish-resize-2026-10-30/index.html). |
| Revanš i oporavak veze — lokalno | Provere stvarnih serverovih/klijentskih handlera prolaze; turnirski revanš samo posle remija, perspektive i zaštite obračuna | Sintetički događaji/stanja; nije uspešan stvarni prekid/povratak veze ili revanš na dva uređaja. |
| Poziv prijatelju — lokalno | Dva localhost Socket.IO klijenta: slanje, prihvatanje, zajednički meč, odbijanje/zauzetost, nedostupan igrač, otkazivanje i zaštita duplih poziva | Server bez Mongo/Firebase podataka i pravih naloga. Nije stvarni poziv na dva prijavljena emulatora. |
| Objavljene popravke | R27 Vaskršnji megafon obe table i R32 perspektiva tehničkog rezultata potvrđeni na QA v6.36/910b816c | Ostale ranije nalaze potvrđivati ciljano prema pojedinačnim izveštajima. |

## Posledica ponovnog pokretanja

Korisnik je odbio dodatno preuzimanje QA nagrada. Nagradno dugme, reklama i revanš nisu pritisnuti. Postojeći recoverPendingGameRewards je pri otvaranju aplikacija automatski preuzeo osnovnih439/675dukata. Server potvrđuje dva preuzimanja, salda2939/12168. Daily ostaje nepreuzet. Raniji zapisi claim=0 opisuju prethodnu sesiju.

To je odvojeno od automatskih trofejnih bonusa (Andrija2000/Sara500) i četiri ranija tehnička QA rezultata. Nema ručne izmene salda ili produkcionog testa. Postojeće pravilo automatskog oporavka nije menjano.

## Sledeći koraci

**Lokalna v6.42, još neobjavljena:** završena [priprema QA-only PNG dijagnostike](loading-diagnostics-2026-10-30/README.md). Testovi load/decode/timeout/retry i stvarnih PNG deset tema prolaze. Nema primenjene kompresije ili nove emulator sesije. Posle korisnikovog commita/deploya prikupiti namenski QA zapis prvog/ponovljenog Easter izbora; ne zatvarati startup/ANR bez uzroka i native dokaza. Donji v6.41 presek ostaje poslednji objavljeni dokaz.

**Aktuelno — v6.41/429cec22 objavljena:** šest javnih klijentskih fajlova potvrđeno na oba servisa. R37 ima ciljanu native potvrdu tri sobe uGreen/Neon, uključujući oba Top lista taba i dinamičke invite ikone. [23 kadra i granice](postdeploy641-2026-10-30/index.html). Neon/Moon prvi izbor i povratakNeon/Green uspeli; **prviEaster i dalje traži ponavljanje**. Hladni transfer/start iANR ostaju otvoreni; Activity13476msnije app-ready mera. Hotseat nije ponudio nastavak, unos za novu partiju otkazan; aktivni skin test ostaje otvoren. Nema novog meča/oglasa/nagrade/DB pristupa ili runtime izmene. Oba emulatora rade, drugiGreen meni.

Sledeća prioritetna provera: razdvojiti prvi transfer/decode od opterećenja Android emulatora i potvrditi aktivnu promenu skinova kada postoji dozvoljena test partija. Ne otvarati novi duel ili preuzimati nagrade radi ove provere. Raniji lokalniR37 odeljak niže čuva istoriju; više ne čeka objavu.

**Aktuelno — lokalna R37/v6.41:** tri skrivena sobna kontrolera odlažu automatske PNG zahteve do prikaza sobe. Izolovano14zahteva/719184B→0 i126→0kroz skrivene teme;40vidljivih stanja10tema, deljene ikone i dinamičke kartice prolaze. Čeka korisnikov commit/deploy i ciljanu native proveru prvih izbora/sobnih otvaranja. [Dokazi](postdeploy640-2026-10-30/index.html).

**Objavljena v6.40/d38aa6aa:** oba servisa potvrđena. QA pregled konačno prikazaoGreen/Neon/Easter/Light/Moon i uspešan povratakGreen posle četiri druge teme. **PrviNeon/Easter/Moon izbori nisu pouzdani**; ponovljeni uspeli. ActivityCOLD19194ms i nepotpuni kadrovi nisu app-ready mera ili dokaz uzrokaANR-a. Nema nove partije/oglasa/nagrade/DBpristupa; oba emulatora u radu, drugiGreen meni. Lokalna R36 nije poništena, ali ova sesija ne potvrđuje njene unutrašnje LRU vrednosti na Androidu. Odeljak „lokalnaR36” ispod čuva raniji presek.

**Lokalna R36/v6.40:** reprodukovane i ispravljene zastarela themeWarmups priprema posle LRU izbacivanja i gubitak zapisa nezavršenog URL-a. Stvarni menu PNG/metode10tema u lokalnom browseru:18nedostajućih slika pri lažno spremnom povratkuGreen→0posle ponovne pripreme; odmah ponovljen izbor bez dodatne pripreme. Kontrolisano duplo učitavanje2→1, preklopljeni izvori i zastareli neuspeh provereni. [Mere i granice](preload-retention-2026-10-30/index.html). Čeka korisnikov commit/deploy i ciljani Android povratak na raniju temu; ne zatvara hladni start/ANR/S25. U ovom nastavku nema nove emulator partije ili nagrade.

**Objavljena dopuna R35/v6.39:** oba servisa na7985cb39, sva tri klijentska fajla potvrđena. Lokalno17zahteva/1.172.537B→0 za skrivene kontrole i10/10tema; ciljano Android Settings4teme i odobreni prazni Hotseat panel2teme+jedan univerzalni skin uspešni. Nema bacanja/upisa/završetka/oglasa/isplate; isti QA profili i rezultati. Oba emulatora running, Green vraćen na drugom. [Post-deploy dokazi](postdeploy639-2026-10-30/index.html). Brzina ostaje otvorena: am-start timeout, prvo podloga pa meni, zakašnjeli/nepotpuni kadrovi; cache nije brisan. Nije dokaz otklonjenog ANR-a, trenutnog prelaska ili novi native10/10prolaz. Nema novih runtime izmena u ovom nastavku.

1. **Objavljeni R33/R34 — preostala granica provere.** Oba servisa potvrđena na v6.38/41d6598f; javni game.js odgovara lokalnom posle normalizacije CRLF/LF. Na zasebnom QA Androidu svih deset tema primenjeno je jednim izborom u Podešavanjima. R34 ima ovu native potvrdu; unutrašnji retry ogranak nije instrumentovan. R33 je objavljen i ranijih16 izolovanih slučajeva prolazi, ali novi native tehnički poraz sa nultom kaznom nije ponovljen. [Post-deploy snimci i evidencija](postdeploy-2026-10-30/index.html).
2. **Odsečen završni panel na Androidu.** Posle promene rezolucije drugi emulator dao je ispravan, pa pomeren/odsečen kadar. Lokalnih150stanja nije ponovilo pomeranje. Uzrok nije utvrđen; CSS nije menjan naslepo i nalaz nije zatvoren kao popravljen. Glavni meniji posle pokretanja pregledani su na1440×3120/560dpi. Ne menjati dimenzije tokom vremenski ograničenog meča radi snimanja.
3. **Pokretanje i prvo učitavanje tema/skinova.** [Raniji neuspeh Green→Neon na v6.36](theme-switch-2026-10-30/index.html) ostaje istorijski dokaz. Posle objave v6.38 svih deset izbora radi u testiranoj sesiji, bez drugog korisničkog pritiska; cache nije brisan i fiksno čekanje14s pre snimanja nije mera brzine. Drugi emulator je pri pokretanju QA aplikacije prikazao app-not-responding dijalog i oporavio se opcijom Sačekaj. Uzrok nije utvrđen; nalaz ostaje otvoren. Izmeriti hladni start i prvi/ponovljeni izbor, PNG nedostatke, konačan neuspeh i kašnjenje skinova/dugmadi.
4. **Stvarni revanš i povratak veze.** Ostaju neprovereni na dva uređaja. Korisnik je odbio dodatni test koji preuzima nagradu; zato ga ne ponavljati automatski niti tretirati kao čekanje odobrenja. Lokalni handler testovi vode se odvojeno. Budući test mora računati i automatski recovery nagrade pri pokretanju.
5. **Stvarni poziv iz Pozovi prijatelja.** Osnovni izgled10/10tema i lokalni Socket.IO tok potvrđeni. Slanje/prihvatanje/odbijanje i ulazak u isti duel na dva prijavljena emulatora ostaju zasebna provera. Link za deljenje ostaje skriven.
6. **Fizički SamsungS25 i test oglasi.** Safezone/tastatura, uspešna i nedostupna reklama, povratak, osnovna nagrada posle neuspeha oglasa, tačan množilac i zaštita od duplog obračuna. Pokriti Solo/Hotseat/online/Daily prema različitim pravilima. Lokalni odgovori i emulator nisu dokaz SDK/server isplate na telefonu.
7. **Retka sobna stanja i zatvaranje evidencije.** Prema pojedinačnim izveštajima potvrditi nepokrivene tabove, guest/prazne/grešne liste, obaveštenja i ranije dorade na objavljenoj verziji. Novi PNG samo za utvrđenu neusaglašenost. Sačuvati kanonske identitete, dimenzije i DNK svake teme.

Svaku stavku zatvoriti konkretnim dokazom: verzija, uređaj/viewport, stanje, rezultat i ograničenje. Osnovnih15/15 ne znači da su sve funkcije iznad proverene.
