import { Heart, Search, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Photo, Skeleton, useSkeleton } from "../components/Bits";
import { Reveal } from "../components/Reveal";
import { actions, useAppData } from "../data/store";
import { CATEGORIES, LINES, OCCASIONS, STYLES, categoryLabel } from "../data/catalog";
import type { Line, Occasion } from "../data/types";
import { money } from "../lib/format";
import { fromPriceOf, isQuoted } from "../lib/pricing";
import { spring } from "../motion";

export function Explore() {
  const loading = useSkeleton(500);
  const [params, setParams] = useSearchParams();
  const occasion = (params.get("occasion") as Occasion | null) ?? null;
  /** Which half of the studio to show: the kitchen, the workroom, or everything. */
  const line = (params.get("line") as Line | null) ?? null;
  const savedOnly = params.get("saved") === "1";
  const [query, setQuery] = useState("");
  const { savedStyleIds } = useAppData().device;
  const navigate = useNavigate();

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const cats = occasion ? OCCASIONS.find((o) => o.id === occasion)?.categories ?? [] : null;
    return STYLES.filter((s) => {
      if (savedOnly && !savedStyleIds.includes(s.id)) return false;
      // Bundles belong to both halves, so they show under either one.
      if (line && s.line !== line && s.line !== "both") return false;
      if (cats && cats.length && !cats.includes(s.category)) return false;
      if (!q) return true;
      return `${s.name} ${categoryLabel(s.category)} ${s.description}`.toLowerCase().includes(q);
    });
  }, [query, occasion, line, savedOnly, savedStyleIds]);

  const setFilter = (next: { occasion?: string | null; saved?: boolean; line?: Line | null }) => {
    const p = new URLSearchParams();
    const o = next.occasion === undefined ? occasion : next.occasion;
    const s = next.saved === undefined ? savedOnly : next.saved;
    const l = next.line === undefined ? line : next.line;
    if (o) p.set("occasion", o);
    if (l) p.set("line", l);
    if (s) p.set("saved", "1");
    setParams(p, { replace: true });
  };

  return (
    <main className="screen">
      <header className="page-title" style={{ paddingTop: 20 }}>
        <h1 className="t-h1">Explore</h1>
        <p className="muted">{CATEGORIES.length} categories · made to order in Kasoa</p>
      </header>

      <div className="stack gap-12 explore-bar" style={{ position: "sticky", top: 0, zIndex: 10, background: "var(--ground)", marginInline: "calc(var(--gutter) * -1)", padding: "8px var(--gutter) 10px" }}>
        <label className="search-box">
          <Search size={18} className="subtle" />
          <span className="sr-only">Search the menu</span>
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search red velvet, fascinator, bridal…" inputMode="search" />
          {query && (
            <button onClick={() => setQuery("")} aria-label="Clear search" className="subtle">
              <X size={18} />
            </button>
          )}
        </label>
        <div className="segmented line-switch" role="radiogroup" aria-label="Which half of the studio">
          <button role="radio" aria-checked={line === null} className={line === null ? "is-active" : ""} onClick={() => setFilter({ line: null })}>
            Everything
          </button>
          {LINES.filter((l) => l.id !== "both").map((l) => (
            <button key={l.id} role="radio" aria-checked={line === l.id} className={line === l.id ? "is-active" : ""} onClick={() => setFilter({ line: line === l.id ? null : l.id })}>
              {l.short}
            </button>
          ))}
        </div>
        <div className="chips">
          <button className={`chip ${!occasion && !savedOnly ? "is-active" : ""}`} onClick={() => setFilter({ occasion: null, saved: false })}>
            All
          </button>
          <button className={`chip ${savedOnly ? "is-active" : ""}`} onClick={() => setFilter({ saved: !savedOnly })}>
            <Heart size={14} /> Saved
            <span className="chip-count">{savedStyleIds.length}</span>
          </button>
          {OCCASIONS.filter((o) => o.id !== "other").map((o) => (
            <button key={o.id} className={`chip ${occasion === o.id ? "is-active" : ""}`} onClick={() => setFilter({ occasion: occasion === o.id ? null : o.id })}>
              {o.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="style-grid" style={{ marginTop: 12 }} aria-busy="true">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="stack gap-8">
              <Skeleton h={190} r={8} />
              <Skeleton w="70%" h={14} />
              <Skeleton w="40%" h={12} />
            </div>
          ))}
        </div>
      ) : results.length === 0 ? (
        <div className="empty">
          <span className="empty-icon">
            <Search size={24} />
          </span>
          <p className="t-title">{savedOnly ? "Nothing saved yet" : "Nothing matches"}</p>
          <p className="muted">{savedOnly ? "Tap the heart on anything to keep it here." : "Try another word or clear the filters."}</p>
          <button className="btn btn-outline" onClick={() => { setQuery(""); setFilter({ occasion: null, saved: false, line: null }); }} style={{ marginTop: 8 }}>
            Show the whole menu
          </button>
        </div>
      ) : (
        <motion.div layout className="style-grid" style={{ marginTop: 12 }}>
          <AnimatePresence mode="popLayout">
            {results.map((style, i) => {
              const saved = savedStyleIds.includes(style.id);
              return (
                <motion.div key={style.id} layout="position" exit={{ opacity: 0, scale: 0.96 }} transition={spring.small} className="style-tile">
                  <Reveal y={32} delay={(i % 4) * 0.06}>
                  <button onClick={() => navigate(`/order/new?style=${style.id}`)} className="stack gap-8" style={{ textAlign: "left", width: "100%" }} aria-label={isQuoted(style) ? `Ask about ${style.name}` : `Order ${style.name}, from ${money(fromPriceOf(style))}`}>
                    <Photo tone={style.tone} src={style.photo} alt={style.name} sizes="(min-width: 1200px) 290px, (min-width: 810px) 33vw, 50vw" ratio="4 / 5" radius="var(--r-img)" markSize={44} />
                    <span className="stack">
                      <span className="t-title" style={{ fontSize: 15 }}>{style.name}</span>
                      <span className="subtle t-cap">{style.unit ? style.unit.charAt(0).toUpperCase() + style.unit.slice(1) : categoryLabel(style.category)} · {style.readyDays}-day notice</span>
                      <span className="tabular" style={{ fontWeight: 500 }}>{isQuoted(style) ? "By quote" : style.kind === "unit" ? money(style.fromPrice) : `from ${money(fromPriceOf(style))}`}</span>
                    </span>
                  </button>
                  <motion.button className={`icon-btn save ${saved ? "is-on" : ""}`} onClick={() => actions.toggleSaved(style.id)} aria-pressed={saved} aria-label={saved ? `Remove ${style.name} from saved` : `Save ${style.name}`} whileTap={{ scale: 0.8 }} transition={spring.press}>
                    <Heart size={16} strokeWidth={1.8} fill={saved ? "currentColor" : "none"} />
                  </motion.button>
                  </Reveal>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </motion.div>
      )}
    </main>
  );
}
