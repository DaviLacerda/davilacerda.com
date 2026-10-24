import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Container } from "@/components/ui/container";
import { getDictionary, isLocale } from "@/i18n";
import { buildMetadata } from "@/lib/seo";

// PLACEHOLDER: the Personal page (intro, blog list, side projects, elsewhere) is built separately.

type PageProps = { params: Promise<{ lang: string }> };

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  const dict = getDictionary(lang);
  return buildMetadata({
    lang,
    path: "/personal",
    title: dict.meta.personal.title,
    description: dict.meta.personal.description,
  });
}

export default async function PersonalPage({ params }: PageProps) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const dict = getDictionary(lang);

  return (
    <Container className="py-24">
      <h1 className="font-display text-display">{dict.nav.personal}</h1>
    </Container>
  );
}
