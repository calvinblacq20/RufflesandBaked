import { CakeSlice, CalendarDays, ChevronRight, ReceiptText, Smartphone } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useMemo, useState, type ReactNode } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { AccountSheet, FindOrderSheet } from "../components/AccountSheets";
import { Photo, Skeleton, useSkeleton } from "../components/Bits";
import { Button } from "../components/Button";
import { STYLES, styleById } from "../data/catalog";
import { accessOf, accountOf, useAppData } from "../data/store";
import { visibleOrders } from "../lib/checkout";
import type { Appointment, Order } from "../data/types";
import { fmtDay, fmtDayShort, fmtTime, money, parseLocal, plural } from "../lib/format";
import { isActive, titleFor } from "../lib/orders";
import { spring } from "../motion";

type Tab = "orders" | "pickups" | "receipts";

const PURPOSE_LABEL: Record<Appointment["purpose"], string> = {
  pickup: "Pickup",
  delivery: "Delivery",
  tasting: "Tasting",
  fitting: "Fitting",
};

export function Orders() {
  const [params, setParams] = useSearchParams();
  const tab = (params.get("tab") as Tab | null) ?? "orders";
  const loading = useSkeleton(550);
  const data = useAppData();
  const now = new Date();
  const [sheet, setSheet] = useState<"find" | "login" | null>(null);

  // Guests see orders placed or found on this phone; accounts see all of theirs.
  const account = accountOf(data);
  const orders = useMemo(() => visibleOrders(data.orders, accessOf(data)), [data]);
  const orderIds = new Set(orders.map((o) => o.id));
  const active = orders.filter(isActive);
  const past = orders.filter((o) => !isActive(o));
  const upcoming = data.appointments.filter((a) => a.orderId && orderIds.has(a.orderId) && parseLocal(a.start) >= now && a.status !== "cancelled").sort((a, b) => a.start.localeCompare(b.start));
  const receipts = useMemo(() => orders.flatMap((o) => o.payments.map((p) => ({ order: o, payment: p }))).sort((a, b) => b.payment.at.localeCompare(a.payment.at)), [orders]);

  const tabs: { id: Tab; label: string; count?: number }[] = [
    { id: "orders", label: "Orders", count: active.length },
    { id: "pickups", label: "Pickups", count: upcoming.length },
    { id: "receipts", label: "Receipts" },
  ];

  return (
    <main className="screen is-narrow">
      <header className="page-title" style={{ paddingTop: 20 }}>
        <h1 className="t-h1">Orders</h1>
      </header>
      <div className="chips sticky-under-nav" role="tablist" style={{ position: "sticky", top: 0, zIndex: 10, background: "var(--ground)", paddingBlock: 8 }}>
        {tabs.map((t) => (
          <button key={t.id} role="tab" aria-selected={tab === t.id} className={`chip ${tab === t.id ? "is-active" : ""}`} onClick={() => setParams(t.id === "orders" ? {} : { tab: t.id }, { replace: true })}>
            {t.label}
            {t.count ? <span className="chip-count">{t.count}</span> : null}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="stack gap-16" style={{ marginTop: 20 }} aria-busy="true">
          <Skeleton w="30%" h={20} />
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="inline" style={{ gap: 12 }}>
              <Skeleton w={60} h={60} r={7} />
              <div className="grow stack gap-8">
                <Skeleton w="60%" h={14} />
                <Skeleton w="80%" h={12} />
              </div>
              <Skeleton w={70} h={34} r={500} />
            </div>
          ))}
        </div>
      ) : (
        <AnimatePresence mode="wait">
          <motion.div key={tab} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={spring.small}>
            {!account && (
              <div className="card card-pad between" style={{ gap: 12, marginTop: 12 }}>
                <span className="inline muted t-cap" style={{ gap: 8 }}>
                  <Smartphone size={16} />
                  {orders.length ? "Showing orders on this phone." : "Orders you place on this phone show here."}
                </span>
                <span className="inline t-cap" style={{ gap: 12 }}>
                  <button className="link" onClick={() => setSheet("find")}>
                    Find an order
                  </button>
                  <button className="link" onClick={() => setSheet("login")}>
                    Log in
                  </button>
                </span>
              </div>
            )}

            {tab === "orders" && (
              orders.length === 0 ? (
                <Empty
                  icon={<CakeSlice size={24} />}
                  title={account ? "No orders yet" : "No orders on this phone yet"}
                  body={account ? "Orders you place with the studio will show here." : "Ordered on another phone? Find it with your order number and WhatsApp number."}
                  cta={{ to: "/order/new", label: "Start an order" }}
                />
              ) : (
                <div className="orders-sections">
                  {active.length > 0 && <OrderSection title="In progress" orders={active} now={now} />}
                  {past.length > 0 && <OrderSection title="Past" orders={past} now={now} />}
                </div>
              )
            )}

            {tab === "pickups" && (
              upcoming.length === 0 ? (
                <Empty icon={<CalendarDays size={24} />} title="Nothing coming up" body="Pickups, deliveries and fittings you book will show here." cta={{ to: "/order/new", label: "Start an order" }} />
              ) : (
                <section className="section">
                  <h2 className="t-h3">Upcoming</h2>
                  <div className="card list-card">
                    {upcoming.map((a) => {
                      const order = data.orders.find((o) => o.id === a.orderId);
                      const start = parseLocal(a.start);
                      return (
                        <Link key={a.id} to={order ? `/orders/${order.id}` : "/orders"} className="row">
                          <span className="row-icon is-gold">
                            <CalendarDays size={18} strokeWidth={1.7} />
                          </span>
                          <span className="grow stack">
                            <span>{PURPOSE_LABEL[a.purpose]}</span>
                            <span className="subtle t-cap">
                              {fmtDayShort(start)} at {fmtTime(start)} · {a.status === "requested" ? "Awaiting confirmation" : "Confirmed"}
                              {order ? ` · ${order.number}` : ""}
                            </span>
                          </span>
                          <ChevronRight size={18} className="row-chevron" />
                        </Link>
                      );
                    })}
                  </div>
                </section>
              )
            )}

            {tab === "receipts" && (
              receipts.length === 0 ? (
                <Empty icon={<ReceiptText size={24} />} title="No receipts yet" body="Official receipts appear here after each payment." />
              ) : (
                <section className="section">
                  <h2 className="t-h3">All receipts</h2>
                  <div className="card list-card">
                    {receipts.map(({ order, payment }) => (
                      <Link key={payment.id} to={`/orders/${order.id}/receipts/${payment.id}`} className="row">
                        <span className="row-icon">
                          <ReceiptText size={18} strokeWidth={1.7} />
                        </span>
                        <span className="grow stack">
                          <span className="t-mono" style={{ fontSize: 13 }}>{payment.receiptNo}</span>
                          <span className="subtle t-cap">
                            {order.number} · {fmtDay(new Date(payment.at))}
                          </span>
                        </span>
                        <span className="tabular" style={{ fontWeight: 500 }}>{money(payment.amount)}</span>
                        <ChevronRight size={18} className="row-chevron" />
                      </Link>
                    ))}
                  </div>
                </section>
              )
            )}
          </motion.div>
        </AnimatePresence>
      )}

      <FindOrderSheet open={sheet === "find"} onClose={() => setSheet(null)} />
      <AccountSheet open={sheet === "login"} onClose={() => setSheet(null)} mode="login" />
    </main>
  );
}

function OrderSection({ title, orders, now }: { title: string; orders: Order[]; now: Date }) {
  const navigate = useNavigate();
  return (
    <section className="section">
      <h2 className="t-h3">{title}</h2>
      <div className="stack order-list-card">
        {orders.map((order, i) => {
          const first = order.items[0];
          const style = first ? styleById(first.styleId) : undefined;
          const count = order.items.reduce((n, item) => n + item.qty, 0);
          const extra = order.items.length > 1 ? ` + ${order.items.length - 1} more` : "";
          const live = isActive(order);
          return (
            <motion.div key={order.id} className="order-row" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ ...spring.small, delay: i * 0.05 }}>
              <Link to={`/orders/${order.id}`} className="inline grow" style={{ gap: 12 }}>
                <Photo tone={style?.tone ?? "mist"} src={style?.photo} sizes="60px" height={60} radius="var(--r-img)" markSize={22} className="order-thumb" />
                <span className="grow stack" style={{ minWidth: 0 }}>
                  <span className="t-title truncate">{(style?.name ?? "Custom order") + extra}</span>
                  <span className="muted t-cap">{titleFor(order, now)}</span>
                  <span className="subtle t-cap tabular">
                    {money(order.total)} · {plural(count, "item")}
                  </span>
                </span>
              </Link>
              {live ? (
                <Button size="sm" onClick={() => navigate(`/orders/${order.id}`)}>
                  Track
                </Button>
              ) : (
                <Button size="sm" onClick={() => navigate(`/order/new?style=${first?.styleId ?? STYLES[0]?.id ?? ""}`)}>
                  Reorder
                </Button>
              )}
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}

function Empty({ icon, title, body, cta }: { icon: ReactNode; title: string; body: string; cta?: { to: string; label: string } }) {
  return (
    <div className="empty">
      <span className="empty-icon">{icon}</span>
      <p className="t-title">{title}</p>
      <p className="muted">{body}</p>
      {cta && (
        <Link to={cta.to} className="btn btn-outline" style={{ marginTop: 8 }}>
          {cta.label}
        </Link>
      )}
    </div>
  );
}
