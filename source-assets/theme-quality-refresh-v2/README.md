# Theme PNG quality refresh v2

This manifest is the resumable job ledger for the visual audit findings. Every art change uses a separate built-in `image_gen` edit with the original theme PNG and, where relevant, the canonical flame, Power Index or ducat reference. Prompts are in `prompts.md`.

States: `pending` → `generated-awaiting-review` → `verified`. Generation alone does not activate artwork. Review the packaged contact sheet at `docs/theme-visual-audit/quality-{theme}-v2.png`, including the 28px example on the theme surface, before marking a theme verified.

`scripts/build-theme-quality-refresh.cjs` creates production PNGs with the preceding canvas dimensions and optical bounds. It generates the pure runtime path lookup in `www/theme-quality-assets.js` from verified files and the canonical video redirects. Production resolver functions and preloaders use this lookup before assigning sources; there is no delayed global DOM replacement or recoloring.

Use `scripts/quality-refresh-store.cjs` for manifest updates so packaging cannot overwrite generation progress. Original runtime/source files are preserved as history. The new manifest stores original/master/production SHA-256, dimensions, optical bounds, prompt, canonical inputs and review notes.

After activation, rebuild the canonical registry, use map, review page and visual report. `node scripts/check-theme-quality-refresh.cjs --complete` additionally requires every planned edit to be reviewed. A static PNG review does not claim that every dynamic application state or physical device was visually tested.
