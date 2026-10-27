"""Turn the trimmed cutouts into the three WebP sizes the app serves, keeping their alpha.

build_photos.py is for rectangular photographs: it reads JPEGs through OpenCV, which has no
alpha to lose. Cutouts need their own pass, so this one stays in Pillow end to end and writes
WebP with the transparency intact.

    python scripts/build_cutouts.py brand/photos-cutout

Sizes and the manifest shape match build_photos.py, so both kinds of photo are served the
same way by photoSrcSet in Bits.tsx.
"""

import json
import pathlib
import sys

from PIL import Image

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / "public" / "photos"
MANIFEST = ROOT / "src" / "data" / "photo-manifest.json"

# A menu tile renders around 420px, so it asks for 480 or 900; 1200 is the top a 2x screen can
# use. 1440 was most of the bytes for a case that never fires.
SMALL_WIDTH, BASE_WIDTH, MAX_WIDTH = 480, 900, 1200
QUALITY = {"sm": 80, "base": 82, "hi": 80}
# Encoder effort. 6 is the slowest setting and buys a percent or two of file size over 4, which
# is not worth minutes per image on a catalogue this size.
METHOD = 4


def at_width(im: Image.Image, width: int) -> Image.Image:
    """Never upscale: a cutout narrower than the target is served at its own size."""
    if im.width <= width:
        return im
    return im.resize((width, round(im.height * width / im.width)), Image.LANCZOS)


def main() -> None:
    src = pathlib.Path(sys.argv[1])
    OUT.mkdir(parents=True, exist_ok=True)
    manifest = json.loads(MANIFEST.read_text(encoding="utf-8")) if MANIFEST.exists() else {}

    cutouts = sorted([*src.glob("*.webp"), *src.glob("*.png")])
    if not cutouts:
        raise SystemExit(f"No cutouts found in {src}")

    for path in cutouts:
        name = path.stem
        with Image.open(path) as opened:
            im = opened.convert("RGBA")

        hi, base, small = (at_width(im, w) for w in (MAX_WIDTH, BASE_WIDTH, SMALL_WIDTH))
        hi.save(OUT / f"{name}@2x.webp", quality=QUALITY["hi"], method=METHOD)
        base.save(OUT / f"{name}.webp", quality=QUALITY["base"], method=METHOD)
        small.save(OUT / f"{name}-sm.webp", quality=QUALITY["sm"], method=METHOD)

        manifest[name] = {"sm": small.width, "w": base.width, "w2x": hi.width, "h": base.height}
        weights = " | ".join(
            f"{(OUT / f'{name}{suffix}.webp').stat().st_size // 1024}KB" for suffix in ("-sm", "", "@2x")
        )
        print(f"{name:<26} {small.width}/{base.width}/{hi.width}w  {weights}")

    MANIFEST.write_text(json.dumps(dict(sorted(manifest.items())), indent=2) + "\n", encoding="utf-8")
    print(f"manifest: {MANIFEST.relative_to(ROOT)} ({len(manifest)} photos)")


if __name__ == "__main__":
    main()
