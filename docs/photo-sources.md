# Photo sources

Every photo in the app is the studio's own, from its two Instagram accounts:
[@ruffles_byh](https://www.instagram.com/ruffles_byh/) (the workroom) and
[@bakedbyh_gh](https://www.instagram.com/bakedbyh_gh/) (the kitchen). Downloaded 23 Sept 2026.

| In the app | Account | Post | What it shows | Handling |
|---|---|---|---|---|
| `hat-cream-gold` | @ruffles_byh | [DWBp2bWCBLP](https://www.instagram.com/ruffles_byh/p/DWBp2bWCBLP/) | Cream and gold wide-brim hat made for the mother of the groom | Full frame, 1440×1800 |
| `fascinator-purple` | @ruffles_byh | [DHs9MG0iPeS](https://www.instagram.com/ruffles_byh/p/DHs9MG0iPeS/) | "Purple 💜 in different shades" — sinamay fascinator with feathers | Full frame, 1440×1390 |
| `bridal-look` | @ruffles_byh | [DJG1kzxiIri](https://www.instagram.com/ruffles_byh/p/DJG1kzxiIri/) | Flower-work headpiece and crystal tiara, worn | Full frame, 1440×1799 |
| `tiara-gold` | @ruffles_byh | [DHqYXamCAI8](https://www.instagram.com/ruffles_byh/reel/DHqYXamCAI8/) | "Gold, white or silver?" — gold beaded branch crown | Reel cover, 640×1136 |
| `headband-crystal` | @ruffles_byh | [DHybUzaiKas](https://www.instagram.com/ruffles_byh/reel/DHybUzaiKas/) | Crystal spray headband held up | Reel cover 640×1136; top bleed trimmed |
| `headpiece-blue` | @ruffles_byh | [DIG88GSCbo3](https://www.instagram.com/ruffles_byh/reel/DIG88GSCbo3/) | Pale blue beaded piece in progress | Reel cover 640×1136; top bleed trimmed |
| `crown-crystal` | @ruffles_byh | [DH--ro0CZZg](https://www.instagram.com/ruffles_byh/reel/DH--ro0CZZg/) | Crystal crown being built by hand | Reel cover 640×1136; the burnt-in "23:10 2 DEC 2024" clock cropped off the bottom |
| `owner-gold` | @ruffles_byh | [DH5uR6UCIQZ](https://www.instagram.com/ruffles_byh/reel/DH5uR6UCIQZ/) | Hillary in gold, wearing one of her own pieces | Reel cover 640×1136 |
| `cake-minnie` | @bakedbyh_gh | [DUTQeg5jAnC](https://www.instagram.com/bakedbyh_gh/p/DUTQeg5jAnC/) | Minnie Mouse themed second birthday cake | Full frame, 1440×1440 |
| `cake-box-bow` | @bakedbyh_gh | [DSNMZmGjC0Y](https://www.instagram.com/bakedbyh_gh/p/DSNMZmGjC0Y/) | Hillary holding a cake dressed as a gift box with a satin bow | The "Introduction" sticker cropped off the top |

The studio's own `Ruffles_byH` and `@BakedbyH_gh` watermarks are left in place — they are the brand's.

## Not used

- The "Merry Christmas" card (@ruffles_byh, [DSuJ_guCNKx](https://www.instagram.com/ruffles_byh/p/DSuJ_guCNKx/)) is kept in `brand/photos-instagram/greetings-collage.jpg` as the **brand reference**: it carries both logos and the exact wine and gold the design tokens are sampled from. It is a greeting card, not product work, so it isn't in the app.
- The "Crown Her" Mother's Day flyer and the "Still thinking of what to get Mum?" card are promotional text, not photographs.
- The 5 × 10 inch rectangular cake reel cover had Instagram's play badge burnt into the middle of the cake and no crop avoided it, so the rectangular cake shows a branded tile instead.

## Resolution, honestly

| Source | Width | Photos |
|---|---|---|
| Feed post | **1440px** | hat, fascinator, bridal look, Minnie cake, cake box |
| Reel cover (reel page) | **640px** | tiara, crystal headband, blue headpiece, crown, Hillary |

1440px is Instagram's ceiling for a feed photo on the public web, and 640px is the ceiling for a
reel cover. Neither is 4K (3840px). The five reel-cover photos were first taken from the profile
grid at 361px and were re-fetched from the reel pages, which serve the same frame at 640 wide —
a real 3.1× gain in pixels, not an upscale.

That is enough for the app as it is laid out: the largest slot is the desktop hero at about
1080 CSS px, so a 1440px file still has headroom on a retina screen, and the grid tiles are
served the 480px file. The reel-cover photos are the soft ones, and they are soft because they
are frames lifted out of a compressed video, not because of their size.

**The real fix is Hillary's own originals.** Her phone holds these at roughly 3000–4000px. One
WhatsApp message gets them; drop the files in `brand/photos-original/` under the names in the
table above and run `python scripts/build_photos.py`. Nothing else has to change.

`scripts/upscale_photos.py` can AI-upscale in the meantime, but it needs the Real-ESRGAN ONNX
weights, which Qualcomm distributes through AI Hub rather than the public Hugging Face repo. It
invents detail rather than recovering it, so it is a stopgap, not a substitute for the originals.

## Getting more

Only the twelve most recent posts of a profile load without signing in, so that is the pool these came from. The quickest way to add more is for the owner to send the originals on WhatsApp: drop them in `brand/photos-original/` and run `python scripts/build_photos.py`. Everything else in the pipeline is described in the README.
