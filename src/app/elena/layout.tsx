import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";

import { fontVariables } from "../fonts";
import "./elena.css";

/*
 * A root layout of its own: no header, footer, analytics or agent discovery.
 * The page is unlisted (not in the sitemap, llms.txt, nav or any link) and
 * noindex everywhere (here, the X-Robots-Tag header in next.config.ts and the
 * media route).
 */
export const metadata: Metadata = {
  title: "💗",
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: { index: false, follow: false, noimageindex: true },
  },
  referrer: "no-referrer",
};

export const viewport: Viewport = {
  themeColor: "#ffd6e7",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function ElenaLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR" className={fontVariables}>
      <body className="elena-body">{children}</body>
    </html>
  );
}
