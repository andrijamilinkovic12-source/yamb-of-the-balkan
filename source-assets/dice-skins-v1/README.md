# Universal dice skin PNGs, version 1

The 48 IDs and their order come from `SHOP_DATA.SKINS` in `www/config.js`. Each skin has one 384 × 384 RGBA runtime face in `www/assets/dice-skins-v1/`. These faces are pip-free. The existing HTML/CSS die grid supplies values 1–6, so the same PNG works for every roll and for the Treasury preview. All ten themes use the same file for each selected skin.

`manifest.json` records the source master, runtime file, 3D Soft Neomorphism direction (Clay or Smooth Rubber / Matte Plastic), pip color, theme gift mapping, and SHA-256 for every skin. Thirty-seven original masters in `masters/` and nine new themed masters in `source-assets/theme-dice-skins-v1/masters/` were generated for this set. The `green_clay` and `bronze_antique` masters and runtime images are the earlier approved pilots in `source-assets/green-dice-pilot/` and `www/assets/green-dice-pilot/`; their runtime bytes are preserved here.

## Prompt set and generation mode

Built-in image generation, transparent-background mode. Every new skin used the same geometry request: exactly one isolated, front-facing, softly inflated rounded-square die face; solid opaque center reserved for CSS pips; transparent outside; 3D Soft Neomorphism; no pips, numerals, symbols, scene, ornaments, glitter, extra objects, or photorealistic glare. A second clause specified each skin's material, restrained palette, and Clay or Smooth Rubber / Matte Plastic direction. Frosted/glass named skins keep a full opaque center so pips remain legible on any theme background.

Run `scripts/build-universal-dice-skins.py` with the bundled workspace Python to clean detached transparency speckles, normalize new masters, copy both pilots, and regenerate runtime PNGs, CSS, manifest, and review sheets. The complete browser review is `docs/dice-skins-v1-review.html`; the theme gift comparison is `docs/theme-dice-skins-review.html`.

Run `scripts/check-universal-dice-skins.js` to verify catalog coverage, PNG dimensions and identity, the preserved pilots, and the shared gameplay/Treasury links. Review the actual small-size dice in the app before accepting final art changes.
