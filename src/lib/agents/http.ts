import { absoluteUrl } from "@/lib/utils";

import { CONTENT_SIGNAL } from "./discovery";

/**
 * Response helpers for the agent-facing route handlers. All of these are
 * public, read-only documents, so they allow any origin (browser-based agents,
 * WebMCP, MCP inspectors) and advertise the site's Content Signals.
 */
export const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
  "Access-Control-Allow-Headers": "Accept, Content-Type",
};

/** Rough token count (≈4 characters per token) for the `x-markdown-tokens` header. */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

type Init = { status?: number; headers?: Record<string, string> };

export function textResponse(
  body: string,
  contentType: string,
  init: Init = {},
): Response {
  return new Response(body, {
    status: init.status ?? 200,
    headers: {
      "Content-Type": contentType,
      "X-Content-Type-Options": "nosniff",
      ...CORS_HEADERS,
      ...init.headers,
    },
  });
}

export function jsonResponse(
  data: unknown,
  init: Init & { contentType?: string } = {},
): Response {
  return textResponse(
    `${JSON.stringify(data, null, 2)}\n`,
    init.contentType ?? "application/json; charset=utf-8",
    init,
  );
}

/**
 * A Markdown rendition of an HTML page ("Markdown for Agents"): `Vary: Accept`
 * because the same URL can be content-negotiated, a canonical link to the HTML
 * page, an approximate token count and the Content Signals.
 */
export function markdownResponse(
  markdown: string,
  options: { canonicalPath: string; status?: number },
): Response {
  return textResponse(markdown, "text/markdown; charset=utf-8", {
    status: options.status,
    headers: {
      Vary: "Accept",
      Link: `<${absoluteUrl(options.canonicalPath)}>; rel="canonical"`,
      "x-markdown-tokens": String(estimateTokens(markdown)),
      "Content-Signal": CONTENT_SIGNAL,
    },
  });
}
