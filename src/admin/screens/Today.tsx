import { ArrowRight, CakeSlice, CalendarDays, CalendarHeart, Check, ChevronRight, Send, Table2 } from "lucide-react";
import { motion } from "motion/react";
import { useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Badge, Skeleton } from "../../components/Bits";
import { Cta } from "../../components/Button";
import { CountUp } from "../../components/Scroll";
import { HOURS } from "../../data/business";
import { customerById, studio, useAppData } from "../../data/store";
import type { Appointment, Order } from "../../data/types";
import { whatsappLink } from "../../lib/contact";
import { addDays, dayKey, fmtDayLong, fmtDayShort, fmtTime, money, parseLocal, plural, weekdayLong } from "../../lib/format";
import { balanceDue } from "../../lib/orders";
import { bucketsFor, compactMoney, isPeriodId, kpi, leadSources, METRICS, periodLabel, periodRange, topStyles, workload, workshopNow, type MetricId, type PeriodId } from "../../lib/metrics";
import { isOpenDay, openStatus } from "../../lib/schedule";
import { IN_PRODUCTION, OWNER_STAGE_LABEL, bakeList, daysUntil, orderTitle, reminderMessage } from "../../lib/studio";
import { enter } from "../../motion";
import { BarChart, LegendLine, LineChart, RankTable } from "../charts";
import { ActionBanner, ActionCard, CardHead, KpiTabs, PeriodSelect, formatMetric } from "../controls";
import { useFirstLoad, useFirstVisit, useNow } from "../hooks";
import { MoneyTag } from "../orderActions";
import { AdminPage, EmptyState, reminderDue } from "../Shell";

const TODAY_METRICS: MetricId[] = ["cash", "newOrders", "owed", "collected"];
export const INK = "#2a141c";
export const PREVIOUS = "rgba(42, 20, 28,0.5)";

export const PURPOSE_LABEL: Record<Appointment["purpose"], string> = { pickup: "Pickup", delivery: "Delivery", tasting: "Tasting", fitting: "Fitting" };

export function usePeriod(fallback: PeriodId = "30d"): [PeriodId, (p: PeriodId) => void] {
  const [params, setParams] = useSearchParams();
  const raw = params.get("period");
  const period = isPeriodId(raw) ? raw : fallback;
  const set = (p: PeriodId) =>
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (p === fallback) next.delete("period");
        else next.set("period", p);
        return next;
      },
      { replace: true },
    );
  return [period, set];
}

/** A trend card: KPI tabs on top drive one line chart against the previous period (pattern A). */
export function TrendCard({ ids, period, id, reportLink }: { ids: MetricId[]; period: PeriodId; id: string; reportLink?: boolean }) {
  const data = useAppData();
  const now = useNow();
  const first = useFirstVisit(`trend:${id}`);
  const [metric, setMetric] = useState<MetricId>(ids[0]!);
  const [asTable, setAsTable] = useState(false);
  const kpis = useMemo(() => ids.map((m) => kpi(m, data.orders, period, now)), [ids, data.orders, period, now]);
  const active = kpis.find((k) => k.def.id === metric) ?? kpis[0]!;
  const range = periodRange(period, now);
  const buckets = bucketsFor(period, range);
  const fmt = (n: number) => formatMetric(n, active.def.format);
  const axis = (n: number) => (active.def.format === "money" ? compactMoney(n) : active.def.format === "percent" ? `${n}%` : String(n));
  const tipLabel = (i: number) => {
    const b = buckets[i];
    if (!b) return "";
    return period === "90d" ? `Week of ${b.label}` : period === "year" ? `${b.label} ${b.start.getFullYear()}` : b.label;
  };
  const summary = `${active.def.label}, ${periodLabel(period).toLowerCase()}: ${formatMetric(active.value, active.def.format)}${active.delta.change !== null ? `, ${active.delta.direction} ${Math.round(Math.abs(active.delta.change) * 100)}% on the previous period` : ""}.`;

  return (
    <section className="adm-card kpi-card" aria-label="Trends">
      <KpiTabs kpis={kpis} active={active.def.id} onSelect={(m) => setMetric(m as MetricId)} animate={first} id={id} />
      <div id={`${id}-panel`} role="tabpanel" style={{ padding: "16px 20px 8px" }}>
        {asTable ? (
          <div className="adm-table-wrap" style={{ maxHeight: 280 }}>
            <table className="adm-table">
              <thead>
                <tr>
                  <th scope="col">{period === "year" ? "Month" : period === "90d" ? "Week of" : "Day"}</th>
                  <th scope="col" className="num">
                    {periodLabel(period)}
                  </th>
                  <th scope="col" className="num">
                    Previous period
                  </th>
                </tr>
              </thead>
              <tbody>
                {buckets.map((b, i) => (
                  <tr key={b.label + i} style={{ cursor: "default" }}>
                    <td>{tipLabel(i)}</td>
                    <td className="num">{formatMetric(active.series[i] ?? null, active.def.format)}</td>
                    <td className="num">{formatMetric(active.previousSeries[i] ?? null, active.def.format)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <LineChart
            dataKey={active.def.id + period}
            animate={first}
            ariaLabel={summary}
            labels={buckets.map((b) => b.label)}
            tipLabel={tipLabel}
            format={fmt}
            axisFormat={axis}
            height={230}
            emptyText={`No ${active.def.label.toLowerCase()} in this period`}
            series={[
              { label: periodLabel(period), values: active.series, color: INK, area: true },
              { label: "Previous period", values: active.previousSeries, color: PREVIOUS, dashed: true },
            ]}
          />
        )}
        <div style={{ marginTop: 10 }}>
          <LegendLine items={[{ label: periodLabel(period), color: INK }, { label: "Previous period", color: PREVIOUS, dashed: true }]} />
        </div>
      </div>
      <div className="adm-card-foot">
        <span className="adm-meta">{METRICS[active.def.id].hint}</span>
        <span className="inline" style={{ gap: 12 }}>
          <button className="adm-link" onClick={() => setAsTable((t) => !t)} aria-pressed={asTable}>
            <Table2 size={15} /> {asTable ? "Chart" : "Table"}
          </button>
          {reportLink && (
            <Link to={`/admin/reports${period === "30d" ? "" : `?period=${period}`}`} className="adm-link">
              Reports <ArrowRight size={14} />
            </Link>
          )}
        </span>
      </div>
    </section>
  );
}

export function Today() {
  const data = useAppData();
  const now = useNow();
  const navigate = useNavigate();
  const [period, setPeriod] = usePeriod();
  const loading = useFirstLoad("today");
  const first = useFirstVisit("today");
  const shop = useMemo(() => workshopNow(data.orders, now), [data.orders, now]);
  const days = useMemo(() => workload(data.orders, now, 14), [data.orders, now]);
  const styles = useMemo(() => topStyles(data.orders, periodRange(period, now)).slice(0, 5), [data.orders, period, now]);
  const sources = useMemo(() => leadSources(data.orders, data.customers, periodRange(period, now)), [data.orders, data.customers, period, now]);
  const todayKey = dayKey(now);
  const visits = data.appointments.filter((a) => a.start.startsWith(todayKey) && a.status !== "cancelled").sort((a, b) => a.start.localeCompare(b.start));
  const ready = data.orders.filter((o) => o.status === "ready").sort((a, b) => balanceDue(b) - balanceDue(a));
  const requests = data.orders.filter((o) => o.status === "request").sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const open = openStatus(now, HOURS);

  const urgent =
    shop.newRequests > 0
      ? { title: `${plural(shop.newRequests, "new request")} ${shop.newRequests === 1 ? "needs" : "need"} a price`, body: "Clients are waiting on WhatsApp. Send each quote so they can pay and book their date.", cta: "Price requests", to: "/admin/orders?stage=new" }
      : shop.late > 0
        ? { title: `${plural(shop.late, "order")} running late`, body: "Past their handover day and still being made. Call the clients.", cta: "See late orders", to: "/admin/orders?due=late" }
        : shop.awaitingPayment > 0
          ? { title: `${plural(shop.awaitingPayment, "quote")} waiting for payment`, body: "Send a friendly reminder: the date isn't held until it's paid.", cta: "Send reminders", to: "/admin/orders?stage=quoted" }
          : null;

  const lateBefore = data.orders.filter((o) => IN_PRODUCTION.includes(o.status) && o.readyBy < todayKey).length;

  return (
    <AdminPage
      title="Today"
      status={
        <>
          <span className={`adm-dot ${open.open ? "is-open" : ""}`} aria-hidden="true" />
          {fmtDayLong(now)} · {open.label} · {shop.inProduction} in progress
        </>
      }
      actions={
        <>
          <PeriodSelect value={period} onChange={setPeriod} />
          <Cta onClick={() => navigate("/admin/orders/new")}>New order</Cta>
        </>
      }
    >
      {loading ? (
        <TodaySkeleton />
      ) : (
        <div className="adm-with-rail">
          <div className="adm-stack">
            {urgent && (
              <div className="narrow-only">
                <ActionBanner title={urgent.title} body={urgent.body} cta={urgent.cta} onClick={() => navigate(urgent.to)} />
              </div>
            )}
            <motion.div {...(first ? enter(16) : {})}>
              <KitchenList orders={data.orders} now={now} />
            </motion.div>

            <motion.div {...(first ? enter(16, 0.04) : {})}>
              <TrendCard ids={TODAY_METRICS} period={period} id="today" reportLink />
            </motion.div>

            <motion.div className="adm-grid adm-grid-b" {...(first ? enter(16, 0.08) : {})}>
              <section className="adm-card adm-dark" aria-labelledby="shop-now">
                <div className="adm-card-body" style={{ paddingTop: 18 }}>
                  <p id="shop-now" className="adm-meta">
                    Being made now
                  </p>
                  <p className="adm-big" style={{ marginTop: 6 }}>
                    {first ? <CountUp to={shop.inProduction} /> : shop.inProduction}
                  </p>
                  <p className="muted">{shop.inProduction === 1 ? "order booked or baking" : "orders booked or baking"}</p>
                  <div className="stage-strip" style={{ marginTop: 20 }}>
                    {shop.stages.map((s) => {
                      const max = Math.max(1, ...shop.stages.map((x) => x.count));
                      return (
                        <Link key={s.status} to="/admin/orders?stage=production" className="stage-col" aria-label={`${s.count} ${OWNER_STAGE_LABEL[s.status]}`}>
                          <span className="adm-meta truncate">{OWNER_STAGE_LABEL[s.status]}</span>
                          <span className="num">{s.count}</span>
                          <span className="stage-track" aria-hidden="true">
                            <motion.i initial={first ? { scaleX: 0 } : false} animate={{ scaleX: 1 }} transition={{ type: "spring", bounce: 0.2, duration: 1, delay: 0.2 }} style={{ width: `${(s.count / max) * 100}%` }} />
                          </span>
                        </Link>
                      );
                    })}
                  </div>
                  <div className="divider" style={{ marginBlock: 18 }} />
                  <Link to="/admin/orders?due=week" className="kv">
                    <span>Due in the next 7 days</span>
                    <b>{shop.dueThisWeek}</b>
                  </Link>
                  <Link to="/admin/orders?due=late" className="kv">
                    <span>Late</span>
                    <b style={shop.late ? { color: "var(--sand)" } : undefined}>{shop.late}</b>
                  </Link>
                  <Link to="/admin/orders?stage=ready" className="kv">
                    <span>Ready, not handed over</span>
                    <b>{shop.readyUncollected}</b>
                  </Link>
                </div>
              </section>

              <section className="adm-card" aria-labelledby="workload">
                <CardHead id="workload" title="Due in the next 14 days" action={lateBefore > 0 ? <Link to="/admin/orders?due=late" className="adm-link">{lateBefore} late from before</Link> : undefined} />
                <div className="adm-card-body">
                  <BarChart
                    animate={first}
                    height={190}
                    ariaLabel={`Orders due each day for the next 14 days: ${days.map((d) => `${d.label} ${d.count}`).join(", ")}`}
                    bars={days.map((d, i) => ({
                      label: i === 0 ? "Today" : String(d.date.getDate()),
                      value: d.count,
                      emphasis: i === 0,
                      closed: d.closed,
                      title: `${d.label}: ${d.closed ? "closed" : plural(d.count, "order")} due`,
                    }))}
                  />
                  <p className="adm-meta" style={{ marginTop: 8 }}>
                    Booked orders by pickup or delivery day. Sundays are closed.
                  </p>
                </div>
              </section>
            </motion.div>

            <motion.div className="adm-grid adm-grid-2" {...(first ? enter(16, 0.14) : {})}>
              <section className="adm-card" aria-labelledby="visits">
                <CardHead id="visits" title="Today's pickups and fittings" action={<Link to="/admin/appointments" className="adm-link">Calendar <ChevronRight size={14} /></Link>} />
                {visits.length ? (
                  <div className="adm-rows" style={{ padding: "6px 0 8px" }}>
                    {visits.map((a) => (
                      <VisitRow key={a.id} appointment={a} now={now} />
                    ))}
                  </div>
                ) : (
                  <EmptyState icon={<CalendarDays size={22} />} title="Nothing booked today" body="Pickups, deliveries, tastings and fittings booked for today show here." />
                )}
              </section>

              <section className="adm-card" aria-labelledby="sources">
                <CardHead id="sources" title="Where orders came from" action={<span className="adm-meta">{periodLabel(period)}</span>} />
                <div className="adm-card-body">
                  <RankTable nameLabel="Source" valueLabel="Orders" empty="No orders in this period." rows={sources.map((s) => ({ key: s.key, name: s.label, value: s.value, share: s.share }))} />
                </div>
              </section>
            </motion.div>

            <motion.section className="adm-card" aria-labelledby="styles" {...(first ? enter(16, 0.2) : {})}>
              <CardHead id="styles" title="Top sellers" action={<span className="adm-meta">{periodLabel(period)}</span>} />
              <div className="adm-card-body">
                <RankTable nameLabel="Item" valueLabel="Orders" empty="No orders in this period." rows={styles.map((s) => ({ key: s.key, name: s.label, value: s.value, share: s.share }))} />
              </div>
            </motion.section>
          </div>

          <aside className="adm-rail" aria-label="Needs attention">
            {urgent && (
              <div className="wide-only">
                <ActionCard title={urgent.title} body={urgent.body} cta={urgent.cta} onClick={() => navigate(urgent.to)} />
              </div>
            )}
            <RemindersCard now={now} />
            <section className="adm-card" aria-labelledby="ready">
              <CardHead id="ready" title="Ready to hand over" action={<span className="chip-count">{ready.length}</span>} />
              {ready.length ? (
                <div className="adm-rows" style={{ padding: "6px 0 8px" }}>
                  {ready.slice(0, 5).map((o) => (
                    <Link key={o.id} to={`/admin/orders/${o.id}`} className="adm-row">
                      <span className="grow stack">
                        <span className="truncate" style={{ fontWeight: 500 }}>
                          {customerById(data, o.customerId)?.name ?? o.number}
                        </span>
                        <span className="t-cap muted truncate">{orderTitle(o)}</span>
                      </span>
                      <MoneyTag order={o} />
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="adm-card-body muted">Nothing waiting on the counter.</p>
              )}
              {ready.length > 5 && (
                <div className="adm-card-foot">
                  <Link to="/admin/orders?stage=ready" className="adm-link">
                    See all {ready.length} <ArrowRight size={14} />
                  </Link>
                </div>
              )}
            </section>
            <section className="adm-card" aria-labelledby="requests">
              <CardHead id="requests" title="Waiting for a price" action={<span className="chip-count">{requests.length}</span>} />
              {requests.length ? (
                <div className="adm-rows" style={{ padding: "6px 0 8px" }}>
                  {requests.slice(0, 5).map((o) => (
                    <Link key={o.id} to={`/admin/orders/${o.id}`} className="adm-row">
                      <span className="grow stack">
                        <span className="truncate" style={{ fontWeight: 500 }}>
                          {orderTitle(o)}
                        </span>
                        <span className="t-cap muted truncate">
                          {customerById(data, o.customerId)?.name} · est. {money(o.total)}
                        </span>
                      </span>
                      <ChevronRight size={18} className="row-chevron" />
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="adm-card-body muted">Every request has a price.</p>
              )}
            </section>
          </aside>
        </div>
      )}
    </AdminPage>
  );
}

/** What the studio makes for a day's handovers, with identical items counted together. */
function KitchenList({ orders, now }: { orders: Order[]; now: Date }) {
  const today = dayKey(now);
  let next = addDays(now, 1);
  while (!isOpenDay(next, HOURS)) next = addDays(next, 1);
  const nextKey = dayKey(next);
  const [which, setWhich] = useState<"today" | "next">("today");
  const day = which === "today" ? today : nextKey;
  const lines = useMemo(() => bakeList(orders, day), [orders, day]);
  const count = lines.reduce((n, l) => n + l.qty, 0);
  const nextLabel = dayKey(addDays(now, 1)) === nextKey ? "Tomorrow" : weekdayLong(next);
  return (
    <section className="adm-card" aria-labelledby="kitchen">
      <CardHead
        id="kitchen"
        title="Making today"
        action={
          <span className="inline" style={{ gap: 6 }} role="radiogroup" aria-label="Which day">
            <button role="radio" aria-checked={which === "today"} className={`chip ${which === "today" ? "is-active" : ""}`} onClick={() => setWhich("today")}>
              Today
            </button>
            <button role="radio" aria-checked={which === "next"} className={`chip ${which === "next" ? "is-active" : ""}`} onClick={() => setWhich("next")}>
              {nextLabel}
            </button>
          </span>
        }
      />
      {lines.length ? (
        <div className="adm-rows" style={{ padding: "6px 0 8px" }}>
          {lines.map((line) => (
            <div key={line.key} className="adm-row">
              <span className="adm-row-time">{line.qty}×</span>
              <span className="grow stack">
                <span className="truncate" style={{ fontWeight: 500 }}>
                  {line.styleName}
                </span>
                <span className="t-cap muted truncate">{line.label}</span>
              </span>
              <span className="t-cap muted t-mono truncate" style={{ maxWidth: "40%" }}>
                {line.orders.join(", ")}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState icon={<CakeSlice size={22} />} title={day === today && !isOpenDay(now, HOURS) ? "Closed today" : "Nothing to bake"} body={`No paid orders are due ${which === "today" ? "today" : `on ${fmtDayShort(next)}`}.`} />
      )}
      <div className="adm-card-foot">
        <span className="adm-meta">
          {count ? `${plural(count, "item")} for ${which === "today" ? "today" : fmtDayShort(next)}. ` : ""}Paid orders only; identical items are grouped.
        </span>
      </div>
    </section>
  );
}

/** Dates clients asked us to remember, a week out: one tap opens the reminder in WhatsApp. */
function RemindersCard({ now }: { now: Date }) {
  const data = useAppData();
  const due = data.celebrations
    .filter((c) => reminderDue(c, now))
    .map((c) => ({ c, days: daysUntil(c.date, now), customer: customerById(data, c.customerId) }))
    .sort((a, b) => a.days - b.days);
  return (
    <section id="reminders" className="adm-card" aria-labelledby="reminders-title">
      <CardHead id="reminders-title" title="Birthday reminders" action={<span className="chip-count">{due.length}</span>} />
      {due.length ? (
        <div className="adm-rows" style={{ padding: "6px 0 8px" }}>
          {due.map(({ c, days, customer }) => (
            <div key={c.id} className="adm-row">
              <span className="grow stack">
                <span className="truncate" style={{ fontWeight: 500 }}>
                  {customer ? <Link to={`/admin/clients/${customer.id}`}>{customer.name}</Link> : "Client"}
                </span>
                <span className="t-cap muted truncate">
                  {c.label} · {days === 0 ? "today" : days === 1 ? "tomorrow" : `in ${days} days`}
                </span>
              </span>
              <a
                className="btn btn-dark btn-sm"
                href={whatsappLink(customer?.phone ?? "", reminderMessage(c, customer, days))}
                target="_blank"
                rel="noreferrer"
                onClick={() => studio.markReminderSent(c.id)}
                aria-label={`Send ${customer?.name ?? "the client"} a reminder on WhatsApp`}
              >
                <Send size={14} /> Send
              </a>
            </div>
          ))}
        </div>
      ) : (
        <p className="adm-card-body muted inline" style={{ gap: 8 }}>
          <CalendarHeart size={16} /> No reminders due this week.
        </p>
      )}
    </section>
  );
}

function VisitRow({ appointment: a, now }: { appointment: Appointment; now: Date }) {
  const data = useAppData();
  const start = parseLocal(a.start);
  const past = start < now;
  const customer = customerById(data, a.customerId);
  const order = a.orderId ? data.orders.find((o) => o.id === a.orderId) : undefined;
  return (
    <div className="adm-row">
      <span className={`adm-row-time ${past ? "is-past" : ""}`}>{fmtTime(start)}</span>
      <span className="grow stack">
        <span className="truncate" style={{ fontWeight: 500 }}>
          {customer ? <Link to={`/admin/clients/${customer.id}`}>{customer.name}</Link> : "Client"}
        </span>
        <span className="t-cap muted truncate">
          {PURPOSE_LABEL[a.purpose]}
          {order ? (
            <>
              {" · "}
              <Link to={`/admin/orders/${order.id}`} className="t-mono">
                {order.number}
              </Link>
            </>
          ) : null}
        </span>
      </span>
      {a.status === "requested" ? (
        <button className="btn btn-dark btn-sm" onClick={() => studio.setAppointmentStatus(a.id, "confirmed")}>
          Confirm
        </button>
      ) : a.status === "done" ? (
        <Badge tone="mist" icon={<Check size={13} />}>
          Done
        </Badge>
      ) : past ? (
        <button className="btn btn-soft btn-sm" onClick={() => studio.setAppointmentStatus(a.id, "done")}>
          Mark done
        </button>
      ) : (
        <Badge tone="wash">Booked</Badge>
      )}
    </div>
  );
}

function TodaySkeleton() {
  return (
    <div className="adm-with-rail" aria-busy="true">
      <div className="adm-stack">
        <Skeleton h={360} r={8} />
        <div className="adm-grid adm-grid-b">
          <Skeleton h={320} r={8} />
          <Skeleton h={320} r={8} />
        </div>
      </div>
      <div className="adm-rail">
        <Skeleton h={160} r={8} />
        <Skeleton h={260} r={8} />
      </div>
    </div>
  );
}
