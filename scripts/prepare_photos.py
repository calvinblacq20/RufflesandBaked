"""Turn the raw Instagram downloads into named, cropped originals for the site.

Reads brand/photos-instagram/ and writes brand/photos-original/<name>.jpg. The crops drop the
stickers and clock overlays Instagram burns into reel covers; the studio's own "Ruffles_byH"
and "@BakedbyH_gh" watermarks are left alone, because they are the brand's. Run it after
scripts/fetch_photos.py and before scripts/upscale_photos.py.

Usage:  python scripts/prepare_photos.py
"""

from __future__ import annotations

from pathlib import Path

import cv2
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
RAW = ROOT / "brand" / "photos-instagram"
OUT = ROOT / "brand" / "photos-original"

# name: (raw file stem, crop box as x0, y0, x1, y1 in raw pixels, or None for the whole photo)
PHOTOS: dict[str, tuple[str, tuple[int, int, int, int] | None]] = {
    # Ruffles by H
    "hat-cream-gold": ("hat-mother-of-groom", None),
    "fascinator-purple": ("headbands-purple", None),
    "bridal-look": ("headpiece-flower-tiara", None),
    "tiara-gold": ("tiaras-gold-silver-hand", None),
    "owner-gold": ("hires-owner-gold", None),
    # Trims the reel's top bleed; the studio watermark stays. These four come from the reel
    # pages, which serve the cover at 640 wide — nearly twice the grid thumbnail.
    "headband-crystal": ("hires-headband-crystal", (0, 53, 640, 1081)),
    "headpiece-blue": ("hires-headpiece-blue", (0, 71, 640, 1099)),
    # Drops the burnt-in "23:10 2 DEC 2024" clock along the bottom.
    "crown-crystal": ("hires-crown-crystal", (0, 0, 640, 816)),
    # Baked by H
    "cake-minnie": ("cake-minnie-themed", None),
    # Drops the "Introduction" sticker in the top-left corner.
    "cake-box-bow": ("cakes-pastries-collage", (0, 180, 1440, 1440)),
}

# Caption text painted out of a photo: (name, box) of near-white pixels to inpaint.
PAINT_OUT: dict[str, tuple[int, int, int, int]] = {}


def read(stem: str) -> np.ndarray:
    for path in RAW.glob(f"{stem}.*"):
        img = cv2.imread(str(path), cv2.IMREAD_COLOR)
        if img is not None:
            return img
    raise SystemExit(f"missing raw photo {stem} in {RAW}")


def paint_out(img: np.ndarray, box: tuple[int, int, int, int]) -> np.ndarray:
    x0, y0, x1, y1 = box
    mask = np.zeros(img.shape[:2], np.uint8)
    region = img[y0:y1, x0:x1]
    # Caption letters are near-white with a soft shadow; grow the mask to take the shadow too.
    letters = (cv2.cvtColor(region, cv2.COLOR_BGR2GRAY) > 200).astype(np.uint8) * 255
    mask[y0:y1, x0:x1] = cv2.dilate(letters, np.ones((5, 5), np.uint8), iterations=2)
    return cv2.inpaint(img, mask, 5, cv2.INPAINT_TELEA)


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    for name, (stem, box) in PHOTOS.items():
        img = read(stem)
        if box:
            x0, y0, x1, y1 = box
            img = img[y0:y1, x0:x1]
        if name in PAINT_OUT:
            img = paint_out(img, PAINT_OUT[name])
        cv2.imwrite(str(OUT / f"{name}.jpg"), img, [cv2.IMWRITE_JPEG_QUALITY, 97])
        print(f"{name:20s} {img.shape[1]}x{img.shape[0]}")


if __name__ == "__main__":
    main()
