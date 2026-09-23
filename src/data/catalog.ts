import type { CakeSize, CategoryId, Design, Finish, Flavour, Layers, Line, Occasion, PriceGrid, PriceRange, Style } from "./types";

export const LINES: { id: Line; label: string; short: string; blurb: string }[] = [
  { id: "cakes", label: "Baked by H", short: "Cakes", blurb: "Delicious creamy goodness" },
  { id: "ruffles", label: "Ruffles by H", short: "Headpieces", blurb: "Look great, feel fabulous" },
  { id: "both", label: "Together", short: "Bundles", blurb: "A cake and a piece, one order" },
];

export const CATEGORIES: { id: CategoryId; label: string; line: Line }[] = [
  { id: "cakes", label: "Celebration cakes", line: "cakes" },
  { id: "themed", label: "Themed & kids", line: "cakes" },
  { id: "tiered", label: "Tiered & wedding", line: "cakes" },
  { id: "treats", label: "Desserts & pastries", line: "cakes" },
  { id: "headpieces", label: "Headpieces & hats", line: "ruffles" },
  { id: "bridal", label: "Bridal & occasion", line: "ruffles" },
  { id: "gifting", label: "Gifting & wrapping", line: "both" },
];

export const OCCASIONS: { id: Occasion; label: string; categories: CategoryId[] }[] = [
  { id: "birthday", label: "Birthday", categories: ["cakes", "themed", "treats", "headpieces"] },
  { id: "wedding", label: "Wedding", categories: ["tiered", "bridal", "headpieces", "gifting"] },
  { id: "engagement", label: "Engagement & dowry", categories: ["gifting", "bridal", "cakes"] },
  { id: "kids", label: "Kids' party", categories: ["themed", "treats", "cakes"] },
  { id: "christening", label: "Christening & naming", categories: ["cakes", "headpieces", "treats"] },
  { id: "funeral", label: "Funeral & memorial", categories: ["headpieces", "cakes", "gifting"] },
  { id: "church", label: "Church & thanksgiving", categories: ["headpieces", "cakes", "treats"] },
  { id: "anniversary", label: "Anniversary", categories: ["cakes", "tiered", "gifting"] },
  { id: "everyday", label: "Just because", categories: ["treats", "cakes", "headpieces"] },
  { id: "other", label: "Something else", categories: [] },
];

/** The flavours printed on the Classic Cake Menu, in the order they appear on it. */
export const FLAVOURS: { id: Flavour; label: string; short: string }[] = [
  { id: "creamy-vanilla", label: "Creamy vanilla", short: "Vanilla" },
  { id: "vanilla-raspberry", label: "Vanilla raspberry", short: "Van. raspberry" },
  { id: "vanilla-caramel", label: "Vanilla caramel", short: "Van. caramel" },
  { id: "strawberry", label: "Strawberry", short: "Strawberry" },
  { id: "strawberry-swirl", label: "Strawberry swirl", short: "Strawb. swirl" },
  { id: "chocolate", label: "Chocolate", short: "Chocolate" },
  { id: "red-velvet", label: "Red velvet", short: "Red velvet" },
  { id: "white-velvet", label: "White velvet", short: "White velvet" },
  { id: "choco-vanilla-marble", label: "Choco-vanilla marble", short: "Choco marble" },
  { id: "red-velvet-marble", label: "Red velvet choco-vanilla marble", short: "Velvet marble" },
];

export const RANGES: { id: PriceRange; label: string; note: string }[] = [
  { id: "classic", label: "Round, square & heart", note: "The quoted prices cover round, square and heart shaped cakes." },
  { id: "bento", label: "Bento cakes", note: "Small cakes for one or two, ready in a day." },
  { id: "rect", label: "Rectangular cakes", note: "Two layers each, cut into neat squares for a crowd." },
  { id: "kids", label: "Kids themed", note: "6 inch, two to four layers, with the characters your child asks for." },
];

export const SIZES: { id: CakeSize; label: string; short: string; serves: string }[] = [
  { id: "bento", label: "Bento", short: "Bento", serves: "1–2 people" },
  { id: "6", label: "6 inch", short: "6″", serves: "10–12 slices" },
  { id: "8", label: "8 inch", short: "8″", serves: "20–24 slices" },
  { id: "10", label: "10 inch", short: "10″", serves: "35–40 slices" },
  { id: "4x8", label: "4 × 8 inch", short: "4×8″", serves: "12–15 squares" },
  { id: "5x10", label: "5 × 10 inch", short: "5×10″", serves: "20–24 squares" },
  { id: "8x12", label: "8 × 12 inch", short: "8×12″", serves: "40–48 squares" },
  { id: "10x15", label: "10 × 15 inch", short: "10×15″", serves: "60–70 squares" },
];

export const LAYER_OPTIONS: { id: Layers; label: string }[] = [
  { id: 1, label: "Single layer" },
  { id: 2, label: "Two layers" },
  { id: 3, label: "Three layers" },
  { id: 4, label: "Four layers" },
];

/** Whipped cream is what the menu prices; the other two are the finishes clients ask for on top. */
export const FINISH_OPTIONS: { id: Finish; label: string; hint: string }[] = [
  { id: "cream", label: "Whipped cream", hint: "The house finish, included" },
  { id: "ganache", label: "Chocolate ganache", hint: "Firmer, holds up in the heat" },
  { id: "fondant", label: "Fondant", hint: "Sharp edges and sculpted details" },
];

export const DESIGN_OPTIONS: { id: Design; label: string; hint: string }[] = [
  { id: "classic", label: "Classic", hint: "Smooth finish, piped message, your colours" },
  { id: "custom", label: "Custom or character", hint: "A theme, figures, toppers, sugar flowers" },
];

/**
 * The Classic Cake Menu, read straight off the studio's own price card (price per cake, GH₵).
 * Only the combinations printed there are offered. The owner edits it in Menu & prices.
 */
const DEFAULT_PRICE_GRID: PriceGrid = {
  classic: {
    1: { "6": 220, "8": 320, "10": 420 },
    2: { "6": 420, "8": 620, "10": 820 },
    3: { "6": 620, "8": 820, "10": 1200 },
  },
  bento: {
    1: { bento: 150 },
    2: { bento: 300 },
  },
  rect: {
    2: { "4x8": 250, "5x10": 450, "8x12": 850, "10x15": 1250 },
  },
  kids: {
    2: { "6": 400 },
    3: { "6": 600 },
    4: { "6": 800 },
  },
};

const cloneBlock = (block: Partial<Record<Layers, Partial<Record<CakeSize, number>>>>) => {
  const out: Partial<Record<Layers, Partial<Record<CakeSize, number>>>> = {};
  for (const [layers, sizes] of Object.entries(block)) out[Number(layers) as Layers] = { ...sizes };
  return out;
};

export const cloneGrid = (grid: PriceGrid): PriceGrid => ({
  classic: cloneBlock(grid.classic),
  bento: cloneBlock(grid.bento),
  rect: cloneBlock(grid.rect),
  kids: cloneBlock(grid.kids),
});

export const defaultPriceGrid = (): PriceGrid => cloneGrid(DEFAULT_PRICE_GRID);

/** The price list every screen reads. `applyPriceGrid` keeps it in step with the store. */
export const PRICE_GRID: PriceGrid = defaultPriceGrid();

export function applyPriceGrid(grid: PriceGrid) {
  const next = cloneGrid(grid);
  PRICE_GRID.classic = next.classic;
  PRICE_GRID.bento = next.bento;
  PRICE_GRID.rect = next.rect;
  PRICE_GRID.kids = next.kids;
}

/**
 * The starting menu, built from the studio's WhatsApp catalogue and its two Instagram pages.
 * Cake prices come from the Classic Cake Menu; the Passion Chest price is the one published in
 * the catalogue. Everything marked bespoke is quoted after a chat, which is how the studio works.
 */
const DEFAULT_STYLES: Style[] = [
  // ── Baked by H ────────────────────────────────────────────────────────────
  {
    id: "classic-cake",
    name: "Classic celebration cake",
    line: "cakes",
    category: "cakes",
    description: "Round, square or heart, one to three layers, whipped cream finish and your message piped on top. A flavour for every layer.",
    kind: "cake",
    range: "classic",
    fromPrice: 0,
    extraFrom: 0,
    readyDays: 3,
    featured: true,
    tone: "blush",
    photo: "/photos/cake-box-bow.webp",
  },
  {
    id: "bento-cake",
    name: "Bento cake",
    line: "cakes",
    category: "cakes",
    description: "The little one that fits in a box and says exactly what you mean. One or two layers, ready the next day.",
    kind: "cake",
    range: "bento",
    fromPrice: 0,
    extraFrom: 0,
    readyDays: 1,
    featured: true,
    tone: "gold",
  },
  {
    id: "rect-cake",
    name: "Rectangular sharing cake",
    line: "cakes",
    category: "cakes",
    description: "Two layers, cut into neat squares. The one for office send-offs, church programmes and big family Sundays.",
    kind: "cake",
    range: "rect",
    fromPrice: 0,
    extraFrom: 0,
    readyDays: 3,
    tone: "sand",
  },
  {
    id: "kids-cake",
    name: "Kids themed birthday cake",
    line: "cakes",
    category: "themed",
    description: "Minnie, superheroes, cars, dolls: whoever your child is asking for, hand-painted and built up to four layers.",
    kind: "cake",
    range: "kids",
    fromPrice: 0,
    extraFrom: 0,
    customDesign: true,
    readyDays: 5,
    featured: true,
    tone: "sky",
    photo: "/photos/cake-minnie.webp",
  },
  {
    id: "number-cake",
    name: "Number & letter cake",
    line: "cakes",
    category: "themed",
    description: "The age or the initials, cut and dressed with cream, fruit and flowers. Priced like a rectangular cake of the same reach.",
    kind: "cake",
    range: "rect",
    fromPrice: 0,
    extraFrom: 0,
    customDesign: true,
    readyDays: 5,
    tone: "charcoal",
  },
  {
    id: "wedding-cake",
    name: "Wedding cake",
    line: "cakes",
    category: "tiered",
    description: "Two to five tiers designed around your colours, set up at the venue and dressed with fresh or beaded flowers from the workroom.",
    kind: "tiered",
    fromPrice: 1800,
    extraFrom: 600,
    readyDays: 14,
    featured: true,
    tone: "mist",
  },
  {
    id: "calendar-cake",
    name: "Calendar cake",
    line: "cakes",
    category: "tiered",
    description: "The date that matters, built as a cake. Two, three or four layers, with the month and day picked out on the board.",
    kind: "tiered",
    fromPrice: 900,
    extraFrom: 350,
    customDesign: true,
    readyDays: 7,
    tone: "steel",
  },
  {
    id: "pastry-box",
    name: "Dessert & pastry box",
    line: "cakes",
    category: "treats",
    description: "Whatever is good that week: cupcakes, brownies, pies and cake jars, boxed for the office or the family table.",
    kind: "unit",
    fromPrice: 180,
    extraFrom: 0,
    unit: "box of 12",
    readyDays: 2,
    featured: true,
    tone: "sand",
  },
  {
    id: "cake-jars",
    name: "Cake jars",
    line: "cakes",
    category: "treats",
    description: "Layers of sponge and cream in a jar, any flavour on the menu. Good for hampers and church shares.",
    kind: "unit",
    fromPrice: 35,
    extraFrom: 0,
    unit: "jar",
    minQty: 6,
    readyDays: 2,
    tone: "blush",
  },
  {
    id: "cupcakes",
    name: "Cupcakes",
    line: "cakes",
    category: "treats",
    description: "Frosted and topped in your colours, with a topper if you want the name on them.",
    kind: "unit",
    fromPrice: 120,
    extraFrom: 0,
    unit: "box of 6",
    readyDays: 2,
    tone: "lilac",
  },

  // ── Ruffles by H ──────────────────────────────────────────────────────────
  {
    id: "fascinator",
    name: "Fascinator",
    line: "ruffles",
    category: "headpieces",
    description: "Sinamay, feathers and tulle worked onto a band or clip. The piece people ask about across the room.",
    kind: "bespoke",
    fromPrice: 0,
    extraFrom: 0,
    customDesign: true,
    readyDays: 7,
    featured: true,
    tone: "lilac",
    photo: "/photos/fascinator-purple.webp",
  },
  {
    id: "hat",
    name: "Hat & hatinator",
    line: "ruffles",
    category: "headpieces",
    description: "A wide brim for the mother of the bride or groom, trimmed to match the outfit you are already having made.",
    kind: "bespoke",
    fromPrice: 0,
    extraFrom: 0,
    customDesign: true,
    readyDays: 14,
    featured: true,
    tone: "sand",
    photo: "/photos/hat-cream-gold.webp",
  },
  {
    id: "headband",
    name: "Beaded headband",
    line: "ruffles",
    category: "headpieces",
    description: "Crystal, pearl and wire worked by hand into a band that sits light and stays put all day.",
    kind: "bespoke",
    fromPrice: 0,
    extraFrom: 0,
    customDesign: true,
    readyDays: 5,
    featured: true,
    tone: "sky",
    photo: "/photos/headband-crystal.webp",
  },
  {
    id: "tiara",
    name: "Crown & tiara",
    line: "ruffles",
    category: "bridal",
    description: "From the Gorgeous Woman Collection: crystal and pearl crowns built branch by branch for brides, birthdays and thanksgivings.",
    kind: "bespoke",
    fromPrice: 0,
    extraFrom: 0,
    customDesign: true,
    readyDays: 10,
    featured: true,
    tone: "gold",
    photo: "/photos/tiara-gold.webp",
  },
  {
    id: "bridal-set",
    name: "Bridal set",
    line: "ruffles",
    category: "bridal",
    description: "The whole party in one go: the bride's piece, bouquet, boutonnieres for the men and a bridal fan, worked in your colours.",
    kind: "bespoke",
    fromPrice: 0,
    extraFrom: 0,
    customDesign: true,
    readyDays: 21,
    featured: true,
    tone: "mist",
    photo: "/photos/bridal-look.webp",
  },
  {
    id: "bouquet",
    name: "Beaded bouquet",
    line: "ruffles",
    category: "bridal",
    description: "Beads and wire instead of fresh stems, so it lasts past the day and photographs the same at 6pm as it did at noon.",
    kind: "bespoke",
    fromPrice: 0,
    extraFrom: 0,
    customDesign: true,
    readyDays: 14,
    tone: "blush",
  },
  {
    id: "boutonniere",
    name: "Boutonnieres & corsages",
    line: "ruffles",
    category: "bridal",
    description: "For the groom, the fathers and the groomsmen, or wrist corsages for the ladies. Priced per piece, made as a set.",
    kind: "unit",
    fromPrice: 60,
    extraFrom: 0,
    unit: "piece",
    minQty: 4,
    readyDays: 10,
    tone: "steel",
  },
  {
    id: "bridal-fan",
    name: "Bridal fan",
    line: "ruffles",
    category: "bridal",
    description: "A dressed fan for the ceremony and the photographs, beaded and feathered to sit with the headpiece.",
    kind: "bespoke",
    fromPrice: 0,
    extraFrom: 0,
    customDesign: true,
    readyDays: 10,
    tone: "sand",
  },
  {
    id: "brooch",
    name: "Brooch",
    line: "ruffles",
    category: "headpieces",
    description: "A handmade brooch for a lapel, a scarf or the waist of a kaba. Small, and the whole outfit turns on it.",
    kind: "unit",
    fromPrice: 80,
    extraFrom: 0,
    unit: "brooch",
    readyDays: 5,
    tone: "charcoal",
  },
  {
    id: "scrunchies",
    name: "Scrunchies",
    line: "ruffles",
    category: "headpieces",
    description: "Soft fabric scrunchies made from the same cloth as the piece, or in a set of three for gifting.",
    kind: "unit",
    fromPrice: 45,
    extraFrom: 0,
    unit: "pack of 3",
    readyDays: 3,
    tone: "lilac",
  },

  // ── Together ──────────────────────────────────────────────────────────────
  {
    id: "passion-chest",
    name: "Passion Chest",
    line: "both",
    category: "gifting",
    description: "The gift box from the catalogue: a handmade piece, a small cake and the extras, wrapped and ready to hand over. Comes with freebies.",
    kind: "unit",
    fromPrice: 220,
    extraFrom: 0,
    unit: "chest",
    readyDays: 5,
    featured: true,
    tone: "blush",
  },
  {
    id: "crown-her",
    name: "Crown Her gift set",
    line: "both",
    category: "gifting",
    description: "A crown or headband from the workroom with a bento cake from the kitchen, boxed together. The Mother's Day set, made all year.",
    kind: "unit",
    fromPrice: 450,
    extraFrom: 0,
    unit: "set",
    readyDays: 5,
    featured: true,
    tone: "gold",
  },
  {
    id: "dowry-wrapping",
    name: "Gift & dowry wrapping",
    line: "both",
    category: "gifting",
    description: "Your engagement list wrapped and presented properly: trunks, trays and bowls dressed in your colours, delivered to the house.",
    kind: "bespoke",
    fromPrice: 0,
    extraFrom: 0,
    customDesign: true,
    readyDays: 14,
    featured: true,
    tone: "sand",
  },
  {
    id: "favour-box",
    name: "Guest favour box",
    line: "both",
    category: "gifting",
    description: "A small cake or pastry with a beaded keepsake, boxed one per guest for weddings, funerals and outdoorings.",
    kind: "unit",
    fromPrice: 55,
    extraFrom: 0,
    unit: "box",
    minQty: 10,
    readyDays: 7,
    tone: "mist",
  },
];

/** Tier ranges for tiered items: the base price covers the smallest stack. */
export const TIER_RANGE: Record<string, { min: number; max: number }> = {
  "wedding-cake": { min: 2, max: 5 },
  "calendar-cake": { min: 2, max: 4 },
};

export const tierRange = (styleId: string) => TIER_RANGE[styleId] ?? { min: 2, max: 4 };

/** Unit items where the client still chooses a flavour. */
export const FLAVOURED_UNITS = new Set(["cupcakes", "cake-jars", "pastry-box", "crown-her", "favour-box"]);

export const defaultStyles = (): Style[] => DEFAULT_STYLES.map((style) => ({ ...style, sizes: style.sizes ? [...style.sizes] : undefined }));

/** The menu clients see: every item the owner hasn't hidden. `applyStyles` keeps it in step with the store. */
export const STYLES: Style[] = defaultStyles();

/** Every item ever offered, hidden ones included, so past orders still show their name. */
const ALL_STYLES = new Map<string, Style>(STYLES.map((s) => [s.id, s]));

export function applyStyles(styles: Style[]) {
  ALL_STYLES.clear();
  for (const style of styles) ALL_STYLES.set(style.id, style);
  for (const style of DEFAULT_STYLES) if (!ALL_STYLES.has(style.id)) ALL_STYLES.set(style.id, style);
  STYLES.length = 0;
  STYLES.push(...styles.filter((s) => s.active !== false));
}

export const styleById = (id: string) => ALL_STYLES.get(id);
export const categoryLabel = (id: CategoryId) => CATEGORIES.find((c) => c.id === id)?.label ?? id;
export const categoryLine = (id: CategoryId): Line => CATEGORIES.find((c) => c.id === id)?.line ?? "cakes";
export const occasionLabel = (id: Occasion) => OCCASIONS.find((o) => o.id === id)?.label ?? id;
export const flavourLabel = (id: Flavour) => FLAVOURS.find((f) => f.id === id)?.label ?? id;
export const flavourShort = (id: Flavour) => FLAVOURS.find((f) => f.id === id)?.short ?? id;
export const sizeLabel = (id: CakeSize) => SIZES.find((s) => s.id === id)?.label ?? id;
export const sizeServes = (id: CakeSize) => SIZES.find((s) => s.id === id)?.serves ?? "";
export const finishLabel = (id: Finish) => FINISH_OPTIONS.find((f) => f.id === id)?.label ?? id;
export const lineLabel = (id: Line) => LINES.find((l) => l.id === id)?.label ?? id;
export const rangeLabel = (id: PriceRange) => RANGES.find((r) => r.id === id)?.label ?? id;

/** "Creamy vanilla & red velvet", "Chocolate". */
export const flavourList = (ids: Flavour[]) => {
  const names = ids.map(flavourLabel);
  if (names.length <= 1) return names[0] ?? "";
  return `${names.slice(0, -1).join(", ")} & ${names[names.length - 1]}`;
};
