"""Import individually generated Treasury tab PNGs, one theme at a time.

The generated originals are kept in the project as evidence. This script only
normalizes their transparent canvas and writes the canonical 768/256 sizes.
"""

import hashlib
import json
from pathlib import Path

from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parents[1]
MAP = ROOT / "docs/theme-asset-implementation-map.json"
ROLES = ("tab-trophies", "tab-skins", "tab-effects", "tab-themes")
DEFINITIONS = json.loads((ROOT / "docs/theme-definitions.json").read_text(encoding="utf-8"))
THEMES = {theme["id"]: theme for theme in DEFINITIONS["themes"] if theme["id"] != "dark"}


def readable_text(hex_background, hex_preferred):
    def luminance(value):
        channels = [int(value[index:index + 2], 16) / 255 for index in (1, 3, 5)]
        linear = [channel / 12.92 if channel <= 0.04045 else ((channel + 0.055) / 1.055) ** 2.4
                  for channel in channels]
        return sum(channel * weight for channel, weight in zip(linear, (0.2126, 0.7152, 0.0722)))

    background = luminance(hex_background)
    preferred = luminance(hex_preferred)
    contrast = (max(background, preferred) + 0.05) / (min(background, preferred) + 0.05)
    return hex_preferred if contrast >= 4.5 else ("#FFF8EA" if background < 0.35 else "#392817")


def normalize(image):
    image = image.convert("RGBA")
    alpha = image.getchannel("A")
    bounds = alpha.point(lambda value: 255 if value >= 48 else 0).getbbox()
    if not bounds:
        raise ValueError("Generated image has no visible alpha")
    image = image.crop(bounds)
    side = max(image.size)
    canvas = Image.new("RGBA", (side, side))
    canvas.alpha_composite(image, ((side - image.width) // 2, (side - image.height) // 2))
    canvas = canvas.resize((664, 664), Image.Resampling.LANCZOS)
    master = Image.new("RGBA", (768, 768))
    master.alpha_composite(canvas, (52, 52))
    master.putalpha(master.getchannel("A").point(lambda opacity: 0 if opacity < 24 else opacity))
    return master


def import_theme(theme_id, mapping):
    source_dir = ROOT / f"source-assets/theme-icon-packs/{theme_id}/treasury-tabs-v3"
    master_dir = ROOT / f"source-assets/theme-icon-packs/{theme_id}/treasury-controls-v1"
    runtime_dir = ROOT / f"www/assets/theme-packs/{theme_id}/canonical/treasury-controls"
    manifest_path = master_dir / "manifest.json"
    review_path = ROOT / f"docs/theme-treasury-tabs-{theme_id}-v3-review.png"
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    theme_record = next(theme for theme in mapping["themes"] if theme["themeId"] == theme_id)
    for role in ROLES:
        source = source_dir / f"{role}-generated.png"
        master_path = master_dir / f"{role}-master-v3.png"
        runtime_path = runtime_dir / f"{role}-v1.png"
        full = normalize(Image.open(source))
        full.save(master_path, optimize=True)
        full.resize((256, 256), Image.Resampling.LANCZOS).save(runtime_path, optimize=True)
        with Image.open(runtime_path) as production:
            visible = production.getchannel("A").point(lambda value: 255 if value >= 24 else 0).getbbox()
        record = {
            "masterPath": master_path.relative_to(ROOT).as_posix(),
            "productionPath": runtime_path.relative_to(ROOT).as_posix(),
            "opticalBoundsPx": list(visible),
            "sizeBytes": runtime_path.stat().st_size,
            "sha256": hashlib.sha256(runtime_path.read_bytes()).hexdigest(),
            "generatedSourcePath": source.relative_to(ROOT).as_posix(),
        }
        slot = f"canonical/treasury-controls/{role}-v1"
        manifest["slots"][slot] = record
        theme_record["slots"][slot].update({key: record[key] for key in
                                           ("masterPath", "productionPath", "opticalBoundsPx", "sizeBytes")})
    manifest["dnaRevision"] = 3
    manifest["tabGenerationMethod"] = "four separate transparent PNG illustrations; one prompt per tab"
    manifest["tabGeneratedSources"] = {
        role: (source_dir / f"{role}-generated.png").relative_to(ROOT).as_posix()
        for role in ROLES
    }
    manifest["sameThemeArtSources"] = {
        role: path for role, path in manifest.get("sameThemeArtSources", {}).items()
        if role not in ROLES
    }
    manifest_path.write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

    colors = THEMES[theme_id]["paletteHex"]
    label_color = readable_text(colors["background"], colors["text"])
    background = Image.new("RGB", (840, 244), colors["background"])
    draw = ImageDraw.Draw(background)
    for index, role in enumerate(ROLES):
        with Image.open(runtime_dir / f"{role}-v1.png") as icon:
            large = icon.resize((112, 112), Image.Resampling.LANCZOS)
            actual = icon.resize((34, 34), Image.Resampling.LANCZOS)
        x = index * 210
        background.paste(large, (x + 25, 16), large)
        background.paste(actual, (x + 157, 81), actual)
        draw.text((x + 12, 162), role, fill=label_color)
        draw.text((x + 12, 184), "112 px / 34 px", fill=label_color)
    background.save(review_path, optimize=True)
    print(theme_id, "four tab PNGs; review:", review_path)


def main():
    import sys
    requested = sys.argv[1:] or [theme_id for theme_id in THEMES
                                 if all((ROOT / f"source-assets/theme-icon-packs/{theme_id}/treasury-tabs-v3/{role}-generated.png").exists()
                                        for role in ROLES)]
    if not requested:
        raise SystemExit("No complete four-tab theme source found")
    mapping = json.loads(MAP.read_text(encoding="utf-8"))
    for theme_id in requested:
        if theme_id not in THEMES:
            raise ValueError(f"Unknown non-Green theme: {theme_id}")
        import_theme(theme_id, mapping)
    MAP.write_text(json.dumps(mapping, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
