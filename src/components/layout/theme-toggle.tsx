"use client";

import type { Icon } from "@phosphor-icons/react";
import { MonitorIcon } from "@phosphor-icons/react/dist/ssr/Monitor";
import { MoonIcon } from "@phosphor-icons/react/dist/ssr/Moon";
import { SunIcon } from "@phosphor-icons/react/dist/ssr/Sun";
import { AnimatePresence, useReducedMotion } from "motion/react";
import * as m from "motion/react-m";
import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";

import { cn } from "@/lib/utils";

const subscribe = () => () => {};

type Mode = "system" | "light" | "dark";

const icons: Record<Mode, Icon> = {
  system: MonitorIcon,
  light: SunIcon,
  dark: MoonIcon,
};

/**
 * The colour theme follows the system until the visitor picks one. A click
 * steps through the three modes so that the first click always changes what
 * is on screen: from System to the theme the system does not show, then the
 * one it does, then back to System. The icon names the mode in use (a monitor for
 * System) and the label says it in words.
 *
 * Before hydration the button shows the monitor, the default, so there is no
 * mismatch and no layout shift. After that a change crossfades the icons:
 * the old one shrinks to 0.6 and blurs out while the new one comes in, 200ms
 * ease-out. With reduced motion it is a plain crossfade.
 */
export function ThemeToggle({
  label,
  names,
  className,
}: {
  label: string;
  names: Record<Mode, string>;
  className?: string;
}) {
  const { theme, systemTheme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
  const reduce = useReducedMotion();
  const mode: Mode =
    mounted && (theme === "light" || theme === "dark") ? theme : "system";
  // System, then the theme the system does not show, then the one it does, then System again.
  const system = systemTheme === "dark" ? "dark" : "light";
  const other = system === "dark" ? "light" : "dark";
  const target: Mode =
    mode === "system" ? other : mode === other ? system : "system";
  const hidden = reduce
    ? { opacity: 0 }
    : { opacity: 0, scale: 0.6, filter: "blur(4px)" };
  const shown = reduce
    ? { opacity: 1 }
    : { opacity: 1, scale: 1, filter: "blur(0px)" };
  const ModeIcon = icons[mode];
  const fullLabel = `${label}: ${names[mode]}`;

  return (
    <button
      type="button"
      aria-label={fullLabel}
      title={fullLabel}
      onClick={() => setTheme(target)}
      className={cn(
        "grid size-10 pressable place-items-center rounded-full text-muted-foreground hover:bg-surface hover:text-foreground [&>*]:col-start-1 [&>*]:row-start-1",
        className,
      )}
    >
      <AnimatePresence initial={false}>
        <m.span
          key={mode}
          initial={hidden}
          animate={shown}
          exit={hidden}
          transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
          className="grid place-items-center"
        >
          <ModeIcon aria-hidden="true" className="size-5" />
        </m.span>
      </AnimatePresence>
    </button>
  );
}
