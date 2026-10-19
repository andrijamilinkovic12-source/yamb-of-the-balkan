"""Build distinct Online Random state PNGs from each theme's approved room identity.

Each state is drawn independently on a transparent canvas. The theme's own room
symbol is a quiet relief behind the functional mark; no other theme art is used.
"""

import hashlib
import json
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageFilter, ImageFont, ImageOps


ROOT = Path(__file__).resolve().parents[2]
SOURCE = Path(__file__).resolve().parent
WWW = ROOT / "www"
THEMES = json.loads((ROOT / "docs/theme-definitions.json").read_text(encoding="utf-8"))["themes"]
ROLES = ("scanning", "found", "vs", "disconnected", "reconnected")
SIZE = 512
FONT = Path("C:/Windows/Fonts/arialbd.ttf")


def rgb(value):
    return tuple(int(value[index:index + 2], 16) for index in (1, 3, 5))


def mix(first, second, factor):
    return tuple(round(a * (1 - factor) + b * factor) for a, b in zip(first, second))


def mask_for(role, variant):
    mask = Image.new("L", (SIZE, SIZE))
    draw = ImageDraw.Draw(mask)
    if role == "scanning":
        draw.ellipse((122, 101, 347, 326), outline=255, width=54)
        draw.line((322, 307, 406, 397), fill=255, width=58, joint="curve")
        draw.ellipse((222, 201, 248, 227), fill=255)
    elif role == "found":
        draw.ellipse((91, 112, 195, 216), fill=255)
        draw.ellipse((307, 112, 411, 216), fill=255)
        draw.rounded_rectangle((62, 228, 224, 375), radius=73, fill=255)
        draw.rounded_rectangle((288, 228, 450, 375), radius=73, fill=255)
        draw.line((217, 253, 252, 289, 308, 217), fill=255, width=47, joint="curve")
    elif role == "vs":
        font = ImageFont.truetype(str(FONT), 208)
        draw.text((256, 247), "VS", font=font, fill=255, anchor="mm", stroke_width=3)
    elif role == "disconnected":
        draw.arc((79, 153, 304, 378), 68, 308, fill=255, width=68)
        draw.arc((212, 134, 437, 359), 248, 488, fill=255, width=68)
        draw.line((218, 124, 292, 209), fill=255, width=37, joint="curve")
        draw.line((223, 319, 298, 402), fill=255, width=37, joint="curve")
    else:
        draw.arc((77, 151, 303, 377), 58, 305, fill=255, width=67)
        draw.arc((209, 133, 435, 359), 238, 485, fill=255, width=67)
        draw.line((207, 258, 252, 302, 321, 213), fill=255, width=41, joint="curve")
    if variant == "neon":
        # Small flat cuts echo the segmented Neon Cyber room symbol.
        if role in ("scanning", "vs"):
            draw.rounded_rectangle((233, 74, 278, 102), radius=8, fill=255)
            draw.rounded_rectangle((233, 409, 278, 437), radius=8, fill=255)
    return mask


def render(theme, role):
    name = theme["id"]
    palette = theme["paletteHex"]
    clay = theme["direction"] == "clay"
    primary = rgb(palette["primary"])
    accent = rgb(palette["accent"])
    surface = rgb(palette["raised"])
    shadow = rgb(palette["inset"])
    if role == "disconnected":
        primary = mix(primary, rgb(palette["danger"]), 0.48)
    elif role in ("found", "reconnected"):
        primary = mix(primary, rgb(palette["success"]), 0.34)

    canvas = Image.new("RGBA", (SIZE, SIZE))
    room = WWW / "assets/theme-packs" / name / "canonical/online-random-room-identity/online-random-room-v1.png"
    identity = ImageOps.contain(Image.open(room).convert("RGBA"), (420, 420), Image.Resampling.LANCZOS)
    identity.putalpha(identity.getchannel("A").point(lambda alpha: round(alpha * 0.86)))
    canvas.alpha_composite(identity, ((SIZE - identity.width) // 2, (SIZE - identity.height) // 2))

    original_mask = mask_for(role, name)
    glyph_size = {"scanning": 225, "found": 218, "vs": 258,
                  "disconnected": 228, "reconnected": 228}[role]
    glyph_center = {"scanning": (331, 326), "found": (259, 326), "vs": (256, 256),
                    "disconnected": (288, 292), "reconnected": (288, 292)}[role]
    mask = Image.new("L", (SIZE, SIZE))
    glyph = original_mask.resize((glyph_size, glyph_size), Image.Resampling.LANCZOS)
    mask.paste(glyph, (glyph_center[0] - glyph_size // 2, glyph_center[1] - glyph_size // 2))
    badge = Image.new("RGBA", (SIZE, SIZE))
    badge_draw = ImageDraw.Draw(badge)
    badge_radius = glyph_size // 2 + 9
    cx, cy = glyph_center
    badge_draw.ellipse((cx - badge_radius, cy - badge_radius, cx + badge_radius, cy + badge_radius),
                       fill=surface + (240,), outline=mix(accent, surface, 0.55) + (175,), width=6)
    badge_shadow = Image.new("RGBA", (SIZE, SIZE))
    badge_shadow.putalpha(badge.getchannel("A").filter(ImageFilter.GaussianBlur(12)).point(lambda a: round(a * 0.24)))
    canvas.alpha_composite(ImageChops.offset(badge_shadow, 4, 7))
    canvas.alpha_composite(badge)
    offset = ImageChops.offset(mask, 8, 11).filter(ImageFilter.GaussianBlur(17 if clay else 11))
    shade = Image.new("RGBA", (SIZE, SIZE), shadow + (0,))
    shade.putalpha(offset.point(lambda alpha: round(alpha * 0.62)))
    canvas.alpha_composite(shade)

    highlight = ImageChops.offset(mask, -5, -6).filter(ImageFilter.GaussianBlur(5 if clay else 3))
    light = Image.new("RGBA", (SIZE, SIZE), mix(primary, (255, 255, 255), 0.58) + (0,))
    light.putalpha(highlight.point(lambda alpha: round(alpha * 0.38)))
    canvas.alpha_composite(light)

    grad = Image.new("RGBA", (1, SIZE))
    top = mix(primary, surface, 0.30 if clay else 0.20)
    bottom = mix(primary, shadow, 0.19 if clay else 0.10)
    for y in range(SIZE):
        grad.putpixel((0, y), mix(top, bottom, y / (SIZE - 1)) + (255,))
    grad = grad.resize((SIZE, SIZE))
    grad.putalpha(mask)
    canvas.alpha_composite(grad)

    rim = Image.new("RGBA", (SIZE, SIZE))
    rim_draw = ImageDraw.Draw(rim)
    rim_color = mix(accent, surface, 0.33) + (190,)
    if role == "vs":
        rim_draw.rounded_rectangle((173, 345, 339, 354), radius=5, fill=rim_color)
    elif role == "found":
        rim_draw.rounded_rectangle((244, 272, 268, 282), radius=5, fill=rim_color)
    canvas.alpha_composite(rim)
    return canvas


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main():
    entries = []
    for theme in THEMES:
        name = theme["id"]
        if name == "dark":
            continue  # The locked Green room-state artwork stays unchanged.
        for role in ROLES:
            master = SOURCE / name / f"{role}-master-v1.png"
            runtime = WWW / "assets/theme-packs" / name / "canonical/online-random-states" / f"{role}-v1.png"
            master.parent.mkdir(parents=True, exist_ok=True)
            runtime.parent.mkdir(parents=True, exist_ok=True)
            art = render(theme, role)
            art.save(master, optimize=True)
            art.resize((256, 256), Image.Resampling.LANCZOS).save(runtime, optimize=True)
            entries.append({"theme": name, "role": role,
                            "master": master.relative_to(ROOT).as_posix(), "masterSha256": digest(master),
                            "runtime": runtime.relative_to(ROOT).as_posix(), "runtimeSha256": digest(runtime)})

    manifest = {"version": 1, "style": "3D Soft Neomorphism", "roles": list(ROLES), "assets": entries}
    (SOURCE / "manifest.json").write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

    review = Image.new("RGB", (5 * 184 + 170, 9 * 164 + 58), "#edf0f2")
    painter = ImageDraw.Draw(review)
    font = ImageFont.truetype(str(FONT), 19)
    small = ImageFont.truetype(str(FONT), 16)
    for column, role in enumerate(ROLES):
        painter.text((170 + column * 184 + 92, 29), role.upper(), font=small, fill="#263849", anchor="mm")
    for row, theme in enumerate(item for item in THEMES if item["id"] != "dark"):
        name = theme["id"]
        painter.text((14, 58 + row * 164 + 78), name.upper(), font=font, fill="#263849", anchor="lm")
        surface = rgb(theme["paletteHex"]["surface"])
        for column, role in enumerate(ROLES):
            x, y = 170 + column * 184, 58 + row * 164
            painter.rounded_rectangle((x, y, x + 174, y + 154), radius=20, fill=surface)
            asset = Image.open(WWW / "assets/theme-packs" / name / "canonical/online-random-states" / f"{role}-v1.png")
            asset.thumbnail((135, 135), Image.Resampling.LANCZOS)
            review.paste(asset, (x + (174 - asset.width) // 2, y + (154 - asset.height) // 2), asset)
    output = ROOT / "docs/theme-online-random-states-review.png"
    review.save(output, optimize=True)
    print(f"Created {len(entries)} PNG assets and {output}")


if __name__ == "__main__":
    main()
