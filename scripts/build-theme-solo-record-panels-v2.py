"""Render ten restrained, theme-specific Solo record card PNGs."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "source-assets/theme-solo-record-panels-v2"
SIZE = (768, 224)
# Each entry defines its own surface, relief, edge geometry and restrained motif.
# Text, the four record icons and their active states remain live UI elements.
ART = {
    "dark": ("#d2dcc1", "#b9c9a9", "#527456", "#f4f7e8", 34, "left", "#27412c"),
    "light": ("#fff0d9", "#ebcda4", "#986b35", "#fff9ed", 21, "top", "#4d301c"),
    "medium": ("#713f4b", "#4a2533", "#d59888", "#996474", 32, "bottom", "#fff1e8"),
    "winter": ("#286489", "#174969", "#a4d9e8", "#5b9aba", 20, "left", "#fff4e5"),
    "neon": ("#1b3652", "#102238", "#56d6ce", "#377b91", 17, "corner", "#eefefa"),
    "amethyst": ("#674b75", "#3f2b51", "#d7bd99", "#a586b0", 30, "top", "#fff5ef"),
    "easter": ("#f7f4e7", "#e3e9d7", "#789273", "#ffffff", 25, "left", "#31492c"),
    "desert": ("#f5dfc5", "#ddb794", "#47737a", "#fff3df", 28, "bottom", "#553623"),
    "moon": ("#414653", "#292e3a", "#bec3cf", "#696f7d", 19, "right", "#f5f5f8"),
    "severna": ("#31566b", "#19354d", "#87d7d6", "#56869a", 22, "bottom", "#f5fbff"),
}


def rgb(hex_color: str) -> tuple[int, int, int]:
    return tuple(bytes.fromhex(hex_color.removeprefix("#")))


def mix(first: tuple[int, int, int], second: tuple[int, int, int], ratio: float) -> tuple[int, int, int]:
    return tuple(round(a * (1 - ratio) + b * ratio) for a, b in zip(first, second))


def luminance(color: tuple[int, int, int]) -> float:
    channels = [value / 255 for value in color]
    linear = [value / 12.92 if value <= .04045 else ((value + .055) / 1.055) ** 2.4 for value in channels]
    return sum(value * weight for value, weight in zip(linear, (.2126, .7152, .0722)))


def contrast(first: tuple[int, int, int], second: tuple[int, int, int]) -> float:
    a, b = luminance(first), luminance(second)
    return (max(a, b) + .05) / (min(a, b) + .05)


def sha(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def render(theme: str, spec: tuple[str, str, str, str, int, str, str]) -> tuple[Image.Image, float]:
    top, bottom, edge, highlight, radius, detail, ink = spec
    top_rgb, bottom_rgb, edge_rgb, highlight_rgb = map(rgb, (top, bottom, edge, highlight))
    image = Image.new("RGBA", SIZE, (0, 0, 0, 0))
    mask = Image.new("L", SIZE)
    draw_mask = ImageDraw.Draw(mask)
    bounds = (7, 6, SIZE[0] - 8, SIZE[1] - 8)
    draw_mask.rounded_rectangle(bounds, radius=radius, fill=255)
    gradient = Image.new("RGBA", SIZE)
    pixels = gradient.load()
    for y in range(SIZE[1]):
        ratio = min(1, y / (SIZE[1] - 1))
        surface = mix(top_rgb, bottom_rgb, ratio)
        for x in range(SIZE[0]):
            pixels[x, y] = (*surface, 255)
    image.paste(gradient, (0, 0), mask)
    draw = ImageDraw.Draw(image)
    draw.rounded_rectangle(bounds, radius=radius, outline=(*edge_rgb, 235), width=3)
    # A low-relief rim is enough to preserve the soft 3D material without inset wells.
    draw.line((radius + 18, 12, SIZE[0] - radius - 18, 12),
              fill=(*mix(top_rgb, highlight_rgb, .55), 145), width=2)
    bottom_line = mix(bottom_rgb, edge_rgb, .35)
    draw.line((radius + 18, SIZE[1] - 13, SIZE[0] - radius - 18, SIZE[1] - 13),
              fill=(*bottom_line, 155), width=2)
    if detail == "left":
        draw.rounded_rectangle((14, 30, 18, SIZE[1] - 30), radius=2, fill=(*edge_rgb, 165))
    elif detail == "right":
        draw.rounded_rectangle((SIZE[0] - 20, 38, SIZE[0] - 16, SIZE[1] - 38),
                               radius=2, fill=(*edge_rgb, 145))
    elif detail == "top":
        draw.line((radius + 40, 16, SIZE[0] - radius - 40, 16), fill=(*edge_rgb, 140), width=3)
    elif detail == "bottom":
        draw.line((radius + 56, SIZE[1] - 20, SIZE[0] - radius - 56, SIZE[1] - 20),
                  fill=(*edge_rgb, 140), width=3)
    elif detail == "corner":
        draw.line((35, 16, 145, 16), fill=(*edge_rgb, 210), width=3)
        draw.line((SIZE[0] - 145, SIZE[1] - 18, SIZE[0] - 35, SIZE[1] - 18),
                  fill=(*highlight_rgb, 160), width=3)
    minimum = min(contrast(rgb(ink), mix(top_rgb, bottom_rgb, position)) for position in (.15, .5, .85))
    if minimum < 4.5:
        raise ValueError(f"{theme}: panel text contrast {minimum:.2f}:1")
    return image, minimum


def main() -> None:
    definitions = json.loads((ROOT / "docs/theme-definitions.json").read_text(encoding="utf-8"))
    directions = {item["id"]: item["direction"] for item in definitions["themes"]}
    masters = SOURCE / "masters"
    masters.mkdir(parents=True, exist_ok=True)
    assets = []
    for theme, spec in ART.items():
        image, minimum = render(theme, spec)
        master = masters / f"{theme}-master.png"
        image.save(master, format="PNG")
        root = "green-soft-clay" if theme == "dark" else f"theme-packs/{theme}"
        runtime = ROOT / "www/assets" / root / "canonical/solo-results/record-panel-v2.png"
        runtime.parent.mkdir(parents=True, exist_ok=True)
        image.save(runtime, format="PNG", optimize=True)
        assets.append({
            "theme": theme, "direction": directions[theme], "master": master.relative_to(ROOT).as_posix(),
            "runtime": runtime.relative_to(ROOT).as_posix(), "masterSha256": sha(master),
            "runtimeSha256": sha(runtime), "runtimeBytes": runtime.stat().st_size,
            "cellInk": spec[-1], "minimumCellContrast": round(minimum, 2),
            "geometry": {"cornerRadius": spec[4], "edgeDetail": spec[5]}
        })
    manifest = {
        "family": "solo-record-panels", "version": 2, "style": "3D Soft Neomorphism",
        "productionRole": "One restrained card surface per theme; title, record icons and footer are live UI",
        "runtimeSize": list(SIZE), "assets": assets
    }
    (SOURCE / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Built {len(assets)} distinct record panels, minimum contrast {min(a['minimumCellContrast'] for a in assets):.2f}:1")


if __name__ == "__main__":
    main()
