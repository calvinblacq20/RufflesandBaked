"""Key the white out of the studio's product shots and give them their real names.

The photos arrive in two states. About half are already transparent PNGs; the rest are the same
cutouts flattened onto white. Both end up here as trimmed RGBA PNGs in brand/photos-cutout/,
ready for build_cutouts.py. They are archived as high-quality WebP rather than PNG: the same
picture to the eye at a third of the weight, and it is the keyed result that the repo keeps -
the originals arrive from the studio and are not tracked here.

Keying works on connected regions rather than on colour alone: a white region only becomes
transparent if it touches the edge of the frame. That is what lets a white cake on a white
background survive, since the cake's white is an island and the background's is not.

    python scripts/cutout_products.py brand/photos-incoming brand/photos-cutout
"""

import pathlib
import sys

import numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage

# How far below pure white still counts as background. The shots were not flattened onto plain
# white but onto an editor's transparency chequer - two neutral greys, around 254 and 231 - so
# this has to reach the darker square as well.
TOLERANCE = 30
# ...and only neutral pixels qualify, which keeps pale icing and pastry out of it.
NEUTRAL = 8
# Pull the edge in by this much before feathering, which eats the white fringe left by the
# original cutout instead of leaving it as a halo on the page.
ERODE = 1
FEATHER = 1.1
# Breathing room left around the trimmed subject, as a fraction of its longest side.
MARGIN = 0.02

# One of the shots is a photograph of the studio's work being worn, not a cutout. It has a real
# background, so it is passed through whole: keying it would eat the sky behind the bride.
OPAQUE = {"IMG_4432": "bride-portrait"}

# What each file actually is, read off the contact sheet. Anything not listed is left alone:
# the four logo files, which the brand pipeline already owns.
NAMES = {
    "IMG_4372": "fascinator-rainbow",
    "IMG_4374": "fascinator-purple-wide",
    "IMG_4375": "fascinator-lilac",
    "IMG_4380": "boutonniere-rose",
    "IMG_4384": "cake-gold-butterfly",
    "IMG_4421": "cake-greenery-tier",
    "IMG_4422": "cake-wedding-roses",
    "IMG_4424": "fan-blue-beaded",
    "IMG_4425": "chops-box",
    "IMG_4426": "cake-birthday-25",
    "IMG_4427": "party-packs",
    "IMG_4428": "cake-heart-pink",
    "IMG_4429": "cake-sheet-grapes",
    "IMG_4433": "fascinator-burgundy",
    "IMG_4434": "group-outfits",
    "IMG_4435": "fascinator-cream",
    "IMG_4436": "cake-heart-calendar",
    "IMG_4437": "cake-blue-flowers",
    "IMG_4476": "cake-two-johan",
    "IMG_4477": "cake-letter-b",
    "IMG_4478": "cake-bride-to-be",
    "IMG_4479": "cake-bride-to-be-side",
    "IMG_4480": "cake-she-said-yes",
}


def key_white(rgb: np.ndarray) -> np.ndarray:
    """Alpha for a flattened shot: 0 where the backdrop reaches in from the frame's edge.

    Diagonal connectivity matters here. A chequer's squares of one tone only ever touch at the
    corners, so with a plus-shaped neighbourhood every square is its own island and only the few
    on the frame's edge get removed - which is exactly the grid that was showing through.
    """
    value = rgb.astype(np.int16)
    backdrop = (value.max(axis=2) - value.min(axis=2) <= NEUTRAL) & (value.min(axis=2) >= 255 - TOLERANCE)
    labels, _ = ndimage.label(backdrop, structure=np.ones((3, 3), dtype=int))
    edge = np.concatenate([labels[0, :], labels[-1, :], labels[:, 0], labels[:, -1]])
    background = np.isin(labels, np.setdiff1d(np.unique(edge), [0]))
    return np.where(background, 0, 255).astype(np.uint8)


def tighten(alpha: Image.Image) -> Image.Image:
    """Shrink the edge a hair, then soften it, so no white rim survives onto the page."""
    if ERODE:
        alpha = alpha.filter(ImageFilter.MinFilter(ERODE * 2 + 1))
    return alpha.filter(ImageFilter.GaussianBlur(FEATHER))


def trim(im: Image.Image) -> Image.Image:
    """Crop to what is actually opaque, leaving a small, even margin."""
    box = im.split()[3].point(lambda v: 255 if v > 8 else 0).getbbox()
    if not box:
        return im
    pad = round(max(box[2] - box[0], box[3] - box[1]) * MARGIN)
    return im.crop((box[0] - pad, box[1] - pad, box[2] + pad, box[3] + pad))


def main() -> None:
    src = pathlib.Path(sys.argv[1])
    out = pathlib.Path(sys.argv[2])
    out.mkdir(parents=True, exist_ok=True)

    for path in sorted(src.iterdir()):
        if path.stem in OPAQUE:
            with Image.open(path) as opened:
                opened.convert("RGB").save(out / f"{OPAQUE[path.stem]}.webp", quality=95, method=4)
            print(f"{path.stem} -> {OPAQUE[path.stem]:<24} kept whole (a photograph, not a cutout)")
            continue

        name = NAMES.get(path.stem)
        if not name:
            print(f"{path.name:<16} skipped (not a product)")
            continue

        with Image.open(path) as opened:
            im = opened.convert("RGBA")

        had_alpha = np.asarray(im)[:, :, 3].min() < 250
        if had_alpha:
            source = "already transparent"
        else:
            alpha = Image.fromarray(key_white(np.asarray(im)[:, :, :3]), "L")
            im.putalpha(tighten(alpha))
            source = "keyed off white"

        im = trim(im)
        clear = round(100 * (np.asarray(im)[:, :, 3] < 8).mean())
        im.save(out / f"{name}.webp", quality=95, method=4)
        flag = "  <- CHECK" if not had_alpha and not 3 <= clear <= 80 else ""
        print(f"{path.stem} -> {name:<24} {im.width}x{im.height:<6} {source:<20} {clear}% clear{flag}")


if __name__ == "__main__":
    main()
