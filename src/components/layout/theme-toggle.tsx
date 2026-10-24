"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

import { cn } from "@/lib/utils";

/**
 * Light/dark toggle. Both icons are rendered and swapped with CSS (`dark:`),
 * so there is no hydration mismatch and no layout shift before mount.
 */
export function ThemeToggle({
  label,
  className,
}: {
  label: string;
  className?: string;
}) {
  const { resolvedTheme, setTheme } = useTheme();

  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
      className={cn(
        "relative inline-flex size-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
        className,
      )}
    >
      <Sun
        aria-hidden="true"
        strokeWidth={1.75}
        className="size-[1.1rem] scale-100 rotate-0 transition-transform duration-300 ease-editorial dark:scale-0 dark:-rotate-90"
      />
      <Moon
        aria-hidden="true"
        strokeWidth={1.75}
        className="absolute size-[1.1rem] scale-0 rotate-90 transition-transform duration-300 ease-editorial dark:scale-100 dark:rotate-0"
      />
    </button>
  );
}
