import { ArrowDown, Award, Mail, MapPin } from "lucide-react";

import { GitHubIcon, LinkedInIcon } from "@/components/icons";
import { ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { getSocial, profile } from "@/content/profile";
import { getDictionary, t, type Locale } from "@/i18n";

/** Id of the case study the award plaque points to (see FeaturedWork). */
export const CASE_STUDY_ID = "sales-copilot";

const AWARD_ID = "conecta-latam-best-ai-project";

/**
 * Work hero: availability, name + role (the page's only h1), value prop,
 * contact CTAs and the Conecta Latam award plaque linking to the case study.
 */
export function WorkHero({ lang }: { lang: Locale }) {
  const dict = getDictionary(lang);
  const copy = dict.work.page.hero;
  const linkedin = getSocial("linkedin");
  const github = getSocial("github");
  const award = profile.achievements.find((a) => a.id === AWARD_ID);

  return (
    <section aria-labelledby="hero-title" className="relative">
      <Container className="grid items-center gap-12 pt-12 pb-16 sm:pt-20 sm:pb-24 lg:grid-cols-12 lg:gap-10 lg:pt-24">
        <div className="lg:col-span-7">
          <div className="flex animate-fade-up flex-wrap items-center gap-x-5 gap-y-3 text-sm">
            <p className="inline-flex items-center gap-2.5 rounded-full border border-border bg-surface/80 py-1 pr-3.5 pl-3 font-medium text-foreground shadow-[0_1px_2px_0_rgb(0_0_0/0.04)]">
              <span
                aria-hidden="true"
                className="size-1.5 rounded-full bg-accent ring-4 ring-accent/15"
              />
              {dict.work.hero.availability}
            </p>
            <p className="inline-flex items-center gap-1.5 text-muted-foreground">
              <MapPin
                aria-hidden="true"
                className="size-4"
                strokeWidth={1.75}
              />
              <span>
                {t(profile.location.label, lang)}
                <span aria-hidden="true" className="mx-2 text-border-strong">
                  /
                </span>
                {copy.workModes}
              </span>
            </p>
          </div>

          <h1
            id="hero-title"
            className="mt-8 animate-fade-up font-display text-display text-foreground sm:mt-10"
            style={{ animationDelay: "80ms" }}
          >
            <span className="block">{profile.name}</span>
            <span className="sr-only">, </span>
            <span className="block pb-[0.08em] text-accent italic">
              {t(profile.headline, lang)}
            </span>
          </h1>

          <p
            className="mt-6 max-w-xl animate-fade-up text-lead text-muted-foreground sm:mt-8"
            style={{ animationDelay: "160ms" }}
          >
            {t(profile.valueProp, lang)}
          </p>

          <div
            className="mt-9 grid animate-fade-up grid-cols-2 gap-3 sm:flex sm:flex-wrap sm:items-center"
            style={{ animationDelay: "240ms" }}
          >
            <ButtonLink
              href={`mailto:${profile.email}`}
              size="lg"
              className="col-span-2"
            >
              <Mail aria-hidden="true" className="size-4" strokeWidth={1.75} />
              {copy.emailCta}
            </ButtonLink>
            <ButtonLink href={linkedin.url} variant="outline" size="lg">
              <LinkedInIcon size={16} />
              {dict.socials.linkedin}
              <span className="sr-only"> ({dict.a11y.opensInNewTab})</span>
            </ButtonLink>
            <ButtonLink href={github.url} variant="outline" size="lg">
              <GitHubIcon size={16} />
              {dict.socials.github}
              <span className="sr-only"> ({dict.a11y.opensInNewTab})</span>
            </ButtonLink>
          </div>
        </div>

        {award ? (
          <div
            className="animate-fade-up lg:col-span-5"
            style={{ animationDelay: "360ms" }}
          >
            <a
              href={`#${CASE_STUDY_ID}`}
              className="group relative isolate block max-w-md overflow-hidden rounded-2xl border border-border bg-surface p-6 shadow-[0_1px_2px_0_rgb(0_0_0/0.04),0_30px_60px_-36px_color-mix(in_oklch,var(--accent)_55%,transparent)] transition-[border-color,transform] duration-300 ease-editorial hover:-translate-y-0.5 hover:border-accent/40 sm:p-8 lg:ml-auto"
            >
              {/* Tinted wash and a fine engraved pattern in the corner. */}
              <span
                aria-hidden="true"
                className="absolute inset-0 -z-10 bg-[radial-gradient(120%_90%_at_100%_0%,color-mix(in_oklch,var(--accent)_11%,transparent),transparent_62%)]"
              />
              <span
                aria-hidden="true"
                className="absolute inset-0 -z-10 bg-[repeating-linear-gradient(135deg,color-mix(in_oklch,var(--accent)_9%,transparent)_0_1px,transparent_1px_9px)] [mask-image:radial-gradient(75%_60%_at_100%_0%,#000,transparent)]"
              />
              {/* Hanging ribbon. */}
              <span
                aria-hidden="true"
                className="absolute top-0 right-7 flex h-[4.25rem] w-10 justify-center bg-accent pt-3.5 text-accent-foreground shadow-[0_8px_16px_-8px_color-mix(in_oklch,var(--accent)_70%,transparent)] [clip-path:polygon(0_0,100%_0,100%_100%,50%_82%,0_100%)]"
              >
                <Award className="size-4" strokeWidth={1.75} />
              </span>

              <span className="block pr-14 font-mono text-eyebrow text-muted-foreground uppercase">
                {copy.award}
                {award.issuer ? (
                  <>
                    <span aria-hidden="true" className="mx-2 text-accent">
                      /
                    </span>
                    {award.issuer}
                  </>
                ) : null}
              </span>
              <span className="mt-8 block font-display text-[2.5rem] leading-[1.02] tracking-[-0.015em] text-balance text-foreground sm:text-[2.75rem]">
                {t(award.title, lang)}
              </span>
              <span className="mt-4 block text-[0.9375rem] leading-relaxed text-muted-foreground">
                {copy.awardCaption}
              </span>
              <span className="mt-8 flex items-center justify-between border-t border-border pt-5 text-sm font-medium text-foreground">
                {copy.awardCta}
                <span
                  aria-hidden="true"
                  className="grid size-8 place-items-center rounded-full border border-border-strong transition-[transform,border-color,color] duration-300 ease-editorial group-hover:translate-y-0.5 group-hover:border-accent group-hover:text-accent"
                >
                  <ArrowDown className="size-3.5" strokeWidth={2} />
                </span>
              </span>
            </a>
          </div>
        ) : null}
      </Container>
    </section>
  );
}
