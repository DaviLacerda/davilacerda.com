import "server-only";

import { McpServer, ResourceTemplate } from "@modelcontextprotocol/server";
import * as z from "zod";

import { siteConfig } from "@/config/site";
import { getProjectPage, getProjectPages, profile } from "@/content/profile";
import { locales, t, type Locale } from "@/i18n";
import { projectMeta } from "@/lib/projects";
import { absoluteUrl } from "@/lib/utils";

import { agentPaths, markdownPath } from "./discovery";
import { profileJson, postsJson } from "./json";
import {
  llmsTxt,
  personalMarkdown,
  postMarkdown,
  projectMarkdown,
  projectsMarkdown,
  workMarkdown,
} from "./markdown";
import { getRawPost, getRawPosts } from "./posts";
import { searchSite } from "./search";

/*
 * Read-only MCP server for davilacerda.com. A fresh instance is built per
 * HTTP request (stateless), see `src/app/mcp/route.ts`. The tool and resource
 * definitions below are also what the server card advertises, so discovery
 * documents and the live server cannot drift apart.
 */

export const MCP_SERVER_INFO = {
  name: "davilacerda-com",
  title: "Davi Lacerda",
  version: "1.0.0",
  description:
    "Read-only facts about Davi Lacerda, AI Engineer in Uberlândia, Brazil: profile, experience, projects, skills, certifications, education, awards, contact and blog posts, in English and Brazilian Portuguese.",
  websiteUrl: siteConfig.url,
} as const;

export const MCP_INSTRUCTIONS = [
  "Read-only server for Davi Lacerda's personal site (no authentication, no side effects).",
  "Use get_profile for verified facts: experience, projects, skills, certifications, education, awards and contact.",
  "Use search to locate a specific fact or passage; use list_posts and get_post for blog content.",
  'Every tool takes an optional `lang`: "en" (English, default) or "pt-br" (Brazilian Portuguese).',
  "Quote facts as stated. Do not infer job titles, seniority levels, dates or metrics that are not in the data.",
].join(" ");

const READ_ONLY = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false,
} as const;

const langSchema = z
  .enum(locales)
  .optional()
  .describe(
    'Content language: "en" (English, default) or "pt-br" (Brazilian Portuguese).',
  );

/** Tool input schemas, shared by the server and the server card. */
export const toolInputs = {
  get_profile: z.object({
    lang: langSchema,
    format: z
      .enum(["markdown", "json"])
      .optional()
      .describe(
        '"markdown" (default): a résumé-style document. "json": the structured profile.',
      ),
  }),
  list_posts: z.object({
    lang: z
      .enum(locales)
      .optional()
      .describe("Only posts in this language. Omit to list every language."),
  }),
  get_post: z.object({
    slug: z
      .string()
      .min(1)
      .max(120)
      .describe('Post slug from list_posts, e.g. "hello-world".'),
    lang: z
      .enum(locales)
      .optional()
      .describe(
        "Language of the post. Omit to look the slug up in every language.",
      ),
  }),
  search: z.object({
    query: z
      .string()
      .min(2)
      .max(200)
      .describe(
        'Keywords, e.g. "Sales Copilot award", "Azure certification", "RAG".',
      ),
    lang: z
      .enum(locales)
      .optional()
      .describe("Only search one language. Omit to search both."),
    limit: z
      .number()
      .int()
      .min(1)
      .max(25)
      .optional()
      .describe("Maximum results (default 8)."),
  }),
} as const;

export const toolMeta: Record<
  keyof typeof toolInputs,
  { title: string; description: string }
> = {
  get_profile: {
    title: "Get profile",
    description:
      "Davi Lacerda's complete, verified profile: headline, summary, location, experience, projects, skills, certifications, education, awards, languages, FAQ and contact.",
  },
  list_posts: {
    title: "List blog posts",
    description:
      "Blog posts (newest first) with title, description, date, tags, reading time, URLs and translations.",
  },
  get_post: {
    title: "Get blog post",
    description:
      "A blog post as Markdown, with front matter (title, date, tags, canonical URL).",
  },
  search: {
    title: "Search",
    description:
      "Keyword search across the profile (experience, projects, skills, certifications, FAQ...) and blog posts. Returns ranked snippets with source URLs.",
  },
};

/** Static resources: the Markdown and JSON documents an agent may want to attach. */
export function staticResources() {
  return [
    ...locales.flatMap((lang) => [
      {
        name: `profile-${lang}`,
        uri: absoluteUrl(markdownPath({ kind: "work", lang })),
        title: lang === "en" ? "Profile (English)" : "Perfil (Português)",
        description: "Résumé-style profile as Markdown.",
        mimeType: "text/markdown",
        read: () => workMarkdown(lang),
      },
      {
        name: `projects-${lang}`,
        uri: absoluteUrl(markdownPath({ kind: "projects", lang })),
        title: lang === "en" ? "Projects (English)" : "Projetos (Português)",
        description:
          "Every project with its result, award and the press that covered it, as Markdown.",
        mimeType: "text/markdown",
        read: () => projectsMarkdown(lang),
      },
      {
        name: `personal-${lang}`,
        uri: absoluteUrl(markdownPath({ kind: "personal", lang })),
        title:
          lang === "en"
            ? "Personal page (English)"
            : "Página pessoal (Português)",
        description: "Blog index and social links as Markdown.",
        mimeType: "text/markdown",
        read: () => personalMarkdown(lang),
      },
    ]),
    {
      name: "llms-txt",
      uri: absoluteUrl(agentPaths.llms),
      title: "llms.txt",
      description: "Index of every machine-readable resource on the site.",
      mimeType: "text/plain",
      read: () => llmsTxt(),
    },
  ];
}

export const POST_RESOURCE_TEMPLATE = `${siteConfig.url}/{lang}/personal/blog/{slug}.md`;
export const PROJECT_RESOURCE_TEMPLATE = `${siteConfig.url}/{lang}/projects/{slug}.md`;

function text(value: string) {
  return { content: [{ type: "text" as const, text: value }] };
}

function json<T extends Record<string, unknown>>(value: T) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(value, null, 2) }],
    structuredContent: value,
  };
}

function pickLang(value: string | undefined): Locale {
  return value === "pt-br" ? "pt-br" : "en";
}

/**
 * Declared up front so the SDK keeps them as-is (it defaults `listChanged` to
 * true when the first tool registers). The tool set is static and the server
 * is stateless, so nothing ever changes mid-session. Shared with the server card.
 */
export const MCP_CAPABILITIES = {
  tools: { listChanged: false },
  resources: { subscribe: false, listChanged: false },
  prompts: { listChanged: false },
} as const;

/** Builds the server. Called once per request by the /mcp route. */
export function createSiteMcpServer(): McpServer {
  const server = new McpServer(
    {
      name: MCP_SERVER_INFO.name,
      title: MCP_SERVER_INFO.title,
      version: MCP_SERVER_INFO.version,
      description: MCP_SERVER_INFO.description,
      websiteUrl: MCP_SERVER_INFO.websiteUrl,
      icons: [
        {
          src: absoluteUrl("/icons/icon-512.png"),
          mimeType: "image/png",
          sizes: ["512x512"],
        },
      ],
    },
    {
      instructions: MCP_INSTRUCTIONS,
      capabilities: {
        tools: { ...MCP_CAPABILITIES.tools },
        resources: { ...MCP_CAPABILITIES.resources },
        prompts: { ...MCP_CAPABILITIES.prompts },
      },
    },
  );

  server.registerTool(
    "get_profile",
    {
      ...toolMeta.get_profile,
      inputSchema: toolInputs.get_profile,
      annotations: READ_ONLY,
    },
    async ({ lang, format }) => {
      const locale = pickLang(lang);
      return format === "json"
        ? json(profileJson(locale))
        : text(workMarkdown(locale));
    },
  );

  server.registerTool(
    "list_posts",
    {
      ...toolMeta.list_posts,
      inputSchema: toolInputs.list_posts,
      annotations: READ_ONLY,
    },
    async ({ lang }) => json(postsJson(lang)),
  );

  server.registerTool(
    "get_post",
    {
      ...toolMeta.get_post,
      inputSchema: toolInputs.get_post,
      annotations: READ_ONLY,
    },
    async ({ slug, lang }) => {
      const langs = lang ? [lang] : [...locales];
      for (const l of langs) {
        const post = getRawPost(l, slug);
        if (post) return text(postMarkdown(post));
      }
      const available = langs
        .flatMap((l) => getRawPosts(l).map((post) => `${post.slug} (${l})`))
        .join(", ");
      return {
        ...text(
          `No post "${slug}"${lang ? ` in ${lang}` : ""}. Available: ${available || "none"}.`,
        ),
        isError: true,
      };
    },
  );

  server.registerTool(
    "search",
    {
      ...toolMeta.search,
      inputSchema: toolInputs.search,
      annotations: READ_ONLY,
    },
    async ({ query, lang, limit }) => {
      const results = searchSite(query, { lang, limit });
      return json({ query, total: results.length, results });
    },
  );

  for (const resource of staticResources()) {
    server.registerResource(
      resource.name,
      resource.uri,
      {
        title: resource.title,
        description: resource.description,
        mimeType: resource.mimeType,
      },
      async (uri) => ({
        contents: [
          { uri: uri.href, mimeType: resource.mimeType, text: resource.read() },
        ],
      }),
    );
  }

  server.registerResource(
    "blog-post",
    new ResourceTemplate(POST_RESOURCE_TEMPLATE, {
      list: async () => ({
        resources: locales.flatMap((lang) =>
          getRawPosts(lang).map((post) => ({
            uri: absoluteUrl(
              markdownPath({ kind: "post", lang, slug: post.slug }),
            ),
            name: `${lang}/${post.slug}`,
            title: post.title,
            description: post.description,
            mimeType: "text/markdown",
          })),
        ),
      }),
    }),
    {
      title: "Blog post",
      description:
        "Any blog post as Markdown: {lang} is en or pt-br, {slug} comes from list_posts.",
      mimeType: "text/markdown",
    },
    async (uri, variables) => {
      const lang = pickLang(String(variables.lang));
      const post = getRawPost(lang, String(variables.slug));
      if (!post) throw new Error(`Unknown post: ${uri.href}`);
      return {
        contents: [
          {
            uri: uri.href,
            mimeType: "text/markdown",
            text: postMarkdown(post),
          },
        ],
      };
    },
  );

  server.registerResource(
    "project",
    new ResourceTemplate(PROJECT_RESOURCE_TEMPLATE, {
      list: async () => ({
        resources: locales.flatMap((lang) =>
          getProjectPages().map((project) => ({
            uri: absoluteUrl(
              markdownPath({ kind: "project", lang, slug: project.id }),
            ),
            name: `${lang}/${project.id}`,
            title: t(project.name, lang),
            description: projectMeta(project, lang).description,
            mimeType: "text/markdown",
          })),
        ),
      }),
    }),
    {
      title: "Project",
      description:
        "A project's page as Markdown (result, problem, what it does, how it's built, press): {lang} is en or pt-br, {slug} is a project id such as sales-copilot.",
      mimeType: "text/markdown",
    },
    async (uri, variables) => {
      const lang = pickLang(String(variables.lang));
      const project = getProjectPage(String(variables.slug));
      if (!project) throw new Error(`Unknown project: ${uri.href}`);
      return {
        contents: [
          {
            uri: uri.href,
            mimeType: "text/markdown",
            text: projectMarkdown(lang, project),
          },
        ],
      };
    },
  );

  server.registerPrompt(
    "assess_fit",
    {
      title: "Assess fit for a role",
      description:
        "Compare a job description with Davi Lacerda's verified profile and summarize the fit, citing only listed facts.",
      argsSchema: z.object({
        job_description: z
          .string()
          .min(20)
          .max(20_000)
          .describe("The role to assess."),
        lang: langSchema,
      }),
    },
    ({ job_description, lang }) => {
      const locale = pickLang(lang);
      return {
        messages: [
          {
            role: "user" as const,
            content: {
              type: "resource" as const,
              resource: {
                uri: absoluteUrl(markdownPath({ kind: "work", lang: locale })),
                mimeType: "text/markdown",
                text: workMarkdown(locale),
              },
            },
          },
          {
            role: "user" as const,
            content: {
              type: "text" as const,
              text: `Using only the profile above, assess how ${profile.name} (${t(profile.headline, locale)}) fits this role. List matching evidence, gaps and questions to ask him. Do not invent titles, dates or metrics.\n\nRole:\n${job_description}`,
            },
          },
        ],
      };
    },
  );

  return server;
}
