# Brand

The studio supplied its official logos on 27 Oct 2026. They are the source of truth for the
app's mark, its icons and every brand colour. The originals are in `brand/logos/`:

| File | What it is |
|---|---|
| `ruffles-by-h.png` | **Ruffles by H** — the lady in the wide-brim hat with the wine flower, the "Ruffles" script, "by H", and LOOK GREAT, FEEL FABULOUS! |
| `baked-by-h.png` | **Baked by H** — the cupcake with the heart, the "Baked" script, "by H" in rose gold, and DELICIOUS CREAMY GOODNESS! |
| `ruffles-by-h-white.jpg`, `baked-by-h-white.jpg` | The same two as JPGs. Kept for reference. |
| `*-cutout.png` | Generated. The same logos with the white keyed out — what the app actually uses. |

## Cutting out the white

The supplied PNGs are RGB on solid white, not transparent, so anything built straight from them
carried a white box. `scripts/cutout_logos.py` lifts the background by flooding inwards from the
edges: white that touches an edge is background and goes, while white enclosed by artwork — the
frosting highlights, the glint on the hat — is kept, because the flood never reaches it. Edge
pixels take their alpha from how far they sit from pure white, so curves stay smooth.

Run it once after replacing a logo; `build_brand.py` picks up the `-cutout.png` files when they
exist and falls back to the originals when they don't.

Every asset the app ships is a true cutout: nothing is painted behind the mark, including the
icons. The one exception is forced by the platform — iOS discards alpha on a home-screen icon and
flattens it onto black, so `public/apple-touch-icon.png` uses the reversed cream mark, which reads
on black where the black hat would have vanished.

## The mark

The lady in the hat **is** the studio's mark, so the app uses the artwork rather than a drawing of
our own. `scripts/build_brand.py` crops her out of the trimmed Ruffles cutout at `(58, 2, 298, 148)` —
stopping above the "Ruffles" script, whose capital R runs up into the hair — and writes:

| Asset | Used for |
|---|---|
| `public/brand/mark.png`, `mark@2x.png` | `LogoMark` and `AppIcon`, on light grounds |
| `public/brand/mark-light.png`, `mark-light@2x.png` | the same mark with the black reversed to cream, for dark sections |
| `public/brand/app-icon-180.png`, `-512.png` | home-screen icons |
| `public/favicon-32.png`, `favicon-180.png` | the tab icon and the Apple touch icon |
| `public/brand/ruffles-logo.png`, `baked-logo.png` | the full lockups, for anywhere with room (`BrandLogo`) |

The reverse is generated, not hand-painted: anything neutral and dark becomes cream, anything
saturated stays, which keeps the wine flower while lifting the hat off a dark ground.

Re-run `python scripts/build_brand.py` after replacing anything in `brand/logos/`.

## The colours

Every brand colour below was sampled from the logos themselves (counting opaque pixels, grouped
into buckets), not picked by eye.

| Token | Hex | Where it came from |
|---|---|---|
| `--wine` | `#9c3048` | The "Baked" script. At 11,554 px it is the single most-used colour across the two logos, which makes it the brand colour. |
| `--wine-deep` | `#6c0018` | The core of the Ruffles flower, for the places that need more weight than the script. |
| `--wine-wash` | `#fce4e4` | The near-white blush both logos are drawn against. Also the app icon's ground. |
| `--coral` | `#fcb49c` | The cupcake frosting. This is the one bright accent, always a fill under ink text. |
| `--coral-wash` | `#fcf0ea` | The palest frosting tone. |
| `--blush` | `#fce4e4` | As `--wine-wash`; a pastel tile slot. |

There is **no gold** in the official logos. An earlier build used a champagne gold accent sampled
from a Christmas card; that card is not the brand, and the accent slot now holds `--coral`.

The ground, ink and the remaining pastel slots stay on the house neutrals shared with the other
studios on this system — see the note at the top of `src/styles/tokens.css`.

## Names

Taken from the logos, and already what the app says:

- **Ruffles and Baked by H** — the studio as a whole
- **Ruffles by H** — the workroom. "Look great, feel fabulous"
- **Baked by H** — the kitchen. "Delicious creamy goodness"
