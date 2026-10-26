import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import type { CSSProperties, ReactNode } from "react";

import { PostList } from "@/components/blog/post-list";
import { RssLink } from "@/components/blog/rss-link";
import { Elsewhere } from "@/components/personal/elsewhere";
import { Interests } from "@/components/personal/interests";
import { NowPlayingCard } from "@/components/personal/now-playing";
import { JsonLd } from "@/components/seo/json-ld";
import { Reveal } from "@/components/motion/reveal";
import { Container } from "@/components/ui/container";
import { BrandLogo } from "@/components/ui/logo";
import { getSocial, profile } from "@/content/profile";
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
    keywords: ["Blog", "Spotify", "Uberlândia"],
  });
}

/**
 * Personal tab: a reading layout about Davi the person, not the job. His
 * portrait (black and white, on the page's own surface tone), a hello, one
 * warm line, his interests as a row of chips and what he is listening to on
 * Spotify (the cover is the one picture in colour); then the writing and
 * where to find him online, one column throughout.
 */
export default async function PersonalPage({ params }: PageProps) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const dict = getDictionary(lang);
  const { intro, sections } = dict.personal;
  const posts = getAllPosts(lang);
  const city = t(profile.location.city, lang);
  const spotify = getSocial("spotify");
  const afterInterests = 3 + profile.interests.length;

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
        {profile.image ? (
          <div data-enter="" style={{ "--i": 0 } as CSSProperties}>
            <Image
              src={profile.image}
              width={304}
              height={304}
              alt={intro.portraitAlt}
              priority
              sizes="(min-width: 640px) 8.5rem, 6.5rem"
              className="size-26 rounded-full bg-surface sm:size-34"
            />
          </div>
        ) : null}
        <h1
          id="personal-title"
          data-enter=""
          style={{ "--i": 1 } as CSSProperties}
          className="mt-8 text-display sm:mt-10"
        >
          {intro.title}
        </h1>
        <p
          data-enter=""
          style={{ "--i": 2 } as CSSProperties}
          className="mt-4 max-w-[40ch] text-lead text-muted-foreground"
        >
          {interpolate(intro.lead, { city })}
        </p>
        <Interests lang={lang} enter={3} className="mt-8" />
        <div
          data-enter=""
          style={{ "--i": afterInterests } as CSSProperties}
          className="mt-4"
        >
          <NowPlayingCard
            profileUrl={spotify.url}
            handle={spotify.handle}
            strings={{
              ...dict.personal.listening,
              opensInNewTab: dict.a11y.opensInNewTab,
            }}
            logo={<BrandLogo id="spotify" className="size-6" />}
          />
        </div>
      </section>

      <PersonalSection
        id="blog"
        enter={afterInterests + 1}
        title={sections.writing.title}
        aside={
          posts.length > 0 ? (
            <RssLink lang={lang} label={dict.blog.rss} className="text-small" />
          ) : null
        }
      >
        <PostList posts={posts} lang={lang} enter={afterInterests + 2} />
      </PersonalSection>

      <PersonalSection
        id="elsewhere"
        enter={afterInterests + 3}
        title={sections.elsewhere.title}
      >
        <Elsewhere lang={lang} enter={afterInterests + 4} />
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
