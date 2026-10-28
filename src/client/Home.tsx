import { ArrowUpRight, CakeSlice, CalendarClock, Clock, Gift, MapPin, MessageCircle, Phone, Sparkles, Truck, Wallet } from "lucide-react";
import { InstagramIcon } from "../components/SocialIcons";
import { motion } from "motion/react";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AppIcon } from "../components/Brand";
import { Photo, SectionHead, Skeleton, Stars, useSkeleton } from "../components/Bits";
import { Cta } from "../components/Button";
import { MapCard } from "../components/MapCard";
import { ContactDock } from "./home/ContactDock";
import { Reveal } from "../components/Reveal";
import { HeroBar } from "./home/HeroBar";
import { CountUp, ScrollRevealText, useScrollTo } from "../components/Scroll";
import { FloatingGallery, type GalleryPiece } from "./home/FloatingGallery";
import { ProductGrid, type ProductItem } from "../components/ProductGrid";
import { ClosingCta } from "./home/ClosingCta";
import { EditorialHero } from "./home/EditorialHero";
import { HowItWorks } from "./home/HowItWorks";
import { WhyBento } from "./home/WhyBento";
import { useNotify } from "../components/Notify";
import { Sheet } from "../components/Sheet";
import { HOURS, OCCASION_PHOTOS, STUDIO, STUDIO_FEATURES } from "../data/business";
import { CATEGORIES, OCCASIONS, STYLES } from "../data/catalog";
import { accountOf, useAppData } from "../data/store";
import type { CategoryId } from "../data/types";
import { telLink, whatsappLink } from "../lib/contact";
import { fmtDate, money, weekdayLong } from "../lib/format";
import { fromPriceOf, isQuoted } from "../lib/pricing";
import { openStatus } from "../lib/schedule";
import { spring } from "../motion";

const FEATURE_ICONS = { truck: Truck, sparkles: Sparkles, gift: Gift, cake: CakeSlice, wallet: Wallet, calendar: CalendarClock } as const;
const STATEMENT =
  "Ruffles and Baked by H is Hillary's studio in Kasoa. Bespoke handmade headpieces, hats, crowns and the whole bridal set from the workroom; celebration cakes, kids' themed cakes and pastries from the kitchen. Most people come for one and stay for both.";
const OCCASION_TONES = ["sky", "blush", "charcoal", "sand", "lilac"] as const;
/** The gallery field: every occasion as a link, then scenery to fill the far distance. */
const GALLERY_PIECES: GalleryPiece[] = [
  ...OCCASIONS.filter((o) => o.id !== "other").map((o, i): GalleryPiece => ({
    id: o.id,
    label: o.label,
    href: `/explore?occasion=${o.id}`,
    photo: OCCASION_PHOTOS[o.id]?.src,
    cutout: OCCASION_PHOTOS[o.id]?.cutout,
    tone: OCCASION_TONES[i % OCCASION_TONES.length] ?? "sky",
  })),
  { id: "far-crown", photo: "/photos/crown-crystal.webp", tone: "lilac" },
  { id: "far-blue", photo: "/photos/headpiece-blue.webp", tone: "sky" },
  { id: "far-hat", photo: "/photos/hat-cream-gold.webp", tone: "sand" },
  { id: "far-tiara", photo: "/photos/tiara-gold.webp", tone: "blush" },
  { id: "far-minnie", photo: "/photos/cake-minnie.webp", tone: "charcoal" },
];

export function Home() {
  const loading = useSkeleton(700);
  return loading ? <HomeSkeleton /> : <StudioPage />;
}

function HomeSkeleton() {
  return (
    <main className="screen" aria-busy="true" aria-label="Loading the studio">
      {/* The page's own shape while it loads: the hero, the gallery's dark stage, the opening
          paragraph, then the ruled menu. It borrows the grid's real markup so the cells land
          exactly where the photos will. */}
      <Skeleton w="calc(100% + var(--gutter) * 2)" h={440} r={0} className="mobile-only" style={{ marginInline: "calc(var(--gutter) * -1)" }} />
      <Skeleton h={520} r={12} className="desktop-only" style={{ marginTop: 4 }} />
      <div className="sk-stage" aria-hidden="true" />
      <div className="stack gap-12" style={{ maxWidth: 680, marginTop: 32 }}>
        <Skeleton w="94%" h={20} />
        <Skeleton w="86%" h={20} />
        <Skeleton w="52%" h={20} />
      </div>
      <ul className="pgrid" style={{ marginTop: 32 }} aria-hidden="true">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <li key={i} className="pgrid-cell">
            <div className="pgrid-link">
              <Skeleton r={0} h="auto" style={{ aspectRatio: "1 / 1" }} />
              <Skeleton w="68%" h={15} />
              <Skeleton w="42%" h={15} style={{ marginTop: "auto" }} />
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
}

function StudioPage() {
  const data = useAppData();
  const account = accountOf(data);
  const navigate = useNavigate();
  const notify = useNotify();
  const now = new Date();
  const status = openStatus(now, HOURS);
  const [saved, setSaved] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [category, setCategory] = useState<CategoryId | "featured">("featured");
  const [showHeader, setShowHeader] = useState(false);
  const [reviewsOpen, setReviewsOpen] = useState(false);
  const heroRef = useRef<HTMLDivElement>(null);

  const styles = useMemo(
    () => (category === "featured" ? STYLES.filter((s) => s.featured) : STYLES.filter((s) => s.category === category)),
    [category],
  );
  // Bespoke pieces have no list price, so they don't set the floor.
  const cheapest = Math.min(...STYLES.map((s) => fromPriceOf(s)).filter((p) => p > 0));

  useEffect(() => {
    const onScroll = () => setShowHeader(window.scrollY > (heroRef.current?.offsetHeight ?? 300) - 90);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Tablet and desktop: the hero's own bar is the header at the top, so the floating nav stays tucked
  // away until the hero scrolls off (styles in hero.css). Set before paint so the nav never flashes.
  useLayoutEffect(() => {
    document.documentElement.dataset.heroNav = showHeader ? "shown" : "tucked";
  }, [showHeader]);
  useLayoutEffect(
    () => () => {
      delete document.documentElement.dataset.heroNav;
    },
    [],
  );

  const share = async () => {
    const shareData = { title: STUDIO.name, text: `${STUDIO.name}: ${STUDIO.tagline} · ${STUDIO.area}`, url: window.location.href };
    try {
      if (navigator.share) await navigator.share(shareData);
      else {
        await navigator.clipboard.writeText(shareData.url);
        notify("Link copied", "Paste it anywhere to share the studio.");
      }
    } catch {
      /* the person closed the share sheet */
    }
  };

  const scrollTo = useScrollTo();
  // Each section's scroll-margin-top (.anchor) already leaves room for the nav and the section tabs.
  const goTo = (id: string) => scrollTo(document.getElementById(id));
  // The hero's "See the menu" button; a stable callback so the hero never re-renders (GSAP owns its markup).
  const goToRef = useRef(goTo);
  goToRef.current = goTo;
  const seeMenu = useCallback(() => goToRef.current("styles"), []);

  return (
    <main className="screen studio">
      {/* The page's one h1. The hero's wordmark changes with the slide, so it cannot be the
          heading; this says what the page is, once, for readers and crawlers. */}
      <h1 className="sr-only">
        {STUDIO.name} — {STUDIO.category} in {STUDIO.area}
      </h1>

      {/* Opening slideshow, with the studio's name and page links across its top */}
      <div ref={heroRef} className="hero-wrap">
        <EditorialHero onSeeMenu={seeMenu} />
        <HeroBar onSection={goTo} />
      </div>

      {/* WhatsApp, call, share and save, floating at the bottom right while the page scrolls */}
      <ContactDock saved={saved} onSave={() => setSaved(!saved)} onShare={share} />

      {/* Lookbook by occasion: the work hanging in the air, flown through on scroll */}
      <FloatingGallery
        id="lookbook"
        eyebrow="Gallery"
        heading="Every piece leaves the studio by hand."
        pieces={GALLERY_PIECES}
        action={
          <Link className="btn btn-sm fgal-cta" to="/explore">
            See all the work
          </Link>
        }
      />

      <div className="studio-layout">
      <div className="studio-main">
      {/* About */}
      <section id="about" className="section anchor about">
        <Reveal as="span" look="focus" className="eyebrow">
          About the studio
        </Reveal>
        <ScrollRevealText className="statement is-display" text={STATEMENT} />
        {aboutOpen && (
          <motion.p className="t-lead" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={spring.small} style={{ color: "var(--ink-75)" }}>
            {STUDIO.about}
          </motion.p>
        )}
        <button className="link t-body" onClick={() => setAboutOpen(!aboutOpen)} style={{ alignSelf: "flex-start" }}>
          {aboutOpen ? "Show less" : "More about the studio"}
        </button>
      </section>

      {/* Styles */}
      <section id="styles" className="section anchor">
        <SectionHead title={<ScrollRevealText as="h2" className="display-head" text="What the studio makes." />} />
        <div className="chips">
          {[{ id: "featured" as const, label: "Featured" }, ...CATEGORIES].map((c) => (
            <button key={c.id} className={`chip ${category === c.id ? "is-active" : ""}`} onClick={() => setCategory(c.id)}>
              {c.label}
            </button>
          ))}
        </div>
        <ProductGrid
          ariaLabel="Featured menu"
          sizes="(min-width: 810px) 240px, 50vw"
          items={styles.slice(0, 6).map((style): ProductItem => ({
            id: style.id,
            name: style.name,
            photo: style.photo,
            cutout: style.cutout,
            tone: style.tone,
            href: `/order/new?style=${style.id}`,
            badge: isQuoted(style) ? "By quote" : undefined,
            price: isQuoted(style) ? "Ask for a price" : style.kind === "unit" ? money(style.fromPrice) : `from ${money(fromPriceOf(style))}`,
            note: `${style.readyDays}-day notice`,
          }))}
        />
        <Link to="/explore" className="btn btn-outline btn-block">
          See the full menu ({STYLES.length})
        </Link>
      </section>

      </div>

      {/* Desktop: sticky side card, like the reference venue page on the web */}
      <aside className="studio-aside desk" aria-label="Order from the studio">
        <div className="card aside-card stack gap-12">
          <div className="inline" style={{ gap: 12 }}>
            <AppIcon size={48} />
            <div className="stack">
              <p className="t-title">{STUDIO.name}</p>
              <span className="inline t-cap" style={{ gap: 6 }}>
                <strong style={{ fontWeight: 500 }}>{STUDIO.rating}</strong>
                <Stars value={STUDIO.rating} size={12} />
                <span className="subtle">({STUDIO.reviewCount})</span>
              </span>
            </div>
          </div>
          <p className="inline t-body" style={{ color: status.open ? "var(--open)" : "var(--warning-ink)" }}>
            <Clock size={15} /> {status.label}
          </p>
          <div className="divider" style={{ margin: 0 }} />
          <p className="info-line">
            <MapPin size={16} />
            <span>{STUDIO.area}</span>
          </p>
          <p className="info-line">
            <Truck size={16} />
            <span>Pickup in Kasoa · delivery across Accra</span>
          </p>
          <p className="info-line">
            <CakeSlice size={16} />
            <span>
              {STYLES.length} cakes and pieces from {money(cheapest)}
            </span>
          </p>
          <Cta className="btn-block" onClick={() => navigate("/order/new")}>
            Order now
          </Cta>
          <a className="btn btn-outline btn-block" href={STUDIO.whatsappBusiness} target="_blank" rel="noreferrer">
            <MessageCircle size={16} /> Chat on WhatsApp
          </a>
        </div>
        <div className="card card-pad stack gap-8">
          <Photo tone="mist" src="/photos/hat-cream-gold.webp" alt="A Ruffles and Baked by H wedding cake and cupcake tower at a reception" position="center 45%" sizes="320px" height={150} radius="var(--r-img)" />
          <p className="t-title">Weddings and engagements</p>
          <p className="muted">One studio for the cake and the bridal set: the bride's piece, the bouquet, the boutonnieres and the fan, worked in your colours and boxed together.</p>
          <Link className="link t-body" to="/order/new?style=bridal-set" style={{ alignSelf: "flex-start" }}>
            Plan a bridal set
          </Link>
        </div>
      </aside>
      </div>

      <HowItWorks />

      <WhyBento />

      {/* Reviews */}
      <section id="reviews" className="section anchor">
        <SectionHead
          title="Reviews"
          action={
            <button className="link t-cap" onClick={() => setReviewsOpen(true)}>
              See all
            </button>
          }
        />
        <div className="card card-pad stack gap-8">
          <div className="inline" style={{ gap: 12 }}>
            <CountUp className="t-num" to={STUDIO.rating} decimals={1} />
            <div className="stack">
              <Stars value={STUDIO.rating} size={16} />
              <span className="subtle t-cap">
                <CountUp to={STUDIO.reviewCount} /> reviews
              </span>
            </div>
          </div>
          <p className="muted">Clients mention moist sponge, cakes that look just like the picture they sent, and pickups ready on time.</p>
          <p className="inline subtle t-cap">
            <Sparkles size={13} /> Summary of client reviews
          </p>
        </div>
        <div className="stack gap-12 review-list">
          {data.reviews.filter((r) => r.status === "published").slice(0, 2).map((r) => (
            <ReviewItem key={r.id} name={r.name} rating={r.rating} text={r.text} at={r.at} styleId={r.styleId} />
          ))}
        </div>
      </section>

      {/* Info */}
      <div className="desk-3col">
      <section id="info" className="section anchor">
        <SectionHead title="Opening times" />
        <div className="card card-pad stack gap-8">
          {[1, 2, 3, 4, 5, 6, 0].map((dow) => {
            const span = HOURS[dow];
            const today = dow === now.getDay();
            const sample = new Date(2026, 0, 4 + dow);
            return (
              <div key={dow} className="between" style={{ fontWeight: today ? 500 : 400 }}>
                <span>{weekdayLong(sample)}</span>
                <span className="tabular" style={{ color: span ? undefined : "var(--ink-50)" }}>
                  {span ? `${span[0]} – ${span[1]}` : "Closed"}
                </span>
              </div>
            );
          })}
        </div>
      </section>

      <section className="section">
        <SectionHead title="Good to know" />
        <ul className="ruled">
          {STUDIO_FEATURES.map((f) => {
            const Icon = FEATURE_ICONS[f.icon];
            return (
              <li key={f.label}>
                <div className="ruled-row">
                  <Icon size={18} strokeWidth={1.6} className="ruled-icon" />
                  <span className="ruled-body">
                    <span className="ruled-title">{f.label}</span>
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="section">
        <SectionHead title="Getting there" />
        <MapCard />
      </section>
      </div>

      <div className="desk-2col">
      <section className="section">
        <SectionHead title="Contact" />
        <ul className="ruled">
          <li>
            <a className="ruled-row is-link" href={STUDIO.whatsappBusiness} target="_blank" rel="noreferrer">
              <MessageCircle size={18} strokeWidth={1.6} className="ruled-icon" />
              <span className="ruled-body">
                <span className="ruled-title">Chat on WhatsApp</span>
              </span>
              <ArrowUpRight size={16} strokeWidth={1.7} className="ruled-go" />
            </a>
          </li>
          <li>
            <a className="ruled-row is-link" href={telLink(STUDIO.phone)}>
              <Phone size={18} strokeWidth={1.6} className="ruled-icon" />
              <span className="ruled-body">
                <span className="ruled-title">Call {STUDIO.phone}</span>
              </span>
              <ArrowUpRight size={16} strokeWidth={1.7} className="ruled-go" />
            </a>
          </li>
          <li>
            <a className="ruled-row is-link" href={STUDIO.instagram} target="_blank" rel="noreferrer">
              <InstagramIcon size={18} strokeWidth={1.6} className="ruled-icon" />
              <span className="ruled-body">
                <span className="ruled-title">@ruffles_byh on Instagram</span>
                <span className="ruled-note">Cakes, behind the scenes and cake classes</span>
              </span>
              <ArrowUpRight size={16} strokeWidth={1.7} className="ruled-go" />
            </a>
          </li>
        </ul>
      </section>

      <section className="section">
        <SectionHead title="Loyalty" />
        <ul className="ruled">
          <li>
            {account ? (
              <div className="ruled-row">
                <Sparkles size={18} strokeWidth={1.6} className="ruled-icon" />
                <span className="ruled-body">
                  <span className="ruled-title">{account.points} points</span>
                  <span className="ruled-note">Worth {money(account.points / 10)} off your next order</span>
                </span>
              </div>
            ) : (
              <Link className="ruled-row is-link" to="/profile">
                <Sparkles size={18} strokeWidth={1.6} className="ruled-icon" />
                <span className="ruled-body">
                  <span className="ruled-title">Earn points on every order</span>
                  <span className="ruled-note">Optional: save an account with your WhatsApp number to collect them</span>
                </span>
                <ArrowUpRight size={16} strokeWidth={1.7} className="ruled-go" />
              </Link>
            )}
          </li>
          <li>
            <a className="ruled-row is-link" href={whatsappLink("", `I get my cakes and my headpieces from ${STUDIO.name} in Kasoa. Order here: ${window.location.origin}`)} target="_blank" rel="noreferrer">
              <Gift size={18} strokeWidth={1.6} className="ruled-icon" />
              <span className="ruled-body">
                <span className="ruled-title">Refer a friend</span>
                <span className="ruled-note">You both get 100 points on their first order</span>
              </span>
              <ArrowUpRight size={16} strokeWidth={1.7} className="ruled-go" />
            </a>
          </li>
        </ul>
      </section>
      </div>

      <ClosingCta />

      <Sheet open={reviewsOpen} onClose={() => setReviewsOpen(false)} title={`${STUDIO.reviewCount} reviews`}>
        <div className="stack gap-12">
          {data.reviews.filter((r) => r.status === "published").map((r) => (
            <ReviewItem key={r.id} name={r.name} rating={r.rating} text={r.text} at={r.at} styleId={r.styleId} flat />
          ))}
          <p className="t-cap subtle" style={{ textAlign: "center" }}>
            Sample reviews for this preview.
          </p>
        </div>
      </Sheet>
    </main>
  );
}

function ReviewItem({ name, rating, text, at, styleId, flat }: { name: string; rating: number; text: string; at: string; styleId: string; flat?: boolean }) {
  const style = STYLES.find((s) => s.id === styleId);
  const body = (
    <>
      <div className="inline" style={{ gap: 10 }}>
        <span className="avatar is-soft" style={{ width: 36, height: 36, fontSize: 13 }} aria-hidden="true">
          {name
            .split(" ")
            .map((p) => p[0])
            .join("")}
        </span>
        <div className="stack">
          <span style={{ fontWeight: 500 }}>{name}</span>
          <Stars value={rating} size={12} />
        </div>
      </div>
      <p>{text}</p>
      <p className="subtle t-cap">
        {fmtDate(new Date(at))} · {style?.name}
      </p>
      {flat && <div className="divider" style={{ margin: 0 }} />}
    </>
  );
  return flat ? (
    <article className="stack gap-8">{body}</article>
  ) : (
    <Reveal as="article" className="card card-pad stack gap-8" y={16}>
      {body}
    </Reveal>
  );
}
