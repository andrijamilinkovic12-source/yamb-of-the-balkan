"""Prepare ten independently generated 3D close icons for the theme packs.

The input in each theme's room-close-v2-imagegen folder was generated with
that same theme's trophy PNG as a material/style reference. This script only
cleans transparency and normalizes the canvas; it does not draw or recolor a
shared icon geometry.
"""

from __future__ import annotations

import hashlib
import json
from collections import deque
from pathlib import Path

import numpy as np
from PIL import Image, ImageChops, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
DEFINITIONS = json.loads((ROOT / "docs/theme-definitions.json").read_text(encoding="utf-8"))
IDS = ("dark", "light", "medium", "winter", "neon", "amethyst", "easter", "desert", "moon", "severna")
CANVAS = 768
PRODUCTION = 256


def largest_component(alpha: Image.Image) -> Image.Image:
    """Mask stray transparent-background fragments, preserving the main icon."""
    sample_size = 384
    small = alpha.resize((sample_size, sample_size), Image.Resampling.LANCZOS)
    binary = np.asarray(small) >= 48
    visited = np.zeros(binary.shape, dtype=np.uint8)
    largest = []
    height, width = binary.shape
    for y, x in np.argwhere(binary):
        y, x = int(y), int(x)
        if visited[y, x]:
            continue
        group = []
        queue = deque([(y, x)])
        visited[y, x] = 1
        while queue:
            row, column = queue.popleft()
            group.append((row, column))
            for nr, nc in ((row - 1, column), (row + 1, column),
                           (row, column - 1), (row, column + 1)):
                if 0 <= nr < height and 0 <= nc < width and binary[nr, nc] and not visited[nr, nc]:
                    visited[nr, nc] = 1
                    queue.append((nr, nc))
        if len(group) > len(largest):
            largest = group
    if len(largest) < 1000:
        raise ValueError("No connected main icon found")
    component = np.zeros(binary.shape, dtype=np.uint8)
    for row, column in largest:
        component[row, column] = 255
    mask = Image.fromarray(component, "L").resize(alpha.size, Image.Resampling.NEAREST)
    mask = mask.filter(ImageFilter.MaxFilter(11)).filter(ImageFilter.GaussianBlur(1.2))
    return mask


def clean_and_fit(source: Image.Image) -> Image.Image:
    source = source.convert("RGBA")
    alpha = source.getchannel("A")
    cleaned_alpha = ImageChops.multiply(alpha, largest_component(alpha))
    cleaned_alpha = cleaned_alpha.point(lambda value: 0 if value < 12 else value)
    source.putalpha(cleaned_alpha)
    bounds = cleaned_alpha.point(lambda value: 255 if value >= 24 else 0).getbbox()
    if not bounds:
        raise ValueError("Image became empty after alpha cleanup")
    # A small crop pad retains the genuine soft shadow at the silhouette edge.
    pad = 8
    box = (max(0, bounds[0] - pad), max(0, bounds[1] - pad),
           min(source.width, bounds[2] + pad), min(source.height, bounds[3] + pad))
    cropped = source.crop(box)
    scale = min(680 / cropped.width, 680 / cropped.height)
    width, height = round(cropped.width * scale), round(cropped.height * scale)
    resized = cropped.resize((width, height), Image.Resampling.LANCZOS)
    output = Image.new("RGBA", (CANVAS, CANVAS))
    output.alpha_composite(resized, ((CANVAS - width) // 2, (CANVAS - height) // 2))
    return output


def main():
    themes = {theme["id"]: theme for theme in DEFINITIONS["themes"]}
    if set(themes) != set(IDS):
        raise ValueError("The ten design themes differ from the source inventory")
    review = Image.new("RGB", (1500, 650), "#17212B")
    draw = ImageDraw.Draw(review)
    hashes = set()
    for index, theme_id in enumerate(IDS):
        theme = themes[theme_id]
        source_dir = ROOT / "source-assets/theme-icon-packs" / theme_id / "room-close-v2-imagegen"
        generated = source_dir / "close-generated.png"
        if not generated.is_file():
            raise FileNotFoundError(generated)
        with Image.open(generated) as input_image:
            master_image = clean_and_fit(input_image)
        master = source_dir / "close-master-v2.png"
        master_image.save(master, optimize=True)
        image = master_image.resize((PRODUCTION, PRODUCTION), Image.Resampling.LANCZOS)
        root = "green-soft-clay" if theme_id == "dark" else f"theme-packs/{theme_id}"
        production = ROOT / "www/assets" / root / "canonical/room-controls/close-v1.png"
        production.parent.mkdir(parents=True, exist_ok=True)
        image.save(production, optimize=True)
        rgba = Image.open(production)
        if rgba.size != (256, 256) or rgba.mode != "RGBA":
            raise ValueError(f"Invalid production format for {theme_id}")
        optical = rgba.getchannel("A").point(lambda value: 255 if value >= 16 else 0).getbbox()
        if not optical or not (0 < optical[0] < optical[2] < 256 and 0 < optical[1] < optical[3] < 256):
            raise ValueError(f"Clipped production icon for {theme_id}: {optical}")
        digest = hashlib.sha256(production.read_bytes()).hexdigest()
        if digest in hashes:
            raise ValueError(f"Repeated visual source for {theme_id}")
        hashes.add(digest)
        prior_manifest = source_dir.parent / "room-close-v1/manifest.json"
        prior = json.loads(prior_manifest.read_text(encoding="utf-8")) if prior_manifest.exists() else {}
        reference_root = "green-soft-clay" if theme_id == "dark" else f"theme-packs/{theme_id}"
        reference = f"www/assets/{reference_root}/canonical/treasury-controls/tab-trophies-v1.png"
        manifest = {
            "schemaVersion": 3,
            "themeId": theme_id,
            "slotId": "canonical/room-controls/close-v1",
            "designConcept": prior.get("designConcept", "Theme-specific tactile 3D close control"),
            "creationMethod": "individual built-in image_gen render using same-theme material reference",
            "materialReference": reference,
            "generatedSource": generated.relative_to(ROOT).as_posix(),
            "masterPath": master.relative_to(ROOT).as_posix(),
            "productionPath": production.relative_to(ROOT).as_posix(),
            "opticalBoundsPx": list(optical),
            "sha256": digest,
            "sizeBytes": production.stat().st_size,
        }
        prior_manifest.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        x, y = (index % 5) * 300, (index // 5) * 325
        background = "#31523A" if theme_id == "dark" else theme["paletteHex"]["surface"]
        draw.rounded_rectangle((x + 12, y + 12, x + 288, y + 313), radius=24, fill=background)
        preview = image.resize((208, 208), Image.Resampling.LANCZOS)
        review.paste(preview, (x + 46, y + 45), preview)
        small = image.resize((44, 44), Image.Resampling.LANCZOS)
        review.paste(small, (x + 128, y + 258), small)
        label = "#F3F5F6" if theme_id in ("dark", "medium", "neon", "amethyst", "moon", "severna") else "#25282C"
        draw.text((x + 28, y + 21), theme["nameSr"], fill=label)
        print(f"{theme_id}: {optical}, {production.stat().st_size} B")
    review.save(ROOT / "docs/theme-room-close-review.png", optimize=True)


if __name__ == "__main__":
    main()
