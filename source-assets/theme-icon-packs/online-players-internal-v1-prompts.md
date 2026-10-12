# Online Players internal PNG, v1

Each `state-master.png` was generated as its own transparent ImageGen illustration. Shared framing: a single compact, centered 3D Soft Neomorphism UI icon for the Online Players empty/loading state, readable at 88 CSS px, with transparent surroundings. No text, numerals, dice, confetti, glitter, photographic detail, borrowed motif, or decorative floor shadow. The theme direction and palette govern material and geometry; this is not a color swap.

| Theme | Specific illustration direction |
| --- | --- |
| Green Room | Rounded ochre and sage clay roster tablet, two friendly forest green clay busts, small warm ochre online bead. |
| Light Gold | Honey gold matte plastic arch, two pearl cream busts, one restrained bronze bead. |
| Trula Višnja | Low burgundy clay plaque, ivory and plum busts on staggered levels, dusty apricot bead. |
| Blue Ocean | Inflated sea blue matte plastic wave crest, two white and blue busts, tiny terracotta bead. |
| Neon Cyber | Graphite matte plastic tile, two busts with restrained cyan edges, tiny magenta bead and little glow. |
| Royal Amethyst | Violet clay alcove, two pearl lilac busts and subdued gold bead, without jewels or crown. |
| Easter | Ivory matte plastic Balkan arch niche, sage and cream busts, small terracotta bead, without eggs or rabbits. |
| Desert Glass | Sand clay relief with adobe like steps, two coral busts and muted teal bead; no photographic glass. |
| Moonlight | Charcoal lunar clay stone, ash and silver busts on a crater ledge, pale silver bead, without stars or Earth. |
| Northern Nebula | Navy smooth rubber crest, ice blue busts under a curved aurora edge, small lavender bead, without star glitter. |

All five functional roles (`search`, `friend`, `spectate`, `duel`, `avatar`) were also generated with a **separate built-in ImageGen call for every role in every theme**. The prompt for each call combined the following role-specific object, the theme palette and direction above, and this common constraint: one centered transparent 3D Soft Neomorphism miniature, readable at 36 CSS px; no shared square plaque or card, borrowed geometry, text, numerals, dice, confetti, glitter, photorealism, flat vector appearance or kitsch. These are 50 separate generations, not a recolored or code-drawn master.

| Theme | Search | Friend | Spectate | Duel | Avatar |
| --- | --- | --- | --- | --- | --- |
| Green | Ochre and sage clay lens | Green bust with ochre plus | Sage relief eye | Two hand-rolled clay batons | Neutral green bust on ochre foot |
| Light Gold | Pearl lens in honey rim | Cream bust and bronze plus | Layered honey eyelid | Pearl and honey batons | Neutral cream bust on gold foot |
| Trula Višnja | Burgundy arched lens | Ivory bust and apricot plus | Burgundy clay eye | Two plain cherry/apricot batons | Faceless bust in shallow cherry arch |
| Blue Ocean | Wave-contour blue lens | White bust on blue wave, coral plus | Marine eye and pearl lid | Crossed blue/white wave batons | Faceless white bust on wave |
| Neon Cyber | Notched graphite and cyan lens | Graphite bust and cyan plus | Cyan-edged techno eye | Cyan/magenta edged batons | Faceless graphite bust with cyan contour |
| Royal Amethyst | Soft faceted violet lens | Lilac bust and subdued-gold plus | Plain lilac eye, no filigree | Plain lilac/amethyst crossed batons | Faceless bust under plain amethyst arch |
| Easter | Ivory lens with sage grip | Sage/ivory bust with terracotta plus | Sage lid and terracotta iris | Sage/terracotta crossed batons | Faceless bust under simple sage arch |
| Desert Glass | Stepped sand-clay lens | Coral bust on adobe steps, teal plus | Eye carved in sand relief | Sand/ivory crossed batons | Faceless bust on two adobe steps |
| Moonlight | Crater-dimpled charcoal lens | Silver bust on crater lip, gray plus | Eye in lunar crescent | Crossed crater-gray batons | Faceless silver bust in crater crescent |
| Northern Nebula | Ice lens with aurora curve | Ice bust and lavender plus | Navy/ice eye with lavender iris | Crossed ice/lavender rubber batons | Faceless bust on aurora crest |

`scripts/build-theme-online-players-assets.py` only crops transparent margins, resizes, and records checksums; it draws no icons and does not overwrite masters. Production PNGs are 144 px for controls and 256 px for the state illustration. Original full-resolution masters remain under each theme directory.
