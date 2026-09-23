import { ChevronRight, ReceiptText } from "lucide-react";
import { useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Skeleton } from "../../components/Bits";
import { customerById, useAppData } from "../../data/store";
import type { PaymentMethod } from "../../data/types";
import { fmtDate, fmtDayShort, fmtTime, money, plural } from "../../lib/format";
import { PAGE_SIZE } from "../../lib/filters";
import { delta, metricValue, owedAt, paymentsByMethod, periodLabel, periodRange, previousRange } from "../../lib/metrics";
import { METHOD_LABEL } from "../../lib/studio";
import { SegmentedBar } from "../charts";
import { CardHead, DeltaPill, PeriodSelect } from "../controls";
import { useFirstLoad, useFirstVisit, useNow } from "../hooks";
import { AdminPage, EmptyState } from "../Shell";
import { usePeriod } from "./Today";

export const METHOD_COLOR: Record<PaymentMethod, string> = { momo: "#e9c67e", cash: "#cadfef", bank: "#d6bde8", card: "#e8d2ae" };
const KIND = { full: "Full", part: "Part", final: "Final" } as const;

export function Payments() {
  const data = useAppData();
  const now = useNow();
  const navigate = useNavigate();
  const [period, setPeriod] = usePeriod();
  const [params, setParams] = useSearchParams();
  const loading = useFirstLoad("payments");
  const first = useFirstVisit("payments");
  const method = (["momo", "cash", "bank", "card"] as const).find((m) => m === params.get("method")) ?? null;
  const [query, setQuery] = useState("");
  const [limit, setLimit] = useState(PAGE_SIZE);

  const range = periodRange(period, now);
  const prev = previousRange(period, range);
  const all = useMemo(
    () =>
      data.orders
        .flatMap((order) => order.payments.map((payment) => ({ order, payment })))
        .filter(({ payment }) => {
          const t = new Date(payment.at);
          return t >= range.start && t < range.end;
        })
        .sort((a, b) => b.payment.at.localeCompare(a.payment.at)),
    [data.orders, period, now],
  );
  const q = query.trim().toLowerCase();
  const rows = all.filter(({ order, payment }) => {
    if (method && payment.method !== method) return false;
    if (!q) return true;
    const name = customerById(data, order.customerId)?.name.toLowerCase() ?? "";
    return name.includes(q) || payment.receiptNo.toLowerCase().includes(q) || order.number.toLowerCase().includes(q) || payment.reference.toLowerCase().includes(q);
  });
  const total = metricValue("cash", data.orders, range, now) ?? 0;
  const prevTotal = metricValue("cash", data.orders, prev, now) ?? 0;
  const methods = paymentsByMethod(data.orders, range);
  const owed = owedAt(data.orders, now);

  const setMethod = (m: PaymentMethod | null) => {
    setParams(
      (p) => {
        const next = new URLSearchParams(p);
        if (m) next.set("method", m);
        else next.delete("method");
        return next;
      },
      { replace: true },
    );
    setLimit(PAGE_SIZE);
  };

  return (
    <AdminPage title="Payments" status={<>{periodLabel(period)} · {plural(all.length, "payment")}</>} actions={<PeriodSelect value={period} onChange={setPeriod} />}>
      <div className="adm-grid adm-grid-2" style={{ marginBottom: 16 }}>
        <section className="adm-card" aria-labelledby="received">
          <CardHead id="received" title="Received" action={<DeltaPill delta={delta(total, prevTotal, "up")} />} />
          <div className="adm-card-body">
            <p className="adm-big" style={{ fontSize: 48, color: "var(--ink)" }}>
              {money(total)}
            </p>
            <dl className="adm-kv-grid" style={{ marginTop: 16 }}>
              <div>
                <dt>Previous period</dt>
                <dd>{money(prevTotal)}</dd>
              </div>
              <div>
                <dt>Still owed on open orders</dt>
                <dd style={{ color: owed ? "var(--warning-ink)" : undefined }}>{money(owed)}</dd>
              </div>
              <div>
                <dt>Payments</dt>
                <dd>{all.length}</dd>
              </div>
              <div>
                <dt>Average payment</dt>
                <dd>{money(all.length ? Math.round(total / all.length) : 0)}</dd>
              </div>
            </dl>
          </div>
        </section>
        <section className="adm-card" aria-labelledby="by-method">
          <CardHead id="by-method" title="By method" />
          <div className="adm-card-body">
            <SegmentedBar animate={first} format={money} ariaLabel={`Payments by method: ${methods.map((m) => `${m.label} ${Math.round(m.share * 100)}%`).join(", ")}`} parts={methods.map((m) => ({ key: m.key, label: `${m.label} · ${plural(m.count, "payment")}`, value: m.value, share: m.share, color: METHOD_COLOR[m.key] }))} />
          </div>
        </section>
      </div>

      <div className="between" style={{ flexWrap: "wrap", marginBottom: 12 }}>
        <div className="chips" role="radiogroup" aria-label="Method" style={{ margin: 0 }}>
          <button role="radio" aria-checked={!method} className={`chip ${!method ? "is-active" : ""}`} onClick={() => setMethod(null)}>
            All
          </button>
          {(["momo", "cash", "bank", "card"] as const).map((m) => (
            <button key={m} role="radio" aria-checked={method === m} className={`chip ${method === m ? "is-active" : ""}`} onClick={() => setMethod(m)}>
              {METHOD_LABEL[m]}
            </button>
          ))}
        </div>
        <input className="adm-input" style={{ maxWidth: 320, height: 40, background: "var(--surface)", boxShadow: "var(--sh-soft)", borderRadius: 500 }} type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Client, receipt or order number" aria-label="Search payments" />
      </div>

      {loading ? (
        <Skeleton h={420} r={8} />
      ) : rows.length === 0 ? (
        <div className="adm-card">
          <EmptyState icon={<ReceiptText size={22} />} title="No payments match" body={all.length ? "Try another method or search." : "Nothing was received in this period."} />
        </div>
      ) : (
        <section className="adm-card" aria-label="Payments list">
          <div className="adm-table-wrap desktop-only">
            <table className="adm-table">
              <thead>
                <tr>
                  <th scope="col">Date</th>
                  <th scope="col">Receipt</th>
                  <th scope="col">Client</th>
                  <th scope="col">Order</th>
                  <th scope="col">Method</th>
                  <th scope="col">Type</th>
                  <th scope="col" className="num">
                    Amount
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, limit).map(({ order, payment }) => {
                  const at = new Date(payment.at);
                  const to = `/admin/orders/${order.id}/receipts/${payment.id}`;
                  return (
                    <tr key={payment.id} onClick={() => navigate(to)}>
                      <td>
                        {fmtDayShort(at)}, {fmtTime(at)}
                      </td>
                      <td>
                        <Link to={to} className="t-mono" onClick={(e) => e.stopPropagation()}>
                          {payment.receiptNo}
                        </Link>
                      </td>
                      <td>{customerById(data, order.customerId)?.name}</td>
                      <td className="t-mono">{order.number}</td>
                      <td>
                        <span className="inline" style={{ gap: 8 }}>
                          <i className="swatch" style={{ background: METHOD_COLOR[payment.method] }} aria-hidden="true" />
                          {METHOD_LABEL[payment.method]}
                        </span>
                      </td>
                      <td>{KIND[payment.kind]}</td>
                      <td className="num" style={{ fontWeight: 500 }}>
                        {money(payment.amount)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="adm-rows mobile-only" style={{ paddingBlock: 4 }}>
            {rows.slice(0, limit).map(({ order, payment }) => (
              <Link key={payment.id} to={`/admin/orders/${order.id}/receipts/${payment.id}`} className="adm-row">
                <span className="grow stack">
                  <span className="truncate">{customerById(data, order.customerId)?.name}</span>
                  <span className="t-cap muted">
                    {fmtDate(new Date(payment.at))} · {METHOD_LABEL[payment.method]} · <span className="t-mono">{order.number}</span>
                  </span>
                </span>
                <span className="tabular" style={{ fontWeight: 500 }}>
                  {money(payment.amount)}
                </span>
                <ChevronRight size={18} className="row-chevron" />
              </Link>
            ))}
          </div>
          <div className="adm-card-foot">
            <span className="adm-meta">
              Showing {Math.min(limit, rows.length)} of {rows.length}
            </span>
            {limit < rows.length && (
              <button className="btn btn-outline btn-sm" onClick={() => setLimit((l) => l + PAGE_SIZE)}>
                Load more
              </button>
            )}
          </div>
        </section>
      )}
    </AdminPage>
  );
}
