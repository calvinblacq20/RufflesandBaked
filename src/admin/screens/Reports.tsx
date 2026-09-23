import { Link } from "react-router-dom";
import { useMemo } from "react";
import { customerById, useAppData } from "../../data/store";
import { money, plural } from "../../lib/format";
import { bucketsFor, compactMoney, kpi, leadSources, metricSeries, occasionShares, paymentsByMethod, periodLabel, periodRange, topClients, topStyles, type MetricId } from "../../lib/metrics";
import { LegendLine, LineChart, RankTable, SegmentedBar, Sparkline } from "../charts";
import { CardHead, DeltaPill, PeriodSelect, formatMetric } from "../controls";
import { useFirstVisit, useNow } from "../hooks";
import { AdminPage } from "../Shell";
import { METHOD_COLOR } from "./Payments";
import { INK, TrendCard, usePeriod } from "./Today";

const REPORT_METRICS: MetricId[] = ["newOrders", "collected", "avgOrder", "onTime"];
const SPARK_METRICS: MetricId[] = ["cash", "owed", "newOrders", "onTime"];
const SLATE = "#8a5a6a";

export function Reports() {
  const data = useAppData();
  const now = useNow();
  const [period, setPeriod] = usePeriod();
  const first = useFirstVisit("reports");
  const range = periodRange(period, now);
  const buckets = bucketsFor(period, range);
  const sparks = useMemo(() => SPARK_METRICS.map((m) => kpi(m, data.orders, period, now)), [data.orders, period, now]);
  const taken = useMemo(() => metricSeries("newOrders", data.orders, buckets, now), [data.orders, period, now]);
  const collected = useMemo(() => metricSeries("collected", data.orders, buckets, now), [data.orders, period, now]);
  const methods = paymentsByMethod(data.orders, range);
  const clients = topClients(data.orders, data.customers, range).slice(0, 6);
  const occasions = occasionShares(data.orders, range).slice(0, 6);
  const sources = leadSources(data.orders, data.customers, range);
  const styles = topStyles(data.orders, range).slice(0, 8);

  return (
    <AdminPage title="Reports" status={<>{periodLabel(period)} compared with the period before</>} actions={<PeriodSelect value={period} onChange={setPeriod} />}>
      <div className="adm-stack">
        <TrendCard ids={REPORT_METRICS} period={period} id="reports" />

        <div className="adm-grid adm-report">
          <section className="adm-card" aria-label="Key numbers">
            {sparks.map((k, i) => (
              <div key={k.def.id} className="between" style={{ padding: "16px 20px", borderTop: i ? "1px solid var(--ink-06)" : undefined, alignItems: "flex-end" }}>
                <span className="stack" style={{ gap: 2, minWidth: 0 }}>
                  <span className="adm-meta">{k.def.label}</span>
                  <span style={{ fontSize: 24, fontWeight: 500, letterSpacing: "-0.02em", fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>{formatMetric(k.value, k.def.format, true)}</span>
                  <DeltaPill delta={k.delta} />
                </span>
                <Sparkline values={k.series} label={`${k.def.label} trend`} width={84} height={34} />
              </div>
            ))}
          </section>

          <div className="adm-stack">
            <section className="adm-card" aria-labelledby="flow">
              <CardHead id="flow" title="Orders taken and collected" action={<LegendLine items={[{ label: "Taken", color: INK }, { label: "Collected", color: SLATE }]} />} />
              <div className="adm-card-body">
                <LineChart
                  animate={first}
                  dataKey={period}
                  height={220}
                  labels={buckets.map((b) => b.label)}
                  format={(n) => plural(n, "order")}
                  axisFormat={String}
                  ariaLabel={`Orders taken and collected, ${periodLabel(period).toLowerCase()}: ${taken.reduce<number>((s, v) => s + (v ?? 0), 0)} taken, ${collected.reduce<number>((s, v) => s + (v ?? 0), 0)} collected.`}
                  emptyText="No orders in this period"
                  series={[
                    { label: "Taken", values: taken, color: INK },
                    { label: "Collected", values: collected, color: SLATE },
                  ]}
                />
              </div>
            </section>
            <section className="adm-card" aria-labelledby="methods">
              <CardHead id="methods" title="Payments by method" action={<Link className="adm-link" to={`/admin/payments${period === "30d" ? "" : `?period=${period}`}`}>All payments</Link>} />
              <div className="adm-card-body">
                <SegmentedBar animate={first} format={money} ariaLabel={`Payments by method: ${methods.map((m) => `${m.label} ${Math.round(m.share * 100)}%`).join(", ")}`} parts={methods.map((m) => ({ key: m.key, label: m.label, value: m.value, share: m.share, color: METHOD_COLOR[m.key] }))} />
              </div>
            </section>
          </div>

          <div className="adm-stack adm-report-side">
            <section className="adm-card" aria-labelledby="clients">
              <CardHead id="clients" title="Top clients" />
              {clients.length ? (
                <div className="adm-rows" style={{ paddingBlock: "4px 8px" }}>
                  {clients.map((c) => (
                    <Link key={c.customer.id} to={`/admin/clients/${c.customer.id}`} className="adm-row" style={{ minHeight: 52 }}>
                      <span className="grow stack">
                        <span className="truncate">{customerById(data, c.customer.id)?.name}</span>
                        <span className="t-cap muted">{plural(c.orders, "order")}</span>
                      </span>
                      <span className="tabular" style={{ fontWeight: 500 }}>
                        {compactMoney(c.amount)}
                      </span>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="adm-card-body muted">No payments in this period.</p>
              )}
            </section>
            <section className="adm-card" aria-labelledby="occasions">
              <CardHead id="occasions" title="Occasions" />
              <div className="adm-card-body">
                <RankTable nameLabel="Occasion" valueLabel="Orders" empty="No orders in this period." rows={occasions.map((o) => ({ key: o.key, name: o.label, value: o.value, share: o.share }))} />
              </div>
            </section>
          </div>
        </div>

        <div className="adm-grid adm-grid-2">
          <section className="adm-card" aria-labelledby="top-styles">
            <CardHead id="top-styles" title="Top styles" />
            <div className="adm-card-body">
              <RankTable nameLabel="Style" valueLabel="Orders" empty="No orders in this period." rows={styles.map((s) => ({ key: s.key, name: s.label, value: s.value, share: s.share }))} />
            </div>
          </section>
          <section className="adm-card" aria-labelledby="lead">
            <CardHead id="lead" title="How clients found the studio" />
            <div className="adm-card-body">
              <RankTable nameLabel="Source" valueLabel="Orders" empty="No orders in this period." rows={sources.map((s) => ({ key: s.key, name: s.label, value: s.value, share: s.share }))} />
            </div>
          </section>
        </div>
      </div>
    </AdminPage>
  );
}
