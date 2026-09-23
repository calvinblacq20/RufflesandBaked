"""Write the Ruffles and Baked by H favicon, SVG mark and PNG app icons from one set of shapes.

The geometry matches MARK in src/components/Brand.tsx: the studio's wide-brim hat, with the band
and a three-bead cluster cut out of it. PNGs are drawn at 4x and scaled down for clean edges.

Usage:  python scripts/make_icons.py
"""

from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / "public"

INK = "#2a141c"
GOLD = "#e9c67e"

BRIM = (50, 68, 47, 14)  # cx, cy, rx, ry
CROWN = "M27 70 C27 40 33 23 50 23 C67 23 73 40 73 70 Z"
CROWN_CURVES = [
    ((27, 70), (27, 40), (33, 23), (50, 23)),
    ((50, 23), (67, 23), (73, 40), (73, 70)),
]
BAND = (25, 75, 62, 7)  # x1, x2, y, width
BEADS = [(63, 41, 4.2), (69, 48, 3.2), (60, 50, 2.6)]


def bezier(p0, p1, p2, p3, steps=60):
    for i in range(steps + 1):
        t = i / steps
        u = 1 - t
        yield (
            u**3 * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t**3 * p3[0],
            u**3 * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t**3 * p3[1],
        )


def mark_svg(fill: str, mask_id: str) -> str:
    cx, cy, rx, ry = BRIM
    x1, x2, y, w = BAND
    beads = "".join(f'<circle cx="{bx}" cy="{by}" r="{br}" fill="#000"/>' for bx, by, br in BEADS)
    return (
        f'<defs><mask id="{mask_id}" maskUnits="userSpaceOnUse" x="0" y="0" width="100" height="100">'
        f'<rect width="100" height="100" fill="#fff"/>'
        f'<line x1="{x1}" y1="{y}" x2="{x2}" y2="{y}" stroke="#000" stroke-width="{w}" stroke-linecap="round"/>'
        f"{beads}</mask></defs>"
        f'<g fill="{fill}" mask="url(#{mask_id})">'
        f'<ellipse cx="{cx}" cy="{cy}" rx="{rx}" ry="{ry}"/><path d="{CROWN}"/></g>'
    )


def mark_mask(px: int) -> Image.Image:
    """White where the mark is, black elsewhere, px × px."""
    s = px / 100
    img = Image.new("L", (px, px), 0)
    d = ImageDraw.Draw(img)
    cx, cy, rx, ry = BRIM
    d.ellipse([(cx - rx) * s, (cy - ry) * s, (cx + rx) * s, (cy + ry) * s], fill=255)
    outline = [(27 * s, 70 * s)]
    for curve in CROWN_CURVES:
        outline.extend((x * s, y * s) for x, y in bezier(*curve))
    outline.append((73 * s, 70 * s))
    d.polygon(outline, fill=255)
    x1, x2, y, w = BAND
    half = w / 2 * s
    d.line([x1 * s, y * s, x2 * s, y * s], fill=0, width=round(w * s))
    for ex in (x1, x2):
        d.ellipse([ex * s - half, y * s - half, ex * s + half, y * s + half], fill=0)
    for bx, by, br in BEADS:
        d.ellipse([(bx - br) * s, (by - br) * s, (bx + br) * s, (by + br) * s], fill=0)
    return img


def app_icon(size: int, path: Path) -> None:
    big = size * 4
    icon = Image.new("RGBA", (big, big), (0, 0, 0, 0))
    ImageDraw.Draw(icon).rounded_rectangle([0, 0, big - 1, big - 1], radius=round(big * 0.22), fill=INK)
    inner = round(big * 0.64)
    offset = (big - inner) // 2
    color = Image.new("RGBA", (inner, inner), GOLD)
    icon.paste(color, (offset, offset), mark_mask(inner))
    icon.resize((size, size), Image.LANCZOS).save(path)
    print(f"wrote {path.relative_to(ROOT)}")


def main() -> None:
    brand = PUBLIC / "brand"
    brand.mkdir(parents=True, exist_ok=True)
    favicon = (
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="-18 -18 136 136">'
        f'<rect x="-18" y="-18" width="136" height="136" rx="30" fill="{INK}"/>{mark_svg(GOLD, "m")}</svg>\n'
    )
    (PUBLIC / "favicon.svg").write_text(favicon, encoding="utf-8")
    (brand / "rbh-mark.svg").write_text(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">{mark_svg(INK, "m")}</svg>\n', encoding="utf-8")
    print("wrote public/favicon.svg, public/brand/rbh-mark.svg")
    app_icon(180, brand / "rbh-app-icon-180.png")
    app_icon(512, brand / "rbh-app-icon-512.png")


if __name__ == "__main__":
    main()
