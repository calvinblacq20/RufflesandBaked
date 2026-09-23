# Structure reference: Fresha client app

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

Source: `STRUCTURE REFERENCE/` (2 screen recordings, 147s and 13s, plus 2 screenshots) of the Fresha client app booking a hair salon in Kumasi.
Rule for this project: **take the structure and flow from Fresha, the look (fonts, patterns, motion) from Makro (`design-reference.md`) in Ruffles and Baked by H's colours, and the content from Ruffles and Baked by H.** Every Fresha logo is replaced with the Ruffles and Baked by H hat mark.

---

## 1. App shell
- **Floating bottom tab bar:** a white pill with a soft shadow and 4 tabs (Home · Search · Activity · Profile). The active tab gets a rounded grey highlight and a coloured icon; the Profile tab shows the user's initial in a circle.
- Large page titles ("Activity") with a round search button top-right. On scroll, the title collapses into a sticky header that keeps the filter chips.
- Every screen shows **skeleton loaders** (grey blocks in the shape of the layout) before content.

## 2. Screens seen, in order

### Activity tab
- Filter chips: **Appointments (7)** (active = black fill), Gift cards, Memberships
- Section headers **Upcoming / Past**
- Row: square venue thumbnail · bold venue name · `Tue, 15 Sept 2026 at 09:30` · `GHS 60 • 1 item` · outline **Rebook** pill
- Empty state: small illustration · "No gift cards" · one-line explanation · outline **Search venues** button

### Profile tab
- Big name + "Personal profile" + avatar circle
- **Wallet balance** card (bright gradient) with an outline "View wallet" button
- **Confirm your phone number** card ("We'll send a code to +233…", outline "Confirm number")
- Menu card: Profile · Favourites · Messages · My appointments · Forms · Settings (line icons)
- Card: Support · Language
- Card: Log out

### Venue page (Home)
1. Skeleton → **hero photo carousel** (`1/7` counter) with round back, share and favourite buttons
2. White sheet with rounded top overlapping the photo: name · category · ★ 4.8 (1,368) · open status ("Closed – opens Tuesday at 09:00") · address chip
3. About, with "Read more"
4. **Sticky section tabs** that follow the scroll position: Photos · About · Services · Team · Reviews · Portfolio · Other
5. Services: category chips (Featured, …) · service cards (name, duration, "from GH₵100", outline **Book**) · "See all 35 services"
6. Team: round avatars with rating badges, name, role
7. Reviews: count + "See all" · AI summary paragraph · review items (initials avatar, stars, text, "3 days ago · service · with Omar") · "See all 1,368 reviews"
8. Portfolio photo grid
9. Opening times (green dot per open day)
10. Additional info with icons (Instant confirmation, Parking available…)
11. Map + address + "Get directions"
12. Loyalty: points, rewards, membership tier, **Refer a friend**
13. Venues nearby carousel
- **Sticky bottom bar:** "35 services available" + black **Book now** pill

### Booking flow (full-screen modal, ← back and × close on every step)
| Step | Structure |
|---|---|
| 1 Select services | Big title · sticky category chips + list button · service cards with **＋**; the selected card gets a coloured border and check · a floating "1 selected service ↑" pill when the selection scrolls out of view · sticky bar **`GHS 60 / 1 item • 30 mins` + Continue →** |
| 2 Select professional | "For you" (last seen) · "All professionals": **Any professional – maximum availability** · professional cards (photo, rating, View profile, Select) |
| 3 Select date and time | Professional dropdown chip (opens a bottom sheet) · calendar button (opens a month-view bottom sheet) · **horizontal date strip** (selected filled, unavailable greyed) · "Pick a time" list of slot rows; changing the date shows a loader in the slots before the list appears |
| 4 Review and confirm | Venue card (photo, name, stars, address) · date + time range + duration · service lines · Total · Discounts and benefits [Add] · Cancellation policy · Important information · Comments or requests [Add] · sticky **Total + Confirm** |
| 5 Success | Confirm button → **3-dot loader** → **full-screen animated gradient with ✓ "Appointment confirmed"** (≈1.5s) → dissolves into the booking detail |

A push notification arrives right after, from the Fresha app with its logo: "Your appointment is booked for tomorrow… complete a short form".

### Booking detail
- Hero photo with the venue name; collapses on scroll into a white app bar "← Venue name"
- **Status badge:** Cancelled (red) / Action required (yellow)
- Big title **"Tomorrow at 09:30"** + duration
- **Action banner** (yellow card): "Complete the consultation form before your appointment · Complete now →"
- Actions card (tinted icon squares): Add to calendar · Get directions · Send message · Venue details. Past or cancelled bookings show Book again · Send message · Venue details.
- Overview card: service · "30 mins with **Baffour**" · Total
- **Forms** list: form name + "Complete before 15 Sept 2026" (orange) + chevron
- More details: Cancellation policy card with **Reschedule appointment** / **Cancel appointment** rows · Important info
- Getting there: map, written directions ("Opposite …, first floor") and "Get directions"
- Booking reference at the bottom
- Sub-flows:
  - **Add to calendar** is a bottom sheet (Google / Other calendar)
  - **Get directions** is a popover (Apple Maps / Google Maps)
  - **Send message** opens a chat screen (venue header plus a composer with attach and send)
  - **Cancel** is a bottom sheet: "Are you sure you want to cancel?" + booking card + "Not sure? Contact directly [Call]" + Go back / **Yes, cancel** (red) → gradient "Appointment cancelled" → detail with Cancelled badge → push notification

## 3. Interaction and motion patterns
- Skeleton → content crossfade on every load
- Flow steps push in from the right; the booking flow opens as a full-screen sheet sliding up; bottom sheets slide up over a dimmed backdrop, with the page behind scaling back slightly
- A collapsing hero header becomes a solid app bar; section tabs highlight the section in view
- Sticky bottom action bars on every flow step and detail page
- Selection: border + check pop; selected date fills
- Buttons show a 3-dot loader while an action is running
- Success and cancel screens: full-screen moving gradient + ✓ + big type, then dissolve

## 4. Mapped to Ruffles and Baked by H

| Fresha | Ruffles and Baked by H |
|---|---|
| Home = venue page | **Studio page**: work-photo carousel, "Bespoke menswear · Kasoa", rating, open status, address. Section tabs: Lookbook · About · Styles · Reviews · Info |
| Search | **Explore**: search and filter styles by occasion (church, wedding, funeral, political, everyday) |
| Activity (Appointments / Gift cards / Memberships) | **Orders** tab: chips **Orders · Fittings · Receipts**; rows show style, date, GH₵, **Reorder** |
| Profile (wallet, confirm phone, menu) | **Profile**: balance-due card (Pay with MoMo) · confirm phone · Profile · **My measurements** · Saved styles · Messages (WhatsApp) · My orders · Fittings · Forms · Settings · Support · Language · Log out |
| Services with categories | **Styles** by category (Kaftans · Agbada · Suits · Church · Political · Shirts · Kids) with "from GH₵" and "ready in ~7 days" |
| Select professional | **Customise**: fabric (bring your own / studio fabric), embroidery, fit, reference photo |
| Select date and time | **Needed by + measuring**: occasion date strip, then how to measure (visit slot / saved measurements / measure yourself) with date strip and time slots for visits |
| Review and confirm | Style lines, estimate, deposit note, needed-by, delivery or pickup, policies, comments |
| "Appointment confirmed" | **"Order request sent"** (Makro colours) |
| Booking detail | **Order detail**: status badge (Request received · Action required: pay deposit · In production · Ready for pickup · Collected · Cancelled) · "Ready by Sat 20 Sept" · action banner · actions (Add fitting to calendar · Directions · WhatsApp · Studio details) · **production tracker** · Overview (items, total, paid, balance) · **Receipts** (in the Forms position) · policies with Reschedule fitting / Cancel request · Getting there · order reference |
| Rebook / Book again | Reorder, using saved measurements |
| Loyalty / Refer a friend | Loyalty points + Refer a friend |
| Push notification with Fresha logo | In-app notification banner with the **Ruffles and Baked by H mark** |

The owner side reuses the same patterns (lists, chips, bottom sheets, sticky bars, status badges, skeletons), with Makro's dashboard for the Today screen. Its layout rules are in `admin-ui-guidelines.md`.
