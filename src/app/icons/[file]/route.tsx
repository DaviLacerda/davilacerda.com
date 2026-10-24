import { ImageResponse } from "next/og";

import { OgMark } from "@/lib/og/template";

/*
 * App icons for the web manifest, the MCP server card and the ARD catalog:
 * Davi's pixel "d" in his violet on near-black, the same composition as the
 * favicons in /public (apple-touch-icon.png), drawn from the vector mark so it
 * stays sharp at 512px. `maskable-*` keeps the mark inside the 80% safe zone
 * and bleeds the ground to the edges.
 */
export const dynamic = "force-static";
export const dynamicParams = false;

const ICONS = {
  "icon-192.png": { size: 192, maskable: false },
  "icon-512.png": { size: 512, maskable: false },
  "maskable-512.png": { size: 512, maskable: true },
} as const;

/** Colours of the favicons in /public (Davi's brand mark). */
const GROUND = "#09090b";
const MARK = "#5b21b6";

type IconFile = keyof typeof ICONS;

export function generateStaticParams() {
  return Object.keys(ICONS).map((file) => ({ file }));
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ file: string }> },
) {
  const { file } = await params;
  const icon = ICONS[file as IconFile];
  if (!icon) return new Response("Not found", { status: 404 });
  const { size, maskable } = icon;
  // Mark height relative to the icon: 50% like the favicons, 38% when maskable.
  const markHeight = Math.round(size * (maskable ? 0.38 : 0.5));

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: GROUND,
        borderRadius: maskable ? 0 : size * 0.22,
        paddingLeft: size * 0.04,
      }}
    >
      <OgMark height={markHeight} color={MARK} />
    </div>,
    { width: size, height: size },
  );
}
