# Presek rada u ovom chatu — 1.11.2026.

Korisnik preuzima samostalno oba preostala testa na fizičkom telefonu: (1) stvarni prikaz, safe zone i prvo/ponovljeno učitavanje; (2) stvarne reklame i nagrade. Ne otvarati ponovo ove zahteve za povezivanje telefona ili iste osnovne sobne prolaze bez novog nalaza ili korisnikovog zahteva.

## Šta je obuhvaćeno od početka

1. **Definicije deset tema.** DNK, 3D Soft stil, pravac Clay ili Mat silikon/Meka plastika, palete, kontrast i pravila tipografije. Zelena je referenca za dimenzije i raspored; ostale teme zadržavaju sopstveni izgled. Bez kiča, preslikavanja i prostog prebojavanja istog crteža.
2. **Pozadine i identiteti.** Izbor pozadina, jedinstveni icon packovi, logotipi igre i soba; povezivanje u meniju, prijavi, introima i unutrašnjim prikazima. Uklanjanje starih prikaza i pogrešnih PNG/SVG putanja u obrađenom obuhvatu.
3. **Kanonski registar.** Dukati, token ispravke upisa, indeks moći, vatreni niz, pehari, medalje po takmičenju/plasmanu i drugi ponovljeni identiteti. Popis značenja, putanja, varijanti veličina i mesta upotrebe, uključujući kompozite i efekte. Dukat sa pet tačaka; pravilna lica i raspored tačaka kocke; turnirski pehar sa zvezdom.
4. **Skinovi i igra.** Skinovi kockica, vezana dugmad BACAJ/NAJAVA/OTKAŽI i brojači bacanja; prava besplatnih/kupljenih i skinova uključenih uz temu. Kontrolni panel, oko, tajmer, tri tačke i izbor posedovanih skinova; tematske površine i tabla uz očuvane funkcije i standardne dimenzije.
5. **Sobe i njihove podstrane.** Glavni i unutrašnji PNG, kartice, tabovi, podkartice, dugmad, UI, tipografija, kontrast, introi i granice prikaza. Obuhvaćeni su i H2H/Indeks moći/Vatreni niz, podprikazi Turnira i Riznice i skrivena funkcija linka Pozovi prijatelja.
6. **Završni ekrani i obračuni.** Solo/Hotseat/zajednički online završni prikazi, perspektiva TI/PROTIVNIK, komentari, kolone, rekordni panel, Power Index i nagradna dugmad. Lični rekord je vezan za nalog. Lokalno proveravani obračuni, ponovljeni zahtevi i oporavak posle neuspeha oglasa; turnirski revanš samo posle remija. Stvarna SDK isplata ostaje zasebna telefonska potvrda.
7. **Efekti.** PNG/animacione dorade i povezivanje sa identitetima tema, naročito kanonska kiša dukata, konfete, svici, mehurići i kasniji efekti. Istorija odbijenih varijanti i kvalitativnih odluka nije isto što i potvrda svakog efekta na svakom uređaju.
8. **Optimizacija i dokazi.** Učitavanje tema/skinova, priprema i zadržavanje PNG paketa, zaštita od zakašnjelih izbora, lokalni testovi, emulatori i ciljane potvrde posle korisnikovih objava. Evidencija je odvojila lokalne rezultate, pravi Android prikaz i stvarne partije/nagrade.

## Završeni osnovni sobni prolazi

**15/15 kroz deset tema:** Dnevni izazov; Top lista; Statistika; Podešavanja; Pravila; Globalni chat; Online igrači; Dukati/ispravi zadnji upis; Kvartalna liga; Riznica; Turnir; Solo; Dva igrača Hotseat; Online Random; Pozovi prijatelja.

Ovo označava pregled zabeleženih osnovnih stanja, ne svaki mogući mrežni događaj, retko stanje ili isplatu.

## Poslednje konkretne potvrde

- Aktivni Dnevni izazov i završni prikaz deset tema; prava nagrada iz tog pokušaja nije bila predmet testa.
- Online Random: aktivni prikazi deset tema i zasebna stvarna QA partija sa završnim rezultatima; detalji i ograničenja u prethodnim izveštajima.
- R40 skin keš: objavljen i ciljani normalan izbor/povratak potvrđen.
- R41:138PNG smanjeno ukupno18,45% bez promene piksela. Na oba servisa276/276HTTP/hash provera; ovo ne dokazuje trenutno učitavanje na S25.
- R42:objavljena6.44; prvi poziv primljen posle svežeg pokretanja pre otvaranja sobe na primaocu, zatim odbijen bez duela. Pošiljaočev toast odbijanja nije vizuelno potvrđen.
- Završni panel: ranijih150desktopresize stanja, zatim90unutrašnjih AndroidChrome provera i konačne4promene istog panela sa roditeljskim granicama. Inertni lokalni prikaz nije aplikacioni WebView ili prava partija.
- Poslednji lokalni `check:ad-reward-flow` prolazi: rewarded konteksti/rezultati, interstitial cooldown/single-flight/failure/restart, offline ispravka upisa i izlazak iz Online igrača. SDK reklama i isplata na telefonu nisu ovim potvrđeni.

## Korisnikova dva samostalna testa

**Prikaz i učitavanje:** S25 safe zone, granice i povremeno odsecanje pravog završnog panela, prvo i ponovljeno učitavanje tema/skinova. Raniji povremeni WebView problem i brzina nisu proglašeni popravljenim samo na osnovu izolovanih testova.

**Reklame i nagrade:** uspešan oglas, nedostupan/neuspešan oglas, povratak u završni ekran, izlaz sa osnovnom nagradom posle neuspeha, tačan iznos/množilac i odsustvo duplog preuzimanja kroz ponovljeni pritisak/povratak.

Stvarni revanš i prekid/povratak veze tokom duela ranije su isključeni iz odobrenog testa. Lokalni testovi tih handlera nisu dokaz uspešnog stvarnog testa i taj izuzetak se čuva, bez automatskog otvaranja novog zadatka.

## Stanje objave

Poslednje programske ispravke potvrđene su na produkciji i QA kao6.44/commit0f48fdce. Posle toga dodati su lokalni test alati i evidencija, bez promene `www` implementacije. **Nema nove programske izmene koja zahteva produkcioni deploy zbog poslednjeg izolovanog pregleda.** Korisnik nije ovim zatražio novi commit/deploy.
