import { Columns3, Inbox, List, SlidersHorizontal, X } from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Skeleton } from "../../components/Bits";
import { Cta } from "../../components/Button";
import { Sheet } from "../../components/Sheet";
import { OCCASIONS } from "../../data/catalog";
import { customerById, useAppData } from "../../data/store";
import type { Customer, Occasion, Order } from "../../data/types";
import { addDays, dayKey, fmtTime, money, parseLocal, plural, startOfDay } from "../../lib/format";
import { activeFilterCount, DEFAULT_ORDER_FILTERS, DUE_OPTIONS, filterOrders, groupOf, orderFiltersToParams, PAGE_SIZE, parseOrderFilters, PAY_OPTIONS, SORT_OPTIONS, sortOrders, STAGE_GROUPS, stageCounts, type OrderFilters, type StageGroup } from "../../lib/filters";
import { balanceDue } from "../../lib/orders";
import { IN_PRODUCTION, orderTitle } from "../../lib/studio";
import { spring } from "../../motion";
import { ActionBanner, ActionCard, CardHead, CheckRow, RadioRow, RangeSlider } from "../controls";
import { Dropdown } from "../../components/Dropdown";
import { useDebounced, useFirstLoad, useNow } from "../hooks";
import { BoardCard, OrderCard, useOrderActions } from "../orderActions";
import { AdminPage, EmptyState } from "../Shell";
import { PURPOSE_LABEL } from "./Today";

const OWED_STEP = 100;

export function Orders() {
  const data = useAppData();
  const now = useNow();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const filters = useMemo(() => parseOrderFilters(params), [params]);
  const view = params.get("view") === "board" ? "board" : "list";
  const loading = useFirstLoad("orders");
  const actions = useOrderActions();
  const [limit, setLimit] = useState(PAGE_SIZE);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [remindOpen, setRemindOpen] = useState(false);
  const [query, setQuery] = useState(filters.q);
  const debounced = useDebounced(query);

  const apply = (next: OrderFilters, nextView = view) => {
    const p = orderFiltersToParams(next);
    if (nextView === "board") p.set("view", "board");
    setParams(p, { replace: true });
    setLimit(PAGE_SIZE);
  };

  // Typing filters live once the input settles; the URL keeps the search for Back and shared links.
  const latest = useRef({ filters, apply });
  latest.current = { filters, apply };
  useEffect(() => {
    const { filters: current, apply: run } = latest.current;
    if (debounced !== current.q) run({ ...current, q: debounced });
  }, [debounced]);
  // Only pull the URL's search into the box when it changed from outside (a removed chip, Back).
  useEffect(() => {
    if (filters.q !== debounced) setQuery(filters.q);
  }, [filters.q]);

  const maxOwed = useMemo(() => Math.max(OWED_STEP * 10, Math.ceil(Math.max(0, ...data.orders.map(balanceDue)) / 500) * 500), [data.orders]);
  const results = useMemo(() => sortOrders(filterOrders(data.orders, data.customers, filters, now), filters.sort, data.customers), [data.orders, data.customers, filters, now]);
  const counts = useMemo(() => stageCounts(data.orders, data.customers, filters, now), [data.orders, data.customers, filters, now]);
  const extra = activeFilterCount(filters);

  const weekEnd = dayKey(addDays(startOfDay(now), 7));
  const owingSoon = data.orders.filter((o) => (o.status === "ready" || o.status === "quoted" || IN_PRODUCTION.includes(o.status)) && o.readyBy < weekEnd && balanceDue(o) > 0);
  const owingTotal = owingSoon.reduce((s, o) => s + balanceDue(o), 0);
  const todayKey = dayKey(now);
  const fittingsToday = data.appointments.filter((a) => a.start.startsWith(todayKey) && a.status !== "cancelled").sort((a, b) => a.start.localeCompare(b.start));

  const submitSearch = (e: FormEvent) => {
    e.preventDefault();
    apply({ ...filters, q: query });
  };

  const chips = activeChips(filters, maxOwed, apply);
  const fields = <FilterFields filters={filters} counts={counts} maxOwed={maxOwed} onChange={apply} />;

  return (
    <AdminPage
      title="Orders"
      status={
        <>
          {plural(data.orders.filter((o) => groupOf(o.status) !== "collected" && o.status !== "cancelled").length, "open order")} · {plural(counts.new, "new request")}
        </>
      }
      actions={<Cta onClick={() => navigate("/admin/orders/new")}>New order</Cta>}
    >
      <form className="adm-searchbar" role="search" onSubmit={submitSearch}>
        <div className="field">
          <label htmlFor="order-q">Who or what?</label>
          <input id="order-q" type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Name, phone, order number or item" enterKeyHint="search" />
        </div>
        <div className="field is-second">
          <label htmlFor="order-due">Needed by</label>
          <Dropdown id="order-due" variant="field" value={filters.due} onChange={(due) => apply({ ...filters, due })} options={DUE_OPTIONS.map((o) => ({ value: o.id, label: o.label }))} />
        </div>
        <Cta type="submit">Search</Cta>
        <button type="button" className={`chip lt-desk ${extra ? "is-active" : ""}`} onClick={() => setFiltersOpen(true)} style={{ height: 44 }}>
          <SlidersHorizontal size={16} /> Filters
          {extra > 0 && <span className="chip-count">{extra}</span>}
        </button>
      </form>

      {owingSoon.length > 0 && (
        <div className="narrow-only">
          <ActionBanner title={`${plural(owingSoon.length, "order")} due this week still owe ${money(owingTotal)}`} body="Send each client a friendly reminder on WhatsApp." cta="Remind" onClick={() => setRemindOpen(true)} />
        </div>
      )}

      <div className={`adm-list-layout ${view === "list" ? "has-rail" : ""}`}>
        <aside className="adm-card adm-filters desk" aria-label="Filters">
          {fields}
        </aside>

        <section aria-label="Results" style={{ minWidth: 0 }}>
          <div className="adm-results-head">
            <h2 aria-live="polite">{plural(results.length, "order")}</h2>
            <div className="inline" style={{ gap: 8 }}>
              <div className="segmented" role="radiogroup" aria-label="View" style={{ width: 128 }}>
                <button role="radio" aria-checked={view === "list"} className={view === "list" ? "is-active" : ""} onClick={() => apply(filters, "list")} aria-label="List">
                  <List size={16} style={{ margin: "0 auto" }} />
                </button>
                <button role="radio" aria-checked={view === "board"} className={view === "board" ? "is-active" : ""} onClick={() => apply(filters, "board")} aria-label="Board by stage">
                  <Columns3 size={16} style={{ margin: "0 auto" }} />
                </button>
              </div>
              <Dropdown label="Sort orders" prefix="Sort: " align="end" value={filters.sort} onChange={(sort) => apply({ ...filters, sort })} options={SORT_OPTIONS.map((o) => ({ value: o.id, label: o.label }))} />
            </div>
          </div>

          {chips.length > 0 && (
            <div className="adm-active-chips">
              {chips.map((c) => (
                <button key={c.key} className="chip is-active" onClick={c.remove} aria-label={`Remove filter: ${c.label}`}>
                  {c.label} <X size={14} />
                </button>
              ))}
              <button className="chip" style={{ boxShadow: "none", background: "transparent" }} onClick={() => apply({ ...DEFAULT_ORDER_FILTERS, sort: filters.sort })}>
                Clear all
              </button>
            </div>
          )}

          {loading ? (
            <div className="res-list" aria-busy="true">
              {[0, 1, 2, 3].map((i) => (
                <Skeleton key={i} h={150} r={8} />
              ))}
            </div>
          ) : results.length === 0 ? (
            <div className="adm-card">
              <EmptyState
                icon={<Inbox size={22} />}
                title={data.orders.length ? "No orders match these filters" : "No orders yet"}
                body={data.orders.length ? "Try another name or number, or clear the filters." : "Orders from the client app and walk-ins you add show here."}
                action={
                  data.orders.length ? (
                    <button className="btn btn-dark" onClick={() => apply(DEFAULT_ORDER_FILTERS)}>
                      Clear all
                    </button>
                  ) : (
                    <Link className="btn btn-dark" to="/admin/orders/new">
                      Add an order
                    </Link>
                  )
                }
              />
            </div>
          ) : view === "board" ? (
            <Board orders={results} customers={data.customers} stages={filters.stages} now={now} onStep={actions.run} />
          ) : (
            <>
              <div className="res-list">
                {results.slice(0, limit).map((order, i) => (
                  <motion.div key={order.id} initial={i < 6 ? { opacity: 0, y: 12 } : false} animate={{ opacity: 1, y: 0 }} transition={{ ...spring.small, delay: Math.min(i, 6) * 0.03 }}>
                    <OrderCard order={order} customer={customerById(data, order.customerId)} now={now} onStep={actions.run} onMenu={(o) => actions.open(o.id, "menu")} />
                  </motion.div>
                ))}
              </div>
              <div className="adm-more">
                <span className="adm-meta">
                  Showing {Math.min(limit, results.length)} of {results.length}
                </span>
                {limit < results.length && (
                  <button className="btn btn-outline" onClick={() => setLimit((l) => l + PAGE_SIZE)}>
                    Load {Math.min(PAGE_SIZE, results.length - limit)} more
                  </button>
                )}
              </div>
            </>
          )}
        </section>

        {view === "list" && (
          <aside className="adm-rail" aria-label="This week">
            {owingSoon.length > 0 && (
              <div className="wide-only">
                <ActionCard title={`${plural(owingSoon.length, "order")} due this week still owe ${money(owingTotal)}`} body="Send each client a friendly reminder before pickup day." cta="Send reminders" onClick={() => setRemindOpen(true)} />
              </div>
            )}
            <section className="adm-card" aria-labelledby="visits-today">
              <CardHead id="visits-today" title="Pickups today" action={<Link to="/admin/appointments" className="adm-link">Calendar</Link>} />
              {fittingsToday.length ? (
                <div className="adm-rows" style={{ padding: "6px 0 8px" }}>
                  {fittingsToday.map((a) => {
                    const start = parseLocal(a.start);
                    return (
                      <Link key={a.id} to={a.orderId ? `/admin/orders/${a.orderId}` : `/admin/clients/${a.customerId}`} className="adm-row" style={{ minHeight: 48, paddingBlock: 6 }}>
                        <span className={`adm-row-time ${start < now ? "is-past" : ""}`}>{fmtTime(start)}</span>
                        <span className="grow stack">
                          <span className="truncate">{customerById(data, a.customerId)?.name}</span>
                          <span className="t-cap muted">{PURPOSE_LABEL[a.purpose]}</span>
                        </span>
                      </Link>
                    );
                  })}
                </div>
              ) : (
                <p className="adm-card-body muted">No pickups or sessions booked today.</p>
              )}
            </section>
          </aside>
        )}
      </div>

      <Sheet open={filtersOpen} onClose={() => setFiltersOpen(false)} title="Filters">
        {fields}
        <div className="sticky-bar" style={{ margin: "20px -20px calc(-24px - var(--safe-bottom))", paddingInline: 20 }}>
          <button className="btn btn-dark btn-block" onClick={() => setFiltersOpen(false)}>
            Show {plural(results.length, "order")}
          </button>
        </div>
      </Sheet>

      <Sheet open={remindOpen} onClose={() => setRemindOpen(false)} title="Payment reminders">
        <p className="muted" style={{ marginTop: -8, marginBottom: 12 }}>
          Each opens WhatsApp with a message you can check before sending.
        </p>
        <div className="list-card" style={{ margin: "0 -20px" }}>
          {owingSoon.map((o) => (
            <button
              key={o.id}
              className="row"
              onClick={() => {
                setRemindOpen(false);
                window.setTimeout(() => actions.open(o.id, "update"), 220);
              }}
            >
              <span className="grow stack">
                <span>{customerById(data, o.customerId)?.name}</span>
                <span className="t-cap muted">
                  {o.number} · {orderTitle(o)}
                </span>
              </span>
              <span className="money-tag is-owed">{money(balanceDue(o))}</span>
            </button>
          ))}
        </div>
      </Sheet>

      {actions.sheets}
    </AdminPage>
  );
}

function FilterFields({ filters, counts, maxOwed, onChange }: { filters: OrderFilters; counts: Record<StageGroup, number>; maxOwed: number; onChange: (f: OrderFilters) => void }) {
  const toggleStage = (id: StageGroup, on: boolean) => onChange({ ...filters, stages: on ? [...filters.stages, id] : filters.stages.filter((s) => s !== id) });
  const toggleOccasion = (id: Occasion, on: boolean) => onChange({ ...filters, occasions: on ? [...filters.occasions, id] : filters.occasions.filter((s) => s !== id) });
  const dirty = activeFilterCount(filters) > 0;
  return (
    <>
      <div className="adm-filters-head">
        <p className="t-title">Filters</p>
        {dirty && (
          <button className="link" style={{ fontSize: 13 }} onClick={() => onChange({ ...DEFAULT_ORDER_FILTERS, q: filters.q, sort: filters.sort })}>
            Clear all
          </button>
        )}
      </div>
      <fieldset className="filter-group" style={{ border: 0, padding: 0, margin: "18px 0 0" }}>
        <legend className="filter-group-label">Stage</legend>
        {STAGE_GROUPS.map((g) => (
          <CheckRow key={g.id} checked={filters.stages.includes(g.id)} onChange={(on) => toggleStage(g.id, on)} label={g.label} count={counts[g.id]} />
        ))}
      </fieldset>
      <fieldset className="filter-group" style={{ border: 0, padding: 0, margin: "18px 0 0" }}>
        <legend className="filter-group-label">Payment</legend>
        {PAY_OPTIONS.map((o) => (
          <RadioRow key={o.id} name="pay" checked={filters.pay === o.id} onChange={() => onChange({ ...filters, pay: o.id })} label={o.label} />
        ))}
      </fieldset>
      <div className="filter-group">
        <span className="filter-group-label">Balance owed</span>
        <RangeSlider
          label="Balance owed"
          min={0}
          max={maxOwed}
          step={OWED_STEP}
          low={filters.owedMin}
          high={filters.owedMax ?? maxOwed}
          format={money}
          onChange={(low, high) => onChange({ ...filters, owedMin: low, owedMax: high >= maxOwed ? null : high })}
        />
      </div>
      <fieldset className="filter-group" style={{ border: 0, padding: 0, margin: "18px 0 0" }}>
        <legend className="filter-group-label">Occasion</legend>
        {OCCASIONS.filter((o) => o.id !== "other").map((o) => (
          <CheckRow key={o.id} checked={filters.occasions.includes(o.id)} onChange={(on) => toggleOccasion(o.id, on)} label={o.label} />
        ))}
      </fieldset>
    </>
  );
}

function activeChips(f: OrderFilters, maxOwed: number, apply: (f: OrderFilters) => void) {
  const chips: { key: string; label: string; remove: () => void }[] = [];
  const defaultStages = DEFAULT_ORDER_FILTERS.stages;
  const stagesChanged = f.stages.length !== defaultStages.length || f.stages.some((s) => !defaultStages.includes(s));
  if (stagesChanged) {
    const label = f.stages.length ? STAGE_GROUPS.filter((g) => f.stages.includes(g.id)).map((g) => g.label).join(", ") : "No stages";
    chips.push({ key: "stage", label, remove: () => apply({ ...f, stages: defaultStages }) });
  }
  for (const occasion of f.occasions) chips.push({ key: `occ-${occasion}`, label: OCCASIONS.find((o) => o.id === occasion)?.label ?? occasion, remove: () => apply({ ...f, occasions: f.occasions.filter((o) => o !== occasion) }) });
  if (f.pay !== "any") chips.push({ key: "pay", label: PAY_OPTIONS.find((o) => o.id === f.pay)?.label ?? f.pay, remove: () => apply({ ...f, pay: "any" }) });
  if (f.due !== "any") chips.push({ key: "due", label: DUE_OPTIONS.find((o) => o.id === f.due)?.label ?? f.due, remove: () => apply({ ...f, due: "any" }) });
  if (f.owedMin > 0 || f.owedMax !== null) chips.push({ key: "owed", label: `Owes ${money(f.owedMin)}–${f.owedMax === null ? `${money(maxOwed)}+` : money(f.owedMax)}`, remove: () => apply({ ...f, owedMin: 0, owedMax: null }) });
  if (f.q.trim()) chips.push({ key: "q", label: `“${f.q.trim()}”`, remove: () => apply({ ...f, q: "" }) });
  return chips;
}

function Board({ orders, customers, stages, now, onStep }: { orders: Order[]; customers: Customer[]; stages: StageGroup[]; now: Date; onStep: Parameters<typeof BoardCard>[0]["onStep"] }) {
  const byId = new Map(customers.map((c) => [c.id, c]));
  const columns = STAGE_GROUPS.filter((g) => stages.includes(g.id));
  return (
    <div className="board" role="list" aria-label="Orders by stage">
      {columns.map((col) => {
        const items = orders.filter((o) => col.statuses.includes(o.status));
        return (
          <section key={col.id} className="board-col" role="listitem" aria-label={`${col.label}, ${items.length}`}>
            <header className="board-col-head">
              {col.label} <span className="chip-count">{items.length}</span>
            </header>
            {items.length ? items.slice(0, 40).map((o) => <BoardCard key={o.id} order={o} customer={byId.get(o.customerId)} now={now} onStep={onStep} />) : <p className="board-empty">Nothing here</p>}
          </section>
        );
      })}
    </div>
  );
}
