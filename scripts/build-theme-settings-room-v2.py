"""Import individually generated Settings masters and make consistent production PNGs."""
from __future__ import annotations

from hashlib import sha256
import json
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'source-assets/theme-settings-room-v2'
PRODUCTION = ROOT / 'www/assets/theme-packs'
ROLES = ('profile', 'display-theme', 'language', 'terms', 'privacy')
THEMES = ('light', 'medium', 'winter', 'neon', 'amethyst', 'easter', 'desert', 'moon', 'severna')
ICON_SIZE = 256


def trim_and_center(image: Image.Image) -> Image.Image:
    rgba = image.convert('RGBA')
    alpha = rgba.getchannel('A')
    bbox = alpha.getbbox()
    if not bbox:
        raise ValueError('Transparent master has no visible pixels')
    rgba = rgba.crop(bbox)
    side = max(rgba.size)
    # Preserve the original geometry and leave an 8% optical margin.
    content = round(ICON_SIZE * 0.84)
    size = (round(rgba.width * content / side), round(rgba.height * content / side))
    rgba = rgba.resize(size, Image.Resampling.LANCZOS)
    canvas = Image.new('RGBA', (ICON_SIZE, ICON_SIZE), (0, 0, 0, 0))
    canvas.alpha_composite(rgba, ((ICON_SIZE - size[0]) // 2, (ICON_SIZE - size[1]) // 2))
    return canvas


def main() -> None:
    imported = SOURCE / 'generated-sources.json'
    items = json.loads(imported.read_text(encoding='utf-8'))['entries'] if imported.exists() else []
    by_key = {(item['theme'], item['role']): item for item in items}
    manifest = {'version': 2, 'style': '3D Soft Neomorphism', 'productionSize': [ICON_SIZE, ICON_SIZE], 'assets': []}
    for theme in THEMES:
        for role in ROLES:
            master = SOURCE / 'masters' / theme / f'{role}-master-v2.png'
            master.parent.mkdir(parents=True, exist_ok=True)
            if not master.exists():
                src = Path(by_key[(theme, role)]['source'])
                if not src.is_file():
                    raise FileNotFoundError(src)
                master.write_bytes(src.read_bytes())
            with Image.open(master) as image:
                output = trim_and_center(image)
            dest = PRODUCTION / theme / 'canonical/settings-controls' / f'{role}-v2.png'
            dest.parent.mkdir(parents=True, exist_ok=True)
            output.save(dest, 'PNG', optimize=True)
            manifest['assets'].append({
                'theme': theme, 'role': role,
                'master': master.relative_to(ROOT).as_posix(),
                'production': dest.relative_to(ROOT).as_posix(),
                'sha256': sha256(dest.read_bytes()).hexdigest(),
            })
    (SOURCE / 'manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(f'Built {len(manifest["assets"])} unique Settings PNGs.')


if __name__ == '__main__':
    main()
