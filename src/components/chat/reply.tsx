"use client";

import { XIcon } from "@phosphor-icons/react/dist/ssr/X";

import { useAssistant } from "@/components/chat/context";
import { CopyEmailButton } from "@/components/chat/copy-email-button";
import { Piece } from "@/components/chat/piece";
import { Question } from "@/components/chat/question";
import { ButtonLink } from "@/components/ui/button";

export type ReplyStrings = {
  /** "Nothing on that yet." */
  title: string;
  /** "Pick a topic, or write to Davi." */
  body: string;
  emailCta: string;
  copyEmail: string;
  copied: string;
  /** Screen-reader prefix of the bubble, "You asked". */
  you: string;
  /** Label of the button that closes the reply. */
  dismiss: string;
  email: string;
};

/**
 * The canvas's reply to a typed question that no answer covers: the
 * question, one short line and the way to ask Davi directly. Shown by
 * `Canvas` in place of the answer (the composer announces it); `/[lang]/ask`
 * renders the same reply without JavaScript.
 */
export function Reply({
  question,
  strings,
}: {
  question: string;
  strings: ReplyStrings;
}) {
  const assistant = useAssistant();
  return (
    <section aria-labelledby="reply-title">
      <Piece i={0}>
        <Question text={question} label={strings.you} live={false} />
      </Piece>
      <Piece i={1} as="h2" id="reply-title" className="mt-8 text-answer">
        {strings.title}
      </Piece>
      <Piece
        i={2}
        as="p"
        className="mt-4 max-w-[36ch] text-lead text-muted-foreground"
      >
        {strings.body}
      </Piece>
      <Piece i={3} className="mt-8 flex flex-wrap gap-3">
        <ButtonLink href={`mailto:${strings.email}`} size="lg">
          {strings.emailCta}
        </ButtonLink>
        <CopyEmailButton
          email={strings.email}
          label={strings.copyEmail}
          copiedLabel={strings.copied}
        />
        {assistant ? (
          <button
            type="button"
            onClick={assistant.dismiss}
            aria-label={strings.dismiss}
            title={strings.dismiss}
            className="grid size-12 pressable place-items-center rounded-full text-muted-foreground hover:bg-surface hover:text-foreground"
          >
            <XIcon aria-hidden="true" className="size-5" />
          </button>
        ) : null}
      </Piece>
    </section>
  );
}
