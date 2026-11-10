import type { ReactNode } from "react";

import type { ThingArt } from "@/content/things";

/*
 * The drawings on the Things wall: one flat, grey object per kind, drawn
 * for this site (no product photography, no brand artwork). Like a photo,
 * an object keeps its own colours in both themes (a black shoe stays
 * black), so these greys are the objects' colours, not the site's tokens;
 * dark objects carry a lighter rim so they read on the dark plates. All in
 * one 240 x 180 box (the plate's 4:3), resting on the same floor line with
 * a soft contact shadow, so the wall reads as one set. No hooks: rendered on
 * the server (the page, the OG card) and passed to the wall as children.
 */

export const ART_VIEWBOX = { width: 240, height: 180 } as const;

const c = {
  /** Black objects: body, a step up, the rim and a sheen. */
  black: "#141414",
  black2: "#1f1f1f",
  black3: "#2c2c2c",
  rim: "#474747",
  /** White objects: body, shading and their hairline. */
  white: "#f7f7f7",
  white2: "#e6e6e6",
  hair: "#c8c8c8",
  /** Aluminium. */
  alu: "#cbccce",
  alu2: "#b5b6b9",
  alu3: "#dcdddf",
  /** The laptop's screen. */
  screen: "#232325",
  screen2: "#303034",
  screen3: "#3d3d42",
  shadow: "#000000",
} as const;

/** A soft contact shadow under an object (a function, not a component: see `ThingDrawing`). */
function shadow({ cx, cy = 152, rx }: { cx: number; cy?: number; rx: number }) {
  return (
    <ellipse cx={cx} cy={cy} rx={rx} ry={5} fill={c.shadow} opacity={0.08} />
  );
}

function Wayfarer() {
  const half = (
    <>
      <path d="M17 63 L28 60 L28 73 L17 70 Z" fill={c.black2} />
      <path
        d="M26 66 C26 60 30 58 36 58 L112 58 C116 58 118 61 117.5 65 L113 106 C111.5 119 104 126 90 126 L60 126 C46 126 38 119 35 107 Z"
        fill={c.black}
        stroke={c.rim}
        strokeWidth={1.2}
      />
      <path
        d="M37 68 L107 68 L104 104 C103 113 98 117 88 117 L62 117 C52 117 46 113 44 105 Z"
        fill={c.black3}
      />
      <path d="M52 70 L66 70 L51 113 L45 106 Z" fill="#ffffff" opacity={0.07} />
    </>
  );
  return (
    <>
      {shadow({ cx: 120, rx: 84 })}
      {half}
      <g transform="matrix(-1 0 0 1 240 0)">{half}</g>
      <path
        d="M111 62 Q120 57 129 62 L129 75 Q120 70 111 75 Z"
        fill={c.black}
        stroke={c.rim}
        strokeWidth={1.2}
      />
      {/* The camera on one corner, the capture light on the other. */}
      <circle
        cx={34}
        cy={66}
        r={3.6}
        fill="#0b0b0b"
        stroke="#707070"
        strokeWidth={1.2}
      />
      <circle cx={206} cy={66} r={2.2} fill="#7a7a7a" />
    </>
  );
}

function MacBookAir() {
  return (
    <>
      {shadow({ cx: 120, cy: 142, rx: 106 })}
      <rect x={46} y={24} width={148} height={98} rx={7} fill={c.alu} />
      <rect x={50} y={28} width={140} height={92} rx={4} fill="#0d0d0d" />
      <rect x={54} y={33} width={132} height={84} rx={2} fill={c.screen} />
      <path
        d="M54 117 L54 86 C90 70 120 96 186 74 L186 117 Z"
        fill={c.screen2}
      />
      <path
        d="M54 117 L54 101 C100 92 140 112 186 96 L186 117 Z"
        fill={c.screen3}
      />
      <rect x={113} y={28} width={14} height={6} rx={2} fill="#0d0d0d" />
      <path
        d="M30 121 L210 121 L220 131 Q221 134 216 134 L24 134 Q19 134 20 131 Z"
        fill={c.alu3}
      />
      <path
        d="M20.5 131 L219.5 131 Q220.5 136 215 136 L25 136 Q19.5 136 20.5 131 Z"
        fill={c.alu2}
      />
      <path
        d="M103 121 L137 121 L135 124 Q134 125 132 125 L108 125 Q106 125 105 124 Z"
        fill={c.alu2}
      />
    </>
  );
}

function AirPodsPro() {
  const bud = (
    <>
      <rect
        x={-5.5}
        y={6}
        width={11}
        height={42}
        rx={5.5}
        fill={c.white}
        stroke={c.hair}
        strokeWidth={1.2}
      />
      <rect x={0.5} y={10} width={3.5} height={34} rx={1.75} fill={c.white2} />
      <rect x={-5.5} y={43} width={11} height={5} rx={2.5} fill={c.hair} />
      <ellipse
        cx={-11}
        cy={-3}
        rx={9}
        ry={10}
        fill={c.white2}
        stroke={c.hair}
        strokeWidth={1.2}
      />
      <ellipse
        cx={0}
        cy={0}
        rx={15}
        ry={16}
        fill={c.white}
        stroke={c.hair}
        strokeWidth={1.2}
      />
      <ellipse cx={6} cy={-6} rx={3.2} ry={2.2} fill="#2a2a2a" />
    </>
  );
  return (
    <>
      {shadow({ cx: 90, cy: 148, rx: 58 })}
      {shadow({ cx: 196, cy: 148, rx: 30 })}
      <rect
        x={40}
        y={50}
        width={100}
        height={94}
        rx={30}
        fill={c.white}
        stroke={c.hair}
        strokeWidth={1.5}
      />
      <path d="M41 80 L139 80" stroke={c.hair} strokeWidth={1.5} />
      <path
        d="M48 118 C60 136 120 136 132 118 L132 126 C120 142 60 142 48 126 Z"
        fill={c.white2}
        opacity={0.7}
      />
      <circle cx={90} cy={104} r={2.4} fill="#a3a3a3" />
      <rect
        x={139}
        y={118}
        width={6}
        height={12}
        rx={2.5}
        fill={c.white2}
        stroke={c.hair}
        strokeWidth={1.2}
      />
      <g transform="translate(178 72) rotate(-14)">{bud}</g>
      <g transform="translate(212 86) rotate(12) scale(-1 1)">{bud}</g>
    </>
  );
}

/** A running shoe in profile: a tall, layered midsole, mesh with overlays. */
function Runner() {
  return (
    <g transform="translate(0 -22)">
      {shadow({ cx: 122, cy: 174, rx: 104 })}
      <path
        d="M24 160 L218 160 Q228 160 226 168 Q224 172 216 172 L34 172 Q22 172 22 166 Z"
        fill="#a5a5a5"
      />
      <path
        d="M22 138 Q22 131 30 131 L140 136 Q190 140 214 146 Q226 150 224 160 L22 160 Z"
        fill={c.white2}
        stroke={c.hair}
        strokeWidth={1.2}
      />
      <path
        d="M30 149 Q80 144 130 150 Q170 154 214 153"
        fill="none"
        stroke={c.hair}
        strokeWidth={1.4}
      />
      <path
        d="M28 132 Q21 100 34 84 Q40 76 56 78 L72 82 Q84 96 100 98 L120 92 Q150 100 178 116 Q206 128 216 142 Q218 147 211 146 L30 136 Z"
        fill={c.white}
        stroke={c.hair}
        strokeWidth={1.2}
      />
      <path d="M31 90 Q29 79 37 77 L46 81 Z" fill={c.alu} />
      <path
        d="M176 118 Q204 128 214 142 L186 140 Q178 130 176 118 Z"
        fill={c.white2}
      />
      <path
        d="M96 99 L150 106 L157 119 L102 113 Z"
        fill={c.alu3}
        stroke={c.hair}
        strokeWidth={1}
      />
      <path
        d="M108 102 L111 110 M120 103 L123 111 M132 105 L135 113 M144 107 L147 115"
        stroke={c.alu2}
        strokeWidth={2}
        strokeLinecap="round"
      />
      <path
        d="M70 125 Q120 119 188 110 Q140 127 98 134 Q76 137 70 125 Z"
        fill={c.alu2}
      />
      <path
        d="M52 81 Q72 93 98 97"
        fill="none"
        stroke={c.alu2}
        strokeWidth={3}
        strokeLinecap="round"
      />
    </g>
  );
}

/** A low-top basketball shoe in profile: slim sole, smooth upper, tonal mark. */
function Court() {
  return (
    <g transform="translate(0 -22)">
      {shadow({ cx: 122, cy: 174, rx: 102 })}
      <path
        d="M26 163 L216 163 Q226 163 224 168 Q222 173 214 173 L34 173 Q24 173 24 168 Z"
        fill="#0e0e0e"
        stroke={c.rim}
        strokeWidth={1}
      />
      <path
        d="M24 149 L214 153 Q224 155 224 163 L24 163 Z"
        fill={c.black2}
        stroke={c.rim}
        strokeWidth={1.2}
      />
      <path
        d="M28 150 C22 128 24 104 34 92 C40 85 50 83 60 89 L72 97 C86 107 100 109 114 105 L128 101 C156 109 184 123 204 135 C216 142 222 149 220 155 L28 151 Z"
        fill={c.black}
        stroke={c.rim}
        strokeWidth={1.2}
      />
      <path
        d="M30 92 Q28 79 38 79 L46 86 Z"
        fill={c.black2}
        stroke={c.rim}
        strokeWidth={1}
      />
      <path
        d="M28 150 C24 128 26 110 34 98 L54 104 C48 120 48 136 54 150 Z"
        fill={c.black2}
      />
      <path d="M110 106 L164 122 L159 132 L106 116 Z" fill={c.black2} />
      <path
        d="M120 106 L116 117 M132 110 L128 121 M144 114 L140 125 M156 118 L152 129"
        stroke={c.rim}
        strokeWidth={2.4}
        strokeLinecap="round"
      />
      <path
        d="M78 141 C130 133 170 127 208 121 C162 141 122 149 100 149 C84 149 76 147 78 141 Z"
        fill={c.black3}
      />
      <path
        d="M58 89 Q84 108 112 105"
        fill="none"
        stroke={c.rim}
        strokeWidth={2.6}
        strokeLinecap="round"
      />
      <path
        d="M176 129 C196 137 210 146 216 154"
        fill="none"
        stroke={c.rim}
        strokeWidth={1.2}
      />
      <path
        d="M150 116 Q182 128 204 140"
        fill="none"
        stroke="#ffffff"
        opacity={0.08}
        strokeWidth={4}
        strokeLinecap="round"
      />
    </g>
  );
}

/** A symmetrical gaming mouse from above, turned a little. */
function Mouse() {
  return (
    <>
      {shadow({ cx: 120, cy: 154, rx: 56 })}
      <g transform="translate(120 88) rotate(-12) scale(0.78) translate(-120 -118)">
        <path
          d="M120 36 C156 36 170 64 170 104 C170 150 160 196 120 200 C80 196 70 150 70 104 C70 64 84 36 120 36 Z"
          fill={c.black}
          stroke={c.rim}
          strokeWidth={1.5}
        />
        <path d="M120 38 L120 98" stroke={c.black3} strokeWidth={2} />
        <path
          d="M72 96 Q120 106 168 96"
          fill="none"
          stroke={c.black3}
          strokeWidth={2}
        />
        <rect
          x={113}
          y={52}
          width={14}
          height={30}
          rx={7}
          fill={c.black3}
          stroke={c.rim}
          strokeWidth={1}
        />
        <path
          d="M116 60 L124 60 M116 66 L124 66 M116 72 L124 72"
          stroke={c.rim}
          strokeWidth={1.4}
        />
        <rect x={68} y={112} width={6} height={16} rx={3} fill={c.black3} />
        <rect x={68} y={132} width={6} height={16} rx={3} fill={c.black3} />
        <path
          d="M96 168 Q120 176 144 168"
          fill="none"
          stroke={c.rim}
          strokeWidth={2.4}
          strokeLinecap="round"
        />
        <path
          d="M92 50 Q100 44 110 42"
          fill="none"
          stroke="#ffffff"
          opacity={0.1}
          strokeWidth={4}
          strokeLinecap="round"
        />
      </g>
    </>
  );
}

const drawings: Record<ThingArt, () => ReactNode> = {
  wayfarer: Wayfarer,
  "macbook-air": MacBookAir,
  "airpods-pro": AirPodsPro,
  runner: Runner,
  court: Court,
  mouse: Mouse,
};

/** A thing's drawing as an inline SVG (decorative: the name is beside it). */
export function ThingDrawing({
  art,
  className,
  width,
  height,
}: {
  art: ThingArt;
  className?: string;
  /** Pixel size, for the OG card (on the page CSS sizes it). */
  width?: number;
  height?: number;
}) {
  // Called, not rendered as a component: the OG card renderer (Satori)
  // only accepts plain elements inside an <svg>.
  const drawing = drawings[art]();
  return (
    <svg
      viewBox={`0 0 ${ART_VIEWBOX.width} ${ART_VIEWBOX.height}`}
      aria-hidden="true"
      focusable="false"
      width={width}
      height={height}
      className={className}
    >
      {drawing}
    </svg>
  );
}
