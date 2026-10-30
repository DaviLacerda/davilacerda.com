import { siteConfig } from "@/config/site";
import { agentPaths, CONTENT_SIGNAL } from "@/lib/agents/discovery";
import { textResponse } from "@/lib/agents/http";
import { absoluteUrl } from "@/lib/utils";

/*
 * robots.txt as a route handler (instead of `app/robots.ts`) because the
 * metadata API cannot emit `Content-Signal` lines (https://contentsignals.org).
 * Crawlers obey only the most specific group that matches them, so every group
 * repeats the Content-Signal and the rules.
 */

export const dynamic = "force-static";

/** AI crawlers, search/answer bots and user-triggered agents, all explicitly welcome. */
const AI_AGENTS = [
  // OpenAI
  "GPTBot",
  "OAI-SearchBot",
  "ChatGPT-User",
  // Anthropic
  "ClaudeBot",
  "Claude-User",
  "Claude-SearchBot",
  "anthropic-ai",
  // Perplexity
  "PerplexityBot",
  "Perplexity-User",
  // Google, Apple, Microsoft, Amazon, Meta
  "Google-Extended",
  "Google-CloudVertexBot",
  "GoogleOther",
  "Applebot",
  "Applebot-Extended",
  "Bingbot",
  "Amazonbot",
  "meta-externalagent",
  "meta-externalfetcher",
  "FacebookBot",
  // Others
  "CCBot",
  "Bytespider",
  "DuckAssistBot",
  "MistralAI-User",
  "cohere-ai",
  "cohere-training-data-crawler",
  "YouBot",
  "AI2Bot",
  "Diffbot",
  "Timpibot",
  "PetalBot",
];

function group(agents: string[]): string {
  return [
    ...agents.map((agent) => `User-agent: ${agent}`),
    `Content-Signal: ${CONTENT_SIGNAL}`,
    "Allow: /",
  ].join("\n");
}

export function GET() {
  const body = [
    `# robots.txt for ${siteConfig.url}`,
    "#",
    "# Search engines, AI crawlers and AI agents are welcome: everything here is public.",
    "# Content Signals (https://contentsignals.org): search=yes, ai-input=yes, ai-train=yes.",
    `# Agents: ${absoluteUrl(agentPaths.llms)} (index), ${absoluteUrl(agentPaths.mcp)} (MCP),`,
    `# ${absoluteUrl(agentPaths.apiCatalog)} (API catalog). Append .md to any page for Markdown.`,
    "",
    group(["*"]),
    "",
    "# AI crawlers and agents (explicit allow)",
    group(AI_AGENTS),
    "",
    `Sitemap: ${absoluteUrl(agentPaths.sitemap)}`,
    "",
  ].join("\n");

  return textResponse(body, "text/plain; charset=utf-8");
}
