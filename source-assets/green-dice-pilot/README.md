# Green dice PNG pilot

This pilot replaces only the visible die face for the free `green_clay` skin and the first Bronze Collection skin, `bronze_antique`, when the Green theme is active. The game still renders the six pip layouts in HTML/CSS. The Green Treasury preview for both pilot skins now uses the same CSS pips instead of a Unicode die symbol. Existing CSS skins remain in `www/kockice.css` above the pilot block, so the visual experiment can be reversed by removing that final block, restoring the previous stylesheet query version in `www/index.html`, and reverting the small `www/managers.js` preview condition.

| Skin | Master | Mobile asset |
| --- | --- | --- |
| `green_clay` | `green-clay-face-master-v1.png` | `www/assets/green-dice-pilot/green-clay-face-v1.png` |
| `bronze_antique` | `bronze-antique-face-master-v1.png` | `www/assets/green-dice-pilot/bronze-antique-face-v1.png` |

The masters are 1254×1254 transparent PNGs. Mobile assets are 384×384 transparent PNGs, downsampled with high-quality bicubic filtering. The images were generated with the built-in image generation tool: the first prompt requested a front-facing, pip-free forest-jade soft-clay die face with a transparent surround and uncluttered center; the second used that image as a geometry/style reference and requested a matching pip-free warm antique-bronze clay face. No other skins, themes, purchase prices, or unlock states were changed.

Preview: `www/themes/green/qa-preview.html`. This previews all values 1–6 and Treasury-sized skin thumbnails with game-style pip overlays; it is not a substitute for checking gameplay and the actual Treasury on an authenticated Android build.
