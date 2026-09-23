import { HOURS } from "../data/business";
import { OCCASIONS, styleById } from "../data/catalog";
import type { Customer, LeadSource, Occasion, Order, OrderStatus, PaymentMethod } from "../data/types";
import { addDays, dayKey, fmtDayShort, monthShort, startOfDay } from "./format";
import { isOpenDay } from "./schedule";
import { IN_PRODUCTION, METHOD_LABEL, SOURCE_LABEL, isInProduction, isLate } from "./studio";

/* Numbers for the owner's dashboard and reports. Every function is pure: data in, numbers out. */

export type PeriodId = "7d" | "30d" | "90d" | "year";

export const PERIODS: { id: PeriodId; label: string; short: string }[] = [
  { id: "7d", label: "Last 7 days", short: "7 days" },
  { id: "30d", label: "Last 30 days", short: "30 days" },
  { id: "90d", label: "Last 90 days", short: "90 days" },
  { id: "year", label: "Last 12 months", short: "12 months" },
];

export const periodLabel = (id: PeriodId) => PERIODS.find((p) => p.id === id)?.label ?? "";
export const isPeriodId = (value: string | null): value is PeriodId => PERIODS.some((p) => p.id === value);

/** Half-open time range: start ≤ t < end. */
export interface Range {
  start: Date;
  end: Date;
}

export interface Bucket extends Range {
  label: string;
}

const DAYS: Record<Exclude<PeriodId, "year">, number> = { "7d": 7, "30d": 30, "90d": 90 };

export function periodRange(id: PeriodId, now: Date): Range {
  const end = addDays(startOfDay(now), 1);
  if (id === "year") return { start: new Date(now.getFullYear(), now.getMonth() - 11, 1), end };
  return { start: addDays(end, -DAYS[id]), end };
}

/** The period of the same length just before this one. */
export function previousRange(id: PeriodId, range: Range): Range {
  if (id === "year") return { start: new Date(range.start.getFullYear(), range.start.getMonth() - 12, 1), end: range.start };
  return { start: addDays(range.start, -DAYS[id]), end: range.start };
}

/** Days for 7 and 30 days, weeks for 90 days, months for a year. */
export function bucketsFor(id: PeriodId, range: Range): Bucket[] {
  const buckets: Bucket[] = [];
  if (id === "year") {
    for (let i = 0; i < 12; i++) {
      const start = new Date(range.start.getFullYear(), range.start.getMonth() + i, 1);
      const next = new Date(start.getFullYear(), start.getMonth() + 1, 1);
      buckets.push({ start, end: next < range.end ? next : range.end, label: monthShort(start) });
    }
    return buckets;
  }
  const step = id === "90d" ? 7 : 1;
  for (let start = range.start; start < range.end; start = addDays(start, step)) {
    const next = addDays(start, step);
    buckets.push({ start, end: next < range.end ? next : range.end, label: `${start.getDate()} ${monthShort(start)}` });
  }
  return buckets;
}

const inRange = (iso: string, r: Range) => {
  const t = new Date(iso).getTime();
  return t >= r.start.getTime() && t < r.end.getTime();
};

/** Where an order stood at a moment in time, from its history. */
export function statusAt(order: Pick<Order, "history">, at: Date): OrderStatus | null {
  let status: OrderStatus | null = null;
  for (const event of order.history) {
    if (new Date(event.at) <= at) status = event.status;
  }
  return status;
}

/* ---------------- Metrics ---------------- */

export type MetricId = "cash" | "newOrders" | "owed" | "collected" | "avgOrder" | "onTime";
export type MetricFormat = "money" | "count" | "percent";

export interface MetricDef {
  id: MetricId;
  label: string;
  /** Which direction is good news. */
  good: "up" | "down";
  format: MetricFormat;
  /** Short line under the chart. */
  hint: string;
}

export const METRICS: Record<MetricId, MetricDef> = {
  cash: { id: "cash", label: "Cash received", good: "up", format: "money", hint: "All payments: MoMo, cash, bank and card" },
  newOrders: { id: "newOrders", label: "New orders", good: "up", format: "count", hint: "Requests, WhatsApp and walk-in orders taken" },
  owed: { id: "owed", label: "Unpaid", good: "down", format: "money", hint: "Unpaid amounts on quoted and booked orders" },
  collected: { id: "collected", label: "Handed over", good: "up", format: "count", hint: "Orders picked up or delivered" },
  avgOrder: { id: "avgOrder", label: "Average order", good: "up", format: "money", hint: "Average total of orders taken" },
  onTime: { id: "onTime", label: "On time", good: "up", format: "percent", hint: "Orders ready on or before their pickup or delivery day" },
};

/** Balance owed at a moment: quoted and active orders, minus what had been paid by then. */
export function owedAt(orders: Order[], at: Date): number {
  let sum = 0;
  for (const order of orders) {
    const status = statusAt(order, at);
    if (!status || status === "request" || status === "collected" || status === "cancelled") continue;
    const paid = order.payments.reduce((s, p) => (new Date(p.at) <= at ? s + p.amount : s), 0);
    sum += Math.max(0, order.total - paid);
  }
  return sum;
}

function readyOnTime(orders: Order[], r: Range): { ready: number; onTime: number } {
  let ready = 0;
  let onTime = 0;
  for (const order of orders) {
    const event = order.history.find((h) => h.status === "ready");
    if (!event || !inRange(event.at, r)) continue;
    ready++;
    if (dayKey(new Date(event.at)) <= order.readyBy) onTime++;
  }
  return { ready, onTime };
}

/** The metric's value for a range. Snapshot metrics (balance owed) read the moment the range ends, capped at now. */
export function metricValue(id: MetricId, orders: Order[], r: Range, now: Date): number | null {
  switch (id) {
    case "cash":
      return orders.reduce((sum, o) => sum + o.payments.reduce((s, p) => (inRange(p.at, r) ? s + p.amount : s), 0), 0);
    case "newOrders":
      return orders.filter((o) => inRange(o.createdAt, r)).length;
    case "collected":
      return orders.filter((o) => o.history.some((h) => h.status === "collected" && inRange(h.at, r))).length;
    case "avgOrder": {
      const taken = orders.filter((o) => inRange(o.createdAt, r) && o.status !== "cancelled");
      return taken.length ? Math.round(taken.reduce((s, o) => s + o.total, 0) / taken.length) : null;
    }
    case "onTime": {
      const { ready, onTime } = readyOnTime(orders, r);
      return ready ? Math.round((onTime / ready) * 100) : null;
    }
    case "owed":
      return owedAt(orders, r.end < now ? r.end : now);
  }
}

export function metricSeries(id: MetricId, orders: Order[], buckets: Bucket[], now: Date): (number | null)[] {
  return buckets.map((b) => (b.start > now ? null : metricValue(id, orders, b, now)));
}

export type Tone = "good" | "bad" | "neutral";

export interface Delta {
  /** Fractional change, e.g. 0.12 for +12%. Null when there's nothing to compare with. */
  change: number | null;
  direction: "up" | "down" | "flat";
  tone: Tone;
}

export function delta(current: number | null, previous: number | null, good: "up" | "down"): Delta {
  if (current === null || previous === null) return { change: null, direction: "flat", tone: "neutral" };
  if (current === previous) return { change: 0, direction: "flat", tone: "neutral" };
  const direction = current > previous ? "up" : "down";
  const change = previous === 0 ? null : (current - previous) / Math.abs(previous);
  if (change !== null && Math.abs(change) < 0.005) return { change: 0, direction: "flat", tone: "neutral" };
  return { change, direction, tone: direction === good ? "good" : "bad" };
}

export interface Kpi {
  def: MetricDef;
  value: number | null;
  previous: number | null;
  delta: Delta;
  series: (number | null)[];
  previousSeries: (number | null)[];
}

export function kpi(id: MetricId, orders: Order[], period: PeriodId, now: Date): Kpi {
  const range = periodRange(period, now);
  const prev = previousRange(period, range);
  const def = METRICS[id];
  const value = metricValue(id, orders, range, now);
  const previous = metricValue(id, orders, prev, now);
  return {
    def,
    value,
    previous,
    delta: delta(value, previous, def.good),
    series: metricSeries(id, orders, bucketsFor(period, range), now),
    previousSeries: metricSeries(id, orders, bucketsFor(period, prev), now),
  };
}

/* ---------------- Workshop right now ---------------- */

export interface Workshop {
  inProduction: number;
  stages: { status: OrderStatus; count: number }[];
  late: number;
  readyUncollected: number;
  /** In production and due in the next 7 days, including today. */
  dueThisWeek: number;
  newRequests: number;
  awaitingPayment: number;
}

export function workshopNow(orders: Order[], now: Date): Workshop {
  const today = dayKey(now);
  const weekEnd = dayKey(addDays(startOfDay(now), 7));
  const production = orders.filter(isInProduction);
  return {
    inProduction: production.length,
    stages: IN_PRODUCTION.map((status) => ({ status, count: production.filter((o) => o.status === status).length })),
    late: production.filter((o) => isLate(o, now)).length,
    readyUncollected: orders.filter((o) => o.status === "ready").length,
    dueThisWeek: production.filter((o) => o.readyBy >= today && o.readyBy < weekEnd).length,
    newRequests: orders.filter((o) => o.status === "request").length,
    awaitingPayment: orders.filter((o) => o.status === "quoted").length,
  };
}

export interface WorkloadDay {
  date: Date;
  label: string;
  count: number;
  closed: boolean;
}

/** Booked orders due each day over the coming days. */
export function workload(orders: Order[], now: Date, days = 14): WorkloadDay[] {
  const today = startOfDay(now);
  return Array.from({ length: days }, (_, i) => {
    const date = addDays(today, i);
    const key = dayKey(date);
    return {
      date,
      label: i === 0 ? "Today" : fmtDayShort(date),
      count: orders.filter((o) => isInProduction(o) && o.readyBy === key).length,
      closed: !isOpenDay(date, HOURS),
    };
  });
}

/* ---------------- Rankings and shares ---------------- */

export interface Share<K extends string = string> {
  key: K;
  label: string;
  value: number;
  share: number;
  count: number;
}

function toShares<K extends string>(totals: Map<K, { value: number; count: number }>, label: (key: K) => string): Share<K>[] {
  const sum = [...totals.values()].reduce((s, t) => s + t.value, 0);
  return [...totals.entries()]
    .map(([key, t]) => ({ key, label: label(key), value: t.value, count: t.count, share: sum ? t.value / sum : 0 }))
    .sort((a, b) => b.value - a.value || a.label.localeCompare(b.label));
}

function tally<K extends string>(entries: [K, number][]) {
  const totals = new Map<K, { value: number; count: number }>();
  for (const [key, value] of entries) {
    const t = totals.get(key) ?? { value: 0, count: 0 };
    t.value += value;
    t.count += 1;
    totals.set(key, t);
  }
  return totals;
}

const takenIn = (orders: Order[], r: Range) => orders.filter((o) => inRange(o.createdAt, r) && o.status !== "cancelled");

/** Menu items by number of orders taken in the range. */
export function topStyles(orders: Order[], r: Range): Share[] {
  return toShares(tally(takenIn(orders, r).map((o): [string, number] => [o.items[0]?.styleId ?? "custom", 1])), (id) => styleById(id)?.name ?? "Custom order");
}

export function leadSources(orders: Order[], customers: Customer[], r: Range): Share<LeadSource>[] {
  const sourceOf = new Map(customers.map((c) => [c.id, c.source ?? "app"]));
  return toShares(tally(takenIn(orders, r).map((o): [LeadSource, number] => [sourceOf.get(o.customerId) ?? "app", 1])), (k) => SOURCE_LABEL[k]);
}

export function occasionShares(orders: Order[], r: Range): Share<Occasion>[] {
  return toShares(tally(takenIn(orders, r).map((o): [Occasion, number] => [o.occasion, 1])), (k) => OCCASIONS.find((o) => o.id === k)?.label ?? k);
}

export function paymentsByMethod(orders: Order[], r: Range): Share<PaymentMethod>[] {
  const entries = orders.flatMap((o) => o.payments.filter((p) => inRange(p.at, r)).map((p): [PaymentMethod, number] => [p.method, p.amount]));
  return toShares(tally(entries), (k) => METHOD_LABEL[k]);
}

export interface ClientSpend {
  customer: Customer;
  amount: number;
  orders: number;
}

export function topClients(orders: Order[], customers: Customer[], r: Range): ClientSpend[] {
  const byId = new Map(customers.map((c) => [c.id, c]));
  const totals = new Map<string, { amount: number; orders: Set<string> }>();
  for (const order of orders) {
    for (const p of order.payments) {
      if (!inRange(p.at, r)) continue;
      const t = totals.get(order.customerId) ?? { amount: 0, orders: new Set<string>() };
      t.amount += p.amount;
      t.orders.add(order.id);
      totals.set(order.customerId, t);
    }
  }
  return [...totals.entries()]
    .flatMap(([id, t]) => {
      const customer = byId.get(id);
      return customer ? [{ customer, amount: t.amount, orders: t.orders.size }] : [];
    })
    .sort((a, b) => b.amount - a.amount);
}

/* ---------------- Formatting ---------------- */

/** GH₵ 18.4k for chart axes and small cards. */
export function compactMoney(amount: number): string {
  const abs = Math.abs(amount);
  if (abs >= 1_000_000) return `GH₵ ${trim(amount / 1_000_000)}m`;
  if (abs >= 1_000) return `GH₵ ${trim(amount / 1_000)}k`;
  return `GH₵ ${Math.round(amount)}`;
}

const trim = (n: number) => (Math.abs(n) >= 100 ? Math.round(n).toString() : n.toFixed(1).replace(/\.0$/, ""));

export function formatPercentChange(change: number | null): string {
  if (change === null) return "new";
  if (change === 0) return "no change";
  return `${Math.round(Math.abs(change) * 100)}%`;
}
