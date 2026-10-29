# Plan završetka provere tema i soba

Datum preseka: 29.10.2026. Izvor: [checkpoint](emulator-checkpoint.md), [dva emulatora](two-emulators-2026-10-29/report.json) i raniji sobni izveštaji. Ovo je plan, ne potvrda da su naredne radnje izvršene.

## Polazno stanje

- Osnovni Android pregled svih deset tema: **13/15 soba**, uz ograničenja pojedinačnih izveštaja.
- Pozovi prijatelja: osnovni domaćin vizuelno pregledan u svih deset tema; stvarni poziv, prihvatanje i pokretanje duela nisu time potvrđeni.
- Online random: lokalni renderer svih deset tema proveren; stvarno uparivanje dva sopstvena naloga uspelo, ali test nije obavio potvrđen potez pre isteka. Običan meč i završetak ostaju otvoreni.
- Dnevni izazov: ponovni ulazak svih deset tema proveren; aktivna igra/završni panel stvarno provereni u Truloj višnji, rezultat 56, bez reklame/preuzimanja. Preostalih devet tema nema taj Android dokaz.
- Lokalne izmene, uključujući R22–R32, čekaju objavu i potvrdu na uređaju. Stariji snimci nisu dokaz novog koda.
- Postojeći izdvojeni QA odgovara kao staging/reconnect-qa-01, ali klijent v5.49 je stariji od lokalne verzije. Ne koristiti ga kao potvrdu aktuelnog dizajna pre ažuriranja.
- Nisu potrebne nove sobe ili automatska izrada novih PNG-ova. Nove slike praviti samo za konkretno utvrđenu neusaglašenost.

## 1. Pripremiti aktuelno izdvojeno test okruženje

- [ ] Sačuvati sadašnje lokalne izmene i evidentirati tačnu reviziju predviđenu za test. Commit/deploy ostaju u dogovoru sa korisnikom; ovaj plan ih ne izvršava.
- [ ] Pripremiti aktuelnu QA verziju servera i Android klijenta, uz postojeći odvojeni app ID, Firebase i bazu. Proveriti izolaciju pre instalacije/igre; ne prepisivati produkcioni paket ili naloge.
- [ ] Na oba emulatora potvrditi verziju i koristiti odvojene test profile. Prijavu obavlja korisnik ako bude potrebna.
- [ ] Unapred pripremiti redosled poteza i snimanja da tokom meča nema duge pripreme koja troši tajmer.
- [ ] Pripremiti odgovarajuće QA podatke/stanja za Daily i završne prikaze, bez resetovanja produkcionih pokušaja ili zaobilaženja pravila u produkciji.

Završeno kada: oba uređaja koriste proverenu aktuelnu QA verziju, a test rezultati ne menjaju stvarne profile. Nema CDP pristupa, čitanja tokena ili privatne sesije.

## 2. Dovršiti Online random

- [ ] Dva sopstvena test naloga: traženje, uparivanje, ispravna imena i statusi, intro i ulazak u igru.
- [ ] Potvrditi bacanje, izbor kockica, najavu i validan upis; oba uređaja pokazuju isti rezultat i pravog igrača na potezu.
- [ ] Na emulatoru pregledati svih deset tema: čekaonicu, obe table, kontrolne panele, PNG, tipografiju, kontrast, dimenzije i završni prikaz. Tema određuje materijal/boje, Zelena geometriju; ne traži se deset identičnih punih partija ako je zajednička funkcija već potvrđena.
- [ ] Kontrolisani prekid/povratak veze: tajmer, obaveštenje i PNG, oporavak stanja bez duplog poteza ili obračuna.
- [ ] Običan završetak iz obe perspektive: pobeda/poraz/remi, poeni, rekordi i Indeks moći, bez skrola ili ulaska u safe zonu. Koristiti pripremljene legitimne QA scenarije; ne izmišljati da su svi ishodi odigrani.
- [ ] Revanš: zahtev, prihvatanje, odbijanje/odustajanje i nova partija bez zaglavljivanja. Turnirski izuzetak proveriti odvojeno: revanš samo posle remija.
- [ ] Tehnički završetak: ispravna perspektiva R32 poruke i jednokratan obračun na QA profilima; običan završetak i tehnički rezultat voditi odvojeno.

Završeno kada: deset tema ima osnovni Android dokaz, a stvarna sinhronizacija/oporavak/završetak imaju zaseban funkcionalni dokaz.

## 3. Dopuniti funkcionalni test Pozovi prijatelja

- [ ] Domaćin šalje poziv drugom test nalogu; drugi uređaj dobija ispravnog pošiljaoca i akcije.
- [ ] Prihvatanje pokreće isti duel na oba uređaja, sa pravim imenima, pravilima i zajedničkim završnim ekranom.
- [ ] Odbijanje, otkazivanje, zauzet/offline igrač i dupli klik ne ostavljaju blokiran prozor ili dupli meč.
- [ ] Guest prikaz, obaveštenja i tastatura/pretraga na uskom ekranu; lista prijatelja ostaje vodoravna, cela soba se ne skroluje vertikalno.
- [ ] Deljenje linka ostaje skriveno prema postojećoj odluci. Ne uvoditi novu opciju deljenja.

Završeno kada: osnovni vizuelni pregled ostaje 10/10, a stvarni poziv i ulazak u duel imaju novi dokaz. Ovo nije ponavljanje celog već završenog sobnog pregleda.

## 4. Dovršiti aktivni i završni Dnevni izazov

- [ ] Aktivna igra i završni panel u: Zelenoj, Svetlom zlatu, Plavom okeanu, Neon Cyberu, Kraljevskom ametistu, Vaskršnjoj, Pustinjskom staklu, Mesečevom sjaju i Severnoj maglini.
- [ ] Trulu višnju ponovo kratko proveriti na aktuelnoj verziji posle lokalnih izmena; njen raniji rezultat 56 ostaje istorijski dokaz.
- [ ] Proveriti šest zaustavljanja, računanje rezultata, promene stanja, završni PNG i kanonski dukat/video; preglednost fontova, kontrast i safe zonu.
- [ ] Proveriti ponovno otvaranje i dozvoljen izlazak bez zaglavljivanja; ponovni ulazak ne sme pogrešno dati novi pokušaj/nagradu.
- [ ] Prvo učitavanje završne slike ne ostavlja trajno prazno mesto. Pravi obračun nagrade proverava se u narednoj tački.

Završeno kada: aktivni/završni i ponovni prikaz imaju dokaz svih deset tema. Produkcioni dnevni pokušaji se ne resetuju radi ponavljanja testa.

## 5. Nagradne funkcije na fizičkom telefonu

- [ ] Na Samsungu S25 proveriti stvarni Android oglasni tok sa test oglasima: učitana reklama, potvrđena nagrada i povratak u aplikaciju.
- [ ] Preuzimanje osnovne nagrade i izlazak rade i kad reklama nije dostupna, ne učita se, čeka ili bude zatvorena bez potvrde nagrade.
- [ ] Uspešna nagradna reklama: iznos/množilac prate važeća pravila i ostvarene rekorde; stanje dugmeta i salda odgovaraju serverovoj potvrdi.
- [ ] Dupli klik, kasni callback, ponovni ulazak i prekid veze ne daju dvostruku isplatu niti blokiraju završni ekran.
- [ ] Rekordi pripadaju prijavljenom nalogu, ne zbiru svih naloga telefona. Prikaz rekorda/Indeksa moći razlikuje potvrđene i nepotvrđene vrednosti.
- [ ] Pokriti Solo, Hotseat, zajednički online završetak i Daily prema njihovim različitim pravilima. Hotseat lokalni gost se ne tretira kao drugi prijavljeni nalog sa svojim novčanikom.
- [ ] Na svim temama proveriti ispravan dukat/video/PNG i kontrast; zajedničku reklamnu funkciju ne dokazivati nepotrebnim višestrukim gledanjem oglasa za svaku temu.

Završeno kada: potvrđena stvarna SDK/server integracija i jednokratna isplata na test profilima. Izolovani test odgovori i emulator snimci nisu zamena za ovaj dokaz.

## 6. Potvrditi lokalne dorade i brzinu posle objave

- [ ] Evidentirati tačan commit/deploy i verziju stvarno učitanu na uređaju. Korisnik određuje trenutak produkcionog commita/deploya.
- [ ] Hotseat: obe table/pager, dimenzije, tipografija, guest/izlazni prozori i završetak.
- [ ] Vaskršnji megafon: vidljiv u obe table i posle promene teme, sa ispravnim kanonskim PNG.
- [ ] Daily mere/fontovi/kontrast i priprema X; Solo potvrda rezultata/rekorda i završna obaveštenja.
- [ ] Random: naslov pronađenog protivnika, svih deset tematskih prikaza, oporavak tajmera, R32 poruka i završna dugmad.
- [ ] Pozovi prijatelja: širine, profili/statistika, kratki ekran, kontrast, modal i pretraga.
- [ ] Ranije neobjavljene sobne nalaze iz checkpointa potvrditi ciljano, uključujući Riznicu/Turnir/Ligu i ostale evidentirane dorade; ne računati prethodni snimak kao dokaz popravke.
- [ ] Hladno otvaranje aplikacije/sobe, prvi izbor svake teme i ponovljeni izbor: izmeriti trajanje, uspeh, nedostajuće/stare PNG i povratak na prethodnu temu. Isto za promenu posedovanog skina tokom igre i odgovarajuću dugmad/brojač.
- [ ] Proveriti da efekti ne blokiraju učitavanje/unos; poznate greške prvo ponoviti, pa popravljati. Zabeležiti uređaj/mrežu i rezultate, bez neproverenog obećanja trenutnog učitavanja.
- [ ] S25: native tastatura, duga imena i safe zone; lokalne mere malih/srednjih/velikih ekrana ostaju dopunski dokaz. Ne tvrditi da su fizički testirani uređaji koje nemamo.

Završeno kada: svaka planirana ispravka ima dokaz sa objavljene verzije ili jasan otvoren nalaz. Regresije pokretati ciljano prema promenama.

## 7. Zatvoriti evidenciju

- [ ] Po sobi i temi ažurirati: provereno stanje, verziju, uređaj/veličinu, snimak i rezultat; posebno označiti lokalni simulirani i stvarni Android test.
- [ ] U registar i definiciju tema upisati samo stvarne nove putanje/izuzetke ako bude PNG zamena. Kanonski identitet povezati na svim aktivnim mestima; ne menjati funkcije ili geometriju bez konkretnog razloga.
- [ ] Iz ranijih izveštaja izdvojiti retka nepokrivena stanja (obaveštenja/nagrade, guest, prazne/grešne liste, drugi tabovi i slično) i zatvoriti primenljive stavke ciljanim proverama. Ako nisu proverena, ostaju izričito otvorena.
- [ ] Napredak 13/15 povećati tek kada Random i Daily ispune svoje osnovne kriterijume za svih deset tema. **15/15 osnovnih pregleda ne znači automatski da su reklame, svi ishodi i sve transakcije testirani.**
- [ ] Završni izveštaj razdvaja: završen izgled/inventar, potvrđene funkcije, objavljene/potvrđene popravke i preostala ograničenja.

## Odvojeno: posledice prethodnog produkcionog test-meča

Sara: −1758 dukata i prikazana kazna −20 Indeksa moći. Andrija: +1775 dukata i +1775 poena lige. Server je menjao i statistiku/H2H; sve vrednosti nisu dodatno proverene. Nije urađeno poništavanje. Ako korisnik želi poništavanje, prvo pripremiti pregled tačno tog meča i svih knjiženja, zatim posebno odobren i jednokratan korektivni postupak. Ne vraćati cela salda na staru vrednost jer bi se time mogle izgubiti kasnije legitimne promene.

## Redosled sledećih radnji

Aktuelni izdvojeni QA → Online random → stvarni poziv prijatelju → Daily devet tema i kratka potvrda Trule višnje → telefon/reklame/nagrade → potvrda objavljenih dorada i učitavanja → završna evidencija. Lokalna priprema i ciljane provere mogu teći pre produkcionog deploya; potvrda na produkcionoj verziji čeka korisnikov dogovoreni deploy.
