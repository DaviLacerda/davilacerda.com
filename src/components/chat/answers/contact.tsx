import { ClockIcon } from "@phosphor-icons/react/dist/ssr/Clock";

import { CopyEmailButton } from "@/components/chat/copy-email-button";
import { Piece } from "@/components/chat/piece";
import { SocialList } from "@/components/personal/elsewhere";
import { ButtonLink } from "@/components/ui/button";
import { profile } from "@/content/profile";
import { getDictionary, t, type Locale } from "@/i18n";
import { timezoneOffset } from "@/lib/work/answers";

import { BlockTitle, fit, Panel } from "./parts";

/**
 * Contact: the email as the headline of the ink panel, then one warm line
 * (always happy to talk) and the two ways to use the email; then the other
 * places to find him and his time zone.
 */
export function ContactAnswer({ lang }: { lang: Locale }) {
  const dict = getDictionary(lang);
  const a = dict.chat.answers.contact;

  return (
    <>
      <Piece i={2} className="mt-10">
        <Panel
          as="section"
          tone="ink"
          aria-labelledby="email-title"
          className="flex min-h-[19rem] flex-col justify-between gap-12 sm:min-h-[22rem] sm:p-10"
        >
          <div className="@container">
            <h2
              id="email-title"
              className="leading-none font-semibold tracking-[-0.04em] break-all"
              style={fit(profile.email, { max: 4, min: 1.375, lines: 1 })}
            >
              <a href={`mailto:${profile.email}`} className="link-underline">
                {profile.email}
              </a>
            </h2>
          </div>
          <div>
            <p className="max-w-[52ch] text-lead text-balance">
              {dict.work.hero.talkLine}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <ButtonLink
                href={`mailto:${profile.email}`}
                variant="inverse"
                size="lg"
              >
                {a.emailCta}
              </ButtonLink>
              <CopyEmailButton
                email={profile.email}
                label={a.copyEmail}
                copiedLabel={a.copied}
                variant="ghost-inverse"
              />
            </div>
          </div>
        </Panel>
      </Piece>

      <Piece
        i={3}
        as="section"
        className="mt-14"
        aria-labelledby="elsewhere-title"
      >
        <BlockTitle id="elsewhere-title">{a.elsewhere}</BlockTitle>
        <SocialList
          lang={lang}
          ids={["linkedin", "github"]}
          reveal={false}
          className="mt-4"
        >
          <li className="flex items-center gap-3 px-3 py-2.5 sm:px-4">
            <ClockIcon aria-hidden="true" className="size-6 shrink-0" />
            <span className="min-w-0">
              <span className="block font-medium">{a.timezone}</span>
              <span className="block text-small text-muted-foreground">
                {t(profile.location.label, lang)}, {timezoneOffset(lang)}
              </span>
            </span>
          </li>
        </SocialList>
      </Piece>
    </>
  );
}
