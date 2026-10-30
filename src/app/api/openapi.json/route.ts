import { jsonResponse } from "@/lib/agents/http";
import { openApiDocument } from "@/lib/agents/json";

/** `/api/openapi.json`: OpenAPI 3.1 description of the read-only API (api-catalog `service-desc`). */
export const dynamic = "force-static";

export function GET() {
  return jsonResponse(openApiDocument(), {
    contentType: "application/vnd.oai.openapi+json; charset=utf-8",
  });
}
