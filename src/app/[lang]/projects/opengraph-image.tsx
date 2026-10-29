import { ImageResponse } from "next/og";

import { profile } from "@/content/profile";
import { defaultLocale, getDictionary, isLocale, locales } from "@/i18n";
import { OgProjects } from "@/lib/og/projects";
import {
  OG_CONTENT_TYPE,
  OG_SIZE,
  OgFrame,
  loadOgFonts,
} from "@/lib/og/template";

/** Social card for the Projects tab: the award, the first figure and the outlets that covered them. */
export const alt = `${profile.name}: ${getDictionary(defaultLocale).meta.projects.description}`;
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
      <OgProjects lang={lang} />
    </OgFrame>,
    { ...size, fonts: await loadOgFonts() },
  );
}
