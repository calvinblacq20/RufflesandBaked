import type { ContactDetails, Customer, Delivery, Order, Payment } from "../data/types";
import { formatGhPhone, normalizeGhPhone } from "./contact";
import { balanceDue, paidTotal } from "./orders";

/* ---------------- Contact details ---------------- */

export type ContactErrors = Partial<Record<keyof ContactDetails, string>>;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
/** GhanaPost GPS: region letters, district digits, then the location code (GA-123-4567 or AK-0039-5028). */
const DIGITAL_ADDRESS_RE = /^[A-Z]{2}-\d{3,4}-\d{4}$/;

export const EMPTY_CONTACT: ContactDetails = { name: "", phone: "", email: "", town: "", address: "", digitalAddress: "" };

export function contactFromCustomer(customer: Customer): ContactDetails {
  return {
    name: customer.name,
    phone: formatGhPhone(customer.phone),
    email: customer.email,
    town: customer.town,
    address: customer.address ?? "",
    digitalAddress: customer.digitalAddress ?? "",
  };
}

/** Field errors for the checkout form. Address fields are only required for deliveries. */
export function validateContact(contact: ContactDetails, delivery: Delivery): ContactErrors {
  const errors: ContactErrors = {};
  const name = contact.name.trim();
  if (name.length < 2 || !/\p{L}/u.test(name)) errors.name = "Enter your full name.";
  if (!normalizeGhPhone(contact.phone)) errors.phone = "Enter a Ghana WhatsApp number, like 024 123 4567.";
  if (!EMAIL_RE.test(contact.email.trim())) errors.email = "Enter an email address, like ama@gmail.com.";
  if (contact.town.trim().length < 2) errors.town = "Enter your town or area.";
  if (delivery === "delivery" && contact.address.trim().length < 3) errors.address = "Add a street or landmark so the rider can find you.";
  const gps = contact.digitalAddress.trim().toUpperCase();
  if (gps && !DIGITAL_ADDRESS_RE.test(gps)) errors.digitalAddress = "Use the GhanaPost format, like GA-123-4567.";
  return errors;
}

export function cleanContact(contact: ContactDetails, delivery: Delivery): ContactDetails {
  return {
    name: contact.name.trim().replace(/\s+/g, " "),
    phone: formatGhPhone(contact.phone),
    email: contact.email.trim().toLowerCase(),
    town: contact.town.trim(),
    address: delivery === "delivery" ? contact.address.trim() : "",
    digitalAddress: delivery === "delivery" ? contact.digitalAddress.trim().toUpperCase() : "",
  };
}

export const samePhone = (a: string, b: string) => {
  const na = normalizeGhPhone(a);
  return na !== null && na === normalizeGhPhone(b);
};

/**
 * Finds the customer by WhatsApp number (or by id when signed in) and updates their details,
 * or creates a new guest record. Keeps account status, points and history.
 */
export function upsertCustomer(
  customers: Customer[],
  contact: ContactDetails,
  opts: { customerId?: string | null; now: Date; newId: () => string },
): { customers: Customer[]; customer: Customer } {
  const existing = customers.find((c) => (opts.customerId ? c.id === opts.customerId : samePhone(c.phone, contact.phone)));
  const details = {
    name: contact.name,
    phone: contact.phone,
    email: contact.email,
    town: contact.town,
    // A pickup order shouldn't wipe a delivery address given before.
    address: contact.address || existing?.address,
    digitalAddress: contact.digitalAddress || existing?.digitalAddress,
  };
  if (existing) {
    const customer = { ...existing, ...details };
    return { customers: customers.map((c) => (c.id === existing.id ? customer : c)), customer };
  }
  const customer: Customer = { id: opts.newId(), ...details, memberSince: opts.now.toISOString(), hasAccount: false, points: 0, source: "app" };
  return { customers: [...customers, customer], customer };
}

/* ---------------- Who can see which order ---------------- */

export interface Access {
  /** Signed-in account on this phone, if any. */
  customerId: string | null;
  /** Orders placed or found on this phone without an account. */
  deviceOrderIds: string[];
}

export function canViewOrder(order: Pick<Order, "id" | "customerId">, access: Access): boolean {
  return (access.customerId !== null && order.customerId === access.customerId) || access.deviceOrderIds.includes(order.id);
}

export function visibleOrders<T extends Pick<Order, "id" | "customerId" | "createdAt">>(orders: T[], access: Access): T[] {
  return orders.filter((o) => canViewOrder(o, access)).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/** Accepts "RBH-1041", "dnf1041" or "1041". */
export function normalizeOrderNumber(input: string): string | null {
  const digits = input.trim().toUpperCase().replace(/^RBH[\s-]*/, "");
  return /^\d{3,6}$/.test(digits) ? `RBH-${digits.padStart(4, "0")}` : null;
}

/** An order matches only when both the order number and the customer's WhatsApp number agree. */
export function findOrder(orders: Order[], customers: Customer[], orderNumber: string, phone: string): Order | null {
  const number = normalizeOrderNumber(orderNumber);
  if (!number || !normalizeGhPhone(phone)) return null;
  const order = orders.find((o) => o.number === number);
  const owner = order && customers.find((c) => c.id === order.customerId);
  return order && owner && samePhone(owner.phone, phone) ? order : null;
}

/* ---------------- Payments ---------------- */

export interface AmountDue {
  amount: number;
  /** "total": nothing paid yet, full payment secures the order. "balance": what's left after a part payment. */
  label: "total" | "balance";
}

/** Full payment secures an order (the bakery's policy), so what's due is always everything unpaid. */
export function amountDue(order: Pick<Order, "status" | "total" | "payments">): AmountDue {
  return { amount: balanceDue(order), label: paidTotal(order) === 0 ? "total" : "balance" };
}

/** full: paid in one go. part: some of it. final: the payment that clears a part-paid order. */
export function paymentKindFor(order: Pick<Order, "total" | "payments">, amount: number): Payment["kind"] {
  if (amount >= balanceDue(order)) return paidTotal(order) === 0 ? "full" : "final";
  return "part";
}

/** Merchant reference sent to Paystack, tying the charge to the order: DNF1042-7K2M9Q. */
export function paystackReference(orderNumber: string, random: string): string {
  return `${orderNumber.replace("-", "")}-${random.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6).padEnd(6, "0")}`;
}

/* ---------------- One-time codes ---------------- */

export const CODE_TTL_MS = 10 * 60_000;
export const CODE_MAX_ATTEMPTS = 5;

export interface PendingCode {
  phone: string;
  code: string;
  expiresAt: number;
  attempts: number;
}

export type CodeCheck = "ok" | "wrong" | "expired" | "locked" | "missing";

/** Checks a typed code. Returns the result and the pending code to keep (null once used up). */
export function checkCode(pending: PendingCode | null, phone: string, input: string, now: number): { result: CodeCheck; pending: PendingCode | null } {
  if (!pending || !samePhone(pending.phone, phone)) return { result: "missing", pending };
  if (now > pending.expiresAt) return { result: "expired", pending: null };
  if (pending.attempts >= CODE_MAX_ATTEMPTS) return { result: "locked", pending: null };
  if (input.trim() === pending.code) return { result: "ok", pending: null };
  const next = { ...pending, attempts: pending.attempts + 1 };
  return { result: next.attempts >= CODE_MAX_ATTEMPTS ? "locked" : "wrong", pending: next.attempts >= CODE_MAX_ATTEMPTS ? null : next };
}

export const CODE_MESSAGE: Record<Exclude<CodeCheck, "ok">, string> = {
  wrong: "That code doesn't match. Check the latest message and try again.",
  expired: "That code has expired. Send a new one.",
  locked: "Too many tries. Send a new code.",
  missing: "Send a code to this number first.",
};
