"use client";

import { Check, Copy } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { buttonVariants } from "@/components/ui/button";

type CopyEmailButtonProps = {
  email: string;
  /** Visible label, e.g. "Copy". */
  label: string;
  /** Visible label after copying, e.g. "Copied". */
  copiedLabel: string;
  /** Accessible name, e.g. "Copy email address". */
  ariaLabel: string;
  /** Announced to screen readers after copying. */
  announcement: string;
};

/** Small client island: copies the email address and confirms for 2 seconds. */
export function CopyEmailButton({
  email,
  label,
  copiedLabel,
  ariaLabel,
  announcement,
}: CopyEmailButtonProps) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  async function copy() {
    try {
      await navigator.clipboard.writeText(email);
      setCopied(true);
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard unavailable (permissions, insecure context): the mailto link still works.
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={copy}
        aria-label={ariaLabel}
        className={buttonVariants({ variant: "outline", size: "sm" })}
      >
        {copied ? (
          <Check aria-hidden="true" className="size-3.5 text-accent" />
        ) : (
          <Copy aria-hidden="true" className="size-3.5" />
        )}
        <span aria-hidden="true">{copied ? copiedLabel : label}</span>
      </button>
      <span role="status" className="sr-only">
        {copied ? announcement : ""}
      </span>
    </>
  );
}
