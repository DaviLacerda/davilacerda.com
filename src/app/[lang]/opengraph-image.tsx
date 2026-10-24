import { ImageResponse } from "next/og";

import { profile } from "@/content/profile";
import { defaultLocale, getDictionary, isLocale, locales, t } from "@/i18n";
import {
  OG_CONTENT_TYPE,
  OG_SIZE,
  OgComposer,
  OgFrame,
  OgLead,
  OgTitle,
  loadOgFonts,
} from "@/lib/og/template";

/** Social card for the Work page (and the default for every page under /[lang]). */
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
  const dict = getDictionary(lang);
  const award = profile.highlights[0];

  return new ImageResponse(
    <OgFrame>
      <OgTitle text={t(profile.headline, lang)} />
      <OgLead>
        {award
          ? `${t(award.value, lang)} ${t(award.label, lang)}.`
          : t(profile.valueProp, lang)}
      </OgLead>
      <div style={{ display: "flex", flexDirection: "column", marginTop: 44 }}>
        <OgComposer placeholder={dict.chat.composer.placeholder} />
      </div>
    </OgFrame>,
    { ...size, fonts: await loadOgFonts() },
  );
}
