"""Register the verified Online Players PNG roles in the theme inventory."""

from __future__ import annotations

import json
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
THEMES = ("light", "medium", "winter", "neon", "amethyst", "easter", "desert", "moon", "severna")
ROLES = ("state", "search", "friend", "spectate", "duel", "avatar")
OLD_SLOTS = ("online-add-friend-v1", "online-duel-v1", "online-players-state-v1", "online-spectate-v1")


def read(relative: str) -> dict:
    return json.loads((ROOT / relative).read_text(encoding="utf-8"))


def write(relative: str, value: dict) -> None:
    (ROOT / relative).write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


catalog = read("docs/theme-asset-role-catalog.json")
implementation = read("docs/theme-asset-implementation-map.json")
progress = read("docs/theme-progress.json")
qa = read("docs/qa-theme-online-players-room.json")
assert [row["theme"] for row in qa] == ["dark", *THEMES]
for row in qa:
    assert row.get("geometryMismatches", []) == []
    assert row["cards"] == 2 and row["searchCount"] == 1
    assert row["emptyState"]["natural"] == [256, 256]
    assert row["emptyState"]["visible"] == "visible"
    assert all(image["natural"][0] > 0 and image["natural"][1] > 0 for image in row["images"])
assert catalog["requiredPngCountPerTheme"] == 191
catalog_ids = [slot["id"] for slot in catalog["slots"]]
assert len(catalog_ids) == 191 and len(set(catalog_ids)) == 191
assert not set(OLD_SLOTS).intersection(catalog_ids)
assert all(f"canonical/online-players-internal/{role}-v1" in catalog_ids for role in ROLES)

for theme in implementation["themes"]:
    theme_id = theme["themeId"]
    assert theme_id in THEMES
    manifest = read(f"source-assets/theme-icon-packs/{theme_id}/online-players-internal-v1/manifest.json")
    assert list(manifest["roles"]) == list(ROLES)
    slots = theme["slots"]
    for old in OLD_SLOTS:
        slots.pop(old, None)
    for role in ROLES:
        item = manifest["roles"][role]
        image = Image.open(ROOT / item["production"]).convert("RGBA")
        assert list(image.size) == item["size"]
        bounds = image.getchannel("A").point(lambda a: 255 if a >= 4 else 0).getbbox()
        assert bounds
        slot_id = f"canonical/online-players-internal/{role}-v1"
        slots[slot_id] = {
            "stage": "verified",
            "productionPath": item["production"],
            "masterPath": item["master"],
            "consumerRefs": [
                "www/theme-online-players-room.js:apply",
                "www/onlinenumber.js:renderOnlinePlayersList" if role != "search" else "www/index.html:#online-players-search-icon",
                "www/game.js:getThemeRoomSources(onlinePlayers)",
            ],
            "opticalBoundsPx": list(bounds),
            "sizeBytes": (ROOT / item["production"]).stat().st_size,
        }
    theme["slots"] = {slot_id: slots[slot_id] for slot_id in catalog_ids}
    assert len(theme["slots"]) == 191

implementation["requiredSlotCountPerTheme"] = 191
progress_by_theme = {item["themeId"]: item for item in progress["themes"]}
for theme_id in THEMES:
    progress_by_theme[theme_id]["surfaces"]["online-players"] = {
        "stage": "visually-checked",
        "evidence": [
            f"source-assets/theme-icon-packs/{theme_id}/online-players-internal-v1/manifest.json",
            "docs/qa-theme-online-players-room.json",
            f"docs/theme-online-players-qa/{theme_id}.png",
            "docs/theme-online-players-room-review.html",
        ],
    }
    slot_values = implementation["themes"][THEMES.index(theme_id)]["slots"].values()
    progress_by_theme[theme_id]["assetUsageAudit"]["confirmedSlotCount"] = sum(
        item["stage"] == "verified" for item in slot_values
    )
    progress_by_theme[theme_id]["assetUsageAudit"]["measuredThemeBoundsCount"] = sum(
        bool(item["opticalBoundsPx"]) for item in implementation["themes"][THEMES.index(theme_id)]["slots"].values()
    )

progress["updatedOn"] = "2026-10-12"
progress["workState"] = "online-players-visual-review-pending"
progress["activeWorkPackage"] = (
    "Online igraci: sest novih kanonskih PNG uloga za svaku od deset tema (60 ukupno) "
    "zamenjuje cetiri prethodne uloge. Glavna ikona sobe ostaje ranije odobrena. "
    "Green geometrija, aktivna paleta, ucitavanje pri ulasku i promeni teme, pretraga, "
    "privatnost akcija i izgled svih deset tema provereni su u Android qaLocal. "
    "Korisnicko vizuelno prihvatanje je na cekanju."
)
progress["visualQualityBoundary"]["lastIndividuallyIllustratedFamily"] = "online-players-internal-v1"
progress["onlinePlayersRoomV1"] = {
    "themes": ["dark", *THEMES],
    "pngRolesPerTheme": 6,
    "newOriginalPngs": 60,
    "individuallyGeneratedMasters": 60,
    "replacedProceduralControls": 50,
    "generationMethod": "one separate built-in ImageGen call per theme and semantic PNG role",
    "roomIdentityRole": "previously canonical",
    "manifestRoot": "source-assets/theme-icon-packs/{theme}/online-players-internal-v1/manifest.json",
    "promptSet": "source-assets/theme-icon-packs/online-players-internal-v1-prompts.md",
    "assetContactSheet": "docs/theme-online-players-assets-review.png",
    "review": "docs/theme-online-players-room-review.html",
    "androidReport": "docs/qa-theme-online-players-room.json",
    "smallScreenAndroidReport": "docs/qa-theme-online-players-room-320x568.json",
    "largeFontAndroidReport": "docs/qa-theme-online-players-room-320x568-font130.json",
    "tabletAndroidReport": "docs/qa-theme-online-players-room-768x1024.json",
    "layoutStatus": "Android qaLocal: svih devet tema ima Green geometriju sobe, kartica, pretrage i akcija na 320 x 568 sa 100% i 130% fontom, kao i na 768 x 1024 CSS px; nula geometrijskih razlika i bez horizontalnog prelivanja. Pretraga po imenu radi u svih deset tema, PNG se dekodiraju i stanja akcija su ispravna. Tematski tekst na testiranim punim podlogama ima najmanje 4,5:1 kontrast.",
    "visualAcceptance": "pending user review",
}
write("docs/theme-asset-implementation-map.json", implementation)
write("docs/theme-progress.json", progress)
print("Registered 60 original Online Players PNGs, with 191 active slots per theme")
