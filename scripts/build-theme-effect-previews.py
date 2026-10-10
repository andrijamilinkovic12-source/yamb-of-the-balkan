"""Build distinct Treasury celebration preview illustrations for the nine non-Green themes.

Every scene is drawn from shapes, with its own theme geometry and material. The
Green previews are reference geometry only and are never used as source pixels.
"""

from __future__ import annotations

import hashlib
import json
import math
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageFilter
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
DEFS = json.loads((ROOT / "docs/theme-definitions.json").read_text(encoding="utf-8"))
THEMES = [t for t in DEFS["themes"] if t["id"] != "dark"]
ROLES = (
    "wedding", "thunder", "fireworks", "bubbles", "cosmic-dust",
    "dragon-fire", "royal-yamb", "fireflies", "ice-age", "black-hole",
    "supernova", "neon-pulse", "drones", "ufo-abduction",
)
W, H = 768, 512
SCALE = 2


def rgb(value):
    return tuple(int(value[i:i + 2], 16) for i in (1, 3, 5))


def mix(a, b, t):
    return tuple(round(x * (1 - t) + y * t) for x, y in zip(a, b))


def color(theme, key):
    return rgb(theme["iconDna"]["colorsHex"][key])


def mask():
    return Image.new("L", (W, H))


def polygon(points):
    m = mask()
    ImageDraw.Draw(m).polygon(points, fill=255)
    return m


def ellipse(box, width=0):
    m = mask()
    d = ImageDraw.Draw(m)
    if width:
        d.ellipse(box, outline=255, width=width)
    else:
        d.ellipse(box, fill=255)
    return m


def line(points, width=18, joint="curve"):
    m = mask()
    d = ImageDraw.Draw(m)
    d.line(points, fill=255, width=width, joint=joint)
    if joint == "curve":
        r = width // 2
        for x, y in (points[0], points[-1]):
            d.ellipse((x-r, y-r, x+r, y+r), fill=255)
    return m


def rounded(box, radius=24):
    m = mask()
    ImageDraw.Draw(m).rounded_rectangle(box, radius=radius, fill=255)
    return m


def star(cx, cy, outer, inner, rays, phase=-math.pi/2):
    return polygon([(cx + (outer if i % 2 == 0 else inner) * math.cos(phase + math.pi*i/rays),
                     cy + (outer if i % 2 == 0 else inner) * math.sin(phase + math.pi*i/rays))
                    for i in range(rays * 2)])


def arc(box, start, end, width):
    m = mask()
    ImageDraw.Draw(m).arc(box, start, end, fill=255, width=width)
    return m


def painted(canvas, shape, theme, tone="body", shadow=True, opacity=255):
    base = color(theme, tone)
    light = color(theme, "light")
    shade = color(theme, "shade")
    clay = theme["direction"] == "clay"
    if shadow:
        shadow_mask = Image.new("L", (W, H))
        shadow_mask.paste(shape, (8, 12))
        shadow_mask = shadow_mask.filter(ImageFilter.GaussianBlur(13 if clay else 9))
        shadow_layer = Image.new("RGBA", (W, H), (*shade, 0))
        shadow_layer.putalpha(shadow_mask.point(lambda a: round(a * .30)))
        canvas.alpha_composite(shadow_layer)
    top = mix(base, light, .46 if clay else .35)
    bottom = mix(base, shade, .36 if clay else .26)
    positions = np.linspace(0, 1, H, dtype=np.float32)[:, None]
    gradient = np.asarray(top, dtype=np.float32)[None, :] * (1 - positions) + np.asarray(bottom, dtype=np.float32)[None, :] * positions
    pixels = np.zeros((H, W, 4), dtype=np.uint8)
    pixels[:, :, :3] = np.rint(gradient).astype(np.uint8)[:, None, :]
    pixels[:, :, 3] = (np.asarray(shape, dtype=np.uint16) * opacity // 255).astype(np.uint8)
    layer = Image.fromarray(pixels, "RGBA")
    canvas.alpha_composite(layer)
    edge = ImageChops.subtract(shape, shape.filter(ImageFilter.MinFilter(7 if clay else 5)))
    edge_layer = Image.new("RGBA", (W, H), (*light, 0))
    edge_layer.putalpha(edge.point(lambda a: round(a * (.24 if clay else .17) * opacity / 255)))
    canvas.alpha_composite(edge_layer)


def theme_signature(canvas, theme, variant):
    """One quiet geometric cue owned by each theme, behind the semantic motif."""
    tid = theme["id"]
    if tid == "light":
        painted(canvas, arc((130, 248, 642, 490), 197, 343, 34), theme, "accent", False, 195)
        painted(canvas, rounded((151, 410, 616, 434), 12), theme, "shade", False, 115)
    elif tid == "medium":
        p = [(127, 413), (211, 391), (302, 420), (403, 397), (505, 414), (630, 381),
             (597, 447), (177, 458)]
        painted(canvas, polygon(p), theme, "accent", False, 145)
    elif tid == "winter":
        painted(canvas, arc((78, 326, 440, 504), 190, 337, 30), theme, "light", False, 185)
        painted(canvas, arc((350, 349, 706, 516), 194, 340, 27), theme, "accent", False, 155)
    elif tid == "neon":
        painted(canvas, line([(90, 411), (157, 411), (186, 440), (585, 440), (617, 408), (678, 408)], 12), theme, "light", False, 180)
        for x in (91, 677):
            painted(canvas, ellipse((x-12, 396, x+12, 420)), theme, "accent", False)
    elif tid == "amethyst":
        painted(canvas, polygon([(142, 411), (229, 382), (539, 382), (626, 411),
                                 (550, 447), (218, 447)]), theme, "accent", False, 160)
    elif tid == "easter":
        painted(canvas, arc((160, 286, 608, 488), 195, 345, 29), theme, "shade", False, 160)
        for x, y in ((201, 400), (583, 394)):
            painted(canvas, ellipse((x-16, y-27, x+16, y+27)), theme, "accent", False, 180)
    elif tid == "desert":
        painted(canvas, polygon([(109, 423), (216, 398), (324, 422), (438, 393), (548, 420),
                                 (663, 401), (629, 450), (139, 450)]), theme, "accent", False, 170)
    elif tid == "moon":
        painted(canvas, arc((98, 331, 670, 492), 190, 349, 35), theme, "light", False, 120)
        for x, y, r in ((190, 419, 12), (594, 418, 9)):
            painted(canvas, ellipse((x-r, y-r, x+r, y+r)), theme, "shade", False, 165)
    else:  # severna
        painted(canvas, arc((89, 246, 688, 490), 199, 338, 31), theme, "accent", False, 145)
        painted(canvas, arc((147, 257, 643, 476), 203, 334, 18), theme, "light", False, 130)


def draw_role(canvas, theme, role, variant):
    tid = theme["id"]
    dx = (-18, -9, 12, 0, 17, -12, 8, 1, 11)[variant]
    c = 384 + dx
    soft = theme["direction"] == "clay"
    a = lambda s, tone="body", shadow=True, opacity=255: painted(canvas, s, theme, tone, shadow, opacity)

    if role == "wedding":
        # Each theme has its own pair arrangement and band construction.
        layouts = [(-183, 5, -13, 181, 172, 154), (-177, 0, -42, 159, 184, 136),
                   (-203, -10, -12, 190, 198, 155), (-192, 1, -6, 184, 163, 163),
                   (-171, 23, -13, 183, 152, 190), (-172, 11, -29, 163, 180, 139),
                   (-186, 18, -24, 194, 194, 155), (-189, 6, -47, 174, 175, 146),
                   (-173, 0, -18, 181, 138, 145)]
        l1, r1, l2, r2, top1, top2 = layouts[variant]
        a(ellipse((c+l1, top1, c+r1, top1+(174 if variant in (1, 6) else 194)), 47 if soft else 32), "accent")
        a(ellipse((c+l2, top2, c+r2, top2+(204 if variant in (4, 8) else 182)), 45 if soft else 31), "light")
        if variant in (0, 2, 5):
            a(polygon([(c-155, 333), (c-20, 378), (c+25, 362), (c+156, 328),
                       (c+123, 401), (c-112, 403)]), "body", False, 170)
        elif variant in (3, 7):
            a(line([(c-104, 360), (c+92, 360)], 21), "accent", False)
        else:
            a(arc((c-154, 259, c+150, 415), 5, 172, 21), "body", False)
    elif role == "thunder":
        cloud_shift = (-32, 16, -11, 34, -23, 21, -42, 30, 0)[variant]
        a(ellipse((c-165+cloud_shift, 145, c-4+cloud_shift, 249)), "body")
        a(ellipse((c-45+cloud_shift, 117, c+142+cloud_shift, 253)), "body")
        a(rounded((c-175+cloud_shift, 200, c+160+cloud_shift, 271), 34), "body", False)
        skew = (-15, 33, -24, 50, -37, 26, -11, 38, -30)[variant]
        bolt = [(c+25+skew, 180), (c-90+skew, 332), (c-9+skew, 327),
                (c-55-skew//2, 415), (c+123-skew//2, 266), (c+38+skew, 268), (c+83+skew, 187)]
        a(polygon(bolt), "accent")
    elif role == "fireworks":
        bursts = [((c-124, 248, 104), (c+107, 198, 71)),
                  ((c-83, 197, 83), (c+108, 285, 72), (c-142, 324, 36)),
                  ((c-131, 207, 78), (c+85, 219, 95)),
                  ((c-105, 268, 72), (c+108, 175, 92), (c+24, 329, 34)),
                  ((c-126, 196, 84), (c+134, 263, 91)),
                  ((c-112, 276, 80), (c+96, 197, 75), (c-4, 151, 40)),
                  ((c-98, 184, 76), (c+113, 279, 105)),
                  ((c-120, 244, 93), (c+122, 203, 58), (c+23, 150, 33)),
                  ((c-121, 196, 92), (c+111, 267, 73))][variant]
        for index, (x, y, r) in enumerate(bursts):
            a(star(x, y, r, 19 if soft else 11, 7 + (variant+index) % 5), "accent" if index % 2 == 0 else "light")
            a(ellipse((x-19, y-19, x+19, y+19)), "shade", False)
        a(line([(bursts[0][0]-16, bursts[0][1]+95), (bursts[0][0]+29, 399)], 13), "body", False)
    elif role == "bubbles":
        spread = [(-25, 15), (20, -18), (-40, 3), (30, 14), (-11, -21),
                  (35, -12), (-26, -20), (17, 24), (2, -15)][variant]
        sx, sy = spread
        circles = [(c-121+sx, 288+sy, 66), (c+46-sx, 223-sy, 96),
                   (c+151-sx//2, 325+sy//2, 49), (c-2+sx//2, 352-sy, 37)]
        if variant in (1, 3, 5, 7):
            circles = circles[:3] + [(c-171, 194, 29), (c+5, 363, 29)]
        for x, y, r in circles:
            a(ellipse((x-r, y-r, x+r, y+r), 22 if soft else 17), "light")
            a(arc((x-r+16, y-r+16, x+r-16, y+r-16), 194, 265, 12), "accent", False)
    elif role == "cosmic-dust":
        rise = (-28, 11, -9, 31, 5, -21, 20, -12, 27)[variant]
        a(arc((c-193, 127+rise, c+185, 374+rise), 145+variant*7, 340+variant*5, 36 if soft else 27), "body")
        a(arc((c-128, 178-rise, c+171, 371-rise), 31+variant*6, 219+variant*5, 19), "accent", False)
        for x, y, r in ((c-139, 210+rise, 18), (c-48, 146-rise//2, 16), (c+154, 244-rise, 26), (c+8, 330+rise//2, 21)):
            a(ellipse((x-r, y-r, x+r, y+r)), "light", False)
    elif role == "dragon-fire":
        lean = (-22, 16, -30, 35, -18, 26, -43, 14, -7)[variant]
        peak = (126, 161, 135, 149, 121, 158, 141, 113, 136)[variant]
        flame = [(c-111, 367), (c-144, 301), (c-99+lean, 218), (c-75, 281), (c-30+lean, peak),
                 (c+32, 238), (c+65-lean, 173), (c+94, 289), (c+131-lean, 228), (c+123, 359),
                 (c+71, 405), (c-64, 405)]
        a(polygon(flame), "accent")
        a(polygon([(c-63, 363), (c-20+lean//2, 276), (c+3, 319), (c+47-lean//2, 247),
                   (c+69, 368), (c+31, 398), (c-43, 396)]), "light", False)
    elif role == "royal-yamb":
        tip = (177, 151, 182, 143, 164, 195, 158, 172, 137)[variant]
        shoulder = (256, 269, 236, 282, 230, 254, 264, 242, 271)[variant]
        a(polygon([(c-171, tip), (c-112, shoulder), (c-42, 194+variant*3), (c+2, shoulder-11),
                   (c+80, 184-variant*4), (c+164, shoulder), (c+181, tip+variant*3),
                   (c+148, 360), (c-146, 360)]), "accent")
        a(rounded((c-142, 348, c+146, 388), 13 if tid == "neon" else 23), "shade", False)
        # Five dots are the shared dice rule, placed in a correct five-face.
        for x, y in ((c-39, 257), (c+38, 257), (c, 288), (c-39, 319), (c+38, 319)):
            a(ellipse((x-10, y-10, x+10, y+10)), "light", False)
    elif role == "fireflies":
        shift = (-18, 20, -35, 31, -5, 25, -16, 35, 0)[variant]
        bugs = [(c-116+shift, 251, 26), (c+16-shift, 174+shift//2, 24),
                (c+128, 284-shift//2, 28), (c-14+shift//2, 322, 21)]
        if variant in (2, 4, 6, 8):
            bugs = bugs[:3] + [(c-24, 357, 15), (c+158, 177, 18)]
        for x, y, r in bugs:
            a(ellipse((x-r-27, y-r+4, x-r+7, y+r-5)), "body", False, 195)
            a(ellipse((x+r-7, y-r+4, x+r+27, y+r-5)), "body", False, 195)
            a(ellipse((x-r, y-r, x+r, y+r)), "light")
            a(ellipse((x-7, y-7, x+7, y+7)), "accent", False)
    elif role == "ice-age":
        left_peak = (164, 188, 141, 173, 192, 155, 181, 148, 169)[variant]
        right_peak = (139, 165, 174, 116, 149, 189, 130, 167, 118)[variant]
        split = (-25, 12, -39, 28, 2, 35, -13, 24, -17)[variant]
        a(polygon([(c-177, 373), (c-70+split, left_peak), (c+6, 292),
                   (c+86+split//2, right_peak), (c+191, 372)]), "light")
        a(polygon([(c-70+split, left_peak), (c+6, 292), (c-12, 374), (c-161, 373)]), "body", False)
        a(polygon([(c+86+split//2, right_peak), (c+191, 372), (c+73, 372), (c+47, 215)]), "accent", False)
    elif role == "black-hole":
        radius = (157, 174, 143, 177, 155, 167, 149, 181, 158)[variant]
        h = (145, 132, 158, 122, 151, 127, 161, 139, 147)[variant]
        a(ellipse((c-radius, 263-h, c+radius, 263+h), 42 if soft else 33), "accent")
        a(ellipse((c-radius+47, 263-h+47, c+radius-47, 263+h-47)), "shade", False)
        a(arc((c-218, 173+variant*2, c+219, 377-variant*3), 192+variant*5, 350+variant*3, 25), "light", False)
    elif role == "supernova":
        a(star(c, 265, 157 + (variant % 3)*14, 63 if soft else 49,
               (7, 9, 11, 12, 8, 10, 13, 9, 14)[variant], phase=-math.pi/2+variant*.12), "accent")
        a(ellipse((c-66, 199, c+66, 331)), "light", False)
        a(ellipse((c-24, 241, c+24, 289)), "body", False)
    elif role == "neon-pulse":
        spike = (157, 198, 138, 185, 151, 218, 166, 130, 193)[variant]
        a(line([(c-216, 280), (c-149, 280), (c-111, 220+variant*3), (c-54, 360-variant*5),
                (c+7, spike), (c+69, 317+variant*4), (c+110, 256-variant*3), (c+214, 256)], 32 if soft else 25), "accent")
        for x, y in ((c-216, 280), (c+214, 256)):
            a(ellipse((x-16, y-16, x+16, y+16)), "light", False)
    elif role == "drones":
        drones = [((c-111, 234, 75), (c+118, 299, 59)),
                  ((c-135, 293, 65), (c+93, 200, 73)),
                  ((c-124, 258, 61), (c+10, 188, 54), (c+143, 288, 52)),
                  ((c-88, 205, 85), (c+133, 320, 52)),
                  ((c-128, 204, 57), (c+94, 291, 78)),
                  ((c-95, 300, 70), (c+113, 187, 67)),
                  ((c-148, 230, 54), (c+8, 309, 67), (c+145, 211, 49)),
                  ((c-122, 290, 63), (c+115, 205, 76)),
                  ((c-142, 270, 52), (c+8, 189, 65), (c+151, 303, 53))][variant]
        for x, y, size in drones:
            a(rounded((x-size//2, y-23, x+size//2, y+26), 19), "body")
            a(line([(x-size, y-17), (x+size, y-17)], 15), "accent", False)
            for rotor in (x-size, x+size):
                a(ellipse((rotor-35, y-40, rotor+35, y-25), 11), "light", False)
            a(ellipse((x-13, y-9, x+13, y+17)), "light", False)
    else:  # ufo-abduction
        tilt = (-19, 23, -31, 39, 0, 27, -23, 34, -11)[variant]
        a(polygon([(c-53+tilt, 275), (c+57+tilt, 275), (c+122-tilt, 409), (c-122-tilt, 409)]), "accent", False, 125)
        a(ellipse((c-171+tilt, 178, c+171+tilt, 292)), "body")
        a(ellipse((c-98+tilt, 131, c+98+tilt, 238)), "light")
        for x in (c-99+tilt, c+tilt, c+99+tilt):
            a(ellipse((x-15, 248, x+15, 278)), "accent", False)
        a(rounded((c-22-tilt, 349, c+22-tilt, 388), 9), "light", False)


def render(theme, role, variant):
    canvas = Image.new("RGBA", (W, H))
    theme_signature(canvas, theme, variant)
    draw_role(canvas, theme, role, variant)
    return canvas


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main():
    for variant, theme in enumerate(THEMES):
        tid = theme["id"]
        master_dir = ROOT / f"source-assets/theme-icon-packs/{tid}/treasury-effect-previews-v1"
        runtime_dir = ROOT / f"www/assets/theme-packs/{tid}/canonical/treasury-effect-previews"
        master_dir.mkdir(parents=True, exist_ok=True)
        runtime_dir.mkdir(parents=True, exist_ok=True)
        catalog = []
        for role in ROLES:
            master_image = render(theme, role, variant)
            image = master_image.resize((384, 256), Image.Resampling.LANCZOS)
            master = master_dir / f"preview-{role}-master-v1.png"
            runtime = runtime_dir / f"preview-{role}-v1.png"
            master_image.save(master, optimize=True)
            image.save(runtime, optimize=True)
            bounds = image.getchannel("A").point(lambda alpha: 255 if alpha >= 16 else 0).getbbox()
            catalog.append({"id": role,
                            "master": master.relative_to(ROOT).as_posix(),
                            "masterSha256": sha(master),
                            "runtime": runtime.relative_to(ROOT).as_posix(),
                            "runtimeSha256": sha(runtime),
                            "opticalBoundsPx": list(bounds) if bounds else None,
                            "sizeBytes": runtime.stat().st_size})
        manifest = {"id": f"{tid}-treasury-effect-previews", "version": 1,
                    "style": theme["style"], "direction": theme["direction"],
                    "format": "transparent RGBA PNG", "masterSize": [768, 512],
                    "runtimeSize": [384, 256],
                    "catalog": catalog}
        (master_dir / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        print(tid, len(catalog))


if __name__ == "__main__":
    main()
