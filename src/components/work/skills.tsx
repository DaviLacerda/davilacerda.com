import { Tag } from "@/components/ui/tag";
import { profile } from "@/content/profile";
import { getDictionary, t, type Locale } from "@/i18n";

import { WorkSection } from "./work-section";

/** Skills grouped by layer; the LLM group is tinted to lead the eye. */
export function SkillsSection({ lang }: { lang: Locale }) {
  const dict = getDictionary(lang);
  const section = dict.work.sections.skills;

  return (
    <WorkSection
      id="skills"
      title={section.title}
      description={section.description}
    >
      <div className="grid gap-x-10 gap-y-10 sm:grid-cols-2">
        {profile.skills.map((group) => {
          const titleId = `skills-${group.id}-title`;
          return (
            <div key={group.id} role="group" aria-labelledby={titleId}>
              <h3
                id={titleId}
                className="font-display text-[1.625rem] leading-tight text-foreground"
              >
                {t(group.title, lang)}
              </h3>
              <ul className="mt-4 flex flex-wrap gap-1.5">
                {group.skills.map((skill) => (
                  <li key={skill}>
                    <Tag
                      tone={group.id === "llm" ? "accent" : "neutral"}
                      className="px-3 py-1 text-[0.78rem]"
                    >
                      {skill}
                    </Tag>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </WorkSection>
  );
}
