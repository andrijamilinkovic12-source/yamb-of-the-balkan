# Solo record panel PNG prompts

Ten separate calls to the built-in image generator produced the transparent master PNGs. Each prompt requested a single empty horizontal Solo result panel, approximately 2.4:1, in 3D Soft Neomorphism, with four equally sized shallow recesses in a 2 × 2 grid, a quiet header and footer, and soft tactile volume. All prompts prohibited baked text, numbers, icons, medals, stars, trophies, confetti, ornament, and a Power Index mark. The panel PNG supplies material only; game labels, state, localized status, Power Index, and restrained confirmation light remain live UI.

| Theme | Theme-specific prompt direction |
| --- | --- |
| Green Room | Handmade soft clay; muted sage and pale olive; subtly irregular broad hand-molded rim; soft contact shadows. |
| Svetlo zlato | Smooth matte plastic; honey gold and ivory; broad flattened form and a restrained diagonal corner cut, without metallic gloss. |
| Trula višnja | Handmade deep burgundy and cherry clay; asymmetric broad molding and warm clay-peach insets, without gold ornament. |
| Plavi okean | Aegean blue and cream matte plastic; a single broad sail-like arch and navy contour, without literal boats or waves. |
| Neon Cyber | Midnight navy smooth rubber; a single controlled cyan seam and one small magenta corner detail, with dark inset cells. |
| Kraljevski ametist | Dark plum clay; broad hand-formed faceted arch and muted purple insets, without gems or crowns. |
| Vaskršnja | Ivory and sage matte plastic; compact smooth oval silhouette with a single restrained notch, without eggs, ribbons or flowers. |
| Pustinjsko staklo | Matte terracotta and sandstone clay; two broad horizontal strata in the outer rim, without crystals, gloss or fine engraving. |
| Mesečev sjaj | Charcoal and lunar gray clay; low rounded relief with one broad concave edge, without stars or craters. |
| Severna maglina | Midnight teal matte rubber; uninterrupted curves and one gentle icy tapered edge, without cyber segmentation or aurora ribbons. |

The ten generated masters are in `masters/`. The build script crops only the transparent margin and scales each to the shared 768 × 320 runtime canvas. It checks contrast using the live cell ink over both inactive and softly lit cell colors.
