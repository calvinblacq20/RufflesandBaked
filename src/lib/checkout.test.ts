import { describe, expect, it } from "vitest";
import type { ContactDetails, Customer, Order } from "../data/types";
import {
  amountDue,
  canViewOrder,
  checkCode,
  cleanContact,
  CODE_MAX_ATTEMPTS,
  findOrder,
  normalizeOrderNumber,
  paymentKindFor,
  paystackReference,
  upsertCustomer,
  validateContact,
  visibleOrders,
} from "./checkout";
import { badgeFor, nextAction } from "./orders";

const contact: ContactDetails = { name: "Ama Mensah", phone: "024 851 5773", email: "ama@gmail.com", town: "Adenta", address: "", digitalAddress: "" };

const customer: Customer = {
  id: "c1", name: "Ama M.", phone: "0248515773", email: "old@gmail.com", town: "Madina", address: "Near the Shell station",
  digitalAddress: "GD-123-4567", memberSince: "2026-01-01T00:00:00.000Z", hasAccount: true, points: 120,
};

const order: Order = {
  id: "o1", number: "RBH-1041", customerId: "c1", createdAt: "2026-09-01T10:00:00.000Z", occasion: "birthday",
  neededBy: "2026-09-26", readyBy: "2026-09-26", items: [], designPlan: "ours", delivery: "pickup",
  status: "request", history: [{ status: "request", at: "2026-09-01T10:00:00.000Z" }], shortNotice: false, total: 600, payChoice: "later", payments: [],
};

const paid = (amount: number) => ({ id: `p${amount}`, amount, method: "momo" as const, reference: "r", at: "", receiptNo: "", kind: "part" as const, receivedBy: "" });

describe("checkout details", () => {
  it("accepts a complete pickup form without an address", () => {
    expect(validateContact(contact, "pickup")).toEqual({});
  });

  it("explains each missing or malformed field", () => {
    const errors = validateContact({ name: "A", phone: "12345", email: "ama@", town: "", address: "", digitalAddress: "GA1234567" }, "delivery");
    expect(Object.keys(errors).sort()).toEqual(["address", "digitalAddress", "email", "name", "phone", "town"]);
    expect(errors.digitalAddress).toBe("Use the GhanaPost format, like GA-123-4567.");
  });

  it("requires a street or landmark only for delivery and accepts both GhanaPost formats", () => {
    expect(validateContact({ ...contact, address: "Adenta Housing Down", digitalAddress: "gd-0039-5028" }, "delivery")).toEqual({});
    expect(validateContact(contact, "delivery").address).toBeDefined();
  });

  it("tidies input and drops address fields for pickups", () => {
    expect(cleanContact({ ...contact, name: "  Ama   Mensah ", phone: "+233248515773", email: " AMA@Gmail.com", address: "Junction", digitalAddress: "gd-123-4567" }, "pickup")).toEqual({
      ...contact,
      address: "",
      digitalAddress: "",
    });
  });
});

describe("customer records", () => {
  const opts = { now: new Date("2026-09-15T10:00:00Z"), newId: () => "c-new" };

  it("matches a returning guest by WhatsApp number in any format and keeps account, points and address", () => {
    const { customers, customer: updated } = upsertCustomer([customer], { ...contact, phone: "+233 24 851 5773" }, opts);
    expect(customers).toHaveLength(1);
    expect(updated).toMatchObject({ id: "c1", name: "Ama Mensah", email: "ama@gmail.com", town: "Adenta", hasAccount: true, points: 120, address: "Near the Shell station" });
  });

  it("creates a guest record for a new number", () => {
    const { customers, customer: created } = upsertCustomer([customer], { ...contact, phone: "020 111 2233" }, opts);
    expect(customers).toHaveLength(2);
    expect(created).toMatchObject({ id: "c-new", hasAccount: false, points: 0, memberSince: "2026-09-15T10:00:00.000Z" });
  });

  it("updates the signed-in account by id even if the typed number differs", () => {
    const { customer: updated } = upsertCustomer([customer], { ...contact, phone: "020 111 2233" }, { ...opts, customerId: "c1" });
    expect(updated.id).toBe("c1");
  });
});

describe("order access", () => {
  const other = { ...order, id: "o2", customerId: "c2", createdAt: "2026-09-10T10:00:00.000Z" };

  it("shows guests only the orders on this phone, and accounts their own orders too", () => {
    expect(canViewOrder(order, { customerId: null, deviceOrderIds: [] })).toBe(false);
    expect(canViewOrder(order, { customerId: null, deviceOrderIds: ["o1"] })).toBe(true);
    expect(canViewOrder(order, { customerId: "c1", deviceOrderIds: [] })).toBe(true);
    expect(visibleOrders([order, other], { customerId: "c1", deviceOrderIds: ["o2"] }).map((o) => o.id)).toEqual(["o2", "o1"]);
  });

  it("finds an order only when the number and WhatsApp number both match", () => {
    expect(normalizeOrderNumber("rbh1041")).toBe("RBH-1041");
    expect(normalizeOrderNumber("998")).toBe("RBH-0998");
    expect(normalizeOrderNumber("hello")).toBeNull();
    expect(findOrder([order], [customer], "1041", "+233248515773")?.id).toBe("o1");
    expect(findOrder([order], [customer], "1041", "0201112233")).toBeNull();
    expect(findOrder([order], [customer], "1042", "0248515773")).toBeNull();
  });
});

describe("payments", () => {
  it("asks for everything unpaid: full payment secures the order", () => {
    expect(amountDue(order)).toEqual({ amount: 600, label: "total" });
    expect(amountDue({ ...order, status: "ready", payments: [paid(400)] })).toEqual({ amount: 200, label: "balance" });
  });

  it("labels payments as full, part or final", () => {
    expect(paymentKindFor(order, 600)).toBe("full");
    expect(paymentKindFor(order, 300)).toBe("part");
    expect(paymentKindFor({ ...order, payments: [paid(400)] }, 200)).toBe("final");
  });

  it("builds a Paystack reference from the order number", () => {
    expect(paystackReference("RBH-1042", "7k2m9q")).toBe("RBH1042-7K2M9Q");
  });

  it("marks a paid request as paid while the design is confirmed", () => {
    const now = new Date("2026-09-15T10:00:00Z");
    expect(badgeFor({ ...order, payments: [paid(600)] }, now)).toEqual({ label: "Paid", tone: "gold" });
    expect(nextAction({ ...order, payments: [paid(600)] }, now)?.title).toBe("Payment received");
  });
});

describe("one-time codes", () => {
  const pending = { phone: "0248515773", code: "482913", expiresAt: 1_000, attempts: 0 };

  it("accepts the right code once", () => {
    expect(checkCode(pending, "+233 24 851 5773", "482913", 500)).toEqual({ result: "ok", pending: null });
  });

  it("rejects wrong, expired, other-number and missing codes", () => {
    expect(checkCode(pending, "0248515773", "000000", 500).result).toBe("wrong");
    expect(checkCode(pending, "0248515773", "482913", 1_001).result).toBe("expired");
    expect(checkCode(pending, "0201112233", "482913", 500).result).toBe("missing");
    expect(checkCode(null, "0248515773", "482913", 500).result).toBe("missing");
  });

  it("locks after too many wrong tries", () => {
    let current: typeof pending | null = pending;
    let result = "";
    for (let i = 0; i < CODE_MAX_ATTEMPTS; i++) ({ result, pending: current } = checkCode(current, "0248515773", "111111", 500));
    expect(result).toBe("locked");
    expect(current).toBeNull();
  });
});
