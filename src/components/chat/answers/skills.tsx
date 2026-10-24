import { Piece } from "@/components/chat/piece";
import { BrandLogo } from "@/components/ui/logo";
import { profile } from "@/content/profile";
import { getDictionary, t, type Locale } from "@/i18n";
import { logoRegistry, type LogoId } from "@/lib/logos";
import { stackLogos } from "@/lib/work/answers";

/** Short names under the logos, where the registry's label is long. */
const SHORT_LABELS: Partial<Record<LogoId, string>> = {
  azure: "Azure",
  mcp: "MCP",
  tailwind: "Tailwind",
};

/**
 * Skills: a wall of the stack's logos, large and in their own colours (the
 * only colour on the site), then the six groups as plain lists. Only
 * technologies listed in the profile appear.
 */
export function SkillsAnswer({ lang }: { lang: Locale }) {
  const dict = getDictionary(lang);
  const wall = stackLogos();

  return (
    <>
      <Piece i={2} className="mt-10">
        <ul
          aria-label={dict.work.labels.stack}
          className="grid grid-cols-3 gap-x-3 gap-y-8 sm:grid-cols-5 sm:gap-y-10"
        >
          {wall.map((id) => (
            <li key={id} className="flex flex-col items-center gap-3">
              <span className="grid size-[4.5rem] place-items-center rounded-panel bg-surface sm:size-20">
                <BrandLogo id={id} className="size-9 sm:size-10" />
              </span>
              <span className="text-small">
                {SHORT_LABELS[id] ?? logoRegistry[id].label}
              </span>
            </li>
          ))}
        </ul>
      </Piece>

      <div className="mt-14 grid gap-x-10 gap-y-8 sm:grid-cols-2">
        {profile.skills.map((group, index) => (
          <Piece
            key={group.id}
            i={3 + index}
            as="section"
            aria-labelledby={`skills-${group.id}`}
          >
            <h2 id={`skills-${group.id}`} className="font-semibold">
              {t(group.title, lang)}
            </h2>
            <ul className="mt-2 max-w-[44ch] text-muted-foreground">
              {group.skills.map((skill) => (
                <li
                  key={skill}
                  className="inline after:content-[',_'] last:after:content-none"
                >
                  {skill}
                </li>
              ))}
            </ul>
          </Piece>
        ))}
      </div>
    </>
  );
}
