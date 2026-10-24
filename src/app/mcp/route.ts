import {
  createMcpHandler,
  isLegacyRequest,
  WebStandardStreamableHTTPServerTransport,
} from "@modelcontextprotocol/server";

import { agentPaths, SKILL_NAME } from "@/lib/agents/discovery";
import { createSiteMcpServer } from "@/lib/agents/mcp";
import { absoluteUrl } from "@/lib/utils";

/*
 * Read-only MCP server over Streamable HTTP, stateless: every request gets a
 * fresh server from the factory, so it runs on serverless functions with no
 * session store.
 *
 * - 2026-07-28 clients (per-request envelope) go to the SDK's modern handler.
 * - 2025-era clients (`initialize` handshake, no envelope) go to a stateless
 *   transport with JSON responses, so `initialize`, `tools/list` and
 *   `tools/call` work as plain JSON-RPC POSTs (handy for curl and scanners).
 *   The SDK's built-in legacy leg would answer the same requests over SSE.
 *
 * No Origin/Host allow-list on purpose: the data is public and read-only, and
 * browser-based clients on any origin should be able to call it.
 */

export const dynamic = "force-dynamic";

const modern = createMcpHandler(() => createSiteMcpServer(), {
  // Tools answer instantly; plain JSON responses suit serverless best.
  responseMode: "json",
  legacy: "reject",
});

async function legacy(request: Request): Promise<Response> {
  if (request.method !== "POST") {
    // 2025-era GET (SSE stream) and DELETE (end session) need a session.
    return Response.json(
      {
        jsonrpc: "2.0",
        error: { code: -32000, message: "Method not allowed." },
        id: null,
      },
      { status: 405, headers: { Allow: "POST, OPTIONS" } },
    );
  }
  const server = createSiteMcpServer();
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });
  await server.connect(transport);
  try {
    return await transport.handleRequest(request);
  } finally {
    void transport.close().catch(() => {});
    void server.close().catch(() => {});
  }
}

const CORS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Accept, Authorization, Mcp-Session-Id, Mcp-Protocol-Version, Mcp-Method, Mcp-Name, Last-Event-ID",
  "Access-Control-Expose-Headers":
    "Mcp-Session-Id, Mcp-Protocol-Version, WWW-Authenticate",
};

function withCors(response: Response): Response {
  const headers = new Headers(response.headers);
  for (const [key, value] of Object.entries(CORS)) headers.set(key, value);
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

async function serve(request: Request): Promise<Response> {
  try {
    const response = (await isLegacyRequest(request))
      ? await legacy(request)
      : await modern.fetch(request);
    return withCors(response);
  } catch (error) {
    console.error("[mcp]", error);
    return withCors(
      Response.json(
        {
          jsonrpc: "2.0",
          error: { code: -32603, message: "Internal error" },
          id: null,
        },
        { status: 500 },
      ),
    );
  }
}

export function POST(request: Request) {
  return serve(request);
}

export function DELETE(request: Request) {
  return serve(request);
}

/**
 * GET opens an SSE stream in 2025-era Streamable HTTP; this stateless server
 * has none and answers 405. A browser visiting the URL gets a short
 * explanation instead of an empty error.
 */
export function GET(request: Request) {
  if ((request.headers.get("accept") ?? "").includes("text/event-stream")) {
    return serve(request);
  }
  const body = [
    "This is the Model Context Protocol endpoint of davilacerda.com (Streamable HTTP, stateless, read-only, no auth).",
    "",
    `Connect an MCP client to ${absoluteUrl(agentPaths.mcp)}. Tools: get_profile, list_posts, get_post, search.`,
    `Server card: ${absoluteUrl(agentPaths.mcpServerCard)}`,
    `How to use it: ${absoluteUrl(agentPaths.skill(SKILL_NAME))}`,
    "",
  ].join("\n");
  return withCors(
    new Response(body, {
      status: 405,
      headers: {
        Allow: "POST, DELETE, OPTIONS",
        "Content-Type": "text/plain; charset=utf-8",
      },
    }),
  );
}

export function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: { ...CORS, "Access-Control-Max-Age": "86400" },
  });
}
