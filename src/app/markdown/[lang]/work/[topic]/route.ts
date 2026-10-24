import { isLocale, locales } from "@/i18n";
import { markdownResponse } from "@/lib/agents/http";
import { topicMarkdown } from "@/lib/agents/markdown";
import { routes } from "@/lib/routes";
import { isTopicId, topicIds } from "@/lib/work/topics";

/*
 * Internal route: one Work answer as Markdown. Public URLs are
 * `/en/work/<topic>.md` and `/en/work/<topic>` with `Accept: text/markdown`;
 * `src/proxy.ts` rewrites them here. Prerendered at build time.
 */
export const dynamic = "force-static";
export const dynamicParams = false;

export function generateStaticParams() {
  return locales.flatMap((lang) => topicIds.map((topic) => ({ lang, topic })));
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ lang: string; topic: string }> },
) {
  const { lang, topic } = await params;
  if (!isLocale(lang) || !isTopicId(topic)) {
    return new Response("Not found", { status: 404 });
  }
  return markdownResponse(topicMarkdown(lang, topic), {
    canonicalPath: routes.topic(lang, topic),
  });
}
