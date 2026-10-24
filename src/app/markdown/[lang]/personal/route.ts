import { isLocale, locales } from "@/i18n";
import { markdownResponse } from "@/lib/agents/http";
import { personalMarkdown } from "@/lib/agents/markdown";
import { routes } from "@/lib/routes";

/** Internal route: the Personal page as Markdown (public: `/en/personal.md`, or `Accept: text/markdown`). */
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
  return markdownResponse(personalMarkdown(lang), {
    canonicalPath: routes.personal(lang),
  });
}
