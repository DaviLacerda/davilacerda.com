import { isLocale, locales } from "@/i18n";
import { jsonResponse } from "@/lib/agents/http";
import { jsonResume } from "@/lib/agents/json";

/** `/api/en/resume.json`, `/api/pt-br/resume.json` (JSON Resume v1.0.0). */
export const dynamic = "force-static";
export const dynamicParams = false;

export function generateStaticParams() {
  return locales.map((lang) => ({ lang }));
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ lang: string }> },
) {
  const { lang } = await params;
  if (!isLocale(lang)) return new Response("Not found", { status: 404 });
  return jsonResponse(jsonResume(lang));
}
