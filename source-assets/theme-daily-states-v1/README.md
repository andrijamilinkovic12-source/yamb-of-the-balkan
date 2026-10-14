# Daily Challenge PNG pack v1

The 27 transparent masters in `masters/` were created with the built-in imagegen tool, one separate generation per theme and UI role. `scripts/build-theme-daily-states.py` centers and resizes each approved master into a 384 × 384 RGBA production PNG. `manifest.json` records the theme palette, material direction, source path, production path, and SHA-256 for each asset.

## Prompt set

Shared instruction for every render: one isolated, transparent 3D Soft Neomorphism UI asset; clean silhouette legible at 44–104 CSS px; no text, dice, coins, room scene, decorative scatter, photorealism, or extra motifs. The material direction and palette follow `docs/theme-definitions.json`. Each theme receives its own shape, not a recolor of another theme's asset.

Role prompts:

- `task`: compact two-line challenge/task marker with one subdued completed check and one open line.
- `complete`: single decisive check on a simple theme-specific raised surface.
- `already-played`: closed/finished daily status marker with one completed check or bar.

Theme cues: Svetlo Zlato uses ivory and honey-gold soft plastic; Trula Višnja uses deep cherry clay; Plavi Okean uses cream and Aegean blue matte plastic; Neon Cyber uses graphite and restrained cyan edge light; Kraljevski Ametist uses plum clay; Vaskršnja uses sage and ivory matte plastic; Pustinjsko Staklo uses terracotta sand clay with one muted teal note; Mesečev Sjaj uses charcoal lunar clay; Severna Maglina uses midnight blue and ice-cyan matte plastic. Ornate attempts for Ametist and Pustinjsko Staklo were rejected and replaced by simpler masters before production export.
