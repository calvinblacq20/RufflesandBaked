import { ArrowRight, MapPin, SlidersHorizontal, Users, X } from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Avatar, Skeleton } from "../../components/Bits";
import { Cta } from "../../components/Button";
import { Sheet } from "../../components/Sheet";
import { useAppData } from "../../data/store";
import type { LeadSource } from "../../data/types";
import { formatGhPhone } from "../../lib/contact";
import { money, plural, relativeDay } from "../../lib/format";
import { CLIENT_SORT_OPTIONS, clientFiltersToParams, clientRows, DEFAULT_CLIENT_FILTERS, filterClients, PAGE_SIZE, parseClientFilters, type ClientFilters, type ClientRow } from "../../lib/filters";
import { balanceDue } from "../../lib/orders";
import { SOURCE_LABEL } from "../../lib/studio";
import { spring } from "../../motion";
import { CardHead, CheckRow } from "../controls";
import { Dropdown } from "../../components/Dropdown";
import { useDebounced, useFirstLoad, useNow } from "../hooks";
import { useOrderActions } from "../orderActions";
import { AdminPage, EmptyState } from "../Shell";

const SOURCES: LeadSource[] = ["instagram", "whatsapp", "walkin", "referral", "app"];

export function Clients() {
  const data = useAppData();
  const now = useNow();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const filters = useMemo(() => parseClientFilters(params), [params]);
  const loading = useFirstLoad("clients");
  const actions = useOrderActions();
  const [limit, setLimit] = useState(PAGE_SIZE);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [query, setQuery] = useState(filters.q);
  const debounced = useDebounced(query);

  const apply = (next: ClientFilters) => {
    setParams(clientFiltersToParams(next), { replace: true });
    setLimit(PAGE_SIZE);
  };
  const latest = useRef({ filters, apply });
  latest.current = { filters, apply };
  useEffect(() => {
    const { filters: current, apply: run } = latest.current;
    if (debounced !== current.q) run({ ...current, q: debounced });
  }, [debounced]);
  useEffect(() => {
    if (filters.q !== debounced) setQuery(filters.q);
  }, [filters.q]);

  const rows = useMemo(() => clientRows(data.customers, data.orders), [data.customers, data.orders]);
  const results = useMemo(() => filterClients(rows, filters), [rows, filters]);
  const towns = useMemo(() => [...new Set(data.customers.map((c) => c.town).filter(Boolean))].sort(), [data.customers]);
  const owing = [...rows].filter((r) => r.owed > 0).sort((a, b) => b.owed - a.owed);
  const extra = [filters.towns.length > 0, filters.sources.length > 0, filters.owes, filters.activeOnly].filter(Boolean).length;

  const remind = (row: ClientRow) => {
    const order = data.orders.filter((o) => o.customerId === row.customer.id && o.status !== "cancelled" && o.status !== "collected" && o.status !== "request" && balanceDue(o) > 0).sort((a, b) => balanceDue(b) - balanceDue(a))[0];
    if (order) actions.open(order.id, "update");
  };

  const fields = (
    <>
      <div className="adm-filters-head">
        <p className="t-title">Filters</p>
        {extra > 0 && (
          <button className="link" style={{ fontSize: 13 }} onClick={() => apply({ ...DEFAULT_CLIENT_FILTERS, q: filters.q, sort: filters.sort })}>
            Clear all
          </button>
        )}
      </div>
      <fieldset className="filter-group" style={{ border: 0, padding: 0, margin: "18px 0 0" }}>
        <legend className="filter-group-label">Money and orders</legend>
        <CheckRow checked={filters.owes} onChange={(on) => apply({ ...filters, owes: on })} label="Owes the studio" count={owing.length} />
        <CheckRow checked={filters.activeOnly} onChange={(on) => apply({ ...filters, activeOnly: on })} label="Has an open order" count={rows.filter((r) => r.active > 0).length} />
      </fieldset>
      <fieldset className="filter-group" style={{ border: 0, padding: 0, margin: "18px 0 0" }}>
        <legend className="filter-group-label">Found the studio through</legend>
        {SOURCES.map((s) => (
          <CheckRow key={s} checked={filters.sources.includes(s)} onChange={(on) => apply({ ...filters, sources: on ? [...filters.sources, s] : filters.sources.filter((x) => x !== s) })} label={SOURCE_LABEL[s]} count={rows.filter((r) => (r.customer.source ?? "app") === s).length} />
        ))}
      </fieldset>
      <fieldset className="filter-group" style={{ border: 0, padding: 0, margin: "18px 0 0" }}>
        <legend className="filter-group-label">Town</legend>
        {towns.map((t) => (
          <CheckRow key={t} checked={filters.towns.includes(t)} onChange={(on) => apply({ ...filters, towns: on ? [...filters.towns, t] : filters.towns.filter((x) => x !== t) })} label={t} count={rows.filter((r) => r.customer.town === t).length} />
        ))}
      </fieldset>
    </>
  );

  const chips = [
    ...(filters.owes ? [{ key: "owes", label: "Owes the studio", remove: () => apply({ ...filters, owes: false }) }] : []),
    ...(filters.activeOnly ? [{ key: "active", label: "Has an open order", remove: () => apply({ ...filters, activeOnly: false }) }] : []),
    ...filters.sources.map((s) => ({ key: s, label: SOURCE_LABEL[s], remove: () => apply({ ...filters, sources: filters.sources.filter((x) => x !== s) }) })),
    ...filters.towns.map((t) => ({ key: t, label: t, remove: () => apply({ ...filters, towns: filters.towns.filter((x) => x !== t) }) })),
  ];

  return (
    <AdminPage
      title="Clients"
      status={
        <>
          {plural(data.customers.length, "client")} · {owing.length} owe {money(owing.reduce((s, r) => s + r.owed, 0))}
        </>
      }
      actions={<Cta onClick={() => navigate("/admin/orders/new")}>New order</Cta>}
    >
      <form
        className="adm-searchbar"
        role="search"
        onSubmit={(e: FormEvent) => {
          e.preventDefault();
          apply({ ...filters, q: query });
        }}
      >
        <div className="field">
          <label htmlFor="client-q">Who?</label>
          <input id="client-q" type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Name, phone or town" enterKeyHint="search" />
        </div>
        <div className="field is-second">
          <label htmlFor="client-sort">Sort by</label>
          <Dropdown id="client-sort" variant="field" value={filters.sort} onChange={(sort) => apply({ ...filters, sort })} options={CLIENT_SORT_OPTIONS.map((o) => ({ value: o.id, label: o.label }))} />
        </div>
        <Cta type="submit">Search</Cta>
        <button type="button" className={`chip lt-desk ${extra ? "is-active" : ""}`} onClick={() => setFiltersOpen(true)} style={{ height: 44 }}>
          <SlidersHorizontal size={16} /> Filters
          {extra > 0 && <span className="chip-count">{extra}</span>}
        </button>
      </form>

      <div className="adm-list-layout has-rail">
        <aside className="adm-card adm-filters desk" aria-label="Filters">
          {fields}
        </aside>

        <section aria-label="Clients" style={{ minWidth: 0 }}>
          <div className="adm-results-head">
            <h2 aria-live="polite">{plural(results.length, "client")}</h2>
            <Dropdown className="mobile-only" label="Sort clients" prefix="Sort: " align="end" value={filters.sort} onChange={(sort) => apply({ ...filters, sort })} options={CLIENT_SORT_OPTIONS.map((o) => ({ value: o.id, label: o.label }))} />
          </div>
          {chips.length > 0 && (
            <div className="adm-active-chips">
              {chips.map((c) => (
                <button key={c.key} className="chip is-active" onClick={c.remove} aria-label={`Remove filter: ${c.label}`}>
                  {c.label} <X size={14} />
                </button>
              ))}
            </div>
          )}
          {loading ? (
            <div className="res-list" aria-busy="true">
              {[0, 1, 2, 3].map((i) => (
                <Skeleton key={i} h={130} r={8} />
              ))}
            </div>
          ) : results.length === 0 ? (
            <div className="adm-card">
              <EmptyState icon={<Users size={22} />} title="No clients match" body="Try another name, number or town, or clear the filters." action={<button className="btn btn-dark" onClick={() => apply(DEFAULT_CLIENT_FILTERS)}>Clear all</button>} />
            </div>
          ) : (
            <>
              <div className="res-list">
                {results.slice(0, limit).map((row, i) => (
                  <motion.div key={row.customer.id} initial={i < 6 ? { opacity: 0, y: 12 } : false} animate={{ opacity: 1, y: 0 }} transition={{ ...spring.small, delay: Math.min(i, 6) * 0.03 }}>
                    <ClientCard row={row} now={now} onRemind={() => remind(row)} />
                  </motion.div>
                ))}
              </div>
              <div className="adm-more">
                <span className="adm-meta">
                  Showing {Math.min(limit, results.length)} of {results.length}
                </span>
                {limit < results.length && (
                  <button className="btn btn-outline" onClick={() => setLimit((l) => l + PAGE_SIZE)}>
                    Load more
                  </button>
                )}
              </div>
            </>
          )}
        </section>

        <aside className="adm-rail" aria-label="Balances">
          <section className="adm-card" aria-labelledby="owe">
            <CardHead id="owe" title="Owe the studio" action={<span className="chip-count">{owing.length}</span>} />
            {owing.length ? (
              <div className="adm-rows" style={{ padding: "6px 0 8px" }}>
                {owing.slice(0, 6).map((r) => (
                  <Link key={r.customer.id} to={`/admin/clients/${r.customer.id}`} className="adm-row" style={{ minHeight: 48 }}>
                    <Avatar name={r.customer.name} size={30} soft />
                    <span className="grow truncate">{r.customer.name}</span>
                    <span className="money-tag is-owed">{money(r.owed)}</span>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="adm-card-body muted">Nobody owes anything right now.</p>
            )}
          </section>
        </aside>
      </div>

      <Sheet open={filtersOpen} onClose={() => setFiltersOpen(false)} title="Filters">
        {fields}
        <button className="btn btn-dark btn-block" style={{ marginTop: 20 }} onClick={() => setFiltersOpen(false)}>
          Show {plural(results.length, "client")}
        </button>
      </Sheet>
      {actions.sheets}
    </AdminPage>
  );
}

function ClientCard({ row, now, onRemind }: { row: ClientRow; now: Date; onRemind: () => void }) {
  const c = row.customer;
  const firstNote = c.notes?.split("\n")[0];
  return (
    <article className="res-card">
      <Link className="res-card-link" to={`/admin/clients/${c.id}`} aria-label={`${c.name}, ${plural(row.orders, "order")}`} />
      <div className="res-thumb" aria-hidden="true" style={{ borderRadius: "50%" }}>
        <Avatar name={c.name} size={44} soft />
      </div>
      <div className="res-top">
        <p className="res-title grow">{c.name}</p>
      </div>
      <p className="res-sub tabular">{formatGhPhone(c.phone)}</p>
      <div className="res-meta">
        <span className="inline" style={{ gap: 4 }}>
          <MapPin size={13} aria-hidden="true" />
          {c.town || "Town not given"}
        </span>
        <span className="pill-tag">{SOURCE_LABEL[c.source ?? "app"]}</span>
        <span>{plural(row.orders, "order")}</span>
        {row.spend > 0 && <span className="money-tag">Paid {money(row.spend)}</span>}
        {row.owed > 0 && <span className="money-tag is-owed">{money(row.owed)} owed</span>}
      </div>
      {firstNote && <p className="res-snippet">{firstNote}</p>}
      <div className="res-foot">
        <span className="muted">{row.lastOrderAt ? `Last order ${relativeDay(new Date(row.lastOrderAt), now).replace(/^(Today|Yesterday|Tomorrow)$/, (m) => m.toLowerCase())}` : "No orders yet"}</span>
        {row.owed > 0 ? (
          <button className="res-action" onClick={onRemind}>
            Remind about {money(row.owed)} <ArrowRight size={15} aria-hidden="true" />
          </button>
        ) : (
          <Link className="res-action" to={`/admin/orders/new?client=${c.id}`}>
            New order <ArrowRight size={15} aria-hidden="true" />
          </Link>
        )}
      </div>
    </article>
  );
}
