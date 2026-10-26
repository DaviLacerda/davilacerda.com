import { ImageResponse } from "next/og";

import { profile } from "@/content/profile";
import { defaultLocale, isLocale, locales, t } from "@/i18n";
import { OgHome } from "@/lib/og/answers";
import {
  OG_CONTENT_TYPE,
  OG_SIZE,
  OgFrame,
  loadOgFonts,
} from "@/lib/og/template";

/**
 * Social card for the Work page (and the default for every page under
 * /[lang]): the headline over the award and the "3×" Microsoft Certified panels.
 */
export const alt = `${profile.name}, ${t(profile.headline, defaultLocale)}`;
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
      <OgHome lang={lang} />
    </OgFrame>,
    { ...size, fonts: await loadOgFonts() },
  );
}
