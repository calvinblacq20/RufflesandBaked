import type { Line, Order, OrderStatus } from "../data/types";
import { dayKey, fmtDate, fmtTime, money, parseLocal, relativeDay } from "./format";

export const STAGES: OrderStatus[] = ["request", "quoted", "confirmed", "making", "finishing", "ready", "collected"];

export const STATUS_LABEL: Record<OrderStatus, string> = {
  request: "Request sent",
  quoted: "Quote ready",
  confirmed: "Paid and booked",
  making: "Being made",
  finishing: "Finishing touches",
  ready: "Ready",
  collected: "Collected",
  cancelled: "Cancelled",
};

export type BadgeTone = "gold" | "sand" | "sky" | "lilac" | "mist" | "danger" | "wash";

/**
 * The studio bakes and it beads, so the two middle stages read differently depending on what is
 * on the order. Mixed orders fall back to the neutral wording.
 */
export function stageLabel(status: OrderStatus, line: Line | null): string {
  if (status === "making") return line === "cakes" ? "Baking" : line === "ruffles" ? "Beading" : STATUS_LABEL.making;
  if (status === "finishing") return line === "cakes" ? "Decorating" : line === "ruffles" ? "Finishing" : STATUS_LABEL.finishing;
  return STATUS_LABEL[status];
}

export function paidTotal(order: Pick<Order, "payments">): number {
  return order.payments.reduce((sum, p) => sum + p.amount, 0);
}

export function balanceDue(order: Pick<Order, "payments" | "total">): number {
  return Math.max(0, order.total - paidTotal(order));
}

export function isActive(order: Pick<Order, "status">): boolean {
  return order.status !== "collected" && order.status !== "cancelled";
}

/** Clients can cancel until the kitchen or the workroom starts. */
export function canCancel(order: Pick<Order, "status">): boolean {
  return order.status === "request" || order.status === "quoted" || order.status === "confirmed";
}

export function stageIndex(status: OrderStatus): number {
  return STAGES.indexOf(status);
}

export interface Badge {
  label: string;
  tone: BadgeTone;
}

export function badgeFor(order: Pick<Order, "status" | "payments" | "total" | "readyBy" | "delivery">, now: Date): Badge {
  switch (order.status) {
    case "cancelled":
      return { label: "Cancelled", tone: "danger" };
    case "collected":
      return { label: order.delivery === "delivery" ? "Delivered" : "Collected", tone: "mist" };
    case "ready":
      if (balanceDue(order) > 0) return { label: "Ready · balance due", tone: "sand" };
      return { label: order.delivery === "delivery" ? "Out for delivery" : "Ready for pickup", tone: "gold" };
    case "request":
      return paidTotal(order) > 0 ? { label: "Paid", tone: "gold" } : { label: "Request sent", tone: "lilac" };
    case "quoted":
      return { label: "Action required", tone: "sand" };
    case "confirmed":
      return { label: "Booked", tone: "gold" };
    default:
      if (order.readyBy < dayKey(now)) return { label: "Running late", tone: "sand" };
      return { label: "In the kitchen", tone: "sky" };
  }
}

export function titleFor(order: Pick<Order, "status" | "readyBy" | "neededBy" | "history" | "delivery">, now: Date): string {
  const last = order.history[order.history.length - 1];
  switch (order.status) {
    case "collected":
      return `${order.delivery === "delivery" ? "Delivered" : "Collected"} ${last ? fmtDate(new Date(last.at)) : ""}`.trim();
    case "cancelled":
      return `Cancelled ${last ? fmtDate(new Date(last.at)) : ""}`.trim();
    case "ready":
      return order.delivery === "delivery" ? "Ready for delivery" : "Ready for pickup";
    default:
      return `${order.delivery === "delivery" ? "Delivery" : "Pickup"} ${dayPhrase(parseLocal(order.neededBy), now)}`;
  }
}

/** "today", "tomorrow" or "on Tue, 15 Sept" */
function dayPhrase(day: Date, now: Date): string {
  const rel = relativeDay(day, now);
  return rel === "Today" || rel === "Tomorrow" ? rel.toLowerCase() : `on ${rel}`;
}

export interface NextAction {
  title: string;
  body: string;
  cta?: { label: string; kind: "whatsapp" | "pay" | "calendar" | "directions" };
}

/** What the client should do next. `handoverStart` is the booked pickup or delivery time. */
export function nextAction(order: Order, now: Date, handoverStart?: string): NextAction | null {
  const balance = balanceDue(order);
  switch (order.status) {
    case "request":
      return paidTotal(order) > 0
        ? {
            title: "Payment received",
            body: "We'll confirm your design on WhatsApp. If the final price is different, we settle it on your balance.",
            cta: { label: "Chat on WhatsApp", kind: "whatsapp" },
          }
        : {
            title: "We're pricing your design",
            body: "We'll confirm your price and send a payment link on WhatsApp, usually within a few hours.",
            cta: { label: "Chat on WhatsApp", kind: "whatsapp" },
          };
    case "quoted":
      return {
        title: `Pay ${money(balance)} to book your date`,
        body: "Full payment secures your order. Pay with Mobile Money or card.",
        cta: { label: "Pay now", kind: "pay" },
      };
    case "confirmed":
    case "making":
    case "finishing": {
      if (!handoverStart || parseLocal(handoverStart) <= now) return null;
      const start = parseLocal(handoverStart);
      const rel = relativeDay(start, now);
      const when = rel === "Today" || rel === "Tomorrow" ? rel.toLowerCase() : `on ${rel}`;
      return order.delivery === "delivery"
        ? { title: `Delivery ${when} around ${fmtTime(start)}`, body: "Keep your phone close: the rider calls when they're near. The delivery fee is paid to the rider.", cta: { label: "Add to calendar", kind: "calendar" } }
        : { title: `Pickup ${when} at ${fmtTime(start)}`, body: "Keep a flat space on the car floor for the box. We'll bring it out to you.", cta: { label: "Add to calendar", kind: "calendar" } };
    }
    case "ready":
      if (balance > 0) return { title: "Your order is ready", body: `Pay the ${money(balance)} balance before pickup.`, cta: { label: "Pay balance", kind: "pay" } };
      return order.delivery === "delivery"
        ? { title: "Your order is on its way", body: "The rider will call when they're close.", cta: { label: "Chat on WhatsApp", kind: "whatsapp" } }
        : { title: "Your order is ready for pickup", body: "Come to the bakery at your pickup time.", cta: { label: "Get directions", kind: "directions" } };
    default:
      return null;
  }
}

/** Returns an error message, or null when the payment is valid. */
export function validatePayment(order: Pick<Order, "payments" | "total" | "status">, amount: number): string | null {
  if (order.status === "cancelled") return "This order is cancelled, so it can't take payments.";
  if (!Number.isFinite(amount) || amount <= 0) return "Enter an amount above zero.";
  const balance = balanceDue(order);
  if (amount > balance) return `That's more than the ${money(balance)} balance.`;
  return null;
}
