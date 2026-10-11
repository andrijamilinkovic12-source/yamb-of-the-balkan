"""Add the two missing Green effect preview roles to the equal-count catalog."""

import hashlib
import json
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
ROLES = (("confetti", "confetti"), ("gold-rain", "gold_rain"))


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def save_json(path, obj):
    path.write_text(json.dumps(obj, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def normalize(source):
    image = source.convert("RGBA")
    bounds = image.getchannel("A").point(lambda a: 255 if a >= 40 else 0).getbbox()
    if not bounds:
        raise ValueError("Empty generated image")
    image = image.crop(bounds)
    scale = min(1380 / image.width, 900 / image.height)
    image = image.resize((round(image.width * scale), round(image.height * scale)), Image.Resampling.LANCZOS)
    master = Image.new("RGBA", (1536, 1024))
    master.alpha_composite(image, ((1536 - image.width) // 2, (1024 - image.height) // 2))
    master.putalpha(master.getchannel("A").point(lambda a: 0 if a < 18 else a))
    return master


def main():
    manifest_path = ROOT / "source-assets/green-soft-clay-canonical/treasury-effect-previews/manifest.json"
    registry_path = ROOT / "www/themes/green/asset-registry.json"
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    registry = json.loads(registry_path.read_text(encoding="utf-8"))
    family = registry["families"]["treasuryEffectPreviews"]
    for role, effect in ROLES:
        source = ROOT / f"source-assets/theme-icon-packs/dark/treasury-effect-previews-v2/preview-{role}-generated.png"
        master = ROOT / f"source-assets/green-soft-clay-canonical/treasury-effect-previews/preview-{role}-master-v2.png"
        runtime = ROOT / f"www/assets/green-soft-clay/canonical/treasury-effect-previews/preview-{role}-v1.png"
        with Image.open(source) as image:
            normalized = normalize(image)
        master.parent.mkdir(parents=True, exist_ok=True)
        runtime.parent.mkdir(parents=True, exist_ok=True)
        normalized.save(master, optimize=True)
        staging = runtime.with_name(runtime.stem + "-staging.png")
        normalized.resize((384, 256), Image.Resampling.LANCZOS).save(staging, optimize=True)
        staging.replace(runtime)
        item = {
            "id": role,
            "effectId": effect,
            "master": master.relative_to(ROOT).as_posix(),
            "masterSha256": sha(master),
            "runtime": runtime.relative_to(ROOT).as_posix(),
            "runtimeSha256": sha(runtime),
        }
        manifest["catalog"] = [x for x in manifest["catalog"] if x["id"] != role] + [item]
        family["canonicalRuntime"] = [x for x in family["canonicalRuntime"] if x["role"] != role] + [{
            "role": role,
            "path": runtime.relative_to(ROOT / "www").as_posix(),
            "width": 384,
            "height": 256,
            "sha256": sha(runtime),
        }]
    manifest["semanticRole"] = "distinct Green-only Treasury preview motifs for sixteen celebration effects"
    family["semanticRole"] = manifest["semanticRole"]
    save_json(manifest_path, manifest)
    save_json(registry_path, registry)
    print("Added two Green PNG previews and locked registry entries")


if __name__ == "__main__":
    main()
