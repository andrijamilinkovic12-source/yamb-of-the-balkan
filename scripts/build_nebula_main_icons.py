from pathlib import Path

from PIL import Image, ImageFilter, ImageOps


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "www" / "assets" / "severna-soft-clay"


SOURCES = {
    "daily-challenge-pro.png": ROOT / "www/assets/desert-soft-clay/daily-challenge-pro.png",
    "leaderboard-pro.png": ROOT / "www/assets/desert-soft-clay/leaderboard-pro.png",
    "statistics-pro.png": ROOT / "www/assets/desert-soft-clay/statistics-pro.png",
    "settings-pro.png": ROOT / "www/assets/desert-soft-clay/settings-pro.png",
    "rules-pro.png": ROOT / "www/assets/desert-soft-clay/rules-pro.png",
    "mode-solo-pro.png": ROOT / "www/assets/desert-soft-clay/mode-solo-pro.png",
    "mode-hotseat-pro.png": ROOT / "www/assets/desert-soft-clay/mode-hotseat-pro.png",
    "mode-opponent-pro.png": ROOT / "www/assets/desert-soft-clay/mode-opponent-pro.png",
    "mode-invite-pro.png": ROOT / "www/assets/desert-soft-clay/mode-invite-pro.png",
    "global-chat-pro.png": ROOT / "www/assets/desert-soft-clay/global-chat-pro.png",
    "global-chat-empty-pro.png": ROOT / "www/assets/desert-soft-clay/global-chat-empty-pro.png",
    "global-chat-send-pro.png": ROOT / "www/assets/desert-soft-clay/global-chat-send-pro.png",
    "online-players-pro.png": ROOT / "www/assets/desert-soft-clay/online-players-pro.png",
    "online-add-friend-pro.png": ROOT / "www/assets/desert-soft-clay/online-add-friend-pro.png",
    "online-spectate-pro.png": ROOT / "www/assets/desert-soft-clay/online-spectate-pro.png",
    "online-duel-pro.png": ROOT / "www/assets/desert-soft-clay/online-duel-pro.png",
    "online-players-state-pro.png": ROOT / "www/assets/desert-soft-clay/online-players-state-pro.png",
    "quarterly-league-yotb-ql-pro.png": ROOT / "www/assets/desert-soft-clay/quarterly-league-yotb-ql-pro.png",
    "ducats-undo-pro.png": ROOT / "www/assets/desert-soft-clay/ducats-undo-pro.png",
    "treasury-pro.png": ROOT / "www/assets/desert-soft-clay/treasury-pro.png",
    "tournament-pro.png": ROOT / "www/assets/desert-soft-clay/tournament-pro.png",
}


def tone_icon(src: Path, dst: Path) -> None:
    image = Image.open(src).convert("RGBA")
    rgb = image.convert("RGB")
    alpha = image.getchannel("A")

    gray = ImageOps.grayscale(rgb)
    # Cooler than Desert, less ornamental than Easter: midnight shadows, icy cyan
    # body, lavender high notes.
    colorized = ImageOps.colorize(
        gray,
        black="#09152b",
        white="#ecfeff",
        mid="#69d8ef",
        blackpoint=10,
        whitepoint=244,
        midpoint=132,
    ).convert("RGBA")

    violet = Image.new("RGBA", image.size, "#a88cff00")
    violet_alpha = gray.point(lambda p: int(max(0, p - 142) * 0.58))
    violet.putalpha(Image.composite(violet_alpha, Image.new("L", image.size, 0), alpha))
    colorized = Image.alpha_composite(colorized, violet)

    # Preserve matte depth with a cool inner shadow and a restrained outer glow.
    glow_alpha = alpha.filter(ImageFilter.GaussianBlur(14)).point(lambda p: int(p * 0.42))
    glow = Image.new("RGBA", image.size, "#71f6ff")
    glow.putalpha(glow_alpha)

    shadow_alpha = alpha.filter(ImageFilter.GaussianBlur(8)).point(lambda p: int(p * 0.32))
    shadow = Image.new("RGBA", image.size, "#020714")
    shadow.putalpha(shadow_alpha)

    highlight_alpha = gray.point(lambda p: int(max(0, p - 184) * 0.48))
    highlight = Image.new("RGBA", image.size, "#ffffff")
    highlight.putalpha(Image.composite(highlight_alpha, Image.new("L", image.size, 0), alpha))

    body = colorized
    body.putalpha(alpha)

    final = Image.new("RGBA", image.size, (0, 0, 0, 0))
    final = Image.alpha_composite(final, shadow)
    final = Image.alpha_composite(final, glow)
    final = Image.alpha_composite(final, body)
    final = Image.alpha_composite(final, highlight)
    final.save(dst)


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    for name, src in SOURCES.items():
        if not src.exists():
            raise FileNotFoundError(src)
        tone_icon(src, OUT / name)
        print(f"created {OUT / name}")


if __name__ == "__main__":
    main()
