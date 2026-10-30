import { jsonResponse } from "@/lib/agents/http";
import { aiCatalog } from "@/lib/agents/well-known";

/** `/.well-known/ai-catalog.json`: Agentic Resource Discovery (ARD) manifest. */
export const dynamic = "force-static";

export function GET() {
  return jsonResponse(aiCatalog());
}
