"use client";

import { ArrowUpIcon } from "@phosphor-icons/react/dist/ssr/ArrowUp";
import { XIcon } from "@phosphor-icons/react/dist/ssr/X";
import { AnimatePresence } from "motion/react";
import * as m from "motion/react-m";
import { useRouter } from "next/navigation";
import {
  useId,
  useRef,
  useState,
  type CSSProperties,
  type FormEvent,
} from "react";

import { AskLink } from "@/components/chat/ask-link";
import { startTurn } from "@/components/chat/turn";
import { matchTopic, type TopicId } from "@/lib/work/topics";
import { cn } from "@/lib/utils";

export type ComposerTopic = { id: TopicId; label: string; href: string };

export type ComposerStrings = {
  label: string;
  placeholder: string;
  submit: string;
  suggestions: string;
  /** "Best match: {topic}" */
  bestMatch: string;
  noMatch: string;
  note: string;
  fallbackTitle: string;
  /** "... write to Davi at {email}." */
  fallbackBody: string;
  dismiss: string;
};

type ComposerProps = {
  /** No-JS form target (`routes.ask(lang)`); the proxy redirects `?q=` to the best topic. */
  action: string;
  topics: ComposerTopic[];
  strings: ComposerStrings;
  email: string;
  /** The topic on screen, marked `aria-current` among the suggestions. */
  current?: TopicId;
  /** Starting index for the CSS first-paint entrance (`data-enter`), when the composer is on the first screen. */
  enterFrom?: number;
  className?: string;
};

const EASE_OUT = [0.23, 1, 0.32, 1] as const;

/**
 * The Work assistant's input: a question field, the send button and the
 * suggestions. Everything is a real form and real links, so it works without
 * JavaScript (the form posts to `/[lang]/ask`, which the proxy redirects).
 *
 * With JavaScript, it reads the question as you type: the suggestion that
 * matches best fills with ink and a line under the field names it, so you
 * know where Enter will take you before you press it. Sending navigates to
 * that topic as a chat turn (see `turn.tsx`); a question with no match gets
 * an inline reply instead of a dead end. Typing never animates.
 */
export function Composer({
  action,
  topics,
  strings,
  email,
  current,
  enterFrom,
  className,
}: ComposerProps) {
  const router = useRouter();
  const id = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [unmatched, setUnmatched] = useState<string | null>(null);

  const typed = query.trim();
  const match = typed.length >= 2 ? matchTopic(typed) : null;
  const matchLabel = topics.find((topic) => topic.id === match)?.label;
  const enter = (offset: number) =>
    enterFrom === undefined
      ? {}
      : {
          "data-enter": "",
          style: { "--i": enterFrom + offset } as CSSProperties,
        };

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!typed) {
      inputRef.current?.focus();
      return;
    }
    const topic = topics.find((item) => item.id === matchTopic(typed));
    if (!topic) {
      setUnmatched(typed);
      return;
    }
    setUnmatched(null);
    startTurn(typed);
    router.push(topic.href);
  }

  const statusId = `${id}-status`;
  const noteId = `${id}-note`;

  return (
    <div className={className}>
      <div data-ui="" className="rounded-[2.5rem] bg-surface p-2" {...enter(0)}>
        <form
          action={action}
          method="get"
          onSubmit={onSubmit}
          className="relative"
        >
          <label htmlFor={`${id}-q`} className="sr-only">
            {strings.label}
          </label>
          <input
            ref={inputRef}
            id={`${id}-q`}
            name="q"
            type="text"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              if (unmatched) setUnmatched(null);
            }}
            placeholder={strings.placeholder}
            autoComplete="off"
            enterKeyHint="send"
            maxLength={200}
            aria-describedby={`${statusId} ${noteId}`}
            className="h-16 w-full rounded-full border border-transparent bg-background pr-16 pl-6 text-body text-foreground transition-[border-color] duration-150 ease-out placeholder:text-muted-foreground hover:border-border focus:border-foreground focus-visible:outline-offset-2"
          />
          <button
            type="submit"
            aria-label={strings.submit}
            title={strings.submit}
            className="absolute top-2 right-2 grid size-12 pressable place-items-center rounded-full bg-accent text-accent-foreground hover:bg-accent/90"
          >
            <ArrowUpIcon aria-hidden="true" weight="bold" className="size-5" />
          </button>
        </form>

        <p
          id={statusId}
          aria-live="polite"
          className="mt-2 min-h-6 px-4 text-small text-muted-foreground"
        >
          {typed.length >= 2 && !unmatched
            ? matchLabel
              ? strings.bestMatch.replace("{topic}", matchLabel)
              : strings.noMatch
            : ""}
        </p>

        <AnimatePresence initial={false}>
          {unmatched ? (
            <m.div
              key="fallback"
              role="status"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, transition: { duration: 0.15 } }}
              transition={{ duration: 0.2, ease: EASE_OUT }}
              className="mb-3 flex items-start gap-3 pl-4"
            >
              <div className="min-w-0 flex-1">
                <p className="font-medium">{strings.fallbackTitle}</p>
                <p className="mt-1 text-muted-foreground">
                  {strings.fallbackBody.split("{email}")[0]}
                  <a
                    href={`mailto:${email}`}
                    className="text-foreground link-underline"
                  >
                    {email}
                  </a>
                  {strings.fallbackBody.split("{email}")[1]}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setUnmatched(null);
                  inputRef.current?.focus();
                }}
                aria-label={strings.dismiss}
                title={strings.dismiss}
                className="grid size-10 shrink-0 pressable place-items-center rounded-full text-muted-foreground hover:bg-background hover:text-foreground"
              >
                <XIcon aria-hidden="true" className="size-5" />
              </button>
            </m.div>
          ) : null}
        </AnimatePresence>

        <m.nav
          layout="position"
          transition={{ duration: 0.2, ease: EASE_OUT }}
          aria-label={strings.suggestions}
          className="px-2 pb-2"
        >
          <ul className="flex flex-wrap gap-2">
            {topics.map((topic, index) => {
              const isCurrent = topic.id === current;
              const isMatch = topic.id === match && !unmatched;
              return (
                <li key={topic.id} {...enter(1 + index)}>
                  <AskLink
                    href={topic.href}
                    aria-current={isCurrent ? "page" : undefined}
                    className={cn(
                      "inline-flex h-10 pressable items-center rounded-full px-4 text-small font-medium transition-[transform]",
                      isMatch || isCurrent
                        ? "bg-foreground text-background hover:bg-foreground/85"
                        : "bg-background text-foreground hover:bg-surface-strong",
                    )}
                  >
                    {topic.label}
                  </AskLink>
                </li>
              );
            })}
          </ul>
        </m.nav>
      </div>

      <p
        id={noteId}
        className="mt-4 max-w-[60ch] px-4 text-small text-muted-foreground"
        {...enter(1 + topics.length)}
      >
        {strings.note}
      </p>
    </div>
  );
}
