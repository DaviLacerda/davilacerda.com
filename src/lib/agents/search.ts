import "server-only";

import { getCertifications, profile } from "@/content/profile";
import { getDictionary, localeMeta, locales, t, type Locale } from "@/i18n";
import { formatDateRange, formatPartialDate } from "@/i18n/format";
import { routes } from "@/lib/routes";
import { absoluteUrl } from "@/lib/utils";
import type { TopicId } from "@/lib/work/topics";

import { markdownPath, type PageRef } from "./discovery";
import { getRawPosts } from "./posts";

/**
 * Tiny keyword search over the profile and the blog, for the MCP `search`
 * tool. Deterministic and dependency-free: documents are profile sections and
 * post sections; scoring is term frequency weighted by field, with accents and
 * case folded so "uberlandia" finds "Uberlândia".
 */

export type SearchDocument = {
  id: string;
  lang: Locale;
  type: "profile" | "post";
  section: string;
  title: string;
  url: string;
  markdownUrl: string;
  text: string;
};

export type SearchResult = Omit<SearchDocument, "text"> & {
  score: number;
  snippet: string;
};

const STOPWORDS = new Set(
  "a an and are as at be by de da das do dos does e em for from has have how in is it na no o of on or os para por que the to um uma what where who with".split(
    " ",
  ),
);

/** Lowercases and strips diacritics without changing string length (so indexes map back). */
function fold(text: string): string {
  let out = "";
  for (const ch of text) {
    const base = ch.normalize("NFD")[0] ?? ch;
    const lower = base.toLowerCase();
    // Keep a 1:1 length mapping with the original string.
    out += lower.length === ch.length ? lower : ch;
  }
  return out;
}

function tokenize(query: string): string[] {
  return [
    ...new Set(
      fold(query)
        .split(/[^\p{L}\p{N}+#]+/u)
        .filter((term) => term.length >= 2 && !STOPWORDS.has(term)),
    ),
  ];
}

function countOccurrences(haystack: string, needle: string): number {
  let count = 0;
  let index = haystack.indexOf(needle);
  while (index !== -1 && count < 10) {
    count += 1;
    index = haystack.indexOf(needle, index + needle.length);
  }
  return count;
}

/**
 * Each profile document points at the page that answers it best: a Work
 * answer (`/en/work/<topic>`) or, for side projects and the summary, the
 * Personal and Work pages.
 */
function profileDocuments(lang: Locale): SearchDocument[] {
  const dict = getDictionary(lang);
  const s = dict.work.sections;
  const doc = (
    id: string,
    section: string,
    title: string,
    text: string,
    where: TopicId | "work" | "personal" = "work",
  ): SearchDocument => {
    const page: PageRef =
      where === "work" || where === "personal"
        ? { kind: where, lang }
        : { kind: "topic", lang, topic: where };
    return {
      id: `profile:${lang}:${id}`,
      lang,
      type: "profile",
      section,
      title,
      url: absoluteUrl(
        page.kind === "topic"
          ? routes.topic(lang, page.topic)
          : page.kind === "personal"
            ? routes.personal(lang)
            : routes.work(lang),
      ),
      markdownUrl: absoluteUrl(markdownPath(page)),
      text,
    };
  };

  return [
    doc(
      "about",
      s.about.title,
      `${profile.name}: ${t(profile.headline, lang)}`,
      [
        t(profile.tldr, lang),
        t(profile.summary, lang),
        t(profile.valueProp, lang),
        profile.tagline,
        `${profile.location.city}, ${profile.location.region}, ${t(profile.location.country, lang)}`,
        t(profile.availability.modes, lang),
        profile.email,
        ...profile.languages.map(
          (l) => `${t(l.name, lang)} (${t(l.level, lang)})`,
        ),
        ...profile.socials.map(
          (social) => `${dict.socials[social.id]}: ${social.url}`,
        ),
      ].join("\n"),
    ),
    ...profile.experience.map((job) =>
      doc(
        `experience:${job.id}`,
        s.experience.title,
        `${t(job.role, lang)}: ${t(job.company, lang)}`,
        [
          formatDateRange(job.start, job.end, lang),
          t(job.location, lang),
          t(job.description, lang),
          ...t(job.highlights, lang),
          job.stack.join(", "),
        ].join("\n"),
        "experience",
      ),
    ),
    ...profile.projects.map((project) =>
      doc(
        `project:${project.id}`,
        s.projects.title,
        t(project.name, lang),
        [
          t(project.description, lang),
          project.context,
          project.role && t(project.role, lang),
          project.award && t(project.award, lang),
          project.stack.join(", "),
          project.repoUrl,
          project.liveUrl,
        ]
          .filter(Boolean)
          .join("\n"),
        project.id === "sales-copilot"
          ? "sales-copilot"
          : project.kind === "work"
            ? "experience"
            : "personal",
      ),
    ),
    ...profile.skills.map((group) =>
      doc(
        `skills:${group.id}`,
        s.skills.title,
        t(group.title, lang),
        group.skills.join(", "),
        "skills",
      ),
    ),
    ...getCertifications().map((cert) =>
      doc(
        `certification:${cert.id}`,
        s.certifications.title,
        t(cert.name, lang),
        [
          cert.issuer,
          cert.level,
          cert.date && formatPartialDate(cert.date, lang),
          cert.description && t(cert.description, lang),
        ]
          .filter(Boolean)
          .join("\n"),
        "certifications",
      ),
    ),
    ...profile.education.map((edu) =>
      doc(
        `education:${edu.id}`,
        s.education.title,
        `${t(edu.field, lang)}: ${t(edu.institution, lang)}`,
        [
          edu.shortName,
          t(edu.degree, lang),
          edu.thesis && t(edu.thesis.description, lang),
          t(edu.coursework, lang).join(", "),
        ]
          .filter(Boolean)
          .join("\n"),
        "education",
      ),
    ),
    ...profile.achievements.map((item) =>
      doc(
        `achievement:${item.id}`,
        s.achievements.title,
        t(item.title, lang),
        [item.issuer, t(item.description, lang)].filter(Boolean).join("\n"),
        item.id.startsWith("conecta-latam")
          ? "sales-copilot"
          : item.id.startsWith("microsoft")
            ? "certifications"
            : "work",
      ),
    ),
    ...profile.faq.map((item) =>
      doc(
        `faq:${item.id}`,
        s.faq.title,
        t(item.question, lang),
        t(item.answer, lang),
        "faq",
      ),
    ),
    doc(
      "contact",
      s.contact.title,
      `${profile.name}: ${s.contact.title}`,
      [
        s.contact.description,
        profile.email,
        t(profile.availability.modes, lang),
        ...profile.socials.map(
          (social) => `${dict.socials[social.id]}: ${social.url}`,
        ),
      ].join("\n"),
      "contact",
    ),
  ];
}

function postDocuments(lang: Locale): SearchDocument[] {
  return getRawPosts(lang).flatMap((post) => {
    const url = absoluteUrl(post.url);
    const markdownUrl = absoluteUrl(
      markdownPath({ kind: "post", lang, slug: post.slug }),
    );
    // One document per "## " section, so results point at the relevant part.
    const sections = post.markdown.split(/^(?=## )/m);
    return sections.map((chunk, index) => {
      const heading = /^## (.+)$/m.exec(chunk)?.[1]?.trim();
      return {
        id: `post:${lang}:${post.slug}:${index}`,
        lang,
        type: "post" as const,
        section: heading ?? post.title,
        title: heading ? `${post.title}: ${heading}` : post.title,
        url,
        markdownUrl,
        text:
          index === 0
            ? `${post.description}\n${post.tags.join(", ")}\n${chunk}`
            : chunk,
      };
    });
  });
}

let index: SearchDocument[] | undefined;

function getIndex(): SearchDocument[] {
  if (index && process.env.NODE_ENV === "production") return index;
  index = locales.flatMap((lang) => [
    ...profileDocuments(lang),
    ...postDocuments(lang),
  ]);
  return index;
}

function snippet(text: string, terms: string[], radius = 110): string {
  const folded = fold(text);
  const positions = terms
    .map((term) => folded.indexOf(term))
    .filter((p) => p >= 0);
  const at = positions.length ? Math.min(...positions) : 0;
  const start = Math.max(0, at - radius);
  const end = Math.min(text.length, at + radius * 2);
  const body = text.slice(start, end).replace(/\s+/g, " ").trim();
  return `${start > 0 ? "…" : ""}${body}${end < text.length ? "…" : ""}`;
}

/** Ranked matches for `query`, optionally limited to one locale. */
export function searchSite(
  query: string,
  options: { lang?: Locale; limit?: number } = {},
): SearchResult[] {
  const terms = tokenize(query);
  if (terms.length === 0) return [];
  const phrase = fold(query.trim());
  const limit = Math.min(Math.max(options.limit ?? 8, 1), 25);

  return getIndex()
    .filter((doc) => !options.lang || doc.lang === options.lang)
    .map((doc) => {
      const title = fold(doc.title);
      const text = fold(doc.text);
      let score = 0;
      let matched = 0;
      for (const term of terms) {
        const hits =
          countOccurrences(title, term) * 4 + countOccurrences(text, term);
        if (hits > 0) matched += 1;
        score += hits;
      }
      if (matched === 0) return null;
      if (terms.length > 1 && (title.includes(phrase) || text.includes(phrase)))
        score += 6;
      score *= matched / terms.length;
      const { text: raw, ...rest } = doc;
      return {
        ...rest,
        score: Math.round(score * 100) / 100,
        snippet: snippet(raw, terms),
      };
    })
    .filter((result): result is SearchResult => result !== null)
    .sort((a, b) => b.score - a.score || a.id.localeCompare(b.id))
    .slice(0, limit);
}

/** Label for a result's locale ("English" / "Português"). */
export function localeLabel(lang: Locale): string {
  return localeMeta[lang].label;
}
