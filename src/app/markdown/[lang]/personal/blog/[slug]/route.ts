import { isLocale } from "@/i18n";
import { markdownResponse } from "@/lib/agents/http";
import { postMarkdown } from "@/lib/agents/markdown";
import { getRawPost } from "@/lib/agents/posts";
import { getAllPostParams } from "@/lib/blog";

/** Internal route: a blog post as Markdown (public: `/en/personal/blog/<slug>.md`, or `Accept: text/markdown`). */
export const dynamic = "force-static";
export const dynamicParams = false;

export function generateStaticParams() {
  return getAllPostParams();
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ lang: string; slug: string }> },
) {
  const { lang, slug } = await params;
  const post = isLocale(lang) ? getRawPost(lang, slug) : null;
  if (!post) return new Response("Not found", { status: 404 });
  return markdownResponse(postMarkdown(post), { canonicalPath: post.url });
}
