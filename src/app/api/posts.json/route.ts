import { jsonResponse } from "@/lib/agents/http";
import { postsJson } from "@/lib/agents/json";

/** `/api/posts.json`: post metadata for every locale, newest first per locale. */
export const dynamic = "force-static";

export function GET() {
  return jsonResponse(postsJson());
}
