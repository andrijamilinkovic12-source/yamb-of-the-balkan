"""Bake front, left and right flight cycles from the theme artwork (no runtime warping)."""
from pathlib import Path

from PIL import Image, ImageDraw, ImageOps

ROOT = Path(__file__).resolve().parents[1]
CELL = 112
# Wing attachment height across each original 256px drawing. Zero pins the head
# and antennae; pixels below the attachment line (body and tail) never move.
RIGS = {
    "dark": [(0,158),(86,154),(128,139),(144,0),(255,0)],
    "light": [(0,0),(85,0),(110,112),(132,142),(184,152),(255,151)],
    "medium": [(0,0),(88,0),(105,117),(135,135),(173,147),(255,154)],
    "winter": [(0,0),(90,0),(106,105),(128,137),(166,151),(255,157)],
    "neon": [(0,0),(64,0),(90,62),(120,110),(153,128),(255,137)],
    "amethyst": [(0,135),(93,132),(136,118),(151,0),(177,0),(195,110),(255,97)],
    "easter": [(0,141),(88,137),(122,128),(140,0),(200,0),(213,128),(255,115)],
    "desert": [(0,0),(79,0),(99,102),(119,131),(170,155),(255,158)],
    "moon": [(0,0),(85,0),(103,78),(125,130),(169,141),(255,149)],
    "severna": [(0,160),(81,155),(138,136),(159,0),(255,0)],
}
FRONT = [(0,153),(70,153),(95,143),(105,0),(151,0),(161,143),(186,153),(255,153)]
RIGHT_FACING = {"dark", "easter", "amethyst", "severna"}


def frame(image, rig, amount):
    mesh = []
    for (x0,h0),(x1,h1) in zip(rig, rig[1:]):
        for x in range(x0, x1 + int(x1 == 255)):
            h = round(h0 + (h1-h0)*(x-x0)/(x1-x0))
            if h:
                top = h - h / (1 - .58 * amount)
                mesh.append(((x,0,x+1,h), (x,top,x,h,x+1,h,x+1,top)))
            mesh.append(((x,h,x+1,256), (x,h,x,256,x+1,256,x+1,h)))
    return image.transform(image.size, Image.Transform.MESH, mesh, Image.Resampling.BICUBIC)


def main():
    sheet = Image.open(ROOT / "source-assets/theme-live-fireflies-v1/front-views-v2.png").convert("RGBA")
    for i, (theme, rig) in enumerate(RIGS.items()):
        assets = ROOT / "www/assets" / ("green-soft-clay" if theme == "dark" else f"theme-packs/{theme}") / "canonical/effects"
        side = Image.open(assets / "firefly-v1.png").convert("RGBA")
        x, y = i % 5, i // 5
        tile = sheet.crop((round(sheet.width*x/5), round(sheet.height*y/2),
                           round(sheet.width*(x+1)/5), round(sheet.height*(y+1)/2)))
        bounds = tile.getchannel("A").point(lambda a: 255 if a >= 64 else 0).getbbox()
        face = tile.crop(bounds)
        face.thumbnail((216,216), Image.Resampling.LANCZOS)
        front = Image.new("RGBA", (256,256))
        front.alpha_composite(face, ((256-face.width)//2, (256-face.height)//2))
        guard = Image.new("L", front.size)
        ImageDraw.Draw(guard).polygon([(72,0),(184,0),(184,70),(162,92),(152,114),
                                       (104,114),(94,92),(72,70)], fill=255)
        antennae = Image.new("RGBA", front.size)
        antennae.paste(front, mask=guard)
        front.paste((0,0,0,0), mask=guard)
        atlas = Image.new("RGBA", (5*CELL,3*CELL))
        for col, amount in enumerate((0,.25,.5,.75,1)):
            angled = frame(side, rig, amount)
            left = ImageOps.mirror(angled) if theme in RIGHT_FACING else angled
            forward = frame(front, FRONT, amount)
            forward.alpha_composite(antennae)
            for row, pose in enumerate((forward, left, ImageOps.mirror(left))):
                atlas.paste(pose.resize((CELL,CELL), Image.Resampling.LANCZOS), (col*CELL,row*CELL))
        target = assets / "firefly-flight-v2.png"
        atlas.save(target, optimize=True)
        print(theme, target.stat().st_size)


if __name__ == "__main__":
    main()
