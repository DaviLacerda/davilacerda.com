import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";

import { LocaleAlternates } from "@/components/providers/alternate-links";
import { Container } from "@/components/ui/container";
import { Prose } from "@/components/ui/prose";
import { isLocale } from "@/i18n";
import {
  findTranslatedPostUrl,
  getAllPostParams,
  getPost,
  getPostAlternates,
} from "@/lib/blog";
import { buildMetadata } from "@/lib/seo";

// PLACEHOLDER: the article layout (header, meta, TOC, JSON-LD, OG image) is built separately.

type PageProps = { params: Promise<{ lang: string; slug: string }> };

/** Unknown slugs render on demand so cross-locale slugs can redirect (see below). */
export const dynamicParams = true;

export function generateStaticParams() {
  return getAllPostParams();
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { lang, slug } = await params;
  if (!isLocale(lang)) return {};
  const post = await getPost(lang, slug);
  if (!post) return {};
  return buildMetadata({
    lang,
    title: post.title,
    description: post.description,
    alternates: getPostAlternates(post),
    type: "article",
    keywords: post.tags,
    article: {
      publishedTime: post.date,
      modifiedTime: post.updated,
      tags: post.tags,
    },
  });
}

export default async function PostPage({ params }: PageProps) {
  const { lang, slug } = await params;
  if (!isLocale(lang)) notFound();
  const post = await getPost(lang, slug);
  if (!post) {
    // e.g. /pt-br/personal/blog/hello-world -> /pt-br/personal/blog/ola-mundo
    const translated = findTranslatedPostUrl(lang, slug);
    if (translated) permanentRedirect(translated);
    notFound();
  }

  return (
    <Container as="article" size="content" className="py-24">
      <LocaleAlternates links={getPostAlternates(post)} />
      <h1 className="font-display text-h1">{post.title}</h1>
      <Prose html={post.html} className="mt-12" />
    </Container>
  );
}
