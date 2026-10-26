import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import type { CSSProperties, ReactNode } from "react";

import { PostList } from "@/components/blog/post-list";
import { RssLink } from "@/components/blog/rss-link";
import { Elsewhere } from "@/components/personal/elsewhere";
import { Games } from "@/components/personal/games";
import { Interests } from "@/components/personal/interests";
import { NowPlayingCard } from "@/components/personal/now-playing";
import { TeamsBoard } from "@/components/personal/teams";
import { WatchingCards } from "@/components/personal/watching";
import { JsonLd } from "@/components/seo/json-ld";
import { Reveal } from "@/components/motion/reveal";
import { Container } from "@/components/ui/container";
import { BrandLogo } from "@/components/ui/logo";
import { teams } from "@/content/personal";
import { getSocial, profile } from "@/content/profile";
import { getDictionary, interpolate, isLocale, t } from "@/i18n";
import { localeMeta } from "@/i18n/config";
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
    keywords: [
      "Blog",
      "Spotify",
      "Uberlândia",
      ...teams.map((team) => team.name),
    ],
  });
}

/**
 * Personal tab: a reading layout about Davi the person, not the job. His
 * portrait (black and white, on the page's own surface tone), a hello, one
 * warm line, his interests as a row of chips, and two cards side by side:
 * what he is listening to on Spotify and what he is watching. Then his
 * teams (live or last results), where he plays, the writing and where to
 * find him online, one column throughout. Colour comes only from pictures:
 * the album cover and the team and game logos.
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
          className="mt-8 text-hero text-display sm:mt-10"
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
          className="mt-4 grid gap-3 sm:grid-cols-2"
        >
          <NowPlayingCard
            profileUrl={spotify.url}
            handle={spotify.handle}
            strings={{
              ...dict.personal.listening,
              opensInNewTab: dict.a11y.opensInNewTab,
            }}
            logo={<BrandLogo id="spotify" className="size-6" />}
            className="sm:w-full"
          />
          <WatchingCards lang={lang} />
        </div>
      </section>

      <PersonalSection
        id="teams"
        enter={afterInterests + 1}
        title={dict.personal.teams.title}
      >
        <TeamsBoard
          teams={teams.map((team) => ({
            id: team.id,
            name: team.name,
            shortName: team.shortName,
            sport: team.sport,
            league: team.league,
            logo: team.logo,
            game: null,
          }))}
          lang={lang}
          locale={localeMeta[lang].intl}
          strings={{
            ...dict.personal.teams,
            opensInNewTab: dict.a11y.opensInNewTab,
          }}
          enter={afterInterests + 2}
        />
      </PersonalSection>

      <PersonalSection
        id="games"
        enter={afterInterests + 3}
        title={dict.personal.games.title}
      >
        <Games lang={lang} enter={afterInterests + 4} />
      </PersonalSection>

      <PersonalSection
        id="blog"
        enter={afterInterests + 5}
        title={sections.writing.title}
        aside={
          posts.length > 0 ? (
            <RssLink lang={lang} label={dict.blog.rss} className="text-small" />
          ) : null
        }
      >
        <PostList posts={posts} lang={lang} enter={afterInterests + 6} />
      </PersonalSection>

      <PersonalSection
        id="elsewhere"
        enter={afterInterests + 7}
        title={sections.elsewhere.title}
      >
        <Elsewhere lang={lang} enter={afterInterests + 8} />
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
