import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/*
 * Building blocks of the Personal tab's small cards (Watching, the game
 * cards), the same size and anatomy as the Spotify card: an 88px surface
 * with a 64px picture, a grey status line, a title and a grey detail, and
 * a mark at the end. No hooks, so server and client components share them.
 */

export const cardClass =
  "flex h-[5.5rem] items-center gap-4 rounded-surface bg-surface p-3 pr-5";

/** The 64px picture: a tile one step from the card, holding a logo, an icon or letters. */
export function Tile({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "grid size-16 shrink-0 place-items-center rounded-[8px] bg-background text-muted-foreground",
        className,
      )}
    >
      {children}
    </span>
  );
}

/**
 * The lines beside the picture: a grey status, the title and a grey detail.
 * Without a detail the title may take two lines (a long show or game name).
 */
export function CardText({
  status,
  title,
  detail,
}: {
  status: ReactNode;
  title: ReactNode;
  detail?: ReactNode;
}) {
  return (
    <span className="min-w-0 flex-1">
      <span className="flex items-center gap-2 text-small leading-5 text-muted-foreground">
        {status}
      </span>
      <span
        className={cn(
          "block font-medium",
          detail ? "truncate leading-6" : "line-clamp-2 leading-[1.375rem]",
        )}
      >
        {title}
      </span>
      {detail ? (
        <span className="block truncate text-small leading-5 text-muted-foreground">
          {detail}
        </span>
      ) : null}
    </span>
  );
}

/**
 * A whole card that links out (new tab). `label` is its accessible name,
 * with "opens in a new tab" already in it.
 */
export function CardLink({
  href,
  label,
  className,
  children,
}: {
  href: string;
  label: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      className={cn(
        cardClass,
        "pressable-panel hover:bg-surface-strong",
        className,
      )}
    >
      {children}
    </a>
  );
}

/** Something happening now (a game in progress): an ink dot with a soft pulse (`data-live` in globals.css). */
export function LiveDot({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      data-live=""
      className={cn(
        "inline-block size-2 shrink-0 rounded-full bg-current text-foreground",
        className,
      )}
    />
  );
}

/** Fills `{placeholder}` tokens (client-safe; the dictionaries' `interpolate` lives with them on the server). */
export function fill(
  template: string,
  values: Record<string, string | number>,
): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    Object.hasOwn(values, key) ? String(values[key]) : match,
  );
}

/** A live route, carrying the page's own `?mock=` along (see `src/lib/mock.ts`). */
export function liveUrl(path: string): string {
  const mock = new URLSearchParams(window.location.search).get("mock");
  return mock ? `${path}?mock=${encodeURIComponent(mock)}` : path;
}
