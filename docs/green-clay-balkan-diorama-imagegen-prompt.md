# Green Clay Balkan Diorama — ImageGen prompt

Generated with the built-in ImageGen tool. The supplied Gemini image was used only as a style and atmosphere reference.

## Base generation prompt

```text
Use case: stylized-concept
Asset type: production-quality portrait background for the Yamb of the Balkan mobile game, 9:16, full bleed
Input images: Image 1 is a style and atmosphere reference only; do not reproduce its phone mockup, title, controls, grids, or exact composition
Primary request: create an exceptional green-theme background inspired by the handcrafted Balkan clay diorama feeling of Image 1, but redesigned as a clean in-game background rather than a phone advertisement
Scene/backdrop: an enchanting miniature Balkan mountain valley sculpted entirely from soft clay: layered green Dinaric hills, a refined forest of rounded deciduous trees and elegant conifers, a small stone-and-plaster village with warm terracotta tiled roofs, a modest village church, winding pale clay path, tiny wooden fences, sparse sheep, stones, shrubs, and distant misty mountains. No Yamb score-sheet fields or grid shapes anywhere in the meadows.
Subject: the Balkan landscape itself is the hero; at the extreme lower foreground, include exactly five small green clay dice subtly nestled into the terrain, each showing a valid standard face from 1 to 6 with correct recessed ivory pips; they should feel like crafted game pieces belonging to the world, not casino props
Style/medium: premium 3D Soft Clay Neumorphism, museum-quality handcrafted miniature diorama, smooth matte polymer clay, tactile rounded modeling, sophisticated and magical rather than childish, realistic spatial depth while unmistakably clay
Composition/framing: portrait 9:16 without any phone frame. Keep the upper 35–40% as calm atmospheric pale sage sky and distant soft hills with generous low-detail negative space for the app logo and overlays. Place the village in the middle-lower distance, forest framing the far edges, and the five dice small near the bottom edge. Maintain a clear low-contrast central corridor so translucent menu cards remain readable. Rich edge detail, calmer center.
Lighting/mood: gentle early-morning diffused light, subtle volumetric mist between mountain layers, soft top-left highlights, deep but soft ambient occlusion, tranquil welcoming premium mood
Color palette: distinctive lighter dark-green theme with sage, jade, moss, and muted emerald; pale mint sky; restrained warm terracotta roofs and creamy stone as small accents; no lime, no near-black, no oversaturated colors
Materials/textures: fine matte clay grain, softly pressed terrain, miniature hand-shaped trees, rounded bevels, delicate fingerprints only at microscopic level, no plastic gloss
Constraints: background only; no phone frame, no notch, no status bar, no time, no UI, no buttons, no gear, no title, no words, no letters, no numbers, no logo, no watermark; absolutely no Yamb score grids or rectangular game fields in the landscape; exactly five dice if visible, with valid pip layouts; polished final game art
Avoid: flat illustration, photorealistic landscape, toy-plastic shine, childish cartoon proportions, casino imagery, floating interface elements, scorecard grids, empty fenced rectangles, excessive buildings, crowded center, hard shadows, yellow-green cast
```

## Final dice correction

```text
Use case: precise-object-edit
Asset type: production mobile game background
Primary request: preserve the referenced Balkan soft-clay landscape exactly and correct only the five green clay dice in the lower foreground. Make every visible die face a valid standard six-sided die face with conventional recessed ivory pip placement. Set the five top faces, from left to right by horizontal center position, to 1, 3, 5, 4, and 2 respectively.
Constraints: change only pip count and pip placement on the five existing dice; keep exactly five dice, their positions, sizes, rotations, matte green clay material, ivory recessed pips, lighting and shadows unchanged. Preserve the entire landscape and composition unchanged. No text, logo, UI, score grids, watermark, phone frame, or new objects.
Avoid: extra dice, missing dice, domino patterns, more than six pips on any face, moving objects, changing the landscape, photorealistic plastic dice
```

Final candidate asset: `www/assets/green-clay-balkan-diorama-v1.png`
