import { CakeSlice, CalendarCheck, Check, Palette, Truck } from "lucide-react";
import { motion, useScroll, useTransform } from "motion/react";
import { useEffect, useRef, type ReactNode } from "react";
import { Photo } from "../../components/Bits";
import { Reveal } from "../../components/Reveal";
import { motionMode } from "../../motion";

interface Step {
  eyebrow: string;
  icon: ReactNode;
  title: string;
  body: string;
  check: string;
  photo: string;
  alt: string;
  position: string;
  float: { label: string; value: string; note: string };
}

const STEPS: Step[] = [
  {
    eyebrow: "Step 1 · Choose",
    icon: <CakeSlice size={14} />,
    title: "Pick a cake, a piece, or both.",
    body: "Cakes are priced straight off the menu card, so you see the number before you order. Handmade headpieces, hats and bridal sets are quoted after a quick chat, because no two are the same.",
    check: "Cake prices shown up front",
    photo: "/photos/cake-box-bow.webp",
    alt: "A white celebration cake dressed as a gift box with a satin bow",
    position: "center 35%",
    float: { label: "Pickup", value: "Sat, 26 Sept", note: "Birthday · 15:00" },
  },
  {
    eyebrow: "Step 2 · Design",
    icon: <Palette size={14} />,
    title: "Send your colours. We match them.",
    body: "A photo of the outfit, the theme for the cake, the names and the ages. For a hat or a headband, send your head measurement and we'll book a fitting if you want one.",
    check: "Your design confirmed on WhatsApp",
    photo: "/photos/fascinator-purple.webp",
    alt: "A purple sinamay fascinator with feathers and tulle",
    position: "center 45%",
    float: { label: "Design", value: "Wine & gold", note: "To match the kaba" },
  },
  {
    eyebrow: "Step 3 · Make",
    icon: <CalendarCheck size={14} />,
    title: "Baked and beaded for your date.",
    body: "Payment locks in your day. Cakes are baked the day before and decorated close to pickup; a headpiece is built over several days by hand. You follow every stage in the app.",
    check: "Updates on WhatsApp at each stage",
    photo: "/photos/crown-crystal.webp",
    alt: "A crystal crown being built by hand",
    position: "center 40%",
    float: { label: "Progress", value: "Beading", note: "Pickup tomorrow, 15:00" },
  },
  {
    eyebrow: "Step 4 · Celebrate",
    icon: <Truck size={14} />,
    title: "Pick up in Kasoa or get it delivered.",
    body: "Collect at your time slot or have it delivered across Kasoa and Accra; wedding cakes and bridal sets travel anywhere in Ghana. Every payment gets an official receipt.",
    check: "Official receipt for every payment",
    photo: "/photos/bridal-look.webp",
    alt: "A bride in white wearing a handmade white fascinator",
    position: "center 25%",
    float: { label: "Receipt", value: "GH₵ 750", note: "Paid · MoMo" },
  },
];

/** Pinned feature cards that stack as you scroll, each sliding up over the last. */
export function HowItWorks() {
  return (
    <section className="how" aria-labelledby="how-title">
      <div className="how-head">
        <Reveal as="h2" look="focus" id="how-title" className="t-h2">
          How ordering works
        </Reveal>
        <Reveal as="p" look="focus" delay={0.08} className="muted">
          From the first message to the first slice, and the piece you'll wear to cut it.
        </Reveal>
      </div>
      <div className="stack-list">
        {STEPS.map((step, i) => (
          <StackCard key={step.title} step={step} index={i} />
        ))}
      </div>
    </section>
  );
}

function StackCard({ step, index }: { step: Step; index: number }) {
  const ref = useRef<HTMLElement>(null);
  // Calm keeps the text brightening (opacity) and drops the photo zoom and the floating card's drift.
  const mode = motionMode();
  // Progress as this card rises from the bottom of the screen to its pinned position.
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "start 0.2"] });
  const textOpacity = useTransform(scrollYProgress, [0.35, 1], [0.32, 1]);
  const floatY = useTransform(scrollYProgress, [0, 1], [70, 0]);
  const floatRotate = useTransform(scrollYProgress, [0, 1], [index % 2 ? -6 : 6, 0]);
  const photoScale = useTransform(scrollYProgress, [0, 1], [1.12, 1]);

  // The CSS pins tall cards lower (see .stack-card), which needs the card's rendered height.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new ResizeObserver(() => el.style.setProperty("--card-h", `${el.offsetHeight}px`));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <article ref={ref} className={`stack-card ${index % 2 ? "is-flipped" : ""}`} style={{ zIndex: index + 1 }}>
      <motion.div className="stack-text" style={mode === "off" ? undefined : { opacity: textOpacity }}>
        <span className="chip-soft">
          {step.icon}
          {step.eyebrow}
        </span>
        <h3 className="stack-title">{step.title}</h3>
        <p className="muted">{step.body}</p>
        <p className="stack-check">
          <Check size={15} /> {step.check}
        </p>
      </motion.div>
      <div className="stack-media">
        <motion.div className="stack-photo" style={mode === "full" ? { scale: photoScale } : undefined}>
          <Photo tone="mist" src={step.photo} alt={step.alt} position={step.position} sizes="(min-width: 1024px) 600px, 100vw" height="100%" radius={0} />
        </motion.div>
        <motion.div className="float-card" style={mode === "full" ? { y: floatY, rotate: floatRotate } : undefined}>
          <span className="subtle t-cap">{step.float.label}</span>
          <strong>{step.float.value}</strong>
          <span className="t-cap muted">{step.float.note}</span>
        </motion.div>
      </div>
    </article>
  );
}
