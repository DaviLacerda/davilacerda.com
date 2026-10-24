import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { CopyEmailButton } from "@/components/chat/copy-email-button";
import { Piece } from "@/components/chat/piece";
import { ButtonLink } from "@/components/ui/button";
import { profile } from "@/content/profile";
import { getDictionary, isLocale } from "@/i18n";
import { buildMetadata } from "@/lib/seo";

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
 * The composer's reply when a question matches no answer and JavaScript is
 * off: the form goes to `/[lang]/ask?q=...`, the proxy redirects a match to
 * its answer, and anything else lands here, on the canvas, with the
 * suggestions beside it. (With JavaScript the same reply appears on the
 * canvas without leaving the page.) Static and not indexed.
 */
export default async function AskPage({ params }: PageProps) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const dict = getDictionary(lang);
  const c = dict.chat.composer;
  const contact = dict.chat.answers.contact;

  return (
    <section aria-labelledby="answer-title">
      <Piece i={0} as="h1" id="answer-title" className="text-answer">
        {c.fallbackTitle}
      </Piece>
      <Piece
        i={1}
        as="p"
        className="mt-4 max-w-[36ch] text-lead text-muted-foreground"
      >
        {c.fallbackBody}
      </Piece>
      <Piece i={2} className="mt-8 flex flex-wrap gap-3">
        <ButtonLink href={`mailto:${profile.email}`} size="lg">
          {contact.emailCta}
        </ButtonLink>
        <CopyEmailButton
          email={profile.email}
          label={contact.copyEmail}
          copiedLabel={contact.copied}
        />
      </Piece>
    </section>
  );
}
