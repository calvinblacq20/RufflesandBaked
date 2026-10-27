import { AnimatePresence, motion, useScroll, useSpring, useTransform } from "motion/react";
import { useRef, useState, type ReactNode } from "react";
import { Photo } from "../../components/Bits";
import type { Tone } from "../../data/types";
import { motionMode } from "../../motion";

/** A mouse or trackpad, not a finger: the preview only makes sense where there is a pointer. */
const finePointer = () => typeof window !== "undefined" && window.matchMedia("(hover: hover) and (pointer: fine)").matches;

export interface RevealRow {
  id: string;
  /** The big line. */
  title: string;
  /** The grey column on the right. */
  body: string;
  /** Sits under the body, for a price or a notice. */
  meta?: string;
  photo?: string;
  tone: Tone;
  /** Wraps the row when it should go somewhere. */
  href?: string;
  /** Sits at the end of the row on wide screens. */
  action?: ReactNode;
}

/**
 * The editorial list: a number, a big line, and the detail in a grey column on the right, with a
 * hairline between each one. Each row slides in from the left and lifts out of grey as it comes up
 * the screen, and on a mouse the row's photo follows the pointer across it.
 *
 * The scroll and the pointer are separate: the slide-in is driven by where the row sits in the
 * viewport, so it settles whether or not anything is hovered.
 */
export function RevealRows({ rows, ariaLabel }: { rows: RevealRow[]; ariaLabel: string }) {
  const listRef = useRef<HTMLDivElement>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const mode = motionMode();

  // The floating preview trails the pointer rather than snapping to it.
  const px = useSpring(0, { stiffness: 220, damping: 28, mass: 0.6 });
  const py = useSpring(0, { stiffness: 220, damping: 28, mass: 0.6 });

  /**
   * One handler does both jobs: it parks the preview under the pointer and works out which row
   * it is over. Reading the row off the event target is steadier than per-row enter handlers,
   * which skip when the pointer crosses a gap or a child element.
   */
  const onMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (mode === "off" || !finePointer()) return;
    const box = listRef.current?.getBoundingClientRect();
    if (!box) return;
    px.set(e.clientX - box.left);
    py.set(e.clientY - box.top);
    const row = (e.target as HTMLElement).closest<HTMLElement>(".rev-row");
    setHovered(row?.dataset.rowId ?? null);
  };

  const preview = rows.find((r) => r.id === hovered);

  return (
    <div
      ref={listRef}
      className="rev-rows"
      role="list"
      aria-label={ariaLabel}
      onPointerMove={onMove}
      onPointerLeave={() => setHovered(null)}
    >
      {rows.map((row, i) => (
        <Row key={row.id} row={row} index={i} onHover={setHovered} />
      ))}

      {/* One preview for the whole list, parked under the pointer. Decorative: every row already
          carries its own photo in the markup for narrow screens. */}
      <AnimatePresence>
        {preview?.photo && mode !== "off" && (
          <motion.div
            key={preview.id}
            className="rev-peek"
            aria-hidden="true"
            style={{ x: px, y: py }}
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          >
            <Photo tone={preview.tone} src={preview.photo} alt="" sizes="220px" ratio="4 / 5" radius="var(--r-img)" markSize={34} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Row({ row, index, onHover }: { row: RevealRow; index: number; onHover: (id: string | null) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const mode = motionMode();
  // Starts as the row reaches the lower third and finishes well before the middle, so it has
  // settled by the time it is comfortably readable.
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 0.92", "start 0.45"] });
  const x = useTransform(scrollYProgress, [0, 1], [-34, 0]);
  const opacity = useTransform(scrollYProgress, [0, 1], [0.18, 1]);

  const still = mode === "off";
  const inner = (
    <>
      <span className="rev-num" aria-hidden="true">
        {String(index + 1).padStart(2, "0")}
      </span>
      <motion.span className="rev-title" style={still ? undefined : { x: mode === "full" ? x : 0, opacity }}>
        {row.title}
      </motion.span>
      <motion.span className="rev-detail" style={still ? undefined : { opacity }}>
        <span className="rev-body">{row.body}</span>
        {row.meta && <span className="rev-meta">{row.meta}</span>}
      </motion.span>
      {row.action && <span className="rev-action">{row.action}</span>}
    </>
  );

  return (
    <div ref={ref} role="listitem" className="rev-row" data-row-id={row.id} onFocus={() => onHover(row.id)}>
      {inner}
    </div>
  );
}
