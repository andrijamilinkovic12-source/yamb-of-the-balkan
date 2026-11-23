# Magic firefly PNG prompt set

Generated with the built-in ImageGen tool, one independent transparent master per theme. Shared prompt: one isolated three-quarter-view magical firefly for a mobile game, 3D Soft Neomorphism, centered with transparent margin, readable at 28–40 CSS px, head, body, two raised wings and compact glowing tail. No text, stars, scenery, pedestal, photorealism, jewelry or excessive detail.

| Theme ID | Individual art direction |
| --- | --- |
| dark | Green Clay: moss-green sculpted body, ivory wings, pale yellow-green tail, tiny terracotta detail. |
| light | Light Gold Smooth Rubber: flattened honey-amber body, broad matte ivory wings, warm golden tail. |
| medium | Dark Cherry Clay: asymmetric cherry-clay body, warm cream wings, muted apricot-rose tail. |
| winter | Blue Ocean Smooth Rubber: Aegean-blue rounded body, sail-like white wings, blue-green tail. |
| neon | Neon Cyber Smooth Rubber: dark navy segmented body, clean cyan wings, turquoise tail, small magenta accent. |
| amethyst | Royal Amethyst Clay: weighty plum-clay body, broad lavender wings, restrained pale amber tail. |
| easter | Easter Smooth Rubber: compact sage-and-ivory body, leaf-like notch, soft cream wings, warm spring-amber tail. |
| desert | Desert Glass Clay: coral sandstone body, layered ridge-like wings, gentle teal-amber tail. |
| moon | Moon Glow Clay: low charcoal-and-silver body, pale gray wings, cool ivory tail. |
| severna | Northern Nebula Smooth Rubber: continuous dark teal-navy body, frosted ivory-cyan wings, ice-turquoise tail. |

`scripts/build-live-firefly-sprites.py` crops and scales each master to the canonical 256 × 256 sprite and derives the Treasury preview and thumbnail. It does not recolor one theme into another.

## Flight atlas v2

Built-in ImageGen reference: `docs/theme-live-fireflies-sprites-review.png`. Generated source: `front-views-v2.png`.

> Use case: stylized-concept. Game asset: a SINGLE production sprite atlas for the true front-view counterparts of the existing firefly collection. Reference image shows ten individual theme models in 5 columns x 2 rows. Create one wide transparent PNG matching that 5 columns x 2 rows arrangement (aspect 5:2). EXACTLY ten isolated sprites, one centered within each equal square cell with ample transparent margins: NO smaller duplicate, no text, no labels, no backgrounds, panels, outlines, grid or decorations. In every cell show the specific reference firefly facing directly towards camera, face and eyes symmetrical, both antennae distinct. A slight view from above shows luminous tapered abdomen below head. BOTH wings fully open laterally, wing tips above and outward, clear negative space around solid central head/body; wings connect only at thorax. Preserve the design, polished clay finish, and palette of each reference: top row olive with ivory wings and lemon tail; caramel gold and cream; burgundy copper with cream rose wings; cold cobalt with luminous ivory crystal wings; almost-black with cyan luminous glass wings. Bottom row deep purple with faceted amethyst wings; pale spring sage ivory; burnt copper amber wings; charcoal gunmetal silver moon wings; midnight blue with frosty cyan aurora wings. Use strong readable silhouettes and the same size in all 10 cells. Real alpha, no floating shadow or glow spilling into neighboring cells, no writing. The output is the actual front-view animation source atlas, high resolution, meticulously aligned.

`python scripts/build-firefly-flight-atlases.py` combines the front views with the original angled sprites and their reflections. It bakes five wing positions per view into the active theme's `canonical/effects/firefly-flight-v2.png`: 112 px cells, rows front/left/right. The existing Treasury artwork is unchanged.
