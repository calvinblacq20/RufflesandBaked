import { Link } from "react-router-dom";
import type { ReactNode } from "react";
import { Photo } from "./Bits";
import { Reveal } from "./Reveal";
import type { Tone } from "../data/types";

export interface ProductItem {
  id: string;
  name: string;
  photo?: string;
  tone: Tone;
  /** The price line: a figure, a "from" figure, or "By quote". */
  price: string;
  /** Quiet text after the price — the notice period, usually. */
  note?: string;
  /** Pill at the end of the name row, for the one thing worth saying up front. */
  badge?: string;
  /** A cutout on transparency: show it whole instead of cropping it to fill the tile. */
  cutout?: boolean;
  href?: string;
  /** Sits in the corner of the picture; the save heart, on Explore. */
  corner?: ReactNode;
}

/**
 * The menu as a ruled grid: a picture, then the name and the price under it, with hairlines
 * between every cell. Two across on a phone and three on a wider screen, so the whole menu can
 * be taken in at a glance instead of scrolled through a row at a time.
 */
export function ProductGrid({
  items,
  ariaLabel,
  wide,
  sizes = "(min-width: 1280px) 300px, (min-width: 810px) 33vw, 50vw",
}: {
  items: ProductItem[];
  ariaLabel: string;
  /** Lets the grid go to four across on a big screen, for the full menu. */
  wide?: boolean;
  sizes?: string;
}) {
  return (
    <ul className={`pgrid ${wide ? "is-wide" : ""}`} aria-label={ariaLabel}>
      {items.map((item, i) => (
        <li key={item.id} className="pgrid-cell">
          <Reveal y={28} delay={(i % 4) * 0.05} className="pgrid-reveal">
            <Link to={item.href ?? "/explore"} className="pgrid-link">
              <span className={`pgrid-pic ${item.cutout ? "is-cutout" : ""}`}>
                <Photo tone={item.tone} src={item.photo} alt="" ratio="1 / 1" radius={0} sizes={sizes} markSize={44} />
              </span>
              <span className="pgrid-row">
                <span className="pgrid-name">{item.name}</span>
                {item.badge && <span className="pgrid-badge">{item.badge}</span>}
              </span>
              <span className="pgrid-price">
                {item.price}
                {item.note && <span className="pgrid-note">{item.note}</span>}
              </span>
            </Link>
            {item.corner}
          </Reveal>
        </li>
      ))}
    </ul>
  );
}
