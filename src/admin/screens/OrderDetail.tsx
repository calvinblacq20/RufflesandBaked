import { Ban, CalendarDays, Check, ChevronRight, CircleAlert, ListOrdered, MessageCircle, NotebookPen, Palette, Phone, Printer, ReceiptText, Share2, TriangleAlert, Wallet } from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Avatar, Badge, Skeleton } from "../../components/Bits";
import { Button, Cta } from "../../components/Button";
import { useNotify } from "../../components/Notify";
import { ReceiptDoc, receiptShareText } from "../../components/ReceiptDoc";
import { STUDIO } from "../../data/business";
import { occasionLabel, styleById } from "../../data/catalog";
import { customerById, useAppData } from "../../data/store";
import type { DesignPlan, Order } from "../../data/types";
import { telLink, formatGhPhone, whatsappLink } from "../../lib/contact";
import { fmtDate, fmtDay, fmtDayShort, fmtTime, money, parseLocal, relativeDay } from "../../lib/format";
import { itemSummary } from "../../lib/items";
import { balanceDue, isActive, paidTotal, STAGES, stageIndex } from "../../lib/orders";
import { METHOD_LABEL, OWNER_STAGE_LABEL, SOURCE_LABEL, orderTitle, ownerBadge, ownerDateLine, ownerNextStep } from "../../lib/studio";
import { enter } from "../../motion";
import { CardHead } from "../controls";
import { useFirstLoad, useFirstVisit, useNow } from "../hooks";
import { useOrderActions } from "../orderActions";
import { AdminPage, EmptyState } from "../Shell";
import { PURPOSE_LABEL } from "./Today";

const KIND = { full: "Paid in full", part: "Part payment", final: "Final payment" } as const;
const PLAN_LABEL: Record<DesignPlan, string> = { ours: "We design it", photo: "From the client's picture", consult: "Fitting or tasting" };

function MissingOrder() {
  return (
    <AdminPage title="Order not found" back={{ to: "/admin/orders", label: "Orders" }}>
      <EmptyState
        icon={<CircleAlert size={22} />}
        title="We couldn't find that order"
        body="It may have been removed when the demo was reset."
        action={
          <Link to="/admin/orders" className="btn btn-dark">
            All orders
          </Link>
        }
      />
    </AdminPage>
  );
}

export function OrderDetail() {
  const { orderId } = useParams();
  const data = useAppData();
  const order = data.orders.find((o) => o.id === orderId);
  const loading = useFirstLoad(`order:${orderId}`, 350);
  if (!order) return <MissingOrder />;
  if (loading) {
    return (
      <AdminPage title={orderTitle(order)} back={{ to: "/admin/orders", label: "Orders" }}>
        <div className="adm-detail" aria-busy="true">
          <div className="adm-stack">
            <Skeleton h={180} r={8} />
            <Skeleton h={240} r={8} />
          </div>
          <Skeleton h={300} r={8} />
        </div>
      </AdminPage>
    );
  }
  return <OrderView order={order} />;
}

function OrderView({ order }: { order: Order }) {
  const data = useAppData();
  const now = useNow();
  const first = useFirstVisit(`order-view:${order.id}`);
  const actions = useOrderActions();
  const [moved, setMoved] = useState<string | null>(null);
  const customer = customerById(data, order.customerId);
  const title = orderTitle(order);
  const badge = ownerBadge(order, now);
  const step = ownerNextStep(order);
  const date = ownerDateLine(order, now);
  const live = isActive(order);
  const paid = paidTotal(order);
  const balance = balanceDue(order);
  const current = stageIndex(order.status);
  const visits = data.appointments.filter((a) => a.orderId === order.id).sort((a, b) => a.start.localeCompare(b.start));
  const handover = visits.find((a) => (a.purpose === "pickup" || a.purpose === "delivery") && a.status !== "cancelled");
  const history = [...order.history].reverse();

  const runStep = () => {
    if (!step) return;
    if (step.kind === "advance" || step.kind === "collect") {
      actions.run(order, step);
      setMoved(step.kind === "collect" ? (order.delivery === "delivery" ? "Delivered" : "Picked up") : OWNER_STAGE_LABEL[step.to!]);
    } else actions.run(order, step);
  };

  const stepButton = step && live && (
    <Cta onClick={runStep} className="desktop-only">
      {step.label}
    </Cta>
  );

  return (
    <AdminPage
      title={title}
      back={{ to: "/admin/orders", label: "Orders" }}
      status={
        <>
          <Badge tone={badge.tone}>{badge.label}</Badge>
          <span className="t-mono">{order.number}</span> · {occasionLabel(order.occasion)}
        </>
      }
      actions={stepButton || undefined}
    >
      <div className="adm-detail">
        <motion.div className="adm-stack" {...(first ? enter(16) : {})}>
          {moved && live && customer && (
            <div className="banner" role="status">
              <p className="t-title">Moved to {moved}</p>
              <p className="muted">Let {customer.name.split(" ")[0]} know on WhatsApp?</p>
              <button className="banner-cta" onClick={() => actions.open(order.id, "update")}>
                Write the update <ChevronRight size={16} />
              </button>
            </div>
          )}
          {moved && !live && (
            <div className="banner" role="status">
              <p className="t-title">Marked {moved.toLowerCase()}</p>
            </div>
          )}

          <section className="adm-card" aria-labelledby="progress">
            <CardHead id="progress" title="Progress" action={<span className={date.late ? "t-cap" : "adm-meta"} style={date.late ? { color: "var(--warning-ink)", fontWeight: 500 } : undefined}>{date.text}</span>} />
            <div className="adm-card-body stack gap-16">
              {order.status === "cancelled" ? (
                <p className="muted">This order was cancelled{history[0] ? ` on ${fmtDayShort(new Date(history[0].at))}` : ""}.</p>
              ) : (
                <div className="stepper" role="list" aria-label="Order stages">
                  {STAGES.map((stage, i) => {
                    const done = i < current || order.status === "collected";
                    const isCurrent = i === current && order.status !== "collected";
                    return (
                      <div key={stage} role="listitem" className={`stepper-step ${done ? "is-done" : ""} ${isCurrent ? "is-current" : ""}`} aria-current={isCurrent ? "step" : undefined}>
                        <i />
                        <span>{OWNER_STAGE_LABEL[stage]}</span>
                      </div>
                    );
                  })}
                </div>
              )}
              <dl className="adm-kv-grid is-4">
                <div>
                  <dt>{order.delivery === "delivery" ? "Delivery day" : "Pickup day"}</dt>
                  <dd>{fmtDayShort(parseLocal(order.neededBy))}</dd>
                </div>
                <div>
                  <dt>Time</dt>
                  <dd>{handover ? `${fmtTime(parseLocal(handover.start))}${handover.status === "requested" ? " · to confirm" : ""}` : "Not booked"}</dd>
                </div>
                <div>
                  <dt>Handover</dt>
                  <dd>{order.delivery === "delivery" ? `Delivery · ${order.deliveryTown ?? customer?.town ?? ""}` : "Pickup in Kasoa"}</dd>
                </div>
                <div>
                  <dt>Last update sent</dt>
                  <dd>{order.lastUpdateAt ? relativeDay(new Date(order.lastUpdateAt), now) : "Not yet"}</dd>
                </div>
              </dl>
              <div className="adm-actions">
                {step && live && (
                  <Button variant="dark" onClick={runStep} className="mobile-only">
                    {step.label}
                  </Button>
                )}
                <Button icon={<MessageCircle size={16} />} onClick={() => actions.open(order.id, "update")} disabled={!customer}>
                  Send update
                </Button>
                {live && (
                  <Button icon={<ListOrdered size={16} />} onClick={() => actions.open(order.id, "stage")}>
                    Change stage
                  </Button>
                )}
                {order.shortNotice && <span className="pill-tag" style={{ alignSelf: "center" }}>Late order</span>}
              </div>
            </div>
          </section>

          <section className="adm-card" aria-labelledby="money">
            <CardHead id="money" title="Money" action={live && balance > 0 ? <Button variant="dark" size="sm" icon={<Wallet size={15} />} onClick={() => actions.open(order.id, "payment")}>Record payment</Button> : undefined} />
            <div className="adm-card-body">
              <dl className="adm-kv-grid">
                <div>
                  <dt>{order.status === "request" ? "Estimate" : "Total"}</dt>
                  <dd className="big">{money(order.total)}</dd>
                </div>
                <div>
                  <dt>Paid</dt>
                  <dd className="big">{money(paid)}</dd>
                </div>
                <div>
                  <dt>Balance</dt>
                  <dd className="big" style={balance > 0 && order.status !== "cancelled" ? { color: "var(--warning-ink)" } : undefined}>
                    {money(order.status === "cancelled" ? 0 : balance)}
                  </dd>
                </div>
              </dl>
            </div>
            {order.payments.length > 0 ? (
              <div className="adm-rows" style={{ borderTop: "1px solid var(--ink-06)", paddingBlock: 4 }}>
                {[...order.payments].reverse().map((p) => (
                  <Link key={p.id} to={`/admin/orders/${order.id}/receipts/${p.id}`} className="adm-row">
                    <span className="row-icon">
                      <ReceiptText size={18} strokeWidth={1.7} />
                    </span>
                    <span className="grow stack">
                      <span>
                        {KIND[p.kind]} · {METHOD_LABEL[p.method]}
                      </span>
                      <span className="t-cap muted">
                        <span className="t-mono">{p.receiptNo}</span> · {fmtDate(new Date(p.at))}, {fmtTime(new Date(p.at))}
                      </span>
                    </span>
                    <span className="tabular" style={{ fontWeight: 500 }}>
                      {money(p.amount)}
                    </span>
                    <ChevronRight size={18} className="row-chevron" />
                  </Link>
                ))}
              </div>
            ) : (
              <p className="adm-card-foot muted" style={{ justifyContent: "flex-start" }}>
                No payments yet. Each payment you record gets a numbered receipt.
              </p>
            )}
          </section>

          <section className="adm-card" aria-labelledby="pieces">
            <CardHead id="pieces" title="Items" />
            <div className="adm-card-body stack gap-12">
              {order.items.map((item) => {
                const s = styleById(item.styleId);
                return (
                  <div key={item.id} className="kv">
                    <span className="stack">
                      <span style={{ fontWeight: 500 }}>
                        {s?.name ?? "Custom order"} {item.qty > 1 ? `× ${item.qty}` : ""}
                      </span>
                      <span className="t-cap muted">
                        {itemSummary(item, s)} · {money(item.unitPrice)} each
                      </span>
                    </span>
                    <span>{money(item.unitPrice * item.qty)}</span>
                  </div>
                );
              })}
              {order.comments && (
                <>
                  <div className="divider" style={{ margin: 0 }} />
                  <div className="stack gap-4">
                    <span className="t-cap muted">Client's note</span>
                    <p className="adm-note">{order.comments}</p>
                  </div>
                </>
              )}
            </div>
          </section>

          <section className="adm-card" aria-labelledby="history">
            <CardHead id="history" title="History" />
            <div className="adm-card-body timeline">
              {history.map((h, i) => (
                <div key={`${h.status}-${h.at}`} className={`tl-step ${i === 0 ? "is-current" : "is-done"}`}>
                  <span className="tl-dot" aria-hidden="true">
                    {i > 0 && <Check size={13} strokeWidth={3} />}
                  </span>
                  <span className="tl-label">{OWNER_STAGE_LABEL[h.status]}</span>
                  <span className="t-cap muted" style={{ lineHeight: "24px" }}>
                    {fmtDayShort(new Date(h.at))}, {fmtTime(new Date(h.at))}
                  </span>
                </div>
              ))}
            </div>
          </section>

          {live && (
            <button className="adm-link" style={{ alignSelf: "flex-start", color: "var(--danger)", padding: "4px 0" }} onClick={() => actions.open(order.id, "cancel")}>
              <Ban size={15} /> Cancel this order
            </button>
          )}
        </motion.div>

        <aside className="adm-detail-aside adm-stack" aria-label="Client">
          {customer ? (
            <section className="adm-card">
              <div className="adm-card-body stack gap-12" style={{ paddingTop: 18 }}>
                <Link to={`/admin/clients/${customer.id}`} className="inline" style={{ gap: 12 }}>
                  <Avatar name={customer.name} size={44} />
                  <span className="stack" style={{ minWidth: 0 }}>
                    <span className="t-title truncate">{customer.name}</span>
                    <span className="t-cap muted">
                      {customer.town} · {SOURCE_LABEL[customer.source ?? "app"]}
                    </span>
                  </span>
                </Link>
                <p className="tabular">{formatGhPhone(customer.phone)}</p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  <a className="btn btn-soft btn-sm" href={whatsappLink(customer.phone, `Hi ${customer.name.split(" ")[0]}, it's ${STUDIO.name} about your order ${order.number}.`)} target="_blank" rel="noreferrer">
                    <MessageCircle size={15} /> WhatsApp
                  </a>
                  <a className="btn btn-soft btn-sm" href={telLink(customer.phone)}>
                    <Phone size={15} /> Call
                  </a>
                </div>
              </div>
              {customer.notes && (
                <Link to={`/admin/clients/${customer.id}?tab=notebook`} className="adm-card-foot" style={{ alignItems: "flex-start", justifyContent: "flex-start", gap: 10 }}>
                  <NotebookPen size={16} style={{ flex: "none", marginTop: 2 }} />
                  <span className="stack" style={{ minWidth: 0 }}>
                    <span className="t-cap muted">Your notebook</span>
                    <span className="res-snippet" style={{ marginTop: 0, color: "var(--ink)" }}>
                      {customer.notes}
                    </span>
                  </span>
                </Link>
              )}
            </section>
          ) : null}

          <section className="adm-card" aria-labelledby="kitchen">
            <CardHead id="kitchen" title="Brief" action={<span className="adm-meta">{PLAN_LABEL[order.designPlan]}</span>} />
            <div className="adm-card-body stack gap-12">
              {customer?.dietary && (
                <p className="banner is-sand" style={{ margin: 0 }}>
                  <span className="inline" style={{ gap: 8, fontWeight: 500 }}>
                    <TriangleAlert size={16} /> {customer.dietary}
                  </span>
                </p>
              )}
              {order.designNotes ? (
                <div className="stack gap-4">
                  <span className="inline t-cap muted" style={{ gap: 6 }}>
                    <Palette size={14} /> Design
                  </span>
                  <p className="adm-note">{order.designNotes}</p>
                </div>
              ) : (
                <p className="muted">Classic finish, no design notes.</p>
              )}
              {order.items.some((item) => item.message) && (
                <div className="stack gap-4">
                  <span className="t-cap muted">Written on the cake</span>
                  {order.items
                    .filter((item) => item.message)
                    .map((item) => (
                      <p key={item.id} className="adm-note">
                        “{item.message}” <span className="t-cap muted">· {styleById(item.styleId)?.name}</span>
                      </p>
                    ))}
                </div>
              )}
            </div>
          </section>

          {visits.length > 0 && (
            <section className="adm-card" aria-labelledby="order-visits">
              <CardHead id="order-visits" title="Pickup and fittings" />
              <div className="adm-rows" style={{ paddingBlock: "4px 8px" }}>
                {visits.map((a) => {
                  const start = parseLocal(a.start);
                  return (
                    <div key={a.id} className="adm-row">
                      <span className="row-icon">
                        <CalendarDays size={17} strokeWidth={1.7} />
                      </span>
                      <span className="grow stack">
                        <span>{PURPOSE_LABEL[a.purpose]}</span>
                        <span className="t-cap muted">
                          {fmtDay(start)}, {fmtTime(start)}
                        </span>
                      </span>
                      <span className="t-cap muted">{a.status === "requested" ? "To confirm" : a.status === "done" ? "Done" : a.status === "cancelled" ? "Cancelled" : "Booked"}</span>
                    </div>
                  );
                })}
              </div>
            </section>
          )}
        </aside>
      </div>
      {actions.sheets}
    </AdminPage>
  );
}

export function AdminReceipt() {
  const { orderId, paymentId } = useParams();
  const data = useAppData();
  const notify = useNotify();
  const order = data.orders.find((o) => o.id === orderId);
  const payment = order?.payments.find((p) => p.id === paymentId);
  if (!order || !payment) {
    return (
      <AdminPage title="Receipt not found" back={{ to: order ? `/admin/orders/${order.id}` : "/admin/payments", label: order ? order.number : "Payments" }}>
        <EmptyState icon={<CircleAlert size={22} />} title="We couldn't find that receipt" body="Open it from the order's payments." />
      </AdminPage>
    );
  }
  const customer = customerById(data, order.customerId);
  const share = async () => {
    const text = receiptShareText(order, payment);
    try {
      if (navigator.share) await navigator.share({ title: `Receipt ${payment.receiptNo}`, text });
      else {
        await navigator.clipboard.writeText(text);
        notify("Receipt copied", "Paste it into WhatsApp for the client.");
      }
    } catch {
      /* share sheet closed */
    }
  };
  return (
    <AdminPage
      title="Receipt"
      barTitle={payment.receiptNo}
      back={{ to: `/admin/orders/${order.id}`, label: order.number }}
      status={<span className="t-mono">{payment.receiptNo}</span>}
      actions={
        <span className="inline no-print" style={{ gap: 8 }}>
          <Button icon={<Share2 size={16} />} onClick={share}>
            Share
          </Button>
          <Button variant="dark" icon={<Printer size={16} />} onClick={() => window.print()}>
            Print
          </Button>
        </span>
      }
    >
      <div style={{ maxWidth: 640 }}>
        <ReceiptDoc order={order} payment={payment} customer={customer} />
      </div>
    </AdminPage>
  );
}
