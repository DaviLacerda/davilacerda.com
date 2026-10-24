import { NextResponse, type NextRequest } from "next/server";

import { LOCALE_COOKIE, isLocale, locales } from "@/i18n/config";
import { matchLocaleTag, negotiateLocale } from "@/i18n/negotiate";

/**
 * Locale routing (Next.js 16 "proxy", formerly middleware).
 *
 * - `/en/...` and `/pt-br/...` pass through untouched.
 * - A wrongly-cased prefix (`/pt-BR/blog`) is redirected to the canonical one.
 * - Any other path gets a locale prefix: the `NEXT_LOCALE` cookie (set by the
 *   locale switcher) wins, then `Accept-Language`, then the default locale.
 *
 * Static files, Next internals, API routes and root-level metadata/feeds are
 * excluded by `config.matcher` below, so they are never redirected.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const [, firstSegment = ""] = pathname.split("/");

  if (isLocale(firstSegment)) return NextResponse.next();

  const url = request.nextUrl.clone();

  // `/PT-BR/x` or `/pt-BR/x` -> `/pt-br/x`
  const caseInsensitive = locales.find((l) => l === firstSegment.toLowerCase());
  if (caseInsensitive) {
    url.pathname = `/${caseInsensitive}${pathname.slice(firstSegment.length + 1)}`;
    return NextResponse.redirect(url, 308);
  }

  const cookieLocale = request.cookies.get(LOCALE_COOKIE)?.value;
  const locale =
    (cookieLocale && matchLocaleTag(cookieLocale)) ||
    negotiateLocale(request.headers.get("accept-language"));

  url.pathname = `/${locale}${pathname === "/" ? "" : pathname}`;
  // 307: the target depends on the visitor's language, so it must not be cached as permanent.
  const response = NextResponse.redirect(url, 307);
  response.headers.set("Vary", "Accept-Language, Cookie");
  return response;
}

export const config = {
  matcher: [
    /*
     * Run on every path except:
     * - _next/* (static assets, image optimizer, data), api/*
     * - anything with a file extension (favicon.ico, robots.txt, sitemap.xml,
     *   llms.txt, llms-full.txt, rss.xml, manifest.webmanifest, images, fonts)
     * - extension-less metadata routes: opengraph-image, twitter-image, icon, apple-icon
     */
    "/((?!_next/|api/|.*\\..*|opengraph-image|twitter-image|icon|apple-icon).*)",
  ],
};
