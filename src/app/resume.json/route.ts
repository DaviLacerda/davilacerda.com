import { defaultLocale } from "@/i18n";
import { jsonResponse } from "@/lib/agents/http";
import { jsonResume } from "@/lib/agents/json";

/** `/resume.json`: the résumé in the JSON Resume v1.0.0 schema (English). */
export const dynamic = "force-static";

export function GET() {
  return jsonResponse(jsonResume(defaultLocale));
}
