import { CalendarDays, CalendarHeart, ChevronRight, Globe, Heart, LifeBuoy, LogOut, MessageCircle, RotateCcw, Search, ShoppingBag, Smartphone, Sparkles, UserRound } from "lucide-react";
import { InstagramIcon } from "../components/SocialIcons";
import { motion } from "motion/react";
import { useState, type ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AccountSheet, FindOrderSheet } from "../components/AccountSheets";
import { Avatar, Skeleton, useSkeleton } from "../components/Bits";
import { Button } from "../components/Button";
import { useNotify } from "../components/Notify";
import { Sheet } from "../components/Sheet";
import { STUDIO } from "../data/business";
import { accessOf, accountOf, actions, useAppData } from "../data/store";
import type { Customer } from "../data/types";
import { amountDue, visibleOrders } from "../lib/checkout";
import { formatGhPhone, whatsappLink } from "../lib/contact";
import { fmtDate, money } from "../lib/format";
import { isActive } from "../lib/orders";
import { daysUntil } from "../lib/studio";
import { enter } from "../motion";

export function Profile() {
  const loading = useSkeleton(500);
  const account = accountOf(useAppData());

  if (loading) {
    return (
      <main className="screen is-narrow" aria-busy="true">
        <div className="between" style={{ paddingTop: 28 }}>
          <div className="stack gap-8 grow">
            <Skeleton w="60%" h={30} />
            <Skeleton w="30%" h={14} />
          </div>
          <Skeleton w={64} h={64} r={999} />
        </div>
        <Skeleton h={150} r={12} style={{ marginTop: 24 }} />
        <Skeleton h={110} r={8} style={{ marginTop: 16 }} />
        <Skeleton h={300} r={8} style={{ marginTop: 16 }} />
      </main>
    );
  }
  return account ? <AccountProfile account={account} /> : <GuestProfile />;
}

/* ---------------- No account (the default) ---------------- */

function GuestProfile() {
  const data = useAppData();
  const notify = useNotify();
  const [sheet, setSheet] = useState<"login" | "create" | "find" | "device" | null>(null);
  const remembered = data.device.contact;
  const onPhone = visibleOrders(data.orders, accessOf(data));

  return (
    <main className="screen is-narrow">
      <div className="profile-grid">
        <div className="profile-left">
          <motion.header className="between" style={{ paddingTop: 28 }} {...enter(16)}>
            <div className="stack gap-4">
              <h1 className="t-h1">{remembered ? `Hi ${remembered.name.split(" ")[0]}` : "Hi there"}</h1>
              <p className="muted">You can order without an account.</p>
            </div>
            <span className="avatar is-soft" style={{ width: 64, height: 64 }} aria-hidden="true">
              <UserRound size={28} strokeWidth={1.6} />
            </span>
          </motion.header>

          <motion.section className="account-card" style={{ marginTop: 24 }} {...enter(24, 0.05)}>
            <p className="t-title">Save your orders (optional)</p>
            <p className="muted">Log in with your WhatsApp number to see every order, save family birthdays for reminders and collect loyalty points on any phone. No password.</p>
            <div className="account-card-actions">
              <Button variant="gold" size="sm" onClick={() => setSheet("create")}>
                Create account
              </Button>
              <Button variant="ghost-dark" size="sm" onClick={() => setSheet("login")}>
                Log in
              </Button>
            </div>
          </motion.section>
        </div>

        <div className="profile-right">
          <motion.nav className="card list-card" style={{ marginTop: 16 }} aria-label="Orders" {...enter(24, 0.1)}>
            <MenuRow icon={<Search size={20} strokeWidth={1.6} />} label="Find my order" note="Use your order number and WhatsApp number" onClick={() => setSheet("find")} />
            <MenuRow icon={<ShoppingBag size={20} strokeWidth={1.6} />} label="Orders on this phone" note={onPhone.length ? `${onPhone.length} ${onPhone.length === 1 ? "order" : "orders"}` : "None yet"} to="/orders" />
            <MenuRow icon={<Heart size={20} strokeWidth={1.6} />} label="Saved treats" to="/explore?saved=1" />
            <MenuRow icon={<CalendarHeart size={20} strokeWidth={1.6} />} label="Dates to remember" note="Log in to get birthday reminders" to="/profile/dates" />
            {remembered && <MenuRow icon={<Smartphone size={20} strokeWidth={1.6} />} label="Details on this phone" note={formatGhPhone(remembered.phone)} onClick={() => setSheet("device")} />}
          </motion.nav>

          <nav className="card list-card" style={{ marginTop: 16 }} aria-label="Help">
            <MenuRow icon={<MessageCircle size={20} strokeWidth={1.6} />} label="Chat with the studio" href={STUDIO.whatsappBusiness} />
            <MenuRow icon={<InstagramIcon size={20} strokeWidth={1.6} />} label="Instagram" note="@ruffles_byh" href={STUDIO.instagram} />
            <MenuRow icon={<LifeBuoy size={20} strokeWidth={1.6} />} label="Support" href={whatsappLink(STUDIO.phone, `Hi ${STUDIO.name}, I need help with the app.`)} />
            <MenuRow icon={<Globe size={20} strokeWidth={1.6} />} label="English (Ghana)" />
          </nav>

          <DemoSession />
        </div>
      </div>

      <AccountSheet open={sheet === "login" || sheet === "create"} onClose={() => setSheet(null)} mode={sheet === "create" ? "create" : "login"} defaultName={remembered?.name} defaultPhone={remembered?.phone} />
      <FindOrderSheet open={sheet === "find"} onClose={() => setSheet(null)} />

      <Sheet open={sheet === "device"} onClose={() => setSheet(null)} title="Details on this phone">
        {remembered && (
          <div className="stack gap-16">
            <p className="muted">Saved when you ticked "Remember me on this phone", so checkout fills itself in.</p>
            <DetailsList
              rows={[
                ["Name", remembered.name],
                ["WhatsApp", formatGhPhone(remembered.phone)],
                ["Email", remembered.email],
                ["Town or area", remembered.town],
                ["Delivery address", [remembered.address, remembered.digitalAddress].filter(Boolean).join(" · ")],
              ]}
            />
            <Button
              block
              onClick={() => {
                actions.forgetDevice();
                setSheet(null);
                notify("Phone cleared", "Your details and order list are removed from this phone. The studio still has your orders.");
              }}
            >
              Forget this phone
            </Button>
          </div>
        )}
      </Sheet>
    </main>
  );
}

/* ---------------- Logged in ---------------- */

function AccountProfile({ account }: { account: Customer }) {
  const data = useAppData();
  const notify = useNotify();
  const navigate = useNavigate();
  const [detailsOpen, setDetailsOpen] = useState(false);

  // Only this account's own orders, not ones looked up on this phone for someone else.
  const mine = data.orders.filter((o) => o.customerId === account.id);
  const owing = mine.filter((o) => isActive(o) && o.status !== "request" && amountDue(o).amount > 0);
  const totalDue = owing.reduce((sum, o) => sum + amountDue(o).amount, 0);
  const next = data.celebrations
    .filter((c) => c.customerId === account.id)
    .map((c) => ({ label: c.label, days: daysUntil(c.date, new Date()) }))
    .sort((a, b) => a.days - b.days)[0];
  const upcomingNote = next ? `${next.label} ${next.days === 0 ? "today" : next.days === 1 ? "tomorrow" : `in ${next.days} days`}` : "Save birthdays for reminders";

  return (
    <main className="screen is-narrow">
      <div className="profile-grid">
        <div className="profile-left">
          <motion.header className="between" style={{ paddingTop: 28 }} {...enter(16)}>
            <div className="stack gap-4">
              <h1 className="t-h1">{account.name}</h1>
              <p className="muted">With us since {fmtDate(new Date(account.memberSince))}</p>
            </div>
            <Avatar name={account.name} size={64} />
          </motion.header>

          <motion.section className="balance-card" style={{ marginTop: 24 }} {...enter(24, 0.05)}>
            <p className="t-cap" style={{ color: "var(--white-75)" }}>
              {totalDue > 0 ? "Due now" : "Balance"}
            </p>
            <p className="t-num">{money(totalDue)}</p>
            <p className="t-cap" style={{ color: "var(--white-75)" }}>
              {totalDue > 0 ? `Across ${owing.length === 1 ? "1 order" : `${owing.length} orders`}` : "You're all paid up"}
            </p>
            <div className="inline" style={{ gap: 8, marginTop: 10 }}>
              {owing[0] && (
                <Button variant="gold" size="sm" onClick={() => navigate(`/orders/${owing[0]?.id}`)}>
                  Pay now
                </Button>
              )}
              <span className="inline t-cap" style={{ color: "var(--gold)", gap: 4 }}>
                <Sparkles size={13} /> {account.points} points
              </span>
            </div>
          </motion.section>
        </div>

        <div className="profile-right">
          <motion.nav className="card list-card" style={{ marginTop: 16 }} aria-label="Account" {...enter(24, 0.15)}>
            <MenuRow icon={<UserRound size={20} strokeWidth={1.6} />} label="Your details" onClick={() => setDetailsOpen(true)} />
            <MenuRow icon={<CalendarHeart size={20} strokeWidth={1.6} />} label="Dates to remember" note={upcomingNote} to="/profile/dates" />
            <MenuRow icon={<Heart size={20} strokeWidth={1.6} />} label="Saved treats" to="/explore?saved=1" />
            <MenuRow icon={<MessageCircle size={20} strokeWidth={1.6} />} label="Messages" href={STUDIO.whatsappBusiness} />
            <MenuRow icon={<ShoppingBag size={20} strokeWidth={1.6} />} label="My orders" to="/orders" />
            <MenuRow icon={<CalendarDays size={20} strokeWidth={1.6} />} label="Pickups and deliveries" to="/orders?tab=pickups" />
          </motion.nav>

          <nav className="card list-card" style={{ marginTop: 16 }} aria-label="Help">
            <MenuRow icon={<InstagramIcon size={20} strokeWidth={1.6} />} label="Instagram" note="@ruffles_byh" href={STUDIO.instagram} />
            <MenuRow icon={<LifeBuoy size={20} strokeWidth={1.6} />} label="Support" href={whatsappLink(STUDIO.phone, `Hi ${STUDIO.name}, I need help with the app.`)} />
            <MenuRow icon={<Globe size={20} strokeWidth={1.6} />} label="English (Ghana)" />
          </nav>

          <DemoSession
            extra={
              <MenuRow
                icon={<LogOut size={20} strokeWidth={1.6} />}
                label="Log out"
                onClick={() => {
                  actions.logOut();
                  notify("Logged out", "Your orders, dates and receipts stay in your account. Log in again to see them.");
                }}
              />
            }
          />
        </div>
      </div>

      <Sheet open={detailsOpen} onClose={() => setDetailsOpen(false)} title="Your details">
        <div className="stack gap-16">
          <DetailsList
            rows={[
              ["Name", account.name],
              ["WhatsApp", formatGhPhone(account.phone)],
              ["Email", account.email],
              ["Town or area", account.town],
              ["Delivery address", [account.address, account.digitalAddress].filter(Boolean).join(" · ")],
              ["Allergies and dietary needs", account.dietary ?? ""],
              ["With us since", fmtDate(new Date(account.memberSince))],
            ]}
          />
          <p className="t-cap subtle">Your details update each time you place an order.</p>
        </div>
      </Sheet>
    </main>
  );
}

/* ---------------- Shared ---------------- */

function DemoSession({ extra }: { extra?: ReactNode }) {
  const notify = useNotify();
  return (
    <>
      <nav className="card list-card" style={{ marginTop: 16 }} aria-label="Session">
        <MenuRow
          icon={<RotateCcw size={20} strokeWidth={1.6} />}
          label="Reset demo data"
          onClick={() => {
            actions.resetDemo();
            notify("Demo reset", "Sample orders are back and you're logged out.");
          }}
        />
        {extra}
      </nav>
      <p className="t-cap subtle mobile-only" style={{ textAlign: "center", marginTop: 20 }}>
        {STUDIO.name} · Demo build
      </p>
    </>
  );
}

function DetailsList({ rows }: { rows: [string, string][] }) {
  return (
    <dl className="stack gap-16">
      {rows
        .filter(([, v]) => v)
        .map(([k, v]) => (
          <div key={k} className="stack">
            <dt className="subtle t-cap">{k}</dt>
            <dd className="t-title">{v}</dd>
          </div>
        ))}
    </dl>
  );
}

function MenuRow({ icon, label, note, to, href, onClick }: { icon: ReactNode; label: string; note?: string; to?: string; href?: string; onClick?: () => void }) {
  const inner = (
    <>
      <span style={{ display: "grid", placeItems: "center", width: 28 }}>{icon}</span>
      <span className="grow stack">
        <span>{label}</span>
        {note && <span className="subtle t-cap">{note}</span>}
      </span>
      {(to || href || onClick) && <ChevronRight size={18} className="row-chevron" />}
    </>
  );
  if (to)
    return (
      <Link to={to} className="row">
        {inner}
      </Link>
    );
  if (href)
    return (
      <a href={href} target="_blank" rel="noreferrer" className="row">
        {inner}
      </a>
    );
  if (onClick)
    return (
      <button onClick={onClick} className="row">
        {inner}
      </button>
    );
  return <div className="row">{inner}</div>;
}
