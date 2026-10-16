"""Build the nine themed Solo result PNG families from their separate masters."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "source-assets" / "theme-packs"
RUNTIME = ROOT / "www" / "assets" / "theme-packs"
THEMES = ("light", "medium", "winter", "neon", "amethyst", "easter", "desert", "moon", "severna")
ROLES = ("personal-best", "finish-score-mark", "finish-claim")


def digest(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def build() -> None:
    definition = json.loads((ROOT / "docs" / "theme-definitions.json").read_text(encoding="utf-8"))
    theme_meta = {item["id"]: item for item in definition["themes"]}
    manifest = {"family": "solo-results", "version": 1, "masterSize": [512, 512], "runtimeSize": [256, 256], "assets": []}
    for theme in THEMES:
        for role in ROLES:
            master = SOURCE / theme / "solo-results" / f"{role}-master-v1.png"
            runtime = RUNTIME / theme / "canonical" / "solo-results" / f"{role}-v1.png"
            if not master.is_file():
                raise FileNotFoundError(master)
            with Image.open(master) as opened:
                original = opened.convert("RGBA")
                if original.width != original.height:
                    raise ValueError(f"Solo asset must be square: {master}")
                if original.getchannel("A").getextrema() != (0, 255):
                    raise ValueError(f"Solo asset needs a true transparent cutout: {master}")
                # Normalize optical bounds so all nine themes read at the same CSS size.
                visible = original.getchannel("A").point(lambda value: 255 if value > 12 else 0).getbbox()
                if not visible:
                    raise ValueError(f"Solo asset is empty: {master}")
                cutout = original.crop(visible)
                cutout.thumbnail((456, 456), Image.Resampling.LANCZOS)
                canonical_master = Image.new("RGBA", (512, 512), (0, 0, 0, 0))
                canonical_master.alpha_composite(cutout, ((512 - cutout.width) // 2, (512 - cutout.height) // 2))
                canonical_master.save(master, format="PNG", optimize=True)
                runtime.parent.mkdir(parents=True, exist_ok=True)
                canonical_master.resize((256, 256), Image.Resampling.LANCZOS).save(runtime, format="PNG", optimize=True)
            manifest["assets"].append({
                "theme": theme,
                "role": role,
                "style": theme_meta[theme]["style"],
                "direction": theme_meta[theme]["direction"],
                "palette": theme_meta[theme]["iconDna"]["colorsHex"],
                "master": str(master.relative_to(ROOT)).replace("\\", "/"),
                "runtime": str(runtime.relative_to(ROOT)).replace("\\", "/"),
                "masterSha256": digest(master),
                "runtimeSha256": digest(runtime),
            })
    target = ROOT / "source-assets" / "theme-solo-results-v1" / "manifest.json"
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Built {len(manifest['assets'])} separate Solo result PNGs; manifest: {target}")


if __name__ == "__main__":
    build()
