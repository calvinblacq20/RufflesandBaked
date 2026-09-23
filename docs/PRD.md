# Ruffles and Baked by H: Studio App (Demo) PRD

## Goal
Make Hillary's daily work easier and give clients a simple way to order, pay for and follow both halves of what she makes: the handmade headpieces from the workroom and the cakes from the kitchen. One app with two sides, sharing the same data. It is the same system as the Franz Qlodin tailoring build and the Dough n Frost bakery build, retuned for a studio that runs two lines at once.

## The business
Everything below comes from their WhatsApp Business profile (`brand/source-video/IMG_3173.MP4`, a screen recording) and their two Instagram accounts, as seen on 23 Sept 2026.

| | |
|---|---|
| Name | **Ruffles and Baked by H** (the WhatsApp contact is saved as "Hillary ICGC"); owner Hillary, who describes herself as "an accountant and administrator by profession" and Ruffles by H as "my first baby" |
| The two halves | **Ruffles by H** — bespoke handmade headpieces and accessories. **Baked by H** — "delicious creamy goodness": cakes and pastries |
| Services listed on WhatsApp | Millinery & Bead Work · Cakes & Pastries · Bridals (bouquets, tiara, boutonnieres, bridal fans et al) · Gift & Dowry wrapping · General merchandise · "All things classy and chic" |
| WhatsApp bio | "Luxury and affordable handmade headbands, corsages, boutonnieres, brooches and more. Guaranteed to make you look great and feel fabulous" |
| Location | **Kasoa** (from the Baked by H bio: "📍 Kasoa \| Nationwide delivery"). The street is never spelled out on any profile — see open questions. |
| Phone and WhatsApp | +233 20 584 0753 · wa.me/233205840753 ("Contact us via text, phone call, WhatsApp") |
| Email | rufflesbyh@gmail.com |
| Instagram (pieces) | [@ruffles_byh](https://www.instagram.com/ruffles_byh/) "Bespoke Handmade Headpieces and Accessories": 629 followers, 590 posts |
| Instagram (cakes) | [@bakedbyh_gh](https://www.instagram.com/bakedbyh_gh/) "Baked by H": 36 followers, 6 posts — "Home-baked with love · Crowd-pleasing cakes & pastries · Kasoa \| Nationwide delivery · DM to order \| Pre-order only" |
| Facebook | "Ruffles by H", 291 likes |
| WhatsApp Business since | March 2020 |
| Hours (WhatsApp) | 08:00–19:00 |
| Taglines | "Look great, feel fabulous" (Ruffles by H) · "Delicious creamy goodness" (Baked by H) · "Yummilicious cakes only" |
| Brand marks | A black silhouette of a woman in a wide-brim hat beside "@ruffles_byh" in deep wine serif; "Baked by H" in black serif under a small gold tiered-cake icon, on ivory with gold confetti |

### The WhatsApp catalogue
Two collections. **BakedbyH:** 6 inches 2 layers cake · Kids themed birthday cakes · Wedding Cakes · 10 inch cakes · One layer small cakes · Desserts and pastries · Number cakes & special cakes · Menu card · Calendar cakes ("available in 2, 3 or 4 layers of…") · Premium Cake Menu · Classic Cake Menu. **Ruffles by H:** Passion Chest ("Plus Freebies", GH₵ 220.00) · Gorgeous Woman Collection · Scrunchies.

### Price list (the Classic Cake Menu card, GH₵ per cake)

Flavours: Creamy Vanilla · Vanilla Raspberry · Vanilla Caramel · Strawberry · Strawberry Swirl · Chocolate · Red Velvet · White Velvet · Choco-Vanilla Marble · Red Velvet–Choco-Vanilla Marble.

| Round, square & heart | Small (6″) | Medium (8″) | Large (10″) |
|---|---|---|---|
| 1 layer | 220 | 320 | 420 |
| 2 layers | 420 | 620 | 820 |
| 3 layers | 620 | 820 | 1200 |

| Bento cakes | | | Rectangular cakes (2 layers each) | |
|---|---|---|---|---|
| 1 layer | 150 | | 4 × 8″ | 250 |
| 2 layers | 300 | | 5 × 10″ | 450 |
| | | | 8 × 12″ | 850 |
| | | | 10 × 15″ | 1250 |

| Kids themed birthday cakes (6″) | |
|---|---|
| 2 layers | 400 |
| 3 layers | 600 |
| 4 layers | 800 |

Printed on the card: whipped cream frosting · extra toppings and toppers at a fee · other sizes and layers available. An older menu card adds the flavour allowance the app uses — **one flavour per layer** (1 layer = 1 flavour, 2 layers = up to 2, 3 layers = up to 3) — and a reel adds "no extra charge for fondant inscriptions".

The card was read from a 288×640 screen recording and every figure was confirmed against an enlarged crop. The owner can correct any cell in **Menu & prices**.

### Prices for the workroom
Only one is published anywhere: the **Passion Chest at GH₵ 220**. Everything handmade is quoted after a chat, which is how she already works ("DM to order"), so the app treats bespoke pieces as **quote-first** rather than inventing a price list. The sample order book draws accepted quotes from plausible bands (see `src/data/studio-seed.ts`) purely so the owner's reports have money in them; no invented price is ever shown to a client.

## Who
- **Clients:** women ordering a hat or headpiece for a wedding, a thanksgiving or church; brides and wedding planners ordering the whole bridal set; parents ordering themed birthday cakes; families ordering engagement and dowry wrapping. They arrive from Instagram or WhatsApp, on a phone.
- **Owner:** Hillary, working the kitchen and the workroom from her phone.

## Stage
Clickable demo using sample data stored in the browser. Paystack payments, WhatsApp codes and logins are simulated: no money moves and no messages are sent.

## Design
The Franz Qlodin system (Makro look, Fresha structure; see `docs/design-reference.md`, `docs/structure-reference.md`, `docs/admin-ui-guidelines.md`) in Ruffles and Baked by H colours, taken from their own brand card: **wine** (#7b0b33) from the @ruffles_byh wordmark as the brand and primary action, **champagne gold** (#e9c67e) from "Baked by H" as the one bright accent, on the card's **ivory** ground. The mark is the wide-brim hat from their logo, with the band and a beaded pin cut out of it.

## Client side
| Screen | Job |
|---|---|
| Home | Gallery of their own work, about, menu, how ordering works, reviews, hours, good to know, map, WhatsApp and Instagram |
| Explore | The whole menu with a switch between **Cakes** and **Headpieces** (bundles show under both), filtered by occasion, searchable, with saved favourites |
| Order | Menu → customise (flavours one per layer, layers, size, finish, design, message for cakes; colours to match for pieces) → day, pickup time or delivery window, fitting if wanted → your details, allergies and head size → review and pay. No account needed. |
| Pay | Cakes on the price list: pay in full now (Paystack: Mobile Money or card) and the date is booked. Bespoke pieces and custom designs: send the request, get a quote on WhatsApp, then a deposit starts the work. |
| Track | Orders on this phone; "Find my order" with order number + WhatsApp number + code; pickups and fittings; receipts |
| Dates to remember | Birthdays and anniversaries the client saves for a WhatsApp reminder, plus allergies and head measurement (needs an account) |
| Account (optional) | WhatsApp number + code, no password |

## Owner side (`#/admin`)
| Screen | Job |
|---|---|
| Today | What to make today and the next working day (identical items counted together), trends, what's in progress, the next 14 days, today's pickups and fittings, birthday reminders to send, orders ready to hand over, requests waiting for a price |
| Orders | List and board by stage, filters in the URL, one quick action per order |
| Order | Stage stepper, money and receipts, items, allergies, brief and colours, pickup slot, WhatsApp updates |
| New order | Walk-in and WhatsApp orders with the same menu options, late-order detection and payment |
| Clients | Spend, unpaid, source; profile with orders, dates to remember, allergies, head size, a private notebook and payments |
| Pickups & fittings | Calendar of pickups, deliveries, tastings and fittings; confirm, decline, remind |
| Payments, Reports, Reviews | As in the tailor build |
| Menu & prices | The Classic Cake Menu as four editable grids (round/square/heart, bento, rectangular, kids themed), and per-item prices, notice, visibility and featuring |
| Settings | Studio details (incl. email, both Instagram handles, Facebook), hours, fees (late order, design, deposit %), policies, reset demo |

## Data model
- **Customer:** name, WhatsApp number (the matching key), email, town, address and GhanaPost address, account flag, points, lead source (Instagram / WhatsApp / Facebook / walk-in / referral / app), allergies, **head size**, owner's notebook (owner only)
- **Celebration:** customer, label, month-day, remind flag, when the reminder was last sent
- **Order:** number, customer, occasion, handover day, items, design plan (we design / client's picture / fitting) and notes, pickup or delivery, pay choice, status history, short-notice flag, total, payments
- **Order item:** menu item, quantity, **flavours (one per layer)**, size and layers (cakes) or tiers (tiered), finish, design, message on the cake, **colours to match**, unit price
- **Payment:** amount, method, payer, Paystack reference, receipt number, kind (full / part / final)
- **Appointment:** pickup, delivery, tasting or fitting; time; status; linked order
- **Menu item:** name, **line (cakes / ruffles / both)**, category, price kind (price list / tiered / per unit / **bespoke**), **price range** for cakes, price, extra per tier, unit, minimum quantity, notice in working days, visibility
- **Price grid:** range × layers × size → price; blank = not offered
- **Rules:** late-order fee, design fee, deposit percentage

Order stages: `request → quoted → confirmed (paid) → making → finishing → ready → collected` (or `cancelled`). The two middle stages are worded per order: a cake is "Baking" then "Decorating", a headpiece is "Beading" then "Finishing", and a mixed order reads neutrally.

## Edge cases
- Less notice than the item needs: the day is marked "Late" and the late-order fee is added once per order. The next working day is the earliest; Sundays are closed.
- A size isn't priced at that layer count: it's shown but disabled, and changing layers moves the size to one that is offered.
- Choosing more flavours than there are layers: the oldest choice drops off, so the cake never carries more flavours than layers.
- A bespoke piece has no price: the order total reads "So far" and says the pieces aren't in the number yet; the sticky bar reads "By quote".
- Minimum quantities: boutonnieres 4, cake jars 6, guest favour boxes 10.
- Payments can't exceed what's owed.
- Paying in full online for a price-list cake books it (confirmed); paying for a custom design keeps it a request until the owner quotes, and the quote then books it.
- The same WhatsApp number orders again as a guest: one customer record, allergies kept.
- An order link opened on another phone: hidden until the order number, WhatsApp number and code match.
- A reminder isn't offered twice within a month.

## Open questions for the owner
1. **The pickup address.** No profile gives a street — the app says "Kasoa, Central Region" and the directions promise to send the exact spot on WhatsApp. Fill in the real street and landmark in **Settings → Studio**.
2. **Opening days.** WhatsApp shows one 08:00–19:00 range with no per-day breakdown. The app assumes Monday–Saturday open and Sunday closed (the owner's own posts are church-facing). Correct it in **Settings → Hours**.
3. **Notice periods.** Cakes use 3 working days (5 for kids' themed) and pieces 5–21 days. Confirm the real turnarounds.
4. **Prices not on the menu card.** Wedding cake (GH₵ 1,800 for 2 tiers + GH₵ 600 per extra tier), calendar cake (GH₵ 900), dessert box (GH₵ 180), cake jars (GH₵ 35), cupcakes (GH₵ 120), boutonnieres (GH₵ 60), brooch (GH₵ 80), scrunchies (GH₵ 45), Crown Her set (GH₵ 450), guest favour box (GH₵ 55) are all **samples**. Only the Passion Chest (GH₵ 220) and the cake grid are real.
5. **Ganache (+GH₵ 120) and fondant (+GH₵ 150)** extras are samples; the menu card only prices whipped cream.
6. **The deposit.** The app takes 50% to start a bespoke piece. Confirm.
7. **Delivery:** fee by distance paid to the rider, or a fixed zone price? Nationwide delivery is advertised but not priced.
8. **The Premium Cake Menu and Calendar cakes** were in the catalogue but never opened on the recording — send those cards and they go straight in.
9. The duplicate "Strawberry" on the flavour list (it appears twice on the card) — is one of them meant to be something else?

## Going live with Paystack
- The app starts the payment with the public key; the secret key lives only on the server.
- An order is marked paid only after the server verifies the transaction (Paystack verify API or a webhook with a checked signature), and the verified amount and currency (GHS) match what's due.
- The Paystack reference (`RBH1042-XXXXXX`) is unique per attempt, so a repeated webhook can't record a payment twice.
- Receipts are numbered on the server after verification.

## Out of scope (demo)
Real authentication, live Paystack and WhatsApp (need the server above), sending reminders automatically, materials and ingredient stock, multi-staff roles.

## Decision log
| Decision | Alternatives | Why |
|---|---|---|
| Copy the same system and retune it | Build from scratch | Calvin asked for the same system; the structure is proven |
| One app for both lines, with a switch | Two separate apps | It's one owner, one order book, one WhatsApp number — and clients already cross over ("sister biz") |
| Bespoke pieces are quote-first, with no list price | Invent a price list | She has never published one; inventing prices would put wrong numbers in front of her clients |
| Cake prices from four grids keyed by shape | One grid keyed by flavour | Her menu card is organised by shape and layers, and flavour doesn't change the price |
| One flavour per layer | One flavour per cake | Her own menu card says "up to 2 flavours"/"up to 3 flavours" by layer count, and her posts show two-flavour cakes |
| Stage names vary by order line | One neutral set | "Baking" is wrong for a tiara and "Beading" is wrong for a cake; the order knows which it is |
| Wine and champagne gold on ivory | Keep the bakery's frosting pink | Different brand colours were asked for, and these are hers, sampled from her own brand card |
| The hat silhouette as the mark | A monogram | It's already her logo mark on @ruffles_byh |
| Real photos from their two Instagram accounts | Stock photos | They are her own work; the same approach as the previous two builds |
