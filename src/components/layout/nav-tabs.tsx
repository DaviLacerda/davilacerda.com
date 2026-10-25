"use client";

import * as m from "motion/react-m";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import type { Locale } from "@/i18n/config";
import { activeTab, tabs, type TabId } from "@/lib/routes";
import { cn } from "@/lib/utils";

type NavTabsProps = {
  lang: Locale;
  labels: Record<TabId, string>;
  ariaLabel: string;
};

/**
 * Work / Personal tabs, set as one small island: a round surface holding
 * both tabs, 4px in. The active tab sits on a page-coloured pill that slides to
 * the other tab (a shared `layoutId`, 0.3s spring without bounce), so the
 * switch reads as one control changing state rather than two links. The pill
 * moves on click, before the next page has loaded, so the tab answers at
 * once; the URL takes over when the navigation lands.
 *
 * `aria-current="page"` on the exact page, `"true"` inside the section
 * (e.g. a blog post under Personal).
 */
export function NavTabs({ lang, labels, ariaLabel }: NavTabsProps) {
  const pathname = usePathname() ?? `/${lang}`;
  const [pending, setPending] = useState<{ tab: TabId; from: string } | null>(
    null,
  );
  const fromUrl = activeTab(pathname, lang);
  const current = pending && pending.from === pathname ? pending.tab : fromUrl;

  return (
    <nav aria-label={ariaLabel}>
      <ul className="flex items-center gap-1 rounded-full bg-surface p-1">
        {tabs.map((tab) => {
          const href = tab.href(lang);
          const isActive = tab.id === fromUrl;
          const isExact = pathname === href;
          const showPill = tab.id === current;
          return (
            <li key={tab.id} className="relative">
              {showPill ? (
                <m.span
                  layoutId="tab-pill"
                  aria-hidden="true"
                  className="absolute inset-0 rounded-full bg-background"
                  transition={{ type: "spring", duration: 0.3, bounce: 0 }}
                />
              ) : null}
              <Link
                href={href}
                aria-current={
                  isActive ? (isExact ? "page" : "true") : undefined
                }
                onClick={() => {
                  if (tab.id !== fromUrl)
                    setPending({ tab: tab.id, from: pathname });
                }}
                className={cn(
                  "relative inline-flex h-8 pressable items-center rounded-full px-4 text-small font-semibold",
                  showPill
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {labels[tab.id]}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
