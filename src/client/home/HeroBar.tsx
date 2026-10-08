import { Link } from "react-router-dom";
import { AppIcon } from "../../components/Brand";
import { STUDIO } from "../../data/business";

/** Sections of the home page the bar jumps to; "Shop" opens the full catalogue instead. */
const SECTION_LINKS = [
  { label: "Menu", section: "styles" },
  { label: "Gallery", section: "lookbook" },
  { label: "Reviews", section: "reviews" },
  { label: "Find us", section: "info" },
] as const;

/**
 * The bar across the top of the home hero, in the style of a store header: the studio's name on the
 * left and page links in the middle (wider screens). The WhatsApp, call, share and save buttons
 * float at the bottom right instead (ContactDock). On tablet and desktop this bar is the page's
 * header until the hero scrolls away and the floating nav takes over.
 */
export function HeroBar({ onSection }: { onSection: (id: string) => void }) {
  return (
    <header className="hero-bar">
      <Link to="/" className="hero-bar__brand" aria-label={`${STUDIO.name} home`}>
        <AppIcon size={30} />
        <span className="hero-bar__name">{STUDIO.name}</span>
      </Link>

      <nav className="hero-bar__links" aria-label="On this page">
        <Link to="/explore">Shop</Link>
        {SECTION_LINKS.map((link) => (
          <button key={link.section} type="button" onClick={() => onSection(link.section)}>
            {link.label}
          </button>
        ))}
      </nav>
    </header>
  );
}
