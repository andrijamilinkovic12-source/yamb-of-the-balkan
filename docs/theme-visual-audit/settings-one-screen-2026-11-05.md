# Podešavanja: jedan ekran posle dodataka za nalog i analitiku

Osnovna soba u svih deset tema koristi isti kompaktan raspored. Profil i dve akcije naloga su u zajedničkoj kartici; brisanje je sekundarna, manja akcija u paleti tekuće teme. Zvuk, muzika i vibracija su tri kartice u jednom redu, sa celom površinom kartice kao labelom prekidača. Izbor teme i jezici dele sledeći red. Uslovi, privatnost, privatnost oglasa i analitika su u podnožju.

Kanonski PNG, logika naloga, potvrde brisanja, saglasnosti i prava izbora tema ostaju postojeći. Nisu potrebni novi PNG za ovu promenu rasporeda. Tema zadržava svoj materijal, boje, senke i DNK; fontovi su jednake veličine na istom viewportu. Osnovna soba nema vertikalni skrol. Zasebni modal izbora teme zadržava svoju listu.

Provera `scripts/test-settings-one-screen.cjs`: **80/80 PASS** — deset tema × srpski/engleski × 320×568, 360×640, 384×824 i 430×932 CSS px. Simulirani safe-area je 24 px gore i dole. U svim slučajevima prikazani su prijavljen nalog, odjava, brisanje i obe opcije privatnosti istovremeno. Sve kontrole su unutar kartice i safe-area; nema prelivanja teksta ili vertikalnog skrola; vidljivi PNG su učitani. Tipografska skala odgovara zelenoj na istom viewportu. Minimalni izmereni kontrast novog izgleda dugmeta za brisanje je **5,29:1**. Dodir naslova svake audio kartice menja pravi prekidač i prosleđuje postojeći događaj čuvanja.

Prošli su i `check:theme-settings-room`, `test-account-deletion-ui.cjs` i `test-analytics-privacy.cjs`. To su izolovane lokalne provere bez naloga, brisanja stvarnih podataka, API poziva ili izmene saglasnosti. Fizički Samsung S25 nije testiran ovim korakom. Ekranska tastatura i proizvoljno velika sistemska slova nisu obuhvaćeni ovim matricama.

Interaktivni prikaz: [Podešavanja](../theme-settings-layout-review.html). Detaljni lokalni rezultati i slike: `tmp/settings-one-screen/`. Izmene nisu komitovane niti objavljene.
