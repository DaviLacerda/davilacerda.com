"use client";

import { createContext, useContext } from "react";

/* The Work assistant's shared state. The provider and the canvas live in `assistant.tsx`. */

export type OpenOptions = {
  href: string;
  /** What the visitor typed, shown in the answer's question bubble. */
  question?: string;
  /** Move focus to the answer's title once it has rendered (composer sends). */
  focus?: boolean;
};

export type AssistantValue = {
  /** The answer on its way (optimistic), until its route renders. */
  pendingHref: string | null;
  /** A typed question with no written answer, while its reply is on the canvas. */
  unmatched: string | null;
  /** What the visitor typed for the answer at `href`. */
  asked: { href: string; text: string } | null;
  /**
   * Leave the current answer for another. Returns false when `href` is the
   * answer already on screen (the caller should not navigate).
   */
  open: (options: OpenOptions) => boolean;
  /** Show the reply for a question that no answer covers. */
  reply: (question: string) => void;
  /** Close that reply and bring the answer underneath back. */
  dismiss: () => void;
  /** Callback ref for the canvas element (the answer that steps back on `open`). */
  setCanvas: (element: HTMLDivElement | null) => void;
  /**
   * Whether the answer that just rendered should take focus (it was asked
   * from the composer); reading it clears it.
   */
  takeFocus: () => boolean;
};

export const AssistantContext = createContext<AssistantValue | null>(null);

/** The assistant around this component, or null outside the Work tab. */
export function useAssistant() {
  return useContext(AssistantContext);
}
