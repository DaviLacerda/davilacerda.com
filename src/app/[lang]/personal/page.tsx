import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { CSSProperties, ReactNode } from "react";

import { PostList } from "@/components/blog/post-list";
import { RssLink } from "@/components/blog/rss-link";
import { Widget } from "@/components/chat/widget";
import { Elsewhere } from "@/components/personal/elsewhere";
import { SideProjects } from "@/components/personal/side-projects";
import { JsonLd } from "@/components/seo/json-ld";
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
import { cn } from "@/lib/utils";

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
 * Personal tab: a reading layout. A first-person intro, then the writing
 * and the side projects, one column throughout; it closes on a panel with
 * where to find Davi online, like the Work tab closes on contact.
 */
export default async function PersonalPage({ params }: PageProps) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const dict = getDictionary(lang);
  const { intro, sections } = dict.personal;
  const posts = getAllPosts(lang);
  const city = t(profile.location.city, lang);

  return (
    <Container className="pt-10 sm:pt-20">
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
          className="text-display"
        >
          {intro.title}
        </h1>
        <div className="mt-8 max-w-[62ch] space-y-5">
          {intro.paragraphs.map((paragraph, index) => (
            <p
              key={index}
              data-enter=""
              style={{ "--i": index + 1 } as CSSProperties}
              className={cn(index === 0 && "text-lead")}
            >
              {interpolate(paragraph, { city })}
            </p>
          ))}
        </div>
      </section>

      <PersonalSection
        id="blog"
        title={sections.writing.title}
        description={sections.writing.description}
      >
        <PostList posts={posts} lang={lang} />
        {posts.length > 0 ? (
          <RssLink lang={lang} label={dict.blog.rss} className="mt-8" />
        ) : null}
      </PersonalSection>

      <PersonalSection
        id="side-projects"
        title={sections.sideProjects.title}
        description={sections.sideProjects.description}
      >
        <SideProjects lang={lang} />
      </PersonalSection>

      <section
        id="elsewhere"
        aria-labelledby="elsewhere-title"
        className="mt-28 scroll-mt-8 sm:mt-36"
      >
        <Widget className="sm:p-10">
          <h2 id="elsewhere-title" className="text-heading">
            {sections.elsewhere.title}
          </h2>
          <p className="mt-2 text-muted-foreground">
            {sections.elsewhere.description}
          </p>
          <Elsewhere lang={lang} />
        </Widget>
      </section>
    </Container>
  );
}

function PersonalSection({
  id,
  title,
  description,
  children,
}: {
  id: string;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-title`}
      className="mt-26 scroll-mt-8 pt-2 sm:mt-34"
    >
      <h2 id={`${id}-title`} className="text-heading">
        {title}
      </h2>
      <p className="mt-2 text-muted-foreground">{description}</p>
      {children}
    </section>
  );
}
