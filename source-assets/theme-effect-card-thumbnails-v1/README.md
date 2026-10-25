# Effect card PNG derivatives

These are proportional, unretouched derivatives of the existing canonical runtime PNGs, prepared for small Treasury cards. They are not newly drawn icons. Full originals remain in animations, logos and their other existing uses.

There are 43 distinct files: four themed roles for ten themes, plus three intentional universal material/object variants (ice, trumpet and natural flame). The manifest records the original file and SHA-256, derivative SHA-256, dimensions, bytes, use and visual review. The entire RGBA canvas is resized proportionally, without recoloring or cropping.

Maximum bounds are 384 × 256 pixels; CSS card dimensions stay unchanged. Total PNG bytes drop from 46,354,005 to 4,312,400 (90.7%). The Amethyst black-hole/supernova pair drops from 3,589,815 to 274,565 bytes.

Build with `node scripts/build-effect-card-thumbnails.cjs` and the bundled `YAMB_SHARP_PATH`. Verify with `node scripts/check-effect-card-thumbnails.cjs`. Review: `docs/theme-visual-audit/effect-card-derivatives-v1.png`.
