import "server-only";

import { siteConfig } from "@/config/site";
import { getCertifications, getProjectPages, profile } from "@/content/profile";
import {
  getDictionary,
  localeMeta,
  locales,
  otherLocales,
  t,
  type Locale,
} from "@/i18n";
import { getPostAlternates } from "@/lib/blog";
import { routes } from "@/lib/routes";
import { absoluteUrl } from "@/lib/utils";

import { profileLastModified } from "./dates";
import { agentPaths, markdownPath } from "./discovery";
import { localize, type JsonValue } from "./localize";
import { getRawPosts, type RawPost } from "./posts";

/* ------------------------------------------------------------- Profile */

/** The whole profile, localized, plus links to every other representation. */
export function profileJson(lang: Locale) {
  return {
    lang: localeMeta[lang].htmlLang,
    updated: profileLastModified(),
    links: {
      self: absoluteUrl(agentPaths.profileJson(lang)),
      html: absoluteUrl(routes.work(lang)),
      markdown: absoluteUrl(markdownPath({ kind: "work", lang })),
      projects: absoluteUrl(markdownPath({ kind: "projects", lang })),
      jsonResume: absoluteUrl(agentPaths.resume(lang)),
      alternates: Object.fromEntries(
        otherLocales(lang).map((other) => [
          localeMeta[other].hreflang,
          absoluteUrl(agentPaths.profileJson(other)),
        ]),
      ),
    },
    profile: localize(profile, lang),
  };
}

/* --------------------------------------------------------------- Posts */

export function postSummary(post: RawPost) {
  return {
    slug: post.slug,
    lang: localeMeta[post.lang].htmlLang,
    title: post.title,
    description: post.description,
    date: post.date,
    ...(post.updated ? { updated: post.updated } : {}),
    tags: post.tags,
    readingTimeMinutes: post.readingTime,
    wordCount: post.wordCount,
    url: absoluteUrl(post.url),
    markdownUrl: absoluteUrl(
      markdownPath({ kind: "post", lang: post.lang, slug: post.slug }),
    ),
    ...(post.translationKey ? { translationKey: post.translationKey } : {}),
    translations: Object.fromEntries(
      Object.entries(getPostAlternates(post))
        .filter(([other]) => other !== post.lang)
        .map(([other, path]) => [
          localeMeta[other as Locale].hreflang,
          absoluteUrl(path),
        ]),
    ),
  };
}

export function postsJson(lang?: Locale) {
  const langs = lang ? [lang] : [...locales];
  return {
    ...(lang ? { lang: localeMeta[lang].htmlLang } : {}),
    links: {
      self: absoluteUrl(agentPaths.postsJson(lang)),
      feeds: Object.fromEntries(
        langs.map((l) => [localeMeta[l].hreflang, absoluteUrl(routes.rss(l))]),
      ),
    },
    posts: langs.flatMap((l) => getRawPosts(l).map(postSummary)),
  };
}

/* --------------------------------------------------------- JSON Resume */

const JSON_RESUME_SCHEMA =
  "https://raw.githubusercontent.com/jsonresume/resume-schema/v1.0.0/schema.json";

/** The résumé in the JSON Resume v1.0.0 schema (https://jsonresume.org/schema). */
export function jsonResume(lang: Locale) {
  const dict = getDictionary(lang);
  return {
    $schema: JSON_RESUME_SCHEMA,
    basics: {
      name: profile.name,
      label: t(profile.headline, lang),
      ...(profile.image ? { image: absoluteUrl(profile.image) } : {}),
      email: profile.email,
      url: absoluteUrl(routes.work(lang)),
      summary: t(profile.summary, lang),
      location: {
        city: profile.location.city,
        region: profile.location.region,
        countryCode: profile.location.countryCode,
      },
      profiles: [
        ...profile.socials
          .filter((social) => social.id !== "email")
          .map((social) => ({
            network: dict.socials[social.id],
            username: social.handle.replace(/^@|^in\//, ""),
            url: social.url,
          })),
        {
          network: profile.credentialsProfile.name,
          url: t(profile.credentialsProfile.url, lang),
        },
      ],
    },
    work: profile.experience.map((job) => ({
      name: t(job.company, lang),
      position: t(job.role, lang),
      ...(job.companyUrl ? { url: job.companyUrl } : {}),
      location: t(job.location, lang),
      ...(job.start ? { startDate: job.start } : {}),
      ...(job.end ? { endDate: job.end } : {}),
      summary: t(job.description, lang),
      highlights: t(job.highlights, lang),
    })),
    education: profile.education.map((edu) => ({
      institution: t(edu.institution, lang),
      ...(edu.url ? { url: edu.url } : {}),
      area: t(edu.field, lang),
      studyType: t(edu.degree, lang),
      ...(edu.start ? { startDate: edu.start } : {}),
      ...(edu.end ? { endDate: edu.end } : {}),
      courses: t(edu.coursework, lang),
    })),
    awards: profile.achievements.map((item) => ({
      title: t(item.title, lang),
      ...(item.date ? { date: item.date } : {}),
      ...(item.issuer ? { awarder: item.issuer } : {}),
      summary: t(item.description, lang),
    })),
    certificates: getCertifications().map((cert) => ({
      name: t(cert.name, lang),
      ...(cert.date ? { date: cert.date } : {}),
      issuer: cert.issuer,
      ...(cert.credentialUrl ? { url: cert.credentialUrl } : {}),
    })),
    skills: profile.skills.map((group) => ({
      name: t(group.title, lang),
      keywords: group.skills,
    })),
    languages: profile.languages.map((language) => ({
      language: t(language.name, lang),
      fluency: t(language.level, lang),
    })),
    projects: profile.projects.map((project) => ({
      name: t(project.name, lang),
      description: t(project.description, lang),
      highlights: [
        project.award && t(project.award, lang),
        project.metric &&
          `${project.metric.value} ${t(project.metric.label, lang)}`,
        ...(project.results ?? []).map(
          (result) => `${t(result.value, lang)} ${t(result.label, lang)}`,
        ),
      ].filter((value): value is string => Boolean(value)),
      keywords: project.stack,
      ...(project.story
        ? { url: absoluteUrl(routes.project(lang, project.id)) }
        : {}),
      ...(project.year ? { startDate: project.year } : {}),
      ...(project.role ? { roles: [t(project.role, lang)] } : {}),
      ...(project.context ? { entity: project.context } : {}),
      type: "application",
    })),
    meta: {
      canonical: absoluteUrl(
        lang === "en" ? agentPaths.resume() : agentPaths.resume(lang),
      ),
      version: "v1.0.0",
      lastModified: profileLastModified(),
    },
  };
}

/* ------------------------------------------------------------- Status */

export function statusJson() {
  return {
    status: "ok",
    service: siteConfig.url,
    description:
      "Static, read-only site. Every endpoint is served from the build output.",
    updated: profileLastModified(),
  };
}

/* ------------------------------------------------------------ OpenAPI */

const langParam: JsonValue = {
  name: "lang",
  in: "path",
  required: true,
  description: "Locale: en (English) or pt-br (Brazilian Portuguese).",
  schema: { type: "string", enum: [...locales] },
};

function getOperation(
  operationId: string,
  summary: string,
  contentType: string,
  options: {
    parameters?: JsonValue[];
    schema?: JsonValue;
    description?: string;
  } = {},
): JsonValue {
  return {
    get: {
      operationId,
      summary,
      ...(options.description ? { description: options.description } : {}),
      ...(options.parameters ? { parameters: options.parameters } : {}),
      responses: {
        "200": {
          description: "OK",
          content: {
            [contentType]: { schema: options.schema ?? { type: "string" } },
          },
        },
        ...(options.parameters ? { "404": { description: "Not found" } } : {}),
      },
    },
  };
}

/** OpenAPI 3.1 description of the public, read-only HTTP API (the api-catalog `service-desc`). */
export function openApiDocument(): JsonValue {
  const object: JsonValue = { type: "object" };
  return {
    openapi: "3.1.0",
    info: {
      title: "davilacerda.com read-only API",
      version: "1.0.0",
      summary: "Profile, résumé and blog content of Davi Lacerda, AI Engineer.",
      description:
        "Public, unauthenticated, read-only endpoints generated at build time from the site's single source of truth. Every HTML page also has a Markdown rendition (append .md or send Accept: text/markdown). A Model Context Protocol server with the same data is available at /mcp.",
      contact: {
        name: profile.name,
        email: profile.email,
        url: siteConfig.url,
      },
    },
    servers: [{ url: siteConfig.url }],
    externalDocs: {
      description:
        "Agent skill: how to answer questions about Davi with these endpoints",
      url: absoluteUrl(agentPaths.skill("about-davi-lacerda")),
    },
    paths: {
      [agentPaths.profileJson()]: getOperation(
        "getProfile",
        "Full profile (English)",
        "application/json",
        { schema: object },
      ),
      "/api/{lang}/profile.json": getOperation(
        "getLocalizedProfile",
        "Full profile in one locale",
        "application/json",
        { parameters: [langParam], schema: object },
      ),
      [agentPaths.postsJson()]: getOperation(
        "listPosts",
        "Blog posts of every locale",
        "application/json",
        { schema: object },
      ),
      "/api/{lang}/posts.json": getOperation(
        "listLocalizedPosts",
        "Blog posts of one locale",
        "application/json",
        { parameters: [langParam], schema: object },
      ),
      [agentPaths.resume()]: getOperation(
        "getResume",
        "Résumé in JSON Resume v1.0.0 format (English)",
        "application/json",
        { schema: { $ref: JSON_RESUME_SCHEMA } },
      ),
      "/api/{lang}/resume.json": getOperation(
        "getLocalizedResume",
        "Résumé in JSON Resume v1.0.0 format, one locale",
        "application/json",
        { parameters: [langParam], schema: { $ref: JSON_RESUME_SCHEMA } },
      ),
      "/{lang}.md": getOperation(
        "getWorkMarkdown",
        "Work page (résumé) as Markdown",
        "text/markdown",
        { parameters: [langParam] },
      ),
      "/{lang}/projects.md": getOperation(
        "getProjectsMarkdown",
        "Projects (results, awards, press coverage) as Markdown",
        "text/markdown",
        { parameters: [langParam] },
      ),
      "/{lang}/projects/{slug}.md": getOperation(
        "getProjectMarkdown",
        "One project's page as Markdown",
        "text/markdown",
        {
          parameters: [
            langParam,
            {
              name: "slug",
              in: "path",
              required: true,
              description: "Project id, listed in /{lang}/projects.md.",
              schema: {
                type: "string",
                enum: getProjectPages().map((project) => project.id),
              },
            },
          ],
        },
      ),
      "/{lang}/personal.md": getOperation(
        "getPersonalMarkdown",
        "Personal page (blog index, links) as Markdown",
        "text/markdown",
        { parameters: [langParam] },
      ),
      "/{lang}/personal/blog/{slug}.md": getOperation(
        "getPostMarkdown",
        "A blog post as Markdown",
        "text/markdown",
        {
          parameters: [
            langParam,
            {
              name: "slug",
              in: "path",
              required: true,
              description: "Post slug, from /api/posts.json.",
              schema: { type: "string", pattern: "^[a-z0-9]+(?:-[a-z0-9]+)*$" },
            },
          ],
        },
      ),
      "/{lang}/personal/blog/rss.xml": getOperation(
        "getFeed",
        "RSS 2.0 feed of one locale",
        "application/rss+xml",
        { parameters: [langParam] },
      ),
      [agentPaths.llms]: getOperation(
        "getLlmsTxt",
        "llms.txt index",
        "text/plain",
      ),
      [agentPaths.llmsFull]: getOperation(
        "getLlmsFullTxt",
        "Every page and post as one Markdown file",
        "text/plain",
      ),
      [agentPaths.status]: getOperation(
        "getStatus",
        "Service status",
        "application/json",
        {
          schema: object,
        },
      ),
    },
  };
}
