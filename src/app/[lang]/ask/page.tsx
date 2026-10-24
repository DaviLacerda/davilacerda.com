import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { CSSProperties } from "react";

import { Composer } from "@/components/chat/composer";
import { Container } from "@/components/ui/container";
import { profile } from "@/content/profile";
import { getDictionary, isLocale } from "@/i18n";
import { routes } from "@/lib/routes";
import { buildMetadata } from "@/lib/seo";
import { composerStrings, composerTopics } from "@/lib/work/answers";

type PageProps = { params: Promise<{ lang: string }> };

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  const dict = getDictionary(lang);
  return buildMetadata({
    lang,
    path: "/ask",
    title: dict.meta.ask.title,
    description: dict.meta.ask.description,
    noIndex: true,
  });
}

/**
 * The composer's reply when a question matches no written answer and
 * JavaScript is off: the form posts to `/[lang]/ask?q=...`, the proxy
 * redirects a match to its topic, and anything else lands here. (With
 * JavaScript the same reply appears inline under the composer.) Static and
 * not indexed.
 */
export default async function AskPage({ params }: PageProps) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const dict = getDictionary(lang);
  const c = dict.chat.composer;
  const [before, after] = c.fallbackBody.split("{email}");

  return (
    <Container className="pt-8 sm:pt-14">
      <section aria-labelledby="ask-title">
        <h1
          id="ask-title"
          data-enter=""
          style={{ "--i": 0 } as CSSProperties}
          className="text-title"
        >
          {dict.meta.ask.title}
        </h1>
        <p
          data-enter=""
          style={{ "--i": 1 } as CSSProperties}
          className="mt-3 max-w-[52ch] text-lead text-muted-foreground"
        >
          {before}
          <a
            href={`mailto:${profile.email}`}
            className="text-foreground link-underline"
          >
            {profile.email}
          </a>
          {after}
        </p>
        <Composer
          className="mt-10"
          action={routes.ask(lang)}
          topics={composerTopics(lang)}
          strings={composerStrings(lang)}
          email={profile.email}
          enterFrom={2}
        />
      </section>
    </Container>
  );
}
