"""Download the approved Instagram photos listed in a JSON file into brand/photos-instagram/.

Usage: python scripts/fetch_photos.py path/to/list.json
The list is [{"name": "wedding-adinkra", "url": "https://..."}]. Existing files are skipped.
"""

import json
import sys
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "brand" / "photos-instagram"


def main() -> None:
    if len(sys.argv) != 2:
        sys.exit("usage: python scripts/fetch_photos.py list.json")
    items = json.loads(Path(sys.argv[1]).read_text(encoding="utf-8"))
    OUT.mkdir(parents=True, exist_ok=True)
    for item in items:
        # Instagram serves webp or jpg; keep whatever arrives and let build_photos convert.
        target = next(iter(OUT.glob(f"{item['name']}.*")), None)
        if target:
            print(f"skip  {target.name}")
            continue
        request = urllib.request.Request(item["url"], headers={"User-Agent": "Mozilla/5.0"})
        try:
            with urllib.request.urlopen(request, timeout=30) as response:
                body = response.read()
                kind = response.headers.get("Content-Type", "")
        except Exception as error:  # noqa: BLE001 - report and keep going with the rest
            print(f"FAIL  {item['name']}: {error}")
            continue
        ext = ".webp" if "webp" in kind else ".jpg"
        path = OUT / f"{item['name']}{ext}"
        path.write_bytes(body)
        print(f"saved {path.name} ({len(body) // 1024} KB)")


if __name__ == "__main__":
    main()

