from pathlib import Path

import numpy as np
from PIL import Image

here = Path(__file__).resolve().parent
out = here.parents[1] / "www/assets/effects/dragon-projection-v2"
out.mkdir(parents=True, exist_ok=True)
face = Image.open(here / "face-master.png").convert("RGBA").resize((384, 384), Image.Resampling.LANCZOS)
face.save(out / "visage.webp", quality=88, method=6)

sheet = Image.open(here / "plume-master.png").convert("RGBA")
w, h = sheet.size
tile = 320
atlas = Image.new("RGBA", (2 * tile, 2 * tile))
y, x = np.indices((tile, tile))
feather = np.clip(np.minimum.reduce([x, y, tile - 1 - x, tile - 1 - y]) / 24, 0, 1)
for i in range(4):
    col, row = i % 2, i // 2
    bounds = (col * w // 2, row * h // 2, (col + 1) * w // 2, (row + 1) * h // 2)
    pixels = np.array(sheet.crop(bounds).resize((tile, tile), Image.Resampling.LANCZOS))
    pixels[:, :, 3] = np.rint(pixels[:, :, 3] * feather * feather * (3 - 2 * feather)).astype("uint8")
    atlas.paste(Image.fromarray(pixels), (tile * col, tile * row))
atlas.save(out / "plume.webp", quality=87, method=6)
for name in ("visage.webp", "plume.webp"):
    print(name, (out / name).stat().st_size)
