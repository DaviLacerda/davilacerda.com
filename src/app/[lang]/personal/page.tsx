import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { CSSProperties, ReactNode } from "react";

import { PostList } from "@/components/blog/post-list";
import { RssLink } from "@/components/blog/rss-link";
import { Elsewhere } from "@/components/personal/elsewhere";
import { SideProjects } from "@/components/personal/side-projects";
import { JsonLd } from "@/components/seo/json-ld";
import { Reveal } from "@/components/motion/reveal";
import { Container } from "@/components/ui/container";
import { profile } from "@/content/profile";
import { getDictionary, interpolate, isLocale, t } from "@/i18n";
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

/**
 * Personal tab: a reading layout. The title and one first-person line, then
 * the writing, the side projects (with their stacks' logos) and where to find
 * Davi online, one column throughout and no panels.
 */
export default async function PersonalPage({ params }: PageProps) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const dict = getDictionary(lang);
  const { intro, sections } = dict.personal;
  const posts = getAllPosts(lang);
  const city = t(profile.location.city, lang);

  return (
    <Container className="pt-12 sm:pt-20">
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

      <section aria-labelledby="personal-title">
        <h1
          id="personal-title"
          data-enter=""
          style={{ "--i": 0 } as CSSProperties}
          className="text-hero text-display"
        >
          {intro.title}
        </h1>
        <p
          data-enter=""
          style={{ "--i": 1 } as CSSProperties}
          className="mt-4 max-w-[44ch] text-lead text-muted-foreground"
        >
          {interpolate(intro.lead, { city })}
        </p>
      </section>

      <PersonalSection
        id="blog"
        enter={2}
        title={sections.writing.title}
        aside={
          posts.length > 0 ? (
            <RssLink lang={lang} label={dict.blog.rss} className="text-small" />
          ) : null
        }
      >
        <PostList posts={posts} lang={lang} enter={3} />
      </PersonalSection>

      <PersonalSection
        id="side-projects"
        enter={4}
        title={sections.sideProjects.title}
      >
        <SideProjects lang={lang} enter={5} />
      </PersonalSection>

      <PersonalSection
        id="elsewhere"
        enter={6}
        title={sections.elsewhere.title}
      >
        <Elsewhere lang={lang} enter={7} />
      </PersonalSection>
    </Container>
  );
}

function PersonalSection({
  id,
  enter,
  title,
  aside,
  children,
}: {
  id: string;
  /** Place of the heading row in the entrance (see `Reveal`). */
  enter: number;
  title: string;
  /** A small action on the heading's line (the RSS link). */
  aside?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-title`}
      className="mt-20 scroll-mt-8 sm:mt-24"
    >
      <Reveal
        enter={enter}
        className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2"
      >
        <h2 id={`${id}-title`} className="text-heading">
          {title}
        </h2>
        {aside}
      </Reveal>
      {children}
    </section>
  );
}
