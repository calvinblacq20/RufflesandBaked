import { RULES, type Rules } from "../data/business";
import { FLAVOURED_UNITS, LAYER_OPTIONS, PRICE_GRID, SIZES, tierRange } from "../data/catalog";
import type { CakeSize, Design, Finish, Flavour, Layers, OrderItem, PriceGrid, PriceRange, Style } from "../data/types";

/** Extras for the finishes the menu doesn't price; whipped cream is the house finish and included. */
export const FINISH_ADD: Record<Finish, number> = { cream: 0, ganache: 120, fondant: 150 };

/** What the customer picks for one menu item. */
export type ItemChoice = Pick<OrderItem, "styleId" | "qty" | "flavours" | "size" | "layers" | "tiers" | "finish" | "design" | "message" | "colours">;

export const rangeOf = (style: Pick<Style, "range">): PriceRange => style.range ?? "classic";

/** A cake's price from the list, or null when that combination isn't offered. */
export function gridPrice(range: PriceRange, layers: Layers, size: CakeSize, grid: PriceGrid = PRICE_GRID): number | null {
  return grid[range][layers]?.[size] ?? null;
}

/** Every size the item's block of the price list can offer, in menu order. */
export function sizesOf(style: Pick<Style, "sizes" | "range">, grid: PriceGrid = PRICE_GRID): CakeSize[] {
  if (style.sizes) return style.sizes;
  const block = grid[rangeOf(style)];
  const priced = new Set<CakeSize>();
  for (const sizes of Object.values(block)) for (const size of Object.keys(sizes) as CakeSize[]) priced.add(size);
  return SIZES.map((s) => s.id).filter((id) => priced.has(id));
}

/** Sizes on offer for this item at a layer count. */
export function sizesFor(style: Pick<Style, "sizes" | "range">, layers: Layers, grid: PriceGrid = PRICE_GRID): CakeSize[] {
  return sizesOf(style, grid).filter((size) => gridPrice(rangeOf(style), layers, size, grid) !== null);
}

/** Layer counts with at least one size on offer. */
export function layersFor(style: Pick<Style, "sizes" | "range">, grid: PriceGrid = PRICE_GRID): Layers[] {
  return LAYER_OPTIONS.map((l) => l.id).filter((layers) => sizesFor(style, layers, grid).length > 0);
}

/** The menu card's rule: one flavour per layer, so a three-layer cake can carry three. */
export const maxFlavours = (style: Pick<Style, "kind">, layers: Layers | undefined) => (style.kind === "cake" ? Math.max(1, layers ?? 1) : 1);

const designCharge = (style: Pick<Style, "customDesign">, design: Design, rules: Rules) => (style.customDesign || design === "custom" ? rules.designFee : 0);

/** Price of one unit of an item as chosen. Bespoke pieces have no price until the studio quotes one. */
export function unitPrice(style: Style, choice: Omit<ItemChoice, "styleId" | "qty">, grid: PriceGrid = PRICE_GRID, rules: Rules = RULES): number {
  switch (style.kind) {
    case "cake": {
      const base = choice.layers && choice.size ? gridPrice(rangeOf(style), choice.layers, choice.size, grid) : null;
      return (base ?? 0) + FINISH_ADD[choice.finish] + designCharge(style, choice.design, rules);
    }
    case "tiered": {
      const { min } = tierRange(style.id);
      return style.fromPrice + Math.max(0, (choice.tiers ?? min) - min) * style.extraFrom;
    }
    case "unit":
      return style.fromPrice;
    case "bespoke":
      return 0;
  }
}

/** The lowest price a client can pay for an item, for "from GH₵ …" labels. 0 means "quoted". */
export function fromPriceOf(style: Style, grid: PriceGrid = PRICE_GRID, rules: Rules = RULES): number {
  if (style.kind === "bespoke") return 0;
  if (style.kind !== "cake") return style.fromPrice;
  const prices = LAYER_OPTIONS.flatMap((l) => sizesOf(style, grid).map((size) => gridPrice(rangeOf(style), l.id, size, grid))).filter((p): p is number => p !== null);
  return (prices.length ? Math.min(...prices) : 0) + (style.customDesign ? rules.designFee : 0);
}

/** Bespoke pieces and anything else without a list price are settled by quote. */
export const isQuoted = (style: Pick<Style, "kind">) => style.kind === "bespoke";

/** A sensible first choice for an item: creamy vanilla, the smallest size on offer, whipped cream. */
export function defaultChoice(style: Style, grid: PriceGrid = PRICE_GRID): Omit<ItemChoice, "styleId"> {
  const qty = style.minQty ?? 1;
  const base = {
    qty,
    flavours: hasFlavour(style) ? (["creamy-vanilla"] as Flavour[]) : [],
    finish: "cream" as Finish,
    design: style.customDesign ? ("custom" as Design) : ("classic" as Design),
  };
  if (style.kind === "cake") {
    const layers = layersFor(style, grid)[0] ?? 1;
    return { ...base, layers, size: sizesFor(style, layers, grid)[0] };
  }
  if (style.kind === "tiered") return { ...base, tiers: tierRange(style.id).min };
  return base;
}

/** Whether the customer picks a flavour for this item. */
export const hasFlavour = (style: Pick<Style, "id" | "kind">) => style.kind === "cake" || style.kind === "tiered" || FLAVOURED_UNITS.has(style.id);

/**
 * Keeps a choice valid after the layers change: sizes not on offer fall back to the first one that
 * is, and flavours are trimmed to one per layer.
 */
export function fixChoice(style: Style, choice: Omit<ItemChoice, "styleId">, grid: PriceGrid = PRICE_GRID): Omit<ItemChoice, "styleId"> {
  if (style.kind !== "cake") {
    const cap = maxFlavours(style, undefined);
    return { ...choice, flavours: choice.flavours.slice(0, cap) };
  }
  const layerOptions = layersFor(style, grid);
  const layers = choice.layers && layerOptions.includes(choice.layers) ? choice.layers : (layerOptions[0] ?? 1);
  const sizes = sizesFor(style, layers, grid);
  const size = choice.size && sizes.includes(choice.size) ? choice.size : (sizes[0] ?? choice.size);
  const flavours = choice.flavours.slice(0, maxFlavours(style, layers));
  return { ...choice, layers, size, flavours: flavours.length ? flavours : (["creamy-vanilla"] as Flavour[]) };
}

export interface Estimate {
  subtotal: number;
  lateFee: number;
  total: number;
  /** True when at least one line is waiting on a quote, so the total is only what we can price so far. */
  hasQuoted: boolean;
}

export function estimate(lines: { unitPrice: number; qty: number }[], shortNotice: boolean, rules: Rules = RULES): Estimate {
  const subtotal = lines.reduce((sum, line) => sum + line.unitPrice * Math.max(0, line.qty), 0);
  const lateFee = shortNotice && subtotal > 0 ? rules.lateFee : 0;
  return { subtotal, lateFee, total: subtotal + lateFee, hasQuoted: lines.some((line) => line.unitPrice === 0) };
}

/** The deposit that starts a quoted piece. */
export const depositOf = (total: number, rules: Rules = RULES) => Math.round((total * rules.depositPercent) / 100);
