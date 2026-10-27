"""Key the white background out of the official logos, leaving real cutouts.

The files the studio supplied are RGB on solid white, not transparent, so every asset built from
them carried a white box. This lifts the background by flooding inwards from the edges: white that
touches the edge is background and goes; white enclosed by artwork — the frosting highlights, the
glint on the hat, the paper showing through the "R" — is kept, because the flood never reaches it.

Edge pixels are part white and part ink, so their alpha is taken from how far they sit from pure
white. That keeps the curves smooth instead of stair-stepped.

Writes brand/logos/<name>-cutout.png. Run once after replacing a logo; build_brand.py reads the
cutouts if they exist.

Usage:  python scripts/cutout_logos.py
"""

from __future__ import annotations

from collections import deque
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "brand" / "logos"

# How far from pure white still counts as background. The lightest artwork tone in either logo is
# #fcf0f0 (a distance of 18), so 26 clears the background without eating the frosting highlights.
TOLERANCE = 26
# Below this distance a kept pixel is still mostly white, so it fades rather than ending hard.
FEATHER = 60


def distance_from_white(px: tuple[int, int, int]) -> int:
    return max(255 - px[0], 255 - px[1], 255 - px[2])


def cutout(path: Path) -> Image.Image:
    im = Image.open(path).convert("RGB")
    w, h = im.size
    px = im.load()

    # Flood from every edge pixel that is near enough to white.
    background = bytearray(w * h)
    queue: deque[tuple[int, int]] = deque()

    def consider(x: int, y: int) -> None:
        i = y * w + x
        if background[i] or distance_from_white(px[x, y]) > TOLERANCE:
            return
        background[i] = 1
        queue.append((x, y))

    for x in range(w):
        consider(x, 0)
        consider(x, h - 1)
    for y in range(h):
        consider(0, y)
        consider(w - 1, y)

    while queue:
        x, y = queue.popleft()
        if x > 0:
            consider(x - 1, y)
        if x < w - 1:
            consider(x + 1, y)
        if y > 0:
            consider(x, y - 1)
        if y < h - 1:
            consider(x, y + 1)

    out = Image.new("RGBA", (w, h))
    op = out.load()
    for y in range(h):
        row = y * w
        for x in range(w):
            r, g, b = px[x, y]
            if background[row + x]:
                op[x, y] = (r, g, b, 0)
                continue
            d = distance_from_white((r, g, b))
            # Kept, but pale and near the edge: let it fade out instead of ending abruptly.
            op[x, y] = (r, g, b, 255 if d >= FEATHER else round(255 * d / FEATHER))
    return out


def main() -> None:
    for name in ("ruffles-by-h", "baked-by-h"):
        src = SRC / f"{name}.png"
        art = cutout(src)
        box = art.split()[3].getbbox()
        if box:
            art = art.crop(box)
        dest = SRC / f"{name}-cutout.png"
        art.save(dest, optimize=True)
        opaque = sum(1 for p in art.getdata() if p[3] > 0)
        print(f"{dest.relative_to(ROOT)}  {art.size[0]}x{art.size[1]}  {opaque:,} visible px")


if __name__ == "__main__":
    main()
