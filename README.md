# Ruffles and Baked by H: Studio App (demo)

Ordering and workshop app for **Ruffles and Baked by H**, Hillary's studio in Kasoa. It runs two lines under one roof: **Ruffles by H**, bespoke handmade headpieces, hats, crowns, beaded headbands, brooches and the whole bridal set, and **Baked by H**, celebration cakes, kids' themed cakes, bento cakes and pastries.

Clients browse both, build a cake from the studio's own Classic Cake Menu, ask for a quote on anything handmade, pick a pickup time or delivery window, pay with Mobile Money or card, track the order and keep official receipts. The owner runs the studio from `#/admin`: what to make today, orders (list and board), walk-in and WhatsApp orders, clients with allergies and head sizes, dates to remember and a private notebook, pickups and fittings, payments and receipts, reports, reviews, the menu and price list, and settings.

- Business facts, scope and open questions: `docs/PRD.md`
- Photos: `docs/photo-sources.md`
- Look and structure (shared with the Franz Qlodin build): `docs/design-reference.md`, `docs/structure-reference.md`, `docs/admin-ui-guidelines.md`

## Run it

```bash
npm install
```

```bash
npm run dev
```

Then open http://localhost:5173 (client) or http://localhost:5173/#/admin (owner).

```bash
npm test
```

```bash
npm run typecheck
```

```bash
npm run build
```

## Screen sizes

| Width | Layout |
|---|---|
| Under 810px (phones) | App layout: brand and menu in a sticky top bar, bottom sheets, sticky bottom action bars |
| 810–1023px (tablets) | Floating top nav and footer, wider grids, dialogs instead of bottom sheets |
| 1024px and up (desktop) | Two-column pages with sticky side cards on the studio page, order flow and order page |

## The two lines

Every menu item belongs to the kitchen, the workroom, or both, and that one field drives the app:

- **Explore** has a switch between *Cakes* and *Headpieces*; bundles like the Passion Chest show under either.
- **Cakes** are priced from the studio's own menu card — four grids by shape (round/square/heart, bento, rectangular, kids themed) crossed with layers and size. The price is shown before you order, and a cake carries **one flavour per layer**, which is what her menu card allows.
- **Handmade pieces** have no list price. They go out as a request, the owner sends a quote on WhatsApp, and a deposit starts the work. The order total says "So far" while a quote is outstanding, and the piece reads "By quote" rather than GH₵ 0.
- **Stage names follow the order**: a cake goes *Baking → Decorating*, a headpiece goes *Beading → Finishing*, and a mixed order reads neutrally. The same applies to the WhatsApp updates the owner sends.

## The studio's notice

One notice can run across the foot of the client app — pre-orders opening, a festive cut-off, the
kitchen closed for a week. The owner writes it in **Settings → Notice to clients**: the line, an
optional detail, an optional button, and the dates it runs between. It stays up for the whole of
the last day. A client who closes it does not see it again, but changing the words gives the
notice a new id and a fresh run at everyone.

## Demo notes

- All data is sample data kept in the browser (`localStorage`). **Profile → Reset demo data** (client) or **Settings → Reset demo data** (admin) restores it.
- Cake prices come from the studio's Classic Cake Menu card; the Passion Chest price (GH₵ 220) is from the WhatsApp catalogue. Everything else is a sample for the owner to confirm in **Menu & prices** — `docs/PRD.md` lists exactly which.
- Orders placed with less notice than the item needs are late orders and pay the GH₵ 50 late fee. Sundays are closed.
- Paying in full online books a price-list cake straight away. Custom designs, tiered cakes and bespoke pieces stay a request until the owner sends the quote.
- The owner side has no login in the demo. The studio's order book is simulated over five months from fixed seeds (`src/data/studio-seed.ts`), dated relative to today, so there's always something in the oven, something on the beading table and something ready.
- WhatsApp updates and birthday reminders open WhatsApp with the message filled in; nothing is sent automatically.
- You start without an account and can order without one. To see order history, dates to remember, allergies and head size, log in from **Profile** with the sample account `024 555 0142`.
- Paystack payments and WhatsApp login codes are simulated. The code shows up as a notification at the top of the screen, and no money moves.
- Going live needs a server to verify Paystack payments; see "Going live with Paystack" in `docs/PRD.md`.

## Photos

Every photo is the studio's own, from [@ruffles_byh](https://www.instagram.com/ruffles_byh/) and [@bakedbyh_gh](https://www.instagram.com/bakedbyh_gh/); `docs/photo-sources.md` lists which post each came from. Items without a photo show a pastel tile with the hat mark, which is by design — a good tile beats a bad crop.

The pipeline, in order:

```bash
python scripts/fetch_photos.py brand/photo-list.json
```

Downloads the images in a JSON list (`[{"name", "url"}]`) into `brand/photos-instagram/`.

```bash
python scripts/prepare_photos.py
```

Crops out Instagram's stickers and burnt-in clocks and writes named originals to `brand/photos-original/`. The studio's own watermarks are left alone.

```bash
python scripts/upscale_photos.py --model path/to/real_esrgan_x4plus.onnx --below 1080
```

Optional. Upscales small reel covers with Real-ESRGAN x4plus ([qualcomm/Real-ESRGAN-x4plus](https://huggingface.co/qualcomm/Real-ESRGAN-x4plus), BSD-3-Clause) on the CPU. Needs `pip install onnxruntime opencv-python numpy`. Output goes to `brand/photos-upscaled/`, which git ignores.

```bash
python scripts/build_photos.py
```

Writes three WebP sizes per photo to `public/photos/` (480, 1080 and up to 2160px) and `src/data/photo-manifest.json`, so the browser picks the right size.

To add a photo for a menu item, put the JPG in `brand/photos-original/`, run the last script, and set `photo: "/photos/name.webp"` on the item in `src/data/catalog.ts`.

### Cutouts

Most of the menu is photographed as cutouts, which sit on the white page with no background of
their own. They have their own two steps, because `build_photos.py` goes through OpenCV and
JPEG, neither of which carries an alpha channel.

```bash
python scripts/cutout_products.py brand/photos-incoming brand/photos-cutout
```

Keys the white out of any shot that arrived flattened, and passes the already-transparent ones
straight through. The raw shots are not tracked — they arrive from the studio and are mostly
editor chequer — so `brand/photos-cutout/` is the archive, kept as high-quality WebP with the
alpha intact. Keying works on connected regions rather than on colour alone: a white area
only goes transparent if it touches the edge of the frame, which is what lets a white cake on a
white background keep its body. `NAMES` in that script maps each incoming file to its real name.

```bash
python scripts/build_cutouts.py brand/photos-cutout
```

Writes the same three WebP sizes as `build_photos.py`, with the transparency intact, and merges
into the same manifest. Set `photo` **and** `cutout: true` on the item in `src/data/catalog.ts`:
the flag is what tells the menu grid to show the piece whole instead of cropping it to fill.

These scripts need Pillow, numpy and scipy. The repo keeps them out of the way in a throwaway
environment:

```bash
python -m venv .venv-img && .venv-img/Scripts/pip install pillow numpy scipy
```

## Brand files

The studio's official logos are in `brand/logos/`, and everything the app shows is built from
them. `docs/brand.md` records which colour came from where.

```bash
python scripts/cutout_logos.py
```

Keys the white background out of the supplied logos, which arrive as RGB on solid white. Writes
`brand/logos/*-cutout.png`.

```bash
python scripts/build_brand.py
```

Cuts the mark — the lady in the hat — out of the Ruffles lockup and writes the app's marks, the
full lockups and every icon into `public/brand/` and `public/`. All of them are transparent
cutouts. Re-run both scripts after replacing anything in `brand/logos/`.

The brand colours live in `src/styles/tokens.css`: `--wine` `#9c3048` from the "Baked" script,
`--wine-deep` `#6c0018` from the Ruffles flower, and `--coral` `#fcb49c` from the cupcake
frosting as the one bright accent.
