import "server-only";

import { execFileSync } from "node:child_process";

import { getAllPosts } from "@/lib/blog";
import { locales } from "@/i18n/config";

/** Files whose changes count as "the profile changed" (Work and Personal pages). */
const PROFILE_SOURCES = [
  "src/content/profile.ts",
  "src/content/personal.ts",
  "src/i18n/dictionaries",
  "src/app/[lang]/page.tsx",
  "src/app/[lang]/work",
  "src/app/[lang]/personal/page.tsx",
  "src/components/chat/answers.tsx",
  "src/lib/work",
].map((file) => `:(literal)${file}`); // "[lang]" would otherwise be a glob

let cached: string | undefined;

/** Newest publication/update date across all posts, "YYYY-MM-DD" (or undefined). */
export function latestPostDate(): string | undefined {
  return locales
    .flatMap((lang) => getAllPosts(lang))
    .map((post) => post.updated ?? post.date)
    .sort()
    .at(-1);
}

/**
 * When the profile content last changed, as "YYYY-MM-DD", for sitemap
 * `lastmod` and the Markdown front matter. Uses the last git commit touching
 * the profile sources; on shallow clones or without git it falls back to the
 * newest post date, then to the build date. Computed once per process.
 */
export function profileLastModified(): string {
  if (cached) return cached;
  let fromGit = "";
  try {
    fromGit = execFileSync(
      "git",
      ["log", "-1", "--format=%cs", "--", ...PROFILE_SOURCES],
      { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"], timeout: 3000 },
    ).trim();
  } catch {
    // No git (or not a repository): fall through.
  }
  cached = /^\d{4}-\d{2}-\d{2}$/.test(fromGit)
    ? fromGit
    : (latestPostDate() ?? new Date().toISOString().slice(0, 10));
  return cached;
}
