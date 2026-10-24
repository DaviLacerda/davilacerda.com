import { siteConfig } from "@/config/site";
import { profile } from "@/content/profile";
import {
  getDictionary,
  interpolate,
  isLocale,
  localeMeta,
  locales,
  otherLocales,
  type Locale,
} from "@/i18n";
import { getAllPosts, getPost, type Post } from "@/lib/blog";
import { routes } from "@/lib/routes";
import { absoluteUrl } from "@/lib/utils";

/**
 * RSS 2.0 feed per locale: /en/personal/blog/rss.xml, /pt-br/personal/blog/rss.xml.
 * Full post HTML in <content:encoded>, plain description in <description>.
 * Prerendered at build time; regenerated on every deploy.
 */
export const dynamic = "force-static";
export const dynamicParams = false;

export function generateStaticParams() {
  return locales.map((lang) => ({ lang }));
}

type RouteProps = { params: Promise<{ lang: string }> };

export async function GET(_request: Request, { params }: RouteProps) {
  const { lang } = await params;
  if (!isLocale(lang)) return new Response("Not found", { status: 404 });

  const metas = getAllPosts(lang);
  const posts = (
    await Promise.all(metas.map((meta) => getPost(lang, meta.slug)))
  ).filter((post): post is Post => post !== null);

  return new Response(buildFeed(lang, posts), {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
    },
  });
}

/* ------------------------------------------------------------------------ */

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/** Wraps text in CDATA, splitting any `]]>` so it cannot end the section early. */
function cdata(value: string): string {
  return `<![CDATA[${value.replace(/]]>/g, "]]]]><![CDATA[>")}]]>`;
}

/** "YYYY-MM-DD" -> RFC 822 date ("Sat, 24 Oct 2026 00:00:00 GMT"). */
function rfc822(date: string): string {
  return new Date(`${date}T00:00:00Z`).toUTCString();
}

/**
 * Makes post HTML portable for feed readers: absolute URLs for site-relative
 * links/images and for in-page anchors, and Shiki's CSS-variable colors
 * collapsed to the light theme's plain `color` (readers ignore variables).
 */
function feedHtml(post: Post): string {
  const pageUrl = absoluteUrl(post.url);
  return post.html
    .replace(/\s(href|src)="\/(?!\/)/g, ` $1="${siteConfig.url}/`)
    .replace(/\shref="#/g, ` href="${pageUrl}#`)
    .replace(/style="([^"]*)"/g, (_match, style: string) => {
      const light = /--shiki-light:\s*([^;"]+)/.exec(style)?.[1];
      return light ? `style="color:${light.trim()}"` : `style="${style}"`;
    });
}

function buildFeed(lang: Locale, posts: Post[]): string {
  const dict = getDictionary(lang);
  const feedUrl = absoluteUrl(routes.rss(lang));
  const blogUrl = absoluteUrl(routes.blog(lang));
  const title = interpolate(dict.blog.feedTitle, { name: dict.meta.siteName });
  const author = `${profile.email} (${profile.name})`;
  const lastChange = posts
    .map((post) => post.updated ?? post.date)
    .sort()
    .at(-1);
  const year = (lastChange ?? new Date().toISOString()).slice(0, 4);

  const alternates = otherLocales(lang)
    .map(
      (other) =>
        `    <atom:link rel="alternate" type="application/rss+xml" hreflang="${localeMeta[other].hreflang}" href="${escapeXml(absoluteUrl(routes.rss(other)))}" />`,
    )
    .join("\n");

  const items = posts
    .map((post) => {
      const url = escapeXml(absoluteUrl(post.url));
      const categories = post.tags
        .map((tag) => `      <category>${escapeXml(tag)}</category>`)
        .join("\n");
      return [
        "    <item>",
        `      <title>${escapeXml(post.title)}</title>`,
        `      <link>${url}</link>`,
        `      <guid isPermaLink="true">${url}</guid>`,
        `      <description>${escapeXml(post.description)}</description>`,
        `      <content:encoded>${cdata(feedHtml(post))}</content:encoded>`,
        `      <pubDate>${rfc822(post.date)}</pubDate>`,
        `      <author>${escapeXml(author)}</author>`,
        `      <dc:creator>${escapeXml(profile.name)}</dc:creator>`,
        categories,
        "    </item>",
      ]
        .filter(Boolean)
        .join("\n");
    })
    .join("\n");

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:dc="http://purl.org/dc/elements/1.1/">',
    "  <channel>",
    `    <title>${escapeXml(title)}</title>`,
    `    <link>${escapeXml(blogUrl)}</link>`,
    `    <description>${escapeXml(dict.meta.blog.description)}</description>`,
    `    <language>${localeMeta[lang].htmlLang}</language>`,
    `    <copyright>© ${year} ${escapeXml(profile.name)}</copyright>`,
    `    <managingEditor>${escapeXml(author)}</managingEditor>`,
    `    <webMaster>${escapeXml(author)}</webMaster>`,
    lastChange ? `    <pubDate>${rfc822(lastChange)}</pubDate>` : "",
    lastChange
      ? `    <lastBuildDate>${rfc822(lastChange)}</lastBuildDate>`
      : "",
    "    <docs>https://www.rssboard.org/rss-specification</docs>",
    "    <generator>Next.js</generator>",
    "    <ttl>1440</ttl>",
    `    <atom:link rel="self" type="application/rss+xml" href="${escapeXml(feedUrl)}" />`,
    alternates,
    "    <image>",
    `      <url>${escapeXml(absoluteUrl("/images/logo.png"))}</url>`,
    `      <title>${escapeXml(title)}</title>`,
    `      <link>${escapeXml(blogUrl)}</link>`,
    "      <width>139</width>",
    "      <height>128</height>",
    "    </image>",
    items,
    "  </channel>",
    "</rss>",
    "",
  ]
    .filter((line) => line !== "")
    .join("\n")
    .concat("\n");
}
