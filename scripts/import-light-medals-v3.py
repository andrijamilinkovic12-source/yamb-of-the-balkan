"""Preview and install individually illustrated Light Gold medal PNGs."""

import argparse
import hashlib
import json
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
MASTERS = ROOT / "source-assets/theme-icon-packs/light/medals-v3-imagegen"
PRODUCTION = ROOT / "www/assets/theme-packs/light/canonical"
REVIEW = ROOT / "docs/theme-medals-light-v3-review.png"
CONTEXTS = {
    "collection": "collection-medals/collection",
    "leaderboard": "competition-medals/general-podium",
    "tournament": "competition-medals/tournament",
    "quarterly-league": "competition-medals/quarterly-league",
    "power-index": "competition-medals/power-index",
    "fire-streak": "competition-medals/fire-streak",
}
TIERS = ("gold", "silver", "bronze")


def normalize(master: Path) -> tuple[Image.Image, list[int]]:
    with Image.open(master) as source:
        source = source.convert("RGBA")
        if source.getpixel((0, 0))[3] != 0:
            raise ValueError(f"Master has an opaque corner: {master}")
        alpha = source.getchannel("A")
        visible = alpha.point(lambda value: 255 if value >= 18 else 0).getbbox()
        if not visible:
            raise ValueError(f"Master has no visible art: {master}")
        subject = source.crop(visible)
        scale = min(212 / subject.width, 212 / subject.height)
        size = (round(subject.width * scale), round(subject.height * scale))
        subject = subject.resize(size, Image.Resampling.LANCZOS)
        canvas = Image.new("RGBA", (256, 256))
        canvas.alpha_composite(subject, ((256 - size[0]) // 2, (256 - size[1]) // 2))
        bounds = canvas.getchannel("A").point(lambda value: 255 if value >= 18 else 0).getbbox()
        return canvas, list(bounds)


def make_review(items: list[tuple[str, str, Image.Image]]) -> None:
    width, row_height = 1200, 260
    sheet = Image.new("RGB", (width, row_height * len(CONTEXTS)), "#F8E9CC")
    draw = ImageDraw.Draw(sheet)
    font = ImageFont.load_default()
    for index, (context, tier, image) in enumerate(items):
        row, col = divmod(index, 3)
        x, y = col * 400, row * row_height
        draw.rounded_rectangle((x + 8, y + 8, x + 392, y + 252), 18,
                               fill="#FFF4E2", outline="#D5B988", width=2)
        large = image.resize((188, 188), Image.Resampling.LANCZOS)
        small = image.resize((44, 44), Image.Resampling.LANCZOS)
        sheet.paste(large, (x + 18, y + 26), large)
        sheet.paste(small, (x + 294, y + 93), small)
        draw.text((x + 202, y + 42), context, font=font, fill="#3B2C1C")
        draw.text((x + 202, y + 60), tier, font=font, fill="#76612B")
        draw.text((x + 286, y + 146), "44 px", font=font, fill="#76612B")
    sheet.save(REVIEW)


def install(items: list[tuple[str, str, Image.Image, list[int], Path]]) -> None:
    map_path = ROOT / "docs/theme-asset-implementation-map.json"
    existing = map_path.read_bytes()
    implementation = json.loads(existing)
    theme = next(item for item in implementation["themes"] if item["themeId"] == "light")
    previous_manifest = json.loads((ROOT / "source-assets/theme-icon-packs/light/medals-v1/manifest.json").read_text(encoding="utf-8"))
    manifest = {"schemaVersion": 1, "themeId": "light", "dnaRevision": 3,
                "productionVersion": 3, "creationMode": "imagegen, one illustrated master per medal role",
                "slots": {}, "sameThemeArtSources": previous_manifest["sameThemeArtSources"]}
    for context, tier, image, bounds, master in items:
        rel = f"{CONTEXTS[context]}-{tier}-v1.png"
        output = PRODUCTION / rel
        output.parent.mkdir(parents=True, exist_ok=True)
        image.save(output, format="PNG", optimize=True)
        data = output.read_bytes()
        entry = {
            "masterPath": master.relative_to(ROOT).as_posix(),
            "productionPath": output.relative_to(ROOT).as_posix(),
            "opticalBoundsPx": bounds,
            "sizeBytes": len(data),
            "sha256": hashlib.sha256(data).hexdigest(),
        }
        manifest["slots"][rel] = entry
        mapped = theme["slots"][f"canonical/{CONTEXTS[context]}-{tier}-v1"]
        mapped["masterPath"] = entry["masterPath"]
        mapped["opticalBoundsPx"] = bounds
        mapped["sizeBytes"] = entry["sizeBytes"]
    (MASTERS / "manifest.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    updated = (json.dumps(implementation, ensure_ascii=False, indent=2) + "\n").encode("utf-8")
    map_path.write_bytes(updated.replace(b"\n", b"\r\n") if b"\r\n" in existing else updated)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--install", action="store_true")
    args = parser.parse_args()
    items = []
    for context in CONTEXTS:
        for tier in TIERS:
            master = MASTERS / f"{context}-{tier}-master-v1.png"
            if not master.is_file():
                raise FileNotFoundError(master)
            image, bounds = normalize(master)
            items.append((context, tier, image, bounds, master))
    make_review([(context, tier, image) for context, tier, image, _, _ in items])
    if args.install:
        install(items)
    print(f"{'Installed' if args.install else 'Previewed'} {len(items)} Light Gold medals: {REVIEW}")


if __name__ == "__main__":
    main()
