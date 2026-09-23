import { addDays, dayKey, localIso, startOfDay } from "../lib/format";
import { defaultChoice, estimate, fixChoice, layersFor, sizesFor, unitPrice } from "../lib/pricing";
import { addWorkingDays, isOpenDay } from "../lib/schedule";
import { HOURS } from "./business";
import { FLAVOURED_UNITS, OCCASIONS, STYLES, tierRange } from "./catalog";
import type { Appointment, Celebration, Customer, Delivery, Design, Finish, Flavour, LeadSource, Occasion, Order, OrderItem, OrderStatus, Payment, PaymentMethod, Review, Style } from "./types";

/**
 * The studio's own book for the demo: every client and order the owner sees on the admin side.
 * Orders are simulated day by day over five months, so each order's stage today follows from its own
 * dates (quoted, paid, making, finishing, ready, handed over). Fixed seeds keep it the same on every reset.
 */

type Rng = ReturnType<typeof random>;

/** Small deterministic random generator (mulberry32). */
function random(seed: number) {
  let a = seed >>> 0;
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const int = (min: number, max: number) => min + Math.floor(next() * (max - min + 1));
  const chance = (p: number) => next() < p;
  function pick<T>(items: readonly T[]): T {
    return items[Math.floor(next() * items.length)] as T;
  }
  function weighted<T>(items: readonly (readonly [T, number])[]): T {
    const total = items.reduce((s, [, w]) => s + w, 0);
    let roll = next() * total;
    for (const [item, weight] of items) {
      roll -= weight;
      if (roll < 0) return item;
    }
    return (items[items.length - 1] as readonly [T, number])[0];
  }
  return { next, int, chance, pick, weighted };
}

interface ClientSeed {
  name: string;
  phone: string;
  town: string;
  source: LeadSource;
  notes?: string;
  dietary?: string;
}

const CLIENTS: ClientSeed[] = [
  { name: "Adwoa Asante", phone: "024 318 7702", town: "Kasoa", source: "instagram", notes: "Twins Kofi and Kafui: one cake, two names, every March. Prefers red velvet.\nPays on MoMo the same day she orders." },
  { name: "Esi Boateng", phone: "055 902 1147", town: "Weija", source: "whatsapp", notes: "Office admin at a bank in Accra. Pastry boxes for board meetings, usually 3 to 5. Pays by bank transfer and needs the receipt for accounts." },
  { name: "Kwame Mensah", phone: "020 664 3391", town: "Kasoa", source: "referral", notes: "Surprise cakes for his wife. Deliver to her shop at Kasoa new market and call HIS number, never hers." },
  { name: "Akua Owusu", phone: "027 455 8830", town: "Ofaakor", source: "walkin", notes: "Head size 55 cm. Wears her pieces low on the right." },
  { name: "Naa Adjeley Tetteh", phone: "054 771 2098", town: "Kokrobite", source: "instagram", notes: "Wedding planner. Sends three or four couples a month and usually takes the cake and the bridal set together; agreed 5% planner discount. Wants venue photos for her page." },
  { name: "Yaw Darko", phone: "024 190 6655", town: "Bortianor", source: "whatsapp" },
  { name: "Abigail Osei", phone: "050 233 4417", town: "Kasoa", source: "instagram", dietary: "Nut allergy: no nuts or nut toppings." },
  { name: "Selasi Agbeko", phone: "026 812 0934", town: "Mallam", source: "referral", notes: "Referred by Esi Boateng. Likes minimal, all-white designs." },
  { name: "Efua Quaye", phone: "055 347 6612", town: "Awutu", source: "instagram", notes: "Delivery to the Awutu junction; the rider calls her from there." },
  { name: "Mawuli Ampofo", phone: "024 604 5578", town: "Kasoa", source: "walkin" },
  { name: "Priscilla Nyarko", phone: "059 118 2240", town: "Kasoa", source: "instagram", notes: "Leads the women's fellowship at her church. Orders rectangular cakes for anniversaries and harvest, and a hat most years." },
  { name: "Daniel Larbi", phone: "020 997 3316", town: "Budumburam", source: "whatsapp" },
  { name: "Gifty Appiah", phone: "027 239 8804", town: "Kasoa", source: "referral", notes: "Buys a bento cake most Fridays. Head size 57 cm." },
  { name: "Rita Amoah", phone: "054 480 1126", town: "Weija", source: "instagram" },
  { name: "Michael Sarpong", phone: "024 755 9031", town: "Kasoa", source: "walkin" },
  { name: "Linda Frimpong", phone: "055 620 4478", town: "Ofaakor", source: "facebook", dietary: "Eggless, please (vegetarian)." },
  { name: "Ama Serwaa Kyei", phone: "026 301 7765", town: "Kasoa", source: "whatsapp", notes: "Head of a Montessori school in Kasoa. End-of-term cupcakes for about 60 pupils." },
  { name: "Joyce Addo", phone: "050 874 2201", town: "Bortianor", source: "instagram" },
  { name: "Kojo Antwi", phone: "024 426 3358", town: "Kumasi", source: "instagram", notes: "Orders from Kumasi for his mum. Pays online, delivery to Kasoa." },
  { name: "Beatrice Aidoo", phone: "057 112 9047", town: "Kasoa", source: "walkin" },
  { name: "Emmanuel Ofori", phone: "020 558 6613", town: "Accra", source: "referral" },
  { name: "Patience Badu", phone: "024 963 0182", town: "Kasoa", source: "whatsapp", notes: "Head size 58 cm. Bought the Passion Chest twice for her sisters." },
  { name: "Dzifa Kumah", phone: "055 781 3390", town: "Kasoa", source: "instagram" },
  { name: "Samuel Acquah", phone: "027 646 1259", town: "Winneba", source: "instagram" },
  { name: "Comfort Ansah", phone: "054 207 8836", town: "Awutu", source: "walkin" },
  { name: "Nana Ama Agyeman", phone: "024 872 4403", town: "Accra", source: "facebook" },
  { name: "Edem Mensah", phone: "059 330 7721", town: "Kasoa", source: "app" },
  { name: "Josephine Asamoah", phone: "050 419 5584", town: "Weija", source: "app" },
];

const STYLE_WEIGHTS: [string, number][] = [
  ["classic-cake", 22], ["bento-cake", 10], ["rect-cake", 7], ["kids-cake", 11], ["number-cake", 4],
  ["wedding-cake", 3], ["calendar-cake", 2], ["pastry-box", 7], ["cake-jars", 5], ["cupcakes", 7],
  ["fascinator", 8], ["hat", 4], ["headband", 9], ["tiara", 5], ["bridal-set", 2], ["bouquet", 2],
  ["boutonniere", 3], ["bridal-fan", 1], ["brooch", 3], ["scrunchies", 3],
  ["passion-chest", 4], ["crown-her", 2], ["dowry-wrapping", 2], ["favour-box", 2],
];

/** The menu's ten flavours, weighted by what the studio's posts show most. */
const FLAVOUR_WEIGHTS: [Flavour, number][] = [
  ["creamy-vanilla", 30], ["red-velvet", 24], ["chocolate", 16], ["strawberry-swirl", 8],
  ["vanilla-caramel", 6], ["strawberry", 5], ["choco-vanilla-marble", 4], ["white-velvet", 3],
  ["vanilla-raspberry", 2], ["red-velvet-marble", 2],
];
const FINISH_WEIGHTS: [Finish, number][] = [["cream", 84], ["ganache", 9], ["fondant", 7]];
const METHOD_WEIGHTS: [PaymentMethod, number][] = [["momo", 64], ["cash", 16], ["bank", 12], ["card", 8]];

/**
 * Bespoke pieces carry no list price: the client asks, the studio quotes, the client pays. These
 * are the bands the sample quotes are drawn from, so the owner's book and reports have real money
 * in them. Nothing here is shown as a price to clients.
 */
const QUOTE_BAND: Record<string, [number, number]> = {
  fascinator: [250, 600],
  hat: [600, 1500],
  headband: [180, 450],
  tiara: [300, 800],
  "bridal-set": [1500, 4000],
  bouquet: [400, 900],
  "bridal-fan": [200, 450],
  "dowry-wrapping": [800, 2500],
};

/** How many of each unit item people usually buy. */
const UNIT_QTY: Record<string, [number, number]> = {
  cupcakes: [1, 4],
  "cake-jars": [6, 18],
  "pastry-box": [1, 3],
  boutonniere: [4, 10],
  brooch: [1, 3],
  scrunchies: [1, 3],
  "passion-chest": [1, 2],
  "crown-her": [1, 2],
  "favour-box": [10, 60],
};

/** What clients ask for, in their own words. A cake brief never lands on a headpiece, or the reverse. */
const CAKE_NOTES = [
  "Pink and gold, 'Happy 30th Ama' on top.",
  "Minnie Mouse theme, red bow topper, name: Maame Esi, turning 5.",
  "All white with fresh roses, simple and elegant.",
  "Chelsea colours and a football, for my husband's 40th.",
  "Baby blue, little booties, name: Nhyira.",
  "Company logo on the board, blue and white.",
  "Two flavours please: red velvet and creamy vanilla.",
];

const PIECE_NOTES = [
  "Wine and gold to match the kaba; head size 56 cm.",
  "Crystal and pearl, nothing too tall, it has to sit under a church hat.",
  "Dusty pink for the bridesmaids, six pieces, same design.",
  "Cream sinamay with feathers, to go with an off-white lace.",
  "Something I can wear again after the wedding, not too bridal.",
  "Gold, to match the beads on the kente. Head size 58 cm.",
  "I'll send a photo of the outfit on WhatsApp.",
];

const HISTORY_DAYS = 150;

export interface StudioBook {
  customers: Customer[];
  orders: Order[];
  celebrations: Celebration[];
  appointments: Appointment[];
  reviews: Review[];
}

export function createStudioBook(now: Date, rnd = random(20260918)): StudioBook {
  const today = startOfDay(now);
  const nowMs = now.getTime();
  const at = (offset: number, hour: number, minute = 0) => {
    const d = addDays(today, offset);
    d.setHours(hour, minute, 0, 0);
    return d;
  };
  /** A working-hours time on a past day, never later than a few minutes ago. */
  const timeOn = (r: Rng, offset: number, notBefore = 0, hours: [number, number] = [8, 17]) =>
    Math.max(notBefore, Math.min(at(offset, r.int(hours[0], hours[1]), r.pick([0, 10, 20, 30, 40, 50])).getTime(), nowMs - 20 * 60_000));
  const daysFromToday = (d: Date) => Math.round((startOfDay(d).getTime() - today.getTime()) / 86_400_000);
  const openFrom = (offset: number, step: 1 | -1) => {
    let o = offset;
    while (!isOpenDay(addDays(today, o), HOURS)) o += step;
    return o;
  };

  const customers: Customer[] = CLIENTS.map((c, i) => ({
    id: `c-${String(i + 1).padStart(2, "0")}`,
    name: c.name,
    phone: c.phone,
    email: `${c.name.toLowerCase().replace(/[^a-z]+/g, ".").replace(/^\.|\.$/g, "")}@gmail.com`,
    town: c.town,
    memberSince: at(-rnd.int(160, 700), 10).toISOString(),
    hasAccount: c.source === "app" || rnd.chance(0.25),
    points: rnd.int(0, 30) * 10,
    source: c.source,
    notes: c.notes,
    dietary: c.dietary,
  }));
  const clientId = (index: number) => (customers[index] ?? customers[0])!.id;
  const styleFor = (id: string): Style => STYLES.find((s) => s.id === id) ?? STYLES[0]!;
  const styleLine = (style: Style) => style.line;

  const payment = (r: Rng, amount: number, time: number, kind: Payment["kind"], phone: string): Payment => {
    const method = r.weighted(METHOD_WEIGHTS);
    const digits = String(r.int(10_000_000, 99_999_999));
    return {
      id: "",
      amount,
      method,
      reference: method === "momo" ? `MTN ${digits}` : method === "bank" ? `GCB ${digits}` : method === "card" ? `PSK-${digits}` : "Cash",
      at: new Date(time).toISOString(),
      receiptNo: "",
      kind,
      receivedBy: method === "card" ? "Paystack (online)" : "Ruffles and Baked by H",
      payer: method === "momo" ? `MTN MoMo · ${phone}` : undefined,
    };
  };

  /** Colours a client asks a bespoke piece to be worked in. */
  const COLOURS = ["Wine and gold", "Cream and champagne", "Dusty pink", "Royal blue and silver", "All white", "Emerald and gold", "Purple and lilac", "Black and gold"];

  /** One item as a client would choose it. */
  const makeItem = (r: Rng, style: Style, id: string): OrderItem => {
    let choice = defaultChoice(style);
    if (style.kind === "cake") {
      const layers = r.pick(layersFor(style));
      choice = fixChoice(style, { ...choice, layers, size: r.pick(sizesFor(style, layers)) });
      // The menu allows a flavour per layer; most people take one or two.
      const wanted = Math.min(layers, r.weighted([[1, 6], [2, 3], [3, 1]] as const));
      const flavours: Flavour[] = [];
      while (flavours.length < wanted) {
        const f = r.weighted(FLAVOUR_WEIGHTS);
        if (!flavours.includes(f)) flavours.push(f);
      }
      choice.flavours = flavours;
      choice.finish = r.weighted(FINISH_WEIGHTS);
      choice.design = style.customDesign || r.chance(0.25) ? "custom" : "classic";
      choice.qty = r.chance(0.05) ? 2 : 1;
    } else if (style.kind === "tiered") {
      const { min, max } = tierRange(style.id);
      choice.tiers = r.int(min, max);
      choice.flavours = [r.weighted(FLAVOUR_WEIGHTS)];
      choice.finish = r.weighted([["cream", 50], ["fondant", 30], ["ganache", 20]] as const);
      choice.design = "custom" as Design;
      choice.colours = r.pick(COLOURS);
    } else if (style.kind === "bespoke") {
      choice.flavours = [];
      choice.colours = r.pick(COLOURS);
      choice.design = "custom" as Design;
      const [lo, hi] = QUOTE_BAND[style.id] ?? [250, 700];
      // The quote the owner sent and the client accepted, rounded the way a person would round it.
      return { id, styleId: style.id, ...choice, unitPrice: r.int(lo / 10, hi / 10) * 10 };
    } else {
      const [lo, hi] = UNIT_QTY[style.id] ?? [1, 3];
      choice.qty = Math.max(style.minQty ?? 1, r.int(lo, hi));
      choice.flavours = FLAVOURED_UNITS.has(style.id) ? [r.weighted(FLAVOUR_WEIGHTS)] : [];
      if (styleLine(style) !== "cakes") choice.colours = r.pick(COLOURS);
    }
    const message = (style.kind === "cake" || style.kind === "tiered") && r.chance(0.7) ? r.pick(["Happy Birthday!", "Happy 30th", "Congratulations", "Happy Anniversary", "God bless you"]) : undefined;
    return { id, styleId: style.id, ...choice, message, unitPrice: unitPrice(style, choice) };
  };

  const orders: Order[] = [];

  /** One order placed `offset` days ago, carried forward along its own timeline to today. */
  const simulate = (r: Rng, offset: number, seq: number, opts: { awaitingQuote?: boolean; hold?: "quoted"; style?: string; due?: number; sameDay?: boolean } = {}) => {
    const style = styleFor(opts.style ?? r.weighted(STYLE_WEIGHTS));
    const customerIndex = r.chance(0.55) ? r.int(0, 13) : r.int(0, CLIENTS.length - 1);
    const phone = CLIENTS[customerIndex]?.phone ?? "";
    const n = String(seq).padStart(3, "0");
    const items = [makeItem(r, style, `i-s${n}`)];
    // Cakes often come with something for the guests.
    // A cake often comes with something for the guests, and a headpiece with a cake for the same day.
    if (style.line === "cakes" && style.kind !== "unit" && r.chance(0.18)) items.push(makeItem(r, styleFor(r.pick(["cupcakes", "cake-jars", "pastry-box", "bento-cake"])), `i-s${n}b`));
    else if (style.line === "ruffles" && r.chance(0.16)) items.push(makeItem(r, styleFor(r.pick(["bento-cake", "classic-cake", "cake-jars"])), `i-s${n}b`));

    const createdAt = timeOn(r, offset);
    const notice = Math.max(...items.map((i) => styleFor(i.styleId).readyDays));
    const short = opts.due === undefined && r.chance(0.08) && notice > 1;
    const lead = short ? r.int(1, notice - 1) : style.kind === "tiered" ? notice + r.int(5, 40) : notice + r.int(0, 10);
    const planned = opts.due === undefined ? addWorkingDays(new Date(createdAt), lead, HOURS) : addDays(today, openFrom(opts.due, 1));
    const dueOffset = daysFromToday(planned);
    const shortNotice = short || (opts.due !== undefined && dueOffset - offset < notice);
    const total = estimate(items, shortNotice).total;
    const occasions = OCCASIONS.filter((o) => o.categories.includes(style.category)).map((o) => o.id);
    const occasion: Occasion = occasions.length ? r.pick(occasions) : "everyday";
    const custom = items.some((i) => i.design === "custom") || style.kind === "tiered" || style.kind === "bespoke";

    // The order's timeline in days from today. Anything after today hasn't happened yet.
    const quotedAt = opts.awaitingQuote ? 1 : offset + (custom ? r.weighted([[0, 5], [1, 3]] as const) : 0);
    const cancelled = !opts.hold && !opts.due && r.chance(0.04);
    const wentQuiet = !opts.hold && !opts.due && !cancelled && custom && r.chance(0.08);
    const paidAt = opts.hold === "quoted" ? dueOffset + 1 : Math.min(quotedAt + r.weighted([[0, 6], [1, 3], [2, 1]] as const), Math.max(quotedAt, dueOffset - 1));
    // Cakes are baked and finished on the last open day before the handover (Saturday for a Monday);
    // tiers and bespoke pieces start earlier, because beading takes days, not hours.
    const dayBefore = openFrom(dueOffset - 1, -1);
    // Afternoon pickups are often finished the same morning.
    const sameDay = style.kind === "cake" && (opts.sameDay ?? r.chance(0.35));
    const slow = style.kind === "tiered" || style.kind === "bespoke";
    const bakeAt = style.kind === "unit" ? dueOffset : slow ? openFrom(dayBefore - r.int(2, 6), -1) : dayBefore;
    const decorateAt = style.kind === "unit" ? null : sameDay ? dueOffset : dayBefore;
    const handedAt = dueOffset + (r.chance(0.06) ? 1 : 0);

    const plan: [OrderStatus, number][] = [["request", offset], ["quoted", quotedAt]];
    if (cancelled) plan.push(["cancelled", quotedAt + r.int(0, 2)]);
    else if (wentQuiet) plan.push(["cancelled", quotedAt + 7]); // an unpaid quote is closed after a week
    else plan.push(["confirmed", paidAt], ["making", Math.max(bakeAt, paidAt)], ...(decorateAt === null ? [] : [["finishing", Math.max(decorateAt, paidAt)] as [OrderStatus, number]]), ["ready", dueOffset], ["collected", handedAt]);

    // Each step has its hours: baking and beading in the morning, finishing in the afternoon,
    // handovers from late morning.
    const WINDOW: Partial<Record<OrderStatus, [number, number]>> = sameDay
      ? { making: [7, 11], finishing: [7, 9], ready: [12, 14], collected: [14, 17] }
      : { making: [7, 11], finishing: [12, 17], ready: [7, 10], collected: [11, 17] };
    const history: { status: OrderStatus; at: string; time: number }[] = [];
    let last = 0;
    for (const [status, day] of plan) {
      if (day > 0) break;
      const time = history.length === 0 ? createdAt : Math.max(last + 20 * 60_000, at(day, r.int(...(WINDOW[status] ?? [8, 17])), r.pick([0, 15, 30, 45])).getTime());
      // Steps later today haven't happened yet: a cake due tomorrow may still be in the oven this morning.
      if (history.length > 0 && time > nowMs - 10 * 60_000) break;
      last = time;
      history.push({ status, at: new Date(time).toISOString(), time });
    }
    const status = history[history.length - 1]!.status;
    const timeOf = (s: OrderStatus) => history.find((h) => h.status === s)?.time;

    const payments: Payment[] = [];
    const paidTime = timeOf("confirmed");
    if (paidTime !== undefined) {
      const part = r.chance(0.12);
      const first = part ? Math.round(total / 20) * 10 : total;
      payments.push(payment(r, first, paidTime, part ? "part" : "full", phone));
      const settleTime = timeOf("collected") ?? (status === "ready" ? timeOf("ready") : undefined);
      if (part && settleTime !== undefined) payments.push(payment(r, total - first, settleTime, "final", phone));
    }

    const delivery: Delivery = style.kind === "tiered" || (style.id === "favour-box" && r.chance(0.7)) || r.chance(0.3) ? "delivery" : "pickup";
    orders.push({
      id: `o-s${n}`,
      number: "",
      customerId: clientId(customerIndex),
      createdAt: new Date(createdAt).toISOString(),
      occasion,
      neededBy: dayKey(planned),
      readyBy: dayKey(planned),
      items,
      designPlan: style.kind === "tiered" || style.kind === "bespoke" ? "consult" : custom ? r.pick(["photo", "photo", "ours"] as const) : "ours",
      designNotes: custom ? r.pick(style.line === "ruffles" ? PIECE_NOTES : style.line === "cakes" ? CAKE_NOTES : [...CAKE_NOTES, ...PIECE_NOTES]) : undefined,
      delivery,
      deliveryTown: delivery === "delivery" ? CLIENTS[customerIndex]?.town : undefined,
      status,
      history: history.map(({ status: s, at: t }) => ({ status: s, at: t })),
      shortNotice,
      total,
      payChoice: "later",
      payments,
      lastUpdateAt: status === "request" ? undefined : history[history.length - 1]?.at,
    });
  };

  let seq = 0;
  for (let offset = -HISTORY_DAYS; offset <= 0; offset++) {
    if (!isOpenDay(addDays(today, offset), HOURS)) continue;
    // Each day draws from its own seed, so the book doesn't shift with the weekday the demo is opened on.
    const r = random(20260918 + (offset + 1000) * 7919);
    const busy = 0.72 + (0.26 * (offset + HISTORY_DAYS)) / HISTORY_DAYS; // a little busier each month
    const count = r.chance(busy) ? 1 + (r.chance(0.6) ? 1 : 0) + (r.chance(0.25) ? 1 : 0) : 0;
    for (let i = 0; i < count; i++) simulate(r, offset, ++seq);
    // Requests from the last two days that still need a price, so there's always something to quote.
    if (offset >= -1) simulate(r, offset, ++seq, { awaitingQuote: true, style: offset === 0 ? "bridal-set" : "wedding-cake" });
  }
  // Whatever the date: a quote waiting for payment, and a full kitchen today and tomorrow.
  simulate(random(4242), -2, ++seq, { hold: "quoted", style: "hat" });
  const soon: [number, string, number][] = [
    [0, "classic-cake", -6], [0, "kids-cake", -7], [0, "bento-cake", -3], [0, "headband", -12],
    [1, "kids-cake", -6], [1, "classic-cake", -4], [1, "cake-jars", -2], [1, "fascinator", -10],
    [2, "wedding-cake", -20], [2, "rect-cake", -3], [2, "tiara", -14],
  ];
  // The first cake due today is finished this morning, so there's always one on the decorating table.
  soon.forEach(([due, style, placed], i) => simulate(random(5100 + i), placed, ++seq, { due, style, sameDay: i === 0 ? true : undefined }));

  // Handover slots for the coming week, plus tastings and design consultations.
  const appointments: Appointment[] = [];
  const upcoming = orders
    .filter((o) => ["confirmed", "making", "finishing", "ready"].includes(o.status) && o.neededBy >= dayKey(today) && o.neededBy <= dayKey(addDays(today, 7)))
    .sort((a, b) => a.neededBy.localeCompare(b.neededBy));
  upcoming.forEach((order, i) => {
    const r = random(6100 + i);
    const [y, m, d] = order.neededBy.split("-").map(Number);
    const start = new Date(y ?? 2026, (m ?? 1) - 1, d ?? 1, r.int(10, 17), r.pick([0, 30]));
    appointments.push({ id: `a-h${String(i + 1).padStart(2, "0")}`, customerId: order.customerId, orderId: order.id, purpose: order.delivery === "delivery" ? "delivery" : "pickup", start: localIso(start), minutes: order.delivery === "delivery" ? 60 : 30, status: r.chance(0.8) ? "confirmed" : "requested" });
    order.appointmentId = appointments[appointments.length - 1]!.id;
  });
  const requests = orders.filter((o) => o.status === "request");
  const appt = (id: string, order: Order | undefined, customerIndex: number, purpose: Appointment["purpose"], offset: number, hour: number, minute: number, status: Appointment["status"]) => {
    appointments.push({ id, customerId: order?.customerId ?? clientId(customerIndex), orderId: order?.id, purpose, start: localIso(at(offset, hour, minute)), minutes: purpose === "fitting" ? 45 : 30, status });
  };
  if (isOpenDay(today, HOURS)) appt("a-t01", requests.find((o) => o.items.some((i) => i.styleId === "wedding-cake")), 4, "tasting", 0, 11, 0, "confirmed");
  appt("a-t02", undefined, 7, "fitting", openFrom(1, 1), 15, 0, "requested");
  appt("a-t03", undefined, 20, "tasting", openFrom(3, 1), 12, 0, "confirmed");
  appt("a-t04", undefined, 25, "fitting", openFrom(5, 1), 10, 0, "requested");
  appt("a-t05", undefined, 3, "fitting", openFrom(-3, -1), 11, 0, "done");

  // Dates clients asked the studio to remember: some coming up soon, so reminders have something to show.
  const monthDay = (offset: number) => {
    const d = addDays(today, offset);
    return `${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  };
  const celebrations: Celebration[] = [
    { id: "d-s01", customerId: clientId(0), label: "Kofi and Kafui's birthday", date: monthDay(3), remind: true },
    { id: "d-s02", customerId: clientId(2), label: "His wife's birthday", date: monthDay(6), remind: true },
    { id: "d-s03", customerId: clientId(10), label: "Fellowship anniversary", date: monthDay(10), remind: true },
    { id: "d-s04", customerId: clientId(18), label: "His mum's birthday", date: monthDay(13), remind: true },
    { id: "d-s05", customerId: clientId(12), label: "Her daughter's birthday", date: monthDay(24), remind: true },
    { id: "d-s06", customerId: clientId(7), label: "Wedding anniversary", date: monthDay(52), remind: true },
    { id: "d-s07", customerId: clientId(16), label: "End of term", date: monthDay(71), remind: false },
    { id: "d-s08", customerId: clientId(5), label: "Birthday", date: monthDay(140), remind: true },
  ];

  const reviews: Review[] = [
    { id: "r-s1", name: "Adwoa A.", rating: 5, text: "Kofi and Kafui's cake was perfect again. Two names, one cake, zero fights. Moist red velvet as always.", at: at(-1, 19).toISOString(), styleId: "classic-cake", customerId: clientId(0), status: "pending" },
    { id: "r-s2", name: "Naa Adjeley T.", rating: 5, text: "I send her my couples because she does the cake and the bridal set together and nothing clashes. The boutonnieres came labelled per person.", at: at(-2, 13).toISOString(), styleId: "bridal-set", customerId: clientId(4), status: "pending" },
    { id: "r-s3", name: "Abigail O.", rating: 5, text: "She remembered my nut allergy without me repeating it. The cupcakes were beautiful.", at: at(-4, 10).toISOString(), styleId: "cupcakes", customerId: clientId(6), status: "pending" },
    { id: "r-s4", name: "Patience B.", rating: 5, text: "Bought the Passion Chest for my sister's birthday and she cried. The freebies were a nice touch.", at: at(-5, 16).toISOString(), styleId: "passion-chest", customerId: clientId(21), status: "pending" },
    { id: "r-s5", name: "Unknown", rating: 1, text: "Wrong shop, sorry, meant to review somewhere else.", at: at(-6, 21).toISOString(), styleId: "classic-cake", status: "hidden" },
  ];

  return { customers, orders, celebrations, appointments, reviews };
}
