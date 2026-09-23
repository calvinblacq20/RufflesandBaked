export type ID = string;

export type Occasion = "birthday" | "wedding" | "engagement" | "kids" | "christening" | "funeral" | "church" | "anniversary" | "everyday" | "other";

/**
 * The studio runs two lines under one roof. Every menu item belongs to one of them, and the
 * client app lets you shop either on its own or both together.
 * cakes: Baked by H. ruffles: Ruffles by H. both: bundles that cross the two.
 */
export type Line = "cakes" | "ruffles" | "both";

export type CategoryId =
  | "cakes"
  | "themed"
  | "tiered"
  | "treats"
  | "headpieces"
  | "bridal"
  | "gifting";

/** Pastel tile colours behind photos and fallbacks (see .photo.tone-* in ui.css). */
export type Tone = "lilac" | "sky" | "sand" | "blush" | "steel" | "mist" | "gold" | "charcoal";

/**
 * How a menu item is priced.
 * cake: from the Classic Cake Menu, by range, layers and size.
 * tiered: a base price for the smallest stack plus a price per extra tier.
 * unit: a fixed price per piece, pack or box.
 * bespoke: made to measure, quoted after a chat. No price until the studio sends one.
 */
export type PriceKind = "cake" | "tiered" | "unit" | "bespoke";

/** The eleven flavours on the Classic Cake Menu. */
export type Flavour =
  | "creamy-vanilla"
  | "vanilla-raspberry"
  | "vanilla-caramel"
  | "strawberry"
  | "strawberry-swirl"
  | "chocolate"
  | "red-velvet"
  | "white-velvet"
  | "choco-vanilla-marble"
  | "red-velvet-marble";

/**
 * The four blocks of the Classic Cake Menu. Each has its own sizes, layers and prices.
 * classic: round, square and heart cakes, 6/8/10 inch.
 * bento: the small one-person cakes.
 * rect: rectangular cakes, two layers each.
 * kids: themed birthday cakes, 6 inch, two to four layers.
 */
export type PriceRange = "classic" | "bento" | "rect" | "kids";

export type CakeSize = "6" | "8" | "10" | "bento" | "4x8" | "5x10" | "8x12" | "10x15";
export type Layers = 1 | 2 | 3 | 4;

/** Whipped cream is the house finish and what the menu prices. The other two cost extra. */
export type Finish = "cream" | "ganache" | "fondant";

/** Classic: piped message and your colours. Custom: a theme, characters, toppers, sugar flowers (extra charge). */
export type Design = "classic" | "custom";

/** Price per cake: range → layers → size. A missing size isn't offered in that combination. */
export type PriceGrid = Record<PriceRange, Partial<Record<Layers, Partial<Record<CakeSize, number>>>>>;

export interface Style {
  id: ID;
  name: string;
  line: Line;
  category: CategoryId;
  description: string;
  kind: PriceKind;
  /** cake items: which block of the price list they are priced from. */
  range?: PriceRange;
  /** tiered: price for the smallest stack. unit: price per unit. cake and bespoke: unused. */
  fromPrice: number;
  /** tiered: each tier above the smallest. Others: 0. */
  extraFrom: number;
  /** unit items: what one unit is, e.g. "pack of 3". */
  unit?: string;
  /** unit items with a minimum order, e.g. 10 favour boxes. */
  minQty?: number;
  /** cake items: the sizes on offer. Defaults to every size its range prices. */
  sizes?: CakeSize[];
  /** Themed and bespoke items are custom by nature, so the design charge always applies. */
  customDesign?: boolean;
  /** Working days of notice needed; shorter notice is a late order. */
  readyDays: number;
  featured?: boolean;
  /** False hides the item from clients. Past orders keep showing it. */
  active?: boolean;
  tone: Tone;
  /** Optional real photo in /public/photos. */
  photo?: string;
}

export interface OrderItem {
  id: ID;
  styleId: ID;
  qty: number;
  /**
   * Cakes carry one flavour per layer, up to the layer count: a two-layer cake can be
   * creamy vanilla and red velvet. Items without a flavour keep an empty list.
   */
  flavours: Flavour[];
  /** cake items */
  size?: CakeSize;
  layers?: Layers;
  /** tiered items */
  tiers?: number;
  finish: Finish;
  design: Design;
  /** Writing on the cake, or the name beaded into a piece. */
  message?: string;
  /** Colours to match: "wine and gold", "the bridesmaids' dusty pink". */
  colours?: string;
  /** 0 until the studio quotes a bespoke piece. */
  unitPrice: number;
}

export type OrderStatus =
  | "request"
  | "quoted"
  | "confirmed"
  | "making"
  | "finishing"
  | "ready"
  | "collected"
  | "cancelled";

/** ours: we design from your notes. photo: you send an inspiration photo. consult: a fitting or tasting first. */
export type DesignPlan = "ours" | "photo" | "consult";
export type Delivery = "pickup" | "delivery";
export type PaymentMethod = "momo" | "card" | "cash" | "bank";
/** "now": paid in full online at checkout. "later": a request first, paid once the studio sends the quote. */
export type PayChoice = "now" | "later";

export interface StatusEvent {
  status: OrderStatus;
  at: string;
}

export interface Payment {
  id: ID;
  amount: number;
  method: PaymentMethod;
  reference: string;
  at: string;
  receiptNo: string;
  kind: "full" | "part" | "final";
  receivedBy: string;
  /** Who or what paid, e.g. "MTN MoMo · 020 584 0753". */
  payer?: string;
}

export interface Order {
  id: ID;
  number: string;
  customerId: ID;
  createdAt: string;
  occasion: Occasion;
  /** The day it is picked up or delivered. Day key, YYYY-MM-DD. */
  neededBy: string;
  /** When it has to be finished. Day key, YYYY-MM-DD (usually the same day). */
  readyBy: string;
  items: OrderItem[];
  designPlan: DesignPlan;
  /** Theme, colours, names and ages for the kitchen and the workroom. */
  designNotes?: string;
  /** The pickup or delivery slot, and any fitting or tasting. */
  appointmentId?: ID;
  delivery: Delivery;
  deliveryTown?: string;
  comments?: string;
  status: OrderStatus;
  history: StatusEvent[];
  /** Placed with less notice than the menu needs: the late-order fee applies. */
  shortNotice: boolean;
  total: number;
  payChoice: PayChoice;
  payments: Payment[];
  /** When the studio last sent the client a WhatsApp update about this order. */
  lastUpdateAt?: string;
}

/** A date a client wants remembered, so the studio can remind them to order in time. */
export interface Celebration {
  id: ID;
  customerId: ID;
  /** "Ama's birthday", "Our anniversary". */
  label: string;
  /** Month and day, MM-DD. */
  date: string;
  /** Set when the client wants a WhatsApp reminder two weeks before. */
  remind: boolean;
  /** When the studio last sent the reminder, so it isn't sent twice in a year. */
  remindedAt?: string;
}

export type AppointmentPurpose = "pickup" | "delivery" | "fitting" | "tasting";

export interface Appointment {
  id: ID;
  customerId: ID;
  orderId?: ID;
  purpose: AppointmentPurpose;
  /** Local ISO date-time, YYYY-MM-DDTHH:mm. */
  start: string;
  minutes: number;
  status: "requested" | "confirmed" | "cancelled" | "done";
}

/** How a client first found the studio. */
export type LeadSource = "instagram" | "whatsapp" | "facebook" | "walkin" | "referral" | "app";

/**
 * Everyone who has ordered, with or without an account. Records are matched by
 * WhatsApp number, so repeat guest orders land on one customer.
 */
export interface Customer {
  id: ID;
  name: string;
  phone: string;
  email: string;
  town: string;
  /** Street or landmark, for deliveries. */
  address?: string;
  /** GhanaPost GPS address, e.g. CE-123-4567. */
  digitalAddress?: string;
  memberSince: string;
  /** True once they confirmed their WhatsApp number with a code. Accounts are optional. */
  hasAccount: boolean;
  points: number;
  source?: LeadSource;
  /** What the client tells the kitchen: allergies, eggless, no nuts, less sugar. Shown to both sides. */
  dietary?: string;
  /** Head size in centimetres, for headbands and hats that have to sit right. */
  headSize?: string;
  /** The owner's notebook: favourite flavours, family names, delivery quirks. Never shown to the client. */
  notes?: string;
}

/** What the customer types at checkout. */
export interface ContactDetails {
  name: string;
  phone: string;
  email: string;
  town: string;
  address: string;
  digitalAddress: string;
}

export type ReviewStatus = "pending" | "published" | "hidden";

export interface Review {
  id: ID;
  name: string;
  rating: number;
  text: string;
  at: string;
  styleId: ID;
  customerId?: ID;
  /** Only published reviews appear on the studio page. */
  status: ReviewStatus;
  reply?: string;
}
