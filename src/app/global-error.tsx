"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

import { crashed } from "@/components/error/art";
import { ErrorScreen } from "@/components/error/error-screen";
import { errorLabels } from "@/components/error/labels";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { defaultLocale, isLocale, localeMeta } from "@/i18n/config";

import { fontVariables } from "./fonts";
import "./globals.css";

/**
 * Last-resort error page, for a crash in the [lang] root layout itself. It
 * replaces the whole document, so it brings its own <html>, fonts, styles
 * and theme (the visitor's light or dark choice), and shows the same 500
 * screen as `[lang]/error.tsx`, without the header and footer. The locale
 * comes from the path.
 */
export default function GlobalError({ error }: { error: unknown }) {
  const segment = usePathname()?.split("/")[1];
  const lang = isLocale(segment) ? segment : defaultLocale;
  const label = errorLabels[lang].server;

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html
      lang={localeMeta[lang].htmlLang}
      className={fontVariables}
      suppressHydrationWarning
    >
      <body className="flex min-h-dvh flex-col bg-background text-foreground">
        <title>{`500 | ${label}`}</title>
        <meta name="robots" content="noindex" />
        <ThemeProvider>
          <main className="flex flex-1 items-center">
            <ErrorScreen status={500} label={label} art={crashed} />
          </main>
        </ThemeProvider>
      </body>
    </html>
  );
}
