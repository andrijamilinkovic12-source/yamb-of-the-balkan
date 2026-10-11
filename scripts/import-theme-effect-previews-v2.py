"""Import individually generated Treasury effect previews in all nine themes."""

import hashlib
import json
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
THEMES = ("light", "medium", "winter", "neon", "amethyst", "easter", "desert", "moon", "severna")
ROLES = ("confetti", "gold-rain", "wedding", "thunder", "fireworks", "bubbles",
         "cosmic-dust", "dragon-fire", "royal-yamb", "fireflies", "ice-age",
         "black-hole", "supernova", "neon-pulse", "drones", "ufo-abduction")
MAP_PATH = ROOT / "docs/theme-asset-implementation-map.json"


def relative(path):
    return path.relative_to(ROOT).as_posix()


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def normalize(source):
    image = source.convert("RGBA")
    alpha = image.getchannel("A")
    bounds = alpha.point(lambda value: 255 if value >= 40 else 0).getbbox()
    if not bounds:
        raise ValueError("ImageGen source has no visible alpha")
    image = image.crop(bounds)
    scale = min(690 / image.width, 450 / image.height)
    visible = image.resize((round(image.width * scale), round(image.height * scale)), Image.Resampling.LANCZOS)
    master = Image.new("RGBA", (768, 512))
    master.alpha_composite(visible, ((768 - visible.width) // 2, (512 - visible.height) // 2))
    master.putalpha(master.getchannel("A").point(lambda value: 0 if value < 18 else value))
    return master


def import_theme(theme_id, mapping):
    source_dir = ROOT / f"source-assets/theme-icon-packs/{theme_id}/treasury-effect-previews-v2"
    master_dir = ROOT / f"source-assets/theme-icon-packs/{theme_id}/treasury-effect-previews-v1"
    runtime_dir = ROOT / f"www/assets/theme-packs/{theme_id}/canonical/treasury-effect-previews"
    manifest_path = master_dir / "manifest.json"
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    theme_map = next(theme for theme in mapping["themes"] if theme["themeId"] == theme_id)
    catalog = []
    for role in ROLES:
        source_path = source_dir / f"preview-{role}-generated.png"
        master_path = master_dir / f"preview-{role}-master-v2.png"
        runtime_path = runtime_dir / f"preview-{role}-v1.png"
        with Image.open(source_path) as source:
            master = normalize(source)
        master.save(master_path, optimize=True)
        staging_path = runtime_path.with_name(runtime_path.stem + "-staging.png")
        master.resize((384, 256), Image.Resampling.LANCZOS).save(staging_path, optimize=True)
        staging_path.replace(runtime_path)
        with Image.open(runtime_path) as image:
            bounds = image.getchannel("A").point(lambda value: 255 if value >= 16 else 0).getbbox()
        entry = {
            "id": role,
            "generatedSource": relative(source_path),
            "master": relative(master_path),
            "masterSha256": digest(master_path),
            "runtime": relative(runtime_path),
            "runtimeSha256": digest(runtime_path),
            "opticalBoundsPx": list(bounds),
            "sizeBytes": runtime_path.stat().st_size,
        }
        catalog.append(entry)
        slot = f"canonical/treasury-effect-previews/preview-{role}-v1"
        theme_map["slots"][slot] = {
            "stage": "linked",
            "productionPath": entry["runtime"],
            "masterPath": entry["master"],
            "consumerRefs": ["www/managers.js:Treasury effect card", "www/theme-effect-previews.css:themed preview"],
            "opticalBoundsPx": entry["opticalBoundsPx"],
            "sizeBytes": entry["sizeBytes"],
        }
    manifest.update({
        "version": 2,
        "masterSize": [768, 512],
        "runtimeSize": [384, 256],
        "generationMethod": "one theme-specific transparent PNG per effect; UFO backgrounds are illustrated separately and their 3D dice are composited from controlled face geometry and theme gift skins",
        "catalog": catalog,
    })
    manifest_path.write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"{theme_id}: {len(catalog)} separate PNG effect previews imported", flush=True)


def main():
    import sys
    requested = sys.argv[1:] or THEMES
    mapping = json.loads(MAP_PATH.read_text(encoding="utf-8"))
    for theme_id in requested:
        if theme_id not in THEMES:
            raise ValueError(f"Unknown theme: {theme_id}")
        for role in ROLES:
            source = ROOT / f"source-assets/theme-icon-packs/{theme_id}/treasury-effect-previews-v2/preview-{role}-generated.png"
            if not source.is_file():
                raise FileNotFoundError(source)
        import_theme(theme_id, mapping)
        # Keep the map in sync even if a later theme hits a transient file lock.
        MAP_PATH.write_text(json.dumps(mapping, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
