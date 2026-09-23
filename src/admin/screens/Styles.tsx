import { Eye, EyeOff, Pencil, RotateCcw } from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Photo } from "../../components/Bits";
import { Button } from "../../components/Button";
import { useNotify } from "../../components/Notify";
import { Sheet } from "../../components/Sheet";
import { RULES } from "../../data/business";
import { CATEGORIES, LAYER_OPTIONS, RANGES, SIZES, categoryLabel, cloneGrid, tierRange } from "../../data/catalog";
import { studio, useAppData } from "../../data/store";
import type { CakeSize, CategoryId, Layers, PriceGrid, PriceRange, Style } from "../../data/types";
import { money, plural } from "../../lib/format";
import { periodRange } from "../../lib/metrics";
import { FINISH_ADD, fromPriceOf } from "../../lib/pricing";
import { CardHead } from "../controls";
import { useNow } from "../hooks";
import { AdminPage } from "../Shell";
import { ConfirmSheet } from "../sheets";

const toNumber = (v: string) => Number(v.replace(/[^\d.]/g, ""));
const RANGE_IDS: PriceRange[] = ["classic", "bento", "rect", "kids"];
const LAYERS: Layers[] = [1, 2, 3, 4];

/** What the price column says for each kind of item. */
const priceText = (s: Style) =>
  s.kind === "bespoke" ? "By quote" : s.kind === "cake" ? `from ${money(fromPriceOf(s))}` : s.kind === "tiered" ? `${money(s.fromPrice)} · ${tierRange(s.id).min} tiers` : `${money(s.fromPrice)} / ${s.unit ?? "each"}`;

export function Styles() {
  const data = useAppData();
  const now = useNow();
  const notify = useNotify();
  const [category, setCategory] = useState<CategoryId | "all">("all");
  const [editing, setEditing] = useState<Style | null>(null);
  const [resetOpen, setResetOpen] = useState(false);
  const recent = useMemo(() => {
    const range = periodRange("90d", now);
    const counts = new Map<string, number>();
    for (const o of data.orders) {
      const t = new Date(o.createdAt);
      if (t < range.start || o.status === "cancelled") continue;
      for (const item of o.items) counts.set(item.styleId, (counts.get(item.styleId) ?? 0) + 1);
    }
    return counts;
  }, [data.orders, now]);

  const styles = data.styles.filter((s) => category === "all" || s.category === category);
  const hidden = data.styles.filter((s) => s.active === false).length;

  const toggle = (style: Style) => {
    const result = studio.saveStyle(style.id, { active: style.active === false });
    if ("error" in result) return notify("Couldn't save", result.error);
    notify(style.active === false ? "Back on the menu" : "Hidden from the menu", style.active === false ? `${style.name} is back in the client app.` : `${style.name} is hidden from clients. Orders already placed are not affected.`);
  };

  return (
    <AdminPage
      title="Menu & prices"
      status={
        <>
          {plural(data.styles.length, "item")} · {hidden ? `${hidden} hidden · ` : ""}cakes are priced from the menu card; handmade pieces are quoted
        </>
      }
    >
      <PriceListCard grid={data.priceGrid} />

      <div className="chips" role="radiogroup" aria-label="Category" style={{ margin: "20px 0 16px" }}>
        {[{ id: "all" as const, label: "All" }, ...CATEGORIES].map((c) => (
          <button key={c.id} role="radio" aria-checked={category === c.id} className={`chip ${category === c.id ? "is-active" : ""}`} onClick={() => setCategory(c.id)}>
            {c.label}
          </button>
        ))}
      </div>
      <section className="adm-card" aria-label="Menu">
        <div className="adm-table-wrap desktop-only">
          <table className="adm-table">
            <thead>
              <tr>
                <th scope="col">Item</th>
                <th scope="col">Category</th>
                <th scope="col" className="num">
                  Price
                </th>
                <th scope="col" className="num">
                  Each extra tier
                </th>
                <th scope="col" className="num">
                  Notice
                </th>
                <th scope="col" className="num">
                  Orders, 90 days
                </th>
                <th scope="col" className="num">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {styles.map((s) => (
                <tr key={s.id} style={{ cursor: "default", opacity: s.active === false ? 0.55 : 1 }}>
                  <td>
                    <span className="inline" style={{ gap: 12 }}>
                      <Photo tone={s.tone} src={s.photo} sizes="36px" height={36} radius={6} markSize={14} className="style-mini" />
                      <span style={{ fontWeight: 500 }}>{s.name}</span>
                      {s.active === false && <span className="pill-tag">Hidden</span>}
                      {s.featured && <span className="pill-tag">Featured</span>}
                    </span>
                  </td>
                  <td>{categoryLabel(s.category)}</td>
                  <td className="num">{priceText(s)}</td>
                  <td className="num">{s.kind === "tiered" && tierRange(s.id).max > tierRange(s.id).min ? money(s.extraFrom) : "–"}</td>
                  <td className="num">{plural(s.readyDays, "working day")}</td>
                  <td className="num">{recent.get(s.id) ?? 0}</td>
                  <td className="num">
                    <span className="inline" style={{ gap: 4, justifyContent: "flex-end" }}>
                      <button className="icon-btn is-plain" style={{ width: 34, height: 34 }} onClick={() => toggle(s)} aria-label={s.active === false ? `Show ${s.name} to clients` : `Hide ${s.name} from clients`}>
                        {s.active === false ? <EyeOff size={17} /> : <Eye size={17} />}
                      </button>
                      <button className="icon-btn is-plain" style={{ width: 34, height: 34 }} onClick={() => setEditing(s)} aria-label={`Edit ${s.name}`}>
                        <Pencil size={16} />
                      </button>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="adm-rows mobile-only" style={{ paddingBlock: 4 }}>
          {styles.map((s) => (
            <button key={s.id} className="adm-row" onClick={() => setEditing(s)} style={{ opacity: s.active === false ? 0.55 : 1 }}>
              <Photo tone={s.tone} src={s.photo} sizes="40px" height={40} radius={8} markSize={14} className="style-mini" />
              <span className="grow stack">
                <span style={{ fontWeight: 500 }}>
                  {s.name} {s.active === false && <span className="pill-tag">Hidden</span>}
                </span>
                <span className="t-cap muted">
                  {plural(s.readyDays, "day")}' notice · {recent.get(s.id) ?? 0} orders in 90 days
                </span>
              </span>
              <span className="tabular t-cap">{priceText(s)}</span>
              <Pencil size={15} className="row-chevron" />
            </button>
          ))}
        </div>
        <div className="adm-card-foot">
          <span className="adm-meta">
            Single cakes: ganache adds {money(FINISH_ADD.ganache)}, fondant {money(FINISH_ADD.fondant)}, custom designs from {money(RULES.designFee)}. Late orders add {money(RULES.lateFee)}.
          </span>
          <button className="adm-link" onClick={() => setResetOpen(true)}>
            <RotateCcw size={14} /> Reset the menu
          </button>
        </div>
      </section>

      <StyleSheet style={editing} onClose={() => setEditing(null)} />
      <ConfirmSheet
        open={resetOpen}
        onClose={() => setResetOpen(false)}
        title="Reset the menu?"
        body="Every item goes back to its starting name, price and notice, and hidden items come back. The cake price list is reset separately. Orders already placed keep their price."
        confirmLabel="Reset menu"
        onConfirm={() => {
          studio.resetStyles();
          setResetOpen(false);
          notify("Menu reset", "Items are back to their starting prices.");
        }}
      />
    </AdminPage>
  );
}

type GridForm = Record<PriceRange, Partial<Record<Layers, Partial<Record<CakeSize, string>>>>>;

/** The sizes and layer counts a block of the menu actually prices, so the table has no dead cells. */
const shapeOf = (grid: PriceGrid, range: PriceRange) => {
  const block = grid[range];
  const layers = LAYERS.filter((l) => block[l] && Object.keys(block[l]!).length > 0);
  const sizes = SIZES.filter((s) => layers.some((l) => block[l]?.[s.id] !== undefined));
  return { layers, sizes };
};

const toForm = (grid: PriceGrid): GridForm => {
  const form = {} as GridForm;
  for (const r of RANGE_IDS) {
    form[r] = {};
    const { layers, sizes } = shapeOf(grid, r);
    for (const l of layers) {
      form[r][l] = {};
      for (const size of sizes) {
        const price = grid[r][l]?.[size.id];
        form[r][l]![size.id] = price === undefined ? "" : String(price);
      }
    }
  }
  return form;
};

/** The studio's Classic Cake Menu, one table per block: sizes down, layers across. Blank means not offered. */
function PriceListCard({ grid }: { grid: PriceGrid }) {
  const notify = useNotify();
  const [form, setForm] = useState<GridForm>(() => toForm(grid));
  const [error, setError] = useState<string | null>(null);
  const [resetOpen, setResetOpen] = useState(false);
  useEffect(() => setForm(toForm(grid)), [grid]);
  const original = useMemo(() => toForm(grid), [grid]);
  const shapes = useMemo(() => Object.fromEntries(RANGE_IDS.map((r) => [r, shapeOf(grid, r)])) as Record<PriceRange, ReturnType<typeof shapeOf>>, [grid]);
  const dirty = RANGE_IDS.some((r) => shapes[r].layers.some((l) => shapes[r].sizes.some((size) => (form[r][l]?.[size.id] ?? "") !== (original[r][l]?.[size.id] ?? ""))));

  const set = (r: PriceRange, l: Layers, size: CakeSize, value: string) =>
    setForm((f) => ({ ...f, [r]: { ...f[r], [l]: { ...f[r][l], [size]: value.replace(/[^\d]/g, "") } } }));

  const save = (e: FormEvent) => {
    e.preventDefault();
    const next = cloneGrid(grid);
    for (const r of RANGE_IDS)
      for (const l of shapes[r].layers)
        for (const size of shapes[r].sizes) {
          const raw = form[r][l]?.[size.id]?.trim() ?? "";
          const row = (next[r][l] ??= {});
          if (raw) row[size.id] = toNumber(raw);
          else delete row[size.id];
        }
    const result = studio.savePriceGrid(next);
    if ("error" in result) return setError(result.error);
    setError(null);
    notify("Price list saved", "The order flow and the menu use the new prices. Past orders keep theirs.");
  };

  return (
    <form className="adm-card" aria-labelledby="price-list" onSubmit={save} noValidate>
      <CardHead id="price-list" title="Classic Cake Menu" action={dirty ? <span className="pill-tag">Unsaved</span> : <span className="adm-meta">GH₵ per cake · blank = not offered</span>} />
      <div className="adm-card-body adm-grid adm-grid-2" style={{ gap: 20 }}>
        {RANGE_IDS.map((r) => {
          const { layers, sizes } = shapes[r];
          const range = RANGES.find((x) => x.id === r);
          if (!layers.length) return null;
          return (
          <div key={r} className="stack gap-8" style={{ minWidth: 0 }}>
            <p className="t-title" style={{ fontSize: 15 }}>
              {range?.label}
            </p>
            <div className="adm-table-wrap">
              <table className="adm-table price-grid">
                <thead>
                  <tr>
                    <th scope="col">Size</th>
                    {LAYER_OPTIONS.filter((l) => layers.includes(l.id)).map((l) => (
                      <th key={l.id} scope="col" className="num" aria-label={l.label}>
                        {l.id === 1 ? "1 layer" : `${l.id} layers`}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sizes.map((size) => (
                    <tr key={size.id} style={{ cursor: "default" }}>
                      <th scope="row" style={{ fontWeight: 500, whiteSpace: "nowrap" }} aria-label={size.label}>
                        {size.short}
                      </th>
                      {layers.map((l) => (
                        <td key={l} className="num">
                          <input
                            className="adm-input price-cell"
                            inputMode="numeric"
                            value={form[r][l]?.[size.id] ?? ""}
                            placeholder="–"
                            onChange={(e) => set(r, l, size.id, e.target.value)}
                            aria-label={`${range?.label}, ${size.label}, ${l === 1 ? "single layer" : `${l} layers`}`}
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          );
        })}
      </div>
      {error && (
        <p className="adm-form-error" role="alert" style={{ padding: "0 20px 8px" }}>
          {error}
        </p>
      )}
      <div className="adm-card-foot">
        <span className="inline" style={{ gap: 12 }}>
          <button type="button" className="adm-link" onClick={() => setForm(original)} style={{ visibility: dirty ? "visible" : "hidden" }}>
            Undo changes
          </button>
          <button type="button" className="adm-link" onClick={() => setResetOpen(true)}>
            <RotateCcw size={14} /> Original price list
          </button>
        </span>
        <Button variant="dark" size="sm" type="submit" disabled={!dirty}>
          Save prices
        </Button>
      </div>
      <ConfirmSheet
        open={resetOpen}
        onClose={() => setResetOpen(false)}
        title="Go back to the original price list?"
        body="Every cake price goes back to the list from your WhatsApp catalogue. Orders already placed keep their price."
        confirmLabel="Reset price list"
        onConfirm={() => {
          studio.resetPriceGrid();
          setResetOpen(false);
          notify("Price list reset", "Cake prices are back to the original list.");
        }}
      />
    </form>
  );
}

function StyleSheet({ style, onClose }: { style: Style | null; onClose: () => void }) {
  const notify = useNotify();
  const [form, setForm] = useState({ name: "", description: "", fromPrice: "", extraFrom: "", readyDays: "", featured: false, active: true });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!style) return;
    setForm({
      name: style.name,
      description: style.description,
      fromPrice: String(style.fromPrice),
      extraFrom: String(style.extraFrom),
      readyDays: String(style.readyDays),
      featured: Boolean(style.featured),
      active: style.active !== false,
    });
    setError(null);
  }, [style]);

  const save = (e: FormEvent) => {
    e.preventDefault();
    if (!style) return;
    const result = studio.saveStyle(style.id, {
      name: form.name,
      description: form.description,
      fromPrice: style.kind === "cake" ? style.fromPrice : toNumber(form.fromPrice),
      extraFrom: style.kind === "tiered" ? toNumber(form.extraFrom) : style.extraFrom,
      readyDays: Math.round(toNumber(form.readyDays)),
      featured: form.featured,
      active: form.active,
    });
    if ("error" in result) return setError(result.error);
    onClose();
    notify("Item saved", `${result.style.name} is updated on the menu.`);
  };

  const tiers = style ? tierRange(style.id) : { min: 2, max: 2 };

  return (
    <Sheet open={style !== null} onClose={onClose} title={style ? `Edit ${style.name}` : "Edit item"}>
      {style && (
        <form className="stack gap-16" onSubmit={save} noValidate>
          <div className="field">
            <label htmlFor="style-name">Name</label>
            <input id="style-name" value={form.name} maxLength={60} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="field">
            <label htmlFor="style-desc">Description shown to clients</label>
            <textarea id="style-desc" rows={3} value={form.description} maxLength={300} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          {style.kind === "cake" ? (
            <p className="banner" style={{ margin: 0 }}>
              <span className="muted">This cake is priced from the price list at the top of the page{style.customDesign ? `, plus the ${money(RULES.designFee)} design fee` : ""}. It starts at {money(fromPriceOf(style))}.</span>
            </p>
          ) : (
            <div className="adm-grid adm-grid-2" style={{ gap: 16 }}>
              <div className="field">
                <label htmlFor="style-price">{style.kind === "tiered" ? `Price for ${tiers.min} tiers (GH₵)` : `Price per ${style.unit ?? "unit"} (GH₵)`}</label>
                <input id="style-price" inputMode="decimal" value={form.fromPrice} onChange={(e) => setForm({ ...form, fromPrice: e.target.value })} />
              </div>
              {style.kind === "tiered" && tiers.max > tiers.min && (
                <div className="field">
                  <label htmlFor="style-extra">Each extra tier adds (GH₵)</label>
                  <input id="style-extra" inputMode="decimal" value={form.extraFrom} onChange={(e) => setForm({ ...form, extraFrom: e.target.value })} />
                </div>
              )}
            </div>
          )}
          <div className="field" style={{ maxWidth: 240 }}>
            <label htmlFor="style-days">Notice needed (working days)</label>
            <input id="style-days" inputMode="numeric" value={form.readyDays} onChange={(e) => setForm({ ...form, readyDays: e.target.value })} />
            <span className="hint">Orders with less notice pay the late-order fee.</span>
          </div>
          <div className="stack">
            <label className="check-row">
              <input type="checkbox" className="cbx" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} />
              <span>Show in the client app</span>
            </label>
            <label className="check-row">
              <input type="checkbox" className="cbx" checked={form.featured} onChange={(e) => setForm({ ...form, featured: e.target.checked })} />
              <span>Feature on the home page</span>
            </label>
          </div>
          {error && (
            <p className="adm-form-error" role="alert">
              {error}
            </p>
          )}
          <p className="t-cap muted">New prices apply to new orders only. Orders already quoted keep their price.</p>
          <Button variant="dark" block type="submit">
            Save item
          </Button>
        </form>
      )}
    </Sheet>
  );
}
