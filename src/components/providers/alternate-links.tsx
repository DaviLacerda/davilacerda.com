"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

import type { Locale } from "@/i18n/config";

/** Locale -> path of the current page in that locale. */
export type AlternateLinks = Partial<Record<Locale, string>>;

type AlternateLinksContextValue = {
  links: AlternateLinks | null;
  setLinks: (links: AlternateLinks | null) => void;
};

const AlternateLinksContext = createContext<AlternateLinksContextValue | null>(
  null,
);

/** Mounted once in the root layout; lets pages tell the header where each locale lives. */
export function AlternateLinksProvider({ children }: { children: ReactNode }) {
  const [links, setLinks] = useState<AlternateLinks | null>(null);
  return (
    <AlternateLinksContext value={{ links, setLinks }}>
      {children}
    </AlternateLinksContext>
  );
}

/** Current page's alternates, or null when the page did not register any. */
export function useAlternateLinks(): AlternateLinks | null {
  return useContext(AlternateLinksContext)?.links ?? null;
}

/**
 * Render inside a page whose URL differs per locale by more than the prefix
 * (blog posts). The locale switcher then links to these paths instead of
 * swapping the prefix. Renders nothing.
 *
 * @example <LocaleAlternates links={getPostAlternates(post)} />
 */
export function LocaleAlternates({ links }: { links: AlternateLinks }) {
  const setLinks = useContext(AlternateLinksContext)?.setLinks;
  const key = JSON.stringify(links);

  useEffect(() => {
    if (!setLinks) return;
    setLinks(JSON.parse(key) as AlternateLinks);
    return () => setLinks(null);
  }, [key, setLinks]);

  return null;
}
