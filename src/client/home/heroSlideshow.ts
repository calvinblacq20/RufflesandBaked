import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import type { MotionMode } from "../../motion";

gsap.registerPlugin(ScrollTrigger);

/**
 * Editorial hero slideshow, taken from the Queens Wigs & Bundles build with the same timings.
 *
 * Every few seconds the current slide leaves (title letters drop out, copy lifts away, photo wipes
 * up) and the next one enters (photo curtain opens while zooming out, letters rise in one by one,
 * copy fades up) while the backdrop blends to the next slide's `data-bg` / `data-ink`. Calm mode
 * crossfades instead; off holds the first slide. Swipe on touch screens; the dots jump to a slide.
 * Returns a clean-up for the component's effect.
 */
export function initHero(hero: HTMLElement | null, options: { duration?: number; motion?: MotionMode } = {}): () => void {
  if (!hero) return () => {};
  const $ = <T extends Element = HTMLElement>(sel: string, root: ParentNode = hero) => root.querySelector<T>(sel);
  const $$ = <T extends Element = HTMLElement>(sel: string, root: ParentNode = hero) => Array.from(root.querySelectorAll<T>(sel));
  const slides = $$(".hero__slide");
  if (!slides.length) return () => {};

  const duration = (options.duration ?? 7000) / 1000;
  const motion = options.motion ?? "full";
  const full = motion === "full";
  const calm = motion === "calm";
  const autoplay = motion !== "off";

  const abort = new AbortController();
  const triggers: gsap.core.Tween[] = [];
  let destroyed = false;

  if (full) splitChars(hero);
  slides.forEach((s, i) => {
    s.classList.toggle("is-active", i === 0);
    if (i) s.setAttribute("aria-hidden", "true");
    else s.removeAttribute("aria-hidden");
  });

  // One progress dot per slide.
  const dotWrap = $(".hero__dots");
  dotWrap?.replaceChildren(
    ...slides.map((s, i) => {
      const dot = document.createElement("button");
      dot.type = "button";
      dot.className = `hero__dot${i === 0 ? " is-active" : ""}`;
      dot.setAttribute("aria-label", `Slide ${i + 1}: ${s.dataset.label ?? ""}`);
      dot.setAttribute("aria-current", String(i === 0));
      const fill = document.createElement("span");
      fill.className = "hero__dot-fill";
      dot.append(fill);
      return dot;
    }),
  );
  const dots = $$<HTMLButtonElement>(".hero__dot");
  let index = 0;
  let timer: gsap.core.Tween | null = null;
  let busy = false;
  let inView = true;

  const setBg = (slide: HTMLElement, instant = false) => {
    const bg = slide.dataset.bg ?? "#3b0a1c";
    const ink = slide.dataset.ink ?? "#f4f7fb";
    // The desktop nav turns dark over dark slides (Chrome reads data-nav-theme).
    if (slide.dataset.navTheme) hero.dataset.navTheme = slide.dataset.navTheme;
    if (instant || !autoplay) {
      hero.style.setProperty("--hero-bg", bg);
      hero.style.setProperty("--hero-ink", ink);
    } else {
      gsap.to(hero, { "--hero-bg": bg, "--hero-ink": ink, duration: 1.2, ease: "power2.inOut" });
    }
  };

  const enter = (slide: HTMLElement) => {
    if (!autoplay) return;
    if (calm) {
      gsap.fromTo(slide, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.8, ease: "power2.out", clearProps: "opacity,visibility" });
      return;
    }
    const chars = $$(".hero__char", slide);
    const img = $(".hero__img", slide);
    const frame = $(".hero__frame", slide);
    const rest = $$("[data-hero-fade]", slide);
    const tl = gsap.timeline();
    if (frame) tl.fromTo(frame, { clipPath: "inset(100% 0% 0% 0%)" }, { clipPath: "inset(0% 0% 0% 0%)", duration: 1.3, ease: "expo.inOut" }, 0);
    if (img) tl.fromTo(img, { scale: 1.3 }, { scale: 1, duration: 2.2, ease: "expo.out" }, 0.1);
    if (chars.length) tl.fromTo(chars, { yPercent: 120, rotate: 8 }, { yPercent: 0, rotate: 0, duration: 1.1, ease: "expo.out", stagger: 0.03 }, 0.35);
    if (rest.length) tl.fromTo(rest, { y: 30, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.9, ease: "power3.out", stagger: 0.1 }, 0.8);
  };

  const leave = (slide: HTMLElement) =>
    new Promise<void>((resolve) => {
      if (!autoplay) return resolve();
      if (calm) {
        gsap.to(slide, {
          autoAlpha: 0,
          duration: 0.5,
          ease: "power2.in",
          onComplete: () => {
            // Hand visibility back to the stylesheet; the slide loses .is-active before the next paint.
            gsap.set(slide, { clearProps: "opacity,visibility" });
            resolve();
          },
        });
        return;
      }
      const chars = $$(".hero__char", slide);
      const rest = $$("[data-hero-fade]", slide);
      const frame = $(".hero__frame", slide);
      const tl = gsap.timeline({ onComplete: () => resolve() });
      if (chars.length) tl.to(chars, { yPercent: -120, duration: 0.55, ease: "power3.in", stagger: 0.012 }, 0);
      if (rest.length) tl.to(rest, { autoAlpha: 0, y: -20, duration: 0.4 }, 0);
      if (frame) tl.to(frame, { clipPath: "inset(0% 0% 100% 0%)", duration: 0.7, ease: "expo.in" }, 0.05);
      if (!tl.getChildren().length) resolve();
    });

  // The active dot fills over `duration`, then the next slide comes in.
  const progress = () => {
    timer?.kill();
    timer = null;
    const fill = $(".hero__dot.is-active .hero__dot-fill");
    gsap.set($$(".hero__dot-fill"), { scaleX: 0 });
    if (!autoplay || slides.length < 2) return;
    const advance = () => void go(index + 1);
    timer = fill ? gsap.fromTo(fill, { scaleX: 0 }, { scaleX: 1, duration, ease: "none", onComplete: advance }) : gsap.delayedCall(duration, advance);
    if (!inView) timer.pause();
  };

  const go = async (n: number) => {
    if (busy || destroyed || slides.length < 2) return;
    const next = (n + slides.length) % slides.length;
    const current = slides[index];
    const incoming = slides[next];
    if (next === index || !current || !incoming) return;
    busy = true;
    await leave(current);
    if (destroyed) return;
    current.classList.remove("is-active");
    current.setAttribute("aria-hidden", "true");
    incoming.classList.add("is-active");
    incoming.removeAttribute("aria-hidden");
    dots.forEach((d, k) => {
      d.classList.toggle("is-active", k === next);
      d.setAttribute("aria-current", String(k === next));
    });
    index = next;
    setBg(incoming);
    enter(incoming);
    busy = false;
    progress();
  };

  const listen = { signal: abort.signal };
  dots.forEach((d, k) => d.addEventListener("click", () => void go(k), listen));
  $("[data-hero-prev]")?.addEventListener("click", () => void go(index - 1), listen);
  $("[data-hero-next]")?.addEventListener("click", () => void go(index + 1), listen);

  // Swipe on touch screens.
  let startX = 0;
  hero.addEventListener("touchstart", (e) => (startX = e.touches[0]?.clientX ?? 0), { ...listen, passive: true });
  hero.addEventListener(
    "touchend",
    (e) => {
      const dx = (e.changedTouches[0]?.clientX ?? 0) - startX;
      if (Math.abs(dx) > 50) void go(index + (dx < 0 ? 1 : -1));
    },
    { ...listen, passive: true },
  );

  // Stop auto-advance while the hero is off screen.
  const io =
    typeof IntersectionObserver === "undefined"
      ? null
      : new IntersectionObserver(([entry]) => {
          inView = entry?.isIntersecting ?? true;
          if (!timer) return;
          if (inView) timer.resume();
          else timer.pause();
        });
  io?.observe(hero);

  // Safari can freeze the page while it's hidden or parked in the back/forward cache; pick the
  // slideshow up again whenever the page is shown.
  const wake = () => {
    if (!autoplay || document.visibilityState !== "visible" || !inView || busy) return;
    if (timer && timer.progress() < 1) timer.resume();
    else progress();
  };
  document.addEventListener("visibilitychange", wake, listen);
  window.addEventListener("pageshow", wake, listen);

  const first = slides[0];
  if (first) {
    setBg(first, true);
    enter(first);
  }
  progress();

  if (full) {
    // Scroll-out: the photo drifts, the title lifts and fades.
    const scrollTrigger = { trigger: hero, start: "top top", end: "bottom top", scrub: true };
    triggers.push(gsap.to($$(".hero__frame"), { yPercent: 14, ease: "none", scrollTrigger }));
    // fromTo (not autoAlpha): titles in hidden slides must not inherit a 0 start value.
    triggers.push(gsap.fromTo($$(".hero__title, .hero__copy"), { y: 0, opacity: 1 }, { y: -90, opacity: 0.1, ease: "none", scrollTrigger: { ...scrollTrigger } }));
    // The circular badge turns with the page.
    const badge = $(".hero__badge");
    if (badge) triggers.push(gsap.to(badge, { rotate: 360, ease: "none", scrollTrigger: { start: 0, end: "max", scrub: 1 } }));
    ScrollTrigger.refresh();
  }

  return () => {
    destroyed = true;
    abort.abort();
    io?.disconnect();
    timer?.kill();
    triggers.forEach((t) => {
      t.scrollTrigger?.kill();
      t.kill();
    });
    gsap.killTweensOf([hero, ...$$("*")]);
  };
}

/** Wrap each letter of `.hero__line` in a span; screen readers get the whole word instead. */
function splitChars(root: HTMLElement) {
  for (const line of Array.from(root.querySelectorAll<HTMLElement>(".hero__line"))) {
    if (line.querySelector(".hero__char")) continue; // already split (StrictMode runs effects twice)
    const text = (line.textContent ?? "").trim();
    line.textContent = "";
    const label = document.createElement("span");
    label.className = "hero__sr";
    label.textContent = text;
    line.append(label);
    for (const ch of text) {
      const span = document.createElement("span");
      span.className = "hero__char";
      span.setAttribute("aria-hidden", "true");
      span.textContent = ch === " " ? " " : ch;
      line.append(span);
    }
  }
}
