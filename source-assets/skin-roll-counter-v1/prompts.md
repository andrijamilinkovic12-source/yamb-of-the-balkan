# Kružni brojač za skinove kockica

Svih 48 skinova ima zaseban proziran PNG master. Za 38 opštih skinova generisan je novi kružni master pomoću ugrađenog ImageGen alata; kao reference služe tačno lice kockice i PNG dugme Najava istog skina. Deset poklon skinova tema koristi prethodno zasebno generisane kružne mastere koji su već rađeni prema licima tih poklon skinova. Svaki master je povezan samo sa svojim skinom.

Osnovni zahtev za opšte skinove: jedan centriran, frontalni kružni 3D Soft Neomorphism token u pravcu `Clay` ili `Smooth Rubber / Matte Plastic` navedenom u `source-assets/dice-skins-v1/manifest.json`. Materijal, boja i obrada ivice prate referentno lice kockice i odgovarajuće dugme. Sredina mora ostati čista za broj; obod dovoljno širok za tri segmenta. Puna alfa providnost izvan kruga. Bez teksta, brojeva, tačaka kocke, gotovih segmenata, kvadratne podloge, dodatnih simbola i kiča.

Skripta `scripts/build-skin-roll-counter.ps1` deterministički izvozi četiri RGBA PNG stanja 256 × 256 po skinu: prazan obod, 1/3, 2/3 i 3/3. Segmenti se dodaju tačnim redom; boja se uzima od tačaka skina kada ima najmanje 3:1 kontrast prema licu brojača, a inače se koristi kontrastna svetla/tamna boja. Broj se bira prema kontrastu sredine. Kanonski inventar je `manifest.json`; pregled je `docs/skin-roll-counter-review.html`.
