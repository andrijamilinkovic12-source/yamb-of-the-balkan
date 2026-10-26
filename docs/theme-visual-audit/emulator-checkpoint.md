# Emulator — delimična vizuelna provera, 25.10.2026.

## Nastavak — stabilnost promene teme

[Dijagnostika i regresioni dokazi R01/R13](../theme-switch-stability-2026-10-25.md). Lokalno je uklonjen vremenski prozor od 2,5s koji dopušta zakasnelom cloud odgovoru da vrati prethodnu temu. Ručni izbor sada ima prvenstvo u sesiji istog naloga, uz nalogom ograničen nepotvrđen izbor i proveru inventara. Obuhvaćeni su Settings, game panel i Riznica. Generički PNG preloader deli download/decode i ima ograničen cache; Settings ne priprema isti paket dva puta. Regresione provere prolaze. Brzina prvog transfera i potvrda u Android aplikaciji čekaju naredni korisnikov deploy; ranija galerija nije dokaz ovih novih izmena.

## Najnoviji prolaz — posle korisnikovog commit/deploya

[Galerija 80 stvarnih snimaka i nalazi R01–R13](emulator-deployed-2026-10-25/index.html), [strukturisana evidencija](emulator-deployed-2026-10-25/report.json). Javni Settings JS, Vatreni niz, Statistics CSS i menu typography provereni su kao HTTP 200 i normalizovano jednaki lokalnim verzijama na početku prolaza.

Preostalih osam tema sada je pregledano u **Top listi (globalna i prazna lokalna), Statistici (pregled, H2H, obe rang-liste) i prvoj strani Pravila**. Zelena i Svetlo zlato imaju prethodni detaljniji prolaz; Zelena power kartica ponovo je potvrđena posle deploya. Potvrđena je popravka zaglavlja Vatrenog niza kroz osam dodatnih tema. U Ametistu su ponovo proverene manje kartice efekata, uključujući Crnu rupu i Supernovu.

Nove lokalne ispravke, koje **još nisu objavljene**: R07 cache verzija menija; R08 Green geometrija unutrašnjeg podnožja i 44px navigacioni dodiri statistike; R09 tematski H2H kontrast; R10 Vaskršnje zaostale pastelne površine/redovi/skrol; R11 nevidljivi redni brojevi 4+ u Vaskršnjoj Top listi; R12 paleta i pozadina gate-a pripadaju odredišnoj temi. Palete su evidentirane u `docs/theme-definitions.json`; identiteti PNG nisu precrtavani zbog CSS problema.

**Otvoreno:** R01 prvi hladni transfer tema Desert/Moon/Severna prekoračio je rok, ponovni izbor je uspeo. R13 pri kasnijem ulasku u Podešavanja primećen povratak na Desert; uzrok nije potvrđen i zahteva odvojenu proveru sinhronizacije, bez pretpostavke da je problem u samim PNG. Nova CSS popravka gate-a ne rešava transfer. Ostatak svih soba, retkih stanja i završnih ekrana nije označen kao potpuno pregledan.

Provere: Statistics sa ponovnim otvaranjem istog Fire modala u deset tema i kontrastom H2H; Top lista i zaštita od zakašnjelog starog PNG; Pravila (10 tema / 2 jezika / 6 strana); decoded game theme switch; gate (10 usvojenih pozadina / 4.5:1 mastilo). Vizuelna potvrda novih lokalnih izmena čeka sledeći korisnikov deploy.

Emulator je vraćen na Zelenu, originalni ekran 1440×3120 / 560 dpi, uz očuvanu prijavu. Nisu pokretane nove partije, kupovine ni nagradne reklame. Blokirajući poziv Lidije odbijan je prema izričitom korisnikovom odobrenju; automatski test interstitiali su zatvoreni Android back kontrolom. Tokom završnog vraćanja prozora došlo je do duže pauze alata/uređaja; iz nje se ne izvode merenja performansi aplikacije.

## Prethodni nastavak — pre gornjeg deploya

[Novi snimci i nalazi R04–R07](emulator-followup-2026-10-25/index.html). U ovom nastavku stvarno su otvoreni Top lista (globalna i prazna lokalna), Statistika (pregled, H2H i obe rang-liste) i Pravila u **Zelenoj i Svetlom zlatu**. Zeleni H2H detalj i šesta strana Pravila su dodatno pregledani. Preostalih osam tema ovih soba još nisu označene kao vizuelno potvrđene.

Četiri nova lokalna popravka: kontrast Green kartice Indeksa moći, osvežavanje ranije skrivenog zaglavlja Vatrenog niza, Green bezbedne margine u Statistici/rang-listama za ostalih devet tema i prelom teksta glavne kartice Kvartalne lige na 411px. Regresioni test otvara isti Vatreni niz u svih deset tema. Objavljena verzija još nema prethodne lokalne ispravke: javni `theme-settings-room.js` je HTTP 200, ali se razlikuje i nema novi decoded-prepare kod. Potreban je sledeći deploy za poštenu vizuelnu potvrdu R01–R07.

Emulator je ponovo ostavljen otvoren, prijavljen, u Zelenoj temi, na originalnim dimenzijama. U ovom nastavku nisu pokretane partije ni nagradne reklame niti preuzimane nagrade. Automatski test interstitial pri jednom izlasku je zatvoren.

## Prethodni prolaz

Korisnik je ručno završio prijavu i objavio poslednje izmene. Javni `theme-quality-assets.js` sada vraća **HTTP 200**, sa istim normalizovanim SHA-256 kao lokalni fajl (26.334 bajta). Pregledani deploy uključuje prethodnih 121 PNG zamenu i kanonsko povezivanje video-ikona.

[Galerija sa nalazima i granicama provere](emulator-2026-10-25/index.html).

Pregledani su glavni meni i konačno učitana Podešavanja svih deset tema na logičkom prikazu 360 × 780. Dodatno: Zelena / Dnevni izazov (aktivni i završni panel), Ametist / deo trofeja i efekata Riznice. Ovo **nije završena provera svih soba i stanja aplikacije**, niti test na fizičkom Samsungu S25.

Pronađena su tri problema: prethodne ikone pri promeni teme, slab kontrast na pojedinim delovima menija, i veliki PNG originali u malim karticama efekata. Lokalne ispravke su pripremljene uz regresione provere. Njihova vizuelna potvrda čeka sledeći korisnikov deploy; snimci prikazuju verziju pre tih ispravki.

Automatska bezbednosna provera odbila je ADB prosleđivanje WebView debug porta zbog mogućeg izlaganja prijavljene sesije. Prosleđivanje nije izvršeno i nije korišćen zaobilazni pristup. Dalji pregled koristi vidljive kontrole i snimke ekrana, bez debug pristupa nalogu.

Korisnik je izričito odobrio završavanje već otvorenog Dnevnog izazova zaustavljanjem šest kockica. Test je završen sa **96**, bez reklame i bez preuzimanja nagrade. Dodatni pokušaji, kupovine, slanje poziva, izmene profila i odjava nisu rađeni. Izbor tema je privremeno menjan kroz postojeći UI; na kraju je vraćena Zelena i originalni ekran emulatora (1440 × 3120, 560 dpi). Prijava je očuvana.
