import { BriefcaseIcon } from "@phosphor-icons/react/dist/ssr/Briefcase";
import { EnvelopeSimpleIcon } from "@phosphor-icons/react/dist/ssr/EnvelopeSimple";
import { GraduationCapIcon } from "@phosphor-icons/react/dist/ssr/GraduationCap";
import { QuestionIcon } from "@phosphor-icons/react/dist/ssr/Question";
import { SealCheckIcon } from "@phosphor-icons/react/dist/ssr/SealCheck";
import { StackIcon } from "@phosphor-icons/react/dist/ssr/Stack";
import { TrophyIcon } from "@phosphor-icons/react/dist/ssr/Trophy";

import type { TopicId } from "@/lib/work/topics";

/** One Phosphor glyph per Work topic, shown on its suggestion chip (always `aria-hidden`). */
export const topicIcons = {
  experience: BriefcaseIcon,
  "sales-copilot": TrophyIcon,
  certifications: SealCheckIcon,
  skills: StackIcon,
  education: GraduationCapIcon,
  faq: QuestionIcon,
  contact: EnvelopeSimpleIcon,
} satisfies Record<TopicId, typeof BriefcaseIcon>;
