import { Analytics } from "@vercel/analytics/next";
import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import { AgentDiscovery } from "@/components/agents/agent-discovery";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { MotionProvider } from "@/components/motion/motion-provider";
import { AlternateLinksProvider } from "@/components/providers/alternate-links";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { siteConfig } from "@/config/site";
import { profile } from "@/content/profile";
import { getDictionary, isLocale, localeMeta, locales } from "@/i18n";

import { fontVariables } from "../fonts";
import "../globals.css";

type LayoutProps = {
  children: ReactNode;
  params: Promise<{ lang: string }>;
};

export function generateStaticParams() {
  return locales.map((lang) => ({ lang }));
}

export const viewport: Viewport = {
  themeColor: [
    {
      media: "(prefers-color-scheme: light)",
      color: siteConfig.themeColor.light,
    },
    {
      media: "(prefers-color-scheme: dark)",
      color: siteConfig.themeColor.dark,
    },
  ],
  colorScheme: "light dark",
  // The docked composer reads env(safe-area-inset-bottom).
  viewportFit: "cover",
};

/**
 * Site-wide defaults. Pages override title/description/canonical/alternates/OG
 * with `buildMetadata()` from `@/lib/seo` (no canonical here on purpose, so a
 * page can never inherit the wrong one).
 */
export async function generateMetadata({
  params,
}: LayoutProps): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  const dict = getDictionary(lang);

  return {
    metadataBase: new URL(siteConfig.url),
    title: {
      default: dict.meta.defaultTitle,
      template: `%s | ${dict.meta.siteName}`,
    },
    description: dict.meta.description,
    applicationName: dict.meta.siteName,
    authors: [{ name: profile.name, url: siteConfig.url }],
    creator: profile.name,
    publisher: profile.name,
    keywords: [...siteConfig.keywords],
    category: "technology",
    formatDetection: { email: false, address: false, telephone: false },
    icons: {
      icon: [
        { url: "/favicon.ico", sizes: "any" },
        { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      ],
      apple: "/apple-touch-icon.png",
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-image-preview": "large",
        "max-snippet": -1,
        "max-video-preview": -1,
      },
    },
    openGraph: {
      type: "website",
      siteName: dict.meta.siteName,
      locale: localeMeta[lang].ogLocale,
    },
    twitter: { card: "summary_large_image" },
  };
}

export default async function RootLayout({ children, params }: LayoutProps) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const dict = getDictionary(lang);

  return (
    <html
      lang={localeMeta[lang].htmlLang}
      className={fontVariables}
      // Next turns smooth scrolling off while it scrolls on a navigation.
      data-scroll-behavior="smooth"
      suppressHydrationWarning
    >
      <body className="flex min-h-dvh flex-col text-foreground">
        <ThemeProvider>
          <MotionProvider>
            <AlternateLinksProvider>
              <a
                href="#main"
                className="sr-only z-50 rounded-full bg-foreground px-4 py-2 text-small font-medium text-background focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
              >
                {dict.a11y.skipToContent}
              </a>
              <SiteHeader lang={lang} />
              <main id="main" tabIndex={-1} className="flex-1 outline-none">
                {children}
              </main>
              <SiteFooter lang={lang} />
            </AlternateLinksProvider>
          </MotionProvider>
        </ThemeProvider>
        <AgentDiscovery />
        <Analytics />
      </body>
    </html>
  );
}
