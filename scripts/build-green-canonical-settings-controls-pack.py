"""Stage exact canonical Settings controls from approved Green clay masters."""

from io import BytesIO
from pathlib import Path
import hashlib
import json
import shutil

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
MASTER_ROOT = ROOT / "source-assets/green-soft-clay-canonical/settings-controls"
MANIFEST = json.loads((MASTER_ROOT / "manifest.json").read_text(encoding="utf-8"))


def verify(path: Path, size: int, byte_count: int, digest: str) -> bytes:
    data = path.read_bytes()
    if len(data) != byte_count or hashlib.sha256(data).hexdigest() != digest:
        raise ValueError(f"Unapproved Green Settings PNG: {path}")
    with Image.open(BytesIO(data)) as opened:
        if opened.size != (size, size) or opened.mode != "RGBA":
            raise ValueError(f"Wrong Green Settings image format: {path}")
        alpha = opened.getchannel("A")
        if alpha.getextrema() != (0, 255):
            raise ValueError(f"Wrong Green Settings alpha range: {path}")
        if any(opened.getpixel(point)[3] != 0 for point in ((0, 0), (size - 1, 0), (0, size - 1), (size - 1, size - 1))):
            raise ValueError(f"Opaque Green Settings corner: {path}")
    return data


def ensure_exact_copy(source: Path, target: Path, approved: bytes) -> None:
    if target.exists():
        if target.read_bytes() != approved:
            raise ValueError(f"Existing canonical file differs; refusing overwrite: {target}")
        return
    target.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(source, target)
    if target.read_bytes() != approved:
        raise ValueError(f"Canonical copy differs: {target}")


def ensure_exact_runtime(target: Path, approved: bytes) -> None:
    if target.exists():
        if target.read_bytes() != approved:
            raise ValueError(f"Existing canonical runtime differs; refusing overwrite: {target}")
        return
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_bytes(approved)
    if target.read_bytes() != approved:
        raise ValueError(f"Canonical runtime write differs: {target}")


def main() -> None:
    if MANIFEST["status"] not in ("canonical", "standardized", "locked") or len(MANIFEST["catalog"]) != 8:
        raise ValueError("Settings Controls manifest must contain exactly eight canonical entries")
    prepared = []
    for asset in MANIFEST["catalog"]:
        source = ROOT / asset["approvedSource"]
        active = ROOT / asset["activeRuntime"]
        master = MASTER_ROOT / asset["master"]
        runtime = ROOT / asset["runtime"]
        source_bytes = verify(source, 1254, asset["masterBytes"], asset["masterSha256"])
        with Image.open(BytesIO(source_bytes)) as image:
            output = BytesIO()
            image.resize((256, 256), Image.Resampling.LANCZOS).save(output, format="PNG", optimize=True)
            generated_bytes = output.getvalue()
        if len(generated_bytes) != asset["runtimeBytes"] or hashlib.sha256(generated_bytes).hexdigest() != asset["runtimeSha256"]:
            raise ValueError(f"Approved source does not reproduce approved runtime bytes: {asset['id']}")
        if active.exists() and verify(active, 256, asset["runtimeBytes"], asset["runtimeSha256"]) != generated_bytes:
            raise ValueError(f"Approved source and active runtime differ: {asset['id']}")
        for target, expected in ((master, source_bytes), (runtime, generated_bytes)):
            if target.exists() and target.read_bytes() != expected:
                raise ValueError(f"Existing file differs; refusing overwrite: {target}")
        prepared.append((asset, source, master, runtime, source_bytes, generated_bytes))

    for asset, source, master, runtime, source_bytes, generated_bytes in prepared:
        ensure_exact_copy(source, master, source_bytes)
        ensure_exact_runtime(runtime, generated_bytes)
        print(f"{asset['id']}: 1254px master / 256px canonical, exact optimized LANCZOS bytes")


if __name__ == "__main__":
    main()
