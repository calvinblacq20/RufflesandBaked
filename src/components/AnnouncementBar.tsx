import { X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAppData } from "../data/store";
import { announceCta, announceKey, showAnnouncement } from "../lib/announce";
import { isCalm } from "../motion";

/**
 * The owner's notice, across the foot of the client app: pre-orders opening, a festive cut-off,
 * the kitchen closed for a week. It is written in Settings, runs between the dates set there, and
 * closes for good once the reader dismisses it — until the owner writes a different one.
 *
 * Deliberately not the old "Order now" bar. That button repeated what the page already offered on
 * every screen; this is the one place the studio can say something the reader cannot get to
 * otherwise, and it takes the same room.
 */
export function AnnouncementBar() {
  const { settings } = useAppData();
  const notice = settings.announcement;
  const live = showAnnouncement(notice, new Date());
  const [dismissed, setDismissed] = useState(true);

  // Read the dismissal after mount: localStorage is unavailable in a private window and would
  // otherwise throw on first paint.
  useEffect(() => {
    if (!live) return;
    try {
      setDismissed(localStorage.getItem(announceKey(notice.id)) === "1");
    } catch {
      setDismissed(false);
    }
  }, [live, notice.id]);

  const close = () => {
    setDismissed(true);
    try {
      localStorage.setItem(announceKey(notice.id), "1");
    } catch {
      // A reader with storage blocked sees it again next visit, which is the safe way round.
    }
  };

  const cta = live ? announceCta(notice) : null;

  return (
    <AnimatePresence>
      {live && !dismissed && (
        <motion.aside
          className="notice"
          role="region"
          aria-label="Studio notice"
          initial={isCalm() ? { opacity: 0 } : { y: "100%" }}
          animate={isCalm() ? { opacity: 1 } : { y: 0 }}
          exit={isCalm() ? { opacity: 0 } : { y: "100%" }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="notice-text">
            <strong>{notice.title}</strong>
            {notice.note && <span className="notice-note">{notice.note}</span>}
          </div>
          {cta && (
            <Link className="btn btn-sm notice-cta" to={cta.href}>
              {cta.label}
            </Link>
          )}
          <button className="icon-btn is-plain notice-close" onClick={close} aria-label="Close this notice">
            <X size={18} strokeWidth={1.8} />
          </button>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
