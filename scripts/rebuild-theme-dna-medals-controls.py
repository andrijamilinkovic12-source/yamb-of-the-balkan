"""Replace the generic medal glyphs and Treasury controls with theme-owned art.

The established icon pack supplies the pictured object for each semantic role.
Every source object comes from the same theme as its output. Medal bodies and
small status marks are drawn in the theme's own silhouette/material language.
Green's previously approved collection, leaderboard and league medals and all
eight Green Treasury controls are deliberately left untouched.
"""

from __future__ import annotations

import hashlib
import importlib.util
import json
import sys
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location("old_medals", ROOT / "scripts/build-theme-medals.py")
old = importlib.util.module_from_spec(spec)
assert spec.loader
spec.loader.exec_module(old)

definitions = json.loads((ROOT / "docs/theme-definitions.json").read_text(encoding="utf-8"))
THEMES = {t["id"]: t for t in definitions["themes"]}
S = 768
RUNTIME = 256
CONTEXTS = old.CONTEXTS
TIERS = old.TIERS
CONTROL_ROLES = ("tab-trophies", "tab-skins", "tab-effects", "tab-themes",
                 "status-owned", "status-active", "status-locked", "status-insufficient")


def rgb(value):
    return tuple(int(value[i:i + 2], 16) for i in (1, 3, 5))


def mix(a, b, fraction):
    return tuple(round(x * (1 - fraction) + y * fraction) for x, y in zip(a, b))


def palette(theme):
    if theme == "dark":
        return {"body": rgb("#41644D"), "light": rgb("#D5DCAC"),
                "shade": rgb("#203C2C"), "accent": rgb("#C8A77D")}
    values = THEMES[theme]["iconDna"]["colorsHex"]
    return {key: rgb(values[key]) for key in ("body", "light", "shade", "accent")}


def pack(theme):
    return ROOT / ("www/assets/green-soft-clay/canonical" if theme == "dark"
                   else f"www/assets/theme-packs/{theme}/canonical")


def own_art(theme, role):
    root = pack(theme)
    mapping = {
        "collection": ("treasury", "treasury-free-v3.png"),
        "leaderboard": ("canonical", "leaderboard-room-identity/leaderboard-room-menu-v1.png"),
        "tournament": ("canonical", "tournament-awards/champion-trophy-v1.png"),
        "quarterly-league": ("canonical", "quarterly-league-room-identity/quarterly-league-room-menu-v1.png"),
        "power-index": ("canonical", "statistics-room-identity/statistics-room-menu-v1.png"),
        "fire-streak": ("canonical", "achievement-trophies/firecracker-v1.png"),
        "tab-trophies": ("canonical", "tournament-awards/champion-trophy-v1.png"),
        "tab-skins": ("canonical", "achievement-trophies/first_play-v1.png"),
        "tab-effects": ("canonical", "achievement-trophies/firecracker-v1.png"),
    }
    parent, relative = mapping[role]
    if parent == "treasury":
        path = ROOT / (f"www/assets/theme-packs/{theme}/runtime/menu/treasury-free-v3.png"
                       if theme != "dark" else "www/assets/green-soft-clay/treasury-free-v3.png")
    else:
        path = root / relative
    if not path.exists():
        raise FileNotFoundError(f"Missing same-theme art: {theme}/{role}: {path}")
    return path


def fitted_art(path, max_width, max_height):
    image = Image.open(path).convert("RGBA")
    bounds = image.getchannel("A").point(lambda a: 255 if a >= 12 else 0).getbbox()
    if not bounds:
        raise ValueError(f"Empty icon: {path}")
    image = image.crop(bounds)
    factor = min(max_width / image.width, max_height / image.height)
    return image.resize((round(image.width * factor), round(image.height * factor)), Image.Resampling.LANCZOS)


def alpha_shadow(canvas, image, at, color, blur=16, strength=82, offset=(8, 12)):
    layer = Image.new("RGBA", canvas.size, (*color, 0))
    mask = Image.new("L", canvas.size)
    mask.paste(image.getchannel("A"), (at[0] + offset[0], at[1] + offset[1]))
    layer.putalpha(mask.filter(ImageFilter.GaussianBlur(blur)).point(lambda a: round(a * strength / 255)))
    canvas.alpha_composite(layer)


def medal_body(theme, context, tier):
    p = palette(theme)
    index = old.THEMES[theme][4]
    clay = THEMES[theme]["direction"] == "clay"
    dark, mid, light = (rgb(v) for v in old.TIER_COLORS[tier])
    canvas = Image.new("RGBA", (S, S))
    old.draw_ribbon(canvas, context, index, mix(p["body"], mid, .39), clay)
    outer = old.radial_mask(index)
    old.add_shadow(canvas, outer, 18 if clay else 12, (8, 14), 104)
    canvas.alpha_composite(old.masked_gradient(outer, mix(light, p["light"], .12),
                                               mix(mid, p["body"], .10),
                                               mix(dark, p["shade"], .13), tilt=.08))
    face = old.radial_mask(index, .77, -2)
    edge = ImageChops.subtract(outer, face)
    rim = Image.new("RGBA", (S, S), (*mix(light, p["light"], .17), 0))
    rim.putalpha(edge.point(lambda a: round(a * (.16 if clay else .12))))
    canvas.alpha_composite(rim)
    face_top = mix(p["body"], p["light"], .19 if clay else .24)
    face_mid = mix(p["body"], p["shade"], .20)
    face_bottom = mix(p["body"], p["shade"], .38)
    canvas.alpha_composite(old.masked_gradient(face, face_top, face_mid, face_bottom, tilt=.04))
    inset_edge = ImageChops.subtract(face, face.filter(ImageFilter.MinFilter(13 if clay else 9)))
    inset = Image.new("RGBA", (S, S), (*mix(p["light"], mid, .2), 0))
    inset.putalpha(inset_edge.point(lambda a: round(a * .36)))
    canvas.alpha_composite(inset)
    return canvas


def render_medal(theme, context, tier):
    canvas = medal_body(theme, context, tier)
    artwork = fitted_art(own_art(theme, context), 320, 326)
    x = (S - artwork.width) // 2
    y = 330 - artwork.height // 2
    alpha_shadow(canvas, artwork, (x, y), palette(theme)["shade"], 12, 105, (6, 11))
    canvas.alpha_composite(artwork, (x, y))
    return canvas


def smooth_mask(mask):
    return mask.filter(ImageFilter.GaussianBlur(2))


def relief(mask, theme, strength=1, functional=False):
    p = palette(theme)
    clay = THEMES[theme]["direction"] == "clay"
    canvas = Image.new("RGBA", (S, S))
    shadow = Image.new("RGBA", (S, S), (*p["shade"], 0))
    offset = Image.new("L", (S, S))
    offset.paste(mask, (9, 13))
    shadow.putalpha(offset.filter(ImageFilter.GaussianBlur(18 if clay else 13))
                    .point(lambda a: round(a * .42)))
    canvas.alpha_composite(shadow)
    if functional:
        if theme in ("light", "easter", "desert"):
            upper = mix(p["shade"], p["body"], .16)
            middle = p["shade"]
            lower = mix(p["shade"], (16, 13, 14), .17)
        else:
            upper = p["light"]
            middle = mix(p["light"], p["body"], .12)
            lower = mix(p["light"], p["shade"], .28)
    else:
        upper, middle, lower = p["light"], p["body"], mix(p["body"], p["shade"], .57)
    canvas.alpha_composite(old.masked_gradient(mask, upper, middle, lower, tilt=.08))
    edge = ImageChops.subtract(mask, mask.filter(ImageFilter.MinFilter(17 if clay else 11)))
    bevel = Image.new("RGBA", (S, S), (*p["light"], 0))
    bevel.putalpha(edge.point(lambda a: round(a * (.25 if clay else .32) * strength)))
    canvas.alpha_composite(bevel)
    return canvas


def theme_panel(theme):
    # Two *separate* material samples signal "Themes" at a 34px tab size.
    # Their edges, overlap and relief are intentionally different per pack.
    idx = old.THEMES[theme][4]
    p = palette(theme)
    back = Image.new("L", (S, S))
    front = Image.new("L", (S, S))
    b, f = ImageDraw.Draw(back), ImageDraw.Draw(front)
    if idx == 1:  # Light Gold: two broad matte tiles.
        b.rounded_rectangle((118, 237, 487, 624), radius=88, fill=255)
        f.rounded_rectangle((289, 112, 654, 516), radius=94, fill=255)
    elif idx == 2:  # Dark Cherry: soft clay lozenges.
        b.polygon([(139, 359), (301, 201), (474, 347), (468, 546), (310, 666), (126, 529)], fill=255)
        f.polygon([(312, 215), (498, 100), (665, 267), (593, 475), (413, 515), (279, 360)], fill=255)
    elif idx == 3:  # Blue Ocean: coastal curves and one square window.
        b.ellipse((127, 259, 485, 635), fill=255)
        f.rounded_rectangle((291, 115, 637, 510), radius=39, fill=255)
    elif idx == 4:  # Neon Cyber: independent clipped display plates.
        b.polygon([(145, 280), (331, 179), (499, 280), (499, 558), (331, 650), (145, 558)], fill=255)
        f.polygon([(316, 139), (504, 95), (651, 247), (605, 488), (400, 507), (296, 346)], fill=255)
    elif idx == 5:  # Royal Amethyst: six-sided quiet facets.
        b.polygon([(170, 271), (333, 183), (496, 274), (496, 558), (328, 648), (167, 554)], fill=255)
        f.polygon([(313, 203), (491, 105), (644, 236), (638, 429), (481, 530), (303, 416)], fill=255)
    elif idx == 6:  # Easter: upright egg-like tiles.
        b.ellipse((149, 229, 463, 635), fill=255)
        f.ellipse((315, 106, 623, 518), fill=255)
    elif idx == 7:  # Desert: sediment slabs.
        b.polygon([(143, 291), (422, 291), (511, 398), (465, 622), (153, 622), (105, 461)], fill=255)
        f.polygon([(300, 122), (578, 122), (669, 236), (618, 506), (338, 506), (261, 328)], fill=255)
    elif idx == 8:  # Moon: irregular, compact lunar plates.
        b.polygon([(145, 397), (252, 223), (448, 258), (498, 429), (391, 623), (160, 578)], fill=255)
        f.polygon([(338, 147), (563, 126), (661, 303), (583, 522), (354, 495), (273, 332)], fill=255)
    else:  # Northern Nebula: soft tall shields.
        b.polygon([(307, 191), (462, 292), (463, 517), (313, 655), (161, 518), (162, 290)], fill=255)
        f.polygon([(494, 101), (644, 218), (619, 423), (481, 541), (314, 408), (338, 212)], fill=255)
    canvas = relief(smooth_mask(back), theme)
    front_layer = relief(smooth_mask(front), theme, functional=True)
    canvas.alpha_composite(front_layer)
    return canvas


def status_mask(theme, role):
    idx = old.THEMES[theme][4]
    mask = Image.new("L", (S, S))
    d = ImageDraw.Draw(mask)
    if role == "status-owned":
        return old.radial_mask(idx, .74, 43)
    if role in ("status-active", "status-insufficient"):
        outer = old.radial_mask(idx, .79, 43)
        inner = old.radial_mask(idx, .50 if role == "status-active" else .55, 43)
        mask = ImageChops.subtract(outer, inner)
        if role == "status-insufficient":
            d = ImageDraw.Draw(mask)
            # A single broad pause bar stays legible at the Green 22px slot.
            d.rounded_rectangle((230, 342, 538, 426), radius=39 if idx in (1, 5, 9) else 20, fill=255)
        return mask
    # Padlock: invariant function, original body silhouette and proportions.
    shackle = [(235, 165, 533, 478), (239, 139, 529, 462), (211, 173, 557, 464),
               (236, 171, 532, 461), (216, 155, 552, 479), (239, 157, 529, 480),
               (228, 173, 540, 477), (227, 185, 541, 487), (218, 178, 550, 470),
               (226, 153, 542, 469)][idx]
    d.arc(shackle, 180, 360, fill=255, width=96 if idx != 3 else 78)
    d.line((shackle[0], 326, shackle[0], 415), fill=255, width=96 if idx != 3 else 78)
    d.line((shackle[2], 326, shackle[2], 415), fill=255, width=96 if idx != 3 else 78)
    if idx in (0, 1, 5, 9):
        d.rounded_rectangle((142, 336, 626, 651), radius=(92 if idx in (1, 5) else 61), fill=255)
    elif idx == 2:  # Cherry's low clay lozenge.
        d.rounded_rectangle((127, 340, 641, 645), radius=120, fill=255)
    elif idx == 8:  # Moon's broad crater-cut trapezoid.
        d.polygon([(202, 326), (565, 326), (650, 430), (614, 612), (519, 658),
                   (248, 658), (151, 612), (117, 430)], fill=255)
    elif idx in (3, 4):
        d.polygon([(174, 334), (594, 334), (637, 388), (637, 601), (590, 653),
                   (178, 653), (131, 601), (131, 388)], fill=255)
    elif idx == 6:
        d.ellipse((133, 323, 635, 662), fill=255)
    else:
        d.polygon([(168, 324), (600, 324), (640, 440), (600, 619), (514, 651),
                   (254, 651), (168, 619), (128, 440)], fill=255)
    return mask


def render_status(theme, role):
    p = palette(theme)
    mask = status_mask(theme, role)
    canvas = relief(smooth_mask(mask), theme, functional=True)
    d = ImageDraw.Draw(canvas)
    if role == "status-locked":
        keyhole = p["light"] if theme in ("light", "easter", "desert") else p["shade"]
        d.ellipse((342, 418, 426, 502), fill=(*keyhole, 240))
        d.polygon([(369, 475), (399, 475), (416, 566), (352, 566)], fill=(*keyhole, 240))
    elif role == "status-owned":
        stroke = p["light"] if theme in ("light", "easter", "desert") else p["shade"]
        d.line([(234, 399), (335, 477), (535, 281)], fill=(*stroke, 255), width=66, joint="curve")
        for x, y in ((234, 399), (535, 281)):
            d.ellipse((x-33, y-33, x+33, y+33), fill=(*stroke, 255))
    elif role == "status-active":
        d.ellipse((345, 345, 423, 423), fill=(*p["accent"], 255))
    return canvas


def render_control(theme, role):
    if role in ("tab-trophies", "tab-skins", "tab-effects"):
        art = fitted_art(own_art(theme, role), 562, 562)
        canvas = Image.new("RGBA", (S, S))
        at = ((S - art.width) // 2, (S - art.height) // 2)
        canvas.alpha_composite(art, at)
        return canvas
    if role == "tab-themes":
        return theme_panel(theme)
    return render_status(theme, role)


def save_pair(image, theme, family, filename, mastername):
    master = ROOT / f"source-assets/theme-icon-packs/{theme}/{family}/{mastername}"
    destination = pack(theme) / ("collection-medals" if family == "medals-v1" and filename.startswith("collection-")
                                 else "competition-medals" if family == "medals-v1"
                                 else "treasury-controls") / filename
    master.parent.mkdir(parents=True, exist_ok=True)
    destination.parent.mkdir(parents=True, exist_ok=True)
    image.save(master, optimize=True)
    image.resize((RUNTIME, RUNTIME), Image.Resampling.LANCZOS).save(destination, optimize=True)
    with Image.open(destination) as check:
        bounds = check.getchannel("A").point(lambda a: 255 if a >= 16 else 0).getbbox()
    return {
        "masterPath": master.relative_to(ROOT).as_posix(),
        "productionPath": destination.relative_to(ROOT).as_posix(),
        "opticalBoundsPx": list(bounds),
        "sizeBytes": destination.stat().st_size,
        "sha256": hashlib.sha256(destination.read_bytes()).hexdigest(),
    }


def main():
    if "--only-control-draw" in sys.argv:
        for theme in THEMES:
            if theme == "dark":
                continue
            manifest_path = ROOT / f"source-assets/theme-icon-packs/{theme}/treasury-controls-v1/manifest.json"
            manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
            for role in ("tab-themes", "status-owned", "status-active", "status-locked", "status-insufficient"):
                manifest["slots"][f"canonical/treasury-controls/{role}-v1"] = save_pair(
                    render_control(theme, role), theme, "treasury-controls-v1", f"{role}-v1.png",
                    f"{role}-master-v2.png")
            manifest_path.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
            print(theme, "drawn controls", flush=True)
        return
    counts = {}
    for theme in THEMES:
        medal_manifest_path = ROOT / f"source-assets/theme-icon-packs/{theme}/medals-v1/manifest.json"
        medal_manifest = json.loads(medal_manifest_path.read_text(encoding="utf-8"))
        updated = 0
        for context in CONTEXTS:
            if theme == "dark" and context in ("collection", "leaderboard", "quarterly-league"):
                continue
            for tier in TIERS:
                stem = "collection" if context == "collection" else "general-podium" if context == "leaderboard" else context
                filename = f"{stem}-{tier}-v1.png"
                slot = f"{'collection-medals' if context == 'collection' else 'competition-medals'}/{filename}"
                medal_manifest["slots"][slot] = save_pair(
                    render_medal(theme, context, tier), theme, "medals-v1", filename,
                    f"{context}-{tier}-master-v2.png")
                updated += 1
        medal_manifest["dnaRevision"] = 2
        medal_manifest["sameThemeArtSources"] = {
            context: own_art(theme, context).relative_to(ROOT).as_posix()
            for context in CONTEXTS
            if theme != "dark" or context not in ("collection", "leaderboard", "quarterly-league")
        }
        medal_manifest_path.write_text(json.dumps(medal_manifest, indent=2) + "\n", encoding="utf-8")
        if theme != "dark":
            control_manifest_path = ROOT / f"source-assets/theme-icon-packs/{theme}/treasury-controls-v1/manifest.json"
            control_manifest = json.loads(control_manifest_path.read_text(encoding="utf-8"))
            for role in CONTROL_ROLES:
                filename = f"{role}-v1.png"
                slot = f"canonical/treasury-controls/{role}-v1"
                control_manifest["slots"][slot] = save_pair(
                    render_control(theme, role), theme, "treasury-controls-v1", filename,
                    f"{role}-master-v2.png")
            control_manifest["dnaRevision"] = 2
            control_manifest["sameThemeArtSources"] = {
                role: own_art(theme, role).relative_to(ROOT).as_posix()
                for role in ("tab-trophies", "tab-skins", "tab-effects")
            }
            control_manifest_path.write_text(json.dumps(control_manifest, indent=2) + "\n", encoding="utf-8")
        counts[theme] = {"medals": updated, "treasuryControls": 0 if theme == "dark" else 8}
        print(theme, counts[theme], flush=True)
    print("Total replaced:", sum(x["medals"] + x["treasuryControls"] for x in counts.values()))


if __name__ == "__main__":
    main()
