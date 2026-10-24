import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Container } from "@/components/ui/container";
import { getDictionary, isLocale } from "@/i18n";
import { buildMetadata } from "@/lib/seo";

// PLACEHOLDER: the Work page (hero, experience, projects, skills, FAQ...) is built separately.

type PageProps = { params: Promise<{ lang: string }> };

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  const dict = getDictionary(lang);
  return buildMetadata({
    lang,
    path: "/",
    description: dict.meta.work.description,
    type: "profile",
  });
}

export default async function WorkPage({ params }: PageProps) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const dict = getDictionary(lang);

  return (
    <Container className="py-24">
      <h1 className="font-display text-display">{dict.nav.work}</h1>
    </Container>
  );
}
