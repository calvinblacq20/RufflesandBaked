import { finishLabel, flavourList, sizeLabel, styleById } from "../data/catalog";
import type { Line, OrderItem, Style } from "../data/types";
import { hasFlavour } from "./pricing";

/**
 * "8 inch · Creamy vanilla & red velvet · 2 layers · Whipped cream",
 * "3 tiers · Chocolate · Fondant", "Pack of 3", "Bespoke · Wine and gold".
 */
export function itemSummary(
  item: Pick<OrderItem, "flavours" | "size" | "layers" | "tiers" | "finish" | "design" | "colours">,
  style: Pick<Style, "id" | "kind" | "unit"> | undefined,
): string {
  if (!style) return flavourList(item.flavours);
  const parts: string[] = [];
  if (style.kind === "cake") {
    if (item.size) parts.push(sizeLabel(item.size));
    if (item.flavours.length) parts.push(flavourList(item.flavours));
    if (item.layers) parts.push(item.layers === 1 ? "1 layer" : `${item.layers} layers`);
    parts.push(finishLabel(item.finish));
  } else if (style.kind === "tiered") {
    parts.push(`${item.tiers ?? 2} tiers`);
    if (item.flavours.length) parts.push(flavourList(item.flavours));
    parts.push(finishLabel(item.finish));
  } else if (style.kind === "bespoke") {
    parts.push("Made to order");
    if (item.colours) parts.push(item.colours);
  } else {
    if (style.unit) parts.push(style.unit.charAt(0).toUpperCase() + style.unit.slice(1));
    if (hasFlavour(style) && item.flavours.length) parts.push(flavourList(item.flavours));
    if (item.colours) parts.push(item.colours);
  }
  if (item.design === "custom" && (style.kind === "cake" || style.kind === "tiered")) parts.push("Custom design");
  return parts.join(" · ");
}

/**
 * Which half of the studio an order belongs to: the kitchen, the workroom, or both, which is
 * what decides whether a screen says "baking" or "beading". null when the items are mixed.
 */
export function orderLine(order: { items: Pick<OrderItem, "styleId">[] }): Line | null {
  const lines = new Set(order.items.map((item) => styleById(item.styleId)?.line).filter((l): l is Line => Boolean(l)));
  if (lines.size !== 1) return null;
  const [only] = lines;
  return only === "both" ? null : (only ?? null);
}

/** "Classic celebration cake × 2 + 1 more" */
export function orderTitle(order: { items: Pick<OrderItem, "styleId" | "qty">[] }): string {
  const first = order.items[0];
  const name = first ? (styleById(first.styleId)?.name ?? "Custom order") : "Custom order";
  const qty = first && first.qty > 1 ? ` × ${first.qty}` : "";
  const more = order.items.length > 1 ? ` + ${order.items.length - 1} more` : "";
  return `${name}${qty}${more}`;
}

/** Units in words: "2 cakes", "10 boxes", "1 chest", "1 piece". */
export function unitCount(item: Pick<OrderItem, "qty">, style: Pick<Style, "kind" | "unit"> | undefined): string {
  if (!style) return item.qty === 1 ? "1 item" : `${item.qty} items`;
  if (style.kind === "bespoke") return item.qty === 1 ? "1 piece" : `${item.qty} pieces`;
  if (style.kind !== "unit" || !style.unit) return item.qty === 1 ? "1 cake" : `${item.qty} cakes`;
  const noun = style.unit.split(/[ ,]/)[0] ?? "unit";
  const many = noun.endsWith("x") || noun.endsWith("s") ? `${noun}es` : noun.endsWith("f") ? `${noun.slice(0, -1)}ves` : `${noun}s`;
  return `${item.qty} ${item.qty === 1 ? noun : many}`;
}
