import { jsonResponse } from "@/lib/agents/http";
import { aiCatalog } from "@/lib/agents/well-known";

/** `/.well-known/ard.json`: the ARD manifest at its alternative path (same document as ai-catalog.json). */
export const dynamic = "force-static";

export function GET() {
  return jsonResponse(aiCatalog());
}
