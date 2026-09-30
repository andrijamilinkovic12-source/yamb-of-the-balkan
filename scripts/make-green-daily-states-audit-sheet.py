from pathlib import Path
import hashlib
import math
import textwrap

from PIL import Image, ImageChops, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
RUNTIME = ROOT / "www/assets/green-soft-clay"
HIRES = ROOT / "source-assets/green-soft-clay-hires/daily"
OUTPUT = ROOT / "docs/green-asset-standardization-daily-states-audit.png"
ROOM = RUNTIME / "canonical/daily-room-identity/daily-room-v1.png"
REWARD = RUNTIME / "daily/reward-video-v3.png"
STATES = {
    "task": {
        "source": HIRES / "task-v1.png",
        "runtime": RUNTIME / "canonical/daily-states/task-v1.png",
        "display": 44,
        "meaning": "daily task and target list",
    },
    "complete": {
        "source": HIRES / "complete-v1.png",
        "runtime": RUNTIME / "canonical/daily-states/complete-v1.png",
        "display": 58,
        "meaning": "successful challenge completion",
    },
    "already-played": {
        "source": HIRES / "already-played-v1.png",
        "runtime": RUNTIME / "canonical/daily-states/already-played-v1.png",
        "display": 104,
        "meaning": "daily replay lock with clock",
    },
}
PANELS = [
    ("A1  Task approved source", STATES["task"]["source"], "KEEP: task/target state master", None),
    ("A2  Task canonical runtime", STATES["task"]["runtime"], "LOCK: task state, actual 44 px", 44),
    ("B1  Complete approved source", STATES["complete"]["source"], "KEEP: completion state master", None),
    ("B2  Complete canonical runtime", STATES["complete"]["runtime"], "LOCK: completion state, actual 58 px", 58),
    ("C1  Already-played source", STATES["already-played"]["source"], "KEEP: replay-lock state master", None),
    ("C2  Already-played canonical", STATES["already-played"]["runtime"], "LOCK: replay state, actual 104 px", 104),
    ("X1  Daily room identity", ROOM, "LOCKED: room entry, not a state", 54),
    ("X2  Double-reward action", REWARD, "LOCKED: video + dukat composition", 28),
]
EXPECTED_HASHES = {
    STATES["task"]["source"]: "660c7737a83fbb49dccefa5648fcc999b5fb2669bdf79dae992482fd39a13372",
    STATES["task"]["runtime"]: "750f23bcf3458d5017f838f9717560041279702a0c35a4f4dc4031504cc8ffe9",
    STATES["complete"]["source"]: "d348d061b4764f93e243249d570b43b3c3a3ec46ee785875741d4ab222ad9f75",
    STATES["complete"]["runtime"]: "bc340dc50f576c011e6073eb929a914a4538ab39a38a95b4423fbe3e863ba97d",
    STATES["already-played"]["source"]: "ce45193a5ac23d30d757c7e0928016f70b667e06f7daf4903ce87a2a676c69a4",
    STATES["already-played"]["runtime"]: "3a5b3b09c98487465d463c855e343134a12e33fd15ab02ffe49d4ed0f58eca3e",
    ROOM: "1a0669083da288f1cb4bd673508acf0e6d4380b7fa1346c03004ebddd4343dcc",
    REWARD: "ae01fd5ba5251e7947328cc9600adc3168385339029b7105cbba29be9d1437ad",
}


def rgba(source: Path) -> Image.Image:
    with Image.open(source) as image:
        return image.convert("RGBA")


def identical(left: Image.Image, right: Image.Image) -> bool:
    return left.size == right.size and all(
        channel.getbbox() is None for channel in ImageChops.difference(left, right).split()
    )


def checker(size: tuple[int, int]) -> Image.Image:
    panel = Image.new("RGBA", size)
    draw = ImageDraw.Draw(panel)
    colors = ((66, 94, 69, 255), (50, 78, 57, 255))
    for y in range(0, size[1], 14):
        for x in range(0, size[0], 14):
            draw.rectangle((x, y, x + 13, y + 13), fill=colors[(x // 14 + y // 14) % 2])
    return panel


def main() -> None:
    cell_width, preview_height, label_height, header_height = 370, 300, 124, 126
    rows = math.ceil(len(PANELS) / 4)
    sheet = Image.new("RGBA", (1480, header_height + rows * (preview_height + label_height)), (21, 51, 32, 255))
    draw = ImageDraw.Draw(sheet)
    title_font = ImageFont.load_default(size=21)
    font = ImageFont.load_default(size=15)
    small_font = ImageFont.load_default(size=12)
    draw.text((30, 24), "GREEN ASSET STANDARDIZATION - DAILY STATES AUDIT", fill=(232, 240, 207, 255), font=title_font)
    draw.text((30, 65), "Three distinct states: task, completed and already played", fill=(172, 204, 161, 255), font=font)
    draw.text((30, 91), "Static PNG audit; room identity, rewarded video, dice and server reward logic stay separate", fill=(143, 178, 137, 255), font=small_font)

    for index, (label, source, assessment, display_size) in enumerate(PANELS):
        x = (index % 4) * cell_width
        y = header_height + (index // 4) * (preview_height + label_height)
        panel = checker((352, 288))
        source_image = rgba(source)
        preview = source_image.copy()
        preview.thumbnail((244, 244), Image.Resampling.LANCZOS)
        panel.alpha_composite(preview, ((352 - preview.width) // 2 - (22 if display_size else 0), (288 - preview.height) // 2))
        if display_size:
            actual = source_image.resize((display_size, display_size), Image.Resampling.LANCZOS)
            actual_x, actual_y = 352 - display_size - 15, 288 - display_size - 15
            panel.alpha_composite(actual, (actual_x, actual_y))
            ImageDraw.Draw(panel).text((actual_x - 2, max(8, actual_y - 18)), f"{display_size}px", fill=(230, 237, 204, 255), font=small_font)
        sheet.alpha_composite(panel, (x + 9, y + 6))
        draw.rectangle((x + 9, y + 6, x + 360, y + 293), outline=(128, 165, 116, 255), width=2)
        draw.text((x + 16, y + 304), label, fill=(239, 231, 194, 255), font=font)
        draw.text((x + 16, y + 331), assessment, fill=(185, 211, 172, 255), font=small_font)
        relative = source.relative_to(ROOT).as_posix().replace("source-assets/green-soft-clay-hires/", "hires/").replace("www/assets/green-soft-clay/", "green/")
        meta = f"{relative} | {source_image.width}x{source_image.height}"
        draw.multiline_text((x + 16, y + 355), "\n".join(textwrap.wrap(meta, width=49)), fill=(143, 178, 137, 255), font=small_font, spacing=2)

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(OUTPUT, optimize=True)
    print(OUTPUT)

    for source, digest in EXPECTED_HASHES.items():
        with Image.open(source) as image:
            assert image.mode == "RGBA", source
            assert image.getchannel("A").getextrema() == (0, 255), source
            assert all(image.getpixel(corner)[3] == 0 for corner in (
                (0, 0), (image.width - 1, 0), (0, image.height - 1), (image.width - 1, image.height - 1),
            )), source
            actual_digest = hashlib.sha256(source.read_bytes()).hexdigest()
            assert actual_digest == digest, source
            print(f"{source.relative_to(ROOT).as_posix()} | {image.width}x{image.height} {image.mode} | {source.stat().st_size} B | {actual_digest}")

    for name, state in STATES.items():
        source = rgba(state["source"])
        runtime = rgba(state["runtime"])
        assert source.size == (1254, 1254) and runtime.size == (384, 384)
        same = identical(source.resize(runtime.size, Image.Resampling.LANCZOS), runtime)
        assert same, name
        print(f"{name} source -> runtime: pixel-identical={same}")


if __name__ == "__main__":
    main()
