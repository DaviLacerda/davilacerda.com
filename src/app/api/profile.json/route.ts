import { defaultLocale } from "@/i18n";
import { jsonResponse } from "@/lib/agents/http";
import { profileJson } from "@/lib/agents/json";

/** `/api/profile.json`: the full profile in the default locale (English). */
export const dynamic = "force-static";

export function GET() {
  return jsonResponse(profileJson(defaultLocale));
}
