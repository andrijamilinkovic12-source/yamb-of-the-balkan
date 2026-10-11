"""Build compact Treasury PNG previews; retain full-resolution gameplay art."""

from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1] / "www" / "assets"
THEMES = ("dark", "light", "medium", "winter", "neon", "amethyst", "easter", "desert", "moon", "severna")


def make_preview(source: Path, target: Path, size: tuple[int, int]) -> tuple[int, int]:
    target.parent.mkdir(parents=True, exist_ok=True)
    with Image.open(source) as image:
        image.thumbnail(size, Image.Resampling.LANCZOS)
        image.save(target, format="PNG", optimize=True)
    return source.stat().st_size, target.stat().st_size


def main() -> None:
    original = preview = count = 0
    for source in (ROOT / "dice-skins-v1").glob("*-face-v1.png"):
        target = ROOT / "treasury-skin-previews" / source.name
        before, after = make_preview(source, target, (120, 120))
        original += before
        preview += after
        count += 1
    for theme in THEMES:
        pack_dir = ROOT / "green-soft-clay" if theme == "dark" else ROOT / "theme-packs" / theme
        source_dir = pack_dir / "canonical" / "treasury-effect-previews"
        for source in source_dir.glob("preview-*-v1.png"):
            target = source_dir.parent / "treasury-effect-thumbnails" / source.name
            before, after = make_preview(source, target, (192, 128))
            original += before
            preview += after
            count += 1
    print(f"{count} skin/effect previews: {original:,} -> {preview:,} bytes")


if __name__ == "__main__":
    main()
