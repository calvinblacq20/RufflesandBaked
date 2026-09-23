import { ArrowRight, Ban, ChevronRight, Ellipsis, ListOrdered, MapPin, MessageCircle, ReceiptText, Wallet } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { Badge, Photo } from "../components/Bits";
import { useNotify } from "../components/Notify";
import { Sheet } from "../components/Sheet";
import { occasionLabel, styleById } from "../data/catalog";
import { customerById, studio, useAppData } from "../data/store";
import type { Customer, Order } from "../data/types";
import { money } from "../lib/format";
import { balanceDue, isActive, paidTotal } from "../lib/orders";
import { OWNER_STAGE_LABEL, orderTitle, ownerBadge, ownerDateLine, ownerNextStep, type OwnerStep } from "../lib/studio";
import { ConfirmSheet, QuoteSheet, RecordPaymentSheet, StageSheet, UpdateSheet } from "./sheets";

type SheetKind = "payment" | "quote" | "update" | "stage" | "cancel" | "menu";

/**
 * One set of owner sheets for a whole screen. Cards call run() for their quick action or open() for a specific sheet.
 * The target order stays mounted after closing so the sheet can animate out.
 */
export function useOrderActions() {
  const data = useAppData();
  const notify = useNotify();
  const [orderId, setOrderId] = useState<string | null>(null);
  const [sheet, setSheet] = useState<SheetKind | null>(null);
  const order = orderId ? data.orders.find((o) => o.id === orderId) : undefined;
  const customer = order ? customerById(data, order.customerId) : undefined;

  const open = (id: string, kind: SheetKind) => {
    setOrderId(id);
    setSheet(kind);
  };
  const close = () => setSheet(null);

  const run = (target: Order, step: OwnerStep) => {
    const who = customerById(data, target.customerId)?.name ?? target.number;
    switch (step.kind) {
      case "quote":
        return open(target.id, "quote");
      case "payment":
        return open(target.id, "payment");
      case "advance": {
        if (!step.to) return;
        const result = studio.moveTo(target.id, step.to);
        if ("error" in result) return notify("Couldn't move the order", result.error);
        return notify(`Moved to ${OWNER_STAGE_LABEL[step.to]}`, `${target.number} for ${who}. Send an update from the order's menu.`);
      }
      case "collect": {
        const result = studio.moveTo(target.id, "collected");
        if ("error" in result) return notify("Couldn't mark it handed over", result.error);
        return notify(target.delivery === "delivery" ? "Marked delivered" : "Marked picked up", `${target.number} handed over to ${who}.`);
      }
    }
  };

  const sheets: ReactNode = order ? (
    <>
      <RecordPaymentSheet order={order} customer={customer} open={sheet === "payment"} onClose={close} />
      <QuoteSheet order={order} customer={customer} open={sheet === "quote"} onClose={close} onSent={() => window.setTimeout(() => open(order.id, "update"), 250)} />
      <UpdateSheet order={order} customer={customer} open={sheet === "update"} onClose={close} />
      <StageSheet order={order} open={sheet === "stage"} onClose={close} onMoved={(s) => notify(`Moved to ${OWNER_STAGE_LABEL[s]}`, `${order.number} for ${customer?.name ?? "the client"}.`)} />
      <ConfirmSheet
        open={sheet === "cancel"}
        onClose={close}
        danger
        title={`Cancel ${order.number}?`}
        body={paidTotal(order) > 0 ? `${customer?.name ?? "The client"} has paid ${money(paidTotal(order))}. Cancelling doesn't refund it; settle that with them directly.` : "The order moves to Cancelled and its pickup slot is released."}
        confirmLabel="Cancel order"
        onConfirm={() => {
          const result = studio.cancel(order.id);
          close();
          if ("error" in result) notify("Couldn't cancel", result.error);
          else notify("Order cancelled", `${order.number} is cancelled.`);
        }}
      />
      <OrderMenuSheet order={order} customer={customer} open={sheet === "menu"} onClose={close} onPick={(kind) => window.setTimeout(() => open(order.id, kind), 220)} />
    </>
  ) : null;

  return { run, open, sheets };
}

function OrderMenuSheet({ order, customer, open, onClose, onPick }: { order: Order; customer?: Customer; open: boolean; onClose: () => void; onPick: (kind: SheetKind) => void }) {
  const live = isActive(order);
  const pick = (kind: SheetKind) => {
    onClose();
    onPick(kind);
  };
  return (
    <Sheet open={open} onClose={onClose} title={`${order.number} · ${orderTitle(order)}`}>
      <nav className="list-card" style={{ margin: "-8px -20px 0" }} aria-label="Order actions">
        <button className="row" onClick={() => pick("update")} disabled={!customer}>
          <span className="row-icon is-gold">
            <MessageCircle size={18} strokeWidth={1.8} />
          </span>
          <span className="grow">Send WhatsApp update</span>
          <ChevronRight size={18} className="row-chevron" />
        </button>
        {live && balanceDue(order) > 0 && (
          <button className="row" onClick={() => pick("payment")}>
            <span className="row-icon">
              <Wallet size={18} strokeWidth={1.8} />
            </span>
            <span className="grow">Record payment</span>
            <ChevronRight size={18} className="row-chevron" />
          </button>
        )}
        {live && (
          <button className="row" onClick={() => pick("stage")}>
            <span className="row-icon">
              <ListOrdered size={18} strokeWidth={1.8} />
            </span>
            <span className="grow">Change stage</span>
            <ChevronRight size={18} className="row-chevron" />
          </button>
        )}
        <Link className="row" to={`/admin/orders/${order.id}`} onClick={onClose}>
          <span className="row-icon">
            <ReceiptText size={18} strokeWidth={1.8} />
          </span>
          <span className="grow">Open order and receipts</span>
          <ChevronRight size={18} className="row-chevron" />
        </Link>
        {live && (
          <button className="row" onClick={() => pick("cancel")}>
            <span className="row-icon">
              <Ban size={18} strokeWidth={1.8} />
            </span>
            <span className="grow">Cancel order</span>
            <ChevronRight size={18} className="row-chevron" />
          </button>
        )}
      </nav>
    </Sheet>
  );
}

export function MoneyTag({ order }: { order: Order }) {
  const owed = balanceDue(order);
  if (order.status === "cancelled") return null;
  if (order.status === "request") return <span className="money-tag">Est. {money(order.total)}</span>;
  if (owed === 0) return <span className="money-tag is-paid">Paid {money(order.total)}</span>;
  return <span className="money-tag is-owed">{money(owed)} owed</span>;
}

/** Result card (pattern D): the next thing the order needs is the one quick action. */
export function OrderCard({ order, customer, now, onStep, onMenu, showClient = true }: { order: Order; customer?: Customer; now: Date; onStep: (order: Order, step: OwnerStep) => void; onMenu: (order: Order) => void; showClient?: boolean }) {
  const style = styleById(order.items[0]?.styleId ?? "");
  const title = orderTitle(order);
  const badge = ownerBadge(order, now);
  const step = ownerNextStep(order);
  const date = ownerDateLine(order, now);
  const snippet = order.designNotes || order.comments || `${occasionLabel(order.occasion)}${order.delivery === "delivery" ? ` · delivery to ${order.deliveryTown ?? customer?.town ?? "client"}` : " · pickup"}${order.shortNotice ? " · late order" : ""}`;
  return (
    <article className="res-card">
      <Link className="res-card-link" to={`/admin/orders/${order.id}`} aria-label={`${title}${customer ? ` for ${customer.name}` : ""}, ${order.number}, ${badge.label}`} />
      <div className="res-thumb" aria-hidden="true">
        <Photo tone={style?.tone ?? "mist"} src={style?.photo} sizes="44px" height={44} radius={8} markSize={18} />
      </div>
      <div className="res-top">
        <p className="res-title grow">{title}</p>
        <button className="icon-btn is-plain res-menu" onClick={() => onMenu(order)} aria-label={`More actions for ${order.number}`}>
          <Ellipsis size={20} />
        </button>
      </div>
      <p className="res-sub">
        {showClient && customer && (
          <>
            <Link to={`/admin/clients/${customer.id}`}>{customer.name}</Link>
            {" · "}
          </>
        )}
        <span className="t-mono">{order.number}</span>
      </p>
      <div className="res-meta">
        {customer?.town && (
          <span className="inline" style={{ gap: 4 }}>
            <MapPin size={13} aria-hidden="true" />
            {customer.town}
          </span>
        )}
        <Badge tone={badge.tone}>{badge.label}</Badge>
        <MoneyTag order={order} />
      </div>
      <p className="res-snippet">{snippet}</p>
      <div className="res-foot">
        <span className={date.late ? "is-late" : "muted"}>{date.text}</span>
        {step && (
          <button className="res-action" onClick={() => onStep(order, step)}>
            {step.label} <ArrowRight size={15} aria-hidden="true" />
          </button>
        )}
      </div>
    </article>
  );
}

/** Compact card for the board view. */
export function BoardCard({ order, customer, now, onStep }: { order: Order; customer?: Customer; now: Date; onStep: (order: Order, step: OwnerStep) => void }) {
  const badge = ownerBadge(order, now);
  const step = ownerNextStep(order);
  const date = ownerDateLine(order, now);
  return (
    <article className="board-card">
      <Link className="res-card-link" to={`/admin/orders/${order.id}`} aria-label={`${orderTitle(order)}, ${order.number}`} />
      <div className="between" style={{ alignItems: "flex-start" }}>
        <p style={{ fontWeight: 500, lineHeight: 1.35 }}>{orderTitle(order)}</p>
        <span className="t-mono t-cap muted" style={{ flex: "none" }}>
          {order.number}
        </span>
      </div>
      <p className="t-cap muted">{customer?.name ?? "Client"}</p>
      <div className="res-meta" style={{ marginTop: 2 }}>
        {badge.tone === "sand" || badge.tone === "danger" ? <Badge tone={badge.tone}>{badge.label}</Badge> : null}
        <MoneyTag order={order} />
      </div>
      <div className="between t-cap" style={{ marginTop: 4 }}>
        <span className={date.late ? "is-late" : "muted"} style={date.late ? { color: "var(--warning-ink)", fontWeight: 500 } : undefined}>
          {date.text}
        </span>
      </div>
      {step && (
        <button className="btn btn-soft btn-sm" style={{ position: "relative", zIndex: 1, marginTop: 4 }} onClick={() => onStep(order, step)}>
          {step.label}
        </button>
      )}
    </article>
  );
}
