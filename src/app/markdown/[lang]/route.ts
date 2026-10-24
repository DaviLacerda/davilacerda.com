import { isLocale, locales } from "@/i18n";
import { markdownResponse } from "@/lib/agents/http";
import { workMarkdown } from "@/lib/agents/markdown";
import { routes } from "@/lib/routes";

/*
 * Internal route: the Work page as Markdown. Public URLs are `/en.md`,
 * `/en/index.md` and `/en` with `Accept: text/markdown`; `src/proxy.ts`
 * rewrites them here. Prerendered at build time.
 */
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
  return markdownResponse(workMarkdown(lang), {
    canonicalPath: routes.work(lang),
  });
}
