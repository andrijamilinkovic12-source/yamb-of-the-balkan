# 3D X controls — image generation brief

Each control was generated separately with the built-in `image_gen` tool. The
same-theme `canonical/treasury-controls/tab-trophies-v1.png` was a **material
and lighting reference only**, never a shape to copy. Every prompt requested
one transparent, front-facing, soft 3D close control with one unmistakable X,
strong readability at 44 CSS px, restrained detail and no text, trophy, scenery,
flat vector look, ornaments or watermark.

| Theme | Theme-specific prompt direction |
| --- | --- |
| Green | Hand-shaped deep green soft-clay pebble; two raised ivory clay bars; warm, quiet clay highlights. |
| Svetlo Zlato | Broad low honey-gold matte-plastic lozenge with a calm sloping top cut and deeply inset cocoa X. |
| Trula Višnja | Asymmetric cherry-clay mass with one central scooped hollow and crossed pale-apricot clay folds. |
| Plavi Okean | Aegean-blue matte-plastic form with a broad asymmetric coastal arch and tapered ivory X pieces. |
| Neon Cyber | Dark navy matte cyber module with one top notch, dimensional cyan X and one tiny magenta seam. |
| Kraljevski Ametist | Heavy, broadly faceted violet clay control with a thick lilac X and subdued royal-amethyst volume. |
| Vaskršnja | Calm sage-and-cream vertical matte-plastic oval with one leaflike edge taper and deep green X. |
| Pustinjsko Staklo | Terraced warm sandstone clay tablet with two wide horizontal layers and a pressed brown X. |
| Mesečev Sjaj | Low charcoal-gray clay relief with one broad upper-right concavity and a pale gray dimensional X. |
| Severna Maglina | Continuous deep-blue matte-rubber curve with one icy taper and two soft frosted-white X bars. |

Generation source PNGs and cleaned 768 px masters are kept under each theme's
`source-assets/theme-icon-packs/<theme>/room-close-v2-imagegen/` directory. The
256 × 256 RGBA production PNG remains the canonical
`www/assets/<theme-pack>/canonical/room-controls/close-v1.png` slot, with a v3
cache key. `scripts/build-theme-room-close-controls.py` only removes background
fragments and standardizes the canvas; it does not draw or recolor the icon.
