"""Replace the four Treasury tab fallback stacks with canonical images."""

from pathlib import Path
import re

root = Path(__file__).resolve().parents[1]
path = root / "www/index.html"
text = path.read_text(encoding="utf-8")
roles = ("tab-trophies", "tab-skins", "tab-effects", "tab-themes")
for role in roles:
    pattern = re.compile(r'(<button id="' + role + r'"[^>]*>).*?(</button>)')
    replacement = (r'\1<img class="treasury-control-icon" data-treasury-control="' + role +
                   '" src="assets/green-soft-clay/canonical/treasury-controls/' + role +
                   '-v1.png?v=1" alt="" aria-hidden="true" decoding="async">' + r'\2')
    text, count = pattern.subn(replacement, text)
    if count != 1:
        raise SystemExit(f"Expected exactly one {role} button; found {count}")
path.write_text(text, encoding="utf-8")
print("Linked four canonical Treasury tabs")
