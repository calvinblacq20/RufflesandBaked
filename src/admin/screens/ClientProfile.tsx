import { CalendarHeart, ChevronRight, CircleAlert, Inbox, MessageCircle, NotebookPen, Phone, ReceiptText, Send, TriangleAlert } from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Avatar } from "../../components/Bits";
import { Button, Cta } from "../../components/Button";
import { useNotify } from "../../components/Notify";
import { STUDIO } from "../../data/business";
import { studio, useAppData } from "../../data/store";
import type { Customer } from "../../data/types";
import { formatGhPhone, telLink, whatsappLink } from "../../lib/contact";
import { fmtDate, fmtMonthDay, fmtTime, money, plural } from "../../lib/format";
import { clientRows } from "../../lib/filters";
import { METHOD_LABEL, SOURCE_LABEL, daysUntil, reminderMessage } from "../../lib/studio";
import { enter } from "../../motion";
import { useFirstVisit, useNow } from "../hooks";
import { OrderCard, useOrderActions } from "../orderActions";
import { AdminPage, EmptyState } from "../Shell";

type Tab = "orders" | "dates" | "notebook" | "payments";
const TABS: { id: Tab; label: string }[] = [
  { id: "orders", label: "Orders" },
  { id: "dates", label: "Dates" },
  { id: "notebook", label: "Notebook" },
  { id: "payments", label: "Payments" },
];

export function ClientProfile() {
  const { clientId } = useParams();
  const data = useAppData();
  const customer = data.customers.find((c) => c.id === clientId);
  if (!customer) {
    return (
      <AdminPage title="Client not found" back={{ to: "/admin/clients", label: "Clients" }}>
        <EmptyState icon={<CircleAlert size={22} />} title="We couldn't find that client" body="They may have been removed when the demo was reset." action={<Link to="/admin/clients" className="btn btn-dark">All clients</Link>} />
      </AdminPage>
    );
  }
  return <ProfileView customer={customer} />;
}

function ProfileView({ customer }: { customer: Customer }) {
  const data = useAppData();
  const now = useNow();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const tab = (TABS.find((t) => t.id === params.get("tab"))?.id ?? "orders") as Tab;
  const first = useFirstVisit(`client:${customer.id}`);
  const actions = useOrderActions();
  const row = useMemo(() => clientRows([customer], data.orders)[0]!, [customer, data.orders]);
  const orders = data.orders.filter((o) => o.customerId === customer.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const dates = data.celebrations
    .filter((c) => c.customerId === customer.id)
    .map((c) => ({ c, days: daysUntil(c.date, now) }))
    .sort((a, b) => a.days - b.days);
  const payments = orders.flatMap((o) => o.payments.map((p) => ({ order: o, payment: p }))).sort((a, b) => b.payment.at.localeCompare(a.payment.at));
  const firstName = customer.name.split(" ")[0];

  return (
    <AdminPage
      title={customer.name}
      back={{ to: "/admin/clients", label: "Clients" }}
      status={
        <>
          <span className="tabular">{formatGhPhone(customer.phone)}</span> · {customer.town || "Town not given"} · {SOURCE_LABEL[customer.source ?? "app"]}
        </>
      }
      actions={
        <>
          <a className="btn btn-outline" href={whatsappLink(customer.phone, `Hi ${firstName}, it's ${STUDIO.name}.`)} target="_blank" rel="noreferrer">
            <MessageCircle size={16} /> WhatsApp
          </a>
          <a className="btn btn-outline" href={telLink(customer.phone)}>
            <Phone size={16} /> Call
          </a>
          <Cta onClick={() => navigate(`/admin/orders/new?client=${customer.id}`)}>New order</Cta>
        </>
      }
    >
      <motion.section className="adm-card" style={{ marginBottom: 16 }} {...(first ? enter(16) : {})} aria-label="Summary">
        <div className="adm-card-body" style={{ paddingTop: 20, display: "flex", gap: 20, alignItems: "center", flexWrap: "wrap" }}>
          <Avatar name={customer.name} size={56} />
          <dl className="adm-kv-grid is-4" style={{ flex: 1, minWidth: 260 }}>
            <div>
              <dt>Paid to date</dt>
              <dd className="big">{money(row.spend)}</dd>
            </div>
            <div>
              <dt>Orders</dt>
              <dd className="big">{row.orders}</dd>
            </div>
            <div>
              <dt>Unpaid</dt>
              <dd className="big" style={row.owed > 0 ? { color: "var(--warning-ink)" } : undefined}>
                {money(row.owed)}
              </dd>
            </div>
            <div>
              <dt>With us since</dt>
              <dd className="big">{fmtDate(new Date(customer.memberSince)).replace(/^\d+ /, "")}</dd>
            </div>
          </dl>
        </div>
      </motion.section>

      <div className="segmented" role="tablist" aria-label="Client details" style={{ maxWidth: 520, marginBottom: 16 }}>
        {TABS.map((t) => (
          <button key={t.id} role="tab" aria-selected={tab === t.id} className={tab === t.id ? "is-active" : ""} onClick={() => setParams(t.id === "orders" ? {} : { tab: t.id }, { replace: true })}>
            {t.label}
          </button>
        ))}
      </div>

      <div role="tabpanel" aria-label={TABS.find((t) => t.id === tab)?.label}>
        {tab === "orders" &&
          (orders.length ? (
            <div className="res-list" style={{ maxWidth: 860 }}>
              {orders.map((o) => (
                <OrderCard key={o.id} order={o} customer={customer} now={now} onStep={actions.run} onMenu={(x) => actions.open(x.id, "menu")} showClient={false} />
              ))}
            </div>
          ) : (
            <div className="adm-card">
              <EmptyState icon={<Inbox size={22} />} title="No orders yet" action={<Link className="btn btn-dark" to={`/admin/orders/new?client=${customer.id}`}>Take an order</Link>} />
            </div>
          ))}

        {tab === "dates" && (
          <div className="adm-grid adm-grid-2" style={{ maxWidth: 980, alignItems: "start" }}>
            <section className="adm-card" aria-labelledby="dates-h">
              <div className="adm-card-head">
                <h2 id="dates-h" className="inline" style={{ gap: 8 }}>
                  <CalendarHeart size={17} /> Dates to remember
                </h2>
                <span className="adm-meta">Saved by the client</span>
              </div>
              {dates.length ? (
                <div className="adm-rows" style={{ paddingBlock: "4px 8px" }}>
                  {dates.map(({ c, days }) => (
                    <div key={c.id} className="adm-row">
                      <span className="grow stack">
                        <span style={{ fontWeight: 500 }}>{c.label}</span>
                        <span className="t-cap muted">
                          {fmtMonthDay(c.date)} · {days === 0 ? "today" : days === 1 ? "tomorrow" : `in ${days} days`}
                          {c.remind ? "" : " · no reminder"}
                        </span>
                      </span>
                      {c.remind && days <= 14 && (
                        <a className="btn btn-soft btn-sm" href={whatsappLink(customer.phone, reminderMessage(c, customer, days))} target="_blank" rel="noreferrer" onClick={() => studio.markReminderSent(c.id)}>
                          <Send size={14} /> {c.remindedAt && now.getTime() - new Date(c.remindedAt).getTime() < 30 * 86_400_000 ? "Sent · again" : "Remind"}
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState icon={<CalendarHeart size={22} />} title="No dates saved" body="Clients add birthdays and anniversaries in the app, under Profile." />
              )}
            </section>
            <section className="adm-card" aria-labelledby="diet-h">
              <div className="adm-card-head">
                <h2 id="diet-h" className="inline" style={{ gap: 8 }}>
                  <TriangleAlert size={17} /> Allergies and dietary needs
                </h2>
              </div>
              <p className="adm-card-body" style={customer.dietary ? { fontWeight: 500 } : { color: "var(--ink-50)" }}>
                {customer.dietary || "Nothing noted."}
              </p>
            </section>
          </div>
        )}

        {tab === "notebook" && <Notebook customer={customer} />}

        {tab === "payments" &&
          (payments.length ? (
            <section className="adm-card" style={{ maxWidth: 860 }}>
              <div className="adm-rows" style={{ paddingBlock: 4 }}>
                {payments.map(({ order, payment }) => (
                  <Link key={payment.id} to={`/admin/orders/${order.id}/receipts/${payment.id}`} className="adm-row">
                    <span className="row-icon">
                      <ReceiptText size={18} strokeWidth={1.7} />
                    </span>
                    <span className="grow stack">
                      <span>
                        {order.number} · {METHOD_LABEL[payment.method]}
                      </span>
                      <span className="t-cap muted">
                        <span className="t-mono">{payment.receiptNo}</span> · {fmtDate(new Date(payment.at))}, {fmtTime(new Date(payment.at))}
                      </span>
                    </span>
                    <span className="tabular" style={{ fontWeight: 500 }}>
                      {money(payment.amount)}
                    </span>
                    <ChevronRight size={18} className="row-chevron" />
                  </Link>
                ))}
              </div>
            </section>
          ) : (
            <div className="adm-card">
              <EmptyState icon={<ReceiptText size={22} />} title="No payments yet" />
            </div>
          ))}
      </div>
      {actions.sheets}
    </AdminPage>
  );
}

function Notebook({ customer }: { customer: Customer }) {
  const notify = useNotify();
  const [text, setText] = useState(customer.notes ?? "");
  const [error, setError] = useState<string | null>(null);
  useEffect(() => setText(customer.notes ?? ""), [customer.id, customer.notes]);
  const dirty = text.trim() !== (customer.notes ?? "");
  const save = () => {
    const result = studio.saveNotes(customer.id, text);
    if ("error" in result) {
      setError(result.error);
      return;
    }
    setError(null);
    notify("Notebook saved", `Notes for ${customer.name} are up to date.`);
  };
  return (
    <section className="adm-card" style={{ maxWidth: 760 }} aria-labelledby="notebook">
      <div className="adm-card-head">
        <h2 id="notebook" className="inline" style={{ gap: 8 }}>
          <NotebookPen size={17} /> Your notebook
        </h2>
        <span className="adm-meta">Only you see this</span>
      </div>
      <div className="adm-card-body stack gap-12">
        <label htmlFor="notes" className="sr-only">
          Notes about {customer.name}
        </label>
        <textarea id="notes" className="adm-textarea" value={text} onChange={(e) => setText(e.target.value)} maxLength={4000} placeholder={`Notes about ${customer.name.split(" ")[0]}: favourite flavours, children's names and ages, delivery quirks, how they like to pay…`} />
        <div className="between">
          <span className="t-cap muted">{plural(text.length, "character")} of 4,000</span>
          <Button variant="dark" disabled={!dirty} onClick={save}>
            Save notes
          </Button>
        </div>
        {error && (
          <p className="adm-form-error" role="alert">
            {error}
          </p>
        )}
      </div>
    </section>
  );
}
