import { agentPaths } from "@/lib/agents/discovery";
import { jsonResponse } from "@/lib/agents/http";
import { apiCatalog } from "@/lib/agents/well-known";
import { absoluteUrl } from "@/lib/utils";

/** `/.well-known/api-catalog` (RFC 9727): linkset of every public, read-only API. */
export const dynamic = "force-static";

export function GET() {
  return jsonResponse(apiCatalog(), {
    contentType:
      'application/linkset+json; profile="https://www.rfc-editor.org/info/rfc9727"',
    // RFC 9727 §3: the catalog advertises itself, so a HEAD request is enough to discover it.
    headers: {
      Link: `<${absoluteUrl(agentPaths.apiCatalog)}>; rel="api-catalog"`,
    },
  });
}
