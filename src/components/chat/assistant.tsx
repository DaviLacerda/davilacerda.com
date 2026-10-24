"use client";

import { animate, stagger, type AnimationPlaybackControls } from "motion";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  useCallback,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ComponentProps,
  type CSSProperties,
  type MouseEvent,
  type ReactNode,
} from "react";

import {
  AssistantContext,
  useAssistant,
  type AssistantValue,
  type OpenOptions,
} from "@/components/chat/context";
import { Reply, type ReplyStrings } from "@/components/chat/reply";
import { markClientNavigation } from "@/components/motion/motion-provider";
import { cn } from "@/lib/utils";

/*
 * The Work assistant's shared state and its canvas.
 *
 * The (assistant) layout keeps the left pane (name, composer, chips) mounted
 * while the visitor moves between answers; only the canvas, the page itself,
 * changes. This module ties the two together:
 *
 * - `open()` is called by a chip, a link to an answer or the composer right
 *   before the route changes. The chip it names lights up at once (the route
 *   has not rendered yet) and the answer on the canvas steps back: its parts
 *   dim and soften in 140ms, the "thinking" state.
 * - When the new answer has rendered, `Canvas` composes it in front of the
 *   visitor: every `[data-piece]` rises 12px out of a 4px blur, 360ms
 *   ease-out, 45ms apart, in the order the page gives them (`--p`). Motion's
 *   `animate()` runs it on the compositor (transform, opacity, filter only).
 *   A new swap stops the one in flight, so the canvas never queues
 *   animations; with reduced motion the parts only fade (200ms).
 * - `reply()` shows the "nothing on that yet" reply for a typed question that
 *   no answer covers, on the canvas too (beside the composer on desktop,
 *   above it on a phone), never under the input.
 *
 * On a full page load none of this runs: the CSS entrance in globals.css
 * plays instead, and works without JavaScript.
 */

const EASE_OUT = [0.23, 1, 0.32, 1] as const;

/* --------------------------------------------------------------- Motion */

function piecesOf(root: HTMLElement | null): HTMLElement[] {
  if (!root) return [];
  const order = (el: HTMLElement) =>
    Number(el.style.getPropertyValue("--p")) || 0;
  return Array.from(root.querySelectorAll<HTMLElement>("[data-piece]"))
    .filter((el) => !el.closest("[hidden]"))
    .sort((a, b) => order(a) - order(b));
}

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

const SETTLED = ["opacity", "transform", "filter"] as const;

/** Composes the answer on the canvas: its parts arrive in order. */
function arrive(root: HTMLElement | null): AnimationPlaybackControls | null {
  const pieces = piecesOf(root);
  if (!pieces.length) return null;
  const reduce = prefersReducedMotion();
  // Hidden before the first paint of the new answer (we run in a layout effect).
  for (const el of pieces) {
    el.style.opacity = "0";
    if (!reduce) {
      el.style.transform = "translateY(12px)";
      el.style.filter = "blur(4px)";
    }
  }
  const controls = animate(
    pieces,
    reduce
      ? { opacity: [0, 1] }
      : {
          opacity: [0, 1],
          transform: ["translateY(12px)", "translateY(0px)"],
          filter: ["blur(4px)", "blur(0px)"],
        },
    {
      duration: reduce ? 0.2 : 0.36,
      ease: EASE_OUT,
      delay: reduce ? 0 : stagger(0.045),
    },
  );
  // Leave nothing behind: a lingering `filter` would make every panel a
  // containing block and keep it on its own layer.
  void controls.then(() => {
    for (const el of pieces)
      for (const p of SETTLED) el.style.removeProperty(p);
  });
  return controls;
}

/** The answer on screen steps back while the next one loads. */
function leave(root: HTMLElement | null): AnimationPlaybackControls | null {
  const pieces = piecesOf(root);
  if (!pieces.length) return null;
  const reduce = prefersReducedMotion();
  return animate(
    pieces,
    reduce ? { opacity: 0.35 } : { opacity: 0.35, filter: "blur(2px)" },
    { duration: 0.14, ease: EASE_OUT },
  );
}

/* -------------------------------------------------------------- Provider */

export function AssistantProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? "";
  const canvasEl = useRef<HTMLDivElement | null>(null);
  const focusNext = useRef(false);
  const [pending, setPending] = useState<{ href: string; from: string } | null>(
    null,
  );
  const [unmatched, setUnmatched] = useState<{
    text: string;
    path: string;
  } | null>(null);
  const [asked, setAsked] = useState<{ href: string; text: string } | null>(
    null,
  );

  // Kept in refs so `open` stays stable and reads the latest values.
  const pathRef = useRef(pathname);
  const unmatchedRef = useRef(unmatched);
  useLayoutEffect(() => {
    pathRef.current = pathname;
    unmatchedRef.current = unmatched;
  });

  const open = useCallback(({ href, question, focus }: OpenOptions) => {
    markClientNavigation();
    const here = pathRef.current;
    if (href === here) {
      // Same answer: if the reply covers it, bring the answer back.
      if (unmatchedRef.current) setUnmatched(null);
      return false;
    }
    setPending({ href, from: here });
    setAsked(question ? { href, text: question } : null);
    focusNext.current = Boolean(focus);
    leave(canvasEl.current);
    return true;
  }, []);

  const reply = useCallback((question: string) => {
    markClientNavigation();
    setUnmatched({ text: question, path: pathRef.current });
  }, []);

  const dismiss = useCallback(() => setUnmatched(null), []);

  const setCanvas = useCallback((element: HTMLDivElement | null) => {
    canvasEl.current = element;
  }, []);

  const takeFocus = useCallback(() => {
    const focus = focusNext.current;
    focusNext.current = false;
    return focus;
  }, []);

  const value = useMemo<AssistantValue>(
    () => ({
      // Derived, so a finished navigation needs no effect to clear them.
      pendingHref: pending && pending.from === pathname ? pending.href : null,
      unmatched:
        unmatched && unmatched.path === pathname ? unmatched.text : null,
      asked,
      open,
      reply,
      dismiss,
      setCanvas,
      takeFocus,
    }),
    [
      pending,
      unmatched,
      asked,
      pathname,
      open,
      reply,
      dismiss,
      setCanvas,
      takeFocus,
    ],
  );

  return <AssistantContext value={value}>{children}</AssistantContext>;
}

/* ---------------------------------------------------------------- Canvas */

type CanvasProps = {
  children: ReactNode;
  /** Copy for the reply to a question no answer covers (shown in place of the answer). */
  reply: ReplyStrings;
  className?: string;
};

/**
 * Where answers render: the right pane on desktop, the page above the docked
 * composer on phones and tablets. Runs the swap (see the top of this file)
 * whenever the answer on it changes.
 */
export function Canvas({ children, reply, className }: CanvasProps) {
  const assistant = useAssistant();
  const pathname = usePathname() ?? "";
  const unmatched = assistant?.unmatched ?? null;
  const setCanvas = assistant?.setCanvas;
  const takeFocus = assistant?.takeFocus;
  const root = useRef<HTMLDivElement | null>(null);
  const ref = useCallback(
    (element: HTMLDivElement | null) => {
      root.current = element;
      setCanvas?.(element);
    },
    [setCanvas],
  );
  const view = `${pathname}\n${unmatched ?? ""}`;
  const shown = useRef(view);
  const running = useRef<AnimationPlaybackControls | null>(null);

  useLayoutEffect(() => {
    if (shown.current === view) return; // first paint: the CSS entrance runs
    const routeChanged = shown.current.split("\n")[0] !== pathname;
    shown.current = view;
    running.current?.stop();
    if (routeChanged && window.scrollY > 0) {
      window.scrollTo({ top: 0, behavior: "instant" });
    }
    running.current = arrive(root.current);
    if (routeChanged && takeFocus?.()) {
      root.current
        ?.querySelector<HTMLElement>("#answer-title")
        ?.focus({ preventScroll: true });
    }
  }, [view, pathname, takeFocus]);

  return (
    <div ref={ref} id="canvas" className={cn("min-w-0", className)}>
      {unmatched !== null ? (
        <Reply question={unmatched} strings={reply} />
      ) : null}
      <div hidden={unmatched !== null}>{children}</div>
    </div>
  );
}

/* -------------------------------------------------------------- Identity */

/**
 * Davi's name and one line, at the top of the left pane. On the Work home it
 * is the page's `h1`; on an answer the answer's title is, so the name becomes
 * a paragraph and, on phones and tablets, steps aside so the answer starts at
 * the top of the screen.
 */
export function Identity({
  home,
  name,
  lead,
}: {
  /** The Work home path, e.g. "/en". */
  home: string;
  name: string;
  lead: string;
}) {
  const pathname = usePathname();
  const isHome = pathname === home;
  const Name = isHome ? "h1" : "p";
  return (
    <div className={cn(isHome ? "mb-10 lg:mb-0" : "max-lg:hidden")}>
      <Name
        id={isHome ? "work-title" : undefined}
        data-enter=""
        style={{ "--i": 0 } as CSSProperties}
        className="text-name font-semibold"
      >
        {name}
      </Name>
      <p
        data-enter=""
        style={{ "--i": 1 } as CSSProperties}
        className="mt-4 max-w-[30ch] text-lead text-muted-foreground"
      >
        {lead}
      </p>
    </div>
  );
}

/* --------------------------------------------------------------- AskLink */

function isPlainClick(event: MouseEvent<HTMLAnchorElement>) {
  return !(
    event.defaultPrevented ||
    event.button !== 0 ||
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey
  );
}

/**
 * A link to a Work answer. Inside the assistant it swaps the canvas (see
 * `open`) and keeps the scroll for the canvas to manage; elsewhere (the 404,
 * a post) it is a plain link. Modified clicks (new tab, new window) are left
 * alone.
 */
export function AskLink({
  onClick,
  href,
  ...props
}: Omit<ComponentProps<typeof Link>, "href"> & { href: string }) {
  const assistant = useAssistant();
  return (
    <Link
      href={href}
      scroll={assistant ? false : undefined}
      onClick={(event) => {
        onClick?.(event);
        if (!assistant || !isPlainClick(event)) return;
        if (!assistant.open({ href })) event.preventDefault();
      }}
      {...props}
    />
  );
}
