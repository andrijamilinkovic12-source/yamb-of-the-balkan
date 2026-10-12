"""Deliver one empty/loading and one send PNG for each non-Green Global Chat room."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "source-assets/theme-icon-packs"
THEMES = ("light", "medium", "winter", "neon", "amethyst", "easter", "desert", "moon", "severna")
ROLES = {"empty": "empty-state-v1.png", "send": "send-v1.png"}
SIZE = 384
CONTENT = 344


def digest(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def deliver(source: Path, target: Path) -> tuple[list[int], int]:
    image = Image.open(source).convert("RGBA")
    alpha = image.getchannel("A")
    bounds = alpha.point(lambda value: 255 if value >= 4 else 0).getbbox()
    if not bounds:
        raise ValueError(f"Empty PNG master: {source}")
    image = image.crop(bounds)
    image.thumbnail((CONTENT, CONTENT), Image.Resampling.LANCZOS)
    canvas = Image.new("RGBA", (SIZE, SIZE))
    canvas.alpha_composite(image, ((SIZE - image.width) // 2, (SIZE - image.height) // 2))
    if canvas.getpixel((0, 0))[3] or canvas.getpixel((SIZE - 1, SIZE - 1))[3]:
        raise ValueError(f"Expected transparent corners: {source}")
    target.parent.mkdir(parents=True, exist_ok=True)
    canvas.save(target, optimize=True)
    return list(bounds), target.stat().st_size


definitions = json.loads((ROOT / "docs/theme-definitions.json").read_text(encoding="utf-8"))
by_id = {theme["id"]: theme for theme in definitions["themes"]}
for theme_id in THEMES:
    theme = by_id[theme_id]
    master_root = SOURCE / theme_id / "global-chat-internal-v1"
    runtime_root = ROOT / "www/assets/theme-packs" / theme_id / "canonical/global-chat-internal"
    assets = []
    for role, filename in ROLES.items():
        master = master_root / f"{role}-master-v1.png"
        runtime = runtime_root / filename
        bounds, size_bytes = deliver(master, runtime)
        assets.append({
            "role": role,
            "illustrationStatus": "new-original-for-this-theme",
            "catalogSlot": f"global-chat-{role}-v1",
            "master": str(master.relative_to(ROOT)).replace("\\", "/"),
            "masterSha256": digest(master),
            "masterOpticalBoundsPx": bounds,
            "runtime": str(runtime.relative_to(ROOT)).replace("\\", "/"),
            "runtimeSha256": digest(runtime),
            "runtimeSizePx": [SIZE, SIZE],
            "runtimeBytes": size_bytes,
            "format": "RGBA PNG",
        })
    manifest = {
        "themeId": theme_id,
        "style": definitions["sharedStyle"],
        "direction": theme["direction"],
        "status": "canonical",
        "roles": assets,
        "displayCssPx": {"empty": 76, "send": 32},
        "note": "Empty/loading and send are separate from the canonical room identity; no cross-theme reuse.",
    }
    (master_root / "manifest.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
print(f"Built {len(THEMES) * len(ROLES)} Global Chat PNGs for {len(THEMES)} themes")
