import { ChevronUp, Heart, Phone, Share2 } from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { WhatsAppIcon } from "../../components/SocialIcons";
import { STUDIO } from "../../data/business";
import { telLink } from "../../lib/contact";
import { spring } from "../../motion";

/**
 * Round buttons that float at the bottom right of the home page while it scrolls. WhatsApp (in its
 * green, the one most people reach for) is always one tap away. On phones and tablets call, share and
 * save fold behind a small toggle so the stack doesn't cover the price list's "Book" buttons; on
 * desktop, where the dock sits outside the content column, all four show.
 */
export function ContactDock({ saved, onSave, onShare }: { saved: boolean; onSave: () => void; onShare: () => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLElement>(null);

  // An open fold closes on Escape or a tap anywhere else.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    const onPointer = (e: PointerEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, [open]);

  return (
    <aside ref={ref} className={`contact-dock ${open ? "is-open" : ""}`} aria-label="Contact and share">
      <div className="contact-dock__more" id="contact-dock-more">
        <button className="contact-dock__btn" type="button" onClick={onSave} aria-pressed={saved} aria-label="Save the studio" title={saved ? "Saved" : "Save"}>
          <motion.span className={`contact-dock__icon ${saved ? "is-on" : ""}`} whileTap={{ scale: 0.85 }} transition={spring.press}>
            <Heart size={18} strokeWidth={1.8} fill={saved ? "currentColor" : "none"} />
          </motion.span>
        </button>
        <button
          className="contact-dock__btn"
          type="button"
          onClick={() => {
            setOpen(false);
            onShare();
          }}
          aria-label="Share the studio"
          title="Share"
        >
          <Share2 size={18} strokeWidth={1.8} />
        </button>
        <a className="contact-dock__btn" href={telLink(STUDIO.phone)} onClick={() => setOpen(false)} aria-label={`Call ${STUDIO.phone}`} title={`Call ${STUDIO.phone}`}>
          <Phone size={18} strokeWidth={1.8} />
        </a>
      </div>

      <button className="contact-dock__toggle" type="button" onClick={() => setOpen(!open)} aria-expanded={open} aria-controls="contact-dock-more" aria-label={open ? "Hide call, share and save" : "Call, share or save"}>
        <ChevronUp size={16} strokeWidth={2} />
      </button>

      <a className="contact-dock__btn is-whatsapp" href={STUDIO.whatsappBusiness} target="_blank" rel="noreferrer" aria-label="Chat on WhatsApp" title="Chat on WhatsApp">
        <WhatsAppIcon size={24} />
      </a>
    </aside>
  );
}
