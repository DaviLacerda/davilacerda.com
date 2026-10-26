import { TrophyIcon } from "@phosphor-icons/react/dist/ssr/Trophy";

import { AskLink } from "@/components/chat/assistant";
import { Piece } from "@/components/chat/piece";
import { BrandLogo, LogoTile } from "@/components/ui/logo";
import { profile } from "@/content/profile";
import { getDictionary, t, type Locale } from "@/i18n";
import { formatDateRange } from "@/i18n/format";
import { routes } from "@/lib/routes";
import { certificationsSummary, splitCompanyName } from "@/lib/work/answers";

import { fit, PanelArrow } from "./parts";

/**
 * The Work home's canvas: what Davi is about in one look, before anything is
 * asked. The award on the ink panel across the top (the trophy, the title,
 * then the project and who gave it), the Microsoft certifications (the
 * Azure mark, an oversized "3×" and the tiers) and the current role
 * beside each other, and the one line a recruiter needs at the foot. Each
 * panel is a link to the answer that tells the whole story.
 */
export function Overview({ lang }: { lang: Locale }) {
  const dict = getDictionary(lang);
  const home = dict.chat.home;
  const current = profile.experience.find((job) => job.end === null);
  const award = profile.achievements.find((item) =>
    item.id.startsWith("conecta-latam"),
  );
  const copilot = profile.projects.find((p) => p.id === "sales-copilot");
  const certified = certificationsSummary(lang);
  const awardTitle = award ? t(award.title, lang) : "";
  const company = current
    ? splitCompanyName(t(current.company, lang)).short
    : "";

  const panel =
    "group flex h-full flex-col justify-between rounded-panel pressable-panel";

  return (
    <section aria-labelledby="highlights-title">
      <h2 id="highlights-title" className="sr-only">
        {home.highlightsTitle}
      </h2>
      <ul className="grid gap-3 sm:grid-cols-2 sm:gap-4">
        {award ? (
          <Piece as="li" i={0} className="sm:col-span-2">
            <AskLink
              href={routes.topic(lang, "sales-copilot")}
              className={`${panel} min-h-[17rem] gap-14 bg-ink p-6 text-on-ink hover:bg-ink/90 sm:min-h-[21rem] sm:p-10`}
            >
              <span className="flex items-center justify-between gap-4">
                <TrophyIcon aria-hidden="true" className="size-7" />
                <PanelArrow />
              </span>
              <span className="@container block">
                <h3
                  className="leading-[0.95] font-semibold tracking-[-0.05em] text-balance"
                  style={fit(awardTitle, { max: 5.75, min: 1.75 })}
                >
                  {awardTitle}
                </h3>
                <span className="mt-4 flex flex-wrap justify-between gap-x-6 gap-y-1 text-on-ink-muted">
                  {copilot ? (
                    <span>
                      {t(copilot.name, lang)}, {copilot.context}
                    </span>
                  ) : null}
                  <span>{award.issuer}</span>
                </span>
              </span>
            </AskLink>
          </Piece>
        ) : null}

        {certified.count ? (
          <Piece as="li" i={1}>
            <AskLink
              href={routes.topic(lang, "certifications")}
              className={`${panel} min-h-[16rem] gap-10 bg-surface p-6 hover:bg-surface-strong sm:p-8`}
            >
              <span className="flex items-start justify-between gap-4">
                {certified.logo ? (
                  <BrandLogo
                    id={certified.logo}
                    className="size-12 sm:size-14"
                  />
                ) : null}
                <PanelArrow />
              </span>
              <span className="block">
                <h3 className="font-semibold">
                  <span className="block text-figure">{certified.count}×</span>
                  <span className="mt-4 block text-lead tracking-tight">
                    {certified.title}
                  </span>
                </h3>
                <span className="mt-1 block text-small text-muted-foreground">
                  {certified.tiers}
                </span>
              </span>
            </AskLink>
          </Piece>
        ) : null}

        {current ? (
          <Piece as="li" i={2}>
            <AskLink
              href={routes.topic(lang, "experience")}
              className={`${panel} min-h-[16rem] gap-10 bg-surface p-6 hover:bg-surface-strong sm:p-8`}
            >
              <span className="flex items-start justify-between gap-4">
                <LogoTile
                  logo={current.logo}
                  name={company}
                  size="xl"
                  tone="surface"
                />
                <PanelArrow />
              </span>
              <span className="block">
                <h3 className="font-semibold">
                  <span className="block text-[clamp(2.5rem,1.9rem+1.8vw,3.5rem)] leading-[0.95] tracking-[-0.05em]">
                    {t(current.role, lang)}
                  </span>
                  <span className="mt-4 block text-lead tracking-tight">
                    {company}
                  </span>
                </h3>
                <span className="mt-1 block text-small text-muted-foreground">
                  {formatDateRange(current.start, current.end, lang)}
                </span>
              </span>
            </AskLink>
          </Piece>
        ) : null}

        <Piece as="li" i={3} className="sm:col-span-2">
          <AskLink
            href={routes.topic(lang, "contact")}
            className="group flex pressable-panel flex-wrap items-center gap-x-6 gap-y-1 rounded-panel bg-surface px-6 py-5 hover:bg-surface-strong sm:px-8 sm:py-6"
          >
            <h3 className="font-semibold">{dict.work.hero.talk}</h3>
            <span className="text-muted-foreground">{profile.email}</span>
            <PanelArrow className="ml-auto" />
          </AskLink>
        </Piece>
      </ul>
    </section>
  );
}
