/**
 * Agent discovery: public URLs of the machine-readable surface (llms.txt,
 * Markdown renditions, JSON API, MCP, .well-known documents), Accept-header
 * negotiation and the RFC 8288 `Link` header for HTML pages.
 *
 * Dependency-free on purpose (only config modules): it is imported by
 * `src/proxy.ts`, which must stay small and must not load content or Node APIs.
 */
import { siteConfig } from "@/config/site";
import {
  defaultLocale,
  isLocale,
  localeMeta,
  locales,
  type Locale,
} from "@/i18n/config";
import { routes } from "@/lib/routes";
import { isTopicId, type TopicId } from "@/lib/work/topics";

/** Every agent-facing path, so pages, headers, catalogs and docs never drift apart. */
export const agentPaths = {
  llms: "/llms.txt",
  llmsFull: "/llms-full.txt",
  sitemap: "/sitemap.xml",
  robots: "/robots.txt",
  manifest: "/manifest.webmanifest",
  mcp: "/mcp",
  apiBase: "/api",
  openapi: "/api/openapi.json",
  status: "/api/status.json",
  /** Default-locale (English) profile; `profileJson("pt-br")` for Portuguese. */
  profileJson: (lang?: Locale) =>
    lang ? `/api/${lang}/profile.json` : "/api/profile.json",
  /** Posts of every locale, or of one locale. */
  postsJson: (lang?: Locale) =>
    lang ? `/api/${lang}/posts.json` : "/api/posts.json",
  /** JSON Resume (https://jsonresume.org/schema); `/resume.json` is English. */
  resume: (lang?: Locale) =>
    lang ? `/api/${lang}/resume.json` : "/resume.json",
  apiCatalog: "/.well-known/api-catalog",
  mcpServerCard: "/.well-known/mcp/server-card.json",
  mcpJson: "/.well-known/mcp.json",
  agentSkills: "/.well-known/agent-skills/index.json",
  skill: (name: string) => `/.well-known/agent-skills/${name}/SKILL.md`,
  aiCatalog: "/.well-known/ai-catalog.json",
  ard: "/.well-known/ard.json",
  poppy: "/.well-known/poppy.json",
} as const;

/** Name of the agent skill published under `/.well-known/agent-skills/`. */
export const SKILL_NAME = "about-davi-lacerda";

/** Content Signals (https://contentsignals.org) used in robots.txt and on Markdown responses. */
export const CONTENT_SIGNAL = "search=yes, ai-input=yes, ai-train=yes";

/* ==========================================================================
 * Page paths <-> Markdown renditions
 * ======================================================================== */

export type PageRef =
  | { kind: "work"; lang: Locale }
  | { kind: "topic"; lang: Locale; topic: TopicId }
  | { kind: "personal"; lang: Locale }
  | { kind: "post"; lang: Locale; slug: string };

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * Recognizes the pages that have a Markdown rendition: `/en`,
 * `/en/work/<topic>`, `/en/personal`, `/en/personal/blog/<slug>` (a trailing
 * slash is tolerated).
 */
export function parsePagePath(pathname: string): PageRef | null {
  const [lang, ...rest] = pathname.replace(/\/+$/, "").split("/").slice(1);
  if (!isLocale(lang)) return null;
  if (rest.length === 0) return { kind: "work", lang };
  if (rest.length === 1 && rest[0] === "personal") {
    return { kind: "personal", lang };
  }
  if (rest.length === 2 && rest[0] === "work" && isTopicId(rest[1])) {
    return { kind: "topic", lang, topic: rest[1] };
  }
  const [personal, blog, slug] = rest;
  if (
    rest.length === 3 &&
    personal === "personal" &&
    blog === "blog" &&
    slug &&
    SLUG.test(slug)
  ) {
    return { kind: "post", lang, slug };
  }
  return null;
}

/** Canonical HTML path of a page. */
export function pagePath(page: PageRef): string {
  if (page.kind === "work") return routes.work(page.lang);
  if (page.kind === "topic") return routes.topic(page.lang, page.topic);
  if (page.kind === "personal") return routes.personal(page.lang);
  return routes.post(page.lang, page.slug);
}

/** Public Markdown URL of a page: `/en` -> `/en.md`, `/en/personal/blog/x` -> `/en/personal/blog/x.md`. */
export function markdownPath(page: PageRef): string {
  return `${pagePath(page)}.md`;
}

/** Markdown path for an HTML path, or null when the page has no rendition. */
export function markdownPathFor(pathname: string): string | null {
  const page = parsePagePath(pathname);
  return page ? markdownPath(page) : null;
}

/**
 * Internal route handler that renders a page as Markdown (see `src/app/markdown`).
 * Reached through rewrites only: `/en.md` (next.config) or `Accept: text/markdown` (proxy).
 */
export function markdownRoute(page: PageRef): string {
  return `/markdown${pagePath(page)}`;
}

/* ==========================================================================
 * Content negotiation
 * ======================================================================== */

const MARKDOWN_TYPES = new Set(["text/markdown", "text/x-markdown"]);
const HTML_TYPES = new Set(["text/html", "application/xhtml+xml"]);

/**
 * True when the `Accept` header explicitly asks for Markdown at least as much
 * as for HTML. Wildcards (`*\/*`, `text/*`) never select Markdown, so browsers
 * keep getting HTML; `Accept: text/markdown` or
 * `text/markdown, text/html;q=0.9` get Markdown.
 */
export function prefersMarkdown(accept: string | null | undefined): boolean {
  if (!accept) return false;
  let markdown = 0;
  let html = 0;
  for (const part of accept.split(",")) {
    const [rawType = "", ...params] = part.split(";");
    const type = rawType.trim().toLowerCase();
    const qParam = params.find((p) => p.trim().toLowerCase().startsWith("q="));
    const parsed = qParam ? Number.parseFloat(qParam.trim().slice(2)) : 1;
    const q = Number.isFinite(parsed) ? parsed : 0;
    if (MARKDOWN_TYPES.has(type)) markdown = Math.max(markdown, q);
    else if (HTML_TYPES.has(type)) html = Math.max(html, q);
  }
  return markdown > 0 && markdown >= html;
}

/* ==========================================================================
 * Link header (RFC 8288)
 * ======================================================================== */

type LinkTarget = {
  href: string;
  rel: string;
  type?: string;
  hreflang?: string;
  title?: string;
};

function absolute(path: string): string {
  return /^https?:\/\//.test(path) ? path : `${siteConfig.url}${path}`;
}

/** Quoted-string per RFC 8288 / RFC 9110 (titles are ASCII-safe here). */
function quote(value: string): string {
  return `"${value.replace(/["\\]/g, "\\$&")}"`;
}

export function formatLink(link: LinkTarget): string {
  let out = `<${absolute(link.href)}>; rel=${quote(link.rel)}`;
  if (link.type) out += `; type=${quote(link.type)}`;
  if (link.hreflang) out += `; hreflang=${quote(link.hreflang)}`;
  if (link.title) {
    // Header values must be ASCII; non-ASCII titles use RFC 8187 `title*`.
    out += /^[\x20-\x7e]*$/.test(link.title)
      ? `; title=${quote(link.title)}`
      : `; title*=UTF-8''${encodeURIComponent(link.title)}`;
  }
  return out;
}

/** Links advertised on every HTML response (and the `/` redirect). */
export function siteLinks(lang?: Locale): LinkTarget[] {
  const feeds = lang ? [lang] : [...locales];
  return [
    {
      href: agentPaths.apiCatalog,
      rel: "api-catalog",
      type: "application/linkset+json",
    },
    {
      href: agentPaths.openapi,
      rel: "service-desc",
      type: "application/vnd.oai.openapi+json",
    },
    {
      href: agentPaths.skill(SKILL_NAME),
      rel: "service-doc",
      type: "text/markdown",
    },
    { href: agentPaths.llms, rel: "describedby", type: "text/plain" },
    {
      href: agentPaths.mcpServerCard,
      rel: "describedby",
      type: "application/json",
    },
    { href: agentPaths.sitemap, rel: "sitemap", type: "application/xml" },
    ...feeds.map((feed) => ({
      href: routes.rss(feed),
      rel: "alternate",
      type: "application/rss+xml",
      title: `${siteConfig.name} blog (${localeMeta[feed].short})`,
    })),
  ];
}

/** Links specific to one page: canonical, hreflang alternates (same-path pages) and its Markdown rendition. */
export function pageLinks(page: PageRef): LinkTarget[] {
  const links: LinkTarget[] = [{ href: pagePath(page), rel: "canonical" }];
  // Work, topics and Personal share their path across locales; post slugs differ per
  // locale, so their hreflang alternates live in the HTML <head> and sitemap only.
  if (page.kind !== "post") {
    for (const lang of locales) {
      links.push({
        href: pagePath({ ...page, lang }),
        rel: "alternate",
        hreflang: localeMeta[lang].hreflang,
      });
    }
    links.push({
      href: pagePath({ ...page, lang: defaultLocale }),
      rel: "alternate",
      hreflang: "x-default",
    });
  }
  links.push({
    href: markdownPath(page),
    rel: "alternate",
    type: "text/markdown",
  });
  return links;
}

/** Full `Link` header value for a request path (page-specific links when the path is a known page). */
export function linkHeaderFor(pathname: string): string {
  const page = parsePagePath(pathname);
  const lang = page?.lang ?? pathname.split("/")[1];
  const links = [
    ...(page ? pageLinks(page) : []),
    ...siteLinks(isLocale(lang) ? lang : undefined),
  ];
  return links.map(formatLink).join(", ");
}
