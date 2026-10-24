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
  const sections = dict.personal.sections;

  return new ImageResponse(
    <OgFrame
      eyebrow={`${profile.name} · ${dict.nav.personal}`}
      footer={[
        sections.writing.title,
        sections.sideProjects.title,
        sections.elsewhere.title,
      ]}
    >
      <OgTitle text={dict.personal.intro.title} />
      <OgLead>{dict.personal.intro.description}</OgLead>
    </OgFrame>,
    { ...size, fonts: await loadOgFonts() },
  );
}
