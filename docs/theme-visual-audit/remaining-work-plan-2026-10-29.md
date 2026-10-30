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

**Lokalna dopuna R35/v6.39:** skriveni Settings/header PNG više se automatski ne učitavaju na početnom meniju;17zahteva/1.172.537B→0 u izolovanom browser poređenju. Obe sobe10/10tema i zakašnjeli odgovor stare teme provereni; trenutni panel priprema se tokom citata/čekanja. [Dokazi i granice](startup-loading-2026-10-30.md). Čeka korisnikov commit/deploy i Android potvrdu. Ovo ne zatvara zastoj ili merenje hladnog starta iz tačke3.

1. **Objavljeni R33/R34 — preostala granica provere.** Oba servisa potvrđena na v6.38/41d6598f; javni game.js odgovara lokalnom posle normalizacije CRLF/LF. Na zasebnom QA Androidu svih deset tema primenjeno je jednim izborom u Podešavanjima. R34 ima ovu native potvrdu; unutrašnji retry ogranak nije instrumentovan. R33 je objavljen i ranijih16 izolovanih slučajeva prolazi, ali novi native tehnički poraz sa nultom kaznom nije ponovljen. [Post-deploy snimci i evidencija](postdeploy-2026-10-30/index.html).
2. **Odsečen završni panel na Androidu.** Posle promene rezolucije drugi emulator dao je ispravan, pa pomeren/odsečen kadar. Lokalnih150stanja nije ponovilo pomeranje. Uzrok nije utvrđen; CSS nije menjan naslepo i nalaz nije zatvoren kao popravljen. Glavni meniji posle pokretanja pregledani su na1440×3120/560dpi. Ne menjati dimenzije tokom vremenski ograničenog meča radi snimanja.
3. **Pokretanje i prvo učitavanje tema/skinova.** [Raniji neuspeh Green→Neon na v6.36](theme-switch-2026-10-30/index.html) ostaje istorijski dokaz. Posle objave v6.38 svih deset izbora radi u testiranoj sesiji, bez drugog korisničkog pritiska; cache nije brisan i fiksno čekanje14s pre snimanja nije mera brzine. Drugi emulator je pri pokretanju QA aplikacije prikazao app-not-responding dijalog i oporavio se opcijom Sačekaj. Uzrok nije utvrđen; nalaz ostaje otvoren. Izmeriti hladni start i prvi/ponovljeni izbor, PNG nedostatke, konačan neuspeh i kašnjenje skinova/dugmadi.
4. **Stvarni revanš i povratak veze.** Ostaju neprovereni na dva uređaja. Korisnik je odbio dodatni test koji preuzima nagradu; zato ga ne ponavljati automatski niti tretirati kao čekanje odobrenja. Lokalni handler testovi vode se odvojeno. Budući test mora računati i automatski recovery nagrade pri pokretanju.
5. **Stvarni poziv iz Pozovi prijatelja.** Osnovni izgled10/10tema i lokalni Socket.IO tok potvrđeni. Slanje/prihvatanje/odbijanje i ulazak u isti duel na dva prijavljena emulatora ostaju zasebna provera. Link za deljenje ostaje skriven.
6. **Fizički SamsungS25 i test oglasi.** Safezone/tastatura, uspešna i nedostupna reklama, povratak, osnovna nagrada posle neuspeha oglasa, tačan množilac i zaštita od duplog obračuna. Pokriti Solo/Hotseat/online/Daily prema različitim pravilima. Lokalni odgovori i emulator nisu dokaz SDK/server isplate na telefonu.
7. **Retka sobna stanja i zatvaranje evidencije.** Prema pojedinačnim izveštajima potvrditi nepokrivene tabove, guest/prazne/grešne liste, obaveštenja i ranije dorade na objavljenoj verziji. Novi PNG samo za utvrđenu neusaglašenost. Sačuvati kanonske identitete, dimenzije i DNK svake teme.

Svaku stavku zatvoriti konkretnim dokazom: verzija, uređaj/viewport, stanje, rezultat i ograničenje. Osnovnih15/15 ne znači da su sve funkcije iznad proverene.
