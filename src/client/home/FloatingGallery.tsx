import { motion, useScroll, useTransform, type MotionValue } from "motion/react";
import { useRef, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { Photo } from "../../components/Bits";
import { ScrollRevealText } from "../../components/Scroll";
import type { Tone } from "../../data/types";
import { motionMode } from "../../motion";

export interface GalleryPiece {
  id: string;
  photo?: string;
  tone: Tone;
  /** Occasion pieces are links; the rest are scenery and stay out of the tab order. */
  label?: string;
  href?: string;
}

/** Where one photo hangs in the field, and how near the camera it is. */
interface Spot {
  /** Its resting place, across and down the stage, in per cent. */
  x: number;
  y: number;
  /** 0 is far away, 1 is right in front: sets its size, its sharpness and how fast it sweeps past. */
  depth: number;
  /** Degrees of tilt at rest. */
  rot: number;
  /** Width on a wide screen, in px; phones take a fraction of it (--fgal-k). */
  w: number;
  ratio: string;
  /** Left out on phones, where a thinner field reads better and costs less to paint. */
  wide?: boolean;
}

/**
 * Hand-placed rather than generated: the middle has to stay clear for the heading, and a random
 * scatter clumps. The first nine are the near, prominent ones, so the occasion links get them.
 */
/** How far the camera travels into the field over one section. */
const TRAVEL = 2.9;

const SPOTS: Spot[] = [
  // Perspective puts distant things near the middle and near ones out at the edges, and that is
  // also what makes the fly-through work: a card only sweeps past if it starts close to the axis
  // and has room to travel outward. So the far, dim ones sit behind the heading (a scrim keeps
  // that readable) and the big near ones hug the corners, already half out of frame.
  { x: 6, y: 12, depth: 0.96, rot: -8, w: 200, ratio: "3 / 4" },
  { x: 94, y: 20, depth: 0.88, rot: 7, w: 190, ratio: "4 / 5" },
  { x: 10, y: 88, depth: 0.8, rot: 5, w: 182, ratio: "1 / 1" },
  { x: 90, y: 82, depth: 0.72, rot: -6, w: 188, ratio: "3 / 4" },
  { x: 24, y: 14, depth: 0.64, rot: -3, w: 140, ratio: "4 / 5" },
  { x: 76, y: 90, depth: 0.56, rot: 6, w: 142, ratio: "3 / 4" },
  { x: 11, y: 50, depth: 0.48, rot: 9, w: 146, ratio: "1 / 1" },
  { x: 89, y: 52, depth: 0.4, rot: -5, w: 144, ratio: "3 / 4", wide: true },
  { x: 29, y: 78, depth: 0.34, rot: 4, w: 128, ratio: "4 / 5", wide: true },
  { x: 43, y: 40, depth: 0.28, rot: -9, w: 92, ratio: "1 / 1" },
  { x: 58, y: 57, depth: 0.24, rot: 3, w: 96, ratio: "3 / 4" },
  { x: 40, y: 61, depth: 0.19, rot: -4, w: 88, ratio: "4 / 5", wide: true },
  { x: 60, y: 38, depth: 0.14, rot: 7, w: 84, ratio: "3 / 4" },
  { x: 47, y: 33, depth: 0.09, rot: -7, w: 90, ratio: "1 / 1", wide: true },
];

/**
 * The studio's work hanging in the air, which you fly through as you scroll.
 *
 * Every card sits inside a wrapper the size of the stage, so growing that wrapper does two things
 * at once and in the right proportion: the photo gets bigger and it slides away from the middle.
 * That is a dolly — one `scale` per card, nothing measured per frame — and it is why the near
 * cards tear past the edges while the small, dim, far ones barely drift. The heading stays put in
 * the middle the whole way, so the field comes apart around a fixed point.
 */
export function FloatingGallery({
  id,
  pieces,
  eyebrow,
  heading,
  action,
}: {
  id: string;
  pieces: GalleryPiece[];
  eyebrow: string;
  heading: string;
  action?: ReactNode;
}) {
  const ref = useRef<HTMLElement>(null);
  const mode = motionMode();
  // Runs while the stage is pinned: 0 as it locks to the top, 1 as the section's foot arrives.
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });
  // Runs before that, while the stage is still rising into view: the heading's own range, since
  // once pinned it stops moving and a reveal keyed to its own position would stall half-lit.
  const { scrollYProgress: approach } = useScroll({ target: ref, offset: ["start end", "start start"] });

  const reveal = useTransform(approach, [0.15, 0.8], [0, 1]);

  const cards = pieces.slice(0, SPOTS.length).map((piece, i) => ({ piece, spot: SPOTS[i] as Spot }));
  const titleId = `${id}-title`;

  if (mode === "off") {
    return (
      <section id={id} className="anchor fgal is-still" aria-labelledby={titleId}>
        <div className="fgal-still-head">
          <p className="t-cap fgal-eyebrow">{eyebrow}</p>
          <h2 id={titleId} className="display-head">
            {heading}
          </h2>
          {action}
        </div>
        <div className="fgal-still-grid">
          {cards
            .filter(({ piece }) => piece.href)
            .map(({ piece, spot }) => (
              <Link key={piece.id} to={piece.href ?? "/explore"} className="fgal-still-card" aria-label={piece.label}>
                <Photo tone={piece.tone} src={piece.photo} alt="" ratio={spot.ratio} radius="var(--r-img)" sizes="(min-width: 810px) 220px, 44vw" markSize={40}>
                  <span className="fgal-label">{piece.label}</span>
                </Photo>
              </Link>
            ))}
        </div>
      </section>
    );
  }

  return (
    <section id={id} ref={ref} className="fgal anchor" data-nav-theme="dark" aria-labelledby={titleId}>
      <div className="fgal-stage">
        <div className="fgal-field">
          {cards.map(({ piece, spot }) => (
            <FieldCard key={piece.id} piece={piece} spot={spot} progress={scrollYProgress} fly={mode === "full"} />
          ))}
        </div>

        {/* Holds the middle dark enough to read, whatever is drifting behind it. */}
        <div className="fgal-scrim" aria-hidden="true" />

        <div className="fgal-mid">
          <p className="t-cap fgal-eyebrow">{eyebrow}</p>
          <ScrollRevealText as="h2" id={titleId} className="display-head fgal-title" text={heading} progress={reveal} />
          {action}
        </div>
      </div>
    </section>
  );
}

function FieldCard({ piece, spot, progress, fly }: { piece: GalleryPiece; spot: Spot; progress: MotionValue<number>; fly: boolean }) {
  // Where this photo waits, in camera units. The camera covers TRAVEL of them over the section,
  // so the near ones are passed early and the far ones right at the end, one after another
  // rather than all at once.
  const dist = 0.9 + (1 - spot.depth) * 3.1;
  const rest = 0.42 + spot.depth * 0.58;

  // The perspective divide, which is the whole trick: a photo creeps closer, then rushes past.
  const scale = useTransform(progress, (p) => Math.min(12, dist / Math.max(dist - TRAVEL * p, 0.01)));
  // It comes up out of the dark as it nears, and is gone by the time it would go soft.
  const opacity = useTransform(progress, (p) => {
    const size = Math.min(12, dist / Math.max(dist - TRAVEL * p, 0.01));
    const lit = rest + (1 - rest) * Math.min(1, (size - 1) / 0.8);
    return lit * Math.min(1, Math.max(0, (4 - size) / 1.8));
  });

  return (
    <motion.div
      className="fgal-slot"
      data-wide={spot.wide ? "" : undefined}
      style={{ zIndex: Math.round((5 - dist) * 20), ...(fly ? { scale, opacity } : { opacity: rest }) }}
    >
      <div
        className="fgal-anchor"
        style={{ left: `${spot.x}%`, top: `${spot.y}%`, width: `calc(var(--fgal-k) * ${spot.w}px)`, rotate: `${spot.rot}deg` }}
      >
        <div className="fgal-float" style={{ animationDelay: `-${(spot.x * 37) % 9}s`, animationDuration: `${7 + (spot.y % 5)}s` }}>
          {piece.href ? (
            <Link to={piece.href} className="fgal-card" aria-label={piece.label}>
              <CardPhoto piece={piece} spot={spot} />
              <span className="fgal-label">{piece.label}</span>
            </Link>
          ) : (
            <div className="fgal-card" aria-hidden="true">
              <CardPhoto piece={piece} spot={spot} />
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

/** Asked for at twice its resting width, since a photo keeps growing as it comes at you. */
function CardPhoto({ piece, spot }: { piece: GalleryPiece; spot: Spot }) {
  return (
    <Photo
      tone={piece.tone}
      src={piece.photo}
      alt=""
      ratio={spot.ratio}
      radius="var(--r-img)"
      sizes={`(min-width: 810px) ${spot.w * 2}px, ${Math.round(spot.w * 1.2)}px`}
      markSize={Math.round(spot.w / 4)}
    />
  );
}
