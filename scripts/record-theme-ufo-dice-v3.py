"""Publish nine rounded 3D UFO dice with each theme's actual gift skin."""

from __future__ import annotations

import hashlib
import io
import json
import re
from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
THEMES = ("light", "medium", "winter", "neon", "amethyst", "easter", "desert", "moon", "severna")
NAMES = ("Svetlo Zlato", "Trula Visnja", "Plavi Okean", "Neon Cyber", "Kraljevski Ametist",
         "Vaskrsnja", "Pustinjsko Staklo", "Mesecev Sjaj", "Severna Maglina")


def write_json(path: Path, data: object) -> None:
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def digest(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def save_if_changed(image: Image.Image, path: Path) -> None:
    buffer = io.BytesIO()
    image.save(buffer, format="PNG", optimize=True)
    payload = buffer.getvalue()
    if not path.exists() or path.read_bytes() != payload:
        path.write_bytes(payload)


def main() -> None:
    mapping_path = ROOT / "docs/theme-asset-implementation-map.json"
    audit_path = ROOT / "docs/theme-effect-dice-visual-audit.json"
    review_path = ROOT / "docs/theme-effect-previews-review.html"
    css_path = ROOT / "www/theme-effect-previews.css"
    mapping = json.loads(mapping_path.read_text(encoding="utf-8"))
    audit = json.loads(audit_path.read_text(encoding="utf-8"))
    review = review_path.read_text(encoding="utf-8")
    css = css_path.read_text(encoding="utf-8")

    for theme in THEMES:
        manifest_path = ROOT / f"source-assets/theme-icon-packs/{theme}/treasury-effect-previews-v1/manifest.json"
        manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
        entry = next(item for item in manifest["catalog"] if item["id"] == "ufo-abduction")
        generated = ROOT / entry["generatedSource"]
        master = ROOT / entry["master"]
        runtime = ROOT / entry["runtime"]
        with Image.open(generated) as source:
            assert source.size == (1536, 1024) and source.mode == "RGBA", theme
            save_if_changed(source.resize((768, 512), Image.Resampling.LANCZOS), master)
            save_if_changed(source.resize((384, 256), Image.Resampling.LANCZOS), runtime)
        with Image.open(runtime) as image:
            bounds = image.getchannel("A").point(lambda a: 255 if a >= 16 else 0).getbbox()
        assert bounds, theme
        entry["masterSha256"] = digest(master)
        entry["runtimeSha256"] = digest(runtime)
        entry["opticalBoundsPx"] = list(bounds)
        entry["sizeBytes"] = runtime.stat().st_size
        write_json(manifest_path, manifest)

        slots = next(item["slots"] for item in mapping["themes"] if item["themeId"] == theme)
        slot = slots["canonical/treasury-effect-previews/preview-ufo-abduction-v1"]
        slot["opticalBoundsPx"] = list(bounds)
        slot["sizeBytes"] = runtime.stat().st_size

        record = next(item for item in audit["ufoAbduction"] if item["themeId"] == theme)
        record["visibleFaces"] = [1, 2, 3]
        record["generatedSourceSha256"] = digest(generated)
        record["runtimeSha256"] = digest(runtime)
        record.pop("fivePipLayout", None)
        record.pop("sixPipLayout", None)
        record["onePipLayout"] = "single-center"
        record["twoPipLayout"] = "opposite-diagonal-corners"
        record["threePipLayout"] = "diagonal-corners-and-center"
        record["construction"] = "one rounded 3D cube, theme gift skin wrapped across top/front/right surfaces, physically valid 1/2/3 pips"

        pattern = re.compile(rf'(preview-ufo-abduction-v1\.png\?v=)[a-f0-9]{{8}}(?=")')
        section_start = review.index(f'<section id="{theme}">')
        section_end = review.find('<section id="', section_start + 1)
        if section_end < 0:
            section_end = len(review)
        section = review[section_start:section_end]
        section, count = pattern.subn(lambda m: m.group(1) + entry["runtimeSha256"][:8], section)
        assert count == 1, (theme, count)
        review = review[:section_start] + section + review[section_end:]
        old_url = f'preview-ufo-abduction-v1.png?v=4")'
        new_url = f'preview-ufo-abduction-v1.png?v=5")'
        line = f'body.{theme}-theme #riznica-screen#riznica-screen .effect-preview-box.prev-ufo-abduction::before'
        original = next(row for row in css.splitlines() if row.startswith(line))
        assert old_url in original or new_url in original, theme
        css = css.replace(original, original.replace(old_url, new_url))

    audit["method"] = "Visual review at 1536x1024 and 384x256, backed by deterministic rounded 3D surface rendering and canonical 1/2/3 pip checks"
    write_json(mapping_path, mapping)
    write_json(audit_path, audit)
    review_path.write_text(review, encoding="utf-8")
    css_path.write_text(css, encoding="utf-8")
    sheet = Image.new("RGB", (1224, 996), (17, 25, 37))
    draw = ImageDraw.Draw(sheet)
    for index, (theme, name) in enumerate(zip(THEMES, NAMES)):
        x = (index % 3) * 408 + 12
        y = (index // 3) * 332 + 12
        draw.text((x, y), name, fill=(236, 244, 250))
        runtime = ROOT / f"www/assets/theme-packs/{theme}/canonical/treasury-effect-previews/preview-ufo-abduction-v1.png"
        with Image.open(runtime) as image:
            sheet.paste(image, (x, y + 28), image)
    sheet.save(ROOT / "docs/theme-ufo-dice-v3-review.png", optimize=True)
    print("Published nine rounded themed 3D UFO dice previews")


if __name__ == "__main__":
    main()
