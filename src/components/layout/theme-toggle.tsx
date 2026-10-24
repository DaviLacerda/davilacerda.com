"use client";

import { MoonIcon } from "@phosphor-icons/react/dist/ssr/Moon";
import { SunIcon } from "@phosphor-icons/react/dist/ssr/Sun";
import { AnimatePresence, useReducedMotion } from "motion/react";
import * as m from "motion/react-m";
import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";

import { cn } from "@/lib/utils";

const subscribe = () => () => {};

/**
 * Light/dark toggle. Before hydration both icons are rendered and swapped
 * with CSS (`dark:`), so there is no mismatch and no layout shift. After
 * that, a click crossfades the icons: the old one shrinks to 0.6 and blurs
 * out while the new one comes in, 200ms ease-out, so the change of state is
 * felt without a spin. With reduced motion it is a plain crossfade.
 */
export function ThemeToggle({
  label,
  className,
}: {
  label: string;
  className?: string;
}) {
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
  const reduce = useReducedMotion();
  const isDark = resolvedTheme === "dark";
  const hidden = reduce
    ? { opacity: 0 }
    : { opacity: 0, scale: 0.6, filter: "blur(4px)" };
  const shown = reduce
    ? { opacity: 1 }
    : { opacity: 1, scale: 1, filter: "blur(0px)" };

  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className={cn(
        "grid size-10 pressable place-items-center rounded-full text-muted-foreground hover:bg-surface hover:text-foreground [&>*]:col-start-1 [&>*]:row-start-1",
        className,
      )}
    >
      {mounted && resolvedTheme ? (
        <AnimatePresence initial={false}>
          <m.span
            key={isDark ? "moon" : "sun"}
            initial={hidden}
            animate={shown}
            exit={hidden}
            transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
            className="grid place-items-center"
          >
            {isDark ? (
              <MoonIcon aria-hidden="true" className="size-5" />
            ) : (
              <SunIcon aria-hidden="true" className="size-5" />
            )}
          </m.span>
        </AnimatePresence>
      ) : (
        <>
          <SunIcon aria-hidden="true" className="size-5 dark:hidden" />
          <MoonIcon aria-hidden="true" className="hidden size-5 dark:block" />
        </>
      )}
    </button>
  );
}
