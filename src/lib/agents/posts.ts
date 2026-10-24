import "server-only";

import fs from "node:fs";
import path from "node:path";

import matter from "gray-matter";

import { locales, type Locale } from "@/i18n/config";
import { BLOG_DIR, getAllPosts, type PostMeta } from "@/lib/blog";

/** Post metadata plus its raw Markdown body (no HTML rendering, no Shiki). */
export type RawPost = PostMeta & { markdown: string };

const memo = new Map<Locale, RawPost[]>();
const memoize = process.env.NODE_ENV === "production";

/**
 * Published posts of a locale with their raw Markdown, newest first.
 * Metadata, validation and draft rules come from `@/lib/blog`; only the body
 * is read here, because agents want Markdown and rendering HTML would load
 * the syntax highlighter for nothing.
 */
export function getRawPosts(lang: Locale): RawPost[] {
  const cached = memoize ? memo.get(lang) : undefined;
  if (cached) return cached;
  const posts = getAllPosts(lang).map((meta) => {
    const file = path.join(BLOG_DIR, lang, `${meta.slug}.md`);
    const { content } = matter(fs.readFileSync(file, "utf8"));
    return { ...meta, markdown: content.trim() };
  });
  if (memoize) memo.set(lang, posts);
  return posts;
}

/** Every published post of every locale. */
export function getAllRawPosts(): RawPost[] {
  return locales.flatMap((lang) => getRawPosts(lang));
}

export function getRawPost(lang: Locale, slug: string): RawPost | null {
  return getRawPosts(lang).find((post) => post.slug === slug) ?? null;
}
