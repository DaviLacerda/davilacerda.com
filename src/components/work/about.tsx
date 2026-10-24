import { profile } from "@/content/profile";
import { getDictionary, t, type Locale } from "@/i18n";

import { WorkSection } from "./work-section";

/**
 * TL;DR: the third-person factual paragraph answer engines quote, followed by
 * the highlight stats as a hairline grid.
 */
export function AboutSection({ lang }: { lang: Locale }) {
  const dict = getDictionary(lang);

  return (
    <WorkSection
      id="about"
      label={dict.work.sections.about.eyebrow}
      title={dict.work.page.about.title}
      after={
        <ul className="grid grid-cols-1 gap-px overflow-hidden rounded-2xl border border-border bg-border min-[420px]:grid-cols-2 lg:grid-cols-4">
          {profile.highlights.map((highlight) => (
            <li
              key={highlight.value.en}
              className="flex flex-col gap-3 bg-background p-6 sm:p-7"
            >
              <p className="font-display text-[2rem] leading-[1.05] tracking-[-0.01em] text-foreground sm:text-[2.25rem]">
                {t(highlight.value, lang)}
              </p>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {t(highlight.label, lang)}
              </p>
            </li>
          ))}
        </ul>
      }
    >
      <p className="text-lead text-foreground/90">{t(profile.tldr, lang)}</p>
    </WorkSection>
  );
}
