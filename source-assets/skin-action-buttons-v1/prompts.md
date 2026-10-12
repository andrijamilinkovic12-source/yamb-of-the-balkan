# Dugmad za skinove kockica — ImageGen v1

Za svaki od 48 skinova iz `source-assets/dice-skins-v1/manifest.json` poslata je zasebna ImageGen generacija sa njegovim `master` PNG fajlom kao referencom. `{id}` i `{direction}` se uzimaju iz tog manifesta. Tri stanja su zatim izvezena iz prozirnog izvornog PNG fajla u tri produkciona PNG fajla po skinu.

```text
Use case: stylized-concept. Asset type: transparent PNG sprite source for three mobile game action buttons for the dice skin {id}. Image 1 is the exact material, color and shape reference for THIS skin, not an edit target. Design three original blank 3D Soft Neomorphism buttons using this skin's distinctive palette and details, in the {direction} direction. Exactly three same-sized horizontal capsule buttons vertically stacked on a transparent SQUARE canvas, each button roughly 75% of canvas width and 17% of canvas height, evenly spaced into top, middle and bottom thirds. TOP: raised BACAJ action surface. MIDDLE: softer recessed NAJAVA surface. BOTTOM: contrasting OTKAŽI cancellation surface in a legible countertone from the skin palette. Front-on flat projection, restrained highlights and tactile edge depth, clean center for HTML labels. NO background or rectangular backdrop: complete alpha transparency outside the three separate button silhouettes and in all gaps. No text, letters, dice, pips, icons, symbols, ornaments, decorations, scenery, photorealism or excessive metallic glare.
```

Izvoz: `scripts/split-skin-action-buttons.ps1`. Kanonski spisak: `manifest.json`.
