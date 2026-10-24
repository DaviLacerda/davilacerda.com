import type { SVGProps } from "react";

/**
 * Davi's mark (the pixel "d" from `public/images/logo.png` and the favicons),
 * redrawn as a vector so it stays sharp at any size and takes the text
 * colour. The site shows it in ink; the violet original stays in the favicons
 * and app icons.
 */
export const BRAND_MARK = {
  viewBox: "0 0 139 128",
  body: "M34 24H90V49H115V95A33 33 0 0 1 82 128H34A34 34 0 0 1 0 94V58A34 34 0 0 1 34 24Z M34 49H90V94A9 9 0 0 1 81 103H34A9 9 0 0 1 25 94V58A9 9 0 0 1 34 49Z",
  pixels: [
    { x: 90, y: 0, width: 25, height: 24 },
    { x: 116, y: 24, width: 22, height: 25 },
  ],
} as const;

export function BrandMark(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox={BRAND_MARK.viewBox}
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      <path fillRule="evenodd" d={BRAND_MARK.body} />
      {BRAND_MARK.pixels.map((pixel) => (
        <rect key={`${pixel.x}-${pixel.y}`} {...pixel} />
      ))}
    </svg>
  );
}
