"""Cut the web brand assets out of the studio's two official logos.

Sources (transparent PNGs, as supplied by the studio) live in brand/logos/:
  ruffles-by-h.png   the hat-and-flower lady, "Ruffles", "by H", LOOK GREAT, FEEL FABULOUS!
  baked-by-h.png     the cupcake, "Baked", "by H", DELICIOUS CREAMY GOODNESS!

Writes into public/brand/:
  ruffles-logo / baked-logo   the full lockups, 1x and 2x, for anywhere with room
  mark                        the hat and flower on their own, the app's mark
  mark-light                  the same mark with the black reversed to cream, for dark sections
  app-icon-180 / -512         the home-screen icons
  ../favicon-32 / -180        the tab icon

The mark is a crop of the Ruffles lockup rather than a redrawing: the lady in the hat IS the
studio's mark. The crop stops above the "Ruffles" script, whose capital R runs up into the hair,
so the glyph stays legible at nav size.

Usage:  python scripts/build_brand.py
"""

from __future__ import annotations

from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "brand" / "logos"
OUT = ROOT / "public" / "brand"
PUBLIC = ROOT / "public"

# The hat, flower and face, stopping above the wordmark. Read off the trimmed cutout.
MARK_BOX = (58, 2, 298, 148)

# Reversed-out cream for the black areas, used on dark sections and on the iOS icon.
REVERSE_INK = (247, 240, 233)


def source(name: str) -> Path:
    """The keyed-out cutout when scripts/cutout_logos.py has been run, else the supplied file."""
    cut = SRC / f"{name}-cutout.png"
    return cut if cut.exists() else SRC / f"{name}.png"


def trimmed(path: Path) -> Image.Image:
    im = Image.open(path).convert("RGBA")
    box = im.split()[3].getbbox()
    return im.crop(box) if box else im


def widths(im: Image.Image, stem: str, base: int) -> None:
    """Write the art at `base` wide, plus a 2x if the original is big enough. Never upscales."""
    for mult in (1, 2):
        w = base * mult
        if w > im.width:
            continue
        h = round(im.height * w / im.width)
        path = OUT / f"{stem}{'' if mult == 1 else f'@{mult}x'}.png"
        im.resize((w, h), Image.LANCZOS).save(path, optimize=True)
        print(f"  {path.relative_to(ROOT)}  {w}x{h}")


def reverse_ink(im: Image.Image) -> Image.Image:
    """Turn the near-black of the hat and hair into cream, leaving the wine flower alone.

    The flower is saturated; the hat is not. Splitting on how far red sits from blue keeps the
    two apart without a hand-drawn mask.
    """
    out = im.copy()
    px = out.load()
    for y in range(out.height):
        for x in range(out.width):
            r, g, b, a = px[x, y]
            if a == 0:
                continue
            if max(r, g, b) - min(r, g, b) < 40 and max(r, g, b) < 150:
                # Neutral and dark: part of the hat, hair or outline. Lighten it, keeping the
                # original value as a shade so the brim's modelling survives.
                k = 1 - max(r, g, b) / 150
                px[x, y] = (
                    round(REVERSE_INK[0] * k + r * (1 - k)),
                    round(REVERSE_INK[1] * k + g * (1 - k)),
                    round(REVERSE_INK[2] * k + b * (1 - k)),
                    a,
                )
    return out


def square(im: Image.Image, pad: float = 0.1) -> Image.Image:
    """Centre the art on a transparent square with a little breathing room."""
    side = round(max(im.size) * (1 + pad * 2))
    sq = Image.new("RGBA", (side, side), (0, 0, 0, 0))
    sq.paste(im, ((side - im.width) // 2, (side - im.height) // 2), im)
    return sq


def icon(mark: Image.Image, size: int, path: Path) -> None:
    """A square cutout on transparency — no ground is painted behind the mark."""
    big = size * 4
    art = square(mark, pad=0.06).resize((big, big), Image.LANCZOS)
    art.resize((size, size), Image.LANCZOS).save(path, optimize=True)
    print(f"  {path.relative_to(ROOT)}  {size}x{size}")


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)

    ruffles = trimmed(source("ruffles-by-h"))
    baked = trimmed(source("baked-by-h"))
    print(f"ruffles lockup {ruffles.size} · baked lockup {baked.size}")

    print("lockups")
    widths(ruffles, "ruffles-logo", ruffles.width)
    widths(baked, "baked-logo", baked.width)

    print("mark")
    mark = Image.open(source("ruffles-by-h")).convert("RGBA").crop(MARK_BOX)
    box = mark.split()[3].getbbox()
    mark = mark.crop(box) if box else mark
    widths(square(mark), "mark", 120)
    widths(square(reverse_ink(mark)), "mark-light", 120)

    print("icons (all transparent)")
    icon(mark, 32, PUBLIC / "favicon-32.png")
    icon(mark, 180, OUT / "app-icon-180.png")
    icon(mark, 512, OUT / "app-icon-512.png")
    # iOS throws away the alpha on a home-screen icon and flattens it onto black, so that one
    # gets the reversed mark: cream on black reads, where the black hat would have vanished.
    icon(reverse_ink(mark), 180, PUBLIC / "apple-touch-icon.png")


if __name__ == "__main__":
    main()
