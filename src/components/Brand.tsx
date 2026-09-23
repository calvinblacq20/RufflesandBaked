import { useId } from "react";

/**
 * The Ruffles and Baked by H mark: the wide-brim hat from the studio's own logo, drawn as one
 * filled shape. The brim and crown are solid; the hat band and a three-bead cluster are cut out
 * of it, so the mark reads at favicon size and on any background. The same geometry lives in
 * public/favicon.svg and scripts/make_icons.py.
 */
export const MARK = {
  viewBox: "0 0 100 100",
  /** The brim: a flattened ellipse the crown sits on. */
  brim: { cx: 50, cy: 68, rx: 47, ry: 14 },
  /** The crown: a dome that meets the brim at its widest. */
  crown: "M27 70 C27 40 33 23 50 23 C67 23 73 40 73 70 Z",
  /** The band, cut as a capsule across the foot of the crown. */
  band: { x1: 25, x2: 75, y: 62, width: 7 },
  /** A beaded cluster pinned to the right of the crown, cut as three circles. */
  beads: [
    [63, 41, 4.2],
    [69, 48, 3.2],
    [60, 50, 2.6],
  ] as const,
};

export function LogoMark({ size = 32, className, title }: { size?: number; className?: string; title?: string }) {
  const mask = `rbh-${useId().replace(/:/g, "")}`;
  const { brim, band } = MARK;
  return (
    <svg
      viewBox={MARK.viewBox}
      width={size}
      height={size}
      className={className}
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      fill="currentColor"
    >
      <defs>
        <mask id={mask} maskUnits="userSpaceOnUse" x="0" y="0" width="100" height="100">
          <rect width="100" height="100" fill="#fff" />
          <line x1={band.x1} y1={band.y} x2={band.x2} y2={band.y} stroke="#000" strokeWidth={band.width} strokeLinecap="round" />
          {MARK.beads.map(([cx, cy, r]) => (
            <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={r} fill="#000" />
          ))}
        </mask>
      </defs>
      <g mask={`url(#${mask})`}>
        <ellipse cx={brim.cx} cy={brim.cy} rx={brim.rx} ry={brim.ry} />
        <path d={MARK.crown} />
      </g>
    </svg>
  );
}

export function AppIcon({ size = 40 }: { size?: number }) {
  return (
    <span className="app-icon" style={{ width: size, height: size, borderRadius: size * 0.26 }}>
      <LogoMark size={size * 0.64} />
    </span>
  );
}
