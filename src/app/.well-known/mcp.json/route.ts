import { jsonResponse } from "@/lib/agents/http";
import { mcpServerCard } from "@/lib/agents/well-known";

/** `/.well-known/mcp.json`: same server card, at the alternative discovery path some clients probe. */
export const dynamic = "force-static";

export function GET() {
  return jsonResponse(mcpServerCard());
}
