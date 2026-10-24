import { ImageResponse } from "next/og";

import { profile } from "@/content/profile";
import { defaultLocale, isLocale, locales, t } from "@/i18n";
import {
  OG_CONTENT_TYPE,
  OG_SIZE,
  OgFrame,
  OgLead,
  OgTitle,
  loadOgFonts,
  ogColors,
  ogFonts,
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
  const lead = profile.achievements
    .filter((achievement) => achievement.featured)
    .map((achievement) => t(achievement.title, lang))
    .join(" · ");
  const focus = profile.skills[0]?.skills.slice(0, 3) ?? [];

  return new ImageResponse(
    <OgFrame eyebrow={t(profile.location.label, lang)} footer={focus}>
      <OgTitle text={profile.name} />
      <div
        style={{
          display: "flex",
          marginTop: 6,
          fontFamily: ogFonts.serif,
          fontStyle: "italic",
          fontSize: 72,
          lineHeight: 1.05,
          color: ogColors.accent,
        }}
      >
        {t(profile.headline, lang)}
      </div>
      <OgLead>{lead}</OgLead>
    </OgFrame>,
    { ...size, fonts: await loadOgFonts() },
  );
}
