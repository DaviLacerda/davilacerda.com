"use client";

import { SpeakerSimpleHighIcon } from "@phosphor-icons/react/dist/ssr/SpeakerSimpleHigh";
import { SpeakerSimpleSlashIcon } from "@phosphor-icons/react/dist/ssr/SpeakerSimpleSlash";
import { AnimatePresence, useReducedMotion } from "motion/react";
import * as m from "motion/react-m";
import { useEffect, useSyncExternalStore } from "react";

import { armUnlock, hushSfx, unlockAudio } from "@/lib/sfx/player";
import { setSoundsOn, soundsOn, subscribeSounds } from "@/lib/sfx/preference";
import { cn } from "@/lib/utils";

/** Whether the team sounds are on (off on the server and before hydration). */
export function useSoundsOn(): boolean {
  return useSyncExternalStore(subscribeSounds, soundsOn, () => false);
}

/**
 * The speaker at the end of the My teams title: turns the cards' sounds on
 * and off. Off by default and remembered (localStorage); a toggle button
 * (`aria-pressed`) with one label, the icon showing the state (a crossed-out
 * speaker when off), swapped like the theme toggle's: 200ms ease-out, the
 * old icon shrinking into a blur. Turning it on is the gesture that lets the
 * page play audio; if it was left on, the page's first click, key or tap
 * does that. Hidden without JavaScript.
 */
export function SoundToggle({
  label,
  className,
}: {
  label: string;
  className?: string;
}) {
  const on = useSoundsOn();
  const reduce = useReducedMotion();
  const hidden = reduce
    ? { opacity: 0 }
    : { opacity: 0, scale: 0.6, filter: "blur(4px)" };
  const shown = reduce
    ? { opacity: 1 }
    : { opacity: 1, scale: 1, filter: "blur(0px)" };
  const StateIcon = on ? SpeakerSimpleHighIcon : SpeakerSimpleSlashIcon;

  useEffect(() => {
    if (on) armUnlock();
  }, [on]);

  return (
    <button
      type="button"
      aria-pressed={on}
      aria-label={label}
      title={label}
      onClick={() => {
        const next = !on;
        if (next) unlockAudio();
        else hushSfx();
        setSoundsOn(next);
      }}
      className={cn(
        "grid size-8 pressable place-items-center rounded-full text-muted-foreground hover:bg-surface-strong hover:text-foreground aria-pressed:text-foreground noscript:hidden [&>*]:col-start-1 [&>*]:row-start-1",
        className,
      )}
    >
      <AnimatePresence initial={false}>
        <m.span
          key={on ? "on" : "off"}
          initial={hidden}
          animate={shown}
          exit={hidden}
          transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
          className="grid place-items-center"
        >
          <StateIcon aria-hidden="true" className="size-[1.125rem]" />
        </m.span>
      </AnimatePresence>
    </button>
  );
}
