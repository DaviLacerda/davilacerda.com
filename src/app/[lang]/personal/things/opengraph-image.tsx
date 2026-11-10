import { ImageResponse } from "next/og";

import { ThingDrawing } from "@/components/things/art";
import { things } from "@/content/things";
import { defaultLocale, getDictionary, isLocale, locales } from "@/i18n";
import {
  OG_CONTENT_TYPE,
  OG_SIZE,
  OgFrame,
  OgLead,
  OgTitle,
  loadOgFonts,
  ogColors,
} from "@/lib/og/template";

/** Social card for the Things page: the wall's drawings in a row, the title and the line. */
export const alt = getDictionary(defaultLocale).meta.things.description;
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export function generateStaticParams() {
  return locales.map((lang) => ({ lang }));
}

const PLATE = { width: 168, height: 126 } as const;

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
      <div
        style={{
          display: "flex",
          gap: 8,
          padding: 8,
          marginBottom: 40,
          borderRadius: 28,
          background: ogColors.surface,
          alignSelf: "flex-start",
        }}
      >
        {things.slice(0, 6).map((thing) => (
          <div
            key={thing.id}
            style={{
              display: "flex",
              width: PLATE.width,
              height: PLATE.height,
              padding: 14,
              borderRadius: 20,
              background: ogColors.page,
            }}
          >
            <ThingDrawing
              art={thing.art}
              width={PLATE.width - 28}
              height={PLATE.height - 28}
            />
          </div>
        ))}
      </div>
      <OgTitle text={dict.personal.things.title} />
      <OgLead>{dict.personal.things.lead}</OgLead>
    </OgFrame>,
    { ...size, fonts: await loadOgFonts() },
  );
}
