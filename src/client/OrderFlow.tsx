import { ArrowUp, CakeSlice, CalendarDays, Check, Clock, ImagePlus, Lock, Mail, MapPin, Minus, Palette, Phone, Plus, Send, Sparkles, Trash2, Truck, UserRound, Wallet } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useMemo, useRef, useState, type InputHTMLAttributes, type ReactNode } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { AccountSheet } from "../components/AccountSheets";
import { AppIcon } from "../components/Brand";
import { Photo, Skeleton, Stars, useSkeleton } from "../components/Bits";
import { Button, Cta, Dots } from "../components/Button";
import { TopBar } from "../components/Chrome";
import { useNotify } from "../components/Notify";
import { SuccessScreen } from "../components/Overlays";
import { PaystackSheet } from "../components/Paystack";
import { useScrollTo } from "../components/Scroll";
import { DateStrip, MonthCalendar } from "../components/Pickers";
import { Sheet } from "../components/Sheet";
import { HOURS, POLICIES, RULES, STUDIO } from "../data/business";
import { CATEGORIES, DESIGN_OPTIONS, FINISH_OPTIONS, FLAVOURS, LAYER_OPTIONS, OCCASIONS, SIZES, STYLES, styleById, tierRange } from "../data/catalog";
import { accountOf, actions, useAppData, type OnlinePayment } from "../data/store";
import type { ContactDetails, Delivery, DesignPlan, Flavour, Occasion, OrderStatus, PayChoice, Style } from "../data/types";
import { cleanContact, contactFromCustomer, EMPTY_CONTACT, validateContact, type ContactErrors } from "../lib/checkout";
import { addDays, dayKey, fmtDayLong, fmtDayShort, fmtTime, money, parseLocal, plural } from "../lib/format";
import { itemSummary } from "../lib/items";
import { FINISH_ADD, defaultChoice, estimate, fixChoice, fromPriceOf, gridPrice, hasFlavour, isQuoted, layersFor, maxFlavours, rangeOf, sizesFor, sizesOf, unitPrice, type ItemChoice } from "../lib/pricing";
import { dateStrip, isOpenDay, neededByFit, readyWindow, slotsFor } from "../lib/schedule";
import { spring } from "../motion";

type Draft = ItemChoice;
type PricedLine = Draft & { style?: Style; unitPrice: number };

const STEP_TITLES = ["Choose what you need", "Customise", "Date and pickup", "Your details", "Review and pay"] as const;
const CRUMBS = ["Menu", "Customise", "Date & pickup", "Details", "Pay"] as const;
const DETAILS_STEP = 3;
const REVIEW_STEP = 4;
const FIELD_ORDER: (keyof ContactDetails)[] = ["name", "phone", "email", "town", "address", "digitalAddress"];
const MAX_PHOTO_BYTES = 8 * 1024 * 1024;
const MESSAGE_MAX = 40;
const COLOURS_MAX = 60;

const newLine = (style: Style): Draft => ({ styleId: style.id, ...defaultChoice(style) });

export function OrderFlow() {
  const navigate = useNavigate();
  const notify = useNotify();
  const [params] = useSearchParams();
  const data = useAppData();
  const now = useMemo(() => new Date(), []);

  const [step, setStep] = useState(0);
  const [lines, setLines] = useState<Draft[]>(() => {
    const style = styleById(params.get("style") ?? "");
    return style && style.active !== false ? [newLine(style)] : [];
  });
  const [photos, setPhotos] = useState<{ url: string; name: string }[]>([]);
  const [occasion, setOccasion] = useState<Occasion | null>(() => {
    const o = params.get("occasion");
    return OCCASIONS.some((x) => x.id === o) ? (o as Occasion) : null;
  });
  const [neededBy, setNeededBy] = useState<string | null>(null);
  const [handoverStart, setHandoverStart] = useState<string | null>(null);
  const [designPlan, setDesignPlan] = useState<DesignPlan | null>(null);
  const [designNotes, setDesignNotes] = useState("");
  const [consultStart, setConsultStart] = useState<string | null>(null);
  const [delivery, setDelivery] = useState<Delivery>("pickup");
  const [comments, setComments] = useState("");
  const [usePoints, setUsePoints] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [created, setCreated] = useState<{ id: string; number: string; status: OrderStatus; receiptNo?: string; email: string; neededBy: string } | null>(null);

  // Signed-in customers start from their account; guests from what this phone remembers, if anything.
  const account = accountOf(data);
  const [contact, setContact] = useState<ContactDetails>(() => (account ? contactFromCustomer(account) : data.device.contact ?? EMPTY_CONTACT));
  const [dietary, setDietary] = useState(account?.dietary ?? "");
  const [remember, setRemember] = useState(true);
  const [showErrors, setShowErrors] = useState(false);
  const [payChoice, setPayChoice] = useState<PayChoice | null>(null);
  const [payOpen, setPayOpen] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);

  // Free photo previews only when leaving the flow; they stay on screen until then.
  const photosRef = useRef(photos);
  photosRef.current = photos;
  useEffect(() => () => photosRef.current.forEach((p) => URL.revokeObjectURL(p.url)), []);
  const scrollTo = useScrollTo();
  useEffect(() => {
    scrollTo(0, { immediate: true });
  }, [step, scrollTo]);

  const readyDays = Math.max(0, ...lines.map((l) => styleById(l.styleId)?.readyDays ?? 0));
  const window_ = useMemo(() => readyWindow(now, readyDays || 1, HOURS), [now, readyDays]);
  const fit = neededBy ? neededByFit(parseLocal(neededBy), window_) : null;
  const shortNotice = fit === "late";
  const priced: PricedLine[] = lines.map((l) => {
    const style = styleById(l.styleId);
    return { ...l, style, unitPrice: style ? unitPrice(style, l) : 0 };
  });
  const est = estimate(priced, shortNotice);
  const points = account?.points ?? 0;
  const discount = usePoints && account ? Math.min(Math.floor(points / 10), Math.floor(est.total * 0.1)) : 0;
  const total = est.total - discount;
  const readyBy = neededBy ?? dayKey(window_.normal);
  const designed = priced.some((l) => l.style && l.style.kind !== "unit");
  const custom = priced.some((l) => l.design === "custom" || l.style?.kind === "tiered");
  /** True while something on the order has no list price at all, so the total is still incomplete. */
  const hasBespoke = priced.some((l) => l.style && isQuoted(l.style));
  const needsQuote = custom || hasBespoke || designPlan === "consult";
  const pay: PayChoice = payChoice ?? (needsQuote ? "later" : "now");
  const contactErrors = validateContact(contact, delivery);
  const firstContactError = FIELD_ORDER.find((key) => contactErrors[key]);

  // A guest who logs in part-way through gets their account details.
  useEffect(() => {
    if (!account) return;
    setContact(contactFromCustomer(account));
    setDietary((d) => d || account.dietary || "");
  }, [account]);
  // Plain orders don't need a design plan; a stale one would still book a session.
  useEffect(() => {
    if (!custom) setDesignPlan(null);
  }, [custom]);

  const missing = (() => {
    if (step === 0 && lines.length === 0) return "Choose at least one item";
    if (step === 1 && custom) {
      if (!designPlan) return "Choose how we'll get your design";
      if (designPlan === "ours" && designNotes.trim().length < 3) return "Tell us the theme and colours";
    }
    if (step === 2) {
      if (!occasion) return "Choose the occasion";
      if (!neededBy || fit === "too-soon") return "Pick the day you need it";
      if (!handoverStart) return delivery === "delivery" ? "Pick a delivery window" : "Pick a pickup time";
      if (designPlan === "consult" && !consultStart) return "Pick a fitting time";
    }
    if (step === DETAILS_STEP && showErrors && firstContactError) return contactErrors[firstContactError] ?? null;
    return null;
  })();

  const toggleLine = (style: Style) => setLines((prev) => (prev.some((l) => l.styleId === style.id) ? prev.filter((l) => l.styleId !== style.id) : [...prev, newLine(style)]));
  const updateLine = (styleId: string, patch: Partial<Draft>) =>
    setLines((prev) =>
      prev.map((l) => {
        if (l.styleId !== styleId) return l;
        const style = styleById(styleId);
        const next = { ...l, ...patch };
        return style ? { styleId, ...fixChoice(style, next) } : next;
      }),
    );

  const back = () => (step > 0 ? setStep(step - 1) : navigate(-1));

  /** Creates the order in one step: customer record, order, pickup slot and (when paid now) the receipt. Returns an error to show, or null. */
  const placeOrder = (payment?: OnlinePayment): string | null => {
    const clean = cleanContact(contact, delivery);
    const photoNote = photos.length ? `${plural(photos.length, "reference photo")} to send on WhatsApp.` : "";
    const result = actions.placeOrder({
      occasion: occasion ?? "other",
      neededBy: neededBy ?? readyBy,
      readyBy,
      shortNotice,
      total,
      items: priced.map(({ styleId, qty, flavours, size, layers, tiers, finish, design, message, colours, unitPrice: u }) => ({ styleId, qty, flavours, size, layers, tiers, finish, design, message: message?.trim() || undefined, colours: colours?.trim() || undefined, unitPrice: u })),
      designPlan: designPlan ?? "ours",
      designNotes: [designNotes.trim(), photoNote].filter(Boolean).join(" ") || undefined,
      handoverStart: handoverStart ?? undefined,
      consultStart: designPlan === "consult" ? consultStart ?? undefined : undefined,
      delivery,
      comments: comments.trim() || undefined,
      dietary,
      contact: clean,
      remember: account ? false : remember,
      payChoice: pay,
      payment,
    });
    if ("error" in result) return result.error;
    setPayOpen(false);
    setCreated({ id: result.order.id, number: result.order.number, status: result.order.status, receiptNo: result.payment?.receiptNo, email: clean.email, neededBy: result.order.neededBy });
    return null;
  };

  const sendRequest = async () => {
    setSubmitting(true);
    await new Promise((r) => window.setTimeout(r, 1000));
    const error = placeOrder();
    setSubmitting(false);
    if (error) notify("Couldn't send your request", error);
  };

  const continueFromDetails = () => {
    setShowErrors(true);
    if (firstContactError) {
      document.getElementById(`contact-${firstContactError}`)?.focus();
      return;
    }
    setContact(cleanContact(contact, delivery));
    setStep(REVIEW_STEP);
  };

  const onSuccessDone = useCallback(() => {
    if (!created) return;
    navigate(`/orders/${created.id}`, { replace: true });
    window.setTimeout(() => {
      if (created.status === "confirmed") notify("Order booked", `${created.number} is paid and booked for ${fmtDayShort(parseLocal(created.neededBy))}. Receipt ${created.receiptNo ?? ""} is on its way to ${created.email}.`);
      else if (created.receiptNo) notify("Payment received", `Receipt ${created.receiptNo} for ${created.number} is ready. We'll confirm your design on WhatsApp.`);
      else notify("Order request received", `We've got ${created.number}. Your price and a payment link will come on WhatsApp.`);
    }, 700);
  }, [created, navigate, notify]);

  const cta =
    step < DETAILS_STEP ? (
      <Cta onClick={() => setStep(step + 1)} disabled={Boolean(missing)}>
        Continue
      </Cta>
    ) : step === DETAILS_STEP ? (
      <Cta onClick={continueFromDetails}>Continue</Cta>
    ) : pay === "now" ? (
      <Cta onClick={() => setPayOpen(true)}>Pay {money(total)}</Cta>
    ) : (
      <Cta onClick={sendRequest} loading={submitting}>
        Send request
      </Cta>
    );

  const itemCount = lines.reduce((n, l) => n + l.qty, 0);

  return (
    <main className="screen flow-screen">
      <TopBar
        back={back}
        close={() => navigate("/")}
        title={STEP_TITLES[step]}
        right={
          <nav className="flow-crumbs desktop-only" aria-label="Order steps">
            {CRUMBS.map((label, i) => (
              <span key={label} className="inline" style={{ gap: 6 }}>
                {i > 0 && <span className="flow-crumb-sep" aria-hidden="true">›</span>}
                <button className={`flow-crumb ${i === step ? "is-current" : i < step ? "is-done" : ""}`} disabled={i >= step} onClick={() => setStep(i)} aria-current={i === step ? "step" : undefined}>
                  {label}
                </button>
              </span>
            ))}
          </nav>
        }
      />
      <div className="flow-progress mobile-only" aria-hidden="true">
        {STEP_TITLES.map((t, i) => (
          <span key={t}>
            <motion.i initial={false} animate={{ scaleX: i <= step ? 1 : 0 }} transition={spring.press} />
          </span>
        ))}
      </div>

      <div className="flow-layout">
        <div className="flow-main stack" style={{ minWidth: 0 }}>
          <h1 className="t-h2" style={{ padding: "8px 0 16px" }}>
            {STEP_TITLES[step]}
          </h1>

          <AnimatePresence mode="wait" initial={false}>
            <motion.div key={step} initial={{ opacity: 0, x: 28 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -28 }} transition={spring.small} className="stack" style={{ flex: 1 }}>
              {step === 0 && <ChooseItems lines={lines} onToggle={toggleLine} onQty={(id, qty) => updateLine(id, { qty })} />}
              {step === 1 && (
                <Customise
                  lines={priced}
                  onUpdate={updateLine}
                  photos={photos}
                  setPhotos={setPhotos}
                  designed={designed}
                  custom={custom}
                  designPlan={designPlan}
                  setDesignPlan={setDesignPlan}
                  designNotes={designNotes}
                  setDesignNotes={setDesignNotes}
                />
              )}
              {step === 2 && (
                <DateAndHandover
                  now={now}
                  readyDays={readyDays}
                  window_={window_}
                  occasion={occasion}
                  setOccasion={setOccasion}
                  neededBy={neededBy}
                  setNeededBy={(key) => {
                    setNeededBy(key);
                    setHandoverStart(null);
                    if (consultStart && consultStart.slice(0, 10) >= key) setConsultStart(null);
                  }}
                  fit={fit}
                  handoverStart={handoverStart}
                  setHandoverStart={setHandoverStart}
                  consult={designPlan === "consult"}
                  consultStart={consultStart}
                  setConsultStart={setConsultStart}
                  takenSlots={data.appointments.filter((a) => a.status !== "cancelled" && (a.purpose === "fitting" || a.purpose === "tasting")).map((a) => a.start)}
                  delivery={delivery}
                  setDelivery={(d) => {
                    setDelivery(d);
                    setHandoverStart(null);
                  }}
                />
              )}
              {step === DETAILS_STEP && (
                <YourDetails
                  contact={contact}
                  setContact={setContact}
                  errors={showErrors ? contactErrors : {}}
                  delivery={delivery}
                  accountName={account?.name}
                  remember={remember}
                  setRemember={setRemember}
                  dietary={dietary}
                  setDietary={setDietary}
                  onLogIn={() => setLoginOpen(true)}
                />
              )}
              {step === REVIEW_STEP && (
                <Review
                  lines={priced}
                  lateFee={est.lateFee}
                  discount={discount}
                  total={total}
                  neededBy={neededBy}
                  handoverStart={handoverStart}
                  consultStart={designPlan === "consult" ? consultStart : null}
                  designPlan={custom ? designPlan : null}
                  designNotes={designNotes}
                  dietary={dietary}
                  delivery={delivery}
                  comments={comments}
                  setComments={setComments}
                  points={points}
                  signedIn={Boolean(account)}
                  usePoints={usePoints}
                  setUsePoints={setUsePoints}
                  contact={contact}
                  onEditDetails={() => setStep(DETAILS_STEP)}
                  payChoice={pay}
                  setPayChoice={setPayChoice}
                  needsQuote={needsQuote}
                  photoCount={photos.length}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Desktop: sticky order summary with the step button */}
        <aside className="flow-aside desk" aria-label="Order summary">
          <div className="card aside-card stack gap-12">
            <div className="inline" style={{ gap: 12 }}>
              <AppIcon size={44} />
              <div className="stack">
                <p className="t-title">{STUDIO.name}</p>
                <span className="subtle t-cap">{STUDIO.area}</span>
              </div>
            </div>
            <div className="divider" style={{ margin: 0 }} />
            {priced.length === 0 ? (
              <p className="muted">Nothing chosen yet. Pick a cake or treat to see your price.</p>
            ) : (
              priced.map((line) => (
                <div key={line.styleId} className="kv">
                  <span className="stack">
                    <span>
                      {line.style?.name} {line.qty > 1 ? `× ${line.qty}` : ""}
                    </span>
                    <span className="subtle t-cap">{itemSummary(line, line.style)}</span>
                  </span>
                  <span>{line.style && isQuoted(line.style) ? "By quote" : money(line.unitPrice * line.qty)}</span>
                </div>
              ))
            )}
            {neededBy && (
              <p className="info-line t-cap muted">
                <CalendarDays size={14} />
                <span>
                  {delivery === "delivery" ? "Delivery" : "Pickup"} {fmtDayShort(parseLocal(neededBy))}
                  {handoverStart ? `, ${fmtTime(parseLocal(handoverStart))}` : ""}
                  {shortNotice ? " · late order" : ""}
                </span>
              </p>
            )}
            {consultStart && designPlan === "consult" && (
              <p className="info-line t-cap muted">
                <Clock size={14} />
                <span>
                  Fitting {fmtDayShort(parseLocal(consultStart))}, {fmtTime(parseLocal(consultStart))}
                </span>
              </p>
            )}
            {est.lateFee > 0 && (
              <div className="kv muted">
                <span>Late order</span>
                <span>{money(est.lateFee)}</span>
              </div>
            )}
            {discount > 0 && (
              <div className="kv muted">
                <span>Loyalty points</span>
                <span>-{money(discount)}</span>
              </div>
            )}
            <div className="divider" style={{ margin: 0 }} />
            <div className="kv kv-total">
              <span>{hasBespoke ? "So far" : needsQuote ? "Estimated total" : "Total"}</span>
              <span>{money(total)}</span>
            </div>
            {hasBespoke && (
              <p className="info-line t-cap muted">
                <Sparkles size={14} />
                <span>Your handmade pieces are quoted after we talk, so they aren't in this number yet.</span>
              </p>
            )}
            {step === REVIEW_STEP && (
              <p className="info-line t-cap muted">
                {pay === "now" ? <Lock size={14} /> : <Send size={14} />}
                <span>{pay === "now" ? "Mobile Money or card through Paystack" : "Pay after we confirm your design"}</span>
              </p>
            )}
            {missing && (
              <p className="t-cap" style={{ color: "var(--warning-ink)" }}>
                {missing}
              </p>
            )}
            <div className="stack" style={{ marginTop: 4 }}>
              {cta}
            </div>
          </div>
          <p className="t-cap subtle" style={{ textAlign: "center" }}>
            {hasBespoke
              ? `Handmade pieces are quoted first, then a ${RULES.depositPercent}% deposit starts the work.`
              : "Payment secures your date. Custom designs are confirmed with a quote."}
          </p>
        </aside>
      </div>

      <div className="sticky-bar lt-desk">
        <div className="sticky-bar-meta">
          {/* An order that is all bespoke has no number yet; one that is part bespoke shows what we can price so far. */}
          {step === REVIEW_STEP ? (
            <>
              <span className="subtle t-cap">{hasBespoke ? "So far" : pay === "now" ? "Pay today" : "Estimated total"}</span>
              <strong className="tabular">{total > 0 ? money(total) : "By quote"}</strong>
            </>
          ) : step === DETAILS_STEP ? (
            <>
              <strong className="tabular">{total > 0 ? money(total) : "By quote"}</strong>
              <span className="t-cap" style={missing ? { color: "var(--warning-ink)" } : undefined}>
                {missing ?? "No account needed"}
              </span>
            </>
          ) : (
            <>
              <strong className="tabular">{total > 0 ? money(total) : lines.length ? "By quote" : money(0)}</strong>
              <span className={`t-cap ${missing && step > 0 ? "" : "subtle"}`} style={missing && step > 0 ? { color: "var(--warning-ink)" } : undefined}>
                {missing && step > 0 ? missing : lines.length ? `${plural(itemCount, "item")} · ${plural(readyDays, "working day")}' notice` : "Nothing chosen yet"}
              </span>
            </>
          )}
        </div>
        {cta}
      </div>

      <PaystackSheet open={payOpen} onClose={() => setPayOpen(false)} amount={total} label={needsQuote ? "Payment for your design request" : "Payment for your order"} email={contact.email} phone={contact.phone} onPaid={placeOrder} />
      <AccountSheet open={loginOpen} onClose={() => setLoginOpen(false)} mode="login" defaultPhone={contact.phone} />
      <SuccessScreen open={Boolean(created)} title={created?.status === "confirmed" ? "Order booked" : created?.receiptNo ? "Payment received" : "Request sent"} onDone={onSuccessDone} />
    </main>
  );
}

/* ---------------- Step 4: your details ---------------- */

function YourDetails({ contact, setContact, errors, delivery, accountName, remember, setRemember, dietary, setDietary, onLogIn }: {
  contact: ContactDetails;
  setContact: (c: ContactDetails) => void;
  errors: ContactErrors;
  delivery: Delivery;
  accountName?: string;
  remember: boolean;
  setRemember: (v: boolean) => void;
  dietary: string;
  setDietary: (v: string) => void;
  onLogIn: () => void;
}) {
  const set = (key: keyof ContactDetails) => (e: { target: { value: string } }) => setContact({ ...contact, [key]: e.target.value });
  const field = (key: keyof ContactDetails, label: string, props: InputHTMLAttributes<HTMLInputElement>, hint?: string) => (
    <div className="field">
      <label htmlFor={`contact-${key}`}>{label}</label>
      <input id={`contact-${key}`} value={contact[key]} onChange={set(key)} aria-invalid={Boolean(errors[key])} aria-describedby={`contact-${key}-hint`} {...props} />
      {(errors[key] || hint) && (
        <span id={`contact-${key}-hint`} className={errors[key] ? "error" : "hint"}>
          {errors[key] ?? hint}
        </span>
      )}
    </div>
  );

  return (
    <div className="stack gap-16">
      {accountName ? (
        <p className="info-line muted">
          <UserRound size={16} />
          <span>Logged in as {accountName}. Changes here update your account.</span>
        </p>
      ) : (
        <div className="card card-pad between" style={{ gap: 12 }}>
          <span className="stack">
            <span className="t-title">No account needed</span>
            <span className="muted t-cap">Ordered before with an account? Log in to fill this in.</span>
          </span>
          <Button size="sm" onClick={onLogIn}>
            Log in
          </Button>
        </div>
      )}

      <section className="card card-pad stack gap-16">
        {field("name", "Full name", { autoComplete: "name", placeholder: "Ama Mensah" })}
        {field("phone", "WhatsApp number", { inputMode: "tel", autoComplete: "tel-national", placeholder: "024 123 4567", readOnly: Boolean(accountName) }, accountName ? "Your account number. Message the bakery to change it." : "Your price, order updates and receipts come here.")}
        {field("email", "Email", { type: "email", inputMode: "email", autoComplete: "email", placeholder: "ama@gmail.com" }, "Paystack sends your payment receipt here.")}
        {field("town", "Town or area", { autoComplete: "address-level2", placeholder: "Adenta" })}
      </section>

      {delivery === "delivery" && (
        <motion.section className="section" style={{ marginTop: 0 }} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={spring.small}>
          <h2 className="t-h3">Delivery address</h2>
          <div className="card card-pad stack gap-16">
            {field("address", "Street or landmark", { autoComplete: "street-address", placeholder: "Behind the Shell filling station, Adenta Housing Down" })}
            {field("digitalAddress", "GhanaPost digital address (optional)", { autoCapitalize: "characters", placeholder: "GD-123-4567", style: { fontFamily: "var(--mono)" } }, "Find it in the GhanaPostGPS app. Helps the rider find you.")}
          </div>
          <p className="t-cap subtle">The delivery fee depends on distance and is paid to the rider on arrival.</p>
        </motion.section>
      )}

      <section className="section" style={{ marginTop: 0 }}>
        <h2 className="t-h3">For the kitchen</h2>
        <div className="card card-pad stack gap-8">
          <div className="field">
            <label htmlFor="dietary">Allergies or dietary needs (optional)</label>
            <input id="dietary" value={dietary} maxLength={300} onChange={(e) => setDietary(e.target.value)} placeholder="No nuts, eggless, less sugar…" aria-describedby="dietary-hint" />
            <span id="dietary-hint" className="hint">
              Our kitchen uses eggs, milk, wheat and nuts. We note this on your order{accountName ? " and your account" : ""}.
            </span>
          </div>
        </div>
      </section>

      {!accountName && (
        <label className="check-row">
          <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
          <span className="stack">
            <span>Remember me on this phone</span>
            <span className="subtle t-cap">Fills this in next time. Don't tick it on a shared phone.</span>
          </span>
        </label>
      )}
    </div>
  );
}

/* ---------------- Step 1: menu ---------------- */

function ChooseItems({ lines, onToggle, onQty }: { lines: Draft[]; onToggle: (style: Style) => void; onQty: (id: string, qty: number) => void }) {
  const loading = useSkeleton(450);
  const [showPill, setShowPill] = useState(false);
  const firstSelected = useRef<HTMLDivElement | null>(null);
  const scrollTo = useScrollTo();

  useEffect(() => {
    const onScroll = () => setShowPill(window.scrollY > 260);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (loading) return <ListSkeleton />;

  const selectedIds = new Set(lines.map((l) => l.styleId));
  const firstSelectedId = STYLES.find((s) => selectedIds.has(s.id))?.id;

  return (
    <>
      <div className="chips" style={{ position: "sticky", top: 60, zIndex: 9, background: "var(--ground)", paddingBlock: 8 }}>
        {CATEGORIES.map((c) => (
          <button key={c.id} className="chip" onClick={() => scrollTo(document.getElementById(`cat-${c.id}`), { offset: -120 })}>
            {c.label}
          </button>
        ))}
      </div>

      <AnimatePresence>
        {showPill && lines.length > 0 && (
          <motion.button className="selected-pill" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={spring.small} onClick={() => scrollTo(firstSelected.current, { offset: -window.innerHeight / 3 })}>
            {lines.length} selected <ArrowUp size={14} />
          </motion.button>
        )}
      </AnimatePresence>

      {CATEGORIES.map((c) => {
        const items = STYLES.filter((s) => s.category === c.id);
        if (!items.length) return null;
        return (
          <section key={c.id} id={`cat-${c.id}`} className="section" style={{ scrollMarginTop: 120 }}>
            <h2 className="t-h3">{c.label}</h2>
            <div className="stack gap-12 flow-cards">
              {items.map((style) => {
                const line = lines.find((l) => l.styleId === style.id);
                const selected = selectedIds.has(style.id);
                const min = style.minQty ?? 1;
                return (
                  <div
                    key={style.id}
                    ref={style.id === firstSelectedId ? firstSelected : undefined}
                    role="checkbox"
                    aria-checked={selected}
                    tabIndex={0}
                    className={`select-card ${selected ? "is-selected" : ""}`}
                    onClick={() => onToggle(style)}
                    onKeyDown={(e) => {
                      if (e.target === e.currentTarget && (e.key === " " || e.key === "Enter")) {
                        e.preventDefault();
                        onToggle(style);
                      }
                    }}
                    style={{ cursor: "pointer" }}
                  >
                    <Photo tone={style.tone} src={style.photo} alt="" sizes="72px" height={72} radius="var(--r-img)" markSize={26} className="select-thumb" />
                    <div className="grow stack gap-4">
                      <p className="t-title">{style.name}</p>
                      <p className="subtle t-cap">
                        {style.unit ? `${style.unit.charAt(0).toUpperCase()}${style.unit.slice(1)} · ` : ""}
                        {style.minQty ? `min. ${style.minQty} · ` : ""}
                        {plural(style.readyDays, "working day")}' notice
                      </p>
                      <p className="muted t-body">{style.description}</p>
                      <div className="between" style={{ marginTop: 6, minHeight: 36 }}>
                        <span className="tabular" style={{ fontWeight: 500 }}>
                          {style.kind === "unit" ? money(style.fromPrice) : `from ${money(fromPriceOf(style))}`}
                        </span>
                        {line && (
                          <span className="qty" onClick={(e) => e.stopPropagation()}>
                            <button onClick={() => (line.qty > min ? onQty(style.id, line.qty - 1) : onToggle(style))} aria-label={`One fewer ${style.name}`}>
                              {line.qty > min ? <Minus size={14} /> : <Trash2 size={14} />}
                            </button>
                            <input
                              type="number"
                              inputMode="numeric"
                              min={min}
                              max={500}
                              value={line.qty}
                              onChange={(e) => onQty(style.id, Math.max(min, Math.min(500, Math.floor(Number(e.target.value) || min))))}
                              aria-label={`Quantity of ${style.name}`}
                            />
                            <button onClick={() => onQty(style.id, Math.min(500, line.qty + 1))} aria-label={`One more ${style.name}`}>
                              <Plus size={14} />
                            </button>
                          </span>
                        )}
                      </div>
                    </div>
                    <motion.span key={String(selected)} className={`check ${selected ? "is-on" : "is-add"}`} initial={{ scale: 0.6 }} animate={{ scale: 1 }} transition={spring.small} aria-hidden="true">
                      {selected ? <Check size={16} strokeWidth={2.4} /> : <Plus size={16} />}
                    </motion.span>
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}
      <p className="t-cap subtle" style={{ textAlign: "center", marginTop: 20 }}>
        Cake prices from our price list. Custom and character designs start at {money(RULES.designFee)} extra.
      </p>
    </>
  );
}

/* ---------------- Step 2: customise ---------------- */

function Customise({
  lines,
  onUpdate,
  photos,
  setPhotos,
  designed,
  custom,
  designPlan,
  setDesignPlan,
  designNotes,
  setDesignNotes,
}: {
  lines: PricedLine[];
  onUpdate: (id: string, patch: Partial<Draft>) => void;
  photos: { url: string; name: string }[];
  setPhotos: (fn: (prev: { url: string; name: string }[]) => { url: string; name: string }[]) => void;
  designed: boolean;
  custom: boolean;
  designPlan: DesignPlan | null;
  setDesignPlan: (p: DesignPlan) => void;
  designNotes: string;
  setDesignNotes: (v: string) => void;
}) {
  const loading = useSkeleton(450);
  const [photoError, setPhotoError] = useState("");
  if (loading) return <ListSkeleton />;

  const addPhotos = (files: FileList | null) => {
    if (!files) return;
    const accepted: { url: string; name: string }[] = [];
    let rejected = 0;
    Array.from(files).forEach((file) => {
      if (!file.type.startsWith("image/") || file.size > MAX_PHOTO_BYTES) rejected++;
      else accepted.push({ url: URL.createObjectURL(file), name: file.name });
    });
    setPhotoError(rejected ? `${plural(rejected, "file")} skipped. Use photos under 8 MB (JPG, PNG or HEIC).` : "");
    setPhotos((prev) => [...prev, ...accepted].slice(0, 6));
  };

  return (
    <div className="stack gap-16">
      {lines.map((line) => (line.style ? <LineOptions key={line.styleId} line={line} style={line.style} onUpdate={(patch) => onUpdate(line.styleId, patch)} /> : null))}

      {designed && (
        <section className="section" style={{ marginTop: 12 }}>
          <h2 className="t-h3">Your design</h2>
          {custom ? (
            <div className="stack gap-12" role="radiogroup" aria-label="How we get your design">
              <PlanCard selected={designPlan === "ours"} onSelect={() => setDesignPlan("ours")} icon={<Palette size={20} />} title="Design it for me" body="Tell us the theme and colours; we'll send a sketch on WhatsApp." />
              <PlanCard selected={designPlan === "photo"} onSelect={() => setDesignPlan("photo")} icon={<ImagePlus size={20} />} title="I have a picture" body="Add it below or send it on WhatsApp. We'll match it as closely as we can." />
              <PlanCard selected={designPlan === "consult"} onSelect={() => setDesignPlan("consult")} icon={<CakeSlice size={20} />} title="Come in first" body={`45 minutes in ${STUDIO.area}: a fitting for a hat or headband, a tasting for a wedding cake.`} />
            </div>
          ) : (
            <p className="muted">Classic finish in your colours. Add a note if you have something in mind.</p>
          )}
          <div className="card card-pad stack gap-8">
            <div className="field">
              <label htmlFor="design-notes">Theme, colours, names and ages</label>
              <textarea id="design-notes" value={designNotes} maxLength={400} onChange={(e) => setDesignNotes(e.target.value)} placeholder="Frozen theme, blue and silver, name: Efua, turning 6" />
              <span className="hint">{designNotes.length}/400</span>
            </div>
          </div>
          <label className="upload">
            <span className="row-icon is-gold">
              <ImagePlus size={18} />
            </span>
            <span className="grow stack">
              <span style={{ fontWeight: 500 }}>Add inspiration photos</span>
              <span className="subtle t-cap">Up to 6 · under 8 MB each</span>
            </span>
            <input type="file" accept="image/*" multiple className="sr-only" onChange={(e) => addPhotos(e.target.files)} />
          </label>
          {photoError && (
            <p className="t-cap" role="alert" style={{ color: "var(--danger)" }}>
              {photoError}
            </p>
          )}
          {photos.length > 0 && (
            <div className="thumbs">
              {photos.map((p) => (
                <div key={p.url} style={{ position: "relative" }}>
                  <img src={p.url} alt={p.name} />
                  <button
                    className="icon-btn"
                    style={{ position: "absolute", top: -8, right: -8, width: 26, height: 26 }}
                    onClick={() => {
                      URL.revokeObjectURL(p.url);
                      setPhotos((prev) => prev.filter((x) => x.url !== p.url));
                    }}
                    aria-label={`Remove ${p.name}`}
                  >
                    <Minus size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}

function LineOptions({ line, style, onUpdate }: { line: PricedLine; style: Style; onUpdate: (patch: Partial<Draft>) => void }) {
  const min = style.minQty ?? 1;
  const layerOptions = style.kind === "cake" ? layersFor(style) : [];
  const sizeOptions = style.kind === "cake" && line.layers ? sizesFor(style, line.layers) : [];
  const tiers = tierRange(style.id);
  const quoted = isQuoted(style);
  // The menu card's rule: one flavour per layer. Anything else takes a single flavour.
  const flavourCap = maxFlavours(style, line.layers);
  const toggleFlavour = (id: Flavour) => {
    const has = line.flavours.includes(id);
    if (has) onUpdate({ flavours: line.flavours.length > 1 ? line.flavours.filter((f) => f !== id) : line.flavours });
    else onUpdate({ flavours: flavourCap === 1 ? [id] : [...line.flavours, id].slice(-flavourCap) });
  };

  return (
    <section className="card card-pad stack gap-16">
      <div className="inline" style={{ gap: 12 }}>
        <Photo tone={style.tone} src={style.photo} sizes="56px" height={56} radius="var(--r-img)" markSize={20} className="order-thumb" />
        <div className="grow stack">
          <p className="t-title">{style.name}</p>
          <p className="subtle t-cap tabular">{quoted ? "Priced after we talk" : `${line.qty} × ${money(line.unitPrice)}`}</p>
        </div>
        <span className="tabular" style={{ fontWeight: 500 }}>
          {quoted ? "—" : money(line.unitPrice * line.qty)}
        </span>
      </div>

      {quoted && (
        <p className="info-line muted t-cap">
          <Sparkles size={14} />
          <span>Every piece is made for you, so the price depends on the materials and the work. Send your details and we'll quote you on WhatsApp, usually the same day.</span>
        </p>
      )}

      {hasFlavour(style) && (
        <OptionGroup label={flavourCap > 1 ? `Flavours (up to ${flavourCap}, one per layer)` : "Flavour"}>
          <div className="chips" style={{ flexWrap: "wrap", marginInline: 0, paddingInline: 0 }} role="group" aria-label={`Flavours for ${style.name}`}>
            {FLAVOURS.map((f) => {
              const on = line.flavours.includes(f.id);
              return (
                <button key={f.id} role="checkbox" aria-checked={on} className={`chip ${on ? "is-active" : ""}`} onClick={() => toggleFlavour(f.id)}>
                  {f.label}
                </button>
              );
            })}
          </div>
        </OptionGroup>
      )}

      {style.kind === "cake" && (
        <>
          <OptionGroup label="Layers">
            <div className="segmented" role="radiogroup" aria-label={`Layers for ${style.name}`}>
              {LAYER_OPTIONS.filter((o) => layerOptions.includes(o.id)).map((o) => (
                <button key={o.id} role="radio" aria-checked={line.layers === o.id} className={line.layers === o.id ? "is-active" : ""} onClick={() => onUpdate({ layers: o.id })}>
                  {o.label}
                </button>
              ))}
            </div>
          </OptionGroup>

          <OptionGroup label="Size">
            <div className="option-grid" role="radiogroup" aria-label={`Size for ${style.name}`}>
              {sizesOf(style).map((id) => {
                const size = SIZES.find((s) => s.id === id);
                const price = line.layers ? gridPrice(rangeOf(style), line.layers, id) : null;
                const offered = sizeOptions.includes(id);
                return (
                  <button key={id} role="radio" aria-checked={line.size === id} className={`option ${line.size === id ? "is-selected" : ""}`} disabled={!offered} onClick={() => onUpdate({ size: id })}>
                    <span>{size?.label}</span>
                    <small>{offered && price !== null ? `${money(price)} · ${size?.serves}` : "Not in this layer"}</small>
                  </button>
                );
              })}
            </div>
          </OptionGroup>
        </>
      )}

      {style.kind === "tiered" && tiers.max > tiers.min && (
        <OptionGroup label="Tiers">
          <div className="segmented" role="radiogroup" aria-label={`Tiers for ${style.name}`}>
            {Array.from({ length: tiers.max - tiers.min + 1 }, (_, i) => tiers.min + i).map((n) => (
              <button key={n} role="radio" aria-checked={(line.tiers ?? tiers.min) === n} className={(line.tiers ?? tiers.min) === n ? "is-active" : ""} onClick={() => onUpdate({ tiers: n })}>
                {n} tiers{n > tiers.min ? ` +${money((n - tiers.min) * style.extraFrom)}` : ""}
              </button>
            ))}
          </div>
        </OptionGroup>
      )}

      {(style.kind === "cake" || style.kind === "tiered") && (
        <OptionGroup label="Finish">
          <div className="option-grid" role="radiogroup" aria-label={`Finish for ${style.name}`}>
            {FINISH_OPTIONS.map((o) => (
              <button key={o.id} role="radio" aria-checked={line.finish === o.id} className={`option ${line.finish === o.id ? "is-selected" : ""}`} onClick={() => onUpdate({ finish: o.id })}>
                <span>{o.label}</span>
                <small>{style.kind === "cake" && FINISH_ADD[o.id] ? `+${money(FINISH_ADD[o.id])}` : o.hint}</small>
              </button>
            ))}
          </div>
        </OptionGroup>
      )}

      {style.line !== "cakes" && (
        <div className="field">
          <label htmlFor={`col-${style.id}`}>Colours to match (optional)</label>
          <input id={`col-${style.id}`} value={line.colours ?? ""} maxLength={COLOURS_MAX} onChange={(e) => onUpdate({ colours: e.target.value })} placeholder="Wine and gold, like the kaba" aria-describedby={`col-${style.id}-hint`} />
          <span id={`col-${style.id}-hint`} className="hint">
            Send a photo of the outfit on WhatsApp and we'll match it by eye.
          </span>
        </div>
      )}

      {style.kind === "cake" &&
        (style.customDesign ? (
          <p className="info-line muted t-cap">
            <Sparkles size={14} />
            <span>Custom design included (from {money(RULES.designFee)}). We confirm the final price with your design.</span>
          </p>
        ) : (
          <OptionGroup label="Design">
            <div className="option-grid" role="radiogroup" aria-label={`Design for ${style.name}`}>
              {DESIGN_OPTIONS.map((o) => (
                <button key={o.id} role="radio" aria-checked={line.design === o.id} className={`option ${line.design === o.id ? "is-selected" : ""}`} onClick={() => onUpdate({ design: o.id })}>
                  <span>{o.label}</span>
                  <small>{o.id === "custom" ? `from +${money(RULES.designFee)}` : o.hint}</small>
                </button>
              ))}
            </div>
          </OptionGroup>
        ))}

      {(style.kind === "cake" || style.kind === "tiered") && (
        <div className="field">
          <label htmlFor={`msg-${style.id}`}>Message on the cake (optional)</label>
          <input id={`msg-${style.id}`} value={line.message ?? ""} maxLength={MESSAGE_MAX} onChange={(e) => onUpdate({ message: e.target.value })} placeholder="Happy 30th, Ama!" aria-describedby={`msg-${style.id}-hint`} />
          <span id={`msg-${style.id}-hint`} className="hint">
            {(line.message ?? "").length}/{MESSAGE_MAX} · fondant inscriptions are free
          </span>
        </div>
      )}

      {(style.kind === "unit" || style.kind === "bespoke") && (
        <OptionGroup label={`How many (${style.unit ?? "piece"})`}>
          <span className="qty" style={{ alignSelf: "flex-start" }}>
            <button onClick={() => onUpdate({ qty: Math.max(min, line.qty - 1) })} disabled={line.qty <= min} aria-label={`One fewer ${style.name}`}>
              <Minus size={14} />
            </button>
            <input type="number" inputMode="numeric" min={min} max={500} value={line.qty} onChange={(e) => onUpdate({ qty: Math.max(min, Math.min(500, Math.floor(Number(e.target.value) || min))) })} aria-label={`Quantity of ${style.name}`} />
            <button onClick={() => onUpdate({ qty: Math.min(500, line.qty + 1) })} aria-label={`One more ${style.name}`}>
              <Plus size={14} />
            </button>
          </span>
          {style.minQty && <span className="t-cap subtle">Minimum {style.minQty}.</span>}
        </OptionGroup>
      )}
    </section>
  );
}

function OptionGroup({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="stack gap-8">
      <p className="t-cap muted">{label}</p>
      {children}
    </div>
  );
}

/* ---------------- Step 3: date and pickup ---------------- */

interface DateProps {
  now: Date;
  readyDays: number;
  window_: ReturnType<typeof readyWindow>;
  occasion: Occasion | null;
  setOccasion: (o: Occasion) => void;
  neededBy: string | null;
  setNeededBy: (key: string) => void;
  fit: ReturnType<typeof neededByFit> | null;
  handoverStart: string | null;
  setHandoverStart: (s: string | null) => void;
  consult: boolean;
  consultStart: string | null;
  setConsultStart: (s: string | null) => void;
  takenSlots: string[];
  delivery: Delivery;
  setDelivery: (d: Delivery) => void;
}

function DateAndHandover(p: DateProps) {
  const loading = useSkeleton(450);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [consultDay, setConsultDay] = useState<string | null>(p.consultStart?.slice(0, 10) ?? null);
  const [slotsLoading, setSlotsLoading] = useState(false);

  useEffect(() => {
    if (!p.neededBy && !consultDay) return;
    setSlotsLoading(true);
    const t = window.setTimeout(() => setSlotsLoading(false), 450);
    return () => window.clearTimeout(t);
  }, [p.neededBy, consultDay, p.delivery]);

  if (loading) return <ListSkeleton />;

  const neededDays = dateStrip(p.now, 45);
  const handoverSlots = p.neededBy ? slotsFor(parseLocal(p.neededBy), HOURS, [], p.now, 60, 60) : [];
  const consultDays = dateStrip(p.now, 21);
  const consultSlots = consultDay ? slotsFor(parseLocal(consultDay), HOURS, p.takenSlots, p.now, 45, 45) : [];
  const handoverWord = p.delivery === "delivery" ? "Delivery" : "Pickup";

  return (
    <div className="stack gap-8">
      <section className="stack gap-12">
        <h2 className="t-h3">What are we celebrating?</h2>
        <div className="chips" style={{ flexWrap: "wrap", marginInline: 0, paddingInline: 0 }}>
          {OCCASIONS.map((o) => (
            <button key={o.id} className={`chip ${p.occasion === o.id ? "is-active" : ""}`} aria-pressed={p.occasion === o.id} onClick={() => p.setOccasion(o.id)}>
              {o.label}
            </button>
          ))}
        </div>
      </section>

      <section className="section">
        <h2 className="t-h3">Pickup or delivery</h2>
        <div className="segmented" role="radiogroup" aria-label="Pickup or delivery">
          <button role="radio" aria-checked={p.delivery === "pickup"} className={p.delivery === "pickup" ? "is-active" : ""} onClick={() => p.setDelivery("pickup")}>
            Pick up in Kasoa
          </button>
          <button role="radio" aria-checked={p.delivery === "delivery"} className={p.delivery === "delivery" ? "is-active" : ""} onClick={() => p.setDelivery("delivery")}>
            Deliver it
          </button>
        </div>
        {p.delivery === "delivery" && <p className="t-cap subtle">Across Accra, and anywhere in Ghana for wedding cakes. The rider's fee is paid on arrival.</p>}
      </section>

      <section className="section">
        <div className="section-head" style={{ alignItems: "center" }}>
          <h2 className="t-h3">Which day?</h2>
          <button className="icon-btn" onClick={() => setCalendarOpen(true)} aria-label="Open calendar">
            <CalendarDays size={18} />
          </button>
        </div>
        <DateStrip
          label={`${handoverWord} day`}
          days={neededDays}
          selected={p.neededBy ?? undefined}
          onSelect={p.setNeededBy}
          stateFor={(day) => {
            const f = neededByFit(day, p.window_);
            const open = isOpenDay(day, HOURS);
            return { disabled: f === "too-soon" || !open, flag: f === "late" && open ? "Late" : undefined };
          }}
        />
        <p className="info-line muted">
          <Clock size={16} />
          <span>
            {p.fit === "late" && p.neededBy
              ? `Late order: we'll squeeze it in for ${fmtDayShort(parseLocal(p.neededBy))}. Late orders cost ${money(RULES.lateFee)} extra.`
              : p.fit === "ok" && p.neededBy
                ? `Booked for ${fmtDayShort(parseLocal(p.neededBy))}, fresh from the oven for your day.`
                : `We need ${plural(p.readyDays, "working day")}' notice. Earlier days are late orders (+${money(RULES.lateFee)}). Closed on Sundays.`}
          </span>
        </p>
      </section>

      {p.neededBy && (
        <motion.section className="section" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={spring.small}>
          <h2 className="t-h3">{p.delivery === "delivery" ? "Delivery window" : "Pickup time"}</h2>
          {slotsLoading ? (
            <div className="slot" style={{ justifyContent: "center", color: "var(--ink-50)" }} aria-label="Loading times">
              <Dots />
            </div>
          ) : handoverSlots.length === 0 ? (
            <p className="muted">We're closed that day. Pick another day.</p>
          ) : (
            <div className="slot-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }} role="radiogroup" aria-label={p.delivery === "delivery" ? "Delivery window" : "Pickup time"}>
              {handoverSlots.map((s, i) => {
                const start = parseLocal(s.start);
                const label = p.delivery === "delivery" ? `${s.time}–${fmtTime(new Date(start.getTime() + 60 * 60_000))}` : s.time;
                return (
                  <motion.button
                    key={s.start}
                    role="radio"
                    aria-checked={p.handoverStart === s.start}
                    className={`slot ${p.handoverStart === s.start ? "is-selected" : ""}`}
                    style={{ justifyContent: "center", paddingInline: 0 }}
                    disabled={!s.available}
                    onClick={() => p.setHandoverStart(s.start)}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ ...spring.small, delay: i * 0.015 }}
                  >
                    {label}
                  </motion.button>
                );
              })}
            </div>
          )}
        </motion.section>
      )}

      {p.consult && (
        <motion.section className="section" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={spring.small}>
          <h2 className="t-h3">Fitting or tasting</h2>
          <p className="muted">45 minutes at {STUDIO.area}: taste the flavours and agree the design. Pick a day before your date.</p>
          <DateStrip
            label="Fitting day"
            days={consultDays}
            selected={consultDay ?? undefined}
            onSelect={(key) => {
              setConsultDay(key);
              p.setConsultStart(null);
            }}
            stateFor={(day) => ({ disabled: !isOpenDay(day, HOURS) || (p.neededBy ? dayKey(day) >= p.neededBy : false) || slotsFor(day, HOURS, p.takenSlots, p.now, 45, 45).every((s) => !s.available) })}
          />
          {consultDay && !slotsLoading && (
            <div className="slot-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }} role="radiogroup" aria-label="Fitting time">
              {consultSlots.map((s) => (
                <button key={s.start} role="radio" aria-checked={p.consultStart === s.start} className={`slot ${p.consultStart === s.start ? "is-selected" : ""}`} style={{ justifyContent: "center", paddingInline: 0 }} disabled={!s.available} onClick={() => p.setConsultStart(s.start)}>
                  {s.time}
                </button>
              ))}
            </div>
          )}
        </motion.section>
      )}

      <Sheet open={calendarOpen} onClose={() => setCalendarOpen(false)} title="Which day?">
        <MonthCalendar
          selected={p.neededBy ?? undefined}
          min={p.window_.earliest}
          max={addDays(p.now, 365)}
          isDisabled={(day) => !isOpenDay(day, HOURS)}
          onSelect={(key) => {
            p.setNeededBy(key);
            setCalendarOpen(false);
          }}
        />
      </Sheet>
    </div>
  );
}

function PlanCard({ selected, onSelect, icon, title, body, disabled }: { selected: boolean; onSelect: () => void; icon: ReactNode; title: string; body: string; disabled?: boolean }) {
  return (
    <button role="radio" aria-checked={selected} className={`select-card ${selected ? "is-selected" : ""}`} onClick={onSelect} disabled={disabled} style={{ alignItems: "center" }}>
      <span className="row-icon" style={{ width: 44, height: 44, borderRadius: 999, background: selected ? "var(--gold)" : undefined }}>
        {icon}
      </span>
      <span className="grow stack">
        <span className="t-title">{title}</span>
        <span className="subtle t-cap">{body}</span>
      </span>
      <span className={`check ${selected ? "is-on" : "is-add"}`} aria-hidden="true">
        {selected && <Check size={16} strokeWidth={2.4} />}
      </span>
    </button>
  );
}

/* ---------------- Step 5: review ---------------- */

interface ReviewProps {
  lines: PricedLine[];
  lateFee: number;
  discount: number;
  total: number;
  neededBy: string | null;
  handoverStart: string | null;
  consultStart: string | null;
  designPlan: DesignPlan | null;
  designNotes: string;
  dietary: string;
  delivery: Delivery;
  comments: string;
  setComments: (c: string) => void;
  points: number;
  signedIn: boolean;
  usePoints: boolean;
  setUsePoints: (v: boolean) => void;
  contact: ContactDetails;
  onEditDetails: () => void;
  payChoice: PayChoice;
  setPayChoice: (c: PayChoice) => void;
  needsQuote: boolean;
  photoCount: number;
}

const PLAN_TEXT: Record<DesignPlan, string> = {
  ours: "We design it from your notes",
  photo: "Matched to your picture",
  consult: "Fitting or tasting first",
};

function Review(r: ReviewProps) {
  const loading = useSkeleton(550);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [discountOpen, setDiscountOpen] = useState(false);
  const [draft, setDraft] = useState(r.comments);

  if (loading) return <ListSkeleton />;

  const handover = r.handoverStart ? parseLocal(r.handoverStart) : null;
  const consult = r.consultStart ? parseLocal(r.consultStart) : null;

  return (
    <div className="stack gap-8">
      <section className="card card-pad stack gap-12">
        <div className="inline" style={{ gap: 12 }}>
          <AppIcon size={52} />
          <div className="stack">
            <p className="t-title">{STUDIO.name}</p>
            <span className="inline t-cap" style={{ gap: 6 }}>
              <strong style={{ fontWeight: 500 }}>{STUDIO.rating}</strong> <Stars value={STUDIO.rating} size={12} /> <span className="subtle">({STUDIO.reviewCount})</span>
            </span>
            <span className="subtle t-cap">{STUDIO.area}</span>
          </div>
        </div>
        <div className="divider" style={{ margin: 0 }} />
        <p className="info-line">
          <CalendarDays size={16} />
          <span>{r.neededBy ? `${r.delivery === "delivery" ? "Delivery" : "Pickup"} on ${fmtDayLong(parseLocal(r.neededBy))}` : ""}</span>
        </p>
        {handover && (
          <p className="info-line">
            <Clock size={16} />
            <span>{r.delivery === "delivery" ? `Between ${fmtTime(handover)} and ${fmtTime(new Date(handover.getTime() + 60 * 60_000))}` : `At ${fmtTime(handover)}`}</span>
          </p>
        )}
        <p className="info-line">
          <Truck size={16} />
          <span>{r.delivery === "delivery" ? `Delivery to ${r.contact.address}, ${r.contact.town}` : `Pick up at ${STUDIO.address}`}</span>
        </p>
        {r.designPlan && (
          <p className="info-line">
            <Palette size={16} />
            <span>
              {PLAN_TEXT[r.designPlan]}
              {consult ? ` · ${fmtDayShort(consult)}, ${fmtTime(consult)}` : ""}
            </span>
          </p>
        )}
        <div className="divider" style={{ margin: 0 }} />
        {r.lines.map((line) => (
          <div key={line.styleId} className="kv">
            <span className="stack">
              <span>
                {line.style?.name} {line.qty > 1 ? `× ${line.qty}` : ""}
              </span>
              <span className="subtle t-cap">{itemSummary(line, line.style)}</span>
              {line.message?.trim() && <span className="subtle t-cap">“{line.message.trim()}”</span>}
            </span>
            <span>{line.style && isQuoted(line.style) ? "By quote" : money(line.unitPrice * line.qty)}</span>
          </div>
        ))}
        {r.lateFee > 0 && (
          <div className="kv">
            <span>Late order</span>
            <span>{money(r.lateFee)}</span>
          </div>
        )}
        {r.discount > 0 && (
          <div className="kv">
            <span>Loyalty points</span>
            <span>-{money(r.discount)}</span>
          </div>
        )}
        <div className="divider" style={{ margin: 0 }} />
        <div className="kv kv-total">
          <span>{r.needsQuote ? "Estimated total" : "Total"}</span>
          <span>{money(r.total)}</span>
        </div>
        {r.signedIn && (
          <>
            <div className="divider" style={{ margin: 0 }} />
            <div className="between">
              <span>Discounts and benefits</span>
              <Button size="sm" onClick={() => setDiscountOpen(true)}>
                {r.usePoints ? "Change" : "Add"}
              </Button>
            </div>
          </>
        )}
      </section>

      <section className="section">
        <h2 className="t-h3">How do you want to pay?</h2>
        <div className="stack gap-12" role="radiogroup" aria-label="When to pay">
          <PlanCard
            selected={r.payChoice === "now"}
            onSelect={() => r.setPayChoice("now")}
            icon={<Wallet size={20} />}
            title={`Pay ${money(r.total)} now`}
            body={r.needsQuote ? "Mobile Money or card through Paystack. If your final design costs more or less, we settle the difference." : "Mobile Money or card through Paystack. Full payment books your date straight away."}
          />
          <PlanCard
            selected={r.payChoice === "later"}
            onSelect={() => r.setPayChoice("later")}
            icon={<Send size={20} />}
            title={r.needsQuote ? "Send my design request first" : "Send request, pay later"}
            body={r.needsQuote ? "Free to send. Your price and a payment link come on WhatsApp." : "Your date isn't held until it's paid, so pay soon."}
          />
        </div>
      </section>

      {(r.designNotes.trim() || r.photoCount > 0 || r.dietary.trim()) && (
        <section className="section">
          <h2 className="t-h3">For the kitchen</h2>
          <div className="card card-pad stack gap-8">
            {r.designNotes.trim() && (
              <p className="info-line muted">
                <Palette size={16} />
                <span style={{ whiteSpace: "pre-wrap" }}>{r.designNotes.trim()}</span>
              </p>
            )}
            {r.photoCount > 0 && (
              <p className="info-line muted">
                <ImagePlus size={16} />
                <span>{plural(r.photoCount, "inspiration photo")} attached. Send them on WhatsApp too after ordering.</span>
              </p>
            )}
            {r.dietary.trim() && (
              <p className="info-line muted">
                <CakeSlice size={16} />
                <span>{r.dietary.trim()}</span>
              </p>
            )}
          </div>
        </section>
      )}

      <section className="section">
        <h2 className="t-h3">Good to know</h2>
        <div className="card card-pad stack gap-4">
          <p className="t-title">Payment</p>
          <p className="muted">{POLICIES.payment}</p>
        </div>
        <div className="card card-pad stack gap-4">
          <p className="t-title">Cancellation</p>
          <p className="muted">{POLICIES.cancellation}</p>
        </div>
        <div className="card card-pad stack gap-4">
          <p className="t-title">Notice and allergies</p>
          <p className="muted">{POLICIES.important}</p>
        </div>
      </section>

      <section className="section">
        <h2 className="t-h3">Anything else?</h2>
        <div className="card card-pad between">
          <span className={r.comments ? "" : "muted"} style={{ whiteSpace: "pre-wrap" }}>
            {r.comments || "Candles, a knife, a gift note?"}
          </span>
          <Button
            size="sm"
            onClick={() => {
              setDraft(r.comments);
              setCommentsOpen(true);
            }}
          >
            {r.comments ? "Edit" : "Add"}
          </Button>
        </div>
      </section>

      <section className="section">
        <div className="section-head">
          <h2 className="t-h3">Your details</h2>
          <Button size="sm" onClick={r.onEditDetails}>
            Edit
          </Button>
        </div>
        <div className="card card-pad stack gap-8">
          <p className="t-title">{r.contact.name}</p>
          <p className="info-line muted">
            <Phone size={16} />
            <span>WhatsApp {r.contact.phone}</span>
          </p>
          <p className="info-line muted">
            <Mail size={16} />
            <span>{r.contact.email}</span>
          </p>
          <p className="info-line muted">
            <MapPin size={16} />
            <span>{r.delivery === "delivery" ? [r.contact.address, r.contact.town, r.contact.digitalAddress].filter(Boolean).join(" · ") : r.contact.town}</span>
          </p>
        </div>
        <p className="t-cap subtle">
          {r.needsQuote ? `Prices are estimates until ${STUDIO.name} sends your quote.` : "Prices come straight off the Classic Cake Menu."}
          {r.payChoice === "later" ? " You won't pay anything until then." : ""}
        </p>
      </section>

      <Sheet open={commentsOpen} onClose={() => setCommentsOpen(false)} title="Anything else?">
        <div className="stack gap-16">
          <div className="field">
            <label htmlFor="comments">Your note to the bakery</label>
            <textarea id="comments" value={draft} maxLength={600} onChange={(e) => setDraft(e.target.value)} placeholder="Number candles, a cake knife, a note for the gift card…" />
            <span className="hint">{draft.length}/600</span>
          </div>
          <Button
            variant="dark"
            block
            onClick={() => {
              r.setComments(draft.trim());
              setCommentsOpen(false);
            }}
          >
            Save note
          </Button>
        </div>
      </Sheet>

      <Sheet open={discountOpen} onClose={() => setDiscountOpen(false)} title="Discounts and benefits">
        <div className="stack gap-16">
          <button className={`select-card ${r.usePoints ? "is-selected" : ""}`} onClick={() => r.setUsePoints(!r.usePoints)} role="switch" aria-checked={r.usePoints} style={{ alignItems: "center" }}>
            <span className="row-icon is-gold">
              <Sparkles size={18} />
            </span>
            <span className="grow stack">
              <span className="t-title">Use {r.points} loyalty points</span>
              <span className="subtle t-cap">Up to {money(Math.floor(r.points / 10))} off, max 10% of the order</span>
            </span>
            <span className={`check ${r.usePoints ? "is-on" : "is-add"}`} aria-hidden="true">
              {r.usePoints && <Check size={16} strokeWidth={2.4} />}
            </span>
          </button>
          <Button variant="dark" block onClick={() => setDiscountOpen(false)}>
            Done
          </Button>
        </div>
      </Sheet>
    </div>
  );
}

function ListSkeleton() {
  return (
    <div className="stack gap-12" aria-busy="true" aria-label="Loading">
      <div className="inline" style={{ gap: 8 }}>
        {[80, 70, 90].map((w) => (
          <Skeleton key={w} w={w} h={36} r={500} />
        ))}
      </div>
      <Skeleton w="30%" h={20} style={{ marginTop: 12 }} />
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="card card-pad stack gap-8">
          <Skeleton w="55%" h={16} />
          <Skeleton w="30%" h={12} />
          <div className="between">
            <Skeleton w="25%" h={14} />
            <Skeleton w={28} h={28} r={999} />
          </div>
        </div>
      ))}
    </div>
  );
}
