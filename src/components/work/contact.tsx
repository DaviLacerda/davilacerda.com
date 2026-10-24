import { GitHubIcon, LinkedInIcon } from "@/components/icons";
import { ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { getSocial, profile } from "@/content/profile";
import { getDictionary, t, type Locale } from "@/i18n";

import { CopyEmailButton } from "./copy-email-button";

/** Closing call to action: the email address as the headline link, plus profiles. */
export function ContactSection({ lang }: { lang: Locale }) {
  const dict = getDictionary(lang);
  const copy = dict.work.sections.contact;
  const linkedin = getSocial("linkedin");
  const github = getSocial("github");

  return (
    <section id="contact" aria-labelledby="contact-title" className="pb-8">
      <Container>
        <div className="relative isolate overflow-hidden rounded-2xl border border-border bg-surface px-6 py-14 sm:px-12 sm:py-20 lg:px-16 lg:py-24">
          <span
            aria-hidden="true"
            className="absolute inset-0 -z-10 bg-[radial-gradient(56rem_26rem_at_0%_0%,color-mix(in_oklch,var(--accent)_12%,transparent),transparent_70%)]"
          />
          <span
            aria-hidden="true"
            className="absolute inset-0 -z-10 bg-[repeating-linear-gradient(135deg,color-mix(in_oklch,var(--accent)_7%,transparent)_0_1px,transparent_1px_10px)] [mask-image:radial-gradient(50%_70%_at_100%_100%,#000,transparent)]"
          />

          <h2
            id="contact-title"
            className="max-w-3xl font-display text-h1 text-foreground"
          >
            {copy.title}
          </h2>
          <p className="mt-6 max-w-xl text-lead text-muted-foreground">
            {copy.description}
          </p>

          <div className="mt-12 flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
            <div className="flex flex-wrap items-center gap-x-5 gap-y-4">
              <a
                href={`mailto:${profile.email}`}
                aria-label={`${copy.emailCta}: ${profile.email}`}
                className="font-display text-[clamp(1.625rem,1.1rem+2.6vw,3rem)] leading-[1.1] tracking-[-0.01em] break-all text-foreground link-underline"
              >
                {profile.email}
              </a>
              <CopyEmailButton
                email={profile.email}
                label={dict.common.copy}
                copiedLabel={dict.common.copied}
                ariaLabel={copy.copyEmail}
                announcement={copy.copied}
              />
            </div>

            <div className="flex flex-wrap gap-3">
              <ButtonLink href={linkedin.url} variant="outline">
                <LinkedInIcon size={16} />
                {dict.socials.linkedin}
                <span className="sr-only"> ({dict.a11y.opensInNewTab})</span>
              </ButtonLink>
              <ButtonLink href={github.url} variant="outline">
                <GitHubIcon size={16} />
                {dict.socials.github}
                <span className="sr-only"> ({dict.a11y.opensInNewTab})</span>
              </ButtonLink>
            </div>
          </div>

          <p className="mt-12 border-t border-border pt-6 text-sm text-muted-foreground">
            {dict.work.hero.availability}. {t(profile.availability.modes, lang)}
            .
          </p>
        </div>
      </Container>
    </section>
  );
}
