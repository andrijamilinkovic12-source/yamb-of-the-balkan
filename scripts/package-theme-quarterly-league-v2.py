"""Package independently illustrated Quarterly League PNGs for all themes."""

import hashlib
import json
import shutil
from pathlib import Path

from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "source-assets" / "theme-quarterly-league-v2"
THEMES = ("dark", "light", "medium", "winter", "neon", "amethyst", "easter", "desert", "moon", "severna")
IDENTITY = json.loads((SOURCE / "identity-sources.json").read_text(encoding="utf-8"))
NAVIGATION = json.loads((SOURCE / "navigation-sources.json").read_text(encoding="utf-8"))


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def relative(path):
    return path.relative_to(ROOT).as_posix()


def package_asset(theme, role, source_path, destinations):
    original = Path(source_path)
    if not original.is_absolute():
        original = ROOT / original
    master = SOURCE / theme / f"{role}-master-v2.png"
    if not original.is_file() and master.is_file():
        original = master
    if not original.is_file():
        raise FileNotFoundError(original)
    master.parent.mkdir(parents=True, exist_ok=True)
    if original.resolve() != master.resolve():
        shutil.copyfile(original, master)
    with Image.open(master) as image:
        if image.mode != "RGBA" or image.getextrema()[3][0] != 0:
            raise ValueError(f"Transparent RGBA required: {original}")
        output = []
        for path, size in destinations:
            path.parent.mkdir(parents=True, exist_ok=True)
            image.resize((size, size), Image.Resampling.LANCZOS).save(path, format="PNG", optimize=True)
            output.append({"file": relative(path), "sha256": digest(path), "size": [size, size]})
    return {"role": role, "master": relative(master), "masterSha256": digest(master), "production": output}


def main():
    manifest = {"schemaVersion": 2, "generatedOn": "2026-10-15", "method": "individual image generation; technical resize only", "themes": []}
    contact = Image.new("RGBA", (10 * 176, 236), (19, 25, 32, 255))
    draw = ImageDraw.Draw(contact)
    navigation_contact = Image.new("RGBA", (10 * 176, 3 * 154 + 26), (19, 25, 32, 255))
    navigation_draw = ImageDraw.Draw(navigation_contact)
    navigation_roles = ("tab-hall-of-fame", "tab-medals", "tab-champions")
    rank_roles = ("rank-amater", "rank-profi", "rank-majstor", "rank-legenda", "rank-titan", "rank-alltime")
    rank_contact = Image.new("RGBA", (10 * 144, 6 * 137), (19, 25, 32, 255))
    rank_draw = ImageDraw.Draw(rank_contact)
    medal_roles = ("medal-gold", "medal-silver", "medal-bronze")
    medal_contact = Image.new("RGBA", (10 * 154, 3 * 150), (19, 25, 32, 255))
    medal_draw = ImageDraw.Draw(medal_contact)
    for col, theme in enumerate(THEMES):
        canonical = (ROOT / "www" / "assets" / "green-soft-clay" / "canonical") if theme == "dark" else (ROOT / "www" / "assets" / "theme-packs" / theme / "canonical")
        base = canonical / "quarterly-league-room-identity"
        group = {"id": theme, "assets": []}
        role = "quarterly-league-room"
        group["assets"].append(package_asset(theme, role, IDENTITY[theme], [
            (base / "quarterly-league-room-v2.png", 512),
            (base / "quarterly-league-room-menu-v2.png", 384)
        ]))
        for navigation_role, source_path in NAVIGATION.get(theme, {}).items():
            group["assets"].append(package_asset(theme, navigation_role, source_path, [
                (canonical / "quarterly-navigation" / f"{navigation_role}-v2.png", 256)
            ]))
            row = navigation_roles.index(navigation_role)
            with Image.open(canonical / "quarterly-navigation" / f"{navigation_role}-v2.png") as image:
                navigation_contact.alpha_composite(image.resize((112, 112), Image.Resampling.LANCZOS),
                                                   (col * 176 + 32, row * 154 + 16))
            navigation_draw.text((col * 176 + 8, row * 154 + 133), f"{theme} / {navigation_role[4:]}",
                                 fill=(226, 233, 237, 255))
        for row, rank_role in enumerate(rank_roles):
            source_path = SOURCE / theme / f"{rank_role}-master-v2.png"
            if not source_path.is_file():
                continue
            group["assets"].append(package_asset(theme, rank_role, source_path, [
                (canonical / "quarterly-rank-badges" / f"{rank_role}-v2.png", 256)
            ]))
            with Image.open(canonical / "quarterly-rank-badges" / f"{rank_role}-v2.png") as image:
                rank_contact.alpha_composite(image.resize((112, 112), Image.Resampling.LANCZOS),
                                             (col * 144 + 16, row * 137 + 2))
            rank_draw.text((col * 144 + 5, row * 137 + 115), f"{theme}/{rank_role[5:]}",
                           fill=(226, 233, 237, 255))
        for row, medal_role in enumerate(medal_roles):
            source_path = SOURCE / theme / f"{medal_role}-master-v2.png"
            if not source_path.is_file():
                continue
            tier = medal_role.replace("medal-", "")
            group["assets"].append(package_asset(theme, medal_role, source_path, [
                (canonical / "competition-medals" / f"quarterly-league-{tier}-v2.png", 256)
            ]))
            with Image.open(canonical / "competition-medals" / f"quarterly-league-{tier}-v2.png") as image:
                medal_contact.alpha_composite(image.resize((112, 112), Image.Resampling.LANCZOS),
                                               (col * 154 + 21, row * 150 + 5))
            medal_draw.text((col * 154 + 5, row * 150 + 121), f"{theme}/{tier}",
                            fill=(226, 233, 237, 255))
        manifest["themes"].append(group)
        with Image.open(base / "quarterly-league-room-v2.png") as image:
            preview = image.resize((140, 140), Image.Resampling.LANCZOS)
            contact.alpha_composite(preview, (col * 176 + 18, 38))
        draw.text((col * 176 + 8, 14), theme, fill=(238, 242, 246, 255))
        draw.text((col * 176 + 8, 190), "Q1 Q2 Q3 Q4", fill=(195, 206, 214, 255))
    (SOURCE / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    contact.save(ROOT / "docs" / "theme-quarterly-league-v2-identity-review.png", optimize=True)
    navigation_contact.save(ROOT / "docs" / "theme-quarterly-league-v2-navigation-review.png", optimize=True)
    rank_contact.save(ROOT / "docs" / "theme-quarterly-league-v2-ranks-review.png", optimize=True)
    medal_contact.save(ROOT / "docs" / "theme-quarterly-league-v2-medals-review.png", optimize=True)
    print("Packaged 10 original Quarterly League identities and available navigation PNGs")


if __name__ == "__main__":
    main()
