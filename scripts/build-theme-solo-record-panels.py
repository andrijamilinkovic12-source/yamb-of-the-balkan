"""Build compact runtime PNGs from the ten separately generated Solo panel masters."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "source-assets/theme-solo-record-panels-v1"
THEMES = ("dark", "light", "medium", "winter", "neon", "amethyst", "easter", "desert", "moon", "severna")
CANVAS = (768, 320)
CELL_INK = {
    "dark": "#1e3523", "light": "#392817", "medium": "#2a0e16", "winter": "#0b2a3d",
    "neon": "#f4faff", "amethyst": "#0e0814", "easter": "#27351f", "desert": "#3b251b",
    "moon": "#08090c", "severna": "#f5fbff",
}
ACCENT = {
    "dark": "#3b7650", "light": "#875024", "medium": "#e39a70", "winter": "#b7e7f3",
    "neon": "#56e5d2", "amethyst": "#f2c879", "easter": "#4d6b45", "desert": "#396b72",
    "moon": "#e1e2e7", "severna": "#8ae3e4",
}


def digest(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def luminance(rgb: tuple[int, int, int]) -> float:
    channels = [value / 255 for value in rgb]
    linear = [value / 12.92 if value <= 0.04045 else ((value + 0.055) / 1.055) ** 2.4 for value in channels]
    return sum(value * weight for value, weight in zip(linear, (0.2126, 0.7152, 0.0722)))


def contrast(first: tuple[int, int, int], second: tuple[int, int, int]) -> float:
    left, right = luminance(first), luminance(second)
    return (max(left, right) + 0.05) / (min(left, right) + 0.05)


def main() -> None:
    definitions = json.loads((ROOT / "docs/theme-definitions.json").read_text(encoding="utf-8"))
    directions = {theme["id"]: theme["direction"] for theme in definitions["themes"]}
    assets = []
    for theme in THEMES:
        master = SOURCE / "masters" / f"{theme}-master.png"
        if not master.is_file():
            raise FileNotFoundError(master)
        root = "green-soft-clay" if theme == "dark" else f"theme-packs/{theme}"
        runtime = ROOT / "www/assets" / root / "canonical/solo-results/record-panel-v1.png"
        runtime.parent.mkdir(parents=True, exist_ok=True)
        with Image.open(master) as image:
            image = image.convert("RGBA")
            alpha = image.getchannel("A").point(lambda value: 255 if value > 8 else 0)
            bounds = alpha.getbbox()
            if not bounds:
                raise ValueError(f"{theme}: generated PNG is fully transparent")
            cropped = image.crop(bounds)
            cropped.thumbnail((748, 300), Image.Resampling.LANCZOS)
            canvas = Image.new("RGBA", CANVAS)
            canvas.alpha_composite(cropped, ((CANVAS[0] - cropped.width) // 2, (CANVAS[1] - cropped.height) // 2))
            ink = tuple(bytes.fromhex(CELL_INK[theme][1:]))
            accent = tuple(bytes.fromhex(ACCENT[theme][1:]))
            samples = []
            for x in (200, 550):
                for y in (125, 210):
                    surface = canvas.getpixel((x, y))[:3]
                    samples.append(contrast(ink, surface))
                    active = tuple(round(base * 0.87 + highlight * 0.13) for base, highlight in zip(surface, accent))
                    samples.append(contrast(ink, active))
            minimum = min(samples)
            if minimum < 4.5:
                raise ValueError(f"{theme}: cell text contrast only {minimum:.2f}:1")
            canvas.save(runtime, format="PNG", optimize=True)
        assets.append({
            "theme": theme,
            "direction": directions[theme],
            "master": master.relative_to(ROOT).as_posix(),
            "runtime": runtime.relative_to(ROOT).as_posix(),
            "masterSha256": digest(master),
            "runtimeSha256": digest(runtime),
            "runtimeBytes": runtime.stat().st_size,
            "cellInk": CELL_INK[theme],
            "minimumCellContrast": round(minimum, 2),
        })
    manifest = {
        "family": "solo-record-panels",
        "version": 1,
        "style": "3D Soft Neomorphism",
        "masterOrigin": "Ten distinct built-in imagegen calls; no recoloring or copied cross-theme panel",
        "runtimeSize": list(CANVAS),
        "textAndState": "PNG is material only; localized labels, record status, Power Index and confirmation glow remain live UI",
        "promptSet": "source-assets/theme-solo-record-panels-v1/PROMPTS.md",
        "assets": assets,
    }
    (SOURCE / "manifest.json").write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"Built {len(assets)} Solo panel PNGs, {sum(item['runtimeBytes'] for item in assets) // 1024} KiB total")


if __name__ == "__main__":
    main()
