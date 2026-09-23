import { Bell, BellOff, CakeSlice, CalendarHeart, Lock, Plus, Trash2 } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { AccountSheet } from "../components/AccountSheets";
import { Skeleton, useSkeleton } from "../components/Bits";
import { Button } from "../components/Button";
import { TopBar } from "../components/Chrome";
import { Dropdown } from "../components/Dropdown";
import { useNotify } from "../components/Notify";
import { Reveal } from "../components/Reveal";
import { Sheet } from "../components/Sheet";
import { accountOf, actions, useAppData } from "../data/store";
import { fmtMonthDay, monthLong } from "../lib/format";
import { daysUntil } from "../lib/studio";
import { spring } from "../motion";

const MONTHS = Array.from({ length: 12 }, (_, i) => ({ value: String(i + 1).padStart(2, "0"), label: monthLong(new Date(2024, i, 1)) }));
const DAYS = Array.from({ length: 31 }, (_, i) => ({ value: String(i + 1).padStart(2, "0"), label: String(i + 1) }));

const inWords = (days: number) => (days === 0 ? "today" : days === 1 ? "tomorrow" : `in ${days} days`);

/** Birthdays and anniversaries the client wants remembered, plus what the studio should know. */
export function Celebrations() {
  const loading = useSkeleton(500);
  const data = useAppData();
  const notify = useNotify();
  const account = accountOf(data);
  const [loginOpen, setLoginOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [dietaryOpen, setDietaryOpen] = useState(false);
  const now = new Date();
  // Dates are personal, so they only show for the logged-in account.
  const dates = account
    ? data.celebrations
        .filter((c) => c.customerId === account.id)
        .map((c) => ({ ...c, days: daysUntil(c.date, now) }))
        .sort((a, b) => a.days - b.days)
    : [];

  return (
    <main className="screen is-narrow">
      <TopBar back backRow="Back" title="Dates to remember" />
      <header className="page-title">
        <h1 className="t-h1">Dates to remember</h1>
        <p className="muted">Birthdays and anniversaries you never want to miss. We'll send a WhatsApp reminder a week before, in time to order.</p>
      </header>

      {loading ? (
        <div className="stack gap-16" aria-busy="true">
          <Skeleton h={120} r={8} />
          <Skeleton h={120} r={8} />
        </div>
      ) : !account ? (
        <div className="empty">
          <span className="empty-icon">
            <Lock size={24} />
          </span>
          <p className="t-title">Log in to save your dates</p>
          <p className="muted" style={{ maxWidth: "38ch" }}>
            Save the birthdays in your family once, and we'll remind you before each one. Log in with your WhatsApp number.
          </p>
          <Button variant="dark" onClick={() => setLoginOpen(true)} style={{ marginTop: 8 }}>
            Log in
          </Button>
        </div>
      ) : (
        <div className="stack gap-16">
          {dates.length === 0 ? (
            <div className="empty" style={{ paddingTop: 12 }}>
              <span className="empty-icon">
                <CalendarHeart size={24} />
              </span>
              <p className="t-title">No dates yet</p>
              <p className="muted">Add a birthday or anniversary and we'll remind you before it comes round.</p>
            </div>
          ) : (
            <div className="stack gap-12 measure-grid">
              <AnimatePresence initial={false}>
                {dates.map((c, i) => (
                  <motion.div key={c.id} layout exit={{ opacity: 0, x: -24 }} transition={spring.small}>
                    <Reveal as="section" className="card card-pad stack gap-12" delay={i * 0.05}>
                      <div className="between" style={{ alignItems: "flex-start", gap: 12 }}>
                        <div className="stack">
                          <p className="t-title">{c.label}</p>
                          <p className="subtle t-cap">
                            {fmtMonthDay(c.date)} · {inWords(c.days)}
                          </p>
                        </div>
                        {c.days <= 14 && (
                          <span className="badge is-gold" style={{ paddingRight: 10 }}>
                            <span className="badge-well" aria-hidden="true">
                              <CakeSlice size={13} />
                            </span>
                            Coming up
                          </span>
                        )}
                      </div>
                      <div className="between" style={{ gap: 8 }}>
                        <button className={`chip ${c.remind ? "is-active" : ""}`} aria-pressed={c.remind} onClick={() => actions.toggleReminder(c.id)}>
                          {c.remind ? <Bell size={14} /> : <BellOff size={14} />} {c.remind ? "Reminder on" : "Reminder off"}
                        </button>
                        <span className="inline" style={{ gap: 8 }}>
                          <Link className="btn btn-outline btn-sm" to={`/order/new?occasion=${/anniv/i.test(c.label) ? "anniversary" : "birthday"}`}>
                            Order a cake
                          </Link>
                          <button
                            className="icon-btn"
                            aria-label={`Remove ${c.label}`}
                            onClick={() => {
                              actions.removeCelebration(c.id);
                              notify("Date removed", `${c.label} is off your list.`);
                            }}
                          >
                            <Trash2 size={16} />
                          </button>
                        </span>
                      </div>
                    </Reveal>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}

          <Button variant="dark" block icon={<Plus size={18} />} onClick={() => setAddOpen(true)}>
            Add a date
          </Button>

          <section className="section">
            <h2 className="t-h3">For the studio</h2>
            <div className="card card-pad between" style={{ gap: 12 }}>
              <span className="stack">
                <span className="t-title">Allergies and dietary needs</span>
                <span className={account.dietary ? "" : "muted"}>{account.dietary || "Nothing noted. Tell us about nuts, eggs or anything else we should avoid."}</span>
              </span>
              <Button size="sm" onClick={() => setDietaryOpen(true)}>
                {account.dietary ? "Edit" : "Add"}
              </Button>
            </div>
          </section>
        </div>
      )}

      <AddDateSheet open={addOpen} onClose={() => setAddOpen(false)} />
      <DietarySheet open={dietaryOpen} onClose={() => setDietaryOpen(false)} initial={account?.dietary ?? ""} />
      <AccountSheet open={loginOpen} onClose={() => setLoginOpen(false)} mode="login" />
    </main>
  );
}

function AddDateSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const notify = useNotify();
  const [label, setLabel] = useState("");
  const [month, setMonth] = useState("");
  const [day, setDay] = useState("");
  const [remind, setRemind] = useState(true);
  const [error, setError] = useState("");

  const save = () => {
    const result = actions.addCelebration({ label, date: `${month}-${day}`, remind });
    if ("error" in result) {
      setError(result.error);
      return;
    }
    notify("Date saved", remind ? `We'll remind you a week before ${result.celebration.label}.` : `${result.celebration.label} is on your list.`);
    setLabel("");
    setMonth("");
    setDay("");
    setError("");
    onClose();
  };

  return (
    <Sheet open={open} onClose={onClose} title="Add a date">
      <div className="stack gap-16">
        <div className="field">
          <label htmlFor="date-label">Whose day is it?</label>
          <input id="date-label" value={label} maxLength={60} onChange={(e) => setLabel(e.target.value)} placeholder="Efua's birthday" />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <div className="field">
            <label htmlFor="date-day">Day</label>
            <Dropdown id="date-day" variant="field" value={day} options={DAYS} onChange={setDay} placeholder="Day" />
          </div>
          <div className="field">
            <label htmlFor="date-month">Month</label>
            <Dropdown id="date-month" variant="field" value={month} options={MONTHS} onChange={setMonth} placeholder="Month" />
          </div>
        </div>
        <label className="check-row">
          <input type="checkbox" checked={remind} onChange={(e) => setRemind(e.target.checked)} />
          <span className="stack">
            <span>Remind me on WhatsApp</span>
            <span className="subtle t-cap">A week before, so there's time for our 3 working days' notice.</span>
          </span>
        </label>
        {error && (
          <p className="t-cap" role="alert" style={{ color: "var(--danger)" }}>
            {error}
          </p>
        )}
        <Button variant="dark" block onClick={save}>
          Save date
        </Button>
      </div>
    </Sheet>
  );
}

function DietarySheet({ open, onClose, initial }: { open: boolean; onClose: () => void; initial: string }) {
  const notify = useNotify();
  const [text, setText] = useState(initial);
  const [error, setError] = useState("");
  return (
    <Sheet open={open} onClose={onClose} title="Allergies and dietary needs">
      <div className="stack gap-16">
        <div className="field">
          <label htmlFor="dietary-text">What should the studio know?</label>
          <textarea id="dietary-text" value={text} maxLength={300} onChange={(e) => setText(e.target.value)} placeholder="No nuts for Efua. Eggless for Grandma." />
          <span className="hint">Our kitchen uses eggs, milk, wheat and nuts. Tell us your head measurement here too, and we'll note both on every order.</span>
        </div>
        {error && (
          <p className="t-cap" role="alert" style={{ color: "var(--danger)" }}>
            {error}
          </p>
        )}
        <Button
          variant="dark"
          block
          onClick={() => {
            const result = actions.saveDietary(text);
            if ("error" in result) {
              setError(result.error);
              return;
            }
            notify("Saved", "We'll see this on your orders.");
            onClose();
          }}
        >
          Save
        </Button>
      </div>
    </Sheet>
  );
}
