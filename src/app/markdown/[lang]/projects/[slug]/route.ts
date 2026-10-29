import { getProjectPage, getProjectPages } from "@/content/profile";
import { isLocale, locales } from "@/i18n";
import { markdownResponse } from "@/lib/agents/http";
import { projectMarkdown } from "@/lib/agents/markdown";
import { routes } from "@/lib/routes";

/**
 * Internal route: one project's page as Markdown (public:
 * `/en/projects/<slug>.md`, or `Accept: text/markdown`). Unknown slugs 404.
 */
export const dynamic = "force-static";
export const dynamicParams = false;

export function generateStaticParams() {
  return locales.flatMap((lang) =>
    getProjectPages().map((project) => ({ lang, slug: project.id })),
  );
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ lang: string; slug: string }> },
) {
  const { lang, slug } = await params;
  const project = getProjectPage(slug);
  if (!isLocale(lang) || !project) {
    return new Response("Not found", { status: 404 });
  }
  return markdownResponse(projectMarkdown(lang, project), {
    canonicalPath: routes.project(lang, project.id),
  });
}
