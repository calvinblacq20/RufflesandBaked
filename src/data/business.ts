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

export const cloneSettings = (settings: StudioSettings): StudioSettings => ({
  studio: { ...settings.studio },
  hours: { ...settings.hours },
  policies: { ...settings.policies },
  rules: { ...settings.rules },
});

export const defaultSettings = (): StudioSettings => cloneSettings({ studio: DEFAULT_STUDIO, hours: DEFAULT_HOURS, policies: DEFAULT_POLICIES, rules: DEFAULT_RULES });

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

/** The studio's own photos, from @ruffles_byh and @bakedbyh_gh, for the hero gallery. */
export const STUDIO_PHOTOS = [
  { src: "/photos/hat-cream-gold.webp", alt: "Cream and gold wide-brim hat trimmed with feathers, worn at a wedding", position: "center 30%" },
  { src: "/photos/cake-box-bow.webp", alt: "Hillary holding a white celebration cake dressed as a gift box with a satin bow", position: "center 35%" },
  { src: "/photos/fascinator-purple.webp", alt: "Purple sinamay fascinator with feathers and tulle on a stand", position: "center 45%" },
  { src: "/photos/bridal-look.webp", alt: "Bride in white with a handmade white fascinator and crystal detail", position: "center 30%" },
  { src: "/photos/cake-minnie.webp", alt: "Minnie Mouse themed second birthday cake with a red bow topper", position: "center 40%" },
  { src: "/photos/tiara-gold.webp", alt: "Gold beaded branch crown held up on a clear headband", position: "center 45%" },
] as const;

export const OCCASION_PHOTOS: Record<string, string> = {
  birthday: "/photos/cake-box-bow.webp",
  wedding: "/photos/bridal-look.webp",
  engagement: "/photos/tiara-gold.webp",
  kids: "/photos/cake-minnie.webp",
  christening: "/photos/headband-crystal.webp",
  funeral: "/photos/hat-cream-gold.webp",
  church: "/photos/owner-gold.webp",
  anniversary: "/photos/cake-box-bow.webp",
  everyday: "/photos/fascinator-purple.webp",
};

export const STUDIO_FEATURES = [
  { icon: "sparkles", label: "Bespoke headpieces: no two are the same" },
  { icon: "cake", label: "Cakes from the price list, no haggling" },
  { icon: "calendar", label: "Pre-order only · 3 days for cakes, 1–3 weeks for pieces" },
  { icon: "truck", label: "Delivery in Kasoa and Accra; nationwide for weddings" },
  { icon: "gift", label: "Gift & dowry wrapping, and the Passion Chest" },
  { icon: "wallet", label: "MoMo, card, cash and bank transfer" },
] as const;
