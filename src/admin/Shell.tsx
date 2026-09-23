import { ArrowLeft, ArrowUpRight, Bell, CakeSlice, CalendarDays, CalendarHeart, ChartLine, ChefHat, ChevronRight, Ellipsis, LayoutDashboard, Plus, ReceiptText, Search, Settings, ShoppingBag, Star, TriangleAlert, Users, Wallet, WifiOff } from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useMemo, useRef, useState, type ComponentType, type FormEvent, type ReactNode } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { Avatar } from "../components/Bits";
import { AppIcon } from "../components/Brand";
import { Sheet } from "../components/Sheet";
import { STUDIO } from "../data/business";
import { useAppData } from "../data/store";
import type { AppData } from "../data/seed";
import { workshopNow } from "../lib/metrics";
import { daysUntil } from "../lib/studio";
import { blurIn, spring } from "../motion";
import { useFirstVisit } from "./hooks";

/* App shell for the owner side: sidebar / icon rail / tab bar, the sticky top bar and the page title block. */

interface NavItem {
  to: string;
  label: string;
  icon: ComponentType<{ size?: number; strokeWidth?: number }>;
  end?: boolean;
  count?: (a: Attention) => number;
}

const GROUPS: { label: string; items: NavItem[] }[] = [
  {
    label: "Workbench",
    items: [
      { to: "/admin", label: "Today", icon: LayoutDashboard, end: true },
      { to: "/admin/orders", label: "Orders", icon: CakeSlice, count: (a) => a.requests },
      { to: "/admin/appointments", label: "Pickups & fittings", icon: CalendarDays, count: (a) => a.visitRequests },
    ],
  },
  {
    label: "People",
    items: [
      { to: "/admin/clients", label: "Clients", icon: Users },
      { to: "/admin/reviews", label: "Reviews", icon: Star, count: (a) => a.reviews },
    ],
  },
  {
    label: "Money",
    items: [
      { to: "/admin/payments", label: "Payments", icon: Wallet },
      { to: "/admin/reports", label: "Reports", icon: ChartLine },
    ],
  },
  {
    label: "Studio",
    items: [
      { to: "/admin/styles", label: "Menu & prices", icon: ChefHat },
      { to: "/admin/settings", label: "Settings", icon: Settings },
    ],
  },
];

export interface Attention {
  requests: number;
  quotes: number;
  visitRequests: number;
  reviews: number;
  late: number;
  ready: number;
  /** Remembered dates in the next week that haven't had their reminder yet. */
  reminders: number;
  total: number;
}

/** A reminder is due in the week before the date, unless it was sent in the last month. */
export function reminderDue(c: AppData["celebrations"][number], now: Date): boolean {
  if (!c.remind || daysUntil(c.date, now) > 7) return false;
  return !c.remindedAt || now.getTime() - new Date(c.remindedAt).getTime() > 30 * 86_400_000;
}

export function attentionOf(data: AppData, now: Date): Attention {
  const shop = workshopNow(data.orders, now);
  const visitRequests = data.appointments.filter((a) => a.status === "requested").length;
  const reviews = data.reviews.filter((r) => r.status === "pending").length;
  const reminders = data.celebrations.filter((c) => reminderDue(c, now)).length;
  return {
    requests: shop.newRequests,
    quotes: shop.awaitingPayment,
    visitRequests,
    reviews,
    late: shop.late,
    ready: shop.readyUncollected,
    reminders,
    total: shop.newRequests + visitRequests + reviews + shop.late + reminders,
  };
}

function useAttention(): Attention {
  const data = useAppData();
  return useMemo(() => attentionOf(data, new Date()), [data]);
}

export function AdminLayout() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [pathname]);
  return (
    <div className="adm">
      <Sidebar />
      <div className="adm-main">
        <OfflineBanner />
        <Outlet />
      </div>
      <AdminTabBar />
    </div>
  );
}

function Sidebar() {
  const attention = useAttention();
  return (
    <aside className="adm-side desktop-only" aria-label="Studio admin">
      <Link to="/admin" className="adm-brand" aria-label={`${STUDIO.name} admin home`}>
        <AppIcon size={36} />
        <span className="adm-brand-text">
          <span className="t-title">{STUDIO.name}</span>
          <span className="t-cap muted">Studio admin</span>
        </span>
      </Link>
      <nav aria-label="Admin">
        {GROUPS.map((group) => (
          <div key={group.label}>
            <p className="adm-group">{group.label}</p>
            <div className="adm-nav">
              {group.items.map((item) => (
                <SideLink key={item.to} item={item} count={item.count?.(attention) ?? 0} />
              ))}
            </div>
          </div>
        ))}
      </nav>
      <div className="adm-side-foot">
        <div className="divider" />
        <a className="adm-nav-item" href="#/" data-tip="View client app" aria-label="View client app">
          <ArrowUpRight size={20} strokeWidth={1.8} />
          <span className="adm-nav-label">View client app</span>
        </a>
        <div className="adm-owner">
          <Avatar name={STUDIO.owner} size={34} />
          <span className="adm-owner-text stack">
            <span style={{ fontSize: 14, fontWeight: 500 }}>{STUDIO.owner}</span>
            <span className="t-cap muted">Owner</span>
          </span>
        </div>
      </div>
    </aside>
  );
}

function SideLink({ item, count }: { item: NavItem; count: number }) {
  const Icon = item.icon;
  return (
    <NavLink to={item.to} end={item.end} className={({ isActive }) => `adm-nav-item ${isActive ? "is-active" : ""}`} data-tip={item.label} aria-label={count ? `${item.label}, ${count} need attention` : item.label}>
      {({ isActive }) => (
        <>
          {isActive && <motion.span layoutId="adm-nav-hl" className="adm-nav-hl" transition={spring.press} />}
          <Icon size={20} strokeWidth={isActive ? 2 : 1.8} />
          <span className="adm-nav-label">{item.label}</span>
          {count > 0 && <span className="chip-count adm-nav-count">{count}</span>}
        </>
      )}
    </NavLink>
  );
}

const TABS: NavItem[] = [
  { to: "/admin", label: "Today", icon: LayoutDashboard, end: true },
  { to: "/admin/orders", label: "Orders", icon: CakeSlice },
  { to: "/admin/clients", label: "Clients", icon: Users },
];

function AdminTabBar() {
  const [moreOpen, setMoreOpen] = useState(false);
  const { pathname } = useLocation();
  const attention = useAttention();
  const inMore = !["/admin", "/admin/orders", "/admin/clients", "/admin/orders/new"].some((p) => pathname === p) && !pathname.startsWith("/admin/orders/") && !pathname.startsWith("/admin/clients/");
  const tab = (item: NavItem) => (
    <NavLink key={item.to} to={item.to} end={item.end} className={({ isActive }) => `tab ${isActive ? "is-active" : ""}`}>
      {({ isActive }) => (
        <>
          {isActive && <motion.span layoutId="adm-tab-hl" className="tab-hl" transition={spring.press} />}
          <item.icon size={22} strokeWidth={isActive ? 2 : 1.6} />
          <span>{item.label}</span>
        </>
      )}
    </NavLink>
  );
  return (
    <div className="tabbar-wrap adm-tabbar mobile-only">
      <nav className="tabbar" aria-label="Admin">
        {tab(TABS[0]!)}
        {tab(TABS[1]!)}
        <Link to="/admin/orders/new" className="tab adm-tab-plus" aria-label="New order">
          <span>
            <Plus size={24} strokeWidth={2} />
          </span>
        </Link>
        {tab(TABS[2]!)}
        <button className={`tab ${inMore ? "is-active" : ""}`} onClick={() => setMoreOpen(true)} aria-haspopup="dialog">
          {inMore && <motion.span layoutId="adm-tab-hl" className="tab-hl" transition={spring.press} />}
          <span style={{ position: "relative" }}>
            <Ellipsis size={22} strokeWidth={inMore ? 2 : 1.6} />
            {attention.visitRequests + attention.reviews > 0 && <span className="adm-bell-dot" style={{ top: -6, right: -10 }} aria-hidden="true" />}
          </span>
          <span>More</span>
        </button>
      </nav>
      <Sheet open={moreOpen} onClose={() => setMoreOpen(false)} title="More">
        <nav className="list-card adm-sheet-nav" style={{ margin: "0 -20px" }} aria-label="More pages">
          {GROUPS.flatMap((g) => g.items)
            .filter((item) => !TABS.some((t) => t.to === item.to))
            .map((item) => {
              const count = item.count?.(attention) ?? 0;
              return (
                <Link key={item.to} to={item.to} className="row" onClick={() => setMoreOpen(false)}>
                  <span className="row-icon">
                    <item.icon size={18} strokeWidth={1.8} />
                  </span>
                  <span className="grow">{item.label}</span>
                  {count > 0 && <span className="chip-count">{count}</span>}
                  <ChevronRight size={18} className="row-chevron" />
                </Link>
              );
            })}
          <a href="#/" className="row" onClick={() => setMoreOpen(false)}>
            <span className="row-icon">
              <ArrowUpRight size={18} strokeWidth={1.8} />
            </span>
            <span className="grow">View client app</span>
          </a>
        </nav>
      </Sheet>
    </div>
  );
}

function useScrolled(threshold = 8) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > threshold);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [threshold]);
  return scrolled;
}

function OfflineBanner() {
  const [online, setOnline] = useState(() => (typeof navigator === "undefined" ? true : navigator.onLine));
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);
  if (online) return null;
  return (
    <p className="adm-offline" role="status" style={{ marginTop: 12 }}>
      <WifiOff size={16} /> You're offline. Changes are saved on this device and nothing is lost.
    </p>
  );
}

export interface PageProps {
  title: string;
  /** Line under the title, e.g. the open status. */
  status?: ReactNode;
  /** Period menu and the page's one primary action. */
  actions?: ReactNode;
  back?: { to: string; label: string };
  children: ReactNode;
  /** Title shown small in the bar once scrolled, when it differs from the page title. */
  barTitle?: string;
}

/** Sticky top bar + page title block, shared by every admin screen. */
export function AdminPage({ title, status, actions, back, children, barTitle }: PageProps) {
  const scrolled = useScrolled(back ? 8 : 40);
  const first = useFirstVisit(`title:${title}`);
  useEffect(() => {
    document.title = `${title} · ${STUDIO.name} admin`;
  }, [title]);
  return (
    <>
      <header className={`adm-bar ${scrolled ? "is-solid" : ""}`}>
        {back && (
          <Link to={back.to} className="adm-back">
            <ArrowLeft size={20} strokeWidth={1.8} />
            <span className="desktop-only">{back.label}</span>
          </Link>
        )}
        <span className="adm-bar-title" aria-hidden={!scrolled}>
          {barTitle ?? title}
        </span>
        <GlobalSearch />
        <AttentionButton />
        <span className="desktop-only" aria-hidden="true">
          <Avatar name={STUDIO.owner} size={36} />
        </span>
      </header>
      <main className="adm-page">
        <div className="adm-title-row">
          <div style={{ minWidth: 0 }}>
            <motion.h1 {...(first ? blurIn() : {})}>{title}</motion.h1>
            {status && <div className="adm-status">{status}</div>}
          </div>
          {actions && <div className="adm-title-actions">{actions}</div>}
        </div>
        {children}
      </main>
    </>
  );
}

function GlobalSearch() {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState("");
  const [sheetOpen, setSheetOpen] = useState(false);
  const mac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const q = value.trim();
    // Search every order, open or closed.
    navigate(q ? `/admin/orders?q=${encodeURIComponent(q)}&stage=new,quoted,production,ready,collected,cancelled` : "/admin/orders");
    setSheetOpen(false);
    setValue("");
    inputRef.current?.blur();
  };

  return (
    <>
      <form className="adm-search desktop-only" role="search" onSubmit={submit}>
        <Search size={17} strokeWidth={1.8} />
        <input ref={inputRef} type="search" value={value} onChange={(e) => setValue(e.target.value)} placeholder="Search clients, orders…" aria-label="Search orders by client, phone or order number" enterKeyHint="search" />
        <span className="adm-kbd" aria-hidden="true">
          {mac ? "⌘K" : "Ctrl K"}
        </span>
      </form>
      <button className="icon-btn is-plain mobile-only" onClick={() => setSheetOpen(true)} aria-label="Search">
        <Search size={21} strokeWidth={1.8} />
      </button>
      <Sheet open={sheetOpen} onClose={() => setSheetOpen(false)} title="Search">
        <form onSubmit={submit} className="stack gap-12" role="search">
          <input className="adm-input" type="search" autoFocus value={value} onChange={(e) => setValue(e.target.value)} placeholder="Name, phone or order number" aria-label="Search orders" enterKeyHint="search" />
          <button className="btn btn-dark btn-block" type="submit">
            Search orders
          </button>
        </form>
      </Sheet>
    </>
  );
}

function AttentionButton() {
  const [open, setOpen] = useState(false);
  const a = useAttention();
  const items = [
    { n: a.requests, text: a.requests === 1 ? "new request needs a price" : "new requests need a price", to: "/admin/orders?stage=new", icon: CakeSlice },
    { n: a.late, text: a.late === 1 ? "order is running late" : "orders are running late", to: "/admin/orders?due=late&sort=due", icon: TriangleAlert },
    { n: a.quotes, text: a.quotes === 1 ? "quote is waiting for payment" : "quotes are waiting for payment", to: "/admin/orders?stage=quoted", icon: ReceiptText },
    { n: a.ready, text: a.ready === 1 ? "order is ready to hand over" : "orders are ready to hand over", to: "/admin/orders?stage=ready", icon: ShoppingBag },
    { n: a.visitRequests, text: a.visitRequests === 1 ? "pickup or session to confirm" : "pickups or sessions to confirm", to: "/admin/appointments", icon: CalendarDays },
    { n: a.reminders, text: a.reminders === 1 ? "birthday reminder to send" : "birthday reminders to send", to: "/admin#reminders", icon: CalendarHeart },
    { n: a.reviews, text: a.reviews === 1 ? "review waiting for approval" : "reviews waiting for approval", to: "/admin/reviews", icon: Star },
  ].filter((i) => i.n > 0);
  return (
    <>
      <button className="icon-btn is-plain adm-bell" onClick={() => setOpen(true)} aria-label={a.total ? `${a.total} things need attention` : "Nothing needs attention"}>
        <Bell size={21} strokeWidth={1.8} />
        {a.total > 0 && <span className="adm-bell-dot">{a.total}</span>}
      </button>
      <Sheet open={open} onClose={() => setOpen(false)} title="Needs attention">
        {items.length ? (
          <nav className="list-card" style={{ margin: "0 -20px" }}>
            {items.map((item) => (
              <Link key={item.to} to={item.to} className="row" onClick={() => setOpen(false)}>
                <span className="row-icon">
                  <item.icon size={18} strokeWidth={1.8} />
                </span>
                <span className="grow">
                  <b style={{ fontWeight: 600 }}>{item.n}</b> {item.text}
                </span>
                <ChevronRight size={18} className="row-chevron" />
              </Link>
            ))}
          </nav>
        ) : (
          <p className="muted">You're all caught up.</p>
        )}
      </Sheet>
    </>
  );
}

export function EmptyState({ icon, title, body, action }: { icon: ReactNode; title: string; body?: string; action?: ReactNode }) {
  return (
    <div className="adm-empty">
      <span className="empty-icon">{icon}</span>
      <p className="t-title">{title}</p>
      {body && <p className="muted" style={{ maxWidth: "40ch" }}>{body}</p>}
      {action && <div style={{ marginTop: 8 }}>{action}</div>}
    </div>
  );
}
