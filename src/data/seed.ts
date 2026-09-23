import { addDays, dayKey, localIso, startOfDay } from "../lib/format";
import { orderNumber, receiptNumber } from "../lib/receipts";
import { defaultSettings, type StudioSettings } from "./business";
import { defaultPriceGrid, defaultStyles } from "./catalog";
import { createStudioBook } from "./studio-seed";
import type { Appointment, Celebration, ContactDetails, Customer, ID, Order, OrderStatus, Payment, PriceGrid, Review, Style } from "./types";

export interface Counters {
  order: number;
  receipt: number;
}

/** What this phone remembers without an account. */
export interface DeviceState {
  /** Checkout details, kept only when the customer ticks "Remember me on this phone". */
  contact: ContactDetails | null;
  /** Orders placed or found on this phone. */
  orderIds: ID[];
  savedStyleIds: ID[];
}

export interface AppData {
  version: 1;
  seededAt: string;
  /** Every customer record the studio holds, guests included. */
  customers: Customer[];
  /** The account signed in on this phone. Accounts are optional, so this starts empty. */
  session: { customerId: ID | null };
  device: DeviceState;
  orders: Order[];
  /** Dates clients asked the studio to remember. */
  celebrations: Celebration[];
  appointments: Appointment[];
  reviews: Review[];
  /** The menu the owner edits in Menu & prices. */
  styles: Style[];
  /** The Classic Cake Menu price list, edited in Menu & prices. */
  priceGrid: PriceGrid;
  /** Studio details, hours, policies and fees, edited in Settings. */
  settings: StudioSettings;
  counters: Counters;
}

/** The sample account. Log in with its WhatsApp number to see order history. */
export const DEMO_ACCOUNT_PHONE = "024 555 0142";
const CUSTOMER_ID = "c-demo";

/**
 * Sample data for the demo. Dates are relative to the moment the demo is first
 * opened so the app always looks current.
 */
export function createSeed(now: Date): AppData {
  const today = startOfDay(now);
  const day = (offset: number) => addDays(today, offset);
  const at = (offset: number, hour = 10, minute = 0) => {
    const d = day(offset);
    d.setHours(hour, minute);
    return d;
  };
  const iso = (offset: number, hour = 10) => at(offset, hour).toISOString();
  const history = (steps: [OrderStatus, number][]) => steps.map(([status, offset]) => ({ status, at: iso(offset) }));
  const pay = (seq: number, offset: number, amount: number, kind: Payment["kind"], reference: string): Payment => ({
    id: `p-${seq}`,
    amount,
    method: "momo",
    reference,
    at: iso(offset, 14),
    receiptNo: receiptNumber(day(offset).getFullYear(), seq),
    kind,
    receivedBy: "Ruffles and Baked by H",
    payer: "MTN MoMo · 024 555 0142",
  });
  const monthDay = (offset: number) => {
    const d = day(offset);
    return `${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  };

  const customer: Customer = {
    id: CUSTOMER_ID,
    name: "Abena Owusu",
    phone: "024 555 0142",
    email: "abena.owusu@gmail.com",
    town: "Kasoa",
    address: "Ofaakor, off the Kasoa–Winneba road, near the Melcom",
    digitalAddress: "CE-231-8840",
    memberSince: iso(-420),
    hasAccount: true,
    points: 240,
    source: "instagram",
    dietary: "No nuts for Efua, please.",
    headSize: "56 cm",
    notes: "Efua asks for Minnie every year. Abena's own pieces go on the left side; she wears wine and gold to church. Picks up after the school run, around 15:00.",
  };

  const celebrations: Celebration[] = [
    { id: "d-efua", customerId: CUSTOMER_ID, label: "Efua's birthday", date: monthDay(5), remind: true, remindedAt: iso(-9, 9) },
    { id: "d-anniv", customerId: CUSTOMER_ID, label: "Our wedding anniversary", date: monthDay(41), remind: true },
    { id: "d-harvest", customerId: CUSTOMER_ID, label: "Church harvest Sunday", date: monthDay(72), remind: true },
    { id: "d-kojo", customerId: CUSTOMER_ID, label: "Kojo's birthday", date: monthDay(128), remind: false },
  ];

  const appointments: Appointment[] = [
    { id: "a-efua", customerId: CUSTOMER_ID, orderId: "o-1041", purpose: "pickup", start: localIso(at(5, 15, 0)), minutes: 30, status: "confirmed" },
    { id: "a-fitting", customerId: CUSTOMER_ID, orderId: "o-1044", purpose: "fitting", start: localIso(at(2, 11, 0)), minutes: 45, status: "confirmed" },
    { id: "a-jars", customerId: CUSTOMER_ID, orderId: "o-1036", purpose: "pickup", start: localIso(at(0, 16, 30)), minutes: 30, status: "confirmed" },
  ];

  const orders: Order[] = [
    {
      id: "o-1041",
      number: "RBH-1041",
      customerId: CUSTOMER_ID,
      createdAt: iso(-8),
      occasion: "kids",
      neededBy: dayKey(day(5)),
      readyBy: dayKey(day(5)),
      items: [
        {
          id: "i-1",
          styleId: "kids-cake",
          qty: 1,
          flavours: ["strawberry", "creamy-vanilla", "chocolate"],
          size: "6",
          layers: 3,
          finish: "cream",
          design: "custom",
          message: "Happy 6th Birthday Efua",
          colours: "Minnie red, black and white",
          unitPrice: 750,
        },
      ],
      designPlan: "photo",
      designNotes: "Minnie Mouse: red bow topper, polka dots, her name on the board. No nuts.",
      appointmentId: "a-efua",
      delivery: "pickup",
      status: "confirmed",
      history: history([["request", -8], ["quoted", -8], ["confirmed", -7]]),
      shortNotice: false,
      payChoice: "later",
      total: 750,
      payments: [pay(41, -7, 750, "full", "MTN 58830211")],
    },
    {
      id: "o-1044",
      number: "RBH-1044",
      customerId: CUSTOMER_ID,
      createdAt: iso(-11),
      occasion: "church",
      neededBy: dayKey(day(9)),
      readyBy: dayKey(day(8)),
      items: [{ id: "i-7", styleId: "headband", qty: 1, flavours: [], finish: "cream", design: "custom", colours: "Wine and gold, to match the kaba", unitPrice: 380 }],
      designPlan: "consult",
      designNotes: "Crystal and pearl on a wine wire base. Head size 56 cm. Sits on the left.",
      appointmentId: "a-fitting",
      delivery: "pickup",
      status: "making",
      history: history([["request", -11], ["quoted", -10], ["confirmed", -10], ["making", -2]]),
      shortNotice: false,
      payChoice: "later",
      total: 380,
      payments: [pay(44, -10, 190, "part", "MTN 59220118")],
    },
    {
      id: "o-1036",
      number: "RBH-1036",
      customerId: CUSTOMER_ID,
      createdAt: iso(-4),
      occasion: "everyday",
      neededBy: dayKey(day(0)),
      readyBy: dayKey(day(0)),
      items: [{ id: "i-2", styleId: "cake-jars", qty: 6, flavours: ["red-velvet"], finish: "cream", design: "classic", unitPrice: 35 }],
      designPlan: "ours",
      appointmentId: "a-jars",
      delivery: "pickup",
      status: "ready",
      history: history([["request", -4], ["quoted", -4], ["confirmed", -4], ["making", 0], ["ready", 0]]),
      shortNotice: false,
      payChoice: "now",
      total: 210,
      payments: [pay(36, -4, 210, "full", "PSK-58112093")],
    },
    {
      id: "o-1022",
      number: "RBH-1022",
      customerId: CUSTOMER_ID,
      createdAt: iso(-46),
      occasion: "anniversary",
      neededBy: dayKey(day(-40)),
      readyBy: dayKey(day(-40)),
      items: [
        {
          id: "i-3",
          styleId: "classic-cake",
          qty: 1,
          flavours: ["red-velvet", "creamy-vanilla"],
          size: "8",
          layers: 2,
          finish: "cream",
          design: "classic",
          message: "Happy 10th Anniversary",
          unitPrice: 620,
        },
      ],
      designPlan: "ours",
      delivery: "delivery",
      deliveryTown: "Kasoa",
      status: "collected",
      history: history([["request", -46], ["quoted", -46], ["confirmed", -45], ["making", -41], ["finishing", -41], ["ready", -40], ["collected", -40]]),
      shortNotice: false,
      payChoice: "now",
      total: 620,
      payments: [pay(22, -45, 620, "full", "MTN 51002377")],
    },
    {
      id: "o-1009",
      number: "RBH-1009",
      customerId: CUSTOMER_ID,
      createdAt: iso(-104),
      occasion: "christening",
      neededBy: dayKey(day(-101)),
      readyBy: dayKey(day(-101)),
      items: [
        {
          id: "i-4",
          styleId: "classic-cake",
          qty: 1,
          flavours: ["creamy-vanilla"],
          size: "8",
          layers: 1,
          finish: "cream",
          design: "custom",
          message: "Welcome baby Kojo",
          colours: "Baby blue and white",
          unitPrice: 470,
        },
        { id: "i-5", styleId: "pastry-box", qty: 3, flavours: ["creamy-vanilla"], finish: "cream", design: "classic", unitPrice: 180 },
      ],
      designPlan: "ours",
      designNotes: "Baby blue with booties.",
      delivery: "pickup",
      status: "collected",
      history: history([["request", -104], ["quoted", -104], ["confirmed", -103], ["making", -102], ["finishing", -102], ["ready", -101], ["collected", -101]]),
      shortNotice: true,
      payChoice: "later",
      total: 1060,
      payments: [pay(9, -103, 600, "part", "MTN 48871265"), pay(10, -101, 460, "final", "MTN 48902211")],
    },
    {
      id: "o-0998",
      number: "RBH-0998",
      customerId: CUSTOMER_ID,
      createdAt: iso(-135),
      occasion: "birthday",
      neededBy: dayKey(day(-120)),
      readyBy: dayKey(day(-120)),
      items: [{ id: "i-6", styleId: "wedding-cake", qty: 1, flavours: ["chocolate", "creamy-vanilla"], tiers: 2, finish: "fondant", design: "custom", unitPrice: 1800 }],
      designPlan: "photo",
      delivery: "pickup",
      status: "cancelled",
      history: history([["request", -135], ["cancelled", -133]]),
      shortNotice: false,
      payChoice: "later",
      total: 1800,
      payments: [],
    },
  ];

  const reviews: Review[] = [
    { id: "r1", name: "Akosua M.", rating: 5, text: "The Minnie cake was the talk of the party, and it was still moist the next day. She sent me the sketch before she started.", at: iso(-3), styleId: "kids-cake", status: "published" },
    { id: "r2", name: "Nana Yaa B.", rating: 5, text: "My hat for my son's wedding. She matched it to the lace by eye and it sat perfectly from the church to the reception.", at: iso(-9), styleId: "hat", status: "published", reply: "Thank you Nana Yaa. You wore it beautifully." },
    { id: "r3", name: "Kwesi A.", rating: 5, text: "Ordered the bridal set for my sister: bouquet, tiara and the boutonnieres. Everything arrived boxed and labelled two days early.", at: iso(-21), styleId: "bridal-set", status: "published" },
    { id: "r4", name: "Dela K.", rating: 4, text: "Lovely red velvet, and the price was exactly what the menu said. Pickup took a few minutes because she was finishing another order.", at: iso(-34), styleId: "classic-cake", status: "published" },
  ];

  const book = createStudioBook(now);

  // Number every order and receipt in the order they happened, across the sample account and the studio's book.
  const allOrders = [...orders, ...book.orders].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const firstOrder = 1001;
  const numbered = allOrders.map((o, i) => ({ ...o, number: orderNumber(firstOrder + i) }));
  const payments = numbered.flatMap((o) => o.payments).sort((a, b) => a.at.localeCompare(b.at));
  const receiptIndex = new Map(payments.map((p, i) => [p, i + 1]));
  const withReceipts = numbered.map((o) => ({
    ...o,
    payments: o.payments.map((p) => {
      const seq = receiptIndex.get(p) ?? 0;
      return { ...p, id: `p-${seq}`, receiptNo: receiptNumber(new Date(p.at).getFullYear(), seq) };
    }),
  }));

  return {
    version: 1,
    seededAt: now.toISOString(),
    styles: defaultStyles(),
    priceGrid: defaultPriceGrid(),
    settings: defaultSettings(),
    customers: [customer, ...book.customers],
    session: { customerId: null },
    device: { contact: null, orderIds: [], savedStyleIds: [] },
    orders: withReceipts.reverse(),
    celebrations: [...celebrations, ...book.celebrations],
    appointments: [...appointments, ...book.appointments],
    reviews: [...reviews, ...book.reviews].sort((a, b) => b.at.localeCompare(a.at)),
    counters: { order: firstOrder + allOrders.length, receipt: payments.length },
  };
}
