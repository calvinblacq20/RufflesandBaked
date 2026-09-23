import { Navigation } from "lucide-react";
import { useState } from "react";
import { STUDIO } from "../data/business";
import { mapsLinks } from "../lib/contact";
import { AppIcon } from "./Brand";
import { Button } from "./Button";
import { Sheet } from "./Sheet";

/** Stylised map (no third-party tiles, so it stays light on slow connections). */
export function MapCard() {
  const [open, setOpen] = useState(false);
  const links = mapsLinks(STUDIO.mapsQuery);
  return (
    <div className="card" style={{ overflow: "hidden" }}>
      <div className="map" aria-hidden="true">
        <svg viewBox="0 0 400 168" preserveAspectRatio="xMidYMid slice">
          <rect width="400" height="168" fill="#efe7e2" />
          <path d="M-10 120 C 80 100, 140 140, 230 110 S 360 70, 420 90" stroke="#fff" strokeWidth="14" fill="none" />
          <path d="M150 -10 C 170 60, 160 110, 190 180" stroke="#fff" strokeWidth="9" fill="none" />
          <path d="M-10 40 L 420 58" stroke="#fff" strokeWidth="6" fill="none" />
          <path d="M290 -10 L 270 180" stroke="#fff" strokeWidth="5" fill="none" />
          <rect x="30" y="62" width="70" height="34" rx="6" fill="#e7ddd7" />
          <rect x="220" y="10" width="44" height="30" rx="6" fill="#e7ddd7" />
          <rect x="305" y="108" width="80" height="44" rx="6" fill="#d7eecf" />
          <text x="18" y="114" fontSize="9" fill="#9a8a85" fontFamily="Inter, sans-serif">Adenta–Dodowa Road</text>
          <text x="296" y="52" fontSize="9" fill="#9a8a85" fontFamily="Inter, sans-serif">Adenta</text>
        </svg>
        <div className="map-pin">
          <AppIcon size={40} />
          <span className="map-pin-stem" />
        </div>
      </div>
      <div className="card-pad stack gap-8">
        <p className="t-title">{STUDIO.area}</p>
        <p className="muted">{STUDIO.directions}</p>
        <div>
          <Button size="sm" icon={<Navigation size={16} />} onClick={() => setOpen(true)}>
            Get directions
          </Button>
        </div>
      </div>
      <Sheet open={open} onClose={() => setOpen(false)} title="Get directions">
        <div className="stack gap-12">
          <a className="btn btn-outline btn-block" href={links.google} target="_blank" rel="noreferrer" onClick={() => setOpen(false)}>
            Open in Google Maps
          </a>
          <a className="btn btn-outline btn-block" href={links.apple} target="_blank" rel="noreferrer" onClick={() => setOpen(false)}>
            Open in Apple Maps
          </a>
        </div>
      </Sheet>
    </div>
  );
}
