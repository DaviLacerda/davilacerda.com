import { ArrowRight } from "lucide-react";
import Link from "next/link";

import { SocialIcon } from "@/components/icons";
import { Monogram } from "@/components/layout/monogram";
import { getSocial, profile, type SocialId } from "@/content/profile";
import { getDictionary, t, type Locale } from "@/i18n";
import { routes } from "@/lib/routes";
import { isExternalUrl } from "@/lib/utils";

const AUTHOR_LINKS: SocialId[] = ["linkedin", "github", "email"];

/** "Written by" card at the end of a post. */
export function AuthorCard({ lang }: { lang: Locale }) {
  const dict = getDictionary(lang);

  return (
    <aside
      aria-label={dict.blog.aboutAuthor}
      className="relative isolate overflow-hidden rounded-[1.75rem] border border-border bg-surface/80 p-6 sm:p-8"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-28 -left-20 -z-10 size-72 rounded-full bg-accent/10 blur-3xl"
      />
      <div className="flex flex-col gap-5 sm:flex-row sm:gap-6">
        <Monogram className="size-14 shrink-0 text-[1.65rem]" />
        <div className="min-w-0 flex-1">
          <p className="font-mono text-eyebrow text-muted-foreground uppercase">
            {dict.blog.writtenBy}
          </p>
          <p className="mt-2 font-display text-h3 text-foreground">
            <Link
              href={routes.work(lang)}
              rel="author"
              className="link-underline"
            >
              {profile.name}
            </Link>
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {t(profile.headline, lang)} · {t(profile.location.label, lang)}
          </p>
          <p className="mt-4 text-foreground/90">
            {t(profile.valueProp, lang)}
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-3">
            <Link
              href={routes.work(lang)}
              className="group inline-flex items-center gap-2 text-sm font-medium text-foreground"
            >
              <span className="link-underline">{dict.blog.moreAboutMe}</span>
              <ArrowRight
                aria-hidden="true"
                className="size-4 transition-transform duration-300 ease-editorial group-hover:translate-x-0.5"
              />
            </Link>
            <ul className="-ml-2 flex items-center gap-0.5">
              {AUTHOR_LINKS.map((id) => {
                const social = getSocial(id);
                const name = dict.socials[id];
                const external = isExternalUrl(social.url);
                return (
                  <li key={id}>
                    <a
                      href={social.url}
                      {...(external
                        ? { target: "_blank", rel: "me noopener noreferrer" }
                        : {})}
                      aria-label={
                        external ? `${name} (${dict.a11y.opensInNewTab})` : name
                      }
                      title={name}
                      className="inline-flex size-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    >
                      <SocialIcon id={id} size={17} />
                    </a>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </div>
    </aside>
  );
}
