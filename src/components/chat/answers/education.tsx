import { Piece } from "@/components/chat/piece";
import { TextLink } from "@/components/ui/text-link";
import { profile } from "@/content/profile";
import { getDictionary, t, type Locale } from "@/i18n";
import { formatDateRange, formatPartialDate } from "@/i18n/format";

import { BlockTitle, Panel } from "./parts";

/**
 * Education: the university as the ink panel, its initials set as large as
 * the panel allows; then the coursework and the languages in large type.
 */
export function EducationAnswer({ lang }: { lang: Locale }) {
  const dict = getDictionary(lang);
  const labels = dict.work.labels;
  const count = profile.education.length;

  return (
    <>
      {profile.education.map((edu, index) => {
        const institution = t(edu.institution, lang);
        return (
          <Piece key={edu.id} i={2 + index} className="mt-10">
            <Panel
              as="article"
              tone="ink"
              className="flex min-h-[20rem] flex-col justify-between gap-12 sm:min-h-[24rem] sm:p-10"
            >
              {edu.shortName ? (
                <div className="@container">
                  <p
                    aria-hidden="true"
                    className="text-[clamp(5rem,34cqi,12rem)] leading-[0.8] font-semibold tracking-[-0.07em]"
                  >
                    {edu.shortName}
                  </p>
                </div>
              ) : null}
              <div>
                <h2 className="text-heading">{t(edu.field, lang)}</h2>
                <p className="mt-2 font-medium">
                  {edu.url ? (
                    <TextLink
                      href={edu.url}
                      arrow={false}
                      newTabLabel={dict.a11y.opensInNewTab}
                      className="text-on-ink"
                    >
                      {institution}
                    </TextLink>
                  ) : (
                    institution
                  )}
                </p>
                <p className="mt-1 text-small text-on-ink-muted">
                  {[
                    t(edu.degree, lang),
                    edu.end
                      ? formatDateRange(edu.start, edu.end, lang)
                      : edu.thesis?.year
                        ? `${labels.thesis} ${formatPartialDate(edu.thesis.year, lang)}`
                        : null,
                    t(edu.location, lang),
                  ]
                    .filter(Boolean)
                    .join(", ")}
                </p>
              </div>
            </Panel>
          </Piece>
        );
      })}

      {profile.education.map((edu, index) => {
        const coursework = t(edu.coursework, lang);
        if (!coursework.length) return null;
        return (
          <Piece
            key={`${edu.id}-coursework`}
            i={2 + count + index}
            as="section"
            className="mt-14"
            aria-labelledby={`${edu.id}-coursework`}
          >
            <BlockTitle id={`${edu.id}-coursework`}>
              {labels.coursework}
            </BlockTitle>
            <ul className="mt-5 grid gap-x-6 gap-y-3 sm:grid-cols-2">
              {coursework.map((item) => (
                <li key={item} className="text-lead font-medium tracking-tight">
                  {item}
                </li>
              ))}
            </ul>
          </Piece>
        );
      })}

      <Piece
        i={2 + count * 2}
        as="section"
        className="mt-14"
        aria-labelledby="languages-title"
      >
        <BlockTitle id="languages-title">{labels.languagesSpoken}</BlockTitle>
        <dl className="mt-5 grid grid-cols-2 gap-x-6">
          {profile.languages.map((language) => (
            <div key={language.code}>
              <dt className="text-[clamp(1.75rem,1.45rem+1.2vw,2.5rem)] leading-none font-semibold tracking-[-0.04em]">
                {t(language.name, lang)}
              </dt>
              <dd className="mt-2 text-muted-foreground">
                {t(language.level, lang)}
              </dd>
            </div>
          ))}
        </dl>
      </Piece>
    </>
  );
}
