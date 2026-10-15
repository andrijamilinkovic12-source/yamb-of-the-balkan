"""Package individually generated leaderboard medals without changing their artwork."""

import hashlib
import json
import shutil
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "source-assets" / "theme-leaderboard-medals-v2"
STAGING = SOURCE / "staging-paths.json"
THEMES = ("dark", "light", "medium", "winter", "neon", "amethyst", "easter", "desert", "moon", "severna")
TIERS = ("gold", "silver", "bronze")


def sha256(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def relative(path):
    return path.relative_to(ROOT).as_posix()


def main():
    if STAGING.exists():
        rows = json.loads(STAGING.read_text(encoding="utf-8"))["rows"]
        sources = {(row["theme"], row["tier"]): Path(row["generatedSource"]) for row in rows}
        assert len(rows) == len(sources) == len(THEMES) * len(TIERS)
    else:
        sources = {(theme, tier): SOURCE / theme / f"{tier}-master-v2.png" for theme in THEMES for tier in TIERS}
    manifest = {"schemaVersion": 2, "generatedOn": "2026-10-15", "mode": "individual image generation and reference editing; technical downsample only", "size": [256, 256], "themes": []}
    for theme in THEMES:
        group = {"id": theme, "assets": []}
        canonical = (ROOT / "www" / "assets" / "green-soft-clay" / "canonical") if theme == "dark" else (ROOT / "www" / "assets" / "theme-packs" / theme / "canonical")
        for tier in TIERS:
            original = sources[(theme, tier)]
            if not original.is_file():
                raise FileNotFoundError(original)
            master = SOURCE / theme / f"{tier}-master-v2.png"
            output = canonical / "competition-medals" / f"general-podium-{tier}-v2.png"
            master.parent.mkdir(parents=True, exist_ok=True)
            output.parent.mkdir(parents=True, exist_ok=True)
            if original != master:
                shutil.copyfile(original, master)
            with Image.open(master) as image:
                if image.mode != "RGBA" or image.getextrema()[3][0] != 0 or image.getextrema()[3][1] != 255:
                    raise ValueError(f"Expected transparent RGBA source: {original}")
                image.resize((256, 256), Image.Resampling.LANCZOS).save(output, format="PNG", optimize=True)
            group["assets"].append({"tier": tier, "master": relative(master), "masterSha256": sha256(master), "production": relative(output), "productionSha256": sha256(output)})
        manifest["themes"].append(group)
    (SOURCE / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    # Two previews show how the artwork reads in the room and in online waiting.
    for size, name in ((44, "room"), (38, "waiting")):
        scale = 3
        cell = 104 * scale
        label_height = 24 * scale
        sheet = Image.new("RGBA", (3 * cell, len(THEMES) * (cell + label_height)), (24, 29, 35, 255))
        from PIL import ImageDraw
        draw = ImageDraw.Draw(sheet)
        for row, theme in enumerate(THEMES):
            y = row * (cell + label_height)
            draw.text((8 * scale, y + 4 * scale), theme, fill=(233, 235, 236, 255))
            for col, tier in enumerate(TIERS):
                path = Path(manifest["themes"][row]["assets"][col]["production"])
                with Image.open(ROOT / path) as medal:
                    preview = medal.resize((size * scale, size * scale), Image.Resampling.LANCZOS)
                    x = col * cell + (cell - size * scale) // 2
                    sheet.alpha_composite(preview, (x, y + label_height + (cell - size * scale) // 2))
                draw.text((col * cell + 8 * scale, y + label_height + cell - 16 * scale), tier, fill=(214, 216, 220, 255))
        sheet.save(ROOT / "docs" / f"theme-leaderboard-medals-v2-{name}-review.png", optimize=True)
    print(f"Packaged {len(sources)} medals in {len(THEMES)} themes")


if __name__ == "__main__":
    main()
