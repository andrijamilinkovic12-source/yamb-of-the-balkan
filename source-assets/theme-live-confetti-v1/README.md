# Žive konfete — v1

Svaka od deset tema ima tri **zasebno generisana** transparentna PNG mastera (`ribbon`, `chip`, `lozenge`). Produkcioni PNG je tehnički izrezan i smanjen na 256 × 256 pomoću `scripts/build-live-confetti-sprites.ps1`. `manifest.json` beleži SHA-256 oba fajla.

## Prompt set

Zajednički zahtev za svaki od 30 poziva ugrađenom ImageGen alatu: jedna izolovana čestica u 3D Soft Neomorphism stilu; stvarna providna pozadina; silueta čitljiva na 20 CSS px; bez teksta, novčića, kockica, zvezda, šljokica, dodatnih predmeta i scene; posebno osmišljen oblik i materijal, bez prebojavanja drugog crteža.

| Tema | Pravac | Ribbon | Chip | Lozenge |
| --- | --- | --- | --- | --- |
| Zelena | Clay | Šumska zelena savijena traka | Terakota glineni komad | Topla slonovača, organski zavoj |
| Svetlo zlato | Smooth Rubber / Matte Plastic | Ivory traka sa medenom ivicom | Mekani medeno zlatni četvorougao | Pritisnuta ivory kapsula |
| Trula višnja | Clay | Asimetrični bordo glineni luk | Zaobljeni vinski pečat | Kratka bordo glinena kapsula |
| Plavi okean | Smooth Rubber / Matte Plastic | Egejska plava uvijena traka | Plavi trouglasti komad | Morsko plavi oval |
| Neon Cyber | Smooth Rubber / Matte Plastic | Grafitna traka sa tirkiznom ivicom | Umereni magenta komad | Tirkizni grafitni zavoj |
| Kraljevski ametist | Clay | Ljubičasta meka glinena naborana traka | Prigušeni ametistasti facet | Plitki slivasti romb |
| Vaskršnja | Smooth Rubber / Matte Plastic | Ivory i žalfija meki zavoj | Bleda žalfija u ivory okviru | Jednostavna ivory kapsula |
| Pustinjsko staklo | Clay | Koralni peščani zavoj | Nepravilni peščani glineni komad | Izduženi koralni glineni oblik |
| Mesečev sjaj | Clay | Srebrnosivi glineni zavoj | Zaobljeni sivi facet | Lunarna siva oblutak forma |
| Severna maglina | Smooth Rubber / Matte Plastic | Tamnoplava traka sa ledenom ivicom | Ponoćno plavi mat komad | Ledeno cijan oblong |

Pokrenuti `scripts/build-live-confetti-sprites.ps1`, zatim `npm run check:live-confetti`. Pregled aktivnih efekata: `docs/theme-live-effects-review.html`; statički pregled čestica: `docs/theme-live-confetti-sprites-review.png`.
