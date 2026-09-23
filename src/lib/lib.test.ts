import { describe, expect, it } from "vitest";
import { defaultPriceGrid, defaultStyles } from "../data/catalog";
import type { Order, Style } from "../data/types";
import { formatGhPhone, googleCalendarLink, icsFile, normalizeGhPhone, whatsappLink } from "./contact";
import { dayKey, fmtDay, fmtMonthDay, money, parseLocal, relativeDay } from "./format";
import { itemSummary, orderLine, orderTitle, unitCount } from "./items";
import { badgeFor, balanceDue, canCancel, nextAction, titleFor, validatePayment } from "./orders";
import { defaultChoice, depositOf, estimate, fixChoice, fromPriceOf, gridPrice, isQuoted, layersFor, maxFlavours, sizesFor, unitPrice } from "./pricing";
import { amountInWords, numberToWords, orderNumber, receiptNumber, verifyCode } from "./receipts";
import { addWorkingDays, neededByFit, openStatus, readyWindow, slotsFor, type Hours } from "./schedule";

const HOURS: Hours = { 0: null, 1: ["08:00", "19:00"], 2: ["08:00", "19:00"], 3: ["08:00", "19:00"], 4: ["08:00", "19:00"], 5: ["08:00", "19:00"], 6: ["08:00", "19:00"] };
const RULES = { lateFee: 50, designFee: 150, depositPercent: 50 };
const grid = defaultPriceGrid();
const menu = new Map(defaultStyles().map((s) => [s.id, s]));
const item = (id: string): Style => {
  const style = menu.get(id);
  if (!style) throw new Error(`no menu item ${id}`);
  return style;
};

describe("format", () => {
  it("formats cedis with grouping and optional pesewas", () => {
    expect(money(1500)).toBe("GH₵ 1,500");
    expect(money(12.5)).toBe("GH₵ 12.50");
    expect(money(-40)).toBe("-GH₵ 40");
  });

  it("round-trips local day keys without timezone drift", () => {
    expect(dayKey(parseLocal("2026-09-15"))).toBe("2026-09-15");
    expect(fmtDay(parseLocal("2026-09-15"))).toBe("Tue, 15 Sept 2026");
    expect(fmtMonthDay("03-14")).toBe("14 March");
  });

  it("describes nearby days relatively", () => {
    const now = parseLocal("2026-09-14T21:00");
    expect(relativeDay(parseLocal("2026-09-15"), now)).toBe("Tomorrow");
    expect(relativeDay(parseLocal("2026-09-14"), now)).toBe("Today");
    expect(relativeDay(parseLocal("2026-09-19"), now)).toBe("Sat, 19 Sept");
  });
});

describe("price list", () => {
  it("reads cake prices straight off the studio's menu card", () => {
    expect(gridPrice("classic", 1, "6", grid)).toBe(220);
    expect(gridPrice("classic", 3, "10", grid)).toBe(1200);
    expect(gridPrice("bento", 2, "bento", grid)).toBe(300);
    expect(gridPrice("rect", 2, "10x15", grid)).toBe(1250);
    expect(gridPrice("kids", 4, "6", grid)).toBe(800);
    // The menu prices no single-layer rectangular cake.
    expect(gridPrice("rect", 1, "4x8", grid)).toBeNull();
  });

  it("only offers the sizes and layers its block of the menu prices", () => {
    expect(sizesFor(item("classic-cake"), 2, grid)).toEqual(["6", "8", "10"]);
    expect(sizesFor(item("rect-cake"), 2, grid)).toEqual(["4x8", "5x10", "8x12", "10x15"]);
    expect(layersFor(item("bento-cake"), grid)).toEqual([1, 2]);
    expect(layersFor(item("kids-cake"), grid)).toEqual([2, 3, 4]);
  });

  it("allows one flavour per layer, as the menu card says", () => {
    expect(maxFlavours(item("classic-cake"), 1)).toBe(1);
    expect(maxFlavours(item("classic-cake"), 3)).toBe(3);
    expect(maxFlavours(item("pastry-box"), undefined)).toBe(1);
  });

  it("adds finishes and the design fee to single cakes", () => {
    const cake = item("classic-cake");
    expect(unitPrice(cake, { flavours: ["creamy-vanilla"], layers: 1, size: "6", finish: "cream", design: "classic" }, grid, RULES)).toBe(220);
    expect(unitPrice(cake, { flavours: ["chocolate", "red-velvet"], layers: 2, size: "8", finish: "fondant", design: "custom" }, grid, RULES)).toBe(620 + 150 + 150);
    // Kids' themed cakes are custom by nature, so the design fee always applies.
    expect(unitPrice(item("kids-cake"), { flavours: ["strawberry"], layers: 3, size: "6", finish: "cream", design: "classic" }, grid, RULES)).toBe(600 + 150);
  });

  it("prices tiered cakes per tier, units per piece and bespoke pieces at nothing until quoted", () => {
    const wedding = item("wedding-cake");
    expect(unitPrice(wedding, { flavours: ["creamy-vanilla"], tiers: 2, finish: "fondant", design: "custom" }, grid, RULES)).toBe(1800);
    expect(unitPrice(wedding, { flavours: ["creamy-vanilla"], tiers: 5, finish: "fondant", design: "custom" }, grid, RULES)).toBe(1800 + 3 * 600);
    expect(unitPrice(item("pastry-box"), { flavours: ["creamy-vanilla"], finish: "cream", design: "classic" }, grid, RULES)).toBe(180);
    expect(unitPrice(item("fascinator"), { flavours: [], finish: "cream", design: "custom" }, grid, RULES)).toBe(0);
    expect(isQuoted(item("fascinator"))).toBe(true);
    expect(isQuoted(item("passion-chest"))).toBe(false);
  });

  it("shows the lowest price a client can pay", () => {
    expect(fromPriceOf(item("classic-cake"), grid, RULES)).toBe(220);
    expect(fromPriceOf(item("bento-cake"), grid, RULES)).toBe(150);
    expect(fromPriceOf(item("kids-cake"), grid, RULES)).toBe(400 + 150);
    expect(fromPriceOf(item("passion-chest"), grid, RULES)).toBe(220);
    expect(fromPriceOf(item("hat"), grid, RULES)).toBe(0);
  });

  it("starts from a valid choice and repairs one after the layers change", () => {
    const cake = item("classic-cake");
    expect(defaultChoice(cake, grid)).toMatchObject({ flavours: ["creamy-vanilla"], layers: 1, size: "6", finish: "cream", design: "classic" });
    expect(defaultChoice(item("cake-jars"), grid).qty).toBe(6);
    // Bento cakes come in one size, so a size from another block falls back.
    expect(fixChoice(item("bento-cake"), { qty: 1, flavours: ["creamy-vanilla"], layers: 2, size: "10", finish: "cream", design: "classic" }, grid).size).toBe("bento");
    // Two layers carry at most two flavours.
    expect(fixChoice(cake, { qty: 1, flavours: ["creamy-vanilla", "red-velvet", "chocolate"], layers: 2, size: "8", finish: "cream", design: "classic" }, grid).flavours).toEqual(["creamy-vanilla", "red-velvet"]);
  });

  it("adds the late-order fee once, not per item, and flags lines still to be quoted", () => {
    expect(estimate([{ unitPrice: 300, qty: 2 }, { unitPrice: 120, qty: 1 }], true, RULES)).toEqual({ subtotal: 720, lateFee: 50, total: 770, hasQuoted: false });
    expect(estimate([{ unitPrice: 300, qty: 1 }], false, RULES).lateFee).toBe(0);
    expect(estimate([{ unitPrice: 100, qty: -3 }], true, RULES).total).toBe(0);
    expect(estimate([{ unitPrice: 420, qty: 1 }, { unitPrice: 0, qty: 1 }], false, RULES).hasQuoted).toBe(true);
  });

  it("takes half a quote as the deposit that starts a bespoke piece", () => {
    expect(depositOf(900, RULES)).toBe(450);
    expect(depositOf(385, RULES)).toBe(193);
  });
});

describe("items", () => {
  it("describes an item the way the kitchen and the workroom read it", () => {
    expect(itemSummary({ flavours: ["red-velvet", "creamy-vanilla"], size: "8", layers: 2, finish: "cream", design: "classic" }, item("classic-cake"))).toBe(
      "8 inch · Red velvet & Creamy vanilla · 2 layers · Whipped cream",
    );
    expect(itemSummary({ flavours: ["chocolate"], tiers: 4, finish: "ganache", design: "custom" }, item("wedding-cake"))).toBe("4 tiers · Chocolate · Chocolate ganache · Custom design");
    expect(itemSummary({ flavours: ["strawberry"], finish: "cream", design: "classic" }, item("cupcakes"))).toBe("Box of 6 · Strawberry");
    expect(itemSummary({ flavours: [], finish: "cream", design: "custom", colours: "Wine and gold" }, item("hat"))).toBe("Made to order · Wine and gold");
  });

  it("counts units in words", () => {
    expect(unitCount({ qty: 2 }, item("cupcakes"))).toBe("2 boxes");
    expect(unitCount({ qty: 1 }, item("passion-chest"))).toBe("1 chest");
    expect(unitCount({ qty: 3 }, item("passion-chest"))).toBe("3 chests");
    expect(unitCount({ qty: 2 }, item("scrunchies"))).toBe("2 packs");
    expect(unitCount({ qty: 1 }, item("tiara"))).toBe("1 piece");
    expect(orderTitle({ items: [{ styleId: "cupcakes", qty: 2 }, { styleId: "pastry-box", qty: 1 }] })).toBe("Cupcakes × 2 + 1 more");
  });

  it("knows which half of the studio an order belongs to", () => {
    expect(orderLine({ items: [{ styleId: "classic-cake" }, { styleId: "cupcakes" }] })).toBe("cakes");
    expect(orderLine({ items: [{ styleId: "tiara" }, { styleId: "brooch" }] })).toBe("ruffles");
    expect(orderLine({ items: [{ styleId: "classic-cake" }, { styleId: "tiara" }] })).toBeNull();
    expect(orderLine({ items: [{ styleId: "passion-chest" }] })).toBeNull();
  });
});

describe("schedule", () => {
  it("reports open and next opening times", () => {
    expect(openStatus(parseLocal("2026-09-15T10:00"), HOURS)).toEqual({ open: true, label: "Open · closes at 19:00" });
    expect(openStatus(parseLocal("2026-09-15T19:30"), HOURS).label).toBe("Closed · opens tomorrow at 08:00");
    expect(openStatus(parseLocal("2026-09-19T19:30"), HOURS).label).toBe("Closed · opens on Monday at 08:00");
  });

  it("returns no pickup slots on Sunday and blocks past slots", () => {
    expect(slotsFor(parseLocal("2026-09-20"), HOURS, [], parseLocal("2026-09-14T09:00"), 60, 60)).toEqual([]);
    const slots = slotsFor(parseLocal("2026-09-15"), HOURS, [], parseLocal("2026-09-15T09:10"), 60, 60);
    expect(slots[0]).toMatchObject({ time: "08:00", available: false });
    expect(slots.find((s) => s.time === "11:00")?.available).toBe(true);
    expect(slots[slots.length - 1]?.time).toBe("18:00");
  });

  it("skips Sundays when counting working days", () => {
    expect(dayKey(addWorkingDays(parseLocal("2026-09-18"), 2, HOURS))).toBe("2026-09-21");
  });

  it("treats less than the notice as a late order, and tomorrow as the earliest", () => {
    const window = readyWindow(parseLocal("2026-09-14"), 3, HOURS);
    expect(dayKey(window.normal)).toBe("2026-09-17");
    expect(neededByFit(parseLocal("2026-09-17"), window)).toBe("ok");
    expect(neededByFit(parseLocal("2026-09-15"), window)).toBe("late");
    expect(neededByFit(parseLocal("2026-09-14"), window)).toBe("too-soon");
  });
});

const baseOrder: Order = {
  id: "o1", number: "RBH-1041", customerId: "c1", createdAt: "2026-09-01T10:00:00.000Z", occasion: "birthday",
  neededBy: "2026-09-26", readyBy: "2026-09-26", items: [], designPlan: "ours", delivery: "pickup",
  status: "quoted", history: [{ status: "request", at: "2026-09-01T10:00:00.000Z" }], shortNotice: false, total: 650, payChoice: "later", payments: [],
};

describe("orders", () => {
  const now = parseLocal("2026-09-14T09:00");

  it("computes the balance from payments", () => {
    const order = { ...baseOrder, payments: [{ id: "p", amount: 400, method: "momo" as const, reference: "x", at: "", receiptNo: "", kind: "part" as const, receivedBy: "" }] };
    expect(balanceDue(order)).toBe(250);
  });

  it("allows cancelling only before the studio starts", () => {
    expect(canCancel({ status: "confirmed" })).toBe(true);
    expect(canCancel({ status: "making" })).toBe(false);
  });

  it("asks for full payment on quoted orders", () => {
    expect(badgeFor(baseOrder, now)).toEqual({ label: "Action required", tone: "sand" });
    expect(nextAction(baseOrder, now)?.title).toBe("Pay GH₵ 650 to book your date");
  });

  it("flags an order still in the kitchen after its day", () => {
    expect(badgeFor({ ...baseOrder, status: "finishing", readyBy: "2026-09-10" }, now).label).toBe("Running late");
    expect(badgeFor({ ...baseOrder, status: "ready", delivery: "delivery" }, now).label).toBe("Ready · balance due");
  });

  it("titles orders by pickup or delivery day", () => {
    expect(titleFor({ ...baseOrder, status: "making", neededBy: "2026-09-15" }, now)).toBe("Pickup tomorrow");
    expect(titleFor({ ...baseOrder, delivery: "delivery" }, now)).toBe("Delivery on Sat, 26 Sept");
  });

  it("reminds about the booked pickup time", () => {
    expect(nextAction({ ...baseOrder, status: "confirmed" }, now, "2026-09-15T15:00")?.title).toBe("Pickup tomorrow at 15:00");
  });

  it("rejects zero, overpaid and cancelled payments", () => {
    expect(validatePayment(baseOrder, 0)).toBe("Enter an amount above zero.");
    expect(validatePayment(baseOrder, 2000)).toBe("That's more than the GH₵ 650 balance.");
    expect(validatePayment({ ...baseOrder, status: "cancelled" }, 10)).toMatch(/cancelled/);
    expect(validatePayment(baseOrder, 650)).toBeNull();
  });
});

describe("receipts", () => {
  it("numbers receipts and orders", () => {
    expect(receiptNumber(2026, 42)).toBe("RBHR-2026-0042");
    expect(orderNumber(1041)).toBe("RBH-1041");
  });

  it("writes amounts in words, British style", () => {
    expect(numberToWords(0)).toBe("zero");
    expect(numberToWords(105)).toBe("one hundred and five");
    expect(numberToWords(2015)).toBe("two thousand and fifteen");
    expect(numberToWords(1_250_300)).toBe("one million two hundred and fifty thousand three hundred");
    expect(amountInWords(750)).toBe("Seven hundred and fifty Ghana cedis only");
    expect(amountInWords(1)).toBe("One Ghana cedi only");
    expect(amountInWords(12.5)).toBe("Twelve Ghana cedis and fifty pesewas only");
  });

  it("produces a stable verification code that changes with the amount", () => {
    expect(verifyCode("RBHR-2026-0042", 750)).toBe(verifyCode("RBHR-2026-0042", 750));
    expect(verifyCode("RBHR-2026-0042", 750)).not.toBe(verifyCode("RBHR-2026-0042", 751));
    expect(verifyCode("RBHR-2026-0042", 750)).toMatch(/^[0-9A-F]{6}$/);
  });
});

describe("contact", () => {
  it("normalises Ghanaian phone numbers", () => {
    expect(normalizeGhPhone("054 155 2128")).toBe("233541552128");
    expect(normalizeGhPhone("+233 54 155 2128")).toBe("233541552128");
    expect(normalizeGhPhone("541552128")).toBe("233541552128");
    expect(normalizeGhPhone("12345")).toBeNull();
    expect(formatGhPhone("233541552128")).toBe("054 155 2128");
  });

  it("builds WhatsApp and calendar links", () => {
    expect(whatsappLink("0541552128", "Hi there")).toBe("https://wa.me/233541552128?text=Hi%20there");
    const event = { title: "Pickup", start: parseLocal("2026-09-17T15:00"), minutes: 30, location: "Kasoa", details: "RBH-1041" };
    expect(googleCalendarLink(event)).toContain("dates=20260917T150000%2F20260917T153000");
    const ics = icsFile(event, "rbh-1", parseLocal("2026-09-14T09:00"));
    expect(ics).toContain("DTSTART;TZID=Africa/Accra:20260917T150000");
    expect(ics.split("\r\n")[0]).toBe("BEGIN:VCALENDAR");
  });
});
