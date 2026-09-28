# Green Asset Standardization — Undo token, Korak 3

## Ishod

Složeni Green prikazi Undo tokena standardizovani su bez mešanja tokena sa velikim action glyph strelicama. Neusaglašeni terracotta token sa ivory strelicom u ilustraciji Pravila zamenjen je kanonskim Undo tokenom, a neiskorišćena uramljena `pro` varijanta uklonjena je iz runtime/preload paketa.

## Precizno izmenjena ilustracija Pravila

Novi high-resolution master:

- `source-assets/green-soft-clay-hires/rules/pages/economy-treasury-v3.png` — 1254 × 1254 RGBA

Optimizovani runtime:

- `www/assets/green-soft-clay/rules/pages/economy-treasury-v3.png` — 512 × 512 RGBA

Ugrađeni ImageGen korišćen je u režimu `precise-object-edit`. Image 1 bio je postojeći `economy-treasury-v2.png`, a Image 2 zaključani kanonski master Undo tokena. Zahtev je bio da se zameni samo desni token identitetom ivory obod / forest-green lice / terracotta strelica, uz očuvanje kovčega, tri petotačkasta dukata, položaja, osvetljenja, senki i transparentne pozadine.

Runtime `v3` reprodukuje se iz high-resolution mastera putem `scripts/build-green-standardized-compositions.py`.

## Uklonjen neaktivan preload

`ducats-undo-pro-v2.png` postojao je u opštoj Green room-on-demand listi, ali nije imao vidljivu Green UI vezu. Aktivna glavna kartica, intro i menu thumbnail već koriste slobodni action glyph `ducats-undo-free-v3.png`.

Zato su iz `www` uklonjeni:

- `assets/green-soft-clay/ducats-undo-pro-v2.png`;
- zastareli `assets/green-soft-clay/rules/pages/economy-treasury-v2.png`.

Oba high-resolution izvora ostaju sačuvana u `source-assets`, dok centralni registar definiše njihove aktivne zamene.

## Centralni registar

Porodica `undoToken` sada ima status `standardized` i evidentira tri dozvoljene složene upotrebe:

1. `ducats-undo-free-v3.png` — room/intro action glyph;
2. `runtime/menu/ducats-undo-free-v3.png` — startup thumbnail istog glyph-a;
3. `rules/pages/economy-treasury-v3.png` — ilustracija sa pravim kanonskim tokenom.

Velika terracotta strelica oko dukata ostaje action glyph i ne predstavlja potrošni token. Gameplay, back i navigacione strelice takođe ostaju izvan ove porodice.

## Performanse

- Green paket pre čišćenja: 172 PNG / 17,18 MB.
- Green paket posle Koraka 3: 171 PNG / 16,91 MB.
- Startup: nepromenjenih 17 PNG / 4,56 MB.

Uklanjanje neaktivne uramljene varijante smanjilo je paket približno 0,27 MB i uklonilo nepotrebno dekodiranje slike pri ulasku u ekonomsku sobu.

## Sledeći korak

Pre zaključavanja porodice potrebno je završno proveriti direktne i složene veze, zabranjene putanje, dimenzije, alpha kanal, preload izolaciju i semantičke izuzetke. Posle čiste kontrole status `undoToken` može biti promenjen iz `standardized` u `locked`.
