"use client";

import Link from "next/link";
import type { ComponentProps } from "react";

import { startTurn } from "@/components/chat/turn";

/**
 * A link to a Work answer that opens it as a chat turn (the question, then
 * the answer, revealed in order). Modified clicks (new tab, new window) are
 * left alone.
 */
export function AskLink({ onClick, ...props }: ComponentProps<typeof Link>) {
  return (
    <Link
      {...props}
      onClick={(event) => {
        onClick?.(event);
        if (event.defaultPrevented || event.button !== 0) return;
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)
          return;
        startTurn();
      }}
    />
  );
}
