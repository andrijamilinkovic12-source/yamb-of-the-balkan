# Kanonski registar asseta po temi

**Pravilo:** jedna semanticka uloga ima jedan vizuelni identitet unutar svake teme. Deset tema imaju deset originalnih interpretacija iste uloge. Ponovljeni prikaz koristi isti kanonski PNG ili tehnicku izvedenicu istog mastera; kompozitni PNG mora pratiti aktivnu verziju tog motiva. Deljenje mastera izmedju tema uz prebojavanje nije dozvoljeno.

Masinski indeks je [theme-canonical-asset-registry.json](theme-canonical-asset-registry.json). Izvodi se iz postojecih evidencija naredbom `node scripts/build-theme-canonical-asset-registry.js`. `--check` proverava da indeks nije zastareo, da postoje aktivne putanje i manifesti, i da se SHA vrednosti slazu. Indeks ne zamenjuje vizuelni pregled na stvarnom ekranu.

## Sta je evidentirano

| Sloj | Trenutni obuhvat | Izvor istine |
| --- | --- | --- |
| DNK, stil, pravac i paleta | 10 tema | `docs/theme-definitions.json` |
| Osnovne semanticke PNG uloge | 191 po temi: 169 u 35 kanonskih porodica i 22 pozadine/kompozita/ostalih uloga | `docs/theme-asset-role-catalog.json` |
| Zelena referenca | 191 postojeca referentna putanja; detaljan opis 33 porodice | `www/themes/green/asset-registry.json` i katalog |
| Devet ostalih tema | po 191 planirana uloga; trenutno po 130 oznacenih `linked` ili `verified`, dve `created`, 59 `defined` u osnovnoj mapi | `docs/theme-asset-implementation-map.json` |
| Noviji paketi izvan pocetnog kataloga ili sa novim verzijama | 17 manifesta, ukljucujuci skinove, kontrole, kvartalnu ligu, rekordne panele, pozive i nove preglede Zlatne Kise | `source-assets/*/manifest.json`, navedeni u JSON indeksu |

Statusi u osnovnoj mapi su evidencija rada, **ne tvrdnja da su samo ti asseti aktivni**. Noviji manifest moze zameniti v1 putanju iz osnovne mape. Na primer, Vaskrsnja, Pustinjsko Staklo i Severna Maglina koriste kanonski dukat v2 iz `source-assets/theme-economy-critical-v2/manifest.json`, dok osnovna mapa jos cuva istorijski v1 slot. Centralni indeks prikazuje v2 kao aktivan i belezi v1 pod `supersedes`.

Osnovne kanonske porodice obuhvataju:

| Oblast | Primeri i broj uloga po temi u pocetnom katalogu |
| --- | --- |
| Valuta i ekonomija | dukat 5, token 2, nagradni video 4 |
| Identitet soba | 12 porodica sa po 2 velicine za meni i sobu/intro |
| Takmicenja i nagrade | 26 trofeja dostignuca, 15 medalja razlicitih takmicenja, 3 kolekcionarske medalje, 6 ligaskih rangova, turnirski pehar i finalista |
| Kontrole i stanja | Riznica 8, Podesavanja 8, kvartalna navigacija 4, turnirska navigacija 3 i stanja 6, Top lista 3, dnevni izazov 3, X zatvaranje 1 |
| Igraci i statistika | Online igraci 6, statisticki pregled 10, medjusobni skor 6, Solo rezultat 3, Hotseat pobednik 1 |
| Ilustracije | Pravila 4, pregledi efekata Riznice 16 |

Pozadina, logo, kovceg Riznice, ekonomija i drugi slozeni PNG postoje pored tih kanonskih porodica. Noviji paketi kao rekordni paneli, pozivi prijatelju i skinovi imaju svoje manifeste i nisu automatski deo prvobitnih 191 uloga.

## Ponovljeni motivi

Registar posebno prati dukat (pet uloga/velicina), token za vracanje upisa, aktivno/nedostupno stanje nagradnog videa, Power Index, Vatreni niz, 15 takmicarskih medalja, tri kolekcionarske medalje, X za zatvaranje, turnirski pehar, radnje Online igraca i zvuk/muziku/vibraciju. Za svaku od ovih uloga JSON ima putanju po temi i SHA-256, ili status `defined-without-production-path` kada nema potvrdjene produkcione putanje. Taj status nije dozvola za stari SVG ili kopiju iz druge teme.

| Kanonski motiv | Gde se deli | Pravilo identiteta |
| --- | --- | --- |
| Dukat | Glavni meni, Riznica, soba Dukati, nagrade, zavrsni ekran | Uvek dukat iste teme i aktivne verzije; slozene ikone proveravaju se prema njemu. |
| Token za ispravku upisa | Soba Dukati, vracanje upisa, nagradni prikazi | Isti token te teme; nije zamena za dukat. |
| Ikona sobe Dukati / Ispravi zadnji upis | Meni i intro/soba | Jedan slozeni identitet sa zavisnostima od kanonskog dukata i tokena. |
| Medalje | Top lista, Turnir, Kvartalna liga, Power Index, Vatreni niz, Riznica | Poseban identitet za **temu × takmicenje × plasman**. Zlatna, srebrna i bronzana unutar takmicenja dele isti motiv, ali su posebni PNG fajlovi. |
| Power Index | Statistika, lista igraca, pozivi, turnir, zavrsni ekran | Isti tematski motiv, uz tehnicke velicine/izvedenice istog mastera. |
| Vatreni niz | Statistika, lista niza pobeda, medjusobni skor | Jedan motiv po temi; trenutne istorijske putanje za neke teme su otvorena migracija. |

U `www/config.js` funkcija `getThemeMedalSource` vec centralno bira medalju po kontekstu, plasmanu i temi. Za Top listu i Kvartalnu ligu aktivne su novije v2 medalje; registar ih prikazuje kao zamenu za istorijske v1 slotove. Ostale tri takmicarske grupe i kolekcionarske medalje koriste postojece v1 putanje. To ne znaci da su sve medalje vizuelno ponovo pregledane.

Kovceg Riznice je primer zavisnog kompozita: u meniju koristi 384 px PNG, u sobi/intru 512 px PNG, a tri dukata unutar njega moraju izgledati kao aktivni kanonski dukat te teme. Za Vaskrsnju, Pustinjsko Staklo i Severnu Maglinu novi `treasury-master-v3.png` je pregledan prema v2 dukatu; ostale teme imaju raniji pregled prema v1. Putanja kompozita nije ista kao putanja pojedinacnog dukata, ali je vizuelni identitet obavezan.

Ikona sobe Dukati / Ispravi zadnji upis je drugi zavisni kompozit. Registar belezi njene PNG putanje za meni i sobu u svih deset tema, sa dve zavisnosti: dukat i token. Vizuelna provera uskladjenosti tih sastavnih delova tek sledi; postojanje PNG fajla to ne potvrdjuje.

Efekat **Zlatna Kisa** (`gold_rain`) je treci zavisni prikaz dukata. Animacija u `www/managers.js` ucitava `ducat-particle` aktivne teme; isti efekat se pokrece iz Riznice, Dnevnog izazova, turnirske nagrade i zavrsnog ekrana posle dupliranja. Svih deset tema koriste isti laksi canvas tok, trajanje i ogranicenje broja cestica, uz diskretan ambijent i nijanse lelujanja/okretanja iz palete i karaktera teme. Stari genericki crtezi novcica, dragulja i krune nisu deo prikaza. Pri smanjenom pokretu tri kanonska dukata stoje nepomicno. Promena teme ili izlazak uklanjaju prethodni sloj. Ako se PNG ne ucita, rezervni DOM prikaz koristi tematski `dukatIconHtml()`. Staticki PNG pregled i mala slicica u Riznici vode se zasebno u registru. Za Vaskrsnju, Pustinjsko Staklo i Severnu Maglinu v2 pregledi su sastavljeni od tacnog aktivnog kanonskog PNG dukata; manifest belezi master, produkcione dimenzije i SHA-256. Zajednicka ogranicenja, pristupacnost i pravilo bez kica zabelezeni su u `goldRainEffectRule` u `theme-definitions.json`.

Takmicarske medalje ostaju odvojene po takmicenju: opsti podijum, turnir, kvartalna liga, Power Index i niz pobeda nisu jedna medalja prebojena pet puta. Slicno tome, 48 univerzalnih skinova kockica, njihova dugmad i brojac bacanja imaju **vlasnistvo po skinu**, a ne po trenutno izabranoj temi. Tematski poklon skin pripada svojoj temi pri otkljucavanju, ali njegov izgled ostaje isti kada se koristi u drugoj temi.

## Kako se vodi promena

1. Dodeli semanticku ulogu i vlasnika: tema, konkretno takmicenje ili konkretan skin. Ne uvodi novi motiv ako kanonski vec predstavlja istu radnju.
2. Sacuvaj originalni master i produkcione PNG izvedenice u manifestu. Zabelezi putanju, verziju, dimenzije i SHA-256.
3. Povezi sva mesta upotrebe sa aktivnim PNG-om te teme. Zavisne kompozite, kao kovceg, proveri i po potrebi prerenderuj.
4. Osvezi indeks: `node scripts/build-theme-canonical-asset-registry.js`.
5. Proveri indeks: `node scripts/build-theme-canonical-asset-registry.js --check`, zatim pogledaj stvarne sobe i male mobilne velicine. Tek posle vizuelne potvrde podigni status na `verified` u mapi implementacije.

## Otvorena provera

Registar namerno ostavlja otvorenu vizuelnu proveru ostalih kompozita koji sadrze dukat za tri teme sa aktivnim v2 dukatom: ekran Dukati/Ispravi upis, nagradne scene, efekti i Pravila. Takodje su zvuk, muzika i vibracija u osnovnoj mapi devet tema jos `defined` bez produkcione putanje; aktivne kontrole u novijim paketima treba posebno povezati sa tim semantickim ulogama pre oznake `verified`.

Vaskrsnja, Pustinjsko Staklo i Severna Maglina sada koriste nove v2 PNG preglede i v2 male slicice Zlatne Kise, sastavljene od aktivnih v2 dukata. Njihove ranije v1 putanje ostaju u registru kao `supersedesPreview` i `supersedesThumbnail`. Ostalih sedam pregleda jos nije pojedinacno uporedjeno sa aktivnim dukatom; to je zabelezeno po temi pod `composites.goldRain.previewVisualAudit`.

Kanonski slot Vatrenog niza za devet nezelenih tema jos nema produkcionu putanju u osnovnoj mapi. `www/vatreniniz.js` za Vaskrsnju, Pustinjsko Staklo i Severnu Maglinu eksplicitno koristi ranije `statistics/fire-streak` PNG putanje, dok za ostale prikazuje tekstualni/emoji motiv. To je stvarni preostali posao povezivanja, ne potvrda da je Vatreni niz vec usaglasen u svih deset tema.

Stari `www/themes/easter/asset-registry.json` opisuje i povucene putanje; ne koristi se kao aktivni izvor za svih deset tema. Ovaj indeks pokazuje aktivne izuzetke i upucuje na najnovije manifeste.
