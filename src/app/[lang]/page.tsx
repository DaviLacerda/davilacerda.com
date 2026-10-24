import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { JsonLd } from "@/components/seo/json-ld";
import { AboutSection } from "@/components/work/about";
import { CertificationsSection } from "@/components/work/certifications";
import { ContactSection } from "@/components/work/contact";
import { EducationSection } from "@/components/work/education";
import { ExperienceTimeline } from "@/components/work/experience-timeline";
import { FaqSection } from "@/components/work/faq";
import { FeaturedWork } from "@/components/work/featured-work";
import { WorkHero } from "@/components/work/hero";
import { SkillsSection } from "@/components/work/skills";
import { getDictionary, isLocale } from "@/i18n";
import { routes } from "@/lib/routes";
import {
  breadcrumbJsonLd,
  buildMetadata,
  faqPageJsonLd,
  personJsonLd,
  profilePageJsonLd,
  websiteJsonLd,
} from "@/lib/seo";

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
    keywords: dict.work.page.keywords,
  });
}

/**
 * Work tab (home): hero, TL;DR, featured work, experience, certifications,
 * skills, education, FAQ and contact. Server-rendered and fully static; the
 * only client island is the copy-email button.
 */
export default async function WorkPage({ params }: PageProps) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const dict = getDictionary(lang);

  return (
    <>
      <JsonLd
        data={[
          personJsonLd(lang),
          websiteJsonLd(lang),
          profilePageJsonLd(lang, {
            description: dict.meta.work.description,
          }),
          faqPageJsonLd(lang),
          breadcrumbJsonLd([
            { name: dict.meta.siteName, path: routes.work(lang) },
          ]),
        ]}
      />
      <WorkHero lang={lang} />
      <AboutSection lang={lang} />
      <FeaturedWork lang={lang} />
      <ExperienceTimeline lang={lang} />
      <CertificationsSection lang={lang} />
      <SkillsSection lang={lang} />
      <EducationSection lang={lang} />
      <FaqSection lang={lang} />
      <ContactSection lang={lang} />
    </>
  );
}
