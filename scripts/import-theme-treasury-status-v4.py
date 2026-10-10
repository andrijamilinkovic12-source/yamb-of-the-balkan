"""Import the four individually illustrated Treasury status icons per theme."""

import hashlib
import json
from pathlib import Path

from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parents[1]
MAP = ROOT / "docs/theme-asset-implementation-map.json"
ROLES = ("status-owned", "status-active", "status-locked", "status-insufficient")
THEMES = {theme["id"]: theme for theme in json.loads(
    (ROOT / "docs/theme-definitions.json").read_text(encoding="utf-8"))["themes"]
    if theme["id"] != "dark"}


def normalize(source):
    image = source.convert("RGBA")
    alpha = image.getchannel("A")
    bounds = alpha.point(lambda value: 255 if value >= 48 else 0).getbbox()
    if not bounds:
        raise ValueError("Generated source has no visible alpha")
    image = image.crop(bounds)
    side = max(image.size)
    square = Image.new("RGBA", (side, side))
    square.alpha_composite(image, ((side - image.width) // 2, (side - image.height) // 2))
    inner = square.resize((664, 664), Image.Resampling.LANCZOS)
    master = Image.new("RGBA", (768, 768))
    master.alpha_composite(inner, (52, 52))
    master.putalpha(master.getchannel("A").point(lambda value: 0 if value < 24 else value))
    return master


def import_theme(theme_id, mapping):
    source_dir = ROOT / f"source-assets/theme-icon-packs/{theme_id}/treasury-status-v4"
    master_dir = ROOT / f"source-assets/theme-icon-packs/{theme_id}/treasury-controls-v1"
    runtime_dir = ROOT / f"www/assets/theme-packs/{theme_id}/canonical/treasury-controls"
    manifest_path = master_dir / "manifest.json"
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    theme_map = next(theme for theme in mapping["themes"] if theme["themeId"] == theme_id)
    for role in ROLES:
        source_path = source_dir / f"{role}-generated.png"
        master_path = master_dir / f"{role}-master-v4.png"
        runtime_path = runtime_dir / f"{role}-v1.png"
        with Image.open(source_path) as source:
            master = normalize(source)
        master.save(master_path, optimize=True)
        master.resize((256, 256), Image.Resampling.LANCZOS).save(runtime_path, optimize=True)
        with Image.open(runtime_path) as output:
            bounds = output.getchannel("A").point(lambda value: 255 if value >= 24 else 0).getbbox()
        record = {
            "masterPath": master_path.relative_to(ROOT).as_posix(),
            "productionPath": runtime_path.relative_to(ROOT).as_posix(),
            "opticalBoundsPx": list(bounds),
            "sizeBytes": runtime_path.stat().st_size,
            "sha256": hashlib.sha256(runtime_path.read_bytes()).hexdigest(),
            "generatedSourcePath": source_path.relative_to(ROOT).as_posix(),
        }
        slot = f"canonical/treasury-controls/{role}-v1"
        manifest["slots"][slot] = record
        theme_map["slots"][slot].update({key: record[key] for key in
                                          ("masterPath", "productionPath", "opticalBoundsPx", "sizeBytes")})
    manifest["dnaRevision"] = 4
    manifest["statusGenerationMethod"] = "four separate transparent PNG illustrations; one prompt per status"
    manifest["statusGeneratedSources"] = {
        role: (source_dir / f"{role}-generated.png").relative_to(ROOT).as_posix()
        for role in ROLES
    }
    manifest["sameThemeArtSources"] = {
        role: path for role, path in manifest.get("sameThemeArtSources", {}).items()
        if role not in ROLES
    }
    manifest_path.write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    make_review(theme_id, runtime_dir)
    print(f"{theme_id}: four status PNGs imported", flush=True)


def make_review(theme_id, runtime_dir):
    palette = THEMES[theme_id]["paletteHex"]
    background = Image.new("RGB", (840, 240), palette["background"])
    draw = ImageDraw.Draw(background)
    for index, role in enumerate(ROLES):
        with Image.open(runtime_dir / f"{role}-v1.png") as source:
            source = source.convert("RGBA")
            large = source.resize((112, 112), Image.Resampling.LANCZOS)
            actual_size = 20 if role == "status-locked" else 22
            actual = source.resize((actual_size, actual_size), Image.Resampling.LANCZOS)
        x = index * 210
        background.paste(large, (x + 25, 16), large)
        background.paste(actual, (x + 163, 96), actual)
        draw.text((x + 12, 166), role, fill=palette["text"])
        draw.text((x + 12, 190), f"112 px / {actual_size} px", fill=palette["text"])
    background.save(ROOT / f"docs/theme-treasury-status-{theme_id}-v4-review.png", optimize=True)


def main():
    import sys
    requested = sys.argv[1:] or list(THEMES)
    mapping = json.loads(MAP.read_text(encoding="utf-8"))
    for theme_id in requested:
        if theme_id not in THEMES:
            raise ValueError(f"Unknown non-Green theme: {theme_id}")
        for role in ROLES:
            source = ROOT / f"source-assets/theme-icon-packs/{theme_id}/treasury-status-v4/{role}-generated.png"
            if not source.exists():
                raise FileNotFoundError(source)
        import_theme(theme_id, mapping)
    MAP.write_text(json.dumps(mapping, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
