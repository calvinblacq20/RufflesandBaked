import { motion } from "motion/react";
import { POLICIES, STUDIO } from "../data/business";
import { styleById } from "../data/catalog";
import type { Customer, Order, Payment, PaymentMethod } from "../data/types";
import { formatGhPhone } from "../lib/contact";
import { fmtDate, fmtTime, money } from "../lib/format";
import { itemSummary } from "../lib/items";
import { amountInWords, verifyCode } from "../lib/receipts";
import { enter } from "../motion";
import { AppIcon, LogoMark } from "./Brand";

const METHOD_LABEL: Record<PaymentMethod, string> = { momo: "Mobile Money", card: "Card", cash: "Cash", bank: "Bank transfer" };
export const KIND_LABEL = { full: "Payment in full", part: "Part payment", final: "Final payment" } as const;

/** The running totals printed on a receipt, as they stood when this payment came in. */
export function receiptFigures(order: Order, payment: Payment) {
  const ordered = [...order.payments].sort((a, b) => a.at.localeCompare(b.at));
  const index = ordered.findIndex((p) => p.id === payment.id);
  const before = ordered.slice(0, index).reduce((s, p) => s + p.amount, 0);
  const paidToDate = before + payment.amount;
  const itemsTotal = order.items.reduce((s, i) => s + i.unitPrice * i.qty, 0);
  return {
    paid: new Date(payment.at),
    before,
    paidToDate,
    remaining: Math.max(0, order.total - paidToDate),
    code: verifyCode(payment.receiptNo, payment.amount),
    adjustment: order.total - itemsTotal,
  };
}

export function receiptShareText(order: Order, payment: Payment): string {
  const { paid, remaining, code } = receiptFigures(order, payment);
  return `${STUDIO.name} official receipt ${payment.receiptNo}\n${KIND_LABEL[payment.kind]}: ${money(payment.amount)}\nOrder ${order.number} · ${fmtDate(paid)}\nBalance remaining: ${money(remaining)}\nVerification: ${code}`;
}

/** The official receipt document, shared by the client's receipt page and the owner side. */
export function ReceiptDoc({ order, payment, customer }: { order: Order; payment: Payment; customer?: Customer }) {
  const { paid, before, paidToDate, remaining, code, adjustment } = receiptFigures(order, payment);
  return (
  <motion.article className="receipt" aria-label={`Official receipt ${payment.receiptNo}`} {...enter(24)}>
      <header className="receipt-head">
        <AppIcon size={48} />
        <div className="grow stack">
          <p className="t-title">{STUDIO.name}</p>
          <p className="subtle t-cap">{STUDIO.tagline}</p>
          <p className="subtle t-cap">{STUDIO.address}</p>
          <p className="subtle t-cap">Tel / WhatsApp {STUDIO.phone}</p>
        </div>
      </header>

      <div className="receipt-amount" style={{ marginTop: 20 }}>
        <div className="stack gap-4">
          <p className="receipt-label">Official receipt</p>
          <p className="t-num">{money(payment.amount)}</p>
          <p className="muted">
            {KIND_LABEL[payment.kind]} · received with thanks
          </p>
        </div>
        <div className="stamp" aria-hidden="true">
          <span>
            <b>PAID</b>
            {fmtDate(paid)}
          </span>
        </div>
      </div>

      <dl className="receipt-grid" style={{ marginTop: 20 }}>
        <div>
          <dt>Receipt no.</dt>
          <dd className="t-mono">{payment.receiptNo}</dd>
        </div>
        <div>
          <dt>Date and time</dt>
          <dd>
            {fmtDate(paid)}, {fmtTime(paid)}
          </dd>
        </div>
        <div>
          <dt>Order no.</dt>
          <dd className="t-mono">{order.number}</dd>
        </div>
        <div>
          <dt>Payment method</dt>
          <dd>
            {METHOD_LABEL[payment.method]}
            {payment.payer && payment.method === "momo" && (
              <span className="subtle t-cap" style={{ display: "block", fontWeight: 400 }}>
                {payment.payer}
              </span>
            )}
          </dd>
        </div>
        <div>
          <dt>Transaction ref.</dt>
          <dd className="t-mono">{payment.reference}</dd>
        </div>
        <div>
          <dt>Received by</dt>
          <dd>{payment.receivedBy}</dd>
        </div>
      </dl>

      <div className="divider" style={{ marginBlock: 18 }} />

      <div className="stack gap-4">
        <p className="receipt-label">Received from</p>
        <p className="t-title">{customer?.name ?? "Customer"}</p>
        {customer && (
          <p className="muted t-cap">
            {[formatGhPhone(customer.phone), customer.email, customer.town].filter(Boolean).join(" · ")}
          </p>
        )}
      </div>

      <table className="receipt-table" style={{ marginTop: 18 }}>
        <thead>
          <tr>
            <th scope="col">Description</th>
            <th scope="col" className="num">
              Qty
            </th>
            <th scope="col" className="num">
              Amount
            </th>
          </tr>
        </thead>
        <tbody>
          {order.items.map((item) => (
            <tr key={item.id}>
              <td>
                {styleById(item.styleId)?.name ?? "Custom order"}
                <span className="subtle t-cap" style={{ display: "block" }}>
                  {itemSummary(item, styleById(item.styleId))}
                </span>
              </td>
              <td className="num">{item.qty}</td>
              <td className="num">{money(item.unitPrice * item.qty)}</td>
            </tr>
          ))}
          {adjustment !== 0 && (
            <tr>
              <td>{adjustment > 0 ? (order.shortNotice ? "Late-order fee and extras" : "Extras") : "Discount"}</td>
              <td className="num" />
              <td className="num">{money(adjustment)}</td>
            </tr>
          )}
        </tbody>
      </table>

      <div className="stack" style={{ marginTop: 14, gap: 8, fontVariantNumeric: "tabular-nums" }}>
        <div className="kv">
          <span>Order total</span>
          <span>{money(order.total)}</span>
        </div>
        <div className="kv muted">
          <span>Paid before this receipt</span>
          <span>{money(before)}</span>
        </div>
        <div className="kv receipt-highlight" style={{ fontWeight: 600 }}>
          <span>This payment</span>
          <span>{money(payment.amount)}</span>
        </div>
        <div className="kv">
          <span>Total paid to date</span>
          <span>{money(paidToDate)}</span>
        </div>
        <div className="kv kv-total">
          <span>Balance remaining</span>
          <span>{money(remaining)}</span>
        </div>
      </div>

      <p className="muted t-cap" style={{ marginTop: 14 }}>
        <span className="subtle">Amount in words: </span>
        {amountInWords(payment.amount)}
      </p>

      <div className="perforation" aria-hidden="true" />

      <footer className="stack gap-12">
        <div className="between" style={{ alignItems: "flex-end" }}>
          <div className="stack gap-4">
            <span className="subtle t-cap">Verification code</span>
            <span className="t-mono" style={{ fontSize: 18, letterSpacing: "0.12em" }}>
              {code}
            </span>
          </div>
          <div className="stack" style={{ alignItems: "center", gap: 2 }}>
            <LogoMark size={34} />
            <span style={{ width: 120, height: 1, background: "var(--ink-25)" }} />
            <span className="subtle t-cap">Authorised signature</span>
          </div>
        </div>
        <p className="subtle t-cap">
          {POLICIES.payment} {POLICIES.handover}
        </p>
        <p className="t-cap" style={{ textAlign: "center" }}>
          Thank you for celebrating with {STUDIO.name}. Have a sweet day!
        </p>
      </footer>
    </motion.article>
  );
}
