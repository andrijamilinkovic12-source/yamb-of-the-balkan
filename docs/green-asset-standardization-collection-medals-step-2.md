# Green Asset Standardization — Treasury Collection medalje, Korak 2

## Ishod

Treasury Collection trio je vizuelno standardizovan i formiran je namenski canonical paket. Gold je zadržan kao odobreni konstrukcioni master, dok su Silver i Bronze precizno obrađeni prema njegovoj geometriji traka.

- Gold: postojeći izgled sa ivory-prugastim ribbon trakama i okruglim terracotta spojem;
- Silver: dodate ivory pruge i četvrtasti spoj zamenjen okruglim terracotta spojem;
- Bronze: dodate ivory pruge, postojeći okrugli terracotta spoj sačuvan.

Tier lice, podignuta zvezda, ivory obod, paleta i funkcionalna semantika sva tri nivoa nisu menjani.

## ImageGen obrada

Korišćen je ugrađeni ImageGen režim `precise-object-edit`, odvojeno za Silver i Bronze, sa transparentnom pozadinom.

### Silver prompt — sažetak

- edit target: originalni Silver Collection master;
- konstrukciona referenca: Gold Collection master;
- promena: samo dve ribbon trake i spoj ispod kružnog diska;
- rezultat: dve forest-green trake sa po jednom ivory prugom i jedan okrugli terracotta spoj;
- zaključano: kompletno silver lice, ivory obod, ivory zvezda, kadar, svetlo i proporcije.

### Bronze prompt — sažetak

- edit target: originalni Bronze Collection master;
- konstrukciona referenca: Gold Collection master;
- promena: samo dve ribbon trake;
- rezultat: dve forest-green trake sa po jednom ivory prugom;
- zaključano: bronze lice i zvezda, ivory obod, postojeći okrugli spoj, kadar, svetlo i proporcije.

Oba prompta zabranjuju tekst, brojeve, lovor, krunu, logotip, dodatne medalje i promenu tier materijala.

## Kanonski masteri

| Nivo | Rezolucija | Master |
|---|---:|---|
| Gold | 512 × 512 | `source-assets/green-soft-clay-canonical/collection-medals/green-collection-gold-master-v1.png` |
| Silver | 1254 × 1254 | `source-assets/green-soft-clay-canonical/collection-medals/green-collection-silver-master-v1.png` |
| Bronze | 1254 × 1254 | `source-assets/green-soft-clay-canonical/collection-medals/green-collection-bronze-master-v1.png` |

Sva tri mastera su RGBA PNG sa transparentnom pozadinom.

## Optimizovani runtime paket

Svaka izvedenica je `256 × 256` RGBA PNG:

- `canonical/collection-medals/collection-gold-v1.png` — 65 KB;
- `canonical/collection-medals/collection-silver-v1.png` — 63 KB;
- `canonical/collection-medals/collection-bronze-v1.png` — 68 KB.

Paket se deterministički reprodukuje skriptom `scripts/build-green-canonical-collection-medals-pack.py` uz kvalitetno LANCZOS skaliranje.

## Manifest i kontrola integriteta

`source-assets/green-soft-clay-canonical/collection-medals/manifest.json` definiše:

- jedinstvenu semantičku ulogu Treasury skin kategorija;
- zaključani oblik oboda, zvezde, prugastih traka i okruglog spoja;
- kompletan gold/silver/bronze trio;
- master i runtime putanje;
- SHA-256 otiske svih šest PNG fajlova;
- semantičke izuzetke za podium, QL, finalist, tab, rank, trophy, winner, dukat i token assete.

`check-theme-performance.js` proverava status `canonical`, komplet i jedinstvenost trija, master dimenzije, runtime rezolucije, direktan alpha kanal i sve SHA-256 otiske.

## Performanse

Tokom Koraka 2 novi canonical trio privremeno postoji paralelno sa tri stare aktivne runtime kopije:

- Green tema: `176 PNG`, ukupno `17.06 MB`;
- startup: nepromenjeno `17 PNG`, `4.56 MB` kompresovano / `20.44 MB` procenjeno dekodirano;
- najveći sobni paket ostaje Riznica, bez promene njenog aktivnog starog paketa u ovom koraku.

Canonical Collection medalje nisu deo startup toka. Privremena tri duplikata ukloniće se u Koraku 3 posle atomarnog prebacivanja Treasury veza.

## Namerno ostavljeno za Korak 3

- povezati dinamički Green Treasury category template na canonical namespace;
- povezati sva tri asseta u room-on-demand Treasury paket;
- dodati `collectionMedals` porodicu u centralni Green registar;
- evidentirati stare `treasury/collection-*` putanje kao zabranjene i ukloniti njihove runtime kopije;
- sačuvati high-resolution istorijske izvore i mapirati ih na canonical zamene;
- ne menjati skinove, cene, otključavanja, collection kategorije niti assete drugih semantičkih porodica.
