import { ArrowRightIcon } from "@phosphor-icons/react/dist/ssr/ArrowRight";
import { CaretDownIcon } from "@phosphor-icons/react/dist/ssr/CaretDown";
import type {
  ComponentPropsWithoutRef,
  CSSProperties,
  ElementType,
  ReactNode,
} from "react";

import { Piece } from "@/components/chat/piece";
import { Question } from "@/components/chat/question";
import { getDictionary, type Locale } from "@/i18n";
import { cn } from "@/lib/utils";
import { topicCopy, topicLead } from "@/lib/work/answers";
import type { TopicId } from "@/lib/work/topics";

/*
 * Building blocks of the answers on the canvas. An answer is a composition,
 * not a list: one dominant visual (an ink panel, an oversized figure, a logo
 * wall, a timeline) and the few facts it carries, set in the site's
 * monochrome with the brand logos as the only colour.
 */

export type Tone = "page" | "surface" | "ink";

/**
 * The question bubble, the answer's title and the answer in words: the first
 * pieces of every answer. The lead is `topicLead()`, the factual paragraph
 * the Markdown, llms.txt and MCP serve, so search and answer engines reading
 * the HTML find the answer right under the heading, before the picture.
 */
export function AnswerHeader({
  topic,
  lang,
}: {
  topic: TopicId;
  lang: Locale;
}) {
  const dict = getDictionary(lang);
  const copy = topicCopy(topic, lang);
  return (
    <>
      <Piece i={0}>
        <Question text={copy.question} label={dict.chat.turn.you} />
      </Piece>
      <Piece
        i={1}
        as="h1"
        id="answer-title"
        tabIndex={-1}
        className="mt-6 text-answer outline-none sm:mt-8"
      >
        {copy.title}
      </Piece>
      <Piece
        i={1}
        as="p"
        className="mt-4 max-w-[62ch] text-muted-foreground sm:mt-5"
      >
        {topicLead(topic, lang)}
      </Piece>
    </>
  );
}

const panelTones: Record<Tone, string> = {
  page: "",
  surface: "bg-surface",
  ink: "bg-ink text-on-ink",
};

/**
 * A panel: one tone step from the page (`surface`) or the inverse (`ink`,
 * the emphasis of an answer). Large soft corners, no line, no shadow. A
 * container for query units, so the type inside can be sized to the panel.
 */
export function Panel<T extends ElementType = "div">({
  as,
  tone = "surface",
  className,
  children,
  ...props
}: {
  as?: T;
  tone?: Tone;
  className?: string;
  children: ReactNode;
} & Omit<ComponentPropsWithoutRef<T>, "as" | "className" | "children">) {
  const Component: ElementType = as ?? "div";
  return (
    <Component
      className={cn(
        "@container rounded-panel p-6 sm:p-8",
        panelTones[tone],
        className,
      )}
      {...props}
    >
      {children}
    </Component>
  );
}

/** Muted text for the ground a piece sits on. */
export function mutedOn(tone: Tone) {
  return tone === "ink" ? "text-on-ink-muted" : "text-muted-foreground";
}

/**
 * A font size that keeps a statement within `lines` lines of its panel:
 * sized in container query units from the text's length (Geist semibold at
 * tight tracking averages about 0.52em a character), between `min` and `max`
 * rem. Put the `@container` on the element whose width the text may fill
 * (not on a padded panel).
 */
export function fit(
  text: string,
  { max, min = 2, lines = 2 }: { max: number; min?: number; lines?: number },
): CSSProperties {
  const perLine = Math.ceil(text.length / lines) + 1;
  const cqi = 100 / (perLine * 0.52);
  return { fontSize: `clamp(${min}rem, ${cqi.toFixed(2)}cqi, ${max}rem)` };
}

/** The arrow at the corner of a linked panel; nudges on hover. */
export function PanelArrow({ className }: { className?: string }) {
  return (
    <ArrowRightIcon
      aria-hidden="true"
      className={cn(
        "size-5 shrink-0 transition-transform duration-200 ease-out group-hover:translate-x-0.5",
        className,
      )}
    />
  );
}

/** A section title inside an answer. */
export function BlockTitle({
  children,
  id,
  className,
}: {
  children: ReactNode;
  id?: string;
  className?: string;
}) {
  return (
    <h2 id={id} className={cn("text-heading", className)}>
      {children}
    </h2>
  );
}

/** A list folded behind its summary (native <details>, animated in CSS). */
export function Disclosure({
  summary,
  tone = "page",
  children,
  className,
}: {
  summary: ReactNode;
  tone?: Tone;
  children: ReactNode;
  className?: string;
}) {
  return (
    <details className={cn("disclosure group", className)}>
      <summary
        className={cn(
          "inline-flex h-9 pressable items-center gap-1.5 rounded-full pr-3 pl-4 text-small font-medium transition-colors duration-200 ease-out",
          tone === "ink"
            ? "bg-on-ink/12 hover:bg-on-ink/20"
            : tone === "surface"
              ? "bg-background hover:bg-surface-strong"
              : "bg-surface hover:bg-surface-strong",
        )}
      >
        {summary}
        <CaretDownIcon data-caret="" aria-hidden="true" className="size-4" />
      </summary>
      {children}
    </details>
  );
}
