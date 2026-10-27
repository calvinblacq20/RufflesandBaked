"""Lay a folder of cutouts out on a flat colour, to check them before they are built.

Deliberately not a chequerboard. These shots arrive flattened onto an editor's transparency
chequer, and a chequered sheet hides a chequer left in the pixels. On a flat mid-grey any
backdrop that survived keying shows up at once.

    python scripts/contact_sheet.py brand/photos-cutout sheet.jpg
"""

import pathlib
import sys

from PIL import Image

COLS, CELL, GROUND = 5, 230, (128, 128, 128)


def main() -> None:
    src, out = pathlib.Path(sys.argv[1]), pathlib.Path(sys.argv[2])
    files = sorted(src.glob("*.png")) or sorted(src.iterdir())
    rows = (len(files) + COLS - 1) // COLS
    sheet = Image.new("RGB", (COLS * CELL, rows * CELL), GROUND)
    for i, path in enumerate(files):
        with Image.open(path) as opened:
            im = opened.convert("RGBA")
        im.thumbnail((CELL - 8, CELL - 8))
        x = (i % COLS) * CELL + (CELL - im.width) // 2
        y = (i // COLS) * CELL + (CELL - im.height) // 2
        sheet.paste(im, (x, y), im)
    sheet.save(out, quality=88)
    print(out, sheet.size, "order:", ", ".join(p.stem for p in files))


if __name__ == "__main__":
    main()
