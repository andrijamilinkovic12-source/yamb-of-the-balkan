"""Register linked splash logos in the theme asset map and progress tracker."""

import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
THEMES = ("light", "medium", "winter", "neon", "amethyst", "easter", "desert", "moon", "severna")


def update_json(path: Path, update) -> None:
    data = json.loads(path.read_text(encoding="utf-8"))
    update(data)
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def update_map(data: dict) -> None:
    for theme in data["themes"]:
        theme_id = theme["themeId"]
        if theme_id not in THEMES:
            continue
        production = f"www/assets/theme-packs/{theme_id}/splash-title-soft-clay-v1.png"
        master = f"source-assets/theme-logo-masters/{theme_id}/game-logo-master-v1.png"
        slot = theme["slots"]["splash-title-soft-clay-v1"]
        slot.update(
            stage="linked",
            productionPath=production,
            masterPath=master,
            consumerRefs=[
                "www/index.html:#splash-screen startup preload",
                "www/game.js:getThemeSplashSource, configureThemeSplashImage",
            ],
            sizeBytes=(ROOT / production).stat().st_size,
        )


def update_progress(data: dict) -> None:
    for theme in data["themes"]:
        theme_id = theme["themeId"]
        if theme_id in THEMES:
            theme["visualEvidence"]["logoPng"] = (
                f"www/assets/theme-packs/{theme_id}/splash-title-soft-clay-v1.png"
            )
        elif theme_id == "dark":
            theme["visualEvidence"]["logoPng"] = "www/assets/green-soft-clay/splash-title-soft-clay-v2.png"
    old_status = (
        " Svih devet nezelenih tema sada ima originalni PNG logo igre 1672×941 "
        "povezan sa splash ekranom i pregledom na prihvacenim pozadinama; Zelena ostaje referenca."
    )
    logo_status = (
        " Svih deset tema ima originalni PNG logo igre 1672×941 na splash i login ekranu, "
        "bez starih tekstualnih logotipa; Green v2 je samostalni Clay natpis bez oblacica."
    )
    data["activeWorkPackage"] = data["activeWorkPackage"].replace(old_status, "")
    if logo_status.strip() not in data["activeWorkPackage"]:
        data["activeWorkPackage"] += logo_status


if __name__ == "__main__":
    update_json(ROOT / "docs" / "theme-asset-implementation-map.json", update_map)
    update_json(ROOT / "docs" / "theme-progress.json", update_progress)
