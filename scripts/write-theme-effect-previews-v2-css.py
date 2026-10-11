"""Write the nine themed CSS bindings for 16 individually illustrated PNG previews."""

import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
DEFINITIONS = json.loads((ROOT / "docs/theme-definitions.json").read_text(encoding="utf-8"))
THEMES = [theme for theme in DEFINITIONS["themes"] if theme["id"] != "dark"]
CLASSES = {
    "confetti": "confetti", "gold-rain": "gold_rain", "wedding": "balkan",
    "thunder": "thunder", "fireworks": "fireworks", "bubbles": "bubbles",
    "cosmic-dust": "cosmic-dust", "dragon-fire": "dragon-fire",
    "royal-yamb": "royal-yamb", "fireflies": "fireflies", "ice-age": "glass",
    "black-hole": "black-hole", "supernova": "supernova",
    "neon-pulse": "neon", "drones": "drones", "ufo-abduction": "ufo-abduction",
}


def rgb(value):
    return tuple(int(value[index:index + 2], 16) for index in (1, 3, 5))


def mix(a, b, ratio):
    return "#" + "".join(f"{round(x * (1 - ratio) + y * ratio):02x}"
                         for x, y in zip(rgb(a), rgb(b)))


def main():
    roles = ", ".join(f".prev-{name}" for name in CLASSES.values())
    lines = ["/* Sixteen individually illustrated transparent PNG effect previews per non-Green theme. */"]
    for theme in THEMES:
        tid = theme["id"]
        colors = theme["iconDna"]["colorsHex"]
        surface = mix(colors["shade"], colors["body"], .18 if tid in ("light", "easter") else .32)
        root = f"body.{tid}-theme #riznica-screen#riznica-screen .effect-preview-box"
        group = f"{root}:is({roles})"
        lines.append(f"{group} {{ isolation: isolate; overflow: hidden; border: 0; background: {surface} !important; box-shadow: inset 0 2px 8px {colors['shade']}66 !important; }}")
        lines.append(f"{group}::before {{ content: '' !important; display: block !important; position: absolute; inset: 2px; width: auto; height: auto; background-color: transparent !important; background-repeat: no-repeat; background-position: center; background-size: contain; border: 0; box-shadow: none !important; opacity: 1 !important; transform: none !important; animation: none !important; filter: none !important; z-index: 2; }}")
        lines.append(f"{group}::after {{ content: none !important; display: none !important; animation: none !important; }}")
        for role, css_class in CLASSES.items():
            src = f"assets/theme-packs/{tid}/canonical/treasury-effect-previews/preview-{role}-v1.png?v=2"
            lines.append(f'{root}.prev-{css_class}::before {{ background-image: url("{src}") !important; }}')
    green_selector = "body:not(:is(.light-theme, .medium-theme, .winter-theme, .neon-theme, .amethyst-theme, .easter-theme, .desert-theme, .moon-theme, .severna-theme)) #riznica-screen#riznica-screen .effect-preview-box"
    for role in ("confetti", "gold-rain"):
        css_class = CLASSES[role]
        target = f"{green_selector}.prev-{css_class}"
        src = f"assets/green-soft-clay/canonical/treasury-effect-previews/preview-{role}-v1.png?v=2"
        lines.append(f'{target}::before {{ content: "" !important; position: absolute; inset: 2px; display: block !important; width: auto; height: auto; background: transparent url("{src}") center / contain no-repeat !important; opacity: 1 !important; transform: none !important; animation: none !important; filter: none !important; }}')
        lines.append(f'{target}::after {{ content: none !important; display: none !important; }}')
    (ROOT / "www/theme-effect-previews.css").write_text("\n".join(lines) + "\n", encoding="utf-8")
    print("Bound 144 separately illustrated PNG previews to 16 Treasury effects across nine themes")


if __name__ == "__main__":
    main()
