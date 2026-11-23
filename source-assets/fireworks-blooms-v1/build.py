from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter


here = Path(__file__).resolve().parent
master = Image.open(here / "blooms-master.png").convert("RGBA")
tile = 320
atlas = Image.new("RGBA", (tile * 4, tile * 2))
# Crops and ignition pivots were inspected on the source, not assumed to be quadrant centres.
for slot, box in enumerate([(0, 0, 627, 595), (636, 0, 1254, 595),
                            (0, 595, 627, 1254), (627, 595, 1254, 1254)]):
    image = master.crop(box).resize((tile, tile), Image.Resampling.LANCZOS)
    rgba = np.asarray(image).astype(float) / 255
    rgb, a = rgba[:, :, :3], rgba[:, :, 3]
    lum = rgb @ [0.25, 0.58, 0.17]
    local = np.asarray(Image.fromarray((lum * 255).astype("uint8")).filter(ImageFilter.GaussianBlur(2.6))) / 255
    detail = np.clip((lum - local) * 3.3, 0, 1)
    y, x = np.indices(a.shape)
    edge = np.clip(np.minimum.reduce([x, y, tile - 1 - x, tile - 1 - y]) / 11, 0, 1)
    # Tint the optical halo, not the white-hot points. The ring's lilac centre
    # and the copper inner peony need different hues from their outer crowns.
    warm = rgb[:, :, 0] > rgb[:, :, 1] * 1.04
    tint = [np.array([1, 0.21, 0.37]), np.where(warm[:, :, None], [0.75, 0.43, 1], [0.13, 0.94, 1]),
            np.array([1, 0.66, 0.19]), np.where(warm[:, :, None], [1, 0.58, 0.20], [0.19, 1, 0.57])][slot]
    peaks = np.clip((lum - 0.86) * 6, 0, 1)
    for row, emission in enumerate([0.09 + 0.48 * lum**3 + 1.45 * detail, 1.6 * detail + (lum**6) * 0.55]):
        light = np.clip(emission - row * 0.18, 0, 1) * a
        halo = np.asarray(Image.fromarray((light * 255).astype("uint8")).filter(ImageFilter.GaussianBlur(2))) / 255
        alpha = np.clip(light + (0.20 if row else 0.83) * halo, 0, 1) * edge
        mix = ((0.18 if row else 0.06) + peaks * (0.62 if row else 0.39))[:, :, None]
        color = tint * (1 - mix) + np.clip(rgb * 1.15, 0, 1) * mix
        out = np.dstack((color, alpha))
        out[alpha < 0.012] = 0
        atlas.paste(Image.fromarray((out * 255).astype("uint8")), (slot * tile, row * tile))

target = here.parents[1] / "www/assets/effects/fireworks-blooms-v1/blooms.png"
target.parent.mkdir(parents=True, exist_ok=True)
atlas.quantize(colors=256, method=Image.Quantize.FASTOCTREE).save(target, optimize=True)
print(target.name, atlas.size, target.stat().st_size, "bytes")
