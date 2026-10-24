import { ImageResponse } from "next/og";

import { profile } from "@/content/profile";
import { defaultLocale, isLocale, t } from "@/i18n";
import {
  OG_CONTENT_TYPE,
  OG_SIZE,
  OgFrame,
  OgLead,
  OgQuestion,
  OgTitle,
  clampText,
  loadOgFonts,
} from "@/lib/og/template";
import { topicCopy, topicIntro } from "@/lib/work/answers";
import { isTopicId, topicIds } from "@/lib/work/topics";

/** Social card for one Work answer: the question, the answer's title and its first line. */
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
  const copy = topicCopy(topic, lang);

  return new ImageResponse(
    <OgFrame>
      <OgQuestion>{copy.question}</OgQuestion>
      <div style={{ display: "flex", flexDirection: "column", marginTop: 40 }}>
        <OgTitle text={copy.title} max={92} />
        <OgLead>{clampText(topicIntro(topic, lang), 110)}</OgLead>
      </div>
    </OgFrame>,
    { ...size, fonts: await loadOgFonts() },
  );
}
