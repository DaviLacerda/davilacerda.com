import { NextResponse, type NextRequest } from "next/server";

import { LOCALE_COOKIE, isLocale, locales } from "@/i18n/config";
import { matchLocaleTag, negotiateLocale } from "@/i18n/negotiate";
import {
  linkHeaderFor,
  markdownRoute,
  parsePagePath,
  prefersMarkdown,
  siteLinks,
  formatLink,
} from "@/lib/agents/discovery";
import { routes } from "@/lib/routes";
import { matchTopic } from "@/lib/work/topics";

/**
 * Locale routing and agent content negotiation (Next.js 16 "proxy", formerly middleware).
 *
 * - `/en/...` and `/pt-br/...` pass through, with an RFC 8288 `Link` header
 *   (canonical, hreflang, Markdown alternate, llms.txt, API catalog, sitemap, RSS).
 *   When the `Accept` header prefers `text/markdown`, known pages are rewritten
 *   to their Markdown rendition instead (`Vary: Accept` on both variants).
 * - `/en.md`, `/en/index.md`, `/en/work/<topic>.md`, `/en/projects.md`,
 *   `/en/projects/<slug>.md`, `/en/personal.md`,
 *   `/en/personal/blog/<slug>.md` are rewritten to the internal Markdown
 *   routes (`src/app/markdown`).
 * - `/en/ask?q=...` (the Work composer's form without JavaScript) is
 *   redirected (303) to the best-matching answer, `/en/work/<topic>`; with no
 *   match it falls through to the static "no written answer" page.
 * - A wrongly-cased prefix (`/pt-BR/blog`) is redirected to the canonical one.
 * - Any other path gets a locale prefix: the `NEXT_LOCALE` cookie (set by the
 *   locale switcher) wins, then `Accept-Language`, then the default locale.
 *   `/` with `Accept: text/markdown` is answered with the Markdown directly.
 *
 * Static files, Next internals, API routes, `/mcp`, `.well-known` and
 * root-level metadata/feeds are excluded by `config.matcher` below.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const [, firstSegment = ""] = pathname.split("/");
  const accept = request.headers.get("accept");

  // Explicit Markdown URLs.
  if (pathname.endsWith(".md")) {
    const page = parsePagePath(pathname.slice(0, -3).replace(/\/index$/, ""));
    if (!page) return NextResponse.next();
    return NextResponse.rewrite(new URL(markdownRoute(page), request.url));
  }

  if (isLocale(firstSegment)) {
    if (pathname === routes.ask(firstSegment)) {
      const topic = matchTopic(request.nextUrl.searchParams.get("q") ?? "");
      if (topic) {
        const target = request.nextUrl.clone();
        target.pathname = routes.topic(firstSegment, topic);
        target.search = "";
        return NextResponse.redirect(target, 303);
      }
    }
    const page = parsePagePath(pathname);
    if (page && prefersMarkdown(accept)) {
      const response = NextResponse.rewrite(
        new URL(markdownRoute(page), request.url),
      );
      response.headers.set("Vary", "Accept");
      return response;
    }
    const response = NextResponse.next();
    response.headers.set("Link", linkHeaderFor(pathname));
    if (page) response.headers.set("Vary", "Accept");
    return response;
  }

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
  const vary = "Accept, Accept-Language, Cookie";

  // Agents asking for Markdown at the root get it without a redirect hop.
  if (pathname === "/" && prefersMarkdown(accept)) {
    const response = NextResponse.rewrite(
      new URL(markdownRoute({ kind: "work", lang: locale }), request.url),
    );
    response.headers.set("Vary", vary);
    response.headers.set("Content-Location", `/${locale}.md`);
    return response;
  }

  url.pathname = `/${locale}${pathname === "/" ? "" : pathname}`;
  // 307: the target depends on the visitor's language, so it must not be cached as permanent.
  const response = NextResponse.redirect(url, 307);
  response.headers.set("Vary", vary);
  if (pathname === "/") {
    // Agents that do not follow redirects still discover the machine-readable surface.
    response.headers.set("Link", siteLinks().map(formatLink).join(", "));
  }
  return response;
}

export const config = {
  matcher: [
    /*
     * Run on every path except:
     * - _next/* (static assets, image optimizer, data), api/*, mcp (the MCP endpoint)
     * - anything with a file extension (favicon.ico, robots.txt, sitemap.xml,
     *   llms.txt, llms-full.txt, rss.xml, manifest.webmanifest, .well-known/*,
     *   images, fonts), except .md (handled above)
     * - extension-less metadata routes: opengraph-image, twitter-image, icon, apple-icon
     */
    "/((?!_next/|api/|mcp$|mcp/|.*\\..*|opengraph-image|twitter-image|icon|apple-icon).*)",
    // Markdown renditions: /en.md, /en/index.md, /en/work/<topic>.md, /en/projects.md,
    // /en/projects/<slug>.md, /en/personal.md, /en/personal/blog/<slug>.md
    "/(.*\\.md)",
  ],
};
