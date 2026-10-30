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
  ogColors,
  ogPublicImage,
} from "@/lib/og/template";

/** Social card for the Personal page: Davi's portrait, the hello and what the page holds. */
export const alt = `${profile.name}: ${getDictionary(defaultLocale).meta.personal.description}`;
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export function generateStaticParams() {
  return locales.map((lang) => ({ lang }));
}

const PORTRAIT = 184;

export default async function Image({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang: value } = await params;
  const lang = isLocale(value) ? value : defaultLocale;
  const dict = getDictionary(lang);
  // The card renderer cannot read WebP: the portrait has a PNG twin.
  const portrait = profile.image?.replace(/\.webp$/, ".png");

  return new ImageResponse(
    <OgFrame>
      {portrait ? (
        <img
          alt=""
          src={ogPublicImage(portrait)}
          width={PORTRAIT}
          height={PORTRAIT}
          style={{
            borderRadius: PORTRAIT,
            background: ogColors.surface,
            marginBottom: 36,
          }}
        />
      ) : null}
      <OgTitle text={dict.personal.intro.title} />
      <OgLead>{dict.meta.personal.description}</OgLead>
    </OgFrame>,
    { ...size, fonts: await loadOgFonts() },
  );
}
