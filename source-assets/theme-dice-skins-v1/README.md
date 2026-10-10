# Nine theme gift dice skins

The earlier Green `green_clay` skin remains the tenth reference. These nine new master PNGs give every other theme its own face in that theme's 3D Soft Neomorphism direction and palette. Their IDs, theme mapping, directions, production paths, pip colors, and hashes are recorded in `source-assets/dice-skins-v1/manifest.json` and `docs/theme-definitions.json`.

Created with the built-in image generation tool in transparent-background mode. The shared prompt requested one isolated, orthographic rounded-square die face with an opaque center, transparent exterior, no baked pips, legibility at 60 px, and no kitsch. Each prompt then specified the theme's exact palette, Clay or Smooth Rubber / Matte Plastic material, and a unique shape cue from its icon DNA. The Moonlight master was refined once to keep its lower pip positions on the light center.

`scripts/build-universal-dice-skins.py` converts these masters to 384 × 384 RGBA runtime PNGs in `www/assets/dice-skins-v1/`. Gameplay and the Treasury use the same file and add correct 1–6 pips in CSS. A gift skin is hidden and unavailable until its theme is owned. Purchasing or unlocking the theme grants and activates it without an extra charge. Previously owned themes receive their new gift through migration. The three older Desert, Easter, and Northern Nebula skins were replaced and removed from the catalog.

Review: `docs/theme-dice-skins-review.html`, `docs/theme-dice-skins-review.png`, and the actual 60 px light/dark comparison `docs/theme-dice-skins-mobile-review.png`.
