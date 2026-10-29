import "server-only";

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import {
  getProjectAchievement,
  getProjectPages,
  profile,
  type Project,
} from "@/content/profile";
import { getDictionary, interpolate, localeMeta, t, type Locale } from "@/i18n";

/*
 * Server-side helpers for the Projects tab, its pages, their Markdown and
 * their social cards. The facts come from `profile.projects`; nothing here
 * adds one.
 */

/** What a project is told by: its award, or its headline figure. */
export type ProjectHeadline =
  | {
      kind: "award";
      /** "Best AI Project in LATAM" */
      title: string;
      /** The category, as the issuer names it. */
      category?: string;
      /** "Conecta Latam Awards 2025" */
      event?: string;
      issuer?: string;
      date?: string;
      url?: string;
    }
  | { kind: "metric"; value: string; label: string };

export function projectHeadline(
  project: Project,
  lang: Locale,
): ProjectHeadline | null {
  const achievement = getProjectAchievement(project);
  if (achievement) {
    return {
      kind: "award",
      title: t(achievement.title, lang),
      category: achievement.category
        ? t(achievement.category, lang)
        : undefined,
      event: achievement.event,
      issuer: achievement.issuer,
      date: achievement.date,
      url: achievement.url,
    };
  }
  if (project.award) return { kind: "award", title: t(project.award, lang) };
  if (project.metric) {
    return {
      kind: "metric",
      value: project.metric.value,
      label: t(project.metric.label, lang),
    };
  }
  return null;
}

/**
 * The headline in one line, for titles, descriptions and Markdown: "Best AI
 * Project in LATAM, Conecta Latam Awards 2025" or "96% less time on manual
 * review".
 */
export function headlineText(headline: ProjectHeadline | null): string {
  if (!headline) return "";
  if (headline.kind === "metric") return `${headline.value} ${headline.label}`;
  return [headline.title, headline.event ?? headline.issuer]
    .filter(Boolean)
    .join(", ");
}

/** "Tele.Síntese and Mobile Time" / "Tele.Síntese e Mobile Time". */
export function listFormat(items: string[], lang: Locale): string {
  return new Intl.ListFormat(localeMeta[lang].intl, {
    style: "long",
    type: "conjunction",
  }).format(items);
}

/** The outlets that covered a project, once each, newest first. */
export function projectOutlets(project: Project): string[] {
  return [...new Set((project.press ?? []).map((item) => item.outlet))];
}

/** The page's title, description and keywords. */
export function projectMeta(project: Project, lang: Locale) {
  const p = getDictionary(lang).projects;
  const name = t(project.name, lang);
  const headline = projectHeadline(project, lang);
  const result =
    headline?.kind === "metric"
      ? headlineText(headline)
      : (headline?.title ?? "");
  const outlets = projectOutlets(project);
  const summary = project.summary ? t(project.summary, lang) : "";
  return {
    title: result ? interpolate(p.metaTitle, { name, result }) : name,
    description: interpolate(
      outlets.length ? p.metaDescription : p.metaDescriptionNoPress,
      {
        summary,
        result: headlineText(headline),
        outlets: listFormat(outlets, lang),
      },
    ).trim(),
    keywords: [
      name,
      ...(project.context ? [project.context] : []),
      ...(project.topics ?? []),
      ...project.stack,
      ...outlets,
    ],
  };
}

/** The next project with a page, after this one (wrapping around). */
export function nextProject(project: Project): Project | undefined {
  const pages = getProjectPages();
  if (pages.length < 2) return undefined;
  const index = pages.findIndex((page) => page.id === project.id);
  return pages[(index + 1) % pages.length];
}

/** Is the project's context the current employer (the JSON-LD `@id` it may share)? */
export function isCurrentEmployer(context: string | undefined): boolean {
  return Boolean(context) && context === profile.currentEmployer.name;
}

/* ------------------------------------------------------------- Demo video */

export type ProjectDemo = {
  /** Public URLs. */
  mp4: string;
  webm?: string;
  poster?: string;
  /** From the poster (PNG header), else 16:9. */
  width: number;
  height: number;
};

const PUBLIC = path.join(process.cwd(), "public");

/** Width and height from a PNG's IHDR chunk, or null. */
function pngSize(file: string): { width: number; height: number } | null {
  try {
    const head = readFileSync(file).subarray(0, 24);
    if (head.toString("latin1", 1, 4) !== "PNG") return null;
    return { width: head.readUInt32BE(16), height: head.readUInt32BE(20) };
  } catch {
    return null;
  }
}

/**
 * A project's demo video, when its files are in `public/work/<id>/`:
 * `demo.mp4` (required), `demo.webm` (optional, served first) and
 * `demo.png` (the poster; its size sets the player's aspect ratio). Checked
 * at build time, so the slot renders only once the files are committed.
 */
export function projectDemo(id: string): ProjectDemo | null {
  const base = `/work/${id}/demo`;
  const file = (ext: string) => path.join(PUBLIC, `${base}.${ext}`);
  if (!existsSync(file("mp4"))) return null;
  const size = existsSync(file("png")) ? pngSize(file("png")) : null;
  return {
    mp4: `${base}.mp4`,
    ...(existsSync(file("webm")) ? { webm: `${base}.webm` } : {}),
    ...(size ? { poster: `${base}.png` } : {}),
    width: size?.width ?? 16,
    height: size?.height ?? 9,
  };
}
