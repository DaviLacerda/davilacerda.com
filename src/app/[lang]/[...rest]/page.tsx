import { notFound } from "next/navigation";

/**
 * Catches unknown paths under a locale (e.g. /en/nope) so they render the
 * localized `[lang]/not-found.tsx` inside the site layout with a 404 status.
 */
export default function CatchAll() {
  notFound();
}
