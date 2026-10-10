"""Create contact sheets for all theme medal families at display scale."""

import runpy
from PIL import Image, ImageDraw

module = runpy.run_path(__file__.replace("make-theme-medal-review.py", "build-theme-medals.py"))
ROOT, THEMES, CONTEXTS, TIERS, paths = (module[name] for name in ("ROOT", "THEMES", "CONTEXTS", "TIERS", "paths"))


def main():
    out = ROOT / "docs/theme-medals-review"
    out.mkdir(parents=True, exist_ok=True)
    for theme, (_, background, _, _, _) in THEMES.items():
        sheet = Image.new("RGB", (6 * 210, 3 * 244), background)
        draw = ImageDraw.Draw(sheet)
        for row, tier in enumerate(TIERS):
            for col, context in enumerate(CONTEXTS):
                _, production, _ = paths(theme, context, tier)
                with Image.open(production) as source:
                    large = source.convert("RGBA").resize((150, 150), Image.Resampling.LANCZOS)
                    small = source.convert("RGBA").resize((44, 44), Image.Resampling.LANCZOS)
                x, y = col * 210, row * 244
                sheet.paste(large, (x + 28, y + 7), large)
                sheet.paste(small, (x + 149, y + 130), small)
                draw.text((x + 12, y + 170), context, fill="white")
                draw.text((x + 12, y + 190), tier, fill="white")
        sheet.save(out / f"{theme}-medals-v1.png", optimize=True)
    print(f"Created {len(THEMES)} medal review sheets in {out}")


if __name__ == "__main__":
    main()
