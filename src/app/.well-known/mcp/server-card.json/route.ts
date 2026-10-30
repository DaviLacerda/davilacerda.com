import { jsonResponse } from "@/lib/agents/http";
import { mcpServerCard } from "@/lib/agents/well-known";

/** `/.well-known/mcp/server-card.json`: MCP Server Card (SEP-1649) for the `/mcp` endpoint. */
export const dynamic = "force-static";

export function GET() {
  return jsonResponse(mcpServerCard());
}
