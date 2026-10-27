/**
 * The studio's mark: the lady in the wide-brim hat with the wine flower, cut from the official
 * Ruffles by H lockup. It is artwork, not a drawing of ours, so it ships as an image rather than
 * a path — `scripts/build_brand.py` cuts it, and `brand/logos/` holds the originals.
 *
 * `tone="light"` swaps in the version with the black reversed to cream, for the dark sections
 * where the normal mark would disappear into the background.
 */

const MARK_SRC = {
  dark: { src: "/brand/mark.png", srcSet: "/brand/mark.png 1x, /brand/mark@2x.png 2x" },
  light: { src: "/brand/mark-light.png", srcSet: "/brand/mark-light.png 1x, /brand/mark-light@2x.png 2x" },
};

/** The full lockups, for the places with room to show the whole logo. */
export const LOGOS = {
  ruffles: { src: "/brand/ruffles-logo.png", width: 458, height: 352, alt: "Ruffles by H — look great, feel fabulous" },
  baked: { src: "/brand/baked-logo.png", width: 558, height: 313, alt: "Baked by H — delicious creamy goodness" },
} as const;

export function LogoMark({
  size = 32,
  className,
  title,
  tone = "dark",
}: {
  size?: number;
  className?: string;
  title?: string;
  /** "light" on dark grounds, where the hat's black would vanish. */
  tone?: "dark" | "light";
}) {
  const pick = MARK_SRC[tone];
  return (
    <img
      src={pick.src}
      srcSet={pick.srcSet}
      width={size}
      height={size}
      className={className}
      alt={title ?? ""}
      aria-hidden={title ? undefined : true}
      draggable={false}
      style={{ display: "block", objectFit: "contain" }}
    />
  );
}

export function AppIcon({ size = 40, tone = "dark" }: { size?: number; tone?: "dark" | "light" }) {
  return (
    <span className="app-icon" style={{ width: size, height: size, borderRadius: size * 0.26 }}>
      <LogoMark size={Math.round(size * 0.82)} tone={tone} />
    </span>
  );
}

/** One of the two halves, shown whole. Used where a section belongs to the kitchen or the workroom. */
export function BrandLogo({ which, height = 56, className }: { which: keyof typeof LOGOS; height?: number; className?: string }) {
  const logo = LOGOS[which];
  return (
    <img
      src={logo.src}
      alt={logo.alt}
      width={Math.round((logo.width / logo.height) * height)}
      height={height}
      className={className}
      draggable={false}
      style={{ display: "block", height, width: "auto", objectFit: "contain" }}
    />
  );
}
