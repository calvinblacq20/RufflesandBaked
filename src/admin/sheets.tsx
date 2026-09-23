import { Copy, MessageCircle } from "lucide-react";
import { useEffect, useId, useState, type FormEvent, type ReactNode } from "react";
import { Button } from "../components/Button";
import { useNotify } from "../components/Notify";
import { Sheet } from "../components/Sheet";
import { studio } from "../data/store";
import type { Customer, Order, OrderStatus, PaymentMethod } from "../data/types";
import { whatsappLink } from "../lib/contact";
import { money } from "../lib/format";
import { balanceDue, paidTotal, STAGES } from "../lib/orders";
import { OWNER_STAGE_LABEL, orderTitle, updateMessage } from "../lib/studio";

const METHODS: { id: PaymentMethod; label: string }[] = [
  { id: "momo", label: "MoMo" },
  { id: "cash", label: "Cash" },
  { id: "bank", label: "Bank" },
  { id: "card", label: "Card" },
];

const parseAmount = (value: string) => Number(value.replace(/[^\d.]/g, ""));

function OrderLine({ order, customer }: { order: Order; customer?: Customer }) {
  return (
    <p className="muted" style={{ marginTop: -8, marginBottom: 16 }}>
      {order.number} · {orderTitle(order)}
      {customer ? ` · ${customer.name}` : ""}
    </p>
  );
}

export function RecordPaymentSheet({ order, customer, open, onClose, onRecorded }: { order: Order; customer?: Customer; open: boolean; onClose: () => void; onRecorded?: (receiptNo: string) => void }) {
  const notify = useNotify();
  const id = useId();
  const balance = balanceDue(order);
  const suggested = balance;
  const half = Math.round(balance / 20) * 10;
  const [amount, setAmount] = useState(String(suggested));
  const [method, setMethod] = useState<PaymentMethod>("momo");
  const [reference, setReference] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setAmount(String(suggested));
    setMethod("momo");
    setReference("");
    setError(null);
  }, [open, suggested]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const result = studio.recordPayment(order.id, { amount: parseAmount(amount), method, reference: method === "cash" ? undefined : reference });
    if ("error" in result) {
      setError(result.error);
      return;
    }
    onClose();
    notify("Payment recorded", `${money(result.payment.amount)} from ${customer?.name ?? order.number}. Receipt ${result.payment.receiptNo}.`);
    onRecorded?.(result.payment.receiptNo);
  };

  return (
    <Sheet open={open} onClose={onClose} title="Record payment">
      <OrderLine order={order} customer={customer} />
      <form className="stack gap-16" onSubmit={submit} noValidate>
        <div className="kv">
          <span className="muted">Order total</span>
          <span>{money(order.total)}</span>
        </div>
        <div className="kv" style={{ marginTop: -8 }}>
          <span className="muted">Balance</span>
          <span style={{ fontWeight: 500 }}>{money(balance)}</span>
        </div>
        <div className="stack gap-8">
          <label htmlFor={`${id}-amount`} className="t-cap muted">
            Amount received (GH₵)
          </label>
          <input id={`${id}-amount`} className="adm-input" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-error` : undefined} />
          <div className="inline" style={{ gap: 6, flexWrap: "wrap" }}>
            <button type="button" className="btn btn-soft btn-sm" onClick={() => setAmount(String(balance))}>
              {paidTotal(order) === 0 ? "Full amount" : "Full balance"} {money(balance)}
            </button>
            {half > 0 && half < balance && (
              <button type="button" className="btn btn-soft btn-sm" onClick={() => setAmount(String(half))}>
                Half {money(half)}
              </button>
            )}
          </div>
        </div>
        <div className="stack gap-8">
          <span className="t-cap muted" id={`${id}-method`}>
            Paid by
          </span>
          <div className="segmented" role="radiogroup" aria-labelledby={`${id}-method`}>
            {METHODS.map((m) => (
              <button key={m.id} type="button" role="radio" aria-checked={method === m.id} className={method === m.id ? "is-active" : ""} onClick={() => setMethod(m.id)}>
                {m.label}
              </button>
            ))}
          </div>
        </div>
        {method !== "cash" && (
          <div className="stack gap-8">
            <label htmlFor={`${id}-ref`} className="t-cap muted">
              {method === "momo" ? "MoMo transaction ID (optional)" : "Reference (optional)"}
            </label>
            <input id={`${id}-ref`} className="adm-input" value={reference} maxLength={40} onChange={(e) => setReference(e.target.value)} placeholder={method === "momo" ? "e.g. 58830211" : ""} />
          </div>
        )}
        {error && (
          <p id={`${id}-error`} className="adm-form-error" role="alert">
            {error}
          </p>
        )}
        <Button variant="dark" block type="submit" disabled={balance <= 0}>
          Record {parseAmount(amount) > 0 ? money(parseAmount(amount)) : "payment"}
        </Button>
        <p className="t-cap muted" style={{ textAlign: "center", marginTop: -6 }}>
          A numbered official receipt is created straight away.
        </p>
      </form>
    </Sheet>
  );
}

export function QuoteSheet({ order, customer, open, onClose, onSent }: { order: Order; customer?: Customer; open: boolean; onClose: () => void; onSent: () => void }) {
  const id = useId();
  const [price, setPrice] = useState(String(order.total));
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (open) {
      setPrice(String(order.total));
      setError(null);
    }
  }, [open, order.total]);
  const value = parseAmount(price);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const result = studio.sendQuote(order.id, value);
    if ("error" in result) {
      setError(result.error);
      return;
    }
    onClose();
    onSent();
  };

  return (
    <Sheet open={open} onClose={onClose} title="Send quote">
      <OrderLine order={order} customer={customer} />
      <form className="stack gap-16" onSubmit={submit} noValidate>
        <div className="stack gap-8">
          <label htmlFor={`${id}-price`} className="t-cap muted">
            Agreed price (GH₵)
          </label>
          <input id={`${id}-price`} className="adm-input" inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} aria-invalid={Boolean(error)} autoFocus />
          <p className="t-cap muted">The app estimated {money(order.total)} from the price list, finish and design. Add the design work, toppers or extra tiers here.</p>
        </div>
        {value > 0 && (
          <div className="kv">
            <span className="muted">Full payment books the date</span>
            <span style={{ fontWeight: 500 }}>{money(Math.max(0, value - paidTotal(order)))} to pay</span>
          </div>
        )}
        {error && (
          <p className="adm-form-error" role="alert">
            {error}
          </p>
        )}
        <Button variant="dark" block type="submit">
          Save and write the WhatsApp message
        </Button>
      </form>
    </Sheet>
  );
}

export function UpdateSheet({ order, customer, open, onClose, title = "Send WhatsApp update" }: { order: Order; customer?: Customer; open: boolean; onClose: () => void; title?: string }) {
  const notify = useNotify();
  const id = useId();
  const [text, setText] = useState("");
  useEffect(() => {
    if (open) setText(updateMessage(order, customer, new Date()));
  }, [open, order, customer]);

  const sent = () => {
    studio.markUpdateSent(order.id);
    onClose();
    notify("WhatsApp opened", `Update for ${order.number} is ready to send to ${customer?.name ?? "the client"}.`);
  };
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      notify("Message copied", "Paste it into WhatsApp.");
    } catch (error) {
      console.warn("Clipboard not available", error);
      notify("Couldn't copy", "Select the message and copy it by hand.");
    }
  };

  return (
    <Sheet open={open} onClose={onClose} title={title}>
      <OrderLine order={order} customer={customer} />
      <div className="stack gap-12">
        <label htmlFor={`${id}-msg`} className="t-cap muted">
          Message to {customer?.name ?? "client"} · you can edit it
        </label>
        <textarea id={`${id}-msg`} className="adm-textarea msg-preview" style={{ minHeight: 180 }} value={text} onChange={(e) => setText(e.target.value)} maxLength={1000} />
        <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: 8 }}>
          <Button type="button" onClick={copy} icon={<Copy size={16} />}>
            Copy
          </Button>
          {customer ? (
            <a className="btn btn-dark" href={whatsappLink(customer.phone, text)} target="_blank" rel="noreferrer" onClick={sent}>
              <MessageCircle size={17} /> Open in WhatsApp
            </a>
          ) : (
            <Button variant="dark" disabled>
              No phone number on file
            </Button>
          )}
        </div>
        <p className="t-cap muted">WhatsApp opens with this message filled in. Nothing is sent until you press send there.</p>
      </div>
    </Sheet>
  );
}

export function StageSheet({ order, open, onClose, onMoved }: { order: Order; open: boolean; onClose: () => void; onMoved: (status: OrderStatus) => void }) {
  const [choice, setChoice] = useState<OrderStatus>(order.status);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (open) {
      setChoice(order.status);
      setError(null);
    }
  }, [open, order.status]);
  const owes = balanceDue(order) > 0;

  const save = () => {
    if (choice === order.status || choice === "cancelled") return onClose();
    const result = studio.moveTo(order.id, choice, new Date(), { allowOwing: true });
    if ("error" in result) {
      setError(result.error);
      return;
    }
    onClose();
    onMoved(choice);
  };

  return (
    <Sheet open={open} onClose={onClose} title="Change stage">
      <div className="stack">
        {STAGES.map((stage) => (
          <label key={stage} className="check-row" style={{ minHeight: 44 }}>
            <input type="radio" className="rdo" name={`stage-${order.id}`} checked={choice === stage} onChange={() => setChoice(stage)} />
            <span>{OWNER_STAGE_LABEL[stage]}</span>
            {stage === order.status && <span className="count">Now</span>}
          </label>
        ))}
      </div>
      {choice === "collected" && owes && (
        <p className="banner is-sand" style={{ marginTop: 12 }}>
          This order still owes {money(balanceDue(order))}. Record the payment first if the client has paid.
        </p>
      )}
      {error && (
        <p className="adm-form-error" role="alert" style={{ marginTop: 12 }}>
          {error}
        </p>
      )}
      <Button variant="dark" block onClick={save} style={{ marginTop: 16 }}>
        {choice === order.status ? "Keep as it is" : `Move to ${OWNER_STAGE_LABEL[choice]}`}
      </Button>
    </Sheet>
  );
}

export function ConfirmSheet({ open, onClose, title, body, confirmLabel, onConfirm, danger, children }: { open: boolean; onClose: () => void; title: string; body: string; confirmLabel: string; onConfirm: () => void; danger?: boolean; children?: ReactNode }) {
  return (
    <Sheet open={open} onClose={onClose} title={title}>
      <p className="muted">{body}</p>
      {children}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 20 }}>
        <Button block onClick={onClose}>
          Go back
        </Button>
        <Button variant={danger ? "danger" : "dark"} block onClick={onConfirm}>
          {confirmLabel}
        </Button>
      </div>
    </Sheet>
  );
}
