"""Record the verified Global Chat PNG delivery without changing other room progress."""

from __future__ import annotations

import json
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
THEMES = ("light", "medium", "winter", "neon", "amethyst", "easter", "desert", "moon", "severna")
PENDING_ANDROID: set[str] = set()
REPORT = "docs/qa-theme-global-chat-emulator.json"
REVIEW = "docs/theme-global-chat-room-review.html"


def read(relative: str) -> dict:
    return json.loads((ROOT / relative).read_text(encoding="utf-8"))


def write(relative: str, value: dict) -> None:
    (ROOT / relative).write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


qa = read(REPORT)
assert [row["theme"] for row in qa] == ["dark", *THEMES]
implementation = read("docs/theme-asset-implementation-map.json")
progress = read("docs/theme-progress.json")
impl_by_theme = {item["themeId"]: item for item in implementation["themes"]}
progress_by_theme = {item["themeId"]: item for item in progress["themes"]}

for theme_id in THEMES:
    manifest_path = f"source-assets/theme-icon-packs/{theme_id}/global-chat-internal-v1/manifest.json"
    manifest = read(manifest_path)
    assert manifest["themeId"] == theme_id and len(manifest["roles"]) == 2
    slots = impl_by_theme[theme_id]["slots"]
    for role in manifest["roles"]:
        image = Image.open(ROOT / role["runtime"]).convert("RGBA")
        assert image.size == (384, 384)
        optical_bounds = image.getchannel("A").point(lambda a: 255 if a >= 4 else 0).getbbox()
        assert optical_bounds
        slot = slots[role["catalogSlot"]]
        slot.update({
            "stage": "linked" if theme_id in PENDING_ANDROID else "verified",
            "productionPath": role["runtime"],
            "masterPath": role["master"],
            "consumerRefs": [
                "www/theme-main-room-icons.js:syncIcons #global-chat-overlay",
                "www/globalchat.js:renderHistoryState" if role["role"] == "empty" else "www/index.html:#btn-global-send",
                "www/game.js:getThemeRoomSources(globalChat)",
            ],
            "opticalBoundsPx": list(optical_bounds),
            "sizeBytes": role["runtimeBytes"],
        })
    progress_by_theme[theme_id]["surfaces"]["global-chat"] = (
        {"stage": "linked", "evidence": [manifest_path, REVIEW]}
        if theme_id in PENDING_ANDROID else
        {"stage": "visually-checked", "evidence": [manifest_path, REPORT, f"docs/theme-global-chat-qa/{theme_id}.png", "docs/theme-global-chat-android-review.png", REVIEW]}
    )

progress["updatedOn"] = "2026-10-12"
progress["activeThemeId"] = None
progress["workState"] = "global-chat-visual-review-pending"
progress["activeWorkPackage"] = (
    "Global Chat: svih 18 unutrasnjih PNG su sada originalni, novi za svojih devet tema. Prethodno "
    "zadrzani Vaskrsnja empty, Pustinjsko staklo empty/send i Severna maglina empty/send su "
    "zamenjeni. Produkcioni PNG i reference su povezani; novi Android qaLocal je potvrdio "
    "svih deset tema, uloge ikona, Green geometriju, kontrast i funkcionalna stanja. "
    "Korisnicko vizuelno prihvatanje jos nije dato."
)
progress["visualQualityBoundary"]["lastIndividuallyIllustratedFamily"] = "global-chat-internal-v1"
progress["globalChatRoomV1"] = {
    "themes": list(THEMES),
    "pngRolesPerTheme": 2,
    "newOriginalPngs": 18,
    "pendingAndroidThemes": sorted(PENDING_ANDROID),
    "roomIdentityRole": "previously canonical",
    "manifestRoot": "source-assets/theme-icon-packs/{theme}/global-chat-internal-v1/manifest.json",
    "review": REVIEW,
    "androidReview": "docs/theme-global-chat-android-review.png",
    "androidReport": REPORT,
    "visualAcceptance": "pending user review",
}
write("docs/theme-asset-implementation-map.json", implementation)
write("docs/theme-progress.json", progress)
print("Registered 18 original Global Chat PNGs and nine Android-verified rooms")
