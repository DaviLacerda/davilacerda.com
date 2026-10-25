"use client";

import { ArrowUpIcon } from "@phosphor-icons/react/dist/ssr/ArrowUp";
import * as m from "motion/react-m";
import { usePathname, useRouter } from "next/navigation";
import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type FormEvent,
} from "react";

import { AskLink } from "@/components/chat/assistant";
import { useAssistant } from "@/components/chat/context";
import { matchTopic, type TopicId } from "@/lib/work/topics";
import { cn } from "@/lib/utils";

export type ComposerTopic = { id: TopicId; label: string; href: string };

export type ComposerStrings = {
  label: string;
  placeholder: string;
  submit: string;
  suggestions: string;
  /** "Best match: {topic}" (announced while typing). */
  bestMatch: string;
  noMatch: string;
  /** Announced when a sent question has no answer (the reply's title). */
  noAnswer: string;
};

type ComposerProps = {
  /** No-JS form target (`routes.ask(lang)`); the proxy redirects `?q=` to the best topic. */
  action: string;
  topics: ComposerTopic[];
  strings: ComposerStrings;
  /** Starting index for the CSS first-paint entrance (`data-enter`). */
  enterFrom?: number;
  className?: string;
};

const PILL_SPRING = { type: "spring", duration: 0.32, bounce: 0 } as const;

/**
 * The Work assistant's input: a question field with its send button and the
 * suggestions as chips. Everything is a real form and real links, so it works
 * without JavaScript (the form goes to `/[lang]/ask`, which the proxy
 * redirects to the matching answer).
 *
 * Placement: in the left pane beside the canvas from 1024px; below that, a
 * bar docked to the bottom of the screen (safe-area aware) with the chips in
 * one sideways row, like a chat app, so answers always appear above it.
 *
 * The chip of the answer on the canvas sits on an ink pill. Picking another
 * moves the pill there at once (a 320ms spring, no bounce) while the canvas
 * swaps. Typing moves it too, to the answer Enter will open, but instantly:
 * typing never animates. Sending a question with no written answer shows the
 * reply on the canvas, not under the field.
 */
export function Composer({
  action,
  topics,
  strings,
  enterFrom,
  className,
}: ComposerProps) {
  const router = useRouter();
  const pathname = usePathname();
  const assistant = useAssistant();
  const id = useId();
  const dockRef = useRef<HTMLDivElement>(null);
  const rowRef = useRef<HTMLUListElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [announcement, setAnnouncement] = useState("");

  const typed = query.trim();
  const match = typed.length >= 2 ? matchTopic(typed) : null;
  const matchLabel = topics.find((topic) => topic.id === match)?.label;
  const currentId = topics.find((topic) => topic.href === pathname)?.id;
  const pendingId = topics.find(
    (topic) => topic.href === assistant?.pendingHref,
  )?.id;
  const replyShown = Boolean(assistant?.unmatched);
  const activeId =
    match ?? pendingId ?? (replyShown ? undefined : currentId) ?? null;

  const enter = (offset: number) =>
    enterFrom === undefined
      ? {}
      : {
          "data-enter": "",
          style: { "--i": enterFrom + offset } as CSSProperties,
        };

  // The docked bar's height, so the page keeps room for it (see globals.css).
  useEffect(() => {
    const dock = dockRef.current;
    if (!dock) return;
    const root = document.documentElement;
    const observer = new ResizeObserver(() => {
      if (getComputedStyle(dock).position === "fixed") {
        root.style.setProperty("--dock-h", `${dock.offsetHeight}px`);
      } else {
        root.style.removeProperty("--dock-h");
      }
    });
    observer.observe(dock);
    return () => {
      observer.disconnect();
      root.style.removeProperty("--dock-h");
    };
  }, []);

  // In the docked row, keep the active chip in view.
  useLayoutEffect(() => {
    const row = rowRef.current;
    const chip = row?.querySelector<HTMLElement>("[data-active]");
    if (!row || !chip || row.scrollWidth <= row.clientWidth) return;
    const start = chip.offsetLeft - row.offsetLeft;
    const end = start + chip.offsetWidth;
    if (start >= row.scrollLeft && end <= row.scrollLeft + row.clientWidth)
      return;
    const smooth =
      !typed && !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    row.scrollTo({
      left: start - (row.clientWidth - chip.offsetWidth) / 2,
      behavior: smooth ? "smooth" : "instant",
    });
  }, [activeId, typed]);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!typed) {
      inputRef.current?.focus();
      return;
    }
    const topic = topics.find((item) => item.id === matchTopic(typed));
    setQuery("");
    const docked = dockRef.current
      ? getComputedStyle(dockRef.current).position === "fixed"
      : false;
    if (!topic) {
      setAnnouncement(strings.noAnswer);
      assistant?.reply(typed);
      // On a phone, close the keyboard so the reply above is in full view.
      if (docked) inputRef.current?.blur();
      return;
    }
    setAnnouncement("");
    if (
      !assistant ||
      assistant.open({ href: topic.href, question: typed, focus: true })
    ) {
      router.push(topic.href, { scroll: false });
    }
  }

  const statusId = `${id}-status`;
  const status =
    typed.length >= 2
      ? matchLabel
        ? strings.bestMatch.replace("{topic}", matchLabel)
        : strings.noMatch
      : announcement;

  return (
    <div
      ref={dockRef}
      data-dock=""
      className={cn(
        // Docked: a frosted layer, so the answer passing under it softens
        // instead of being cut.
        "fixed inset-x-0 bottom-0 z-40 bg-background/90 pt-3 pb-[max(env(safe-area-inset-bottom),0.75rem)] backdrop-blur-xl",
        "lg:static lg:z-auto lg:bg-transparent lg:p-0 lg:backdrop-blur-none",
        className,
      )}
    >
      <div className="container-wide lg:max-w-none lg:px-0">
        <form
          action={action}
          method="get"
          onSubmit={onSubmit}
          data-ui=""
          className="relative"
          {...enter(0)}
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
              setAnnouncement("");
            }}
            onKeyDown={(event) => {
              if (event.key === "Escape" && assistant?.unmatched) {
                assistant.dismiss();
              }
            }}
            placeholder={strings.placeholder}
            autoComplete="off"
            enterKeyHint="send"
            maxLength={200}
            aria-describedby={statusId}
            className="h-12 w-full rounded-full bg-surface pr-14 pl-5 text-body text-foreground transition-colors duration-200 ease-out placeholder:text-muted-foreground hover:bg-surface-strong focus-visible:outline-offset-2 lg:h-14 lg:pr-16 lg:pl-6"
          />
          <button
            type="submit"
            aria-label={strings.submit}
            title={strings.submit}
            className={cn(
              "absolute top-1.5 right-1.5 grid size-9 pressable place-items-center rounded-full lg:top-2 lg:right-2 lg:size-10",
              typed
                ? "bg-foreground text-background hover:bg-foreground/85"
                : "bg-background text-muted-foreground hover:text-foreground",
            )}
          >
            <ArrowUpIcon
              aria-hidden="true"
              weight="bold"
              className="size-4.5"
            />
          </button>
        </form>

        <p id={statusId} aria-live="polite" className="sr-only">
          {status}
        </p>

        <nav aria-label={strings.suggestions} className="mt-2.5 lg:mt-5">
          <m.ul
            ref={rowRef}
            layoutScroll
            className="isolate mx-[calc(-1*var(--gutter))] no-scrollbar flex gap-2 overflow-x-auto px-[var(--gutter)] lg:mx-0 lg:flex-wrap lg:overflow-visible lg:px-0"
          >
            {topics.map((topic, index) => {
              const isActive = topic.id === activeId;
              const isCurrent = topic.id === currentId && !replyShown;
              return (
                <li
                  key={topic.id}
                  className="shrink-0"
                  {...(isActive ? { "data-active": "" } : {})}
                  {...enter(1 + index)}
                >
                  <AskLink
                    href={topic.href}
                    aria-current={isCurrent ? "page" : undefined}
                    className={cn(
                      "group relative inline-flex h-9 pressable items-center rounded-full px-4 text-small font-medium whitespace-nowrap lg:h-10",
                      // The active chip's own fill is ink too, set once the
                      // pill has landed (it carries the colour in flight), so
                      // its label sits on a real background of its own.
                      isActive &&
                        "bg-foreground [transition:background-color_0s_320ms,transform_200ms_var(--ease-out)]",
                    )}
                  >
                    {/* The chip's own fill, under the pill. */}
                    <span
                      aria-hidden="true"
                      className="absolute inset-0 z-0 rounded-full bg-surface transition-colors duration-200 ease-out group-hover:bg-surface-strong"
                    />
                    {isActive ? (
                      <m.span
                        layoutId="chip-pill"
                        aria-hidden="true"
                        className="absolute inset-0 z-[1] rounded-full bg-foreground"
                        transition={typed ? { duration: 0 } : PILL_SPRING}
                      />
                    ) : null}
                    <span
                      className={cn(
                        "relative z-[2] transition-colors duration-200 ease-out",
                        isActive ? "text-background" : "text-foreground",
                      )}
                    >
                      {topic.label}
                    </span>
                  </AskLink>
                </li>
              );
            })}
          </m.ul>
        </nav>
      </div>
    </div>
  );
}
