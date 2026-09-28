# Zelena Soft Clay

Podrazumevana zelena tema koristi svetliju dark-green žadnu paletu, namenski renderovanu 3D Soft Clay / neumorphism pozadinu i sopstveni `green_clay` skin kockica.

Aktivni background: `../../assets/green-clay-balkan-diorama-v3.png`.

Tabla za igranje je proceduralno renderovana CSS slojevima u svetlijoj dark-green Soft Clay / neumorphism paleti. Renderovana pozadina se pojavljuje kao jedan kontinuiran pejzažni watermark neposredno ispod mreže: nazire se kroz obična prazna polja, dok su zaglavlja i zbirni redovi puniji radi čitljivosti. Produkcione dimenzije, raspored 6 kolona, visine ćelija, padding i razmaci nisu menjani.

Ista šumska dark-green paleta primenjena je na kompletan ekran igre: header, status, kontrolni panel, ležište kockica, `BACAJ`/`NAJAVA` dugmad, game-menu kontrole i `green_clay` kockice. Geometrija i ponašanje komponenti ostaju nepromenjeni.

Pet donjih ikona glavnog menija koriste namenski renderovane transparentne `Balkan Clay` PNG simbole iz `../../assets/green-soft-clay/`. Asseti više nemaju sopstvenu kvadratnu pločicu, okvir ili pejzažnu bazu: svaki je slobodan glineni simbol u šumsko-zelenoj, krečnjačkoj i terakota paleti. Postojeće dimenzije i klik-zone dugmadi nisu menjane.

Istim slobodnim sistemom bez pozadinske pločice pokriveni su Global chat, Online igrači i zajednička kartica Dukati / Ispravi zadnji upis. Cela tema koristi jedan zaključan dukat: terracotta clay lice i telo, zaobljen ivory clay obod i tačno pet tamnozelenih zaobljenih kvadratnih tačaka u rasporedu četiri ugla plus centar. Isti identitet se koristi u direktnom UI-u, porukama, efektima, kovčezima i nagradnim kompozicijama. Undo token i terakota Undo strelica ostaju zasebni simboli, dok postojeći živi status indikator Online igrača ostaje funkcionalan iznad PNG asseta.

Četiri kartice za izbor moda sada koriste isti V2 jezik slobodnih glinenih simbola: jedan igrač za Solo, dva ravnopravna igrača za Hotseat, globus sa nasumičnim strelicama za Online Random i povezane karike sa plusom za Pozovi prijatelja. Kartice, tekstovi, klik-zone i funkcije nisu menjani; zamenjene su samo ikonice zelene teme.

Pet donjih kontrola od Dnevnog izazova do Pravila više nema vidljivu kvadratnu CSS podlogu, okvir ni senku dugmeta; originalna klik-zona 55×55 ostaje dostupna. Riznica i Turnir takođe koriste providne kontrole bez rama, sa novim slobodnim simbolima otvorenog kovčega i pobedničkog pehara. Njihove postojeće akcije i klik-zone ostaju nepromenjene.

Kvartalna liga ima originalni zeleni `YotB / QL` logo u romb formi: tamnozeleno glineno polje, krečnjački podignuti okvir, terakota vezne tačke i diskretan reljef šestokolonskog Yamb listića. Na glavnoj kartici koristi se kao miran desni watermark niske neprozirnosti, dok naslov, rang, progres i živi podaci ostaju potpuno funkcionalni i čitljivi.

Motivi na pozadini su verni igri: standardni rasporedi tačkica na kockicama i diskretan Yamb listić sa šest kolona. Centralna zona ostaje mirna kako bi meniji, modali i tabla zadržali čitljivost.

Tema ostaje registrovana pod internim ID-em `dark` radi kompatibilnosti sa postojećim profilima i sačuvanim podešavanjima.

Kanonske porodice i zabranjene zastarele runtime putanje evidentirane su u `asset-registry.json`. Svaka buduća Green kompozicija sa valutom mora koristiti odobrene front/angle mastere i proći `check-theme-performance.js` pre objavljivanja.

Samostalni Undo token koristi jedan kanonski identitet: debeo ivory glineni obod, uvučeno šumsko-zeleno lice i punu terracotta kružnu strelicu suprotnu smeru kazaljke na satu. Velika strelica oko dukata u zajedničkoj ikoni sobe i gameplay/navigacione strelice ostaju zasebni action glyph simboli, a ne tokeni.

Porodice `ducat`, `undoToken` i `rewardedVideo` imaju status `locked` u centralnom registru. Automatska provera čuva njihove direktne prikaze, složene kompozicije, runtime dimenzije, transparentnost, preload izolaciju i semantičko razdvajanje od medalja, trofeja, funkcionalnih strelica i običnih playback kontrola.

Rewarded-video akcija koristi jedan kanonski horizontalni forest-green ticket sa ivory okvirom i play trouglom. Aktivno stanje ima mali terracotta svetlucavi akcenat, a nedostupan oglas isti ticket sa jasnom terracotta kosom zabranom. Dnevni izazov, Riznica i Solo double-reward sada koriste isti ticket u optimizovanim sobnim kompozicijama, uz zaključan raspored od jednog, jednog i dva kanonska dukata. Claim, completed i ordinary playback simboli ostaju odvojene semantičke porodice.
