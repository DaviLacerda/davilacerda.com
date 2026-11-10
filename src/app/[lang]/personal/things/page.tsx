import { ArrowLeftIcon } from "@phosphor-icons/react/dist/ssr/ArrowLeft";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { CSSProperties } from "react";

import { JsonLd } from "@/components/seo/json-ld";
import { ThingDrawing } from "@/components/things/art";
import { ThingsWall, type WallItem } from "@/components/things/things-wall";
import { Container } from "@/components/ui/container";
import { things, thingStore } from "@/content/things";
import { getDictionary, isLocale, t, type Locale } from "@/i18n";
import { routes } from "@/lib/routes";
import {
  breadcrumbJsonLd,
  buildMetadata,
  personJsonLd,
  thingsPageJsonLd,
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
    path: "/personal/things",
    title: dict.meta.things.title,
    description: dict.meta.things.description,
    keywords: [
      ...new Set(things.flatMap((thing) => [thing.name, thing.brand])),
    ],
  });
}

/** A thing as the wall shows it, in one language. */
function wallItem(thing: (typeof things)[number], lang: Locale): WallItem {
  const url = t(thing.url, lang);
  const finish = thing.finish ? t(thing.finish, lang).toLowerCase() : null;
  return {
    id: thing.id,
    name: thing.name,
    brand: thing.brand,
    kind: [t(thing.kind, lang), finish].filter(Boolean).join(", "),
    facts: thing.facts[lang],
    url,
    store: thingStore(url),
    art: <ThingDrawing art={thing.art} />,
  };
}

/**
 * Things (`/[lang]/personal/things`): what Davi uses every day, as a wall of
 * drawings on one surface panel. A tile zooms the wall into that thing, with
 * a card that says what it is and links to its maker's page (see
 * `ThingsWall`). The list lives in `src/content/things.ts`.
 */
export default async function ThingsPage({ params }: PageProps) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const dict = getDictionary(lang);
  const copy = dict.personal.things;
  const enter = (i: number) => ({
    "data-enter": "",
    style: { "--i": i } as CSSProperties,
  });

  return (
    <Container bento className="pt-8 sm:pt-14">
      <JsonLd
        data={[
          personJsonLd(lang),
          websiteJsonLd(lang),
          thingsPageJsonLd(lang),
          breadcrumbJsonLd([
            { name: dict.meta.siteName, path: routes.work(lang) },
            { name: dict.nav.personal, path: routes.personal(lang) },
            { name: copy.title, path: routes.things(lang) },
          ]),
        ]}
      />

      <div {...enter(0)}>
        <Link
          href={routes.personal(lang)}
          className="-ml-1 inline-flex h-9 pressable items-center gap-1.5 rounded-full bg-surface pr-4 pl-3 text-small font-medium text-muted-foreground hover:bg-surface-strong hover:text-foreground"
        >
          <ArrowLeftIcon aria-hidden="true" className="size-4" />
          {copy.back}
        </Link>
      </div>

      <h1 {...enter(1)} className="mt-8 text-hero text-display sm:mt-10">
        {copy.title}
      </h1>
      <p
        {...enter(2)}
        className="mt-4 max-w-[36ch] text-lead text-muted-foreground"
      >
        {copy.lead}
      </p>

      <div {...enter(3)} className="mt-10 sm:mt-12">
        <ThingsWall
          items={things.map((thing) => wallItem(thing, lang))}
          strings={{ ...copy.wall, opensInNewTab: dict.a11y.opensInNewTab }}
        />
      </div>
    </Container>
  );
}
