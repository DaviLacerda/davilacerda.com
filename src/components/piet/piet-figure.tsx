import { cn } from "@/lib/utils";

export type PietPose =
  "idle" | "wave" | "joy" | "dance" | "listen" | "think" | "rest";

/**
 * Piet, piecet's mascot: the lilac puzzle piece with two eyes, drawn as on
 * piecet.com (the same paths), with arms that move for each pose. The poses
 * and colours are in globals.css (section 8).
 */
export function PietFigure({
  pose = "idle",
  className,
}: {
  pose?: PietPose;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 823 595"
      aria-hidden="true"
      focusable="false"
      className={cn("piet", `pose-${pose}`, className)}
    >
      <g className="piet-all">
        <path
          className="piet-body arm arm-l"
          d="M 230 232 L 116.55 232 C 89.26 206.05 46.21 206.77 19.8 233.62 C -6.6 260.47 -6.6 303.53 19.8 330.38 C 46.21 357.23 89.26 357.95 116.55 332 L 230 332 Z"
        />
        <path
          className="piet-body arm arm-r"
          d="M 593 232 L 706.45 232 C 733.74 206.05 776.79 206.77 803.2 233.62 C 829.6 260.47 829.6 303.53 803.2 330.38 C 776.79 357.23 733.74 357.95 706.45 332 L 593 332 Z"
        />
        <path
          className="piet-body"
          d="M 259 0 L 324 0 C 336.15 0 346 9.85 346 22 L 346 47.25 C 322.69 73.85 327.98 110.2 358.3 131.8 C 388.63 153.4 434.37 153.4 464.7 131.8 C 495.02 110.2 500.31 73.85 477 47.25 L 477 22 C 477 9.85 486.85 0 499 0 L 564 0 C 633.04 0 689 55.96 689 125 L 689 470 C 689 539.04 633.04 595 564 595 L 499 595 C 486.85 595 477 585.15 477 573 L 477 547.75 C 500.31 521.15 495.02 484.8 464.7 463.2 C 434.37 441.6 388.63 441.6 358.3 463.2 C 327.98 484.8 322.69 521.15 346 547.75 L 346 573 C 346 585.15 336.15 595 324 595 L 259 595 C 189.96 595 134 539.04 134 470 L 134 125 C 134 55.96 189.96 0 259 0 Z"
        />
        <g className="piet-eyes">
          <g className="eye-open">
            <rect x="286" y="195" width="78" height="155" rx="39" />
            <circle className="glint" cx="323" cy="223" r="14" />
            <rect x="456" y="195" width="78" height="155" rx="39" />
            <circle className="glint" cx="493" cy="223" r="14" />
          </g>
          <path
            className="eye-joy"
            d="M290 300q35-90 70 0M460 300q35-90 70 0"
          />
          <path
            className="eye-rest"
            d="M290 272q35 44 70 0M460 272q35 44 70 0"
          />
        </g>
      </g>
    </svg>
  );
}
