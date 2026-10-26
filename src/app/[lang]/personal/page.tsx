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
import { tileClass, TileTitle } from "@/components/personal/parts";
import { TeamsBoard } from "@/components/personal/teams";
import { WatchingTile } from "@/components/personal/watching";
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
    keywords: [
      "Blog",
      "Spotify",
      "Uberlândia",
      ...teams.map((team) => team.name),
    ],
  });
}

/**
 * Personal tab: Davi the person, not the job, as a bento grid of tiles of
 * mixed sizes (one radius, one gap, fills only). The hello with his
 * portrait (black and white, on the page's tone) is the large tile; beside
 * it the show he is watching stands tall with its poster; under the hello,
 * what he is listening to on Spotify and his interests. Then his teams
 * across the grid (each told from his team's side), and where he plays.
 * Under the grid, the writing and where to find him online. Colour comes
 * only from pictures: the album cover, the poster, and the team, game and
 * rank marks.
 *
 * Grid: two columns on a phone (the hello, the interests, the teams and the
 * games span both; Spotify and the show sit side by side), twelve from
 * 640px (the hello across, Spotify and the interests stacked beside the
 * show), and from 1024px the hello takes eight columns of the first row.
 */
export default async function PersonalPage({ params }: PageProps) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const dict = getDictionary(lang);
  const { intro, sections } = dict.personal;
  const posts = getAllPosts(lang);
  const city = t(profile.location.city, lang);
  const spotify = getSocial("spotify");

  return (
    <Container bento className="pt-8 sm:pt-14">
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

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-12 sm:gap-4">
        <section
          aria-labelledby="personal-title"
          data-enter=""
          style={{ "--i": 0 } as CSSProperties}
          className={cn(
            tileClass,
            "col-span-2 flex flex-col justify-between gap-10 p-6 sm:col-span-12 sm:p-8 lg:col-span-8",
          )}
        >
          {profile.image ? (
            <Image
              src={profile.image}
              width={304}
              height={304}
              alt={intro.portraitAlt}
              priority
              sizes="(min-width: 640px) 6rem, 5rem"
              className="size-20 rounded-full bg-background sm:size-24"
            />
          ) : null}
          <div>
            <h1 id="personal-title" className="text-hero text-display">
              {intro.title}
            </h1>
            <p className="mt-4 max-w-[36ch] text-lead text-muted-foreground">
              {interpolate(intro.lead, { city })}
            </p>
          </div>
        </section>

        <NowPlayingCard
          profileUrl={spotify.url}
          handle={spotify.handle}
          strings={{
            ...dict.personal.listening,
            opensInNewTab: dict.a11y.opensInNewTab,
          }}
          logo={<BrandLogo id="spotify" className="size-4 sm:size-6" />}
          mark={<BrandLogo id="spotify" className="size-10" />}
          enter={1}
          className="col-span-1 sm:col-span-6 lg:col-span-4 lg:col-start-1 lg:row-start-2"
        />

        <WatchingTile
          lang={lang}
          enter={2}
          className="col-span-1 sm:col-span-6 sm:row-span-2 lg:col-span-4 lg:col-start-9 lg:row-start-1"
        />

        <Interests
          lang={lang}
          enter={3}
          className="col-span-2 sm:col-span-6 lg:col-span-4 lg:col-start-5 lg:row-start-2"
        />

        <Tile id="teams" enter={4} title={dict.personal.teams.title}>
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
          />
        </Tile>

        <Tile id="games" enter={5} title={dict.personal.games.title}>
          <Games lang={lang} />
        </Tile>
      </div>

      <PersonalSection
        id="blog"
        enter={6}
        title={sections.writing.title}
        aside={
          posts.length > 0 ? (
            <RssLink lang={lang} label={dict.blog.rss} className="text-small" />
          ) : null
        }
      >
        <PostList posts={posts} lang={lang} enter={7} />
      </PersonalSection>

      <PersonalSection
        id="elsewhere"
        enter={8}
        title={sections.elsewhere.title}
      >
        <Elsewhere lang={lang} enter={9} />
      </PersonalSection>
    </Container>
  );
}

/** A full-width tile of the grid with its own small title (`h2`): My teams, Games. */
function Tile({
  id,
  enter,
  title,
  children,
}: {
  id: string;
  /** Place in the entrance (see `Reveal`). */
  enter: number;
  title: string;
  children: ReactNode;
}) {
  return (
    <Reveal
      as="section"
      id={id}
      aria-labelledby={`${id}-title`}
      enter={enter}
      className={cn(tileClass, "col-span-2 scroll-mt-8 sm:col-span-12")}
    >
      <TileTitle as="h2" id={`${id}-title`}>
        {title}
      </TileTitle>
      {children}
    </Reveal>
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
