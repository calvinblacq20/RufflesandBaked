import { beforeEach, describe, expect, it } from "vitest";
import { balanceDue } from "../lib/orders";
import { gridPrice } from "../lib/pricing";
import { HOURS, POLICIES, RULES, STUDIO } from "./business";
import { PRICE_GRID, STYLES, styleById } from "./catalog";
import { createSeed } from "./seed";
import { actions, getAppData, studio, type WalkInOrder } from "./store";
import type { Flavour } from "./types";

const now = new Date(2026, 8, 15, 11, 0);
const orderIn = (status: string) => {
  const order = getAppData().orders.find((o) => o.status === status);
  if (!order) throw new Error(`No ${status} order in the sample data`);
  return order;
};
const fresh = (id: string) => getAppData().orders.find((o) => o.id === id)!;
const cake = { styleId: "classic-cake", qty: 1, flavours: ["creamy-vanilla" as Flavour], size: "6" as const, layers: 1 as const, finish: "cream" as const, design: "classic" as const, unitPrice: 230 };

describe("sample studio book", () => {
  beforeEach(() => actions.resetDemo());

  it("numbers orders and receipts once each, in order", () => {
    const data = getAppData();
    const numbers = data.orders.map((o) => o.number);
    expect(new Set(numbers).size).toBe(numbers.length);
    expect(numbers.every((n) => /^RBH-\d{4}$/.test(n))).toBe(true);
    const receipts = data.orders.flatMap((o) => o.payments.map((p) => p.receiptNo));
    expect(new Set(receipts).size).toBe(receipts.length);
    expect(data.counters.receipt).toBe(receipts.length);
    expect(data.orders.every((o) => o.payments.every((p) => p.amount > 0) && balanceDue(o) >= 0)).toBe(true);
    expect(data.appointments.filter((a) => a.orderId).every((a) => data.orders.some((o) => o.id === a.orderId))).toBe(true);
  });

  it("prices every sample cake from the price list, with no more flavours than layers", () => {
    for (const order of getAppData().orders) {
      for (const item of order.items) {
        const style = styleById(item.styleId);
        if (style?.kind !== "cake" || !item.layers || !item.size) continue;
        expect(gridPrice(style.range ?? "classic", item.layers, item.size)).not.toBeNull();
        expect(item.flavours.length).toBeGreaterThan(0);
        expect(item.flavours.length).toBeLessThanOrEqual(item.layers);
      }
    }
  });

  it("has a live pipeline for the owner's Today screen", () => {
    // Seeded at a fixed late morning on a working day, so the answer doesn't depend on when the tests run.
    const statuses = new Set(createSeed(new Date(2026, 8, 15, 11, 30)).orders.map((o) => o.status));
    const missing = ["request", "quoted", "confirmed", "making", "finishing", "ready", "collected", "cancelled"].filter((s) => !statuses.has(s as never));
    expect(missing).toEqual([]);
    expect(getAppData().reviews.some((r) => r.status === "pending")).toBe(true);
    expect(getAppData().celebrations.some((c) => c.remind)).toBe(true);
  });
});

describe("owner actions", () => {
  beforeEach(() => actions.resetDemo());

  it("sends a quote, then full payment books the date and issues the next receipt", () => {
    const request = getAppData().orders.find((o) => o.status === "request" && o.payments.length === 0)!;
    expect(studio.sendQuote(request.id, 0, now)).toEqual({ error: "Enter a price above zero." });
    const quoted = studio.sendQuote(request.id, 1200, now);
    if ("error" in quoted) throw new Error(quoted.error);
    expect(fresh(request.id)).toMatchObject({ status: "quoted", total: 1200 });

    const before = getAppData().counters.receipt;
    const part = studio.recordPayment(request.id, { amount: 600, method: "cash" }, now);
    if ("error" in part) throw new Error(part.error);
    expect(part.payment).toMatchObject({ reference: "Cash", kind: "part", receivedBy: "Ruffles and Baked by H" });
    expect(part.payment.receiptNo).toMatch(new RegExp(`-${String(before + 1).padStart(4, "0")}$`));
    expect(fresh(request.id).status).toBe("quoted");
    const rest = studio.recordPayment(request.id, { amount: 600, method: "momo", reference: "MTN 998877" }, now);
    if ("error" in rest) throw new Error(rest.error);
    expect(fresh(request.id).status).toBe("confirmed");
    expect(studio.sendQuote(request.id, 900, now)).toEqual({ error: "This order already has a price." });
  });

  it("books a request that was already paid in full at checkout as soon as it's quoted", () => {
    const placed = actions.placeOrder({
      occasion: "kids", neededBy: "2026-10-10", readyBy: "2026-10-10", shortNotice: false,
      items: [{ ...cake, styleId: "character-cake", design: "custom", unitPrice: 380 }], total: 380, designPlan: "photo", delivery: "pickup",
      contact: { name: "Ama Mensah", phone: "020 111 2233", email: "ama@gmail.com", town: "Kasoa", address: "", digitalAddress: "" }, remember: false, payChoice: "now",
      payment: { amount: 380, method: "momo", payer: "MTN MoMo · 020 111 2233" },
    });
    if ("error" in placed) throw new Error(placed.error);
    expect(placed.order.status).toBe("request");
    const quoted = studio.sendQuote(placed.order.id, 380, now);
    if ("error" in quoted) throw new Error(quoted.error);
    expect(fresh(placed.order.id).status).toBe("confirmed");
  });

  it("refuses overpayments and payments on cancelled orders", () => {
    const ready = orderIn("ready");
    expect(studio.recordPayment(ready.id, { amount: balanceDue(ready) + 1, method: "momo" }, now)).toHaveProperty("error");
    const quoted = orderIn("quoted");
    studio.cancel(quoted.id, now);
    expect(studio.recordPayment(quoted.id, { amount: 10, method: "momo" }, now)).toEqual({ error: "This order is cancelled, so it can't take payments." });
    expect(studio.cancel(quoted.id, now)).toEqual({ error: "This order is already closed." });
  });

  it("won't hand over an order while it owes, unless the owner allows it", () => {
    const quoted = orderIn("quoted");
    expect(studio.moveTo(quoted.id, "collected", now)).toEqual({ error: "This order still has a balance to pay." });
    const moved = studio.moveTo(quoted.id, "collected", now, { allowOwing: true });
    if ("error" in moved) throw new Error(moved.error);
    expect(fresh(quoted.id).history.at(-1)).toMatchObject({ status: "collected" });
    expect(studio.moveTo(quoted.id, "making", now)).toEqual({ error: "This order is closed." });
  });

  it("releases the pickup slot when an order is cancelled", () => {
    const data = getAppData();
    const slot = data.appointments.find((a) => a.orderId && a.purpose === "pickup" && a.start > "2026-09-15T12:00" && a.status !== "cancelled" && data.orders.find((o) => o.id === a.orderId)?.status !== "collected");
    if (!slot?.orderId) throw new Error("No upcoming pickup in the sample data");
    studio.cancel(slot.orderId, now);
    expect(getAppData().appointments.find((a) => a.id === slot.id)?.status).toBe("cancelled");
  });

  it("moderates reviews, saves notes and records sent reminders", () => {
    const pending = getAppData().reviews.find((r) => r.status === "pending")!;
    studio.setReviewStatus(pending.id, "published");
    expect(studio.replyToReview(pending.id, " ")).toEqual({ error: "Write a reply first." });
    studio.replyToReview(pending.id, "Thank you, Adwoa!");
    expect(getAppData().reviews.find((r) => r.id === pending.id)).toMatchObject({ status: "published", reply: "Thank you, Adwoa!" });

    const client = getAppData().customers[1]!;
    expect(studio.saveNotes(client.id, "x".repeat(4001))).toHaveProperty("error");
    studio.saveNotes(client.id, "  Loves strawberry. Twins born in March.  ");
    expect(getAppData().customers[1]?.notes).toBe("Loves strawberry. Twins born in March.");

    const date = getAppData().celebrations.find((c) => !c.remindedAt)!;
    studio.markReminderSent(date.id, now);
    expect(getAppData().celebrations.find((c) => c.id === date.id)?.remindedAt).toBe(now.toISOString());
  });

  it("takes a WhatsApp order for a new client, paid in full", () => {
    const draft: WalkInOrder = {
      newClient: { name: "  Ama   Owusu ", phone: "020 111 2233", town: "Kasoa", source: "whatsapp" },
      occasion: "birthday",
      neededBy: "2026-10-01",
      readyBy: "2026-10-01",
      shortNotice: false,
      items: [cake],
      total: 230,
      designPlan: "ours",
      delivery: "pickup",
      payment: { amount: 230, method: "momo", reference: "MTN 1234" },
    };
    const orderCounter = getAppData().counters.order;
    const result = studio.createOrder(draft, now);
    if ("error" in result) throw new Error(result.error);
    expect(result.order).toMatchObject({ status: "confirmed", number: `RBH-${orderCounter}` });
    expect(result.payment).toMatchObject({ amount: 230, reference: "MTN 1234", kind: "full" });
    const client = getAppData().customers.find((c) => c.id === result.order.customerId);
    expect(client).toMatchObject({ name: "Ama Owusu", source: "whatsapp" });

    // The same number again joins the existing record.
    const again = studio.createOrder({ ...draft, newClient: { ...draft.newClient!, phone: "+233201112233" }, payment: undefined }, now);
    if ("error" in again) throw new Error(again.error);
    expect(again.order.customerId).toBe(result.order.customerId);
    expect(again.order.status).toBe("quoted");
  });

  it("edits an item's price and hides it from clients without touching past orders", () => {
    const before = getAppData().styles.find((s) => s.id === "pastry-box")!;
    const sold = getAppData().orders.find((o) => o.items.some((i) => i.styleId === "pastry-box"));
    const soldPrice = sold?.items.find((i) => i.styleId === "pastry-box")?.unitPrice;

    const saved = studio.saveStyle("pastry-box", { fromPrice: 210, readyDays: 3 });
    if ("error" in saved) throw new Error(saved.error);
    expect(styleById("pastry-box")).toMatchObject({ fromPrice: 210, readyDays: 3 });
    expect(STYLES.some((s) => s.id === "pastry-box")).toBe(true);

    studio.saveStyle("pastry-box", { active: false });
    expect(STYLES.some((s) => s.id === "pastry-box")).toBe(false);
    // Hidden items still resolve, so old orders keep their name and the menu can bring them back.
    expect(styleById("pastry-box")?.name).toBe(before.name);
    expect(sold?.items.find((i) => i.styleId === "pastry-box")?.unitPrice).toBe(soldPrice);

    studio.resetStyles();
    expect(getAppData().styles.find((s) => s.id === "pastry-box")).toMatchObject({ fromPrice: 180, readyDays: before.readyDays });
    expect(STYLES.some((s) => s.id === "pastry-box")).toBe(true);
  });

  it("checks an item before saving it", () => {
    expect(studio.saveStyle("pastry-box", { name: " " })).toEqual({ error: "Give the item a name." });
    expect(studio.saveStyle("pastry-box", { fromPrice: -20 })).toHaveProperty("error");
    expect(studio.saveStyle("pastry-box", { fromPrice: 0 })).toEqual({ error: "Enter a price above zero." });
    expect(studio.saveStyle("pastry-box", { readyDays: 0 })).toHaveProperty("error");
    expect(studio.saveStyle("nope", { fromPrice: 10 })).toEqual({ error: "We couldn't find that item." });
  });

  it("edits the Classic Cake Menu for both sides, and resets it", () => {
    const grid = structuredClone(getAppData().priceGrid);
    grid.classic[1]!["6"] = 200;
    delete grid.rect[2]!["10x15"];
    const saved = studio.savePriceGrid(grid);
    if ("error" in saved) throw new Error(saved.error);
    expect(PRICE_GRID.classic[1]!["6"]).toBe(200);
    expect(PRICE_GRID.rect[2]!["10x15"]).toBeUndefined();
    expect(studio.savePriceGrid({ ...grid, classic: { ...grid.classic, 1: { "6": -5 } } })).toHaveProperty("error");
    studio.resetPriceGrid();
    expect(PRICE_GRID.classic[1]!["6"]).toBe(220);
    expect(PRICE_GRID.rect[2]!["10x15"]).toBe(1250);
  });

  it("saves studio details, hours, fees and policies for both sides", () => {
    const saved = studio.saveSettings({ studio: { phone: "020 999 8877", area: "Ofaakor, Kasoa" }, policies: { payment: "Pay in full to book." }, rules: { lateFee: 80 } });
    if ("error" in saved) throw new Error(saved.error);
    expect(STUDIO.phone).toBe("020 999 8877");
    expect(POLICIES.payment).toBe("Pay in full to book.");
    expect(RULES).toEqual({ lateFee: 80, designFee: 150, depositPercent: 50 });
    expect(getAppData().settings.studio.area).toBe("Ofaakor, Kasoa");

    studio.saveSettings({ hours: { ...getAppData().settings.hours, 0: ["09:00", "13:00"], 1: null } });
    expect(HOURS[0]).toEqual(["09:00", "13:00"]);
    expect(HOURS[1]).toBeNull();

    studio.resetSettings();
    expect(STUDIO.phone).toBe("020 584 0753");
    expect(RULES.lateFee).toBe(50);
    expect(HOURS[0]).toBeNull();
  });

  it("checks studio details before saving them", () => {
    const current = getAppData().settings.studio;
    expect(studio.saveSettings({ studio: { ...current, phone: "12" } })).toEqual({ error: "Enter a Ghana phone number, like 054 155 2128." });
    expect(studio.saveSettings({ studio: { ...current, name: " " } })).toEqual({ error: "The studio needs a name." });
    expect(studio.saveSettings({ studio: { ...current, instagram: "not-a-link" } })).toEqual({ error: "Links must start with https://" });
    expect(studio.saveSettings({ studio: { ...current, email: "cakes@" } })).toHaveProperty("error");
    expect(studio.saveSettings({ rules: { lateFee: -1 } })).toEqual({ error: "Fees must be between GH₵ 0 and GH₵ 10,000." });
    expect(studio.saveSettings({ hours: { ...getAppData().settings.hours, 2: ["18:00", "08:00"] } })).toEqual({ error: "Each day has to close after it opens." });
    expect(STUDIO.phone).toBe("020 584 0753");
  });

  it("checks a walk-in order before saving it", () => {
    const base: WalkInOrder = { newClient: { name: "Ama", phone: "12", town: "", source: "walkin" }, occasion: "birthday", neededBy: "2026-10-01", readyBy: "2026-10-01", shortNotice: false, items: [], total: 0, designPlan: "ours", delivery: "pickup" };
    const count = getAppData().orders.length;
    expect(studio.createOrder(base, now)).toEqual({ error: "Enter a Ghana phone number, like 024 123 4567." });
    expect(studio.createOrder({ ...base, newClient: { ...base.newClient!, phone: "020 111 2233" } }, now)).toEqual({ error: "Add at least one item." });
    expect(studio.createOrder({ ...base, customerId: "c-missing" }, now)).toEqual({ error: "We couldn't find that client." });
    expect(getAppData().orders).toHaveLength(count);
  });
});
