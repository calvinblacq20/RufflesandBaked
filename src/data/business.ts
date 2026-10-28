import type { Hours } from "../lib/schedule";

/**
 * In code the business is "the studio": one workroom and one kitchen under the same roof,
 * so both lines share one vocabulary and the admin screens never have to branch on wording.
 */
export interface StudioDetails {
  name: string;
  /** The two halves of the business, as they are written on the brand card. */
  cakeBrand: string;
  rufflesBrand: string;
  tagline: string;
  category: string;
  about: string;
  area: string;
  address: string;
  directions: string;
  mapsQuery: string;
  phone: string;
  email: string;
  whatsappBusiness: string;
  /** Ruffles by H. */
  instagram: string;
  /** Baked by H. */
  instagramCakes: string;
  facebook: string;
  owner: string;
  rating: number;
  reviewCount: number;
}

export interface Policies {
  cancellation: string;
  payment: string;
  handover: string;
  important: string;
}

/** Money rules the owner can change in Settings. */
export interface Rules {
  /** Added to orders placed with less notice than the item needs. */
  lateFee: number;
  /** Minimum extra for custom, character and themed designs. */
  designFee: number;
  /** Deposit taken to start a bespoke piece, as a percentage of the quote. */
  depositPercent: number;
}

/** Everything the owner can change in Settings. */
export interface StudioSettings {
  studio: StudioDetails;
  hours: Hours;
  policies: Policies;
  rules: Rules;
  /** The one notice the owner can put in front of everyone. */
  announcement: Announcement;
}

/**
 * A notice across the bottom of the client app: pre-orders opening, the kitchen closed for a
 * week, a festive cut-off. It is the owner's, not the app's, so everything about it is settings.
 */
export interface Announcement {
  /** Off hides it whatever the dates say. */
  on: boolean;
  /** Bumped whenever the words change, so dismissing one notice never hides the next. */
  id: string;
  title: string;
  /** The quiet line under it: a date range, a detail, whatever the notice needs. */
  note?: string;
  /** The button. Both of these or neither. */
  ctaLabel?: string;
  ctaHref?: string;
  /** Only shown between these, when they are set. Plain yyyy-mm-dd. */
  from?: string;
  until?: string;
}

const DEFAULT_STUDIO: StudioDetails = {
  name: "Ruffles and Baked by H",
  cakeBrand: "Baked by H",
  rufflesBrand: "Ruffles by H",
  tagline: "Look great, feel fabulous",
  category: "Millinery, bead work & celebration cakes",
  about:
    "Ruffles and Baked by H is Hillary's studio in Kasoa. One half is the workroom: bespoke handmade headpieces, hats, crowns, beaded headbands, brooches and the whole bridal set, from the bouquet to the boutonnieres. The other half is the kitchen: celebration cakes, kids' themed cakes, bento cakes and pastries, baked to order. Most people find her for one and come back for both, so a cake and the piece you'll wear to cut it can travel on the same order.",
  area: "Kasoa, Central Region",
  /** The street is the one detail the profiles never spell out; the owner fills it in from Settings. */
  address: "Kasoa, Central Region, Ghana",
  directions: "Pickup is in Kasoa. We send the exact spot and a landmark on WhatsApp once your day is set; call when you turn in and we'll bring the order out.",
  mapsQuery: "Kasoa, Central Region, Ghana",
  phone: "020 584 0753",
  email: "rufflesbyh@gmail.com",
  whatsappBusiness: "https://wa.me/233205840753",
  instagram: "https://www.instagram.com/ruffles_byh/",
  instagramCakes: "https://www.instagram.com/bakedbyh_gh/",
  facebook: "https://www.facebook.com/RufflesbyH",
  owner: "Hillary",
  /** Sample figures for the demo. */
  rating: 4.9,
  reviewCount: 74,
};

/** Hours from the studio's WhatsApp Business profile: 08:00–19:00, with Sunday for church. */
const DEFAULT_HOURS: Hours = {
  0: null,
  1: ["08:00", "19:00"],
  2: ["08:00", "19:00"],
  3: ["08:00", "19:00"],
  4: ["08:00", "19:00"],
  5: ["08:00", "19:00"],
  6: ["08:00", "19:00"],
};

const DEFAULT_POLICIES: Policies = {
  cancellation:
    "Cancel free of charge until we start: that's the day before baking, or before the beading begins on a bespoke piece. After that, what you've paid covers the materials and the work already done.",
  payment:
    "Cakes on the price list are booked once they're paid in full. Bespoke pieces, wedding cakes and dowry wrapping get a quote first, then a 50% deposit to start and the balance before handover.",
  handover:
    "Pick up in Kasoa at the time we agree, or we send a rider. Delivery across Accra and Kasoa is paid to the rider on arrival; wedding cakes and bridal sets travel anywhere in Ghana, quoted per trip. Carry cakes flat on the car floor, never on a lap.",
  important:
    "We are pre-order only. Cakes need 3 working days, kids' themed cakes 5, and bespoke headpieces and bridal sets between 1 and 3 weeks. Tell us about allergies when you order: the kitchen uses eggs, milk, wheat and nuts. For a headband or hat, send your head measurement in centimetres.",
};

const DEFAULT_RULES: Rules = { lateFee: 50, designFee: 150, depositPercent: 50 };

const DEFAULT_ANNOUNCEMENT: Announcement = {
  on: true,
  id: "christmas-cutoff",
  title: "Christmas orders close on 18 December",
  note: "Cakes and headpieces for the season are taken until then, while dates last.",
  ctaLabel: "Start an order",
  ctaHref: "/order/new",
};

export const cloneSettings = (settings: StudioSettings): StudioSettings => ({
  studio: { ...settings.studio },
  hours: { ...settings.hours },
  policies: { ...settings.policies },
  rules: { ...settings.rules },
  announcement: { ...(settings.announcement ?? DEFAULT_ANNOUNCEMENT) },
});

export const defaultSettings = (): StudioSettings => cloneSettings({ studio: DEFAULT_STUDIO, hours: DEFAULT_HOURS, policies: DEFAULT_POLICIES, rules: DEFAULT_RULES, announcement: DEFAULT_ANNOUNCEMENT });

/**
 * The studio details every screen reads. The saved settings in the store are the source of truth:
 * `applySettings` copies them in here whenever they change, so both sides show the same details
 * without every screen having to subscribe to the store.
 */
export const STUDIO: StudioDetails = { ...DEFAULT_STUDIO };
export const HOURS: Hours = { ...DEFAULT_HOURS };
export const POLICIES: Policies = { ...DEFAULT_POLICIES };
export const RULES: Rules = { ...DEFAULT_RULES };

export function applySettings(settings: StudioSettings) {
  Object.assign(STUDIO, settings.studio);
  Object.assign(POLICIES, settings.policies);
  Object.assign(RULES, settings.rules);
  for (let day = 0; day < 7; day++) HOURS[day] = settings.hours[day] ?? null;
}

/** The gallery's picture for each occasion. Cutouts hang in the air with no card behind them. */
export const OCCASION_PHOTOS: Record<string, { src: string; cutout?: boolean }> = {
  birthday: { src: "/photos/cake-box-bow.webp" },
  wedding: { src: "/photos/bride-portrait.webp" },
  engagement: { src: "/photos/group-outfits.webp", cutout: true },
  kids: { src: "/photos/cake-minnie.webp" },
  christening: { src: "/photos/fascinator-rainbow.webp", cutout: true },
  funeral: { src: "/photos/fascinator-burgundy.webp", cutout: true },
  church: { src: "/photos/fascinator-cream.webp", cutout: true },
  anniversary: { src: "/photos/cake-bride-to-be-side.webp", cutout: true },
  everyday: { src: "/photos/fascinator-lilac.webp", cutout: true },
};

export const STUDIO_FEATURES = [
  { icon: "sparkles", label: "Bespoke headpieces: no two are the same" },
  { icon: "cake", label: "Cakes from the price list, no haggling" },
  { icon: "calendar", label: "Pre-order only · 3 days for cakes, 1–3 weeks for pieces" },
  { icon: "truck", label: "Delivery in Kasoa and Accra; nationwide for weddings" },
  { icon: "gift", label: "Gift & dowry wrapping, and the Passion Chest" },
  { icon: "wallet", label: "MoMo, card, cash and bank transfer" },
] as const;
