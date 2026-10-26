import "server-only";

import { siteConfig } from "@/config/site";
import { gameProfiles, steam, teams, watching } from "@/content/personal";
import {
  getCertifications,
  profile,
  type Certification,
  type Project,
} from "@/content/profile";
import {
  getDictionary,
  interpolate,
  localeMeta,
  locales,
  otherLocales,
  t,
  type Locale,
} from "@/i18n";
import { formatDate, formatDateRange, formatPartialDate } from "@/i18n/format";
import { getPostTranslations } from "@/lib/blog";
import { routes } from "@/lib/routes";
import { competitionLabel } from "@/lib/teams/types";
import { absoluteUrl } from "@/lib/utils";
import { topicCopy, topicLead } from "@/lib/work/answers";
import { topicIds, type TopicId } from "@/lib/work/topics";

import { latestPostDate, profileLastModified } from "./dates";
import {
  agentPaths,
  markdownPath,
  SKILL_NAME,
  type PageRef,
} from "./discovery";
import { getAgentLabels } from "./labels";
import { getRawPost, getRawPosts, type RawPost } from "./posts";

/*
 * Markdown renditions of the site, for agents and answer engines. Everything
 * is generated from the single source of truth (profile.ts, the UI
 * dictionaries and the raw post Markdown), so the HTML and Markdown versions
 * of a page can never disagree.
 */

/* ---------------------------------------------------------------- helpers */

type FrontmatterValue = string | number | string[] | Record<string, string>;

/** YAML front matter. JSON strings are valid YAML double-quoted scalars. */
function frontmatter(
  fields: Record<string, FrontmatterValue | undefined>,
): string {
  const lines = ["---"];
  for (const [key, value] of Object.entries(fields)) {
    if (value === undefined) continue;
    if (Array.isArray(value)) {
      lines.push(`${key}: [${value.map((v) => JSON.stringify(v)).join(", ")}]`);
    } else if (typeof value === "object") {
      lines.push(`${key}:`);
      for (const [k, v] of Object.entries(value)) {
        lines.push(`  ${k}: ${JSON.stringify(v)}`);
      }
    } else {
      lines.push(`${key}: ${JSON.stringify(value)}`);
    }
  }
  lines.push("---");
  return lines.join("\n");
}

function link(text: string, url: string): string {
  // Site paths become absolute; full URLs and `mailto:` links stay as they are.
  const href = url.startsWith("/") ? absoluteUrl(url) : url;
  return `[${text.replace(/([[\]])/g, "\\$1")}](${href})`;
}

/** Joins non-empty parts with " · ". */
function dot(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(" · ");
}

/** Joins blocks with blank lines, skipping empty ones. */
function blocks(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join("\n\n");
}

/** Makes root-relative links in post bodies absolute (agents read them out of context). */
function absolutizeLinks(markdown: string): string {
  return markdown
    .replace(/\]\((\/(?!\/)[^)\s]*)/g, `](${siteConfig.url}$1`)
    .replace(/^(\[[^\]]+\]:\s*)(\/(?!\/)\S*)/gm, `$1${siteConfig.url}$2`);
}

function alternateMarkdownUrls(page: PageRef): Record<string, string> {
  const out: Record<string, string> = {};
  for (const lang of otherLocales(page.lang)) {
    out[localeMeta[lang].hreflang] = absoluteUrl(
      markdownPath({ ...page, lang }),
    );
  }
  return out;
}

function documentFooter(page: PageRef, htmlPath: string): string {
  const lang = page.lang;
  const labels = getAgentLabels(lang).footer;
  const [other] = otherLocales(lang);
  const formats = [
    link(labels.html, htmlPath),
    page.kind !== "post" && other
      ? link(labels.otherLocale, markdownPath({ ...page, lang: other }))
      : null,
    link(labels.json, agentPaths.profileJson(lang)),
    link(
      labels.jsonResume,
      agentPaths.resume(lang === "en" ? undefined : lang),
    ),
    link(labels.mcp, agentPaths.mcp),
    link(labels.llms, agentPaths.llms),
  ];
  return blocks(
    "---",
    `## ${labels.title}`,
    interpolate(labels.note, { url: absoluteUrl(htmlPath) }),
    `${labels.otherFormats}: ${dot(...formats)}`,
  );
}

/* ------------------------------------------------------------- Work page */

function factsList(lang: Locale): string {
  const dict = getDictionary(lang);
  const labels = getAgentLabels(lang).facts;
  const current = profile.experience.find((job) => job.end === null);
  const socials = profile.socials
    .filter((social) => social.id !== "email")
    .map((social) => link(dict.socials[social.id], social.url));

  const facts: [string, string | undefined][] = [
    [
      labels.role,
      current
        ? `${t(current.role, lang)} · ${t(current.company, lang)}${
            current.start
              ? ` (${interpolate(labels.since, { date: formatPartialDate(current.start, lang) })})`
              : ""
          }`
        : t(profile.headline, lang),
    ],
    [
      labels.location,
      `${profile.location.city}, ${profile.location.region}, ${t(profile.location.country, lang)}`,
    ],
    [labels.timezone, profile.location.timezone],
    [labels.email, `[${profile.email}](mailto:${profile.email})`],
    [labels.profiles, socials.join(" · ")],
    [
      labels.languages,
      profile.languages
        .map((l) => `${t(l.name, lang)} (${t(l.level, lang)})`)
        .join(", "),
    ],
  ];
  return facts
    .filter(([, value]) => value)
    .map(([label, value]) => `- **${label}:** ${value}`)
    .join("\n");
}

function projectBlock(project: Project, lang: Locale): string {
  const dict = getDictionary(lang);
  const labels = dict.work.labels;
  const meta = dot(
    project.context,
    project.role && t(project.role, lang),
    project.year && formatPartialDate(project.year, lang),
    project.isPrivate && labels.privateProject,
  );
  return blocks(
    `### ${t(project.name, lang)}`,
    meta && `*${meta}*`,
    project.award && `**${labels.award}:** ${t(project.award, lang)}`,
    project.metric &&
      `**${project.metric.value}** ${t(project.metric.label, lang)}`,
    t(project.description, lang),
    project.stack.length > 0 &&
      `**${labels.stack}:** ${project.stack.join(", ")}`,
    project.press?.length
      ? [
          `**${dict.chat.answers.press.title}:**`,
          ...project.press.map(
            (item) =>
              `- ${link(item.title, item.url)} (${dot(item.outlet, formatPartialDate(item.date, lang), item.lang)})`,
          ),
        ].join("\n")
      : null,
  );
}

function certificationLine(cert: Certification, lang: Locale): string {
  const labels = getDictionary(lang).work.labels;
  const c = getAgentLabels(lang).certificate;
  const meta = dot(
    cert.issuer,
    cert.level && interpolate(labels.level, { level: cert.level }),
    cert.date && formatPartialDate(cert.date, lang),
  );
  const description = cert.description ? ` ${t(cert.description, lang)}` : "";
  const facts = dot(
    cert.credentialId && `${labels.credentialId}: \`${cert.credentialId}\``,
    cert.certificationNumber && `${c.number}: \`${cert.certificationNumber}\``,
    cert.expires &&
      interpolate(c.validUntil, {
        date: formatPartialDate(cert.expires, lang),
      }),
  );
  const links = dot(
    cert.image && link(c.image, cert.image.src),
    cert.credentialUrl && link(c.verify, cert.credentialUrl),
  );
  return [
    `- **${t(cert.name, lang)}** (${meta}).${description}`,
    facts && `  - ${facts}`,
    links && `  - ${links}`,
  ]
    .filter(Boolean)
    .join("\n");
}

function experienceSection(lang: Locale): string[] {
  const labels = getDictionary(lang).work.labels;
  return profile.experience.map((job) =>
    blocks(
      `### ${t(job.company, lang)} — ${t(job.role, lang)}`,
      `*${dot(
        formatDateRange(job.start, job.end, lang),
        t(job.employmentType, lang),
        t(job.workModel, lang),
        t(job.location, lang),
      )}*`,
      t(job.description, lang),
      t(job.highlights, lang)
        .map((item) => `- ${item}`)
        .join("\n"),
      job.stack.length > 0 && `**${labels.stack}:** ${job.stack.join(", ")}`,
    ),
  );
}

function skillsList(lang: Locale): string {
  return profile.skills
    .map((group) => `- **${t(group.title, lang)}:** ${group.skills.join(", ")}`)
    .join("\n");
}

function certificationsSection(lang: Locale): string[] {
  const dict = getDictionary(lang);
  const courses = getCertifications("course");
  return [
    getCertifications("certification")
      .map((cert) => certificationLine(cert, lang))
      .join("\n"),
    link(
      interpolate(dict.chat.answers.certifications.allCredentials, {
        site: profile.credentialsProfile.name,
      }),
      t(profile.credentialsProfile.url, lang),
    ),
    ...(courses.length
      ? [
          `### ${dict.work.labels.courses}`,
          courses.map((cert) => certificationLine(cert, lang)).join("\n"),
        ]
      : []),
  ];
}

function educationSection(lang: Locale): string[] {
  const labels = getDictionary(lang).work.labels;
  return profile.education.map((edu) =>
    blocks(
      `### ${t(edu.field, lang)} — ${t(edu.institution, lang)}${edu.shortName ? ` (${edu.shortName})` : ""}`,
      `*${dot(
        t(edu.degree, lang),
        formatDateRange(edu.start, edu.end, lang),
        t(edu.location, lang),
      )}*`,
      [
        edu.thesis &&
          `- **${labels.thesis}:** ${dot(
            edu.thesis.title && t(edu.thesis.title, lang),
            t(edu.thesis.description, lang),
          )}`,
        t(edu.coursework, lang).length > 0 &&
          `- **${labels.coursework}:** ${t(edu.coursework, lang).join(", ")}`,
      ]
        .filter(Boolean)
        .join("\n"),
    ),
  );
}

function languagesList(lang: Locale): string {
  return profile.languages
    .map((l) => `- **${t(l.name, lang)}:** ${t(l.level, lang)}`)
    .join("\n");
}

function achievementsList(
  lang: Locale,
  filter: (id: string) => boolean = () => true,
): string {
  const dict = getDictionary(lang);
  return profile.achievements
    .filter((item) => filter(item.id))
    .map((item) => {
      const meta = dot(
        item.issuer,
        item.date && formatPartialDate(item.date, lang),
      );
      const more = item.url ? ` ${link(dict.common.learnMore, item.url)}` : "";
      return `- **${t(item.title, lang)}**${meta ? ` (${meta})` : ""}. ${t(item.description, lang)}${more}`;
    })
    .join("\n");
}

function faqSection(lang: Locale): string[] {
  return profile.faq.map((item) =>
    blocks(`### ${t(item.question, lang)}`, t(item.answer, lang)),
  );
}

function contactList(lang: Locale): string {
  const dict = getDictionary(lang);
  const linkedin = profile.socials.find((social) => social.id === "linkedin");
  const github = profile.socials.find((social) => social.id === "github");
  return [
    `- **${dict.socials.email}:** [${profile.email}](mailto:${profile.email})`,
    linkedin &&
      `- **${dict.socials.linkedin}:** ${link(linkedin.handle, linkedin.url)}`,
    github &&
      `- **${dict.socials.github}:** ${link(github.handle, github.url)}`,
  ]
    .filter(Boolean)
    .join("\n");
}

/** The Work page as a résumé-like Markdown document. */
export function workMarkdown(lang: Locale): string {
  const dict = getDictionary(lang);
  const s = dict.work.sections;
  const page: PageRef = { kind: "work", lang };
  const htmlPath = routes.work(lang);

  return blocks(
    frontmatter({
      title: dict.meta.defaultTitle,
      description: dict.meta.work.description,
      url: absoluteUrl(htmlPath),
      lang: localeMeta[lang].htmlLang,
      updated: profileLastModified(),
      alternates: alternateMarkdownUrls(page),
    }),
    `# ${interpolate(getAgentLabels(lang).workDocTitle, {
      name: profile.name,
      headline: t(profile.headline, lang),
    })}`,
    `> ${t(profile.tldr, lang)}`,
    factsList(lang),
    `## ${s.about.title}`,
    t(profile.valueProp, lang),
    t(profile.summary, lang),
    `## ${s.highlights.title}`,
    profile.highlights
      .map((h) => `- **${t(h.value, lang)}**: ${t(h.label, lang)}`)
      .join("\n"),
    `## ${s.experience.title}`,
    ...experienceSection(lang),
    `## ${s.projects.title}`,
    ...profile.projects.map((project) => projectBlock(project, lang)),
    `## ${s.skills.title}`,
    skillsList(lang),
    `## ${s.certifications.title}`,
    ...certificationsSection(lang),
    `## ${s.education.title}`,
    ...educationSection(lang),
    `## ${s.achievements.title}`,
    achievementsList(lang),
    `## ${s.faq.title}`,
    ...faqSection(lang),
    `## ${s.contact.title}`,
    s.contact.description,
    contactList(lang),
    `## ${getAgentLabels(lang).topic.otherTopics}`,
    topicLinks(lang),
    documentFooter(page, htmlPath),
  );
}

/* ------------------------------------------------------------ Work topics */

/** Links to every Work answer, as a Markdown list. */
function topicLinks(lang: Locale, except?: TopicId): string {
  return topicIds
    .filter((id) => id !== except)
    .map((id) => {
      const copy = topicCopy(id, lang);
      return `- ${link(copy.question, markdownPath({ kind: "topic", lang, topic: id }))}: ${copy.summary}`;
    })
    .join("\n");
}

function topicBody(topic: TopicId, lang: Locale): string[] {
  const dict = getDictionary(lang);
  const s = dict.work.sections;
  const labels = dict.work.labels;
  switch (topic) {
    case "experience":
      return [
        ...experienceSection(lang),
        ...profile.projects
          .filter((p) => p.id !== "sales-copilot")
          .map((project) => projectBlock(project, lang)),
      ];
    case "sales-copilot": {
      const project = profile.projects.find((p) => p.id === "sales-copilot");
      const a = dict.chat.answers.salesCopilot;
      return [
        project ? projectBlock(project, lang) : "",
        `### ${a.builtBy}`,
        [a.layers.frontEnd, a.layers.aiTools, a.layers.backEnd]
          .map((layer) => `- **${layer.title}:** ${layer.body}`)
          .join("\n"),
        `### ${s.achievements.title}`,
        achievementsList(lang, (id) => id.startsWith("conecta-latam")),
      ];
    }
    case "certifications":
      return [
        `### ${dict.chat.answers.certifications.credentials}`,
        ...certificationsSection(lang),
      ];
    case "skills":
      return [skillsList(lang)];
    case "education":
      return [
        ...educationSection(lang),
        `### ${labels.languagesSpoken}`,
        languagesList(lang),
      ];
    case "faq":
      return faqSection(lang);
    case "contact":
      return [
        contactList(lang),
        `- **${getAgentLabels(lang).facts.timezone}:** ${profile.location.timezone} (${t(profile.location.label, lang)})`,
      ];
  }
}

/** One Work answer (`/en/work/<topic>`) as Markdown: the question, the answer and links to the others. */
export function topicMarkdown(lang: Locale, topic: TopicId): string {
  const dict = getDictionary(lang);
  const labels = getAgentLabels(lang);
  const copy = topicCopy(topic, lang);
  const page: PageRef = { kind: "topic", lang, topic };
  const htmlPath = routes.topic(lang, topic);

  return blocks(
    frontmatter({
      title: `${copy.metaTitle} | ${dict.meta.siteName}`,
      description: copy.description,
      url: absoluteUrl(htmlPath),
      lang: localeMeta[lang].htmlLang,
      updated: profileLastModified(),
      alternates: alternateMarkdownUrls(page),
    }),
    `# ${copy.title}`,
    `**${labels.topic.question}:** ${copy.question}`,
    topicLead(topic, lang),
    ...topicBody(topic, lang),
    `## ${labels.topic.otherTopics}`,
    topicLinks(lang, topic),
    documentFooter(page, htmlPath),
  );
}

/* --------------------------------------------------------- Personal page */

function postListItem(post: RawPost): string {
  const dict = getDictionary(post.lang);
  const meta = dot(
    formatDate(post.date, post.lang),
    interpolate(dict.blog.readingTime, { minutes: post.readingTime }),
  );
  return `- ${link(post.title, markdownPath({ kind: "post", lang: post.lang, slug: post.slug }))} (${meta}): ${post.description}`;
}

/**
 * The Personal page: the hello, what Davi is watching, his teams and game
 * profiles (as facts: live scores and the song playing are not part of it),
 * the blog index and social links (Spotify among them).
 */
export function personalMarkdown(lang: Locale): string {
  const dict = getDictionary(lang);
  const s = dict.personal.sections;
  const page: PageRef = { kind: "personal", lang };
  const htmlPath = routes.personal(lang);
  const posts = getRawPosts(lang);

  return blocks(
    frontmatter({
      title: `${dict.meta.personal.title} | ${dict.meta.siteName}`,
      description: dict.meta.personal.description,
      url: absoluteUrl(htmlPath),
      lang: localeMeta[lang].htmlLang,
      updated: [profileLastModified(), latestPostDate() ?? ""].sort().at(-1),
      alternates: alternateMarkdownUrls(page),
    }),
    `# ${interpolate(getAgentLabels(lang).personalTitle, { name: profile.name })}`,
    `> ${dict.meta.personal.description}`,
    `${dict.personal.intro.title} ${interpolate(dict.personal.intro.lead, { city: profile.location.city })}`,
    profile.interests.length > 0 &&
      `**${dict.personal.intro.interests}:** ${profile.interests
        .map((interest) => t(interest.label, lang))
        .join(", ")}`,
    watching.length > 0 &&
      `**${dict.personal.watching.status}:** ${watching
        .map((show) => {
          const details = [show.network, show.year].filter(Boolean).join(", ");
          return `${show.url ? link(show.title, show.url) : show.title} (${details})`;
        })
        .join("; ")}`,
    dict.personal.intro.description,
    `## ${dict.personal.teams.title}`,
    teams
      .map((team) => `- ${team.name} (${competitionLabel(team.league, lang)})`)
      .join("\n"),
    `## ${dict.personal.games.title}`,
    [
      `- **Steam:** ${link(steam.vanity, steam.url)}`,
      ...gameProfiles.map(
        (game) =>
          `- **${game.title}:** ${link(game.handle, game.url)} (${t(game.label, lang)})`,
      ),
    ].join("\n"),
    `## ${s.writing.title}`,
    s.writing.description,
    posts.length ? posts.map(postListItem).join("\n") : dict.blog.noPosts,
    `${dict.blog.rss}: ${absoluteUrl(routes.rss(lang))}`,
    `## ${s.elsewhere.title}`,
    s.elsewhere.description,
    profile.socials
      .map(
        (social) =>
          `- **${dict.socials[social.id]}:** ${link(social.handle, social.url)}`,
      )
      .join("\n"),
    documentFooter(page, htmlPath),
  );
}

/* ------------------------------------------------------------ Blog posts */

/** A blog post: front matter, title, byline and the original Markdown body. */
export function postMarkdown(post: RawPost): string {
  const dict = getDictionary(post.lang);
  const labels = getAgentLabels(post.lang);
  const page: PageRef = { kind: "post", lang: post.lang, slug: post.slug };
  const translations = Object.values(getPostTranslations(post)).filter(
    (other) => other && other.lang !== post.lang,
  );

  const translationLines = translations.map((other) =>
    interpolate(labels.post.translation, {
      link: link(
        other!.title,
        markdownPath({ kind: "post", lang: other!.lang, slug: other!.slug }),
      ),
    }),
  );

  return blocks(
    frontmatter({
      title: post.title,
      description: post.description,
      author: profile.name,
      date: post.date,
      updated: post.updated,
      lang: localeMeta[post.lang].htmlLang,
      tags: post.tags,
      url: absoluteUrl(post.url),
      reading_time: interpolate(dict.blog.readingTime, {
        minutes: post.readingTime,
      }),
      alternates: Object.fromEntries(
        translations.map((other) => [
          localeMeta[other!.lang].hreflang,
          absoluteUrl(
            markdownPath({
              kind: "post",
              lang: other!.lang,
              slug: other!.slug,
            }),
          ),
        ]),
      ),
    }),
    `# ${post.title}`,
    `> ${post.description}`,
    `*${dot(
      interpolate(labels.post.by, {
        author: link(
          profile.name,
          markdownPath({ kind: "work", lang: post.lang }),
        ),
        headline: t(profile.headline, post.lang),
      }),
      interpolate(dict.blog.publishedOn, {
        date: formatDate(post.date, post.lang),
      }),
      post.updated &&
        interpolate(dict.blog.updatedOn, {
          date: formatDate(post.updated, post.lang),
        }),
      interpolate(dict.blog.readingTime, { minutes: post.readingTime }),
    )}*`,
    absolutizeLinks(post.markdown),
    "---",
    ...translationLines,
    `${labels.post.morePosts}: ${link(dict.blog.allPosts, markdownPath({ kind: "personal", lang: post.lang }))} · ${labels.post.aboutAuthor}: ${link(profile.name, markdownPath({ kind: "work", lang: post.lang }))}`,
    documentFooter(page, post.url),
  );
}

/** Markdown for any page reference, or null when it does not exist. */
export function pageMarkdown(page: PageRef): string | null {
  if (page.kind === "work") return workMarkdown(page.lang);
  if (page.kind === "topic") return topicMarkdown(page.lang, page.topic);
  if (page.kind === "personal") return personalMarkdown(page.lang);
  const post = getRawPost(page.lang, page.slug);
  return post ? postMarkdown(post) : null;
}

/** Strips the YAML front matter (for llms-full.txt, where documents are concatenated). */
function withoutFrontmatter(markdown: string): string {
  return markdown.replace(/^---\n[\s\S]*?\n---\n+/, "");
}

/* -------------------------------------------------------------- llms.txt */

/** `/llms.txt` per https://llmstxt.org: H1, summary blockquote, then link sections. */
export function llmsTxt(): string {
  const labels = getAgentLabels("en").llms;
  const posts = locales.flatMap((lang) => getRawPosts(lang));

  const postLines = posts.map(
    (post) =>
      `- ${link(post.title, markdownPath({ kind: "post", lang: post.lang, slug: post.slug }))}: ${post.description} (${localeMeta[post.lang].label}, ${post.date})`,
  );

  return `${blocks(
    `# ${profile.name}`,
    `> ${t(profile.tldr, "en")}`,
    labels.intro,
    `## ${labels.profile}`,
    [
      `- ${link(labels.workEn, markdownPath({ kind: "work", lang: "en" }))}: ${labels.workDesc}`,
      `- ${link(labels.workPt, markdownPath({ kind: "work", lang: "pt-br" }))}: ${getDictionary("pt-br").meta.work.description}`,
      `- ${link(labels.personalEn, markdownPath({ kind: "personal", lang: "en" }))}: ${labels.personalDesc}`,
      `- ${link(labels.personalPt, markdownPath({ kind: "personal", lang: "pt-br" }))}: ${getDictionary("pt-br").meta.personal.description}`,
    ].join("\n"),
    `## ${labels.topics}`,
    labels.topicsIntro,
    topicLinks("en"),
    `## ${labels.blog}`,
    postLines.length ? postLines.join("\n") : labels.noPosts,
    `## ${labels.machine}`,
    [
      `- ${link("MCP server", agentPaths.mcp)}: Read-only Model Context Protocol server (streamable HTTP, stateless, no auth). Tools: get_profile, list_posts, get_post, search. Discovery: ${absoluteUrl(agentPaths.mcpServerCard)}`,
      `- ${link("Profile JSON", agentPaths.profileJson())}: The full profile as JSON (English; Portuguese at ${absoluteUrl(agentPaths.profileJson("pt-br"))}).`,
      `- ${link("JSON Resume", agentPaths.resume())}: The résumé in the JSON Resume v1.0.0 schema (Portuguese at ${absoluteUrl(agentPaths.resume("pt-br"))}).`,
      `- ${link("Posts JSON", agentPaths.postsJson())}: Blog post metadata for every language, with Markdown URLs.`,
      `- ${link("OpenAPI description", agentPaths.openapi)}: OpenAPI 3.1 description of the read-only HTTP API.`,
      `- ${link("API catalog", agentPaths.apiCatalog)}: RFC 9727 linkset of every public API.`,
      `- ${link("Agent skill", agentPaths.skill(SKILL_NAME))}: SKILL.md explaining how to answer questions about Davi with these sources.`,
    ].join("\n"),
    `## ${labels.optional}`,
    [
      `- ${link(labels.full, agentPaths.llmsFull)}: ${labels.fullDesc}`,
      ...locales.map(
        (lang) =>
          `- ${link(`RSS (${localeMeta[lang].label})`, routes.rss(lang))}: Blog feed.`,
      ),
      `- ${link("Sitemap", agentPaths.sitemap)}: Every HTML page with hreflang alternates.`,
    ].join("\n"),
  )}\n`;
}

/** `/llms-full.txt`: the complete profile in both languages and every post, inline. */
export function llmsFullTxt(): string {
  const sections = [
    ...locales.map((lang) => ({
      url: markdownPath({ kind: "work", lang }),
      body: workMarkdown(lang),
    })),
    ...locales.map((lang) => ({
      url: markdownPath({ kind: "personal", lang }),
      body: personalMarkdown(lang),
    })),
    ...locales.flatMap((lang) =>
      getRawPosts(lang).map((post) => ({
        url: markdownPath({ kind: "post", lang, slug: post.slug }),
        body: postMarkdown(post),
      })),
    ),
  ];

  const header = blocks(
    `# ${profile.name}: full context`,
    `> ${t(profile.tldr, "en")}`,
    `This file concatenates every Markdown page of ${siteConfig.url} (profile and personal pages in English and Brazilian Portuguese, then every blog post). Each section starts with its source URL. Index: ${absoluteUrl(agentPaths.llms)}. Last updated: ${profileLastModified()}.`,
  );

  return `${[
    header,
    ...sections.map(
      (section) =>
        `Source: ${absoluteUrl(section.url)}\n\n${withoutFrontmatter(section.body)}`,
    ),
  ].join("\n\n---\n\n")}\n`;
}
