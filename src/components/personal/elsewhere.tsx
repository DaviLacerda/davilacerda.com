import { ArrowUpRight } from "lucide-react";

import { SocialIcon } from "@/components/icons";
import { profile } from "@/content/profile";
import { getDictionary, type Locale } from "@/i18n";
import { cn, isExternalUrl } from "@/lib/utils";

/** Social links as refined rows: icon, network, handle and what you'll find there. */
export function Elsewhere({ lang }: { lang: Locale }) {
  const dict = getDictionary(lang);
  const notes = dict.personal.sections.elsewhere.notes;

  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {profile.socials.map((social) => {
        const name = dict.socials[social.id];
        const external = isExternalUrl(social.url);
        const showHandle = social.handle.toLowerCase() !== name.toLowerCase();
        const isEmail = social.id === "email";

        return (
          <li key={social.id} className={cn(isEmail && "sm:col-span-2")}>
            <a
              href={social.url}
              {...(external
                ? { target: "_blank", rel: "me noopener noreferrer" }
                : {})}
              className={cn(
                "group flex h-full items-center gap-4 rounded-2xl border border-border bg-surface/70 p-4 transition-[border-color,background-color] duration-300 ease-editorial hover:border-border-strong hover:bg-surface sm:p-5",
                isEmail && "sm:gap-5",
              )}
            >
              <span
                className={cn(
                  "grid shrink-0 place-items-center rounded-full border border-border bg-background text-foreground transition-colors duration-300 group-hover:border-accent/40 group-hover:text-accent",
                  isEmail ? "size-12" : "size-11",
                )}
              >
                <SocialIcon id={social.id} size={18} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5">
                  <span className="font-medium text-foreground">{name}</span>
                  {showHandle ? (
                    <span className="min-w-0 truncate font-mono text-xs text-muted-foreground">
                      {social.handle}
                    </span>
                  ) : null}
                </span>
                <span className="mt-0.5 block text-sm text-muted-foreground">
                  {notes[social.id]}
                </span>
              </span>
              <ArrowUpRight
                aria-hidden="true"
                className="size-4 shrink-0 text-muted-foreground transition-[transform,color] duration-300 ease-editorial group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-accent"
              />
              {external ? (
                <span className="sr-only">({dict.a11y.opensInNewTab})</span>
              ) : null}
            </a>
          </li>
        );
      })}
    </ul>
  );
}
