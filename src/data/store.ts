import { useSyncExternalStore } from "react";
import { checkCode, CODE_TTL_MS, findOrder, paymentKindFor, paystackReference, samePhone, upsertCustomer, type Access, type CodeCheck, type PendingCode } from "../lib/checkout";
import { localIso } from "../lib/format";
import { orderNumber, receiptNumber } from "../lib/receipts";
import { normalizeGhPhone } from "../lib/contact";
import { balanceDue, canCancel, isActive, validatePayment } from "../lib/orders";
import { applySettings, cloneSettings, defaultSettings, type StudioSettings } from "./business";
import { applyPriceGrid, applyStyles, cloneGrid, defaultPriceGrid, defaultStyles } from "./catalog";
import { createSeed, type AppData } from "./seed";
import type { Appointment, CakeSize, Celebration, ContactDetails, Customer, Delivery, DesignPlan, LeadSource, Occasion, Order, OrderItem, OrderStatus, PayChoice, Payment, PaymentMethod, PriceGrid, ReviewStatus, Style } from "./types";

const KEY = "dnf-demo-v1";

function load(): AppData {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as AppData;
      if (parsed.version === 1) return withDefaultPhotos(parsed);
    }
  } catch (error) {
    console.warn("Could not read saved demo data, starting fresh.", error);
  }
  return createSeed(new Date());
}

/** Photos aren't editable, so a saved menu picks up photos added to the defaults later. */
function withDefaultPhotos(data: AppData): AppData {
  const photos = new Map(defaultStyles().map((s) => [s.id, s.photo]));
  return { ...data, styles: data.styles.map((s) => (s.photo || !photos.get(s.id) ? s : { ...s, photo: photos.get(s.id) })) };
}

/** Copies the saved menu, price list and bakery details into the objects every screen reads. */
function publish(data: AppData) {
  applyStyles(data.styles);
  applyPriceGrid(data.priceGrid);
  applySettings(data.settings);
}

let state: AppData = load();
publish(state);
const listeners = new Set<() => void>();

function commit(next: AppData) {
  state = next;
  publish(next);
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch (error) {
    console.warn("Could not save demo data.", error);
  }
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useAppData(): AppData {
  return useSyncExternalStore(subscribe, () => state, () => state);
}

export function getAppData(): AppData {
  return state;
}

/* ---------------- Selectors ---------------- */

export const accessOf = (data: AppData): Access => ({ customerId: data.session.customerId, deviceOrderIds: data.device.orderIds });

/** The signed-in account, or null for guests. */
export const accountOf = (data: AppData): Customer | null => data.customers.find((c) => c.id === data.session.customerId && c.hasAccount) ?? null;

export const customerById = (data: AppData, id: string): Customer | undefined => data.customers.find((c) => c.id === id);

const newId = (prefix: string) =>
  `${prefix}-${typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID().slice(0, 8) : Math.random().toString(36).slice(2, 10)}`;

function randomToken(length: number): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = new Uint8Array(length);
  if (typeof crypto !== "undefined" && "getRandomValues" in crypto) crypto.getRandomValues(bytes);
  else bytes.forEach((_, i) => (bytes[i] = Math.floor(Math.random() * 256)));
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
}

/* ---------------- Payments ---------------- */

export interface OnlinePayment {
  amount: number;
  method: "momo" | "card";
  payer: string;
}

/** Builds a verified Paystack payment. In the live app this only happens after the server confirms the charge with Paystack. */
function paymentFor(data: AppData, order: Order, pay: OnlinePayment, now: Date): { payment: Payment; receiptCounter: number } | { error: string } {
  const error = validatePayment(order, pay.amount);
  if (error) return { error };
  const receiptCounter = data.counters.receipt + 1;
  return {
    receiptCounter,
    payment: {
      id: newId("p"),
      amount: pay.amount,
      method: pay.method,
      reference: paystackReference(order.number, randomToken(6)),
      at: now.toISOString(),
      receiptNo: receiptNumber(now.getFullYear(), receiptCounter),
      kind: paymentKindFor(order, pay.amount),
      receivedBy: "Paystack (online)",
      payer: pay.payer,
    },
  };
}

/** Full payment on a quoted order books it in; money on an unconfirmed request just sits on the order. */
function withPayment(order: Order, payment: Payment): Order {
  const next = { ...order, payments: [...order.payments, payment] };
  const books = order.status === "quoted" && balanceDue(next) === 0;
  return books ? { ...next, status: "confirmed", history: [...order.history, { status: "confirmed", at: payment.at }] } : next;
}

/** Price-list cakes and fixed-price treats need no quote, so paying for them online books them straight away. */
function needsQuote(items: Omit<OrderItem, "id">[], styleKind: (styleId: string) => Style["kind"] | undefined, designPlan: DesignPlan): boolean {
  return designPlan === "consult" || items.some((item) => item.design === "custom" || styleKind(item.styleId) === "tiered");
}

/* ---------------- One-time codes (demo: shown as a notification instead of a WhatsApp message) ---------------- */

let pendingCode: PendingCode | null = null;

/* ---------------- Actions ---------------- */

export interface OrderDraft {
  occasion: Occasion;
  neededBy: string;
  readyBy: string;
  shortNotice: boolean;
  items: Omit<OrderItem, "id">[];
  total: number;
  designPlan: DesignPlan;
  designNotes?: string;
  /** Pickup time, or the start of the delivery window. */
  handoverStart?: string;
  /** The fitting or tasting, when the plan is "consult". */
  consultStart?: string;
  delivery: Delivery;
  comments?: string;
  /** Allergies and dietary needs, kept on the customer for next time. */
  dietary?: string;
  contact: ContactDetails;
  remember: boolean;
  payChoice: PayChoice;
  /** Present when the order was paid at checkout. */
  payment?: OnlinePayment;
}

export const actions = {
  /** Creates (or updates) the customer, the order, its pickup or delivery slot and, if paid, the receipt, all in one step. */
  placeOrder(draft: OrderDraft, now = new Date()): { order: Order; payment?: Payment } | { error: string } {
    const { customers: upserted, customer: base } = upsertCustomer(state.customers, draft.contact, { customerId: state.session.customerId, now, newId: () => newId("c") });
    const dietary = draft.dietary?.trim();
    const customer = dietary ? { ...base, dietary } : base;
    const customers = dietary ? upserted.map((c) => (c.id === customer.id ? customer : c)) : upserted;
    const orderId = newId("o");
    const handoverId = draft.handoverStart ? newId("a") : undefined;
    const createdAt = now.toISOString();
    const quote = needsQuote(draft.items, (id) => state.styles.find((s) => s.id === id)?.kind, draft.designPlan);

    let order: Order = {
      id: orderId,
      number: orderNumber(state.counters.order),
      customerId: customer.id,
      createdAt,
      occasion: draft.occasion,
      neededBy: draft.neededBy,
      readyBy: draft.readyBy,
      items: draft.items.map((item) => ({ ...item, id: newId("i") })),
      designPlan: draft.designPlan,
      designNotes: draft.designNotes?.trim() || undefined,
      appointmentId: handoverId,
      delivery: draft.delivery,
      deliveryTown: draft.delivery === "delivery" ? draft.contact.town : undefined,
      comments: draft.comments,
      status: "request",
      history: [{ status: "request", at: createdAt }],
      shortNotice: draft.shortNotice,
      total: draft.total,
      payChoice: draft.payChoice,
      payments: [],
    };

    let receiptCounter = state.counters.receipt;
    let payment: Payment | undefined;
    if (draft.payment) {
      const result = paymentFor(state, order, draft.payment, now);
      if ("error" in result) return { error: result.error };
      payment = result.payment;
      receiptCounter = result.receiptCounter;
      order = { ...order, payments: [payment] };
      // A fixed-price order paid in full is booked at once; custom work waits for the owner's quote.
      if (!quote && balanceDue(order) === 0) order = { ...order, status: "confirmed", history: [...order.history, { status: "quoted", at: createdAt }, { status: "confirmed", at: createdAt }] };
    }

    const newAppointments: Appointment[] = [];
    if (handoverId && draft.handoverStart) {
      newAppointments.push({ id: handoverId, customerId: customer.id, orderId, purpose: draft.delivery === "delivery" ? "delivery" : "pickup", start: draft.handoverStart, minutes: draft.delivery === "delivery" ? 60 : 30, status: "requested" });
    }
    if (draft.designPlan === "consult" && draft.consultStart) {
      newAppointments.push({ id: newId("a"), customerId: customer.id, orderId, purpose: "fitting", start: draft.consultStart, minutes: 45, status: "requested" });
    }

    commit({
      ...state,
      customers,
      orders: [order, ...state.orders],
      appointments: [...newAppointments, ...state.appointments],
      // Guests keep the order on this phone. Account orders live in the account, so logging out hides them.
      device: state.session.customerId
        ? state.device
        : { ...state.device, contact: draft.remember ? draft.contact : null, orderIds: [orderId, ...state.device.orderIds] },
      counters: { order: state.counters.order + 1, receipt: receiptCounter },
    });
    return { order, payment };
  },

  /** Pays what's left on an existing order. */
  payOrder(orderId: string, pay: OnlinePayment, now = new Date()): { payment: Payment } | { error: string } {
    const order = state.orders.find((o) => o.id === orderId);
    if (!order) return { error: "We couldn't find that order." };
    const result = paymentFor(state, order, pay, now);
    if ("error" in result) return result;
    commit({
      ...state,
      orders: state.orders.map((o) => (o.id === orderId ? withPayment(o, result.payment) : o)),
      counters: { ...state.counters, receipt: result.receiptCounter },
    });
    return { payment: result.payment };
  },

  cancelOrder(orderId: string, now = new Date()) {
    const order = state.orders.find((o) => o.id === orderId);
    if (!order || !canCancel(order)) return;
    const nowIso = localIso(now);
    commit({
      ...state,
      orders: state.orders.map((o) => (o.id === orderId ? { ...o, status: "cancelled", history: [...o.history, { status: "cancelled", at: now.toISOString() }] } : o)),
      appointments: state.appointments.map((a) => (a.orderId === orderId && a.start > nowIso && a.status !== "done" ? { ...a, status: "cancelled" } : a)),
    });
  },

  /** Sends a 6-digit code to a WhatsApp number. Returns the code so the demo can show it as a notification. */
  sendCode(phone: string, now = Date.now()): string {
    const code = String(Math.floor(100000 + (crypto.getRandomValues(new Uint32Array(1))[0] ?? 0) % 900000));
    pendingCode = { phone, code, expiresAt: now + CODE_TTL_MS, attempts: 0 };
    return code;
  },

  checkCode(phone: string, input: string, now = Date.now()): CodeCheck {
    const { result, pending } = checkCode(pendingCode, phone, input, now);
    pendingCode = pending;
    return result;
  },

  /** Customer record for a number, if the bakery has one. */
  customerForPhone(phone: string): Customer | undefined {
    return state.customers.find((c) => samePhone(c.phone, phone));
  },

  /** Call after the code checks out. Turns the customer record for this number into an account (or creates one) and signs in. */
  createAccount(details: { name: string; phone: string; email?: string }, now = new Date()): Customer {
    const existing = actions.customerForPhone(details.phone);
    const customer: Customer = existing
      ? { ...existing, name: details.name || existing.name, email: details.email || existing.email, hasAccount: true }
      : { id: newId("c"), name: details.name, phone: details.phone, email: details.email ?? "", town: "", memberSince: now.toISOString(), hasAccount: true, points: 0 };
    commit({
      ...state,
      customers: existing ? state.customers.map((c) => (c.id === customer.id ? customer : c)) : [...state.customers, customer],
      session: { customerId: customer.id },
    });
    return customer;
  },

  /** Call after the code checks out. Returns null when the number has no account. */
  logIn(phone: string): Customer | null {
    const customer = state.customers.find((c) => c.hasAccount && samePhone(c.phone, phone));
    if (!customer) return null;
    commit({ ...state, session: { customerId: customer.id } });
    return customer;
  },

  logOut() {
    commit({ ...state, session: { customerId: null } });
  },

  /** Finds an order by number and WhatsApp number. */
  lookUpOrder(orderNumberInput: string, phone: string): Order | null {
    return findOrder(state.orders, state.customers, orderNumberInput, phone);
  },

  /** Call after the code checks out: keeps the found order on this phone. */
  addOrderToDevice(orderId: string) {
    if (state.device.orderIds.includes(orderId)) return;
    commit({ ...state, device: { ...state.device, orderIds: [orderId, ...state.device.orderIds] } });
  },

  /** Clears the remembered details and the orders listed on this phone. Nothing is deleted from the bakery's records. */
  forgetDevice() {
    commit({ ...state, device: { ...state.device, contact: null, orderIds: [] } });
  },

  toggleSaved(styleId: string) {
    const saved = state.device.savedStyleIds;
    const savedStyleIds = saved.includes(styleId) ? saved.filter((id) => id !== styleId) : [...saved, styleId];
    commit({ ...state, device: { ...state.device, savedStyleIds } });
  },

  /** A date the signed-in client wants remembered. `date` is MM-DD. */
  addCelebration(input: { label: string; date: string; remind: boolean }): { celebration: Celebration } | { error: string } {
    const customerId = state.session.customerId;
    if (!customerId) return { error: "Log in to save dates." };
    const label = input.label.trim().replace(/\s+/g, " ");
    if (label.length < 2) return { error: "Say whose day it is, like \"Ama's birthday\"." };
    if (label.length > 60) return { error: "Keep it under 60 characters." };
    if (!isMonthDay(input.date)) return { error: "Pick the day and month." };
    if (state.celebrations.filter((c) => c.customerId === customerId).length >= 20) return { error: "You can save up to 20 dates." };
    const celebration: Celebration = { id: newId("d"), customerId, label, date: input.date, remind: input.remind };
    commit({ ...state, celebrations: [...state.celebrations, celebration] });
    return { celebration };
  },

  removeCelebration(id: string) {
    const customerId = state.session.customerId;
    if (!state.celebrations.some((c) => c.id === id && c.customerId === customerId)) return;
    commit({ ...state, celebrations: state.celebrations.filter((c) => c.id !== id) });
  },

  toggleReminder(id: string) {
    const customerId = state.session.customerId;
    if (!state.celebrations.some((c) => c.id === id && c.customerId === customerId)) return;
    commit({ ...state, celebrations: state.celebrations.map((c) => (c.id === id ? { ...c, remind: !c.remind } : c)) });
  },

  /** Allergies and dietary notes the signed-in client wants the kitchen to know. */
  saveDietary(text: string): { ok: true } | { error: string } {
    const customerId = state.session.customerId;
    if (!customerId) return { error: "Log in to save this." };
    if (text.length > 300) return { error: "Keep it under 300 characters." };
    commit({ ...state, customers: state.customers.map((c) => (c.id === customerId ? { ...c, dietary: text.trim() || undefined } : c)) });
    return { ok: true };
  },

  resetDemo() {
    pendingCode = null;
    commit(createSeed(new Date()));
  },
};

const DAYS_IN_MONTH = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

export function isMonthDay(value: string): boolean {
  const match = /^(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const month = Number(match[1]);
  const day = Number(match[2]);
  return month >= 1 && month <= 12 && day >= 1 && day <= (DAYS_IN_MONTH[month - 1] ?? 0);
}

/* ---------------- Owner side ---------------- */

export interface StudioPayment {
  amount: number;
  method: PaymentMethod;
  /** MoMo transaction ID or bank reference. Optional for cash. */
  reference?: string;
}

export interface WalkInOrder {
  /** An existing client, or the details of a new one. */
  customerId?: string;
  newClient?: { name: string; phone: string; town: string; source: LeadSource };
  occasion: Occasion;
  neededBy: string;
  readyBy: string;
  shortNotice: boolean;
  items: Omit<OrderItem, "id">[];
  /** The price agreed with the client. */
  total: number;
  designPlan: DesignPlan;
  designNotes?: string;
  delivery: Delivery;
  comments?: string;
  payment?: StudioPayment;
}

type Result<T> = T | { error: string };

const OWNER = "Ruffles and Baked by H";
const findOrderById = (id: string) => state.orders.find((o) => o.id === id);
const updateOrder = (id: string, change: (order: Order) => Order) => state.orders.map((o) => (o.id === id ? change(o) : o));
const withStatus = (order: Order, status: OrderStatus, now: Date): Order => ({ ...order, status, history: [...order.history, { status, at: now.toISOString() }] });

const REFERENCE_FALLBACK: Record<PaymentMethod, string> = { cash: "Cash", momo: "MoMo", bank: "Bank transfer", card: "Card" };

function studioPayment(data: AppData, order: Order, pay: StudioPayment, now: Date): { payment: Payment; receiptCounter: number } | { error: string } {
  const error = validatePayment(order, pay.amount);
  if (error) return { error };
  const receiptCounter = data.counters.receipt + 1;
  return {
    receiptCounter,
    payment: {
      id: newId("p"),
      amount: pay.amount,
      method: pay.method,
      reference: pay.reference?.trim().slice(0, 40) || REFERENCE_FALLBACK[pay.method],
      at: now.toISOString(),
      receiptNo: receiptNumber(now.getFullYear(), receiptCounter),
      kind: paymentKindFor(order, pay.amount),
      receivedBy: OWNER,
    },
  };
}

const SIZE_KEYS: CakeSize[] = ["bento", "6", "8", "10", "4x8", "5x10", "8x12", "10x15"];

/** What the owner does from the admin side. Each returns an error message instead of throwing. */
export const studio = {
  /** Sets the agreed price on a request and marks the quote as sent. */
  sendQuote(orderId: string, total: number, now = new Date()): Result<{ order: Order }> {
    const order = findOrderById(orderId);
    if (!order) return { error: "We couldn't find that order." };
    if (order.status !== "request" && order.status !== "quoted") return { error: "This order already has a price." };
    if (!Number.isFinite(total) || total <= 0) return { error: "Enter a price above zero." };
    const paid = order.total - balanceDue(order);
    if (total < paid) return { error: "The price can't be less than what's already paid." };
    let next = order.status === "quoted" ? { ...order, total } : withStatus({ ...order, total }, "quoted", now);
    // Paid in full already (at checkout): the quote books it in.
    if (balanceDue(next) === 0) next = withStatus(next, "confirmed", now);
    commit({ ...state, orders: updateOrder(orderId, () => next) });
    return { order: next };
  },

  /** Moves an order to another stage. Handing over needs the balance paid unless the owner allows it. */
  moveTo(orderId: string, status: Exclude<OrderStatus, "cancelled">, now = new Date(), opts: { allowOwing?: boolean } = {}): Result<{ order: Order }> {
    const order = findOrderById(orderId);
    if (!order) return { error: "We couldn't find that order." };
    if (!isActive(order)) return { error: "This order is closed." };
    if (order.status === status) return { order };
    if (status === "collected" && balanceDue(order) > 0 && !opts.allowOwing) return { error: "This order still has a balance to pay." };
    const next = withStatus(order, status, now);
    commit({ ...state, orders: updateOrder(orderId, () => next) });
    return { order: next };
  },

  recordPayment(orderId: string, pay: StudioPayment, now = new Date()): Result<{ payment: Payment }> {
    const order = findOrderById(orderId);
    if (!order) return { error: "We couldn't find that order." };
    const result = studioPayment(state, order, pay, now);
    if ("error" in result) return result;
    commit({
      ...state,
      orders: updateOrder(orderId, (o) => withPayment(o, result.payment)),
      counters: { ...state.counters, receipt: result.receiptCounter },
    });
    return { payment: result.payment };
  },

  /** The owner can cancel at any stage; upcoming slots for the order are cancelled too. */
  cancel(orderId: string, now = new Date()): Result<{ order: Order }> {
    const order = findOrderById(orderId);
    if (!order) return { error: "We couldn't find that order." };
    if (!isActive(order)) return { error: "This order is already closed." };
    const next = withStatus(order, "cancelled", now);
    const nowIso = localIso(now);
    commit({
      ...state,
      orders: updateOrder(orderId, () => next),
      appointments: state.appointments.map((a) => (a.orderId === orderId && a.start > nowIso && a.status !== "done" ? { ...a, status: "cancelled" } : a)),
    });
    return { order: next };
  },

  markUpdateSent(orderId: string, now = new Date()) {
    if (!findOrderById(orderId)) return;
    commit({ ...state, orders: updateOrder(orderId, (o) => ({ ...o, lastUpdateAt: now.toISOString() })) });
  },

  markReminderSent(celebrationId: string, now = new Date()) {
    if (!state.celebrations.some((c) => c.id === celebrationId)) return;
    commit({ ...state, celebrations: state.celebrations.map((c) => (c.id === celebrationId ? { ...c, remindedAt: now.toISOString() } : c)) });
  },

  setAppointmentStatus(appointmentId: string, status: Appointment["status"]) {
    if (!state.appointments.some((a) => a.id === appointmentId)) return;
    commit({ ...state, appointments: state.appointments.map((a) => (a.id === appointmentId ? { ...a, status } : a)) });
  },

  setReviewStatus(reviewId: string, status: ReviewStatus) {
    if (!state.reviews.some((r) => r.id === reviewId)) return;
    commit({ ...state, reviews: state.reviews.map((r) => (r.id === reviewId ? { ...r, status } : r)) });
  },

  replyToReview(reviewId: string, reply: string): Result<{ ok: true }> {
    const text = reply.trim();
    if (text.length < 2) return { error: "Write a reply first." };
    if (text.length > 600) return { error: "Keep replies under 600 characters." };
    if (!state.reviews.some((r) => r.id === reviewId)) return { error: "We couldn't find that review." };
    commit({ ...state, reviews: state.reviews.map((r) => (r.id === reviewId ? { ...r, reply: text } : r)) });
    return { ok: true };
  },

  saveNotes(customerId: string, notes: string): Result<{ ok: true }> {
    if (notes.length > 4000) return { error: "Notes are limited to 4,000 characters." };
    if (!state.customers.some((c) => c.id === customerId)) return { error: "We couldn't find that client." };
    commit({ ...state, customers: state.customers.map((c) => (c.id === customerId ? { ...c, notes: notes.trim() } : c)) });
    return { ok: true };
  },

  /** Edits one menu item's name, prices, notice or visibility. */
  saveStyle(styleId: string, patch: Partial<Pick<Style, "name" | "description" | "fromPrice" | "extraFrom" | "readyDays" | "featured" | "active">>): Result<{ style: Style }> {
    const current = state.styles.find((s) => s.id === styleId);
    if (!current) return { error: "We couldn't find that item." };
    const next: Style = { ...current, ...patch };
    next.name = next.name.trim();
    next.description = next.description.trim();
    if (next.name.length < 2) return { error: "Give the item a name." };
    const money = [next.fromPrice, next.extraFrom];
    if (money.some((value) => !Number.isFinite(value) || value < 0 || value > 100_000)) return { error: "Prices must be between GH₵ 0 and GH₵ 100,000." };
    if (next.kind !== "cake" && next.fromPrice <= 0) return { error: "Enter a price above zero." };
    if (!Number.isInteger(next.readyDays) || next.readyDays < 1 || next.readyDays > 60) return { error: "Notice must be between 1 and 60 working days." };
    commit({ ...state, styles: state.styles.map((s) => (s.id === styleId ? next : s)) });
    return { style: next };
  },

  /** Puts the whole menu back to the starting prices. */
  resetStyles() {
    commit({ ...state, styles: defaultStyles() });
  },

  /** Saves the Classic Cake Menu price list. A blank cell means that combination isn't offered. */
  savePriceGrid(grid: PriceGrid): Result<{ grid: PriceGrid }> {
    const next = cloneGrid(grid);
    let offered = 0;
    for (const range of ["classic", "bento", "rect", "kids"] as const) {
      for (const layers of [1, 2, 3, 4] as const) {
        const row = next[range][layers];
        if (!row) continue;
        for (const size of SIZE_KEYS) {
          const price = row[size];
          if (price === undefined) continue;
          if (!Number.isFinite(price) || price <= 0 || price > 100_000) return { error: "Each price must be between GH₵ 1 and GH₵ 100,000, or left blank." };
          row[size] = Math.round(price);
          offered++;
        }
      }
    }
    if (!offered) return { error: "Keep at least one cake on the price list." };
    commit({ ...state, priceGrid: next });
    return { grid: next };
  },

  resetPriceGrid() {
    commit({ ...state, priceGrid: defaultPriceGrid() });
  },

  /** Saves the bakery details, opening hours, policies or money rules. */
  saveSettings(patch: { studio?: Partial<StudioSettings["studio"]>; hours?: StudioSettings["hours"]; policies?: Partial<StudioSettings["policies"]>; rules?: Partial<StudioSettings["rules"]> }): Result<{ settings: StudioSettings }> {
    const next = cloneSettings(state.settings);
    if (patch.studio) Object.assign(next.studio, patch.studio);
    if (patch.policies) Object.assign(next.policies, patch.policies);
    if (patch.rules) Object.assign(next.rules, patch.rules);
    if (patch.hours) next.hours = { ...patch.hours };

    next.studio.name = next.studio.name.trim();
    next.studio.phone = next.studio.phone.trim();
    if (next.studio.name.length < 2) return { error: "The studio needs a name." };
    if (!normalizeGhPhone(next.studio.phone)) return { error: "Enter a Ghana phone number, like 054 155 2128." };
    for (const link of [next.studio.whatsappBusiness, next.studio.instagram, next.studio.facebook]) {
      if (link.trim() && !/^https?:\/\/\S+$/.test(link.trim())) return { error: "Links must start with https://" };
    }
    if (next.studio.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(next.studio.email.trim())) return { error: "Enter an email address, like rufflesbyh@gmail.com." };
    if (next.studio.address.trim().length < 3) return { error: "Enter the bakery address." };
    for (const value of [next.rules.lateFee, next.rules.designFee]) {
      if (!Number.isFinite(value) || value < 0 || value > 10_000) return { error: "Fees must be between GH₵ 0 and GH₵ 10,000." };
    }
    for (let day = 0; day < 7; day++) {
      const span = next.hours[day];
      if (!span) continue;
      const [open, close] = span;
      if (!/^\d{2}:\d{2}$/.test(open) || !/^\d{2}:\d{2}$/.test(close)) return { error: "Opening hours use 24-hour times, like 08:00." };
      if (close <= open) return { error: "Each day has to close after it opens." };
    }
    commit({ ...state, settings: next });
    return { settings: next };
  },

  resetSettings() {
    commit({ ...state, settings: defaultSettings() });
  },

  /** A walk-in or WhatsApp order the owner takes down herself. The price is agreed, so it starts as quoted. */
  createOrder(draft: WalkInOrder, now = new Date()): Result<{ order: Order; payment?: Payment }> {
    let customers = state.customers;
    let customerId = draft.customerId;
    if (customerId) {
      if (!customers.some((c) => c.id === customerId)) return { error: "We couldn't find that client." };
    } else {
      const client = draft.newClient;
      const name = client?.name.trim().replace(/\s+/g, " ") ?? "";
      if (name.length < 2) return { error: "Enter the client's name." };
      if (!client || !normalizeGhPhone(client.phone)) return { error: "Enter a Ghana phone number, like 024 123 4567." };
      const existing = customers.find((c) => samePhone(c.phone, client.phone));
      if (existing) {
        customerId = existing.id;
      } else {
        const created: Customer = { id: newId("c"), name, phone: client.phone.trim(), email: "", town: client.town.trim(), memberSince: now.toISOString(), hasAccount: false, points: 0, source: client.source };
        customers = [...customers, created];
        customerId = created.id;
      }
    }
    const items = draft.items.filter((i) => i.qty > 0);
    if (!items.length) return { error: "Add at least one item." };
    if (!Number.isFinite(draft.total) || draft.total <= 0) return { error: "Enter the agreed price." };
    if (!draft.neededBy) return { error: "Choose the pickup or delivery day." };

    const createdAt = now.toISOString();
    let order: Order = {
      id: newId("o"),
      number: orderNumber(state.counters.order),
      customerId,
      createdAt,
      occasion: draft.occasion,
      neededBy: draft.neededBy,
      readyBy: draft.readyBy,
      items: items.map((item) => ({ ...item, id: newId("i") })),
      designPlan: draft.designPlan,
      designNotes: draft.designNotes?.trim() || undefined,
      delivery: draft.delivery,
      comments: draft.comments?.trim() || undefined,
      status: "quoted",
      history: [
        { status: "request", at: createdAt },
        { status: "quoted", at: createdAt },
      ],
      shortNotice: draft.shortNotice,
      total: draft.total,
      payChoice: "later",
      payments: [],
    };

    let receipt = state.counters.receipt;
    let payment: Payment | undefined;
    if (draft.payment && draft.payment.amount > 0) {
      const result = studioPayment(state, order, draft.payment, now);
      if ("error" in result) return result;
      payment = result.payment;
      receipt = result.receiptCounter;
      order = withPayment(order, payment);
    }

    commit({ ...state, customers, orders: [order, ...state.orders], counters: { order: state.counters.order + 1, receipt } });
    return { order, payment };
  },
};
