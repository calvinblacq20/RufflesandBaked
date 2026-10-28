import { ArrowLeft, ArrowRight, CalendarDays, Home, Menu, Search, UserRound, X } from "lucide-react";
import { AnimatePresence, motion, useScroll, useTransform } from "motion/react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { HOURS, STUDIO } from "../data/business";
import { accountOf, useAppData } from "../data/store";
import { telLink } from "../lib/contact";
import { isCalm, spring } from "../motion";
import { AppIcon } from "./Brand";

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => (typeof window !== "undefined" && window.matchMedia ? window.matchMedia(query).matches : false));
  useEffect(() => {
    const mql = window.matchMedia(query);
    const onChange = () => setMatches(mql.matches);
    onChange();
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, [query]);
  return matches;
}

export const DESKTOP_QUERY = "(min-width: 810px)";

export function useScrolled(threshold = 8): boolean {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > threshold);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [threshold]);
  return scrolled;
}

interface TopBarProps {
  title?: string;
  back?: boolean | (() => void);
  close?: () => void;
  right?: ReactNode;
  /** Scroll distance before the bar turns solid and shows its title. */
  solidAfter?: number;
  alwaysSolid?: boolean;
  /** On wider screens (below the top nav) the bar becomes a plain "Back" row. */
  backRow?: string;
  className?: string;
}

export function TopBar({ title, back, close, right, solidAfter = 8, alwaysSolid, backRow, className = "" }: TopBarProps) {
  const navigate = useNavigate();
  const scrolled = useScrolled(solidAfter);
  const onBack = typeof back === "function" ? back : () => navigate(-1);
  return (
    <header className={`topbar ${scrolled || alwaysSolid ? "is-solid" : ""} ${backRow ? "is-backrow" : ""} ${className}`}>
      {back && (
        <button className="icon-btn is-plain topbar-back" onClick={onBack} aria-label="Back">
          <ArrowLeft size={22} strokeWidth={1.8} />
          {backRow && <span className="topbar-backlabel desktop-only">{backRow}</span>}
        </button>
      )}
      <span className="topbar-title">{title}</span>
      {right}
      {close && (
        <button className="icon-btn is-plain" onClick={close} aria-label="Close">
          <X size={22} strokeWidth={1.8} />
        </button>
      )}
    </header>
  );
}

const TABS = [
  { to: "/", label: "Home", icon: Home, end: true },
  { to: "/explore", label: "Explore", icon: Search },
  { to: "/orders", label: "Orders", icon: CalendarDays },
] as const;

/** Makro-style floating top navigation for tablet and desktop. */
export function DesktopNav() {
  const account = accountOf(useAppData());
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [dark, setDark] = useState(false);

  // Turn the nav dark while it floats over a dark section, as in the reference.
  useEffect(() => {
    const probe = 40;
    const check = () => {
      let over = false;
      document.querySelectorAll<HTMLElement>('[data-nav-theme="dark"]').forEach((el) => {
        const r = el.getBoundingClientRect();
        if (r.top <= probe && r.bottom >= probe) over = true;
      });
      setDark(over);
    };
    check();
    window.addEventListener("scroll", check, { passive: true });
    window.addEventListener("resize", check);
    return () => {
      window.removeEventListener("scroll", check);
      window.removeEventListener("resize", check);
    };
  }, [pathname]);

  return (
    <div className="desk-nav-wrap desktop-only">
      <nav className={`desk-nav ${dark ? "is-dark" : ""}`} aria-label="Main">
        <Link to="/" className="desk-brand" aria-label={`${STUDIO.name} home`}>
          <AppIcon size={34} tone={dark ? "light" : "dark"} />
          <span>{STUDIO.name}</span>
        </Link>
        <div className="desk-links">
          {TABS.map(({ to, label, ...rest }) => (
            <NavLink key={to} to={to} end={"end" in rest} className={({ isActive }) => `desk-link ${isActive ? "is-active" : ""}`}>
              {({ isActive }) => (
                <>
                  {isActive && <motion.span layoutId="desk-link-hl" className="desk-link-hl" transition={spring.press} />}
                  <span>{label}</span>
                </>
              )}
            </NavLink>
          ))}
        </div>
        <div className="inline" style={{ gap: 10 }}>
          <button className="nav-cta" onClick={() => navigate("/order/new")}>
            <span className="sq">
              <ArrowRight size={16} strokeWidth={1.8} />
            </span>
            Order now
          </button>
          <NavLink to="/profile" className={({ isActive }) => `desk-avatar ${isActive ? "is-active" : ""}`} aria-label="Profile">
            {account ? account.name[0] : <UserRound size={17} strokeWidth={1.8} />}
          </NavLink>
        </div>
      </nav>
    </div>
  );
}

/**
 * Footer that sits underneath the page: the content lifts away to reveal it,
 * and the giant wordmark rises as the reveal completes (Makro curtain).
 */
export function DesktopFooter() {
  const weekday = HOURS[1];
  const saturday = HOURS[6];
  const ref = useRef<HTMLElement>(null);
  const calm = isCalm();
  const { scrollY } = useScroll();
  const height = useRef(1);
  const pageHeight = useRef(0);
  const viewportHeight = useRef(0);

  // Heights are measured on resize and cached: reading them on every scroll frame forces a re-layout.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => {
      height.current = el.offsetHeight || 1;
      pageHeight.current = document.documentElement.scrollHeight;
      viewportHeight.current = window.innerHeight;
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    ro.observe(document.body);
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);

  // 0 while the footer is covered, 1 once the page has fully lifted off it.
  const reveal = useTransform(scrollY, (y) => {
    const remaining = pageHeight.current - (y + viewportHeight.current);
    return Math.min(1, Math.max(0, 1 - remaining / height.current));
  });
  const wordY = useTransform(reveal, [0, 1], ["45%", "0%"]);
  const wordOpacity = useTransform(reveal, [0, 0.6], [0.2, 1]);
  const innerY = useTransform(reveal, [0, 1], [40, 0]);

  return (
    <footer ref={ref} className="desk-footer desktop-only">
      <motion.div className="desk-footer-inner" style={calm ? undefined : { y: innerY }}>
        <div className="stack gap-12" style={{ maxWidth: 260 }}>
          <AppIcon size={44} />
          <p className="muted">Handmade headpieces and celebration cakes, made to order in Kasoa and delivered across Accra.</p>
        </div>
        <div className="desk-footer-col">
          <p className="subtle t-cap">Studio</p>
          <Link to="/">Home</Link>
          <Link to="/explore">The menu</Link>
          <Link to="/orders">My orders</Link>
          <Link to="/order/new">Order a cake</Link>
          <Link to="/profile/dates">Dates to remember</Link>
        </div>
        <div className="desk-footer-col">
          <p className="subtle t-cap">Contact</p>
          <a href={STUDIO.whatsappBusiness} target="_blank" rel="noreferrer">WhatsApp</a>
          <a href={telLink(STUDIO.phone)}>{STUDIO.phone}</a>
          <a href={STUDIO.instagram} target="_blank" rel="noreferrer">Instagram</a>
          <a href={`mailto:${STUDIO.email}`}>{STUDIO.email}</a>
        </div>
        <div className="desk-footer-col">
          <p className="subtle t-cap">Visit</p>
          <span>{STUDIO.area}</span>
          {weekday && <span>Mon–Fri {weekday[0]}–{weekday[1]}</span>}
          {saturday && <span>Sat {saturday[0]}–{saturday[1]}</span>}
          <span className="subtle">Sunday closed</span>
        </div>
      </motion.div>
      <motion.div className="desk-wordmark" aria-hidden="true" style={calm ? { opacity: wordOpacity } : { y: wordY, opacity: wordOpacity }}>
        {STUDIO.name}
      </motion.div>
      <p className="desk-copy t-cap">© {new Date().getFullYear()} {STUDIO.name} · Demo build</p>
    </footer>
  );
}

/**
 * Phones and small tablets: one button in the top right, and the way around under it.
 *
 * Just the button. Every screen already names itself — the hero carries the studio's name, the
 * other screens carry their own title — so a bar repeating it was a second header doing nothing.
 * The destinations sit behind the button instead, which is why there is no bottom tab bar.
 */
export function MobileNav() {
  const account = accountOf(useAppData());
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  const navigate = useNavigate();

  // A route change closes the menu, including one made with the back button.
  useEffect(() => setOpen(false), [pathname]);

  // While it is open the page behind must not scroll under it.
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  return (
    <div className="mob-nav-wrap mobile-only">
      <button
        className="mob-menu-btn"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-controls="mob-menu"
        aria-label={open ? "Close the menu" : "Open the menu"}
      >
        {open ? <X size={22} strokeWidth={1.8} /> : <Menu size={22} strokeWidth={1.8} />}
      </button>

      <AnimatePresence>
        {open && (
          <>
            <motion.button
              className="mob-scrim"
              aria-label="Close the menu"
              onClick={() => setOpen(false)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            />
            <motion.div
              id="mob-menu"
              className="mob-menu"
              initial={{ y: -12, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -12, opacity: 0 }}
              transition={spring.small}
            >
              {TABS.map(({ to, label, icon: Icon, ...rest }) => (
                <NavLink key={to} to={to} end={"end" in rest} className={({ isActive }) => `mob-link ${isActive ? "is-active" : ""}`}>
                  <Icon size={20} strokeWidth={1.7} />
                  <span>{label}</span>
                </NavLink>
              ))}
              <NavLink to="/profile" className={({ isActive }) => `mob-link ${isActive ? "is-active" : ""}`}>
                {account ? (
                  <span className="mob-avatar" aria-hidden="true">
                    {account.name[0]}
                  </span>
                ) : (
                  <UserRound size={20} strokeWidth={1.7} />
                )}
                <span>{account ? account.name.split(" ")[0] : "Profile"}</span>
              </NavLink>
              <button className="btn btn-dark btn-block mob-order" onClick={() => navigate("/order/new")}>
                Order now
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
