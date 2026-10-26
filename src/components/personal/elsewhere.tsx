import { ArrowUpRightIcon } from "@phosphor-icons/react/dist/ssr/ArrowUpRight";
import { EnvelopeSimpleIcon } from "@phosphor-icons/react/dist/ssr/EnvelopeSimple";
import type { ReactNode } from "react";

import { Reveal } from "@/components/motion/reveal";
import { BrandLogo } from "@/components/ui/logo";
import { getSocial, profile, type SocialId } from "@/content/profile";
import { getDictionary, type Locale } from "@/i18n";
import type { LogoId } from "@/lib/logos";
import { cn, isExternalUrl } from "@/lib/utils";

const socialLogos: Partial<Record<SocialId, LogoId>> = {
  github: "github",
  linkedin: "linkedin",
  instagram: "instagram",
  spotify: "spotify",
  discord: "discord",
};

/**
 * Where to find Davi online: one row per network with its logo, its name
 * and the handle; the whole row is the link and takes the surface fill on
 * hover. `children` adds rows that are not links (the time zone on Contact).
 */
export function SocialList({
  lang,
  ids,
  className,
  enter,
  reveal = true,
  children,
}: {
  lang: Locale;
  ids: readonly SocialId[];
  className?: string;
  /** Place in the entrance; the rows then arrive one after another (see `Reveal`). */
  enter?: number;
  /** Scroll entrance; off inside an answer, which arrives as a whole on the canvas. */
  reveal?: boolean;
  children?: ReactNode;
}) {
  const dict = getDictionary(lang);
  const List = reveal ? Reveal : "ul";

  return (
    <List
      {...(reveal ? { as: "ul", stagger: true, enter } : {})}
      className={cn("-mx-3 grid gap-1 sm:-mx-4 sm:grid-cols-2", className)}
    >
      {ids.map((id) => {
        const social = getSocial(id);
        const external = isExternalUrl(social.url);
        const logo = socialLogos[id];
        return (
          <li key={id}>
            <a
              href={social.url}
              {...(external
                ? { target: "_blank", rel: "me noopener noreferrer" }
                : {})}
              className="group flex items-center gap-3 rounded-surface px-3 py-2.5 transition-colors duration-150 ease-out hover:bg-surface sm:px-4"
            >
              {logo ? (
                <BrandLogo id={logo} className="size-6" />
              ) : (
                <EnvelopeSimpleIcon
                  aria-hidden="true"
                  className="size-6 shrink-0 text-muted-foreground"
                />
              )}
              <span className="min-w-0 flex-1">
                <span className="block font-medium">
                  {dict.socials[id]}
                  {external ? (
                    <span className="sr-only">
                      {" "}
                      ({dict.a11y.opensInNewTab})
                    </span>
                  ) : null}
                </span>
                <span className="block text-small break-all text-muted-foreground">
                  {social.handle}
                </span>
              </span>
              {external ? (
                <ArrowUpRightIcon
                  aria-hidden="true"
                  className="size-4 shrink-0 text-muted-foreground transition-transform duration-150 ease-out group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-foreground"
                />
              ) : null}
            </a>
          </li>
        );
      })}
      {children}
    </List>
  );
}

/** Every network in the profile, for the Personal tab. */
export function Elsewhere({ lang, enter }: { lang: Locale; enter?: number }) {
  return (
    <SocialList
      lang={lang}
      ids={profile.socials.map((social) => social.id)}
      className="mt-4"
      enter={enter}
    />
  );
}
