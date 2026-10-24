import { ImageResponse } from "next/og";

import { loadOgFonts, ogColors, ogFonts } from "@/lib/og/template";

/*
 * App icons for the web manifest, the MCP server card and the ARD catalog:
 * the "dl" monogram in Instrument Serif italic on the brand violet.
 * `maskable-*` keeps the mark inside the 80% safe zone and bleeds the color.
 */
export const dynamic = "force-static";
export const dynamicParams = false;

const ICONS = {
  "icon-192.png": { size: 192, maskable: false },
  "icon-512.png": { size: 512, maskable: false },
  "maskable-512.png": { size: 512, maskable: true },
} as const;

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
  const glyph = maskable ? size * 0.36 : size * 0.48;

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: ogColors.accent,
        backgroundImage:
          "radial-gradient(circle at 30% 20%, rgba(255, 255, 255, 0.22), rgba(255, 255, 255, 0) 60%)",
        borderRadius: maskable ? 0 : size * 0.22,
        color: ogColors.paper,
        fontFamily: ogFonts.serif,
        fontStyle: "italic",
        fontSize: glyph,
        lineHeight: 1,
        paddingBottom: glyph * 0.12,
      }}
    >
      dl
    </div>,
    { width: size, height: size, fonts: await loadOgFonts() },
  );
}
