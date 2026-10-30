import { ArrowRightIcon } from "@phosphor-icons/react/dist/ssr/ArrowRight";
import Link from "next/link";

import { TextLink } from "@/components/ui/text-link";
import { getSocial, profile, type SocialId } from "@/content/profile";
import { getDictionary, t, type Locale } from "@/i18n";
import { routes } from "@/lib/routes";
import { isExternalUrl } from "@/lib/utils";

const AUTHOR_LINKS: SocialId[] = ["linkedin", "github", "email"];

/** "Written by" at the end of a post: who Davi is and where to reach him, in two lines. No card. */
export function AuthorCard({ lang }: { lang: Locale }) {
  const dict = getDictionary(lang);

  return (
    <section aria-labelledby="author-title">
      <h2 id="author-title" className="text-heading">
        {dict.blog.writtenBy}{" "}
        <Link href={routes.work(lang)} rel="author" className="link-underline">
          {profile.name}
        </Link>
      </h2>
      <p className="mt-1 text-muted-foreground">
        {t(profile.headline, lang)}, {t(profile.location.label, lang)}
      </p>
      <ul className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-3">
        <li>
          <Link
            href={routes.work(lang)}
            className="group inline-flex items-center gap-2 font-medium"
          >
            <span className="link-underline">{dict.blog.moreAboutMe}</span>
            <ArrowRightIcon
              aria-hidden="true"
              className="size-4 transition-transform duration-200 ease-out group-hover:translate-x-0.5"
            />
          </Link>
        </li>
        {AUTHOR_LINKS.map((id) => {
          const social = getSocial(id);
          return (
            <li key={id}>
              {isExternalUrl(social.url) ? (
                <TextLink
                  href={social.url}
                  newTabLabel={dict.a11y.opensInNewTab}
                  rel="me noopener noreferrer"
                >
                  {dict.socials[id]}
                </TextLink>
              ) : (
                <a href={social.url} className="link-underline">
                  {dict.socials[id]}
                </a>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
