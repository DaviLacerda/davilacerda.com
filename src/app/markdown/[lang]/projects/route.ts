import { isLocale, locales } from "@/i18n";
import { markdownResponse } from "@/lib/agents/http";
import { projectsMarkdown } from "@/lib/agents/markdown";
import { routes } from "@/lib/routes";

/** Internal route: the Projects tab as Markdown (public: `/en/projects.md`, or `Accept: text/markdown`). */
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
  return markdownResponse(projectsMarkdown(lang), {
    canonicalPath: routes.projects(lang),
  });
}
