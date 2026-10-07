"""Generate or verify the measured Green reference usage map.

Run with the bundled Python/Pillow runtime. This reads, but never edits, Green PNGs.
Static source hits are evidence of references, not proof of on-screen rendering.
"""

import json
import sys
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
WWW = ROOT / "www"
CATALOG = json.loads((ROOT / "docs/theme-asset-role-catalog.json").read_text(encoding="utf-8"))
OUTPUT = ROOT / "docs/theme-asset-usage-map.json"
SOURCE_SUFFIXES = {".js", ".css", ".html", ".json"}


def production_sources():
    for file in sorted(WWW.iterdir()):
        if file.is_file() and file.suffix.lower() in SOURCE_SUFFIXES:
            yield file
    for name in ("asset-registry.json", "manifest.json"):
        file = WWW / "themes/green" / name
        if file.exists():
            yield file


sources = {
    file.relative_to(ROOT).as_posix(): file.read_text(encoding="utf-8", errors="replace").splitlines()
    for file in production_sources()
}


def contexts(slot_id):
    if slot_id == "background/main":
        return ["splash", "main-menu", "all-rooms"]
    if slot_id == "splash-title-soft-clay-v1":
        return ["splash", "login"]
    if slot_id.startswith("runtime/menu/"):
        return ["main-menu"]
    family = slot_id.split("/")[1] if slot_id.startswith("canonical/") else slot_id.split("/")[0]
    lookups = {
        "achievement-trophies": ["statistics", "treasury"],
        "collection-medals": ["statistics", "treasury"],
        "competition-medals": ["quarterly-league", "tournament", "game-over"],
        "daily-room-identity": ["main-menu", "daily-challenge"],
        "daily-states": ["daily-challenge"],
        "ducat": ["main-menu", "economy", "treasury", "daily-challenge", "game-over"],
        "global-chat-room-identity": ["main-menu", "global-chat"],
        "h2h-statistics": ["statistics", "h2h"],
        "hotseat-room-identity": ["main-menu", "hotseat"],
        "hotseat-winner": ["hotseat", "game-over"],
        "invite-friend-room-identity": ["main-menu", "invite-friend"],
        "leaderboard-controls": ["leaderboard"],
        "leaderboard-room-identity": ["main-menu", "leaderboard"],
        "online-players-room-identity": ["main-menu", "online-players"],
        "online-random-room-identity": ["main-menu", "online-random"],
        "quarterly-league-room-identity": ["main-menu", "quarterly-league"],
        "quarterly-navigation": ["quarterly-league"],
        "quarterly-rank-badges": ["quarterly-league"],
        "rewarded-video": ["daily-challenge", "economy", "treasury", "game-over"],
        "rules-page-illustrations": ["rules"],
        "rules-room-identity": ["main-menu", "rules"],
        "settings-controls": ["settings"],
        "settings-room-identity": ["main-menu", "settings"],
        "solo-results": ["solo", "game-over"],
        "solo-room-identity": ["main-menu", "solo"],
        "statistics-overview": ["statistics"],
        "statistics-room-identity": ["main-menu", "statistics"],
        "tournament-awards": ["tournament", "game-over"],
        "tournament-navigation": ["tournament"],
        "tournament-states": ["tournament"],
        "treasury-controls": ["treasury"],
        "treasury-effect-previews": ["treasury"],
        "undo-token": ["economy", "game-board", "treasury"],
        "daily": ["daily-challenge"],
        "invite": ["invite-friend"],
        "opponent": ["online-random", "invite-friend"],
        "rules": ["rules"],
        "runtime": ["main-menu"],
        "solo": ["solo", "game-over"],
        "treasury": ["treasury"],
    }
    return lookups.get(family, ["needs-context-review"])


def optical_bounds(file):
    with Image.open(file) as image:
        width, height = image.size
        if "A" not in image.getbands():
            bounds = (0, 0, width, height)
        else:
            alpha = image.getchannel("A")
            bounds = alpha.point(lambda value: 255 if value >= 16 else 0).getbbox()
        if bounds is None:
            return None
        left, top, right, bottom = bounds
        return {
            "left": left,
            "top": top,
            "rightExclusive": right,
            "bottomExclusive": bottom,
            "widthFraction": round((right - left) / width, 4),
            "heightFraction": round((bottom - top) / height, 4),
            "centerXFraction": round((left + right) / (2 * width), 4),
            "centerYFraction": round((top + bottom) / (2 * height), 4),
        }


entries = []
for slot in CATALOG["slots"]:
    relative = slot["greenReference"]
    file = WWW / relative
    refs = []
    for source, lines in sources.items():
        for number, line in enumerate(lines, 1):
            if relative in line:
                refs.append(f"{source}:{number}")
    entries.append({
        "slotId": slot["id"],
        "greenReference": relative,
        "intendedContexts": contexts(slot["id"]),
        "contextEvidence": "derived-from-slot-family; verify in app",
        "staticSourceReferences": refs,
        "runtimeUseVerified": False,
        "greenByteSize": file.stat().st_size,
        "greenDecodedRgbaBytes": slot["width"] * slot["height"] * 4,
        "greenOpticalBoundsPx": optical_bounds(file),
    })

result = {
    "schemaVersion": 1,
    "referenceThemeId": "dark",
    "alphaThresholdInclusive": 16,
    "measurement": "Pillow alpha bounding box on each unmodified Green PNG; RGB background uses full canvas.",
    "sourceReferenceScope": "Top-level production www JS/CSS/HTML/JSON and Green manifest/asset registry only; dynamic references and other consumers require runtime review.",
    "note": "Contexts are initial route candidates, not verified per-screen usage. False runtimeUseVerified is deliberate until each slot is checked in the app.",
    "requiredSlotCount": len(entries),
    "slots": entries,
}

if "--write" in sys.argv:
    OUTPUT.write_text(json.dumps(result, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"Wrote {len(entries)} measured Green slots to {OUTPUT.relative_to(ROOT)}")
else:
    existing = json.loads(OUTPUT.read_text(encoding="utf-8"))
    if existing != result:
        raise SystemExit("Green usage/optical reference changed; inspect differences before updating.")
    print(f"Verified {len(entries)} Green usage/optical slots.")
