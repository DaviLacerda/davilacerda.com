"use client";

import * as m from "motion/react-m";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";

import { markClientNavigation } from "@/components/motion/motion-provider";

/*
 * The chat turn: what happens on screen when a visitor picks a suggestion or
 * sends a question. The question bubble arrives first (200ms), then the
 * answer's parts in order, 60ms apart, each rising 10px over 320ms; all
 * ease-out (cubic-bezier(0.23, 1, 0.32, 1)). Only transform and opacity, so
 * a new turn interrupts an old one cleanly.
 *
 * It plays only after an in-site navigation that the composer started. A
 * page opened directly (a search result, a shared link, back/forward) is
 * server-rendered and shown as it is; the CSS first-paint entrance covers
 * direct loads.
 */

type PendingTurn = { question?: string };

let pendingTurn: PendingTurn | null = null;

/**
 * Called by the composer right before it navigates to a topic. `question` is
 * what the visitor typed (shown in the bubble instead of the stock question).
 */
export function startTurn(question?: string) {
  pendingTurn = { question };
  markClientNavigation();
}

const TurnContext = createContext<PendingTurn | null>(null);

/** Wraps one answer page. Reads the pending turn once and moves focus to the answer. */
export function TurnProvider({
  children,
  focusId,
}: {
  children: ReactNode;
  /** Id of the answer heading, focused after a composer navigation. */
  focusId: string;
}) {
  const [turn] = useState(() => pendingTurn);

  useEffect(() => {
    pendingTurn = null;
    if (!turn) return;
    document.getElementById(focusId)?.focus({ preventScroll: true });
  }, [turn, focusId]);

  return <TurnContext value={turn}>{children}</TurnContext>;
}

const EASE_OUT = [0.23, 1, 0.32, 1] as const;

/**
 * The visitor's question, right-aligned, growing out of its bottom-right
 * corner. Marked `data-ui`: it is a chat message, not a label for the
 * heading under it.
 */
export function TurnQuestion({
  question,
  label,
}: {
  /** The stock question for this topic (server-rendered). */
  question: string;
  /** Screen-reader prefix, e.g. "You asked". */
  label: string;
}) {
  const turn = useContext(TurnContext);
  const text = turn?.question?.trim() || question;

  return (
    <m.div
      data-ui=""
      data-enter=""
      style={{ "--i": 0, transformOrigin: "100% 100%" } as CSSProperties}
      initial={turn ? { opacity: 0, y: 8, scale: 0.96 } : false}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.2, ease: EASE_OUT }}
      className="flex justify-end"
    >
      <p className="max-w-[85%] rounded-[1.375rem] rounded-br-md bg-surface px-5 py-3 leading-snug">
        <span className="sr-only">{label}: </span>
        {text}
      </p>
    </m.div>
  );
}

/** One part of the answer, revealed in order after the question. */
export function TurnPart({
  index,
  children,
  className,
  build = false,
}: {
  /** Order in the answer, from 1. */
  index: number;
  children: ReactNode;
  className?: string;
  /** Let the panel inside build itself part by part (see `[data-build]` in globals.css). */
  build?: boolean;
}) {
  const turn = useContext(TurnContext);
  return (
    <m.div
      data-enter=""
      data-build={build ? "" : undefined}
      style={{ "--i": index } as CSSProperties}
      initial={turn ? { opacity: 0, y: 10 } : false}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.32,
        ease: EASE_OUT,
        delay: 0.12 + (index - 1) * 0.06,
      }}
      className={className}
    >
      {children}
    </m.div>
  );
}
