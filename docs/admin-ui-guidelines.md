# Admin (owner side) UI guidelines

> **Ruffles and Baked by H adaptation.** This reference came from the Franz Qlodin build by way of the Dough n Frost one, and this app reuses its layout, components and motion unchanged. What differs: the palette (wine-black ink `#2A141C` on ivory `#F7EFE9`, with wine `#7B0B33` as the brand and champagne gold `#E9C67E` as the one accent, called `gold` in code where the tailor build said `lime`; the pastel slots carry this studio's tones — see `src/styles/tokens.css`), the wide-brim hat mark (`src/components/Brand.tsx`), and the vocabulary:
>
> | Tailor build | Ruffles and Baked by H |
> |---|---|
> | Styles, catalogue | Menu items, the menu (plus the Classic Cake Menu grid) |
> | One catalogue | Two lines: Baked by H (kitchen) and Ruffles by H (workroom) |
> | Measurements, measuring visit | Dates to remember, allergies, head size; tasting or fitting |
> | Fitting | Pickup or delivery slot — and a fitting, for hats and headbands |
> | Deposit (50%) | Cakes: paid in full. Bespoke pieces: quote, then a 50% deposit |
> | Cutting · Sewing · Fitting | Making · Finishing, worded per order (Baking/Decorating or Beading/Finishing) |
> | Rush (+20%) | Late order (+GH₵ 50) |
> | Workshop | Kitchen and workroom |
> | TikTok | Instagram (two accounts) |

Rule for the owner side: **the look comes from the client side, the structure from the dashboard references in `STRUCTURE REFERENCE/admin/`, and the content from the owner's daily work at Ruffles and Baked by H.**
The client side's look is already in code (`src/styles/tokens.css`, `ui.css`, `src/motion.ts`), and it follows `design-reference.md`. Nothing on the admin side gets its own colours, fonts or radii.

The owner works on a phone in the kitchen and the workroom and sometimes on a laptop, so every screen below is specified for both sizes.

---

## 0. Reference images

| File | Take from it | Used on |
|---|---|---|
| `01-kpi-tabs-trend-chart.jpg` | A row of KPI tabs (label with ▾ menu, big number, change vs last period). The active tab drives one line chart underneath, drawn against a dashed line for the previous period. Date-range menu under the chart. | Today, Reports |
| `02-live-counter-ranked-table.jpg` | A big "right now" number with a split bar under it, activity bars per time slot, and a ranked table (rank, name, count, share %). Small stacked tables in a side column. | Today (workshop now), Reports |
| `03-sidebar-sparklines-composition.jpg` | Sidebar navigation, a column of small KPI cards with sparklines, a wide two-series line chart, a composition chart with a legend, and ranked lists in a right column. | App shell, Reports |
| `04-search-filters-results.avif` | Top bar with logo and links, a two-field search bar, a left filter panel (checkbox groups, range slider, radios, "Clear all"), a result count with a sort menu, result cards (icon, title, linked subtitle, meta tags, snippet, quick action, save icon), and a right rail with a promo card and a short list. | Orders, Clients, Payments, Reviews, Appointments |

The references are watermarked stock photos. Use them to study layout only; they never appear in the app. Their colours (Google blue, green, orange) are **not** used. Section 7 maps every chart to our palette.

---

## 1. Carried over from the client side, unchanged

| Area | Rule |
|---|---|
| Colour | Tokens in `tokens.css` only: ground `#F5EDE8`, white surfaces, ink `#2B1F1D` and its alphas, charcoal, graphite, berry `#FF9CCB`, the pastels (lilac, sky, sand, blush, steel, mist), slate. Light theme only. |
| Type | Inter (opsz 32) for everything, Fragment Mono for reference numbers and data labels. App scale classes: `t-h1` 32, `t-h2` 28, `t-h3` 20/500, `t-title` 16/500, `t-body` 14, `t-cap` 12, `t-num` 36/500 tabular. |
| Shape | The tightened radii (`--r-16` = 8px cards, `--r-img` 8px). Pills stay fully round. |
| Selection | **No outline rings.** Selected and active states are fills: ink fill (chips, slots), berry (active nav, the count bubble on an active chip), berry-wash (selected cards), white on the ground track (segmented control). |
| Depth | `--sh-soft` on cards, `--sh-float` on tooltips, popovers and the floating tab bar, `--sh-deep` on dialogs. |
| Buttons | Primary action = `Cta` (dark button with a berry arrow square that swaps on hover). Secondary = `btn-outline` / `btn-soft`. Destructive = `btn-danger`, shown only inside a confirmation. |
| Components to reuse | `Button`, `Cta`, `Dots`, `Badge`, `Avatar`, `Skeleton`/`useSkeleton`, `Sheet`, `DateStrip`, `MonthCalendar`, `CountUp`, `NotifyProvider` toasts, `SuccessScreen`, `LogoMark`/`AppIcon`, the `TopBar` pattern, `.chip`, `.segmented`, `.row`/`.list-card`, `.kv`, `.field`, `.banner`, `.empty`, `.timeline`. |
| Brand | The Ruffles and Baked by H hat mark in the sidebar and tab bar. Splash stays strictly black and white. |

What changes: information density (desktop rows are 44px instead of 52px), a persistent sidebar on wide screens, and marketing-only scroll effects are left out (section 12).

---

## 2. App shell

### Wide screens (≥1024px), from refs 03 and 04

```
┌───────────────────┬──────────────────────────────────────────────────────────────┐
│ [RBH] Ruffles & Baked by H │  Today              [ Search clients, orders… ]  (!) (F)     │
│  Bakery admin     │  ● Open · 14 in production  [Last 30 days ▾] [■→ New order]  │
│                   ├──────────────────────────────────────────────────────────────┤
│ WORKSHOP          │                                                              │
│ [▣ Today        ] │   Content: 12-column grid, max width 1200px, 24px gaps       │
│  ▢ Orders      12 │                                                              │
│  ▢ Appointments   │                                                              │
│ PEOPLE            │                                                              │
│  ▢ Clients        │                                                              │
│  ▢ Reviews      3 │                                                              │
│ MONEY             │                                                              │
│  ▢ Payments       │                                                              │
│  ▢ Reports        │                                                              │
│ STUDIO            │                                                              │
│  ▢ Styles & prices│                                                              │
│  ▢ Settings       │                                                              │
│ ───────────────── │                                                              │
│ (E) Em · Owner│                                                              │
│ View client app ↗ │                                                              │
└───────────────────┴──────────────────────────────────────────────────────────────┘
```

**Sidebar** (248px at ≥1200; a 76px icon rail at 810–1199). Right rails sit beside the content only at ≥1360px; below that they stack under it, because a 1280px laptop can't fit the sidebar, four KPI tabs and a rail side by side.
- White surface on the ground, full height, sticky. The page scrolls; the sidebar doesn't.
- Logo row at the top: `LogoMark` 32px + "Ruffles and Baked by H" (`t-title`) + "Studio admin" (`t-cap`, ink-75).
- Group labels: 12px Fragment Mono, uppercase, 0.06em tracking, ink-75. Groups: Kitchen · People · Money · Bakery.
- Items: 40px tall, pill radius, 20px lucide icon (stroke 1.8) + 14px label in ink-75. Hover = `--ground` fill. **Active = berry fill, ink label, weight 500.** The fill slides between items using a shared `layoutId`, just like `tab-hl` on the client tab bar (`spring.press`).
- Counts on the right (new requests, reviews waiting): the `.chip-count` bubble. Only show a count when something needs action.
- Footer: owner `Avatar` + name + role, "View client app ↗", and **Reset demo** in Settings, never in the sidebar.
- Icon rail: icons only, centred; the label shows as a tooltip on hover and focus. The active icon sits in a berry rounded square (the Makro dashboard shell).

**Top bar** (sticky, glass `--glass` + 8px blur once scrolled, the same `is-solid` behaviour as the client)
- Left: page title `t-h1`, with a status line under it: 8px dot (`--open` when open) + `t-cap` ink-75 text.
- Right: global search (pill, ground fill, 40px, ⌘K / Ctrl K hint on desktop), notifications `icon-btn`, owner avatar.
- Second row, right-aligned: the page's period menu (when the page has charts) + the page's primary `Cta`. Exactly one primary action per page.

### Tablet (810–1199px)
Icon rail on the left. Right rails (pattern D) drop below the main column as a horizontal row of cards. Charts go full width.

### Phone (<810px), same patterns as the client app

```
┌──────────────────────────────┐
│ Today                 (⌕)(F) │  large title, collapses to a sticky bar
│ ● Open · 14 in production    │
│ ┌────┐┌────┐┌────┐┌────┐ →   │  KPI tabs scroll sideways
│ └────┘└────┘└────┘└────┘     │
│ ┌──────────────────────────┐ │
│ │ chart                    │ │
│ └──────────────────────────┘ │
│  …                           │
│ ╭──────────────────────────╮ │
│ │ Today Orders (+) Clients │ │  floating tab bar (+ More)
│ ╰──────────────────────────╯ │
└──────────────────────────────┘
```

- Floating tab bar, reusing `.tabbar`: **Today · Orders · (+) · Clients · More**. The centre (+) is a 48px ink circle holding a berry plus that opens New order. "More" opens a `Sheet` holding the rest of the navigation.
- No sidebar and no right rail. Rail content becomes a `.banner` at the top of the list, or a section at the bottom.
- The page's primary action moves into the sticky bottom bar (`.sticky-bar`) on detail and form screens.
- The gutter is 16px, the same as the client's `--gutter`.

---

## 3. Pattern A: KPI tabs + trend chart (ref 01)

```
┌──────────────────────────────────────────────────────────────────────────┐
│ ┌────────────────┐                                                       │
│ │Cash received ▾ │  New orders ▾    Balance owed ▾    Due this week ▾    │
│ │GH₵ 18,450      │  23              GH₵ 6,200         9                  │
│ │[↑ 12%]         │  [↓ 8%]          [↑ 4%]            [no change]        │
│ └────────────────┘                                                       │
│  GH₵ 2k ┤              ╭─╮                                               │
│         │     ╭────────╯ ╰╮          ╭──                                 │
│  GH₵ 1k ┤ ╭───╯  - - - - - ╰╮ - - -╭─╯                                   │
│         │─╯  - -            ╰──────╯                                     │
│       0 └─────────────────────────────────────────────────────────       │
│           18 Aug       25 Aug        1 Sept        8 Sept                │
│  ━━ Last 30 days   ┅┅ Previous 30 days                                   │
├──────────────────────────────────────────────────────────────────────────┤
│  [Last 30 days ▾]                                       View report →    │
└──────────────────────────────────────────────────────────────────────────┘
```

- One white card holding 3–4 tabs, the chart, and a footer row separated by an `--ink-06` hairline.
- **Tab:** `t-cap` label with a ▾ (a menu to swap the metric), value in `t-num` (with `CountUp` on the first load only), and a delta pill underneath. **The active tab gets a `--ground` fill with Makro's tab shape** (`var(--r-20) var(--r-20) var(--r-8) var(--r-8)`), and its value goes to ink. Inactive values are ink-75. The reference uses a blue bar above the active tab; we use the fill instead.
- **Delta pill** (the `.badge` shape at 22px, no well): the arrow shows the direction, and the **fill shows whether the change is good or bad**. Good = berry, bad = sand, neutral = ground. Text is always ink. "Balance owed ↑" is sand even though the number went up. Each metric declares which direction is good.
- **Chart:** section 7. Clicking a tab redraws the chart for that metric (crossfade 0.3s, `spring.micro`).
- Period menu: Last 7 days · 30 days · 90 days · 12 months, in the `Dropdown` component (never the browser's own select menu). The period lives in the URL (`?period=90d`). The comparison is always the previous period of the same length.
- Metrics for Ruffles and Baked by H: **Cash received · New orders · Balance owed · Collected** (Today); **New orders · Collected · Average order · On time %** (Reports). "Due this week" has no history to chart, so it lives in the workbench card instead.
- KPI numbers size to the card with container queries (24 → 26 → 30px), and the tabs go 2 × 2 when the card is under 720px.
- **Phone:** tabs become a sideways-scrolling row of 150px mini cards. The selected card has the ground fill. The dropdown opens as a menu towards whichever side has room.
- A **Table** toggle under every trend chart shows the same numbers as rows.

---

## 4. Pattern B: "Right now" counter + ranked table (ref 02)

```
┌─────────────────────────┐ ┌────────────────────────────────────────────────┐
│ In the workshop now     │ │ Workshop activity · today            By hour ▾ │
│                         │ │  ▂   ▅   ▃   ▇   ▂   ▁   ▆   ▄   ·   ·         │
│ 14                      │ │ 8am     10am     12pm     2pm     4pm     6pm  │
│ orders in production    │ └────────────────────────────────────────────────┘
│                         │ ┌────────────────────────────────────────────────┐
│ Cutting  Sewing  Fitting│ │ Top styles this month                 See all →│
│ 4        7       3      │ │ #   Style                     Orders    Share  │
│ ▅▅▅▅     ▇▇▇▇▇▇▇ ▃▃▃    │ │ 1   Agbada three-piece            12  ▇▇▇  26% │
│                         │ │ 2   Two-piece kaftan               9  ▅▅   20% │
│ Ready, not collected  5 │ │ 3   Slim two-piece suit            7  ▄▄   15% │
│ Late                  2 │ │ 4   Senator set                    5  ▃    11% │
└─────────────────────────┘ └────────────────────────────────────────────────┘
┌─────────────────────────┐
│ Where orders came from  │
│ Instagram          18  ▇▇ │
│ WhatsApp         11  ▅  │
│ Walk-in           6  ▃  │
│ Referral          4  ▂  │
└─────────────────────────┘
```

- **Counter card:** a `t-cap` label, the number at 64px / 400 / -0.04em (Makro H1), and a caption in ink-75. This is the one card per screen that may use the **dark variant** (`--ink` ground, berry number, white-75 text), like the Makro dark bento.
- **Stage strip** (replaces the reference's colour split bar): one column per production stage, each with its count and a bar whose length is proportional to that count. Comparing lengths reads better than comparing colours. Tapping a stage opens Orders filtered to it.
- Under the strip: plain `.kv` rows for **Ready, not collected** and **Late**. Late turns sand when it's above 0.
- **Activity bars:** 12–14 bars per chart, 4px radius on top only. The current slot is ink, past slots slate, future slots an ink-06 stub.
- **Ranked table:** section 8. The share column shows the percentage plus a 48px inline bar (slate on a ground track).
- **Small side tables** (ref 02's left column): at most 5 rows each, a title, and "See all" when there are more. They use neutral bars, never category colours.
- **Phone:** the counter card sits first, full width; the stage strip stays in a row of three. Activity bars scroll sideways inside their card. The ranked table becomes rows (name left, count and share right).

---

## 5. Pattern C: report grid (ref 03)

```
 3 columns            6 columns                                  3 columns
┌──────────────────┐ ┌────────────────────────────────────────┐ ┌──────────────────┐
│ Orders taken     │ │ ● Orders taken   ● Collected   90 days▾│ │ Top clients      │
│ 46        ╱╲_╱‾  │ │                                        │ │ Kwame Mensah     │
├──────────────────┤ │   two-series line chart                │ │ GH₵ 4,800 · 6 ord│
│ Cash received    │ │                                        │ │ Yaw Boateng      │
│ GH₵ 38,200 _╱‾╲  │ └────────────────────────────────────────┘ │ GH₵ 3,950 · 4 ord│
├──────────────────┤ ┌────────────────────────────────────────┐ ├──────────────────┤
│ Average order    │ │ Payments by method                     │ │ Occasions        │
│ GH₵ 820   ‾╲_╱   │ │ ███████████████████▌██████▌███▌▏       │ │ Wedding      31% │
├──────────────────┤ │ ■ MoMo     GH₵ 23,300          61%     │ │ Church       24% │
│ On time          │ │ ■ Cash     GH₵ 9,550           25%     │ │ Funeral      18% │
│ 87 %      _╱‾‾   │ │ ■ Bank     GH₵ 4,580           12%     │ │ Political     9% │
└──────────────────┘ │ ■ Card     GH₵ 770              2%     │ └──────────────────┘
                     └────────────────────────────────────────┘
```

- Grid: 3 / 6 / 3 columns at ≥1200px; 4 / 8 at 1024–1199 (the right column moves under the main one); a single column below that.
- **Sparkline cards:** one white card split by hairlines (not four separate cards). `t-cap` label, value at 28px / 500 tabular, and a 72×28 sparkline in slate with no axes and a dot on the latest point.
- **Composition:** use Makro's **segmented bar + legend rows** ("Income sources") instead of the reference's pie chart. One 12px bar with 2px white gaps between segments, then a legend row per part: swatch, name, amount, share. A donut is allowed only for four or fewer parts, with labels outside the ring. Never a 3D or exploded pie.
- **Right-column lists:** name plus secondary line; the value is right-aligned. Five rows, then "See all".
- **Phone:** sparkline cards become a 2×2 grid, then the main chart, the composition, and the lists, in that order.

---

## 6. Pattern D: search, filters, results, right rail (ref 04)

```
┌─────────────────────────────────────────────────┬──────────────────────────┬────────────────┐
│ Who or what?                                    │ Needed by                │                │
│ Name, phone or order no.                        │ Any date ▾               │   [ Search ]   │
└─────────────────────────────────────────────────┴──────────────────────────┴────────────────┘

┌───────────────────┐   142 orders                     Sort: Due soonest ▾
│ Filters  Clear all│                                                      ┌──────────────────┐
│                   │  ┌────────────────────────────────────────────────┐  │▓ 3 orders due   ▓│
│ Stage             │  │ [▣] Agbada three-piece                     (☆) │  │▓ this week still▓│
│ ■ New request   4 │  │     Kwame Mensah · FQ-1042                     │  │▓ owe GH₵ 2,700  ▓│
│ □ Quote sent    2 │  │     Kasoa · [Sewing] · [GH₵ 900 owed]          │  │▓ [■→ Reminders] ▓│
│ ■ In production 14│  │     Wedding Sat 27 Sept. Gold embroidery, sl…  │  ├──────────────────┤
│ □ Ready           │  │     Ready by Thu 25 Sept      Record payment → │  │ Fittings today   │
│                   │  └────────────────────────────────────────────────┘  │ 10:00 Yaw Boateng│
│ Balance owed      │  ┌────────────────────────────────────────────────┐  │ 14:30 Kofi Asante│
│ ●════════●─────   │  │ …                                              │  │ See calendar →   │
│ GH₵ 0 – 2,000     │  └────────────────────────────────────────────────┘  └──────────────────┘
│                   │
│ Payment           │          Showing 20 of 142   [ Load more ]
│ ◉ Any    ○ Paid   │
│ ○ Deposit ○ None  │
└───────────────────┘
```

**Search bar** (one white card, full width above the columns)
- Two fields side by side, separated by a hairline, each with a 12px label above and the input below (the Makro `.field` style). The first is always free text (name, phone in any Ghana format, order number); the second is the page's most useful filter (Needed by, Town, Date).
- Search button = `Cta`. Typing also filters live, debounced by 250ms.

**Filter panel** (260px, sticky under the top bar, scrolls on its own)
- Header: "Filters" `t-title` + "Clear all" `.link` (hidden until a filter is on).
- Group label: `t-cap` ink-75, weight 500. Groups are separated by 20px, with no dividers.
- **Checkbox:** 18px square, `--r-4`, unchecked = `--ink-12` fill, **checked = ink fill with a white tick**. The count sits on the right in ink-75. The whole row is the hit area (min 36px desktop, 44px phone).
- **Radio:** 18px circle, unchecked `--ink-12`, selected = ink fill with a white 6px centre.
- **Range slider:** 4px `--ink-12` track, ink filled range, 20px white thumbs with `--sh-chip`. Values show underneath as text ("GH₵ 0 – 2,000"), and each thumb can be moved with the arrow keys.
- Results update right away; there is no Apply button on desktop. The URL keeps the filters, so Back and shared links restore them.

**Results column**
- Heading row: count in `t-h2` ("142 orders"), and "Sort: Due soonest ▾" on the right. Sort options: Due soonest · Newest · Balance owed · Client A–Z.
- Active filters show as removable chips (`.chip.is-active` with ×) under the heading.
- **Result card** (`.card`, 20px padding, 12px gap between cards):
  - Left: 40px square. Style photo thumb (`--r-img`) for orders, `Avatar` for clients, tinted icon square (`.row-icon`) for payments.
  - Title `t-title`. Subtitle in ink-75: client name as a link (ink, underlined on hover, **never blue**) · reference number in `t-mono`.
  - Meta row: town with a map-pin icon · status `Badge` · money `pill-tag` (berry = paid in full, sand = balance owed).
  - Snippet: order notes or the owner's notes, clamped to two lines (add `.clamp-2` next to the client's `.clamp-3`), ink-75.
  - Footer: key date on the left ("Ready by Thu 25 Sept", sand when late); **quick action** on the right as a text link with an arrow ("Record payment →", "Send update →", "Confirm fitting →"). One quick action per card: the next thing the order needs, taken from `nextAction` in `lib/orders.ts`.
  - Top right: a 32px plain `icon-btn` (pin, or ⋯ menu for Mark ready · WhatsApp · Print receipt · Cancel).
  - The whole card opens the detail page; the quick action and icon button stop that click.
- **Paging:** 20 at a time, "Showing 20 of 142" + `btn-outline` "Load more". Never load an unbounded list.

**Right rail** (300px, sticky)
- Top: **one dark action card** (the reference's blue "Upgrade" card, drawn as Makro's alert card): ink ground, white text, a berry `Cta`. It holds the most urgent batch job on that page, such as "3 orders due this week still owe GH₵ 2,700 · Send reminders". Hide the card when there's nothing to do; never fill it with a promo.
- Below: one short white list card (ref 04 "Trending"), for example "Fittings today" or "Recently viewed clients", with five rows and a link.

**Phone**
- The search bar collapses to one pill field. A "Filters" chip with the active count sits next to it and opens a full-height `Sheet` with the same groups, ending in a sticky dark button that says "Show 42 orders".
- The sort menu is a chip that opens a sheet of radio rows.
- Result cards keep their order but the snippet drops to one line. The quick action becomes a full-width `btn-soft` at the bottom of the card.
- The dark action card becomes a `.banner` above the results.

---

## 7. Charts

**Build:** plain SVG React components in `src/admin/charts/`: `LineChart`, `BarChart`, `Sparkline`, `SegmentedBar`, `StageStrip`. These five cover every screen, so no chart library is needed, and the bundle stays small on mobile data.

**Colour on white cards.** Contrast measured against `#FFFFFF`:

| Mark | Token | Contrast | Rule |
|---|---|---|---|
| Main series line | `--ink` | 15.5 | 2px, round joins. Optional area fill: lilac 28% at the top, fading to 0 |
| Second series line | `--slate` | 5.1 | 2px. At most two measured series per chart |
| Previous period | `--ink-50` | 3.1 | 1.5px, dashed `4 4`, no area fill |
| Bars | `--slate` | 5.1 | The current or hovered bar is `--ink` |
| Sparkline | `--slate` | 5.1 | 1.5px, ink dot on the last point |
| Gridlines | `--ink-06` | – | Horizontal only, at most 5 |
| Axis and tick text | `--ink-75`, 12px tabular | 6.8 | Never `--ink-50` for small text (3.1 fails) |
| Category fills | lilac · sky · sand · berry · steel, in that order | 1.1–2.1 | **Fills only, never lines or text.** Always paired with a direct label or legend row with the value. Leave 2px white gaps between neighbouring segments. |

**Dark cards** (one per screen at most): lines berry (10.6 on charcoal), lilac (6.1) and sky (8.6); axis text white-75; gridlines white 8%.

**Fixed category colours**, so the same thing is the same colour everywhere:
- Payment methods: MoMo = berry · Cash = sky · Bank = lilac · Card = sand
- Order stage groups: New = lilac · Waiting on client = sand · In production = sky · Ready = berry · Collected = mist (the same tones as `badgeFor` in `lib/orders.ts`)
- Rankings and lead sources don't use hue: slate bars on a ground track.

**Behaviour**
- Hovering or tapping a point shows a vertical ink-12 hairline and a tooltip card (white, `--sh-float`, `--r-12`, 10/12px padding). The tooltip shows the date in `t-cap`, then one row per series: swatch, name, value. Keyboard: the chart is focusable, and ←/→ step through points.
- Money axes are compact ("GH₵ 2k"); tooltips show the full `money()` value.
- Every chart has a "View as table" toggle in its ⋯ menu, and an `aria-label` summary such as "Cash received, last 30 days: GH₵ 18,450, up 12%".
- An empty period shows the axes with a centred `t-cap` line: "No payments in this period". Never draw a flat zero line that looks like real data.

---

## 8. Tables and lists

| Part | Spec |
|---|---|
| Header row | 12px, weight 500, ink-75, sentence case. Sticky inside long tables. Sortable headers show ▲/▼ and set `aria-sort`. |
| Rows | 44px desktop / 52px phone, `--ink-06` dividers, no zebra stripes. Hover = `--ground` fill. The whole row is clickable when it leads somewhere. |
| Numbers | Right-aligned, `font-variant-numeric: tabular-nums`. Money through `money()`. Totals row in weight 500 above a 1px ink-12 rule. |
| Rank column | 32px wide, ink-75. |
| Reference numbers | `t-mono` (FQ-1042, receipt numbers). |
| Status | `Badge`, never coloured text alone. |
| Row actions | Revealed on hover on desktop (always visible on touch), at most two icon buttons plus ⋯. |
| Bulk select | Only on Orders and Reviews: an ink checkbox column, and a dark action bar that slides up from the bottom ("3 selected · Mark ready · Send update"). |
| Phone | Tables become `.list-card` rows: primary text + secondary line on the left, value + badge on the right, with a chevron. |

---

## 9. Status and meaning

- **Order status badges** use the client mapping (`badgeFor` in `src/lib/orders.ts`) so an order looks the same on both sides. The owner sees the detailed stage label (Cutting / Sewing / Fitting) where the client sees "In production".
- **Good / needs attention / neutral** = berry / sand / ground, everywhere: delta pills, money tags, the late flag. This matches Makro's Paid = berry, Overdue = sand.
- **Red (`--danger`)** is only for Cancelled, destructive buttons inside confirmations, and form errors. A late order or an unpaid balance is sand, not red.
- **Green (`--open`)** is only the "open now" dot. At 3.0:1 it never carries text.
- Nothing relies on colour alone: every badge has words, every delta has an arrow, every chart segment has a label.

---

## 10. Numbers, dates and words

- Money: `money()` → "GH₵ 1,500", "GH₵ 12.50". Compact money ("GH₵ 18.4k") only on chart axes and phone KPI cards.
- Dates: `fmtDayShort` → "Tue, 15 Sept" in lists; `fmtDay` on receipts and detail pages; `relativeDay` for "Today" / "Tomorrow" / "In 3 days" on due dates. Times in 24-hour format ("14:30"). The business runs on Africa/Accra time (UTC+0).
- Phones display as "024 851 5773" and are stored as +233 for WhatsApp links (`formatGhPhone` / `normalizeGhPhone` in `lib/contact.ts`).
- Words the owner uses: "Balance owed", not "receivables". "Ready for pickup", not "fulfilled". "Client", not "customer" or "user". Buttons are verbs: "Record payment", "Send update", "Mark ready".
- Sentence case everywhere. The only uppercase is the sidebar group labels.

---

## 11. Loading, empty, error and offline states

| State | Rule |
|---|---|
| Loading | `Skeleton` blocks in the exact shape of the layout (KPI tabs, chart area, 5 result cards), crossfading to content. No spinners on page loads; `Dots` inside a button while an action runs. |
| Empty | `.empty`: icon, one sentence, one action. Examples: "No orders due this week" with "View all orders"; with filters on, "No orders match these filters" with "Clear all". |
| Error | Inline card in place of the failed block: "Couldn't load payments" + "Try again". The rest of the page stays usable. Never show raw error text. |
| Offline | A sand `.banner` under the top bar ("You're offline. Changes will save when you reconnect"). Workshop Wi-Fi and mobile data drop out, so forms keep their input. |
| Saved | A toast through `useNotify` ("Payment recorded · Receipt FQ-R-0214"), with an Undo action where it's safe. `SuccessScreen` is only for creating a new order. |
| Stale | Dashboards show "Updated 2 min ago" in `t-cap` next to the period menu. |

---

## 12. Motion

The admin uses the same motion engine and springs as the client (`src/motion.ts`), and the same motion mode from `motionMode()` (full on every device; `?motion=` lowers it for testing). It leaves out the marketing scroll effects, because the owner opens these screens many times a day.

| Keep | Where |
|---|---|
| `enter()` rise on first paint, staggered by 0.05s | Cards on Today and Reports, once per session per screen |
| `blurIn()` | Page title on first load |
| `CountUp` | KPI values on first load only; later updates change instantly |
| Chart draw-in | Line path over 0.8s (`spring.settle`), bars grow from the baseline with a 0.02s stagger, first load only |
| Shared-layout fill slide (`spring.press`) | Active sidebar item, KPI tab, segmented controls, tab bar |
| `Sheet` slide-up, `push` for flows | Filters sheet, More menu, New order steps |
| Skeleton crossfade, button `Dots`, toasts | Everywhere |

| Leave out on admin screens | Why |
|---|---|
| Lenis smooth scroll | Tables, the filter panel and sheets scroll on their own; native scrolling is faster for repeated work. Disable it on `/admin` routes, or add `data-lenis-prevent` to those scroll areas. |
| Word-by-word text reveal, sticky stacking cards, parallax bento, rising footer | They slow down a page the owner opens 20 times a day |
| Splash on every visit | Show it once per session, black and white |

---

## 13. Screen map

| Screen | Route | Patterns | Right rail / banner |
|---|---|---|---|
| Today | `/admin` | A (Cash received · New orders · Balance owed · Collected) + B (workshop now, top styles, where orders came from) + today's appointments list | New requests to quote · Ready, not collected |
| Orders | `/admin/orders` | D, with a List / Board `.segmented` toggle. Board = one column per stage, cards from D | Due this week and still owing |
| Order detail | `/admin/orders/:id` | The client `OrderDetail` structure plus owner actions: stage stepper, Record payment, Send WhatsApp update, ready photo, receipts | Client card + measurements used |
| New order | `/admin/orders/new` | Client `OrderFlow` steps on one page; at ≥1024, a form on the left and a sticky summary card on the right | – |
| Clients | `/admin/clients` | D (filters: town, lead source, owes money, last order) | Birthdays / follow-ups (later) |
| Client profile | `/admin/clients/:id` | Header card + a KPI strip (lifetime spend, orders, balance owed) + tabs: Orders · Measurements · Owner's notebook · Payments | WhatsApp · Call · New order |
| Appointments | `/admin/appointments` | `DateStrip` + day list; D filters (purpose, status) | Requests waiting for a yes |
| Payments & receipts | `/admin/payments` | Composition bar (by method) + D as a table on desktop | Balances owed, total |
| Reports | `/admin/reports` | A + C | – |
| Reviews | `/admin/reviews` | D (status: waiting · published · hidden) with Approve / Hide / Reply | – |
| Styles & prices | `/admin/styles` | Table (rows on phones) with an edit sheet per style: name, description, starting price, studio-fabric add, turnaround, featured and shown-to-clients. Hidden styles stay on past orders. "Reset all prices" restores the starting catalogue | – |
| Settings | `/admin/settings` | Editable cards, each saved on its own: studio details (name, phone/MoMo, area, address, directions, maps, links, about), opening hours per day, and the four policies. Each card shows "Unsaved" until saved and can undo | Reset settings · Reset demo data |

---

## 14. Before a screen counts as done

- [ ] Checked at 375px, 810px, 1024px and 1440px; the page never scrolls sideways.
- [ ] Only tokens from `tokens.css`; no new colour values, no outline rings, and selected states are fills.
- [ ] One primary `Cta` per page.
- [ ] Skeleton, empty, error and offline states all exist.
- [ ] Lists page 20 at a time; filters live in the URL.
- [ ] Charts have labels, a table view and an `aria-label` summary; no category colour used as a line or text.
- [ ] Everything works by keyboard (sidebar, tabs, filters, chart points, sheets) and has 44px touch targets on phones.
- [ ] Motion plays once and never blocks input. Every device gets full motion (decided 18 Sept 2026); test calmer modes with `?motion=calm` or `?motion=off`.
- [ ] Tests for any new logic (KPI deltas, period comparison, filter and sort), in the same session.

---

## 15. Decisions (confirmed 15 Sept 2026)

1. **Keyboard focus.** A 2px ink outline shows **only** on keyboard focus (`:focus-visible`), never on click or tap. Every other state uses fills.
2. **Smooth scroll.** Lenis runs on the client side only; `/admin` routes use native scrolling. The springs, reveals, count-ups and chart draw-ins stay.
3. **Mobile tab bar.** Today · Orders · (+) · Clients · More. Appointments, Reviews, Payments, Reports, Styles and Settings sit under More.
4. **Dropdowns.** Every select on the admin side is the `Dropdown` listbox (white menu, ground fill on the hovered row, berry check on the chosen one). It keeps full keyboard support: arrows, Enter, Escape and type-ahead.

---

## 16. Where the code lives

| Part | Files |
|---|---|
| Routes and shell | `src/admin/AdminApp.tsx` (lazy-loaded at `#/admin`), `src/admin/Shell.tsx` (sidebar, rail, tab bar, top bar, search, needs-attention sheet) |
| Screens | `src/admin/screens/`: Today, Orders (list and board), OrderDetail (and receipt), NewOrder, Clients, ClientProfile, Appointments, Payments, Reports, Reviews, Styles, Settings |
| Shared UI | `charts.tsx` (line, bar, sparkline, split bar, ranked table), `controls.tsx` (KPI tabs, change pill, filters, action cards), `Dropdown.tsx`, `sheets.tsx` (payment, quote, WhatsApp update, stage, confirm), `orderActions.tsx` (order card, board card, one set of sheets per screen) |
| Logic (tested) | `src/lib/metrics.ts` (periods, KPIs, workshop, rankings), `src/lib/filters.ts` (URL filters, search, sort, clients), `src/lib/studio.ts` (stage labels, next step, date line, WhatsApp messages) |
| Data | Owner actions in `studio` (`src/data/store.ts`); the simulated studio book in `src/data/studio-seed.ts` |
| Editable prices and settings | The store holds the catalogue (`data.styles`) and the studio settings (`data.settings`). `applyStyles` and `applySettings` copy them into the `STYLES`, `STUDIO`, `HOURS` and `POLICIES` objects every screen already reads, so an edit shows on both sides. `styleById` still resolves hidden styles, so past orders keep their names |
| Styles | `src/styles/admin.css`, loaded only with the admin chunk |
