import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import {
  AssistantProvider,
  Canvas,
  Identity,
} from "@/components/chat/assistant";
import { Composer } from "@/components/chat/composer";
import { Container } from "@/components/ui/container";
import { profile } from "@/content/profile";
import { getDictionary, interpolate, isLocale, t } from "@/i18n";
import { routes } from "@/lib/routes";
import {
  composerStrings,
  composerTopics,
  replyStrings,
  splitCompanyName,
} from "@/lib/work/answers";

/**
 * The Work tab: a split pane that stays mounted while the visitor moves
 * between answers.
 *
 * - From 1024px: the left pane (Davi's name, one line, the composer and the
 *   suggestions) sticks to the top while the canvas on the right shows the
 *   answer, large. On the home the canvas shows the overview.
 * - Below 1024px: the answer fills the page and the composer is docked to the
 *   bottom of the screen, so answers always appear above the input.
 *
 * Every page under it (`/[lang]`, `/[lang]/work/<topic>`, `/[lang]/ask`)
 * renders only its answer, the canvas; the layout supplies the rest, so a
 * chip click swaps the canvas and nothing else.
 */
export default async function AssistantLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const dict = getDictionary(lang);
  const current = profile.experience.find((job) => job.end === null);
  const lead = interpolate(dict.chat.home.lead, {
    role: t(profile.headline, lang),
    company: current
      ? splitCompanyName(t(current.company, lang)).short
      : profile.currentEmployer.name,
  });

  return (
    <AssistantProvider>
      <Container
        wide
        className="pt-6 sm:pt-10 lg:grid lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)] lg:items-start lg:gap-x-16 xl:grid-cols-[minmax(0,23rem)_minmax(0,1fr)] xl:gap-x-24"
      >
        <div className="lg:sticky lg:top-10">
          <Identity home={routes.work(lang)} name={profile.name} lead={lead} />
          <Composer
            className="lg:mt-10"
            action={routes.ask(lang)}
            topics={composerTopics(lang)}
            strings={composerStrings(lang)}
            enterFrom={2}
          />
        </div>
        <Canvas
          reply={replyStrings(lang)}
          className="lg:min-h-[calc(100dvh-10rem)]"
        >
          {children}
        </Canvas>
      </Container>
    </AssistantProvider>
  );
}
