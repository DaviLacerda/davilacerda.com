import { ArrowUpRightIcon } from "@phosphor-icons/react/dist/ssr/ArrowUpRight";

import { BrandLogo } from "@/components/ui/logo";
import type { Project } from "@/content/profile";
import { getDictionary, interpolate, type Locale } from "@/i18n";
import { cn } from "@/lib/utils";

/**
 * A product's own links: its site, and where to get it (the App Store
 * link, or "coming soon" until it launches). On the project's page and at
 * the foot of the posts about it.
 */
export function ProjectLinks({
  project,
  lang,
  className,
}: {
  project: Project;
  lang: Locale;
  className?: string;
}) {
  if (!project.url && !project.appStore) return null;
  const p = getDictionary(lang).projects;
  const pill =
    "inline-flex h-11 items-center gap-2 rounded-full pr-5 pl-4 text-small font-medium";
  return (
    <div className={cn("flex flex-wrap items-center gap-2.5", className)}>
      {project.appStore && project.appStore !== "soon" ? (
        <a
          href={project.appStore}
          target="_blank"
          rel="noopener"
          className={cn(
            pill,
            "pressable bg-foreground text-background hover:opacity-90",
          )}
        >
          <BrandLogo id="apple" className="size-4.5" />
          {p.appStore}
        </a>
      ) : project.appStore === "soon" ? (
        // Not out yet: where the download goes, marked as coming soon.
        <span
          aria-disabled="true"
          className={cn(
            pill,
            "cursor-default border border-dashed border-border text-muted-foreground",
          )}
        >
          <BrandLogo id="apple" className="size-4.5" />
          {p.appStoreSoon}
        </span>
      ) : null}
      {project.url ? (
        <a
          href={project.url}
          target="_blank"
          rel="noopener"
          className={cn(
            pill,
            "pressable bg-surface pl-5 hover:bg-surface-strong",
          )}
        >
          {interpolate(p.site, {
            host: new URL(project.url).hostname.replace(/^www\./, ""),
          })}
          <ArrowUpRightIcon aria-hidden="true" className="size-4" />
        </a>
      ) : null}
    </div>
  );
}
