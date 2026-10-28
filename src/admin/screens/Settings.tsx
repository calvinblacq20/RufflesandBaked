import { ArrowUpRight, RotateCcw } from "lucide-react";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { Button } from "../../components/Button";
import { useNotify } from "../../components/Notify";
import type { Announcement, Policies, Rules, StudioDetails } from "../../data/business";
import { actions, studio, useAppData } from "../../data/store";
import type { Hours } from "../../lib/schedule";
import { CardHead } from "../controls";
import { AdminPage } from "../Shell";
import { ConfirmSheet } from "../sheets";

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const WEEK = [1, 2, 3, 4, 5, 6, 0];
const DEFAULT_SPAN: [string, string] = ["08:00", "18:00"];

export function Settings() {
  const notify = useNotify();
  const data = useAppData();
  const [resetOpen, setResetOpen] = useState(false);
  const [defaultsOpen, setDefaultsOpen] = useState(false);

  return (
    <AdminPage title="Settings" status={<>Studio details, hours, fees and policies. Changes show on the client app too.</>}>
      <div className="adm-grid adm-grid-2" style={{ maxWidth: 1040 }}>
        <StudioCard details={data.settings.studio} />
        <HoursCard hours={data.settings.hours} />
        <AnnouncementCard notice={data.settings.announcement} />
        <PoliciesCard policies={data.settings.policies} />
        <RulesCard rules={data.settings.rules} />
        <section className="adm-card" aria-labelledby="demo">
          <CardHead id="demo" title="Demo" />
          <div className="adm-card-body stack gap-12">
            <p className="muted">All data is sample data kept in this browser. Resetting brings back the original orders, clients and payments on both the client and owner sides.</p>
            <div className="adm-actions">
              <Button icon={<RotateCcw size={16} />} onClick={() => setResetOpen(true)}>
                Reset demo data
              </Button>
              <Button icon={<RotateCcw size={16} />} onClick={() => setDefaultsOpen(true)}>
                Reset these settings
              </Button>
              <a className="btn btn-soft" href="#/">
                <ArrowUpRight size={16} /> Open client app
              </a>
            </div>
          </div>
        </section>
      </div>

      <ConfirmSheet
        open={resetOpen}
        onClose={() => setResetOpen(false)}
        danger
        title="Reset the demo?"
        body="Every change made in this browser is replaced with the original sample data. This can't be undone."
        confirmLabel="Reset"
        onConfirm={() => {
          actions.resetDemo();
          setResetOpen(false);
          notify("Demo reset", "Sample orders, clients and payments are back.");
        }}
      />
      <ConfirmSheet
        open={defaultsOpen}
        onClose={() => setDefaultsOpen(false)}
        title="Put settings back?"
        body="The studio details, opening hours, fees and policies go back to the ones the app shipped with. Orders and clients aren't touched."
        confirmLabel="Reset settings"
        onConfirm={() => {
          studio.resetSettings();
          setDefaultsOpen(false);
          notify("Settings reset", "Studio details, hours, fees and policies are back to the defaults.");
        }}
      />
    </AdminPage>
  );
}

/** A card whose fields are saved together; the button wakes up once something changes. */
function EditCard({ id, title, dirty, onSave, onReset, error, children }: { id: string; title: string; dirty: boolean; onSave: (e: FormEvent) => void; onReset: () => void; error: string | null; children: ReactNode }) {
  return (
    <form className="adm-card" aria-labelledby={id} onSubmit={onSave} noValidate>
      <CardHead id={id} title={title} action={dirty ? <span className="pill-tag">Unsaved</span> : undefined} />
      <div className="adm-card-body stack gap-16">{children}</div>
      {error && (
        <p className="adm-form-error" role="alert" style={{ padding: "0 20px 8px" }}>
          {error}
        </p>
      )}
      <div className="adm-card-foot">
        <button type="button" className="adm-link" onClick={onReset} style={{ visibility: dirty ? "visible" : "hidden" }}>
          Undo changes
        </button>
        <Button variant="dark" size="sm" type="submit" disabled={!dirty}>
          Save
        </Button>
      </div>
    </form>
  );
}

function StudioCard({ details }: { details: StudioDetails }) {
  const notify = useNotify();
  const [form, setForm] = useState(details);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => setForm(details), [details]);
  const dirty = (Object.keys(form) as (keyof StudioDetails)[]).some((k) => form[k] !== details[k]);
  const field = (key: keyof StudioDetails, label: string, hint?: string, type: "text" | "textarea" = "text") => (
    <div className="field">
      <label htmlFor={`studio-${key}`}>{label}</label>
      {type === "textarea" ? (
        <textarea id={`studio-${key}`} rows={4} value={String(form[key])} maxLength={800} onChange={(e) => setForm({ ...form, [key]: e.target.value })} />
      ) : (
        <input id={`studio-${key}`} value={String(form[key])} maxLength={200} onChange={(e) => setForm({ ...form, [key]: e.target.value })} />
      )}
      {hint && <span className="hint">{hint}</span>}
    </div>
  );

  return (
    <EditCard
      id="studio"
      title="Studio"
      dirty={dirty}
      error={error}
      onReset={() => {
        setForm(details);
        setError(null);
      }}
      onSave={(e) => {
        e.preventDefault();
        const result = studio.saveSettings({ studio: form });
        if ("error" in result) return setError(result.error);
        setError(null);
        notify("Studio details saved", "Receipts, WhatsApp messages and the client app now use them.");
      }}
    >
      {field("name", "Studio name")}
      {field("phone", "Phone, WhatsApp and MoMo number", "Quotes tell clients to send MoMo to this number.")}
      {field("email", "Email")}
      {field("area", "Area shown to clients", "e.g. Ofaakor, Kasoa")}
      {field("address", "Full address on receipts")}
      {field("directions", "How to find the studio", "Shown with the map on the client app.")}
      {field("mapsQuery", "What to search for in Maps")}
      {field("whatsappBusiness", "WhatsApp business link")}
      {field("instagram", "Instagram link")}
      {field("facebook", "Facebook page link", "Leave empty to hide it.")}
      {field("about", "About the studio", undefined, "textarea")}
    </EditCard>
  );
}

function HoursCard({ hours }: { hours: Hours }) {
  const notify = useNotify();
  const [form, setForm] = useState<Hours>(hours);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => setForm(hours), [hours]);
  const dirty = WEEK.some((d) => (form[d]?.[0] ?? "") !== (hours[d]?.[0] ?? "") || (form[d]?.[1] ?? "") !== (hours[d]?.[1] ?? ""));
  const setDay = (day: number, span: readonly [string, string] | null) => setForm({ ...form, [day]: span });

  return (
    <EditCard
      id="hours"
      title="Opening hours"
      dirty={dirty}
      error={error}
      onReset={() => {
        setForm(hours);
        setError(null);
      }}
      onSave={(e) => {
        e.preventDefault();
        const result = studio.saveSettings({ hours: form });
        if ("error" in result) return setError(result.error);
        setError(null);
        notify("Hours saved", "Pickup slots and the open/closed status follow the new hours.");
      }}
    >
      {WEEK.map((day) => {
        const span = form[day];
        return (
          <div key={day} className="between" style={{ gap: 12, flexWrap: "wrap" }}>
            <label className="check-row" style={{ minWidth: 150 }}>
              <input type="checkbox" className="cbx" checked={Boolean(span)} onChange={(e) => setDay(day, e.target.checked ? DEFAULT_SPAN : null)} />
              <span>{DAY_NAMES[day]}</span>
            </label>
            {span ? (
              <span className="inline" style={{ gap: 8 }}>
                <input className="adm-input" style={{ width: 118, height: 40 }} type="time" value={span[0]} aria-label={`${DAY_NAMES[day]} opens`} onChange={(e) => setDay(day, [e.target.value, span[1]])} />
                <span className="muted">to</span>
                <input className="adm-input" style={{ width: 118, height: 40 }} type="time" value={span[1]} aria-label={`${DAY_NAMES[day]} closes`} onChange={(e) => setDay(day, [span[0], e.target.value])} />
              </span>
            ) : (
              <span className="muted">Closed</span>
            )}
          </div>
        );
      })}
    </EditCard>
  );
}

function RulesCard({ rules }: { rules: Rules }) {
  const notify = useNotify();
  const [form, setForm] = useState({ lateFee: String(rules.lateFee), designFee: String(rules.designFee) });
  const [error, setError] = useState<string | null>(null);
  useEffect(() => setForm({ lateFee: String(rules.lateFee), designFee: String(rules.designFee) }), [rules]);
  const dirty = form.lateFee !== String(rules.lateFee) || form.designFee !== String(rules.designFee);
  const toNumber = (v: string) => Number(v.replace(/[^\d.]/g, ""));
  return (
    <EditCard
      id="rules"
      title="Fees"
      dirty={dirty}
      error={error}
      onReset={() => {
        setForm({ lateFee: String(rules.lateFee), designFee: String(rules.designFee) });
        setError(null);
      }}
      onSave={(e) => {
        e.preventDefault();
        const result = studio.saveSettings({ rules: { lateFee: toNumber(form.lateFee), designFee: toNumber(form.designFee) } });
        if ("error" in result) return setError(result.error);
        setError(null);
        notify("Fees saved", "New orders use them straight away. Past orders keep their price.");
      }}
    >
      <div className="field">
        <label htmlFor="rule-late">Late-order fee (GH₵)</label>
        <input id="rule-late" inputMode="decimal" value={form.lateFee} onChange={(e) => setForm({ ...form, lateFee: e.target.value })} />
        <span className="hint">Added when a client orders with less notice than the item needs.</span>
      </div>
      <div className="field">
        <label htmlFor="rule-design">Custom and character design, from (GH₵)</label>
        <input id="rule-design" inputMode="decimal" value={form.designFee} onChange={(e) => setForm({ ...form, designFee: e.target.value })} />
        <span className="hint">Added to single cakes with a custom design. You can raise it in the quote.</span>
      </div>
    </EditCard>
  );
}

/**
 * The one notice the studio can put in front of every client. It sits across the foot of the
 * client app between the dates set here, and a client who closes it does not see it again —
 * so changing the words gives it a new id and a fresh run at everyone.
 */
function AnnouncementCard({ notice }: { notice: Announcement }) {
  const notify = useNotify();
  const read = () => ({
    on: notice.on,
    title: notice.title,
    note: notice.note ?? "",
    ctaLabel: notice.ctaLabel ?? "",
    ctaHref: notice.ctaHref ?? "",
    from: notice.from ?? "",
    until: notice.until ?? "",
  });
  const [form, setForm] = useState(read);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => setForm(read()), [notice]);
  const dirty = JSON.stringify(form) !== JSON.stringify(read());
  const set = (patch: Partial<typeof form>) => setForm({ ...form, ...patch });

  return (
    <EditCard
      id="notice"
      title="Notice to clients"
      dirty={dirty}
      error={error}
      onReset={() => {
        setForm(read());
        setError(null);
      }}
      onSave={(e) => {
        e.preventDefault();
        if (form.on && !form.title.trim()) return setError("Write the notice, or switch it off.");
        if (form.from && form.until && form.from > form.until) return setError("The end date is before the start date.");
        if (Boolean(form.ctaLabel.trim()) !== Boolean(form.ctaHref.trim())) return setError("A button needs both a label and a link, or neither.");
        const changed = form.title !== notice.title || form.note !== (notice.note ?? "");
        const result = studio.saveSettings({
          announcement: {
            on: form.on,
            // New words, new id: anyone who closed the last notice sees this one.
            id: changed ? `n-${Date.now().toString(36)}` : notice.id,
            title: form.title.trim(),
            note: form.note.trim() || undefined,
            ctaLabel: form.ctaLabel.trim() || undefined,
            ctaHref: form.ctaHref.trim() || undefined,
            from: form.from || undefined,
            until: form.until || undefined,
          },
        });
        if ("error" in result) return setError(result.error);
        setError(null);
        notify(form.on ? "Notice is up" : "Notice switched off", form.on ? "Clients see it across the foot of the app." : "Nothing shows until you switch it back on.");
      }}
    >
      <label className="adm-check">
        <input type="checkbox" checked={form.on} onChange={(e) => set({ on: e.target.checked })} />
        <span>Show this notice to clients</span>
      </label>
      <div className="field">
        <label htmlFor="notice-title">The notice</label>
        <input id="notice-title" value={form.title} onChange={(e) => set({ title: e.target.value })} placeholder="Christmas orders close on 18 December" />
        <span className="hint">One line. This is what people read first.</span>
      </div>
      <div className="field">
        <label htmlFor="notice-note">The detail (optional)</label>
        <input id="notice-note" value={form.note} onChange={(e) => set({ note: e.target.value })} placeholder="Cakes and headpieces for the season are taken until then." />
        <span className="hint">Kept to two lines on a phone, so put the important part first.</span>
      </div>
      <div className="adm-grid-2">
        <div className="field">
          <label htmlFor="notice-cta">Button (optional)</label>
          <input id="notice-cta" value={form.ctaLabel} onChange={(e) => set({ ctaLabel: e.target.value })} placeholder="Start an order" />
        </div>
        <div className="field">
          <label htmlFor="notice-href">Where it goes</label>
          <input id="notice-href" value={form.ctaHref} onChange={(e) => set({ ctaHref: e.target.value })} placeholder="/order/new" />
        </div>
      </div>
      <div className="adm-grid-2">
        <div className="field">
          <label htmlFor="notice-from">Show from (optional)</label>
          <input id="notice-from" type="date" value={form.from} onChange={(e) => set({ from: e.target.value })} />
        </div>
        <div className="field">
          <label htmlFor="notice-until">Show until (optional)</label>
          <input id="notice-until" type="date" value={form.until} onChange={(e) => set({ until: e.target.value })} />
          <span className="hint">It stays up for the whole of that day, then comes down on its own.</span>
        </div>
      </div>
    </EditCard>
  );
}

function PoliciesCard({ policies }: { policies: Policies }) {
  const notify = useNotify();
  const [form, setForm] = useState(policies);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => setForm(policies), [policies]);
  const keys: [keyof Policies, string, string][] = [
    ["payment", "Payment", "On checkout, receipts and the order page."],
    ["cancellation", "Cancellation", "Shown before a client cancels."],
    ["handover", "Pickup and delivery", "On receipts and the order page."],
    ["important", "Notice and allergies", "Shown at checkout and on pickup reminders."],
  ];
  const dirty = keys.some(([k]) => form[k] !== policies[k]);

  return (
    <EditCard
      id="policies"
      title="Policies on receipts and orders"
      dirty={dirty}
      error={error}
      onReset={() => {
        setForm(policies);
        setError(null);
      }}
      onSave={(e) => {
        e.preventDefault();
        const result = studio.saveSettings({ policies: form });
        if ("error" in result) return setError(result.error);
        setError(null);
        notify("Policies saved", "Clients see the new wording on orders and receipts.");
      }}
    >
      {keys.map(([key, label, hint]) => (
        <div key={key} className="field">
          <label htmlFor={`policy-${key}`}>{label}</label>
          <textarea id={`policy-${key}`} rows={3} value={form[key]} maxLength={400} onChange={(e) => setForm({ ...form, [key]: e.target.value })} />
          <span className="hint">{hint}</span>
        </div>
      ))}
    </EditCard>
  );
}
