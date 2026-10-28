import type { Announcement } from "../data/business";

/** The dismissal is remembered per notice, so a new notice always gets its turn. */
export const announceKey = (id: string) => `rbh-notice-${id}`;

/**
 * Whether a notice should be in front of the reader right now.
 *
 * The dates are the owner's working dates, not timestamps: a notice that runs "until the 18th"
 * is up for the whole of the 18th, which is what anyone writing that date means.
 */
export function showAnnouncement(notice: Announcement | undefined, now: Date): boolean {
  if (!notice?.on || !notice.title.trim()) return false;
  const today = toDay(now);
  if (notice.from && today < notice.from) return false;
  if (notice.until && today > notice.until) return false;
  return true;
}

/** The notice's own day, in the same yyyy-mm-dd shape the owner types. */
function toDay(now: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/** A notice with no button is just a message; one button needs both halves to work. */
export const announceCta = (notice: Announcement): { label: string; href: string } | null =>
  notice.ctaLabel?.trim() && notice.ctaHref?.trim() ? { label: notice.ctaLabel.trim(), href: notice.ctaHref.trim() } : null;
