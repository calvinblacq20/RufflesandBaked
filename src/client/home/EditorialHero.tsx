import { ArrowLeft, ArrowRight } from "lucide-react";
import { memo, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { STUDIO } from "../../data/business";
import { categoryLine, STYLES } from "../../data/catalog";
import { money } from "../../lib/format";
import { fromPriceOf } from "../../lib/pricing";
import { motionMode } from "../../motion";
import { initHero } from "./heroSlideshow";

type Look = "light" | "ghost";
type Action = { label: string; look: Look } & ({ to: string } | { menu: true });
type Slide = {
  label: string;
  /** Base name of the crops in public/photos/hero (scripts/build_hero_photos.py). */
  photo: string;
  alt: string;
  kicker: string;
  lines: [string, string];
  copy: string;
  actions: Action[];
};

/** Behind every slide while the photos change over; the wordmark's wine, deepened, white text on top. */
const WINE = "#3b0a1c";
const INK = "#ffffff";

/** The lowest priced cake on the menu: cakes only, not the desserts and pastries in the same line (bespoke pieces have no list price). */
const cakeFrom = Math.min(...STYLES.filter((s) => categoryLine(s.category) === "cakes" && s.category !== "treats").map((s) => fromPriceOf(s)).filter((p) => p > 0));

/** Professional Unsplash photos, credited in docs/photo-sources.md. */
const SLIDES: Slide[] = [
  {
    label: "Celebration cakes",
    photo: "cake",
    alt: "A three-tier cream cake topped with strawberries and blueberries, fairy lights behind",
    kicker: "Celebration cakes, Kasoa",
    lines: ["Baked", "by H"],
    copy: `Birthday, wedding and thanksgiving cakes, baked to order from ${money(cakeFrom)}.`,
    actions: [
      { label: "Order a cake", look: "light", to: "/explore?line=cakes" },
      { label: "See the menu", look: "ghost", menu: true },
    ],
  },
  {
    label: "Headpieces",
    photo: "tiara",
    alt: "A crystal tiara on a dark velvet stand",
    kicker: "Ruffles by H",
    lines: ["Ruffles", "by H"],
    copy: "Headpieces, fascinators, crowns and church hats, made by hand.",
    actions: [{ label: "Shop headpieces", look: "light", to: "/explore?line=ruffles" }],
  },
  {
    label: "Weddings",
    photo: "wedding",
    alt: "A tall white wedding cake dressed with orchids and roses",
    kicker: "Tiered & wedding",
    lines: ["Wedding", "Day"],
    copy: "The tiered cake and the bride's headpiece, from one studio.",
    actions: [{ label: "Plan the wedding", look: "light", to: "/explore?occasion=wedding" }],
  },
  {
    label: "Bridal bead work",
    photo: "beads",
    alt: "A bride's braided updo with a beaded hair vine, seen from behind",
    kicker: "Bridal & occasion",
    lines: ["Beaded", "by Hand"],
    copy: "Crowns, headbands and headpieces, beaded by hand for the bride and her party.",
    actions: [{ label: "See bridal pieces", look: "light", to: "/explore?line=ruffles&occasion=wedding" }],
  },
];

const srcSet = (photo: string, shape: "tall" | "wide", widths: number[]) => widths.map((w) => `/photos/hero/${photo}-${shape}-${w}.webp ${w}w`).join(", ");

/**
 * The home page's opening slideshow, in the editorial style of the Queens Wigs & Bundles build:
 * a photo filling the hero behind a big two-line title, and slides
 * that switch on their own (see ./heroSlideshow.ts). GSAP owns this markup once it mounts, so the
 * component is memoised and takes only a stable callback; it never re-renders.
 */
export const EditorialHero = memo(function EditorialHero({ onSeeMenu }: { onSeeMenu: () => void }) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => initHero(ref.current, { motion: motionMode() }), []);

  return (
    <section ref={ref} className="hero" aria-roledescription="carousel" aria-label={`${STUDIO.name} highlights`}>
      {/* The studio's name and links sit over the top in HeroBar (rendered by Home). */}
      {SLIDES.map((slide, i) => (
        <div key={slide.label} className="hero__slide" data-bg={WINE} data-ink={INK} data-nav-theme="dark" data-label={slide.label}>
          {/* Wide crop on landscape screens, tall crop on portrait ones; both fill the hero. */}
          <div className="hero__frame">
            <picture className="hero__picture">
              <source media="(orientation: landscape)" srcSet={srcSet(slide.photo, "wide", [1280, 1920, 2560])} sizes="(min-width: 1248px) 1200px, 100vw" />
              <img
                className="hero__img"
                src={`/photos/hero/${slide.photo}-tall-1080.webp`}
                srcSet={srcSet(slide.photo, "tall", [720, 1080, 1440])}
                sizes="100vw"
                width={1080}
                height={1440}
                alt={slide.alt}
                loading={i === 0 ? "eager" : "lazy"}
                fetchPriority={i === 0 ? "high" : undefined}
                decoding="async"
                draggable={false}
              />
            </picture>
          </div>
          <p className="hero__title" role="heading" aria-level={2}>
            <span className="hero__kicker">{slide.kicker}</span>
            <span className="hero__line">{slide.lines[0]}</span>
            <span className="hero__line">{slide.lines[1]}</span>
          </p>
          <div className="hero__copy">
            <p data-hero-fade>{slide.copy}</p>
            <div className="hero__ctas" data-hero-fade>
              {slide.actions.map((action) =>
                "to" in action ? (
                  <Link key={action.label} className={`hero-btn hero-btn--${action.look}`} to={action.to}>
                    {action.label}
                  </Link>
                ) : (
                  <button key={action.label} type="button" className={`hero-btn hero-btn--${action.look}`} onClick={onSeeMenu}>
                    {action.label}
                  </button>
                ),
              )}
            </div>
          </div>
        </div>
      ))}

      {/* Turns as the page scrolls; the studio's tagline runs round a crown. */}
      <div className="hero__badge" aria-hidden="true">
        <svg viewBox="0 0 120 120">
          <defs>
            <path id="hero-badge-circle" d="M60 60m-46 0a46 46 0 1 1 92 0a46 46 0 1 1-92 0" />
          </defs>
          <text>
            <textPath href="#hero-badge-circle">Look great · Feel fabulous ·</textPath>
          </text>
          <path d="M43 70L45 52l8 8 7-13 7 13 8-8 2 18z" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinejoin="round" strokeLinecap="round" />
        </svg>
      </div>

      <div className="hero__controls">
        <button className="hero__arrow" type="button" data-hero-prev aria-label="Previous slide">
          <ArrowLeft size={16} strokeWidth={1.5} />
        </button>
        <div className="hero__dots" />
        <button className="hero__arrow" type="button" data-hero-next aria-label="Next slide">
          <ArrowRight size={16} strokeWidth={1.5} />
        </button>
      </div>
    </section>
  );
});
