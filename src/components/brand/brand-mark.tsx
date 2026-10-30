import type { CSSProperties, SVGProps } from "react";

import { cn } from "@/lib/utils";

import styles from "./brand-mark.module.css";
import { BRAND_MARK } from "./mark";

/** Only one drawing mark per page (the header's), so a fixed id is safe. */
const MASK_ID = "brand-mark-pen";

/**
 * Runs while the HTML is parsed, before the mark is painted: on the first
 * page load of a session, unless the visitor prefers reduced motion, it sets
 * `data-brand-draw` on <html> so the CSS draws the "d" on, and clears it when
 * the pen's animation ends. Without JavaScript nothing happens and the mark is
 * simply there. Client navigations keep the header mounted, so it never
 * replays.
 */
const DRAW_SCRIPT = `(function(){try{var h=document.documentElement,k="brand-drawn";if(sessionStorage.getItem(k)||!matchMedia("(prefers-reduced-motion: no-preference)").matches)return;sessionStorage.setItem(k,"1");h.setAttribute("data-brand-draw","");var f=function(e){var t=e.target;if(t&&t.hasAttribute&&t.hasAttribute("data-brand-pen")){h.removeAttribute("data-brand-draw");h.removeEventListener("animationend",f)}};h.addEventListener("animationend",f)}catch(e){}})()`;

type BrandMarkProps = SVGProps<SVGSVGElement> & {
  /**
   * Draw the mark on with a pen on the session's first load (the header's
   * mark). Server-rendered complete; the drawing is an enhancement.
   */
  draw?: boolean;
};

/**
 * Davi's calligraphic "d" in `currentColor` (geometry in `./mark`). Size it
 * by height with `w-auto`; it is decorative, so the link around it carries
 * the label. Inside a link it tilts a little on hover.
 */
export function BrandMark({
  draw = false,
  className,
  ...props
}: BrandMarkProps) {
  const svg = (
    <svg
      viewBox={BRAND_MARK.viewBox}
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
      className={cn(styles.mark, className)}
      {...props}
    >
      {draw ? (
        <>
          <mask
            id={MASK_ID}
            maskUnits="userSpaceOnUse"
            x="0"
            y="0"
            width={BRAND_MARK.width}
            height={BRAND_MARK.height}
          >
            {/* Shows the whole glyph, except while the pen is drawing. */}
            <rect
              className={styles.still}
              width={BRAND_MARK.width}
              height={BRAND_MARK.height}
              fill="#fff"
            />
            <path
              data-brand-pen=""
              className={styles.pen}
              d={BRAND_MARK.pen}
              fill="none"
              stroke="#fff"
              strokeWidth={BRAND_MARK.penWidth}
              strokeLinecap="round"
              // One dash as long as the pen, then a gap longer than it; the
              // draw slides it in from just before the start.
              strokeDasharray={`${BRAND_MARK.penLength} ${2 * BRAND_MARK.penLength}`}
              style={
                { "--pen-from": BRAND_MARK.penLength + 1 } as CSSProperties
              }
            />
          </mask>
          <path
            fillRule="evenodd"
            d={BRAND_MARK.glyph}
            mask={`url(#${MASK_ID})`}
          />
        </>
      ) : (
        <path fillRule="evenodd" d={BRAND_MARK.glyph} />
      )}
    </svg>
  );

  if (!draw) return svg;
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: DRAW_SCRIPT }} />
      {svg}
    </>
  );
}
