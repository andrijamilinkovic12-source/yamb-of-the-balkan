"""Resize the forty independently generated record pictograms for Solo results."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "source-assets/theme-solo-record-icons-v1"
THEMES = ("dark", "light", "medium", "winter", "neon", "amethyst", "easter", "desert", "moon", "severna")
ROLES = ("weekly", "monthly", "all_time", "personal")
SIZE = 160


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main() -> None:
    definitions = json.loads((ROOT / "docs/theme-definitions.json").read_text(encoding="utf-8"))
    directions = {theme["id"]: theme["direction"] for theme in definitions["themes"]}
    entries = []
    for theme in THEMES:
        for role in ROLES:
            master = SOURCE / "masters" / f"{theme}-{role}-master.png"
            if not master.is_file():
                raise FileNotFoundError(master)
            asset_root = "green-soft-clay" if theme == "dark" else f"theme-packs/{theme}"
            runtime = ROOT / "www/assets" / asset_root / "canonical/solo-record-icons" / f"{role}-v1.png"
            runtime.parent.mkdir(parents=True, exist_ok=True)
            with Image.open(master) as original:
                original = original.convert("RGBA")
                alpha = original.getchannel("A").point(lambda value: 255 if value > 7 else 0)
                bounds = alpha.getbbox()
                if not bounds:
                    raise ValueError(f"{theme}/{role}: transparent master")
                image = original.crop(bounds)
                image.thumbnail((136, 136), Image.Resampling.LANCZOS)
                canvas = Image.new("RGBA", (SIZE, SIZE))
                canvas.alpha_composite(image, ((SIZE - image.width) // 2, (SIZE - image.height) // 2))
                canvas.save(runtime, "PNG", optimize=True)
            entries.append({
                "theme": theme,
                "role": role,
                "direction": directions[theme],
                "master": master.relative_to(ROOT).as_posix(),
                "runtime": runtime.relative_to(ROOT).as_posix(),
                "masterSha256": sha256(master),
                "runtimeSha256": sha256(runtime),
                "runtimeBytes": runtime.stat().st_size,
            })
    manifest = {
        "family": "solo-record-icons",
        "version": 1,
        "style": "3D Soft Neomorphism",
        "roles": list(ROLES),
        "runtimeSize": [SIZE, SIZE],
        "masterOrigin": "Forty separate built-in imagegen calls; no master recoloring or copied cross-theme icon",
        "promptSet": "source-assets/theme-solo-record-icons-v1/PROMPTS.md",
        "assets": entries,
    }
    (SOURCE / "manifest.json").write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"Built {len(entries)} Solo record PNGs, {sum(entry['runtimeBytes'] for entry in entries) // 1024} KiB total")


if __name__ == "__main__":
    main()
