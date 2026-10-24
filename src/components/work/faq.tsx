import { Plus } from "lucide-react";

import { profile } from "@/content/profile";
import { getDictionary, t, type Locale } from "@/i18n";

import { WorkSection } from "./work-section";

/**
 * FAQ as native disclosure widgets (keyboard and screen-reader friendly, no
 * JS). The answers are in the DOM either way, and match the FAQPage JSON-LD.
 */
export function FaqSection({ lang }: { lang: Locale }) {
  const section = getDictionary(lang).work.sections.faq;

  return (
    <WorkSection
      id="faq"
      title={section.title}
      description={section.description}
    >
      <div className="divide-y divide-border border-y border-border">
        {profile.faq.map((item) => (
          <details key={item.id} id={`faq-${item.id}`} className="group">
            <summary className="flex cursor-pointer list-none items-start justify-between gap-6 rounded-sm py-5 text-left [&::-webkit-details-marker]:hidden">
              <span className="text-[1.0625rem] font-medium text-foreground sm:text-lg">
                {t(item.question, lang)}
              </span>
              <span
                aria-hidden="true"
                className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-full border border-border text-muted-foreground transition-[transform,border-color,color] duration-300 ease-editorial group-open:rotate-45 group-open:border-accent/40 group-open:text-accent group-hover:border-border-strong group-hover:text-foreground"
              >
                <Plus className="size-3.5" strokeWidth={2} />
              </span>
            </summary>
            <p className="max-w-2xl animate-fade-in pr-12 pb-6 text-muted-foreground">
              {t(item.answer, lang)}
            </p>
          </details>
        ))}
      </div>
    </WorkSection>
  );
}
