"use client";

import { usePathname } from "next/navigation";

import { useAssistant } from "@/components/chat/context";
import { cn } from "@/lib/utils";

/**
 * The visitor's question, a small bubble at the top right of the canvas. On
 * an answer page it shows the stock question (server-rendered), or what the
 * visitor typed when the composer brought them here. Marked `data-ui`: it is
 * a chat message, not a label for the title under it.
 */
export function Question({
  text,
  label,
  live = true,
  className,
}: {
  text: string;
  /** Screen-reader prefix, e.g. "You asked". */
  label: string;
  /** Show what the visitor typed for this answer, when they typed it. */
  live?: boolean;
  className?: string;
}) {
  const assistant = useAssistant();
  const pathname = usePathname();
  const asked = live ? assistant?.asked : null;
  const shown = asked && asked.href === pathname ? asked.text : text;

  return (
    <div data-ui="" className={cn("flex justify-end", className)}>
      <p className="max-w-[85%] rounded-[1.25rem] rounded-br-md bg-surface px-4 py-2.5 leading-snug sm:px-5 sm:py-3">
        <span className="sr-only">{label}: </span>
        {shown}
      </p>
    </div>
  );
}
