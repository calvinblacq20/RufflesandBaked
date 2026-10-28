import { describe, expect, it } from "vitest";
import type { Announcement } from "../data/business";
import { announceCta, showAnnouncement } from "./announce";

const notice = (over: Partial<Announcement> = {}): Announcement => ({
  on: true,
  id: "n1",
  title: "Christmas orders close on 18 December",
  ...over,
});

const on = (day: string) => new Date(`${day}T09:00:00`);

describe("showAnnouncement", () => {
  it("shows a notice that is on and has no dates", () => {
    expect(showAnnouncement(notice(), on("2026-03-04"))).toBe(true);
  });

  it("stays down when the owner switches it off", () => {
    expect(showAnnouncement(notice({ on: false }), on("2026-03-04"))).toBe(false);
  });

  it("stays down when there is nothing to say", () => {
    expect(showAnnouncement(notice({ title: "   " }), on("2026-03-04"))).toBe(false);
    expect(showAnnouncement(undefined, on("2026-03-04"))).toBe(false);
  });

  it("waits for the start date and includes it", () => {
    const n = notice({ from: "2026-10-17" });
    expect(showAnnouncement(n, on("2026-10-16"))).toBe(false);
    expect(showAnnouncement(n, on("2026-10-17"))).toBe(true);
  });

  it("runs through the whole of the last day, then stops", () => {
    const n = notice({ until: "2026-10-31" });
    expect(showAnnouncement(n, new Date("2026-10-31T23:30:00"))).toBe(true);
    expect(showAnnouncement(n, on("2026-11-01"))).toBe(false);
  });

  it("needs both ends of a window", () => {
    const n = notice({ from: "2026-10-17", until: "2026-10-31" });
    expect(showAnnouncement(n, on("2026-10-20"))).toBe(true);
    expect(showAnnouncement(n, on("2026-10-02"))).toBe(false);
    expect(showAnnouncement(n, on("2026-12-02"))).toBe(false);
  });
});

describe("announceCta", () => {
  it("is nothing without both halves", () => {
    expect(announceCta(notice())).toBeNull();
    expect(announceCta(notice({ ctaLabel: "View" }))).toBeNull();
    expect(announceCta(notice({ ctaHref: "/explore" }))).toBeNull();
    expect(announceCta(notice({ ctaLabel: "  ", ctaHref: "/explore" }))).toBeNull();
  });

  it("trims what the owner typed", () => {
    expect(announceCta(notice({ ctaLabel: " View pre-orders ", ctaHref: " /explore " }))).toEqual({
      label: "View pre-orders",
      href: "/explore",
    });
  });
});
