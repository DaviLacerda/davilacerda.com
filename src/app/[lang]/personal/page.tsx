import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PostList } from "@/components/blog/post-list";
import { RssLink } from "@/components/blog/rss-link";
import { Elsewhere } from "@/components/personal/elsewhere";
import {
  PersonalHero,
  personalSectionIds,
} from "@/components/personal/personal-hero";
import { SideProjects } from "@/components/personal/side-projects";
import { JsonLd } from "@/components/seo/json-ld";
import { Section } from "@/components/ui/section";
import { getDictionary, isLocale } from "@/i18n";
import { getAllPosts } from "@/lib/blog";
import { routes } from "@/lib/routes";
import {
  blogJsonLd,
  breadcrumbJsonLd,
  buildMetadata,
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
    path: "/personal",
    title: dict.meta.personal.title,
    description: dict.meta.personal.description,
    keywords: ["Blog", "AI engineering", "Side projects"],
  });
}

export default async function PersonalPage({ params }: PageProps) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const dict = getDictionary(lang);
  const sections = dict.personal.sections;
  const posts = getAllPosts(lang);

  return (
    <>
      <JsonLd
        data={[
          personJsonLd(lang),
          websiteJsonLd(lang),
          profilePageJsonLd(lang, {
            path: routes.personal(lang),
            name: `${dict.meta.personal.title} | ${dict.meta.siteName}`,
            description: dict.meta.personal.description,
          }),
          blogJsonLd(lang, posts),
          breadcrumbJsonLd([
            { name: dict.meta.siteName, path: routes.work(lang) },
            { name: dict.nav.personal, path: routes.personal(lang) },
          ]),
        ]}
      />

      <PersonalHero lang={lang} />

      <Section
        id={personalSectionIds.writing}
        eyebrow={sections.writing.eyebrow}
        title={sections.writing.title}
        description={sections.writing.description}
        action={
          posts.length > 0 ? (
            <RssLink lang={lang} label={dict.blog.rss} />
          ) : null
        }
      >
        <PostList posts={posts} lang={lang} />
      </Section>

      <Section
        id={personalSectionIds.sideProjects}
        eyebrow={sections.sideProjects.eyebrow}
        title={sections.sideProjects.title}
        description={sections.sideProjects.description}
      >
        <SideProjects lang={lang} />
      </Section>

      <Section
        id={personalSectionIds.elsewhere}
        eyebrow={sections.elsewhere.eyebrow}
        title={sections.elsewhere.title}
        description={sections.elsewhere.description}
        className="pb-8 sm:pb-12"
      >
        <Elsewhere lang={lang} />
      </Section>
    </>
  );
}
