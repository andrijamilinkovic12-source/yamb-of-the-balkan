# Green Asset Standardization — Takmičarske medalje, Korak 2

## Ishod

Potvrđene su dve odvojene kanonske podfamilije:

- `generalPodium` za Top listu, Turnir, Power Index i Vatreni niz;
- `quarterlyLeaguePodium` isključivo za Kvartalnu ligu.

General Podium gold medalja precizno je prerenderovana: velika ivory zvezda zamenjena je jednim ivory lovorom, dok su gold telo, obod, forest-green trake, ivory pruge, terracotta vrhovi, osvetljenje, materijal i silueta sačuvani. QL trio nije vizuelno menjan.

## ImageGen obrada

Korišćen je ugrađeni ImageGen režim `precise-object-edit` sa transparentnom pozadinom.

Ulazi:

- edit target: originalna General Podium gold medalja;
- reference: postojeće General Podium silver i bronze medalje;
- promenljivi element: samo centralni znak;
- zaključani elementi: kompletno telo medalje, trake, paleta, proporcije, kamera i svetlo.

Finalni prompt zahtevao je jedan simetričan ivory lovor sa pet zaobljenih listova po strani i ukrštenim drškama, bez zvezde, teksta, brojeva, logotipa, krune ili dodatnih ornamenata.

## Kanonski masteri

### General Podium

| Nivo | Master |
|---|---|
| Gold | `source-assets/green-soft-clay-canonical/competition-medals/general-podium/green-general-podium-gold-master-v1.png` |
| Silver | `source-assets/green-soft-clay-canonical/competition-medals/general-podium/green-general-podium-silver-master-v1.png` |
| Bronze | `source-assets/green-soft-clay-canonical/competition-medals/general-podium/green-general-podium-bronze-master-v1.png` |

General masteri su `1254 × 1254` RGBA PNG fajlovi.

### Quarterly League Podium

| Nivo | Master |
|---|---|
| Gold | `source-assets/green-soft-clay-canonical/competition-medals/quarterly-league/green-quarterly-league-podium-gold-master-v1.png` |
| Silver | `source-assets/green-soft-clay-canonical/competition-medals/quarterly-league/green-quarterly-league-podium-silver-master-v1.png` |
| Bronze | `source-assets/green-soft-clay-canonical/competition-medals/quarterly-league/green-quarterly-league-podium-bronze-master-v1.png` |

QL masteri su postojeći odobreni `512 × 512` RGBA izvori, kopirani bez regeneracije.

## Optimizovani runtime paketi

Svih šest izvedenica je `256 × 256` RGBA PNG:

- `canonical/competition-medals/general-podium-{gold,silver,bronze}-v1.png`;
- `canonical/competition-medals/quarterly-league-{gold,silver,bronze}-v1.png`.

Paket se deterministički reprodukuje skriptom `scripts/build-green-canonical-competition-medals-pack.py` uz LANCZOS skaliranje.

## Manifest i kontrola integriteta

`source-assets/green-soft-clay-canonical/competition-medals/manifest.json` definiše:

- tačno dve podfamilije;
- semantičku ulogu i dozvoljene potrošače svake podfamilije;
- kompletan gold/silver/bronze trio;
- identitet lovora za General Podium i zvezde za Quarterly League;
- master i runtime putanje;
- SHA-256 otiske svih dvanaest PNG fajlova;
- semantičke izuzetke za collection, finalist, tab, rank, trophy i winner assete.

`check-theme-performance.js` proverava status `canonical`, komplet oba trija, jedinstvene nivoe, master dimenzije, runtime rezolucije, alpha kanal i sve SHA-256 otiske.

## Performanse

Tokom Koraka 2 kanonskih šest runtime fajlova postoji paralelno sa starim aktivnim putanjama:

- Green tema: `179 PNG`, ukupno `17.20 MB`;
- startup: nepromenjeno `17 PNG`, `4.56 MB` kompresovano / `20.44 MB` procenjeno dekodirano;
- najveći sobni paket: Riznica, `44 PNG`, `2.93 MB` kompresovano / `13.70 MB` procenjeno dekodirano.

Kanonski medal paketi nisu deo startup toka. Privremeno povećanje od šest PNG fajlova biće uklonjeno u Koraku 3 kada se sve veze prebace na canonical putanje i stare runtime kopije bezbedno uklone.

## Namerno ostavljeno za Korak 3

- povezati General Podium canonical trio u Top listi, Turniru, Power Index-u, Vatrenom nizu i `game.js`;
- povezati Quarterly League canonical trio u live ligi, Dvorani slavnih, Pravilima i room-on-demand paketu;
- dodati `competitionMedals` porodicu u centralni Green registar;
- ukloniti šest starih runtime medalja tek kada nijedna aktivna veza više ne pokazuje na njih;
- zadržati Treasury collection, finalist, tab, rank i trophy assete netaknute.
