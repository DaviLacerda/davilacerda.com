"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import type { Locale } from "@/i18n/config";
import { activeTab, tabs, type TabId } from "@/lib/routes";
import { cn } from "@/lib/utils";

type NavTabsProps = {
  lang: Locale;
  labels: Record<TabId, string>;
  ariaLabel: string;
};

/**
 * Work / Personal segmented tabs. The active tab follows the URL:
 * `aria-current="page"` on the exact page, `"true"` inside the section
 * (e.g. a blog post under Personal).
 */
export function NavTabs({ lang, labels, ariaLabel }: NavTabsProps) {
  const pathname = usePathname() ?? `/${lang}`;
  const current = activeTab(pathname, lang);

  return (
    <nav aria-label={ariaLabel}>
      <ul className="flex items-center gap-0.5 rounded-full border border-border bg-surface/70 p-1 shadow-[0_1px_2px_0_rgb(0_0_0/0.04)]">
        {tabs.map((tab) => {
          const href = tab.href(lang);
          const isActive = tab.id === current;
          const isExact = pathname === href;
          return (
            <li key={tab.id}>
              <Link
                href={href}
                aria-current={
                  isActive ? (isExact ? "page" : "true") : undefined
                }
                className={cn(
                  "inline-flex h-8 items-center rounded-full px-3.5 text-sm font-medium transition-colors duration-200 ease-editorial sm:px-4",
                  isActive
                    ? "bg-foreground text-background"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
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
