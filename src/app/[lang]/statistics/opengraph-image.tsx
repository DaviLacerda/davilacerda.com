import { ImageResponse } from "next/og";

import { profile } from "@/content/profile";
import { defaultLocale, getDictionary, isLocale, locales } from "@/i18n";
import {
  OG_CONTENT_TYPE,
  OG_SIZE,
  OgFrame,
  OgLead,
  OgMeta,
  OgTitle,
  clampText,
  loadOgFonts,
} from "@/lib/og/template";
import {
  statisticsCountLine,
  statisticsMeta,
  statisticsUpdatedLine,
} from "@/lib/statistics";

/** Social card for the Statistics page: the title with its year, the lead, when it was last checked and how much it holds. */
export const alt = `${profile.name}: ${statisticsMeta(defaultLocale).title}`;
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export function generateStaticParams() {
  return locales.map((lang) => ({ lang }));
}

export default async function Image({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang: value } = await params;
  const lang = isLocale(value) ? value : defaultLocale;

  return new ImageResponse(
    <OgFrame>
      <OgTitle text={statisticsMeta(lang).title} max={84} />
      <OgLead>{clampText(getDictionary(lang).statistics.lead, 170)}</OgLead>
      <OgMeta
        items={[statisticsUpdatedLine(lang), statisticsCountLine(lang)]}
      />
    </OgFrame>,
    { ...size, fonts: await loadOgFonts() },
  );
}
