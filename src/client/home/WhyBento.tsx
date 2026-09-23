import { Baby, BadgeCheck, Briefcase, Cake, CakeSlice, Check, Gem, Heart, Layers, PartyPopper, ShieldCheck, Smartphone, Sparkles, TrendingUp, Users } from "lucide-react";
import { AnimatePresence, motion, useScroll, useTransform, type MotionValue } from "motion/react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Photo } from "../../components/Bits";
import { useMediaQuery } from "../../components/Chrome";
import { Reveal } from "../../components/Reveal";
import { STUDIO } from "../../data/business";
import { motionMode, spring } from "../../motion";

const CHIPS = [
  { label: "Birthdays", icon: <Cake size={13} />, x: "4%", y: 6, r: 22, fr: -3 },
  { label: "Weddings", icon: <Heart size={13} />, x: "40%", y: 0, r: -18, fr: 2 },
  { label: "Kids' parties", icon: <PartyPopper size={13} />, x: "0%", y: 44, r: 30, fr: 4 },
  { label: "Christenings", icon: <Baby size={13} />, x: "38%", y: 46, r: -26, fr: -2 },
  { label: "Thanksgivings", icon: <Briefcase size={13} />, x: "10%", y: 86, r: 16, fr: -4 },
  { label: "Engagements", icon: <Gem size={13} />, x: "40%", y: 90, r: -12, fr: 3 },
  { label: "Just because", icon: <Sparkles size={13} />, x: "18%", y: 128, r: 24, fr: 0 },
];

const INSIGHTS = [
  { value: `${STUDIO.reviewCount}+`, label: "Happy clients" },
  { value: `${STUDIO.rating}`, label: "Average rating" },
  { value: "3 days", label: "Notice for most cakes" },
];

/** Dark bento section with parallax columns, tumbling chips and a cycling stat (Makro "Tidy Build"). */
export function WhyBento() {
  const ref = useRef<HTMLElement>(null);
  const desktop = useMediaQuery("(min-width: 1024px)");
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const sideY = useTransform(scrollYProgress, [0, 1], [70, -70]);
  const midY = useTransform(scrollYProgress, [0, 1], [150, -150]);
  const parallax = desktop && motionMode() === "full";

  return (
    <section ref={ref} className="bento" data-nav-theme="dark" aria-labelledby="bento-title">
      <div className="bento-head">
        <Reveal as="span" look="focus" className="chip-dark">
          <Sparkles size={13} /> Why clients choose us
        </Reveal>
        <Reveal as="h2" look="focus" delay={0.05} id="bento-title" className="bento-title">
          Made by one pair of hands
        </Reveal>
        <Reveal as="p" look="focus" delay={0.1} className="bento-sub">
          Birthdays, weddings, thanksgivings and everything in between, from one kitchen and one workroom in Kasoa, with every order tracked from quote to pickup.
        </Reveal>
      </div>

      <div className="bento-grid">
        <motion.div className="bento-col" style={parallax ? { y: sideY } : undefined}>
          <OccasionsCard />
          <PartyCard />
        </motion.div>
        <motion.div className="bento-col" style={parallax ? { y: midY } : undefined}>
          <PaymentsCard />
          <TrackingCard />
        </motion.div>
        <motion.div className="bento-col" style={parallax ? { y: sideY } : undefined}>
          <InsightsCard />
          <AllergyCard />
        </motion.div>
      </div>
    </section>
  );
}

function CardHead({ tag, icon, title, body, light }: { tag: string; icon: ReactNode; title: string; body: string; light?: boolean }) {
  return (
    <div className={`bento-card-head ${light ? "is-light" : ""}`}>
      <span className="bento-tag">
        {icon}
        {tag}
      </span>
      <h3>{title}</h3>
      <p>{body}</p>
    </div>
  );
}

function OccasionsCard() {
  const ref = useRef<HTMLDivElement>(null);
  // Chips tumble in and settle into a pile as the card scrolls up the screen (full mode only).
  const still = motionMode() !== "full";
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "center 0.55"] });
  return (
    <div ref={ref} className="bento-card is-steel is-tall">
      <CardHead tag="Occasions" icon={<Layers size={13} />} title="Every occasion" body="One studio for birthdays, weddings, christenings, engagements and church Sundays." light />
      <div className="chip-pile" aria-hidden="true">
        {CHIPS.map((chip) => (
          <TumbleChip key={chip.label} chip={chip} progress={scrollYProgress} still={still} />
        ))}
      </div>
    </div>
  );
}

function TumbleChip({ chip, progress, still }: { chip: (typeof CHIPS)[number]; progress: MotionValue<number>; still: boolean }) {
  const rotate = useTransform(progress, [0, 1], [chip.r, chip.fr]);
  const y = useTransform(progress, [0, 1], [chip.y - 90, chip.y]);
  const opacity = useTransform(progress, [0, 0.35], [0, 1]);
  return (
    <motion.span className="tumble-chip" style={still ? { left: chip.x, top: chip.y, rotate: chip.fr } : { left: chip.x, top: 0, y, rotate, opacity }}>
      {chip.icon}
      {chip.label}
    </motion.span>
  );
}

function PartyCard() {
  return (
    <div className="bento-card is-steel">
      <CardHead tag="Plan" icon={<Users size={13} />} title="The whole party, matched" body="The bride's piece, the bouquet, the boutonnieres and the cake, worked in one set of colours." light />
      <div className="group-strip">
        <span className="group-ghost" />
        <div className="group-tile">
          <Photo tone="mist" src="/photos/bridal-look.webp" alt="" position="center 25%" sizes="120px" height={70} radius={10} />
          <strong>Bridal set × 6</strong>
          <span className="t-cap subtle">Dusty pink · one wedding</span>
        </div>
        <span className="group-ghost" />
      </div>
    </div>
  );
}

function PaymentsCard() {
  return (
    <div className="bento-card is-white is-tall">
      <CardHead tag="Pay" icon={<Smartphone size={13} />} title="MoMo payments" body="Pay by mobile money or card, always matched to your order. Payment books your date; bespoke pieces start on a deposit." />
      <div className="momo-card">
        <div className="between">
          <span className="inline t-cap" style={{ gap: 6 }}>
            <span className="live-dot" /> MoMo received
          </span>
          <span className="t-cap subtle">1 min ago</span>
        </div>
        <div className="momo-amount">
          <span className="subtle">+</span>GH₵ 750<span className="subtle">.00</span>
        </div>
      </div>
      <div className="receipt-mini">
        <span className="t-mono t-cap">RBHR-2026-0041</span>
        <span className="pill-gold">
          <Check size={12} /> Official receipt
        </span>
      </div>
    </div>
  );
}

function TrackingCard() {
  const rows = [
    { name: "Kids themed cake", ref: "RBH-1041", status: "Decorating", tone: "sky" },
    { name: "Beaded headband", ref: "RBH-1044", status: "Beading", tone: "lilac" },
    { name: "Cake jars × 6", ref: "RBH-1036", status: "Ready", tone: "gold" },
  ];
  return (
    <div className="bento-card is-white">
      <CardHead tag="Track" icon={<TrendingUp size={13} />} title="Order tracking" body="See every stage, from quote to pickup." />
      <div className="track-list">
        {rows.map((r) => (
          <div key={r.ref} className="track-row">
            <div className="stack">
              <span className="t-cap subtle t-mono">{r.ref}</span>
              <span>{r.name}</span>
            </div>
            <span className={`badge is-${r.tone}`} style={{ paddingRight: 10 }}>
              <span className="badge-well" />
              {r.status}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function InsightsCard() {
  const [i, setI] = useState(0);
  // An ambient loop inside its own card, so it keeps cycling in calm mode (as a fade).
  const cycles = motionMode() !== "off";
  useEffect(() => {
    if (!cycles) return;
    const t = window.setInterval(() => setI((n) => (n + 1) % INSIGHTS.length), 2600);
    return () => window.clearInterval(t);
  }, [cycles]);
  const current = INSIGHTS[i] ?? INSIGHTS[0];
  return (
    <div className="bento-card is-steel-rev is-tall">
      <CardHead tag="Trusted" icon={<BadgeCheck size={13} />} title="Clients come back" body="Birthdays come round every year, and so do our clients." />
      <div className="orbit" aria-hidden="true">
        <span className="orbit-dot" style={{ left: "12%", top: "30%" }}>
          <Heart size={14} />
        </span>
        <span className="orbit-dot" style={{ left: "44%", top: "8%" }}>
          <Cake size={14} />
        </span>
        <span className="orbit-dot" style={{ left: "76%", top: "22%" }}>
          <Sparkles size={14} />
        </span>
      </div>
      <div className="insight" aria-live="polite">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={current?.label} initial={{ opacity: 0, y: 18, filter: "blur(8px)" }} animate={{ opacity: 1, y: 0, filter: "blur(0px)" }} exit={{ opacity: 0, y: -18, filter: "blur(8px)" }} transition={spring.small}>
            <strong>{current?.value}</strong>
            <span>{current?.label}</span>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

function AllergyCard() {
  return (
    <div className="bento-card is-blush">
      <CardHead tag="Protect" icon={<ShieldCheck size={13} />} title="Allergies remembered" body="Tell us once. Allergies and your head measurement stay on your account and print on every order." />
      <div className="alert-card">
        <div className="inline" style={{ gap: 10 }}>
          <span className="alert-icon">
            <CakeSlice size={15} />
          </span>
          <div className="stack">
            <strong className="t-body">No nuts for Efua</strong>
            <span className="t-cap subtle">Kids themed cake · RBH-1041</span>
          </div>
        </div>
        <div className="alert-foot">
          <span>Checked before it goes in the oven</span>
          <span className="alert-check">
            <Check size={13} />
          </span>
        </div>
      </div>
    </div>
  );
}
