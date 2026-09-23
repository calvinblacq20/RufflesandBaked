import { beforeEach, describe, expect, it } from "vitest";
import { accessOf, accountOf, actions, getAppData, isMonthDay, type OrderDraft } from "./store";
import { DEMO_ACCOUNT_PHONE } from "./seed";
import { visibleOrders } from "../lib/checkout";
import type { Flavour } from "./types";

const draft = (overrides: Partial<OrderDraft> = {}): OrderDraft => ({
  occasion: "birthday",
  neededBy: "2026-10-10",
  readyBy: "2026-10-10",
  shortNotice: false,
  items: [{ styleId: "classic-cake", qty: 1, flavours: ["red-velvet" as Flavour], size: "8", layers: 3, finish: "cream", design: "classic", message: "Happy 30th Ama", unitPrice: 500 }],
  total: 500,
  designPlan: "ours",
  handoverStart: "2026-10-10T15:00",
  delivery: "pickup",
  contact: { name: "Ama Mensah", phone: "024 851 5773", email: "ama@gmail.com", town: "Kasoa", address: "", digitalAddress: "" },
  remember: true,
  payChoice: "later",
  ...overrides,
});

const pay = (amount: number) => ({ amount, method: "momo" as const, payer: "MTN MoMo · 024 851 5773" });

describe("guest checkout", () => {
  beforeEach(() => actions.resetDemo());

  it("starts signed out with nothing on this phone", () => {
    const data = getAppData();
    expect(accountOf(data)).toBeNull();
    expect(visibleOrders(data.orders, accessOf(data))).toEqual([]);
  });

  it("sends a request without paying and books the pickup slot", () => {
    const result = actions.placeOrder(draft());
    if ("error" in result) throw new Error(result.error);
    const data = getAppData();
    const guest = data.customers.find((c) => c.id === result.order.customerId);
    expect(guest).toMatchObject({ name: "Ama Mensah", hasAccount: false });
    expect(result.order).toMatchObject({ status: "request", payChoice: "later", payments: [] });
    expect(data.device.orderIds).toEqual([result.order.id]);
    expect(data.device.contact?.email).toBe("ama@gmail.com");
    expect(data.appointments[0]).toMatchObject({ orderId: result.order.id, customerId: guest?.id, purpose: "pickup", start: "2026-10-10T15:00", status: "requested" });
  });

  it("books a price-list cake straight away when it's paid in full online", () => {
    const before = getAppData().counters.receipt;
    const result = actions.placeOrder(draft({ payChoice: "now", remember: false, payment: pay(500) }));
    if ("error" in result) throw new Error(result.error);
    expect(result.payment).toMatchObject({ amount: 500, kind: "full", receivedBy: "Paystack (online)" });
    expect(result.payment?.reference).toMatch(/^RBH\d{4}-[A-Z0-9]{6}$/);
    expect(result.payment?.receiptNo).toMatch(new RegExp(`-${String(before + 1).padStart(4, "0")}$`));
    expect(result.order.status).toBe("confirmed");
    expect(getAppData().device.contact).toBeNull();
  });

  it("keeps a paid custom design as a request until the bakery quotes it", () => {
    const custom = draft({ items: [{ ...draft().items[0]!, design: "custom", unitPrice: 650 }], total: 650, designPlan: "photo", payChoice: "now", payment: pay(650) });
    const result = actions.placeOrder(custom);
    if ("error" in result) throw new Error(result.error);
    expect(result.order.status).toBe("request");
    expect(result.order.payments).toHaveLength(1);
  });

  it("books a design session when the client asks for one", () => {
    const result = actions.placeOrder(draft({ designPlan: "consult", consultStart: "2026-10-02T11:00" }));
    if ("error" in result) throw new Error(result.error);
    const sessions = getAppData().appointments.filter((a) => a.orderId === result.order.id).map((a) => a.purpose);
    expect(sessions.sort()).toEqual(["fitting", "pickup"]);
  });

  it("refuses a payment larger than the order", () => {
    const result = actions.placeOrder(draft({ payChoice: "now", payment: { amount: 5000, method: "card", payer: "Card" } }));
    expect(result).toEqual({ error: "That's more than the GH₵ 500 balance." });
    expect(getAppData().device.orderIds).toEqual([]);
  });

  it("keeps one customer record when the same number orders again, with their allergy note", () => {
    actions.placeOrder(draft({ dietary: "No nuts" }));
    actions.placeOrder(draft({ contact: { ...draft().contact, phone: "+233248515773", name: "Ama K. Mensah" } }));
    const matches = getAppData().customers.filter((c) => c.phone.replace(/\D/g, "").endsWith("248515773"));
    expect(matches).toHaveLength(1);
    expect(matches[0]).toMatchObject({ name: "Ama K. Mensah", dietary: "No nuts" });
  });

  it("books the date when a quoted order is paid in full later", () => {
    const placed = actions.placeOrder(draft());
    if ("error" in placed) throw new Error(placed.error);
    // The bakery confirms the quote (owner side).
    const data = getAppData();
    Object.assign(data.orders[0] ?? {}, { status: "quoted" });
    const part = actions.payOrder(placed.order.id, { amount: 200, method: "card", payer: "Card" });
    if ("error" in part) throw new Error(part.error);
    expect(getAppData().orders.find((o) => o.id === placed.order.id)?.status).toBe("quoted");
    const rest = actions.payOrder(placed.order.id, { amount: 300, method: "card", payer: "Card" });
    if ("error" in rest) throw new Error(rest.error);
    expect(rest.payment.kind).toBe("final");
    expect(getAppData().orders.find((o) => o.id === placed.order.id)?.status).toBe("confirmed");
  });
});

describe("optional accounts", () => {
  beforeEach(() => actions.resetDemo());

  it("logs in to the sample account only after the code checks out", () => {
    const code = actions.sendCode(DEMO_ACCOUNT_PHONE);
    expect(actions.checkCode(DEMO_ACCOUNT_PHONE, "000000")).toBe(code === "000000" ? "ok" : "wrong");
    expect(actions.checkCode(DEMO_ACCOUNT_PHONE, code)).toBe("ok");
    expect(actions.logIn(DEMO_ACCOUNT_PHONE)?.name).toBe("Abena Owusu");
    const data = getAppData();
    expect(visibleOrders(data.orders, accessOf(data))).toHaveLength(6);
    actions.logOut();
    expect(accountOf(getAppData())).toBeNull();
  });

  it("turns a guest's record into an account and keeps their orders", () => {
    const placed = actions.placeOrder(draft());
    if ("error" in placed) throw new Error(placed.error);
    const account = actions.createAccount({ name: "Ama Mensah", phone: "0248515773" });
    expect(account).toMatchObject({ id: placed.order.customerId, hasAccount: true });
    expect(accountOf(getAppData())?.id).toBe(placed.order.customerId);
    expect(actions.logIn("020 111 2233")).toBeNull();
  });

  it("finds an order from another phone by number and WhatsApp number", () => {
    const placed = actions.placeOrder(draft());
    if ("error" in placed) throw new Error(placed.error);
    actions.forgetDevice();
    expect(actions.lookUpOrder(placed.order.number, "0201112233")).toBeNull();
    expect(actions.lookUpOrder(placed.order.number, "024 851 5773")?.id).toBe(placed.order.id);
    actions.addOrderToDevice(placed.order.id);
    expect(getAppData().device.orderIds).toEqual([placed.order.id]);
  });
});

describe("dates to remember", () => {
  beforeEach(() => actions.resetDemo());

  it("needs an account", () => {
    expect(actions.addCelebration({ label: "Efua's birthday", date: "03-14", remind: true })).toEqual({ error: "Log in to save dates." });
  });

  it("saves, toggles and removes the signed-in client's dates", () => {
    actions.logIn(DEMO_ACCOUNT_PHONE);
    const added = actions.addCelebration({ label: "  Grandma's   birthday ", date: "02-29", remind: true });
    if ("error" in added) throw new Error(added.error);
    expect(added.celebration).toMatchObject({ label: "Grandma's birthday", date: "02-29", remind: true });
    actions.toggleReminder(added.celebration.id);
    expect(getAppData().celebrations.find((c) => c.id === added.celebration.id)?.remind).toBe(false);
    actions.removeCelebration(added.celebration.id);
    expect(getAppData().celebrations.some((c) => c.id === added.celebration.id)).toBe(false);
  });

  it("rejects impossible dates and empty names", () => {
    actions.logIn(DEMO_ACCOUNT_PHONE);
    expect(isMonthDay("02-30")).toBe(false);
    expect(isMonthDay("13-01")).toBe(false);
    expect(actions.addCelebration({ label: "Birthday", date: "04-31", remind: true })).toEqual({ error: "Pick the day and month." });
    expect(actions.addCelebration({ label: " ", date: "04-30", remind: true })).toHaveProperty("error");
  });

  it("keeps allergy notes on the account", () => {
    actions.logIn(DEMO_ACCOUNT_PHONE);
    expect(actions.saveDietary("Eggless, please")).toEqual({ ok: true });
    expect(accountOf(getAppData())?.dietary).toBe("Eggless, please");
  });
});
