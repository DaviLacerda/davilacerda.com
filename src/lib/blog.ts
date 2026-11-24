import "server-only";

import fs from "node:fs";
import path from "node:path";

import matter from "gray-matter";
import { cache } from "react";

import { isLocale, locales, type Locale } from "@/i18n/config";
import { renderMarkdown, type Heading } from "@/lib/markdown";
import { routes } from "@/lib/routes";
import { isPietShape, pietShapes, type PietShape } from "@/lib/piet";
import { plainScrapbookMarkdown } from "@/lib/scrapbook";
import { isSeries, type SeriesId } from "@/content/series";

/**
 * Blog content loader.
 *
 * Posts live in `content/blog/<locale>/<slug>.md` (see content/blog/README.md).
 * The file name is the slug. Files starting with `_` are ignored.
 * Drafts (`draft: true`) are visible in `next dev` and excluded from production builds.
 */

export const BLOG_DIR = path.join(process.cwd(), "content", "blog");

const WORDS_PER_MINUTE = 230;
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export type PostFrontmatter = {
  title: string;
  /** 120–160 characters; used for meta description, OG and RSS. */
  description: string;
  /** Publication date, "YYYY-MM-DD". */
  date: string;
  /** Last meaningful update, "YYYY-MM-DD". */
  updated?: string;
  tags: string[];
  draft: boolean;
  /** Shared by the en and pt-br versions of the same post. */
  translationKey?: string;
  /** A few handwritten words above the title ("notes from a launch"). */
  kicker?: string;
  /** An image in /public that stands for the post where it is featured (home page, notice). */
  cover?: string;
  /** The colour of the post's scribbles and handwriting accents, e.g. "#a970ff". */
  accent?: string;
  /** The series the post belongs to, by id in `src/content/series.ts` ("piecet"). */
  series?: SeriesId;
  /**
   * Piet, piecet's mascot, keeps the reader company down the page: `true`,
   * or his form in each section, in order (`[piece, bubble, heart]`, see
   * `src/lib/piet.ts`), the first for what comes before the first heading.
   */
  mascot?: true | PietShape[];
};

export type PostMeta = PostFrontmatter & {
  lang: Locale;
  slug: string;
  /** Locale-prefixed path, e.g. "/en/personal/blog/hello-world". */
  url: string;
  /** Estimated minutes to read (>= 1). */
  readingTime: number;
  wordCount: number;
};

export type Post = PostMeta & {
  /** Rendered, trusted HTML. Put it inside an element with the `markdown` class. */
  html: string;
  /** The same, for feed readers: brand chips as plain links, no scribbles. */
  feedHtml: string;
  headings: Heading[];
  /** Raw markdown body (without frontmatter), e.g. for llms-full.txt. */
  markdown: string;
};

const includeDrafts = process.env.NODE_ENV !== "production";

function toDateString(value: unknown, field: string, file: string): string {
  // YAML parses unquoted 2026-10-24 as a Date; accept both forms.
  const str = value instanceof Date ? value.toISOString().slice(0, 10) : value;
  if (typeof str !== "string" || !DATE_PATTERN.test(str)) {
    throw new Error(`[blog] ${file}: "${field}" must be a YYYY-MM-DD date.`);
  }
  return str;
}

function parseFrontmatter(
  data: Record<string, unknown>,
  file: string,
): PostFrontmatter {
  const {
    title,
    description,
    tags = [],
    draft = false,
    translationKey,
    kicker,
    accent,
    cover,
    series,
    mascot = false,
  } = data;
  if (typeof title !== "string" || !title.trim()) {
    throw new Error(`[blog] ${file}: "title" is required.`);
  }
  if (typeof description !== "string" || !description.trim()) {
    throw new Error(`[blog] ${file}: "description" is required.`);
  }
  if (!Array.isArray(tags) || !tags.every((tag) => typeof tag === "string")) {
    throw new Error(`[blog] ${file}: "tags" must be a list of strings.`);
  }
  if (typeof draft !== "boolean") {
    throw new Error(`[blog] ${file}: "draft" must be true or false.`);
  }
  if (translationKey !== undefined && typeof translationKey !== "string") {
    throw new Error(`[blog] ${file}: "translationKey" must be a string.`);
  }
  if (kicker !== undefined && typeof kicker !== "string") {
    throw new Error(`[blog] ${file}: "kicker" must be a string.`);
  }
  if (
    cover !== undefined &&
    (typeof cover !== "string" || !cover.startsWith("/"))
  ) {
    throw new Error(
      `[blog] ${file}: "cover" must be a path in /public, "/images/...".`,
    );
  }
  if (
    accent !== undefined &&
    (typeof accent !== "string" || !/^#[0-9a-f]{6}$/i.test(accent))
  ) {
    throw new Error(
      `[blog] ${file}: "accent" must be a hex colour, "#rrggbb".`,
    );
  }
  if (
    series !== undefined &&
    (typeof series !== "string" || !isSeries(series))
  ) {
    throw new Error(
      `[blog] ${file}: "series" must be a series id in src/content/series.ts.`,
    );
  }
  if (
    typeof mascot !== "boolean" &&
    !(Array.isArray(mascot) && mascot.length && mascot.every(isPietShape))
  ) {
    throw new Error(
      `[blog] ${file}: "mascot" must be true, false or a list of Piet's forms (${pietShapes.join(", ")}).`,
    );
  }
  return {
    title: title.trim(),
    description: description.trim(),
    date: toDateString(data.date, "date", file),
    updated:
      data.updated === undefined
        ? undefined
        : toDateString(data.updated, "updated", file),
    tags,
    draft,
    translationKey,
    ...(kicker ? { kicker: kicker.trim() } : {}),
    ...(accent ? { accent } : {}),
    ...(cover ? { cover } : {}),
    ...(series ? { series } : {}),
    ...(mascot ? { mascot } : {}),
  };
}

function countWords(markdown: string): number {
  const text = markdown
    .replace(/```[\s\S]*?```/g, " ") // code blocks read faster; skip them
    .replace(/<[^>]+>/g, " ")
    .replace(/[#>*_`~[\]()!-]/g, " ");
  return text.split(/\s+/).filter(Boolean).length;
}

type RawPost = { meta: PostMeta; markdown: string };

function readPostFile(lang: Locale, fileName: string): RawPost {
  const slug = fileName.replace(/\.md$/, "");
  const file = path.join("content/blog", lang, fileName);
  if (!SLUG_PATTERN.test(slug)) {
    throw new Error(`[blog] ${file}: file name must be a kebab-case slug.`);
  }
  const source = fs.readFileSync(path.join(BLOG_DIR, lang, fileName), "utf8");
  const { data, content } = matter(source);
  const frontmatter = parseFrontmatter(data, file);
  const wordCount = countWords(content);
  return {
    markdown: content.trim(),
    meta: {
      ...frontmatter,
      lang,
      slug,
      url: routes.post(lang, slug),
      wordCount,
      readingTime: Math.max(1, Math.round(wordCount / WORDS_PER_MINUTE)),
    },
  };
}

const readAll = cache((lang: Locale): RawPost[] => {
  const dir = path.join(BLOG_DIR, lang);
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((name) => name.endsWith(".md") && !name.startsWith("_"))
    .map((name) => readPostFile(lang, name))
    .filter((post) => includeDrafts || !post.meta.draft)
    .sort(
      (a, b) =>
        b.meta.date.localeCompare(a.meta.date) ||
        a.meta.slug.localeCompare(b.meta.slug),
    );
});

/** All published posts for a locale, newest first (metadata only, no HTML). */
export function getAllPosts(lang: Locale): PostMeta[] {
  return readAll(lang).map((post) => post.meta);
}

/** Slugs for `generateStaticParams`. */
export function getPostSlugs(lang: Locale): string[] {
  return getAllPosts(lang).map((post) => post.slug);
}

/** `[{ lang, slug }]` for every locale, for `generateStaticParams` at the [lang] level. */
export function getAllPostParams(): { lang: Locale; slug: string }[] {
  return locales.flatMap((lang) =>
    getPostSlugs(lang).map((slug) => ({ lang, slug })),
  );
}

/** A full post with rendered HTML, or `null` if it does not exist (call `notFound()`). */
export const getPost = cache(
  async (lang: Locale, slug: string): Promise<Post | null> => {
    if (!isLocale(lang)) return null;
    const raw = readAll(lang).find((post) => post.meta.slug === slug);
    if (!raw) return null;
    const { html, headings } = await renderMarkdown(raw.markdown, { lang });
    const feed = await renderMarkdown(raw.markdown, { lang, plain: true });
    return {
      ...raw.meta,
      html,
      feedHtml: feed.html,
      headings,
      markdown: plainScrapbookMarkdown(raw.markdown, lang),
    };
  },
);

/** Every locale version of a post (including itself), matched by `translationKey`. */
export function getPostTranslations(
  post: PostMeta,
): Partial<Record<Locale, PostMeta>> {
  const result: Partial<Record<Locale, PostMeta>> = { [post.lang]: post };
  if (!post.translationKey) return result;
  for (const lang of locales) {
    if (lang === post.lang) continue;
    const match = getAllPosts(lang).find(
      (p) => p.translationKey === post.translationKey,
    );
    if (match) result[lang] = match;
  }
  return result;
}

/**
 * Locale -> path map for hreflang alternates and the locale switcher.
 * Only locales that actually have the post are included.
 */
export function getPostAlternates(
  post: PostMeta,
): Partial<Record<Locale, string>> {
  const translations = getPostTranslations(post);
  const alternates: Partial<Record<Locale, string>> = {};
  for (const lang of locales) {
    const translated = translations[lang];
    if (translated) alternates[lang] = translated.url;
  }
  return alternates;
}

/**
 * For a slug that does not exist in `lang`, finds the same post in another
 * locale and returns the URL of its `lang` translation (or null). Lets the post
 * page redirect `/pt-br/personal/blog/hello-world` -> `/pt-br/personal/blog/ola-mundo`,
 * which happens when someone swaps the locale prefix of a post URL by hand.
 */
export function findTranslatedPostUrl(
  lang: Locale,
  slug: string,
): string | null {
  for (const other of locales) {
    if (other === lang) continue;
    const source = getAllPosts(other).find((p) => p.slug === slug);
    if (source) return getPostTranslations(source)[lang]?.url ?? null;
  }
  return null;
}

/** Newer and older neighbours of a post in the same locale. */
export function getAdjacentPosts(post: PostMeta): {
  newer?: PostMeta;
  older?: PostMeta;
} {
  const posts = getAllPosts(post.lang);
  const index = posts.findIndex((p) => p.slug === post.slug);
  if (index === -1) return {};
  return { newer: posts[index - 1], older: posts[index + 1] };
}
