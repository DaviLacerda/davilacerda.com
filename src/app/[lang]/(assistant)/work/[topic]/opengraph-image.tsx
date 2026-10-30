import { ImageResponse } from "next/og";

import { profile } from "@/content/profile";
import { defaultLocale, isLocale, t } from "@/i18n";
import { OgAnswer } from "@/lib/og/answers";
import {
  OG_CONTENT_TYPE,
  OG_SIZE,
  OgFrame,
  loadOgFonts,
} from "@/lib/og/template";
import { isTopicId, topicIds } from "@/lib/work/topics";

/**
 * Social card for one Work answer: the question, then the same picture as
 * the answer (see `@/lib/og/answers`).
 */
export const alt = `${profile.name}, ${t(profile.headline, defaultLocale)}`;
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export function generateStaticParams() {
  return topicIds.map((topic) => ({ topic }));
}

export default async function Image({
  params,
}: {
  params: Promise<{ lang: string; topic: string }>;
}) {
  const { lang: value, topic: id } = await params;
  const lang = isLocale(value) ? value : defaultLocale;
  const topic = isTopicId(id) ? id : "faq";

  return new ImageResponse(
    <OgFrame>
      <OgAnswer topic={topic} lang={lang} />
    </OgFrame>,
    { ...size, fonts: await loadOgFonts() },
  );
}
