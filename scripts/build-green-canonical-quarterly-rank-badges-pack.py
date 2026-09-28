from pathlib import Path
import shutil

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
HIRES = ROOT / "source-assets" / "green-soft-clay-hires" / "ql"
CANONICAL = ROOT / "source-assets" / "green-soft-clay-canonical" / "quarterly-rank-badges"
RUNTIME = ROOT / "www" / "assets" / "green-soft-clay" / "canonical" / "quarterly-rank-badges"

RANK_IDS = (
    "amater",
    "profi",
    "majstor",
    "legenda",
    "titan",
    "alltime",
)


def main() -> None:
    for rank_id in RANK_IDS:
        source = HIRES / f"rank-{rank_id}-v1.png"
        master = CANONICAL / f"green-rank-{rank_id}-master-v1.png"
        runtime = RUNTIME / f"rank-{rank_id}-v1.png"
        if not source.exists():
            raise FileNotFoundError(f"Missing approved Quarterly League rank source: {source}")

        master.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(source, master)

        with Image.open(master) as source_image:
            if source_image.size != (512, 512):
                raise ValueError(f"Unexpected Quarterly League rank master geometry: {master} -> {source_image.size}")
            image = source_image.convert("RGBA")
            image.thumbnail((384, 384), Image.Resampling.LANCZOS)
            if image.size != (384, 384):
                raise ValueError(f"Unexpected Quarterly League rank runtime geometry: {runtime} -> {image.size}")
            runtime.parent.mkdir(parents=True, exist_ok=True)
            image.save(runtime, format="PNG", optimize=True)
            print(f"{rank_id}: master {source_image.width}x{source_image.height}, runtime {image.width}x{image.height}, {runtime.stat().st_size // 1024} KB")


if __name__ == "__main__":
    main()
