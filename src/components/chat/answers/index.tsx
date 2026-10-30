import type { Locale } from "@/i18n";
import type { TopicId } from "@/lib/work/topics";

import { CertificationsAnswer } from "./certifications";
import { ContactAnswer } from "./contact";
import { EducationAnswer } from "./education";
import { ExperienceAnswer } from "./experience";
import { FaqAnswer } from "./faq";
import { AnswerHeader } from "./parts";
import { SalesCopilotAnswer } from "./sales-copilot";
import { SkillsAnswer } from "./skills";

export { Overview } from "./overview";

/*
 * The predefined "generative UI" of the Work assistant: one composition per
 * topic, rendered on the canvas under the question bubble and the title.
 * Every part is server-rendered HTML built from `src/content/profile.ts`
 * (crawlable, no client data), set in the monochrome palette with the brand
 * logos as the only colour, and marked as a `Piece` so the canvas can
 * compose it in front of the visitor. Third person: the assistant speaks
 * about Davi.
 */

function Body({ topic, lang }: { topic: TopicId; lang: Locale }) {
  switch (topic) {
    case "experience":
      return <ExperienceAnswer lang={lang} />;
    case "sales-copilot":
      return <SalesCopilotAnswer lang={lang} />;
    case "certifications":
      return <CertificationsAnswer lang={lang} />;
    case "skills":
      return <SkillsAnswer lang={lang} />;
    case "education":
      return <EducationAnswer lang={lang} />;
    case "faq":
      return <FaqAnswer lang={lang} />;
    case "contact":
      return <ContactAnswer lang={lang} />;
  }
}

/** One answer: the question, the title (the page's h1) and its composition. */
export function TopicAnswer({ topic, lang }: { topic: TopicId; lang: Locale }) {
  return (
    <article aria-labelledby="answer-title">
      <AnswerHeader topic={topic} lang={lang} />
      <Body topic={topic} lang={lang} />
    </article>
  );
}
