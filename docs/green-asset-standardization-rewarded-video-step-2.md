# Green Asset Standardization — Rewarded Video, Korak 2

## Ishod

Postojeći Economy par potvrđen je kao kanonski Green Rewarded Video identitet. Vizuelni sadržaj nije regenerisan: oba odobrena 512 px RGBA izvora sačuvana su kao masteri, a runtime izvedenice deterministički su napravljene LANCZOS skaliranjem.

Porodica `rewardedVideo` dodata je u centralni Green registar sa statusom `canonical`.

## Kanonski masteri

| Stanje | Master |
|---|---|
| Aktivna video akcija | `source-assets/green-soft-clay-canonical/rewarded-video/green-rewarded-video-active-master-v1.png` |
| Nedostupan oglas | `source-assets/green-soft-clay-canonical/rewarded-video/green-rewarded-video-unavailable-master-v1.png` |

Aktivni master zadržava forest-green ticket, ivory okvir i play trougao i mali terracotta akcenat. Unavailable master koristi istu osnovnu geometriju sa terracotta kosom zabranom.

## Optimizovane runtime izvedenice

| Uloga | Rezolucija | Putanja |
|---|---:|---|
| Active | 256 × 256 | `canonical/rewarded-video/rewarded-video-active-v1.png` |
| Active inline | 128 × 128 | `canonical/rewarded-video/rewarded-video-active-inline-v1.png` |
| Unavailable | 256 × 256 | `canonical/rewarded-video/rewarded-video-unavailable-v1.png` |
| Unavailable inline | 128 × 128 | `canonical/rewarded-video/rewarded-video-unavailable-inline-v1.png` |

Paket se reproducira skriptom `scripts/build-green-canonical-rewarded-video-pack.py`.

## Povezane upotrebe

- obe aktivne rewarded-video kartice u Ekonomiji koriste `active 256`;
- obe disabled kartice i oba banner failure stanja koriste `unavailable 256`;
- srpska i engleska Pravila koriste inline izvedenice;
- kompletan par evidentiran je u Green room-on-demand paketu;
- Green Riznica ne preuzima Economy inline/unavailable izvedenice koje joj nisu potrebne; druge teme zadržavaju postojeći preload tok;
- stari `economy/rewarded-video-v1.png` i `economy/ad-unavailable-v1.png` uklonjeni su iz `www` nakon prebacivanja svih veza.

Izvorni high-resolution fajlovi ostaju sačuvani u `source-assets/green-soft-clay-hires/economy`, a canonical masteri su njihove hash-identične kopije.

## Automatska kontrola

`check-theme-performance.js` proverava:

- status porodice i sve četiri registry uloge;
- propisane dimenzije i direktan alpha kanal;
- tačno dve aktivne i četiri unavailable Economy veze;
- obe inline veze u Pravilima;
- kompletan room-on-demand paket;
- odsustvo obe stare runtime putanje;
- mapu zamena za istorijske mastere.

## Performanse

Četiri canonical izvedenice ukupno zauzimaju približno 129 KB, dok su dve stare 384 px runtime slike zauzimale približno 198 KB. Startup ostaje nepromenjen jer ova porodica nije deo početnog paketa.

## Namerno ostavljeno za Korak 3

Kompozicije Dnevnog izazova, Riznice i Solo double reward još koriste različite video oblike. U sledećem koraku biće precizno prerenderovane sa kanonskim ticketom, uz očuvanje odgovarajućeg broja i identiteta kanonskih dukata.
