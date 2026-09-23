import { Check, Minus, Plus, Trash2, TriangleAlert } from "lucide-react";
import { useCallback, useMemo, useState, type FormEvent } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Avatar } from "../../components/Bits";
import { Button, Cta } from "../../components/Button";
import { SuccessScreen } from "../../components/Overlays";
import { HOURS, RULES } from "../../data/business";
import { CATEGORIES, DESIGN_OPTIONS, FINISH_OPTIONS, FLAVOURS, LAYER_OPTIONS, OCCASIONS, SIZES, styleById, tierRange } from "../../data/catalog";
import { studio, useAppData, type WalkInOrder } from "../../data/store";
import type { CakeSize, Design, DesignPlan, Finish, Flavour, LeadSource, Occasion, PaymentMethod, Style } from "../../data/types";
import { formatGhPhone, normalizeGhPhone } from "../../lib/contact";
import { dayKey, fmtDayShort, money, parseLocal, plural } from "../../lib/format";
import { itemSummary } from "../../lib/items";
import { FINISH_ADD, defaultChoice, estimate, fixChoice, fromPriceOf, gridPrice, hasFlavour, layersFor, maxFlavours, rangeOf, sizesFor, sizesOf, unitPrice, type ItemChoice } from "../../lib/pricing";
import { isOpenDay, neededByFit, readyWindow } from "../../lib/schedule";
import { SOURCE_LABEL } from "../../lib/studio";
import { CardHead } from "../controls";
import { Dropdown, type DropdownOption } from "../../components/Dropdown";
import { useNow } from "../hooks";
import { AdminPage } from "../Shell";

type Draft = Omit<ItemChoice, "styleId"> & { key: number; styleId: string };

const METHODS: { id: PaymentMethod; label: string }[] = [
  { id: "momo", label: "MoMo" },
  { id: "cash", label: "Cash" },
  { id: "bank", label: "Bank" },
];

const PLANS: { id: DesignPlan; label: string }[] = [
  { id: "ours", label: "We design it" },
  { id: "photo", label: "From the client's picture" },
  { id: "consult", label: "Fitting or tasting first" },
];

const toNumber = (v: string) => Number(v.replace(/[^\d.]/g, ""));
const emptyLine = (key: number): Draft => ({ key, styleId: "", qty: 1, flavours: ["creamy-vanilla"], finish: "cream", design: "classic" });

/** The menu as it stands now: the owner's prices, without the items they've hidden. */
const styleOptions = (styles: Style[]): DropdownOption<string>[] =>
  CATEGORIES.flatMap((c) =>
    styles
      .filter((s) => s.category === c.id && s.active !== false)
      .map((s) => ({ value: s.id, label: s.name, hint: s.kind === "bespoke" ? "By quote" : s.kind === "unit" ? money(s.fromPrice) : `from ${money(fromPriceOf(s))}`, group: c.label })),
  );

export function NewOrder() {
  const data = useAppData();
  const now = useNow();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const preset = data.customers.find((c) => c.id === params.get("client"));

  const [mode, setMode] = useState<"existing" | "new">(preset ? "existing" : "new");
  const [clientId, setClientId] = useState<string | undefined>(preset?.id);
  const [search, setSearch] = useState("");
  const [client, setClient] = useState({ name: "", phone: "", town: "Kasoa", source: "whatsapp" as LeadSource });
  const [lines, setLines] = useState<Draft[]>([emptyLine(1)]);
  const [occasion, setOccasion] = useState<Occasion>("birthday");
  const [occasionTouched, setOccasionTouched] = useState(false);
  const [neededBy, setNeededBy] = useState("");
  const [designPlan, setDesignPlan] = useState<DesignPlan>("ours");
  const [designNotes, setDesignNotes] = useState("");
  const [delivery, setDelivery] = useState<"pickup" | "delivery">("pickup");
  const [price, setPrice] = useState("");
  const [priceTouched, setPriceTouched] = useState(false);
  const [takePayment, setTakePayment] = useState(true);
  const [paid, setPaid] = useState("");
  const [paidTouched, setPaidTouched] = useState(false);
  const [method, setMethod] = useState<PaymentMethod>("momo");
  const [reference, setReference] = useState("");
  const [comments, setComments] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);

  const styles = useMemo(() => styleOptions(data.styles), [data.styles]);
  const chosen = data.customers.find((c) => c.id === clientId);
  const matches = useMemo(() => {
    const q = search.trim().toLowerCase();
    const digits = q.replace(/\D/g, "").replace(/^0/, "");
    return data.customers
      .filter((c) => !q || c.name.toLowerCase().includes(q) || (digits.length >= 3 && (normalizeGhPhone(c.phone) ?? "").includes(digits)))
      .slice(0, 6);
  }, [data.customers, search]);

  const priced = lines.flatMap((l) => {
    const style = styleById(l.styleId);
    return style ? [{ ...l, style, unitPrice: unitPrice(style, l) }] : [];
  });
  const readyDays = Math.max(1, ...priced.map((p) => p.style.readyDays));
  const notice = readyWindow(now, readyDays, HOURS);
  const fit = neededBy ? neededByFit(parseLocal(neededBy), notice) : null;
  const shortNotice = fit === "late";
  const est = estimate(priced, shortNotice);
  const total = priceTouched ? toNumber(price) : est.total;
  const paidValue = paidTouched ? toNumber(paid) : total;
  const custom = priced.some((p) => p.design === "custom" || p.style.kind === "tiered");
  const closedDay = neededBy ? !isOpenDay(parseLocal(neededBy), HOURS) : false;

  const openSaved = useCallback(() => {
    if (saved) navigate(`/admin/orders/${saved}`, { replace: true });
  }, [saved, navigate]);

  const update = (key: number, change: Partial<Draft>) =>
    setLines((ls) =>
      ls.map((l) => {
        if (l.key !== key) return l;
        const next = { ...l, ...change };
        const style = styleById(next.styleId);
        return style ? { ...next, ...fixChoice(style, next) } : next;
      }),
    );
  /** Picking an item sets sensible defaults, and the first item suggests the occasion until the owner picks one. */
  const chooseStyle = (key: number, styleId: string) => {
    const style = styleById(styleId);
    if (!style) return;
    setLines((ls) => ls.map((l) => (l.key === key ? { key, styleId, ...defaultChoice(style), message: l.message } : l)));
    const suggested = OCCASIONS.find((o) => o.categories.includes(style.category))?.id;
    if (!occasionTouched && suggested && lines[0]?.key === key) setOccasion(suggested);
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (mode === "existing" && !chosen) return setError("Choose the client, or switch to a new client.");
    if (!priced.length) return setError("Choose at least one item.");
    if (!neededBy) return setError("Choose the pickup or delivery day.");
    if (closedDay) return setError("The studio is closed that day. Pick another day.");
    if (fit === "too-soon") return setError("That's too soon to make. Agree a later day with the client.");
    if (takePayment && paidValue > total) return setError("The payment can't be more than the price.");
    const draft: WalkInOrder = {
      customerId: mode === "existing" ? chosen?.id : undefined,
      newClient: mode === "new" ? client : undefined,
      occasion,
      neededBy,
      readyBy: neededBy,
      shortNotice,
      items: priced.map((p) => ({ styleId: p.styleId, qty: p.qty, flavours: p.flavours, size: p.size, layers: p.layers, tiers: p.tiers, finish: p.finish, design: p.design, message: p.message?.trim() || undefined, colours: p.colours?.trim() || undefined, unitPrice: p.unitPrice })),
      total,
      designPlan: custom ? designPlan : "ours",
      designNotes,
      delivery,
      comments,
      payment: takePayment && paidValue > 0 ? { amount: paidValue, method, reference } : undefined,
    };
    const result = studio.createOrder(draft);
    if ("error" in result) return setError(result.error);
    setError(null);
    setSaved(result.order.id);
  };

  const summary = (
    <section className="adm-card" aria-labelledby="summary">
      <CardHead id="summary" title="Summary" />
      <div className="adm-card-body stack gap-12">
        <div className="kv">
          <span className="muted">Client</span>
          <span className="truncate" style={{ maxWidth: "60%" }}>
            {mode === "existing" ? (chosen?.name ?? "Not chosen") : client.name || "New client"}
          </span>
        </div>
        {priced.map((p) => (
          <div key={p.key} className="kv">
            <span className="stack">
              <span>
                {p.style.name}
                {p.qty > 1 ? ` × ${p.qty}` : ""}
              </span>
              <span className="t-cap muted">{itemSummary(p, p.style)}</span>
            </span>
            <span>{money(p.unitPrice * p.qty)}</span>
          </div>
        ))}
        {est.lateFee > 0 && (
          <div className="kv">
            <span>Late order</span>
            <span>{money(est.lateFee)}</span>
          </div>
        )}
        <div className="divider" style={{ margin: 0 }} />
        <div className="kv kv-total">
          <span>Agreed price</span>
          <span>{money(total)}</span>
        </div>
        {takePayment && paidValue > 0 && (
          <>
            <div className="kv muted">
              <span>Paid today</span>
              <span>{money(paidValue)}</span>
            </div>
            <div className="kv" style={{ fontWeight: 500 }}>
              <span>Balance</span>
              <span>{money(Math.max(0, total - paidValue))}</span>
            </div>
          </>
        )}
        <div className="kv muted">
          <span>{delivery === "delivery" ? "Delivery" : "Pickup"}</span>
          <span>{neededBy ? fmtDayShort(parseLocal(neededBy)) : "–"}</span>
        </div>
        {error && (
          <p className="adm-form-error" role="alert">
            {error}
          </p>
        )}
        <Cta type="submit" className="desktop-only">
          Save order
        </Cta>
      </div>
    </section>
  );

  return (
    <AdminPage title="New order" back={{ to: "/admin/orders", label: "Orders" }} status={<>For walk-ins and orders agreed on WhatsApp</>}>
      <form className="adm-detail" onSubmit={submit} noValidate>
        <div className="adm-stack">
          <section className="adm-card" aria-labelledby="who">
            <CardHead
              id="who"
              title="Client"
              action={
                <div className="segmented" role="radiogroup" aria-label="Client type" style={{ width: 220 }}>
                  <button type="button" role="radio" aria-checked={mode === "existing"} className={mode === "existing" ? "is-active" : ""} onClick={() => setMode("existing")}>
                    Existing
                  </button>
                  <button type="button" role="radio" aria-checked={mode === "new"} className={mode === "new" ? "is-active" : ""} onClick={() => setMode("new")}>
                    New client
                  </button>
                </div>
              }
            />
            <div className="adm-card-body stack gap-12">
              {mode === "existing" ? (
                chosen ? (
                  <div className="select-card is-selected" style={{ alignItems: "center", boxShadow: "none" }}>
                    <Avatar name={chosen.name} size={40} />
                    <span className="grow stack">
                      <span style={{ fontWeight: 500 }}>{chosen.name}</span>
                      <span className="t-cap muted">
                        {formatGhPhone(chosen.phone)} · {chosen.town}
                        {chosen.dietary ? ` · ${chosen.dietary}` : ""}
                      </span>
                    </span>
                    <Button type="button" size="sm" onClick={() => setClientId(undefined)}>
                      Change
                    </Button>
                  </div>
                ) : (
                  <>
                    <input className="adm-input" type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name or phone" aria-label="Search clients" autoFocus />
                    <div className="stack gap-8" role="listbox" aria-label="Matching clients">
                      {matches.map((c) => (
                        <button key={c.id} type="button" role="option" aria-selected={false} className="select-card" style={{ alignItems: "center", background: "var(--ground)", boxShadow: "none", padding: 12 }} onClick={() => setClientId(c.id)}>
                          <Avatar name={c.name} size={34} soft />
                          <span className="grow stack">
                            <span>{c.name}</span>
                            <span className="t-cap muted">
                              {formatGhPhone(c.phone)} · {c.town}
                            </span>
                          </span>
                        </button>
                      ))}
                      {matches.length === 0 && <p className="muted">No client with that name or number. Switch to New client.</p>}
                    </div>
                  </>
                )
              ) : (
                <div className="adm-grid adm-grid-2" style={{ gap: 16 }}>
                  <div className="field">
                    <label htmlFor="nc-name">Full name</label>
                    <input id="nc-name" value={client.name} onChange={(e) => setClient({ ...client, name: e.target.value })} autoComplete="off" />
                  </div>
                  <div className="field">
                    <label htmlFor="nc-phone">WhatsApp number</label>
                    <input id="nc-phone" inputMode="tel" value={client.phone} onChange={(e) => setClient({ ...client, phone: e.target.value })} placeholder="024 123 4567" autoComplete="off" />
                  </div>
                  <div className="field">
                    <label htmlFor="nc-town">Town or area</label>
                    <input id="nc-town" value={client.town} onChange={(e) => setClient({ ...client, town: e.target.value })} />
                  </div>
                  <div className="field">
                    <label htmlFor="nc-source">Found the studio through</label>
                    <Dropdown<LeadSource> id="nc-source" variant="field" value={client.source} onChange={(source) => setClient({ ...client, source })} options={(["whatsapp", "instagram", "walkin", "referral"] as const).map((s) => ({ value: s, label: SOURCE_LABEL[s] }))} />
                  </div>
                </div>
              )}
            </div>
          </section>

          <section className="adm-card" aria-labelledby="items-h">
            <CardHead id="items-h" title="Items" />
            <div className="adm-card-body stack gap-16">
              {lines.map((line, i) => (
                <LineFields key={line.key} line={line} index={i} styles={styles} canRemove={lines.length > 1} onStyle={(id) => chooseStyle(line.key, id)} onChange={(change) => update(line.key, change)} onRemove={() => setLines((ls) => ls.filter((l) => l.key !== line.key))} />
              ))}
              <Button type="button" icon={<Plus size={16} />} onClick={() => setLines((ls) => [...ls, emptyLine(Math.max(...ls.map((l) => l.key)) + 1)])} style={{ alignSelf: "flex-start" }}>
                Add another item
              </Button>
            </div>
          </section>

          <section className="adm-card" aria-labelledby="when">
            <CardHead id="when" title="Occasion and day" />
            <div className="adm-card-body stack gap-16">
              <div className="adm-grid adm-grid-2" style={{ gap: 16 }}>
                <div className="field">
                  <label htmlFor="occasion">Occasion</label>
                  <Dropdown<Occasion>
                    id="occasion"
                    variant="field"
                    value={occasion}
                    onChange={(o) => {
                      setOccasion(o);
                      setOccasionTouched(true);
                    }}
                    options={OCCASIONS.map((o) => ({ value: o.id, label: o.label }))}
                  />
                </div>
                <div className="field">
                  <label htmlFor="needed">{delivery === "delivery" ? "Delivery day" : "Pickup day"}</label>
                  <input id="needed" type="date" min={dayKey(now)} value={neededBy} onChange={(e) => setNeededBy(e.target.value)} />
                </div>
              </div>
              <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
                <legend className="filter-group-label">Handover</legend>
                <div className="inline" style={{ gap: 20, flexWrap: "wrap" }}>
                  <label className="check-row">
                    <input type="radio" className="rdo" name="delivery" checked={delivery === "pickup"} onChange={() => setDelivery("pickup")} />
                    <span>Pickup in Kasoa</span>
                  </label>
                  <label className="check-row">
                    <input type="radio" className="rdo" name="delivery" checked={delivery === "delivery"} onChange={() => setDelivery("delivery")} />
                    <span>Delivery (rider paid on arrival)</span>
                  </label>
                </div>
              </fieldset>
              {priced.length > 0 && !neededBy && (
                <p className="muted">
                  Needs {plural(readyDays, "working day")}' notice: the earliest normal day is <b style={{ color: "var(--ink)", fontWeight: 500 }}>{fmtDayShort(notice.normal)}</b>.
                </p>
              )}
              {closedDay && (
                <p className="banner is-sand" role="status">
                  <span className="inline" style={{ gap: 8 }}>
                    <TriangleAlert size={16} /> The studio is closed that day.
                  </span>
                </p>
              )}
              {fit === "late" && !closedDay && (
                <p className="banner is-sand" role="status">
                  <span className="inline" style={{ gap: 8 }}>
                    <TriangleAlert size={16} /> Less than {plural(readyDays, "working day")}' notice, so the {money(RULES.lateFee)} late-order fee is added.
                  </span>
                </p>
              )}
              {fit === "too-soon" && (
                <p className="banner is-sand" role="status">
                  <span className="inline" style={{ gap: 8 }}>
                    <TriangleAlert size={16} /> The earliest we can bake is {fmtDayShort(notice.earliest)}. Agree a later day with the client.
                  </span>
                </p>
              )}
            </div>
          </section>

          <section className="adm-card" aria-labelledby="design-h">
            <CardHead id="design-h" title="Design" />
            <div className="adm-card-body stack gap-16">
              {custom && (
                <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
                  <legend className="filter-group-label">How we get the design</legend>
                  <div className="inline" style={{ gap: 20, flexWrap: "wrap" }}>
                    {PLANS.map((p) => (
                      <label key={p.id} className="check-row">
                        <input type="radio" className="rdo" name="plan" checked={designPlan === p.id} onChange={() => setDesignPlan(p.id)} />
                        <span>{p.label}</span>
                      </label>
                    ))}
                  </div>
                </fieldset>
              )}
              <div className="field">
                <label htmlFor="design-notes">Theme, colours, names and ages</label>
                <textarea id="design-notes" className="adm-textarea" value={designNotes} maxLength={400} onChange={(e) => setDesignNotes(e.target.value)} placeholder="Pink and gold, 'Happy 30th Ama', fresh roses" />
              </div>
            </div>
          </section>

          <section className="adm-card" aria-labelledby="money-h">
            <CardHead id="money-h" title="Price and payment" />
            <div className="adm-card-body stack gap-16">
              <div className="adm-grid adm-grid-2" style={{ gap: 16 }}>
                <div className="field">
                  <label htmlFor="price">Agreed price (GH₵)</label>
                  <input
                    id="price"
                    inputMode="decimal"
                    value={priceTouched ? price : est.total ? String(est.total) : ""}
                    onChange={(e) => {
                      setPriceTouched(true);
                      setPrice(e.target.value);
                    }}
                    placeholder="Choose an item first"
                  />
                  <span className="hint">
                    From the price list {money(est.total)}
                    {priceTouched && (
                      <>
                        {" · "}
                        <button type="button" className="link" onClick={() => setPriceTouched(false)}>
                          use price list
                        </button>
                      </>
                    )}
                  </span>
                </div>
                <div className="field">
                  <label htmlFor="notes-order">Note for the order (optional)</label>
                  <input id="notes-order" value={comments} maxLength={300} onChange={(e) => setComments(e.target.value)} placeholder="Candles, knife, gift note" />
                </div>
              </div>
              <label className="check-row">
                <input type="checkbox" className="cbx" checked={takePayment} onChange={(e) => setTakePayment(e.target.checked)} />
                <span>Payment received today (full payment books the date)</span>
              </label>
              {takePayment && (
                <div className="adm-grid adm-grid-3" style={{ gap: 16, alignItems: "end" }}>
                  <div className="field">
                    <label htmlFor="paid">Amount (GH₵)</label>
                    <input
                      id="paid"
                      inputMode="decimal"
                      value={paidTouched ? paid : String(paidValue || "")}
                      onChange={(e) => {
                        setPaidTouched(true);
                        setPaid(e.target.value);
                      }}
                    />
                  </div>
                  <div className="segmented" role="radiogroup" aria-label="Paid by">
                    {METHODS.map((m) => (
                      <button key={m.id} type="button" role="radio" aria-checked={method === m.id} className={method === m.id ? "is-active" : ""} onClick={() => setMethod(m.id)}>
                        {m.label}
                      </button>
                    ))}
                  </div>
                  {method !== "cash" ? (
                    <div className="field">
                      <label htmlFor="ref">{method === "momo" ? "MoMo transaction ID" : "Reference"} (optional)</label>
                      <input id="ref" value={reference} maxLength={40} onChange={(e) => setReference(e.target.value)} />
                    </div>
                  ) : (
                    <span />
                  )}
                </div>
              )}
            </div>
          </section>
        </div>

        <aside className="adm-detail-aside">{summary}</aside>

        <div className="sticky-bar mobile-only" style={{ bottom: "calc(84px + var(--safe-bottom))", borderRadius: 16, margin: "0 0 8px" }}>
          <span className="sticky-bar-meta">
            <strong>{money(total)}</strong>
            <span className="t-cap muted">{takePayment && paidValue > 0 ? `${money(paidValue)} paid today` : "Not paid yet"}</span>
          </span>
          <Button variant="dark" type="submit" icon={<Check size={16} />}>
            Save order
          </Button>
        </div>
      </form>
      <SuccessScreen open={saved !== null} title="Order saved" onDone={openSaved} />
    </AdminPage>
  );
}

function LineFields({ line, index, styles, canRemove, onStyle, onChange, onRemove }: { line: Draft; index: number; styles: DropdownOption<string>[]; canRemove: boolean; onStyle: (id: string) => void; onChange: (change: Partial<Draft>) => void; onRemove: () => void }) {
  const style = styleById(line.styleId);
  const min = style?.minQty ?? 1;
  const tiers = style ? tierRange(style.id) : { min: 2, max: 2 };
  const layerOptions = style?.kind === "cake" ? layersFor(style) : [];
  const sizeOptions = style?.kind === "cake" && line.layers ? sizesFor(style, line.layers) : [];
  // The menu allows a flavour per layer, so the owner picks the same way the client does.
  const flavourCap = style ? maxFlavours(style, line.layers) : 1;
  return (
    <fieldset className="stack gap-12" style={{ border: 0, padding: index ? "16px 0 0" : 0, margin: 0, borderTop: index ? "1px solid var(--ink-06)" : undefined }}>
      <legend className="sr-only">Item {index + 1}</legend>
      <div className="adm-grid" style={{ gridTemplateColumns: "minmax(0, 1fr) auto", gap: 12, alignItems: "end" }}>
        <div className="field">
          <label htmlFor={`style-${line.key}`}>Item</label>
          <Dropdown id={`style-${line.key}`} variant="field" placeholder="Choose from the menu" value={line.styleId} onChange={onStyle} options={styles} />
        </div>
        <div className="inline" style={{ gap: 6 }} aria-label="Quantity">
          <button type="button" className="icon-btn" style={{ width: 36, height: 36 }} onClick={() => onChange({ qty: Math.max(min, line.qty - 1) })} aria-label="One fewer">
            <Minus size={16} />
          </button>
          <input className="adm-input" style={{ width: 56, height: 40, textAlign: "center", padding: 0 }} inputMode="numeric" value={line.qty} onChange={(e) => onChange({ qty: Math.max(min, Math.min(500, Math.round(toNumber(e.target.value)) || min)) })} aria-label="Quantity" />
          <button type="button" className="icon-btn" style={{ width: 36, height: 36 }} onClick={() => onChange({ qty: Math.min(500, line.qty + 1) })} aria-label="One more">
            <Plus size={16} />
          </button>
        </div>
      </div>
      {style && (
        <div className="adm-grid adm-grid-3" style={{ gap: 12 }}>
          {hasFlavour(style) && (
            <div className="field" style={{ gridColumn: flavourCap > 1 ? "1 / -1" : undefined }}>
              <label htmlFor={`flavour-${line.key}`}>{flavourCap > 1 ? `Flavours (up to ${flavourCap})` : "Flavour"}</label>
              {flavourCap > 1 ? (
                <div className="chips" style={{ flexWrap: "wrap", marginInline: 0, paddingInline: 0 }} role="group" aria-label="Flavours" id={`flavour-${line.key}`}>
                  {FLAVOURS.map((f) => {
                    const on = line.flavours.includes(f.id);
                    return (
                      <button
                        key={f.id}
                        type="button"
                        role="checkbox"
                        aria-checked={on}
                        className={`chip ${on ? "is-active" : ""}`}
                        onClick={() => onChange({ flavours: on ? (line.flavours.length > 1 ? line.flavours.filter((x) => x !== f.id) : line.flavours) : [...line.flavours, f.id].slice(-flavourCap) })}
                      >
                        {f.short}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <Dropdown<Flavour>
                  id={`flavour-${line.key}`}
                  variant="field"
                  value={line.flavours[0] ?? "creamy-vanilla"}
                  onChange={(flavour) => onChange({ flavours: [flavour] })}
                  options={FLAVOURS.map((f) => ({ value: f.id, label: f.label }))}
                />
              )}
            </div>
          )}
          {style.kind === "cake" && (
            <>
              <div className="field">
                <label htmlFor={`layers-${line.key}`}>Layers</label>
                <Dropdown<string> id={`layers-${line.key}`} variant="field" value={String(line.layers ?? "")} onChange={(v) => onChange({ layers: Number(v) as 1 | 2 | 3 | 4 })} options={LAYER_OPTIONS.filter((o) => layerOptions.includes(o.id)).map((o) => ({ value: String(o.id), label: o.label }))} />
              </div>
              <div className="field">
                <label htmlFor={`size-${line.key}`}>Size</label>
                <Dropdown<CakeSize>
                  id={`size-${line.key}`}
                  variant="field"
                  value={line.size ?? "6"}
                  onChange={(size) => onChange({ size })}
                  options={sizesOf(style)
                    .filter((id) => sizeOptions.includes(id))
                    .map((id) => ({ value: id, label: SIZES.find((s) => s.id === id)?.label ?? id, hint: line.layers ? money(gridPrice(rangeOf(style), line.layers, id) ?? 0) : undefined }))}
                />
              </div>
            </>
          )}
          {style.kind === "tiered" && tiers.max > tiers.min && (
            <div className="field">
              <label htmlFor={`tiers-${line.key}`}>Tiers</label>
              <Dropdown<string>
                id={`tiers-${line.key}`}
                variant="field"
                value={String(line.tiers ?? tiers.min)}
                onChange={(v) => onChange({ tiers: Number(v) })}
                options={Array.from({ length: tiers.max - tiers.min + 1 }, (_, i) => tiers.min + i).map((n) => ({ value: String(n), label: `${n} tiers`, hint: n > tiers.min ? `+${money((n - tiers.min) * style.extraFrom)}` : undefined }))}
              />
            </div>
          )}
          {style.kind !== "unit" && (
            <div className="field">
              <label htmlFor={`finish-${line.key}`}>Finish</label>
              <Dropdown<Finish> id={`finish-${line.key}`} variant="field" value={line.finish} onChange={(finish) => onChange({ finish })} options={FINISH_OPTIONS.map((o) => ({ value: o.id, label: o.label, hint: style.kind === "cake" && FINISH_ADD[o.id] ? `+${money(FINISH_ADD[o.id])}` : undefined }))} />
            </div>
          )}
          {style.kind === "cake" && !style.customDesign && (
            <div className="field">
              <label htmlFor={`design-${line.key}`}>Design</label>
              <Dropdown<Design> id={`design-${line.key}`} variant="field" value={line.design} onChange={(design) => onChange({ design })} options={DESIGN_OPTIONS.map((o) => ({ value: o.id, label: o.label, hint: o.id === "custom" ? `+${money(RULES.designFee)}` : undefined }))} />
            </div>
          )}
          {style.kind !== "unit" && (
            <div className="field">
              <label htmlFor={`msg-${line.key}`}>Message on the cake</label>
              <input id={`msg-${line.key}`} value={line.message ?? ""} maxLength={40} onChange={(e) => onChange({ message: e.target.value })} placeholder="Happy Birthday!" />
            </div>
          )}
        </div>
      )}
      {style && <p className="t-cap muted">{itemSummary(line, style)}</p>}
      {canRemove && (
        <button type="button" className="adm-link" style={{ alignSelf: "flex-start", color: "var(--ink-75)" }} onClick={onRemove}>
          <Trash2 size={14} /> Remove this item
        </button>
      )}
    </fieldset>
  );
}
