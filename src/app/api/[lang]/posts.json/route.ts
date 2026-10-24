import { isLocale, locales } from "@/i18n";
import { jsonResponse } from "@/lib/agents/http";
import { postsJson } from "@/lib/agents/json";

/** `/api/en/posts.json`, `/api/pt-br/posts.json`. */
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
  return jsonResponse(postsJson(lang));
}
