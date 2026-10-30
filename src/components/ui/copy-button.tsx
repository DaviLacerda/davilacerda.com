"use client";

import { CheckIcon } from "@phosphor-icons/react/dist/ssr/Check";
import { CopyIcon } from "@phosphor-icons/react/dist/ssr/Copy";
import { AnimatePresence, useReducedMotion } from "motion/react";
import * as m from "motion/react-m";
import { useEffect, useRef, useState } from "react";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type CopyButtonProps = {
  /** The text that goes to the clipboard. */
  value: string;
  /** Visible label (or, with `iconOnly`, the accessible name), e.g. "Copy email". */
  label: string;
  /** Label after copying, e.g. "Copied". */
  copiedLabel: string;
  /** `raised` on a surface panel, `ghost-inverse` on the ink panel. */
  variant?: "quiet" | "raised" | "ghost-inverse";
  size?: "md" | "lg";
  /** Just the icon, in a small round button; the label becomes its accessible name. */
  iconOnly?: boolean;
  className?: string;
};

const EASE_OUT = [0.23, 1, 0.32, 1] as const;

/**
 * Copies `value` and confirms for 2 seconds. The label and icon swap with a
 * short blurred crossfade (150ms ease-out) so the confirmation reads as the
 * same button changing state; the button keeps the width of the longer
 * label, so nothing around it moves. A polite status line announces it.
 */
export function CopyButton({
  value,
  label,
  copiedLabel,
  variant = "quiet",
  size = "lg",
  iconOnly = false,
  className,
}: CopyButtonProps) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  const reduce = useReducedMotion();

  useEffect(() => () => window.clearTimeout(timer.current), []);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard unavailable (permissions, insecure context): the text stays selectable.
    }
  }

  const iconSize = iconOnly ? "size-4" : size === "lg" ? "size-5" : "size-4";
  const hidden = reduce ? { opacity: 0 } : { opacity: 0, filter: "blur(2px)" };
  const shown = reduce ? { opacity: 1 } : { opacity: 1, filter: "blur(0px)" };
  const icon = copied ? (
    <CheckIcon aria-hidden="true" className={iconSize} />
  ) : (
    <CopyIcon aria-hidden="true" className={iconSize} />
  );

  return (
    <>
      <button
        type="button"
        onClick={copy}
        {...(iconOnly ? { "aria-label": label, title: label } : {})}
        className={
          iconOnly
            ? cn(
                buttonVariants({ variant, className: "size-9 px-0" }),
                className,
              )
            : buttonVariants({ variant, size, className })
        }
      >
        <span className="grid [&>*]:col-start-1 [&>*]:row-start-1">
          <AnimatePresence initial={false}>
            <m.span
              key={copied ? "copied" : "copy"}
              initial={hidden}
              animate={shown}
              exit={hidden}
              transition={{ duration: 0.15, ease: EASE_OUT }}
              className="inline-flex items-center justify-center gap-2"
            >
              {icon}
              {iconOnly ? null : copied ? copiedLabel : label}
            </m.span>
          </AnimatePresence>
          {iconOnly ? null : (
            /* Reserves the width of the longer label. */
            <span aria-hidden="true" className="invisible inline-flex gap-2">
              <span className={iconSize} />
              {copiedLabel.length > label.length ? copiedLabel : label}
            </span>
          )}
        </span>
      </button>
      <span role="status" className="sr-only">
        {copied ? copiedLabel : ""}
      </span>
    </>
  );
}
