import { jsonResponse } from "@/lib/agents/http";
import { statusJson } from "@/lib/agents/json";

/** `/api/status.json`: the api-catalog `status` resource. */
export const dynamic = "force-static";

export function GET() {
  return jsonResponse(statusJson());
}
