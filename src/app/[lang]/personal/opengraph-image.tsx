import { ImageResponse } from "next/og";

import { profile } from "@/content/profile";
import { defaultLocale, getDictionary, isLocale, locales } from "@/i18n";
import {
  OG_CONTENT_TYPE,
  OG_SIZE,
  OgFrame,
  OgLead,
  OgTitle,
  loadOgFonts,
} from "@/lib/og/template";

/** Social card for the Personal page (blog index, side projects, links). */
export const alt = `${profile.name}: ${getDictionary(defaultLocale).meta.personal.description}`;
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
  const dict = getDictionary(lang);

  return new ImageResponse(
    <OgFrame>
      <OgTitle text={dict.personal.intro.title} />
      <OgLead>{dict.meta.personal.description}</OgLead>
    </OgFrame>,
    { ...size, fonts: await loadOgFonts() },
  );
}
